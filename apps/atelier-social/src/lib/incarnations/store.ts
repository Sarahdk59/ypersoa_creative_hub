/**
 * Incarnations — couche d'accès aux données (Sprint 1 = in-memory).
 *
 * Sprint 2 : remplacer par les helpers Supabase.
 */

import { randomUUID } from "node:crypto";

import type {
  Incarnation,
  IncarnationEnriched,
  IncarnationFilters,
  IncarnationListResponse,
  IncarnationPhoto,
  IncarnationStatut,
  IncarnationTon,
  Motif,
  SpecBroderie,
} from "@/types/incarnations";
import { getMedia as getMediaById } from "@/lib/mediatheque/store";
import { SEED_INCARNATIONS, SEED_MOTIFS } from "./seed";

interface IncarnationPhotoRow {
  id: string;
  incarnation_id: string;
  media_id: string;
  gabarit: string;
  couleur_produit: string | null;
  is_hero: boolean;
  ordre: number;
  created_at: string;
}

declare global {
  // eslint-disable-next-line no-var
  var __ypersoa_incarnations_store__:
    | {
        motifs: Map<string, Motif>;
        incarnations: Map<string, Incarnation>;
        photos: Map<string, IncarnationPhotoRow>;
        seeded: boolean;
      }
    | undefined;
}

function getStore() {
  if (!globalThis.__ypersoa_incarnations_store__) {
    globalThis.__ypersoa_incarnations_store__ = {
      motifs: new Map(),
      incarnations: new Map(),
      photos: new Map(),
      seeded: false,
    };
  }
  const s = globalThis.__ypersoa_incarnations_store__;
  // HMR safety : si le global a été créé par une version précédente du module
  // qui ne connaissait pas un champ (ex. `photos`), backfiller pour éviter
  // un TypeError sur `undefined.values()` après un hot reload.
  if (!s.motifs) s.motifs = new Map();
  if (!s.incarnations) s.incarnations = new Map();
  if (!s.photos) s.photos = new Map();
  if (!s.seeded) {
    for (const m of SEED_MOTIFS) s.motifs.set(m.code, m);
    for (const i of SEED_INCARNATIONS) s.incarnations.set(i.id, i);
    s.seeded = true;
  }
  return s;
}

async function loadIncarnationPhotos(incarnationId: string): Promise<IncarnationPhoto[]> {
  const store = getStore();
  const rows = Array.from(store.photos.values()).filter(
    (p) => p.incarnation_id === incarnationId,
  );
  rows.sort((a, b) => {
    if (a.is_hero !== b.is_hero) return a.is_hero ? -1 : 1;
    return a.ordre - b.ordre;
  });
  const out: IncarnationPhoto[] = [];
  for (const row of rows) {
    const media = await getMediaById(row.media_id);
    if (!media) continue;
    out.push({
      id: row.id,
      gabarit: row.gabarit,
      couleur_produit: row.couleur_produit,
      media_id: row.media_id,
      public_url: media.public_url,
      filename: media.filename,
      width: media.width,
      height: media.height,
      is_hero: row.is_hero,
      ordre: row.ordre,
      created_at: row.created_at,
    });
  }
  return out;
}

async function enrichAsync(inc: Incarnation): Promise<IncarnationEnriched> {
  const motif = getStore().motifs.get(inc.motif_ypm);
  const photos = await loadIncarnationPhotos(inc.id);
  const gabaritsShootes = new Set(photos.map((p) => p.gabarit));
  return {
    ...inc,
    motif_nom: motif?.nom ?? inc.motif_ypm,
    motif_famille: motif?.famille ?? null,
    gabarits_shootes_count: gabaritsShootes.size,
    gabarits_cibles_count: inc.gabarits_cibles.length,
    photos,
  };
}


// ─── MOTIFS ────────────────────────────────────────────────────────────────

export async function listMotifs(): Promise<Motif[]> {
  return Array.from(getStore().motifs.values()).sort((a, b) =>
    a.code.localeCompare(b.code),
  );
}

export async function getMotif(code: string): Promise<Motif | null> {
  return getStore().motifs.get(code) ?? null;
}

// ─── INCARNATIONS ──────────────────────────────────────────────────────────

