/**
 * GET /api/da/motifs/[id]/preview?key=<key>
 * Stream le preview (PNG ou JPG) depuis le bucket Storage `motifs-prod-files`.
 * Utilisé par les cards "Fichiers prod" pour afficher le rendu de chaque variante.
 */
import { NextResponse } from "next/server";
import {
  scanProdFilesByMotif,
  downloadMotifProdFile,
  mimeTypeForImageFile,
} from "@/lib/atelier-da/referentiels-loader";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const url = new URL(request.url);
    const key = url.searchParams.get("key");
    if (!key) {
      return NextResponse.json({ ok: false, error: "key manquante" }, { status: 400 });
    }

    const list = (await scanProdFilesByMotif()).get(id);
    const entry = list?.find((f) => f.key === key);
    if (!entry?.png) {
      return NextResponse.json({ ok: false, error: `Preview absent pour ${id}-${key}` }, { status: 404 });
    }

    const buffer = await downloadMotifProdFile("png", entry.png);
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": mimeTypeForImageFile(entry.png),
        "Cache-Control": "public, max-age=60",
      },
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
