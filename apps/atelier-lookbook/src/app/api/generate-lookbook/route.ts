import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { GoogleGenAI } from "@google/genai";
import { readdirSync, readFileSync } from "fs";
import { join } from "path";
import { buildCanoniquesContextForLLM, CANONIQUES_LITE } from "@/lib/canoniques";
import { DecompositionLLM, ImageFamille } from "@/lib/types";

const OPENAI_MODEL_PRIMARY = "gpt-5";
const OPENAI_MODEL_FALLBACK = "gpt-4o";
const GEMINI_MODEL = "gemini-3.1-flash-image-preview";

const SYSTEM_PROMPT_DECOMPOSITION = `You are the creative director of Ypersoa, a French embroidery brand (Sézane × A.P.C. × Maison Labiche × Émoï-Émoï × Octobre Éditions aesthetic). Your role: take a short poetic French brief and decompose it into 12-20 image prompts in English for a seasonal lookbook.

THE OUTPUT MUST BE STRICT JSON matching this exact shape:
{
  "titre": "string — French human-readable lookbook title (max 60 chars)",
  "slug": "string — kebab-case slug from titre + year_month (e.g. 'porto-vecchio-2026-07')",
  "tags": ["string", ...] — 4-8 lowercase French tags (saison, géo, mood, palette dominante),
  "ambiance_extraite": {
    "palette": ["#RRGGBB", ...] — 3-5 hex codes,
    "lieux": ["string", ...] — 2-5 typical locations,
    "props": ["string", ...] — 3-6 recurring props,
    "lumiere": "string — dominant lighting (one rich phrase)",
    "grain": "string — photographic grain (35mm film, polaroid, digital crisp...)",
    "postures": "string — body language and energy",
    "references_implicites": ["string", ...] — 2-4 photographer/filmmaker references
  },
  "prompts": [
    { "famille": "canonique_humain" | "scene_large" | "texture_detail" | "objet_prop" | "atmosphere",
      "canonique_injecte": "MAN-XXX or null",
      "prompt_en": "Detailed English prompt for Gemini, 80-180 words. Premium editorial photography. The prompt MUST embed the ambiance_extraite signature (palette, lighting, grain, posture). For canonique_humain prompts, mention the canonique by description not by ID. Always include 'imperfect human model, no celebrity look, real skin texture, natural imperfections.' Never mention real brand names visibly in the scene." }
  ]
}

DISTRIBUTION GUIDELINES (per 20 prompts, adjust if 12-20):
- canonique_humain: 4-6
- scene_large: 3-5
- texture_detail: 4-6
- objet_prop: 2-4
- atmosphere: 1-3

CASTING RULES:
- For "canonique_humain", choose a canonique whose signature matches the brief. Use canonique_injecte = "MAN-XXX" id.
- For other families, set canonique_injecte = null.
- Default casting is intelligent matching (don't repeat the same canonique more than 2-3 times).

BRAND GUARDRAILS (must be respected in every prompt_en):
- Tutoiement (no formal vous in any text rendered)
- Never mention "brodé à la main", "fait main", "Etsy", "marketplace"
- Never let real brand names appear as visible storefront/sign/logo (A.P.C., Sézane, etc. are STYLE references only)
- Real skin texture, lived-in skin, natural imperfections, no retouching, no celebrity polish

OUTPUT: pure JSON, no markdown fences, no preamble, no comments.`;

interface RequestBody {
  brief: string;
  count?: number; // default 20
  pinned_canoniques?: string[]; // si présent, le LLM DOIT utiliser ces canoniques en priorité
  palette_id?: string;          // si présent, force la palette du lookbook (hex codes Hub)
}

const REFS_DIR = join(process.cwd(), "..", "..", "referentiels");

/**
 * Résout une palette du référentiel Hub en liste de hex codes + descripteur lisible.
 * Retourne null si la palette n'est pas trouvée ou si pas de palette_id.
 */
function loadPaletteHexCodes(paletteId: string | undefined): { hexCodes: string[]; description: string } | null {
  if (!paletteId) return null;
  try {
    const palettesRaw = JSON.parse(readFileSync(join(REFS_DIR, "palettes_fils_associations.json"), "utf-8")) as {
      palettes: Array<{ id: string; nom: string; fils: string[]; description?: string }>;
    };
    const filsRaw = JSON.parse(readFileSync(join(REFS_DIR, "palette_fils_broderie_v2.json"), "utf-8")) as {
      couleurs: Array<{ id: string; nom: string; hex: string }>;
    };
    const palette = palettesRaw.palettes.find((p) => p.id === paletteId);
    if (!palette) return null;
    const filsById = new Map(filsRaw.couleurs.map((f) => [f.id, f]));
    const fils = palette.fils.map((fid) => filsById.get(fid)).filter((f): f is { id: string; nom: string; hex: string } => Boolean(f));
    const hexCodes = fils.map((f) => f.hex);
    const description = `Palette "${palette.nom}" : ${fils.map((f) => `${f.nom} (${f.hex})`).join(", ")}`;
    return { hexCodes, description };
  } catch {
    return null;
  }
}

