/**
 * GET  /api/production/catalogue/references            → produits (catalogue + R&D Hub),
 *       familles couleur, toutes les tailles Akanea, prochaine réf. produit libre
 * GET  /api/production/catalogue/references?ref=YP001  → couleurs + tailles du produit
 * POST /api/production/catalogue/references            → crée la réf. article
 *       (et si besoin le produit R&D, la couleur produit, la taille produit)
 *
 * Admin + atelier (prod).
 */
import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth-guard";
import { getCatalogue } from "@/lib/production/catalogue";
import {
  chargerReferentiel,
  couleursProduitEtendu,
  creerReference,
  prochaineRefProduit,
  taillesProduitEtendu,
  toutesTailles,
  type CreationReferenceInput,
} from "@/lib/production/referentiel-articles";

const err = (msg: string, status = 400) => NextResponse.json({ ok: false, error: msg }, { status });

export async function GET(req: Request) {
  const auth = await requireRole(["admin", "prod"]);
  if (!auth) return err("Accès réservé à l'atelier.", 403);
  try {
    const r = await chargerReferentiel();
    const ref = new URL(req.url).searchParams.get("ref")?.toUpperCase();
    if (ref) {
      if (!r.produits.has(ref)) return err(`Produit ${ref} inconnu.`, 404);
      return NextResponse.json({
        ok: true,
        data: { ref, couleurs: couleursProduitEtendu(ref, r), tailles: taillesProduitEtendu(ref, r) },
      });
    }
    const cat = getCatalogue();
    return NextResponse.json({
      ok: true,
      data: {
        produits: Array.from(r.produits.values())
          .map((p) => ({ ref: p.ref, libelle: p.libelle, ref_fabricant: p.ref_fabricant, famille: p.famille, statut: p.statut, origine: p.origine }))
          .sort((a, b) => a.ref.localeCompare(b.ref)),
        couleurs_ref: Object.values(cat.couleurs_ref).map((c) => ({ code: c.code, libelle: c.libelle, hex: c.hex })),
        tailles: toutesTailles(),
        familles: Array.from(new Set(Array.from(r.produits.values()).map((p) => p.famille).filter(Boolean))).sort(),
        prochaine_ref: prochaineRefProduit(r),
      },
    });
  } catch (e) {
    return err(e instanceof Error ? e.message : String(e), 500);
  }
}

export async function POST(req: Request) {
  const auth = await requireRole(["admin", "prod"]);
  if (!auth) return err("Accès réservé à l'atelier.", 403);
  try {
    const body = (await req.json()) as CreationReferenceInput;
    const res = await creerReference({ ...body, created_by: auth.email ?? undefined });
    return NextResponse.json({ ok: true, data: res });
  } catch (e) {
    return err(e instanceof Error ? e.message : String(e));
  }
}
