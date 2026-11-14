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
import { listAttendus, normaliserNumeroCommande } from "@/lib/production/attendus";
import { brodabiliteCommande, type LigneAttenduBrodabilite } from "@/lib/production/brodabilite";

/** Lignes d'attendu indexées par n° de commande client normalisé. */
async function lignesAttenduParCommande(): Promise<Map<string, LigneAttenduBrodabilite[]>> {
  const map = new Map<string, LigneAttenduBrodabilite[]>();
  let attendus: Awaited<ReturnType<typeof listAttendus>> = [];
  try {
    attendus = await listAttendus();
  } catch {
    return map; // table absente : la liste reste lisible, sans le verrou fournisseur
  }
  for (const a of attendus) {
    for (const l of a.lignes) {
      const cle = normaliserNumeroCommande(l.commande_client);
      if (!cle) continue;
      const liste = map.get(cle) ?? [];
      liste.push({
        attendu_id: a.id,
        fournisseur: a.fournisseur,
        statut: a.statut,
        date_livraison_prevue: a.date_livraison_prevue,
        quantite: l.quantite,
        quantite_recue: l.quantite_recue,
      });
      map.set(cle, liste);
    }
  }
  return map;
}

export async function GET() {
  try {
    const [commandes, parCommande] = await Promise.all([listCommandes(), lignesAttenduParCommande()]);
    const data = commandes.map((c) => {
      const cles = new Set([normaliserNumeroCommande(c.id), normaliserNumeroCommande(c.numero_shopify)]);
      const lignes = [...cles].flatMap((k) => parCommande.get(k) ?? []);
      return { ...c, brodabilite: brodabiliteCommande(c, lignes) };
    });
    return NextResponse.json({ ok: true, data });
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