function jsonError(status: number, message: string, extra?: Record<string, unknown>) {
  return NextResponse.json({ ok: false, message, ...extra }, { status });
}

async function callLLMDecomposition(
  openai: OpenAI,
  brief: string,
  count: number,
  pinnedCanoniques: string[] = [],
  palette: { hexCodes: string[]; description: string } | null = null,
) {
  const pinnedBlock = pinnedCanoniques.length > 0
    ? `\n\n⚠️ CANONIQUES ÉPINGLÉS PAR SARAH — tu DOIS utiliser ces canoniques (et uniquement ceux-ci) sur tous les prompts "canonique_humain". Distribue-les équitablement, ne mets pas le même 2 fois de suite. IDs imposés : ${pinnedCanoniques.join(", ")}.\n`
    : "";

  const paletteBlock = palette
    ? `\n\n🎨 PALETTE IMPOSÉE PAR SARAH — tu DOIS construire le lookbook autour de cette palette de couleur Ypersoa.\n${palette.description}\n\nRègles d'application :\n- ambiance_extraite.palette DOIT contenir EXACTEMENT ces hex codes (dans cet ordre) : ${palette.hexCodes.join(", ")}\n- Chaque prompt_en DOIT mentionner explicitement les nuances dominantes (couleurs des vêtements / accessoires / lumière / décor) en respectant cette palette\n- Les textiles, fonds, props, lumière, ciel, fleurs, accessoires choisis doivent tomber dans ce spectre chromatique\n- Cohérence brand : on ne mélange pas avec des couleurs hors palette\n`
    : "";

  const canoniquesContext = pinnedCanoniques.length > 0
    ? buildCanoniquesContextForLLM(pinnedCanoniques)
    : buildCanoniquesContextForLLM();

  const userPrompt = `Brief poétique de Sarah : "${brief}"

Décompose ce brief en ${count} prompts EN structurés pour générer un lookbook saisonnier Ypersoa.${pinnedBlock}${paletteBlock}

CANONIQUES DISPONIBLES (use exact MAN-XXX id):
${canoniquesContext}

Output strict JSON only.`;

  const tryModel = async (model: string) => {
    const completion = await openai.chat.completions.create({
      model,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT_DECOMPOSITION },
        { role: "user", content: userPrompt },
      ],
    });
    const raw = completion.choices?.[0]?.message?.content;
    if (!raw) throw new Error(`Empty content from ${model}`);
    return { parsed: JSON.parse(raw) as DecompositionLLM, model };
  };

  try {
    return await tryModel(OPENAI_MODEL_PRIMARY);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[lookbook] ${OPENAI_MODEL_PRIMARY} failed (${msg}), falling back to ${OPENAI_MODEL_FALLBACK}`);
    return await tryModel(OPENAI_MODEL_FALLBACK);
  }
}

/**
 * Lecture filesystem des canoniques JPG depuis apps/atelier-shooting/public/canoniques/
 * (source de vérité partagée entre les deux apps). Le matching par préfixe
 * MAN-XXX_ permet de tolérer les variations de prénom dans le filename.
 */
const CANONIQUES_DIR = join(process.cwd(), "..", "atelier-shooting", "public", "canoniques");

function loadCanoniqueAsBase64(id: string): { data: string; mimeType: string } | null {
  try {
    const files = readdirSync(CANONIQUES_DIR);
    const match = files.find((f) => f.startsWith(id + "_") && /\.(jpe?g|png)$/i.test(f));
    if (!match) {
      console.warn(`[lookbook] canonique introuvable : ${id} dans ${CANONIQUES_DIR}`);
      return null;
    }
    const buffer = readFileSync(join(CANONIQUES_DIR, match));
    const mimeType = match.toLowerCase().endsWith(".png") ? "image/png" : "image/jpeg";
    return { data: buffer.toString("base64"), mimeType };
  } catch (err) {
    console.warn("[lookbook] canonique read error:", err);
    return null;
  }
}

/**
 * Préfixe character reference EN injecté en tête du prompt pour fixer le visage
 * du canonique (même pattern que atelier-shooting, ~95% fidélité validé).
 */
function buildCharacterRefPrefix(id: string): string {
  const c = CANONIQUES_LITE.find((x) => x.id === id);
  if (!c) return "";
  const genderEn = c.genre === "H" ? "man" : c.genre === "enfant" ? "child" : "woman";
  return `MANNEQUIN (CHARACTER REFERENCE PERSISTANT) : Using the uploaded reference portrait as the character's face identity — same ${genderEn}, exact same face features preserved across all generations. ${c.prenom}, ${c.age} years old : ${c.signature}. Real human features with natural imperfections, no retouching, no skin smoothing, no beauty filter, no celebrity polish.\n\n`;
}

