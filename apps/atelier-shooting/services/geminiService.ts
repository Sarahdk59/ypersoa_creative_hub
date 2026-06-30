
import { GoogleGenAI, HarmCategory, HarmBlockThreshold } from "@google/genai";
import { GenerationSettings } from "../types";
import { PROMPT_BASE, PACKSHOT_PROMPT, MODEL_DESCRIPTION, FAMILY_DESCRIPTION, SHOTS_CONFIG, PRODUCT_MATERIALS, PRODUCT_DESCRIPTION_FR, THREAD_COLORS, FULL_PACK_PARISIEN, FULL_PACK_MINIMALIST, FULL_PACK_LOFT, FULL_PACK_SERRE, FULL_PACK_AUBE, FULL_PACK_SAUVAGE, FULL_PACK_SEPIA, DECOR_DESCRIPTIONS, isHeadwear, HEADWEAR_OVERRIDE, CAP_PACKSHOT_PROMPT, CAP_MACRO_SUFFIX } from "../constants";
import { DecorStyle } from "../types";
import { fetchCanoniqueAsBase64, getCanoniqueById, Canonique } from "../lib/canoniques";
import { getGarmentById, HUB_FILS } from "../lib/hub-data";
import { buildDecorFromLookbookAmbiance, buildFullPackFromLookbook } from "../lib/active-ambiances";

/**
 * Convertit l'id Hub d'une couleur fil ('fil_framboise') en label human-readable ('Framboise')
 * pour insertion dans les prompts EN. Si threadColor === '' (Comme sur l'image), retourne
 * une instruction qui dit à Gemini de respecter la couleur du PNG source.
 */
function threadColorLabel(threadColorId: string): string {
  if (!threadColorId) return "identique à l'image fournie (preserve the source PNG embroidery color)";
  const fil = THREAD_COLORS.find(c => c.value === threadColorId);
  return fil?.label || threadColorId;
}

/**
 * Description couleur fil(s) injectée dans les prompts. Si settings.threadPaletteIds
 * est rempli, on construit un bloc MULTICOLORE listant chaque fil de la palette
 * avec son nom + hex — chaque lettre/forme du motif pioche dans cette palette
 * (mapping figé entre tous les shots). Sinon on retombe sur le label mono.
 */
function buildThreadDescription(settings: GenerationSettings): string {
  const ids = settings.threadPaletteIds ?? [];
  if (ids.length > 1) {
    const fils = ids
      .map(id => HUB_FILS.find(f => f.id === id))
      .filter((f): f is NonNullable<typeof f> => Boolean(f));
    const names = fils.map(f => `${f.nom} (${f.hex})`).join(", ");
    return `MULTICOLOR PALETTE — embroidery uses MULTIPLE thread colors from this EXACT palette and NOTHING ELSE: ${names}. Each letter / each shape of the motif is rendered in ONE of these threads. The color-to-letter mapping must be IDENTICAL across every shot of the pack (same letter = same thread color in every image). DO NOT invent colors outside the palette, DO NOT collapse to a single thread, DO NOT desaturate. The visible thread colors are these and only these`;
  }
  return threadColorLabel(settings.threadColor);
}

/**
 * Bloc dimension broderie injecté à la place de [DIMENSION] / [SIZE].
 * Donne à Gemini : taille cm exacte + ratio par rapport à la poitrine + repère
 * haptique (pièce/carte/paume) + règle d'invariance proportionnelle entre shots.
 * Sans ce bloc, Gemini ignore "8 cm" et fait varier la broderie de 5% à 60%
 * du cadre entre 2 shots du même pack.
 */
function buildEmbroideryBlock(sizeCm: number, productId: string): string {
  // Coiffe : on raisonne par rapport au DEVANT DE LA CALOTTE (~13 cm de large
  // utile), pas à la poitrine. Une broderie casquette dépasse rarement ~7 cm.
  const headwear = isHeadwear(productId);
  // Largeur de la surface de référence : calotte ~13cm, poitrine enfant ~35cm, adulte ~50cm.
  const surfaceWidthCm = headwear ? 13 : (productId === "YP004" ? 35 : 50);
  const surfaceLabel = headwear ? "cap front panel" : "wearer's chest";
  const surfaceRatio = Math.round((sizeCm / surfaceWidthCm) * 100);

  // Catégorie + repère haptique (objets familiers de référence pour Gemini).
  let category: string;
  let hapticRef: string;
  if (headwear) {
    // Repères dédiés casquette (broderie front-calotte).
    if (sizeCm <= 2) {
      category = "MICRO broderie casquette (petite initiale / symbole)";
      hapticRef = "about the size of a fingernail";
    } else if (sizeCm <= 5) {
      category = "PETITE broderie front-calotte discrète";
      hapticRef = "about the size of a large coin";
    } else {
      category = "STANDARD broderie front-calotte (logo/texte centré)";
      hapticRef = "about the size of a matchbox / small credit-card height — fills most of the cap front panel";
    }
  } else if (sizeCm <= 2) {
    category = "MICRO initiale brodée (poignet / col / ourlet)";
    hapticRef = "plus petit qu'une pièce de 2€ — about the size of a fingernail";
  } else if (sizeCm <= 4) {
    category = "PETITE broderie discrète (poignet ou côté cœur fin)";
    hapticRef = "about the size of a matchbox — smaller than a credit card";
  } else if (sizeCm <= 8) {
    category = "STANDARD côté cœur (taille canonique Ypersoa)";
    hapticRef = "about the size of a credit card — fits inside a closed palm";
  } else {
    category = "GRANDE broderie centre dos / poitrine large";
    hapticRef = "about the size of an open hand — larger than a palm but smaller than a sheet of A4";
  }

  const support = headwear ? "cap" : "garment";
  const distanceHint = headwear
    ? "A wide shot of a person wearing the cap shows it as a small detail on the cap front, a close-up on the cap shows it bigger in frame, but the embroidery itself keeps the same physical size on the cap front panel in every image."
    : "A full-body shot shows it as a small detail, a chest crop shows it bigger in frame, but the embroidery itself has the same physical size on the garment in every image.";

  return `EMBROIDERY PHYSICAL SIZE (ABSOLUTE — same across every shot of the pack) :
  • Real-world width : EXACTLY ${sizeCm} cm wide on the ${support} (NOT "${sizeCm}cm maximum", NOT "around ${sizeCm}cm" — EXACTLY ${sizeCm} cm).
  • Proportion : ~${surfaceRatio}% of the ${surfaceLabel} width (~${surfaceWidthCm}cm wide). The embroidery occupies roughly ${surfaceRatio}% of the horizontal span of the ${surfaceLabel}.
  • Haptic reference : ${category} — ${hapticRef}.
  • INVARIANT across the pack : this physical ${sizeCm}cm width NEVER changes between shots — only the camera distance changes. ${distanceHint} DO NOT make the embroidery huge on one shot and tiny on the next.`;
}

/**
 * Convertit l'id Hub d'une couleur vêtement ('beige') en label human-readable ('Beige')
 * pour insertion dans les prompts EN.
 */
function garmentColorLabel(garmentColorId: string): string {
  const garment = getGarmentById(garmentColorId);
  return garment?.nom || garmentColorId;
}

/**
 * Hook 1 — Build le bloc "context" canonique pour remplacer MODEL_DESCRIPTION
 * quand l'utilisateur sélectionne un mannequin canonique du Hub.
 * La signature EN courte (30-80 mots) est concaténée avec le préfixe character
 * reference Gemini ("using the uploaded reference portrait as the character's face identity").
 */
