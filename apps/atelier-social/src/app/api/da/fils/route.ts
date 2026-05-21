/**
 * GET  /api/da/fils → liste complète
 * POST /api/da/fils → crée un nouveau fil. Body : { nom, code_gunold, hex?, famille?, pantone_tpg? }
 *                    Si hex absent, lookup auto depuis le catalogue Gunold Poly 40.
 */
import { NextResponse } from "next/server";
import { readFileSync, writeFileSync } from "fs";
import {
  getFils,
  getGunoldCatalog,
  clearFilsCache,
  FILS_REF_PATH,
  type FilsRef,
} from "@/lib/atelier-da/referentiels-loader";

export async function GET() {
  try {
    return NextResponse.json({ ok: true, data: getFils() });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}

function slug(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const nom = String(body.nom || "").trim();
    const codeGunold = String(body.code_gunold || "").trim();
    if (!nom) return NextResponse.json({ ok: false, error: "nom requis" }, { status: 400 });
    if (!codeGunold) return NextResponse.json({ ok: false, error: "code_gunold requis" }, { status: 400 });

    // Lookup hex auto depuis le catalogue Gunold si pas fourni
    let hex = typeof body.hex === "string" ? body.hex.trim().toUpperCase() : "";
    const catalog = getGunoldCatalog();
    const catalogEntry = catalog.couleurs.find((c) => c.code_gunold === codeGunold);
    if (catalogEntry && !hex) hex = catalogEntry.hex;
    if (!hex) {
      return NextResponse.json(
        { ok: false, error: `Code Gunold ${codeGunold} pas dans le catalogue — fournis explicitement le hex` },
        { status: 400 }
      );
    }
    if (!/^#[0-9A-F]{6}$/.test(hex)) {
      return NextResponse.json({ ok: false, error: "hex invalide (#RRGGBB)" }, { status: 400 });
    }

    const raw = readFileSync(FILS_REF_PATH, "utf-8");
    const data = JSON.parse(raw) as FilsRef;

    const idBase = `fil_${slug(nom)}`;
    let id = idBase;
    let n = 2;
    while (data.couleurs.some((c) => c.id === id)) {
      id = `${idBase}_${n++}`;
    }
    const rang = Math.max(...data.couleurs.map((c) => c.rang), 0) + 1;

    const newFil = {
      id,
      rang,
      nom,
      hex,
      code_gunold: codeGunold,
      numero_aiguille_canonique: null,
      famille: typeof body.famille === "string" && body.famille.trim() ? body.famille.trim() : "autre",
      pantone_tpg: typeof body.pantone_tpg === "string" && body.pantone_tpg.trim() ? body.pantone_tpg.trim() : undefined,
    };

    data.couleurs.push(newFil as FilsRef["couleurs"][number]);
    if (data._meta && typeof data._meta === "object") {
      (data._meta as Record<string, unknown>).last_updated = new Date().toISOString().slice(0, 10);
      (data._meta as Record<string, unknown>).nb_couleurs = data.couleurs.length;
    }
    writeFileSync(FILS_REF_PATH, JSON.stringify(data, null, 2) + "\n", "utf-8");
    clearFilsCache();

    return NextResponse.json({ ok: true, data: newFil });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
