/** Tokens Cartouche — miroir des tokens Hub, sans couleur locale dans les variantes. */
export const cartoucheTokens = {
  color: {
    marine: "#1C3A36",
    teal: "#2E7D74",
    creme: "#F7F2E8",
    coquelicot: "#C23A2D",
    blush: "#EAB4C4",
    ocre: "#C8963C",
  },
  frame: { inset: 40, stroke: 4, radius: 16 },
  monogram: { size: 72 },
} as const;

export type CartoucheVariant = "editorial" | "avis" | "selection";
export type CartoucheFormat = "r4_5" | "r1_1" | "r9_16";

export const CARTOUCHE_DIMENSIONS: Record<CartoucheFormat, { width: number; height: number }> = {
  r4_5: { width: 1080, height: 1350 },
  r1_1: { width: 1080, height: 1080 },
  r9_16: { width: 1080, height: 1920 },
};
