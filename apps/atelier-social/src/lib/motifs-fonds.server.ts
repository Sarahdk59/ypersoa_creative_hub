/**
 * Bibliothèque de motifs SVG pour le module Fonds — Atelier Social.
 * Lit les fichiers .svg déposés par Sarah dans assets/motifs-fonds-svg/
 * (motifs illustrés réels : oiseau, tulipes, cœurs, fleurs, cadres, cartes…)
 * pour alimenter le picker de l'onglet "Recolorer un SVG".
 */
import { readdirSync, readFileSync } from "fs";
import { join } from "path";

const ASSETS_DIR = join(process.cwd(), "..", "..", "assets", "motifs-fonds-svg");

export interface MotifFondSvg {
  filename: string;
  label: string;
  content: string;
}

function toLabel(filename: string): string {
  const base = filename.replace(/\.svg$/i, "").replace(/[\s_-]+/g, " ").trim();
  return base.charAt(0).toUpperCase() + base.slice(1);
}

export function listMotifsFondsSvg(): MotifFondSvg[] {
  let files: string[];
  try {
    files = readdirSync(ASSETS_DIR).filter((f) => f.toLowerCase().endsWith(".svg"));
  } catch {
    return [];
  }
  return files
    .sort((a, b) => a.localeCompare(b, "fr"))
    .map((filename) => ({
      filename,
      label: toLabel(filename),
      content: readFileSync(join(ASSETS_DIR, filename), "utf-8"),
    }));
}
