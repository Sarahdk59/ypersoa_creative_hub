/**
 * POST /api/da/shooting-plan/render
 * Body: { plan: ShootingPlanOutput, lookbook_ambiance_ids?: string[] }
 * Génère 1 image hero du plan via Gemini (premier shot de la shotlist).
 *
 * Pattern Gemini emprunté à atelier-lookbook (parts[] = images canoniques + prompt EN).
 * V0 : 1 image hero. V1 plus tard : générer toute la shotlist (5 images).
 */
import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { readdirSync, readFileSync } from "fs";
import { join } from "path";
import { createClient } from "@supabase/supabase-js";
import type { ShootingPlanOutput } from "@/lib/atelier-da/shooting-plan-builder";

const GEMINI_MODEL = "gemini-3.1-flash-image-preview";

// Symlink apps/atelier-social/public/canoniques → ../../assets/canoniques (à créer)
const CANONIQUES_DIR = join(process.cwd(), "..", "..", "assets", "canoniques");

interface RenderInput {
  plan: ShootingPlanOutput;
  /** Pour les ambiances lookbook pinées : on charge depuis Supabase */
  lookbook_ambiance_ids?: string[];
  /** Dispositif casting sélectionné par Sarah (override le top 1 par défaut) */
  selected_dispositif_id?: string | null;
  /** PNG/JPG du motif réel uploadé par Sarah (data URL base64). Injecté en parts[] Gemini. */
  motif_png_data_url?: string | null;
  /** Taille du motif brodé : impacte la dimension + l'emplacement (cœur discret / cœur lisible / centre poitrine) */
  motif_size?: "petit" | "moyen" | "grand";
  /** Code produit Ypersoa (YP001 hoodie, YP004 hoodie enfant, YP005 sweat, YP019 t-shirt, YP021 zoodie). */
  produit_yp_id?: string;
  /** Index du shot dans plan.shotlist (0 = premier = hero). Default 0. */
  shot_index?: number;
}

const PRODUITS_YP_DESCRIPTIONS: Record<string, { fr: string; en: string }> = {
  YP001: { fr: "Hoodie adulte (sweat à capuche avec cordons)", en: "adult hoodie (cotton sweatshirt with hood and round drawstrings)" },
  YP004: { fr: "Hoodie enfant", en: "kids hoodie (cotton sweatshirt with hood, no drawstrings)" },
  YP005: { fr: "Sweat adulte col rond (crewneck)", en: "adult crewneck sweatshirt (round neck, no hood, premium cotton)" },
  YP019: { fr: "T-shirt adulte épais (premium cotton)", en: "adult t-shirt (premium thick cotton, short sleeves, round neck)" },
  YP021: { fr: "Zoodie (sweat à capuche zippé)", en: "adult zoodie (zip-up hooded sweatshirt with metal zipper)" },
};

function loadCanoniqueAsBase64(id: string): { data: string; mimeType: string } | null {
  try {
    const files = readdirSync(CANONIQUES_DIR);
    // Gérer les sous-IDs comme MAN-P11-LEA → fichier MAN-P11_Lea_canonique.jpg (avec underscore prénom)
    const baseId = id.includes("-") && id.split("-").length > 2 ? id.split("-").slice(0, 2).join("-") : id;
    const suffix = id.split("-")[2]?.toLowerCase();
    const match = files.find((f) => {
      if (!f.startsWith(baseId + "_")) return false;
      if (!suffix) return /\.(jpe?g|png)$/i.test(f);
      return f.toLowerCase().includes(suffix) && /\.(jpe?g|png)$/i.test(f);
    });
    if (!match) return null;
    const buffer = readFileSync(join(CANONIQUES_DIR, match));
    const mimeType = match.toLowerCase().endsWith(".png") ? "image/png" : "image/jpeg";
    return { data: buffer.toString("base64"), mimeType };
  } catch {
    return null;
  }
}

interface LookbookAmbianceFromSupabase {
  id: string;
  titre: string;
  ambiance_extraite: {
    palette: string[];
    lieux: string[];
    props: string[];
    lumiere: string;
    grain: string;
    postures: string;
    references_implicites: string[];
  } | null;
}

async function fetchLookbookAmbiances(ids: string[]): Promise<LookbookAmbianceFromSupabase[]> {
  if (ids.length === 0) return [];
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return [];
  const supabase = createClient(url, key);
  const { data } = await supabase
    .from("lookbooks")
    .select("id, titre, ambiance_extraite")
    .in("id", ids);
  return (data || []) as LookbookAmbianceFromSupabase[];
}

