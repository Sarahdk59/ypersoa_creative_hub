/**
 * GET /api/production/bilan?annee=2026&canal=tous|shopify|etsy|b2b|manuel
 *
 * Bilan de ventes annuel : agrégation app-side (volume artisanal, pas besoin
 * de SQL de groupement) sur les commandes de l'année demandée, segmenté par
 * canal de vente (Shopify / Etsy / saisie manuelle).
 */
import { NextResponse } from "next/server";
import { listCommandes, type Article, type CommandeSource } from "@/lib/production/commandes-loader";
import { requireRole } from "@/lib/auth-guard";

type CanalFiltre = CommandeSource | "tous";

/** Commande (et article) derrière une ligne du bilan — pour cliquer et corriger. */
interface CommandeRef {
  id: string;
  numero: string;
  client: string | null;
  date: string;
  statut: string;
  article_id: string;
  article_label: string;
  quantite: number;
}

interface Bucket {
  nom: string;
  quantite: number;
  /** Ligne « à identifier » (UNKNOWN, motif manquant…) → à corriger sur la fiche commande. */
  a_identifier: boolean;
  commandes: CommandeRef[];
}

function ajouter(map: Map<string, Bucket>, key: string, nom: string, aIdentifier: boolean, quantite: number, ref: CommandeRef) {
  const b = map.get(key) ?? { nom, quantite: 0, a_identifier: false, commandes: [] };
  b.quantite += quantite;
  b.a_identifier = b.a_identifier || aIdentifier;
  b.commandes.push(ref);
  map.set(key, b);
}

function produitAIdentifier(a: Article): boolean {
  const id = (a.produit_id ?? "").trim().toUpperCase();
  return !id || id === "UNKNOWN" || /à identifier/i.test(a.produit_nom ?? "");
}

function motifAIdentifier(a: Article): boolean {
  return !(a.ypm_id ?? "").trim() || /à identifier/i.test(a.ypm_nom ?? "");
}

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
      canalParam === "shopify" || canalParam === "etsy" || canalParam === "b2b" || canalParam === "manuel" ? canalParam : "tous";

    const all = await listCommandes();
    const commandesAnnee = all.filter((c) => c.date_commande.startsWith(String(annee)));
    const commandes = commandesAnnee.filter((c) => canal === "tous" || (c.source ?? "manuel") === canal);

    const avecMontant = commandes.filter((c) => c.montant_total_ttc != null);
    const caTotalConnu = avecMontant.reduce((s, c) => s + (c.montant_total_ttc ?? 0), 0);

    const parProduit = new Map<string, Bucket>();
    const parMotif = new Map<string, Bucket>();
    const parCouleur = new Map<string, Bucket>();
    // Compté sur TOUTE l'année (indépendamment du filtre canal) pour que les
    // compteurs des onglets Shopify/Etsy/Manuel restent stables quel que soit
    // l'onglet actif.
    const parSource: Record<CommandeSource, number> = { shopify: 0, etsy: 0, b2b: 0, manuel: 0 };
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
        const ref: CommandeRef = {
          id: c.id,
          numero: c.numero_shopify,
          client: c.expedition?.nom ?? null,
          date: c.date_commande.slice(0, 10),
          statut: c.statut,
          article_id: a.id,
          article_label: `${a.produit_nom} — ${a.ypm_nom}`,
          quantite: a.quantite,
        };

        const produitKey = a.produit_id || "UNKNOWN";
        ajouter(parProduit, produitKey, a.produit_nom, produitAIdentifier(a), a.quantite, ref);

        const motifKey = a.ypm_id || "(sans motif)";
        ajouter(parMotif, motifKey, a.ypm_nom, motifAIdentifier(a), a.quantite, ref);

        const couleurNom = (a.couleur_support ?? "").trim() || "(sans couleur)";
        ajouter(parCouleur, couleurNom.toLowerCase(), couleurNom, !(a.couleur_support ?? "").trim(), a.quantite, ref);
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
