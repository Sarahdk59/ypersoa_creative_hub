import { NextRequest, NextResponse } from "next/server";
import { getEpisode, patchEpisode, deleteEpisode } from "@/lib/studio-mood/episodes-loader";
import type { EpisodePatch } from "@/lib/studio-mood/types";

export const runtime = "nodejs";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const ep = await getEpisode(id);
    if (!ep) return NextResponse.json({ message: "Épisode introuvable" }, { status: 404 });
    return NextResponse.json({ data: ep });
  } catch (e) {
    return NextResponse.json({ message: String(e) }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  let body: EpisodePatch;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Body JSON invalide" }, { status: 400 });
  }
  try {
    const ep = await patchEpisode(id, body);
    return NextResponse.json({ data: ep });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("introuvable") || msg.includes("0 rows")) {
      return NextResponse.json({ message: "Épisode introuvable" }, { status: 404 });
    }
    return NextResponse.json({ message: msg }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    await deleteEpisode(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ message: String(e) }, { status: 500 });
  }
}
