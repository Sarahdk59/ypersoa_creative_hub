/**
 * Médiathèque — couche d'accès aux données.
 *
 * Implémentation Supabase (tables `mediatheque_media`, `mediatheque_tags`,
 * `mediatheque_media_tags` + bucket Storage `mediatheque`). Les vraies photos
 * de collection uploadées via l'interface y sont stockées durablement (survit
 * aux redéploiements Railway).
 *
 * Fallback in-memory : si Supabase n'est pas configuré (NEXT_PUBLIC_SUPABASE_URL
 * / NEXT_PUBLIC_SUPABASE_ANON_KEY absents), on retombe sur un store en mémoire
 * seedé avec la taxonomie de tags uniquement (galerie vide, pas de placeholders).
 */

import { randomUUID } from "node:crypto";

import { supabase } from "@/lib/supabase";
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
import { SEED_TAGS, findSeedTag } from "./taxonomie";

const BUCKET = "mediatheque";
const TBL_MEDIA = "mediatheque_media";
const TBL_TAGS = "mediatheque_tags";
const TBL_LINK = "mediatheque_media_tags";

// ─── FALLBACK IN-MEMORY (Supabase non configuré) ─────────────────────────────

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

function memStore() {
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
    store.seeded = true;
  }
  return store;
}

function memRowToMedia(row: MediaRow): MediaWithTags {
  const store = memStore();
  const tags: Tag[] = [];
  for (const tagId of row.tag_ids) {
    const t = store.tags.get(tagId);
    if (t) tags.push(t);
  }
  const { tag_ids: _tag_ids, ...media } = row;
  void _tag_ids;
  return { ...media, tags };
}

// ─── SUPABASE HELPERS ────────────────────────────────────────────────────────

let tagsSeededThisProcess = false;

/** Upsert idempotent de la taxonomie (taxonomie.ts = source de vérité). */
async function ensureTagsSeeded() {
  if (!supabase || tagsSeededThisProcess) return;
  const payload = SEED_TAGS.map((t) => ({
    id: t.id,
    category: t.category,
    slug: t.slug,
    label: t.label,
    color_hex: t.color_hex,
    parent_id: t.parent_id,
  }));
  const { error } = await supabase.from(TBL_TAGS).upsert(payload, { onConflict: "id" });
  if (!error) tagsSeededThisProcess = true;
}

interface DbMediaRow {
  id: string;
  filename: string;
  storage_path: string;
  public_url: string;
  width: number | null;
  height: number | null;
  size_bytes: number | null;
  mime_type: string | null;
  source: Media["source"];
  date_shoot: string | null;
  photographe: string | null;
  statut: MediaStatut;
  notes: string | null;
  uploaded_by: string | null;
  uploaded_at: string;
  updated_at: string;
  mediatheque_media_tags?: { tag_id: string }[];
}

const MEDIA_SELECT =
  "id,filename,storage_path,public_url,width,height,size_bytes,mime_type,source,date_shoot,photographe,statut,notes,uploaded_by,uploaded_at,updated_at,mediatheque_media_tags(tag_id)";

function dbRowToMedia(row: DbMediaRow, tagsById: Map<string, Tag>): MediaWithTags {
  const tags: Tag[] = [];
  for (const link of row.mediatheque_media_tags ?? []) {
    const t = tagsById.get(link.tag_id);
    if (t) tags.push(t);
  }
  return {
    id: row.id,
    filename: row.filename,
    storage_path: row.storage_path,
    public_url: row.public_url,
    width: row.width,
    height: row.height,
    size_bytes: row.size_bytes,
    mime_type: row.mime_type,
    source: row.source,
    date_shoot: row.date_shoot,
    photographe: row.photographe,
    statut: row.statut,
    notes: row.notes,
    uploaded_by: row.uploaded_by,
    uploaded_at: row.uploaded_at,
    updated_at: row.updated_at,
    tags,
  };
}

async function loadTagsById(): Promise<Map<string, Tag>> {
  await ensureTagsSeeded();
  const map = new Map<string, Tag>();
  if (!supabase) {
    for (const t of memStore().tags.values()) map.set(t.id, t);
    return map;
  }
  const { data, error } = await supabase.from(TBL_TAGS).select("*");
  if (error) throw new Error(`Lecture ${TBL_TAGS} échouée : ${error.message}`);
  for (const t of (data ?? []) as Tag[]) map.set(t.id, t);
  return map;
}

