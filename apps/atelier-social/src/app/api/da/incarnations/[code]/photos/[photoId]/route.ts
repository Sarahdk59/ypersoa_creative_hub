import { NextRequest, NextResponse } from "next/server";

import {
  removePhotoFromIncarnation,
  updateIncarnationPhoto,
} from "@/lib/incarnations/store";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ code: string; photoId: string }> },
) {
  const { code, photoId } = await params;
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
  const patch: Parameters<typeof updateIncarnationPhoto>[2] = {};
  if (typeof input.is_hero === "boolean") patch.is_hero = input.is_hero;
  if (typeof input.ordre === "number") patch.ordre = input.ordre;
  if (typeof input.gabarit === "string") patch.gabarit = input.gabarit;
  if (input.couleur_produit === null || typeof input.couleur_produit === "string") {
    patch.couleur_produit = input.couleur_produit as string | null;
  }
  const photo = await updateIncarnationPhoto(code, photoId, patch);
  if (!photo) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json(photo);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ code: string; photoId: string }> },
) {
  const { code, photoId } = await params;
  const ok = await removePhotoFromIncarnation(code, photoId);
  if (!ok) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ deleted: true });
}
