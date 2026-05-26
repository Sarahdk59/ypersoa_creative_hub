/**
 * Fichier d'un test :
 *  GET    [?inline=1] → stream le fichier (attachment par défaut → la prod télécharge)
 *  DELETE             → retire le fichier (disque + métadonnées)
 */
import { NextResponse } from "next/server";
import { readFileSync, existsSync, unlinkSync } from "fs";
import { join } from "path";
import {
  readZoneTest,
  writeZoneTest,
  ASSETS_ZONE_TEST_DIR,
} from "@/lib/production/zone-test-loader";

function contentTypeFor(filename: string): string {
  const ext = filename.toLowerCase().split(".").pop();
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
  if (ext === "png") return "image/png";
  return "application/octet-stream"; // .dst / .pxf : binaire générique
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; fileId: string }> }
) {
  try {
    const { id, fileId } = await params;
    const inline = new URL(request.url).searchParams.get("inline") === "1";

    const test = readZoneTest().tests.find((t) => t.id === id);
    const file = test?.files.find((f) => f.id === fileId);
    if (!file) return NextResponse.json({ ok: false, error: "Fichier introuvable" }, { status: 404 });

    const path = join(ASSETS_ZONE_TEST_DIR, file.filename);
    if (!existsSync(path)) {
      return NextResponse.json({ ok: false, error: "Fichier absent du disque" }, { status: 404 });
    }
    const buffer = readFileSync(path);
    const disposition = inline ? "inline" : "attachment";
    const downloadName = file.original_name || file.filename;

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": contentTypeFor(file.filename),
        "Content-Disposition": `${disposition}; filename="${downloadName}"`,
        "Content-Length": String(buffer.length),
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; fileId: string }> }
) {
  try {
    const { id, fileId } = await params;
    const data = readZoneTest();
    const test = data.tests.find((t) => t.id === id);
    if (!test) return NextResponse.json({ ok: false, error: `Test ${id} introuvable` }, { status: 404 });

    const file = test.files.find((f) => f.id === fileId);
    if (!file) return NextResponse.json({ ok: false, error: "Fichier introuvable" }, { status: 404 });

    const path = join(ASSETS_ZONE_TEST_DIR, file.filename);
    if (existsSync(path)) {
      try {
        unlinkSync(path);
      } catch {
        /* fichier déjà absent : on ignore */
      }
    }
    test.files = test.files.filter((f) => f.id !== fileId);
    test.updated_at = new Date().toISOString().slice(0, 10);
    writeZoneTest(data);

    return NextResponse.json({ ok: true, data: { deleted: fileId } });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
