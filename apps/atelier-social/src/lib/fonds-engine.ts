/**
 * Moteur partagé "Fonds" — Atelier Social.
 *
 * Fonctions pures (génération procédurale de motifs, détection/recoloration
 * de couleurs SVG, export) extraites de /social/fonds pour être réutilisées
 * ailleurs dans le Hub (ex. carte visuelle du générateur d'avis) sans
 * dupliquer le moteur. Aucune dépendance React ici — tout est isomorphe sauf
 * les fonctions de téléchargement qui touchent le DOM (appelées uniquement
 * côté client, au clic).
 */

/* ============================================================
   Formats
   ============================================================ */

export type FormatId = "p45" | "sq" | "story" | "pinterest" | "p34";
export interface FormatDef {
  id: FormatId;
  nm: string;
  sub: string;
  w: number;
  h: number;
}
export const FORMATS: FormatDef[] = [
  { id: "p45", nm: "Post 4:5", sub: "1080×1350", w: 1080, h: 1350 },
  { id: "sq", nm: "Carré 1:1", sub: "1080×1080", w: 1080, h: 1080 },
  { id: "story", nm: "Story 9:16", sub: "1080×1920", w: 1080, h: 1920 },
  { id: "pinterest", nm: "Pinterest 2:3", sub: "1000×1500", w: 1000, h: 1500 },
  { id: "p34", nm: "Portrait 3:4", sub: "1080×1440", w: 1080, h: 1440 },
];

/* ============================================================
   Thématiques & templates
   ============================================================ */

export type Role = "fond" | "motif" | "secondaire";
export type SliderKind = "density" | "size";
export const ROLE_LABEL: Record<Role, string> = { fond: "Fond", motif: "Motif", secondaire: "Secondaire" };

export interface TemplateDef {
  id: string;
  nm: string;
  roles: Role[];
  seeded: boolean;
  sliders: SliderKind[];
  /** Si présent : template = vrai fichier de assets/motifs-fonds-svg/ (recoloration par détection, pas de rôles). */
  asset?: string;
}
export interface CategoryDef {
  id: string;
  nm: string;
  templates: TemplateDef[];
}

/** Template basé sur un fichier réel de la bibliothèque — pas de rôles/sliders, recoloration par détection. */
export function assetTemplate(id: string, nm: string, filename: string): TemplateDef {
  return { id, nm, roles: [], seeded: false, sliders: [], asset: filename };
}

