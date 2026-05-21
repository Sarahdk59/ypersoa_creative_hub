/**
 * Médiathèque — couche d'accès aux données.
 *
 * Sprint 1 : implémentation in-memory (seedée avec MOCK_MEDIA + SEED_TAGS),
 * persistée dans un module-level Map qui survit aux requêtes API tant que
 * le process Next.js tourne. Permet à Sarah de tester l'upload + le filtrage
 * sans toucher Supabase.
 *
 * Sprint 2 (à venir) : implémentation Supabase activée quand
 * NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY sont définis.
 */

import { randomUUID } from "node:crypto";

import type {
  Media,
  MediaFilters,
  MediaListResponse,
  MediaStatut,
  MediaWithTags,
  Tag,
  TagCategory,
} from "@/types/mediatheque";
import { parseTagRef } from "@/types/mediatheque";
import { SEED_TAGS } from "./taxonomie";
import { MOCK_MEDIA } from "./mock-data";

interface MediaRow extends Media {
  tag_ids: Set<string>;
}

declare global {
  // eslint-disable-next-line no-var
  var __ypersoa_mediatheque_store__:
    | {
        media: Map<string, MediaRow>;
        tags: Map<string, Tag>;
        seeded: boolean;
      }
    | undefined;
}

function getStore() {
  if (!globalThis.__ypersoa_mediatheque_store__) {
    globalThis.__ypersoa_mediatheque_store__ = {
      media: new Map(),
      tags: new Map(),
      seeded: false,
    };
  }
  const store = globalThis.__ypersoa_mediatheque_store__;
  if (!store.seeded) {
    for (const t of SEED_TAGS) store.tags.set(t.id, t);
    for (const m of MOCK_MEDIA) {
      const { tags, ...rest } = m;
      store.media.set(m.id, {
        ...rest,
        tag_ids: new Set(tags.map((t) => t.id)),
      });
    }
    store.seeded = true;
  }
  return store;
}

function rowToMediaWithTags(row: MediaRow): MediaWithTags {
  const store = getStore();
  const tags: Tag[] = [];
  for (const tagId of row.tag_ids) {
    const t = store.tags.get(tagId);
    if (t) tags.push(t);
  }
  const { tag_ids: _tag_ids, ...media } = row;
  void _tag_ids;
  return { ...media, tags };
}

// ─── TAGS ──────────────────────────────────────────────────────────────────

export async function listTags(): Promise<Tag[]> {
  const store = getStore();
  return Array.from(store.tags.values());
}

export async function getTag(id: string): Promise<Tag | null> {
  return getStore().tags.get(id) ?? null;
}

export async function findTag(
  category: TagCategory,
  slug: string,
): Promise<Tag | null> {
  const store = getStore();
  for (const t of store.tags.values()) {
    if (t.category === category && t.slug === slug) return t;
  }
  return null;
}

export async function createTag(input: {
  category: TagCategory;
  slug: string;
  label: string;
  color_hex?: string;
}): Promise<Tag> {
  const store = getStore();
  const existing = await findTag(input.category, input.slug);
  if (existing) return existing;
  const tag: Tag = {
    id: randomUUID(),
    category: input.category,
    slug: input.slug,
    label: input.label,
    color_hex: input.color_hex ?? "#1E2D4A",
    parent_id: null,
  };
  store.tags.set(tag.id, tag);
  return tag;
}

// ─── MEDIA ─────────────────────────────────────────────────────────────────

const DEFAULT_PER_PAGE = 48;

