"use client";

/**
 * Fonds — Atelier Social.
 *
 * Deux usages :
 *  - "Générer un fond" : thématiques de motifs (rayures, pois, carreaux, cœurs,
 *    étoiles, fleurs, léopard, vagues…), chaque thématique proposant un
 *    déroulant de templates. Tout est procédural et déterministe (même tirage =
 *    même rendu), recolorable sur la palette du Hub.
 *  - "Recolorer un SVG" : colle un motif illustré (oiseau, tulipes, cœur-prénoms…)
 *    fourni en fichier — le moteur détecte ses couleurs et les remappe sur la palette.
 *
 * La palette (socle brand book + amplificateurs saisonniers propres à l'Atelier
 * Social, ex. kaki "Rentrée") est chargée depuis /api/social/palette —
 * cf. referentiels/social_palette.json.
 */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Palette as PaletteIcon,
  Shuffle,
  Download,
  Plus,
  X,
  Wand2,
  Layers,
} from "lucide-react";
import {
  type SocialPaletteRef,
  type Swatch,
  allSwatches,
  isValidHex,
} from "@/lib/social-palette";
import { cn } from "@/lib/utils";

/* ============================================================
   Constantes — formats
   ============================================================ */

type FormatId = "p45" | "sq" | "story" | "pinterest" | "p34";
interface FormatDef {
  id: FormatId;
  nm: string;
  sub: string;
  w: number;
  h: number;
}
const FORMATS: FormatDef[] = [
  { id: "p45", nm: "Post 4:5", sub: "1080×1350", w: 1080, h: 1350 },
  { id: "sq", nm: "Carré 1:1", sub: "1080×1080", w: 1080, h: 1080 },
  { id: "story", nm: "Story 9:16", sub: "1080×1920", w: 1080, h: 1920 },
  { id: "pinterest", nm: "Pinterest 2:3", sub: "1000×1500", w: 1000, h: 1500 },
  { id: "p34", nm: "Portrait 3:4", sub: "1080×1440", w: 1080, h: 1440 },
];

/* ============================================================
   Constantes — thématiques & templates
   ============================================================ */

type Role = "fond" | "motif" | "secondaire";
type SliderKind = "density" | "size";
const ROLE_LABEL: Record<Role, string> = { fond: "Fond", motif: "Motif", secondaire: "Secondaire" };

interface TemplateDef {
  id: string;
  nm: string;
  roles: Role[];
  seeded: boolean;
  sliders: SliderKind[];
  /** Si présent : template = vrai fichier de assets/motifs-fonds-svg/ (recoloration par détection, pas de rôles). */
  asset?: string;
}
interface CategoryDef {
  id: string;
  nm: string;
  templates: TemplateDef[];
}

/** Template basé sur un fichier réel de la bibliothèque — pas de rôles/sliders, recoloration par détection. */
function assetTemplate(id: string, nm: string, filename: string): TemplateDef {
  return { id, nm, roles: [], seeded: false, sliders: [], asset: filename };
}

