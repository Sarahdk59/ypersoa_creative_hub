/**
 * Atelier Trends — loader fs + orchestration de run (serveur only).
 *
 * Pattern aligné `lib/production/commandes-loader.ts` : 1 fichier JSON par run
 * dans `referentiels/trends/{date}.json`, lecture/écriture synchrone via fs.
 * Chemin résolu en remontant 2 niveaux (Railway-safe monorepo).
 */

import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from "fs";
import { join } from "path";
import {
  manualKeywordToTrend,
  mergeTrends,
  type PinterestManualKeyword,
  type TrendsSnapshot,
  type TrendSource,
} from "./trends";
import { fetchPinterestTrends } from "./pinterest-trends";

const REFS_DIR = join(process.cwd(), "..", "..", "referentiels");
export const TRENDS_DIR = join(REFS_DIR, "trends");
const PINTEREST_MANUEL_PATH = join(TRENDS_DIR, "_pinterest_manuel.json");

interface PinterestManuelFile {
  _meta?: Record<string, unknown>;
  keywords: PinterestManualKeyword[];
}

/** Lit la liste de mots-clés Pinterest curés à la main (vide si absente). */
export function getPinterestManuel(): PinterestManualKeyword[] {
  if (!existsSync(PINTEREST_MANUEL_PATH)) return [];
  try {
    const parsed = JSON.parse(readFileSync(PINTEREST_MANUEL_PATH, "utf-8")) as PinterestManuelFile;
    return Array.isArray(parsed.keywords) ? parsed.keywords : [];
  } catch {
    return [];
  }
}

/** Remplace la liste de mots-clés Pinterest manuels (dédup par terme). */
export function setPinterestManuel(keywords: PinterestManualKeyword[]): PinterestManualKeyword[] {
  ensureTrendsDir();
  const seen = new Set<string>();
  const clean = keywords
    .map((k) => ({ ...k, terme: (k.terme || "").trim() }))
    .filter((k) => {
      const key = k.terme.toLowerCase();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  const existing: Record<string, unknown> = existsSync(PINTEREST_MANUEL_PATH)
    ? (() => {
        try {
          return JSON.parse(readFileSync(PINTEREST_MANUEL_PATH, "utf-8"))._meta ?? {};
        } catch {
          return {};
        }
      })()
    : {};
  const file: PinterestManuelFile = {
    _meta: { ...existing, last_updated: new Date().toISOString().slice(0, 10) },
    keywords: clean,
  };
  writeFileSync(PINTEREST_MANUEL_PATH, JSON.stringify(file, null, 2) + "\n", "utf-8");
  return clean;
}

function ensureTrendsDir(): void {
  if (!existsSync(TRENDS_DIR)) mkdirSync(TRENDS_DIR, { recursive: true });
}

/** Liste les runs (du plus récent au plus ancien), hors fichiers `_`. */
export function listSnapshots(): TrendsSnapshot[] {
  ensureTrendsDir();
  return readdirSync(TRENDS_DIR)
    .filter((f) => f.endsWith(".json") && !f.startsWith("_"))
    .map((f) => {
      try {
        return JSON.parse(readFileSync(join(TRENDS_DIR, f), "utf-8")) as TrendsSnapshot;
      } catch {
        return null;
      }
    })
    .filter((s): s is TrendsSnapshot => s !== null)
    .sort((a, b) => b.id.localeCompare(a.id));
}

/** Dernier run en date, ou null si aucun. */
export function getLatestSnapshot(): TrendsSnapshot | null {
  return listSnapshots()[0] ?? null;
}

export function getSnapshot(id: string): TrendsSnapshot | null {
  const path = join(TRENDS_DIR, `${id}.json`);
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, "utf-8")) as TrendsSnapshot;
}

export function writeSnapshot(snapshot: TrendsSnapshot): void {
  ensureTrendsDir();
  const path = join(TRENDS_DIR, `${snapshot.id}.json`);
  writeFileSync(path, JSON.stringify(snapshot, null, 2) + "\n", "utf-8");
}

/**
 * Lance un run de veille (Pinterest API + mots-clés Pinterest manuels, status
 * "raw" — Google Trends retiré le 21/08/2026, jugé peu actionnable pour la
 * broderie). Écrit le snapshot du jour (écrase si déjà lancé) et le renvoie.
 * Si TOUTES les sources sont vides et qu'un run antérieur existe, on conserve
 * l'ancien snapshot et on remonte l'erreur (garde-fou CDC §6).
 */
export async function runTrends(): Promise<TrendsSnapshot> {
  const now = new Date();
  const date = now.toISOString().slice(0, 10);

  const pinterest = await fetchPinterestTrends();
  const manual = getPinterestManuel().map(manualKeywordToTrend);

  // API Pinterest avant saisie manuelle : si un terme apparaît des 2 côtés,
  // on garde la version API.
  const trends = mergeTrends(pinterest.trends, manual);
  const errors = [...pinterest.errors];

  if (trends.length === 0) {
    const previous = getLatestSnapshot();
    if (previous) {
      return {
        ...previous,
        errors: [
          `Run du ${date} : toutes les sources vides, snapshot précédent conservé.`,
          ...errors,
        ],
      };
    }
  }

  const sources: TrendSource[] = [];
  if (trends.some((t) => t.source === "pinterest")) sources.push("pinterest");

  const snapshot: TrendsSnapshot = {
    id: date,
    date,
    generated_at: now.toISOString(),
    sources,
    status: "raw",
    trends,
    meta: {
      trends_count: trends.length,
      source_url: pinterest.source_url,
      note:
        "Pinterest" +
        (pinterest.configured ? " (API)" : " (saisie manuelle)") +
        ", sans enrichissement IA.",
    },
    errors,
  };
  writeSnapshot(snapshot);
  return snapshot;
}
