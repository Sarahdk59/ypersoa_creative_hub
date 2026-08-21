import { NextRequest, NextResponse } from "next/server";
import { getEpisode, patchEpisode, deleteEpisode } from "@/lib/studio-mood/episodes-loader";
import type { EpisodePatch, StudioMoodEpisode } from "@/lib/studio-mood/types";
import { createClient } from "@/lib/supabase/server";
import { resolveTagId } from "@/lib/mediatheque/store";

export const runtime = "nodejs";

function filenameFromUrl(url: string, fallback: string): string {
  try {
    const name = new URL(url).pathname.split("/").pop();
    return name || fallback;
  } catch {
    return fallback;
  }
}

function slugifyLoose(label: string): string {
  return label
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Auto-tag à la source (règle d'or Bibliothèque) : motif + occasion + décor
 * sont déjà connus sur l'épisode au moment où un asset est sélectionné.
 * `support` n'est pas mappé en gabarit (YP-code) — trop ambigu ("sweat" peut
 * être YP001 comme YP005) pour deviner sans confirmation.
 */
async function resolveEpisodeTagIds(ep: StudioMoodEpisode): Promise<string[]> {
  const ids: string[] = [];
  if (ep.motif_ypm_id) {
    ids.push(await resolveTagId("motif", ep.motif_ypm_id.toLowerCase(), ep.motif_ypm_nom ?? ep.motif_ypm_id));
  }
  if (ep.occasion) {
    ids.push(await resolveTagId("occasion", slugifyLoose(ep.occasion), ep.occasion));
  }
  if (ep.decor) {
    ids.push(await resolveTagId("ambiance", slugifyLoose(ep.decor), ep.decor));
  }
  return ids;
}

/** Les assets sélectionnés sont les seuls visuels Studio Mood archivés. */
async function mirrorEpisodeAssetsToMediaLibrary(ep: StudioMoodEpisode, urls: string[]) {
  const uniqueUrls = [...new Set(urls.filter(Boolean))];
  if (uniqueUrls.length === 0) return;

  const sb = await createClient();
  const { data: existing, error: existingError } = await sb
    .from("mediatheque_media")
    .select("public_url")
    .in("public_url", uniqueUrls);
  if (existingError) throw new Error(`Lecture médiathèque échouée : ${existingError.message}`);

  const existingUrls = new Set((existing ?? []).map((row) => row.public_url as string));
  const rows = uniqueUrls
    .filter((url) => !existingUrls.has(url))
    .map((url, index) => ({
      filename: filenameFromUrl(url, `studio-mood-${ep.id}-${index + 1}.jpg`),
      public_url: url,
      source: "ia_generation",
      statut: "a_valider",
      notes: `Studio Mood — ${ep.titre} (${ep.id})`,
    }));
  if (rows.length === 0) return;

  const { data: inserted, error } = await sb.from("mediatheque_media").insert(rows).select("id");
  if (error) throw new Error(`Ajout médiathèque échoué : ${error.message}`);

  const tagIds = await resolveEpisodeTagIds(ep);
  if (tagIds.length === 0) return;
  const links = (inserted ?? []).flatMap((row) =>
    tagIds.map((tag_id) => ({ media_id: (row as { id: string }).id, tag_id })),
  );
  if (links.length > 0) {
    const { error: linkErr } = await sb.from("mediatheque_media_tags").insert(links);
    if (linkErr) throw new Error(`Association tags médiathèque échouée : ${linkErr.message}`);
  }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const ep = await getEpisode(id);
    if (!ep) return NextResponse.json({ message: "Épisode introuvable" }, { status: 404 });
    return NextResponse.json({ data: ep });
  } catch (e) {
    return NextResponse.json({ message: String(e) }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  let body: EpisodePatch;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Body JSON invalide" }, { status: 400 });
  }
  try {
    const ep = await patchEpisode(id, body);
    await mirrorEpisodeAssetsToMediaLibrary(ep, [
      ep.assets_avatar,
      ep.assets_variante_vetement,
      ...ep.assets_autres,
    ].filter((url): url is string => Boolean(url)));
    return NextResponse.json({ data: ep });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("introuvable") || msg.includes("0 rows")) {
      return NextResponse.json({ message: "Épisode introuvable" }, { status: 404 });
    }
    return NextResponse.json({ message: msg }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    await deleteEpisode(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ message: String(e) }, { status: 500 });
  }
}
