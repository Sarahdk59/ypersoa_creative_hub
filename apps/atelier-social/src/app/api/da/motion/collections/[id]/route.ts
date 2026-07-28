import { NextRequest, NextResponse } from "next/server";
import {
  deleteCollection,
  getCollection,
  updateCollection,
  type UpdateCollectionInput,
} from "@/lib/motion/collections-store";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_req: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  try {
    const col = await getCollection(id);
    if (!col) {
      return NextResponse.json({ error: "Collection introuvable" }, { status: 404 });
    }
    return NextResponse.json(col);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erreur lecture" },
      { status: 500 },
    );
  }
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }

  const input = body as Record<string, unknown>;
  const payload: UpdateCollectionInput = {};

  if (typeof input.label === "string") payload.label = input.label.trim();
  if ("description" in input)
    payload.description = typeof input.description === "string" ? input.description : null;

  if (Array.isArray(input.shots)) {
    payload.shots = (input.shots as Array<Record<string, unknown>>).map((s, i) => ({
      shot_type: typeof s.shot_type === "string" ? s.shot_type : "LIFESTYLE MODE",
      public_url: String(s.public_url ?? ""),
      media_id: typeof s.media_id === "string" ? s.media_id : null,
      source_type: (["media", "liked-shot", "url"].includes(s.source_type as string)
        ? s.source_type
        : "media") as "media" | "liked-shot" | "url",
      source_id: typeof s.source_id === "string" ? s.source_id : null,
      ordre: typeof s.ordre === "number" ? s.ordre : i,
    }));
  }

  try {
    const updated = await updateCollection(id, payload);
    return NextResponse.json(updated);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erreur mise à jour" },
      { status: 500 },
    );
  }
}

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  try {
    await deleteCollection(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erreur suppression" },
      { status: 500 },
    );
  }
}
