/**
 * POST /api/production/commandes/[id]/rebroder
 *
 * Crée une nouvelle commande "rework" pour rebroder un article défectueux.
 *
 * Body : {
 *   article_id: string,      // article de la commande origine
 *   motif: string,           // description du défaut constaté
 *   zones_a_rebroder?: ("buste"|"poignet"|"dos"|"nuque")[]  // si null = toutes les zones de l'article
 * }
 *
 * Retourne la nouvelle commande créée (id = `{origine}-R{n}`).
 */
import { NextResponse } from "next/server";
import {
  getCommande,
  writeCommande,
  listCommandes,
  recalculerDureesCommande,
  getDureesRef,
  type Commande,
  type Article,
  type Placement,
} from "@/lib/production/commandes-loader";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const origine = getCommande(id);
    if (!origine) return NextResponse.json({ ok: false, error: "Commande origine introuvable" }, { status: 404 });

    const body = (await req.json()) as { article_id?: string; motif?: string; zones_a_rebroder?: Placement[] };
    if (!body.article_id) return NextResponse.json({ ok: false, error: "article_id requis" }, { status: 400 });
    if (!body.motif || !body.motif.trim()) return NextResponse.json({ ok: false, error: "motif du défaut requis" }, { status: 400 });

    const artOrigine = origine.articles.find((a) => a.id === body.article_id);
    if (!artOrigine) return NextResponse.json({ ok: false, error: "article introuvable dans la commande origine" }, { status: 404 });

    // Calcul du suffixe Rn
    const all = listCommandes();
    const prefix = `${id}-R`;
    const existingN = all
      .map((c) => c.id.startsWith(prefix) ? parseInt(c.id.slice(prefix.length)) : NaN)
      .filter((n) => !isNaN(n));
    const n = existingN.length ? Math.max(...existingN) + 1 : 1;
    const newId = `${id}-R${n}`;

    // Filtrer les broderies à refaire
    const broderiesRework = body.zones_a_rebroder?.length
      ? artOrigine.broderies.filter((b) => body.zones_a_rebroder!.includes(b.placement))
      : artOrigine.broderies;

    if (broderiesRework.length === 0) {
      return NextResponse.json({ ok: false, error: "Aucune zone à rebroder" }, { status: 400 });
    }

    const articleRework: Article = {
      ...JSON.parse(JSON.stringify(artOrigine)) as Article,
      id: `art_${newId}_01`,
      broderies: JSON.parse(JSON.stringify(broderiesRework)),
    };

    const now = new Date().toISOString().slice(0, 10);
    const commandeRework: Commande = {
      id: newId,
      numero_shopify: `${origine.numero_shopify} (R${n})`,
      date_commande: now,
      date_impression_bon: now,
      statut: "a_planifier",
      priorite: "urgente",
      expedition: origine.expedition,
      facturation: origine.facturation,
      articles: [articleRework],
      planning: null,
      rework_de: {
        commande_id: origine.id,
        article_id: artOrigine.id,
        motif: body.motif.trim(),
        zones_a_rebroder: body.zones_a_rebroder,
      },
      duree_total_min: 0,
      nb_changements_fil_total: 0,
      notes: `Rework de la commande ${origine.numero_shopify} (article ${artOrigine.produit_nom} — ${artOrigine.ypm_nom}). Défaut : ${body.motif.trim()}`,
      created_at: now,
      updated_at: now,
    };

    const durees = getDureesRef();
    recalculerDureesCommande(commandeRework, durees);
    writeCommande(commandeRework);

    return NextResponse.json({ ok: true, data: commandeRework });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
