/**
 * API Route: /api/generate-image
 * Avec retry IMAGE_OTHER + support format 4:5 (overlay) ou 1:1 (standard)
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
  aspectRatio?: "1:1" | "4:5" | "2:3"; // NEW
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

function simplifyAngle(angle: string): string {
  if (angle.startsWith("DÉTAIL INTIMISTE")) {
    return "DÉTAIL : Close-up of the embroidery on the garment, with the person's hand naturally placed near it. Soft natural lighting, film photography aesthetic.";
  }
  if (angle.startsWith("SCÈNE NARRATIVE")) {
    return "LIFESTYLE : The person wearing the garment in a candid everyday moment, looking natural. Cinematic still feel.";
  }
  if (angle.startsWith("LIFESTYLE WIDE")) {
    return "WIDE : The person wearing the garment in their environment, full body or 3/4 length. Natural composition.";
  }
  if (angle.startsWith("DEMI-FIGURE 3/4")) {
    return "MEDIUM SHOT : The person from chest up, slight 3/4 angle, embroidery clearly visible on the chest, natural smile.";
  }
  if (angle.startsWith("PORTRAIT FRONTAL")) {
    return "PORTRAIT : Head and shoulders shot, the person looking directly at the camera with a warm smile, embroidery visible at bottom of frame.";
  }
  return angle;
}

function buildPrompt(
  angle: string,
  vibePrompt: string,
  customPrompt: string | undefined,
  canoniques: Array<{ prenom: string; age: number; genre: string; signature: string }>,
  isRetry: boolean = false
): string {
  const customInstruction = customPrompt ? `\n\nART DIRECTOR REQUEST: "${customPrompt}".` : "";

  let canoniqueSection = "";
  if (canoniques.length > 0) {
    const characterRefDescription = canoniques
      .map((c, i) => `- Reference image ${i + 2}: This is ${c.prenom} (${c.age} years old). ${c.signature}.`)
      .join("\n");

    canoniqueSection = `

# CHARACTER REFERENCE
${
  isRetry
    ? "Use the uploaded reference portraits for the face identity."
    : `The following reference portraits define the EXACT face identity (90-95% fidelity):\n${characterRefDescription}\nDo NOT replace with generic models.`
}`;
  }

  if (isRetry) {
    return `Editorial fashion photograph in the style of Sézane × A.P.C.

The image features the embroidered garment from the first reference image.${canoniqueSection}

${angle}

Vibe: ${vibePrompt}${customInstruction}

Style: 35mm film photography, soft natural lighting, French quiet luxury.

The embroidery on the garment must match the first reference image exactly.
NO text or signs in the background.`;
  }

  return `Create an ultra-realistic, emotional, sober editorial fashion photograph in the style of Sézane × A.P.C. × Maison Labiche campaign aesthetic.

# THE GARMENT
The image must feature the exact embroidered textile item shown in the first reference image.

⚠️ EMBROIDERY FIDELITY: The embroidery on the garment must MATCH EXACTLY the embroidery in the first reference image. Same design, same letters, same colors, same placement (left chest). DO NOT add, remove, modify, or invent any letter or symbol.
${canoniqueSection}

# CHARACTERS
${
  canoniques.length > 0
    ? `Worn by the canonical character${canoniques.length > 1 ? "s" : ""} described above.`
    : `Worn by a real-looking person around 35-40 years old, NOT a supermodel.`
}

The model${canoniques.length > 1 ? "s" : ""}:
- Real skin texture, lived-in skin
- Natural expression lines
- Healthy pink undertones on lighter skin
- Looking at camera with authentic warmth
- Natural smile (NEVER cold, NEVER ethereal)

# CONTEXT
${customInstruction}
Vibe: ${vibePrompt}
Composition: ${angle}

# STYLE
- 35mm film photography
- Soft cinematic natural lighting
- Sézane × A.P.C. × Maison Labiche aesthetic
- Warm human presence

# ABSOLUTE NEGATIVE — NO TEXT IN IMAGE
NO printed text, signs, posters, labels, watermarks, brand names, or written words ANYWHERE in the background or environment. The ONLY text allowed is the embroidered text on the garment itself.

# OTHER NEGATIVE
NO retouching, NO skin smoothing, NO supermodel look, NO ethereal tone.`;
}

export async function POST(request: NextRequest) {
  console.log("\n========== /api/generate-image START ==========");

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ message: "GEMINI_API_KEY manquante" }, { status: 500 });
  }

  let body: RequestBody;
  try {
    body = await request.json();
  } catch (e) {
    return NextResponse.json({ message: "Body JSON invalide" }, { status: 400 });
  }

  const {
    base64Image,
    mimeType,
    vibePrompt,
    angle,
    customPrompt,
    canoniqueIds = [],
    aspectRatio = "1:1",
  } = body;

  console.log("[INFO] Angle:", angle.substring(0, 80));
  console.log("[INFO] Aspect ratio:", aspectRatio);
  console.log("[INFO] Canoniques:", canoniqueIds);

  if (!base64Image || !mimeType || !vibePrompt || !angle) {
    return NextResponse.json({ message: "Paramètres requis manquants" }, { status: 400 });
  }

  const canoniques = canoniqueIds
    .map((id) => CANONIQUES.find((c) => c.id === id))
    .filter((c): c is NonNullable<typeof c> => Boolean(c));

  const canoniqueImages: Array<{ data: string; mimeType: string }> = [];
  for (const id of canoniqueIds) {
    const img = await loadCanoniqueImage(id);
    if (img) canoniqueImages.push(img);
  }

  const ai = new GoogleGenAI({ apiKey });

  const attempt1 = await tryGenerate({
    ai,
    prompt: buildPrompt(angle, vibePrompt, customPrompt, canoniques, false),
    base64Image,
    mimeType,
    canoniqueImages,
    aspectRatio,
    attemptLabel: "ATTEMPT 1 (full prompt)",
  });

  if (attempt1.success && attempt1.imageDataUrl) {
    console.log("[OK] Attempt 1 succeeded");
    console.log("========== END ==========\n");
    return NextResponse.json({ imageDataUrl: attempt1.imageDataUrl });
  }

  if (attempt1.shouldRetry) {
    console.log("[RETRY] Attempt 1 returned IMAGE_OTHER, retrying with simplified prompt...");

    const attempt2 = await tryGenerate({
      ai,
      prompt: buildPrompt(simplifyAngle(angle), vibePrompt, customPrompt, canoniques, true),
      base64Image,
      mimeType,
      canoniqueImages,
      aspectRatio,
      attemptLabel: "ATTEMPT 2 (simplified prompt)",
    });

    if (attempt2.success && attempt2.imageDataUrl) {
      console.log("[OK] Attempt 2 succeeded after retry");
      console.log("========== END ==========\n");
      return NextResponse.json({ imageDataUrl: attempt2.imageDataUrl });
    }

    if (canoniques.length > 0 && attempt2.shouldRetry) {
      console.log("[RETRY] Attempt 2 also failed, trying without character ref...");

      const attempt3 = await tryGenerate({
        ai,
        prompt: buildPrompt(simplifyAngle(angle), vibePrompt, customPrompt, [], true),
        base64Image,
        mimeType,
        canoniqueImages: [],
        aspectRatio,
        attemptLabel: "ATTEMPT 3 (no canoniques)",
      });

      if (attempt3.success && attempt3.imageDataUrl) {
        console.log("[OK] Attempt 3 succeeded without canoniques");
        console.log("========== END ==========\n");
        return NextResponse.json({ imageDataUrl: attempt3.imageDataUrl });
      }
    }
  }

  console.error("[FAIL] All attempts failed for angle:", angle.substring(0, 60));
  console.log("========== END ==========\n");
  return NextResponse.json(
    { message: attempt1.errorMessage || "Aucune image générée par Gemini" },
    { status: 500 }
  );
}

async function tryGenerate({
  ai,
  prompt,
  base64Image,
  mimeType,
  canoniqueImages,
  aspectRatio,
  attemptLabel,
}: {
  ai: GoogleGenAI;
  prompt: string;
  base64Image: string;
  mimeType: string;
  canoniqueImages: Array<{ data: string; mimeType: string }>;
  aspectRatio: "1:1" | "4:5" | "2:3";
  attemptLabel: string;
}): Promise<{
  success: boolean;
  imageDataUrl?: string;
  shouldRetry?: boolean;
  errorMessage?: string;
}> {
  const parts: Array<{ inlineData?: { data: string; mimeType: string }; text?: string }> = [
    { inlineData: { data: base64Image, mimeType } },
  ];
  for (const canImg of canoniqueImages) {
    parts.push({ inlineData: { data: canImg.data, mimeType: canImg.mimeType } });
  }
  parts.push({ text: prompt });

  console.log(`[TRY] ${attemptLabel} - ${parts.length} parts, prompt length ${prompt.length}, aspect ${aspectRatio}`);

  try {
    let response;
    try {
      response = await ai.models.generateContent({
        model: "gemini-3.1-flash-image-preview",
        contents: { parts },
        config: { imageConfig: { aspectRatio, imageSize: "2K" } },
      });
    } catch (primaryError) {
      console.warn(`[WARN] ${attemptLabel} - 3.1-flash-image-preview failed, fallback to 2.5`);
      response = await ai.models.generateContent({
        model: "gemini-2.5-flash-image",
        contents: { parts },
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
