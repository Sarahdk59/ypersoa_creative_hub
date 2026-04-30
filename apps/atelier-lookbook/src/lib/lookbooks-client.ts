import { supabase } from "./supabase";
import { Lookbook, LookbookImage } from "./types";

export async function toggleLookbookFavorite(id: string, current: boolean): Promise<void> {
  if (!supabase) throw new Error("Supabase non configuré");
  const { error } = await supabase
    .from("lookbooks")
    .update({ is_favorite: !current })
    .eq("id", id);
  if (error) throw new Error(`Toggle favori échoué : ${error.message}`);
}

export const AMBIANCE_ACTIVE_DAYS = 7;

export interface AmbianceActivationState {
  isActive: boolean;
  dateArchivage: string | null;
}

/**
 * Active (ou désactive) un lookbook comme "ambiance de référence" pendant
 * AMBIANCE_ACTIVE_DAYS jours. Côté shooting/social on filtre sur
 * `is_favorite=true AND date_archivage > now()`.
 */
export async function setLookbookActiveAmbiance(
  id: string,
  active: boolean
): Promise<AmbianceActivationState> {
  if (!supabase) throw new Error("Supabase non configuré");

  if (active) {
    const now = new Date();
    const archivage = new Date(now.getTime() + AMBIANCE_ACTIVE_DAYS * 24 * 60 * 60 * 1000);
    const { error } = await supabase
      .from("lookbooks")
      .update({
        is_favorite: true,
        statut: "active",
        date_activation: now.toISOString(),
        date_archivage: archivage.toISOString(),
      })
      .eq("id", id);
    if (error) throw new Error(`Activation ambiance échouée : ${error.message}`);
    return { isActive: true, dateArchivage: archivage.toISOString() };
  }

  const { error } = await supabase
    .from("lookbooks")
    .update({
      is_favorite: false,
      statut: "archive",
      date_archivage: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) throw new Error(`Désactivation ambiance échouée : ${error.message}`);
  return { isActive: false, dateArchivage: null };
}

export function isAmbianceActive(lb: { is_favorite: boolean; date_archivage: string | null }): boolean {
  if (!lb.is_favorite) return false;
  if (!lb.date_archivage) return true;
  return new Date(lb.date_archivage).getTime() > Date.now();
}

/**
 * Prolonge la fenêtre d'activation d'un lookbook ambiance de
 * AMBIANCE_ACTIVE_DAYS jours supplémentaires (à partir du max(now, currentEnd)).
 * Idempotent — ré-active si statut/is_favorite ont divergé.
 */
export async function extendLookbookAmbiance(id: string): Promise<AmbianceActivationState> {
  if (!supabase) throw new Error("Supabase non configuré");

  const { data: lb, error: getErr } = await supabase
    .from("lookbooks")
    .select("date_archivage")
    .eq("id", id)
    .single();
  if (getErr) throw new Error(`Lecture date_archivage échouée : ${getErr.message}`);

  const currentEnd = lb?.date_archivage ? new Date(lb.date_archivage).getTime() : Date.now();
  const baseline = Math.max(currentEnd, Date.now());
  const newEnd = new Date(baseline + AMBIANCE_ACTIVE_DAYS * 24 * 60 * 60 * 1000);

  const { error } = await supabase
    .from("lookbooks")
    .update({
      is_favorite: true,
      statut: "active",
      date_archivage: newEnd.toISOString(),
    })
    .eq("id", id);
  if (error) throw new Error(`Prolongation échouée : ${error.message}`);
  return { isActive: true, dateArchivage: newEnd.toISOString() };
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

export interface LookbookFull {
  lookbook: Lookbook;
  images: LookbookImage[];
}

export async function getLookbookFull(id: string): Promise<LookbookFull> {
  if (!supabase) throw new Error("Supabase non configuré");
  const [{ data: lb, error: lbErr }, { data: imgs, error: imgsErr }] = await Promise.all([
    supabase.from("lookbooks").select("*").eq("id", id).single(),
    supabase
      .from("lookbook_images")
      .select("*")
      .eq("lookbook_id", id)
      .order("position", { ascending: true }),
  ]);
  if (lbErr) throw new Error(`Lecture lookbook échouée : ${lbErr.message}`);
  if (imgsErr) throw new Error(`Lecture images échouée : ${imgsErr.message}`);
  return { lookbook: lb as Lookbook, images: (imgs || []) as LookbookImage[] };
}
