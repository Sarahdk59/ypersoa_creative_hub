/**
 * POST /api/da/motifs/nouveau
 * Création d'un nouveau motif YPM dans referentiels/motifs/motifs_ypm.json
 * (ex. YPM-018). Une fois créé, le motif suit le même workflow que les
 * autres : ajout de variantes et fichiers prod (buste/poignet) via
 * /api/da/motifs/[id]/upload et /api/da/motifs/[id]/prod-file-upload.
 *
 * FormData :
 *  - id             : string, format "YPM-NNN" (3 chiffres), doit être libre
 *  - nom_commercial : string
 *  - file           : PNG ou JPG/JPEG (<=5MB), optionnel — devient le hero
 *                      (asset_principal) si fourni, sinon le motif est créé
 *                      sans visuel (à définir ensuite via "Ajouter une
 *                      variante" + "Définir comme hero").
 *  - tags           : string optionnel, csv
 */
import { NextResponse } from "next/server";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";
import {
  MOTIFS_REF_PATH,
  ASSETS_MOTIFS_DIR,
  clearMotifsCache,
  type MotifsYpmRef,
  type MotifYpm,
} from "@/lib/atelier-da/referentiels-loader";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const STORAGE_BUCKET = "motifs-png";
const EXT_BY_MIME: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
};
const ID_PATTERN = /^YPM-\d{3}$/;

function uniqueFilename(base: string, ext: string): string {
  if (!existsSync(ASSETS_MOTIFS_DIR)) {
    mkdirSync(ASSETS_MOTIFS_DIR, { recursive: true });
  }
  let candidate = `${base}.${ext}`;
  if (!existsSync(join(ASSETS_MOTIFS_DIR, candidate))) return candidate;
  let n = 2;
  while (existsSync(join(ASSETS_MOTIFS_DIR, `${base}-${n}.${ext}`))) n++;
  return `${base}-${n}.${ext}`;
}

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const id = String(form.get("id") || "").trim().toUpperCase();
    const nomCommercial = String(form.get("nom_commercial") || "").trim();
    const file = form.get("file");
    const tagsRaw = String(form.get("tags") || "").trim();

    if (!ID_PATTERN.test(id)) {
      return NextResponse.json(
        { ok: false, error: `ID invalide (attendu "YPM-NNN", reçu "${id}")` },
        { status: 400 }
      );
    }
    if (!nomCommercial) {
      return NextResponse.json({ ok: false, error: "Nom commercial manquant" }, { status: 400 });
    }

    const raw = readFileSync(MOTIFS_REF_PATH, "utf-8");
    const data = JSON.parse(raw) as MotifsYpmRef;
    if (data.motifs.some((m) => m.id === id)) {
      return NextResponse.json({ ok: false, error: `Le motif ${id} existe déjà` }, { status: 409 });
    }

    let hasFile = false;
    let filename = "";
    let publicUrl: string | undefined;

    if (file instanceof File && file.size > 0) {
      hasFile = true;
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json({ ok: false, error: "Fichier > 5 MB" }, { status: 400 });
      }
      const ext = EXT_BY_MIME[file.type];
      if (!ext) {
        return NextResponse.json({ ok: false, error: "PNG ou JPG uniquement" }, { status: 400 });
      }
      const base = `${id}-hero`;
      const buffer = Buffer.from(await file.arrayBuffer());

      if (isSupabaseConfigured()) {
        const supabase = await createClient();
        let candidate = `${base}.${ext}`;
        let n = 2;
        for (;;) {
          const { error } = await supabase.storage
            .from(STORAGE_BUCKET)
            .upload(candidate, buffer, { contentType: file.type, upsert: false });
          if (!error) break;
          if (!/exist|dupl|409/i.test(error.message) || n > 50) {
            return NextResponse.json(
              { ok: false, error: `Upload Storage échoué : ${error.message}` },
              { status: 500 }
            );
          }
          candidate = `${base}-${n}.${ext}`;
          n++;
        }
        filename = candidate;
        publicUrl = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(filename).data.publicUrl;
      } else {
        filename = uniqueFilename(base, ext);
        writeFileSync(join(ASSETS_MOTIFS_DIR, filename), buffer);
      }
    }

    const tags = tagsRaw ? tagsRaw.split(",").map((t) => t.trim()).filter(Boolean) : undefined;

    const newMotif: MotifYpm = {
      id,
      nom_commercial: nomCommercial,
      asset_principal: filename,
      ...(publicUrl ? { asset_principal_url: publicUrl } : {}),
      nb_variantes: 0,
      variantes: [],
      ...(tags ? { tags } : {}),
    };

    data.motifs.push(newMotif);
    data._meta.nb_motifs = data.motifs.length;
    data._meta.nb_variantes_total = data.motifs.reduce((s, m) => s + (m.nb_variantes || 0), 0);
    data._meta.last_updated = new Date().toISOString().slice(0, 10);

    writeFileSync(MOTIFS_REF_PATH, JSON.stringify(data, null, 2) + "\n", "utf-8");
    clearMotifsCache();

    return NextResponse.json({
      ok: true,
      data: { id, nom_commercial: nomCommercial, hasFile, file: filename || undefined },
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
