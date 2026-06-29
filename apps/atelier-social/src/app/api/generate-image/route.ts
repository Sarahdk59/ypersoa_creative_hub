/**
 * API Route: /api/generate-image
 * Avec retry IMAGE_OTHER + support format 4:5 (overlay) ou 1:1 (standard)
 */

import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { readFile } from "fs/promises";
import { join } from "path";
import { CANONIQUES } from "@/lib/canoniques";
import { getProduits } from "@/lib/hub-products";

export const runtime = "nodejs";
export const maxDuration = 120;

// Broderie réaliste : Gemini a tendance à extruder un relief mousse 3D non naturel.
// On force une broderie PLATE et fine, fil à fleur du tissu (réf Émoï-Émoï / Sézane).
const EMBROIDERY_REALISM =
  "EMBROIDERY REALISM (CRITICAL): render the embroidery as FLAT, fine, delicate flat machine embroidery — the thread sits almost flush with the fabric, subtle natural satin-stitch sheen, soft and matte, gently following the fabric weave. ABSOLUTELY NOT puffy, NOT 3D, NOT foam/puff embroidery, NOT thick raised or embossed lettering, NOT a bulky plastic-like patch, NO heavy drop shadow under the stitches. Understated and elegant like Émoï-Émoï / Sézane / Maison Labiche embroidery.";

interface RequestBody {
  base64Image: string;
  mimeType: string;
  vibePrompt: string;
  angle: string;
  customPrompt?: string;
  canoniqueIds?: string[];
  aspectRatio?: "1:1" | "4:5" | "2:3"; // NEW
  composition?: "flatlay" | "worn"; // Pinterest HERO = flatlay (sans humain), DÉSIR = worn
  selectedProduct?: string; // YP001, YP005… → verrouille le support brodé
  selectedGarmentColor?: string; // beige, noir… → couleur exacte
  pinterestFormat?: "hero" | "desir" | "association" | "lifestyle"; // association = multi-packshots
}

// Libellé vêtement par produit (pour ancrer le TYPE dans le prompt Gemini).
const GARMENT_WORDS: Record<string, string> = {
  YP001: "Awdis JH001 hoodie (pullover hooded sweatshirt)",
  YP004: "Awdis JH001K kids hoodie",
  YP005: "Awdis JH030 crewneck sweatshirt",
  YP019: "B&C TU05T t-shirt",
  YP021: "Awdis JH050 zip hoodie (zoodie)",
  YP013: "Ypersoa vintage washed cap",
  YP022: "slim-fit t-shirt",
  YP023: "slim-fit t-shirt",
};

interface ResolvedProduct {
  garmentLabel: string;
  colorName: string;
  packshotFile: string | null;
}

function resolveProduct(productId: string, colorId?: string): ResolvedProduct | null {
  let produit;
  try {
    produit = getProduits().find((p) => p.id === productId);
  } catch (e) {
    console.error("[FAIL] getProduits:", e);
    return null;
  }
  if (!produit) return null;
  const col =
    (colorId && produit.couleurs_detaillees.find((c) => c.id_palette === colorId)) ||
    produit.couleurs_detaillees[0];
  return {
    garmentLabel:
      GARMENT_WORDS[productId] ?? `${produit.nom_commercial} (${produit.fournisseur ?? ""})`.trim(),
    colorName: col?.nom_ypersoa ?? colorId ?? "",
    packshotFile: col?.packshot_reference ?? null,
  };
}

async function loadPackshotImage(
  productId: string,
  file: string
): Promise<{ data: string; mimeType: string } | null> {
  const repoRoot = join(process.cwd(), "..", "..");
  const filePath = join(repoRoot, "assets_produits", productId, file);
  try {
    const buffer = await readFile(filePath);
    const mimeType = file.toLowerCase().endsWith(".png") ? "image/png" : "image/webp";
    return { data: buffer.toString("base64"), mimeType };
  } catch (error) {
    console.error(`[FAIL] Failed to load packshot ${productId}/${file}:`, error);
    return null;
  }
}

// Pour le format ASSOCIATION : couleur sélectionnée + autres couleurs avec packshot,
// pour montrer la gamme en flatlay groupé (déclinaisons par couleur).
function pickAssociationColors(
  productId: string,
  primaryColorId: string | undefined,
  n: number
): Array<{ file: string; name: string }> {
  let produit;
  try {
    produit = getProduits().find((p) => p.id === productId);
  } catch {
    return [];
  }
  if (!produit) return [];
  const withPack = produit.couleurs_detaillees.filter((c) => c.packshot_reference);
  const primary = withPack.find((c) => c.id_palette === primaryColorId);
  const rest = withPack.filter((c) => c.id_palette !== primaryColorId);
  return [primary, ...rest]
    .filter((c): c is NonNullable<typeof c> => Boolean(c))
    .slice(0, n)
    .map((c) => ({ file: c.packshot_reference as string, name: c.nom_ypersoa }));
}

