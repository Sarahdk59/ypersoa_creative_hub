/**
 * Kanban prod : GET liste, POST nouvelle card, PATCH édition/move, DELETE archivage.
 */
import { NextResponse } from "next/server";
import { readFileSync, writeFileSync } from "fs";
import {
  getProdKanban,
  PROD_KANBAN_REF_PATH,
  type ProdKanbanRef,
  type KanbanCard,
  type KanbanStakeholder,
  KANBAN_STAKEHOLDERS,
} from "@/lib/atelier-da/referentiels-loader";

function readBoard(): ProdKanbanRef {
  const raw = readFileSync(PROD_KANBAN_REF_PATH, "utf-8");
  return JSON.parse(raw) as ProdKanbanRef;
}
function writeBoard(data: ProdKanbanRef) {
  data._meta.last_updated = new Date().toISOString().slice(0, 10);
  writeFileSync(PROD_KANBAN_REF_PATH, JSON.stringify(data, null, 2) + "\n", "utf-8");
}
function makeCardId() {
  return `card_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

export async function GET() {
  try {
    return NextResponse.json({ ok: true, data: getProdKanban() });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Partial<KanbanCard>;
    if (!body.title || typeof body.title !== "string" || !body.title.trim()) {
      return NextResponse.json({ ok: false, error: "title requis" }, { status: 400 });
    }
    const data = readBoard();
    const columnId = body.column_id && data.columns.some((c) => c.id === body.column_id) ? body.column_id : "backlog";
    const now = new Date().toISOString().slice(0, 10);
    const stakeholders = Array.isArray(body.stakeholders)
      ? (body.stakeholders as unknown[]).filter((s): s is KanbanStakeholder => typeof s === "string" && (KANBAN_STAKEHOLDERS as string[]).includes(s))
      : undefined;
    const card: KanbanCard = {
      id: makeCardId(),
      column_id: columnId,
      title: body.title.trim(),
      body: typeof body.body === "string" ? body.body.trim() : undefined,
      type: (body.type as KanbanCard["type"]) || "question",
      tags: Array.isArray(body.tags) ? body.tags.filter((t) => typeof t === "string") : undefined,
      auteur: (body.auteur as KanbanCard["auteur"]) || undefined,
      stakeholders: stakeholders && stakeholders.length ? stakeholders : undefined,
      done_at: columnId === "fait" ? now : undefined,
      created_at: now,
      updated_at: now,
    };
    data.cards.unshift(card);
    writeBoard(data);
    return NextResponse.json({ ok: true, data: card });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const body = (await request.json()) as Partial<KanbanCard> & { id: string };
    if (!body.id) return NextResponse.json({ ok: false, error: "id manquant" }, { status: 400 });

    const data = readBoard();
    const card = data.cards.find((c) => c.id === body.id);
    if (!card) return NextResponse.json({ ok: false, error: `Card ${body.id} introuvable` }, { status: 404 });

    if (body.column_id && data.columns.some((c) => c.id === body.column_id)) {
      const wasFait = card.column_id === "fait";
      const isFait = body.column_id === "fait";
      card.column_id = body.column_id;
      if (isFait && !wasFait) card.done_at = new Date().toISOString().slice(0, 10);
      if (!isFait && wasFait) delete card.done_at;
    }
    if (typeof body.title === "string" && body.title.trim()) card.title = body.title.trim();
    if ("body" in body) card.body = typeof body.body === "string" ? body.body.trim() || undefined : undefined;
    if (body.type) card.type = body.type;
    if (Array.isArray(body.tags)) card.tags = body.tags.filter((t) => typeof t === "string");
    if (body.auteur) card.auteur = body.auteur;
    if (Array.isArray(body.stakeholders)) {
      const s = body.stakeholders.filter((x): x is KanbanStakeholder => typeof x === "string" && (KANBAN_STAKEHOLDERS as string[]).includes(x as string));
      card.stakeholders = s.length ? s : undefined;
    }
    card.updated_at = new Date().toISOString().slice(0, 10);

    writeBoard(data);
    return NextResponse.json({ ok: true, data: card });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get("id");
    if (!id) return NextResponse.json({ ok: false, error: "id manquant (query ?id=)" }, { status: 400 });

    const data = readBoard();
    const before = data.cards.length;
    data.cards = data.cards.filter((c) => c.id !== id);
    if (data.cards.length === before) {
      return NextResponse.json({ ok: false, error: `Card ${id} introuvable` }, { status: 404 });
    }
    writeBoard(data);
    return NextResponse.json({ ok: true, data: { deleted: id } });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
