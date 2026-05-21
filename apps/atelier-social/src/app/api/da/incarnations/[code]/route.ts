import { NextRequest, NextResponse } from "next/server";

import type { IncarnationStatut, IncarnationTon, SpecBroderie } from "@/types/incarnations";
import {
  deleteIncarnationByCode,
  getIncarnationByCode,
  updateIncarnationByCode,
  type UpdateIncarnationInput,
} from "@/lib/incarnations/store";

const VALID_STATUTS = new Set<IncarnationStatut>([
  "concept",
  "a_digitaliser",
  "a_shooter",
  "a_publier",
  "actif",
  "archive",
]);

const VALID_TONS = new Set<IncarnationTon>(["tendre", "complice", "humour", "affirme"]);

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;
  const inc = await getIncarnationByCode(code);
  if (!inc) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json(inc);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Body required" }, { status: 400 });
  }
  const input = body as Record<string, unknown>;
  const patch: UpdateIncarnationInput = {};

  if (typeof input.nom_commercial === "string") patch.nom_commercial = input.nom_commercial;
  if (typeof input.motif_ypm === "string") patch.motif_ypm = input.motif_ypm;
  if (input.spec_broderie && typeof input.spec_broderie === "object") {
    const s = input.spec_broderie as Record<string, unknown>;
    if (
      typeof s.mot_haut === "string" &&
      typeof s.mot_bas === "string" &&
      typeof s.symbole === "string" &&
      typeof s.couleur_fil_defaut === "string"
    ) {
      patch.spec_broderie = {
        mot_haut: s.mot_haut,
        mot_bas: s.mot_bas,
        symbole: s.symbole,
        couleur_fil_defaut: s.couleur_fil_defaut,
      } satisfies SpecBroderie;
    }
  }
  if (Array.isArray(input.gabarits_cibles)) {
    patch.gabarits_cibles = input.gabarits_cibles.filter(
      (g): g is string => typeof g === "string",
    );
  }
  if (Array.isArray(input.collections_cibles)) {
    patch.collections_cibles = input.collections_cibles.filter(
      (c): c is string => typeof c === "string",
    );
  }
  if (input.ton === null) {
    patch.ton = null;
  } else if (
    typeof input.ton === "string" &&
    VALID_TONS.has(input.ton as IncarnationTon)
  ) {
    patch.ton = input.ton as IncarnationTon;
  }
  if (
    typeof input.statut === "string" &&
    VALID_STATUTS.has(input.statut as IncarnationStatut)
  ) {
    patch.statut = input.statut as IncarnationStatut;
  }
  if (input.notes === null || typeof input.notes === "string") {
    patch.notes = input.notes as string | null;
  }
  if (
    input.description_template === null ||
    typeof input.description_template === "string"
  ) {
    patch.description_template = input.description_template as string | null;
  }

  try {
    const inc = await updateIncarnationByCode(code, patch);
    if (!inc) return NextResponse.json({ error: "not_found" }, { status: 404 });
    return NextResponse.json(inc);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur mise à jour";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;
  const ok = await deleteIncarnationByCode(code);
  if (!ok) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ deleted: true });
}
