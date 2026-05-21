/**
 * Médiathèque — fetchers côté client (composants React).
 *
 * Pointe sur les routes /api/da/mediatheque/* (cohérent avec le pattern
 * existant /api/da/motifs, /api/da/palettes…).
 */

import type {
  MediaFilters,
  MediaListResponse,
  MediaSource,
  MediaStatut,
  MediaWithTags,
  Tag,
  TagCategory,
} from "@/types/mediatheque";

export interface CreateMediaInput {
  filename: string;
  public_url: string;
  storage_path?: string;
  width?: number;
  height?: number;
  size_bytes?: number;
  mime_type?: string;
  source: MediaSource;
  date_shoot?: string;
  photographe?: string;
  statut?: MediaStatut;
  notes?: string;
  uploaded_by?: string;
  tag_ids?: string[];
}

function toSearchParams(filters: MediaFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.source) params.set("source", filters.source);
  if (filters.statut) params.set("statut", filters.statut);
  if (filters.page) params.set("page", String(filters.page));
  if (filters.per_page) params.set("per_page", String(filters.per_page));
  if (filters.sort) params.set("sort", filters.sort);
  if (filters.tags && filters.tags.length > 0) {
    for (const t of filters.tags) params.append("tags", t);
  }
  return params;
}

export async function fetchMediaList(
  filters: MediaFilters = {},
  init?: RequestInit,
): Promise<MediaListResponse> {
  const params = toSearchParams(filters);
  const url = `/api/da/mediatheque/media${params.toString() ? `?${params}` : ""}`;
  const res = await fetch(url, { cache: "no-store", ...init });
  if (!res.ok) throw new Error(`fetchMediaList ${res.status}`);
  return (await res.json()) as MediaListResponse;
}

export async function fetchMediaById(id: string): Promise<MediaWithTags> {
  const res = await fetch(`/api/da/mediatheque/media/${id}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`fetchMediaById ${res.status}`);
  return (await res.json()) as MediaWithTags;
}

export async function createMedia(
  input: CreateMediaInput,
): Promise<MediaWithTags> {
  const res = await fetch(`/api/da/mediatheque/media`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(`createMedia ${res.status}`);
  return (await res.json()) as MediaWithTags;
}

export async function updateMedia(
  id: string,
  patch: Partial<Pick<MediaWithTags, "filename" | "source" | "date_shoot" | "photographe" | "statut" | "notes">>,
): Promise<MediaWithTags> {
  const res = await fetch(`/api/da/mediatheque/media/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  if (!res.ok) throw new Error(`updateMedia ${res.status}`);
  return (await res.json()) as MediaWithTags;
}

export async function deleteMedia(id: string): Promise<void> {
  const res = await fetch(`/api/da/mediatheque/media/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error(`deleteMedia ${res.status}`);
}

export async function addTagToMedia(
  mediaId: string,
  tagId: string,
): Promise<MediaWithTags> {
  const res = await fetch(`/api/da/mediatheque/media/${mediaId}/tags`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tag_id: tagId }),
  });
  if (!res.ok) throw new Error(`addTagToMedia ${res.status}`);
  return (await res.json()) as MediaWithTags;
}

export async function removeTagFromMedia(
  mediaId: string,
  tagId: string,
): Promise<MediaWithTags> {
  const res = await fetch(
    `/api/da/mediatheque/media/${mediaId}/tags?tag_id=${encodeURIComponent(tagId)}`,
    { method: "DELETE" },
  );
  if (!res.ok) throw new Error(`removeTagFromMedia ${res.status}`);
  return (await res.json()) as MediaWithTags;
}

export interface TagsResponse {
  tags: Tag[];
  by_category: Record<TagCategory, Tag[]>;
}

export async function fetchTags(): Promise<TagsResponse> {
  const res = await fetch(`/api/da/mediatheque/tags`, { cache: "no-store" });
  if (!res.ok) throw new Error(`fetchTags ${res.status}`);
  return (await res.json()) as TagsResponse;
}

// ─── AUDIT PRODUCTION ──────────────────────────────────────────────────────

export interface AuditAxis {
  slug: string;
  label: string;
}

export interface AuditCell {
  count: number;
  sample: {
    id: string;
    public_url: string;
    filename: string;
    statut: MediaStatut;
  } | null;
}

export interface AuditMatrixResponse {
  motifs: AuditAxis[];
  produits: AuditAxis[];
  plans: AuditAxis[];
  matrix: Record<string, Record<string, Record<string, AuditCell>>>;
  totals: {
    cells_total: number;
    cells_filled: number;
    photos_total: number;
  };
}

export async function fetchAuditMatrix(params?: {
  motifs?: string[];
  produits?: string[];
  plans?: string[];
}): Promise<AuditMatrixResponse> {
  const sp = new URLSearchParams();
  for (const m of params?.motifs ?? []) sp.append("motif", m);
  for (const p of params?.produits ?? []) sp.append("produit", p);
  for (const pl of params?.plans ?? []) sp.append("plan", pl);
  const url = `/api/da/mediatheque/audit${sp.toString() ? `?${sp}` : ""}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`fetchAuditMatrix ${res.status}`);
  return (await res.json()) as AuditMatrixResponse;
}
