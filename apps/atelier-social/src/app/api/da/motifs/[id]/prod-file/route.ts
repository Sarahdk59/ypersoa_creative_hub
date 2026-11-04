/**
 * GET /api/da/motifs/[id]/prod-file?type=pxf|dst|ft&key=<key>
 * Stream un fichier prod (PXF, DST ou fiche technique PDF) depuis le bucket
 * Storage `motifs-prod-files`. Utilisé par le modal motif pour télécharger
 * un fichier prod machine.
 *
 * DELETE /api/da/motifs/[id]/prod-file?key=<key>[&type=pxf|dst|png|ft]
 * Supprime le(s) fichier(s) prod associés à une key. Sans `type`, supprime
 * tous les fichiers (pxf/dst/png/ft) partageant cette key (suppression de la card).
 *
 * PATCH /api/da/motifs/[id]/prod-file
 * body JSON { key, newKey } — renomme tous les fichiers (pxf/dst/png/ft)
 * partageant `key` vers `newKey` (échoue si une collision existe déjà).
 */
import { NextResponse } from "next/server";
import {
  scanProdFilesByMotif,
  downloadMotifProdFile,
  deleteMotifProdFile,
  moveMotifProdFile,
  type ProdFileType,
} from "@/lib/atelier-da/referentiels-loader";

const STREAM_TYPES: ProdFileType[] = ["pxf", "dst", "ft"];
const ALL_TYPES: ProdFileType[] = ["pxf", "dst", "png", "ft"];

const CONTENT_TYPE_BY_TYPE: Record<string, string> = {
  pxf: "application/octet-stream",
  dst: "application/octet-stream",
  ft: "application/pdf",
};

function extOf(filename: string): string {
  return filename.split(".").pop()?.toLowerCase() ?? "";
}

function sanitizeKey(input: string): string {
  return input
    .trim()
    .replace(/[^A-Za-z0-9._-]/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

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

    if (!STREAM_TYPES.includes(type as ProdFileType)) {
      return NextResponse.json({ ok: false, error: "type doit être 'pxf', 'dst' ou 'ft'" }, { status: 400 });
    }
    if (!key) {
      return NextResponse.json({ ok: false, error: "key manquante" }, { status: 400 });
    }

    const index = await scanProdFilesByMotif();
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

    const buffer = await downloadMotifProdFile(type as ProdFileType, filename);
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

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const url = new URL(request.url);
    const key = url.searchParams.get("key");
    const typeParam = url.searchParams.get("type");

    if (!key) {
      return NextResponse.json({ ok: false, error: "key manquante" }, { status: 400 });
    }
    if (typeParam && !ALL_TYPES.includes(typeParam as ProdFileType)) {
      return NextResponse.json({ ok: false, error: `type invalide : ${typeParam}` }, { status: 400 });
    }

    const index = await scanProdFilesByMotif();
    const entry = index.get(id)?.find((f) => f.key === key);
    if (!entry) {
      return NextResponse.json({ ok: false, error: `Key ${key} introuvable pour ${id}` }, { status: 404 });
    }

    const types = (typeParam ? [typeParam] : ALL_TYPES) as ProdFileType[];
    const deleted: string[] = [];
    for (const type of types) {
      const filename = entry[type];
      if (!filename) continue;
      if (await deleteMotifProdFile(type, filename)) deleted.push(filename);
    }

    if (deleted.length === 0) {
      return NextResponse.json({ ok: false, error: `Rien à supprimer pour ${id}-${key}` }, { status: 404 });
    }

    return NextResponse.json({ ok: true, data: { deleted } });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const oldKey = String(body?.key ?? "").trim();
    const newKeyRaw = String(body?.newKey ?? "").trim();

    if (!oldKey) {
      return NextResponse.json({ ok: false, error: "key manquante" }, { status: 400 });
    }
    const newKey = sanitizeKey(newKeyRaw);
    if (!newKey) {
      return NextResponse.json({ ok: false, error: "Nouvelle key invalide après sanitization" }, { status: 400 });
    }
    if (newKey === oldKey) {
      return NextResponse.json({ ok: true, data: { key: newKey, renamed: [] } });
    }

    const index = await scanProdFilesByMotif();
    const entry = index.get(id)?.find((f) => f.key === oldKey);
    if (!entry) {
      return NextResponse.json({ ok: false, error: `Key ${oldKey} introuvable pour ${id}` }, { status: 404 });
    }

    // Vérifie l'absence de collision sur tous les types concernés avant de renommer.
    const existingForNewKey = index.get(id)?.find((f) => f.key === newKey);
    const moves: Array<{ type: ProdFileType; from: string; to: string }> = [];
    for (const type of ALL_TYPES) {
      const filename = entry[type];
      if (!filename) continue;
      if (existingForNewKey?.[type]) {
        return NextResponse.json(
          { ok: false, error: `Un fichier ${type.toUpperCase()} existe déjà pour la key "${newKey}"` },
          { status: 409 }
        );
      }
      moves.push({ type, from: filename, to: `${id}-${newKey}.${extOf(filename)}` });
    }

    if (moves.length === 0) {
      return NextResponse.json({ ok: false, error: `Rien à renommer pour ${id}-${oldKey}` }, { status: 404 });
    }

    for (const { type, from, to } of moves) {
      await moveMotifProdFile(type, from, to);
    }

    return NextResponse.json({ ok: true, data: { key: newKey, renamed: moves.map((m) => m.to) } });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
