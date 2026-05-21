/**
 * GET /api/da/gunold-catalog        → catalogue complet Gunold Poly 40 (300 codes)
 * GET /api/da/gunold-catalog?code=X → lookup d'une couleur par code Gunold
 */
import { NextResponse } from "next/server";
import { getGunoldCatalog } from "@/lib/atelier-da/referentiels-loader";

export async function GET(request: Request) {
  try {
    const catalog = getGunoldCatalog();
    const url = new URL(request.url);
    const code = url.searchParams.get("code");
    if (code) {
      const match = catalog.couleurs.find((c) => c.code_gunold === code.trim());
      if (!match) {
        return NextResponse.json({ ok: false, error: `Code Gunold ${code} introuvable dans le catalogue (300 codes connus)` }, { status: 404 });
      }
      return NextResponse.json({ ok: true, data: match });
    }
    return NextResponse.json({ ok: true, data: catalog });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
