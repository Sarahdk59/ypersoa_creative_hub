/**
 * /api/production/commandes/[id]
 *   GET   → détail d'une commande
 *   PATCH → mise à jour (statut, priorité, notes, articles partiels)
 */
import { NextResponse } from "next/server";
import {
  getCommande,
  writeCommande,
  recalculerDureesCommande,
  getDureesRef,
  type Commande,
} from "@/lib/production/commandes-loader";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const commande = getCommande(id);
  if (!commande) return NextResponse.json({ ok: false, error: "Commande introuvable" }, { status: 404 });
  return NextResponse.json({ ok: true, data: commande });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = (await req.json()) as Partial<Commande>;
    const commande = getCommande(id);
    if (!commande) return NextResponse.json({ ok: false, error: "Commande introuvable" }, { status: 404 });

    if (body.statut) commande.statut = body.statut;
    if (body.priorite) commande.priorite = body.priorite;
    if (typeof body.notes === "string") commande.notes = body.notes;
    if (body.articles) {
      commande.articles = body.articles;
      const durees = getDureesRef();
      recalculerDureesCommande(commande, durees);
    }
    if (body.planning !== undefined) commande.planning = body.planning;
    if (body.journal !== undefined) {
      commande.journal = body.journal ?? undefined;
      // Cohérence : si on enregistre une date d'archivage, on passe le statut à archivee
      if (commande.journal?.archivee_le) commande.statut = "archivee";
    }

    writeCommande(commande);
    return NextResponse.json({ ok: true, data: commande });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
