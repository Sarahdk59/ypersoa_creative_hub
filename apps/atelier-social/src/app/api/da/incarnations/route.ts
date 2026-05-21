import { NextRequest, NextResponse } from "next/server";

import type {
  IncarnationFilters,
  IncarnationStatut,
  IncarnationTon,
} from "@/types/incarnations";
import {
  createIncarnation,
  listIncarnations,
  type CreateIncarnationInput,
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

const VALID_SORTS = new Set<NonNullable<IncarnationFilters["sort"]>>([
  "code_asc",
  "nom_asc",
  "statut",
  "updated_desc",
]);

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const filters: IncarnationFilters = {};

  const motif = sp.get("motif_ypm");
  if (motif) filters.motif_ypm = motif;
  const statut = sp.get("statut");
  if (statut && VALID_STATUTS.has(statut as IncarnationStatut)) {
    filters.statut = statut as IncarnationStatut;
  }
  const ton = sp.get("ton");
  if (ton && VALID_TONS.has(ton as IncarnationTon)) {
    filters.ton = ton as IncarnationTon;
  }
  const gabarit = sp.get("gabarit");
  if (gabarit) filters.gabarit = gabarit;
  const collection = sp.get("collection");
  if (collection) filters.collection = collection;
  const q = sp.get("q");
  if (q) filters.q = q;
  const sort = sp.get("sort");
  if (sort && VALID_SORTS.has(sort as NonNullable<IncarnationFilters["sort"]>)) {
    filters.sort = sort as NonNullable<IncarnationFilters["sort"]>;
  }

  const response = await listIncarnations(filters);
  return NextResponse.json(response);
}

export async function POST(req: NextRequest) {
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

  if (typeof input.nom_commercial !== "string" || !input.nom_commercial.trim()) {
    return NextResponse.json({ error: "nom_commercial required" }, { status: 400 });
  }
  if (typeof input.motif_ypm !== "string" || !input.motif_ypm.trim()) {
    return NextResponse.json({ error: "motif_ypm required" }, { status: 400 });
  }
  if (!input.spec_broderie || typeof input.spec_broderie !== "object") {
    return NextResponse.json({ error: "spec_broderie required" }, { status: 400 });
  }
  const spec = input.spec_broderie as Record<string, unknown>;
  if (
    typeof spec.mot_haut !== "string" ||
    typeof spec.mot_bas !== "string" ||
    typeof spec.symbole !== "string" ||
    typeof spec.couleur_fil_defaut !== "string"
  ) {
    return NextResponse.json({ error: "spec_broderie invalid" }, { status: 400 });
  }

  const payload: CreateIncarnationInput = {
    code: typeof input.code === "string" ? input.code : undefined,
    nom_commercial: input.nom_commercial,
    motif_ypm: input.motif_ypm,
    spec_broderie: {
      mot_haut: spec.mot_haut,
      mot_bas: spec.mot_bas,
      symbole: spec.symbole,
      couleur_fil_defaut: spec.couleur_fil_defaut,
    },
    gabarits_cibles: Array.isArray(input.gabarits_cibles)
      ? input.gabarits_cibles.filter((g): g is string => typeof g === "string")
      : [],
    collections_cibles: Array.isArray(input.collections_cibles)
      ? input.collections_cibles.filter((c): c is string => typeof c === "string")
      : [],
    ton:
      typeof input.ton === "string" && VALID_TONS.has(input.ton as IncarnationTon)
        ? (input.ton as IncarnationTon)
        : null,
    statut:
      typeof input.statut === "string" && VALID_STATUTS.has(input.statut as IncarnationStatut)
        ? (input.statut as IncarnationStatut)
        : "concept",
    notes: typeof input.notes === "string" ? input.notes : undefined,
  };

  try {
    const inc = await createIncarnation(payload);
    return NextResponse.json(inc, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur création";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
