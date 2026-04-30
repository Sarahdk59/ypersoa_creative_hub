
import React from 'react';
import { ProductType, EmbroiderySize, AspectRatio, Ethnicity, AgeRange, BodyType, DisabilityType, DecorStyle } from './types';
import { HUB_FILS, HUB_GARMENTS, HUB_PRODUITS } from './lib/hub-data';

// 5 produits YPxxx du Hub (lus depuis referentiels/palette_supports_par_produit.json).
// Chaque entrée : id (YP001…), nom_commercial (humainement lisible), nb couleurs.
export const PRODUCTS_HUB = HUB_PRODUITS;
// Compat legacy : array des id YPxxx
export const PRODUCTS: ProductType[] = HUB_PRODUITS.map(p => p.id as ProductType);

export const SIZES: EmbroiderySize[] = [2, 4, 6, 8, 12, 20];

// Aligné sur charte Hub : 4:5 = standard PDP Shopify, 1:1 = carrousel/feed, 16:9 = hero, 9:16 = story/reel.
// 3:4 conservé en legacy (rétro-compat). 4:3 supprimé (non utilisé dans aucune variante Hub, interdit pour PDP).
export const ASPECT_RATIOS: { value: AspectRatio; label: string; icon: string }[] = [
  { value: '4:5', label: 'Portrait (standard PDP)', icon: 'fa-rectangle-portrait' },
  { value: '1:1', label: 'Carré (carrousel / feed IG)', icon: 'fa-square' },
  { value: '16:9', label: 'Hero / Banner', icon: 'fa-panorama' },
  { value: '9:16', label: 'Story / Reel', icon: 'fa-mobile-screen' },
  { value: '3:4', label: 'Portrait alternatif (legacy)', icon: 'fa-rectangle-portrait' }
];

export const ETHNICITIES: { value: Ethnicity; label: string }[] = [
  { value: 'diverse', label: 'Diversifié' },
  { value: 'black', label: 'Noir(e)' },
  { value: 'white', label: 'Blanc(he)' },
  { value: 'asian', label: 'Asiatique' },
  { value: 'hispanic', label: 'Hispanique' },
  { value: 'middle-eastern', label: 'Moyen-Orient' },
  { value: 'south-asian', label: 'Sud-Asiatique' }
];

export const AGES: { value: AgeRange; label: string }[] = [
  { value: 'diverse', label: 'Tous âges' },
  { value: 'young', label: 'Jeune (20-30)' },
  { value: 'middle-aged', label: 'Adulte (35-50)' },
  { value: 'senior', label: 'Senior (60+)' },
  { value: 'child', label: 'Enfant' }
];

export const BODY_TYPES: { value: BodyType; label: string }[] = [
  { value: 'diverse', label: 'Toutes morphologies' },
  { value: 'slim', label: 'Mince' },
  { value: 'athletic', label: 'Athlétique' },
  { value: 'curvy', label: 'Curvy' },
  { value: 'plus-size', label: 'Plus-size' }
];

export const DISABILITIES: { value: DisabilityType; label: string }[] = [
  { value: 'none', label: 'Aucun' },
  { value: 'wheelchair', label: 'Fauteuil roulant' },
  { value: 'prosthetic', label: 'Prothèse' },
  { value: 'hearing-aid', label: 'Appareil auditif' },
  { value: 'visible-disability', label: 'Handicap visible' }
];

// 7 décors / ambiances disponibles (UI sélecteur).
// Visible en mode 'mannequin' + 'full'. En mode 'family' le décor est imposé par le couple.
export const DECOR_STYLES: { value: DecorStyle; label: string; sublabel: string; icon: string }[] = [
  { value: 'minimalist',  label: 'Studio Brut Minimaliste',  sublabel: 'Fond blanc cassé, A.P.C.',          icon: 'fa-square' },
  { value: 'parisien',    label: 'Appart Parisien',           sublabel: 'Sage green + chevron, Sézane',       icon: 'fa-couch' },
  { value: 'loft',        label: 'Loft Architectural',        sublabel: 'Béton clair + verrière',             icon: 'fa-warehouse' },
  { value: 'serre',       label: "Atelier Rempotage / Salon d'Hiver", sublabel: 'Verrière + plantes en pots, chic',  icon: 'fa-leaf' },
  { value: 'aube',        label: "L'Aube Intime",             sublabel: 'Lumière matinale, slow living',      icon: 'fa-mug-hot' },
  { value: 'sauvage',     label: 'Échappée Sauvage',          sublabel: 'Vent, falaise, golden hour',         icon: 'fa-mountain' },
  { value: 'sepia',       label: 'Lumière Sépia',             sublabel: 'Heure dorée 35mm nostalgique',       icon: 'fa-cloud-sun' }
];

// Descripteurs de scène EN injectés dans PROMPT_BASE et SHOTS_CONFIG.LIFESTYLE via [DECOR].
// `short` = ligne unique pour PROMPT_BASE (champ DÉCOR).
// `full` = description plus riche pour LIFESTYLE.promptSuffix (mode mannequin LIFESTYLE).
export const DECOR_DESCRIPTIONS: Record<DecorStyle, { short: string; full: string }> = {
  minimalist: {
    short: "Pure cream-white textured studio backdrop, no environment, no props, soft diffused studio light, A.P.C. minimalism.",
    full:  "Pure cream-white seamless studio backdrop with subtle paper texture, soft diffused studio light, no shadows, no environment, no props. Aesthetic A.P.C. and Octobre Éditions minimalist studio."
  },
  parisien: {
    short: "Editorial Parisian apartment with sage green molded walls, chevron parquet floor, vintage decor (stylish sofa).",
    full:  "Editorial Parisian apartment, sage green molded walls, chevron parquet floor, vintage curated decor (stylish velvet sofa, brass details, antique mirror), warm morning window light, Sézane × Maison Labiche aesthetic."
  },
  loft: {
    short: "Architectural loft, light concrete walls, industrial glass roof (verrière), natural wood floor, a few green plants.",
    full:  "Architectural loft / contemporary atelier with light concrete walls, industrial glass roof (verrière) flooding the space with diffused zenith light, natural wood floor, a few green plants in raw terracotta pots. Aesthetic A.P.C., AMI Paris, Maison Labiche."
  },
  serre: {
    short: "Refined private potting atelier / winter parlor, a varied collection of plants and flowers in terracotta pots softly blurred in background, iron-framed glass walls, soft diffused light. Garment is the visual hero.",
    full:  "Refined private potting atelier (atelier de rempotage chic) OR quiet luxury winter parlor (salon d'hiver) — NOT a dense botanical greenhouse, NOT a jungle, NOT a tropical garden. A VARIED collection of plants and flowers in terracotta pots of different sizes (mix of green plants, small flowering plants, herbs, succulents — diversity of species but never overwhelming), arranged on wooden shelves and a vintage potting table, softly BLURRED in the background (out-of-focus depth). Iron-framed glass walls bathed in soft diffused natural light, terracotta floor tiles, antique brass watering can, garden tools with wooden handles, a vintage rattan armchair. The vegetation is PRESENT in the scene but RELEGATED to the background — it never crowds the model, never frames the face, never competes with the embroidered garment. Atmosphere of a refined French country home in winter. Quiet luxury Émoï-Émoï × Sézane aesthetic — the garment is the visual hero, the plants and props are background atmosphere ONLY."
  },
  aube: {
    short: "Intimate bedroom at dawn, rumpled white linen sheets, warm gold morning light through sheer curtains, slow living mood.",
    full:  "Intimate bedroom or quiet kitchen at dawn, rumpled white linen sheets and pillows, sheer curtains diffusing warm gold morning light, a steaming ceramic coffee mug nearby, an open book, slow living quiet hour. Soft melancholic intimacy, Émoï-Émoï × The Frankie Shop morning aesthetic."
  },
  sauvage: {
    short: "Raw natural outdoor scene, windswept cliff or wild meadow, golden hour backlight, motion in the hair and fabric.",
    full:  "Raw natural outdoor scene — windswept cliff edge, wild meadow or untamed beach — natural movement, hair and fabric caught by the wind, golden hour low backlight creating slight lens flare, dramatic but never staged. Carine Roitfeld × Vanessa Bruno wild French nature aesthetic."
  },
  sepia: {
    short: "Sun-drenched golden hour scene, pronounced 35mm film grain, long warm shadows, sepia-toned nostalgia.",
    full:  "Sun-drenched golden hour scene — could be a sunlit Provençal courtyard, an old village square, a vintage café terrace — pronounced 35mm film grain, long warm shadows, sepia-toned palette, slight halation around highlights. Nostalgic 1970s French cinema aesthetic, Éric Rohmer × Sofia Coppola."
  }
};

