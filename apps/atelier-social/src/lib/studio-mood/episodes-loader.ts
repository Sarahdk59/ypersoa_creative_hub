import { createClient } from "@/lib/supabase/server";
import type {
  StudioMoodEpisode,
  EpisodeInsert,
  EpisodePatch,
} from "./types";

const TABLE = "studio_mood_episodes";

export async function listEpisodes(
  opts: { statut?: string; motif_ypm_id?: string } = {}
): Promise<StudioMoodEpisode[]> {
  const sb = await createClient();
  let q = sb
    .from(TABLE)
    .select("*")
    .order("created_at", { ascending: false });

  if (opts.statut) q = q.eq("statut", opts.statut);
  if (opts.motif_ypm_id) q = q.eq("motif_ypm_id", opts.motif_ypm_id);

  const { data, error } = await q;
  if (error) throw new Error(`listEpisodes: ${error.message}`);
  return (data ?? []) as StudioMoodEpisode[];
}

export async function getEpisode(id: string): Promise<StudioMoodEpisode | null> {
  const sb = await createClient();
  const { data, error } = await sb
    .from(TABLE)
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`getEpisode: ${error.message}`);
  return data as StudioMoodEpisode | null;
}

export async function createEpisode(
  payload: EpisodeInsert
): Promise<StudioMoodEpisode> {
  const sb = await createClient();
  const { data, error } = await sb
    .from(TABLE)
    .insert(payload)
    .select()
    .single();
  if (error) throw new Error(`createEpisode: ${error.message}`);
  return data as StudioMoodEpisode;
}

export async function patchEpisode(
  id: string,
  patch: EpisodePatch
): Promise<StudioMoodEpisode> {
  const sb = await createClient();
  const { data, error } = await sb
    .from(TABLE)
    .update(patch)
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(`patchEpisode: ${error.message}`);
  return data as StudioMoodEpisode;
}

export async function deleteEpisode(id: string): Promise<void> {
  const sb = await createClient();
  const { error } = await sb.from(TABLE).delete().eq("id", id);
  if (error) throw new Error(`deleteEpisode: ${error.message}`);
}

export async function bulkInsertEpisodes(
  episodes: EpisodeInsert[]
): Promise<StudioMoodEpisode[]> {
  const sb = await createClient();
  const { data, error } = await sb
    .from(TABLE)
    .insert(episodes)
    .select();
  if (error) throw new Error(`bulkInsertEpisodes: ${error.message}`);
  return (data ?? []) as StudioMoodEpisode[];
}
