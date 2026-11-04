/**
 * POST /api/da/motifs/nouveau
 * Création d'un nouveau motif YPM dans la table Supabase `motifs_ypm`
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
import { createMotifRow, getMotifRow, type MotifYpmData } from "@/lib/atelier-da/referentiels-loader";
import { createClient } from "@/lib/supabase/server";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const STORAGE_BUCKET = "motifs-png";
const EXT_BY_MIME: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
};
const ID_PATTERN = /^YPM-\d{3}$/;

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

    if (await getMotifRow(id)) {
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
    }

    const tags = tagsRaw ? tagsRaw.split(",").map((t) => t.trim()).filter(Boolean) : undefined;

    const newMotifData: MotifYpmData = {
      nom_commercial: nomCommercial,
      asset_principal: filename,
      ...(publicUrl ? { asset_principal_url: publicUrl } : {}),
      nb_variantes: 0,
      variantes: [],
      ...(tags ? { tags } : {}),
    };

    await createMotifRow(id, newMotifData);

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