export const CATEGORIES: CategoryDef[] = [
  {
    id: "uni",
    nm: "Uni",
    templates: [{ id: "uni", nm: "Uni", roles: ["fond"], seeded: false, sliders: [] }],
  },
  {
    id: "rayures",
    nm: "Rayures",
    templates: [
      { id: "verticales", nm: "Verticales", roles: ["fond", "motif"], seeded: false, sliders: ["density", "size"] },
      { id: "horizontales", nm: "Horizontales", roles: ["fond", "motif"], seeded: false, sliders: ["density", "size"] },
      { id: "irregulieres", nm: "Irrégulières", roles: ["fond", "motif"], seeded: true, sliders: ["density", "size"] },
      { id: "pointilles", nm: "Pointillés", roles: ["fond", "motif"], seeded: false, sliders: ["density", "size"] },
      assetTemplate("signature-diag-1", "Signature diagonale 1", "rayure.svg"),
      assetTemplate("signature-diag-2", "Signature diagonale 2", "rayure-2.svg"),
      assetTemplate("signature-horiz", "Signature horizontale", "rayure-3.svg"),
      assetTemplate("signature-ondulee", "Signature ondulée", "rayure-4.svg"),
    ],
  },
  {
    id: "pois",
    nm: "Pois",
    templates: [
      { id: "disperse", nm: "Dispersé", roles: ["fond", "motif"], seeded: true, sliders: ["density", "size"] },
      assetTemplate("signature-organique", "Signature organique", "polka dot.svg"),
      assetTemplate("signature-fin", "Signature fin", "dot - 1.svg"),
    ],
  },
  {
    id: "carreaux",
    nm: "Carreaux",
    templates: [
      { id: "regulier", nm: "Régulier", roles: ["fond", "motif"], seeded: false, sliders: ["density", "size"] },
      { id: "vichy", nm: "Vichy", roles: ["fond", "motif"], seeded: false, sliders: ["density", "size"] },
      assetTemplate("signature-vichy", "Vichy signature", "vichy.svg"),
    ],
  },
  {
    id: "cadre",
    nm: "Cadre",
    templates: [
      assetTemplate("bordure-rayee", "Bordure rayée", "cadre.svg"),
      assetTemplate("cadre-bicolore", "Cadre bicolore", "cadre - 1.svg"),
      assetTemplate("cadre-festonne", "Cadre festonné", "cadre - 2.svg"),
    ],
  },
  {
    id: "fleur",
    nm: "Fleur",
    templates: [
      assetTemplate("pleine-page", "Fleurs pleine page", "fleurs pleine page.svg"),
      assetTemplate("marguerite", "Marguerite", "flower - 2.svg"),
      assetTemplate("marguerite-ronde", "Marguerite ronde", "flower - 3.svg"),
      assetTemplate("tulipes", "Tulipes", "tulip.svg"),
    ],
  },
  {
    id: "oiseau",
    nm: "Oiseau",
    templates: [assetTemplate("silhouette", "Silhouette", "oiseau.svg")],
  },
  {
    id: "coeur",
    nm: "Cœur",
    templates: [
      assetTemplate("texte-courbe", "Cœur texte courbe", "coeur - 1.svg"),
      assetTemplate("bordure", "Cœurs bordure", "heart.svg"),
      assetTemplate("disperses", "Cœurs dispersés", "heart - 1.svg"),
    ],
  },
  {
    id: "cartes",
    nm: "Cartes",
    templates: [
      assetTemplate("amis", "Amis", "amis.svg"),
      assetTemplate("bisou-coeur", "Bisou cœur", "bisou coeur.svg"),
      assetTemplate("bonheur", "Bonheur", "bonheur.svg"),
      assetTemplate("brode-pour-toi", "Brodé pour toi", "brode pour toi.svg"),
      assetTemplate("cadeau", "Cadeau", "cadeau.svg"),
      assetTemplate("famille", "Famille", "famille.svg"),
      assetTemplate("merci", "Merci", "merci.svg"),
      assetTemplate("grille-perso", "Grille personnalisée", "perso.svg"),
      assetTemplate("post-base", "Post base", "Post insta - base 1.svg"),
      assetTemplate("post-avis", "Post avis", "Post insta avis.svg"),
    ],
  },
  {
    id: "autres",
    nm: "Autres",
    templates: [
      assetTemplate("bulle", "Bulle cœur", "bulle.svg"),
      assetTemplate("tourbillon", "Tourbillon", "tourbillon.svg"),
      assetTemplate("logo", "Logo Ypersoa", "logo.svg"),
    ],
  },
];

/* ============================================================
   Helpers génériques
   ============================================================ */

export const f = (n: number) => Math.round(n * 100) / 100;

