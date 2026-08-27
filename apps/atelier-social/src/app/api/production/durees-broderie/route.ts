/**
 * GET   /api/production/durees-broderie  → référentiel complet des durées atelier
 * PATCH /api/production/durees-broderie  → met à jour la durée d'une opération
 *   body: { operation: string, duree_min: number }
 *
 * Édite referentiels/durees_broderie.json (mêmes valeurs que celles utilisées
 * par recalculerDureesCommande / le parsing PDF). Aucun cache à invalider :
 * getDureesRef() relit le fichier à chaque appel. C'est ce qui fait que la
 * PROCHAINE commande créée prend le nouveau délai — pour la commande en cours,
 * la page appelante doit aussi mettre à jour l'article concerné (cf.
 * commandes/[id]/page.tsx) puisque recalculerDureesCommande ne réécrit que
 * duree_preparation_dst_min, jamais duree_setup_min/duree_cq_min après coup.
 */
import { NextResponse } from "next/server";
import { readFileSync, writeFileSync } from "fs";
import { DUREES_PATH, getDureesRef, type DureesRef } from "@/lib/production/commandes-loader";

export async function GET() {
  try {
    return NextResponse.json({ ok: true, data: getDureesRef() });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const body = (await request.json()) as { operation?: string; duree_min?: number };
    const operation = body.operation?.trim();
    const dureeMin = body.duree_min;

    if (!operation) {
      return NextResponse.json({ ok: false, error: "operation requise" }, { status: 400 });
    }
    if (typeof dureeMin !== "number" || !Number.isFinite(dureeMin) || dureeMin < 0) {
      return NextResponse.json({ ok: false, error: "duree_min doit être un nombre positif" }, { status: 400 });
    }

    const raw = readFileSync(DUREES_PATH, "utf-8");
    const data = JSON.parse(raw) as DureesRef;
    if (!data.operations[operation]) {
      return NextResponse.json(
        { ok: false, error: `Opération inconnue : ${operation}` },
        { status: 404 },
      );
    }

    data.operations[operation].duree_min = dureeMin;
    data._meta.last_updated = new Date().toISOString().slice(0, 10);
    writeFileSync(DUREES_PATH, JSON.stringify(data, null, 2) + "\n", "utf-8");

    return NextResponse.json({ ok: true, data });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
