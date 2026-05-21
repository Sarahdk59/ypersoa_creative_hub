import { NextRequest, NextResponse } from "next/server";

import type { MediaSource, MediaStatut } from "@/types/mediatheque";
import { deleteMedia, getMedia, updateMedia } from "@/lib/mediatheque/store";

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

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const media = await getMedia(id);
  if (!media) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json(media);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
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

  const patch: Parameters<typeof updateMedia>[1] = {};
  if (typeof input.filename === "string") patch.filename = input.filename;
  if (
    typeof input.source === "string" &&
    VALID_SOURCES.has(input.source as MediaSource)
  ) {
    patch.source = input.source as MediaSource;
  }
  if (input.date_shoot === null || typeof input.date_shoot === "string") {
    patch.date_shoot = input.date_shoot as string | null;
  }
  if (input.photographe === null || typeof input.photographe === "string") {
    patch.photographe = input.photographe as string | null;
  }
  if (
    typeof input.statut === "string" &&
    VALID_STATUTS.has(input.statut as MediaStatut)
  ) {
    patch.statut = input.statut as MediaStatut;
  }
  if (input.notes === null || typeof input.notes === "string") {
    patch.notes = input.notes as string | null;
  }

  const updated = await updateMedia(id, patch);
  if (!updated) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const ok = await deleteMedia(id);
  if (!ok) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ deleted: true });
}
