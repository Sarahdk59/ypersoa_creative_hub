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
  // Pour les ambiances lookbook pinées : on charge depuis Supabase
  lookbook_ambiance_ids?: string[];
}

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

function buildHeroPrompt(plan: ShootingPlanOutput, lookbookAmbiances: LookbookAmbianceFromSupabase[]): {
  promptEn: string;
  canoniqueIds: string[];
} {
  // 1er dispositif top score
  const topCasting = plan.casting_propose[0];
  const canoniqueIds = topCasting?.membres || (topCasting?.id ? [topCasting.id] : []);

  // 1er angle de la shotlist (PORTRAIT_FRONTAL ou DEMI_FIGURE_VERTICAL)
  const heroShot = plan.shotlist[0];

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

  // Motif YPM
  const motifLine = plan.motif_ypm?.id
    ? `The garment carries the embroidered motif "${plan.motif_ypm.nom || plan.motif_ypm.id}" (Ypersoa YPM-001 to YPM-017 collection), realized on Tajima industrial embroidery machine. The embroidery is precise, dense, EXTREMELY FLAT (no 3D, no relief). Visible at left chest position.`
    : `The garment carries an Ypersoa embroidered motif on Tajima industrial machine, EXTREMELY FLAT, visible at left chest.`;

  const promptEn = `${heroShot.description}

CASTING: ${topCasting?.prenoms.join(" + ") || "natural French model"}.
LOCATION: ${lieu}.
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
    const { promptEn, canoniqueIds } = buildHeroPrompt(body.plan, lookbookAmbiances);
    const aspectRatio = aspectRatioFromFormat(body.plan);

    const ai = new GoogleGenAI({ apiKey });

    // Charger les canoniques en parts[] AVANT le prompt
    const parts: Array<{ inlineData: { data: string; mimeType: string } } | { text: string }> = [];
    const canoniquesLoaded: string[] = [];
    for (const id of canoniqueIds.slice(0, 3)) {
      // limite 3 char refs pour rester dans les contraintes Gemini
      const img = loadCanoniqueAsBase64(id);
      if (img) {
        parts.push({ inlineData: img });
        canoniquesLoaded.push(id);
      }
    }
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
