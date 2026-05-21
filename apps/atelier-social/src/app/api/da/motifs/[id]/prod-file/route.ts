/**
 * GET /api/da/motifs/[id]/prod-file?type=pxf|dst|ft&key=<key>
 * Stream un fichier prod (PXF, DST ou fiche technique PDF) depuis le bon dossier.
 * Utilisé par le modal motif pour télécharger un fichier prod machine.
 */
import { NextResponse } from "next/server";
import { readFileSync } from "fs";
import { join } from "path";
import {
  scanProdFilesByMotif,
  ASSETS_MOTIFS_PXF_DIR,
  ASSETS_MOTIFS_DST_DIR,
  ASSETS_MOTIFS_FT_DIR,
} from "@/lib/atelier-da/referentiels-loader";

const DIR_BY_TYPE: Record<string, string> = {
  pxf: ASSETS_MOTIFS_PXF_DIR,
  dst: ASSETS_MOTIFS_DST_DIR,
  ft: ASSETS_MOTIFS_FT_DIR,
};

const CONTENT_TYPE_BY_TYPE: Record<string, string> = {
  pxf: "application/octet-stream",
  dst: "application/octet-stream",
  ft: "application/pdf",
};

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const url = new URL(request.url);
    const type = url.searchParams.get("type") ?? "";
    const key = url.searchParams.get("key");
    const inline = url.searchParams.get("inline") === "1";

    if (!(type in DIR_BY_TYPE)) {
      return NextResponse.json({ ok: false, error: "type doit être 'pxf', 'dst' ou 'ft'" }, { status: 400 });
    }
    if (!key) {
      return NextResponse.json({ ok: false, error: "key manquante" }, { status: 400 });
    }

    const index = scanProdFilesByMotif();
    const list = index.get(id);
    if (!list) {
      return NextResponse.json({ ok: false, error: `Aucun fichier prod pour ${id}` }, { status: 404 });
    }
    const entry = list.find((f) => f.key === key);
    if (!entry) {
      return NextResponse.json({ ok: false, error: `Key ${key} introuvable pour ${id}` }, { status: 404 });
    }
    const filename = entry[type as "pxf" | "dst" | "ft"];
    if (!filename) {
      return NextResponse.json({ ok: false, error: `Fichier ${type.toUpperCase()} absent pour ${id}-${key}` }, { status: 404 });
    }

    const buffer = readFileSync(join(DIR_BY_TYPE[type], filename));
    const disposition = inline ? "inline" : "attachment";

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": CONTENT_TYPE_BY_TYPE[type],
        "Content-Disposition": `${disposition}; filename="${filename}"`,
        "Content-Length": String(buffer.length),
      },
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
