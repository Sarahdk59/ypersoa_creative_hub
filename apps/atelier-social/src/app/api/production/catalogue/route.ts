/**
 * GET /api/production/catalogue
 *   → produits (YPxxx, sans fournisseur), familles couleur Akanea, motifs YPM,
 *     fils (palette v2, code Gunold), palettes nommées (camaïeu / multicolore)
 *     et polices brodables
 * GET /api/production/catalogue?ref=YP013
 *   → couleurs (catalogue + ajouts Hub) et tailles du produit, zone tête éventuelle
 *
 * Sert les sélecteurs « à identifier » de la fiche commande.
 */
import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth-guard";
import {
  getCatalogue,
  isHeadwear,
  zoneTete,
} from "@/lib/production/catalogue";
import { getSkuMapping } from "@/lib/production/commandes-loader";
import { chargerReferentiel, couleursProduitEtendu, taillesProduitEtendu, toutesTailles } from "@/lib/production/referentiel-articles";
import { getFils, getMotifs, getPalettes } from "@/lib/atelier-da/referentiels-loader";
import { splitTypos } from "@/lib/production/broderie-utils";

/** Polices brodables connues (bibliothèque YPM-000 + match Tajima → Google Fonts). */
const POLICES_BASE = ["Russ Times", "Arial Rounded", "Looney", "Museo", "Diana Star", "Script New"];

export async function GET(req: Request) {
  const auth = await requireRole(["admin", "prod"]);
  if (!auth) return NextResponse.json({ ok: false, error: "Accès réservé à l'atelier." }, { status: 403 });

  try {
    const ref = new URL(req.url).searchParams.get("ref");
    // Catalogue Akanea + produits / couleurs / tailles créés depuis le Hub (attendus, R&D).
    const referentiel = await chargerReferentiel();
    if (ref) {
      if (!referentiel.produits.has(ref)) {
        return NextResponse.json({ ok: false, error: `Produit ${ref} inconnu du catalogue.` }, { status: 404 });
      }
      const tailles = taillesProduitEtendu(ref, referentiel);
      return NextResponse.json({
        ok: true,
        data: {
          ref,
          couleurs: couleursProduitEtendu(ref, referentiel),
          // Produit R&D encore sans taille déclarée : toutes les tailles Akanea au choix.
          tailles: tailles.length ? tailles : toutesTailles(),
          coiffe: isHeadwear(ref),
          zone_tete: isHeadwear(ref) ? zoneTete(ref) : null,
        },
      });
    }

    const cat = getCatalogue();
    const mapping = getSkuMapping();
    // Produits Ypersoa déjà vendus (présents dans le pivot SKU) en tête de liste ;
    // produits créés depuis le Hub (attendus de livraison, R&D) marqués `hub`.
    const produits = Array.from(referentiel.produits.values())
      .map((p) => ({
        ref: p.ref,
        libelle: mapping.produits[p.ref]?.nom_commercial ?? p.libelle,
        famille: p.famille,
        ypersoa: Boolean(mapping.produits[p.ref]),
        hub: p.origine === "hub",
      }))
      .sort((a, b) => Number(b.ypersoa) - Number(a.ypersoa) || a.ref.localeCompare(b.ref));

    const motifsRaw = await getMotifs().then((m) => m.motifs).catch(() => []);
    const motifs = motifsRaw.map((x) => ({ id: x.id, nom: x.nom_commercial, typographie: x.bible?.typographie ?? null }));
    const polices = Array.from(
      new Set([
        ...POLICES_BASE,
        ...(motifsRaw.find((m) => m.id === "YPM-000")?.variantes ?? []).map((v) => v.label).filter(Boolean),
        ...motifsRaw.flatMap((m) => splitTypos(m.bible?.typographie)),
      ]),
    );
    const fils = getFils().couleurs.map((f) => ({ id: f.id, nom: f.nom, hex: f.hex, code_gunold: f.code_gunold }));
    const filsById = new Map(fils.map((f) => [f.id, f]));
    // Palettes validées (favoris en tête), avec leurs fils résolus pour l'aperçu.
    const palettes = getPalettes().palettes
      .filter((p) => !p.archive)
      .sort((a, b) => Number(Boolean(b.favori)) - Number(Boolean(a.favori)) || a.nom.localeCompare(b.nom, "fr"))
      .map((p) => ({
        id: p.id,
        nom: p.nom,
        type: p.type,
        favori: Boolean(p.favori),
        fils: p.fils.map((id) => filsById.get(id)).filter((f): f is NonNullable<typeof f> => Boolean(f)),
      }));

    return NextResponse.json({
      ok: true,
      data: {
        produits,
        couleurs_ref: Object.values(cat.couleurs_ref).map((c) => ({ code: c.code, libelle: c.libelle, hex: c.hex })),
        motifs,
        fils,
        palettes,
        polices,
      },
    });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
