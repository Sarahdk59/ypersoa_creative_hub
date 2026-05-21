/**
 * Bibliothèque d'attributions multicolores.
 * GET    /api/da/attribution-library         → liste complète
 * POST   /api/da/attribution-library         → ajoute une nouvelle entrée (auto-name)
 * PATCH  /api/da/attribution-library?id=...  → renomme une entrée { name }
 * DELETE /api/da/attribution-library?id=...  → supprime
 */
import { NextResponse } from "next/server";
import { readFileSync, writeFileSync } from "fs";
import {
  ATTRIBUTIONS_LIB_PATH,
  getPalettes,
  getFils,
  type AttributionsLibraryRef,
  type AttributionEntry,
} from "@/lib/atelier-da/referentiels-loader";

function readLib(): AttributionsLibraryRef {
  const raw = readFileSync(ATTRIBUTIONS_LIB_PATH, "utf-8");
  return JSON.parse(raw) as AttributionsLibraryRef;
}
function writeLib(data: AttributionsLibraryRef) {
  data._meta = { ...data._meta, last_updated: new Date().toISOString().slice(0, 10) };
  writeFileSync(ATTRIBUTIONS_LIB_PATH, JSON.stringify(data, null, 2) + "\n", "utf-8");
}
function makeId() {
  return `attr_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

export async function GET() {
  try {
    return NextResponse.json({ ok: true, data: readLib() });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Partial<AttributionEntry>;
    if (!body.texte_lignes?.length || !body.result || !body.mode || !body.typo_id) {
      return NextResponse.json({ ok: false, error: "texte_lignes, result, mode, typo_id requis" }, { status: 400 });
    }

    const lib = readLib();

    // Auto-name si pas fourni : "<motif_id ou ''> <descripteur palette/couleur>"
    let name = (body.name || "").trim();
    if (!name) {
      const palettes = getPalettes();
      const fils = getFils();
      const palette = body.mode === "palette" && body.palette_id ? palettes.palettes.find((p) => p.id === body.palette_id) : null;
      const fil = body.mode === "mono" && body.couleur_id ? fils.couleurs.find((f) => f.id === body.couleur_id) : null;
      const motifPart = body.motif_id ? `${body.motif_id} ` : "";
      const colorPart = palette ? `Palette ${palette.nom}` : fil ? fil.nom : "Attribution";
      name = `${motifPart}${colorPart}`.trim();
    }
    // Évite les doublons exacts
    let finalName = name;
    let n = 2;
    while (lib.attributions.some((a) => a.name === finalName)) {
      finalName = `${name} (${n++})`;
    }

    const entry: AttributionEntry = {
      id: makeId(),
      name: finalName,
      motif_id: body.motif_id,
      mode: body.mode,
      couleur_id: body.couleur_id,
      palette_id: body.palette_id,
      coeur_couleur_id: body.coeur_couleur_id ?? null,
      texte_lignes: body.texte_lignes,
      typo_id: body.typo_id,
      bg_fond: body.bg_fond,
      result: body.result,
      created_at: new Date().toISOString().slice(0, 10),
    };
    lib.attributions.unshift(entry);
    writeLib(lib);
    return NextResponse.json({ ok: true, data: entry });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get("id");
    if (!id) return NextResponse.json({ ok: false, error: "id manquant (?id=)" }, { status: 400 });
    const body = (await request.json()) as { name?: string };
    if (typeof body.name !== "string" || !body.name.trim()) {
      return NextResponse.json({ ok: false, error: "name requis" }, { status: 400 });
    }
    const lib = readLib();
    const entry = lib.attributions.find((a) => a.id === id);
    if (!entry) return NextResponse.json({ ok: false, error: `Attribution ${id} introuvable` }, { status: 404 });
    entry.name = body.name.trim();
    writeLib(lib);
    return NextResponse.json({ ok: true, data: entry });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get("id");
    if (!id) return NextResponse.json({ ok: false, error: "id manquant" }, { status: 400 });
    const lib = readLib();
    const before = lib.attributions.length;
    lib.attributions = lib.attributions.filter((a) => a.id !== id);
    if (lib.attributions.length === before) {
      return NextResponse.json({ ok: false, error: `${id} introuvable` }, { status: 404 });
    }
    writeLib(lib);
    return NextResponse.json({ ok: true, data: { deleted: id } });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