function aspectRatioFromFormat(plan: ShootingPlanOutput): "1:1" | "4:5" | "2:3" | "16:9" | "9:16" {
  // V0 : déduit de la planning_estime / shotlist
  const isPinterest = plan.shotlist.length === 3 && plan.shotlist.some((s) => s.angle.includes("VERTICAL"));
  if (isPinterest) return "2:3";
  return "4:5";
}

interface BuildHeroPromptArgs {
  plan: ShootingPlanOutput;
  lookbookAmbiances: LookbookAmbianceFromSupabase[];
  selectedDispositifId?: string | null;
  hasMotifPng?: boolean;
  motifSize?: "petit" | "moyen" | "grand";
  produitYpId?: string;
  shotIndex?: number;
}

const MOTIF_SIZE_DESCRIPTIONS: Record<"petit" | "moyen" | "grand", { dimension: string; placement: string }> = {
  petit: {
    dimension: "small embroidery (2-4 cm width)",
    placement: "left chest position, discreet — the embroidery is subtle, an intimate detail at heart-side, NOT the visual focus of the garment",
  },
  moyen: {
    dimension: "medium embroidery (6-8 cm width)",
    placement: "left chest position, clearly readable — the embroidery is visible at heart-side, lisible without being central",
  },
  grand: {
    dimension: "large embroidery (12-20 cm width)",
    placement: "centered on the chest, visually dominant — the embroidery is the focal point of the garment, large statement",
  },
};

