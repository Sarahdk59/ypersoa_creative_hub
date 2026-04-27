/**
 * API Route: /api/generate-image
 *
 * Génère un visuel éditorial via Gemini 3 Pro Image (Nano Banana 2)
 * avec character reference (canoniques uploadées + prompt aligné CLAUDE.md).
 */

import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { readFile } from "fs/promises";
import { join } from "path";
import { CANONIQUES } from "@/lib/canoniques";

export const runtime = "nodejs";
export const maxDuration = 120;

interface RequestBody {
  base64Image: string; // image du produit Ypersoa
  mimeType: string;
  vibePrompt: string;
  angle: string;
  customPrompt?: string;
  canoniqueIds?: string[]; // 0 à 3 mannequins canoniques sélectionnés
}

async function loadCanoniqueImage(id: string): Promise<{ data: string; mimeType: string } | null> {
  const canonique = CANONIQUES.find((c) => c.id === id);
  if (!canonique) return null;

  const repoRoot = join(process.cwd(), "..", "..");
  const filePath = join(repoRoot, "assets", "canoniques", canonique.filename);

  try {
    const buffer = await readFile(filePath);
    return {
      data: buffer.toString("base64"),
      mimeType: "image/jpeg",
    };
  } catch (error) {
    console.error(`Failed to load canonique ${id}:`, error);
    return null;
  }
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { message: "GEMINI_API_KEY manquante. Vérifie ton .env.local" },
      { status: 500 }
    );
  }

  let body: RequestBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Body JSON invalide" }, { status: 400 });
  }

  const { base64Image, mimeType, vibePrompt, angle, customPrompt, canoniqueIds = [] } = body;

  if (!base64Image || !mimeType || !vibePrompt || !angle) {
    return NextResponse.json(
      { message: "Paramètres requis manquants" },
      { status: 400 }
    );
  }

  // Charger les canoniques sélectionnées (1-3)
  const canoniques = canoniqueIds
    .map((id) => CANONIQUES.find((c) => c.id === id))
    .filter((c): c is NonNullable<typeof c> => Boolean(c));

  const canoniqueImages: Array<{ data: string; mimeType: string }> = [];
  for (const id of canoniqueIds) {
    const img = await loadCanoniqueImage(id);
    if (img) canoniqueImages.push(img);
  }

  // === CONSTRUCTION DU PROMPT ===
  const customInstruction = customPrompt
    ? `\n\nCRITICAL USER DIRECTION: The Art Director (Sarah) requested: "${customPrompt}". Incorporate while strictly respecting brand guidelines.`
    : "";

  // Section canoniques (CLAUDE.md formule magique)
  let canoniqueSection = "";
  if (canoniques.length > 0) {
    const isMultiple = canoniques.length > 1;
    const characterRefDescription = canoniques
      .map((c, i) => {
        const refIndex = i + 1; // image 2, 3, 4 (image 1 = produit)
        return `- Reference image ${refIndex + 1}: This is ${c.prenom} (${c.age} years old). Physical signature: ${c.signature}.`;
      })
      .join("\n");

    canoniqueSection = `

# CRITICAL CHARACTER REFERENCE — MANDATORY FACE FIDELITY

${
  isMultiple
    ? `The following ${canoniques.length} reference portraits define the EXACT face identities to use. EACH person in the generated image MUST match their corresponding reference portrait — same face, same features, same age, same skin tone preserved with 90-95% fidelity.`
    : `The following reference portrait defines the EXACT face identity to use. The person in the generated image MUST match this reference portrait — same face, same features, exact same features preserved with 90-95% fidelity.`
}

${characterRefDescription}

⚠️ DO NOT replace these characters with generic models. The face fidelity is non-negotiable. Use the uploaded reference portrait${isMultiple ? "s" : ""} as the character${isMultiple ? "s'" : "'s"} face identity.`;
  }

  // === PROMPT FINAL ALIGNÉ CLAUDE.md v1.1 ===
  const prompt = `You are a visionary Art Director for Ypersoa, a French premium custom embroidery brand based in Wattrelos, North France.

Create an ultra-realistic, emotional, sober editorial photograph in the style of Sézane × A.P.C. × Maison Labiche campaign aesthetic. The image must feature this exact embroidered textile item from the FIRST reference image — an Ypersoa premium garment (t-shirt, hoodie, crewneck sweatshirt, or zip-up hoodie / zoodie).
${canoniqueSection}

# CRITICAL ART DIRECTION — D1 Beauté Incarnée v2.0

${
  canoniques.length > 0
    ? `The garment must be worn by the canonical character${canoniques.length > 1 ? "s" : ""} described above. NOT generic models, NOT supermodels, NOT random faces.`
    : `The garment must be worn by a highly realistic, everyday person ("madame ou monsieur tout le monde"), around 30-40 years old. NOT supermodels.`
}

The model${canoniques.length > 1 ? "s" : ""} must have:
- Real skin texture, lived-in skin preserved
- Natural expression lines (laugh lines, subtle imperfections)
- Healthy pink undertones on lighter skin (NOT pale, NOT sickly, NOT vampire-looking)
- Warm flush on cheeks and nose bridge
- Looking directly into the camera lens with deep authentic connection
- Smiling naturally, laughing warmly, or with serene composed half-smile (NEVER cold, NEVER ethereal)

# CONTEXT
${customInstruction}
Vibe/Mood: ${vibePrompt}
Shot composition: ${angle}

# STYLE
- 35mm film photography, medium format camera feel
- Soft cinematic natural lighting
- Minimalist composition, sober editorial
- Reference aesthetics: Sézane × A.P.C. × Maison Labiche
- Warm human presence, NOT cold, NOT clinical
- French quiet luxury, effortless

# EMBROIDERY FIDELITY
Keep the embroidered design, the specific garment type (from FIRST reference image), and the fabric texture EXACTLY as in the original product image. The embroidery must be rendered sharp and accurate, with visible thread texture and stitch detail. Industrial Tajima machine embroidery quality. Always placed on the LEFT CHEST of the garment (heart side).

# ABSOLUTE CONSTRAINTS
- NO retouching, NO skin smoothing, NO beauty filter
- NO plastic supermodel look
- NO cold/clinical/ethereal tone
- Analog film grain subtle, raw editorial feel`;

  // === CONSTRUCTION DES PARTS POUR GEMINI ===
  // Image 1 = produit Ypersoa (toujours en premier)
  // Images 2-4 = canoniques (si sélectionnées)
  const parts: Array<{ inlineData?: { data: string; mimeType: string }; text?: string }> = [
    { inlineData: { data: base64Image, mimeType } },
  ];

  for (const canImg of canoniqueImages) {
    parts.push({ inlineData: { data: canImg.data, mimeType: canImg.mimeType } });
  }

  parts.push({ text: prompt });

  try {
    const ai = new GoogleGenAI({ apiKey });

    let response;
    try {
      response = await ai.models.generateContent({
        model: "gemini-3.1-flash-image-preview",
        contents: { parts },
        config: {
          imageConfig: {
            aspectRatio: "1:1",
            imageSize: "2K",
          },
        },
      });
    } catch (primaryError) {
      console.warn("Failed with 3.1-flash-image-preview, falling back to 2.5-flash-image:", primaryError);
      response = await ai.models.generateContent({
        model: "gemini-2.5-flash-image",
        contents: { parts },
      });
    }

    if (response.candidates?.[0]?.finishReason === "SAFETY") {
      return NextResponse.json(
        { message: "L'image a été bloquée par les filtres de sécurité Gemini." },
        { status: 400 }
      );
    }

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        const imageDataUrl = `data:${part.inlineData.mimeType || "image/png"};base64,${part.inlineData.data}`;
        return NextResponse.json({ imageDataUrl });
      }
    }

    return NextResponse.json({ message: "Aucune image générée par Gemini" }, { status: 500 });
  } catch (error) {
    console.error("Gemini API error:", error);
    const message = error instanceof Error ? error.message : "Erreur inconnue";
    return NextResponse.json({ message: `Erreur API Gemini: ${message}` }, { status: 500 });
  }
}
