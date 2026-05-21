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
import { createClient } from "@supabase/supabase-js";
import { readdirSync, readFileSync } from "fs";
import { join } from "path";
import { CANONIQUES_LITE } from "@/lib/canoniques";

const GEMINI_MODEL = "gemini-3.1-flash-image-preview";
const BUCKET = "lookbook-images";

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
    const body = (await req.json()) as { image_id?: string };
    if (!body.image_id) return jsonError(400, "image_id manquant");

    const geminiKey = process.env.GEMINI_API_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!geminiKey) return jsonError(500, "GEMINI_API_KEY manquant.");
    if (!supabaseUrl || !supabaseAnon) return jsonError(500, "Supabase non configuré.");

    const supabase = createClient(supabaseUrl, supabaseAnon);

    // 1. Lire l'image existante (pour récupérer prompt_en + canonique_injecte + storage_path)
    const { data: existing, error: readErr } = await supabase
      .from("lookbook_images")
      .select("id, lookbook_id, prompt_en, canonique_injecte, image_storage_path")
      .eq("id", body.image_id)
      .maybeSingle();
    if (readErr) return jsonError(500, `Lecture image échouée : ${readErr.message}`);
    if (!existing) return jsonError(404, "Image introuvable.");
    if (!existing.prompt_en) {
      return jsonError(
        400,
        "Cette image n'a pas de prompt_en associé (probablement une image custom). Impossible de régénérer."
      );
    }

    // 2. Génère via Gemini
    const gemini = new GoogleGenAI({ apiKey: geminiKey });
    const img = await generateImageWithGemini(gemini, existing.prompt_en, existing.canonique_injecte);
    if (!img) return jsonError(502, "Gemini n'a pas renvoyé d'image. Réessaie.");

    // 3. Upload nouveau fichier (nouveau path pour éviter le cache CDN)
    const newPath = `${existing.lookbook_id}/${existing.id}-r${Date.now()}.${img.mimeType.includes("png") ? "png" : "jpg"}`;
    const buf = Buffer.from(img.data, "base64");
    const { error: upErr } = await supabase.storage
      .from(BUCKET)
      .upload(newPath, buf, { contentType: img.mimeType, cacheControl: "31536000", upsert: false });
    if (upErr) return jsonError(500, `Upload échoué : ${upErr.message}`);

    const { data: pubUrl } = supabase.storage.from(BUCKET).getPublicUrl(newPath);

    // 4. Update row + suppression ancien fichier
    const { error: updErr } = await supabase
      .from("lookbook_images")
      .update({ image_url: pubUrl.publicUrl, image_storage_path: newPath })
      .eq("id", body.image_id);
    if (updErr) {
      await supabase.storage.from(BUCKET).remove([newPath]);
      return jsonError(500, `Update row échoué : ${updErr.message}`);
    }
    if (existing.image_storage_path && existing.image_storage_path !== newPath) {
      await supabase.storage.from(BUCKET).remove([existing.image_storage_path]);
    }

    return NextResponse.json({
      ok: true,
      data: { image_id: body.image_id, image_url: pubUrl.publicUrl, image_storage_path: newPath },
    });
  } catch (err) {
    return jsonError(500, err instanceof Error ? err.message : String(err));
  }
}