export async function listIncarnations(
  filters: IncarnationFilters = {},
): Promise<IncarnationListResponse> {
  const store = getStore();
  let rows = Array.from(store.incarnations.values());

  if (filters.motif_ypm) {
    rows = rows.filter((i) => i.motif_ypm === filters.motif_ypm);
  }
  if (filters.statut) {
    rows = rows.filter((i) => i.statut === filters.statut);
  }
  if (filters.ton) {
    rows = rows.filter((i) => i.ton === filters.ton);
  }
  if (filters.gabarit) {
    rows = rows.filter((i) => i.gabarits_cibles.includes(filters.gabarit!));
  }
  if (filters.collection) {
    rows = rows.filter((i) =>
      i.collections_cibles.includes(filters.collection!),
    );
  }
  if (filters.q) {
    const q = filters.q.toLowerCase().trim();
    rows = rows.filter(
      (i) =>
        i.nom_commercial.toLowerCase().includes(q) ||
        i.code.toLowerCase().includes(q) ||
        i.spec_broderie.mot_haut.toLowerCase().includes(q) ||
        i.spec_broderie.mot_bas.toLowerCase().includes(q),
    );
  }

  const sort = filters.sort ?? "code_asc";
  rows.sort((a, b) => {
    if (sort === "nom_asc") return a.nom_commercial.localeCompare(b.nom_commercial);
    if (sort === "statut") return a.statut.localeCompare(b.statut);
    if (sort === "updated_desc") {
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
    }
    return a.code.localeCompare(b.code);
  });

  return {
    data: await Promise.all(rows.map(enrichAsync)),
    meta: { total: rows.length },
  };
}

export async function getIncarnationByCode(
  code: string,
): Promise<IncarnationEnriched | null> {
  for (const inc of getStore().incarnations.values()) {
    if (inc.code === code) return enrichAsync(inc);
  }
  return null;
}

export async function getIncarnationById(
  id: string,
): Promise<IncarnationEnriched | null> {
  const inc = getStore().incarnations.get(id);
  return inc ? enrichAsync(inc) : null;
}

export interface CreateIncarnationInput {
  code?: string;
  nom_commercial: string;
  motif_ypm: string;
  spec_broderie: SpecBroderie;
  gabarits_cibles?: string[];
  collections_cibles?: string[];
  ton?: IncarnationTon | null;
  statut?: IncarnationStatut;
  description_template?: string;
  notes?: string;
}

function nextCode(store: ReturnType<typeof getStore>): string {
  let max = 0;
  for (const inc of store.incarnations.values()) {
    const m = inc.code.match(/^YPI-(\d{3,})$/);
    if (m) {
      const n = parseInt(m[1], 10);
      if (n > max) max = n;
    }
  }
  return `YPI-${String(max + 1).padStart(3, "0")}`;
}

export async function createIncarnation(
  input: CreateIncarnationInput,
): Promise<IncarnationEnriched> {
  const store = getStore();
  if (!store.motifs.has(input.motif_ypm)) {
    throw new Error(`Motif inconnu : ${input.motif_ypm}`);
  }
  const code = input.code?.trim() || nextCode(store);
  for (const inc of store.incarnations.values()) {
    if (inc.code === code) {
      throw new Error(`Code déjà utilisé : ${code}`);
    }
  }
  const now = new Date().toISOString();
  const inc: Incarnation = {
    id: randomUUID(),
    code,
    nom_commercial: input.nom_commercial,
    motif_ypm: input.motif_ypm,
    spec_broderie: input.spec_broderie,
    gabarits_cibles: input.gabarits_cibles ?? [],
    collections_cibles: input.collections_cibles ?? [],
    ton: input.ton ?? null,
    statut: input.statut ?? "concept",
    description_template: input.description_template ?? null,
    notes: input.notes ?? null,
    created_at: now,
    updated_at: now,
  };
  store.incarnations.set(inc.id, inc);
  return enrichAsync(inc);
}

export interface UpdateIncarnationInput {
  nom_commercial?: string;
  motif_ypm?: string;
  variante_file?: string | null;
  spec_broderie?: SpecBroderie;
  gabarits_cibles?: string[];
  collections_cibles?: string[];
  ton?: IncarnationTon | null;
  statut?: IncarnationStatut;
  description_template?: string | null;
  notes?: string | null;
}

export async function updateIncarnationByCode(
  code: string,
  patch: UpdateIncarnationInput,
): Promise<IncarnationEnriched | null> {
  const store = getStore();
  let target: Incarnation | undefined;
  for (const inc of store.incarnations.values()) {
    if (inc.code === code) {
      target = inc;
      break;
    }
  }
  if (!target) return null;
  if (patch.motif_ypm && !store.motifs.has(patch.motif_ypm)) {
    throw new Error(`Motif inconnu : ${patch.motif_ypm}`);
  }
  Object.assign(target, patch);
  target.updated_at = new Date().toISOString();
  return enrichAsync(target);
}

export async function deleteIncarnationByCode(code: string): Promise<boolean> {
  const store = getStore();
  for (const [id, inc] of store.incarnations) {
    if (inc.code === code) {
      store.incarnations.delete(id);
      return true;
    }
  }
  return false;
}