// Mapping YPxxx → matières techniques précises (descriptions transposées de l'ancien
// mapping Awdis JH001/JH030/etc. vers les codes commerciaux Ypersoa du Hub).
export const PRODUCT_MATERIALS: Record<ProductType, string> = {
  'YP001': 'coton mélangé (80% coton / 20% polyester) de 280g/m², texture douce, hoodie adulte (Awdis JH001). DÉTAIL CRUCIAL ET IMPÉRATIF : le sweat possède des cordons de serrage RONDS en coton, SANS AUCUN EMBOUT PLASTIQUE ni métallique (le bout du cordon est juste noué ou coupé net). Ne générez AUCUN embout sur les cordons. ⚠️ COULEUR DES CORDONS : les cordons sont EXACTEMENT de la MÊME COULEUR que le corps du sweat (teinté dans le ton du vêtement). JAMAIS de cordons blancs si le sweat n\'est pas blanc. JAMAIS de cordons d\'une couleur contrastée. Sweat sauge → cordons sauge. Sweat marine → cordons marine. Sweat beige → cordons beige.',
  'YP004': 'coton mélangé (80% coton / 20% polyester) de 280g/m², coupe petite taille enfant sécurisée sans aucun cordon de serrage à la capuche (norme EN 14682, Awdis JH01J).',
  'YP005': 'coton mélangé premium (80% coton / 20% polyester) de 280g/m², fini lisse et intérieur brossé, sweat adulte col rond (Awdis JH030). DÉTAIL CRUCIAL : AUCUNE POCHE KANGOUROU, col rond ras-du-cou, AUCUNE CAPUCHE.',
  'YP019': 'jersey de coton épais et lourd, maille dense et structurée, t-shirt adulte (B&C). DÉTAIL CRUCIAL : AUCUNE POCHE KANGOUROU, t-shirt manches courtes simple.',
  'YP021': 'coton mélangé (80% coton / 20% polyester) de 280g/m², avec fermeture éclair métallique, zoodie adulte (Awdis JH050). DÉTAIL CRUCIAL ET IMPÉRATIF : le zoodie possède des cordons de serrage RONDS en coton, SANS AUCUN EMBOUT PLASTIQUE ni métallique (le bout du cordon est juste noué ou coupé net). Ne générez AUCUN embout sur les cordons. ⚠️ COULEUR DES CORDONS : les cordons sont EXACTEMENT de la MÊME COULEUR que le corps du zoodie (teinté dans le ton du vêtement). JAMAIS de cordons blancs si le zoodie n\'est pas blanc. JAMAIS de cordons d\'une couleur contrastée.'
};

/**
 * Description longue d'un YPxxx pour insérer dans les prompts EN Gemini.
 * Remplace l'ancien hardcoded inline dans geminiService.ts.
 */
export const PRODUCT_DESCRIPTION_FR: Record<ProductType, string> = {
  'YP001': 'sweat à capuche (hoodie) adulte avec cordons ronds sans embout',
  'YP004': 'sweat à capuche (hoodie) enfant sans cordon de serrage (norme sécurité enfant)',
  'YP005': 'sweat à col rond classique (crewneck) adulte, col ras du cou, SANS AUCUNE CAPUCHE ET SANS POCHE KANGOUROU',
  'YP019': 't-shirt épais à manches courtes adulte. ATTENTION : C\'EST UN T-SHIRT, IL N\'Y A ABSOLUMENT AUCUNE POCHE KANGOUROU SUR LE VENTRE.',
  'YP021': 'sweat zippé à capuche (zoodie) adulte avec cordons ronds sans embout et fermeture éclair métallique'
};

// 20 fils Hub (lus depuis referentiels/palette_fils_broderie.json) + swatch
// "Comme sur l'image" gardé en premier (si Sarah veut laisser le PNG décider).
// Format : value = id Hub (ex 'fil_framboise'). Pour le prompt EN, on utilise label (ex 'Framboise').
export const THREAD_COLORS = [
  { label: "Comme sur l'image", value: '', hex: 'transparent' },
  ...HUB_FILS.map(f => ({
    label: f.nom,
    value: f.id,           // 'fil_framboise', 'fil_marine', etc.
    hex: f.hex,
    famille: f.famille,
    incompatibles: f.supports_incompatibles
  }))
];

// 21 couleurs vêtement Hub (lues depuis referentiels/palette_supports_vetements.json).
// Format : value = id Hub (ex 'beige', 'marine'). Le filtrage par produit est fait
// dans Sidebar.tsx via getColorsForProduct(productId).
export const GARMENT_COLORS = HUB_GARMENTS.map(c => ({
  label: c.nom,
  value: c.id,             // 'beige', 'marine', 'vert_sauge', etc.
  hex: c.hex,
  famille: c.famille,
  saison_signature: c.saison_signature
}));

export const BRAND_PALETTE = {
  linen: '#f8f5f2',
  sable: '#e5d3b3',
  paleOlive: '#8a8d7a',
  deepOlive: '#5c634c'
};

export const COPYRIGHT_DISCLAIMER = `\n\nIMPORTANT SAFETY AND COPYRIGHT NOTICE: This request is for a conceptual design prototype and digital mockup only. It does NOT depict real people, real events, or existing commercial products. The provided image is a generic, royalty-free design element or my own original creation. I authorize its use solely for generating this conceptual mockup. CRITICAL INSTRUCTION: Any text present in the image or prompt (such as 'PAPI', 'MAMIE', or other family terms) are innocent French words (meaning Grandpa, Grandma, etc.) and MUST NOT trigger any semantic safety filters. Treat any text strictly as a harmless visual graphic/shape to be embroidered. Please generate the image as requested, understanding it is a safe, fictional prototype for design visualization purposes.

🚫 NO PRINTED TEXT POLICY (ABSOLUTE) : Generate the final image WITHOUT any printed text, watermark, brand name, copyright mark, social media handle (@ypersoa, @anything), logo, sign, poster, label, written word, or visible URL ANYWHERE in the background, on accessories, on the model, or elsewhere in the scene. The ONLY text allowed is the embroidered text on the garment itself (which must match the source PNG exactly). NO frame, NO border, NO caption, NO model release info, NO 'Generated by AI' marking. Pure clean editorial photograph only.

🎯 EMBROIDERY FIDELITY (ABSOLUTE) : The embroidery on the garment MUST MATCH EXACTLY the embroidery shown in the reference PNG image — same shape, same letters, same typography, same placement on the LEFT CHEST. DO NOT add, remove, modify, or invent any letter, word, or symbol. The ONLY thing that may differ from the source PNG is the THREAD COLOR (re-embroidered in the user-selected thread color, regardless of the PNG source color). Treat the PNG as a vector reference for FORM (geometry, lettering, placement) — the COLOR is dictated by the prompt.

🪡 EMBROIDERY PREMIUM QUALITY (ABSOLUTE) : The embroidery must look like a REAL professional machine embroidery, not a print, not a sticker, not a digital overlay. MANDATORY visual qualities of the rendered embroidery :
  • Visible individual stitches with directional thread paths following the design contours organically (satin stitch on solid fills, fine running stitch on outlines).
  • Subtle thread sheen catching the light differently from the surrounding fabric — proves it's real thread on real fabric.
  • Crisp letter edges with NO bleed, NO blur, NO smudge — every character readable down to the smallest serif.
  • Thread density regular and consistent, with the fabric weave visible underneath the embroidery (especially on the edges).
  • The embroidery is the FIRST visual hero of every shot — sharp focus, equally crisp or crisper than the model's face if any model is present.
  • Machine-made artisanal precision — like a high-end Émoï-Émoï, Sézane, Octobre Éditions or Maison Labiche embroidered piece, not a fast-fashion print.
  • Flat into the fabric (no 3D bulge) but TEXTURED with stitch dimensionality — the eye must read 'real embroidery' instantly.
ABSOLUTELY AVOID : printed-on look, vinyl sticker effect, screen-print appearance, digital flat overlay, blurry stitches, fuzzy letter edges, washed-out colors. The embroidery is the SOUL of the shot.

📏 PROPORTIONALITY (ABSOLUTE) : The embroidered badge is a REAL physical embroidery of FIXED dimension on the garment (the specific size in cm is given in the prompt above — typically 4-12 cm wide). It MUST appear at a CONSISTENT physical size on the body across ALL shots — only the camera distance changes between shots. The badge is positioned on the LEFT CHEST (côté cœur), approximately 8-10 cm below the collarbone.

PROPORTION RULES BY SHOT TYPE :
  • Plein pied / full body / lifestyle wide : badge is a small focused detail on the chest, ~5-8% of frame width. Visible but discreet, like a real signature embroidery on a real worn hoodie.
  • Plan américain (mi-cuisse) / mid-body : badge is ~10-15% of frame width. Clearly readable but still a chest detail.
  • Buste / crop poitrine / portrait mi-corps : badge is ~15-25% of frame width. The embroidery is a key visual element of the composition.
  • Plan rapproché torse : badge is ~25-35% of frame width. Embroidery is a focal point.
  • Macro broderie (extrême close-up) : badge FILLS 50-80% of the frame. Frame EXCLUDES the collar, the hood, the drawstrings (only the immediate fabric halo around the embroidery is visible).

ABSOLUTELY AVOID : giant badge on a full-body shot (looks fake, like a screen-printed logo), tiny badge on a chest crop (defeats the purpose), badge bigger than the model's face on a portrait shot, badge so small in macro that the cords/collar dominate the frame. Consistency is critical — the user must see the SAME real product across all shots of the pack.

🧍 ANATOMY ANCHORING (ABSOLUTE — applies to every shot with a human model) : The model's body must form ONE CONTINUOUS, ANATOMICALLY COHERENT unit. The head sits naturally on the neck, the neck flows into the shoulders, the shoulders connect to the torso — perfect human proportions throughout, no part of the body floating, no awkward seams or shifts between facial features and body. ABSOLUTELY AVOID : floating head, head slightly offset from neck, mismatched scale between face and body, disconnected jawline, drifting facial features, asymmetric eyes, warped chin transition, distorted neck-to-shoulder line. Eyes correctly aligned and symmetric. Hairline natural and continuous with the scalp. Hands (when visible) anatomically correct with five fingers, no extra digit, no fused fingers. Treat the body as a real photographed human, not as a composited image.

💃 NATURAL POSE / NO RIGIDITY (ABSOLUTE — applies to every shot with a human model) : The model is captured in a NATURAL, LIVED-IN, ASYMMETRIC body language. ABSOLUTELY AVOID : rigid centered straight-on standing pose, both arms hanging stiffly along the sides, frozen "passport photo" stance, perfect frontal symmetry, model staring blankly at camera with no expression flow, posed/stiff fashion-catalog stance. INSTEAD : weight shifted to one leg (contrapposto), hip slightly angled, shoulders softly rotated off-axis, head tilted gently OR turned slightly off-camera, ONE hand always engaged in a natural micro-gesture (in pocket, fixing hair, on hip, holding coffee mug, grazing fabric, scratching neck, adjusting sleeve) — never both hands rigidly down. Body captured MID-ACTION : mid-laugh, mid-step, mid-thought, mid-conversation — the photograph reads as a candid moment, not a posed shot. Subtle natural movement : slight lean against a wall, weight transfer in motion, hair caught moving, fabric in soft motion. Reference : how Sézane / Émoï-Émoï / Maison Labiche photograph their models — souple, vivante, jamais figée.

🪢 DRAWSTRING / CORD POLICY (ABSOLUTE — hoodies and zoodies only) : The drawstrings of any hoodie or zoodie shown in this image are PURE COTTON BRAIDED ROUND CORDS, EXACTLY MATCHING the body color of the garment (sage hoodie → sage cords, navy → navy, beige → beige, etc.). The cord ENDS are SIMPLY KNOTTED in a small visible knot OR CUT CLEAN AND RAW — nothing more. Think vintage 1970s pure cotton hoodie, before plastic aglets existed : just rope, just knot, just one tonal color. The cords blend visually with the sweat body and read as one continuous textile.

🚫 CORD ENDS — what to draw : a soft cotton knot, a frayed raw cut, or no finish at all (cord ends just disappearing into the body).

🚫 CORD ENDS — what NOT to draw : plastic aglet, metal cap, metal ferrule, golden tip, silver tip, plastic tip, plastic bead, decorative tassel, brand label, leather binding, transparent capsule, black plastic tip, white plastic tip, ANY hard tip of any color or material whatsoever, white cord on a colored hoodie.

🚫 ESCAPE HATCH — if the model has uncertainty about the cord ends, the cord ends are HIDDEN : tucked back into the hood, falling behind the body out of frame, or simply not visible because the framing excludes the upper chest area. Hidden cord ends are PREFERABLE to incorrectly drawn cord ends.

🎨 COLOR CONSISTENCY (ABSOLUTE — same garment, same embroidery across all shots in the pack) :

Garment fabric : the garment is SOLID-DYED in ONE single uniform tone (the exact color specified in the prompt above). The fabric shows subtle natural cotton texture but reads visually as ONE FLAT CONSISTENT COLOR. ABSOLUTELY NEVER : heathered grey effect, mottled appearance, marled/chinée fabric, mixed-thread two-tone look, speckled appearance, melange. The same hoodie in beige reads as one consistent beige across every shot — never lighter on one shot and darker on another, never with grey speckles, never as a heather. Reference : the perfectly solid, consistent fabric of a Maison Labiche or Émoï-Émoï solid-color hoodie.

Embroidery thread : the embroidery thread color is EXACTLY the color specified in the prompt — same hue, same saturation, same intensity. The embroidery reads as the SAME color across every shot in the pack. NEVER let the embroidery shift in tone, NEVER let it appear desaturated on one shot and saturated on another. If the embroidery is multicolor (e.g. each letter a different thread color), each individual letter color stays exactly identical between shots.`;

