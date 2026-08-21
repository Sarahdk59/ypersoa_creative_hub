/**
 * Carte visuelle "Avis" — Atelier Social.
 *
 * Compose en Canvas 2D (même pattern que lib/overlay-templates.ts :
 * document.fonts.load() puis fillText, pour un rendu fiable indépendant du
 * navigateur) une carte avis client : fond recolorable (moteur Fonds) + cadre
 * double-liseré + étoiles + citation multi-lignes avec mots surlignables au
 * clic + prénom + logo Ypersoa (tracé vectoriel, recolorable comme le cadre).
 *
 * Le texte utilise "Arial Rounded MT Bold" si présent sur le poste (Mac de
 * Sarah), avec repli sur Nunito (chargée via un <link> Google Fonts dans
 * layout.tsx, même pattern que le Typekit Cafeteria de overlay-templates.ts)
 * — même mapping typo que validé pour "Arial Rounded" ailleurs dans le Hub.
 */

import { drawSvgIntoCanvas } from "@/lib/fonds-engine";

export type AvisCardFontChoice = "arial" | "cafeteria";

export const AVIS_CARD_FONT_STACKS: Record<AvisCardFontChoice, string> = {
  arial: `"Arial Rounded MT Bold", "Nunito", ui-rounded, sans-serif`,
  cafeteria: `"cafeteria", "Playfair Display", Georgia, serif`,
};

/** Les 5 tracés du logo Ypersoa (viewBox natif 1080×1440), une seule couleur. */
const LOGO_PATHS = [
  "M540.33,275.81c-133.83,0-242.32,108.49-242.32,242.32,0,74.3,33.47,140.74,86.11,185.19l156.2,156.2,156.2-156.2c52.65-44.45,86.11-110.9,86.11-185.19,0-133.83-108.49-242.32-242.32-242.32ZM674.84,668.79l.04.04-134.55,134.55-134.55-134.55.04-.04c-41.41-37-67.52-90.76-67.52-150.66,0-111.58,90.45-202.03,202.03-202.03s202.03,90.45,202.03,202.03c0,59.9-26.11,113.66-67.52,150.66Z",
  "M298.01,518.13c0,74.3,33.47,140.74,86.11,185.19l156.2,156.2,156.2-156.2c52.65-44.45,86.11-110.9,86.11-185.19,0-133.83-108.49-242.32-242.32-242.32-133.83,0-242.32,108.49-242.32,242.32ZM338.29,518.13c0-111.58,90.45-202.03,202.03-202.03,111.58,0,202.03,90.45,202.03,202.03,0,59.9-26.11,113.66-67.52,150.66l.04.04-134.55,134.55-134.55-134.55.04-.04c-41.41-37-67.52-90.76-67.52-150.66Z",
  "M322.61,978.16c74.3,0,140.74-33.47,185.19-86.11l156.2-156.2-156.2-156.2c-44.45-52.65-110.9-86.11-185.19-86.11-133.83,0-242.32,108.49-242.32,242.32,0,133.83,108.49,242.32,242.32,242.32ZM322.61,937.88c-111.58,0-202.03-90.45-202.03-202.03,0-111.58,90.45-202.03,202.03-202.03,59.9,0,113.66,26.11,150.66,67.52l.04-.04,134.55,134.55-134.55,134.55-.04-.04c-37,41.41-90.76,67.52-150.66,67.52Z",
  "M782.64,953.56c0-74.3-33.47-140.74-86.11-185.19l-156.2-156.2-156.2,156.2c-52.65,44.45-86.11,110.9-86.11,185.19,0,133.83,108.49,242.32,242.32,242.32,133.83,0,242.32-108.49,242.32-242.32ZM742.36,953.56c0,111.58-90.45,202.03-202.03,202.03-111.58,0-202.03-90.45-202.03-202.03,0-59.9,26.11-113.66,67.52-150.66l-.04-.04,134.55-134.55,134.55,134.55-.04.04c41.41,37,67.52,90.76,67.52,150.66Z",
  "M758.04,493.53c-74.3,0-140.74,33.47-185.19,86.11l-156.2,156.2,156.2,156.2c44.45,52.65,110.9,86.11,185.19,86.11,133.83,0,242.32-108.49,242.32-242.32,0-133.83-108.49-242.32-242.32-242.32ZM758.04,533.81c111.58,0,202.03,90.45,202.03,202.03,0,111.58-90.45,202.03-202.03,202.03-59.9,0-113.66-26.11-150.66-67.52l-.04.04-134.55-134.55,134.55-134.55.04.04c37-41.41,90.76-67.52,150.66-67.52Z",
];
const LOGO_VB_W = 1080;
const LOGO_VB_H = 1440;

