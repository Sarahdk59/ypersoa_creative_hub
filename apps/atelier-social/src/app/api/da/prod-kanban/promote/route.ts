/**
 * POST /api/da/prod-kanban/promote
 * Promeut une card kanban en règle dans regles_broderie.json.
 * Body : { card_id: string }
 */
import { NextResponse } from "next/server";
import { readFileSync, writeFileSync } from "fs";
import {
  PROD_KANBAN_REF_PATH,
  REGLES_BRODERIE_REF_PATH,
  clearReglesBroderieCache,
  type ProdKanbanRef,
  type ReglesBroderieRef,
} from "@/lib/atelier-da/referentiels-loader";

function slug(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { card_id?: string };
    if (!body.card_id) {
      return NextResponse.json({ ok: false, error: "card_id requis" }, { status: 400 });
    }
    const kanbanRaw = readFileSync(PROD_KANBAN_REF_PATH, "utf-8");
    const kanban = JSON.parse(kanbanRaw) as ProdKanbanRef;
    const card = kanban.cards.find((c) => c.id === body.card_id);
    if (!card) {
      return NextResponse.json({ ok: false, error: `Card ${body.card_id} introuvable` }, { status: 404 });
    }

    const reglesRaw = readFileSync(REGLES_BRODERIE_REF_PATH, "utf-8");
    const regles = JSON.parse(reglesRaw) as ReglesBroderieRef;

    let id = slug(card.title) || `regle_${Date.now().toString(36)}`;
    // Assure l'unicité
    let n = 2;
    while (regles.placements.some((p) => p.id === id)) {
      id = `${slug(card.title) || "regle"}_${n++}`;
    }

    const reglesArr: string[] = [];
    if (card.body) {
      // Coupe le body en lignes non vides → chaque ligne = une règle
      for (const line of card.body.split(/\r?\n/)) {
        const t = line.trim();
        if (t) reglesArr.push(t);
      }
    }
    if (reglesArr.length === 0) reglesArr.push(card.title);

    const noteParts: string[] = [];
    if (card.stakeholders?.length) noteParts.push(`Parties prenantes : ${card.stakeholders.join(", ")}`);
    noteParts.push(`Promu depuis Kanban prod le ${new Date().toISOString().slice(0, 10)} (card ${card.id})`);

    const placement = {
      id,
      label: card.title,
      icone: "ScrollText",
      regles: reglesArr,
      note: noteParts.join(" · "),
    };
    regles.placements.push(placement);
    regles._meta.last_updated = new Date().toISOString().slice(0, 10);
    writeFileSync(REGLES_BRODERIE_REF_PATH, JSON.stringify(regles, null, 2) + "\n", "utf-8");
    clearReglesBroderieCache();

    // Tag la card avec un marqueur "promue" + ajoute un tag
    card.tags = Array.from(new Set([...(card.tags || []), "promu_en_regle"]));
    card.updated_at = new Date().toISOString().slice(0, 10);
    kanban._meta.last_updated = card.updated_at;
    writeFileSync(PROD_KANBAN_REF_PATH, JSON.stringify(kanban, null, 2) + "\n", "utf-8");

    return NextResponse.json({ ok: true, data: { placement, card } });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
