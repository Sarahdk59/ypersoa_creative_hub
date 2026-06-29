/**
 * /api/planning/retroplanning
 *   GET  → planning commun complet (drops + actions créa/prod/comm)
 *   POST → ajoute une action (événement) au planning
 */
import { NextResponse } from "next/server";
import { loadRetroplanning, createAction, type ActionPlanning } from "@/lib/planning/retroplanning-loader";

export async function GET() {
  try {
    return NextResponse.json({ ok: true, data: loadRetroplanning() });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Partial<ActionPlanning>;
    if (!body.titre || !body.date) {
      return NextResponse.json({ ok: false, error: "titre et date requis" }, { status: 400 });
    }
    return NextResponse.json({ ok: true, data: createAction(body) });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