// FLAG OBLIGATOIRE : le support brodé DOIT être le produit sélectionné.
// Interdit explicitement les dérives observées (pull en laine, t-shirt gris chiné).
const GARMENT_FORBIDDEN =
  "ABSOLUTELY FORBIDDEN: a knit / wool / cable-knit sweater or pullover, a grey marl / heather-grey t-shirt, any other garment type. Flat fine embroidery only (never puffy/3D).";

function buildProductLockBlock(
  garmentLabel: string,
  colorNames: string[],
  nbPackshots: number,
  isAssociation: boolean
): string {
  if (isAssociation) {
    return `

# ⚠️ PRODUCT LOCK — NON-NEGOTIABLE (ASSOCIATION)
Group together several ${garmentLabel} pieces in different colorways${
      colorNames.length ? ` (${colorNames.join(", ")})` : ""
    }, arranged as an editorial product family flatlay. Each piece carries the SAME embroidery (from the embroidery reference image), flat and fine.
${
  nbPackshots > 0
    ? `The attached packshots (plain garments on a white/studio background) define the EXACT shapes and colors — reproduce them faithfully.`
    : ""
}
${GARMENT_FORBIDDEN}`;
  }
  const what = `${garmentLabel}${colorNames[0] ? ` in ${colorNames[0]}` : ""}`;
  return `

# ⚠️ PRODUCT LOCK — NON-NEGOTIABLE
The garment MUST be the ${what}.
${
  nbPackshots > 0
    ? `Among the attached images, the one showing a PLAIN garment with NO embroidery on a white/studio background is the OFFICIAL packshot of this exact product. Reproduce its SHAPE (cut, silhouette, neckline/hood, sleeves, rib finish) AND its exact COLOR. Apply the embroidery design (from the embroidery reference image) onto THIS garment, left chest.`
    : ""
}
${GARMENT_FORBIDDEN} No other color than ${colorNames[0] || "the selected one"}. If unsure, default to the packshot garment.`;
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
  if (angle.startsWith("FLATLAY HERO")) {
    return "FLATLAY : Styled flat lay of the embroidered garment on a warm textured surface (linen, wood) with natural props and warm light. NO person. Close focus on the embroidery, thread texture visible. NOT a white studio background.";
  }
  if (angle.startsWith("WORN CLOSE-UP")) {
    return "CLOSE-UP : The garment worn, framed tightly on the embroidered zone (chest or wrist), embroidery large and legible, a glimpse of shoulder/forearm and fabric folds. Warm natural light.";
  }
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

function buildFlatlayPrompt(
  angle: string,
  vibePrompt: string,
  customPrompt: string | undefined
): string {
  const customInstruction = customPrompt ? `\n\nART DIRECTOR REQUEST: "${customPrompt}".` : "";

  return `Create an ultra-realistic, warm, editorial lifestyle FLATLAY photograph in the style of Sézane × Maison Labiche × Émoï-Émoï.

# THE GARMENT
The image must feature the exact embroidered textile item shown in the first reference image.

⚠️ EMBROIDERY FIDELITY: The embroidery must MATCH EXACTLY the embroidery in the first reference image — same design, same letters, same colors, same placement. DO NOT add, remove, modify, or invent any letter or symbol. The embroidered detail is the HERO of the image and must be sharp, large, and instantly legible.

${EMBROIDERY_REALISM}

# COMPOSITION
${angle}

Vibe / styling mood: ${vibePrompt}${customInstruction}

# STYLE
- Warm directional natural light, soft shadows
- Textured surfaces and tasteful natural props (raw linen, pale wood, ceramic, dried flowers)
- 35mm film photography aesthetic, cozy and desirable

# ABSOLUTE NEGATIVE
- NO person, NO human body, NO face, NO hands
- NO clinical white studio background, NO plain cut-out product shot
- NO printed text, signs, posters, labels, watermarks, brand names ANYWHERE. The ONLY text allowed is the embroidered text on the garment itself.`;
}

function buildPrompt(
  angle: string,
  vibePrompt: string,
  customPrompt: string | undefined,
  canoniques: Array<{ prenom: string; age: number; genre: string; signature: string }>,
  isRetry: boolean = false,
  composition: "flatlay" | "worn" = "worn"
): string {
  if (composition === "flatlay") {
    return buildFlatlayPrompt(angle, vibePrompt, customPrompt);
  }

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
${EMBROIDERY_REALISM}
NO text or signs in the background.`;
  }

  return `Create an ultra-realistic, emotional, sober editorial fashion photograph in the style of Sézane × A.P.C. × Maison Labiche campaign aesthetic.

# THE GARMENT
The image must feature the exact embroidered textile item shown in the first reference image.

⚠️ EMBROIDERY FIDELITY: The embroidery on the garment must MATCH EXACTLY the embroidery in the first reference image. Same design, same letters, same colors, same placement (left chest). DO NOT add, remove, modify, or invent any letter or symbol.

${EMBROIDERY_REALISM}
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
    composition = "worn",
    selectedProduct,
    selectedGarmentColor,
    pinterestFormat,
  } = body;

  // Un flatlay n'a pas de personnage : on ignore les canoniques pour ce format.
  const effectiveCanoniqueIds = composition === "flatlay" ? [] : canoniqueIds;

  console.log("[INFO] Angle:", angle.substring(0, 80));
  console.log("[INFO] Aspect ratio:", aspectRatio, "| Composition:", composition);
  console.log("[INFO] Canoniques:", effectiveCanoniqueIds);
  console.log("[INFO] Produit:", selectedProduct, "| Couleur:", selectedGarmentColor);

  if (!base64Image || !mimeType || !vibePrompt || !angle) {
    return NextResponse.json({ message: "Paramètres requis manquants" }, { status: 400 });
  }

  // Verrou produit : packshot(s) du produit sélectionné comme référence + flag obligatoire.
  // Association = plusieurs couleurs groupées ; autres formats = couleur sélectionnée seule.
  const packshotImages: Array<{ data: string; mimeType: string }> = [];
  let productLockBlock = "";
  if (selectedProduct) {
    const resolved = resolveProduct(selectedProduct, selectedGarmentColor);
    if (resolved) {
      const isAssociation = pinterestFormat === "association";
      if (isAssociation) {
        const colors = pickAssociationColors(selectedProduct, selectedGarmentColor, 3);
        for (const c of colors) {
          const img = await loadPackshotImage(selectedProduct, c.file);
          if (img) packshotImages.push(img);
        }
        productLockBlock = buildProductLockBlock(
          resolved.garmentLabel,
          colors.map((c) => c.name),
          packshotImages.length,
          true
        );
      } else {
        if (resolved.packshotFile) {
          const img = await loadPackshotImage(selectedProduct, resolved.packshotFile);
          if (img) packshotImages.push(img);
        }
        productLockBlock = buildProductLockBlock(
          resolved.garmentLabel,
          [resolved.colorName],
          packshotImages.length,
          false
        );
      }
      console.log(
        "[INFO] Product lock:",
        resolved.garmentLabel,
        "| format:",
        pinterestFormat ?? "—",
        "| packshots:",
        packshotImages.length
      );
    }
  }

  const canoniques = effectiveCanoniqueIds
    .map((id) => CANONIQUES.find((c) => c.id === id))
    .filter((c): c is NonNullable<typeof c> => Boolean(c));

  const canoniqueImages: Array<{ data: string; mimeType: string }> = [];
  for (const id of effectiveCanoniqueIds) {
    const img = await loadCanoniqueImage(id);
    if (img) canoniqueImages.push(img);
  }

  const ai = new GoogleGenAI({ apiKey });

  const attempt1 = await tryGenerate({
    ai,
    prompt: buildPrompt(angle, vibePrompt, customPrompt, canoniques, false, composition) + productLockBlock,
    base64Image,
    mimeType,
    canoniqueImages,
    packshotImages,
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
      prompt: buildPrompt(simplifyAngle(angle), vibePrompt, customPrompt, canoniques, true, composition) + productLockBlock,
      base64Image,
      mimeType,
      canoniqueImages,
      packshotImages,
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
        prompt: buildPrompt(simplifyAngle(angle), vibePrompt, customPrompt, [], true, composition) + productLockBlock,
        base64Image,
        mimeType,
        canoniqueImages: [],
        packshotImages,
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
  packshotImages = [],
  aspectRatio,
  attemptLabel,
}: {
  ai: GoogleGenAI;
  prompt: string;
  base64Image: string;
  mimeType: string;
  canoniqueImages: Array<{ data: string; mimeType: string }>;
  packshotImages?: Array<{ data: string; mimeType: string }>;
  aspectRatio: "1:1" | "4:5" | "2:3";
  attemptLabel: string;
}): Promise<{
  success: boolean;
  imageDataUrl?: string;
  shouldRetry?: boolean;
  errorMessage?: string;
}> {
  // Ordre parts[] : broderie (1ère réf) → canoniques → packshot(s) (forme/couleur, APRÈS
  // la broderie pour ne pas la parasiter) → texte. Cf. mémoire feedback_gemini_parts_order.
  const parts: Array<{ inlineData?: { data: string; mimeType: string }; text?: string }> = [
    { inlineData: { data: base64Image, mimeType } },
  ];
  for (const canImg of canoniqueImages) {
    parts.push({ inlineData: { data: canImg.data, mimeType: canImg.mimeType } });
  }
  for (const packImg of packshotImages) {
    parts.push({ inlineData: { data: packImg.data, mimeType: packImg.mimeType } });
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