function buildCanoniqueContext(canoniques: Canonique[]): string {
  if (canoniques.length === 0) return "";
  if (canoniques.length === 1) {
    const c = canoniques[0];
    return `MANNEQUIN (CHARACTER REFERENCE PERSISTANT) : Using the uploaded reference portrait as the character's face identity — same ${c.genre === 'homme' ? 'man' : c.genre === 'enfant' ? 'child' : 'woman'}, exact same face features preserved across all generations. ${c.prenom}, ${c.age} years old : ${c.signature}. Real human features with natural imperfections, no retouching, no skin smoothing, no beauty filter, no celebrity polish.`;
  }
  // Multi-canoniques (V2 famille) — pour V1 on s'arrête à 1 mais on prépare le terrain
  const intro = `${canoniques.length} CHARACTERS (REFERENCE PERSISTANTS) : Using the uploaded reference portraits as the characters' face identities — exact same face features preserved across all generations.`;
  const descriptions = canoniques.map(c => `- ${c.prenom}, ${c.age} : ${c.signature}`).join("\n");
  return `${intro}\n${descriptions}\nReal humans with natural imperfections, no retouching, no skin smoothing.`;
}

/**
 * Charge tous les canoniques sélectionnés et retourne leurs blocs inlineData
 * prêts à injecter en parts[] AVANT l'image broderie.
 */
async function loadCanoniqueParts(canoniqueIds: string[]): Promise<Array<{ inlineData: { data: string; mimeType: string } }>> {
  const parts: Array<{ inlineData: { data: string; mimeType: string } }> = [];
  for (const id of canoniqueIds) {
    const c = getCanoniqueById(id);
    if (!c) {
      console.warn(`Canonique introuvable : ${id}`);
      continue;
    }
    try {
      const { data, mimeType } = await fetchCanoniqueAsBase64(c.filename);
      parts.push({ inlineData: { data, mimeType } });
    } catch (err) {
      console.error(`Erreur fetch canonique ${id}:`, err);
    }
  }
  return parts;
}

/**
 * Charge le packshot fond blanc du produit pour ancrer Gemini sur la VRAIE forme
 * (capuche, cordons sans embout, poche kangourou, finitions Awdis).
 *
 * Limité à YP001 et YP021 — les 2 produits avec cordons à problème (hallucinations
 * aglet plastique). Pour les autres produits, retourne null silencieusement.
 *
 * Cf. assets_produits/YP001/YP001_fiche_produit.json:102 :
 *   "Les packshots fond blanc uniforme sont a injecter comme 'character reference'
 *    dans les prompts Studio IA afin d'ancrer l'IA sur la vraie forme du JH001 Awdis
 *    — resout les hallucinations embouts plastique et finitions incorrectes."
 */
async function fetchProductPackshotPart(
  product: string,
  garmentColor: string
): Promise<{ inlineData: { data: string; mimeType: string } } | null> {
  // Produits avec packshot injecté comme char-ref :
  //  - YP001 / YP021 : cordons à problème (hallucinations aglet) → ancrage FORME.
  //  - YP013 : casquette → ancrage FORME (low-profile + visière) + COULEUR.
  if (product !== "YP001" && product !== "YP021" && product !== "YP013") return null;

  // Fallback couleur par défaut si la couleur exacte n'existe pas encore en asset.
  const fallbackByProduct: Record<string, string> = {
    YP001: `/packshots/YP001/YP001_packshot_pierre_naturelle.webp`,
    YP021: `/packshots/YP021/YP021_packshot_pierre_naturelle.webp`,
    YP013: `/packshots/YP013/YP013_packshot_offwhite.png`,
  };

  // Essai dans l'ordre : webp matching color → png matching color → fallback couleur par défaut.
  const candidates = [
    `/packshots/${product}/${product}_packshot_${garmentColor}.webp`,
    `/packshots/${product}/${product}_packshot_${garmentColor}.png`,
    fallbackByProduct[product],
  ];

  for (const url of candidates) {
    try {
      const response = await fetch(url);
      if (!response.ok) continue;
      const blob = await response.blob();
      const mimeType = blob.type || (url.endsWith(".png") ? "image/png" : "image/webp");
      const reader = new FileReader();
      const data = await new Promise<string>((resolve, reject) => {
        reader.onloadend = () => {
          const result = reader.result as string;
          resolve(result.split(",")[1] || result);
        };
        reader.onerror = () => reject(new Error(`Erreur lecture packshot ${url}`));
        reader.readAsDataURL(blob);
      });
      console.log(`[PACKSHOT] Injection char-ref produit : ${url}`);
      return { inlineData: { data, mimeType } };
    } catch (err) {
      // try next candidate
    }
  }
  console.warn(`[PACKSHOT] Aucun packshot trouvé pour ${product}/${garmentColor}`);
  return null;
}

/**
 * Bloc capillaire rotatif — bloque la convergence Gemini sur le placement par
 * défaut "une mèche épaule / une mèche dos" reproduit de la photo de référence
 * canonique. Chaque shot du pack reçoit une variante différente (rotation modulo
 * la longueur).
 *
 * IMPORTANT — adapté à la LONGUEUR du canonique sélectionné. Si Sarah MAN-P11
 * (pixel cut court) est en réf, on n'envoie PAS "long hair on left shoulder"
 * sinon Gemini hybride les deux et génère des cheveux longs d'un côté + courts
 * de l'autre. La longueur est détectée via la signature du canonique (regex).
 *
 * Notes :
 *   - On nomme côté GAUCHE / DROIT du modèle (pas du spectateur) pour éviter
 *     toute ambiguïté visuelle.
 *   - Pour les cheveux courts (pixel cut, buzz, court), on varie le STYLING
 *     (tousled, slicked back, fringe forward) plutôt que le placement épaule.
 *   - Quand aucun canonique n'est sélectionné, défaut "long" (la majorité du
 *     casting).
 */

type HairLength = "long" | "medium" | "short";

function detectHairLength(signature: string): HairLength {
  const s = signature.toLowerCase();
  // SHORT : pixel/buzz/crew/crop + cropped + "short" générique. Ajout "salt-and-pepper short"
  // et "silver short" pour les profils masculins matures (Yohji-architect style).
  if (/pixel cut|pixel-cut|buzz cut|crew cut|short crop|cropped|crop court|cheveux courts|cheveux court|cheveux ras|short hair|short cropped|short cut|afro court|très court|salt[- ]and[- ]pepper short|silver short/.test(s)) return "short";
  // MEDIUM : ajout de "medium-length" / "medium length" / "medium hair" (bug Hiroshi
  // 29/05 : signature "medium-length hair" tombait dans le fallback "long" faute de match).
  if (/\bbob\b|carré|carre court|shoulder.length|shoulder length|medium.length|medium length|medium hair|mi-long|cheveux mi-longs|jawline|to the chin|chin.length|chin length|to the jaw|au menton/.test(s)) return "medium";
  return "long";
}