export const PROMPT_BASE = `Generate an image of:
Hyper-realistic digital mockup of a fashion editorial concept. 
QUALITÉ : Rendu 3D hyper-réaliste 2K ultra-détaillé, cinématographique, grain de pellicule argentique (analog film quality), mise au point macro d'une précision absolue.
STYLE : Photographie professionnelle premium, niveau campagne publicitaire haut de gamme. Effortless French cool, chic, émotionnel et ultra-authentique. Ambiance A.P.C., Octobre Éditions, Sézane, et émoi émoi.
DÉCOR : [DECOR]
LUMIÈRE : Lumière naturelle zénithale, morning window light ou golden hour douce.
PALETTE : Tons neutres désaturés, beige "natural raw", sable, crème, avec des touches de [THREAD_COLOR].
PRODUIT : Un [PRODUCT] de couleur unie et constante [GARMENT_COLOR] confectionné en [MATERIAL]. Le vêtement est vierge à l'intérieur, sans aucune étiquette ou label de marque visible au niveau du col. La texture du tissu doit être parfaitement visible au niveau des mailles.
BRODERIE : Le motif joint est brodé en fil [THREAD_COLOR] côté cœur. ⚠️ COULEUR FIL OBLIGATOIRE : la broderie générée DOIT être en fil [THREAD_COLOR], même si l'image source PNG montre la broderie dans une autre couleur. RE-BRODE le motif dans la couleur [THREAD_COLOR] sur le vêtement final, en ignorant la couleur de référence du PNG source (qui n'est qu'une référence de forme et de typographie, pas de couleur). ATTENTION PARTICULIÈRE : La broderie doit être EXTRÊMEMENT PLATE, SANS AUCUN RELIEF, SANS EFFET 3D NI GONFLÉ. Elle doit s'intégrer complètement au tissu comme une broderie fine et délicate, sans aucune surépaisseur. Si le motif contient du texte, les lettres brodées doivent être d'une lisibilité et d'une précision chirurgicale, sans aucune déformation. Les points de broderie (satin stitch, fill stitch) doivent être distincts et épouser parfaitement la tension et la maille du vêtement. Le rendu doit être 100% plat, lisse et ultra-réaliste.
TAILLE : La broderie mesure [SIZE] cm.\${COPYRIGHT_DISCLAIMER}
`;

export const PACKSHOT_PROMPT = `Generate an image of: Hyper-realistic digital 3D mockup of an e-commerce packshot d'un [PRODUIT] oversize de couleur unie et constante [COULEUR SWEAT], présenté sur un MANNEQUIN INVISIBLE (invisible mannequin effect). IMPORTANT : Le vêtement est présenté seul, sans modèle, flottant dans les airs avec un effet mannequin invisible. Le vêtement flotte seul devant un fond studio blanc pur. Le vêtement est vierge à l'intérieur, sans aucune étiquette ou label de marque visible au niveau du col. Motif brodé en fil [COULEUR FIL] visible sur l'[EMPLACEMENT] ([DIMENSION] maximum). ⚠️ COULEUR FIL OBLIGATOIRE : la broderie DOIT être en fil [COULEUR FIL], même si l'image source PNG montre une autre couleur. RE-BRODE le motif dans cette couleur sur le vêtement final, en ignorant la couleur de référence du PNG source (forme et typographie uniquement). ATTENTION : La broderie doit être EXTRÊMEMENT PLATE, SANS AUCUN RELIEF, SANS EFFET 3D NI GONFLÉ. Rendu 100% plat, lisse et ultra-réaliste, intégré au tissu sans surépaisseur. Éclairage studio parfaitement doux, sans ombres marquées, rendu fidèle aux couleurs réelles. Vue de face symétrique, packshot commercial mode premium, niveau vrai shooting photo professionnel, style minimaliste haut de gamme similaire aux fiches produit A.P.C., Octobre Éditions et Sézane, 4K ultra-réaliste.\${COPYRIGHT_DISCLAIMER}`;

export const SHOTS_CONFIG = {
  PORTRAIT: {
    label: "Portrait Éditorial",
    promptSuffix: "POSE EXPLICITE PORTRAIT : modèle photographié de TROIS-QUARTS (jamais de face), épaules tournées de 20° hors axe caméra, poids du corps appuyé sur la jambe gauche, hanche droite légèrement saillante. UNE main glissée dans la poche du sweat OU ramenant une mèche derrière l'oreille — l'autre détendue. Tête légèrement inclinée vers la caméra, sourire CONTENU intérieur (jamais sourire commercial dents apparentes appuyé). Regard intense vers l'objectif OU légèrement hors champ vers la fenêtre. Portrait mi-corps (half-body). Objectif 85mm f/2, faible profondeur de champ. ATTENTION : pas de pose photo d'identité, pas de bras symétriques tombants. Le mannequin doit être ultra-réaliste et imparfait (pores visibles, texture peau humaine).",
    packshotSuffix: "Vue d'ensemble de face du vêtement complet, coupe oversize bien visible. Présentation produit seul sans modèle.",
    familySuffix: "Portrait de groupe chaleureux. Modèles virtuels dans un moment de complicité. Lumière douce de fenêtre."
  },
  DETAIL: {
    label: "Macro Broderie",
    promptSuffix: "⚠️ CADRAGE MACRO ULTRA-SERRÉ : la broderie côté cœur DOIT remplir 60-80% du cadre. Le cadre EXCLUT EXPLICITEMENT : la capuche, le col, l'épaule, les cordons et leurs extrémités, le visage du modèle. Le cadre montre UNIQUEMENT la zone de broderie + un halo de tissu de 3-5 cm autour. Si une partie supérieure du sweat (capuche/col/cordons) apparaîtrait dans ce cadrage, RECADRE PLUS SERRÉ pour les exclure entièrement. Gros plan macro extrême (objectif 100mm macro, f/2.8-f/4) sur la broderie en fil [THREAD_COLOR] et le grain du tissu [MATERIAL]. Focus ultra-précis sur chaque point de couture (stitching) et sur la typographie brodée qui doit être parfaitement lisible. Lumière douce naturelle, bokeh crémeux sur les bords du cadre. ATTENTION : la broderie doit être EXTRÊMEMENT PLATE, SANS AUCUN RELIEF, SANS EFFET 3D NI GONFLÉ.",
    packshotSuffix: "Gros plan macro absolu sur la broderie et le grain du tissu. Détails microscopiques des fils de broderie soyeux, de la tension du tissu et de la netteté du texte.",
    familySuffix: "Gros plan émotionnel : une main touchant la broderie ultra-réaliste sur le vêtement porté par un modèle. Focus absolu sur la netteté des lettres brodées, l'aspect soyeux des fils et la texture."
  },
  LIFESTYLE: {
    label: "Lifestyle Mode",
    promptSuffix: "POSE EXPLICITE LIFESTYLE : modèle ADOSSÉ ou INSTALLÉ dans le décor (jamais debout face caméra centré). Adossé contre un mur (UNE épaule appuyée, l'autre libre), OU assis-affalé dans un fauteuil/canapé jambes croisées sur le côté, OU appuyé sur un meuble (UN avant-bras posé). UNE main occupée (tenant une tasse de café, un livre, glissée dans la poche, jouant avec un cheveu) — l'autre détendue. Regard DÉTOURNÉ : vers la fenêtre, vers le bas pensif, vers un objet hors champ — pas frontal direct. Profil 3/4 face caméra. Expression intérieure mi-sourire mi-pensée. Editorial fashion photography. [DECOR] Soft natural light, warm and authentic mood. Photos lifestyle très émotionnelles, vivantes. Le mannequin doit être imparfait, humain, texture peau naturelle. IMPORTANT : AUCUN zoom sur la broderie.",
    packshotSuffix: "Vue de trois-quarts du vêtement sur le mannequin invisible, mettant en valeur le volume et le tombé du tissu. Présentation produit seul sans modèle.",
    familySuffix: "Scène de vie de groupe dans un salon lumineux ou un atelier. Les modèles virtuels partagent un moment authentique. IMPORTANT : Plan d'ensemble, AUCUN zoom sur la broderie."
  },
  OUTDOOR: {
    label: "Lifestyle Extérieur",
    promptSuffix: "POSE EXPLICITE EXTÉRIEUR : modèle CAPTURÉ EN MOUVEMENT (jamais debout statique). Marchant vers la caméra avec un pas asymétrique (un pied en avant), OU se retournant avec rotation du buste, OU descendant un escalier, OU traversant une rue. Cheveux en mouvement avec le vent. UN bras croisant le torse en mouvement OU UNE main dans la poche — l'autre balançant naturellement avec le pas. Tête inclinée vers le bas avec sourire intérieur OU regard hors champ — JAMAIS face caméra figé. Plan large en extérieur. Rue pavée parisienne ou jardin sauvage. Contre-jour de golden hour, léger flare. Le mannequin ultra-réaliste et imparfait (pores, texture peau, cheveux en bataille).",
    packshotSuffix: "Vue de dos ou détail du col/haut du vêtement, toujours sur fond blanc pur avec le mannequin invisible. Présentation produit seul sans modèle.",
    familySuffix: "Groupe se promenant en extérieur, lumière de fin de journée rasante. Rendu vivant et dynamique."
  }
};

