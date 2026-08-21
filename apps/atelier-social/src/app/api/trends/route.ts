/**
 * API Atelier Trends — Lot 1.
 *   GET  /api/trends        → dernier snapshot (+ liste des dates dispo)
 *   GET  /api/trends?id=... → un snapshot précis
 *   POST /api/trends        → déclenche un run (Pinterest) et le renvoie
 */
import { NextResponse } from "next/server";
import {
  getLatestSnapshot,
  getSnapshot,
  listSnapshots,
  runTrends,
} from "@/lib/trends/trends-loader";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: Request) {
  try {
    const id = new URL(request.url).searchParams.get("id");
    if (id) {
      const snap = getSnapshot(id);
      if (!snap) {
        return NextResponse.json({ ok: false, error: `Run ${id} introuvable` }, { status: 404 });
      }
      return NextResponse.json({ ok: true, data: snap });
    }
    const all = listSnapshots();
    return NextResponse.json({
      ok: true,
      data: all[0] ?? null,
      runs: all.map((s) => ({ id: s.id, generated_at: s.generated_at, count: s.meta.trends_count })),
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}

export async function POST() {
  try {
    const snapshot = await runTrends();
    return NextResponse.json({ ok: true, data: snapshot });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
