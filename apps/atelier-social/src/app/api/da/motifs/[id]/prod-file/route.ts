/**
 * GET /api/da/motifs/[id]/prod-file?type=pxf|dst|ft&key=<key>
 * Stream un fichier prod (PXF, DST ou fiche technique PDF) depuis le bon dossier.
 * Utilisé par le modal motif pour télécharger un fichier prod machine.
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
import { readFileSync, existsSync, unlinkSync, renameSync } from "fs";
import { join } from "path";
import {
  scanProdFilesByMotif,
  clearMotifsCache,
  ASSETS_MOTIFS_PXF_DIR,
  ASSETS_MOTIFS_DST_DIR,
  ASSETS_MOTIFS_PNG_DIR,
  ASSETS_MOTIFS_FT_DIR,
} from "@/lib/atelier-da/referentiels-loader";

const DIR_BY_TYPE: Record<string, string> = {
  pxf: ASSETS_MOTIFS_PXF_DIR,
  dst: ASSETS_MOTIFS_DST_DIR,
  ft: ASSETS_MOTIFS_FT_DIR,
};

const ALL_DIR_BY_TYPE: Record<"pxf" | "dst" | "png" | "ft", string> = {
  pxf: ASSETS_MOTIFS_PXF_DIR,
  dst: ASSETS_MOTIFS_DST_DIR,
  png: ASSETS_MOTIFS_PNG_DIR,
  ft: ASSETS_MOTIFS_FT_DIR,
};

const CONTENT_TYPE_BY_TYPE: Record<string, string> = {
  pxf: "application/octet-stream",
  dst: "application/octet-stream",
  ft: "application/pdf",
};

const EXT_BY_TYPE: Record<"pxf" | "dst" | "png" | "ft", string> = {
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
    if (typeParam && !(typeParam in ALL_DIR_BY_TYPE)) {
      return NextResponse.json({ ok: false, error: `type invalide : ${typeParam}` }, { status: 400 });
    }

    const index = scanProdFilesByMotif();
    const entry = index.get(id)?.find((f) => f.key === key);
    if (!entry) {
      return NextResponse.json({ ok: false, error: `Key ${key} introuvable pour ${id}` }, { status: 404 });
    }

    const types = (typeParam ? [typeParam] : Object.keys(ALL_DIR_BY_TYPE)) as Array<"pxf" | "dst" | "png" | "ft">;
    const deleted: string[] = [];
    for (const type of types) {
      const filename = entry[type];
      if (!filename) continue;
      const target = join(ALL_DIR_BY_TYPE[type], filename);
      if (existsSync(target)) {
        unlinkSync(target);
        deleted.push(filename);
      }
    }

    if (deleted.length === 0) {
      return NextResponse.json({ ok: false, error: `Rien à supprimer pour ${id}-${key}` }, { status: 404 });
    }

    clearMotifsCache();
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

    const index = scanProdFilesByMotif();
    const entry = index.get(id)?.find((f) => f.key === oldKey);
    if (!entry) {
      return NextResponse.json({ ok: false, error: `Key ${oldKey} introuvable pour ${id}` }, { status: 404 });
    }

    const types = Object.keys(ALL_DIR_BY_TYPE) as Array<"pxf" | "dst" | "png" | "ft">;
    const moves: Array<{ from: string; to: string }> = [];
    for (const type of types) {
      const filename = entry[type];
      if (!filename) continue;
      const dir = ALL_DIR_BY_TYPE[type];
      const to = join(dir, `${id}-${newKey}.${EXT_BY_TYPE[type]}`);
      if (existsSync(to)) {
        return NextResponse.json(
          { ok: false, error: `Un fichier ${type.toUpperCase()} existe déjà pour la key "${newKey}"` },
          { status: 409 }
        );
      }
      moves.push({ from: join(dir, filename), to });
    }

    if (moves.length === 0) {
      return NextResponse.json({ ok: false, error: `Rien à renommer pour ${id}-${oldKey}` }, { status: 404 });
    }

    for (const { from, to } of moves) {
      renameSync(from, to);
    }

    clearMotifsCache();
    return NextResponse.json({ ok: true, data: { key: newKey, renamed: moves.map((m) => m.to) } });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