const HAIR_VARIATIONS_LONG = [
  "HAIR PLACEMENT : long hair flowing FULLY BEHIND BOTH SHOULDERS, entirely down the back, neckline of the garment fully visible. Curtain bangs / fringe still framing the face on both sides at eyebrow level. The hair is OUT OF the front of the chest.",
  "HAIR PLACEMENT : long hair gathered ENTIRELY ON THE MODEL'S LEFT shoulder (= viewer's RIGHT) — ALL the mass of hair falls in one curtain over the left clavicle and chest, the model's RIGHT shoulder is completely bare with no hair on it. Curtain bangs intact. Asymmetric, deliberate.",
  "HAIR PLACEMENT : long hair gathered ENTIRELY ON THE MODEL'S RIGHT shoulder (= viewer's LEFT) — ALL the mass of hair falls in one curtain over the right clavicle and chest, the model's LEFT shoulder is completely bare. Curtain bangs intact. Asymmetric mirror of the previous shot.",
  "HAIR PLACEMENT : hair pulled back into a LOOSE LOW PONYTAIL or LOOSE LOW MESSY BUN at the nape, a few escaped strands framing the jawline. Curtain bangs / fringe still visible at the forehead. The neck is fully exposed.",
  "HAIR PLACEMENT : hair in a HALF-UP HALF-DOWN style — top section pulled back and clipped with a small claw clip, bottom section flowing freely behind. Curtain bangs intact at the forehead.",
  "HAIR PLACEMENT : hair UP in a messy TOP KNOT or claw-clipped twist, several loose strands escaping naturally around the temples and nape. Curtain bangs intact. Casual lived-in styling.",
];

const HAIR_VARIATIONS_MEDIUM = [
  "HAIR PLACEMENT : medium-length hair (jawline / shoulder bob) flowing freely DOWN, tucked behind both ears, both ears slightly visible. Natural fall.",
  "HAIR PLACEMENT : medium-length hair tucked entirely behind the LEFT ear (= viewer's RIGHT), the right side falling forward over the cheek and clavicle. Asymmetric tuck.",
  "HAIR PLACEMENT : medium-length hair tucked entirely behind the RIGHT ear (= viewer's LEFT), the left side falling forward over the cheek and clavicle. Asymmetric mirror.",
  "HAIR PLACEMENT : medium-length hair pulled into a TINY LOW PONYTAIL or HALF-UP CLIP at the back, the front falling around the face naturally. Casual.",
  "HAIR PLACEMENT : medium-length hair pushed back from the forehead, both ears visible, slight volume on top. Clean editorial.",
  "HAIR PLACEMENT : medium-length hair tousled with deliberate texture — slight bedhead, fingers-through volume, no styling product look. Natural movement.",
];

const HAIR_VARIATIONS_SHORT = [
  "HAIR STYLING : short hair (pixel cut / cropped) styled TOUSLED with finger-combed texture, slightly swept off-axis. NO long strands on the shoulder. Casual lived-in.",
  "HAIR STYLING : short hair SLICKED BACK from the forehead, clean and structured, scalp visible at the hairline. NO fringe forward. Editorial.",
  "HAIR STYLING : short hair with the FRINGE PUSHED FORWARD onto the forehead, slightly messy, the rest cropped close. Boyish chic.",
  "HAIR STYLING : short hair SWEPT TO THE LEFT (= viewer's right), structured side parting, the right side closer cropped. Asymmetric architectural.",
  "HAIR STYLING : short hair SWEPT TO THE RIGHT (= viewer's left), structured side parting, the left side closer cropped. Asymmetric mirror.",
  "HAIR STYLING : short hair POLISHED WET-LOOK, smoothed back with a slight gloss, sharp hairline. Editorial polished.",
];

function buildHairBlock(seedOffset: number, length: HairLength): string {
  const pool =
    length === "short" ? HAIR_VARIATIONS_SHORT :
    length === "medium" ? HAIR_VARIATIONS_MEDIUM :
    HAIR_VARIATIONS_LONG;
  const variation = pool[seedOffset % pool.length];

  // Le bloc d'anti-pattern dépend de la longueur (on ne peut pas interdire
  // "long sur une épaule" si on n'a pas de cheveux longs).
  const antiPattern = length === "short"
    ? "ABSOLUTELY AVOID : adding long hair strands when the canonical reference has short hair — the hair length must MATCH the reference portrait exactly. NO hair on the shoulders or chest, NO mix of short top + long sides. Keep it SHORT, all around, like the reference."
    : length === "medium"
    ? "ABSOLUTELY AVOID : extending the hair below the shoulders. Keep the length to the jawline / collarbone as in the reference. Either fully tucked back, fully behind ears, or natural fall — never the symmetric \"one side on shoulder, one side back\" mullet placement."
    : "ABSOLUTELY AVOID : the default \"one strand on a shoulder + one strand down the back\" symmetric mullet-style placement. Either fully one side, fully behind, or fully tied up — never the symmetric in-between.";

  return `

💇 ${variation}
${antiPattern}
The CANONICAL REFERENCE PORTRAIT dictates the hair length and texture — match it EXACTLY. Only the placement / styling varies between shots so the series feels lived-in and natural, never like the same single hairstyle photographed from six angles.`;
}

/**
 * Bloc capillaire VERROUILLÉ (mode canonique) — contrairement à buildHairBlock
 * qui fait TOURNER le placement par shot, ici on FIGE la coupe sur le portrait
 * canonique de référence : MÊME coupe, MÊME longueur, MÊME raie/frange, MÊME
 * texture sur TOUS les shots du pack.
 *
 * Demande Sarah (29/06) : « je veux la même coupe de cheveux sur l'intégralité
 * des photos du shooting ». En mode canonique on ne cherche PAS la variété
 * capillaire (qui faisait paraître la coupe différente d'une photo à l'autre) —
 * on cherche la cohérence d'identité : le même mannequin, la même coupe partout.
 */
function buildCanoniqueHairLock(length: HairLength): string {
  const lengthLabel =
    length === "short"  ? "short, exactly as in the reference (pixel / cropped) — NEVER extended past the reference length" :
    length === "medium" ? "medium-length, exactly as in the reference (jawline / shoulder) — NEVER extended past the shoulders" :
    "long, exactly as in the reference";

  return `

💇 HAIR LOCK (ABSOLUTE — IDENTICAL on every shot of the pack) : The hairstyle is EXACTLY the one in the canonical reference portrait — same haircut, same ${lengthLabel} length, same parting, same fringe / bangs, same texture, same color. DO NOT restyle between shots, DO NOT change the cut, DO NOT switch to a ponytail / bun / updo if the reference is worn loose (and vice-versa). The hair may settle naturally with the pose and head angle, but the CUT and the overall STYLE stay 100% identical across the whole series, so it is unmistakably the SAME person with the SAME haircut in every single image. The canonical reference portrait dictates the hair — match it EXACTLY, on every shot.`;
}

/**
 * Convertit le data URL du PNG poignet en bloc inlineData pour parts[].
 * Retourne null si pas d'image fournie. Le PNG est injecté en parts[] APRÈS
 * le PNG broderie principale (Gemini interprète l'ordre comme « 1ʳᵉ broderie =
 * buste, 2ᵉ broderie = poignet »).
 */
function dataUrlToInlinePart(dataUrl: string): { inlineData: { data: string; mimeType: string } } | null {
  const match = dataUrl.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
  if (!match) return null;
  return { inlineData: { mimeType: match[1], data: match[2] } };
}

