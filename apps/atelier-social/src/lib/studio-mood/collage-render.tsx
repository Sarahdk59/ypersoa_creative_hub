/**
 * Moteur de rendu collage-sticker, partagé entre l'outil manuel
 * (/studio/studio-mood/collage) et l'auto-génération du mode
 * "Sticker (détouré)" dans la fiche épisode ([id]/page.tsx).
 *
 * Refonte 13/08/2026 ("corrige le mood") :
 *  - logo Ypersoa = vrai fichier assets/motifs-fonds-svg/logo.svg (plus de
 *    quatrefoil approximé en 4 cercles canvas)
 *  - fonds = vrais motifs de la bibliothèque assets/motifs-fonds-svg/ +
 *    générateur procédural partagé avec /social/fonds (lib/fonds-engine),
 *    recolorés fond/motif — plus de patterns canvas maison (dots/blobs)
 *  - labels texte élaborés : sketch, contour, brush, post-it, papier découpé
 *  - format Instagram du mood = 3:4 (1080×1440, aligné sur le viewBox natif
 *    du logo Ypersoa) à la place du 4:5 générique
 *  - helper pickContrastingBg() : le fond ne doit jamais avoir une couleur
 *    trop proche du vêtement du mannequin (silhouette qui se fond dans le fond)
 */
import {
  buildGeneratorSVG,
  colorDist,
  detectColors,
  ensureBackground,
  fitToFormat,
  hexToHsl,
  hslToHex,
  mulberry32,
  recolorSvg,
  type FormatId as FondsFormatId,
} from "@/lib/fonds-engine";

export const FORMATS = {
  "3:4": { w: 1080, h: 1440, label: "Instagram Post (3:4)" },
  "9:16": { w: 1080, h: 1920, label: "Reels / Story (9:16)" },
  "1:1": { w: 1080, h: 1080, label: "Carré (1:1)" },
} as const;

export type CollageFormat = keyof typeof FORMATS;

/** Les 3 formats du mood ont des dims identiques aux formats de l'outil Fonds — mapping direct. */
const FORMAT_TO_FONDS: Record<CollageFormat, FondsFormatId> = {
  "3:4": "p34",
  "9:16": "story",
  "1:1": "sq",
};

export const BG_PRESETS = [
  { id: "olive", color: "#8B9E6E", label: "Olive Mojito" },
  { id: "rose", color: "#F2B5C5", label: "Rose poudré" },
  { id: "rouge", color: "#D63A3A", label: "Rouge vif" },
  { id: "teal", color: "#1E6E77", label: "Teal Ypersoa" },
  { id: "marine", color: "#16324C", label: "Marine" },
  { id: "creme", color: "#F4EEE2", label: "Crème" },
  { id: "blanc", color: "#FFFFFF", label: "Blanc" },
  { id: "corail", color: "#E87D5A", label: "Corail" },
  { id: "lavande", color: "#B8A9C9", label: "Lavande" },
];

export const LABEL_SHAPES = [
  { id: "pill", label: "Pill arrondi" },
  { id: "blob", label: "Blob" },
  { id: "rect", label: "Rectangle" },
  { id: "sticker", label: "Sticker" },
  { id: "sketch", label: "Sketch" },
  { id: "contour", label: "Contour" },
  { id: "brush", label: "Brush" },
  { id: "postit", label: "Post-it" },
  { id: "papier", label: "Papier découpé" },
];

export const LABEL_COLORS = [
  { id: "yellow", bg: "#F2C94C", text: "#1A1614" },
  { id: "red", bg: "#D63A3A", text: "#FFFFFF" },
  { id: "teal", bg: "#1E6E77", text: "#FFFFFF" },
  { id: "marine", bg: "#16324C", text: "#FFFFFF" },
  { id: "white", bg: "#FFFFFF", text: "#1A1614" },
  { id: "cream", bg: "#F4EEE2", text: "#16324C" },
];

