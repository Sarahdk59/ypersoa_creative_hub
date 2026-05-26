/**
 * Zone de test broderie :
 *  GET                       → liste de tous les tests
 *  POST   { titre, ... }     → crée un test (phase "reception" par défaut)
 *  PATCH  { id, ... }        → édite (titre, description, assignee, phase, motif_ypm, notes)
 *  DELETE ?id=               → supprime un test + ses fichiers sur disque
 */
import { NextResponse } from "next/server";
import { existsSync, unlinkSync } from "fs";
import { join } from "path";
import {
  readZoneTest,
  writeZoneTest,
  makeTestId,
  isZoneTestPhase,
  ZONE_TEST_ASSIGNEES,
  ASSETS_ZONE_TEST_DIR,
  type ZoneTest,
  type ZoneTestAssignee,
} from "@/lib/production/zone-test-loader";

function today() {
  return new Date().toISOString().slice(0, 10);
}
function asAssignee(v: unknown): ZoneTestAssignee | undefined {
  return typeof v === "string" && (ZONE_TEST_ASSIGNEES as string[]).includes(v)
    ? (v as ZoneTestAssignee)
    : undefined;
}

export async function GET() {
  try {
    return NextResponse.json({ ok: true, data: readZoneTest() });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Partial<ZoneTest>;
    if (!body.titre || typeof body.titre !== "string" || !body.titre.trim()) {
      return NextResponse.json({ ok: false, error: "titre requis" }, { status: 400 });
    }
    const data = readZoneTest();
    const now = today();
    const phase = isZoneTestPhase(body.phase) ? body.phase : "reception";
    const test: ZoneTest = {
      id: makeTestId(),
      titre: body.titre.trim(),
      description: typeof body.description === "string" ? body.description.trim() || undefined : undefined,
      assignee: asAssignee(body.assignee),
      phase,
      modif_faite_le: phase === "modif_faite" ? today() : undefined,
      motif_ypm: typeof body.motif_ypm === "string" ? body.motif_ypm.trim().toUpperCase() || undefined : undefined,
      files: [],
      notes: typeof body.notes === "string" ? body.notes.trim() || undefined : undefined,
      created_at: now,
      updated_at: now,
    };
    data.tests.unshift(test);
    writeZoneTest(data);
    return NextResponse.json({ ok: true, data: test });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const body = (await request.json()) as Partial<ZoneTest> & { id?: string };
    if (!body.id) return NextResponse.json({ ok: false, error: "id manquant" }, { status: 400 });

    const data = readZoneTest();
    const test = data.tests.find((t) => t.id === body.id);
    if (!test) return NextResponse.json({ ok: false, error: `Test ${body.id} introuvable` }, { status: 404 });

    if (typeof body.titre === "string" && body.titre.trim()) test.titre = body.titre.trim();
    if ("description" in body)
      test.description = typeof body.description === "string" ? body.description.trim() || undefined : undefined;
    if ("notes" in body)
      test.notes = typeof body.notes === "string" ? body.notes.trim() || undefined : undefined;
    if ("assignee" in body) test.assignee = asAssignee(body.assignee);
    if ("motif_ypm" in body)
      test.motif_ypm = typeof body.motif_ypm === "string" ? body.motif_ypm.trim().toUpperCase() || undefined : undefined;

    if (body.phase !== undefined && isZoneTestPhase(body.phase)) {
      const wasModifFaite = test.phase === "modif_faite";
      test.phase = body.phase;
      if (body.phase === "modif_faite") {
        // entre en "modif faite" → fige la date (override possible via body.modif_faite_le)
        test.modif_faite_le =
          typeof body.modif_faite_le === "string" && body.modif_faite_le
            ? body.modif_faite_le
            : test.modif_faite_le || today();
      } else if (wasModifFaite && body.phase !== "valide") {
        // on revient en arrière (réception/machine/modif à prévoir) → la date n'a plus de sens
        delete test.modif_faite_le;
      }
    } else if (typeof body.modif_faite_le === "string" && test.phase === "modif_faite") {
      // correction de la date seule, sans changer de phase
      test.modif_faite_le = body.modif_faite_le;
    }

    test.updated_at = today();
    writeZoneTest(data);
    return NextResponse.json({ ok: true, data: test });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const id = new URL(request.url).searchParams.get("id");
    if (!id) return NextResponse.json({ ok: false, error: "id manquant (query ?id=)" }, { status: 400 });

    const data = readZoneTest();
    const test = data.tests.find((t) => t.id === id);
    if (!test) return NextResponse.json({ ok: false, error: `Test ${id} introuvable` }, { status: 404 });

    // supprime les fichiers sur disque
    for (const f of test.files) {
      const p = join(ASSETS_ZONE_TEST_DIR, f.filename);
      if (existsSync(p)) {
        try {
          unlinkSync(p);
        } catch {
          /* ignore */
        }
      }
    }
    data.tests = data.tests.filter((t) => t.id !== id);
    writeZoneTest(data);
    return NextResponse.json({ ok: true, data: { deleted: id } });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
