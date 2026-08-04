/**
 * POST /api/studio-mood/[id]/generate-visual
 *
 * Génère un visuel hook pour un épisode Studio Mood.
 * Format 9:16 par défaut (Reels/TikTok), ou 1:1 / 4:5 selon le besoin.
 * Composition : flatlay (sans personnage) ou worn (avec canonique).
 * Système retry aligné sur generate-image : primary gemini-3.1, fallback 2.5.
 */
import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { readFile } from "fs/promises";
import { join } from "path";
import { getEpisode } from "@/lib/studio-mood/episodes-loader";
import { CANONIQUES } from "@/lib/canoniques";
import type { StudioMoodEpisode } from "@/lib/studio-mood/types";

export const runtime = "nodejs";
export const maxDuration = 120;

type AspectRatio = "9:16" | "1:1" | "4:5";
type Composition = "flatlay" | "worn";

interface RequestBody {
  canoniqueId?: string;
  aspectRatio?: AspectRatio;
  composition?: Composition;
}

const EMBROIDERY_REALISM =
  "EMBROIDERY REALISM (CRITICAL): render the embroidery as FLAT, fine, delicate flat machine embroidery — the thread sits almost flush with the fabric, subtle natural satin-stitch sheen, soft and matte, gently following the fabric weave. ABSOLUTELY NOT puffy, NOT 3D, NOT foam/puff embroidery, NOT thick raised or embossed lettering. Understated and elegant like Émoï-Émoï / Sézane / Maison Labiche embroidery.";

const SUPPORT_EN: Record<string, string> = {
  sweat:      "hooded sweatshirt (hoodie)",
  tshirt:     "t-shirt",
  casquette:  "vintage washed cap",
  accessoire: "textile accessory",
};

const HUMEUR_MOOD: Record<string, string> = {
  Tendresse:           "warm tender atmosphere, soft morning light, cozy intimacy",
  Fierté:              "proud joyful energy, confident posture, warm directional light",
  Complicité:          "complicit shared moment, relaxed candid feel, golden hour glow",
  "Joyeux bordel":     "playful chaotic joy, dynamic composition, bright natural light",
  "Nostalgie douce":   "soft nostalgic mood, slightly desaturated warm tones, golden hour",
  Surprise:            "joyful surprise, expressive reaction, natural daylight",
  "Quotidien magique": "quiet everyday magic, clean natural light, editorial feel",
  Espièglerie:         "playful mischievous energy, candid moment, warm tones",
  "Amour assumé":      "bold confident love, soft romantic light, intimate framing",
  "Retour en forme":   "energized fresh mood, clean bright natural light, dynamic",
  "Tendresse senior":  "warm intergenerational tenderness, soft golden light",
  "Fête et surprise":  "festive joyful atmosphere, warm party light, champagne tones",
};

function getMoodStyle(humeur: string): string {
  return HUMEUR_MOOD[humeur] ?? "editorial lifestyle mood, natural light, elegant and warm";
}

