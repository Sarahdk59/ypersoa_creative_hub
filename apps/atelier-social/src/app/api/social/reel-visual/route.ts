/**
 * API Route: /api/social/reel-visual
 *
 * Génère un visuel fixe (9:16) pour un plan de script Reels, à partir du
 * texte de direction du plan — pas de canonique/produit verrouillé (contexte
 * documentaire : atelier, mains, matière), retry si Gemini renvoie
 * IMAGE_OTHER. Toujours des visuels fixes, jamais de vidéo (cf. §11 CLAUDE.md
 * et mémoire project_connexion_multi_piliers : Reels = script texte, la
 * vidéo reste filmée par Sarah).
 */

import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

export const runtime = "nodejs";
export const maxDuration = 60;

interface RequestBody {
  prompt: string;
}

const STYLE_BLOCK = `Ultra-realistic documentary editorial photograph, in the style of Sézane × Émoï-Émoï × Maison Labiche behind-the-scenes content — warm, sober, French quiet-luxury craft aesthetic. Atelier de broderie dans les Hauts-de-France (Wattrelos). 35mm film photography feel, soft natural light, real skin and material texture, nothing staged or corporate.

# EMBROIDERY PROCESS (CRITICAL BRAND RULE)
This is MACHINE embroidery on a professional Tajima embroidery machine — NEVER traditional hand embroidery. If the scene shows the embroidery process: show an industrial multi-needle embroidery machine with the fabric held flat and taut in a metal hoop/frame clamped under the machine head, threads feeding from cones, the needle head stitching automatically. ABSOLUTELY FORBIDDEN: a hand-held wooden embroidery hoop, a needle threaded and pulled by hand, cross-stitch or needlepoint craft imagery, any scene that reads as hand embroidery / artisanal hand-sewing.

# ABSOLUTE NEGATIVE
- NO printed text, signs, posters, labels, watermarks, or written words ANYWHERE in the frame.
- NO legible brand names or logos anywhere, INCLUDING on the embroidery machine itself (crop, angle, or blur away any manufacturer logo/nameplate on the equipment) — this is Ypersoa's own workshop content, not an ad for the machine brand.
- The only text allowed in the whole image is the embroidered wording on the garment/fabric itself, if the scene calls for it.
- NO retouching, NO skin smoothing, NO stock-photo / corporate look.
- Vertical 9:16 format, single realistic photographic frame (not a collage, not a video storyboard).`;

function buildPrompt(direction: string, simplified: boolean): string {
  if (simplified) {
    return `A single realistic photograph illustrating this scene: ${direction}\n\n${STYLE_BLOCK}`;
  }
  return `Create one still photograph for a social media Reel storyboard. This is the shot direction to illustrate:\n\n"${direction}"\n\n${STYLE_BLOCK}`;
}

async function tryGenerate(
  ai: GoogleGenAI,
  prompt: string,
  attemptLabel: string
): Promise<{ success: boolean; imageDataUrl?: string; shouldRetry?: boolean; errorMessage?: string }> {
  console.log(`[TRY] ${attemptLabel} - prompt length ${prompt.length}`);
  try {
    let response;
    try {
      response = await ai.models.generateContent({
        model: "gemini-3.1-flash-image-preview",
        contents: { parts: [{ text: prompt }] },
        config: { imageConfig: { aspectRatio: "9:16", imageSize: "2K" } },
      });
    } catch (primaryError) {
      console.warn(`[WARN] ${attemptLabel} - 3.1-flash-image-preview failed, fallback to 2.5`);
      response = await ai.models.generateContent({
        model: "gemini-2.5-flash-image",
        contents: { parts: [{ text: prompt }] },
      });
    }

    const finishReason = response.candidates?.[0]?.finishReason;
    console.log(`[INFO] ${attemptLabel} - finish_reason: ${finishReason}`);

    if (finishReason === "SAFETY") {
      return { success: false, errorMessage: "Image bloquée par filtres de sécurité Gemini" };
    }

    if (finishReason === "IMAGE_OTHER" || finishReason === "MAX_TOKENS") {
      return { success: false, shouldRetry: true, errorMessage: `finish_reason: ${finishReason}` };
    }

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        const imageDataUrl = `data:${part.inlineData.mimeType || "image/png"};base64,${part.inlineData.data}`;
        return { success: true, imageDataUrl };
      }
    }

    return { success: false, shouldRetry: true, errorMessage: `No image in response, finish_reason: ${finishReason}` };
  } catch (error) {
    console.error(`[FAIL] ${attemptLabel} - exception:`, error);
    const message = error instanceof Error ? error.message : "Erreur inconnue";
    return { success: false, errorMessage: `Erreur API Gemini: ${message}` };
  }
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ message: "GEMINI_API_KEY manquante" }, { status: 500 });
  }

  let body: RequestBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Body JSON invalide" }, { status: 400 });
  }

  const prompt = body.prompt?.trim();
  if (!prompt) {
    return NextResponse.json({ message: "Paramètre prompt manquant" }, { status: 400 });
  }

  const ai = new GoogleGenAI({ apiKey });

  const attempt1 = await tryGenerate(ai, buildPrompt(prompt, false), "ATTEMPT 1 (full prompt)");
  if (attempt1.success && attempt1.imageDataUrl) {
    return NextResponse.json({ imageDataUrl: attempt1.imageDataUrl });
  }

  if (attempt1.shouldRetry) {
    const attempt2 = await tryGenerate(ai, buildPrompt(prompt, true), "ATTEMPT 2 (simplified prompt)");
    if (attempt2.success && attempt2.imageDataUrl) {
      return NextResponse.json({ imageDataUrl: attempt2.imageDataUrl });
    }
  }

  return NextResponse.json(
    { message: attempt1.errorMessage || "Aucune image générée par Gemini" },
    { status: 500 }
  );
}
