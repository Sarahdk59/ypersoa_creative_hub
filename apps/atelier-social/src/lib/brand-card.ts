/**
 * Carte visuelle "Brand Book" — Atelier Social.
 *
 * Porte en Canvas 2D le composant SocialCard de app/brand/page.tsx (§5 du
 * Brand Book v1.0 : chip rubrique, headline, CTA rouge coquelicot) et le
 * composant Slide (§6 : Hook → Développement → CTA, structure carrousel).
 *
 * Fond : dessiné via un SVG fourni par le moteur Fonds (BackgroundPicker +
 * drawSvgIntoCanvas de lib/fonds-engine.ts, même mécanisme que la carte avis
 * lib/avis-card.ts) — pattern recolorable, plus seulement les 3 aplats fixes
 * du Brand Book. Un flat-fill sert de repli tant que le picker n'a pas encore
 * remonté de SVG (1er rendu).
 *
 * Texte : découpé en tokens (mots) façon lib/avis-card.ts (buildQuoteTokens /
 * wrapTokens) — chaque mot peut être individuellement mis en couleur
 * (Set<number> highlighted), plus de "ligne 2 toujours en italique/accent"
 * figée.
 *
 * Police : un seul choix pour toute la carte (headline + chip/tag/CTA) —
 * "Arial Rounded MT Bold" (présent sur le poste de Sarah, repli Hanken
 * Grotesk chargée globalement) ou "cafeteria" (Typekit, déjà chargée dans
 * app/layout.tsx). Taille du bloc de texte principal réglable via fontScale.
 */

import { drawSvgIntoCanvas } from "@/lib/fonds-engine";

const MARINE = "#16324C";
const CREME = "#F4EEE2";
const ROUGE_COQUELICOT = "#C23A2D";

export type FontChoice = "arial" | "cafeteria";

const FONT_STACKS: Record<FontChoice, string> = {
  arial: `"Arial Rounded MT Bold", "Hanken Grotesk", ui-sans-serif, system-ui, sans-serif`,
  cafeteria: `"cafeteria", "Playfair Display", "Times New Roman", serif`,
};

const FONT_WEIGHTS: Record<FontChoice, string> = {
  arial: "500",
  cafeteria: "800",
};

async function ensureFontLoaded(fontChoice: FontChoice) {
  if (typeof document === "undefined" || !document.fonts) return;
  const stack = FONT_STACKS[fontChoice];
  const weight = FONT_WEIGHTS[fontChoice];
  try {
    await Promise.all([
      document.fonts.load(`${weight} 16px ${stack}`),
      document.fonts.load(`700 16px ${stack}`),
    ]);
  } catch {
    // Police indisponible (offline, Typekit down) — repli navigateur silencieux.
  }
}

export interface TextToken {
  text: string;
  idx: number;
}

/** Découpe un texte en tokens indexés (mots), pour surlignage individuel. */
export function buildTextTokens(text: string): TextToken[] {
  return text
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((t, idx) => ({ text: t, idx }));
}

function wrapTextTokens(ctx: CanvasRenderingContext2D, tokens: TextToken[], maxWidth: number): TextToken[][] {
  const spaceWidth = ctx.measureText(" ").width;
  const lines: TextToken[][] = [];
  let current: TextToken[] = [];
  let currentWidth = 0;
  for (const t of tokens) {
    const w = ctx.measureText(t.text).width;
    const addWidth = current.length === 0 ? w : currentWidth + spaceWidth + w;
    if (addWidth > maxWidth && current.length > 0) {
      lines.push(current);
      current = [t];
      currentWidth = w;
    } else {
      current.push(t);
      currentWidth = addWidth;
    }
  }
  if (current.length) lines.push(current);
  return lines;
}

/** Dessine un bloc de tokens (mots surlignés en `accent`, le reste en `ink`), déjà wrappé. */
function drawTokenLines(
  ctx: CanvasRenderingContext2D,
  lines: TextToken[][],
  highlighted: Set<number>,
  ink: string,
  accent: string,
  x: number,
  startY: number,
  lineHeight: number
) {
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  const spaceWidth = ctx.measureText(" ").width;
  lines.forEach((line, li) => {
    let cx = x;
    const y = startY + li * lineHeight;
    for (const tok of line) {
      ctx.fillStyle = highlighted.has(tok.idx) ? accent : ink;
      ctx.fillText(tok.text, cx, y);
      cx += ctx.measureText(tok.text).width + spaceWidth;
    }
  });
}

