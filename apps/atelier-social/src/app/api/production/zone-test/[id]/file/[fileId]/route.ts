/**
 * Fichier d'un test :
 *  GET    [?inline=1] → stream le fichier (attachment par défaut → la prod télécharge)
 *  DELETE             → retire le fichier (stockage Supabase + métadonnées)
 */
import { NextResponse } from "next/server";
import {
  getZoneTest,
  saveZoneTest,
  downloadZoneTestFile,
  removeZoneTestFile,
  contentTypeZoneTest,
} from "@/lib/production/zone-test-loader";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; fileId: string }> }
) {
  try {
    const { id, fileId } = await params;
    const inline = new URL(request.url).searchParams.get("inline") === "1";

    const test = await getZoneTest(id);
    const file = test?.files.find((f) => f.id === fileId);
    if (!test || !file) return NextResponse.json({ ok: false, error: "Fichier introuvable" }, { status: 404 });

    const buffer = await downloadZoneTestFile(test.id, file);
    if (!buffer) {
      return NextResponse.json({ ok: false, error: "Fichier absent du stockage" }, { status: 404 });
    }
    const disposition = inline ? "inline" : "attachment";
    const downloadName = file.original_name || file.filename;

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": contentTypeZoneTest(file.filename),
        "Content-Disposition": `${disposition}; filename="${downloadName.replace(/"/g, "")}"; filename*=UTF-8''${encodeURIComponent(downloadName)}`,
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
    const test = await getZoneTest(id);
    if (!test) return NextResponse.json({ ok: false, error: `Test ${id} introuvable` }, { status: 404 });

    const file = test.files.find((f) => f.id === fileId);
    if (!file) return NextResponse.json({ ok: false, error: "Fichier introuvable" }, { status: 404 });

    await removeZoneTestFile(test.id, file);
    test.files = test.files.filter((f) => f.id !== fileId);
    test.updated_at = new Date().toISOString().slice(0, 10);
    await saveZoneTest(test);

    return NextResponse.json({ ok: true, data: { deleted: fileId } });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
