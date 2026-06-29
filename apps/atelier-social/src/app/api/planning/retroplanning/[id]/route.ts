/**
 * /api/planning/retroplanning/[id]
 *   PATCH  → met à jour une action (statut / date / responsable / notes / titre)
 *   DELETE → supprime une action
 */
import { NextResponse } from "next/server";
import { patchAction, deleteAction, type ActionPatch } from "@/lib/planning/retroplanning-loader";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const patch = (await request.json()) as ActionPatch;
    const updated = patchAction(id, patch);
    if (!updated) {
      return NextResponse.json({ ok: false, error: "Action introuvable" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, data: updated });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const ok = deleteAction(id);
    if (!ok) {
      return NextResponse.json({ ok: false, error: "Action introuvable" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
