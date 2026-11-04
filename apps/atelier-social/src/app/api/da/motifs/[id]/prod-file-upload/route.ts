/**
 * POST /api/da/motifs/[id]/prod-file-upload
 * Upload d'un fichier prod (PXF / DST / PNG ou JPG / FT-pdf) dans le bucket
 * Storage `motifs-prod-files` (préfixe = type). Convention de nom :
 * {motif_id}-{key}.{ext} (l'extension du fichier stocké suit celle du
 * fichier uploadé pour le type "png").
 *
 * FormData :
 *  - file : fichier binaire
 *  - key  : string (ex. "A", "BRIGITTE", "version-2")
 *  - type : "pxf" | "dst" | "png" | "ft"
 */
import { NextResponse } from "next/server";
import { uploadMotifProdFile, type ProdFileType } from "@/lib/atelier-da/referentiels-loader";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

const VALID_TYPES: ProdFileType[] = ["pxf", "dst", "png", "ft"];

// Extensions acceptées par type — "png" accepte aussi les JPG/JPEG.
const EXT_BY_TYPE: Record<ProdFileType, string[]> = {
  pxf: ["pxf"],
  dst: ["dst"],
  png: ["png", "jpg", "jpeg"],
  ft: ["pdf"],
};

const CONTENT_TYPE_BY_TYPE: Record<ProdFileType, string> = {
  pxf: "application/octet-stream",
  dst: "application/octet-stream",
  png: "image/png",
  ft: "application/pdf",
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
    if (!VALID_TYPES.includes(type as ProdFileType)) {
      return NextResponse.json(
        { ok: false, error: `type doit être : pxf, dst, png ou ft (reçu : ${type})` },
        { status: 400 }
      );
    }
    const typedType = type as ProdFileType;
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { ok: false, error: `Fichier trop volumineux (max ${MAX_FILE_SIZE / 1024 / 1024} MB)` },
        { status: 400 }
      );
    }

    const allowedExts = EXT_BY_TYPE[typedType];
    const fileExt = file.name.split(".").pop()?.toLowerCase() ?? "";
    if (!allowedExts.includes(fileExt)) {
      return NextResponse.json(
        {
          ok: false,
          error: `Extension ${fileExt} ne correspond pas au type ${typedType} (attendu : ${allowedExts
            .map((e) => `.${e}`)
            .join(" ou ")})`,
        },
        { status: 400 }
      );
    }

    const key = sanitizeKey(keyRaw);
    if (!key) {
      return NextResponse.json({ ok: false, error: "Key invalide après sanitization" }, { status: 400 });
    }

    const filename = `${id}-${key}.${fileExt}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    const contentType = typedType === "png" && (fileExt === "jpg" || fileExt === "jpeg")
      ? "image/jpeg"
      : CONTENT_TYPE_BY_TYPE[typedType];
    await uploadMotifProdFile(typedType, filename, buffer, contentType);

    return NextResponse.json({ ok: true, data: { filename, key, type: typedType, size: file.size } });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