// ─── INCARNATIONS_PHOTOS (liaison médiathèque) ───────────────────────────

export interface AddPhotoInput {
  media_id: string;
  gabarit: string;
  couleur_produit?: string | null;
  is_hero?: boolean;
}

export async function listIncarnationPhotos(
  code: string,
): Promise<IncarnationPhoto[]> {
  for (const inc of getStore().incarnations.values()) {
    if (inc.code === code) return loadIncarnationPhotos(inc.id);
  }
  return [];
}

export async function addPhotoToIncarnation(
  code: string,
  input: AddPhotoInput,
): Promise<IncarnationPhoto | null> {
  const store = getStore();
  let inc: Incarnation | undefined;
  for (const i of store.incarnations.values()) {
    if (i.code === code) {
      inc = i;
      break;
    }
  }
  if (!inc) return null;

  const media = await getMediaById(input.media_id);
  if (!media) throw new Error(`Media inconnu : ${input.media_id}`);

  // Pas de double liaison du même media sur la même incarnation
  for (const row of store.photos.values()) {
    if (row.incarnation_id === inc.id && row.media_id === input.media_id) {
      return {
        id: row.id,
        gabarit: row.gabarit,
        couleur_produit: row.couleur_produit,
        media_id: row.media_id,
        public_url: media.public_url,
        filename: media.filename,
        width: media.width,
        height: media.height,
        is_hero: row.is_hero,
        ordre: row.ordre,
        created_at: row.created_at,
      };
    }
  }

  // Calcul de l'ordre suivant pour ce gabarit
  let maxOrdre = -1;
  for (const row of store.photos.values()) {
    if (row.incarnation_id === inc.id && row.gabarit === input.gabarit) {
      if (row.ordre > maxOrdre) maxOrdre = row.ordre;
    }
  }

  // Si is_hero demandé, démasquer les autres heros du même gabarit
  if (input.is_hero) {
    for (const row of store.photos.values()) {
      if (row.incarnation_id === inc.id && row.gabarit === input.gabarit && row.is_hero) {
        row.is_hero = false;
      }
    }
  }

  const row: IncarnationPhotoRow = {
    id: randomUUID(),
    incarnation_id: inc.id,
    media_id: input.media_id,
    gabarit: input.gabarit,
    couleur_produit: input.couleur_produit ?? null,
    is_hero: Boolean(input.is_hero),
    ordre: maxOrdre + 1,
    created_at: new Date().toISOString(),
  };
  store.photos.set(row.id, row);
  inc.updated_at = new Date().toISOString();

  return {
    id: row.id,
    gabarit: row.gabarit,
    couleur_produit: row.couleur_produit,
    media_id: row.media_id,
    public_url: media.public_url,
    filename: media.filename,
    width: media.width,
    height: media.height,
    is_hero: row.is_hero,
    ordre: row.ordre,
    created_at: row.created_at,
  };
}

export async function removePhotoFromIncarnation(
  code: string,
  photoId: string,
): Promise<boolean> {
  const store = getStore();
  let inc: Incarnation | undefined;
  for (const i of store.incarnations.values()) {
    if (i.code === code) {
      inc = i;
      break;
    }
  }
  if (!inc) return false;
  const row = store.photos.get(photoId);
  if (!row || row.incarnation_id !== inc.id) return false;
  store.photos.delete(photoId);
  inc.updated_at = new Date().toISOString();
  return true;
}

export interface UpdatePhotoInput {
  is_hero?: boolean;
  ordre?: number;
  gabarit?: string;
  couleur_produit?: string | null;
}

export async function updateIncarnationPhoto(
  code: string,
  photoId: string,
  patch: UpdatePhotoInput,
): Promise<IncarnationPhoto | null> {
  const store = getStore();
  let inc: Incarnation | undefined;
  for (const i of store.incarnations.values()) {
    if (i.code === code) {
      inc = i;
      break;
    }
  }
  if (!inc) return null;
  const row = store.photos.get(photoId);
  if (!row || row.incarnation_id !== inc.id) return null;

  // is_hero exclusif par (incarnation, gabarit)
  if (patch.is_hero === true) {
    const targetGabarit = patch.gabarit ?? row.gabarit;
    for (const other of store.photos.values()) {
      if (
        other.incarnation_id === inc.id &&
        other.gabarit === targetGabarit &&
        other.id !== row.id
      ) {
        other.is_hero = false;
      }
    }
  }

  if (patch.is_hero !== undefined) row.is_hero = patch.is_hero;
  if (patch.ordre !== undefined) row.ordre = patch.ordre;
  if (patch.gabarit !== undefined) row.gabarit = patch.gabarit;
  if (patch.couleur_produit !== undefined) row.couleur_produit = patch.couleur_produit;

  inc.updated_at = new Date().toISOString();

  const media = await getMediaById(row.media_id);
  return {
    id: row.id,
    gabarit: row.gabarit,
    couleur_produit: row.couleur_produit,
    media_id: row.media_id,
    public_url: media?.public_url ?? "",
    filename: media?.filename ?? "",
    width: media?.width,
    height: media?.height,
    is_hero: row.is_hero,
    ordre: row.ordre,
    created_at: row.created_at,
  };
}

