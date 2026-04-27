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

  // Jargon technique banni
  "Tajima TMEZ",
  "TMEZ",
] as const;

// ============================================================================
// CONTEXTES POUR "BRODÉ SUR MÉTIER TAJIMA"
// ============================================================================
// Autorisé UNIQUEMENT en contexte ultra-niche (article blog atelier, vidéo process)
// Pour PDP / RS / captions : "brodé à la commande" ou "brodé à la demande"

export const TAJIMA_ALLOWED_CONTEXTS = [
  "blog_atelier",
  "video_process",
  "fiche_backend_hub",
] as const;

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
 * Retourne la liste des violations détectées.
 */
export function checkBrandSafety(text: string): {
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

  return {
    safe: violations.filter((v) => v.severity === "critical").length === 0,
    violations,
  };
}