async function drawBackground(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  backgroundSvg: string | undefined,
  fallback: string
) {
  ctx.fillStyle = fallback;
  ctx.fillRect(0, 0, W, H);
  if (backgroundSvg) {
    await drawSvgIntoCanvas(ctx, backgroundSvg, 0, 0, W, H);
  }
}

function roundRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export interface BrandCardOptions {
  width: number;
  height: number;
  fontChoice: FontChoice;
  /** Multiplicateur de la taille du bloc de texte principal (1 = défaut). */
  fontScale?: number;
  /** SVG du moteur Fonds (BackgroundPicker) — repli sur un flat marine si absent. */
  backgroundSvg?: string;
  chipLabel: string;
  chipBg: string;
  chipInk: string;
  tokens: TextToken[];
  highlighted: Set<number>;
  ink: string;
  accent: string;
  cta: string;
}

/** Rend la carte Brand Book complète dans un <canvas> déjà présent dans le DOM. */
export async function renderBrandCard(canvas: HTMLCanvasElement, opts: BrandCardOptions): Promise<void> {
  const {
    width: W,
    height: H,
    fontChoice,
    fontScale = 1,
    backgroundSvg,
    chipLabel,
    chipBg,
    chipInk,
    tokens,
    highlighted,
    ink,
    accent,
    cta,
  } = opts;
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas context unavailable");

  await ensureFontLoaded(fontChoice);
  const FONT_STACK = FONT_STACKS[fontChoice];
  const W_BOLD = FONT_WEIGHTS[fontChoice];

  await drawBackground(ctx, W, H, backgroundSvg, MARINE);

  const pad = W * 0.06;

  // Chip rubrique, ancré en haut à gauche.
  const chipFontSize = W * 0.026;
  ctx.font = `600 ${chipFontSize}px ${FONT_STACK}`;
  const chipTextW = ctx.measureText(chipLabel).width;
  const chipPadX = W * 0.022;
  const chipH = chipFontSize * 2.3;
  const chipW = chipTextW + chipPadX * 2;
  const chipY = pad;
  roundRectPath(ctx, pad, chipY, chipW, chipH, chipH / 2);
  ctx.fillStyle = chipBg;
  ctx.fill();
  ctx.fillStyle = chipInk;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(chipLabel, pad + chipPadX, chipY + chipH / 2 + chipFontSize * 0.04);

  // CTA, ancré en bas à gauche — toujours rouge coquelicot (Brand Book §10).
  const ctaFontSize = W * 0.026;
  ctx.font = `700 ${ctaFontSize}px ${FONT_STACK}`;
  const ctaTextW = ctx.measureText(cta).width;
  const ctaPadX = W * 0.03;
  const ctaH = ctaFontSize * 2.6;
  const ctaW = ctaTextW + ctaPadX * 2;
  const ctaY = H - pad - ctaH;
  roundRectPath(ctx, pad, ctaY, ctaW, ctaH, ctaH / 2);
  ctx.fillStyle = ROUGE_COQUELICOT;
  ctx.fill();
  ctx.fillStyle = CREME;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(cta, pad + ctaPadX, ctaY + ctaH / 2 + ctaFontSize * 0.04);

  // Texte principal (tokens surlignables), centré verticalement entre chip et CTA.
  const fontSize = W * 0.078 * fontScale;
  const maxTextWidth = W - pad * 2;
  const lineHeight = fontSize * 1.18;

  ctx.font = `${W_BOLD} ${fontSize}px ${FONT_STACK}`;
  const lines = wrapTextTokens(ctx, tokens, maxTextWidth);
  const blockH = lines.length * lineHeight;
  const zoneTop = chipY + chipH;
  const zoneBottom = ctaY;
  const startY = zoneTop + (zoneBottom - zoneTop - blockH) / 2;

  drawTokenLines(ctx, lines, highlighted, ink, accent, pad, startY, lineHeight);
}

/**
 * Slide de carrousel — porte le composant Slide de app/brand/page.tsx (§6 :
 * Hook → Le choix → Le geste → CTA, format 4:5). Version "texte only" pour le
 * pilier connexion (pas de produit/photo) : 3 variantes — hook (texte
 * principal, façon carte unique), statement (paragraphe, slide de
 * développement), cta (texte + lien souligné).
 */
export type CarouselSlideVariant = "hook" | "statement" | "cta";

