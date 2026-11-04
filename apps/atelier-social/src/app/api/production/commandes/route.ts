/**
 * /api/production/commandes
 *   GET  → liste de toutes les commandes
 *   POST → créer une nouvelle commande (depuis un objet déjà structuré)
 */
import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth-guard";
import {
  getDureesRef,
  getFichesTechniques,
  listCommandes,
  recalculerDureesCommande,
  writeCommande,
  type Commande,
} from "@/lib/production/commandes-loader";

export async function GET() {
  try {
    return NextResponse.json({ ok: true, data: await listCommandes() });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const auth = await requireRole(["admin", "prod"]);
  if (!auth) return NextResponse.json({ ok: false, error: "Accès réservé à l'atelier." }, { status: 403 });
  try {
    const body = (await request.json()) as Partial<Commande>;
    if (!body.id || !body.articles?.length) {
      return NextResponse.json({ ok: false, error: "id et articles[] requis" }, { status: 400 });
    }
    const now = new Date().toISOString().slice(0, 10);
    const commande: Commande = {
      id: body.id,
      numero_shopify: body.numero_shopify ?? `#${body.id}`,
      source: body.source ?? "manuel",
      date_commande: body.date_commande ?? now,
      date_impression_bon: body.date_impression_bon,
      statut: body.statut ?? "a_planifier",
      priorite: body.priorite ?? "normale",
      expedition: body.expedition!,
      facturation: body.facturation ?? body.expedition!,
      contact: body.contact,
      livraison: body.livraison,
      articles: body.articles,
      planning: body.planning ?? null,
      bon_preparation_pdf: body.bon_preparation_pdf,
      documents: body.documents,
      montant_total_ttc: body.montant_total_ttc ?? null,
      duree_total_min: body.duree_total_min ?? 0,
      nb_changements_fil_total: body.nb_changements_fil_total ?? 0,
      notes: body.notes,
      created_at: body.created_at ?? now,
      updated_at: now,
    };
    // Recalcul des durées (idempotent — sécurise les commandes éditées à la main
    // avant POST, notamment après revue d'un draft parsé depuis un PDF).
    const recalculee = recalculerDureesCommande(
      commande,
      getDureesRef(),
      getFichesTechniques(),
    );
    await writeCommande(recalculee);
    return NextResponse.json({ ok: true, data: recalculee });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
