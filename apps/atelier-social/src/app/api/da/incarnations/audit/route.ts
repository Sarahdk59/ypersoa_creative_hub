/**
 * GET /api/da/incarnations/audit
 *
 * Retourne la matrice motif × incarnation × gabarit avec compteurs photos
 * et indicateur is_hero. Compatible avec la feuille AUDIT_MANQUES du XLSX.
 */
import { NextResponse } from "next/server";

import {
  listIncarnations,
  listMotifs,
  tagsPhotosCountByIncarnationGabarit,
} from "@/lib/incarnations/store";
import { GABARITS_DISPONIBLES } from "@/types/incarnations";

type CellStatus = "shootee_hero" | "shootee_no_hero" | "manquant" | "non_cible";

interface MatrixCell {
  statut: CellStatus;
  photos_count: number;
}

interface IncarnationRow {
  code: string;
  nom_commercial: string;
  statut: string;
  ton: string | null;
  cells: Record<string, MatrixCell>;
}

interface MotifBlock {
  motif_ypm: string;
  motif_nom: string;
  motif_famille: string | null;
  incarnations_count: number;
  actives_count: number;
  a_shooter_count: number;
  concepts_count: number;
  incarnations: IncarnationRow[];
}

export async function GET() {
  const motifs = await listMotifs();
  const incList = (await listIncarnations({ sort: "code_asc" })).data;
  const photosCount = await tagsPhotosCountByIncarnationGabarit();

  const gabarits = GABARITS_DISPONIBLES.map((g) => g.code);

  const byMotif = new Map<string, IncarnationRow[]>();
  for (const inc of incList) {
    const cibles = new Set(inc.gabarits_cibles);
    const cells: Record<string, MatrixCell> = {};
    for (const g of gabarits) {
      if (!cibles.has(g)) {
        cells[g] = { statut: "non_cible", photos_count: 0 };
        continue;
      }
      const key = `${inc.id}__${g}`;
      const stats = photosCount.get(key);
      if (!stats || stats.count === 0) {
        cells[g] = { statut: "manquant", photos_count: 0 };
      } else if (stats.hasHero) {
        cells[g] = { statut: "shootee_hero", photos_count: stats.count };
      } else {
        cells[g] = { statut: "shootee_no_hero", photos_count: stats.count };
      }
    }
    const row: IncarnationRow = {
      code: inc.code,
      nom_commercial: inc.nom_commercial,
      statut: inc.statut,
      ton: inc.ton,
      cells,
    };
    if (!byMotif.has(inc.motif_ypm)) byMotif.set(inc.motif_ypm, []);
    byMotif.get(inc.motif_ypm)!.push(row);
  }

  const blocks: MotifBlock[] = [];
  for (const motif of motifs) {
    const rows = byMotif.get(motif.code) ?? [];
    if (rows.length === 0) continue;
    blocks.push({
      motif_ypm: motif.code,
      motif_nom: motif.nom,
      motif_famille: motif.famille ?? null,
      incarnations_count: rows.length,
      actives_count: rows.filter((r) => r.statut === "actif").length,
      a_shooter_count: rows.filter((r) => r.statut === "a_shooter").length,
      concepts_count: rows.filter((r) => r.statut === "concept").length,
      incarnations: rows,
    });
  }

  // KPI globaux
  let totalCibles = 0;
  let totalShootes = 0;
  let totalManquants = 0;
  for (const block of blocks) {
    for (const r of block.incarnations) {
      for (const c of Object.values(r.cells)) {
        if (c.statut === "non_cible") continue;
        totalCibles += 1;
        if (c.statut === "manquant") totalManquants += 1;
        else totalShootes += 1;
      }
    }
  }

  return NextResponse.json({
    gabarits: GABARITS_DISPONIBLES,
    blocks,
    kpi: {
      total_incarnations: incList.length,
      actives: incList.filter((i) => i.statut === "actif").length,
      a_shooter: incList.filter((i) => i.statut === "a_shooter").length,
      concepts: incList.filter((i) => i.statut === "concept").length,
      total_cibles: totalCibles,
      total_shootes: totalShootes,
      total_manquants: totalManquants,
    },
  });
}