async function generateImageWithGemini(
  ai: GoogleGenAI,
  promptEn: string,
  canoniqueId: string | null
): Promise<{ data: string; mimeType: string } | null> {
  try {
    const parts: Array<
      | { inlineData: { data: string; mimeType: string } }
      | { text: string }
    > = [];

    let finalPrompt = promptEn;
    if (canoniqueId) {
      const canoniqueImg = loadCanoniqueAsBase64(canoniqueId);
      if (canoniqueImg) {
        parts.push({ inlineData: canoniqueImg });
        finalPrompt = buildCharacterRefPrefix(canoniqueId) + promptEn;
      }
    }
    parts.push({ text: finalPrompt });

    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: { parts },
      config: { imageConfig: { aspectRatio: "4:5", imageSize: "2K" } },
    });
    const candidate = response.candidates?.[0];
    if (!candidate?.content?.parts) return null;
    for (const part of candidate.content.parts) {
      if (part.inlineData?.data) {
        return {
          data: part.inlineData.data,
          mimeType: part.inlineData.mimeType || "image/jpeg",
        };
      }
    }
    return null;
  } catch (err) {
    console.error("[lookbook] Gemini error:", err);
    return null;
  }
}

export async function POST(req: NextRequest) {
  const started = Date.now();
  try {
    const body = (await req.json()) as RequestBody;
    if (!body.brief || body.brief.trim().length < 3) {
      return jsonError(400, "Brief vide ou trop court (min 3 caractères).");
    }
    const count = Math.min(Math.max(body.count ?? 20, 4), 20);
    const pinnedCanoniques = (body.pinned_canoniques ?? []).filter(
      (id) => typeof id === "string" && id.length > 0
    );

    const openaiKey = process.env.OPENAI_API_KEY;
    const geminiKey = process.env.GEMINI_API_KEY;
    if (!openaiKey) return jsonError(500, "OPENAI_API_KEY manquant.");
    if (!geminiKey) return jsonError(500, "GEMINI_API_KEY manquant.");

    const openai = new OpenAI({ apiKey: openaiKey });
    const gemini = new GoogleGenAI({ apiKey: geminiKey });

    // 1. Décomposition LLM (avec palette imposée si fournie)
    const palette = loadPaletteHexCodes(body.palette_id);
    const { parsed, model } = await callLLMDecomposition(
      openai,
      body.brief.trim(),
      count,
      pinnedCanoniques,
      palette,
    );
    const prompts = parsed.prompts.slice(0, count);
    // Si palette imposée → on overwrite la palette retournée par le LLM pour garantir la cohérence
    if (palette) {
      parsed.ambiance_extraite.palette = palette.hexCodes;
    }

    // 2. Le lookbook généré reste un brouillon côté navigateur. Aucune image
    // n'est écrite dans Supabase avant un like ou une sauvegarde explicite.
    const draftId = crypto.randomUUID();
    const slugWithSuffix = `${parsed.slug}-${draftId.slice(0, 4)}`;
    const canoniquesInclus = Array.from(
      new Set(prompts.map((p) => p.canonique_injecte).filter((x): x is string => Boolean(x)))
    );

    // 3. Gemini × N en parallèle, avec injection canonique en parts[] si applicable
    const results = await Promise.all(
      prompts.map(async (p, idx) => {
        const img = await generateImageWithGemini(gemini, p.prompt_en, p.canonique_injecte);
        if (!img) return { ok: false as const, idx, prompt: p };

        return {
          ok: true as const,
          idx,
          id: crypto.randomUUID(),
          url: `data:${img.mimeType};base64,${img.data}`,
          famille: p.famille,
          prompt: p,
        };
      })
    );

    const succeeded = results.filter((r) => r.ok).length;
    const errors = results.filter((r) => !r.ok).map((r) => r.idx);

    return NextResponse.json({
      ok: true,
      draft_id: draftId,
      titre: parsed.titre,
      slug: slugWithSuffix,
      tags: parsed.tags,
      ambiance_extraite: parsed.ambiance_extraite,
      canoniques_inclus: canoniquesInclus,
      images: results
        .filter((r): r is Extract<typeof r, { ok: true }> => r.ok)
        .map((r) => ({
          id: r.id,
          position: r.idx + 1,
          famille: r.famille,
          url: r.url,
          canonique_injecte: r.prompt.canonique_injecte,
          prompt_en: r.prompt.prompt_en,
          valide: false,
        })),
      stats: { requested: prompts.length, succeeded, failed: prompts.length - succeeded },
      llm_model_used: model,
      duration_ms: Date.now() - started,
    });
  } catch (err) {
    console.error("[lookbook] fatal error:", err);
    return jsonError(500, err instanceof Error ? err.message : String(err));
  }
}

// Génération longue (12-20 calls Gemini parallèles) — augmenter le timeout serveur.
export const maxDuration = 300;
