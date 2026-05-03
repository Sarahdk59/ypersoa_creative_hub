/**
 * POST /api/da/motifs/[id]/set-hero
 * Échange l'asset_principal d'un motif avec une de ses variantes.
 *
 * Body JSON : { file: string }  // doit être présent dans variantes[]
 *
 * L'ancien asset_principal est ré-injecté en tête de variantes[] avec un label
 * dérivé du nom de fichier (strip de l'ID prefix et de l'extension).
 */
import { NextResponse } from "next/server";
import { readFileSync, writeFileSync } from "fs";
import {
  clearMotifsCache,
  MOTIFS_REF_PATH,
  type MotifsYpmRef,
  type MotifVariante,
} from "@/lib/atelier-da/referentiels-loader";

function deriveLabelFromFilename(filename: string, motifId: string): string {
  let base = filename.replace(/\.[^.]+$/, "");
  const prefixes = [`${motifId}-`, `${motifId} `];
  for (const p of prefixes) {
    if (base.startsWith(p)) {
      base = base.slice(p.length);
      break;
    }
  }
  return base.trim() || filename;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = (await request.json()) as { file?: unknown };
    const file = typeof body.file === "string" ? body.file.trim() : "";
    if (!file) {
      return NextResponse.json({ ok: false, error: "Fichier manquant" }, { status: 400 });
    }

    const raw = readFileSync(MOTIFS_REF_PATH, "utf-8");
    const data = JSON.parse(raw) as MotifsYpmRef;
    const target = data.motifs.find((m) => m.id === id);
    if (!target) {
      return NextResponse.json({ ok: false, error: `Motif ${id} introuvable` }, { status: 404 });
    }

    if (file === target.asset_principal) {
      return NextResponse.json({ ok: true, data: { id, file, noop: true } });
    }

    const variantes = target.variantes || [];
    const shootingPngs = target.shooting_pngs || [];
    const variantIdx = variantes.findIndex((v) => v.file === file);
    const shootingIdx = variantIdx === -1 ? shootingPngs.findIndex((v) => v.file === file) : -1;
    if (variantIdx === -1 && shootingIdx === -1) {
      return NextResponse.json(
        { ok: false, error: `${file} n'est ni variante ni PNG shooting de ${id}` },
        { status: 400 }
      );
    }

    const newHero = variantIdx !== -1 ? variantes[variantIdx] : shootingPngs[shootingIdx];
    const oldHeroFile = target.asset_principal;
    const oldHeroAsVariante: MotifVariante = {
      file: oldHeroFile,
      label: deriveLabelFromFilename(oldHeroFile, id),
    };

    if (variantIdx !== -1) {
      variantes.splice(variantIdx, 1);
    } else {
      shootingPngs.splice(shootingIdx, 1);
      target.shooting_pngs = shootingPngs;
    }
    variantes.unshift(oldHeroAsVariante);
    target.variantes = variantes;
    target.asset_principal = newHero.file;
    target.nb_variantes = variantes.length;

    data._meta.nb_variantes_total = data.motifs.reduce(
      (s, m) => s + (m.nb_variantes || 0),
      0
    );
    data._meta.last_updated = new Date().toISOString().slice(0, 10);

    writeFileSync(MOTIFS_REF_PATH, JSON.stringify(data, null, 2) + "\n", "utf-8");
    clearMotifsCache();

    return NextResponse.json({
      ok: true,
      data: { id, new_hero: newHero.file, old_hero: oldHeroFile },
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