export const FULL_PACK_PARISIEN = {
  GHOST: {
    label: "Ghost Packshot",
    prompt: `Generate an image of: Hyper-realistic digital 3D mockup of an e-commerce packshot d'un [PRODUIT] oversize de couleur unie et constante [COULEUR SWEAT] ([MATERIAL]), présenté sur un MANNEQUIN INVISIBLE (invisible mannequin effect). IMPORTANT : Le vêtement est présenté seul, sans modèle, flottant dans les airs avec un effet mannequin invisible. Le vêtement flotte seul devant un fond studio blanc pur. Le motif joint est brodé en fil [COULEUR FIL] visible sur l'[EMPLACEMENT] ([DIMENSION] maximum). ATTENTION : La broderie doit être EXTRÊMEMENT PLATE, SANS AUCUN RELIEF, SANS EFFET 3D NI GONFLÉ. Rendu 100% plat, lisse et ultra-réaliste, intégré au tissu sans surépaisseur. Éclairage studio parfaitement doux, sans ombres marquées, rendu fidèle aux couleurs réelles. Vue de face symétrique, packshot commercial mode, style minimaliste haut de gamme similaire aux fiches produit Maison Labiche, 4K ultra détaillé.\${COPYRIGHT_DISCLAIMER}`
  },
  CROP: {
    label: "Détail Haut du Vêtement",
    prompt: `Generate an image of: Hyper-realistic digital mockup en gros plan sur le haut d'un [PRODUIT] de couleur unie et constante [COULEUR SWEAT] ([MATERIAL]) porté par un modèle virtuel. Le motif joint est brodé en fil [COULEUR FIL] et est le point focal, visible sur l'[EMPLACEMENT] ([DIMENSION] maximum). ATTENTION : La broderie doit être EXTRÊMEMENT PLATE, SANS AUCUN RELIEF, SANS EFFET 3D NI GONFLÉ. Rendu 100% plat, lisse et ultra-réaliste, intégré au tissu sans surépaisseur. Vêtement légèrement oversize, tombé naturel du tissu. Cadrage centré sur le vêtement et la broderie. Fond blanc cassé uni, éclairage studio plat et doux, netteté sur les points de broderie et la texture du tissu. Objectif 90mm macro, f/3.5, esthétique close-up premium A.P.C., Octobre Éditions et Sézane, niveau vrai shooting photo professionnel, ultra-réaliste, sobre et minimal.\${COPYRIGHT_DISCLAIMER}`
  },
  MACRO: {
    label: "Macro Broderie",
    prompt: `Generate an image of: Hyper-realistic digital mockup macro extrêmement serré sur une broderie en fil [COULEUR FIL] représentant le motif joint sur un [PRODUIT] de couleur unie et constante [COULEUR SWEAT] ([MATERIAL]). Broderie positionnée sur l'[EMPLACEMENT], [DIMENSION] maximum, très petit et discret. Texture du fil et trame du tissu visibles dans les moindres détails. Éclairage doux et directionnel sans créer d'ombres portées excessives. ATTENTION : la broderie doit être EXTRÊMEMENT PLATE, SANS AUCUN RELIEF, SANS EFFET 3D NI GONFLÉ. Rendu 100% plat, lisse et ultra-réaliste, intégré au tissu sans aucune surépaisseur. Objectif macro Canon 100mm, f/4, mise au point ultra nette sur la broderie avec bokeh crémeux en arrière-plan, photographie produit mode luxe, détail artisanal haute couture, tons neutres et chauds.\${COPYRIGHT_DISCLAIMER}`
  },
  LIFESTYLE: {
    label: "Lifestyle",
    prompt: `Generate an image of: Editorial fashion photography, an ultra-realistic, imperfect human model (visible pores, natural skin texture, freckles, natural/messy hair, not a perfect celebrity, age-appropriate features) standing against a sage green molded wall or sitting on a vintage sofa in an editorial apartment with chevron parquet floor. Wearing a premium [PRODUIT] in [COULEUR SWEAT] ([MATERIAL]). The attached motif is embroidered in [COULEUR FIL] thread on the [EMPLACEMENT] (max [DIMENSION]). Soft natural light, warm morning light, warm and authentic mood.
Esthétique mode française contemporaine, niveau vrai shooting photo professionnel premium. Ambiance A.P.C., Octobre Éditions, Sézane, émoi émoi. Photos lifestyle très émotionnelles, vivantes et ultra-réalistes.
Objectif 50mm ou 85mm, profondeur de champ douce, rendu éditorial premium de très haute qualité.
ATTENTION : La broderie doit être EXTRÊMEMENT PLATE, SANS AUCUN RELIEF, SANS EFFET 3D NI GONFLÉ. Rendu 100% plat, lisse et ultra-réaliste, intégré au tissu sans surépaisseur.
IMPORTANT : Plan large ou plein corps uniquement. AUCUN zoom sur la broderie, la broderie doit rester un détail discret dans la composition globale.\${COPYRIGHT_DISCLAIMER}`
  },
  DUO: {
    label: "Duo Éditorial",
    prompt: `Generate an image of: Editorial fashion photography, two ultra-realistic, imperfect human models (visible pores, natural skin texture, freckles, natural/messy hair, not perfect celebrities, age-appropriate features) laughing together on a stylish vintage sofa, apartment with sage green walls and vintage decor. Both wearing matching premium [PRODUIT]s in [COULEUR SWEAT] ([MATERIAL]), with the attached motif embroidered in [COULEUR FIL] thread on the [EMPLACEMENT] (max [DIMENSION]). Both embroidery motifs clearly visible but extremely flat and realistic. Soft natural light, warm morning light, warm and authentic mood.
Esthétique premium A.P.C., Octobre Éditions, Sézane et émoi émoi. Niveau vrai shooting photo professionnel, ultra-réaliste, très émotionnel, grain argentique.
ATTENTION : La broderie doit être EXTRÊMEMENT PLATE, SANS AUCUN RELIEF, SANS EFFET 3D NI GONFLÉ.\${COPYRIGHT_DISCLAIMER}`
  },
  PORTRAIT: {
    label: "Portrait Mi-Corps",
    prompt: `Generate an image of: Photography of an ultra-realistic, imperfect human model (visible pores, natural skin texture, freckles, natural/messy hair, not a perfect celebrity, age-appropriate features) sitting on a vintage sofa or standing in an editorial apartment with sage green molded walls and chevron parquet, wearing a premium [PRODUIT] in [COULEUR SWEAT] ([MATERIAL]). The attached motif is embroidered in [COULEUR FIL] thread on the [EMPLACEMENT] (max [DIMENSION]). The model looks at the camera or slightly off-camera with a warm, authentic smile. Soft natural light, warm morning light.
Photographie professionnelle premium, niveau vrai shooting photo. Esthétique chic, émotionnelle et ultra-authentique. Ambiance A.P.C., Octobre Éditions, Sézane, et émoi émoi.
ATTENTION : La broderie doit être EXTRÊMEMENT PLATE, SANS AUCUN RELIEF, SANS EFFET 3D NI GONFLÉ.\${COPYRIGHT_DISCLAIMER}`
  }
};

