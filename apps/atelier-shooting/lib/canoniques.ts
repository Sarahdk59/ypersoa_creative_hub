/**
 * Référentiel canoniques Ypersoa — copy from apps/atelier-social/src/lib/canoniques.ts
 *
 * 23 mannequins canoniques avec leurs métadonnées + signatures EN courtes (30-80 mots)
 * destinées au character reference Gemini (parts[]).
 *
 * Synchronisé avec :
 * - assets/canoniques/MAN-Pxx_Prenom_canonique.jpg (servis via /canoniques/* via symlink public/)
 * - referentiels/shooting/mannequins_lot1_5fiches.json (fiches détaillées Lot 1)
 * - referentiels/shooting/mannequins_lot2_2fiches.json v1.2 (Anna + Lila D2)
 * - referentiels/shooting/mannequins_recurrents.json (index 21 mannequins / 23 individus)
 *
 * Pour V1 : copie locale, pas de package partagé. À factoriser en `packages/casting/`
 * quand un 3ème app aura besoin du référentiel.
 */

export type Genre = "femme" | "homme" | "enfant";

export interface Canonique {
  id: string;
  prenom: string;
  age: number;
  genre: Genre;
  type: "principal" | "secondaire";
  description: string;
  signature: string;
  filename: string;
  favorite?: boolean;
  duo?: string;
}

