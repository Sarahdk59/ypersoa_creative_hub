import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { GoogleGenAI } from "@google/genai";
import { createClient } from "@supabase/supabase-js";
import { buildCanoniquesContextForLLM } from "@/lib/canoniques";
import { DecompositionLLM, ImageFamille } from "@/lib/types";

const OPENAI_MODEL_PRIMARY = "gpt-5";
const OPENAI_MODEL_FALLBACK = "gpt-4o";
const GEMINI_MODEL = "gemini-3.1-flash-image-preview";
const BUCKET = "lookbook-images";

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
}

function jsonError(status: number, message: string, extra?: Record<string, unknown>) {
  return NextResponse.json({ ok: false, message, ...extra }, { status });
}

async function callLLMDecomposition(openai: OpenAI, brief: string, count: number) {
  const userPrompt = `Brief poétique de Sarah : "${brief}"

Décompose ce brief en ${count} prompts EN structurés pour générer un lookbook saisonnier Ypersoa.

CANONIQUES DISPONIBLES (use exact MAN-XXX id):
${buildCanoniquesContextForLLM()}

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

async function generateImageWithGemini(
  ai: GoogleGenAI,
  promptEn: string
): Promise<{ data: string; mimeType: string } | null> {
  try {
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: { parts: [{ text: promptEn }] },
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

    const openaiKey = process.env.OPENAI_API_KEY;
    const geminiKey = process.env.GEMINI_API_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!openaiKey) return jsonError(500, "OPENAI_API_KEY manquant.");
    if (!geminiKey) return jsonError(500, "GEMINI_API_KEY manquant.");
    if (!supabaseUrl || !supabaseAnon) return jsonError(500, "Supabase non configuré.");

    const openai = new OpenAI({ apiKey: openaiKey });
    const gemini = new GoogleGenAI({ apiKey: geminiKey });
    const supabase = createClient(supabaseUrl, supabaseAnon);

    // 1. Décomposition LLM
    const { parsed, model } = await callLLMDecomposition(openai, body.brief.trim(), count);
    const prompts = parsed.prompts.slice(0, count);

    // 2. Insert lookbook (statut = brouillon, slug unique check)
    const lookbookId = crypto.randomUUID();
    const slugWithSuffix = `${parsed.slug}-${lookbookId.slice(0, 4)}`;
    const canoniquesInclus = Array.from(
      new Set(prompts.map((p) => p.canonique_injecte).filter((x): x is string => Boolean(x)))
    );

    const { error: insertErr } = await supabase.from("lookbooks").insert({
      id: lookbookId,
      brief_original: body.brief.trim(),
      titre: parsed.titre,
      slug: slugWithSuffix,
      tags: parsed.tags,
      canoniques_inclus: canoniquesInclus,
      ambiance_extraite: parsed.ambiance_extraite,
      llm_model_used: model,
    });
    if (insertErr) return jsonError(500, `Insert lookbook échoué: ${insertErr.message}`);

    // 3. Gemini × N en parallèle
    const results = await Promise.all(
      prompts.map(async (p, idx) => {
        const img = await generateImageWithGemini(gemini, p.prompt_en);
        if (!img) return { ok: false, idx, prompt: p };

        // Upload bucket
        const path = `${lookbookId}/img-${String(idx + 1).padStart(2, "0")}.jpg`;
        const blob = Buffer.from(img.data, "base64");
        const up = await supabase.storage.from(BUCKET).upload(path, blob, {
          contentType: img.mimeType,
          cacheControl: "31536000",
          upsert: false,
        });
        if (up.error) {
          console.error("[lookbook] upload failed:", up.error.message);
          return { ok: false, idx, prompt: p };
        }
        const publicUrl = supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;

        // Insert image row
        await supabase.from("lookbook_images").insert({
          lookbook_id: lookbookId,
          position: idx + 1,
          famille: p.famille as ImageFamille,
          canonique_injecte: p.canonique_injecte,
          prompt_en: p.prompt_en,
          image_url: publicUrl,
          image_storage_path: path,
        });

        return { ok: true, idx, url: publicUrl, famille: p.famille, prompt: p };
      })
    );

    const succeeded = results.filter((r) => r.ok).length;
    const errors = results.filter((r) => !r.ok).map((r) => r.idx);

    // 4. Update generation_meta
    await supabase.from("lookbooks").update({
      generation_meta: {
        duration_ms: Date.now() - started,
        n_prompts_requested: prompts.length,
        n_images_succeeded: succeeded,
        errors,
      },
    }).eq("id", lookbookId);

    return NextResponse.json({
      ok: true,
      lookbook_id: lookbookId,
      titre: parsed.titre,
      slug: slugWithSuffix,
      tags: parsed.tags,
      ambiance_extraite: parsed.ambiance_extraite,
      canoniques_inclus: canoniquesInclus,
      images: results
        .filter((r) => r.ok)
        .map((r) => ({
          position: r.idx + 1,
          famille: r.famille,
          url: "url" in r ? r.url : null,
          canonique_injecte: r.prompt.canonique_injecte,
          prompt_en: r.prompt.prompt_en,
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
