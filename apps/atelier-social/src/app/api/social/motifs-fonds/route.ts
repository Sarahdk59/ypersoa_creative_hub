/**
 * Bibliothèque de motifs SVG (assets/motifs-fonds-svg/) pour l'onglet
 * "Recolorer un SVG" du module Fonds :
 *  GET → liste des motifs disponibles avec leur contenu SVG brut.
 */
import { NextResponse } from "next/server";
import { listMotifsFondsSvg } from "@/lib/motifs-fonds.server";

export async function GET() {
  try {
    return NextResponse.json({ ok: true, data: listMotifsFondsSvg() });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