async function loadAllMediaWithTags(): Promise<MediaWithTags[]> {
  const tagsById = await loadTagsById();
  if (!supabase) {
    return Array.from(memStore().media.values()).map(memRowToMedia);
  }
  const { data, error } = await supabase
    .from(TBL_MEDIA)
    .select(MEDIA_SELECT)
    .order("uploaded_at", { ascending: false });
  if (error) throw new Error(`Lecture ${TBL_MEDIA} échouée : ${error.message}`);
  return (data ?? []).map((row) => dbRowToMedia(row as DbMediaRow, tagsById));
}

// ─── TAGS ──────────────────────────────────────────────────────────────────

export async function listTags(): Promise<Tag[]> {
  const map = await loadTagsById();
  return Array.from(map.values());
}

export async function getTag(id: string): Promise<Tag | null> {
  const map = await loadTagsById();
  return map.get(id) ?? null;
}

export async function findTag(
  category: TagCategory,
  slug: string,
): Promise<Tag | null> {
  const map = await loadTagsById();
  for (const t of map.values()) {
    if (t.category === category && t.slug === slug) return t;
  }
  return null;
}

export async function createTag(input: {
  category: TagCategory;
  slug: string;
  label: string;
  color_hex?: string;
  parent_id?: string | null;
}): Promise<Tag> {
  const existing = await findTag(input.category, input.slug);
  if (existing) return existing;

  const tag: Tag = {
    id: `tag-${input.category}-${input.slug}`,
    category: input.category,
    slug: input.slug,
    label: input.label,
    color_hex: input.color_hex ?? "#1E2D4A",
    parent_id: input.parent_id ?? null,
  };

  if (!supabase) {
    memStore().tags.set(tag.id, tag);
    return tag;
  }
  const { data, error } = await supabase
    .from(TBL_TAGS)
    .upsert(tag, { onConflict: "id" })
    .select("*")
    .single();
  if (error) throw new Error(`Création tag échouée : ${error.message}`);
  return data as Tag;
}

/**
 * Résout un tag (catégorie+slug) vers son id, en le créant si besoin.
 * Le label/color/parent_id sont repris de la taxonomie seed quand connus
 * (motif/incarnation/mannequin/ambiance/occasion/canal/…) ; sinon `label`
 * doit être fourni par l'appelant (valeur dynamique non seedée).
 * C'est le point d'entrée que les mirrors auto-tag (packs, shots, épisodes)
 * doivent utiliser plutôt que `createTag` directement.
 */
export async function resolveTagId(
  category: TagCategory,
  slug: string,
  label?: string,
): Promise<string> {
  const seed = findSeedTag(category, slug);
  const tag = await createTag({
    category,
    slug,
    label: label ?? seed?.label ?? slug,
    color_hex: seed?.color_hex ?? undefined,
    parent_id: seed?.parent_id ?? undefined,
  });
  return tag.id;
}

// ─── MEDIA ─────────────────────────────────────────────────────────────────

const DEFAULT_PER_PAGE = 48;

