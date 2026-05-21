import { NextRequest, NextResponse } from "next/server";

import { getAuditMatrix } from "@/lib/mediatheque/store";

const DEFAULT_MOTIFS = Array.from({ length: 18 }, (_, i) => `ypm-${String(i).padStart(3, "0")}`);
const DEFAULT_PRODUITS = ["yp001", "yp004", "yp005", "yp019", "yp021"];
const DEFAULT_PLANS = ["lookbook", "lifestyle"];

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const motifSlugs = sp.getAll("motif");
  const produitSlugs = sp.getAll("produit");
  const planSlugs = sp.getAll("plan");

  const matrix = await getAuditMatrix({
    motif_slugs: motifSlugs.length > 0 ? motifSlugs : DEFAULT_MOTIFS,
    produit_slugs: produitSlugs.length > 0 ? produitSlugs : DEFAULT_PRODUITS,
    plan_slugs: planSlugs.length > 0 ? planSlugs : DEFAULT_PLANS,
  });

  return NextResponse.json(matrix);
}
