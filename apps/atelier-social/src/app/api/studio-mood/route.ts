import { NextRequest, NextResponse } from "next/server";
import { listEpisodes, createEpisode, bulkInsertEpisodes } from "@/lib/studio-mood/episodes-loader";
import type { EpisodeInsert } from "@/lib/studio-mood/types";
import path from "path";
import fs from "fs";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const statut = searchParams.get("statut") ?? undefined;
  const motif_ypm_id = searchParams.get("motif_ypm_id") ?? undefined;

  try {
    const episodes = await listEpisodes({ statut, motif_ypm_id });
    return NextResponse.json({ data: episodes, count: episodes.length });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ message: msg }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action");

  // Action seed : injecte les 12 épisodes du référentiel
  if (action === "seed") {
    try {
      const seedPath = path.resolve(
        process.cwd(),
        "../../referentiels/studio-mood/seed_episodes.json"
      );
      const raw = fs.readFileSync(seedPath, "utf-8");
      const seed = JSON.parse(raw);
      const episodes: EpisodeInsert[] = seed.episodes.map(
        (e: Record<string, unknown>) => ({
          titre: e.titre,
          humeur: e.humeur,
          mot_brode: e.mot_brode,
          motif_ypm_id: e.motif_ypm_id ?? null,
          motif_ypm_nom: e.motif_ypm_nom ?? null,
          support: e.support ?? "sweat",
          couleur_produit: e.couleur_produit ?? null,
          decor: e.decor ?? null,
          occasion: e.occasion ?? null,
          ampli_saisonnier: e.ampli_saisonnier ?? null,
          hook: e.hook ?? null,
          legende_question: e.legende_question ?? null,
          hashtags: Array.isArray(e.hashtags) ? e.hashtags : [],
          statut: (e.statut as EpisodeInsert["statut"]) ?? "brouillon",
          assets_avatar: (e.assets_avatar as string) ?? null,
          assets_variante_vetement: (e.assets_variante_vetement as string) ?? null,
          assets_autres: Array.isArray(e.assets_autres) ? e.assets_autres as string[] : [],
        })
      );
      const created = await bulkInsertEpisodes(episodes);
      return NextResponse.json({ data: created, count: created.length }, { status: 201 });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return NextResponse.json({ message: `Seed échoué : ${msg}` }, { status: 500 });
    }
  }

  // Création d'un épisode
  let body: EpisodeInsert;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Body JSON invalide" }, { status: 400 });
  }
  if (!body.titre || !body.humeur || !body.mot_brode) {
    return NextResponse.json(
      { message: "Champs obligatoires manquants : titre, humeur, mot_brode" },
      { status: 400 }
    );
  }

  try {
    const ep = await createEpisode(body);
    return NextResponse.json({ data: ep }, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ message: msg }, { status: 500 });
  }
}