function buildHeroPrompt(args: BuildHeroPromptArgs): {
  promptEn: string;
  canoniqueIds: string[];
} {
  const { plan, lookbookAmbiances, selectedDispositifId, hasMotifPng, motifSize = "moyen", produitYpId = "YP019", shotIndex = 0 } = args;
  const produitDesc = PRODUITS_YP_DESCRIPTIONS[produitYpId] || PRODUITS_YP_DESCRIPTIONS.YP019;

  // Dispositif sélectionné par Sarah si présent, sinon top 1
  const topCasting =
    (selectedDispositifId && plan.casting_propose.find((c) => c.id === selectedDispositifId)) ||
    plan.casting_propose[0];
  const canoniqueIds = topCasting?.membres || (topCasting?.id ? [topCasting.id] : []);

  // Shot index choisi (default 0 = hero)
  const safeIndex = Math.min(Math.max(shotIndex, 0), plan.shotlist.length - 1);
  const heroShot = plan.shotlist[safeIndex];

  const sizeDesc = MOTIF_SIZE_DESCRIPTIONS[motifSize];

  // Description ambiance — soit lookbook custom, soit ambiance préfaite, soit générique
  let ambianceDesc = "soft natural daylight, French quiet luxury, Sézane × A.P.C. × Octobre Éditions aesthetic, cream and ink tones";
  if (lookbookAmbiances.length > 0 && lookbookAmbiances[0].ambiance_extraite) {
    const a = lookbookAmbiances[0].ambiance_extraite;
    const palette = a.palette?.length ? a.palette.join(", ") : "warm cream tones";
    const lieux = a.lieux?.length ? a.lieux.join(" or ") : "intimate French interior";
    ambianceDesc = `Custom ambiance from curated Ypersoa lookbook "${lookbookAmbiances[0].titre}" — color palette: ${palette}; setting: ${lieux}; lighting: ${a.lumiere || "soft natural editorial"}; grain: ${a.grain || "premium digital"}; body language: ${a.postures || "natural relaxed"}`;
  } else if (plan.ambiances_recommandees.length > 0) {
    ambianceDesc = `Editorial ambiance: ${plan.ambiances_recommandees.join(", ")}, French quiet luxury, Sézane × A.P.C. aesthetic`;
  }

  // Lieu
  const lieu = topCasting?.lieu || "France";

  // Motif YPM avec taille + emplacement
  let motifLine: string;
  if (hasMotifPng) {
    motifLine = `EMBROIDERY MOTIF FIDELITY: The first attached image is the EXACT embroidery motif design that must be reproduced verbatim on the garment. Same shape, same letters, same colors, same proportions. Size: ${sizeDesc.dimension}. Placement: ${sizeDesc.placement}. Realized on Tajima industrial embroidery machine — precise, dense, EXTREMELY FLAT (no 3D, no relief, no embossing). DO NOT add, remove, modify, or invent any element of this motif. Brand: Ypersoa "${plan.motif_ypm?.nom || plan.motif_ypm?.id || "motif"}".`;
  } else if (plan.motif_ypm?.id) {
    motifLine = `The garment carries the embroidered motif "${plan.motif_ypm.nom || plan.motif_ypm.id}" (Ypersoa YPM-001 to YPM-017 collection). Size: ${sizeDesc.dimension}. Placement: ${sizeDesc.placement}. Realized on Tajima industrial embroidery machine — precise, dense, EXTREMELY FLAT (no 3D, no relief).`;
  } else {
    motifLine = `The garment carries an Ypersoa embroidered motif on Tajima industrial machine, EXTREMELY FLAT. Size: ${sizeDesc.dimension}. Placement: ${sizeDesc.placement}.`;
  }

  const promptEn = `${heroShot.description}

CASTING: ${topCasting?.prenoms.join(" + ") || "natural French model"}.
LOCATION: ${lieu}.
GARMENT: ${produitDesc.en} (${produitYpId} from the Ypersoa catalog) — neutral natural color (heather grey, ecru, or black depending on the casting profile). The model wears this exact type of garment, NOT a different shape.
${ambianceDesc}.
${motifLine}

CRITICAL BRAND RULES:
- Real human skin texture, lived-in, natural imperfections (visible pores, freckles, expression lines).
- NO retouching, NO skin smoothing, NO supermodel polish, NO ethereal tone.
- NO printed text, signs, posters, labels, watermarks, brand names, or written words ANYWHERE in the background.
- The ONLY text allowed is the embroidered text on the garment itself.
- Embroidery is FLAT, no 3D, no relief, integrated into the fabric.
- Tutoiement French aesthetic: intimate, narrative, never marketing-loud.
- ${heroShot.cadrage_type}.

Editorial 35mm film photography, slightly diffused light. Brand reference: Sézane, A.P.C., Maison Labiche, Émoï-Émoï, Octobre Éditions.`;

  return { promptEn, canoniqueIds };
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as RenderInput;
    if (!body?.plan) {
      return NextResponse.json({ ok: false, error: "Plan manquant dans le body" }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ ok: false, error: "GEMINI_API_KEY manquant côté serveur" }, { status: 500 });
    }

    const lookbookAmbiances = await fetchLookbookAmbiances(body.lookbook_ambiance_ids || []);
    const hasMotifPng = Boolean(body.motif_png_data_url);
    const { promptEn, canoniqueIds } = buildHeroPrompt({
      plan: body.plan,
      lookbookAmbiances,
      selectedDispositifId: body.selected_dispositif_id,
      hasMotifPng,
      motifSize: body.motif_size || "moyen",
      produitYpId: body.produit_yp_id || "YP019",
      shotIndex: body.shot_index ?? 0,
    });
    const aspectRatio = aspectRatioFromFormat(body.plan);

    const ai = new GoogleGenAI({ apiKey });

    // Charger les parts[] dans l'ordre Gemini :
    //   1. PNG du motif (si fourni) — référence broderie EXACTE
    //   2. Photos canoniques char ref
    //   3. Prompt texte
    const parts: Array<{ inlineData: { data: string; mimeType: string } } | { text: string }> = [];

    // 1) Motif PNG si fourni
    if (hasMotifPng && body.motif_png_data_url) {
      const match = body.motif_png_data_url.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
      if (match) {
        const [, mimeType, data] = match;
        parts.push({ inlineData: { data, mimeType } });
      }
    }

    // 2) Char refs canoniques (limite 3)
    const canoniquesLoaded: string[] = [];
    for (const id of canoniqueIds.slice(0, 3)) {
      const img = loadCanoniqueAsBase64(id);
      if (img) {
        parts.push({ inlineData: img });
        canoniquesLoaded.push(id);
      }
    }

    // 3) Prompt texte
    parts.push({ text: promptEn });

    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: { parts },
      config: { imageConfig: { aspectRatio, imageSize: "2K" } },
    });

    const candidate = response.candidates?.[0];
    let imageBase64: string | null = null;
    let imageMime = "image/jpeg";
    for (const p of candidate?.content?.parts || []) {
      if (p.inlineData?.data) {
        imageBase64 = p.inlineData.data;
        imageMime = p.inlineData.mimeType || "image/jpeg";
        break;
      }
    }
    if (!imageBase64) {
      return NextResponse.json(
        { ok: false, error: "Gemini n'a pas retourné d'image (essayer un brief différent ou un autre dispositif casting)" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      image: {
        data_url: `data:${imageMime};base64,${imageBase64}`,
        mime_type: imageMime,
        aspect_ratio: aspectRatio,
      },
      meta: {
        canoniques_charges: canoniquesLoaded,
        dispositif_utilise: body.selected_dispositif_id || body.plan.casting_propose[0]?.id || null,
        motif_png_inject: hasMotifPng,
        motif_size: body.motif_size || "moyen",
        produit_yp_id: body.produit_yp_id || "YP019",
        shot_index: body.shot_index ?? 0,
        shot_angle: body.plan.shotlist[body.shot_index ?? 0]?.angle || null,
        prompt_used: promptEn,
        lookbook_ambiances_resolved: lookbookAmbiances.map((l) => ({ id: l.id, titre: l.titre })),
      },
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}

export const maxDuration = 120;