const CATEGORIES: CategoryDef[] = [
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

/** Palette de secours affichée le temps que /api/social/palette réponde. */
const FALLBACK_PALETTE: SocialPaletteRef = {
  _meta: { schema_version: 1, referentiel: "social_palette", description: "" },
  socle: [
    { id: "marine", nom: "Marine", hex: "#16324C", role: "dominante" },
    { id: "teal", nom: "Teal", hex: "#1E6E77", role: "primaire" },
    { id: "creme", nom: "Crème", hex: "#F4EEE2", role: "fond" },
    { id: "terracotta", nom: "Terracotta", hex: "#A75F59", role: "accent" },
  ],
  saisonnier_officiel: [
    { id: "rouge", nom: "Rouge", hex: "#C23A2D" },
    { id: "blush", nom: "Blush", hex: "#F4B4D2" },
    { id: "sauge", nom: "Sauge", hex: "#9CAE92" },
    { id: "ambre", nom: "Ocre / Ambre", hex: "#D98A3D" },
    { id: "moutarde", nom: "Moutarde", hex: "#C9A227" },
    { id: "bleu_paon", nom: "Bleu paon", hex: "#2E6E8E" },
    { id: "bordeaux", nom: "Bordeaux", hex: "#7E2F3B" },
  ],
  amplificateurs: [],
};

/* ============================================================
   Helpers génériques
   ============================================================ */

const f = (n: number) => Math.round(n * 100) / 100;

function mulberry32(a: number) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Poisson-disc (Bridson) — points jamais plus proches que minDist, répartition franche. */
function poissonDisc(W: number, H: number, minDist: number, rnd: () => number, k = 30) {
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
function squiggleCol(x: number, H: number, amp: number, wavelength: number, phase: number, color: string, strokeWidth: number) {
  let d = "";
  for (let y = -strokeWidth; y <= H + strokeWidth; y += 8) {
    const xx = x + Math.sin((y / wavelength) * Math.PI * 2 + phase) * amp;
    d += `${y === -strokeWidth ? "M" : "L"} ${f(xx)} ${f(y)} `;
  }
  return `<path d="${d}" fill="none" stroke="${color}" stroke-width="${f(strokeWidth)}" stroke-linecap="round"/>`;
}

interface GeneratorState {
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

function buildGeneratorSVG(st: GeneratorState) {
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

function hexToHsl(hex: string): { h: number; s: number; l: number } {
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

function hslToHex(h: number, s: number, l: number): string {
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
function shadesOf(hex: string, count = 7): string[] {
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

function normHexLoose(h: string): string | null {
  const s = h.trim().toLowerCase();
  if (/^#[0-9a-f]{3}$/.test(s)) return "#" + s.slice(1).split("").map((c) => c + c).join("");
  if (/^#[0-9a-f]{6}$/.test(s)) return s;
  const m = s.match(/^rgb\(\s*(\d+)\D+(\d+)\D+(\d+)\s*\)$/);
  if (m) return "#" + [1, 2, 3].map((i) => (+m[i]).toString(16).padStart(2, "0")).join("");
  return null;
}

interface DetectedColor {
  hex: string;
  raws: string[];
}

interface MotifLibItem {
  filename: string;
  label: string;
  content: string;
}

function hexToRgb(hex: string): [number, number, number] {
  return [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
}
function colorDist(a: string, b: string): number {
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
function mergeColors(colors: (DetectedColor & { count: number })[], maxColors: number): DetectedColor[] {
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
function detectColors(svg: string): DetectedColor[] {
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
function sanitizeSvg(svg: string): string {
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
function namespaceSvgIds(svg: string, ns: string): string {
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

function recolorSvg(svg: string, originals: DetectedColor[], colorMap: Record<string, string | null>) {
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
function forPreview(svg: string): string {
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

function svgDims(svg: string): { w: number; h: number } {
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
function hasFullBleedBackground(svg: string, vbW: number, vbH: number): boolean {
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
function ensureBackground(svg: string, defaultColor: string): string {
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
function fitToFormat(svg: string, targetW: number, targetH: number): string {
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

function triggerDownload(href: string, name: string) {
  const a = document.createElement("a");
  a.href = href;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

function downloadSvg(svg: string, filename: string) {
  const blob = new Blob([svg], { type: "image/svg+xml" });
  triggerDownload(URL.createObjectURL(blob), filename);
}

function downloadPngFromSvg(svg: string, w: number, h: number, filename: string) {
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

/* ============================================================
   Composant
   ============================================================ */

const SAMPLE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 500">
  <rect width="400" height="500" fill="#F4EEE2"/>
  <g fill="none" stroke="#16324C" stroke-width="16">
    <circle cx="200" cy="180" r="74"/>
    <circle cx="274" cy="254" r="74"/>
    <circle cx="200" cy="328" r="74"/>
    <circle cx="126" cy="254" r="74"/>
  </g>
  <path d="M200 452 l-2-1.8C176 432 160 420 160 398 c0-14 11-24 24-24 8 0 15 4 16 10 1-6 8-10 16-10 13 0 24 10 24 24 0 22-16 34-40 52z" fill="#A75F59"/>
</svg>`;

function SwatchButton({
  hex,
  label,
  selected,
  onClick,
}: {
  hex: string;
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      className={cn(
        "w-6 h-6 rounded-md shrink-0 transition-all shadow-[inset_0_0_0_1px_rgba(0,0,0,0.1)]",
        selected ? "ring-2 ring-offset-1 ring-brand-text scale-105" : "hover:scale-110"
      )}
      style={{ background: hex }}
    />
  );
}

/**
 * Mini-picker de couleur libre : roue native + hex tapé + rampe de sous-tons
 * (mêmes teinte/saturation, luminosité variable) générée en direct.
 */
function CustomColorPicker({ initial, onApply }: { initial: string; onApply: (hex: string) => void }) {
  const [color, setColor] = useState(/^#[0-9a-fA-F]{6}$/.test(initial) ? initial : "#8899aa");
  const shades = useMemo(() => shadesOf(color, 7), [color]);
  return (
    <div className="mt-1.5 p-2 rounded-lg bg-brand-bg/60 border border-brand-muted/15 space-y-1.5">
      <div className="flex items-center gap-1.5">
        <input
          type="color"
          value={color}
          onChange={(e) => setColor(e.target.value)}
          className="w-7 h-7 rounded-md border border-brand-muted/20 cursor-pointer shrink-0"
        />
        <input
          value={color}
          onChange={(e) => setColor(e.target.value)}
          className="flex-1 min-w-0 text-[10px] font-mono p-1.5 rounded-md border border-brand-muted/20 bg-white focus:outline-none focus:ring-1 focus:ring-brand-rose/50"
        />
        <button
          type="button"
          onClick={() => onApply(color)}
          className="text-[10px] font-semibold px-2 py-1.5 rounded-md bg-brand-text text-brand-bg shrink-0 hover:opacity-80"
        >
          Appliquer
        </button>
      </div>
      <div className="flex items-center gap-1">
        <span className="text-[9px] text-brand-muted shrink-0">Sous-tons</span>
        {shades.map((s, i) => (
          <button
            key={i}
            type="button"
            onClick={() => onApply(s)}
            title={s}
            className="w-5 h-5 rounded shrink-0 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.1)] hover:scale-110 transition-transform"
            style={{ background: s }}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * Liste "couleur détectée → remappe sur la palette (ou garde l'originale)".
 * Partagée entre l'onglet Recolorer et les templates "asset" du générateur.
 * "+" ouvre un picker libre (couleur exacte ou sous-ton) pour la ligne.
 */
function ColorRemapRows({
  originals,
  colorMap,
  swatches,
  onPick,
  onKeep,
}: {
  originals: DetectedColor[];
  colorMap: Record<string, string | null>;
  swatches: Swatch[];
  onPick: (hex: string, target: string) => void;
  onKeep: (hex: string) => void;
}) {
  const [openHex, setOpenHex] = useState<string | null>(null);
  if (originals.length === 0) {
    return (
      <p className="text-xs text-brand-muted">
        Aucune couleur détectée. Vérifie que le SVG utilise des aplats (hex ou rgb).
      </p>
    );
  }
  return (
    <div className="space-y-2">
      {originals.map((o) => (
        <div key={o.hex}>
          <div className="flex items-center gap-2">
            <div
              className="w-6 h-6 rounded-md shrink-0 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.12)]"
              style={{ background: o.hex }}
              title={o.hex}
            />
            <span className="text-[10px] text-brand-muted font-mono w-14 shrink-0">{o.hex}</span>
            <div className="flex flex-wrap gap-1 flex-1 items-center">
              {swatches.map((s) => (
                <SwatchButton
                  key={s.id}
                  hex={s.hex}
                  label={s.nom}
                  selected={(colorMap[o.hex] || "").toLowerCase() === s.hex.toLowerCase()}
                  onClick={() => onPick(o.hex, s.hex)}
                />
              ))}
              <button
                type="button"
                onClick={() => onKeep(o.hex)}
                title="Garder la couleur d'origine"
                className={cn(
                  "w-6 h-6 rounded-md shrink-0 flex items-center justify-center text-[9px] font-bold border",
                  !colorMap[o.hex]
                    ? "border-brand-text bg-brand-bg text-brand-text"
                    : "border-brand-muted/20 text-brand-muted bg-brand-bg/40"
                )}
              >
                =
              </button>
              <button
                type="button"
                onClick={() => setOpenHex((cur) => (cur === o.hex ? null : o.hex))}
                title="Couleur personnalisée / sous-tons"
                className={cn(
                  "w-6 h-6 rounded-md shrink-0 flex items-center justify-center border border-dashed transition-all",
                  openHex === o.hex
                    ? "border-brand-text text-brand-text bg-brand-bg"
                    : "border-brand-muted/40 text-brand-muted hover:border-brand-text hover:text-brand-text"
                )}
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>
          </div>
          {openHex === o.hex && (
            <CustomColorPicker
              initial={colorMap[o.hex] || o.hex}
              onApply={(hex) => onPick(o.hex, hex)}
            />
          )}
        </div>
      ))}
    </div>
  );
}

export default function FondsPage() {
  const [tab, setTab] = useState<"generate" | "recolor">("generate");
  const [palette, setPalette] = useState<SocialPaletteRef>(FALLBACK_PALETTE);
  const [paletteLoaded, setPaletteLoaded] = useState(false);

  const refreshPalette = () => {
    fetch("/api/social/palette", { cache: "no-store" })
      .then((r) => r.json())
      .then((res) => {
        if (res.ok) {
          setPalette(res.data as SocialPaletteRef);
          setPaletteLoaded(true);
        }
      })
      .catch(() => undefined);
  };
  useEffect(refreshPalette, []);

  const swatches = useMemo(() => allSwatches(palette), [palette]);

  // --- Générateur ---
  const [gen, setGen] = useState<GeneratorState>({
    categoryId: "pois",
    templateId: "disperse",
    fond: "#F4EEE2",
    motif: "#16324C",
    secondaire: "#A75F59",
    density: 52,
    size: 60,
    seed: 1,
    format: "p45",
  });
  const [customRoleOpen, setCustomRoleOpen] = useState<Role | null>(null);
  const activeCategory = CATEGORIES.find((c) => c.id === gen.categoryId) ?? CATEGORIES[0];
  const activeTemplate =
    activeCategory.templates.find((t) => t.id === gen.templateId) ?? activeCategory.templates[0];
  const fmt = FORMATS.find((x) => x.id === gen.format)!;
  const genSvg = useMemo(() => buildGeneratorSVG(gen), [gen]);

  const selectCategory = (catId: string) => {
    const cat = CATEGORIES.find((c) => c.id === catId);
    if (!cat) return;
    setGen((g) => ({ ...g, categoryId: catId, templateId: cat.templates[0].id }));
  };

  // --- Recoloration (partagée : onglet "Recolorer un SVG" + templates "asset" du générateur) ---
  const [svgInput, setSvgInput] = useState(SAMPLE_SVG);
  const [originals, setOriginals] = useState<DetectedColor[]>(detectColors(SAMPLE_SVG));
  const [colorMap, setColorMap] = useState<Record<string, string | null>>({});
  // Nom du fichier bibliothèque actuellement chargé (pour nommer l'export) — null si contenu tapé/collé à la main.
  const [loadedFilename, setLoadedFilename] = useState<string | null>(null);

  // Bibliothèque de motifs (assets/motifs-fonds-svg/) — chargée une fois au montage,
  // nécessaire aussi bien pour l'onglet Recolorer que pour les templates "asset" du générateur.
  const [motifsLib, setMotifsLib] = useState<MotifLibItem[]>([]);
  const [motifsLoaded, setMotifsLoaded] = useState(false);
  useEffect(() => {
    fetch("/api/social/motifs-fonds", { cache: "no-store" })
      .then((r) => r.json())
      .then((res) => {
        if (res.ok) {
          setMotifsLib(res.data as MotifLibItem[]);
          setMotifsLoaded(true);
        }
      })
      .catch(() => undefined);
  }, []);

  /**
   * Charge un contenu SVG dans le moteur de recoloration, immédiatement (sans
   * debounce) — utilisé au clic sur une vignette ou à la sélection d'un
   * template "asset". setState fonctionnel : jamais de closure périmée sur
   * colorMap, donc pas de race condition avec le debounce de la textarea.
   */
  const loadMotifIntoRecolor = (rawContent: string, filename?: string) => {
    // Fond synthétique si le fichier n'en a pas (silhouettes isolées type
    // Tourbillon/Oiseau/Bulle) — pour que le fond devienne éditable aussi.
    const content = ensureBackground(rawContent, "#F4EEE2");
    setSvgInput(content);
    setLoadedFilename(filename ?? null);
    const found = detectColors(content);
    setOriginals(found);
    setColorMap((prev) => {
      const nm: Record<string, string | null> = {};
      found.forEach((o) => (nm[o.hex] = prev[o.hex] ?? null));
      return nm;
    });
  };

  useEffect(() => {
    const t = setTimeout(() => {
      const found = detectColors(svgInput);
      setOriginals(found);
      setColorMap((prev) => {
        const nm: Record<string, string | null> = {};
        found.forEach((o) => (nm[o.hex] = prev[o.hex] ?? null));
        return nm;
      });
    }, 300);
    return () => clearTimeout(t);
  }, [svgInput]);

  // Un template "asset" est sélectionné dans le générateur → on charge le
  // fichier correspondant dans le même moteur de recoloration que l'onglet dédié.
  useEffect(() => {
    if (tab !== "generate" || !activeTemplate.asset) return;
    const item = motifsLib.find((m) => m.filename === activeTemplate.asset);
    if (item) loadMotifIntoRecolor(item.content, item.filename);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, activeTemplate.asset, motifsLib]);

  const cleanedInput = useMemo(() => sanitizeSvg(svgInput), [svgInput]);
  const recoloredSvg = useMemo(
    () => recolorSvg(cleanedInput, originals, colorMap),
    [cleanedInput, originals, colorMap]
  );
  const recoloredDims = useMemo(() => svgDims(recoloredSvg), [recoloredSvg]);

  // Template "asset" choisi dans le générateur : on recadre au format choisi.
  // Onglet Recolorer (paste libre) : export tel quel, à sa taille native.
  const assetInGenerator = tab === "generate" && !!activeTemplate.asset;
  const assetOutput = useMemo(
    () => (assetInGenerator ? fitToFormat(recoloredSvg, fmt.w, fmt.h) : recoloredSvg),
    [assetInGenerator, recoloredSvg, fmt.w, fmt.h]
  );
  const assetOutputDims = assetInGenerator ? { w: fmt.w, h: fmt.h } : recoloredDims;
  const assetPreview = useMemo(
    () => forPreview(namespaceSvgIds(assetOutput, "stage")),
    [assetOutput]
  );

  // --- Amplificateurs (ajout / suppression) ---
  const [ampOpen, setAmpOpen] = useState(false);
  const [ampNom, setAmpNom] = useState("");
  const [ampHex, setAmpHex] = useState("#6B6B47");
  const [ampOccasion, setAmpOccasion] = useState("");
  const [ampSaving, setAmpSaving] = useState(false);
  const [ampError, setAmpError] = useState<string | null>(null);

  const submitAmplificateur = async () => {
    setAmpError(null);
    if (!ampNom.trim()) {
      setAmpError("Nom requis.");
      return;
    }
    if (!isValidHex(ampHex)) {
      setAmpError("Hex invalide.");
      return;
    }
    setAmpSaving(true);
    try {
      const res = await fetch("/api/social/palette", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nom: ampNom.trim(), hex: ampHex, occasion: ampOccasion.trim() || undefined }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Échec de l'ajout");
      refreshPalette();
      setAmpNom("");
      setAmpOccasion("");
      setAmpOpen(false);
    } catch (e) {
      setAmpError(e instanceof Error ? e.message : "Échec de l'ajout");
    } finally {
      setAmpSaving(false);
    }
  };

  const deleteAmplificateur = async (id: string) => {
    await fetch(`/api/social/palette?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    refreshPalette();
  };

  /* ---------- UI helpers ---------- */

  function PaletteGroup({ title, items }: { title: string; items: Swatch[] }) {
    if (items.length === 0) return null;
    return (
      <div className="mb-2.5 last:mb-0">
        <div className="text-[10px] uppercase tracking-wider text-brand-muted font-semibold mb-1.5">
          {title}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {items.map((s) => (
            <div key={s.id} className="group relative">
              <div
                className="w-6 h-6 rounded-md shadow-[inset_0_0_0_1px_rgba(0,0,0,0.1)]"
                style={{ background: s.hex }}
                title={`${s.nom} · ${s.hex}`}
              />
              {s.group === "amplificateur" && (
                <button
                  type="button"
                  onClick={() => deleteAmplificateur(s.id)}
                  className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 rounded-full bg-white border border-brand-muted/30 text-brand-muted hover:text-brand-rouge hover:border-brand-rouge/40 items-center justify-center hidden group-hover:flex"
                  title={`Supprimer ${s.nom}`}
                >
                  <X className="w-2 h-2" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Vrai si l'aperçu/export doit passer par le moteur de recoloration plutôt
  // que par buildGeneratorSVG : onglet Recolorer, ou template "asset" actif.
  const isAssetActive = tab === "recolor" || assetInGenerator;
  const exportBaseName = (loadedFilename ?? "motif-recolore").replace(/\.svg$/i, "");

  return (
    <div className="min-h-screen bg-brand-bg text-brand-text font-sans">
      <header className="h-14 w-full bg-white/80 backdrop-blur-md border-b border-brand-muted/10 sticky top-0 z-20">
        <div className="max-w-[1400px] mx-auto px-6 h-full flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/social"
              className="flex items-center gap-1.5 text-xs font-semibold text-brand-muted hover:text-brand-text transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Atelier Social
            </Link>
            <div className="w-px h-4 bg-brand-muted/20" />
            <h1
              style={{
                fontFamily: "var(--font-editorial)",
                fontSize: 20,
                fontWeight: 500,
                letterSpacing: "-0.01em",
                color: "var(--hub-foreground)",
                margin: 0,
              }}
            >
              Fonds
            </h1>
          </div>
          <div className="flex items-center bg-brand-muted/10 rounded-full p-0.5 border border-brand-muted/15">
            <button
              type="button"
              onClick={() => setTab("generate")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all",
                tab === "generate" ? "bg-white text-brand-rose shadow-sm" : "text-brand-muted hover:text-brand-text"
              )}
            >
              <Layers className="w-3.5 h-3.5" />
              Générer un fond
            </button>
            <button
              type="button"
              onClick={() => setTab("recolor")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all",
                tab === "recolor" ? "bg-white text-brand-rose shadow-sm" : "text-brand-muted hover:text-brand-text"
              )}
            >
              <Wand2 className="w-3.5 h-3.5" />
              Recolorer un SVG
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-[1400px] mx-auto px-6 py-6">
        <div className="grid grid-cols-12 gap-5">
          {/* COLONNE CONFIG */}
          <div className="col-span-12 lg:col-span-4 space-y-4">
            {/* Palette (partagée entre les 2 modes) */}
            <div className="bg-white border border-brand-muted/15 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-2.5">
                <div className="text-[11px] uppercase tracking-wider text-brand-muted font-semibold flex items-center gap-1.5">
                  <PaletteIcon className="w-3.5 h-3.5" />
                  Palette
                </div>
                <button
                  type="button"
                  onClick={() => setAmpOpen((o) => !o)}
                  className="flex items-center gap-1 text-[11px] font-semibold text-brand-rose hover:opacity-70"
                >
                  <Plus className="w-3 h-3" />
                  Amplificateur
                </button>
              </div>

              <PaletteGroup title="Socle brand book" items={swatches.filter((s) => s.group === "socle")} />
              <PaletteGroup
                title="Saisonnier officiel"
                items={swatches.filter((s) => s.group === "saisonnier")}
              />
              <PaletteGroup
                title="Mes amplificateurs (atelier social)"
                items={swatches.filter((s) => s.group === "amplificateur")}
              />
              {!paletteLoaded && (
                <p className="text-[10px] text-brand-muted italic mt-1">Chargement de la palette…</p>
              )}

              {ampOpen && (
                <div className="mt-3 pt-3 border-t border-brand-muted/15 space-y-2">
                  <p className="text-[10px] text-brand-muted leading-snug">
                    Une couleur saisonnière propre à l&apos;atelier social (ex. kaki pour la rentrée) —
                    pas remontée au brand book, juste gardée ici pour régénérer une série de posts.
                  </p>
                  <input
                    value={ampNom}
                    onChange={(e) => setAmpNom(e.target.value)}
                    placeholder="Nom — ex. Rentrée · Kaki"
                    className="w-full p-2 rounded-lg border border-brand-muted/20 bg-white text-xs focus:outline-none focus:ring-1 focus:ring-brand-rose/50"
                  />
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={ampHex}
                      onChange={(e) => setAmpHex(e.target.value)}
                      className="w-9 h-9 rounded-lg border border-brand-muted/20 shrink-0 cursor-pointer"
                    />
                    <input
                      value={ampHex}
                      onChange={(e) => setAmpHex(e.target.value)}
                      placeholder="#6B6B47"
                      className="flex-1 p-2 rounded-lg border border-brand-muted/20 bg-white text-xs font-mono focus:outline-none focus:ring-1 focus:ring-brand-rose/50"
                    />
                  </div>
                  <input
                    value={ampOccasion}
                    onChange={(e) => setAmpOccasion(e.target.value)}
                    placeholder="Occasion — optionnel (ex. rentree_scolaire)"
                    className="w-full p-2 rounded-lg border border-brand-muted/20 bg-white text-xs focus:outline-none focus:ring-1 focus:ring-brand-rose/50"
                  />
                  {ampError && <p className="text-[11px] text-brand-rouge">{ampError}</p>}
                  <button
                    type="button"
                    onClick={submitAmplificateur}
                    disabled={ampSaving}
                    className="w-full primary-button text-xs py-2 disabled:opacity-50"
                  >
                    {ampSaving ? "Ajout…" : "Ajouter à la palette"}
                  </button>
                </div>
              )}
            </div>

            {tab === "generate" ? (
              <>
                <div className="bg-white border border-brand-muted/15 rounded-2xl p-4">
                  <div className="text-[11px] uppercase tracking-wider text-brand-muted font-semibold mb-2.5">
                    Thématique
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {CATEGORIES.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => selectCategory(c.id)}
                        className={cn(
                          "py-2 rounded-lg text-xs font-semibold border transition-all",
                          gen.categoryId === c.id
                            ? "border-brand-text bg-brand-bg text-brand-text"
                            : "border-brand-muted/15 bg-brand-bg/40 text-brand-muted hover:border-brand-muted/30"
                        )}
                      >
                        {c.nm}
                      </button>
                    ))}
                  </div>

                  {activeCategory.templates.length > 1 && (
                    <div className="mt-2.5">
                      <div className="text-[10px] uppercase tracking-wider text-brand-muted font-semibold mb-1">
                        Template — {activeCategory.nm}
                      </div>
                      <select
                        value={gen.templateId}
                        onChange={(e) => setGen((g) => ({ ...g, templateId: e.target.value }))}
                        className="w-full p-2 rounded-lg border border-brand-muted/20 bg-white text-xs focus:outline-none focus:ring-1 focus:ring-brand-rose/50"
                      >
                        {activeCategory.templates.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.nm}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                <div className="bg-white border border-brand-muted/15 rounded-2xl p-4 space-y-3">
                  <div className="text-[11px] uppercase tracking-wider text-brand-muted font-semibold">
                    Couleurs du motif
                  </div>
                  {activeTemplate.asset ? (
                    <ColorRemapRows
                      originals={originals}
                      colorMap={colorMap}
                      swatches={swatches}
                      onPick={(hex, target) => setColorMap((m) => ({ ...m, [hex]: target }))}
                      onKeep={(hex) => setColorMap((m) => ({ ...m, [hex]: null }))}
                    />
                  ) : (
                    activeTemplate.roles.map((role) => (
                      <div key={role}>
                        <div className="text-[11px] font-semibold text-brand-text mb-1">
                          {ROLE_LABEL[role]}
                        </div>
                        <div className="flex flex-wrap gap-1.5 items-center">
                          {swatches.map((s) => (
                            <SwatchButton
                              key={s.id}
                              hex={s.hex}
                              label={s.nom}
                              selected={gen[role].toLowerCase() === s.hex.toLowerCase()}
                              onClick={() => setGen((g) => ({ ...g, [role]: s.hex }))}
                            />
                          ))}
                          <button
                            type="button"
                            onClick={() => setCustomRoleOpen((cur) => (cur === role ? null : role))}
                            title="Couleur personnalisée / sous-tons"
                            className={cn(
                              "w-6 h-6 rounded-md shrink-0 flex items-center justify-center border border-dashed transition-all",
                              customRoleOpen === role
                                ? "border-brand-text text-brand-text bg-brand-bg"
                                : "border-brand-muted/40 text-brand-muted hover:border-brand-text hover:text-brand-text"
                            )}
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                        {customRoleOpen === role && (
                          <CustomColorPicker
                            initial={gen[role]}
                            onApply={(hex) => setGen((g) => ({ ...g, [role]: hex }))}
                          />
                        )}
                      </div>
                    ))
                  )}
                </div>

                {!activeTemplate.asset && (activeTemplate.sliders.length > 0 || activeTemplate.seeded) && (
                  <div className="bg-white border border-brand-muted/15 rounded-2xl p-4 space-y-3">
                    <div className="text-[11px] uppercase tracking-wider text-brand-muted font-semibold">
                      Réglages
                    </div>
                    {activeTemplate.sliders.includes("density") && (
                      <div className="flex items-center justify-between gap-3">
                        <label className="text-xs font-semibold shrink-0">Densité</label>
                        <input
                          type="range"
                          min={0}
                          max={100}
                          value={gen.density}
                          onChange={(e) => setGen((g) => ({ ...g, density: +e.target.value }))}
                          className="flex-1 accent-brand-rose"
                        />
                        <span className="text-[11px] text-brand-muted tabular-nums w-7 text-right">
                          {gen.density}
                        </span>
                      </div>
                    )}
                    {activeTemplate.sliders.includes("size") && (
                      <div className="flex items-center justify-between gap-3">
                        <label className="text-xs font-semibold shrink-0">Taille</label>
                        <input
                          type="range"
                          min={0}
                          max={100}
                          value={gen.size}
                          onChange={(e) => setGen((g) => ({ ...g, size: +e.target.value }))}
                          className="flex-1 accent-brand-rose"
                        />
                        <span className="text-[11px] text-brand-muted tabular-nums w-7 text-right">
                          {gen.size}
                        </span>
                      </div>
                    )}
                    {activeTemplate.seeded && (
                      <div className="flex items-center justify-between gap-3 pt-1">
                        <label className="text-xs font-semibold shrink-0">Tirage</label>
                        <button
                          type="button"
                          onClick={() => setGen((g) => ({ ...g, seed: g.seed + 1 }))}
                          className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border border-brand-muted/20 hover:border-brand-text transition-all"
                        >
                          <Shuffle className="w-3 h-3" />
                          Nouveau
                        </button>
                        <span className="text-[11px] text-brand-muted tabular-nums">#{gen.seed}</span>
                      </div>
                    )}
                  </div>
                )}

                <div className="bg-white border border-brand-muted/15 rounded-2xl p-4">
                  <div className="text-[11px] uppercase tracking-wider text-brand-muted font-semibold mb-2.5">
                    Format
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {FORMATS.map((x) => (
                      <button
                        key={x.id}
                        type="button"
                        onClick={() => setGen((g) => ({ ...g, format: x.id }))}
                        className={cn(
                          "px-3 py-2 rounded-lg text-xs font-semibold border transition-all text-left",
                          gen.format === x.id
                            ? "border-brand-text bg-brand-bg text-brand-text"
                            : "border-brand-muted/15 bg-brand-bg/40 text-brand-muted hover:border-brand-muted/30"
                        )}
                      >
                        {x.nm}
                        <div className="text-[10px] font-normal opacity-70">{x.sub}</div>
                      </button>
                    ))}
                  </div>
                  {activeTemplate.asset && (
                    <p className="text-[10px] text-brand-muted italic mt-2">
                      Motif signature — recadré au centre pour remplir le format choisi.
                    </p>
                  )}
                </div>
              </>
            ) : (
              <>
                <div className="bg-white border border-brand-muted/15 rounded-2xl p-4">
                  <div className="text-[11px] uppercase tracking-wider text-brand-muted font-semibold mb-2.5">
                    Bibliothèque de motifs {motifsLoaded && `(${motifsLib.length})`}
                  </div>
                  {!motifsLoaded ? (
                    <p className="text-xs text-brand-muted italic">Chargement…</p>
                  ) : motifsLib.length === 0 ? (
                    <p className="text-xs text-brand-muted">
                      Aucun motif dans <code className="text-[10px]">assets/motifs-fonds-svg/</code>.
                    </p>
                  ) : (
                    <div className="grid grid-cols-4 gap-2 max-h-72 overflow-y-auto pr-1">
                      {motifsLib.map((m) => (
                        <button
                          key={m.filename}
                          type="button"
                          onClick={() => loadMotifIntoRecolor(m.content, m.filename)}
                          title={m.label}
                          className={cn(
                            "flex flex-col items-center gap-1 rounded-lg border p-1 transition-all",
                            svgInput === m.content
                              ? "border-brand-text bg-brand-bg"
                              : "border-brand-muted/15 bg-brand-bg/40 hover:border-brand-muted/40"
                          )}
                        >
                          <div
                            className="w-full aspect-square rounded-md overflow-hidden bg-white flex items-center justify-center [&>svg]:w-full [&>svg]:h-full [&>svg]:object-contain"
                            dangerouslySetInnerHTML={{
                              __html: forPreview(
                                namespaceSvgIds(sanitizeSvg(m.content), m.filename.replace(/[^a-zA-Z0-9]/g, "_"))
                              ),
                            }}
                          />
                          <span className="text-[9px] text-brand-muted text-center leading-tight line-clamp-1 w-full">
                            {m.label}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="bg-white border border-brand-muted/15 rounded-2xl p-4">
                  <div className="text-[11px] uppercase tracking-wider text-brand-muted font-semibold mb-2.5">
                    Colle ton SVG
                  </div>
                  <textarea
                    value={svgInput}
                    onChange={(e) => setSvgInput(e.target.value)}
                    spellCheck={false}
                    className="w-full h-32 font-mono text-[11px] rounded-lg border border-brand-muted/20 bg-brand-bg/40 p-3 resize-y focus:outline-none focus:ring-1 focus:ring-brand-rose/50"
                  />
                </div>

                <div className="bg-white border border-brand-muted/15 rounded-2xl p-4">
                  <div className="text-[11px] uppercase tracking-wider text-brand-muted font-semibold mb-2.5">
                    Couleurs détectées → remappe
                  </div>
                  <ColorRemapRows
                    originals={originals}
                    colorMap={colorMap}
                    swatches={swatches}
                    onPick={(hex, target) => setColorMap((m) => ({ ...m, [hex]: target }))}
                    onKeep={(hex) => setColorMap((m) => ({ ...m, [hex]: null }))}
                  />
                </div>
              </>
            )}
          </div>

          {/* STAGE */}
          <div className="col-span-12 lg:col-span-8">
            <div className="bg-[#efe7d7] rounded-2xl p-6 flex items-center justify-center min-h-[480px]">
              <div
                className="max-w-full max-h-[560px] [&>svg]:max-w-full [&>svg]:max-h-[560px] [&>svg]:h-auto [&>svg]:rounded-lg [&>svg]:shadow-[0_8px_30px_rgba(22,50,76,0.14)]"
                dangerouslySetInnerHTML={{
                  __html: isAssetActive ? assetPreview : genSvg,
                }}
              />
            </div>
            <div className="flex items-center justify-center gap-2.5 mt-4">
              <button
                type="button"
                onClick={() =>
                  isAssetActive
                    ? downloadPngFromSvg(
                        assetOutput,
                        assetOutputDims.w,
                        assetOutputDims.h,
                        `ypersoa_${exportBaseName}${assetInGenerator ? `_${fmt.id}` : ""}.png`
                      )
                    : downloadPngFromSvg(
                        genSvg,
                        fmt.w,
                        fmt.h,
                        `ypersoa_fond_${gen.categoryId}-${gen.templateId}_${fmt.id}.png`
                      )
                }
                className="primary-button flex items-center gap-2 text-sm"
              >
                <Download className="w-4 h-4" />
                Télécharger PNG
              </button>
              <button
                type="button"
                onClick={() =>
                  isAssetActive
                    ? downloadSvg(assetOutput, `ypersoa_${exportBaseName}${assetInGenerator ? `_${fmt.id}` : ""}.svg`)
                    : downloadSvg(genSvg, `ypersoa_fond_${gen.categoryId}-${gen.templateId}_${fmt.id}.svg`)
                }
                className="flex items-center gap-2 text-sm font-semibold text-brand-text border border-brand-text/60 rounded-full px-5 py-3 hover:bg-brand-text hover:text-brand-bg transition-all"
              >
                Télécharger SVG
              </button>
            </div>
            <p className="text-center text-[11px] text-brand-muted mt-3 max-w-[52ch] mx-auto">
              Vectoriel · couleurs exactes de ta palette · déterministe — mêmes réglages, même rendu.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
