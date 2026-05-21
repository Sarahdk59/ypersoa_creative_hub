/**
 * GET  /api/da/palettes → liste complète
 * POST /api/da/palettes → crée une nouvelle palette
 *   Body : { nom, type, fils[], description? }
 */
import { NextResponse } from "next/server";
import { readFileSync, writeFileSync } from "fs";
import {
  getPalettes,
  getFils,
  clearPalettesCache,
  PALETTES_REF_PATH,
  type PalettesRef,
  type Palette,
} from "@/lib/atelier-da/referentiels-loader";

export async function GET() {
  try {
    return NextResponse.json({ ok: true, data: getPalettes() });
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

const VALID_TYPES = ["camaieu", "multicolore", "duo", "trio"] as const;

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const nom = String(body.nom || "").trim();
    const type = String(body.type || "").trim().toLowerCase() as Palette["type"];
    const fils = Array.isArray(body.fils)
      ? (body.fils as unknown[]).filter((f): f is string => typeof f === "string" && Boolean(f.trim())).map((f) => f.trim())
      : [];
    const description = typeof body.description === "string" ? body.description.trim() : "";

    if (!nom) return NextResponse.json({ ok: false, error: "nom requis" }, { status: 400 });
    if (!(VALID_TYPES as readonly string[]).includes(type)) {
      return NextResponse.json({ ok: false, error: `type doit être : ${VALID_TYPES.join(", ")}` }, { status: 400 });
    }
    if (fils.length < 2) {
      return NextResponse.json({ ok: false, error: "Au moins 2 fils requis" }, { status: 400 });
    }

    const filsRef = getFils();
    const knownIds = new Set(filsRef.couleurs.map((c) => c.id));
    const unknown = fils.filter((f) => !knownIds.has(f));
    if (unknown.length) {
      return NextResponse.json({ ok: false, error: `Fils inconnus : ${unknown.join(", ")}` }, { status: 400 });
    }

    const raw = readFileSync(PALETTES_REF_PATH, "utf-8");
    const data = JSON.parse(raw) as PalettesRef;

    const idBase = `palette_${slug(nom)}`;
    let id = idBase;
    let n = 2;
    while (data.palettes.some((p) => p.id === id)) {
      id = `${idBase}_${n++}`;
    }

    const newPalette: Palette = {
      id,
      nom,
      type,
      fils,
      ...(description ? { description } : {}),
    };

    data.palettes.push(newPalette);
    data._meta = {
      ...data._meta,
      last_updated: new Date().toISOString().slice(0, 10),
      nb_palettes: data.palettes.length,
    };
    writeFileSync(PALETTES_REF_PATH, JSON.stringify(data, null, 2) + "\n", "utf-8");
    clearPalettesCache();

    return NextResponse.json({ ok: true, data: newPalette });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
