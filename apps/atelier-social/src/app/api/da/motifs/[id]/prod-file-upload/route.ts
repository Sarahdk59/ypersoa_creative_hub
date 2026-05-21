/**
 * POST /api/da/motifs/[id]/prod-file-upload
 * Upload d'un fichier prod (PXF / DST / PNG / FT-pdf) dans le bon dossier
 * `assets/motifs <type>/`. La source de vérité est le disque (scanné par
 * scanProdFilesByMotif). Convention de nom : {motif_id}-{key}.{ext}
 *
 * FormData :
 *  - file : fichier binaire
 *  - key  : string (ex. "A", "BRIGITTE", "version-2")
 *  - type : "pxf" | "dst" | "png" | "ft"
 */
import { NextResponse } from "next/server";
import { writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";
import {
  clearMotifsCache,
  ASSETS_MOTIFS_PXF_DIR,
  ASSETS_MOTIFS_DST_DIR,
  ASSETS_MOTIFS_PNG_DIR,
  ASSETS_MOTIFS_FT_DIR,
} from "@/lib/atelier-da/referentiels-loader";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

const DIR_BY_TYPE: Record<string, string> = {
  pxf: ASSETS_MOTIFS_PXF_DIR,
  dst: ASSETS_MOTIFS_DST_DIR,
  png: ASSETS_MOTIFS_PNG_DIR,
  ft: ASSETS_MOTIFS_FT_DIR,
};

const EXT_BY_TYPE: Record<string, string> = {
  pxf: "pxf",
  dst: "dst",
  png: "png",
  ft: "pdf",
};

function sanitizeKey(input: string): string {
  return input
    .trim()
    .replace(/[^A-Za-z0-9._-]/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!/^YPM-\d{3}$/.test(id)) {
      return NextResponse.json({ ok: false, error: `id motif invalide : ${id}` }, { status: 400 });
    }

    const form = await request.formData();
    const file = form.get("file");
    const keyRaw = String(form.get("key") || "").trim();
    const type = String(form.get("type") || "").toLowerCase();

    if (!(file instanceof File)) {
      return NextResponse.json({ ok: false, error: "Fichier manquant" }, { status: 400 });
    }
    if (!keyRaw) {
      return NextResponse.json({ ok: false, error: "Key manquante (ex. 'A', 'BRIGITTE')" }, { status: 400 });
    }
    if (!(type in DIR_BY_TYPE)) {
      return NextResponse.json(
        { ok: false, error: `type doit être : pxf, dst, png ou ft (reçu : ${type})` },
        { status: 400 }
      );
    }
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { ok: false, error: `Fichier trop volumineux (max ${MAX_FILE_SIZE / 1024 / 1024} MB)` },
        { status: 400 }
      );
    }

    const expectedExt = EXT_BY_TYPE[type];
    const fileExt = file.name.split(".").pop()?.toLowerCase() ?? "";
    if (fileExt !== expectedExt) {
      return NextResponse.json(
        { ok: false, error: `Extension ${fileExt} ne correspond pas au type ${type} (attendu : .${expectedExt})` },
        { status: 400 }
      );
    }

    const key = sanitizeKey(keyRaw);
    if (!key) {
      return NextResponse.json({ ok: false, error: "Key invalide après sanitization" }, { status: 400 });
    }

    const dir = DIR_BY_TYPE[type];
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    const filename = `${id}-${key}.${expectedExt}`;
    const target = join(dir, filename);
    const buffer = Buffer.from(await file.arrayBuffer());
    writeFileSync(target, buffer);

    clearMotifsCache();

    return NextResponse.json({ ok: true, data: { filename, key, type, size: file.size } });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