export function mulberry32(a: number) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Poisson-disc (Bridson) — points jamais plus proches que minDist, répartition franche. */
export function poissonDisc(W: number, H: number, minDist: number, rnd: () => number, k = 30) {
  const cell = minDist / Math.SQRT2;
  const gw = Math.ceil(W / cell);
  const gh = Math.ceil(H / cell);
  const grid = new Array<number>(gw * gh).fill(-1);
  const pts: { x: number; y: number }[] = [];
  const active: number[] = [];
  const gi = (x: number, y: number) => Math.floor(y / cell) * gw + Math.floor(x / cell);

  const first = { x: rnd() * W, y: rnd() * H };
  pts.push(first);
  active.push(0);
  grid[gi(first.x, first.y)] = 0;

  while (active.length) {
    const ai = Math.floor(rnd() * active.length);
    const p = pts[active[ai]];
    let found = false;
    for (let i = 0; i < k; i++) {
      const a = rnd() * Math.PI * 2;
      const r = minDist * (1 + rnd());
      const nx = p.x + Math.cos(a) * r;
      const ny = p.y + Math.sin(a) * r;
      if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
      const cx = Math.floor(nx / cell);
      const cy = Math.floor(ny / cell);
      let ok = true;
      for (let yy = Math.max(0, cy - 2); yy <= Math.min(gh - 1, cy + 2) && ok; yy++) {
        for (let xx = Math.max(0, cx - 2); xx <= Math.min(gw - 1, cx + 2); xx++) {
          const idx = grid[yy * gw + xx];
          if (idx >= 0) {
            const dx = pts[idx].x - nx;
            const dy = pts[idx].y - ny;
            if (dx * dx + dy * dy < minDist * minDist) {
              ok = false;
              break;
            }
          }
        }
      }
      if (ok) {
        pts.push({ x: nx, y: ny });
        grid[gi(nx, ny)] = pts.length - 1;
        active.push(pts.length - 1);
        found = true;
        break;
      }
    }
    if (!found) active.splice(ai, 1);
  }
  return pts;
}

/** Bande ondulée verticale (rayures irrégulières). */
export function squiggleCol(x: number, H: number, amp: number, wavelength: number, phase: number, color: string, strokeWidth: number) {
  let d = "";
  for (let y = -strokeWidth; y <= H + strokeWidth; y += 8) {
    const xx = x + Math.sin((y / wavelength) * Math.PI * 2 + phase) * amp;
    d += `${y === -strokeWidth ? "M" : "L"} ${f(xx)} ${f(y)} `;
  }
  return `<path d="${d}" fill="none" stroke="${color}" stroke-width="${f(strokeWidth)}" stroke-linecap="round"/>`;
}

export interface GeneratorState {
  categoryId: string;
  templateId: string;
  fond: string;
  motif: string;
  secondaire: string;
  density: number;
  size: number;
  seed: number;
  format: FormatId;
}

