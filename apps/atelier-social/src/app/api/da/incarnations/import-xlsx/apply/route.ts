import { NextRequest, NextResponse } from "next/server";

import type { IncarnationStatut, IncarnationTon } from "@/types/incarnations";
import { applyImport, type ImportRow, type ImportRowAction } from "@/lib/incarnations/store";

const VALID_ACTIONS = new Set<ImportRowAction>(["create", "update", "skip"]);
const VALID_STATUTS = new Set<IncarnationStatut>([
  "concept",
  "a_digitaliser",
  "a_shooter",
  "a_publier",
  "actif",
  "archive",
]);
const VALID_TONS = new Set<IncarnationTon>(["tendre", "complice", "humour", "affirme"]);

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (
    !body ||
    typeof body !== "object" ||
    !Array.isArray((body as Record<string, unknown>).rows)
  ) {
    return NextResponse.json({ error: "rows required" }, { status: 400 });
  }

  const rawRows = (body as { rows: unknown[] }).rows;
  const rows: ImportRow[] = [];

  for (const raw of rawRows) {
    if (!raw || typeof raw !== "object") continue;
    const r = raw as Record<string, unknown>;
    const action =
      typeof r.action === "string" && VALID_ACTIONS.has(r.action as ImportRowAction)
        ? (r.action as ImportRowAction)
        : "skip";
    const spec = r.spec_broderie as Record<string, unknown> | undefined;
    rows.push({
      action,
      code: String(r.code ?? ""),
      nom_commercial: String(r.nom_commercial ?? ""),
      motif_ypm: String(r.motif_ypm ?? ""),
      spec_broderie: {
        mot_haut: String(spec?.mot_haut ?? ""),
        mot_bas: String(spec?.mot_bas ?? ""),
        symbole: String(spec?.symbole ?? "Aucun"),
        couleur_fil_defaut: String(spec?.couleur_fil_defaut ?? ""),
      },
      gabarits_cibles: Array.isArray(r.gabarits_cibles)
        ? r.gabarits_cibles.filter((g): g is string => typeof g === "string")
        : [],
      collections_cibles: Array.isArray(r.collections_cibles)
        ? r.collections_cibles.filter((c): c is string => typeof c === "string")
        : [],
      ton:
        typeof r.ton === "string" && VALID_TONS.has(r.ton as IncarnationTon)
          ? (r.ton as IncarnationTon)
          : null,
      statut:
        typeof r.statut === "string" && VALID_STATUTS.has(r.statut as IncarnationStatut)
          ? (r.statut as IncarnationStatut)
          : "concept",
      notes: typeof r.notes === "string" ? r.notes : null,
    });
  }

  const result = await applyImport(rows);
  return NextResponse.json(result);
}
