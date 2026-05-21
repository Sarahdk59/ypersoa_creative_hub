/**
 * GET /api/palettes
 * Liste les palettes d'associations Ypersoa avec leurs hex couleurs résolues
 * (via le référentiel fils v2). Utilisé par l'UI lookbook pour le sélecteur palette.
 *
 * Source : referentiels/palettes_fils_associations.json + palette_fils_broderie_v2.json
 */
import { NextResponse } from "next/server";
import { readFileSync } from "fs";
import { join } from "path";

interface Fil { id: string; nom: string; hex: string; code_gunold?: string }
interface Palette {
  id: string; nom: string; type: string; fils: string[];
  description?: string; archive?: boolean; favori?: boolean;
}

const REFS_DIR = join(process.cwd(), "..", "..", "referentiels");

export async function GET() {
  try {
    const palettesRaw = JSON.parse(readFileSync(join(REFS_DIR, "palettes_fils_associations.json"), "utf-8")) as { palettes: Palette[] };
    const filsRaw = JSON.parse(readFileSync(join(REFS_DIR, "palette_fils_broderie_v2.json"), "utf-8")) as { couleurs: Fil[] };
    const filsById = new Map(filsRaw.couleurs.map((f) => [f.id, f]));

    const data = palettesRaw.palettes
      .filter((p) => !p.archive)
      .map((p) => ({
        id: p.id,
        nom: p.nom,
        type: p.type,
        description: p.description,
        favori: Boolean(p.favori),
        fils: p.fils.map((fid) => {
          const f = filsById.get(fid);
          return f ? { id: f.id, nom: f.nom, hex: f.hex } : { id: fid, nom: fid, hex: "#888" };
        }),
      }))
      // Favoris d'abord, ordre original ensuite
      .sort((a, b) => Number(b.favori) - Number(a.favori));

    return NextResponse.json({ ok: true, palettes: data });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
