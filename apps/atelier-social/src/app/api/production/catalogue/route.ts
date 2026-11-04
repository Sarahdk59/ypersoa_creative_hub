/**
 * GET /api/production/catalogue
 *   → produits (YPxxx, sans fournisseur), familles couleur Akanea, motifs YPM
 * GET /api/production/catalogue?ref=YP013
 *   → couleurs (catalogue + ajouts Hub) et tailles du produit, zone tête éventuelle
 *
 * Sert les sélecteurs « à identifier » de la fiche commande.
 */
import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth-guard";
import {
  couleursPourProduit,
  getCatalogue,
  getCouleursAjouts,
  isHeadwear,
  produitCatalogue,
  taillesPourProduit,
  zoneTete,
} from "@/lib/production/catalogue";
import { getSkuMapping } from "@/lib/production/commandes-loader";
import { getMotifs } from "@/lib/atelier-da/referentiels-loader";

export async function GET(req: Request) {
  const auth = await requireRole(["admin", "prod"]);
  if (!auth) return NextResponse.json({ ok: false, error: "Accès réservé à l'atelier." }, { status: 403 });

  try {
    const ref = new URL(req.url).searchParams.get("ref");
    if (ref) {
      if (!produitCatalogue(ref)) {
        return NextResponse.json({ ok: false, error: `Produit ${ref} inconnu du catalogue.` }, { status: 404 });
      }
      const ajouts = await getCouleursAjouts();
      return NextResponse.json({
        ok: true,
        data: {
          ref,
          couleurs: couleursPourProduit(ref, ajouts),
          tailles: taillesPourProduit(ref),
          coiffe: isHeadwear(ref),
          zone_tete: isHeadwear(ref) ? zoneTete(ref) : null,
        },
      });
    }

    const cat = getCatalogue();
    const mapping = getSkuMapping();
    // Produits Ypersoa déjà vendus (présents dans le pivot SKU) en tête de liste.
    const produits = Object.values(cat.produits)
      .map((p) => ({
        ref: p.ref,
        libelle: mapping.produits[p.ref]?.nom_commercial ?? p.libelle,
        famille: p.famille,
        ypersoa: Boolean(mapping.produits[p.ref]),
      }))
      .sort((a, b) => Number(b.ypersoa) - Number(a.ypersoa) || a.ref.localeCompare(b.ref));

    const motifs = await getMotifs()
      .then((m) => m.motifs.map((x) => ({ id: x.id, nom: x.nom_commercial })))
      .catch(() => [] as Array<{ id: string; nom: string }>);

    return NextResponse.json({
      ok: true,
      data: {
        produits,
        couleurs_ref: Object.values(cat.couleurs_ref).map((c) => ({ code: c.code, libelle: c.libelle, hex: c.hex })),
        motifs,
      },
    });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
