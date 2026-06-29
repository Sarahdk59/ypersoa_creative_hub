/**
 * Atelier Trends — loader fs + orchestration de run (serveur only).
 *
 * Pattern aligné `lib/production/commandes-loader.ts` : 1 fichier JSON par run
 * dans `referentiels/trends/{date}.json`, lecture/écriture synchrone via fs.
 * Chemin résolu en remontant 2 niveaux (Railway-safe monorepo).
 */

import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from "fs";
import { join } from "path";
import type { TrendsSnapshot } from "./trends";
import { fetchGoogleTrends } from "./google-trends";

const REFS_DIR = join(process.cwd(), "..", "..", "referentiels");
export const TRENDS_DIR = join(REFS_DIR, "trends");

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
 * Lance un run de veille (Lot 1 : Google Trends uniquement, status "raw").
 * Écrit le snapshot du jour (écrase si déjà lancé aujourd'hui) et le renvoie.
 * Si la source est injoignable et qu'un run antérieur existe, on conserve
 * l'ancien snapshot et on remonte l'erreur (garde-fou CDC §6).
 */
export async function runTrends(): Promise<TrendsSnapshot> {
  const now = new Date();
  const date = now.toISOString().slice(0, 10);
  const google = await fetchGoogleTrends();

  if (google.trends.length === 0) {
    const previous = getLatestSnapshot();
    if (previous) {
      return {
        ...previous,
        errors: [
          "Run du " + date + " : Google Trends injoignable, snapshot précédent conservé.",
          ...google.errors,
        ],
      };
    }
  }

  const snapshot: TrendsSnapshot = {
    id: date,
    date,
    generated_at: now.toISOString(),
    sources: ["google"],
    status: "raw",
    trends: google.trends,
    meta: {
      trends_count: google.trends.length,
      source_url: google.source_url,
      note: "Lot 1 — tendances brutes Google Trends FR, sans enrichissement IA.",
    },
    errors: google.errors,
  };
  writeSnapshot(snapshot);
  return snapshot;
}