export async function listMedia(
  filters: MediaFilters = {},
): Promise<MediaListResponse> {
  const store = getStore();
  let rows = Array.from(store.media.values()).map(rowToMediaWithTags);

  // Filtres tags : AND entre catégories, OR dans une catégorie
  if (filters.tags && filters.tags.length > 0) {
    const byCategory = new Map<TagCategory, Set<string>>();
    for (const ref of filters.tags) {
      const parsed = parseTagRef(ref);
      if (!parsed) continue;
      if (!byCategory.has(parsed.category)) {
        byCategory.set(parsed.category, new Set());
      }
      byCategory.get(parsed.category)!.add(parsed.slug);
    }
    rows = rows.filter((m) => {
      for (const [cat, slugs] of byCategory) {
        const hasAny = m.tags.some(
          (t) => t.category === cat && slugs.has(t.slug),
        );
        if (!hasAny) return false;
      }
      return true;
    });
  }

  if (filters.source) {
    rows = rows.filter((m) => m.source === filters.source);
  }
  if (filters.statut) {
    rows = rows.filter((m) => m.statut === filters.statut);
  }
  if (filters.q) {
    const q = filters.q.toLowerCase().trim();
    rows = rows.filter(
      (m) =>
        m.filename.toLowerCase().includes(q) ||
        (m.notes?.toLowerCase().includes(q) ?? false) ||
        m.tags.some((t) => t.label.toLowerCase().includes(q)),
    );
  }

  const sort = filters.sort ?? "date_desc";
  rows.sort((a, b) => {
    if (sort === "name_asc") return a.filename.localeCompare(b.filename);
    if (sort === "date_asc") {
      return new Date(a.uploaded_at).getTime() - new Date(b.uploaded_at).getTime();
    }
    return new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime();
  });

  const total = rows.length;
  const per_page = filters.per_page ?? DEFAULT_PER_PAGE;
  const page = filters.page ?? 1;
  const total_pages = Math.max(1, Math.ceil(total / per_page));
  const start = (page - 1) * per_page;
  const data = rows.slice(start, start + per_page);

  return {
    data,
    meta: { total, page, per_page, total_pages },
  };
}

export async function getMedia(id: string): Promise<MediaWithTags | null> {
  const row = getStore().media.get(id);
  return row ? rowToMediaWithTags(row) : null;
}

export interface CreateMediaInput {
  filename: string;
  public_url: string;
  storage_path?: string;
  width?: number;
  height?: number;
  size_bytes?: number;
  mime_type?: string;
  source: Media["source"];
  date_shoot?: string;
  photographe?: string;
  statut?: MediaStatut;
  notes?: string;
  uploaded_by?: string;
  tag_ids?: string[];
}

export async function createMedia(input: CreateMediaInput): Promise<MediaWithTags> {
  const store = getStore();
  const now = new Date().toISOString();
  const id = randomUUID();
  const row: MediaRow = {
    id,
    filename: input.filename,
    storage_path:
      input.storage_path ??
      `${input.source}/${now.slice(0, 7)}/${input.filename}`,
    public_url: input.public_url,
    width: input.width ?? null,
    height: input.height ?? null,
    size_bytes: input.size_bytes ?? null,
    mime_type: input.mime_type ?? null,
    source: input.source,
    date_shoot: input.date_shoot ?? null,
    photographe: input.photographe ?? null,
    statut: input.statut ?? "a_valider",
    notes: input.notes ?? null,
    uploaded_by: input.uploaded_by ?? "innovation@ypersoa.fr",
    uploaded_at: now,
    updated_at: now,
    tag_ids: new Set(input.tag_ids ?? []),
  };
  store.media.set(id, row);
  return rowToMediaWithTags(row);
}

export interface UpdateMediaInput {
  filename?: string;
  source?: Media["source"];
  date_shoot?: string | null;
  photographe?: string | null;
  statut?: MediaStatut;
  notes?: string | null;
}

export async function updateMedia(
  id: string,
  patch: UpdateMediaInput,
): Promise<MediaWithTags | null> {
  const store = getStore();
  const row = store.media.get(id);
  if (!row) return null;
  Object.assign(row, patch);
  row.updated_at = new Date().toISOString();
  return rowToMediaWithTags(row);
}

export async function deleteMedia(id: string): Promise<boolean> {
  return getStore().media.delete(id);
}

export async function addTagToMedia(
  mediaId: string,
  tagId: string,
): Promise<MediaWithTags | null> {
  const store = getStore();
  const row = store.media.get(mediaId);
  if (!row) return null;
  if (!store.tags.has(tagId)) return null;
  row.tag_ids.add(tagId);
  row.updated_at = new Date().toISOString();
  return rowToMediaWithTags(row);
}

export async function removeTagFromMedia(
  mediaId: string,
  tagId: string,
): Promise<MediaWithTags | null> {
  const store = getStore();
  const row = store.media.get(mediaId);
  if (!row) return null;
  row.tag_ids.delete(tagId);
  row.updated_at = new Date().toISOString();
  return rowToMediaWithTags(row);
}

export async function tagsUsageCount(): Promise<Map<string, number>> {
  const store = getStore();
  const counts = new Map<string, number>();
  for (const row of store.media.values()) {
    for (const tagId of row.tag_ids) {
      counts.set(tagId, (counts.get(tagId) ?? 0) + 1);
    }
  }
  return counts;
}
