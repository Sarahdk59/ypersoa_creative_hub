/**
 * Incarnations — fetchers côté client.
 */

import type {
  IncarnationEnriched,
  IncarnationFilters,
  IncarnationListResponse,
  IncarnationStatut,
  IncarnationTon,
  Motif,
  SpecBroderie,
} from "@/types/incarnations";
import type { ImportApplyResult, ImportRow } from "./store";

function toQuery(filters: IncarnationFilters): URLSearchParams {
  const p = new URLSearchParams();
  if (filters.motif_ypm) p.set("motif_ypm", filters.motif_ypm);
  if (filters.statut) p.set("statut", filters.statut);
  if (filters.ton) p.set("ton", filters.ton);
  if (filters.gabarit) p.set("gabarit", filters.gabarit);
  if (filters.collection) p.set("collection", filters.collection);
  if (filters.q) p.set("q", filters.q);
  if (filters.sort) p.set("sort", filters.sort);
  return p;
}

export async function fetchIncarnations(
  filters: IncarnationFilters = {},
): Promise<IncarnationListResponse> {
  const qs = toQuery(filters).toString();
  const res = await fetch(`/api/da/incarnations${qs ? `?${qs}` : ""}`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`fetchIncarnations ${res.status}`);
  return (await res.json()) as IncarnationListResponse;
}

export async function fetchIncarnationByCode(
  code: string,
): Promise<IncarnationEnriched> {
  const res = await fetch(`/api/da/incarnations/${encodeURIComponent(code)}`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`fetchIncarnationByCode ${res.status}`);
  return (await res.json()) as IncarnationEnriched;
}

export interface CreateIncarnationPayload {
  code?: string;
  nom_commercial: string;
  motif_ypm: string;
  spec_broderie: SpecBroderie;
  gabarits_cibles?: string[];
  collections_cibles?: string[];
  ton?: IncarnationTon | null;
  statut?: IncarnationStatut;
  notes?: string;
}

export async function createIncarnation(
  input: CreateIncarnationPayload,
): Promise<IncarnationEnriched> {
  const res = await fetch(`/api/da/incarnations`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`createIncarnation ${res.status} : ${txt}`);
  }
  return (await res.json()) as IncarnationEnriched;
}

export async function updateIncarnation(
  code: string,
  patch: Partial<CreateIncarnationPayload>,
): Promise<IncarnationEnriched> {
  const res = await fetch(`/api/da/incarnations/${encodeURIComponent(code)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`updateIncarnation ${res.status} : ${txt}`);
  }
  return (await res.json()) as IncarnationEnriched;
}

export async function deleteIncarnation(code: string): Promise<void> {
  const res = await fetch(`/api/da/incarnations/${encodeURIComponent(code)}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error(`deleteIncarnation ${res.status}`);
}

export async function fetchMotifs(): Promise<Motif[]> {
  const res = await fetch(`/api/da/motifs`, { cache: "no-store" });
  if (!res.ok) throw new Error(`fetchMotifs ${res.status}`);
  return (await res.json()) as Motif[];
}

export interface PreviewXlsxResponse {
  rows: ImportRow[];
  errors: string[];
  sheetUsed: string | null;
  totalRows: number;
}

export async function previewXlsx(file: File): Promise<PreviewXlsxResponse> {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch(`/api/da/incarnations/import-xlsx`, {
    method: "POST",
    body: fd,
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`previewXlsx ${res.status} : ${txt}`);
  }
  return (await res.json()) as PreviewXlsxResponse;
}

export async function applyImportXlsx(
  rows: ImportRow[],
): Promise<ImportApplyResult> {
  const res = await fetch(`/api/da/incarnations/import-xlsx/apply`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ rows }),
  });
  if (!res.ok) throw new Error(`applyImportXlsx ${res.status}`);
  return (await res.json()) as ImportApplyResult;
}