export function buildGeneratorSVG(st: GeneratorState) {
  const fmt = FORMATS.find((x) => x.id === st.format)!;
  const W = fmt.w;
  const H = fmt.h;
  const d = st.density / 100;
  const z = st.size / 100;
  let inner = `<rect width="${W}" height="${H}" fill="${st.fond}"/>`;
  const key = `${st.categoryId}.${st.templateId}`;

  switch (key) {
    case "rayures.verticales": {
      const sw = Math.round(40 + (1 - d) * 130);
      for (let x = 0; x < W; x += sw * 2) {
        inner += `<rect x="${x}" y="0" width="${sw}" height="${H}" fill="${st.motif}"/>`;
      }
      break;
    }
    case "rayures.horizontales": {
      const sw = Math.round(40 + (1 - d) * 130);
      for (let y = 0; y < H; y += sw * 2) {
        inner += `<rect x="0" y="${y}" width="${W}" height="${sw}" fill="${st.motif}"/>`;
      }
      break;
    }
    case "rayures.irregulieres": {
      const rnd = mulberry32((st.seed * 2654435761) >>> 0);
      const spacing = Math.round(50 + (1 - d) * 110);
      const strokeW = Math.round(14 + z * 40);
      const amp = 10 + z * 22;
      const wavelength = 220 + rnd() * 140;
      for (let x = spacing / 2; x < W + spacing; x += spacing) {
        inner += squiggleCol(x, H, amp, wavelength, rnd() * Math.PI * 2, st.motif, strokeW);
      }
      break;
    }
    case "rayures.pointilles": {
      const colSpacing = Math.round(50 - d * 32);
      const gapY = Math.round(22 - d * 14);
      const R = 2 + z * 5;
      for (let x = colSpacing / 2; x < W; x += colSpacing) {
        for (let y = gapY / 2; y < H; y += gapY) {
          inner += `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(R * 0.6)}" ry="${f(R)}" fill="${st.motif}"/>`;
        }
      }
      break;
    }
    case "pois.disperse": {
      const rnd = mulberry32((st.seed * 2654435761) >>> 0);
      const minDist = 185 - d * 105;
      const R = Math.round(minDist * (0.12 + z * 0.28));
      const pts = poissonDisc(W, H, minDist, rnd);
      for (const p of pts) inner += `<circle cx="${f(p.x)}" cy="${f(p.y)}" r="${R}" fill="${st.motif}"/>`;
      break;
    }
    case "carreaux.regulier": {
      const cs = Math.round(70 + (1 - d) * 160);
      const lw = Math.max(2, Math.round(cs * (0.05 + z * 0.1)));
      for (let x = cs; x < W; x += cs) inner += `<rect x="${x - lw / 2}" y="0" width="${lw}" height="${H}" fill="${st.motif}"/>`;
      for (let y = cs; y < H; y += cs) inner += `<rect x="0" y="${y - lw / 2}" width="${W}" height="${lw}" fill="${st.motif}"/>`;
      break;
    }
    case "carreaux.vichy": {
      const cs = Math.round(60 + (1 - d) * 150);
      const lw = Math.max(6, Math.round(cs * (0.25 + z * 0.35)));
      for (let x = cs / 2; x < W; x += cs) {
        inner += `<rect x="${x - lw / 2}" y="0" width="${lw}" height="${H}" fill="${st.motif}" fill-opacity="0.55"/>`;
      }
      for (let y = cs / 2; y < H; y += cs) {
        inner += `<rect x="0" y="${y - lw / 2}" width="${W}" height="${lw}" fill="${st.motif}" fill-opacity="0.55"/>`;
      }
      break;
    }
    default:
      // "uni.uni" → rien de plus
      break;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">${inner}</svg>`;
}

/* ============================================================
   Sous-tons (teintes/nuances d'une couleur choisie)
   ============================================================ */

export function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h /= 6;
  }
  return { h: h * 360, s: s * 100, l: l * 100 };
}

export function hslToHex(h: number, s: number, l: number): string {
  const hh = ((h % 360) + 360) % 360 / 360;
  const ss = s / 100;
  const ll = l / 100;
  let r: number;
  let g: number;
  let b: number;
  if (ss === 0) {
    r = g = b = ll;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      let tt = t;
      if (tt < 0) tt += 1;
      if (tt > 1) tt -= 1;
      if (tt < 1 / 6) return p + (q - p) * 6 * tt;
      if (tt < 1 / 2) return q;
      if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
      return p;
    };
    const q = ll < 0.5 ? ll * (1 + ss) : ll + ss - ll * ss;
    const p = 2 * ll - q;
    r = hue2rgb(p, q, hh + 1 / 3);
    g = hue2rgb(p, q, hh);
    b = hue2rgb(p, q, hh - 1 / 3);
  }
  const toHex = (x: number) => Math.round(x * 255).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/** Rampe de sous-tons (clair → foncé) autour de la teinte/saturation d'une couleur donnée. */
export function shadesOf(hex: string, count = 7): string[] {
  const clean = /^#[0-9a-fA-F]{6}$/.test(hex) ? hex : "#888888";
  const { h, s } = hexToHsl(clean);
  const shades: string[] = [];
  for (let i = 0; i < count; i++) {
    const l = 10 + (i / (count - 1)) * 78;
    shades.push(hslToHex(h, Math.max(s, 35), l));
  }
  return shades;
}

/* ============================================================
   Helpers recoloration SVG
   ============================================================ */

