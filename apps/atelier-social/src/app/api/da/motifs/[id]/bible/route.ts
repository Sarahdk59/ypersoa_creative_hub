/**
 * PATCH /api/da/motifs/[id]/bible
 * Met à jour la bible technique (dimensions, nb_couleurs, règles, notes prod)
 * d'un motif. Body JSON partiel :
 *   {
 *     dimensions_cm?: { largeur: number, hauteur: number } | null,
 *     nb_couleurs_max?: number | null,
 *     composition?: string | null,
 *     regles_validation?: string | null,
 *     notes_prod?: string | null,
 *   }
 *
 * Pour PXF/DST upload : voir /api/da/motifs/[id]/bible/upload (V2).
 */
import { NextResponse } from "next/server";
import { readFileSync, writeFileSync } from "fs";
import {
  clearMotifsCache,
  MOTIFS_REF_PATH,
  type MotifsYpmRef,
} from "@/lib/atelier-da/referentiels-loader";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = (await request.json()) as Record<string, unknown>;

    const raw = readFileSync(MOTIFS_REF_PATH, "utf-8");
    const data = JSON.parse(raw) as MotifsYpmRef;
    const target = data.motifs.find((m) => m.id === id);
    if (!target) {
      return NextResponse.json({ ok: false, error: `Motif ${id} introuvable` }, { status: 404 });
    }

    const bible = { ...(target.bible ?? {}) };

    // dimensions_cm
    if ("dimensions_cm" in body) {
      const v = body.dimensions_cm;
      if (v === null || v === undefined) {
        delete bible.dimensions_cm;
      } else if (
        typeof v === "object" &&
        v !== null &&
        typeof (v as { largeur?: unknown }).largeur === "number" &&
        typeof (v as { hauteur?: unknown }).hauteur === "number"
      ) {
        bible.dimensions_cm = {
          largeur: (v as { largeur: number }).largeur,
          hauteur: (v as { hauteur: number }).hauteur,
        };
      } else {
        return NextResponse.json(
          { ok: false, error: "dimensions_cm doit être { largeur, hauteur } en number" },
          { status: 400 }
        );
      }
    }

    // Champs scalaires
    for (const k of ["nb_couleurs_max"] as const) {
      if (k in body) {
        const v = body[k];
        if (v === null || v === undefined || v === "") delete bible[k];
        else if (typeof v === "number" && v >= 1 && v <= 30) bible[k] = v;
        else return NextResponse.json(
          { ok: false, error: `${k} doit être un nombre entre 1 et 30` },
          { status: 400 }
        );
      }
    }
    for (const k of ["composition", "regles_validation", "notes_prod"] as const) {
      if (k in body) {
        const v = body[k];
        if (v === null || v === undefined || v === "") delete bible[k];
        else if (typeof v === "string") bible[k] = v.trim();
        else return NextResponse.json(
          { ok: false, error: `${k} doit être une string` },
          { status: 400 }
        );
      }
    }

    target.bible = bible;
    data._meta.last_updated = new Date().toISOString().slice(0, 10);

    writeFileSync(MOTIFS_REF_PATH, JSON.stringify(data, null, 2) + "\n", "utf-8");
    clearMotifsCache();

    return NextResponse.json({ ok: true, data: { id, bible } });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