export const PROPS = [
  { id: "thread", emoji: "🧵", label: "Bobine de fil" },
  { id: "scissors", emoji: "✂️", label: "Ciseaux" },
  { id: "flower", emoji: "🌸", label: "Fleur" },
  { id: "heart", emoji: "❤️", label: "Cœur" },
  { id: "star", emoji: "⭐", label: "Étoile" },
  { id: "lemon", emoji: "🍋", label: "Citron" },
  { id: "coffee", emoji: "☕", label: "Café" },
  { id: "sparkle", emoji: "✨", label: "Étincelle" },
];

// ─── Fonds — bibliothèque partagée avec /social/fonds ──────────────────────

export interface FondPatternDef {
  id: string;
  label: string;
  kind: "generator" | "asset";
  categoryId?: string;
  templateId?: string;
  assetFilename?: string;
}

/** Sous-ensemble curaté de la bibliothèque Fonds — motifs pertinents en fond
 * plein cadre pour un post mood (tuiles/dispersion, pas les cartes/cadres
 * prêts-à-l'emploi qui supposent leur propre mise en page). */
export const COLLAGE_FONDS: FondPatternDef[] = [
  { id: "aucun", label: "Aucun", kind: "generator", categoryId: "uni", templateId: "uni" },
  { id: "rayures-irreg", label: "Rayures irrégulières", kind: "generator", categoryId: "rayures", templateId: "irregulieres" },
  { id: "pois-disperse", label: "Pois dispersés", kind: "generator", categoryId: "pois", templateId: "disperse" },
  { id: "carreaux-vichy-gen", label: "Vichy", kind: "generator", categoryId: "carreaux", templateId: "vichy" },
  { id: "rayure-sign-1", label: "Rayure signature", kind: "asset", assetFilename: "rayure.svg" },
  { id: "rayure-sign-2", label: "Rayure diagonale", kind: "asset", assetFilename: "rayure-2.svg" },
  { id: "rayure-sign-4", label: "Rayure ondulée", kind: "asset", assetFilename: "rayure-4.svg" },
  { id: "polka-organique", label: "Polka organique", kind: "asset", assetFilename: "polka dot.svg" },
  { id: "polka-fin", label: "Polka fin", kind: "asset", assetFilename: "dot - 1.svg" },
  { id: "coeur-bordure", label: "Cœurs bordure", kind: "asset", assetFilename: "heart.svg" },
  { id: "coeur-disperse", label: "Cœurs dispersés", kind: "asset", assetFilename: "heart - 1.svg" },
  { id: "fleurs-pleine-page", label: "Fleurs pleine page", kind: "asset", assetFilename: "fleurs pleine page.svg" },
  { id: "fleur-1", label: "Fleur 1", kind: "asset", assetFilename: "fleur.svg" },
  { id: "fleur-2", label: "Fleur 2", kind: "asset", assetFilename: "fleur2.svg" },
  { id: "fleur-3", label: "Fleur 3", kind: "asset", assetFilename: "fleur3.svg" },
  { id: "fleur-4", label: "Fleur 4", kind: "asset", assetFilename: "fleur4.svg" },
  { id: "vichy-signature", label: "Vichy signature", kind: "asset", assetFilename: "vichy.svg" },
];

/**
 * Construit le SVG plein cadre d'un fond (générateur procédural ou asset réel
 * recoloré fond/motif). `assetLibrary` = contenu brut des SVG de
 * assets/motifs-fonds-svg/, tel que renvoyé par GET /api/social/motifs-fonds.
 */