export function normHexLoose(h: string): string | null {
  const s = h.trim().toLowerCase();
  if (/^#[0-9a-f]{3}$/.test(s)) return "#" + s.slice(1).split("").map((c) => c + c).join("");
  if (/^#[0-9a-f]{6}$/.test(s)) return s;
  const m = s.match(/^rgb\(\s*(\d+)\D+(\d+)\D+(\d+)\s*\)$/);
  if (m) return "#" + [1, 2, 3].map((i) => (+m[i]).toString(16).padStart(2, "0")).join("");
  return null;
}

export interface DetectedColor {
  hex: string;
  raws: string[];
}

export interface MotifLibItem {
  filename: string;
  label: string;
  content: string;
}

export function hexToRgb(hex: string): [number, number, number] {
  return [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
}
export function colorDist(a: string, b: string): number {
  const [r1, g1, b1] = hexToRgb(a);
  const [r2, g2, b2] = hexToRgb(b);
  return Math.sqrt((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2);
}

/**
 * Regroupe les teintes quasi identiques (bruit d'anti-aliasing / export
 * Illustrator, ex. #f5b6d3 vs #f4b5d3) et plafonne à `maxColors` lignes :
 * au-delà, les couleurs les moins fréquentes rejoignent le cluster le plus
 * proche même hors seuil, pour ne jamais dépasser le maximum.
 */
export function mergeColors(colors: (DetectedColor & { count: number })[], maxColors: number): DetectedColor[] {
  if (colors.length <= maxColors) return colors.map(({ hex, raws }) => ({ hex, raws }));
  const MERGE_THRESHOLD = 40;
  const sorted = [...colors].sort((a, b) => b.count - a.count);
  const clusters: (DetectedColor & { count: number })[] = [];
  for (const c of sorted) {
    let best: { cluster: (typeof clusters)[number]; dist: number } | null = null;
    for (const cl of clusters) {
      const d = colorDist(c.hex, cl.hex);
      if (!best || d < best.dist) best = { cluster: cl, dist: d };
    }
    if (best && (best.dist <= MERGE_THRESHOLD || clusters.length >= maxColors)) {
      best.cluster.raws.push(...c.raws);
      best.cluster.count += c.count;
    } else {
      clusters.push({ hex: c.hex, raws: [...c.raws], count: c.count });
    }
  }
  return clusters.map(({ hex, raws }) => ({ hex, raws }));
}

/** Détecte les couleurs d'un SVG, regroupées et plafonnées à 4 (cf. mergeColors). */
export function detectColors(svg: string): DetectedColor[] {
  const raws = svg.match(/#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b|rgb\([^)]*\)/g) || [];
  const map: Record<string, { raws: Set<string>; count: number }> = {};
  raws.forEach((r) => {
    const n = normHexLoose(r);
    if (!n) return;
    if (!map[n]) map[n] = { raws: new Set(), count: 0 };
    map[n].raws.add(r);
    map[n].count += 1;
  });
  const all = Object.keys(map).map((hex) => ({ hex, raws: [...map[hex].raws], count: map[hex].count }));
  return mergeColors(all, 4);
}

/** Sanitisation minimale avant injection DOM : retire scripts, handlers on*, javascript:. */
export function sanitizeSvg(svg: string): string {
  return svg
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/\son\w+\s*=\s*"[^"]*"/gi, "")
    .replace(/\son\w+\s*=\s*'[^']*'/gi, "")
    .replace(/(xlink:href|href)\s*=\s*(["'])\s*javascript:[^"']*\2/gi, "");
}

/**
 * Rend les `id` d'un SVG uniques (suffixe namespace) avant de l'afficher
 * côte à côte avec d'autres SVG dans le même DOM. Les exports Illustrator
 * réutilisent des id génériques ("clippath", "Calque_1"…) — sans ça,
 * `url(#clippath)` de la 2e vignette pointerait vers le clipPath de la 1ère.
 */
export function namespaceSvgIds(svg: string, ns: string): string {
  const ids = new Set<string>();
  const idRe = /\bid="([^"]+)"/g;
  let m: RegExpExecArray | null;
  while ((m = idRe.exec(svg))) ids.add(m[1]);
  let out = svg;
  ids.forEach((id) => {
    const esc = id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    out = out
      .replace(new RegExp(`id="${esc}"`, "g"), `id="${id}--${ns}"`)
      .replace(new RegExp(`url\\(#${esc}\\)`, "g"), `url(#${id}--${ns})`)
      .replace(new RegExp(`(xlink:href|href)="#${esc}"`, "g"), `$1="#${id}--${ns}"`);
  });
  return out;
}

export function recolorSvg(svg: string, originals: DetectedColor[], colorMap: Record<string, string | null>) {
  let out = svg;
  originals.forEach((o, i) => {
    o.raws.forEach((r) => {
      out = out.split(r).join(`§§${i}§§`);
    });
  });
  originals.forEach((o, i) => {
    const tgt = colorMap[o.hex] || o.hex;
    out = out.split(`§§${i}§§`).join(tgt);
  });
  return out;
}

/**
 * Prépare un SVG pour l'aperçu : garantit un viewBox ET un width/height
 * explicites (repris du viewBox). Un <svg> sans taille intrinsèque, affiché
 * dans un conteneur flex centré dimensionné seulement en max-width/max-height,
 * s'effondre à 0×0 dans Chrome — vérifié en reproduisant le bug en isolation.
 */
export function forPreview(svg: string): string {
  const vb = svg.match(/viewBox\s*=\s*["']([^"']+)["']/i);
  let w: string | null = null;
  let h: string | null = null;
  if (vb) {
    const p = vb[1].split(/[\s,]+/).map(Number);
    if (p.length === 4 && p[2] > 0) {
      w = String(p[2]);
      h = String(p[3]);
    }
  }
  if (!w || !h) {
    const wm = svg.match(/width\s*=\s*["']([\d.]+)/i);
    const hm = svg.match(/height\s*=\s*["']([\d.]+)/i);
    if (wm && hm) {
      w = wm[1];
      h = hm[1];
    }
  }
  let out = svg.replace(/(<svg[^>]*?)\swidth\s*=\s*["'][^"']*["']/i, "$1");
  out = out.replace(/(<svg[^>]*?)\sheight\s*=\s*["'][^"']*["']/i, "$1");
  const hasViewBox = /viewBox\s*=\s*["'][^"']+["']/i.test(out);
  if (!hasViewBox && w && h) out = out.replace(/<svg/i, `<svg viewBox="0 0 ${w} ${h}"`);
  if (w && h) out = out.replace(/<svg/i, `<svg width="${w}" height="${h}"`);
  return out;
}

export function svgDims(svg: string): { w: number; h: number } {
  const vb = svg.match(/viewBox\s*=\s*["']([^"']+)["']/i);
  if (vb) {
    const p = vb[1].split(/[\s,]+/).map(Number);
    if (p.length === 4 && p[2] > 0) return { w: p[2], h: p[3] };
  }
  const w = svg.match(/width\s*=\s*["']([\d.]+)/i);
  const h = svg.match(/height\s*=\s*["']([\d.]+)/i);
  if (w && h) return { w: +w[1], h: +h[1] };
  return { w: 1080, h: 1080 };
}

/** Vrai si un <rect> proche du début du document couvre déjà ~tout le viewBox (fond existant). */
export function hasFullBleedBackground(svg: string, vbW: number, vbH: number): boolean {
  const rect = svg.match(/<rect[^>]*\/?>/i);
  if (!rect) return false;
  const w = rect[0].match(/width\s*=\s*["']([\d.]+)/i);
  const h = rect[0].match(/height\s*=\s*["']([\d.]+)/i);
  if (!w || !h) return false;
  return +w[1] >= vbW * 0.9 && +h[1] >= vbH * 0.9;
}

/**
 * Certains motifs (silhouettes isolées comme Tourbillon, Oiseau, Bulle…) n'ont
 * aucun fond dans le fichier source — juste la forme, sur fond transparent.
 * On injecte un rect de fond par défaut pour qu'il devienne une couleur
 * détectée/éditable comme le reste, au lieu de rester invisible et fixe.
 */
export function ensureBackground(svg: string, defaultColor: string): string {
  const { w, h } = svgDims(svg);
  if (hasFullBleedBackground(svg, w, h)) return svg;
  return svg.replace(/(<svg[^>]*>)/i, `$1<rect width="${w}" height="${h}" fill="${defaultColor}"/>`);
}

/**
 * Recadre un motif signature (dimensions natives fixes) dans un format cible,
 * façon "cover" CSS : mise à l'échelle centrée, débord ignoré (le viewBox du
 * nouveau <svg> racine coupe automatiquement ce qui dépasse).
 *
 * Important : on reprend TOUTES les déclarations xmlns du <svg> d'origine
 * (ex. xmlns:xlink, requis par les <use xlink:href="#..."> des exports
 * Illustrator). Sans ça le XML redevient invalide (préfixe non déclaré) et
 * échoue silencieusement au chargement via <img src> — donc au rasterisage
 * PNG : le bouton "Télécharger PNG" ne produisait plus rien.
 */
export function fitToFormat(svg: string, targetW: number, targetH: number): string {
  const { w: sw, h: sh } = svgDims(svg);
  const scale = Math.max(targetW / sw, targetH / sh);
  const tx = (targetW - sw * scale) / 2;
  const ty = (targetH - sh * scale) / 2;
  const openTag = svg.match(/<svg([^>]*)>/i);
  const nsDecls = openTag ? openTag[1].match(/\sxmlns(?::\w+)?="[^"]*"/gi) || [] : [];
  const xmlns = nsDecls.length > 0 ? nsDecls.join("") : ' xmlns="http://www.w3.org/2000/svg"';
  const match = svg.match(/<svg[^>]*>([\s\S]*)<\/svg>/i);
  const inner = match ? match[1] : svg;
  return `<svg${xmlns} viewBox="0 0 ${targetW} ${targetH}" width="${targetW}" height="${targetH}"><g transform="translate(${f(tx)} ${f(ty)}) scale(${f(scale)})">${inner}</g></svg>`;
}

/* ============================================================
   Téléchargement
   ============================================================ */

export function triggerDownload(href: string, name: string) {
  const a = document.createElement("a");
  a.href = href;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export function downloadSvg(svg: string, filename: string) {
  const blob = new Blob([svg], { type: "image/svg+xml" });
  triggerDownload(URL.createObjectURL(blob), filename);
}

export function downloadPngFromSvg(svg: string, w: number, h: number, filename: string) {
  const blob = new Blob([svg], { type: "image/svg+xml" });
  const url = URL.createObjectURL(blob);
  const img = new Image();
  img.onload = () => {
    const cv = document.createElement("canvas");
    cv.width = w;
    cv.height = h;
    cv.getContext("2d")?.drawImage(img, 0, 0, w, h);
    URL.revokeObjectURL(url);
    cv.toBlob((bb) => bb && triggerDownload(URL.createObjectURL(bb), filename), "image/png");
  };
  img.src = url;
}

/**
 * Charge un SVG (string) dans un <img> et le dessine dans un contexte canvas
 * déjà ouvert — utilisé pour composer un fond en première couche d'un rendu
 * canvas plus riche (cf. lib/avis-card.ts), plutôt que pour exporter seul.
 */
export function drawSvgIntoCanvas(
  ctx: CanvasRenderingContext2D,
  svg: string,
  x: number,
  y: number,
  w: number,
  h: number
): Promise<void> {
  return new Promise((resolve, reject) => {
    const blob = new Blob([svg], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, x, y, w, h);
      URL.revokeObjectURL(url);
      resolve();
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Impossible de charger le SVG du fond"));
    };
    img.src = url;
  });
}
