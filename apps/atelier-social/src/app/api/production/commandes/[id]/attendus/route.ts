/**
 * GET /api/production/commandes/[id]/attendus
 *
 * Lignes d'attendus de livraison fournisseur destinées à cette commande
 * (champ « N° commande client » de la ligne = id ou numéro de la commande).
 * Sert à rattacher un article « à identifier » (produit absent d'un devis WAP)
 * à la réf. créée dans l'attendu.
 */
import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth-guard";
import { getCommande } from "@/lib/production/commandes-loader";
import { lignesAttenduPourCommande } from "@/lib/production/attendus";
import { chargerReferentiel, libelleRefArticle } from "@/lib/production/referentiel-articles";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole(["admin", "prod"]);
  if (!auth) return NextResponse.json({ ok: false, error: "Accès réservé à l'atelier." }, { status: 403 });
  try {
    const { id } = await params;
    const commande = await getCommande(id);
    if (!commande) return NextResponse.json({ ok: false, error: "Commande introuvable" }, { status: 404 });

    const [lignes, referentiel] = await Promise.all([lignesAttenduPourCommande(commande), chargerReferentiel()]);
    const data = lignes.map((x) => ({
      attendu_id: x.attendu_id,
      fournisseur: x.fournisseur,
      numero_facture: x.numero_facture ?? null,
      statut: x.statut,
      date_livraison_prevue: x.date_livraison_prevue ?? null,
      ligne_id: x.ligne.id,
      designation: x.ligne.designation,
      ref_fournisseur: x.ligne.ref_fournisseur,
      ref_modele: x.ligne.ref_modele ?? null,
      coloris: x.ligne.coloris,
      taille: x.ligne.taille,
      quantite: x.ligne.quantite,
      quantite_recue: x.ligne.quantite_recue ?? 0,
      /** reference = réf. existante, rattachable ; sinon à créer d'abord dans l'attendu. */
      etat: x.ligne.etat,
      ref_article: x.ligne.ref_article ?? null,
      libelle_article: x.ligne.ref_article ? libelleRefArticle(x.ligne.ref_article, referentiel) : null,
    }));
    return NextResponse.json({ ok: true, data });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
