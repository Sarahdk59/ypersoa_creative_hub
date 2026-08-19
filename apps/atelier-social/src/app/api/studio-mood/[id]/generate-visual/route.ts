/**
 * POST /api/studio-mood/[id]/generate-visual
 *
 * Génère un visuel hook pour un épisode Studio Mood.
 * Format 9:16 par défaut (Reels/TikTok), ou 1:1 / 4:5 selon le besoin.
 * Composition : flatlay (sans personnage) / worn (canonique, décor éditorial)
 * / cutout (canonique, fond neutre studio, détouré automatiquement — pour collage).
 * Système retry aligné sur generate-image : primary gemini-3.1, fallback 2.5.
 */
import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { readFile } from "fs/promises";
import { join } from "path";
import { removeBackground } from "@imgly/background-removal-node";
import { getEpisode } from "@/lib/studio-mood/episodes-loader";
import { CANONIQUES } from "@/lib/canoniques";
import { getProduits } from "@/lib/hub-products";
import { getMotifs } from "@/lib/atelier-da/referentiels-loader";
import type { MotifYpm, MotifVariante } from "@/lib/atelier-da/referentiels-loader";
import type { StudioMoodEpisode, SupportType } from "@/lib/studio-mood/types";

export const runtime = "nodejs";
export const maxDuration = 120;

type AspectRatio = "9:16" | "1:1" | "3:4";
type Composition = "flatlay" | "worn" | "cutout";

// Détourage serveur (alpha réel, cf. @imgly/background-removal-node) — utilisé
// uniquement pour composition "cutout", pensée pour un fond studio neutre.
async function detourDataUrl(dataUrl: string): Promise<string> {
  const match = dataUrl.match(/^data:image\/\w+;base64,(.+)$/);
  if (!match) return dataUrl;
  try {
    const input = Buffer.from(match[1], "base64");
    const blob = await removeBackground(input);
    const output = Buffer.from(await blob.arrayBuffer());
    return `data:image/png;base64,${output.toString("base64")}`;
  } catch (error) {
    console.error("[studio-mood visual] detourDataUrl failed:", error);
    return dataUrl; // on renvoie l'image non détourée plutôt que de faire échouer toute la génération
  }
}

