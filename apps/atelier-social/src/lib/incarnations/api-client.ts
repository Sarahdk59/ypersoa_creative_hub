/**
 * Incarnations — fetchers côté client.
 */

import type {
  IncarnationEnriched,
  IncarnationFilters,
  IncarnationListResponse,
  IncarnationPhoto,
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
  variante_file?: string | null;
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

export interface MotifVariantesResponse {
  motif: { id: string; nom_commercial: string; asset_principal: string };
  variantes: Array<{
    file: string;
    label: string;
    tags?: string[];
    destinataires?: string[];
    occasions?: string[];
    produits?: string[];
  }>;
}

export async function fetchMotifVariantes(
  motifId: string,
): Promise<MotifVariantesResponse> {
  const res = await fetch(`/api/da/motifs/${encodeURIComponent(motifId)}/variantes`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`fetchMotifVariantes ${res.status}`);
  return (await res.json()) as MotifVariantesResponse;
}

export interface UploadVarianteResult {
  ok: boolean;
  data?: { id: string; type: string; file: string; label: string; tags?: string[] };
  error?: string;
}

export async function uploadMotifVariante(
  motifId: string,
  input: { file: File; label: string; tags?: string },
): Promise<UploadVarianteResult> {
  const fd = new FormData();
  fd.append("file", input.file);
  fd.append("label", input.label);
  fd.append("type", "variante");
  if (input.tags) fd.append("tags", input.tags);
  const res = await fetch(`/api/da/motifs/${encodeURIComponent(motifId)}/upload`, {
    method: "POST",
    body: fd,
  });
  return (await res.json()) as UploadVarianteResult;
}

// ─── Photos liaison ────────────────────────────────────────────────────────

export async function fetchIncarnationPhotos(
  code: string,
): Promise<IncarnationPhoto[]> {
  const res = await fetch(
    `/api/da/incarnations/${encodeURIComponent(code)}/photos`,
    { cache: "no-store" },
  );
  if (!res.ok) throw new Error(`fetchIncarnationPhotos ${res.status}`);
  const data = (await res.json()) as { photos: IncarnationPhoto[] };
  return data.photos;
}

export async function linkPhotoToIncarnation(
  code: string,
  input: {
    media_id: string;
    gabarit: string;
    couleur_produit?: string | null;
    is_hero?: boolean;
  },
): Promise<IncarnationPhoto> {
  const res = await fetch(
    `/api/da/incarnations/${encodeURIComponent(code)}/photos`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    },
  );
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`linkPhotoToIncarnation ${res.status} : ${txt}`);
  }
  return (await res.json()) as IncarnationPhoto;
}

export async function unlinkPhoto(code: string, photoId: string): Promise<void> {
  const res = await fetch(
    `/api/da/incarnations/${encodeURIComponent(code)}/photos/${photoId}`,
    { method: "DELETE" },
  );
  if (!res.ok) throw new Error(`unlinkPhoto ${res.status}`);
}

export async function updatePhotoLink(
  code: string,
  photoId: string,
  patch: { is_hero?: boolean; ordre?: number; gabarit?: string; couleur_produit?: string | null },
): Promise<IncarnationPhoto> {
  const res = await fetch(
    `/api/da/incarnations/${encodeURIComponent(code)}/photos/${photoId}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    },
  );
  if (!res.ok) throw new Error(`updatePhotoLink ${res.status}`);
  return (await res.json()) as IncarnationPhoto;
}

export async function reorderPhotos(
  code: string,
  gabarit: string,
  photoIds: string[],
): Promise<IncarnationPhoto[]> {
  const res = await fetch(
    `/api/da/incarnations/${encodeURIComponent(code)}/photos`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reorder: { gabarit, photo_ids: photoIds } }),
    },
  );
  if (!res.ok) throw new Error(`reorderPhotos ${res.status}`);
  const data = (await res.json()) as { photos: IncarnationPhoto[] };
  return data.photos;
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