function buildFlatlayPrompt(ep: StudioMoodEpisode): string {
  const support = SUPPORT_EN[ep.support] ?? ep.support;
  const couleur = ep.couleur_produit ? `in ${ep.couleur_produit}` : "";
  const decor = ep.decor ?? "warm textured surface with natural props — raw linen, pale wood, ceramic";
  const mood = getMoodStyle(ep.humeur);
  return `Create an ultra-realistic editorial lifestyle FLATLAY photograph for a social media hook visual. Style: Sézane × Maison Labiche × Émoï-Émoï.

# THE GARMENT — HERO OF THE IMAGE
A ${support} ${couleur} with the word "${ep.mot_brode}" embroidered on the left chest area. The embroidery is the absolute FOCAL POINT — sharp, large, instantly legible.

${EMBROIDERY_REALISM}

# COMPOSITION — FLATLAY
Styled flat lay viewed from above. The garment is the primary subject, surrounded by tasteful props: ${decor}.
No person, no human body, no hands, no face.

# MOOD & LIGHTING
${mood}. Warm directional natural light, gentle shadows. 35mm film photography aesthetic.

${ep.occasion ? `# OCCASION\n${ep.occasion}.` : ""}

# ABSOLUTE NEGATIVE
- NO person, NO face, NO hands, NO human body parts
- NO printed text, signs, watermarks ANYWHERE. ONLY "${ep.mot_brode}" embroidered on garment.
- NO clinical white studio background
- NO puffy / 3D / foam embroidery`;
}

function buildWornPrompt(
  ep: StudioMoodEpisode,
  canonique: { prenom: string; signature: string } | null
): string {
  const support = SUPPORT_EN[ep.support] ?? ep.support;
  const couleur = ep.couleur_produit ? `in ${ep.couleur_produit}` : "";
  const decor = ep.decor ?? "warm natural environment, soft diffused light";
  const mood = getMoodStyle(ep.humeur);
  const canonInfo = canonique
    ? `${canonique.prenom} — ${canonique.signature}. NOT trying to be liked, NOT performing. Present, natural, authentic. NOT a model — a real person with real skin. Physical reference attached as the first image.`
    : "A real, authentic person (not a model), natural expression, lived-in skin, no retouching.";

  return `Create an ultra-realistic editorial lifestyle PHOTOGRAPH for a social media hook visual. Style: Sézane × Make My Lemonade × Émoï-Émoï.

# THE GARMENT
A ${support} ${couleur} with "${ep.mot_brode}" embroidered on the left chest. Embroidery clearly visible and legible.

${EMBROIDERY_REALISM}

# THE PERSON
${canonInfo}

# COMPOSITION — WORN, TIGHTLY FRAMED
Medium close-up on chest/upper torso. "${ep.mot_brode}" fills the lower center of frame. Face or top of head visible above. 9:16 vertical format.

# MOOD & SETTING
${mood}. Setting: ${decor}.${ep.occasion ? ` Occasion: ${ep.occasion}.` : ""}
Candid moment, not posed. 35mm film grain, warm tones.

# ABSOLUTE NEGATIVE
- NO retouching, NO skin smoothing, NO supermodel look
- NO printed text ANYWHERE. ONLY "${ep.mot_brode}" embroidered on garment.
- NO puffy / 3D / foam embroidery`;
}

async function loadCanoniqueImage(filename: string): Promise<{ data: string; mimeType: string } | null> {
  const repoRoot = join(process.cwd(), "..", "..");
  const filePath = join(repoRoot, "assets", "canoniques", filename);
  try {
    const buffer = await readFile(filePath);
    return { data: buffer.toString("base64"), mimeType: "image/jpeg" };
  } catch {
    console.warn(`[studio-mood visual] Canonique image not found: ${filename}`);
    return null;
  }
}

type GeminiPart =
  | { inlineData: { data: string; mimeType: string } }
  | { text: string };

async function tryGenerate(
  ai: GoogleGenAI,
  prompt: string,
  canoniquesImages: Array<{ data: string; mimeType: string }>,
  aspectRatio: string,
  label: string
): Promise<
  | { imageDataUrl: string }
  | { retry: true }
  | { error: string }
> {
  const parts: GeminiPart[] = [
    ...canoniquesImages.map((img) => ({
      inlineData: { data: img.data, mimeType: img.mimeType },
    })),
    { text: prompt },
  ];

  console.log(`[studio-mood visual] ${label} — aspect ${aspectRatio}, canoniques: ${canoniquesImages.length}`);

  let response;
  try {
    response = await ai.models.generateContent({
      model: "gemini-3.1-flash-image-preview",
      contents: { parts },
      config: { imageConfig: { aspectRatio } },
    });
  } catch {
    console.warn(`[studio-mood visual] ${label}: 3.1-flash-image-preview KO, fallback 2.5`);
    try {
      response = await ai.models.generateContent({
        model: "gemini-2.5-flash-image",
        contents: { parts },
      });
    } catch (e2) {
      return { error: e2 instanceof Error ? e2.message : String(e2) };
    }
  }

  const finishReason = response.candidates?.[0]?.finishReason;
  if (finishReason === "IMAGE_OTHER" || finishReason === "MAX_TOKENS") {
    return { retry: true };
  }
  if (finishReason === "SAFETY") {
    return { error: "Image bloquée par filtres de sécurité Gemini" };
  }

  for (const part of response.candidates?.[0]?.content?.parts ?? []) {
    if (part.inlineData) {
      const { data, mimeType } = part.inlineData;
      return { imageDataUrl: `data:${mimeType ?? "image/png"};base64,${data}` };
    }
  }

  return { error: "Gemini n'a renvoyé aucune image" };
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ message: "GEMINI_API_KEY manquante" }, { status: 500 });
  }

  let body: RequestBody = {};
  try { body = await request.json(); } catch { /* body optionnel */ }

  const ep = await getEpisode(id);
  if (!ep) return NextResponse.json({ message: "Épisode introuvable" }, { status: 404 });

  const composition: Composition = body.composition ?? "flatlay";
  const aspectRatio: AspectRatio = body.aspectRatio ?? "9:16";

  let canoniquesImages: Array<{ data: string; mimeType: string }> = [];
  let canonique: { prenom: string; signature: string } | null = null;

  if (composition === "worn" && body.canoniqueId) {
    const found = CANONIQUES.find((c) => c.id === body.canoniqueId);
    if (found) {
      canonique = found;
      const img = await loadCanoniqueImage(found.filename);
      if (img) canoniquesImages = [img];
    }
  }

  const prompt = composition === "flatlay"
    ? buildFlatlayPrompt(ep)
    : buildWornPrompt(ep, canonique);

  const ai = new GoogleGenAI({ apiKey });

  // Tentative 1 — prompt complet
  const a1 = await tryGenerate(ai, prompt, canoniquesImages, aspectRatio, "ATTEMPT 1");
  if ("imageDataUrl" in a1) {
    return NextResponse.json({ imageDataUrl: a1.imageDataUrl, composition, aspectRatio });
  }

  // Tentative 2 — prompt raccourci (sans section ABSOLUTE NEGATIVE)
  if ("retry" in a1) {
    const shortPrompt = prompt.split("# ABSOLUTE NEGATIVE")[0].trim();
    const a2 = await tryGenerate(ai, shortPrompt, canoniquesImages, aspectRatio, "ATTEMPT 2");
    if ("imageDataUrl" in a2) {
      return NextResponse.json({ imageDataUrl: a2.imageDataUrl, composition, aspectRatio });
    }

    // Tentative 3 — sans canonique si composition worn
    if ("retry" in a2 && canoniquesImages.length > 0) {
      const a3 = await tryGenerate(ai, shortPrompt, [], aspectRatio, "ATTEMPT 3 (no canonique)");
      if ("imageDataUrl" in a3) {
        return NextResponse.json({
          imageDataUrl: a3.imageDataUrl,
          composition,
          aspectRatio,
          note: "Généré sans référence canonique (tentative 3)",
        });
      }
    }
  }

  const errMsg = "error" in a1 ? a1.error : "Gemini n'a pas pu générer le visuel. Réessaie ou change la composition.";
  return NextResponse.json({ message: errMsg }, { status: 500 });
}
