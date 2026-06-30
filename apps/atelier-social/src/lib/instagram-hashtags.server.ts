/**
 * Loader serveur de la banque de hashtags Instagram — lit
 * `referentiels/instagram_hashtags.json` via fs (pattern aligné sur
 * pinterest-strategy.server.ts : repoRoot = process.cwd()/../..).
 * Mis en cache mémoire après la première lecture.
 */

import { readFile } from "fs/promises";
import { join } from "path";
import type { InstagramHashtagBank } from "./instagram-hashtags";

let cached: InstagramHashtagBank | null = null;

export async function loadInstagramHashtags(): Promise<InstagramHashtagBank> {
  if (cached) return cached;
  const repoRoot = join(process.cwd(), "..", "..");
  const filePath = join(repoRoot, "referentiels", "instagram_hashtags.json");
  const raw = await readFile(filePath, "utf-8");
  cached = JSON.parse(raw) as InstagramHashtagBank;
  return cached;
}