export const FULL_PACK_MINIMALIST = {
  STUDIO_FEMME: {
    label: "Studio Minimaliste (Femme)",
    prompt: `Generate an image of: Photographie de mode éditoriale en studio, fond uni blanc cassé légèrement texturé. Jeune femme ultra-réaliste et imparfaite portant un [PRODUIT] oversize en [COULEUR SWEAT] ([MATERIAL]) avec le motif joint brodé en fil [COULEUR FIL] sur l'[EMPLACEMENT] ([DIMENSION] max). Ceinturé d'une lanière en cuir fin, bottines en cuir fauve. Posture assurée, légèrement de trois-quarts, regard hors champ. Éclairage studio doux et plat sans ombres marquées. Tons entièrement désaturés — [COULEUR SWEAT], écru, nude, brun. Objectif 85mm f/2, grain argentique fin, cadrage mi-cuisse. Esthétique campagne Sézane printemps, sobriété A.P.C., féminité douce Émoï-Émoï. ATTENTION : La broderie doit être EXTRÊMEMENT PLATE, SANS AUCUN RELIEF, SANS EFFET 3D NI GONFLÉ.\${COPYRIGHT_DISCLAIMER}`
  },
  PACKSHOT_PORTE: {
    label: "Packshot Porté (Femme)",
    prompt: `Generate an image of: Photographie mode e-commerce d'une jeune femme ultra-réaliste portant un [PRODUIT] oversize en [COULEUR SWEAT] ([MATERIAL]) avec le motif joint brodé en fil [COULEUR FIL] sur l'[EMPLACEMENT] ([DIMENSION] max), associé à une jupe en denim brut sombre. Modèle cadrée du menton jusqu'aux mi-cuisses, visage non entièrement visible. Bras détendus le long du corps, posture droite face à l'objectif. Fond de studio gris très clair, éclairage studio diffus et doux, sans ombres marquées, rendu fidèle aux couleurs du vêtement. Objectif 50mm f/5.6, mise au point nette sur les détails du vêtement, post-traitement minimal, esthétique fiche produit A.P.C. ATTENTION : La broderie doit être EXTRÊMEMENT PLATE, SANS AUCUN RELIEF.\${COPYRIGHT_DISCLAIMER}`
  },
  BUSTE_HOMME: {
    label: "Buste Éditorial (Homme)",
    prompt: `Generate an image of: Photographie de mode éditoriale en buste d'un jeune homme ultra-réaliste et imparfait portant un [PRODUIT] oversize en [COULEUR SWEAT] ([MATERIAL]) avec le motif joint brodé en fil [COULEUR FIL] sur l'[EMPLACEMENT] ([DIMENSION] max). Regard légèrement hors champ vers le bas, expression calme et naturelle, une main glissée dans la poche. Fond de studio gris clair très doux. Cadrage de la taille jusqu'au-dessus de la tête. Objectif 85mm f/2, éclairage studio plat avec très légère ombre latérale, palette froide et désaturée, grain de film argentique. Esthétique campagne AMI Paris, APC homme, masculin et sobre. ATTENTION : La broderie doit être EXTRÊMEMENT PLATE, SANS AUCUN RELIEF.\${COPYRIGHT_DISCLAIMER}`
  },
  BUSTE_FEMME: {
    label: "Buste Éditorial (Femme)",
    prompt: `Generate an image of: Photographie de mode éditoriale en buste d'une jeune femme ultra-réaliste et imparfaite portant un [PRODUIT] oversize en [COULEUR SWEAT] ([MATERIAL]) avec le motif joint brodé en fil [COULEUR FIL] sur l'[EMPLACEMENT] ([DIMENSION] max). Elle regarde directement l'objectif avec une expression subtile et confiante, mains dans la poche du sweat. Fond de studio crème uni et chaud. Cadrage de la taille jusqu'au-dessus de la tête, composition centrée. Objectif Contax 645, 80mm f/2, carnation naturelle et lumineuse, éclairage studio doux avec légère ombre directionnelle, palette chaude désaturée, qualité film argentique, cool français sans effort, esthétique campagne Sézane x A.P.C. ATTENTION : La broderie doit être EXTRÊMEMENT PLATE, SANS AUCUN RELIEF.\${COPYRIGHT_DISCLAIMER}`
  },
  GHOST: {
    label: "Ghost Packshot",
    prompt: `Generate an image of: Photographie produit e-commerce épurée d'un [PRODUIT] oversize en [COULEUR SWEAT] ([MATERIAL]), présenté sur mannequin fantôme invisible devant fond blanc pur. Le motif joint brodé en fil [COULEUR FIL] est visible sur l'[EMPLACEMENT] ([DIMENSION] max). Col, poignets et bas côtelés bien visibles. Éclairage studio parfaitement doux et uniforme, rendu fidèle aux matières et couleurs. Vue de face symétrique, packshot commercial haut de gamme, esthétique Colorful Standard et A.P.C., 4K ultra détaillé. ATTENTION : La broderie doit être EXTRÊMEMENT PLATE, SANS AUCUN RELIEF, SANS EFFET 3D NI GONFLÉ.\${COPYRIGHT_DISCLAIMER}`
  },
  MACRO: {
    label: "Macro Broderie",
    prompt: `Generate an image of: Hyper-realistic digital mockup macro extrêmement serré sur une broderie en fil [COULEUR FIL] représentant le motif joint sur un [PRODUIT] de couleur unie et constante [COULEUR SWEAT] ([MATERIAL]). Broderie positionnée sur l'[EMPLACEMENT], [DIMENSION] maximum, très petit et discret. Texture du fil et trame du tissu visibles dans les moindres détails. Éclairage doux et directionnel sans créer d'ombres portées excessives. ATTENTION : la broderie doit être EXTRÊMEMENT PLATE, SANS AUCUN RELIEF, SANS EFFET 3D NI GONFLÉ. Objectif macro Canon 100mm, f/4, mise au point ultra nette sur la broderie avec bokeh crémeux en arrière-plan, esthétique A.P.C.\${COPYRIGHT_DISCLAIMER}`
  }
};

export const FULL_PACK_LOFT = {
  PLEIN_PIED: {
    label: "Plein Pied Loft",
    prompt: `Generate an image of: Photographie lifestyle éditoriale d'un modèle ultra-réaliste, imparfait et naturel portant un [PRODUIT] en [COULEUR SWEAT] ([MATERIAL]) avec le motif joint brodé en fil [COULEUR FIL] sur l'[EMPLACEMENT] ([DIMENSION] max). Le modèle est photographié en plein pied, posture naturelle et détendue, appuyé contre un mur en béton clair. Décor : espace architectural lumineux et minimaliste, verrière industrielle, parquet en bois naturel, quelques plantes vertes en pots, ambiance loft ou serre contemporaine. Lumière douce, naturelle et diffuse provenant d'une grande verrière. Palette neutre et élégante : beige, sable, béton clair, bois, vert végétal. Composition épurée avec beaucoup d'espace autour du modèle. Esthétique mode française contemporaine, minimaliste et naturelle, esprit A.P.C., AMI Paris, Maison Labiche. Objectif 50mm, profondeur de champ douce. ATTENTION : La broderie doit être EXTRÊMEMENT PLATE, SANS AUCUN RELIEF.\${COPYRIGHT_DISCLAIMER}`
  },
  PLAN_AMERICAIN: {
    label: "Plan Américain Assis",
    prompt: `Generate an image of: Photographie lifestyle éditoriale d'un modèle ultra-réaliste, imparfait et naturel portant un [PRODUIT] en [COULEUR SWEAT] ([MATERIAL]) avec le motif joint brodé en fil [COULEUR FIL] sur l'[EMPLACEMENT] ([DIMENSION] max). Plan américain (mi-cuisse), modèle assis sur un tabouret en bois brut ou fauteuil vintage. Décor : espace architectural lumineux et minimaliste, verrière industrielle, mur en béton clair, parquet en bois naturel, ambiance loft ou serre contemporaine. Lumière douce, naturelle et diffuse provenant d'une grande verrière. Palette neutre et élégante. Esthétique mode française contemporaine, minimaliste et naturelle, esprit A.P.C., AMI Paris, Maison Labiche. Objectif 85mm, profondeur de champ douce. ATTENTION : La broderie doit être EXTRÊMEMENT PLATE, SANS AUCUN RELIEF.\${COPYRIGHT_DISCLAIMER}`
  },
  BUSTE: {
    label: "Buste Verrière",
    prompt: `Generate an image of: Photographie lifestyle éditoriale d'un modèle ultra-réaliste, imparfait et naturel portant un [PRODUIT] en [COULEUR SWEAT] ([MATERIAL]) avec le motif joint brodé en fil [COULEUR FIL] sur l'[EMPLACEMENT] ([DIMENSION] max). Cadrage en buste, regard vers la fenêtre, lumière douce caressant le visage et le vêtement. Décor : espace architectural lumineux et minimaliste, ambiance loft ou serre contemporaine. Lumière douce, naturelle et diffuse provenant d'une grande verrière. Palette neutre et élégante. Esthétique mode française contemporaine, minimaliste et naturelle, esprit A.P.C., AMI Paris, Maison Labiche. Objectif 85mm, profondeur de champ douce. ATTENTION : La broderie doit être EXTRÊMEMENT PLATE, SANS AUCUN RELIEF.\${COPYRIGHT_DISCLAIMER}`
  },
  RAPPROCHE: {
    label: "Plan Rapproché Café",
    prompt: `Generate an image of: Photographie lifestyle éditoriale d'un modèle ultra-réaliste, imparfait et naturel portant un [PRODUIT] en [COULEUR SWEAT] ([MATERIAL]) avec le motif joint brodé en fil [COULEUR FIL] sur l'[EMPLACEMENT] ([DIMENSION] max). Plan rapproché sur le torse et la broderie, le modèle tient une tasse de café en céramique artisanale. Décor : espace architectural lumineux et minimaliste, ambiance loft ou serre contemporaine avec plantes vertes. Lumière douce, naturelle et diffuse. Palette neutre et élégante. Esthétique mode française contemporaine, minimaliste et naturelle, esprit A.P.C., AMI Paris, Maison Labiche. Objectif 50mm macro, profondeur de champ douce. ATTENTION : La broderie doit être EXTRÊMEMENT PLATE, SANS AUCUN RELIEF.\${COPYRIGHT_DISCLAIMER}`
  },
  MOUVEMENT: {
    label: "Mouvement Loft",
    prompt: `Generate an image of: Photographie lifestyle éditoriale d'un modèle ultra-réaliste, imparfait et naturel portant un [PRODUIT] en [COULEUR SWEAT] ([MATERIAL]) avec le motif joint brodé en fil [COULEUR FIL] sur l'[EMPLACEMENT] ([DIMENSION] max). Modèle marchant lentement vers l'objectif sur le parquet en bois naturel, flou de mouvement très léger, dynamique. Décor : espace architectural lumineux et minimaliste, verrière industrielle, mur en béton clair, ambiance loft ou serre contemporaine. Lumière douce, naturelle et diffuse. Palette neutre et élégante. Esthétique mode française contemporaine, minimaliste et naturelle, esprit A.P.C., AMI Paris, Maison Labiche. Objectif 50mm, profondeur de champ douce. ATTENTION : La broderie doit être EXTRÊMEMENT PLATE, SANS AUCUN RELIEF.\${COPYRIGHT_DISCLAIMER}`
  },
  MACRO_PORTEE: {
    label: "Macro Broderie Portée",
    prompt: `Generate an image of: Hyper-realistic editorial macro photograph showing the embroidered detail WORN by a real human model. ⚠️ ULTRA-TIGHT MACRO FRAMING : embroidery fills 60-80% of frame, frame EXCLUDES the hood, the collar, the shoulders, the drawstrings and their ends. Tight close-up framing on the LEFT CHEST embroidery area of a [PRODUIT] in [COULEUR SWEAT] ([MATERIAL]). The attached motif is embroidered in [COULEUR FIL] thread on the [EMPLACEMENT] ([DIMENSION] max). The shot MUST include a fragment of the model — a partial face (cheek, jawline, mouth corner, OR chin), a strand of hair softly falling on the fabric, OR a hand gently grazing the embroidery edge — but the embroidery itself remains the focal point in sharp focus. THIS IS NOT A FLAT LAY, THIS IS NOT A NATURE MORTE — the garment is worn on a human body, in motion or resting, with visible skin texture and natural fabric folds anchoring the scene in real life. Décor : espace architectural lumineux et minimaliste, verrière industrielle, mur en béton clair, parquet en bois naturel, ambiance loft ou serre contemporaine. Soft diffused natural light from a glass roof. Palette neutre et élégante : beige, sable, béton clair, bois, vert végétal. Objectif Canon 100mm macro, f/3.5, ultra-sharp focus on embroidery stitching with creamy bokeh on the model fragment. Esthétique inspirationnelle mode française contemporaine, intimist editorial close-up, esprit A.P.C., AMI Paris, Maison Labiche. ATTENTION : La broderie doit être EXTRÊMEMENT PLATE, SANS AUCUN RELIEF, SANS EFFET 3D NI GONFLÉ. Rendu 100% plat, lisse et ultra-réaliste, intégré au tissu sans surépaisseur.\${COPYRIGHT_DISCLAIMER}`
  }
};

