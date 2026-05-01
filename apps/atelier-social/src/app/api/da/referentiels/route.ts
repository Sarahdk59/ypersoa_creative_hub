/**
 * GET /api/da/referentiels
 * Retourne les 4 référentiels casting au client (mannequins enrichis,
 * affinités narratives, calendrier, métiers Hub).
 *
 * Lecture serveur via fs (cf. lib/atelier-da/referentiels-loader.ts).
 */
import { NextResponse } from "next/server";
import { getAllReferentiels } from "@/lib/atelier-da/referentiels-loader";

export async function GET() {
  try {
    const data = getAllReferentiels();
    return NextResponse.json({ ok: true, data });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
