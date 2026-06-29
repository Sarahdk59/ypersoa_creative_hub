/**
 * API mots-clés Pinterest manuels — Lot 2.
 *   GET  /api/trends/pinterest-manuel → liste curée
 *   POST /api/trends/pinterest-manuel → remplace la liste + relance un run,
 *        renvoie { keywords, snapshot } pour rafraîchir le dashboard d'un coup.
 *
 * Note : sur Railway le FS est éphémère → une édition au runtime ne survit pas
 * à un redeploy. Pour figer la liste, l'éditer dans
 * `referentiels/trends/_pinterest_manuel.json` et committer.
 */
import { NextResponse } from "next/server";
import {
  getPinterestManuel,
  runTrends,
  setPinterestManuel,
} from "@/lib/trends/trends-loader";
import type { PinterestManualKeyword } from "@/lib/trends/trends";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET() {
  try {
    return NextResponse.json({ ok: true, data: getPinterestManuel() });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { keywords?: PinterestManualKeyword[] };
    if (!Array.isArray(body.keywords)) {
      return NextResponse.json({ ok: false, error: "keywords[] requis" }, { status: 400 });
    }
    const keywords = setPinterestManuel(body.keywords);
    const snapshot = await runTrends();
    return NextResponse.json({ ok: true, data: { keywords, snapshot } });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
