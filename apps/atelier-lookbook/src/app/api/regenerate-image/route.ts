/**
 * POST /api/regenerate-image
 *
 * Régénère une image existante du lookbook avec le même prompt_en stocké en DB.
 * Use-case : Sarah voit une image ratée → click "🔄 Régénérer" → Gemini repasse,
 * l'ancienne image est remplacée (storage + URL).
 *
 * Body : { image_id: string }
 * Réponse : { ok: true, data: { image_id, image_url, image_storage_path } } | { ok: false, error }
 */

import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { readdirSync, readFileSync } from "fs";
import { join } from "path";
import { CANONIQUES_LITE } from "@/lib/canoniques";

const GEMINI_MODEL = "gemini-3.1-flash-image-preview";

function jsonError(status: number, error: string) {
  return NextResponse.json({ ok: false, error }, { status });
}

function loadCanoniqueAsBase64(id: string): { data: string; mimeType: string } | null {
  try {
    const dir = join(process.cwd(), "..", "..", "assets", "canoniques");
    const files = readdirSync(dir).filter((f) => f.startsWith(id));
    if (files.length === 0) return null;
    const filePath = join(dir, files[0]);
    const buf = readFileSync(filePath);
    const mimeType = filePath.endsWith(".png") ? "image/png" : "image/jpeg";
    return { data: buf.toString("base64"), mimeType };
  } catch {
    return null;
  }
}

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
    const parts: Array<{ inlineData: { data: string; mimeType: string } } | { text: string }> = [];
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
        return { data: part.inlineData.data, mimeType: part.inlineData.mimeType || "image/jpeg" };
      }
    }
    return null;
  } catch (err) {
    console.error("[regenerate-image] Gemini error:", err);
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { prompt_en?: string; canonique_injecte?: string | null };
    if (!body.prompt_en) return jsonError(400, "prompt_en manquant");

    const geminiKey = process.env.GEMINI_API_KEY;
    if (!geminiKey) return jsonError(500, "GEMINI_API_KEY manquant.");

    // Le brouillon est conservé côté navigateur : la régénération reçoit donc
    // directement le prompt, et ne crée aucune ligne ni fichier Supabase.
    const gemini = new GoogleGenAI({ apiKey: geminiKey });
    const img = await generateImageWithGemini(gemini, body.prompt_en, body.canonique_injecte ?? null);
    if (!img) return jsonError(502, "Gemini n'a pas renvoyé d'image. Réessaie.");

    return NextResponse.json({
      ok: true,
      data: { image_url: `data:${img.mimeType};base64,${img.data}` },
    });
  } catch (err) {
    return jsonError(500, err instanceof Error ? err.message : String(err));
  }
}
