/**
 * GET /api/da/exports/audit-csv
 *
 * Génère un CSV de l'audit incarnations (compatible feuille AUDIT_MANQUES
 * du XLSX `04_INCARNATIONS.xlsx`). Encodage UTF-8 avec BOM pour Excel.
 */
import {
  listIncarnations,
  listMotifs,
  tagsPhotosCountByIncarnationGabarit,
} from "@/lib/incarnations/store";
import { GABARITS_DISPONIBLES } from "@/types/incarnations";

function csvEscape(value: string): string {
  if (value.includes('"') || value.includes(",") || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export async function GET() {
  const motifs = await listMotifs();
  const incarnations = (await listIncarnations({ sort: "code_asc" })).data;
  const photosCount = await tagsPhotosCountByIncarnationGabarit();
  const gabarits = GABARITS_DISPONIBLES.map((g) => g.code);

  // Bloc 1 : matrice (compatible AUDIT_MANQUES)
  const matrixHeader = [
    "Motif YPM",
    "Motif nom",
    "Famille",
    "Code",
    "Nom commercial",
    "Statut",
    "Ton",
    ...gabarits,
    "Gabarits ciblés",
    "Cellules manquantes",
  ];
  const matrixRows: string[][] = [];

  for (const motif of motifs) {
    const rows = incarnations.filter((i) => i.motif_ypm === motif.code);
    for (const inc of rows) {
      const cibles = new Set(inc.gabarits_cibles);
      let manquants = 0;
      const cells = gabarits.map((g) => {
        if (!cibles.has(g)) return "—";
        const stats = photosCount.get(`${inc.id}__${g}`);
        if (!stats || stats.count === 0) {
          manquants += 1;
          return "Manquant";
        }
        if (stats.hasHero) return `✓ ${stats.count}`;
        return `⚠ ${stats.count}`;
      });
      matrixRows.push([
        motif.code,
        motif.nom,
        motif.famille ?? "",
        inc.code,
        inc.nom_commercial,
        inc.statut,
        inc.ton ?? "",
        ...cells,
        inc.gabarits_cibles.join(" · "),
        String(manquants),
      ]);
    }
  }

  // Synthèse par motif
  const synthHeader = [
    "",
    "",
    "Motif YPM",
    "Motif nom",
    "Famille",
    "Total incarnations",
    "Actives",
    "À shooter",
    "Concepts",
  ];
  const synthRows: string[][] = [];
  for (const motif of motifs) {
    const rows = incarnations.filter((i) => i.motif_ypm === motif.code);
    if (rows.length === 0) continue;
    synthRows.push([
      "",
      "",
      motif.code,
      motif.nom,
      motif.famille ?? "",
      String(rows.length),
      String(rows.filter((r) => r.statut === "actif").length),
      String(rows.filter((r) => r.statut === "a_shooter").length),
      String(rows.filter((r) => r.statut === "concept").length),
    ]);
  }

  const lines: string[] = [];
  lines.push("# AUDIT MATRICE INCARNATIONS × GABARITS");
  lines.push(`# Généré le ${new Date().toISOString().slice(0, 19).replace("T", " ")}`);
  lines.push("");
  lines.push(matrixHeader.map(csvEscape).join(","));
  for (const r of matrixRows) lines.push(r.map(csvEscape).join(","));
  lines.push("");
  lines.push("# SYNTHÈSE PAR MOTIF");
  lines.push(synthHeader.map(csvEscape).join(","));
  for (const r of synthRows) lines.push(r.map(csvEscape).join(","));

  // BOM UTF-8 pour qu'Excel ouvre correctement les accents
  const body = "﻿" + lines.join("\r\n");

  return new Response(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="audit-incarnations-${new Date().toISOString().slice(0, 10)}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
