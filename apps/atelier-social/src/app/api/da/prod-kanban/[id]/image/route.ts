/**
 * Pièce jointe image (PNG ou JPG) d'une card kanban prod.
 *
 *  POST   /api/da/prod-kanban/[id]/image   (FormData { file }) → upload PNG/JPG
 *  GET    /api/da/prod-kanban/[id]/image[?inline=1]           → stream l'image
 *         (par défaut Content-Disposition: attachment → la prod télécharge)
 *  DELETE /api/da/prod-kanban/[id]/image                      → retire l'image
 *
 * Le fichier est stocké sur disque dans assets/kanban/{card_id}.{png|jpg}
 * (source de vérité), les métadonnées sont enregistrées sur la card (card.image).
 */
import { NextResponse } from "next/server";
import { readFileSync, writeFileSync, existsSync, mkdirSync, unlinkSync } from "fs";
import { join } from "path";
import {
  ASSETS_KANBAN_DIR,
  PROD_KANBAN_REF_PATH,
  type ProdKanbanRef,
} from "@/lib/atelier-da/referentiels-loader";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

function readBoard(): ProdKanbanRef {
  return JSON.parse(readFileSync(PROD_KANBAN_REF_PATH, "utf-8")) as ProdKanbanRef;
}
function writeBoard(data: ProdKanbanRef) {
  data._meta.last_updated = new Date().toISOString().slice(0, 10);
  writeFileSync(PROD_KANBAN_REF_PATH, JSON.stringify(data, null, 2) + "\n", "utf-8");
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const data = readBoard();
    const card = data.cards.find((c) => c.id === id);
    if (!card) return NextResponse.json({ ok: false, error: `Card ${id} introuvable` }, { status: 404 });

    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ ok: false, error: "Fichier manquant" }, { status: 400 });
    }
    const name = file.name.toLowerCase();
    const isPng = file.type === "image/png" || name.endsWith(".png");
    const isJpg = file.type === "image/jpeg" || name.endsWith(".jpg") || name.endsWith(".jpeg");
    if (!isPng && !isJpg) {
      return NextResponse.json({ ok: false, error: "Le fichier doit être un PNG ou un JPG" }, { status: 400 });
    }
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { ok: false, error: `Fichier trop volumineux (max ${MAX_FILE_SIZE / 1024 / 1024} MB)` },
        { status: 400 }
      );
    }

    if (!existsSync(ASSETS_KANBAN_DIR)) mkdirSync(ASSETS_KANBAN_DIR, { recursive: true });

    const ext = isPng ? "png" : "jpg";
    // Si une image existait avec une autre extension (png↔jpg), on supprime l'ancien fichier.
    if (card.image && card.image.filename !== `${id}.${ext}`) {
      const oldPath = join(ASSETS_KANBAN_DIR, card.image.filename);
      if (existsSync(oldPath)) {
        try {
          unlinkSync(oldPath);
        } catch {
          /* ignore */
        }
      }
    }

    const filename = `${id}.${ext}`;
    writeFileSync(join(ASSETS_KANBAN_DIR, filename), Buffer.from(await file.arrayBuffer()));

    card.image = {
      filename,
      original_name: file.name,
      size: file.size,
      uploaded_at: new Date().toISOString().slice(0, 10),
    };
    card.updated_at = new Date().toISOString().slice(0, 10);
    writeBoard(data);

    return NextResponse.json({ ok: true, data: card.image });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const inline = new URL(request.url).searchParams.get("inline") === "1";

    const card = readBoard().cards.find((c) => c.id === id);
    if (!card?.image) {
      return NextResponse.json({ ok: false, error: "Aucune image pour cette card" }, { status: 404 });
    }

    const path = join(ASSETS_KANBAN_DIR, card.image.filename);
    if (!existsSync(path)) {
      return NextResponse.json({ ok: false, error: "Fichier introuvable sur disque" }, { status: 404 });
    }
    const buffer = readFileSync(path);
    const disposition = inline ? "inline" : "attachment";
    const isJpg = card.image.filename.toLowerCase().endsWith(".jpg") || card.image.filename.toLowerCase().endsWith(".jpeg");
    const contentType = isJpg ? "image/jpeg" : "image/png";
    // Nom de téléchargement : nom d'origine s'il a une extension image, sinon {card_id}.{ext}
    const origOk = /\.(png|jpe?g)$/i.test(card.image.original_name || "");
    const downloadName = origOk ? card.image.original_name : card.image.filename;

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": contentType,
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
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const data = readBoard();
    const card = data.cards.find((c) => c.id === id);
    if (!card) return NextResponse.json({ ok: false, error: `Card ${id} introuvable` }, { status: 404 });

    if (card.image) {
      const path = join(ASSETS_KANBAN_DIR, card.image.filename);
      if (existsSync(path)) {
        try {
          unlinkSync(path);
        } catch {
          /* fichier déjà absent : on ignore */
        }
      }
      delete card.image;
      card.updated_at = new Date().toISOString().slice(0, 10);
      writeBoard(data);
    }
    return NextResponse.json({ ok: true, data: { id } });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
