/**
 * POST /api/da/exports/metafield-incarnations
 * Body : { motif_ypm: "YPM-003", chips_limit?: number }
 *
 * Génère le JSON metafield Shopify au format de metafield_le_club_exemple.json.
 * Inclut toutes les incarnations actives du motif + chips_configurateur agrégées.
 */
import { NextRequest, NextResponse } from "next/server";

import { listIncarnations } from "@/lib/incarnations/store";
import type { IncarnationEnriched, IncarnationPhoto } from "@/types/incarnations";

interface MetafieldEntry {
  code: string;
  nom: string;
  mot_haut: string;
  mot_bas: string;
  symbole: string;
  couleur_fil: string;
  photo_hero: string | null;
  photo_thumb: string | null;
  collections_cibles: string[];
  ton: string | null;
}

interface MetafieldOutput {
  _comment: string;
  _generated_at: string;
  motif_ypm: string;
  incarnations: MetafieldEntry[];
  chips_configurateur: string[];
}

const HERO_GABARIT_PRIORITY = ["YP019", "YP001", "YP005", "YP021", "YP004", "YP020"];

function pickHeroPhoto(photos: IncarnationPhoto[]): IncarnationPhoto | null {
  // Photo marquée hero, en priorisant les gabarits par ordre HERO_GABARIT_PRIORITY
  for (const g of HERO_GABARIT_PRIORITY) {
    const p = photos.find((x) => x.gabarit === g && x.is_hero);
    if (p) return p;
  }
  // Sinon n'importe quelle photo hero
  const anyHero = photos.find((p) => p.is_hero);
  if (anyHero) return anyHero;
  // Sinon la première photo en respectant la priorité gabarit
  for (const g of HERO_GABARIT_PRIORITY) {
    const p = photos.find((x) => x.gabarit === g);
    if (p) return p;
  }
  return photos[0] ?? null;
}

function buildEntry(inc: IncarnationEnriched): MetafieldEntry {
  const hero = pickHeroPhoto(inc.photos);
  return {
    code: inc.code,
    nom: inc.nom_commercial,
    mot_haut: inc.spec_broderie.mot_haut,
    mot_bas: inc.spec_broderie.mot_bas,
    symbole: inc.spec_broderie.symbole,
    couleur_fil: inc.spec_broderie.couleur_fil_defaut,
    photo_hero: hero?.public_url ?? null,
    photo_thumb: hero?.public_url ?? null,
    collections_cibles: inc.collections_cibles,
    ton: inc.ton,
  };
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
  const motifYpm = typeof input.motif_ypm === "string" ? input.motif_ypm : null;
  if (!motifYpm) {
    return NextResponse.json({ error: "motif_ypm required" }, { status: 400 });
  }
  const chipsLimit =
    typeof input.chips_limit === "number" && input.chips_limit > 0
      ? Math.min(input.chips_limit, 20)
      : 6;
  const includeStatuts = Array.isArray(input.statuts)
    ? (input.statuts as unknown[]).filter((s): s is string => typeof s === "string")
    : ["actif"];

  const list = (await listIncarnations({ motif_ypm: motifYpm })).data;
  const filtered = list.filter((i) => includeStatuts.includes(i.statut));

  const entries = filtered.map(buildEntry);

  // chips_configurateur : mot_haut unique, ordonnés par ordre d'apparition dans list
  const seen = new Set<string>();
  const chips: string[] = [];
  for (const e of entries) {
    const key = e.mot_haut.toUpperCase();
    if (!seen.has(key)) {
      seen.add(key);
      chips.push(e.mot_haut);
      if (chips.length >= chipsLimit) break;
    }
  }

  const output: MetafieldOutput = {
    _comment: `Metafield à attacher au produit Shopify du motif ${motifYpm}. Namespace: custom · Key: incarnations · Type: json`,
    _generated_at: new Date().toISOString(),
    motif_ypm: motifYpm,
    incarnations: entries,
    chips_configurateur: chips,
  };

  return NextResponse.json(output);
}