export function buildFondSvg(
  def: FondPatternDef,
  fondColor: string,
  motifColor: string,
  format: CollageFormat,
  seed: number,
  assetLibrary: Record<string, string>
): string {
  const { w, h } = FORMATS[format];
  if (def.kind === "generator") {
    return buildGeneratorSVG({
      categoryId: def.categoryId!,
      templateId: def.templateId!,
      fond: fondColor,
      motif: motifColor,
      secondaire: motifColor,
      density: 55,
      size: 55,
      seed,
      format: FORMAT_TO_FONDS[format],
    });
  }
  const raw = def.assetFilename ? assetLibrary[def.assetFilename] : null;
  if (!raw) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}"><rect width="${w}" height="${h}" fill="${fondColor}"/></svg>`;
  }
  const withBg = ensureBackground(raw, fondColor);
  const colors = detectColors(withBg);
  const fondHex = fondColor.toLowerCase();
  const colorMap: Record<string, string> = {};
  colors.forEach((c) => {
    colorMap[c.hex] = c.hex === fondHex ? fondColor : motifColor;
  });
  const recolored = recolorSvg(withBg, colors, colorMap);
  return fitToFormat(recolored, w, h);
}

/** Charge une string SVG dans un HTMLImageElement (pour composition canvas synchrone ensuite). */
export function loadImageFromSvg(svg: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const blob = new Blob([svg], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Impossible de charger le SVG du fond"));
    };
    img.src = url;
  });
}

/** Le logo Ypersoa (assets/motifs-fonds-svg/logo.svg) est monochrome (une seule couleur de fill) — recoloration simple par remplacement. */
export function recolorLogoSvg(svg: string, hex: string): string {
  return svg.replace(/fill="#[0-9a-fA-F]{3,6}"/g, `fill="${hex}"`);
}

// ─── Contraste fond / mannequin ─────────────────────────────────────────────

/**
 * Choisit, parmi les couleurs candidates, celle la plus contrastée avec la
 * couleur du vêtement porté (évite un mannequin qui se fond dans le fond —
 * ex. sweat crème sur fond crème). Retombe sur la 1ère couleur si aucune
 * candidate ne dépasse le seuil (mieux vaut un contraste imparfait qu'une
 * erreur silencieuse).
 */
export function pickContrastingBg(
  garmentHex: string | null | undefined,
  candidates: { id: string; color: string }[],
  minDist = 90
): { id: string; color: string } {
  if (!garmentHex || !/^#[0-9a-fA-F]{6}$/.test(garmentHex)) return candidates[0];
  const ranked = [...candidates].sort((a, b) => colorDist(b.color, garmentHex) - colorDist(a.color, garmentHex));
  const best = ranked.find((c) => colorDist(c.color, garmentHex) >= minDist);
  return best ?? ranked[0];
}

function darken(hex: string, amount = 0.16): string {
  const { h, s, l } = hexToHsl(hex);
  return hslToHex(h, s, Math.max(0, l - amount * 100));
}

function strHash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return h >>> 0;
}

export function QuatrefoilSVG({ size, color }: { size: number; color: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
      <circle cx="30" cy="30" r="22" stroke={color} strokeWidth="5" fill="none" />
      <circle cx="70" cy="30" r="22" stroke={color} strokeWidth="5" fill="none" />
      <circle cx="30" cy="70" r="22" stroke={color} strokeWidth="5" fill="none" />
      <circle cx="70" cy="70" r="22" stroke={color} strokeWidth="5" fill="none" />
    </svg>
  );
}

export interface DrawCollageOpts {
  format: CollageFormat;
  bgColor: string;
  /** Fond décoratif pré-rendu (cf. buildFondSvg + loadImageFromSvg), null = couleur unie seule. */
  bgPatternImage: HTMLImageElement | null;
  photo: HTMLImageElement | null;
  /**
   * "multiply" = astuce compositing pour une photo fond blanc NON détourée
   * (upload manuel dans l'outil collage) — le blanc "disparaît" par fusion.
   * "normal" = photo avec un vrai canal alpha (détourage serveur) — dessin direct.
   */
  photoBlendMode: "normal" | "multiply";
  photoScale: number;
  photoX: number;
  photoY: number;
  labelText: string;
  labelShape: string;
  labelBg: string;
  labelFg: string;
  labelSize: number;
  labelX: number;
  labelY: number;
  selectedProps: string[];
  showLogo: boolean;
  /** Logo pré-recoloré et pré-chargé (cf. recolorLogoSvg + loadImageFromSvg). */
  logoImage: HTMLImageElement | null;
}

