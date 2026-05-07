/**
 * GET /api/da/motifs/[id]/preview?key=<key>
 * Stream le PNG preview depuis assets/motifs png/.
 * Utilisé par les cards "Fichiers prod" pour afficher le rendu de chaque variante.
 */
import { NextResponse } from "next/server";
import { readFileSync } from "fs";
import { join } from "path";
import {
  scanProdFilesByMotif,
  ASSETS_MOTIFS_PNG_DIR,
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

    const list = scanProdFilesByMotif().get(id);
    const entry = list?.find((f) => f.key === key);
    if (!entry?.png) {
      return NextResponse.json({ ok: false, error: `PNG preview absent pour ${id}-${key}` }, { status: 404 });
    }

    const buffer = readFileSync(join(ASSETS_MOTIFS_PNG_DIR, entry.png));
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "image/png",
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
