/**
 * Loader serveur pour referentiels/social_palette.json (palette du module
 * Fonds — Atelier Social). Pattern aligné sur zone-test-loader.ts : fs
 * synchrone, pas de cache mémoire (fichier petit, édité rarement).
 */
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import type { SocialPaletteRef } from "./social-palette";

const REFS_DIR = join(process.cwd(), "..", "..", "referentiels");
export const SOCIAL_PALETTE_PATH = join(REFS_DIR, "social_palette.json");

export function readSocialPalette(): SocialPaletteRef {
  const ref = JSON.parse(readFileSync(SOCIAL_PALETTE_PATH, "utf-8")) as SocialPaletteRef;
  if (!Array.isArray(ref.amplificateurs)) ref.amplificateurs = [];
  return ref;
}

export function writeSocialPalette(data: SocialPaletteRef) {
  data._meta.last_updated = new Date().toISOString().slice(0, 10);
  writeFileSync(SOCIAL_PALETTE_PATH, JSON.stringify(data, null, 2) + "\n", "utf-8");
}

const DIACRITICS_RE = new RegExp("[\\u0300-\\u036f]", "g");

export function makeAmplificateurId(nom: string): string {
  const slug = nom
    .toLowerCase()
    .normalize("NFD")
    .replace(DIACRITICS_RE, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 24);
  return `${slug || "couleur"}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
}
