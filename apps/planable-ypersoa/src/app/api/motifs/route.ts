/**
 * GET /api/motifs
 * Lit le référentiel motifs depuis referentiels/motifs/motifs_ypm.json
 * (source de vérité partagée avec atelier-social).
 *
 * Retourne motifs avec asset_principal + tags pour le MotifPicker du EntryDialog.
 */
import { NextResponse } from "next/server";
import { readFileSync } from "fs";
import { join } from "path";

const REFS_PATH = join(process.cwd(), "..", "..", "referentiels", "motifs", "motifs_ypm.json");

export interface PlanableMotifVariante {
  file: string;       // ex. "YPM-015-DECLARATION-Maman.png"
  label: string;
  tags?: string[];
}

export interface PlanableMotif {
  id: string;
  nom_commercial: string;
  asset_principal: string;
  tags: string[];
  nb_variantes: number;
  variantes: PlanableMotifVariante[];
}

export async function GET() {
  try {
    const raw = readFileSync(REFS_PATH, "utf-8");
    const data = JSON.parse(raw) as {
      motifs: {
        id: string;
        nom_commercial: string;
        asset_principal: string;
        tags?: string[];
        nb_variantes?: number;
        variantes?: PlanableMotifVariante[];
      }[];
    };
    const motifs: PlanableMotif[] = data.motifs.map((m) => ({
      id: m.id,
      nom_commercial: m.nom_commercial,
      asset_principal: m.asset_principal,
      tags: m.tags ?? [],
      nb_variantes: m.nb_variantes ?? 0,
      variantes: m.variantes ?? [],
    }));
    return NextResponse.json({ ok: true, data: motifs });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
