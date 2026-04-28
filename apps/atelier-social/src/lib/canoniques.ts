/**
 * Référentiel canoniques Ypersoa
 *
 * 23 mannequins canoniques avec leurs métadonnées.
 * Synchronisé avec CLAUDE.md v1.1 section 4.
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
  // PRINCIPAUX (P01-P12)
  // =============================================================================
  // CLÉMENCE MAN-P01 — Bloc TypeScript ALIGNÉ sur le format existant
  // =============================================================================
  // REMPLACE le bloc Camille MAN-P01 ci-dessous :
  //
  //   {
  //     id: "MAN-P01",
  //     prenom: "Camille",
  //     age: 40,
  //     genre: "femme",
  //     type: "principal",
  //     description: "Blanche française, châtain miel ondulé, freckles, mère vintage Caroline de Maigret",
  //     signature: "chestnut-honey mid-length wavy hair parted in the middle, freckles across her nose and cheekbones, lived-in skin with a glow, warm hazel eyes, half-smile",
  //     filename: "MAN-P01_Camille_canonique.jpg",
  //     favorite: true,
  //   },
  //
  // =============================================================================

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

  // SECONDAIRES (S13-S21)
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

export function getNonFavorites(): Canonique[] {
  return CANONIQUES.filter((c) => !c.favorite);
}

export function getCanoniquesSorted(): Canonique[] {
  return [...getFavorites(), ...getNonFavorites()];
}

/**
 * Filtres
 */

export type AgeRange = "all" | "enfant" | "jeune" | "adulte" | "senior";

export interface CanoniqueFilters {
  search: string; // recherche par prénom ou ID
  genre: Genre | "all";
  ageRange: AgeRange;
  type: "all" | "principal" | "secondaire";
}

export const DEFAULT_FILTERS: CanoniqueFilters = {
  search: "",
  genre: "all",
  ageRange: "all",
  type: "all",
};

export function matchesAgeRange(age: number, range: AgeRange): boolean {
  switch (range) {
    case "all":
      return true;
    case "enfant":
      return age < 18;
    case "jeune":
      return age >= 18 && age < 40;
    case "adulte":
      return age >= 40 && age < 60;
    case "senior":
      return age >= 60;
  }
}

export function applyFilters(canoniques: Canonique[], filters: CanoniqueFilters): Canonique[] {
  return canoniques.filter((c) => {
    // Recherche texte (prénom + ID)
    if (filters.search) {
      const q = filters.search.toLowerCase();
      const matchesText =
        c.prenom.toLowerCase().includes(q) ||
        c.id.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q);
      if (!matchesText) return false;
    }

    // Genre
    if (filters.genre !== "all" && c.genre !== filters.genre) return false;

    // Tranche âge
    if (!matchesAgeRange(c.age, filters.ageRange)) return false;

    // Type
    if (filters.type !== "all" && c.type !== filters.type) return false;

    return true;
  });
}
