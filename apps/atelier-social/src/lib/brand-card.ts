/**
 * Carte visuelle "Brand Book" — Atelier Social.
 *
 * Porte en Canvas 2D le composant SocialCard de app/brand/page.tsx (§5 du
 * Brand Book v1.0 : fond marine fixe, chip rubrique, headline 2 lignes
 * (2e ligne italique en couleur d'accent), CTA rouge coquelicot).
 * Contrairement à la carte avis (lib/avis-card.ts), le fond n'est PAS
 * recolorable — le Brand Book fixe le marine comme fond de l'épine dorsale
 * pour ce format ("Fond marine fixe · chip varie selon la rubrique · CTA
 * toujours en rouge coquelicot").
 *
 * Police : un seul choix pour toute la carte (headline + chip/tag/CTA) —
 * "Arial Rounded MT Bold" (présent sur le poste de Sarah, plus rond/amical,
 * repli Hanken Grotesk chargée globalement) ou "cafeteria" (Typekit, déjà
 * chargée dans app/layout.tsx, même police que les overlays Insta de
 * lib/overlay-templates.ts). Newsreader n'est plus utilisé ici (cf. décision
 * Sarah 10/08/2026 : "toute la carte" doit suivre un seul style typo).
 */

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
      document.fonts.load(`italic ${weight} 16px ${stack}`),
      document.fonts.load(`700 16px ${stack}`),
    ]);
  } catch {
    // Police indisponible (offline, Typekit down) — repli navigateur silencieux.
  }
}

export interface BrandCardOptions {
  width: number;
  height: number;
  fontChoice: FontChoice;
  chipLabel: string;
  chipBg: string;
  chipInk: string;
  headline: string;
  headlineAccent: string;
  accentColor: string;
  cta: string;
}