export function drawCollage(canvas: HTMLCanvasElement, opts: DrawCollageOpts) {
  const { w, h } = FORMATS[opts.format];
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;

  // Background
  ctx.fillStyle = opts.bgColor;
  ctx.fillRect(0, 0, w, h);
  if (opts.bgPatternImage) {
    ctx.drawImage(opts.bgPatternImage, 0, 0, w, h);
  }

  // Photo
  if (opts.photo) {
    const imgW = opts.photo.naturalWidth * opts.photoScale;
    const imgH = opts.photo.naturalHeight * opts.photoScale;
    if (opts.photoBlendMode === "multiply") {
      ctx.save();
      ctx.globalCompositeOperation = "multiply";
      ctx.drawImage(opts.photo, opts.photoX, opts.photoY, imgW, imgH);
      ctx.restore();
    } else {
      ctx.drawImage(opts.photo, opts.photoX, opts.photoY, imgW, imgH);
    }
  }

  // Label
  if (opts.labelText.trim()) {
    drawLabel(ctx, opts, w);
  }

  // Props (emoji)
  const propPositions = [
    [0.75 * w, 0.18 * h],
    [0.15 * w, 0.55 * h],
    [0.8 * w, 0.65 * h],
    [0.2 * w, 0.82 * h],
    [0.65 * w, 0.85 * h],
    [0.05 * w, 0.3 * h],
    [0.85 * w, 0.4 * h],
    [0.5 * w, 0.12 * h],
  ];
  ctx.font = `${Math.round(w * 0.1)}px serif`;
  ctx.textAlign = "center";
  opts.selectedProps.forEach((propId, i) => {
    const prop = PROPS.find((p) => p.id === propId);
    if (!prop) return;
    const [px, py] = propPositions[i % propPositions.length];
    ctx.fillText(prop.emoji, px, py);
  });
  ctx.textAlign = "left";

  // Logo Ypersoa (vrai fichier, coin bas droit, ratio conservé)
  if (opts.showLogo && opts.logoImage) {
    const boxSize = Math.round(w * 0.09);
    const margin = Math.round(w * 0.04);
    const ratio = opts.logoImage.naturalWidth / opts.logoImage.naturalHeight;
    const logoH = boxSize;
    const logoW = boxSize * ratio;
    const lx = w - logoW - margin;
    const ly = h - logoH - margin;
    ctx.drawImage(opts.logoImage, lx, ly, logoW, logoH);
  }
}

