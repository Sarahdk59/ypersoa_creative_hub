import { NextRequest, NextResponse } from "next/server";

import {
  addPhotoToIncarnation,
  listIncarnationPhotos,
  reorderIncarnationPhotos,
} from "@/lib/incarnations/store";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;
  const photos = await listIncarnationPhotos(code);
  return NextResponse.json({ photos });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;
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

  // Mode reorder : { reorder: { gabarit, photo_ids: [] } }
  if (input.reorder && typeof input.reorder === "object") {
    const r = input.reorder as Record<string, unknown>;
    if (typeof r.gabarit !== "string" || !Array.isArray(r.photo_ids)) {
      return NextResponse.json({ error: "reorder.gabarit + photo_ids required" }, { status: 400 });
    }
    const ids = r.photo_ids.filter((x): x is string => typeof x === "string");
    const photos = await reorderIncarnationPhotos(code, r.gabarit, ids);
    return NextResponse.json({ photos });
  }

  // Mode liaison single
  if (typeof input.media_id !== "string" || !input.media_id) {
    return NextResponse.json({ error: "media_id required" }, { status: 400 });
  }
  if (typeof input.gabarit !== "string" || !input.gabarit) {
    return NextResponse.json({ error: "gabarit required" }, { status: 400 });
  }
  try {
    const photo = await addPhotoToIncarnation(code, {
      media_id: input.media_id,
      gabarit: input.gabarit,
      couleur_produit:
        typeof input.couleur_produit === "string" ? input.couleur_produit : null,
      is_hero: Boolean(input.is_hero),
    });
    if (!photo) return NextResponse.json({ error: "not_found" }, { status: 404 });
    return NextResponse.json(photo, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erreur liaison" },
      { status: 400 },
    );
  }
}