export interface CarouselSlideOptions {
  width: number;
  height: number;
  fontChoice: FontChoice;
  fontScale?: number;
  /** SVG du moteur Fonds, partagé entre les 3 slides du carrousel — cohérence visuelle. */
  backgroundSvg?: string;
  /** Flat-fill de repli tant que backgroundSvg n'a pas encore chargé. */
  bg: string;
  ink: string;
  accent: string;
  index: string;
  tag: string;
  variant: CarouselSlideVariant;
  tokens: TextToken[];
  highlighted: Set<number>;
  /** cta only */
  ctaText?: string;
}

export async function renderCarouselSlide(canvas: HTMLCanvasElement, opts: CarouselSlideOptions): Promise<void> {
  const {
    width: W,
    height: H,
    fontChoice,
    fontScale = 1,
    backgroundSvg,
    bg,
    ink,
    accent,
    index,
    tag,
    variant,
    tokens,
    highlighted,
    ctaText = "",
  } = opts;
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas context unavailable");

  await ensureFontLoaded(fontChoice);
  const FONT_STACK = FONT_STACKS[fontChoice];
  const W_BOLD = FONT_WEIGHTS[fontChoice];

  await drawBackground(ctx, W, H, backgroundSvg, bg);

  const pad = W * 0.08;

  // Badges — numéro (haut gauche) + tag (haut droite), même style que app/brand/page.tsx §6.
  const badgeFontSize = W * 0.017;
  ctx.textBaseline = "alphabetic";
  ctx.font = `700 ${badgeFontSize}px monospace`;
  ctx.textAlign = "left";
  ctx.globalAlpha = 0.55;
  ctx.fillStyle = ink;
  ctx.fillText(index, pad, pad + badgeFontSize);
  ctx.globalAlpha = 0.65;
  ctx.font = `700 ${badgeFontSize}px ${FONT_STACK}`;
  ctx.textAlign = "right";
  ctx.fillText(tag.toUpperCase(), W - pad, pad + badgeFontSize);
  ctx.globalAlpha = 1;

  const contentTop = pad + badgeFontSize * 2.4;
  const contentBottom = H - pad;
  const maxTextWidth = W - pad * 2;

  if (variant === "hook") {
    const fontSize = W * 0.075 * fontScale;
    const lineHeight = fontSize * 1.18;
    ctx.font = `${W_BOLD} ${fontSize}px ${FONT_STACK}`;
    const lines = wrapTextTokens(ctx, tokens, maxTextWidth);
    const blockH = lines.length * lineHeight;
    const startY = contentTop + (contentBottom - contentTop - blockH) / 2;
    drawTokenLines(ctx, lines, highlighted, ink, accent, pad, startY, lineHeight);
  } else if (variant === "statement") {
    const fontSize = W * 0.062 * fontScale;
    const lineHeight = fontSize * 1.22;
    ctx.font = `${W_BOLD} ${fontSize}px ${FONT_STACK}`;
    const lines = wrapTextTokens(ctx, tokens, maxTextWidth);
    const blockH = lines.length * lineHeight;
    const startY = contentTop + (contentBottom - contentTop - blockH) / 2;
    drawTokenLines(ctx, lines, highlighted, ink, accent, pad, startY, lineHeight);
  } else {
    const fontSize = W * 0.068 * fontScale;
    const lineHeight = fontSize * 1.18;
    ctx.font = `${W_BOLD} ${fontSize}px ${FONT_STACK}`;
    const lines = wrapTextTokens(ctx, tokens, maxTextWidth);
    const ctaFontSize = W * 0.032;
    const gap = fontSize * 0.55;
    const blockH = lines.length * lineHeight + gap + ctaFontSize * 1.3;
    const startY = contentTop + (contentBottom - contentTop - blockH) / 2;
    drawTokenLines(ctx, lines, highlighted, ink, accent, pad, startY, lineHeight);

    const ctaY = startY + lines.length * lineHeight + gap;
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.font = `700 ${ctaFontSize}px ${FONT_STACK}`;
    ctx.fillStyle = ink;
    const ctaW = ctx.measureText(ctaText).width;
    ctx.fillText(ctaText, pad, ctaY);
    const underlineY = ctaY + ctaFontSize * 1.08;
    ctx.strokeStyle = ink;
    ctx.lineWidth = Math.max(2, ctaFontSize * 0.06);
    ctx.beginPath();
    ctx.moveTo(pad, underlineY);
    ctx.lineTo(pad + ctaW, underlineY);
    ctx.stroke();
  }
}

export function canvasToPngDownload(canvas: HTMLCanvasElement, filename: string) {
  canvas.toBlob((blob) => {
    if (!blob) return;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }, "image/png");
}
