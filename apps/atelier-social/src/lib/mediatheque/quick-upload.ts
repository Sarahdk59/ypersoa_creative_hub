/**
 * Médiathèque — utilitaires d'upload rapide partagés entre `UploadDropzone`
 * (revue détaillée avant envoi) et le drag&drop pleine grille de la galerie
 * (envoi immédiat, tags best-effort). Module client-safe : pas d'import du
 * loader de référentiels (fs) — voir `lib/mediatheque/taxonomie.ts` pour
 * l'équivalent serveur.
 */
"use client";

import type { MediaSource, MediaWithTags, Tag, TagCategory } from "@/types/mediatheque";
import { createMedia } from "./api-client";
import { uploadMediaFile } from "./storage";

export const SUGGESTION_PATTERNS: Array<{ category: TagCategory; pattern: RegExp; slug: string }> = [
  { category: "incarnation", pattern: /mama[-_ ]?club/i, slug: "mama-club" },
  { category: "incarnation", pattern: /papa[-_ ]?club/i, slug: "papa-club" },
  { category: "incarnation", pattern: /sista[-_ ]?club/i, slug: "sista-club" },
  { category: "incarnation", pattern: /famille[-_ ]?club/i, slug: "famille-club" },
  { category: "incarnation", pattern: /amour[-_ ]?club/i, slug: "amour-club" },
  { category: "incarnation", pattern: /bride/i, slug: "bride-team" },
  { category: "incarnation", pattern: /dog[-_ ]?dad/i, slug: "dog-dad-gang" },
  { category: "incarnation", pattern: /papi/i, slug: "papi-club" },
  { category: "incarnation", pattern: /mamie/i, slug: "mamie-club" },
  { category: "gabarit", pattern: /hoodie/i, slug: "yp001" },
  { category: "gabarit", pattern: /sweat/i, slug: "yp005" },
  { category: "gabarit", pattern: /t[-_ ]?shirt|tshirt/i, slug: "yp019" },
  { category: "gabarit", pattern: /zoodie/i, slug: "yp021" },
  { category: "couleur_produit", pattern: /creme|crème/i, slug: "creme" },
  { category: "couleur_produit", pattern: /blanc/i, slug: "blanc" },
  { category: "couleur_produit", pattern: /noir/i, slug: "noir" },
  { category: "couleur_produit", pattern: /marine/i, slug: "marine" },
  { category: "couleur_produit", pattern: /sauge/i, slug: "vert-sauge" },
  { category: "couleur_produit", pattern: /rose/i, slug: "rose-pale" },
  { category: "couleur_produit", pattern: /kaki/i, slug: "kaki" },
  { category: "couleur_produit", pattern: /lilas/i, slug: "lilas" },
  { category: "couleur_produit", pattern: /beige/i, slug: "beige" },
  { category: "couleur_produit", pattern: /gris[-_ ]?fonce|gris[-_ ]?foncé/i, slug: "gris-fonce" },
  { category: "plan", pattern: /hero/i, slug: "hero" },
  { category: "plan", pattern: /buste/i, slug: "buste" },
  { category: "plan", pattern: /lifestyle/i, slug: "lifestyle" },
  { category: "plan", pattern: /detail|macro/i, slug: "detail-broderie" },
  { category: "plan", pattern: /plat|flat/i, slug: "plat" },
];

export function suggestTags(filename: string, tagsByCategory: Record<string, Tag[]>): string[] {
  const ids: string[] = [];
  for (const s of SUGGESTION_PATTERNS) {
    if (s.pattern.test(filename)) {
      const t = tagsByCategory[s.category]?.find((x) => x.slug === s.slug);
      if (t) ids.push(t.id);
    }
  }
  return ids;
}

/**
 * Déduit le canal depuis le ratio d'une image (règle Sarah : 4:5 → Insta,
 * 2:3/9:16 → Pinterest, 1:1 → Shopify). Copie client-safe de
 * `taxonomie.ts::deduceCanalFromRatio` (même règle, mêmes tolérances).
 */
export function deduceCanalFromRatio(width: number, height: number): string | null {
  if (!width || !height) return null;
  const ratio = width / height;
  const isClose = (target: number, tolerance = 0.04) => Math.abs(ratio - target) <= tolerance;
  if (isClose(4 / 5)) return "instagram";
  if (isClose(2 / 3) || isClose(9 / 16)) return "pinterest";
  if (isClose(1)) return "shopify";
  return null;
}

export function imageDimensions(src: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => resolve({ width: 0, height: 0 });
    img.src = src;
  });
}

/**
 * Envoi immédiat d'un fichier (storage + createMedia), tags best-effort
 * (regex nom de fichier + canal déduit du ratio). Utilisé par le drag&drop
 * pleine grille de la galerie — pas de revue avant envoi, contrairement à
 * `UploadDropzone`.
 */
export async function quickUploadFile(
  file: File,
  tagsByCategory: Record<string, Tag[]>,
  source: MediaSource = "user_content",
): Promise<MediaWithTags> {
  const preview = URL.createObjectURL(file);
  try {
    const { width, height } = await imageDimensions(preview);
    const { storage_path, public_url } = await uploadMediaFile(file, source);

    const tagIds = new Set(suggestTags(file.name, tagsByCategory));
    const canalSlug = deduceCanalFromRatio(width, height);
    const canalTag = canalSlug ? tagsByCategory["canal"]?.find((t) => t.slug === canalSlug) : undefined;
    if (canalTag) tagIds.add(canalTag.id);

    return await createMedia({
      filename: file.name,
      public_url,
      storage_path,
      width: width || undefined,
      height: height || undefined,
      size_bytes: file.size,
      mime_type: file.type || "image/jpeg",
      source,
      tag_ids: Array.from(tagIds),
    });
  } finally {
    URL.revokeObjectURL(preview);
  }
}
