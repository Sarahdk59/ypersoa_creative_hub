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
  IncarnationStatut,
  IncarnationTon,
  Motif,
  SpecBroderie,
} from "@/types/incarnations";
import { SEED_INCARNATIONS, SEED_MOTIFS } from "./seed";

declare global {
  // eslint-disable-next-line no-var
  var __ypersoa_incarnations_store__:
    | {
        motifs: Map<string, Motif>;
        incarnations: Map<string, Incarnation>;
        seeded: boolean;
      }
    | undefined;
}

function getStore() {
  if (!globalThis.__ypersoa_incarnations_store__) {
    globalThis.__ypersoa_incarnations_store__ = {
      motifs: new Map(),
      incarnations: new Map(),
      seeded: false,
    };
  }
  const s = globalThis.__ypersoa_incarnations_store__;
  if (!s.seeded) {
    for (const m of SEED_MOTIFS) s.motifs.set(m.code, m);
    for (const i of SEED_INCARNATIONS) s.incarnations.set(i.id, i);
    s.seeded = true;
  }
  return s;
}

function enrich(inc: Incarnation): IncarnationEnriched {
  const motif = getStore().motifs.get(inc.motif_ypm);
  return {
    ...inc,
    motif_nom: motif?.nom ?? inc.motif_ypm,
    motif_famille: motif?.famille ?? null,
    gabarits_shootes_count: 0, // sera calculé en Sprint 2 depuis incarnations_photos
    gabarits_cibles_count: inc.gabarits_cibles.length,
    photos: [],
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
    data: rows.map(enrich),
    meta: { total: rows.length },
  };
}

export async function getIncarnationByCode(
  code: string,
): Promise<IncarnationEnriched | null> {
  for (const inc of getStore().incarnations.values()) {
    if (inc.code === code) return enrich(inc);
  }
  return null;
}

export async function getIncarnationById(
  id: string,
): Promise<IncarnationEnriched | null> {
  const inc = getStore().incarnations.get(id);
  return inc ? enrich(inc) : null;
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
  return enrich(inc);
}

export interface UpdateIncarnationInput {
  nom_commercial?: string;
  motif_ypm?: string;
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
  return enrich(target);
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
