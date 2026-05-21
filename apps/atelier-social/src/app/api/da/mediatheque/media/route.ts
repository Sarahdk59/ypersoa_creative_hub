import { NextRequest, NextResponse } from "next/server";

import type {
  MediaFilters,
  MediaSource,
  MediaStatut,
  SortOrder,
} from "@/types/mediatheque";
import { createMedia, listMedia } from "@/lib/mediatheque/store";

const VALID_SOURCES = new Set<MediaSource>([
  "shooting_studio",
  "shooting_lifestyle",
  "ia_generation",
  "packshot",
  "user_content",
]);

const VALID_STATUTS = new Set<MediaStatut>([
  "a_valider",
  "validee",
  "publiee_shopify",
  "archivee",
]);

const VALID_SORTS = new Set<SortOrder>(["date_desc", "date_asc", "name_asc"]);

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const filters: MediaFilters = {};

  const tags = sp.getAll("tags");
  if (tags.length > 0) filters.tags = tags;
  const q = sp.get("q");
  if (q) filters.q = q;
  const source = sp.get("source");
  if (source && VALID_SOURCES.has(source as MediaSource)) {
    filters.source = source as MediaSource;
  }
  const statut = sp.get("statut");
  if (statut && VALID_STATUTS.has(statut as MediaStatut)) {
    filters.statut = statut as MediaStatut;
  }
  const sort = sp.get("sort");
  if (sort && VALID_SORTS.has(sort as SortOrder)) {
    filters.sort = sort as SortOrder;
  }
  const page = Number(sp.get("page"));
  if (Number.isFinite(page) && page > 0) filters.page = page;
  const perPage = Number(sp.get("per_page"));
  if (Number.isFinite(perPage) && perPage > 0 && perPage <= 200) {
    filters.per_page = perPage;
  }

  const response = await listMedia(filters);
  return NextResponse.json(response);
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Body required" }, { status: 400 });
  }
  const input = body as Record<string, unknown>;

  if (typeof input.filename !== "string" || !input.filename.trim()) {
    return NextResponse.json({ error: "filename required" }, { status: 400 });
  }
  if (typeof input.public_url !== "string" || !input.public_url.trim()) {
    return NextResponse.json({ error: "public_url required" }, { status: 400 });
  }
  if (
    typeof input.source !== "string" ||
    !VALID_SOURCES.has(input.source as MediaSource)
  ) {
    return NextResponse.json({ error: "source invalid" }, { status: 400 });
  }

  const tagIds = Array.isArray(input.tag_ids)
    ? input.tag_ids.filter((t): t is string => typeof t === "string")
    : [];

  const media = await createMedia({
    filename: input.filename,
    public_url: input.public_url,
    storage_path: typeof input.storage_path === "string" ? input.storage_path : undefined,
    width: typeof input.width === "number" ? input.width : undefined,
    height: typeof input.height === "number" ? input.height : undefined,
    size_bytes: typeof input.size_bytes === "number" ? input.size_bytes : undefined,
    mime_type: typeof input.mime_type === "string" ? input.mime_type : undefined,
    source: input.source as MediaSource,
    date_shoot: typeof input.date_shoot === "string" ? input.date_shoot : undefined,
    photographe: typeof input.photographe === "string" ? input.photographe : undefined,
    statut:
      typeof input.statut === "string" && VALID_STATUTS.has(input.statut as MediaStatut)
        ? (input.statut as MediaStatut)
        : undefined,
    notes: typeof input.notes === "string" ? input.notes : undefined,
    uploaded_by: typeof input.uploaded_by === "string" ? input.uploaded_by : undefined,
    tag_ids: tagIds,
  });

  return NextResponse.json(media, { status: 201 });
}