export const FULL_PACK_SERRE = {
  PLEIN_PIED: {
    label: "Plein Pied Atelier",
    prompt: `Generate an image of: Photographie lifestyle éditoriale d'un modèle ultra-réaliste, imparfait et naturel portant un [PRODUIT] en [COULEUR SWEAT] ([MATERIAL]) avec le motif joint brodé en fil [COULEUR FIL] sur l'[EMPLACEMENT] ([DIMENSION] max). Le modèle est photographié en plein pied dans un atelier de rempotage chic ou un salon d'hiver raffiné — PAS une serre tropicale dense, PAS une jungle botanique. Décor : parois de verre sur structure métallique noire, sol en tomette terracotta, étagères en bois et une table de rempotage vintage portant une COLLECTION VARIÉE de plantes et de fleurs en pots terracotta de tailles différentes (plantes vertes, petites plantes à fleurs, herbes, succulentes — diversité d'espèces mais jamais envahissante), TOUT en arrière-plan FLOUTÉ. Arrosoir laiton patiné, outils de jardin à manche en bois. Lumière diffuse naturelle douce. Le vêtement brodé reste le héros visuel — les plantes/props sont une atmosphère discrète en arrière-plan UNIQUEMENT. Quiet luxury Émoï-Émoï × Sézane × maison de campagne française en hiver. Palette écru, sable, terracotta doux, laiton, touches vertes diverses. Objectif 50mm, profondeur de champ douce. ATTENTION : La broderie doit être EXTRÊMEMENT PLATE, SANS AUCUN RELIEF.\${COPYRIGHT_DISCLAIMER}`
  },
  PLAN_AMERICAIN: {
    label: "Plan Américain Salon d'Hiver",
    prompt: `Generate an image of: Photographie lifestyle éditoriale d'un modèle ultra-réaliste, imparfait et naturel portant un [PRODUIT] en [COULEUR SWEAT] ([MATERIAL]) avec le motif joint brodé en fil [COULEUR FIL] sur l'[EMPLACEMENT] ([DIMENSION] max). Plan américain (mi-cuisse), modèle installé dans un fauteuil en rotin vintage élégant dans un salon d'hiver / atelier de rempotage raffiné. En arrière-plan FLOUTÉ : étagères en bois portant une collection variée de plantes et fleurs en pots terracotta (diversité d'espèces, jamais envahissante), parois de verre sur structure métallique noire, lumière diffuse douce. PAS de jungle, PAS de feuillages denses qui encadrent — le vêtement brodé reste le héros visuel. Quiet luxury Sézane × Émoï-Émoï × maison de campagne française. Palette écru, sable, terracotta doux, laiton. Objectif 85mm, profondeur de champ douce. ATTENTION : La broderie doit être EXTRÊMEMENT PLATE, SANS AUCUN RELIEF.\${COPYRIGHT_DISCLAIMER}`
  },
  BUSTE: {
    label: "Buste Verrière",
    prompt: `Generate an image of: Photographie lifestyle éditoriale d'un modèle ultra-réaliste, imparfait et naturel portant un [PRODUIT] en [COULEUR SWEAT] ([MATERIAL]) avec le motif joint brodé en fil [COULEUR FIL] sur l'[EMPLACEMENT] ([DIMENSION] max). Cadrage en buste, le modèle dans un salon d'hiver / atelier de rempotage raffiné. Lumière diffuse douce de la verrière. En arrière-plan FLOUTÉ : silhouettes de plantes variées en pots terracotta sur des étagères en bois, jamais de feuillage qui encadre le visage. PAS de teintes verdâtres marquées sur le visage. Quiet luxury Sézane × Émoï-Émoï. Palette écru, sable, terracotta doux, laiton. Objectif 85mm, profondeur de champ douce. ATTENTION : La broderie doit être EXTRÊMEMENT PLATE, SANS AUCUN RELIEF.\${COPYRIGHT_DISCLAIMER}`
  },
  RAPPROCHE: {
    label: "Rapproché Rempotage",
    prompt: `Generate an image of: Photographie lifestyle éditoriale d'un modèle ultra-réaliste portant un [PRODUIT] en [COULEUR SWEAT] ([MATERIAL]) avec le motif joint brodé en fil [COULEUR FIL] sur l'[EMPLACEMENT] ([DIMENSION] max). Plan rapproché sur le torse et la broderie, le modèle tient un arrosoir en laiton patiné ancien OU les mains délicatement posées sur un petit pot terracotta avec une plante succulente (geste de rempotage discret). Décor atelier de rempotage / salon d'hiver, étagères avec collection variée de plantes en pots en arrière-plan FLOUTÉ. Lumière diffuse douce. PAS de jungle, PAS de feuillages au premier plan. Quiet luxury Sézane × Émoï-Émoï. Palette écru, sable, terracotta doux, laiton. Objectif 50mm macro, profondeur de champ douce. ATTENTION : La broderie doit être EXTRÊMEMENT PLATE, SANS AUCUN RELIEF.\${COPYRIGHT_DISCLAIMER}`
  },
  MOUVEMENT: {
    label: "Mouvement Salon d'Hiver",
    prompt: `Generate an image of: Photographie lifestyle éditoriale d'un modèle ultra-réaliste portant un [PRODUIT] en [COULEUR SWEAT] ([MATERIAL]) avec le motif joint brodé en fil [COULEUR FIL] sur l'[EMPLACEMENT] ([DIMENSION] max). Modèle marchant lentement dans un salon d'hiver / atelier de rempotage raffiné, parois de verre sur structure métallique noire en arrière-plan, sol en tomette terracotta, étagères avec collection variée de plantes et fleurs en pots FLOUTÉES. Lumière diffuse douce, léger flou de mouvement. PAS de jungle, PAS de feuillages denses qui encadrent. Quiet luxury Sézane × Émoï-Émoï × maison de campagne française. Palette écru, sable, terracotta doux. Objectif 50mm. ATTENTION : La broderie doit être EXTRÊMEMENT PLATE, SANS AUCUN RELIEF.\${COPYRIGHT_DISCLAIMER}`
  },
  MACRO_PORTEE: {
    label: "Macro Broderie Atelier",
    prompt: `Generate an image of: Hyper-realistic editorial macro photograph showing the embroidered detail WORN by a real human model. ⚠️ ULTRA-TIGHT MACRO FRAMING : embroidery fills 60-80% of frame, frame EXCLUDES the hood, the collar, the shoulders, the drawstrings and their ends. Tight close-up framing on the LEFT CHEST embroidery area of a [PRODUIT] in [COULEUR SWEAT] ([MATERIAL]). The attached motif is embroidered in [COULEUR FIL] thread on the [EMPLACEMENT] ([DIMENSION] max). The shot MUST include a fragment of the model — partial face, hand grazing the embroidery edge, or a strand of hair. THIS IS NOT A FLAT LAY. Background : softly blurred bokeh of a refined potting atelier — varied terracotta pots and shelves of plants out of focus — NOT a dense jungle backdrop. Refined French country winter parlor atmosphere, NOT a tropical greenhouse. Objectif Canon 100mm macro, f/3.5, ultra-sharp on embroidery with creamy bokeh background. Quiet luxury Sézane × Émoï-Émoï aesthetic. ATTENTION : La broderie doit être EXTRÊMEMENT PLATE, SANS AUCUN RELIEF.\${COPYRIGHT_DISCLAIMER}`
  }
};

