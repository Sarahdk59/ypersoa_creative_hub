/**
 * POST /api/production/catalogue/couleurs
 *   { ref_produit: "YP013", code_couleur: "0064", libelle?: "Vintage Bleu", hex?: "#6F8FC9" }
 *
 * Rattache une couleur à un produit quand le catalogue ne la connaît pas
 * (cas « la couleur n'existe pas → je dois la créer »).
 *  - code présent dans les familles Akanea (Couleurs_ref) → libellé/hex repris
 *    de la famille, rien à créer côté Akanea ;
 *  - code absent → nouvelle famille : libellé obligatoire, flaggée
 *    `nouvelle_famille` (à créer aussi dans Akanea).
 *
 * Atelier (prod) + admin : on AJOUTE, on ne modifie ni ne supprime (matrice
 * de droits du 22/05 : déposer oui, remplacer non).
 */
import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth-guard";
import {
  couleursPourProduit,
  createCouleurAjout,
  getCatalogue,
  getCouleursAjouts,
  produitCatalogue,
} from "@/lib/production/catalogue";

export async function POST(req: Request) {
  const auth = await requireRole(["admin", "prod"]);
  if (!auth) return NextResponse.json({ ok: false, error: "Accès réservé à l'atelier." }, { status: 403 });

  try {
    const body = (await req.json()) as { ref_produit?: string; code_couleur?: string; libelle?: string; hex?: string };
    const ref = (body.ref_produit ?? "").trim().toUpperCase();
    const rawCode = (body.code_couleur ?? "").trim();
    if (!produitCatalogue(ref)) {
      return NextResponse.json({ ok: false, error: `Produit ${ref || "(vide)"} inconnu du catalogue.` }, { status: 400 });
    }
    if (!/^\d{1,4}$/.test(rawCode)) {
      return NextResponse.json({ ok: false, error: "Code couleur Akanea attendu (4 chiffres, ex. 0064)." }, { status: 400 });
    }
    const code = rawCode.padStart(4, "0");
    if (code === "9999") {
      return NextResponse.json({ ok: false, error: "9999 est le code générique « à préciser », pas une couleur." }, { status: 400 });
    }

    const ajouts = await getCouleursAjouts();
    if (couleursPourProduit(ref, ajouts).some((c) => c.code === code)) {
      return NextResponse.json({ ok: false, error: `La couleur ${code} existe déjà pour ${ref}.` }, { status: 409 });
    }

    const famille = getCatalogue().couleurs_ref[code];
    const libelle = (body.libelle ?? "").trim() || famille?.libelle || "";
    if (!libelle) {
      return NextResponse.json(
        { ok: false, error: `Code ${code} absent des familles Akanea : donne un libellé (et crée aussi le code dans Akanea).` },
        { status: 400 },
      );
    }
    const hex = /^#[0-9a-f]{6}$/i.test(body.hex ?? "") ? body.hex! : famille?.hex ?? null;

    await createCouleurAjout({
      ref_produit: ref,
      code_couleur: code,
      libelle,
      hex,
      nouvelle_famille: !famille,
      created_by: auth.email,
    });

    const after = await getCouleursAjouts();
    return NextResponse.json({ ok: true, data: { couleurs: couleursPourProduit(ref, after), nouvelle_famille: !famille } });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
