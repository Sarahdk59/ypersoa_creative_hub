/**
 * Brand Rules Ypersoa - Source de vérité TypeScript
 *
 * Synchronisé avec CLAUDE.md v1.1 (27/04/2026)
 * Ne JAMAIS modifier ici sans mettre à jour CLAUDE.md en parallèle.
 */

// ============================================================================
// TERMES INTERDITS ABSOLUS (CLAUDE.md section 2)
// ============================================================================

export const BRAND_FORBIDDEN_TERMS = [
  // Lexique broderie interdit
  "artisanal",
  "artisanale",
  "artisanaux",
  "artisanales",
  "artisanat",
  "fait main",
  "fait à la main",
  "faite main",
  "faite à la main",
  "par le fil et l'aiguille",
  "fil et aiguille",
  "broderie artisanale",
  "broderies artisanales",

  // Canaux passés interdits
  "Etsy",
  "etsy",
  "marketplace",
  "marketplaces",

  // Origine interdite (risque DGCCRF — confection en Chine, broderie seule insuffisante)
  "made in France",
  "Made in France",
  "Made In France",
  "#madeinfrance",
  "#fabriqueenfrance",
  "#faitenfrance",
  "fabriqué en France",
  "fabriqué en france",
  "fait en France",
  "fait en france",
  "brodé en France",
  "brodé en france",

  // Artisanat — lié au lexique fait-main interdit
  "#artisanat",
  "#artisanatfrancais",

  // Jargon technique banni — marques machine/fil, réservées au pro (jamais
  // grand public, quel que soit le format : blog, vidéo, réseaux). Décision
  // 2026-08-24, cf. mémoire feedback_vocab_fabrication : l'axe est l'audience
  // (pro vs grand public), pas la longueur ou le type de contenu.
  "Tajima TMEZ",
  "TMEZ",
  "Tajima",
  "Gunold",
  "Madeira",
  "Isacord",
] as const;

// ============================================================================
// THERMOSTAT CITRON — 4 crans de voix (docs/VOIX_YPERSOA.md §2)
// ============================================================================
// 0 Coton (deuil/hommage, zéro clin d'œil) · 1 Crème (naissance/présence,
// tendre sans vanne) · 2 Zeste (défaut partout) · 3 Citron (communauté/
// coulisses, plein mordant). Règle d'or : un contenu ne mélange jamais deux
// crans dans le même souffle — surtout pas de Citron en contexte Coton/Crème.

export type VoiceLevel = 0 | 1 | 2 | 3;

export const VOICE_LEVEL_LABELS: Record<VoiceLevel, string> = {
  0: "Coton",
  1: "Crème",
  2: "Zeste",
  3: "Citron",
};

/**
 * Cran par défaut selon l'occasion (valeurs alignées sur
 * StudioMoodEpisode.occasion / OCCASIONS_PRESETS). Clé normalisée en
 * minuscules. Toute occasion non listée retombe sur Zeste (2), le défaut.
 */
export const OCCASION_VOICE_LEVELS: Record<string, VoiceLevel> = {
  "deuil": 0,
  "hommage": 0,
  "mémoire": 0,
  "naissance": 1,
  "mariage": 1,
  "fête des mères": 2,
  "fête des pères": 2,
  "fête des grands-mères": 2,
  "fête des grands-pères": 2,
  "noël": 2,
  "saint-valentin": 2,
  "anniversaire": 2,
  "rentrée": 2,
  "été / vacances": 2,
  "evergreen": 2,
};

export function voiceLevelForOccasion(
  occasion: string | null | undefined
): VoiceLevel {
  if (!occasion) return 2;
  return OCCASION_VOICE_LEVELS[occasion.trim().toLowerCase()] ?? 2;
}

// Marqueurs de connivence/mordant ("Citron") — jamais acceptables dans un
// texte calé en Coton (0) ou Crème (1). Liste non exhaustive, à enrichir à
// l'usage plutôt qu'à vouloir être parfaite dès le départ.
export const CITRON_MARKERS = [
  "on juge pas",
  "on ne juge pas",
  "on va pas se mentir",
  "avouons-le",
  "avoue",
  "true story",
  "on sait toustes",
  "on sait tous",
  "haha",
  "mdr",
  "lol",
] as const;

/**
 * Détecte du Citron dans un texte calé sur un cran bas (Coton/Crème).
 * Zeste et Citron (2-3) tolèrent naturellement le mordant, donc ne sont
 * jamais vérifiés ici.
 */
export function checkVoiceLevel(
  text: string,
  contentVoiceLevel: VoiceLevel
): BrandViolation[] {
  if (contentVoiceLevel >= 2) return [];
  const lowerText = text.toLowerCase();
  const violations: BrandViolation[] = [];
  for (const marker of CITRON_MARKERS) {
    let position = lowerText.indexOf(marker);
    while (position !== -1) {
      violations.push({ term: marker, position, severity: "warning" });
      position = lowerText.indexOf(marker, position + 1);
    }
  }
  return violations;
}

