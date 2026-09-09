/**
 * Loader serveur du maillage interne du blog — lit
 * `referentiels/blog_internal_links.json` via fs (pattern aligné sur
 * pinterest-strategy.server.ts : repoRoot = process.cwd()/../..).
 * Mis en cache mémoire après la première lecture.
 */

import { readFile } from "fs/promises";
import { join } from "path";
import type { BlogInternalLinksReferentiel } from "./internal-links";

let cached: BlogInternalLinksReferentiel | null = null;

export async function loadBlogInternalLinks(): Promise<BlogInternalLinksReferentiel> {
  if (cached) return cached;
  const repoRoot = join(process.cwd(), "..", "..");
  const filePath = join(repoRoot, "referentiels", "blog_internal_links.json");
  const raw = await readFile(filePath, "utf-8");
  cached = JSON.parse(raw) as BlogInternalLinksReferentiel;
  return cached;
}