export async function listMedia(
  filters: MediaFilters = {},
): Promise<MediaListResponse> {
  let rows = await loadAllMediaWithTags();

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
    // Multi-dimensions : "sweat rentrée" doit matcher un média taggé
    // gabarit:sweat ET occasion:rentrée, pas seulement un nom de fichier
    // littéral — chaque mot de la requête doit trouver SA correspondance
    // quelque part (nom de fichier, note, ou label de tag), potentiellement
    // dans des champs différents.
    const words = filters.q.toLowerCase().trim().split(/\s+/).filter(Boolean);
    rows = rows.filter((m) =>
      words.every(
        (w) =>
          m.filename.toLowerCase().includes(w) ||
          (m.notes?.toLowerCase().includes(w) ?? false) ||
          m.tags.some((t) => t.label.toLowerCase().includes(w)),
      ),
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
  if (!supabase) {
    const row = memStore().media.get(id);
    return row ? memRowToMedia(row) : null;
  }
  const tagsById = await loadTagsById();
  const { data, error } = await supabase
    .from(TBL_MEDIA)
    .select(MEDIA_SELECT)
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`Lecture média échouée : ${error.message}`);
  if (!data) return null;
  return dbRowToMedia(data as DbMediaRow, tagsById);
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

/**
 * Fenêtre de déduplication : un même fichier déposé deux fois de suite (ex.
 * QuickAddPanel + UploadDropzone actifs simultanément sur la même page
 * d'upload) ne doit créer qu'une ligne. Passé ce délai, un nom de fichier
 * identique est considéré comme un nouvel envoi volontaire.
 */
const DEDUP_WINDOW_MS = 10 * 60 * 1000;

export async function createMedia(input: CreateMediaInput): Promise<MediaWithTags> {
  const now = new Date().toISOString();
  const storage_path =
    input.storage_path ?? `${input.source}/${now.slice(0, 7)}/${input.filename}`;
  const tagIds = input.tag_ids ?? [];

  if (!supabase) {
    const store = memStore();
    const cutoff = Date.now() - DEDUP_WINDOW_MS;
    const dup = Array.from(store.media.values()).find(
      (r) =>
        r.filename === input.filename &&
        r.statut !== "archivee" &&
        new Date(r.uploaded_at).getTime() >= cutoff,
    );
    if (dup) {
      for (const t of tagIds) dup.tag_ids.add(t);
      dup.updated_at = now;
      return memRowToMedia(dup);
    }
    const id = randomUUID();
    const row: MediaRow = {
      id,
      filename: input.filename,
      storage_path,
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
      tag_ids: new Set(tagIds),
    };
    store.media.set(id, row);
    return memRowToMedia(row);
  }

  await ensureTagsSeeded();

  const cutoffIso = new Date(Date.now() - DEDUP_WINDOW_MS).toISOString();
  const { data: dupRow, error: dupError } = await supabase
    .from(TBL_MEDIA)
    .select("id")
    .eq("filename", input.filename)
    .neq("statut", "archivee")
    .gte("uploaded_at", cutoffIso)
    .order("uploaded_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (dupError) throw new Error(`Vérification doublon échouée : ${dupError.message}`);
  if (dupRow) {
    const dupId = (dupRow as { id: string }).id;
    if (tagIds.length > 0) {
      const { data: existingLinks } = await supabase
        .from(TBL_LINK)
        .select("tag_id")
        .eq("media_id", dupId);
      const already = new Set((existingLinks ?? []).map((l) => (l as { tag_id: string }).tag_id));
      const newLinks = tagIds
        .filter((t) => !already.has(t))
        .map((tag_id) => ({ media_id: dupId, tag_id }));
      if (newLinks.length > 0) {
        const { error: linkErr } = await supabase.from(TBL_LINK).insert(newLinks);
        if (linkErr) throw new Error(`Association tags échouée : ${linkErr.message}`);
      }
    }
    const existing = await getMedia(dupId);
    if (!existing) throw new Error("Doublon détecté mais introuvable");
    return existing;
  }

  const { data, error } = await supabase
    .from(TBL_MEDIA)
    .insert({
      filename: input.filename,
      storage_path,
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
    })
    .select("id")
    .single();
  if (error) throw new Error(`Création média échouée : ${error.message}`);

  const mediaId = (data as { id: string }).id;
  if (tagIds.length > 0) {
    const links = tagIds.map((tag_id) => ({ media_id: mediaId, tag_id }));
    const { error: linkErr } = await supabase.from(TBL_LINK).insert(links);
    if (linkErr) throw new Error(`Association tags échouée : ${linkErr.message}`);
  }

  const created = await getMedia(mediaId);
  if (!created) throw new Error("Média créé introuvable");
  return created;
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
  if (!supabase) {
    const row = memStore().media.get(id);
    if (!row) return null;
    Object.assign(row, patch);
    row.updated_at = new Date().toISOString();
    return memRowToMedia(row);
  }
  const { error } = await supabase
    .from(TBL_MEDIA)
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(`Mise à jour média échouée : ${error.message}`);
  return getMedia(id);
}

export async function deleteMedia(id: string): Promise<boolean> {
  if (!supabase) {
    return memStore().media.delete(id);
  }
  // Récupère la référence pour supprimer aussi la source éditoriale. Les
  // médias auto-alimentés pointent vers leur bucket d'origine, pas forcément
  // vers le bucket `mediatheque`.
  const { data: row } = await supabase
    .from(TBL_MEDIA)
    .select("storage_path,public_url")
    .eq("id", id)
    .maybeSingle();
  if (!row) return false;

  const sourceRow = row as { storage_path: string; public_url: string };
  const bucketMatch = sourceRow.public_url.match(/\/storage\/v1\/object\/public\/([^/]+)\//);
  const sourceBucket = bucketMatch?.[1] ? decodeURIComponent(bucketMatch[1]) : null;

  if (sourceBucket === "lookbook-images") {
    const { error } = await supabase.from("lookbook_images").delete().eq("image_url", sourceRow.public_url);
    if (error) throw new Error(`Suppression source Lookbook échouée : ${error.message}`);
    if (sourceRow.storage_path) await supabase.storage.from(sourceBucket).remove([sourceRow.storage_path]);
  } else if (sourceBucket === "catalog-shots") {
    const { error } = await supabase.from("catalog_shots").delete().eq("image_url", sourceRow.public_url);
    if (error) throw new Error(`Suppression source Shooting échouée : ${error.message}`);
    if (sourceRow.storage_path) await supabase.storage.from(sourceBucket).remove([sourceRow.storage_path]);
  } else if (sourceBucket === "social-packs") {
    const { data: packs, error: packsError } = await supabase
      .from("social_packs")
      .select("id,image_urls,image_storage_paths")
      .contains("image_urls", [sourceRow.public_url]);
    if (packsError) throw new Error(`Lecture pack social échouée : ${packsError.message}`);
    for (const pack of packs ?? []) {
      const urls = (pack.image_urls as string[]).filter((url) => url !== sourceRow.public_url);
      const paths = (pack.image_storage_paths as string[]).filter((path) => path !== sourceRow.storage_path);
      const { error } = await supabase
        .from("social_packs")
        .update({ image_urls: urls, image_storage_paths: paths })
        .eq("id", pack.id);
      if (error) throw new Error(`Mise à jour pack social échouée : ${error.message}`);
    }
    if (sourceRow.storage_path) await supabase.storage.from(sourceBucket).remove([sourceRow.storage_path]);
  } else if (sourceRow.storage_path) {
    await supabase.storage.from(BUCKET).remove([sourceRow.storage_path]);
  }
  const { error } = await supabase.from(TBL_MEDIA).delete().eq("id", id);
  if (error) throw new Error(`Suppression média échouée : ${error.message}`);
  return true;
}

export async function addTagToMedia(
  mediaId: string,
  tagId: string,
): Promise<MediaWithTags | null> {
  if (!supabase) {
    const store = memStore();
    const row = store.media.get(mediaId);
    if (!row) return null;
    if (!store.tags.has(tagId)) return null;
    row.tag_ids.add(tagId);
    row.updated_at = new Date().toISOString();
    return memRowToMedia(row);
  }
  const { error } = await supabase
    .from(TBL_LINK)
    .upsert({ media_id: mediaId, tag_id: tagId }, { onConflict: "media_id,tag_id" });
  if (error) throw new Error(`Ajout tag échoué : ${error.message}`);
  await supabase
    .from(TBL_MEDIA)
    .update({ updated_at: new Date().toISOString() })
    .eq("id", mediaId);
  return getMedia(mediaId);
}

export async function removeTagFromMedia(
  mediaId: string,
  tagId: string,
): Promise<MediaWithTags | null> {
  if (!supabase) {
    const store = memStore();
    const row = store.media.get(mediaId);
    if (!row) return null;
    row.tag_ids.delete(tagId);
    row.updated_at = new Date().toISOString();
    return memRowToMedia(row);
  }
  const { error } = await supabase
    .from(TBL_LINK)
    .delete()
    .eq("media_id", mediaId)
    .eq("tag_id", tagId);
  if (error) throw new Error(`Retrait tag échoué : ${error.message}`);
  await supabase
    .from(TBL_MEDIA)
    .update({ updated_at: new Date().toISOString() })
    .eq("id", mediaId);
  return getMedia(mediaId);
}

// ─── AUDIT PRODUCTION ──────────────────────────────────────────────────────
// Matrice motif × produit × plan pour voir d'un coup ce qu'il manque dans la
// médiathèque (lookbook + lifestyle pour les 18 motifs × 5 produits).

export interface AuditCellSample {
  id: string;
  public_url: string;
  filename: string;
  statut: MediaStatut;
}

export interface AuditCell {
  count: number;
  sample: AuditCellSample | null;
}

export interface AuditAxis {
  slug: string;
  label: string;
}

export interface AuditMatrix {
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

export interface AuditOptions {
  motif_slugs: string[];
  produit_slugs: string[];
  plan_slugs: string[];
}

export async function getAuditMatrix(options: AuditOptions): Promise<AuditMatrix> {
  const allMedia = await loadAllMediaWithTags();
  const tagsById = await loadTagsById();
  const motifSet = new Set(options.motif_slugs);
  const produitSet = new Set(options.produit_slugs);
  const planSet = new Set(options.plan_slugs);

  const matrix: AuditMatrix["matrix"] = {};
  for (const m of options.motif_slugs) {
    matrix[m] = {};
    for (const p of options.produit_slugs) {
      matrix[m][p] = {};
      for (const pl of options.plan_slugs) {
        matrix[m][p][pl] = { count: 0, sample: null };
      }
    }
  }

  let photosTotal = 0;

  for (const row of allMedia) {
    let motifSlug: string | null = null;
    let produitSlug: string | null = null;
    const planSlugs: string[] = [];
    for (const t of row.tags) {
      if (t.category === "motif" && motifSet.has(t.slug)) motifSlug = t.slug;
      else if (t.category === "gabarit" && produitSet.has(t.slug)) produitSlug = t.slug;
      else if (t.category === "plan" && planSet.has(t.slug)) planSlugs.push(t.slug);
    }
    if (!motifSlug || !produitSlug || planSlugs.length === 0) continue;
    photosTotal += 1;
    for (const planSlug of planSlugs) {
      const cell = matrix[motifSlug][produitSlug][planSlug];
      cell.count += 1;
      if (!cell.sample) {
        cell.sample = {
          id: row.id,
          public_url: row.public_url,
          filename: row.filename,
          statut: row.statut,
        };
      }
    }
  }

  const cellsTotal =
    options.motif_slugs.length * options.produit_slugs.length * options.plan_slugs.length;
  let cellsFilled = 0;
  for (const m of options.motif_slugs) {
    for (const p of options.produit_slugs) {
      for (const pl of options.plan_slugs) {
        if (matrix[m][p][pl].count > 0) cellsFilled += 1;
      }
    }
  }

  const axisFromTags = (
    category: TagCategory,
    slugs: string[],
  ): AuditAxis[] => {
    return slugs.map((slug) => {
      let label = slug.toUpperCase();
      for (const t of tagsById.values()) {
        if (t.category === category && t.slug === slug) {
          label = t.label;
          break;
        }
      }
      return { slug, label };
    });
  };

  return {
    motifs: axisFromTags("motif", options.motif_slugs),
    produits: axisFromTags("gabarit", options.produit_slugs),
    plans: axisFromTags("plan", options.plan_slugs),
    matrix,
    totals: {
      cells_total: cellsTotal,
      cells_filled: cellsFilled,
      photos_total: photosTotal,
    },
  };
}

export async function tagsUsageCount(): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  if (!supabase) {
    for (const row of memStore().media.values()) {
      for (const tagId of row.tag_ids) {
        counts.set(tagId, (counts.get(tagId) ?? 0) + 1);
      }
    }
    return counts;
  }
  const { data, error } = await supabase.from(TBL_LINK).select("tag_id");
  if (error) throw new Error(`Comptage tags échoué : ${error.message}`);
  for (const link of (data ?? []) as { tag_id: string }[]) {
    counts.set(link.tag_id, (counts.get(link.tag_id) ?? 0) + 1);
  }
  return counts;
}