function wrapLine(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let current = "";
  for (const w of words) {
    const test = current ? `${current} ${w}` : w;
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current);
      current = w;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines;
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

/** Rend la carte Brand Book complète dans un <canvas> déjà présent dans le DOM. */
export async function renderBrandCard(canvas: HTMLCanvasElement, opts: BrandCardOptions): Promise<void> {
  const { width: W, height: H, fontChoice, chipLabel, chipBg, chipInk, headline, headlineAccent, accentColor, cta } =
    opts;
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas context unavailable");

  await ensureFontLoaded(fontChoice);
  const FONT_STACK = FONT_STACKS[fontChoice];
  const W_BOLD = FONT_WEIGHTS[fontChoice];

  // 1. Fond marine fixe (pas de recoloration — cf. doc en tête de fichier).
  ctx.fillStyle = MARINE;
  ctx.fillRect(0, 0, W, H);

  const pad = W * 0.06;

  // 2. Chip rubrique, ancré en haut à gauche.
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

  // 3. CTA, ancré en bas à gauche.
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

  // 4. Headline (2 lignes, 2e en italique/accent), centrée verticalement entre chip et CTA.
  const headlineFontSize = W * 0.078;
  const maxTextWidth = W - pad * 2;
  const lineHeight = headlineFontSize * 1.18;

  ctx.font = `${W_BOLD} ${headlineFontSize}px ${FONT_STACK}`;
  const line1Wrapped = wrapLine(ctx, headline, maxTextWidth);
  ctx.font = `italic ${W_BOLD} ${headlineFontSize}px ${FONT_STACK}`;
  const line2Wrapped = wrapLine(ctx, headlineAccent, maxTextWidth);

  const totalLines = line1Wrapped.length + line2Wrapped.length;
  const blockH = totalLines * lineHeight;
  const zoneTop = chipY + chipH;
  const zoneBottom = ctaY;
  const startY = zoneTop + (zoneBottom - zoneTop - blockH) / 2;

  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  let cursorY = startY;
  ctx.font = `${W_BOLD} ${headlineFontSize}px ${FONT_STACK}`;
  ctx.fillStyle = CREME;
  for (const line of line1Wrapped) {
    ctx.fillText(line, pad, cursorY);
    cursorY += lineHeight;
  }
  ctx.font = `italic ${W_BOLD} ${headlineFontSize}px ${FONT_STACK}`;
  ctx.fillStyle = accentColor;
  for (const line of line2Wrapped) {
    ctx.fillText(line, pad, cursorY);
    cursorY += lineHeight;
  }
}

/**
 * Slide de carrousel — porte le composant Slide de app/brand/page.tsx (§6 :
 * Hook → Le choix → Le geste → CTA, format 4:5, fond de l'épine dorsale).
 * Version "texte only" pour le pilier connexion (pas de produit/photo à
 * injecter ici) : 3 variantes — hook (2 lignes façon carte unique), statement
 * (1 bloc de texte, slide de développement), cta (headline + lien souligné).
 */
export type CarouselSlideVariant = "hook" | "statement" | "cta";

export interface CarouselSlideOptions {
  width: number;
  height: number;
  fontChoice: FontChoice;
  bg: string;
  ink: string;
  index: string;
  tag: string;
  variant: CarouselSlideVariant;
  /** hook | cta */
  headline?: string;
  /** hook (2e ligne, italique, en accentColor) */
  headlineAccent?: string;
  accentColor?: string;
  /** statement */
  statement?: string;
  /** cta (texte du lien souligné) */
  ctaText?: string;
}

export async function renderCarouselSlide(canvas: HTMLCanvasElement, opts: CarouselSlideOptions): Promise<void> {
  const { width: W, height: H, fontChoice, bg, ink, index, tag, variant } = opts;
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas context unavailable");

  await ensureFontLoaded(fontChoice);
  const FONT_STACK = FONT_STACKS[fontChoice];
  const W_BOLD = FONT_WEIGHTS[fontChoice];

  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

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

  // Contenu, centré verticalement, aligné à gauche.
  const contentTop = pad + badgeFontSize * 2.4;
  const contentBottom = H - pad;
  const maxTextWidth = W - pad * 2;
  ctx.textAlign = "left";

  if (variant === "hook") {
    const { headline = "", headlineAccent = "", accentColor = ink } = opts;
    const fontSize = W * 0.075;
    const lineHeight = fontSize * 1.18;
    ctx.font = `${W_BOLD} ${fontSize}px ${FONT_STACK}`;
    const l1 = wrapLine(ctx, headline, maxTextWidth);
    ctx.font = `italic ${W_BOLD} ${fontSize}px ${FONT_STACK}`;
    const l2 = wrapLine(ctx, headlineAccent, maxTextWidth);
    const blockH = (l1.length + l2.length) * lineHeight;
    let y = contentTop + (contentBottom - contentTop - blockH) / 2;
    ctx.textBaseline = "top";
    ctx.font = `${W_BOLD} ${fontSize}px ${FONT_STACK}`;
    ctx.fillStyle = ink;
    for (const line of l1) {
      ctx.fillText(line, pad, y);
      y += lineHeight;
    }
    ctx.font = `italic ${W_BOLD} ${fontSize}px ${FONT_STACK}`;
    ctx.fillStyle = accentColor;
    for (const line of l2) {
      ctx.fillText(line, pad, y);
      y += lineHeight;
    }
  } else if (variant === "statement") {
    const { statement = "" } = opts;
    const fontSize = W * 0.062;
    const lineHeight = fontSize * 1.22;
    ctx.font = `${W_BOLD} ${fontSize}px ${FONT_STACK}`;
    const lines = wrapLine(ctx, statement, maxTextWidth);
    const blockH = lines.length * lineHeight;
    let y = contentTop + (contentBottom - contentTop - blockH) / 2;
    ctx.textBaseline = "top";
    ctx.fillStyle = ink;
    for (const line of lines) {
      ctx.fillText(line, pad, y);
      y += lineHeight;
    }
  } else {
    const { headline = "", ctaText = "" } = opts;
    const fontSize = W * 0.068;
    const lineHeight = fontSize * 1.18;
    ctx.font = `${W_BOLD} ${fontSize}px ${FONT_STACK}`;
    const lines = wrapLine(ctx, headline, maxTextWidth);
    const ctaFontSize = W * 0.032;
    const gap = fontSize * 0.55;
    const blockH = lines.length * lineHeight + gap + ctaFontSize * 1.3;
    let y = contentTop + (contentBottom - contentTop - blockH) / 2;
    ctx.textBaseline = "top";
    ctx.fillStyle = ink;
    for (const line of lines) {
      ctx.fillText(line, pad, y);
      y += lineHeight;
    }
    y += gap;
    ctx.font = `700 ${ctaFontSize}px ${FONT_STACK}`;
    const ctaW = ctx.measureText(ctaText).width;
    ctx.fillText(ctaText, pad, y);
    const underlineY = y + ctaFontSize * 1.08;
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
