/**
 * Brand tokens Ypersoa — exact match avec atelier-social.
 * Toute évolution = aligner les 2 apps en même temps.
 */
export const BRAND = {
  cream: "#FAF7F2",
  ink: "#1A1614",
  terracotta: "#B4665F",
  marine: "#1A2E4F",
  sage: "#A8B5A0",
  border: "rgba(26, 22, 20, 0.12)",
} as const;

export const FONTS = {
  serif: '"Playfair Display", "Cormorant Garamond", serif',
  sans: '"Inter", "DM Sans", sans-serif',
} as const;

/** Couleur par plateforme — utilisée par les vignettes calendrier. */
export const PLATFORM_COLOR: Record<string, string> = {
  instagram_post: BRAND.terracotta,
  instagram_reel: BRAND.marine,
  instagram_story: BRAND.sage,
  pinterest_pin: BRAND.ink,
};

/** Label FR par plateforme. */
export const PLATFORM_LABEL: Record<string, string> = {
  instagram_post: "Insta post",
  instagram_reel: "Insta reel",
  instagram_story: "Insta story",
  pinterest_pin: "Pinterest pin",
};

/**
 * Couleur par occasion — sert de fond pour les vignettes du calendrier.
 * Si l'entrée n'a pas d'occasion, fallback sur PLATFORM_COLOR.
 * Palette resserrée pour rester cohérente avec la marque (pas de fluo).
 */
export const OCCASION_COLOR: Record<string, string> = {
  saint_valentin: "#C4496A",      // rose-rouge tendresse
  fete_des_meres: "#D4998C",      // terracotta doux
  fete_des_peres: BRAND.marine,   // marine paternité
  rentree: "#A87C45",             // ocre rentrée
  mariage: "#D4B4B0",             // blush poudré
  naissance: BRAND.sage,          // sage tendre
  noel: "#7A2828",                // bordeaux profond
};

/** Label FR par occasion (pour légende). */
export const OCCASION_LABEL: Record<string, string> = {
  saint_valentin: "Saint-Valentin",
  fete_des_meres: "Fête des Mères",
  fete_des_peres: "Fête des Pères",
  rentree: "Rentrée",
  mariage: "Mariage",
  naissance: "Naissance",
  noel: "Noël",
};
