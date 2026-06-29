/**
 * API enrichissement IA — Lot 3.
 *   POST /api/trends/enrich        → enrichit le dernier snapshot (gpt-4o)
 *   POST /api/trends/enrich?id=... → enrichit un snapshot précis
 * Écrit le snapshot enrichi (status "enriched") et le renvoie.
 */
import { NextResponse } from "next/server";
import { getLatestSnapshot, getSnapshot, writeSnapshot } from "@/lib/trends/trends-loader";
import { enrichSnapshot } from "@/lib/trends/synthesis";

export const runtime = "nodejs";
export const maxDuration = 90;

export async function POST(request: Request) {
  try {
    const id = new URL(request.url).searchParams.get("id");
    const snapshot = id ? getSnapshot(id) : getLatestSnapshot();
    if (!snapshot) {
      return NextResponse.json(
        { ok: false, error: id ? `Run ${id} introuvable` : "Aucun run à enrichir — lance d'abord « Rafraîchir »." },
        { status: 404 },
      );
    }
    const enriched = await enrichSnapshot(snapshot);
    writeSnapshot(enriched);
    return NextResponse.json({ ok: true, data: enriched });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
