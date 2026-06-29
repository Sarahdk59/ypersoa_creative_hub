/**
 * Loader serveur de la stratégie Pinterest — lit `referentiels/pinterest_strategy.json`
 * via fs (pattern aligné sur generate-image/route.ts : repoRoot = process.cwd()/../..).
 * Mis en cache mémoire après la première lecture.
 */

import { readFile } from "fs/promises";
import { join } from "path";
import type { PinterestStrategy } from "./pinterest-strategy";

let cached: PinterestStrategy | null = null;

export async function loadPinterestStrategy(): Promise<PinterestStrategy> {
  if (cached) return cached;
  const repoRoot = join(process.cwd(), "..", "..");
  const filePath = join(repoRoot, "referentiels", "pinterest_strategy.json");
  const raw = await readFile(filePath, "utf-8");
  cached = JSON.parse(raw) as PinterestStrategy;
  return cached;
}
