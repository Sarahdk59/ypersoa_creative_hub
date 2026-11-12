/**
 * Zone de test broderie :
 *  GET                       → liste de tous les tests
 *  POST   { titre, ... }     → crée un test (phase "reception" par défaut)
 *  PATCH  { id, ... }        → édite (titre, description, assignee, phase, motif_ypm, notes)
 *  DELETE ?id=               → supprime un test + ses fichiers
 *
 * Stockage Supabase (table zone_tests + bucket zone-test) — survit aux déploiements.
 */
import { NextResponse } from "next/server";
import {
  readZoneTest,
  getZoneTest,
  saveZoneTest,
  deleteZoneTest,
  makeTestId,
  isZoneTestPhase,
  ZONE_TEST_ASSIGNEES,
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
    return NextResponse.json({ ok: true, data: await readZoneTest() });
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
    await saveZoneTest(test);
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

    const test = await getZoneTest(body.id);
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
    await saveZoneTest(test);
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

    const test = await getZoneTest(id);
    if (!test) return NextResponse.json({ ok: false, error: `Test ${id} introuvable` }, { status: 404 });
    await deleteZoneTest(test);
    return NextResponse.json({ ok: true, data: { deleted: id } });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
