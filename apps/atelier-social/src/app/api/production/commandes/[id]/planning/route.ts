/**
 * /api/production/commandes/[id]/planning
 *   POST → génère un planning auto (LPT 2 machines) pour la commande
 *
 * Body : { date_debut?: "YYYY-MM-DD", horizon_jours?: number, min_par_jour?: number }
 */
import { NextResponse } from "next/server";
import { getCommande, writeCommande, getDureesRef } from "@/lib/production/commandes-loader";
import { allouerPlanningAuto } from "@/lib/production/planning-allocator";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const commande = getCommande(id);
    if (!commande) return NextResponse.json({ ok: false, error: "Commande introuvable" }, { status: 404 });

    const body = (await req.json().catch(() => ({}))) as {
      date_debut?: string;
      horizon_jours?: number;
      min_par_jour?: number;
      algo?: "lpt" | "otif";
    };

    const durees = getDureesRef();
    const planning = allouerPlanningAuto(commande, durees, body);

    commande.planning = planning;
    // Ne pas downgrader un statut déjà avancé (en_cours, terminée, expédiée, archivée)
    if (commande.statut === "a_planifier") commande.statut = "planifiee";
    writeCommande(commande);

    return NextResponse.json({ ok: true, data: { planning, commande } });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const commande = getCommande(id);
    if (!commande) return NextResponse.json({ ok: false, error: "Commande introuvable" }, { status: 404 });
    commande.planning = null;
    commande.statut = "a_planifier";
    writeCommande(commande);
    return NextResponse.json({ ok: true, data: commande });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