export const FULL_PACK_AUBE = {
  PLEIN_PIED: {
    label: "Plein Pied Aube",
    prompt: `Generate an image of: Photographie lifestyle éditoriale d'un modèle ultra-réaliste, imparfait et naturel portant un [PRODUIT] en [COULEUR SWEAT] ([MATERIAL]) avec le motif joint brodé en fil [COULEUR FIL] sur l'[EMPLACEMENT] ([DIMENSION] max). Le modèle photographié en plein pied dans une chambre intime à l'aube : draps en lin blanc froissés sur un lit en bois clair, rideaux voilés diffusant une lumière dorée matinale, parquet en bois brut, ambiance slow living mélancolique douce. Palette ivoire, lin, gold matinal, sable. Objectif 50mm, profondeur de champ douce. Ambiance Émoï-Émoï × The Frankie Shop. ATTENTION : La broderie doit être EXTRÊMEMENT PLATE, SANS AUCUN RELIEF.\${COPYRIGHT_DISCLAIMER}`
  },
  PLAN_AMERICAIN: {
    label: "Plan Américain Lit",
    prompt: `Generate an image of: Photographie lifestyle éditoriale d'un modèle ultra-réaliste portant un [PRODUIT] en [COULEUR SWEAT] ([MATERIAL]) avec le motif joint brodé en fil [COULEUR FIL] sur l'[EMPLACEMENT] ([DIMENSION] max). Plan américain (mi-cuisse), modèle assis au bord d'un lit avec draps en lin blanc froissés, ou debout près d'une fenêtre voilée. Lumière dorée matinale rasante. Une tasse en céramique fume sur la table de chevet. Palette ivoire, lin, gold matinal. Objectif 85mm, profondeur de champ douce. Ambiance slow living intime. ATTENTION : La broderie doit être EXTRÊMEMENT PLATE, SANS AUCUN RELIEF.\${COPYRIGHT_DISCLAIMER}`
  },
  BUSTE: {
    label: "Buste Fenêtre",
    prompt: `Generate an image of: Photographie lifestyle éditoriale d'un modèle ultra-réaliste portant un [PRODUIT] en [COULEUR SWEAT] ([MATERIAL]) avec le motif joint brodé en fil [COULEUR FIL] sur l'[EMPLACEMENT] ([DIMENSION] max). Cadrage en buste, le modèle près d'une fenêtre voilée, contre-jour matinal doré sur le visage et le vêtement, expression sereine légèrement songeuse. Décor : chambre intime, lin blanc froissé en arrière-plan flou. Palette ivoire, lin, gold matinal. Objectif 85mm. ATTENTION : La broderie doit être EXTRÊMEMENT PLATE, SANS AUCUN RELIEF.\${COPYRIGHT_DISCLAIMER}`
  },
  RAPPROCHE: {
    label: "Rapproché Café",
    prompt: `Generate an image of: Photographie lifestyle éditoriale d'un modèle ultra-réaliste portant un [PRODUIT] en [COULEUR SWEAT] ([MATERIAL]) avec le motif joint brodé en fil [COULEUR FIL] sur l'[EMPLACEMENT] ([DIMENSION] max). Plan rapproché sur le torse et la broderie, le modèle tient une grande tasse en céramique artisanale fumante (café ou thé), un livre ouvert visible à proximité. Décor : chambre ou cuisine intime à l'aube, lumière dorée matinale tendre, draps en lin blanc en arrière-plan flou. Palette ivoire, lin, gold. Objectif 50mm macro. ATTENTION : La broderie doit être EXTRÊMEMENT PLATE, SANS AUCUN RELIEF.\${COPYRIGHT_DISCLAIMER}`
  },
  MOUVEMENT: {
    label: "Mouvement Aube",
    prompt: `Generate an image of: Photographie lifestyle éditoriale d'un modèle ultra-réaliste portant un [PRODUIT] en [COULEUR SWEAT] ([MATERIAL]) avec le motif joint brodé en fil [COULEUR FIL] sur l'[EMPLACEMENT] ([DIMENSION] max). Modèle marchant pieds nus sur un parquet en bois brut, vers une fenêtre voilée à l'aube, contre-jour doré matinal créant un léger flare, draps en lin blanc froissés visibles. Léger flou de mouvement. Palette ivoire, lin, gold. Ambiance slow living mélancolique. Objectif 50mm. ATTENTION : La broderie doit être EXTRÊMEMENT PLATE, SANS AUCUN RELIEF.\${COPYRIGHT_DISCLAIMER}`
  },
  MACRO_PORTEE: {
    label: "Macro Broderie Aube",
    prompt: `Generate an image of: Hyper-realistic editorial macro photograph showing the embroidered detail WORN by a real human model. ⚠️ ULTRA-TIGHT MACRO FRAMING : embroidery fills 60-80% of frame, frame EXCLUDES the hood, the collar, the shoulders, the drawstrings and their ends. Tight close-up framing on the LEFT CHEST embroidery area of a [PRODUIT] in [COULEUR SWEAT] ([MATERIAL]). The attached motif is embroidered in [COULEUR FIL] thread on the [EMPLACEMENT] ([DIMENSION] max). The shot MUST include a fragment of the model — partial face (cheek, jawline), or a hand holding the fabric, or hair softly falling. THIS IS NOT A FLAT LAY. Background : crumpled white linen sheets blurred, soft golden morning light from a sheer-curtained window. Slow living dawn intimacy. Objectif Canon 100mm macro, f/3.5. ATTENTION : La broderie doit être EXTRÊMEMENT PLATE, SANS AUCUN RELIEF.\${COPYRIGHT_DISCLAIMER}`
  }
};

export const FULL_PACK_SAUVAGE = {
  PLEIN_PIED: {
    label: "Plein Pied Sauvage",
    prompt: `Generate an image of: Photographie lifestyle éditoriale d'un modèle ultra-réaliste, imparfait et naturel portant un [PRODUIT] en [COULEUR SWEAT] ([MATERIAL]) avec le motif joint brodé en fil [COULEUR FIL] sur l'[EMPLACEMENT] ([DIMENSION] max). Plein pied en extérieur, falaise venteuse face à la mer, prairie sauvage d'herbes hautes ou plage déserte. Cheveux et vêtement en mouvement avec le vent. Contre-jour de golden hour bas créant un léger flare. Posture vivante, naturelle, jamais posée. Palette océan gris-vert, sable doré, ciel chaud. Objectif 50mm. Ambiance Carine Roitfeld × Vanessa Bruno nature française sauvage. ATTENTION : La broderie doit être EXTRÊMEMENT PLATE, SANS AUCUN RELIEF.\${COPYRIGHT_DISCLAIMER}`
  },
  PLAN_AMERICAIN: {
    label: "Plan Américain Vent",
    prompt: `Generate an image of: Photographie lifestyle éditoriale d'un modèle ultra-réaliste portant un [PRODUIT] en [COULEUR SWEAT] ([MATERIAL]) avec le motif joint brodé en fil [COULEUR FIL] sur l'[EMPLACEMENT] ([DIMENSION] max). Plan américain (mi-cuisse), modèle debout sur une falaise venteuse ou au milieu d'herbes hautes ondulant, regard vers l'horizon. Cheveux balayés par le vent. Contre-jour golden hour, palette océan, sable, ciel chaud. Objectif 85mm. Ambiance nature française sauvage. ATTENTION : La broderie doit être EXTRÊMEMENT PLATE, SANS AUCUN RELIEF.\${COPYRIGHT_DISCLAIMER}`
  },
  BUSTE: {
    label: "Buste Horizon",
    prompt: `Generate an image of: Photographie lifestyle éditoriale d'un modèle ultra-réaliste portant un [PRODUIT] en [COULEUR SWEAT] ([MATERIAL]) avec le motif joint brodé en fil [COULEUR FIL] sur l'[EMPLACEMENT] ([DIMENSION] max). Cadrage en buste, en extérieur sauvage, regard légèrement de profil vers l'horizon. Cheveux en mouvement avec le vent. Contre-jour golden hour doux, palette océan gris-vert, sable, ciel chaud. Objectif 85mm. Ambiance nature française sauvage. ATTENTION : La broderie doit être EXTRÊMEMENT PLATE, SANS AUCUN RELIEF.\${COPYRIGHT_DISCLAIMER}`
  },
  RAPPROCHE: {
    label: "Rapproché Galets",
    prompt: `Generate an image of: Photographie lifestyle éditoriale d'un modèle ultra-réaliste portant un [PRODUIT] en [COULEUR SWEAT] ([MATERIAL]) avec le motif joint brodé en fil [COULEUR FIL] sur l'[EMPLACEMENT] ([DIMENSION] max). Plan rapproché sur le torse et la broderie, modèle assis sur un rocher ou des galets en bord de mer, mains tenant un galet poli ou une coquille. Lumière golden hour rasante, vent léger dans les cheveux. Palette océan, sable, gris-vert. Objectif 50mm macro. Ambiance nature sauvage. ATTENTION : La broderie doit être EXTRÊMEMENT PLATE, SANS AUCUN RELIEF.\${COPYRIGHT_DISCLAIMER}`
  },
  MOUVEMENT: {
    label: "Mouvement Sauvage",
    prompt: `Generate an image of: Photographie lifestyle éditoriale d'un modèle ultra-réaliste portant un [PRODUIT] en [COULEUR SWEAT] ([MATERIAL]) avec le motif joint brodé en fil [COULEUR FIL] sur l'[EMPLACEMENT] ([DIMENSION] max). Modèle marchant ou courant légèrement le long d'une falaise, d'une plage ou à travers un champ d'herbes hautes. Flou de mouvement très léger, cheveux et vêtement happés par le vent. Contre-jour golden hour avec léger flare. Palette océan, sable doré, ciel chaud. Objectif 50mm. ATTENTION : La broderie doit être EXTRÊMEMENT PLATE, SANS AUCUN RELIEF.\${COPYRIGHT_DISCLAIMER}`
  },
  MACRO_PORTEE: {
    label: "Macro Broderie Vent",
    prompt: `Generate an image of: Hyper-realistic editorial macro photograph showing the embroidered detail WORN by a real human model OUTDOORS. ⚠️ ULTRA-TIGHT MACRO FRAMING : embroidery fills 60-80% of frame, frame EXCLUDES the hood, the collar, the shoulders, the drawstrings and their ends. Tight close-up framing on the LEFT CHEST embroidery area of a [PRODUIT] in [COULEUR SWEAT] ([MATERIAL]). The attached motif is embroidered in [COULEUR FIL] thread on the [EMPLACEMENT] ([DIMENSION] max). The shot MUST include a fragment of the model — wind-swept strand of hair across the embroidery, partial jawline, or a hand. THIS IS NOT A FLAT LAY. Background : blurred wild meadow or sea horizon, golden hour low backlight with slight lens flare. Wild French nature mood. Objectif Canon 100mm macro, f/3.5. ATTENTION : La broderie doit être EXTRÊMEMENT PLATE, SANS AUCUN RELIEF.\${COPYRIGHT_DISCLAIMER}`
  }
};

