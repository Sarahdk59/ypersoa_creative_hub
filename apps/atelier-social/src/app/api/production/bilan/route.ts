/**
 * GET /api/production/bilan?annee=2026
 *
 * Bilan de ventes annuel : agrégation app-side (volume artisanal, pas besoin
 * de SQL de groupement) sur les commandes de l'année demandée.
 */
import { NextResponse } from "next/server";
import { listCommandes, type CommandeSource } from "@/lib/production/commandes-loader";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const annee = Number(searchParams.get("annee")) || new Date().getFullYear();

    const all = await listCommandes();
    const commandes = all.filter((c) => c.date_commande.startsWith(String(annee)));

    const avecMontant = commandes.filter((c) => c.montant_total_ttc != null);
    const caTotalConnu = avecMontant.reduce((s, c) => s + (c.montant_total_ttc ?? 0), 0);

    const parProduit = new Map<string, { nom: string; quantite: number }>();
    const parMotif = new Map<string, { nom: string; quantite: number }>();
    const parSource: Record<CommandeSource, number> = { shopify: 0, etsy: 0, manuel: 0 };
    const parMois: Array<{ mois: number; nb_commandes: number; ca: number }> = Array.from(
      { length: 12 },
      (_, i) => ({ mois: i + 1, nb_commandes: 0, ca: 0 }),
    );

    for (const c of commandes) {
      parSource[c.source ?? "manuel"] = (parSource[c.source ?? "manuel"] ?? 0) + 1;

      const moisIdx = Number(c.date_commande.slice(5, 7)) - 1;
      if (moisIdx >= 0 && moisIdx < 12) {
        parMois[moisIdx].nb_commandes += 1;
        if (c.montant_total_ttc != null) parMois[moisIdx].ca += c.montant_total_ttc;
      }

      for (const a of c.articles) {
        const produit = parProduit.get(a.produit_id) ?? { nom: a.produit_nom, quantite: 0 };
        produit.quantite += a.quantite;
        parProduit.set(a.produit_id, produit);

        const motifKey = a.ypm_id || "(sans motif)";
        const motif = parMotif.get(motifKey) ?? { nom: a.ypm_nom, quantite: 0 };
        motif.quantite += a.quantite;
        parMotif.set(motifKey, motif);
      }
    }

    return NextResponse.json({
      ok: true,
      data: {
        annee,
        nb_commandes: commandes.length,
        nb_commandes_avec_montant: avecMontant.length,
        ca_total_connu: Math.round(caTotalConnu * 100) / 100,
        panier_moyen_connu: avecMontant.length ? Math.round((caTotalConnu / avecMontant.length) * 100) / 100 : null,
        par_produit: Array.from(parProduit, ([produit_id, v]) => ({ produit_id, ...v }))
          .sort((a, b) => b.quantite - a.quantite),
        par_motif: Array.from(parMotif, ([ypm_id, v]) => ({ ypm_id, ...v }))
          .sort((a, b) => b.quantite - a.quantite),
        par_source: parSource,
        par_mois: parMois,
      },
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
