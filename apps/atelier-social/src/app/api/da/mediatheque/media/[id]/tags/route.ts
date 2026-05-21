import { NextRequest, NextResponse } from "next/server";

import { addTagToMedia, removeTagFromMedia } from "@/lib/mediatheque/store";

export async function POST(
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
  const tagId =
    body && typeof body === "object" && typeof (body as Record<string, unknown>).tag_id === "string"
      ? ((body as Record<string, unknown>).tag_id as string)
      : null;
  if (!tagId) {
    return NextResponse.json({ error: "tag_id required" }, { status: 400 });
  }
  const updated = await addTagToMedia(id, tagId);
  if (!updated) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json(updated);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const tagId = req.nextUrl.searchParams.get("tag_id");
  if (!tagId) {
    return NextResponse.json({ error: "tag_id required" }, { status: 400 });
  }
  const updated = await removeTagFromMedia(id, tagId);
  if (!updated) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json(updated);
}