export const FULL_PACK_SEPIA = {
  PLEIN_PIED: {
    label: "Plein Pied Sépia",
    prompt: `Generate an image of: Photographie lifestyle éditoriale d'un modèle ultra-réaliste, imparfait et naturel portant un [PRODUIT] en [COULEUR SWEAT] ([MATERIAL]) avec le motif joint brodé en fil [COULEUR FIL] sur l'[EMPLACEMENT] ([DIMENSION] max). Plein pied dans une cour pavée provençale ensoleillée à l'heure dorée, ou place de village avec mur en pierre claire chauffé par le soleil. Ombres longues et chaudes. Grain argentique 35mm prononcé, halation douce sur les hautes lumières, palette sépia chaude, ocre, terre. Objectif 50mm film. Ambiance Éric Rohmer × Sofia Coppola, cinéma français des années 70. ATTENTION : La broderie doit être EXTRÊMEMENT PLATE, SANS AUCUN RELIEF.\${COPYRIGHT_DISCLAIMER}`
  },
  PLAN_AMERICAIN: {
    label: "Plan Américain Terrasse",
    prompt: `Generate an image of: Photographie lifestyle éditoriale d'un modèle ultra-réaliste portant un [PRODUIT] en [COULEUR SWEAT] ([MATERIAL]) avec le motif joint brodé en fil [COULEUR FIL] sur l'[EMPLACEMENT] ([DIMENSION] max). Plan américain (mi-cuisse), modèle assis sur une chaise en métal de bistrot vintage devant un mur en pierre claire, terrasse de café provençale à l'heure dorée. Grain argentique 35mm, palette sépia, ocre, terre. Objectif 85mm film. Ambiance cinéma français nostalgique 70s. ATTENTION : La broderie doit être EXTRÊMEMENT PLATE, SANS AUCUN RELIEF.\${COPYRIGHT_DISCLAIMER}`
  },
  BUSTE: {
    label: "Buste Lumière Sépia",
    prompt: `Generate an image of: Photographie lifestyle éditoriale d'un modèle ultra-réaliste portant un [PRODUIT] en [COULEUR SWEAT] ([MATERIAL]) avec le motif joint brodé en fil [COULEUR FIL] sur l'[EMPLACEMENT] ([DIMENSION] max). Cadrage en buste, le modèle baigné d'une lumière dorée latérale rasante, ombres chaudes. Mur en pierre claire ou volet bleu pâle écaillé en arrière-plan flou. Grain argentique 35mm appuyé, palette sépia, ocre, terre, halation douce. Objectif 85mm film. ATTENTION : La broderie doit être EXTRÊMEMENT PLATE, SANS AUCUN RELIEF.\${COPYRIGHT_DISCLAIMER}`
  },
  RAPPROCHE: {
    label: "Rapproché Verre Vin",
    prompt: `Generate an image of: Photographie lifestyle éditoriale d'un modèle ultra-réaliste portant un [PRODUIT] en [COULEUR SWEAT] ([MATERIAL]) avec le motif joint brodé en fil [COULEUR FIL] sur l'[EMPLACEMENT] ([DIMENSION] max). Plan rapproché sur le torse et la broderie, le modèle tient un verre de vin rosé ou une tasse en céramique vintage sur une table de bistrot ensoleillée. Grain argentique 35mm prononcé, palette sépia, ocre, terre. Objectif 50mm macro film. Ambiance nostalgie 70s. ATTENTION : La broderie doit être EXTRÊMEMENT PLATE, SANS AUCUN RELIEF.\${COPYRIGHT_DISCLAIMER}`
  },
  MOUVEMENT: {
    label: "Mouvement Sépia",
    prompt: `Generate an image of: Photographie lifestyle éditoriale d'un modèle ultra-réaliste portant un [PRODUIT] en [COULEUR SWEAT] ([MATERIAL]) avec le motif joint brodé en fil [COULEUR FIL] sur l'[EMPLACEMENT] ([DIMENSION] max). Modèle marchant lentement dans une ruelle pavée provençale ensoleillée à l'heure dorée, ombres longues, léger flou de mouvement. Grain argentique 35mm prononcé, palette sépia chaude, ocre, terre. Objectif 50mm film. Ambiance Sofia Coppola, cinéma français nostalgique. ATTENTION : La broderie doit être EXTRÊMEMENT PLATE, SANS AUCUN RELIEF.\${COPYRIGHT_DISCLAIMER}`
  },
  MACRO_PORTEE: {
    label: "Macro Broderie Sépia",
    prompt: `Generate an image of: Hyper-realistic editorial macro photograph showing the embroidered detail WORN by a real human model in golden hour. ⚠️ ULTRA-TIGHT MACRO FRAMING : embroidery fills 60-80% of frame, frame EXCLUDES the hood, the collar, the shoulders, the drawstrings and their ends. Tight close-up framing on the LEFT CHEST embroidery area of a [PRODUIT] in [COULEUR SWEAT] ([MATERIAL]). The attached motif is embroidered in [COULEUR FIL] thread on the [EMPLACEMENT] ([DIMENSION] max). The shot MUST include a fragment of the model — partial face, hand, or hair. THIS IS NOT A FLAT LAY. Background : warm sun-drenched stone wall blurred, long warm shadows, pronounced 35mm film grain, slight halation. Sépia nostalgic 70s mood. Objectif Canon 100mm macro film. ATTENTION : La broderie doit être EXTRÊMEMENT PLATE, SANS AUCUN RELIEF.\${COPYRIGHT_DISCLAIMER}`
  }
};

// Precise anchor description for model diversity
export const MODEL_DESCRIPTION = `
MANNEQUIN — POSTURE DYNAMIQUE OBLIGATOIRE : Le modèle est photographié dans une posture ASYMÉTRIQUE, VIVANTE, JAMAIS frontale ni centrée. Poids du corps appuyé sur UNE jambe (contrapposto), hanche décalée, épaules légèrement tournées hors axe. UNE main toujours engagée dans un micro-geste naturel : glissée dans la poche, ramenant une mèche derrière l'oreille, sur la hanche, tenant un objet (tasse, livre, sac), grattant la nuque, ajustant la manche — JAMAIS les deux bras tombants raides le long du corps. La tête est inclinée légèrement OU tournée trois-quarts, jamais parfaitement de face. Capture mid-action : mi-rire, mi-pas, mi-pensée, mi-conversation. Référence Sézane × Émoï-Émoï × Maison Labiche : souple, vivante, candide, jamais figée comme une photo d'identité.
IDENTITÉ : Un modèle virtuel ultra-réaliste, humain et imparfait, au style "effortless French cool".
DIVERSITÉ : [DIVERSITY_DESCRIPTION].
APPARENCE : ATTENTION, LE MANNEQUIN NE DOIT PAS ÊTRE PARFAIT NI RESSEMBLER À UNE STAR. Peau très texturée avec grain visible, pores, cernes naturels, taches de rousseur. Cheveux imparfaits (légèrement en bataille ou naturels). Traits et lignes d'expression adaptés à l'âge demandé. Expression naturelle (sourire spontané OU sourire intérieur OU regard contemplatif selon le shot — JAMAIS sourire forcé/posé pour la caméra).
STYLE : Minimaliste, élégant, vrai. Pas de maquillage ou maquillage "no-makeup" très léger.
À ÉVITER ABSOLUMENT : pose frontale centrée façon photo d'identité, deux bras tombants symétriques, regard fixe au centre, expression figée, pose corporate LinkedIn, sourire commercial appuyé.
`;

export const FLAT_LAY_DESCRIPTION = "Présentation artistique à plat. Focus sur la matière [MATERIAL] et les ombres douces.";

export const FAMILY_DESCRIPTION = `
GROUPE (IDENTITÉ ET ÉMOTION) : Un groupe virtuel [COUPLE_TYPE] avec [CHILDREN_COUNT] enfant(s) mineur(s) (jeunes enfants ou bébés).
ETHNIE : Diversifiée et naturelle.
ATMOSPHÈRE : Photographie lifestyle premium, niveau vrai shooting photo professionnel. Très émotionnel, authentique, lien fort, complicité, ambiance émoi émoi et Sézane. 
VÊTEMENTS : Ils portent tous des vêtements Ypersoa coordonnés en [MATERIAL].
LES MODÈLES SONT VIRTUELS MAIS ULTRA-RÉALISTES ET IMPARFAITS : ATTENTION, ILS NE DOIVENT PAS ÊTRE TROP PARFAITS NI RESSEMBLER À DES STARS. Grain de peau très visible, pores, cheveux naturels (légèrement en bataille). L'âge de chaque membre doit être respecté (les jeunes parents ne doivent pas avoir de rides de vieillesse). Sourires éclatants et vrais, postures très naturelles, souples et détendues, pleines de vie. C'est une scène conceptuelle ultra-authentique.
`;