function drawLabel(ctx: CanvasRenderingContext2D, opts: DrawCollageOpts, canvasW: number) {
  const fontSize = opts.labelSize;
  ctx.font = `700 ${fontSize}px 'Arial', sans-serif`;
  const textW = ctx.measureText(opts.labelText).width;
  const padX = 40;
  const padY = 24;
  const lx = opts.labelX;
  const ly = opts.labelY;
  const lw = textW + padX * 2;
  const lh = fontSize + padY * 2;
  const cx = lx + lw / 2;
  const cy = ly + lh / 2;
  const seed = strHash(opts.labelText + opts.labelShape);
  const rnd = mulberry32(seed);

  ctx.save();

  if (opts.labelShape === "contour") {
    // Pas de boîte — le mot lui-même a un contour épais (marker/feutre).
    ctx.font = `800 ${fontSize}px 'Arial', sans-serif`;
    ctx.lineJoin = "round";
    ctx.miterLimit = 2;
    ctx.strokeStyle = opts.labelBg;
    ctx.lineWidth = Math.max(4, fontSize * 0.14);
    ctx.strokeText(opts.labelText, lx + padX, ly + padY + fontSize * 0.78);
    ctx.fillStyle = opts.labelFg;
    ctx.fillText(opts.labelText, lx + padX, ly + padY + fontSize * 0.78);
    ctx.restore();
    return;
  }

  if (opts.labelShape === "postit" || opts.labelShape === "papier") {
    const angle = ((rnd() - 0.5) * 8 * Math.PI) / 180; // ±4°
    ctx.translate(cx, cy);
    ctx.rotate(angle);
    ctx.translate(-cx, -cy);
  }

  ctx.fillStyle = opts.labelBg;

  if (opts.labelShape === "pill") {
    const r = lh / 2;
    ctx.beginPath();
    ctx.moveTo(lx + r, ly);
    ctx.lineTo(lx + lw - r, ly);
    ctx.arc(lx + lw - r, ly + r, r, -Math.PI / 2, Math.PI / 2);
    ctx.lineTo(lx + r, ly + lh);
    ctx.arc(lx + r, ly + r, r, Math.PI / 2, -Math.PI / 2);
    ctx.closePath();
    ctx.fill();
  } else if (opts.labelShape === "blob") {
    ctx.beginPath();
    ctx.moveTo(lx + lw * 0.1, ly + lh * 0.2);
    ctx.bezierCurveTo(lx - lw * 0.05, ly - lh * 0.1, lx + lw * 0.4, ly - lh * 0.15, lx + lw * 0.6, ly + lh * 0.05);
    ctx.bezierCurveTo(lx + lw * 0.85, ly - lh * 0.05, lx + lw * 1.1, ly + lh * 0.4, lx + lw * 0.95, ly + lh * 0.75);
    ctx.bezierCurveTo(lx + lw * 1.05, ly + lh * 1.1, lx + lw * 0.6, ly + lh * 1.15, lx + lw * 0.4, ly + lh * 0.95);
    ctx.bezierCurveTo(lx + lw * 0.1, ly + lh * 1.2, lx - lw * 0.05, ly + lh * 0.8, lx + lw * 0.1, ly + lh * 0.2);
    ctx.closePath();
    ctx.fill();
  } else if (opts.labelShape === "sticker") {
    const r = 20;
    ctx.shadowColor = "rgba(0,0,0,0.3)";
    ctx.shadowBlur = 12;
    ctx.shadowOffsetY = 4;
    ctx.beginPath();
    ctx.roundRect(lx, ly, lw, lh, r);
    ctx.fill();
    ctx.shadowColor = "transparent";
  } else if (opts.labelShape === "sketch") {
    // Boîte dessinée à la main : 2 passes de contour imparfait + fond léger.
    ctx.shadowColor = "transparent";
    ctx.beginPath();
    ctx.roundRect(lx, ly, lw, lh, 14);
    ctx.fill();
    ctx.lineJoin = "round";
    ctx.strokeStyle = opts.labelFg;
    for (let pass = 0; pass < 2; pass++) {
      const jitter = 3 + pass * 2;
      ctx.lineWidth = pass === 0 ? 4 : 2.5;
      ctx.globalAlpha = pass === 0 ? 0.9 : 0.5;
      ctx.beginPath();
      const steps = 24;
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const perim = wobblyRectPoint(t, lx, ly, lw, lh, 14);
        const jx = perim.x + (rnd() - 0.5) * jitter;
        const jy = perim.y + (rnd() - 0.5) * jitter;
        if (i === 0) ctx.moveTo(jx, jy);
        else ctx.lineTo(jx, jy);
      }
      ctx.closePath();
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  } else if (opts.labelShape === "brush") {
    // Coup de pinceau/marqueur : bande irrégulière, extrémités "sales".
    const bumps = 14;
    ctx.beginPath();
    for (let i = 0; i <= bumps; i++) {
      const t = i / bumps;
      const x = lx + t * lw;
      const edge = t < 0.06 || t > 0.94 ? 0.5 : 1;
      const y = ly + (rnd() - 0.5) * lh * 0.14 * edge;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    for (let i = bumps; i >= 0; i--) {
      const t = i / bumps;
      const x = lx + t * lw;
      const edge = t < 0.06 || t > 0.94 ? 0.5 : 1;
      const y = ly + lh + (rnd() - 0.5) * lh * 0.14 * edge;
      ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
  } else if (opts.labelShape === "postit") {
    const foldSize = Math.min(lw, lh) * 0.22;
    ctx.shadowColor = "rgba(0,0,0,0.22)";
    ctx.shadowBlur = 14;
    ctx.shadowOffsetX = 3;
    ctx.shadowOffsetY = 6;
    ctx.fillRect(lx, ly, lw, lh);
    ctx.shadowColor = "transparent";
    // Coin plié en haut à droite
    ctx.fillStyle = darken(opts.labelBg, 0.12);
    ctx.beginPath();
    ctx.moveTo(lx + lw - foldSize, ly);
    ctx.lineTo(lx + lw, ly);
    ctx.lineTo(lx + lw, ly + foldSize);
    ctx.closePath();
    ctx.fill();
  } else if (opts.labelShape === "papier") {
    // Silhouette papier découpé/déchiré : contour en zigzag irrégulier.
    ctx.shadowColor = "rgba(0,0,0,0.25)";
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 5;
    ctx.beginPath();
    const perSide = 8;
    const jag = Math.min(lw, lh) * 0.045;
    const corners: [number, number, number, number][] = [
      [lx, ly, lx + lw, ly], // haut
      [lx + lw, ly, lx + lw, ly + lh], // droite
      [lx + lw, ly + lh, lx, ly + lh], // bas
      [lx, ly + lh, lx, ly], // gauche
    ];
    corners.forEach(([x0, y0, x1, y1], side) => {
      for (let i = 0; i <= perSide; i++) {
        const t = i / perSide;
        const bx = x0 + (x1 - x0) * t;
        const by = y0 + (y1 - y0) * t;
        const nx = side % 2 === 0 ? 0 : (rnd() - 0.5) * 2;
        const ny = side % 2 === 0 ? (rnd() - 0.5) * 2 : 0;
        const px = bx + nx * jag;
        const py = by + ny * jag;
        if (side === 0 && i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
    });
    ctx.closePath();
    ctx.fill();
    ctx.shadowColor = "transparent";
  } else {
    ctx.fillRect(lx, ly, lw, lh);
  }

  ctx.fillStyle = opts.labelFg;
  ctx.font = `700 ${fontSize}px 'Arial', sans-serif`;
  ctx.fillText(opts.labelText, lx + padX, ly + padY + fontSize * 0.78);
  ctx.restore();
}

/** Point sur le périmètre d'un rectangle arrondi, paramétré par t ∈ [0,1] — utilisé pour le contour "sketch". */
function wobblyRectPoint(t: number, x: number, y: number, w: number, h: number, r: number): { x: number; y: number } {
  const perim = 2 * (w + h) - 8 * r + 2 * Math.PI * r;
  const d = t * perim;
  const straightTop = w - 2 * r;
  const arc = (Math.PI / 2) * r;
  let acc = 0;
  if (d < straightTop) return { x: x + r + d, y };
  acc += straightTop;
  if (d < acc + arc) {
    const a = (d - acc) / r;
    return { x: x + w - r + Math.sin(a) * r, y: y + r - Math.cos(a) * r };
  }
  acc += arc;
  const straightRight = h - 2 * r;
  if (d < acc + straightRight) return { x: x + w, y: y + r + (d - acc) };
  acc += straightRight;
  if (d < acc + arc) {
    const a = (d - acc) / r;
    return { x: x + w - r + Math.cos(a) * r, y: y + h - r + Math.sin(a) * r };
  }
  acc += arc;
  const straightBottom = w - 2 * r;
  if (d < acc + straightBottom) return { x: x + w - r - (d - acc), y: y + h };
  acc += straightBottom;
  if (d < acc + arc) {
    const a = (d - acc) / r;
    return { x: x + r - Math.sin(a) * r, y: y + h - r + Math.cos(a) * r };
  }
  acc += arc;
  const straightLeft = h - 2 * r;
  if (d < acc + straightLeft) return { x, y: y + h - r - (d - acc) };
  acc += straightLeft;
  const a = (d - acc) / r;
  return { x: x + r - Math.cos(a) * r, y: y + r - Math.sin(a) * r };
}
