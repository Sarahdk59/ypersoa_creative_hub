/**
 * GET  /api/da/regles-broderie  → liste des placements + règles
 * PATCH /api/da/regles-broderie  → met à jour un placement
 *   body: { placement_id: string, regles?: string[], note?: string,
 *           dimension_max_cm?: number|null, dimension_par_defaut_cm?: number|null,
 *           dimension_xxl_cm?: number|null }
 */
import { NextResponse } from "next/server";
import { readFileSync, writeFileSync } from "fs";
import {
  getReglesBroderie,
  clearReglesBroderieCache,
  REGLES_BRODERIE_REF_PATH,
  type ReglesBroderieRef,
} from "@/lib/atelier-da/referentiels-loader";

export async function GET() {
  try {
    return NextResponse.json({ ok: true, data: getReglesBroderie() });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const id = String(body.id || "").trim().toLowerCase().replace(/[^a-z0-9_]/g, "_");
    const label = String(body.label || "").trim();
    if (!id || !label) {
      return NextResponse.json({ ok: false, error: "id et label requis" }, { status: 400 });
    }
    const raw = readFileSync(REGLES_BRODERIE_REF_PATH, "utf-8");
    const data = JSON.parse(raw) as ReglesBroderieRef;
    if (data.placements.some((p) => p.id === id)) {
      return NextResponse.json({ ok: false, error: `id ${id} déjà existant` }, { status: 400 });
    }
    const newPlacement = {
      id,
      label,
      icone: typeof body.icone === "string" ? body.icone : "Settings",
      regles: Array.isArray(body.regles) ? (body.regles as string[]).map((r) => r.trim()).filter(Boolean) : [],
      note: typeof body.note === "string" ? body.note.trim() : "",
    } as Record<string, unknown>;
    if (typeof body.dimension_axe === "string") newPlacement.dimension_axe = body.dimension_axe;
    for (const k of ["dimension_max_cm", "dimension_par_defaut_cm", "dimension_xxl_cm"]) {
      if (typeof body[k] === "number" && (body[k] as number) > 0) newPlacement[k] = body[k];
    }
    data.placements.push(newPlacement as ReglesBroderieRef["placements"][number]);
    data._meta.last_updated = new Date().toISOString().slice(0, 10);
    writeFileSync(REGLES_BRODERIE_REF_PATH, JSON.stringify(data, null, 2) + "\n", "utf-8");
    clearReglesBroderieCache();
    return NextResponse.json({ ok: true, data: newPlacement });
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
    if (!id) return NextResponse.json({ ok: false, error: "id manquant (?id=...)" }, { status: 400 });
    const raw = readFileSync(REGLES_BRODERIE_REF_PATH, "utf-8");
    const data = JSON.parse(raw) as ReglesBroderieRef;
    const before = data.placements.length;
    data.placements = data.placements.filter((p) => p.id !== id);
    if (data.placements.length === before) {
      return NextResponse.json({ ok: false, error: `Placement ${id} introuvable` }, { status: 404 });
    }
    data._meta.last_updated = new Date().toISOString().slice(0, 10);
    writeFileSync(REGLES_BRODERIE_REF_PATH, JSON.stringify(data, null, 2) + "\n", "utf-8");
    clearReglesBroderieCache();
    return NextResponse.json({ ok: true, data: { deleted: id } });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const pid = String(body.placement_id || "").trim();
    if (!pid) {
      return NextResponse.json({ ok: false, error: "placement_id manquant" }, { status: 400 });
    }
    const raw = readFileSync(REGLES_BRODERIE_REF_PATH, "utf-8");
    const data = JSON.parse(raw) as ReglesBroderieRef;
    const p = data.placements.find((x) => x.id === pid);
    if (!p) {
      return NextResponse.json({ ok: false, error: `Placement ${pid} introuvable` }, { status: 404 });
    }

    if ("regles" in body) {
      if (!Array.isArray(body.regles) || !body.regles.every((r) => typeof r === "string")) {
        return NextResponse.json({ ok: false, error: "regles doit être un tableau de strings" }, { status: 400 });
      }
      p.regles = (body.regles as string[]).map((r) => r.trim()).filter(Boolean);
    }
    if ("note" in body) {
      const v = body.note;
      if (v === null || v === "") p.note = "";
      else if (typeof v === "string") p.note = v.trim();
    }
    for (const k of ["dimension_max_cm", "dimension_par_defaut_cm", "dimension_xxl_cm"] as const) {
      if (k in body) {
        const v = body[k];
        if (v === null || v === undefined || v === "") delete p[k];
        else if (typeof v === "number" && v > 0 && v < 1000) p[k] = v;
        else return NextResponse.json({ ok: false, error: `${k} doit être > 0` }, { status: 400 });
      }
    }

    data._meta.last_updated = new Date().toISOString().slice(0, 10);
    writeFileSync(REGLES_BRODERIE_REF_PATH, JSON.stringify(data, null, 2) + "\n", "utf-8");
    clearReglesBroderieCache();

    return NextResponse.json({ ok: true, data: p });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