/**
 * Le poignet n'est visible que sur certains shots. On ne déclenche la 2e broderie
 * que si l'avant-bras / la manche est dans le cadre. Cette décision se prend par
 * shotType ou par label (selon mode). Sur tout le reste (macro broderie, ghost
 * de face, buste close), on ne mentionne PAS le poignet pour ne pas saturer
 * Gemini (qui sinon invente un poignet visible sur des macro buste).
 *
 * Listing conservateur — privilégier "pas de poignet" en cas de doute :
 * - Mode 'full' (FULL_PACK_*) : on regarde la clé du shot
 * - Mode 'mannequin' (SHOTS_CONFIG) : LIFESTYLE + OUTDOOR montrent le bras,
 *   PORTRAIT/DETAIL non.
 * - Mode 'family' : oui (groupe avec corps entier)
 * - Mode 'packshot' : non (mannequin invisible, focus produit)
 */
function shotShowsWrist(mode: string, shotType: string): boolean {
  if (mode === 'packshot') return false;
  if (mode === 'family') return true;
  if (mode === 'mannequin') {
    return shotType === 'LIFESTYLE' || shotType === 'OUTDOOR';
  }
  // mode === 'full' : clé du FULL_PACK_*
  const key = shotType.toUpperCase();
  if (key === 'GHOST') return false;
  if (key === 'CROP') return false;
  if (key === 'MACRO' || key === 'MACRO_PORTEE') return false;
  if (key === 'BUSTE' || key === 'BUSTE_HOMME' || key === 'BUSTE_FEMME') return false;
  // PLEIN_PIED, PLAN_AMERICAIN, PLAN_AMERICAIN_*, MOUVEMENT, LIFESTYLE, DUO, PORTRAIT,
  // RAPPROCHE, STUDIO_FEMME, PACKSHOT_PORTE → bras visible
  return true;
}

/**
 * Bloc texte à concaténer à la fin du prompt quand wrist est actif sur le shot.
 * Donne explicitement à Gemini :
 *   - position (poignet droit, manche)
 *   - taille en cm (max 5)
 *   - relation à la broderie principale (2e PNG injecté = motif poignet)
 *   - couleur (réutilise threadColor / palette du chest)
 */
function buildWristBlock(wristSizeCm: number, productId: string): string {
  const clamped = Math.min(Math.max(wristSizeCm, 2), 5);
  return `

🪡 SECOND EMBROIDERY ON THE RIGHT CUFF (ABSOLUTE — only valid for this shot because the right forearm/sleeve is visible) :
  • A SECOND embroidered badge is physically placed on the RIGHT SLEEVE CUFF (= viewer's LEFT) — at the very end of the right sleeve, on the cuff itself, NOT on the forearm above the cuff.
  • The motif of this second embroidery is given by the SECOND attached PNG (it is a SEPARATE design from the chest embroidery — usually a small heart, initial, or symbol).
  • PHYSICAL SIZE : EXACTLY ${clamped} cm wide, never larger than the cuff width. About the size of a thumbnail or a small coin. It is a DISCREET signature detail, not a chest-level statement.
  • SAME THREAD COLOR(S) as the chest embroidery for visual coherence (uses the exact same thread palette).
  • The cuff embroidery and the chest embroidery coexist on the SAME garment — both visible if the framing allows.
  • DO NOT confuse the two PNGs : the FIRST attached embroidery PNG is the CHEST motif (côté cœur, left chest), the SECOND attached embroidery PNG is the CUFF motif (right wrist cuff).
  • ${productId === 'YP004' ? 'CHILD GARMENT : the cuff embroidery is even smaller (~3 cm), proportional to the smaller sleeve.' : 'ADULT GARMENT : standard cuff embroidery ~' + clamped + ' cm.'}
`;
}

type FullPackShot = { label: string; prompt: string };
type FullPackMap = Record<string, FullPackShot>;

function getFullPackPrompts(style: string, settings?: GenerationSettings): FullPackMap {
  if (style === 'lookbook' && settings?.customLookbookAmbiance) {
    // FULL_PACK custom : GHOST/CROP/MACRO repris du PARISIEN (fond blanc neutre),
    // LIFESTYLE/DUO/PORTRAIT régénérés depuis l'ambiance_extraite du lookbook.
    return buildFullPackFromLookbook(
      settings.customLookbookAmbiance,
      FULL_PACK_PARISIEN as FullPackMap
    ) as FullPackMap;
  }
  if (style === 'minimalist') return FULL_PACK_MINIMALIST as FullPackMap;
  if (style === 'loft')       return FULL_PACK_LOFT as FullPackMap;
  if (style === 'serre')      return FULL_PACK_SERRE as FullPackMap;
  if (style === 'aube')       return FULL_PACK_AUBE as FullPackMap;
  if (style === 'sauvage')    return FULL_PACK_SAUVAGE as FullPackMap;
  if (style === 'sepia')      return FULL_PACK_SEPIA as FullPackMap;
  return FULL_PACK_PARISIEN as FullPackMap;
}

/**
 * Récupère les descripteurs de décor (short pour PROMPT_BASE, full pour LIFESTYLE)
 * selon le DecorStyle sélectionné. Fallback `parisien` si valeur inattendue.
 *
 * Si decorStyle === 'lookbook' et settings.customLookbookAmbiance fourni, on
 * reconstitue le decor depuis l'ambiance_extraite du lookbook ❤️ actif.
 */
function getDecorDescription(
  style: DecorStyle | string,
  settings?: GenerationSettings
): { short: string; full: string } {
  if (style === 'lookbook' && settings?.customLookbookAmbiance) {
    return buildDecorFromLookbookAmbiance(settings.customLookbookAmbiance);
  }
  return DECOR_DESCRIPTIONS[style as DecorStyle] || DECOR_DESCRIPTIONS.parisien;
}

