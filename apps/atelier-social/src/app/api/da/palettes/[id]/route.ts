/**
 * PATCH /api/da/palettes/[id]
 * Met à jour une palette :
 *  - archive: bool        (testée non validée → masquée par défaut)
 *  - favori: bool         (palette préférée → remontée en tête de liste)
 *  - nom: string
 *  - description: string
 *  - fils: string[]       (remplace la liste complète)
 *  - swap: { from: fil_id, to: fil_id }  (raccourci : remplace un fil par un autre)
 */
import { NextResponse } from "next/server";
import { readFileSync, writeFileSync } from "fs";
import {
  clearPalettesCache,
  PALETTES_REF_PATH,
  type PalettesRef,
} from "@/lib/atelier-da/referentiels-loader";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = (await request.json()) as {
      archive?: unknown;
      favori?: unknown;
      nom?: unknown;
      description?: unknown;
      fils?: unknown;
      swap?: unknown;
    };

    const raw = readFileSync(PALETTES_REF_PATH, "utf-8");
    const data = JSON.parse(raw) as PalettesRef;
    const palette = data.palettes.find((p) => p.id === id);
    if (!palette) {
      return NextResponse.json({ ok: false, error: `Palette ${id} introuvable` }, { status: 404 });
    }

    if ("archive" in body) {
      if (typeof body.archive !== "boolean") {
        return NextResponse.json({ ok: false, error: "archive doit être un boolean" }, { status: 400 });
      }
      if (body.archive) palette.archive = true;
      else delete palette.archive;
    }

    if ("favori" in body) {
      if (typeof body.favori !== "boolean") {
        return NextResponse.json({ ok: false, error: "favori doit être un boolean" }, { status: 400 });
      }
      if (body.favori) palette.favori = true;
      else delete palette.favori;
    }

    if ("nom" in body) {
      if (typeof body.nom !== "string" || !body.nom.trim()) {
        return NextResponse.json({ ok: false, error: "nom doit être une string non vide" }, { status: 400 });
      }
      palette.nom = body.nom.trim();
    }

    if ("description" in body) {
      if (body.description === null || body.description === "") {
        delete palette.description;
      } else if (typeof body.description === "string") {
        palette.description = body.description.trim();
      } else {
        return NextResponse.json({ ok: false, error: "description doit être une string" }, { status: 400 });
      }
    }

    if ("fils" in body) {
      if (!Array.isArray(body.fils) || !body.fils.every((f) => typeof f === "string")) {
        return NextResponse.json({ ok: false, error: "fils doit être un tableau de string (fil_id)" }, { status: 400 });
      }
      palette.fils = (body.fils as string[]).filter(Boolean);
    }

    if ("swap" in body) {
      const swap = body.swap as { from?: string; to?: string };
      if (!swap || typeof swap.from !== "string" || typeof swap.to !== "string") {
        return NextResponse.json({ ok: false, error: "swap doit être { from: fil_id, to: fil_id }" }, { status: 400 });
      }
      const idx = palette.fils.indexOf(swap.from);
      if (idx < 0) {
        return NextResponse.json({ ok: false, error: `Fil ${swap.from} pas dans la palette ${id}` }, { status: 400 });
      }
      // Évite les doublons
      if (palette.fils.includes(swap.to) && swap.to !== swap.from) {
        palette.fils.splice(idx, 1);
      } else {
        palette.fils[idx] = swap.to;
      }
    }

    data._meta = { ...data._meta, last_updated: new Date().toISOString().slice(0, 10) };
    writeFileSync(PALETTES_REF_PATH, JSON.stringify(data, null, 2) + "\n", "utf-8");
    clearPalettesCache();

    return NextResponse.json({ ok: true, data: palette });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
