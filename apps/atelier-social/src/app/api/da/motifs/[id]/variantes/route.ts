/**
 * GET /api/da/motifs/[id]/variantes
 * Liste les variantes d'un motif (lecture de motifs_ypm.json).
 */
import { NextResponse } from "next/server";

import { getMotifs } from "@/lib/atelier-da/referentiels-loader";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const ref = getMotifs();
  const motif = ref.motifs.find((m) => m.id === id);
  if (!motif) {
    return NextResponse.json({ error: `Motif ${id} introuvable` }, { status: 404 });
  }
  return NextResponse.json({
    motif: {
      id: motif.id,
      nom_commercial: motif.nom_commercial,
      asset_principal: motif.asset_principal,
    },
    variantes: motif.variantes ?? [],
  });
}