// ============================================================================
// VOUVOIEMENT - INTERDIT
// ============================================================================
// Toujours tutoyer dans les contenus clients

export const VOUVOIEMENT_PATTERNS = [
  /\bvous\b/gi,
  /\bvotre\b/gi,
  /\bvos\b/gi,
  /\boffrez\b/gi,
  /\bdécouvrez\b/gi,
  /\bchoisissez\b/gi,
  /\bcommandez\b/gi,
];

// ============================================================================
// FORMULATIONS DE REMPLACEMENT VALIDÉES
// ============================================================================

export const BRAND_PHRASES = {
  // Façon de mentionner la broderie en contexte client
  embroidery_default: [
    "brodé à la commande",
    "brodé à la demande",
    "brodé dans notre atelier de Wattrelos",
    "brodé chez nous, dans le Nord",
  ],

  // Tournures cadeau
  gift_phrases: [
    "Un cadeau qui dure",
    "Un cadeau chargé de sens",
    "Pour celle qui...",
    "Pour celui qui...",
  ],
} as const;

// ============================================================================
// CIBLES STYLE (références marques pour le ton, JAMAIS dans le copy client)
// ============================================================================

export const BRAND_REFERENCES = {
  hero_brands: ["Émoï-Émoï", "Make My Lemonade", "Gamin Gamine"],
  premium_parisien: ["Sézane", "A.P.C.", "Maison Labiche", "Soeur"],
  do_not_imitate: ["Sézane pure", "Aerie #AerieREAL", "Etsy"],
} as const;

// ============================================================================
// 4 PILIERS ÉDITORIAUX
// ============================================================================

export const EDITORIAL_PILLARS = {
  P1: "Process / Savoir-Faire",
  P2: "Émotion (lien, souvenir, présence)",
  P3: "Produit / Usage",
  P4: "Preuve (témoignages, communauté)",
} as const;

// ============================================================================
// TAGLINES VALIDÉES (variantes Le Club)
// ============================================================================

export const VALIDATED_TAGLINES = {
  mama_club: [
    "Le badge officiel des mamans du quotidien. Le tien, en un mot.",
    "Il y a les clubs officiels. Et il y a le tien.",
    "Maman, c'est pas une fonction. C'est un club.",
  ],
  sista_club: [
    "Pour celles qui ne sont pas sœurs de sang. Mais sœurs de cœur.",
    "Le club le plus exclusif du monde : le tien et celui de ta sista.",
  ],
  team_dog: [
    "Parce qu'un chien, c'est pas un animal. C'est une famille.",
    "La tribu dog-parents a un blason, maintenant. Le tien.",
  ],
  brigitte: [
    "Un cœur, une initiale. C'est tout, c'est assez.",
    "Le motif qui dit l'essentiel sans bavardage.",
  ],
  le_club: [
    "Ton club. Ton blason.",
    "Deux mots, un symbole, une couleur. C'est le tien.",
  ],
} as const;

// ============================================================================
// VALIDATION BRAND-SAFE
// ============================================================================

export interface BrandViolation {
  term: string;
  position: number;
  severity: "critical" | "warning";
}

/**
 * Vérifie qu'un texte généré respecte les règles brand absolues.
 * `contentVoiceLevel`, si fourni, active en plus le contrôle thermostat
 * (docs/VOIX_YPERSOA.md §2) : du Citron détecté en contexte Coton/Crème
 * remonte en violation "warning". Omis = pas de contrôle de cran (défaut,
 * compatible avec les appels existants).
 * Retourne la liste des violations détectées.
 */
export function checkBrandSafety(
  text: string,
  contentVoiceLevel?: VoiceLevel
): {
  safe: boolean;
  violations: BrandViolation[];
} {
  const violations: BrandViolation[] = [];
  const lowerText = text.toLowerCase();

  // Check forbidden terms
  for (const term of BRAND_FORBIDDEN_TERMS) {
    const lowerTerm = term.toLowerCase();
    let position = lowerText.indexOf(lowerTerm);
    while (position !== -1) {
      violations.push({
        term,
        position,
        severity: "critical",
      });
      position = lowerText.indexOf(lowerTerm, position + 1);
    }
  }

  // Check vouvoiement (warning only, certains usages tolérables en EN→FR)
  for (const pattern of VOUVOIEMENT_PATTERNS) {
    const matches = text.matchAll(pattern);
    for (const match of matches) {
      if (match.index !== undefined) {
        violations.push({
          term: match[0],
          position: match.index,
          severity: "warning",
        });
      }
    }
  }

  // Check thermostat citron (warning only — jugement éditorial, pas un interdit dur)
  if (contentVoiceLevel !== undefined) {
    violations.push(...checkVoiceLevel(text, contentVoiceLevel));
  }

  return {
    safe: violations.filter((v) => v.severity === "critical").length === 0,
    violations,
  };
}
