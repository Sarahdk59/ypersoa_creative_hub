/**
 * GET /api/da/motifs/[id]/prod-file?type=pxf|dst&key=<key>
 * Stream un fichier PXF ou DST depuis assets/motifs pxf/ ou assets/motifs dst/.
 * Utilisé par le modal motif pour télécharger un fichier prod (machine de broderie).
 */
import { NextResponse } from "next/server";
import { readFileSync } from "fs";
import { join } from "path";
import {
  scanProdFilesByMotif,
  ASSETS_MOTIFS_PXF_DIR,
  ASSETS_MOTIFS_DST_DIR,
} from "@/lib/atelier-da/referentiels-loader";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const url = new URL(request.url);
    const type = url.searchParams.get("type");
    const key = url.searchParams.get("key");

    if (type !== "pxf" && type !== "dst") {
      return NextResponse.json({ ok: false, error: "type doit être 'pxf' ou 'dst'" }, { status: 400 });
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
    const filename = type === "pxf" ? entry.pxf : entry.dst;
    if (!filename) {
      return NextResponse.json({ ok: false, error: `Fichier ${type.toUpperCase()} absent pour ${id}-${key}` }, { status: 404 });
    }

    const dir = type === "pxf" ? ASSETS_MOTIFS_PXF_DIR : ASSETS_MOTIFS_DST_DIR;
    const buffer = readFileSync(join(dir, filename));

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename="${filename}"`,
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