/** Ré-ordonner toutes les photos d'un (incarnation, gabarit) selon l'ordre reçu. */
export async function reorderIncarnationPhotos(
  code: string,
  gabarit: string,
  orderedPhotoIds: string[],
): Promise<IncarnationPhoto[]> {
  const store = getStore();
  let inc: Incarnation | undefined;
  for (const i of store.incarnations.values()) {
    if (i.code === code) {
      inc = i;
      break;
    }
  }
  if (!inc) return [];

  for (let i = 0; i < orderedPhotoIds.length; i++) {
    const row = store.photos.get(orderedPhotoIds[i]);
    if (row && row.incarnation_id === inc.id && row.gabarit === gabarit) {
      row.ordre = i;
    }
  }
  inc.updated_at = new Date().toISOString();
  return loadIncarnationPhotos(inc.id);
}

/** Helpers utilisés par l'audit pour calculer les stats globales. */
export async function tagsPhotosCountByIncarnationGabarit(): Promise<
  Map<string, { count: number; hasHero: boolean }>
> {
  const store = getStore();
  const map = new Map<string, { count: number; hasHero: boolean }>();
  for (const row of store.photos.values()) {
    const key = `${row.incarnation_id}__${row.gabarit}`;
    const cur = map.get(key) ?? { count: 0, hasHero: false };
    cur.count += 1;
    if (row.is_hero) cur.hasHero = true;
    map.set(key, cur);
  }
  return map;
}

// ─── IMPORT XLSX ───────────────────────────────────────────────────────────

export type ImportRowAction = "create" | "update" | "skip";

export interface ImportRow {
  action: ImportRowAction;
  code: string;
  nom_commercial: string;
  motif_ypm: string;
  spec_broderie: SpecBroderie;
  gabarits_cibles: string[];
  collections_cibles: string[];
  ton: IncarnationTon | null;
  statut: IncarnationStatut;
  notes?: string | null;
  errors?: string[];
}

export interface ImportApplyResult {
  created: number;
  updated: number;
  skipped: number;
  errors: Array<{ code: string; message: string }>;
}

export async function applyImport(rows: ImportRow[]): Promise<ImportApplyResult> {
  const store = getStore();
  const result: ImportApplyResult = {
    created: 0,
    updated: 0,
    skipped: 0,
    errors: [],
  };
  for (const row of rows) {
    if (row.action === "skip") {
      result.skipped += 1;
      continue;
    }
    if (!store.motifs.has(row.motif_ypm)) {
      result.errors.push({
        code: row.code,
        message: `Motif inconnu : ${row.motif_ypm}`,
      });
      continue;
    }
    // Recherche existante par code
    let existing: Incarnation | undefined;
    for (const inc of store.incarnations.values()) {
      if (inc.code === row.code) {
        existing = inc;
        break;
      }
    }
    const now = new Date().toISOString();
    if (existing && row.action === "update") {
      existing.nom_commercial = row.nom_commercial;
      existing.motif_ypm = row.motif_ypm;
      existing.spec_broderie = row.spec_broderie;
      existing.gabarits_cibles = row.gabarits_cibles;
      existing.collections_cibles = row.collections_cibles;
      existing.ton = row.ton;
      existing.statut = row.statut;
      existing.notes = row.notes ?? existing.notes;
      existing.updated_at = now;
      result.updated += 1;
    } else if (!existing && row.action === "create") {
      const inc: Incarnation = {
        id: randomUUID(),
        code: row.code,
        nom_commercial: row.nom_commercial,
        motif_ypm: row.motif_ypm,
        spec_broderie: row.spec_broderie,
        gabarits_cibles: row.gabarits_cibles,
        collections_cibles: row.collections_cibles,
        ton: row.ton,
        statut: row.statut,
        description_template: null,
        notes: row.notes ?? null,
        created_at: now,
        updated_at: now,
      };
      store.incarnations.set(inc.id, inc);
      result.created += 1;
    } else {
      result.skipped += 1;
    }
  }
  return result;
}