async function generateSingleShot(settings: GenerationSettings, shotType: string, seedOffset: number): Promise<{url: string, label: string}> {
  // Bloc capillaire. La LONGUEUR s'adapte au canonique sélectionné (cf.
  // detectHairLength) — crucial pour éviter "cheveux longs hybridés sur un
  // canonique pixel cut" (Sarah MAN-P11).
  //
  // Deux régimes selon le casting (demande Sarah 29/06 : « même coupe sur
  // l'intégralité des photos du shooting ») :
  //  - MODE CANONIQUE (1 mannequin) → buildCanoniqueHairLock : coupe VERROUILLÉE
  //    sur le portrait de référence, IDENTIQUE sur tous les shots. On ne fait PAS
  //    tourner le placement (ça faisait paraître la coupe différente d'une photo
  //    à l'autre). Le visage est déjà ancré par le portrait injecté en parts[] ;
  //    on verrouille aussi la coupe pour que ce soit clairement le même mannequin.
  //  - MODE DIVERSITY (aucun canonique) → buildHairBlock : 6 placements qui
  //    tournent par index de shot. Aucun visage de référence à respecter, donc la
  //    variété capillaire est bienvenue.
  //  - 2+ canoniques → aucun bloc : chaque portrait porte déjà sa propre coupe, et
  //    un bloc "the model" au singulier serait ambigu avec plusieurs personnes.
  //  - packshot → aucun bloc (mannequin invisible).
  const firstCanon = settings.castingMode === 'canonique' && settings.canoniqueIds?.[0]
    ? getCanoniqueById(settings.canoniqueIds[0])
    : null;
  const hairLength: HairLength = firstCanon ? detectHairLength(firstCanon.signature) : "long";
  const appliedCanonCount = (settings.castingMode === 'canonique' && settings.mode !== 'packshot')
    ? settings.canoniqueIds.length
    : 0;
  const hairBlock =
    settings.mode === 'packshot' ? "" :
    appliedCanonCount >= 2       ? "" :
    appliedCanonCount === 1      ? buildCanoniqueHairLock(hairLength) :
    buildHairBlock(seedOffset, hairLength);

  const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });
  const match = settings.embroideryImage!.match(/^data:(image\/[a-zA-Z+]+);base64,/);
  const mimeType = match ? match[1] : 'image/png';
  const base64Data = settings.embroideryImage!.split(',')[1] || settings.embroideryImage!;
  
  const material = PRODUCT_MATERIALS[settings.product] || "textile de qualité";
  // Couleur fil(s) : mono OU palette multicolore figée (cf. buildThreadDescription)
  const threadColorText = buildThreadDescription(settings);
  // Couleur vêtement : label ('Beige') pour Gemini, pas l'id ('beige')
  const garmentColorText = garmentColorLabel(settings.garmentColor);
  // Description produit YPxxx (lecture du mapping Hub-aligné dans constants.tsx)
  const productDescription = PRODUCT_DESCRIPTION_FR[settings.product] || settings.product;
  // Bloc taille broderie figé : cm exact + % poitrine + invariance entre shots.
  // Remplace [DIMENSION] et [SIZE] dans tous les prompts (PROMPT_BASE, PACKSHOT, FULL_PACK_*).
  const embroideryBlock = buildEmbroideryBlock(settings.size, settings.product);

  /**
   * Emplacement broderie produit-aware. Pour le zoodie YP021 (zippé), 'côté cœur' doit
   * explicitement préciser 'à gauche du zip central' pour éviter que Gemini place la
   * broderie sur ou au travers du zip.
   */
  function buildEmplacement(productId: string, size: number): string {
    // Coiffe : broderie sur le DEVANT de la calotte, quelle que soit la taille.
    if (isHeadwear(productId)) {
      return "le DEVANT de la calotte de la casquette (panneau frontal central, juste au-dessus de la visière, centré gauche-droite), JAMAIS sur la poitrine ni le torse";
    }
    const isZipped = productId === 'YP021';
    if (size >= 20) {
      return isZipped ? "centre poitrine, MAIS sur le panneau gauche du porteur clairement à gauche du zip central, JAMAIS sur ou chevauchant le zip" : "centre du vêtement";
    }
    return isZipped ? "côté cœur (panneau gauche du porteur, à gauche du zip central, jamais sur le zip)" : "côté cœur";
  }
  
  let promptText = "";
  let label = "";

  if (settings.mode === 'full') {
    const packPrompts = getFullPackPrompts(settings.decorStyle, settings);
    const shot = packPrompts[shotType as keyof typeof packPrompts];
    label = shot.label;
    const emplacement = buildEmplacement(settings.product, settings.size);

    promptText = shot.prompt
      .replace(/\[PRODUIT\]/g, productDescription)
      .replace(/\[COULEUR SWEAT\]/g, garmentColorText)
      .replace(/\[COULEUR FIL\]/g, threadColorText)
      .replace(/\[EMPLACEMENT\]/g, emplacement)
      .replace(/\[DIMENSION\]/g, embroideryBlock)
      .replace(/\[MATERIAL\]/g, material);

    // Hook 1 — étendu au mode 'full' : si castingMode === 'canonique', on injecte la
    // signature character reference au prompt full pack (les images canoniques sont
    // injectées en parts[] plus bas, comme pour le mode 'mannequin').
    if (settings.castingMode === 'canonique' && settings.canoniqueIds.length > 0) {
      const canoniques = settings.canoniqueIds
        .map(id => getCanoniqueById(id))
        .filter((c): c is Canonique => Boolean(c));
      const canoniqueContext = buildCanoniqueContext(canoniques);
      promptText = canoniqueContext + "\n\n" + promptText;
    }
  } else {
    const shot = SHOTS_CONFIG[shotType as keyof typeof SHOTS_CONFIG];
    label = shot.label;

    if (settings.mode === 'packshot') {
      const emplacement = buildEmplacement(settings.product, settings.size);

      // [BACKGROUND] : arrière-plan du packshot selon le décor choisi (29/05).
      // 'minimalist' (et fallback) = fond studio blanc pur e-commerce classique.
      // Tout autre décor = le vêtement (mannequin invisible) flotte en avant-plan net
      // devant l'ambiance choisie, légèrement floutée pour rester un packshot produit.
      const packDecor = getDecorDescription(settings.decorStyle, settings);
      // Coiffe : le "vêtement flotte" devient "la casquette est présentée seule".
      const headwear = isHeadwear(settings.product);
      const subject = headwear ? "La casquette est présentée seule" : "Le vêtement flotte seul";
      const backgroundText = settings.decorStyle === 'minimalist'
        ? `${subject} devant un fond studio blanc pur.`
        : `${subject}, NET et EN AVANT-PLAN, devant l'ambiance suivante reléguée en arrière-plan légèrement flou (depth of field, le produit reste le héros visuel) : ${packDecor.full}`;

      // Casquette : template packshot dédié (produit seul, vue 3/4) au lieu du
      // "vêtement oversize sur mannequin invisible". Le packshotSuffix de SHOTS_CONFIG
      // (orienté torse/oversize) est ignoré en coiffe — l'override casquette suffit.
      const packshotBase = headwear ? CAP_PACKSHOT_PROMPT : PACKSHOT_PROMPT;
      promptText = packshotBase
        .replace(/\[PRODUIT\]/g, productDescription)
        .replace(/\[COULEUR SWEAT\]/g, garmentColorText)
        .replace(/\[COULEUR FIL\]/g, threadColorText)
        .replace(/\[EMPLACEMENT\]/g, emplacement)
        .replace(/\[DIMENSION\]/g, embroideryBlock)
        .replace("[BACKGROUND]", backgroundText);

      if (!headwear) promptText += " " + shot.packshotSuffix;
    } else {
      let variation = "";
      let context = "";

      if (settings.mode === 'mannequin') {
        variation = shot.promptSuffix;
        // Coiffe : le shot "Macro Broderie" (DETAIL) est entièrement orienté torse
        // (panneau gauche, clavicule) → on le remplace par la macro front-calotte.
        if (isHeadwear(settings.product) && shotType === 'DETAIL') {
          variation = CAP_MACRO_SUFFIX;
        }

        // Hook 1 — si castingMode === 'canonique' avec un mannequin sélectionné,
        // on remplace le bloc MODEL_DESCRIPTION+diversity par une signature
        // centrée sur le canonique persistant (les images sont injectées en parts[] plus bas).
        if (settings.castingMode === 'canonique' && settings.canoniqueIds.length > 0) {
          const canoniques = settings.canoniqueIds
            .map(id => getCanoniqueById(id))
            .filter((c): c is Canonique => Boolean(c));
          context = buildCanoniqueContext(canoniques);
        } else {
          const diversityParts = [];
          if (settings.diversity.ethnicity !== 'diverse') diversityParts.push(`ethnie ${settings.diversity.ethnicity}`);
          if (settings.diversity.age !== 'diverse') diversityParts.push(`âge ${settings.diversity.age}`);
          if (settings.diversity.bodyType !== 'diverse') diversityParts.push(`morphologie ${settings.diversity.bodyType}`);
          if (settings.diversity.disability !== 'none') diversityParts.push(`avec ${settings.diversity.disability}`);

          const diversityDesc = diversityParts.length > 0 ? diversityParts.join(', ') : "diversifiée et naturelle";
          context = MODEL_DESCRIPTION.replace("[DIVERSITY_DESCRIPTION]", diversityDesc);
        }
      } else if (settings.mode === 'family') {
        variation = shot.familySuffix;
        const coupleTypeLabel = {
          'random': 'composé aléatoirement de (maman et papa, ou papa et papa, ou maman et maman, ou maman et mamie, ou papi et papa, ou papa et mamie)',
          'maman-papa': 'composé d\'une maman et d\'un papa',
          'papa-papa': 'composé de deux papas',
          'maman-maman': 'composé de deux mamans',
          'maman-mamie': 'composé d\'une maman et d\'une mamie',
          'papi-papa': 'composé d\'un papi et d\'un papa',
          'papa-mamie': 'composé d\'un papa et d\'une mamie',
          // Duos parent-enfant / grand-parent-enfant (un seul adulte, le ou les enfants
          // viennent du compteur CHILDREN_COUNT — par défaut 1 = vrai duo)
          'enfant-maman': 'composé d\'une maman SEULE (un seul adulte sur la photo, pas de papa ni de second parent)',
          'enfant-papa': 'composé d\'un papa SEUL (un seul adulte sur la photo, pas de maman ni de second parent)',
          'enfant-mamie': 'composé d\'une mamie SEULE (un seul adulte sur la photo, pas d\'autre adulte) — transmission générationnelle, scène intime grand-mère / petit-enfant'
        }[settings.familyConfig.coupleType];

        context = FAMILY_DESCRIPTION
          .replace("[COUPLE_TYPE]", coupleTypeLabel || "mixte")
          .replace("[CHILDREN_COUNT]", settings.familyConfig.childrenCount.toString())
          .replace("[MATERIAL]", material);

        // Hook 1 étendu au mode 'family' (29/05) : si l'utilisateur a choisi un
        // canonique, on l'ancre comme L'UN DES ADULTES de la composition. Le portrait
        // canonique est déjà injecté dans parts[] (loadCanoniqueParts plus bas — non
        // gated par mode), il ne manquait que le hook texte qui le lie à un membre.
        // Combinaisons naturelles :
        //  - 'enfant-maman' + canonique femme → la maman = le canonique
        //  - 'enfant-papa' + canonique homme → le papa = le canonique
        //  - 'enfant-mamie' + canonique femme âgée → la mamie = le canonique
        //  - 'maman-papa' + canonique → l'un des deux adultes = le canonique, l'autre = diversity
        if (settings.castingMode === 'canonique' && settings.canoniqueIds.length > 0) {
          const canoniques = settings.canoniqueIds
            .map(id => getCanoniqueById(id))
            .filter((c): c is Canonique => Boolean(c));
          if (canoniques.length > 0) {
            const canoniqueContext = buildCanoniqueContext(canoniques);
            const ancrage = canoniques.length === 1
              ? `🪞 ANCRAGE CANONIQUE (ABSOLU) : Parmi les membres de la famille décrite ci-dessous, UN D'EUX correspond EXACTEMENT au mannequin canonique attaché en référence — même visage, même identité, même âge, mêmes traits, même peau, mêmes cheveux. Les autres membres (autre adulte si présent, enfants) sont composés selon la diversité naturelle décrite. LE MEMBRE CANONIQUE doit rester fidèle à 100% au portrait de référence : pas un sosie, pas une approximation — la MÊME personne.`
              : `🪞 ANCRAGE CANONIQUES (ABSOLU) : Parmi les membres de la famille décrite ci-dessous, ${canoniques.length} D'ENTRE EUX correspondent EXACTEMENT aux ${canoniques.length} mannequins canoniques attachés en référence — un membre par portrait canonique (en respectant genre et âge de chaque canonique : un canonique enfant = un enfant, un canonique adulte femme = une mère/mamie, etc.). Chaque membre canonique garde 100% du visage, de l'identité, de l'âge, des traits, de la peau et des cheveux de SON portrait de référence — pas un sosie, pas une approximation, la MÊME personne. Les membres restants non couverts par un canonique suivent la diversité naturelle décrite.`;
            context = `${ancrage}\n\n${canoniqueContext}\n\n${context}`;
          }
        }
      }

      // [DECOR] : injecté selon settings.decorStyle en mode 'mannequin' ET 'family' (29/05).
      // La scène familiale utilise désormais le décor choisi par l'utilisateur (avant :
      // forcé sur 'parisien'). Le PROMPT_BASE porte le [DECOR] dans les deux modes.
      const decor = getDecorDescription(settings.decorStyle, settings);
      const emplacementBase = buildEmplacement(settings.product, settings.size);
      promptText = PROMPT_BASE
        .replace("[PRODUCT]", productDescription)
        .replace("[MATERIAL]", material)
        .replace("[SIZE]", embroideryBlock)
        .replace(/\[THREAD_COLOR\]/g, threadColorText)
        .replace("[GARMENT_COLOR]", garmentColorText)
        .replace("[EMPLACEMENT_BRODERIE]", emplacementBase)
        .replace("[DECOR]", decor.short)
        + context + " "
        + variation
            .replace(/\[THREAD_COLOR\]/g, threadColorText)
            .replace("[DECOR]", decor.full);
    }
  }

  // Hook 1 — si mode canonique, on charge les portraits canoniques et on les injecte
  // en parts[] AVANT l'image broderie (ordre validé par passation 24/04 — 95% fidélité visage).
  // Étendu au mode 'family' (29/05) : ancrage d'un adulte sur le canonique.
  // EXCLU du mode 'packshot' : pas de personne dans le rendu vêtement-seul ; la sélection
  // utilisateur reste persistée dans le state mais n'est pas envoyée à Gemini.
  const canoniqueParts = (
    settings.castingMode === 'canonique' &&
    settings.canoniqueIds.length > 0 &&
    settings.mode !== 'packshot'
  )
    ? await loadCanoniqueParts(settings.canoniqueIds)
    : [];

  // Hook 2 — pour YP001/YP021 (hoodies/zoodies à cordons), on injecte le packshot
  // fond blanc comme character reference pour ancrer Gemini sur la VRAIE forme
  // (cordons SANS embout plastique, capuche, poche kangourou). Cf. fiche_produit
  // ligne 102 : c'est la solution explicite contre les hallucinations aglet.
  const packshotPart = await fetchProductPackshotPart(settings.product, settings.garmentColor);

  // Hook 3 — double broderie : si l'utilisateur a fourni un PNG poignet ET que
  // ce shot montre le bras, on injecte le PNG en parts[] APRÈS le PNG broderie
  // principale + on ajoute un bloc texte explicite. Sinon (macro / ghost / buste
  // close / packshot), on ignore le poignet pour ne pas saturer Gemini.
  // Coiffe : pas de "broderie poignet" (le bloc parle de manchette de manche, sans
  // objet sur une casquette). On neutralise même si l'utilisateur a chargé un PNG poignet.
  const wristActive = !!settings.wristEmbroideryImage
    && !isHeadwear(settings.product)
    && shotShowsWrist(settings.mode, shotType);
  const wristPart = wristActive ? dataUrlToInlinePart(settings.wristEmbroideryImage!) : null;
  if (wristActive && wristPart) {
    promptText = promptText + buildWristBlock(settings.wristSize ?? 4, settings.product);
  }

  // Hook 4 — bloc capillaire (cf. construction plus haut) :
  //  - canonique → coupe VERROUILLÉE, identique sur tous les shots ;
  //  - diversity → coiffure rotative par shot pour casser la convergence Gemini.
  if (hairBlock) {
    promptText = promptText + hairBlock;
  }

  // Si packshot injecté, on AJOUTE une instruction au prompt pour que Gemini
  // l'utilise comme référence de forme (cordons sans embout, finitions exactes
  // Awdis JH001/JH050). Sans cette mention, Gemini peut interpréter l'image
  // comme une référence pour la broderie au lieu du garment.
  //
  // ⚠️ On référence le packshot par son CONTENU visuel ("plain garment, no
  // embroidery, white studio background") et plus par sa position dans parts[].
  // L'ancien wording "second attached image" devenait faux dès qu'il y avait
  // 2+ canoniques ou que l'ordre changeait — et confondait Gemini sur la
  // fidélité PNG buste (cf. fix 28/05 sur la priorisation embroidery > packshot).
  if (packshotPart) {
    // 2 versions du hook packshot selon le produit :
    //  - YP001 / YP021 (hoodies/zoodies à cordons) : packshot = référence FORME
    //    + cordons sans aglet. La couleur du packshot peut différer (palette
    //    Awdis incomplète) → on demande d'IGNORER la couleur du packshot.
    //  - YP019 / YP005 / YP004 (t-shirts, sweats, hoodies enfant) : on a tous les
    //    packshots colorés dans la palette officielle. Le packshot = référence
    //    FORME + COULEUR ANCRÉE (correspondance Sarah 29/05 — la couleur du
    //    rendu doit matcher pixel-perfect le packshot, pas être réinterprétée).
    const isCordonProduct = settings.product === "YP001" || settings.product === "YP021";
    const headwear = isHeadwear(settings.product);
    const productLabel = settings.product === "YP021" ? "Awdis JH050 zoodie"
      : settings.product === "YP001" ? "Awdis JH001 hoodie"
      : settings.product === "YP019" ? "B&C TU05T t-shirt"
      : settings.product === "YP005" ? "Awdis JH030 sweat"
      : settings.product === "YP004" ? "Awdis JH001K kids hoodie"
      : settings.product === "YP013" ? "Ypersoa YP013 vintage washed cap"
      : settings.product + " garment";

    // Mot générique pour l'objet (cap vs garment) et le port (worn on the head vs worn).
    const itemWord = headwear ? "cap" : "garment";
    const wornPhrase = headwear ? "wearing the same cap on the head, visor forward" : "wearing the same garment";

    const shapeBlock = headwear
      ? `Use it to anchor BOTH the cap SHAPE (low-profile baseball silhouette, 6 panels, pre-curved contrasted visor, adjustable back strap, washed vintage cotton texture) AND the EXACT COLOR. ⚠️ COLOR ANCHOR (ABSOLUTE) : the color of the packshot IS the requested color (${garmentColorText}) — match it pixel-perfectly, same hue, same saturation, same value, same washed/faded character. Do NOT shift the tone, do NOT make it look like brand-new glossy cotton. The packshot IS the color reference.`
      : isCordonProduct
      ? `Use it ONLY to anchor the garment SHAPE : hood proportions, drawstring cords that are PURE COTTON BRAIDED WITH NO AGLET (no plastic tip, no metal cap, no decorative end — cords end with a simple knot or raw cut, exactly matching the body color), kangaroo pocket placement, rib cuffs, neckline. The packshot color may differ from the requested garment color (${garmentColorText}) — IGNORE the packshot color, use it for SHAPE AND FINISHES ONLY.`
      : `Use it to anchor BOTH the garment SHAPE (cut, silhouette, neckline shape, sleeve length, rib finish) AND the EXACT COLOR. ⚠️ COLOR ANCHOR (ABSOLUTE) : the body color of the packshot IS the requested color (${garmentColorText}) — match it pixel-perfectly, same hue, same saturation, same value. Do NOT shift the color tone, do NOT brighten or darken, do NOT reinterpret. The packshot IS the color reference.`;

    const embroideryZone = headwear ? "cap-front" : "chest";
    promptText = promptText + `\n\n⚠️ ${headwear ? "CAP" : "GARMENT"} REFERENCE (PACKSHOT) : Among the attached images, the one showing a PLAIN ${itemWord} with NO embroidery on a WHITE STUDIO BACKGROUND is the official ${productLabel} packshot. ${shapeBlock} The final image must show ${settings.mode === 'packshot' ? `the same ${itemWord}` : `the model ${wornPhrase}`}, in ${garmentColorText}. DO NOT copy the packshot's white studio background — keep the scene environment as described in the prompt.\n\n⚠️ ABSOLUTE EMBROIDERY PRIORITY : The embroidery PNG reference(s) (the smaller image(s) showing a motif on a plain background) take ABSOLUTE PRECEDENCE over the packshot for EVERYTHING embroidery-related : exact letters, exact shape, exact typography, exact placement. The packshot shows a ${itemWord} with NO embroidery on purpose — it MUST NOT influence how the embroidery is rendered. The ${embroideryZone} embroidery in the final image MUST match the embroidery PNG pixel-perfectly (form, letters, geometry) ; only the thread color follows the prompt.`;
  }

  // Coiffe : override final (placement front-calotte, port sur la tête, pas de
  // poche/capuche/cordon/col/torse). Appendé en DERNIER pour dominer toute
  // mention "côté cœur / torse / oversize" héritée des prompts génériques.
  if (isHeadwear(settings.product)) {
    promptText = promptText + HEADWEAR_OVERRIDE;
  }

  const response = await ai.models.generateContent({
    model: 'gemini-3.1-flash-image-preview',
    contents: {
      parts: [
        // 1. Canoniques (visage) — d'abord, garantit 95% fidélité visage (passation 24/04).
        ...canoniqueParts,
        // 2. Broderie principale (chest, côté cœur) — IMMÉDIATEMENT après les canoniques.
        //    Position 2 historique, restaurée le 28/05 pour récupérer la fidélité PNG
        //    qui s'était dégradée depuis l'ajout du packshot entre les deux.
        //    C'est ce que le buildWristBlock annonce à Gemini ("FIRST embroidery PNG").
        {
          inlineData: {
            data: base64Data,
            mimeType: mimeType,
          },
        },
        // 3. Broderie poignet (optionnelle, conditionnelle au shot) — 2e PNG broderie,
        //    juste après le chest. Identifié par buildWristBlock comme "SECOND embroidery PNG".
        ...(wristPart ? [wristPart] : []),
        // 4. Packshot YP001/YP021 (référence FORME uniquement, vêtement sans broderie) —
        //    déplacé APRÈS les PNG broderie pour qu'il n'interfère plus avec la
        //    fidélité PNG buste. Le hook texte le décrit par contenu visuel
        //    ("plain garment, no embroidery, white studio background"), donc la position
        //    dans parts[] ne fait plus l'objet d'une référence textuelle.
        ...(packshotPart ? [packshotPart] : []),
        {
          text: promptText
        },
      ],
    },
    config: {
      imageConfig: {
        aspectRatio: settings.aspectRatio,
        imageSize: "2K"
      },
      // Relâche le filtre safety de Gemini (par défaut BLOCK_MEDIUM_AND_ABOVE)
      // pour éviter les faux positifs en mode famille (scène avec enfants +
      // peau réaliste → block injuste qui faisait tomber les shoots Sarah dans
      // le fallback ghost-mockup). BLOCK_ONLY_HIGH garde la protection
      // hard-content sans bloquer les portraits familiaux légitimes.
      // ⚠️ Le SDK TypeScript déclare aussi HARM_CATEGORY_IMAGE_* mais l'endpoint
      // v1beta les rejette en INVALID_ARGUMENT. On garde uniquement les 4
      // catégories texte standard, qui s'appliquent aussi aux modèles image.
      safetySettings: [
        { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
        { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
        { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
        { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
      ],
    }
  });

  if (!response.candidates || response.candidates.length === 0) {
    throw new Error(`Échec de génération pour le shot: ${shotType}`);
  }

  const candidate = response.candidates[0];
  if (!candidate.content || !candidate.content.parts) {
    if (candidate.finishReason === 'IMAGE_OTHER' || candidate.finishReason === 'SAFETY' || candidate.finishReason === 'BLOCKLIST') {
      // Garde-fou mode famille (29/05) : le fallback ghost-mockup
      // ("vêtement seul fond blanc, no people") n'a aucun sens en Famille —
      // il fabrique 4 produits différents sans broderie au lieu de la scène
      // attendue. Mieux vaut lever une erreur claire pour que Sarah retente
      // (changer canonique, composition, ou prompt) que livrer un faux résultat.
      if (settings.mode === 'family') {
        throw new Error(
          `Génération famille bloquée par le filtre Gemini (${candidate.finishReason}). ` +
          `Réessaie : change de canonique, simplifie la composition (Aléatoire), ou retente — ` +
          `le filtre est parfois aléatoire sur les scènes avec enfants.`
        );
      }
      console.warn(`Blocked by ${candidate.finishReason}, retrying with safe fallback prompt...`);

      const safePrompt = `Generate a simple, safe, and generic 3D mockup of a ${settings.product} in color ${garmentColorText}. The garment is floating on a pure white background. The attached image is a simple graphic design to be embroidered on the chest. Do not generate any people, faces, or text. This is a safe, conceptual product visualization.`;
      
      try {
        const retryResponse = await ai.models.generateContent({
          model: 'gemini-3.1-flash-image-preview',
          contents: {
            parts: [
              { inlineData: { data: base64Data, mimeType: mimeType } },
              { text: safePrompt }
            ]
          },
          config: { imageConfig: { aspectRatio: settings.aspectRatio, imageSize: "2K" } }
        });

        const retryCandidate = retryResponse.candidates?.[0];
        if (retryCandidate?.content?.parts) {
          for (const part of retryCandidate.content.parts) {
            if (part.inlineData) {
              return { url: `data:${part.inlineData.mimeType || 'image/jpeg'};base64,${part.inlineData.data}`, label: `${label} (Mode Sécurisé)` };
            }
          }
        }
        throw new Error(`First fallback blocked or empty: ${retryCandidate?.finishReason || 'Unknown'}`);
      } catch (retryError) {
        console.error("First fallback retry failed, trying without input image:", retryError);
        
        // Second fallback: Remove the input image entirely
        const noImagePrompt = `Generate a simple, safe, and generic 3D mockup of a ${settings.product} in color ${garmentColorText}. The garment is floating on a pure white background. Do not generate any people, faces, or text. This is a safe, conceptual product visualization.`;
        
        try {
          const secondRetryResponse = await ai.models.generateContent({
            model: 'gemini-3.1-flash-image-preview',
            contents: {
              parts: [
                { text: noImagePrompt }
              ]
            },
            config: { imageConfig: { aspectRatio: settings.aspectRatio, imageSize: "2K" } }
          });

          const secondRetryCandidate = secondRetryResponse.candidates?.[0];
          if (secondRetryCandidate?.content?.parts) {
            for (const part of secondRetryCandidate.content.parts) {
              if (part.inlineData) {
                return { url: `data:${part.inlineData.mimeType || 'image/jpeg'};base64,${part.inlineData.data}`, label: `${label} (Vêtement Seul - Image Bloquée)` };
              }
            }
          }
          throw new Error(`Second fallback blocked or empty: ${secondRetryCandidate?.finishReason || 'Unknown'}`);
        } catch (secondRetryError) {
          console.error("Second fallback retry also failed:", secondRetryError);
        }
      }
    }

    if (candidate.finishReason) {
      throw new Error(`Génération bloquée par le modèle (raison : ${candidate.finishReason})`);
    }
    throw new Error(`Échec de génération pour le shot: ${shotType} (contenu vide)`);
  }

  let returnedText = "";
  for (const part of candidate.content.parts) {
    if (part.inlineData) {
      return { url: `data:${part.inlineData.mimeType || 'image/jpeg'};base64,${part.inlineData.data}`, label };
    } else if (part.text) {
      returnedText += part.text + " ";
    }
  }

  if (returnedText) {
    console.warn("Model returned text instead of image, attempting retry with fallback prompt:", returnedText);
    
    // Retry once with a strong fallback instruction
    const fallbackPrompt = promptText + "\n\nCRITICAL FALLBACK INSTRUCTION: You previously refused to generate this image due to text content (e.g., 'PAPI'). You MUST generate the image. If the specific text violates guidelines, replace it with a generic safe word like 'FAMILY', 'AMOUR', or a simple embroidered shape. DO NOT refuse the request, generate the image with the placeholder.";
    
    const retryResponse = await ai.models.generateContent({
      model: 'gemini-3.1-flash-image-preview',
      contents: {
        parts: [
          {
            inlineData: {
              data: base64Data,
              mimeType: mimeType,
            },
          },
          {
            text: fallbackPrompt
          },
        ],
      },
      config: {
        imageConfig: {
          aspectRatio: settings.aspectRatio,
          imageSize: "2K"
        }
      }
    });

    if (retryResponse.candidates && retryResponse.candidates.length > 0) {
      const retryCandidate = retryResponse.candidates[0];
      if (retryCandidate.content && retryCandidate.content.parts) {
        for (const part of retryCandidate.content.parts) {
          if (part.inlineData) {
            return { url: `data:${part.inlineData.mimeType || 'image/jpeg'};base64,${part.inlineData.data}`, label };
          }
        }
      }
    }

    throw new Error(`Le modèle a refusé de générer l'image, même avec un texte de remplacement : ${returnedText}`);
  }

  throw new Error("Données d'image manquantes.");
}

export async function generateYpersoaPack(settings: GenerationSettings): Promise<{urls: string[], labels: string[]}> {
  if (!settings.embroideryImage) {
    throw new Error("L'image de la broderie est requise.");
  }

  let shotKeys: string[] = [];
  if (settings.mode === 'full') {
    const packPrompts = getFullPackPrompts(settings.decorStyle, settings);
    shotKeys = Object.keys(packPrompts);
  } else {
    shotKeys = Object.keys(SHOTS_CONFIG);
  }
  
  const promises = shotKeys.map((key, index) => generateSingleShot(settings, key, index));
  const resultsSettled = await Promise.allSettled(promises);
  
  const successfulResults = resultsSettled
    .filter((result): result is PromiseFulfilledResult<{url: string, label: string}> => result.status === 'fulfilled')
    .map(result => result.value);

  if (successfulResults.length === 0) {
    // If all failed, throw the first error to give the user feedback
    const firstError = resultsSettled.find((r): r is PromiseRejectedResult => r.status === 'rejected');
    throw new Error(firstError?.reason?.message || "Toutes les générations ont échoué.");
  }
  
  return {
    urls: successfulResults.map(r => r.url),
    labels: successfulResults.map(r => r.label)
  };
}
