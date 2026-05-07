/**
 * GET /api/hub/products
 * Retourne les produits Hub (5 YPxxx) + la palette supports vêtement (22 couleurs).
 * Utilisé par le picker produit/couleur dans /social.
 */
import { NextResponse } from "next/server";
import { getProduits, getGarments } from "@/lib/hub-products";

export async function GET() {
  try {
    return NextResponse.json({
      ok: true,
      data: { produits: getProduits(), garments: getGarments() },
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
