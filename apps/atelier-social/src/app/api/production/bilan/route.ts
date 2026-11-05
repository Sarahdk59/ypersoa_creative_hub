/**
 * GET /api/production/bilan?annee=2026&canal=tous|shopify|etsy|manuel
 *
 * Bilan de ventes annuel : agrégation app-side (volume artisanal, pas besoin
 * de SQL de groupement) sur les commandes de l'année demandée, segmenté par
 * canal de vente (Shopify / Etsy / saisie manuelle).
 */
import { NextResponse } from "next/server";
import { listCommandes, type CommandeSource } from "@/lib/production/commandes-loader";
import { requireRole } from "@/lib/auth-guard";

type CanalFiltre = CommandeSource | "tous";

export async function GET(req: Request) {
  try {
    // Vue business (CA) — réservée admin + créa, jamais au rôle prod
    // (opérateurs atelier). La page est déjà gardée par le middleware
    // (section atelier-da), ce garde-fou protège l'API appelée directement.
    const auth = await requireRole(["admin", "crea"]);
    if (!auth) {
      return NextResponse.json({ ok: false, error: "Accès réservé." }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const annee = Number(searchParams.get("annee")) || new Date().getFullYear();
    const canalParam = searchParams.get("canal");
    const canal: CanalFiltre =
      canalParam === "shopify" || canalParam === "etsy" || canalParam === "manuel" ? canalParam : "tous";

    const all = await listCommandes();
    const commandesAnnee = all.filter((c) => c.date_commande.startsWith(String(annee)));
    const commandes = commandesAnnee.filter((c) => canal === "tous" || (c.source ?? "manuel") === canal);

    const avecMontant = commandes.filter((c) => c.montant_total_ttc != null);
    const caTotalConnu = avecMontant.reduce((s, c) => s + (c.montant_total_ttc ?? 0), 0);

    const parProduit = new Map<string, { nom: string; quantite: number }>();
    const parMotif = new Map<string, { nom: string; quantite: number }>();
    const parCouleur = new Map<string, { nom: string; quantite: number }>();
    // Compté sur TOUTE l'année (indépendamment du filtre canal) pour que les
    // compteurs des onglets Shopify/Etsy/Manuel restent stables quel que soit
    // l'onglet actif.
    const parSource: Record<CommandeSource, number> = { shopify: 0, etsy: 0, manuel: 0 };
    for (const c of commandesAnnee) {
      parSource[c.source ?? "manuel"] = (parSource[c.source ?? "manuel"] ?? 0) + 1;
    }

    const parMois: Array<{ mois: number; nb_commandes: number; ca: number }> = Array.from(
      { length: 12 },
      (_, i) => ({ mois: i + 1, nb_commandes: 0, ca: 0 }),
    );

    for (const c of commandes) {
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

        const couleurNom = (a.couleur_support ?? "").trim() || "(sans couleur)";
        const couleurKey = couleurNom.toLowerCase();
        const couleur = parCouleur.get(couleurKey) ?? { nom: couleurNom, quantite: 0 };
        couleur.quantite += a.quantite;
        parCouleur.set(couleurKey, couleur);
      }
    }

    return NextResponse.json({
      ok: true,
      data: {
        annee,
        canal,
        nb_commandes: commandes.length,
        nb_commandes_avec_montant: avecMontant.length,
        ca_total_connu: Math.round(caTotalConnu * 100) / 100,
        panier_moyen_connu: avecMontant.length ? Math.round((caTotalConnu / avecMontant.length) * 100) / 100 : null,
        par_produit: Array.from(parProduit, ([produit_id, v]) => ({ produit_id, ...v }))
          .sort((a, b) => b.quantite - a.quantite),
        par_motif: Array.from(parMotif, ([ypm_id, v]) => ({ ypm_id, ...v }))
          .sort((a, b) => b.quantite - a.quantite),
        par_couleur: Array.from(parCouleur, ([couleur_id, v]) => ({ couleur_id, ...v }))
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