export interface AvisCardColors {
  /** Cadre extérieur + logo. */
  border: string;
  /** 5 étoiles. */
  stars: string;
  /** Citation + prénom (mots non surlignés). */
  text: string;
  /** Mots surlignés de la citation au clic. */
  accent: string;
  /** Intérieur de la carte (derrière la citation). */
  cardFill: string;
}

export interface QuoteToken {
  text: string;
  idx: number;
}

/** Découpe l'avis en tokens indexés, guillemets français collés au 1er/dernier mot. */
export function buildQuoteTokens(avis: string): QuoteToken[] {
  const words = avis.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  const withQuotes = [...words];
  withQuotes[0] = `« ${withQuotes[0]}`;
  withQuotes[withQuotes.length - 1] = `${withQuotes[withQuotes.length - 1]} »`;
  return withQuotes.map((text, idx) => ({ text, idx }));
}

export interface AvisCardOptions {
  width: number;
  height: number;
  /** SVG complet (déjà recadré au format width×height) du fond recoloré. */
  backgroundSvg: string;
  tokens: QuoteToken[];
  highlighted: Set<number>;
  prenom: string;
  colors: AvisCardColors;
  fontChoice: AvisCardFontChoice;
}

function wrapTokens(ctx: CanvasRenderingContext2D, tokens: QuoteToken[], maxWidth: number): QuoteToken[][] {
  const spaceWidth = ctx.measureText(" ").width;
  const lines: QuoteToken[][] = [];
  let current: QuoteToken[] = [];
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

function drawStar(ctx: CanvasRenderingContext2D, cx: number, cy: number, outerR: number, color: string) {
  const innerR = outerR * 0.46;
  const spikes = 5;
  const rot = -Math.PI / 2;
  ctx.beginPath();
  for (let i = 0; i < spikes; i++) {
    const a1 = rot + (i * 2 * Math.PI) / spikes;
    const a2 = a1 + Math.PI / spikes;
    const p1 = { x: cx + Math.cos(a1) * outerR, y: cy + Math.sin(a1) * outerR };
    const p2 = { x: cx + Math.cos(a2) * innerR, y: cy + Math.sin(a2) * innerR };
    if (i === 0) ctx.moveTo(p1.x, p1.y);
    else ctx.lineTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
  }
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}

function drawLogo(ctx: CanvasRenderingContext2D, x: number, y: number, boxW: number, color: string) {
  const scale = boxW / LOGO_VB_W;
  const boxH = LOGO_VB_H * scale;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.fillStyle = color;
  for (const d of LOGO_PATHS) ctx.fill(new Path2D(d));
  ctx.restore();
  return boxH;
}

/**
 * Rend la carte avis complète dans un <canvas> déjà présent dans le DOM
 * (aperçu live ou canvas offscreen dédié à l'export).
 */
export async function renderAvisCard(canvas: HTMLCanvasElement, opts: AvisCardOptions): Promise<void> {
  const { width: W, height: H, backgroundSvg, tokens, highlighted, prenom, colors, fontChoice } = opts;
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas context unavailable");

  // Police prête avant toute mesure/dessin (cf. overlay-templates.ts).
  if (typeof document !== "undefined" && document.fonts) {
    try {
      await document.fonts.load(fontChoice === "cafeteria" ? `800 16px "cafeteria"` : `900 16px "Nunito"`);
    } catch {
      // Nunito indisponible (offline) — repli navigateur silencieux.
    }
  }

  // 1. Fond recoloré (bande visible seulement en marge, recouvert par le cadre ensuite).
  ctx.fillStyle = colors.cardFill;
  ctx.fillRect(0, 0, W, H);
  await drawSvgIntoCanvas(ctx, backgroundSvg, 0, 0, W, H);

  // 2. Cadre double-liseré.
  const M = W * 0.055;
  const T1 = W * 0.03;
  const G = W * 0.016;
  const T2 = W * 0.009;

  ctx.fillStyle = colors.border;
  ctx.fillRect(M, M, W - 2 * M, H - 2 * M);
  ctx.fillStyle = colors.cardFill;
  ctx.fillRect(M + T1, M + T1, W - 2 * (M + T1), H - 2 * (M + T1));
  ctx.strokeStyle = colors.border;
  ctx.lineWidth = T2;
  const innerLineInset = M + T1 + G + T2 / 2;
  ctx.strokeRect(innerLineInset, innerLineInset, W - 2 * innerLineInset, H - 2 * innerLineInset);

  // 3. Zone de contenu (padding depuis le liseré fin).
  const contentPad = W * 0.055;
  const interiorEdge = M + T1 + G + T2;
  const contentX0 = interiorEdge + contentPad;
  const contentX1 = W - interiorEdge - contentPad;
  const contentTop = interiorEdge + contentPad * 0.7;
  const contentBottom = H - interiorEdge - contentPad * 0.7;
  const maxTextWidth = contentX1 - contentX0;

  // 4. Mesures (étoiles, citation, prénom, logo) avant tout dessin, pour centrer le bloc verticalement.
  const starR = W * 0.017;
  const starsH = starR * 2;

  const fontStack = AVIS_CARD_FONT_STACKS[fontChoice];
  const fontWeight = fontChoice === "cafeteria" ? 800 : 900;
  const quoteFontSize = W * 0.062;
  ctx.font = `${fontWeight} ${quoteFontSize}px ${fontStack}`;
  ctx.textBaseline = "alphabetic";
  const lines = wrapTokens(ctx, tokens, maxTextWidth);
  const quoteLineHeight = quoteFontSize * 1.22;
  const quoteH = lines.length * quoteLineHeight;

  const nameFontSize = W * 0.05;
  const nameH = nameFontSize * 1.2;

  const logoBoxW = W * 0.14;
  const logoBoxH = LOGO_VB_H * (logoBoxW / LOGO_VB_W);

  const gapStarsQuote = quoteFontSize * 0.9;
  const gapQuoteName = quoteFontSize * 0.55;
  const gapNameLogo = quoteFontSize * 1.1;

  const blockH = starsH + gapStarsQuote + quoteH + gapQuoteName + nameH;
  const available = contentBottom - contentTop - logoBoxH - gapNameLogo;
  const blockStartY = contentTop + Math.max(0, (available - blockH) / 2);

  // 5. Étoiles.
  let cursorY = blockStartY + starR;
  for (let i = 0; i < 5; i++) {
    drawStar(ctx, contentX0 + starR + i * starR * 2.35, cursorY, starR, colors.stars);
  }

  // 6. Citation (mots surlignables).
  cursorY = blockStartY + starsH + gapStarsQuote;
  ctx.font = `${fontWeight} ${quoteFontSize}px ${fontStack}`;
  ctx.textAlign = "left";
  const spaceWidth = ctx.measureText(" ").width;
  lines.forEach((line, li) => {
    let x = contentX0;
    const y = cursorY + li * quoteLineHeight + quoteFontSize * 0.92;
    line.forEach((tok) => {
      ctx.fillStyle = highlighted.has(tok.idx) ? colors.accent : colors.text;
      ctx.fillText(tok.text, x, y);
      x += ctx.measureText(tok.text).width + spaceWidth;
    });
  });

  // 7. Prénom, aligné à droite.
  cursorY += quoteH + gapQuoteName;
  ctx.font = `${fontWeight} ${nameFontSize}px ${fontStack}`;
  ctx.fillStyle = colors.text;
  ctx.textAlign = "right";
  ctx.fillText(prenom.trim(), contentX1, cursorY + nameFontSize * 0.85);

  // 8. Logo, centré horizontalement, ancré près du bas de la carte.
  const logoX = (contentX0 + contentX1) / 2 - logoBoxW / 2;
  const logoY = contentBottom - logoBoxH;
  drawLogo(ctx, logoX, logoY, logoBoxW, colors.border);
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