interface RequestBody {
  canoniqueId?: string;
  aspectRatio?: AspectRatio;
  composition?: Composition;
  /** Override manuel — bibliothèque de variantes motifs (sinon : motif de l'épisode + matching occasion). */
  motifOverride?: { motifId: string; varianteFile?: string };
  /** Override manuel — catalogue produits Hub (sinon : produit déduit du support de l'épisode). */
  produitOverride?: { produitId: string; couleurId?: string };
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

// Ambiance ≠ expression. HUMEUR_MOOD ne pilote que la lumière/composition (ci-dessus) ;
// sans cette table, la signature figée du canonique (ex: Clémence "closed-mouth composed
// expression") l'emporte toujours sur l'humeur de l'épisode côté Gemini.
const HUMEUR_EXPRESSION: Record<string, string> = {
  Tendresse:           "soft warm smile, eyes gentle and tender, chin tilted slightly down",
  Fierté:              "proud open smile, chin lifted, relaxed confident shoulders",
  Complicité:          "warm knowing smile as if shared with someone off-frame, eyes crinkled",
  "Joyeux bordel":     "wide open genuine laugh, head tilted back slightly, eyes crinkled with joy, spontaneous energy",
  "Nostalgie douce":   "soft wistful half-smile, gaze drifting slightly away, gentle and dreamy",
  Surprise:            "eyebrows raised, mouth open in delighted surprise, eyes wide and bright",
  "Quotidien magique": "quiet content smile, relaxed natural expression, present in the moment",
  Espièglerie:         "playful smirk, one eyebrow slightly raised, mischievous sparkle in the eyes",
  "Amour assumé":      "warm confident smile, soft direct gaze, open and unguarded",
  "Retour en forme":   "energized bright smile, alert eyes, dynamic posture",
  "Tendresse senior":  "warm gentle smile, soft eyes, calm nurturing presence",
  "Fête et surprise":  "joyful open laugh, bright eyes, festive energetic expression",
};

function getExpression(humeur: string): string {
  return HUMEUR_EXPRESSION[humeur] ?? "warm natural genuine expression fitting the mood";
}

// ---------------------------------------------------------------------------
// PRODUCT LOCK — même logique que /api/generate-image : injecter le vrai
// packshot (forme + couleur catalogue) au lieu de laisser Gemini deviner un
// nom de couleur en texte libre. Sans ça, un champ vide ou une couleur hors
// catalogue ("Evergreen"…) donne un vêtement générique gris.
// ---------------------------------------------------------------------------

const SUPPORT_TO_PRODUCT: Record<SupportType, string | null> = {
  sweat: "YP001", // Hoodie Adulte — "Sweat à capuche" = à capuche = hoodie, pas col rond
  tshirt: "YP019",
  casquette: "YP013",
  accessoire: null, // pas de produit catalogue équivalent, pas de verrou possible
};

const GARMENT_WORDS_VISUAL: Record<string, string> = {
  YP001: "Awdis JH001 hoodie (pullover hooded sweatshirt)",
  YP019: "B&C TU05T t-shirt",
  YP013: "Ypersoa vintage washed cap",
};

const GARMENT_FORBIDDEN =
  "ABSOLUTELY FORBIDDEN: a knit / wool / cable-knit sweater or pullover, a grey marl / heather-grey garment (unless that IS the selected color), any other garment type. Flat fine embroidery only (never puffy/3D).";

function normalizeColorText(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

interface ResolvedEpisodeProduct {
  productId: string;
  garmentLabel: string;
  colorName: string;
  packshotFile: string | null;
}

function resolveEpisodeProduct(
  ep: StudioMoodEpisode,
  override?: { produitId: string; couleurId?: string }
): ResolvedEpisodeProduct | null {
  const productId = override?.produitId ?? SUPPORT_TO_PRODUCT[ep.support];
  if (!productId) return null;

  let produit;
  try {
    produit = getProduits().find((p) => p.id === productId);
  } catch (e) {
    console.error("[studio-mood visual] getProduits failed:", e);
    return null;
  }
  if (!produit) return null;

  const withPackshot = produit.couleurs_detaillees.filter((c) => c.packshot_reference);

  let matched;
  if (override?.couleurId) {
    matched = produit.couleurs_detaillees.find((c) => c.id_palette === override.couleurId);
  }
  if (!matched) {
    const wanted = ep.couleur_produit ? normalizeColorText(ep.couleur_produit) : "";
    matched =
      (wanted &&
        withPackshot.find((c) => {
          const n = normalizeColorText(c.nom_ypersoa);
          return n.includes(wanted) || wanted.includes(n);
        })) ||
      withPackshot[0] ||
      produit.couleurs_detaillees[0];
  }

  return {
    productId,
    garmentLabel: GARMENT_WORDS_VISUAL[productId] ?? produit.nom_commercial,
    colorName: matched?.nom_ypersoa ?? ep.couleur_produit ?? "",
    packshotFile: matched?.packshot_reference ?? null,
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
    console.error(`[studio-mood visual] Failed to load packshot ${productId}/${file}:`, error);
    return null;
  }
}

function buildProductLockBlock(resolved: ResolvedEpisodeProduct, hasPackshot: boolean): string {
  return `

# ⚠️ PRODUCT LOCK — NON-NEGOTIABLE
The garment MUST be the ${resolved.garmentLabel}${resolved.colorName ? ` in ${resolved.colorName}` : ""}.
${
  hasPackshot
    ? "Among the attached images, the one showing a PLAIN garment with NO embroidery on a white/studio background is the OFFICIAL packshot of this exact product. Reproduce its SHAPE (cut, silhouette, neckline/hood, sleeves, rib finish) AND its exact COLOR."
    : ""
}
${GARMENT_FORBIDDEN} No other color than ${resolved.colorName || "the selected one"}. If unsure, default to the packshot garment.`;
}

// ---------------------------------------------------------------------------
// MOTIF FIDELITY — sans référence image, Gemini embroide ep.mot_brode en texte
// plat et ignore la vraie structure graphique du motif (ex: YPM-003 "Le Club"
// est un badge rond cercle + cœur + 2 mots, pas du texte empilé). On injecte
// l'asset du motif (ou de la variante la plus proche de l'occasion) comme
// référence de STRUCTURE, avec instruction de remplacer uniquement les mots.
// ---------------------------------------------------------------------------

interface ResolvedMotifReference {
  motif: MotifYpm;
  variante: MotifVariante | null;
  file: string;
  url?: string;
}

function resolveMotifReference(
  ep: StudioMoodEpisode,
  override?: { motifId: string; varianteFile?: string }
): ResolvedMotifReference | null {
  const motifId = override?.motifId ?? ep.motif_ypm_id;
  if (!motifId) return null;
  let ref;
  try {
    ref = getMotifs();
  } catch (e) {
    console.error("[studio-mood visual] getMotifs failed:", e);
    return null;
  }
  const motif = ref.motifs.find((m) => m.id === motifId);
  if (!motif) return null;

  let matched: MotifVariante | null = null;
  if (override?.varianteFile) {
    matched = motif.variantes.find((v) => v.file === override.varianteFile) ?? null;
  }
  if (!matched) {
    const occasionNorm = ep.occasion ? normalizeColorText(ep.occasion) : "";
    matched =
      (occasionNorm &&
        motif.variantes.find((v) =>
          (v.occasions ?? []).some((o) => normalizeColorText(o).includes(occasionNorm) || occasionNorm.includes(normalizeColorText(o)))
        )) ||
      null;
  }

  return {
    motif,
    variante: matched,
    file: matched?.file ?? motif.asset_principal,
    url: matched?.url ?? motif.asset_principal_url,
  };
}

async function loadMotifImage(resolved: ResolvedMotifReference): Promise<{ data: string; mimeType: string } | null> {
  const mimeType = resolved.file.toLowerCase().endsWith(".png") ? "image/png" : "image/jpeg";
  if (resolved.url) {
    try {
      const res = await fetch(resolved.url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buffer = Buffer.from(await res.arrayBuffer());
      return { data: buffer.toString("base64"), mimeType };
    } catch (error) {
      console.error(`[studio-mood visual] Failed to fetch motif image ${resolved.url}:`, error);
      return null;
    }
  }
  const repoRoot = join(process.cwd(), "..", "..");
  const filePath = join(repoRoot, "assets", "motifs", resolved.file);
  try {
    const buffer = await readFile(filePath);
    return { data: buffer.toString("base64"), mimeType };
  } catch (error) {
    console.error(`[studio-mood visual] Failed to load motif image ${filePath}:`, error);
    return null;
  }
}

function buildMotifFidelityBlock(resolved: ResolvedMotifReference, hasImage: boolean, motBrode: string): string {
  const { motif, variante } = resolved;
  const composition = motif.bible?.composition;
  const regles = motif.bible?.regles_validation;
  return `

# ⚠️ MOTIF FIDELITY — NON-NEGOTIABLE
The embroidery is NOT free-form text. It MUST follow the "${motif.nom_commercial}" (${motif.id}) motif's fixed graphic structure${variante ? `, in the style of its "${variante.label}" variant` : ""}.
${
  hasImage
    ? "Among the attached images, the one showing ONLY an embroidery graphic on a plain background (no garment) is the OFFICIAL motif structure reference. Reproduce its exact composition — circle/badge shape, symbol placement, curved or stacked text arrangement — do NOT flatten it into plain horizontal text."
    : ""
}
${composition ? `Composition: ${composition}.` : ""}
${regles ? `Design rules: ${regles}` : ""}
Replace ONLY the wording with "${motBrode}" (split it across the design's text zones the way the reference shows), keeping the exact same layout, symbol and structure.`;
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
  const expression = getExpression(ep.humeur);
  const canonInfo = canonique
    ? `${canonique.prenom} — ${canonique.signature}. FOR THIS SPECIFIC SHOT, her expression is: ${expression} — this expression OVERRIDES any neutral/composed/closed-mouth expression implied by the description above, which only defines identity (hair, eyes, freckles, lips), NOT the expression for this shot. NOT trying to be liked, NOT performing. Present, natural, authentic. NOT a model — a real person with real skin. Physical reference attached as the first image.`
    : `A real, authentic person (not a model), ${expression}, lived-in skin, no retouching.`;

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

function buildCutoutPrompt(
  ep: StudioMoodEpisode,
  canonique: { prenom: string; signature: string } | null
): string {
  const support = SUPPORT_EN[ep.support] ?? ep.support;
  const couleur = ep.couleur_produit ? `in ${ep.couleur_produit}` : "";
  const expression = getExpression(ep.humeur);
  const canonInfo = canonique
    ? `${canonique.prenom} — ${canonique.signature}. FOR THIS SPECIFIC SHOT, her expression and body language convey: ${expression} — this OVERRIDES any neutral/composed/closed-mouth expression implied by the description above, which only defines identity (hair, eyes, freckles, lips), NOT the expression for this shot. NOT trying to be liked, NOT performing. Present, natural, authentic. Physical reference attached as the first image.`
    : `A real, authentic person (not a model), ${expression}, lived-in skin, no retouching.`;

  return `Create an ultra-realistic STUDIO CUTOUT photograph, designed to be background-removed afterward and composited into a graphic collage. Style: fashion e-commerce cutout meets editorial warmth.

# THE GARMENT
A ${support} ${couleur} with "${ep.mot_brode}" embroidered on the left chest. Embroidery clearly visible and legible.

${EMBROIDERY_REALISM}

# THE PERSON
${canonInfo}
Full body or 3/4 length framing. A dynamic, natural pose expressing the mood — mid-stride, mid-gesture, candid motion. NOT a static frontal ID-photo stance.

# COMPOSITION — STUDIO CUTOUT, CLEAN EDGES
Solid, perfectly SEAMLESS, evenly lit pale neutral grey studio background. NO visible horizon line, NO props, NO decor, NO texture or gradient in the background. Soft even studio lighting from the front, minimal shadow cast on the backdrop, so the silhouette edge is crisp and easy to separate from the background. 9:16 vertical format, generous empty space around the figure (do not crop the body tightly).

# ABSOLUTE NEGATIVE
- NO furniture, NO plants, NO environment of any kind
- NO retouching, NO skin smoothing, NO supermodel look
- NO printed text ANYWHERE. ONLY "${ep.mot_brode}" embroidered on garment.
- NO puffy / 3D / foam embroidery
- NO strong drop shadow cast on the background`;
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
  referenceImages: Array<{ data: string; mimeType: string }>,
  aspectRatio: string,
  label: string
): Promise<
  | { imageDataUrl: string }
  | { retry: true }
  | { error: string }
> {
  const parts: GeminiPart[] = [
    ...referenceImages.map((img) => ({
      inlineData: { data: img.data, mimeType: img.mimeType },
    })),
    { text: prompt },
  ];

  console.log(`[studio-mood visual] ${label} — aspect ${aspectRatio}, images: ${referenceImages.length}`);

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

  if ((composition === "worn" || composition === "cutout") && body.canoniqueId) {
    const found = CANONIQUES.find((c) => c.id === body.canoniqueId);
    if (found) {
      canonique = found;
      const img = await loadCanoniqueImage(found.filename);
      if (img) canoniquesImages = [img];
    }
  }

  // Verrou motif : structure graphique réelle (badge, disposition du texte, symbole)
  // injectée comme référence — sinon Gemini brode ep.mot_brode en texte plat générique.
  const motifImages: Array<{ data: string; mimeType: string }> = [];
  const resolvedMotif = resolveMotifReference(ep, body.motifOverride);
  let motifFidelityBlock = "";
  if (resolvedMotif) {
    const img = await loadMotifImage(resolvedMotif);
    if (img) motifImages.push(img);
    motifFidelityBlock = buildMotifFidelityBlock(resolvedMotif, motifImages.length > 0, ep.mot_brode);
    console.log(
      `[studio-mood visual] Motif lock: ${resolvedMotif.motif.id} / ${resolvedMotif.variante?.label ?? "asset_principal"} (image: ${motifImages.length > 0})`
    );
  }

  // Verrou produit : packshot réel (forme + couleur catalogue) injecté comme référence,
  // pour flatlay ET worn. Sans ça, une couleur en texte libre (ou vide) laisse Gemini deviner.
  const packshotImages: Array<{ data: string; mimeType: string }> = [];
  const resolvedProduct = resolveEpisodeProduct(ep, body.produitOverride);
  let productLockBlock = "";
  if (resolvedProduct) {
    if (resolvedProduct.packshotFile) {
      const img = await loadPackshotImage(resolvedProduct.productId, resolvedProduct.packshotFile);
      if (img) packshotImages.push(img);
    }
    productLockBlock = buildProductLockBlock(resolvedProduct, packshotImages.length > 0);
    console.log(
      `[studio-mood visual] Product lock: ${resolvedProduct.garmentLabel} / ${resolvedProduct.colorName} (packshot: ${packshotImages.length > 0})`
    );
  }

  // Ordre parts[] : canonique (identité) → motif (structure broderie) → packshot (forme/couleur) → texte.
  const referenceImagesFull = [...canoniquesImages, ...motifImages, ...packshotImages];

  const basePrompt = composition === "flatlay"
    ? buildFlatlayPrompt(ep)
    : composition === "cutout"
      ? buildCutoutPrompt(ep, canonique)
      : buildWornPrompt(ep, canonique);
  const prompt = basePrompt + motifFidelityBlock + productLockBlock;

  // composition "cutout" : détourage serveur systématique avant de renvoyer l'image.
  async function respond(imageDataUrl: string, extra: Record<string, unknown> = {}) {
    const finalImage = composition === "cutout" ? await detourDataUrl(imageDataUrl) : imageDataUrl;
    return NextResponse.json({ imageDataUrl: finalImage, composition, aspectRatio, ...extra });
  }

  const ai = new GoogleGenAI({ apiKey });

  // Tentative 1 — prompt complet
  const a1 = await tryGenerate(ai, prompt, referenceImagesFull, aspectRatio, "ATTEMPT 1");
  if ("imageDataUrl" in a1) {
    return respond(a1.imageDataUrl);
  }

  // Tentative 2 — prompt raccourci (sans section ABSOLUTE NEGATIVE), verrous motif+produit conservés
  if ("retry" in a1) {
    const shortPrompt = basePrompt.split("# ABSOLUTE NEGATIVE")[0].trim() + motifFidelityBlock + productLockBlock;
    const a2 = await tryGenerate(ai, shortPrompt, referenceImagesFull, aspectRatio, "ATTEMPT 2");
    if ("imageDataUrl" in a2) {
      return respond(a2.imageDataUrl);
    }

    // Tentative 3 — sans canonique si composition worn/cutout ; motif + packshot (verrous) restent
    if ("retry" in a2 && canoniquesImages.length > 0) {
      const a3 = await tryGenerate(ai, shortPrompt, [...motifImages, ...packshotImages], aspectRatio, "ATTEMPT 3 (no canonique)");
      if ("imageDataUrl" in a3) {
        return respond(a3.imageDataUrl, {
          note: "⚠️ Généré SANS référence canonique (échec Gemini après 2 tentatives) — ce n'est pas le vrai visage de la canonique, régénère si le résultat ne convient pas.",
        });
      }
    }
  }

  const errMsg = "error" in a1 ? a1.error : "Gemini n'a pas pu générer le visuel. Réessaie ou change la composition.";
  return NextResponse.json({ message: errMsg }, { status: 500 });
}