export const CANONIQUES: Canonique[] = [
  {
    id: "MAN-P01",
    prenom: "Clémence",
    age: 38,
    genre: "femme",
    type: "principal",
    description: "Blanche française, antiquaire à Honfleur divorcée mère épanouie, brune chocolat longs fluides + frange rideau Bardot, lèvres bordeaux MAC Diva, taches de rousseur denses, indépendante",
    signature: "long flowing dark chocolate brown hair to mid-chest with curtain bangs / fringe Bardot parted in the middle at eyebrow level, dense freckles scattered across her nose and high cheekbones, vert-gris eyes (soft greenish-grey harbor water color), full natural lips painted in deep bordeaux red lipstick (MAC Diva matte reference), light defined eyebrows soft mascara no heavy foundation, lived skin with real pores and soft expression lines, closed-mouth composed expression with quiet self-possession, slight asymmetry at corner of mouth suggesting dry humor, naturally wavy hair brushed and lustrous never messy, antiquaire bohemian-Parisian style transplanted to coastal Normandy",
    filename: "MAN-P01_Clemence_canonique.jpg",
    favorite: true,
  },
  {
    id: "MAN-P02",
    prenom: "Anna",
    age: 35,
    genre: "femme",
    type: "principal",
    description: "Blanche sud, brune wavy, peau olive, provençale Sessùn",
    signature: "long wavy dark brown hair, olive skin tone, soft warm brown eyes, gentle smile, Mediterranean features",
    filename: "MAN-P02_Anna_canonique.jpg",
  },
  {
    id: "MAN-P03",
    prenom: "Aïcha",
    age: 40,
    genre: "femme",
    type: "principal",
    description: "Afro-caribéenne, afro court, sourire large, élégance parisienne-caribéenne",
    signature: "short sculpted natural afro hair, deep luminous dark brown skin, high cheekbones, warm wide smile, elegant tall posture",
    filename: "MAN-P03_Aicha_canonique.jpg",
    favorite: true,
  },
  {
    id: "MAN-P04",
    prenom: "Lila",
    age: 45,
    genre: "femme",
    type: "principal",
    description: "Maghrébine, cheveux noirs libres, parisienne sophistiquée Leïla Bekhti",
    signature: "long loose black wavy hair, warm olive-tan skin, dark almond eyes with subtle expression lines, Parisian-Maghrebi elegance",
    filename: "MAN-P04_Lila_canonique.jpg",
  },
  {
    id: "MAN-P05",
    prenom: "Béatrice",
    age: 55,
    genre: "femme",
    type: "principal",
    description: "Métisse, cheveux argentés, bourgeoise campagne normande",
    signature: "silver-grey shoulder-length hair, mixed-heritage skin tone, soft warm brown eyes, refined country bourgeoisie elegance",
    filename: "MAN-P05_Beatrice_canonique.jpg",
  },
  {
    id: "MAN-P06",
    prenom: "Mathieu",
    age: 40,
    genre: "homme",
    type: "principal",
    description: "Blanc, barbe 3j, bruns dépeignés, papa sportwear chic",
    signature: "medium-short dark brown hair slightly tousled, trimmed 3-day dark brown beard, warm brown eyes, lived-in masculine skin",
    filename: "MAN-P06_Mathieu_canonique.jpg",
    favorite: true,
  },
  {
    id: "MAN-P07",
    prenom: "Nicolas",
    age: 45,
    genre: "homme",
    type: "principal",
    description: "Blanc, poivre-sel, mari attentionné classique Octobre",
    signature: "salt-and-pepper short hair, well-groomed, warm grey-blue eyes, attentive caring expression",
    filename: "MAN-P07_Nicolas_canonique.jpg",
  },
  {
    id: "MAN-P08",
    prenom: "Félicie",
    age: 7,
    genre: "enfant",
    type: "principal",
    description: "Blanche, blond vénitien, freckles denses, mini-vintage Bonpoint",
    signature: "strawberry-blonde shoulder-length hair, dense freckles across cheeks, blue-green eyes, bright child smile, Bonpoint vintage charm",
    filename: "MAN-P08_Felicie_canonique.jpg",
  },
  {
    id: "MAN-P09",
    prenom: "Gabin",
    age: 5,
    genre: "enfant",
    type: "principal",
    description: "Blanc, cheveux noirs longs, mini-sportwear chic",
    signature: "long dark hair to the chin, dark eyes, gentle little-boy smile, casual sportwear style",
    filename: "MAN-P09_Gabin_canonique.jpg",
  },
  {
    id: "MAN-P10",
    prenom: "Marie-Hélène",
    age: 65,
    genre: "femme",
    type: "principal",
    description: "Blanche, rousse cuivrée + mèches argentées, Inès de la Fressange campagne",
    signature: "coppery-red shoulder-length hair with natural silver streaks at the temples, dense freckles, soft natural expression lines, serene warm half-smile",
    filename: "MAN-P10_MarieHelene_canonique.jpg",
    favorite: true,
  },
  {
    id: "MAN-P11-LEA",
    prenom: "Léa",
    age: 37,
    genre: "femme",
    type: "principal",
    description: "Métisse boucles brunes, denim Canadian tuxedo (couple)",
    signature: "natural brown curls, mixed-heritage warm skin tone, hazel eyes, relaxed casual elegance",
    filename: "MAN-P11_Lea_canonique.jpg",
    duo: "DUO_LEA_SARAH",
  },
  {
    id: "MAN-P11-SARAH",
    prenom: "Sarah",
    age: 35,
    genre: "femme",
    type: "principal",
    description: "Nordique pixel cut cendré, minimalisme nordique (couple, v2 chaleureuse)",
    signature: "ash-blonde pixel cut, Nordic features with healthy pink undertones, warm pale eyes, subtle freckles, gentle warm presence",
    filename: "MAN-P11_Sarah_canonique.jpg",
    duo: "DUO_LEA_SARAH",
  },
  {
    id: "MAN-P12",
    prenom: "Brune",
    age: 22,
    genre: "femme",
    type: "principal",
    description: "Blanche, brune wavy, lèvres pulpeuses, beauty mark, ADN Damas (v3)",
    signature: "long wavy dark brown hair with visible texture, full pulpy naturally-shaped lips, thick natural untweezed eyebrows, beauty mark, ZERO makeup, subtle playful half-smile",
    filename: "MAN-P12_Brune_canonique.jpg",
    favorite: true,
  },
  {
    id: "MAN-S13",
    prenom: "Priya",
    age: 16,
    genre: "enfant",
    type: "secondaire",
    description: "Sud-asiatique, cheveux lisses, ado sportwear",
    signature: "long straight black hair, warm South Asian skin tone, dark almond eyes, gentle teenage expression",
    filename: "MAN-S13_Priya_canonique.jpg",
  },
  {
    id: "MAN-S14",
    prenom: "Gaspard",
    age: 23,
    genre: "homme",
    type: "secondaire",
    description: "Blanc, cheveux bataille, skateur élégant archi",
    signature: "tousled medium-length brown hair, lean Parisian features, casual architecture-student elegance",
    filename: "MAN-S14_Gaspard_canonique.jpg",
  },
  {
    id: "MAN-S15",
    prenom: "Bébé Noé",
    age: 1,
    genre: "enfant",
    type: "secondaire",
    description: "Blanc, body brodé Ypersoa",
    signature: "soft baby features, little tufts of light brown hair, gentle baby smile",
    filename: "MAN-S15_Noe_canonique.jpg",
  },
  {
    id: "MAN-S16",
    prenom: "Hiroshi",
    age: 55,
    genre: "homme",
    type: "secondaire",
    description: "Japonais, argenté, architecte minimaliste Yohji",
    signature: "silver-grey medium-length hair, refined Japanese features, minimalist Yohji-architect aesthetic, contemplative gaze",
    filename: "MAN-S16_Hiroshi_canonique.jpg",
  },
  {
    id: "MAN-S17",
    prenom: "Césaria",
    age: 40,
    genre: "femme",
    type: "secondaire",
    description: "Afro-caribéenne, vitiligo discret, expression chaleureuse (v2)",
    signature: "natural Afro-Caribbean features with subtle vitiligo patches harmoniously distributed (NEVER centered, NEVER the subject), warm chaleureuse smile, dignified presence",
    filename: "MAN-S17_Cesaria_canonique.jpg",
  },
  {
    id: "MAN-S18",
    prenom: "Hassan",
    age: 68,
    genre: "homme",
    type: "secondaire",
    description: "Maghrébin, cheveux blancs, patriarche algérois Paris",
    signature: "white hair, weathered olive-tan skin, kind warm dark eyes, dignified Algerian-Parisian patriarch presence",
    filename: "MAN-S18_Hassan_canonique.jpg",
  },
  {
    id: "MAN-S19-HENRI",
    prenom: "Henri",
    age: 72,
    genre: "homme",
    type: "secondaire",
    description: "Blanc nordique, bourgeoisie rive gauche (visuel 80-85)",
    signature: "white hair refined Left-Bank Parisian elegance, warm pale eyes, soft natural expression lines, dignified senior presence",
    filename: "MAN-S19_Henri_canonique.jpg",
    duo: "DUO_HENRI_JOSEPHINE",
  },
  {
    id: "MAN-S19-JOSEPHINE",
    prenom: "Joséphine",
    age: 70,
    genre: "femme",
    type: "secondaire",
    description: "Afro-caribéenne, boucles argentées, bourgeoisie rive gauche",
    signature: "silver natural curls, deep Afro-Caribbean skin tone, warm dark eyes, refined Left-Bank elegance, dignified senior smile",
    filename: "MAN-S19_Josephine_canonique.jpg",
    duo: "DUO_HENRI_JOSEPHINE",
  },
  {
    id: "MAN-S20",
    prenom: "Coline",
    age: 35,
    genre: "femme",
    type: "secondaire",
    description: "Blanche, blonde cendrée bouclée, minimaliste urbaine Emoi Emoi",
    signature: "ash-blonde shoulder-length hair in a structured natural bob with visible soft movement, blue-grey eyes with a warm subtle glint, healthy pink undertones, serene confident presence",
    filename: "MAN-S20_Coline_canonique.jpg",
  },
  {
    id: "MAN-S21",
    prenom: "Hugo",
    age: 30,
    genre: "homme",
    type: "secondaire",
    description: "Blanc, sandy-brown, jeune papa urbain",
    signature: "sandy-brown short hair, warm hazel eyes, casual young-dad urban style",
    filename: "MAN-S21_Hugo_canonique.jpg",
  },
];

