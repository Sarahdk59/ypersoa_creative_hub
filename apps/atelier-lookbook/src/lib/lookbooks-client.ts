import { supabase } from "./supabase";
import { Lookbook } from "./types";

export async function toggleLookbookFavorite(id: string, current: boolean): Promise<void> {
  if (!supabase) throw new Error("Supabase non configuré");
  const { error } = await supabase
    .from("lookbooks")
    .update({ is_favorite: !current })
    .eq("id", id);
  if (error) throw new Error(`Toggle favori échoué : ${error.message}`);
}

export async function listRecentLookbooks(limit = 20): Promise<Lookbook[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("lookbooks")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(`Lecture lookbooks échouée : ${error.message}`);
  return (data || []) as Lookbook[];
}
