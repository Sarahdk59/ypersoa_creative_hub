/**
 * API Route: /api/generate-image
 * VERSION DEBUG : logs détaillés pour diagnostic
 */

import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { readFile } from "fs/promises";
import { join } from "path";
import { CANONIQUES } from "@/lib/canoniques";

export const runtime = "nodejs";
export const maxDuration = 120;

interface RequestBody {
  base64Image: string;
  mimeType: string;
  vibePrompt: string;
  angle: string;
  customPrompt?: string;
  canoniqueIds?: string[];
}

async function loadCanoniqueImage(id: string): Promise<{ data: string; mimeType: string } | null> {
  const canonique = CANONIQUES.find((c) => c.id === id);
  if (!canonique) return null;
  const repoRoot = join(process.cwd(), "..", "..");
  const filePath = join(repoRoot, "assets", "canoniques", canonique.filename);
  try {
    const buffer = await readFile(filePath);
    return { data: buffer.toString("base64"), mimeType: "image/jpeg" };
  } catch (error) {
    console.error(`[FAIL] Failed to load canonique ${id}:`, error);
    return null;
  }
}

export async function POST(request: NextRequest) {
  console.log("\n========== /api/generate-image START ==========");

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("[FAIL] GEMINI_API_KEY missing");
    return NextResponse.json({ message: "GEMINI_API_KEY manquante" }, { status: 500 });
  }
  console.log("[OK] Gemini key loaded, length:", apiKey.length);

  let body: RequestBody;
  try {
    body = await request.json();
  } catch (e) {
    console.error("[FAIL] Body JSON invalide:", e);
    return NextResponse.json({ message: "Body JSON invalide" }, { status: 400 });
  }

  const { base64Image, mimeType, vibePrompt, angle, customPrompt, canoniqueIds = [] } = body;

  console.log("[INFO] Request params:");
  console.log("  - mimeType:", mimeType);
  console.log("  - base64Image length:", base64Image?.length || 0);
  console.log("  - vibePrompt:", vibePrompt?.substring(0, 80));
  console.log("  - angle:", angle?.substring(0, 80));
  console.log("  - canoniqueIds:", canoniqueIds);
  console.log("  - customPrompt:", customPrompt?.substring(0, 80));

  if (!base64Image || !mimeType || !vibePrompt || !angle) {
    console.error("[FAIL] Missing params");
    return NextResponse.json({ message: "Paramètres requis manquants" }, { status: 400 });
  }

  const canoniques = canoniqueIds
    .map((id) => CANONIQUES.find((c) => c.id === id))
    .filter((c): c is NonNullable<typeof c> => Boolean(c));

  console.log("[INFO] Canoniques resolved:", canoniques.map((c) => c.id));

  const canoniqueImages: Array<{ data: string; mimeType: string }> = [];
  for (const id of canoniqueIds) {
    const img = await loadCanoniqueImage(id);
    if (img) canoniqueImages.push(img);
  }

  console.log("[INFO] Canonique images loaded:", canoniqueImages.length);

  // === Prompt minimal pour debug ===
  const prompt = `Create an ultra-realistic editorial fashion photograph in the style of Sézane × A.P.C. campaign.

The image must feature the exact embroidered garment shown in the first reference image.

${
  canoniques.length > 0
    ? `The model is ${canoniques.map((c) => c.prenom).join(" and ")}. Match their face exactly from the reference portraits provided.`
    : "The model is a real-looking person around 35-40 years old, NOT a supermodel."
}

Vibe: ${vibePrompt}
Composition: ${angle}
${customPrompt ? `Direction: ${customPrompt}` : ""}

Style: 35mm film photography, soft natural lighting, French quiet luxury, raw editorial feel.

ABSOLUTE: NO text, NO signs, NO posters, NO writing in the background. Only the embroidery on the garment, which must match exactly the reference.`;

  console.log("[INFO] Prompt length:", prompt.length);

  const parts: Array<{ inlineData?: { data: string; mimeType: string }; text?: string }> = [
    { inlineData: { data: base64Image, mimeType } },
  ];
  for (const canImg of canoniqueImages) {
    parts.push({ inlineData: { data: canImg.data, mimeType: canImg.mimeType } });
  }
  parts.push({ text: prompt });

  console.log("[INFO] Total parts (1 product + N canoniques + 1 text):", parts.length);

  try {
    const ai = new GoogleGenAI({ apiKey });

    let response;
    let modelUsed = "";

    // Try the latest model first, fallback to known stable
    const modelsToTry = [
      "gemini-3.1-flash-image-preview",
      "gemini-2.5-flash-image",
      "gemini-2.0-flash-exp-image-generation",
    ];

    let lastError: unknown = null;
    for (const model of modelsToTry) {
      try {
        console.log(`[TRY] Calling Gemini with model: ${model}`);
        response = await ai.models.generateContent({
          model,
          contents: { parts },
          ...(model === "gemini-3.1-flash-image-preview"
            ? { config: { imageConfig: { aspectRatio: "1:1", imageSize: "2K" } } }
            : {}),
        });
        modelUsed = model;
        console.log(`[OK] Model ${model} succeeded`);
        break;
      } catch (err) {
        console.error(`[FAIL] Model ${model} threw:`, err instanceof Error ? err.message : err);
        lastError = err;
      }
    }

    if (!response) {
      const errMsg = lastError instanceof Error ? lastError.message : String(lastError);
      console.error("[FAIL] All models failed. Last error:", errMsg);
      return NextResponse.json(
        { message: `Tous les modèles Gemini ont échoué. Dernière erreur : ${errMsg}` },
        { status: 500 }
      );
    }

    console.log("[INFO] Response received from", modelUsed);
    console.log("[INFO] Candidates count:", response.candidates?.length);
    console.log("[INFO] Finish reason:", response.candidates?.[0]?.finishReason);
    console.log(
      "[INFO] Parts in candidate:",
      response.candidates?.[0]?.content?.parts?.map((p) => ({
        hasText: Boolean(p.text),
        hasInlineData: Boolean(p.inlineData),
        mimeType: p.inlineData?.mimeType,
      }))
    );

    if (response.candidates?.[0]?.finishReason === "SAFETY") {
      const safetyRatings = response.candidates[0].safetyRatings;
      console.error("[FAIL] BLOCKED BY SAFETY. Ratings:", JSON.stringify(safetyRatings));
      return NextResponse.json(
        { message: "Image bloquée par filtres de sécurité Gemini" },
        { status: 400 }
      );
    }

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        const imageDataUrl = `data:${part.inlineData.mimeType || "image/png"};base64,${part.inlineData.data}`;
        console.log("[OK] Image generated. Size:", part.inlineData.data?.length || 0, "chars base64");
        console.log("========== /api/generate-image END ==========\n");
        return NextResponse.json({ imageDataUrl });
      }
    }

    // Aucune image dans la réponse — log tout pour comprendre
    console.error("[FAIL] No image in response. Full response:");
    console.error(JSON.stringify(response, null, 2).substring(0, 2000));
    return NextResponse.json(
      {
        message: `Aucune image dans la réponse Gemini. Modèle: ${modelUsed}, finish_reason: ${response.candidates?.[0]?.finishReason}`,
      },
      { status: 500 }
    );
  } catch (error) {
    console.error("[FAIL] Catch global:", error);
    if (error instanceof Error) {
      console.error("[FAIL] Stack:", error.stack);
    }
    const message = error instanceof Error ? error.message : "Erreur inconnue";
    return NextResponse.json({ message: `Erreur API Gemini: ${message}` }, { status: 500 });
  }
}
