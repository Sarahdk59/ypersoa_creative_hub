/**
 * POST /api/da/motifs/[id]/promote-prod-png
 * Promote un PNG prod (assets/motifs png/) en variante hero du motif :
 *  1. copie le fichier vers assets/motifs/ (même nom)
 *  2. ajoute la variante au JSON si pas déjà là
 *  3. set comme asset_principal
 *
 * Body JSON : { key: string }  // doit exister dans le scan prod_files (avec PNG)
 */
import { NextResponse } from "next/server";
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import {
  scanProdFilesByMotif,
  clearMotifsCache,
  ASSETS_MOTIFS_DIR,
  ASSETS_MOTIFS_PNG_DIR,
  MOTIFS_REF_PATH,
  mimeTypeForImageFile,
  type MotifsYpmRef,
  type MotifVariante,
} from "@/lib/atelier-da/referentiels-loader";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase";

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

    const list = scanProdFilesByMotif().get(id);
    const entry = list?.find((f) => f.key === key);
    if (!entry?.png) {
      return NextResponse.json(
        { ok: false, error: `PNG prod ${id}-${key} introuvable` },
        { status: 404 }
      );
    }

    // Le PNG prod (assets/motifs png/) est commité, mais le dupliquer dans
    // assets/motifs/ au runtime ne suffit pas en prod (fs éphémère + public figé).
    // On le pousse donc sur Supabase Storage et on garde son URL pour le hero.
    const src = join(ASSETS_MOTIFS_PNG_DIR, entry.png);
    let promotedUrl: string | undefined;
    if (isSupabaseConfigured()) {
      const buffer = readFileSync(src);
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
      promotedUrl = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(entry.png).data.publicUrl;
    } else {
      if (!existsSync(ASSETS_MOTIFS_DIR)) {
        mkdirSync(ASSETS_MOTIFS_DIR, { recursive: true });
      }
      copyFileSync(src, join(ASSETS_MOTIFS_DIR, entry.png));
    }

    const raw = readFileSync(MOTIFS_REF_PATH, "utf-8");
    const data = JSON.parse(raw) as MotifsYpmRef;
    const target = data.motifs.find((m) => m.id === id);
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
      if (promotedUrl) {
        target.asset_principal_url = promotedUrl;
      } else {
        delete target.asset_principal_url;
      }
      target.nb_variantes = variantes.length;

      data._meta.nb_variantes_total = data.motifs.reduce(
        (s, m) => s + (m.nb_variantes || 0),
        0
      );
      data._meta.last_updated = new Date().toISOString().slice(0, 10);

      writeFileSync(MOTIFS_REF_PATH, JSON.stringify(data, null, 2) + "\n", "utf-8");
      clearMotifsCache();
    } else if (promotedUrl && target.asset_principal_url !== promotedUrl) {
      // Déjà hero mais sans URL Supabase (ex. hero promu avant cette migration,
      // preview cassée en prod) : re-cliquer la Star répare le lien.
      target.asset_principal_url = promotedUrl;
      data._meta.last_updated = new Date().toISOString().slice(0, 10);
      writeFileSync(MOTIFS_REF_PATH, JSON.stringify(data, null, 2) + "\n", "utf-8");
      clearMotifsCache();
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