/**
 * Helpers
 */

export function getCanoniqueById(id: string): Canonique | undefined {
  return CANONIQUES.find((c) => c.id === id);
}

export function getFavorites(): Canonique[] {
  return CANONIQUES.filter((c) => c.favorite);
}

export function getCanoniquesSorted(): Canonique[] {
  return [...CANONIQUES].sort((a, b) => {
    // Favoris d'abord
    if (a.favorite && !b.favorite) return -1;
    if (!a.favorite && b.favorite) return 1;
    // Puis tri par id
    return a.id.localeCompare(b.id);
  });
}

/**
 * Charge un canonique JPG depuis /canoniques/{filename} (servi via symlink public/),
 * convertit en base64 et retourne { mimeType, data } prêt à injecter dans Gemini parts[].
 */
export async function fetchCanoniqueAsBase64(filename: string): Promise<{ mimeType: string; data: string }> {
  const url = `/canoniques/${filename}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Canonique introuvable : ${url} (${response.status})`);
  }
  const blob = await response.blob();
  const mimeType = blob.type || "image/jpeg";
  const reader = new FileReader();
  return new Promise((resolve, reject) => {
    reader.onloadend = () => {
      const result = reader.result as string;
      // Format dataURL : "data:image/jpeg;base64,<data>"
      const data = result.split(",")[1] || result;
      resolve({ mimeType, data });
    };
    reader.onerror = () => reject(new Error(`Erreur lecture canonique ${filename}`));
    reader.readAsDataURL(blob);
  });
}
