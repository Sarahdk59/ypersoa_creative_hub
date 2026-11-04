/**
 * POST /api/da/motifs/[id]/promote-prod-png
 * Promote un PNG prod (bucket `motifs-prod-files`, préfixe `png/`) en
 * variante hero du motif :
 *  1. copie le fichier vers le bucket `motifs-png` (hero/variante)
 *  2. ajoute la variante en base si pas déjà là
 *  3. set comme asset_principal
 *
 * Body JSON : { key: string }  // doit exister dans le scan prod_files (avec PNG)
 */
import { NextResponse } from "next/server";
import {
  scanProdFilesByMotif,
  downloadMotifProdFile,
  getMotifRow,
  writeMotifRow,
  mimeTypeForImageFile,
  type MotifVariante,
} from "@/lib/atelier-da/referentiels-loader";
import { createClient } from "@/lib/supabase/server";

const STORAGE_BUCKET = "motifs-png";

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
    const body = (await request.json()) as { key?: unknown };
    const key = typeof body.key === "string" ? body.key.trim() : "";
    if (!key) {
      return NextResponse.json({ ok: false, error: "key manquante" }, { status: 400 });
    }

    const list = (await scanProdFilesByMotif()).get(id);
    const entry = list?.find((f) => f.key === key);
    if (!entry?.png) {
      return NextResponse.json(
        { ok: false, error: `PNG prod ${id}-${key} introuvable` },
        { status: 404 }
      );
    }

    // Le PNG prod vit dans le bucket `motifs-prod-files` ; le hero/variante doit
    // vivre dans `motifs-png` pour être servi par motifImageSrc() côté UI.
    const buffer = await downloadMotifProdFile("png", entry.png);
    const supabase = await createClient();
    const { error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(entry.png, buffer, { contentType: mimeTypeForImageFile(entry.png), upsert: true });
    if (error) {
      return NextResponse.json(
        { ok: false, error: `Upload Storage échoué : ${error.message}` },
        { status: 500 }
      );
    }
    const promotedUrl = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(entry.png).data.publicUrl;

    const target = await getMotifRow(id);
    if (!target) {
      return NextResponse.json({ ok: false, error: `Motif ${id} introuvable` }, { status: 404 });
    }

    const isAlreadyHero = target.asset_principal === entry.png;
    if (!isAlreadyHero) {
      const variantes = target.variantes || [];
      const oldHeroFile = target.asset_principal;
      const oldHeroUrl = target.asset_principal_url;
      const oldHeroAsVariante: MotifVariante = {
        file: oldHeroFile,
        label: deriveLabelFromFilename(oldHeroFile, id),
        // Préserve l'URL Supabase de l'ancien hero (PNG uploadé) en le rétrogradant.
        ...(oldHeroUrl ? { url: oldHeroUrl } : {}),
      };

      const existingIdx = variantes.findIndex((v) => v.file === entry.png);
      if (existingIdx !== -1) {
        variantes.splice(existingIdx, 1);
      }
      variantes.unshift(oldHeroAsVariante);
      target.variantes = variantes;
      target.asset_principal = entry.png;
      target.asset_principal_url = promotedUrl;
      target.nb_variantes = variantes.length;

      await writeMotifRow(id, target);
    } else if (target.asset_principal_url !== promotedUrl) {
      // Déjà hero mais sans URL Storage à jour (ex. hero promu avant cette
      // migration, preview cassée) : re-cliquer la Star répare le lien.
      target.asset_principal_url = promotedUrl;
      await writeMotifRow(id, target);
    }

    return NextResponse.json({
      ok: true,
      data: { id, key, file: entry.png, was_already_hero: isAlreadyHero },
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
