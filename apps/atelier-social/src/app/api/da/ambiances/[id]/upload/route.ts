/**
 * POST /api/da/ambiances/[id]/upload
 * Upload d'une image de référence pour une ambiance officielle.
 * Le fichier est écrit dans public/referentiel_ambiance/<id>.jpg
 * (extension figée pour matcher AMBIANCES_OFFICIELLES.image_path).
 *
 * FormData :
 *  - file : JPG/JPEG (<= 5 MB)
 */
import { NextResponse } from "next/server";
import { writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";
import { AMBIANCES_OFFICIELLES } from "@/lib/ambiances-officielles";

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const AMBIANCE_DIR = join(process.cwd(), "public", "referentiel_ambiance");

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!AMBIANCES_OFFICIELLES.find((a) => a.id === id)) {
      return NextResponse.json({ ok: false, error: `Ambiance ${id} introuvable` }, { status: 404 });
    }

    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ ok: false, error: "Fichier manquant" }, { status: 400 });
    }
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ ok: false, error: "Fichier > 5 MB" }, { status: 400 });
    }
    if (file.type !== "image/jpeg" && file.type !== "image/jpg") {
      return NextResponse.json(
        { ok: false, error: "JPG uniquement (convertir le PNG via Aperçu → Exporter)" },
        { status: 400 }
      );
    }

    if (!existsSync(AMBIANCE_DIR)) {
      mkdirSync(AMBIANCE_DIR, { recursive: true });
    }
    const buffer = Buffer.from(await file.arrayBuffer());
    writeFileSync(join(AMBIANCE_DIR, `${id}.jpg`), buffer);

    return NextResponse.json({ ok: true, data: { id, file: `${id}.jpg`, ts: Date.now() } });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
