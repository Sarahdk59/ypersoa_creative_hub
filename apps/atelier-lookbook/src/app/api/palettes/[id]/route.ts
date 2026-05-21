/**
 * PATCH /api/palettes/[id]
 * Toggle le champ `favori` d'une palette dans le référentiel partagé
 * `referentiels/palettes_fils_associations.json`.
 * Body : { favori: boolean }
 *
 * Note : l'autorité d'écriture complète (nom, fils, archive, swap, etc.) vit dans
 * atelier-social (PATCH /api/da/palettes/[id]). Ici on n'expose QUE le toggle favori
 * — seule action utile depuis le selector lookbook.
 */
import { NextResponse } from "next/server";
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

interface Palette {
  id: string; nom: string; type: string; fils: string[];
  description?: string; archive?: boolean; favori?: boolean;
}
interface PalettesRef {
  _meta: Record<string, unknown>;
  palettes: Palette[];
}

const PALETTES_PATH = join(process.cwd(), "..", "..", "referentiels", "palettes_fils_associations.json");

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = (await request.json()) as { favori?: unknown };

    if (typeof body.favori !== "boolean") {
      return NextResponse.json({ ok: false, error: "favori doit être un boolean" }, { status: 400 });
    }

    const data = JSON.parse(readFileSync(PALETTES_PATH, "utf-8")) as PalettesRef;
    const palette = data.palettes.find((p) => p.id === id);
    if (!palette) {
      return NextResponse.json({ ok: false, error: `Palette ${id} introuvable` }, { status: 404 });
    }

    if (body.favori) palette.favori = true;
    else delete palette.favori;

    data._meta = { ...data._meta, last_updated: new Date().toISOString().slice(0, 10) };
    writeFileSync(PALETTES_PATH, JSON.stringify(data, null, 2) + "\n", "utf-8");

    return NextResponse.json({ ok: true, data: { id: palette.id, favori: Boolean(palette.favori) } });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
