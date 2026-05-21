/**
 * social-projects — kanban des projets sociaux en cours.
 *
 * Distinct de prod_kanban (qui suit les questions/règles techniques de la prod
 * broderie). Ici on suit un PROJET DE CONTENU de bout en bout :
 *
 *   Concept → Shooting → À filmer cette semaine → Production → Publié
 *
 * Chaque projet est rattaché à un motif (YPM-XXX) + variante optionnelle + une
 * deadline. Lecture Supabase, drag&drop par colonne (statut) avec ordre via
 * `position`.
 */
import { supabase } from "./supabase";

export type SocialProjectStatut =
  | "concept"
  | "shooting"
  | "a_filmer"
  | "production"
  | "publie";

export interface SocialProject {
  id: string;
  created_at: string;
  updated_at: string;
  title: string;
  statut: SocialProjectStatut;
  motif_id: string | null;
  variante_key: string | null;
  destinataires: string[] | null;
  occasions: string[] | null;
  product_ids: string[] | null;
  deadline: string | null; // ISO date
  notes: string | null;
  position: number;
  cover_url: string | null;
}

export const STATUT_LABELS: Record<SocialProjectStatut, string> = {
  concept: "Concept",
  shooting: "Shooting",
  a_filmer: "À filmer cette semaine",
  production: "Production",
  publie: "Publié",
};

export const STATUT_ORDER: SocialProjectStatut[] = [
  "concept",
  "shooting",
  "a_filmer",
  "production",
  "publie",
];

export async function listSocialProjects(): Promise<SocialProject[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("social_projects")
    .select("*")
    .order("statut", { ascending: true })
    .order("position", { ascending: true });
  if (error) throw new Error(`Lecture social_projects échouée : ${error.message}`);
  return (data || []) as SocialProject[];
}

export interface CreateProjectInput {
  title: string;
  statut?: SocialProjectStatut;
  motifId?: string | null;
  varianteKey?: string | null;
  destinataires?: string[] | null;
  occasions?: string[] | null;
  productIds?: string[] | null;
  deadline?: string | null;
  notes?: string | null;
  coverUrl?: string | null;
}

export async function createSocialProject(input: CreateProjectInput): Promise<SocialProject> {
  if (!supabase) throw new Error("Supabase non configuré");
  // Position = max+1 dans la colonne cible
  const targetStatut = input.statut ?? "concept";
  const { data: max } = await supabase
    .from("social_projects")
    .select("position")
    .eq("statut", targetStatut)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextPosition = (max?.position ?? -1) + 1;

  const { data, error } = await supabase
    .from("social_projects")
    .insert({
      title: input.title.trim(),
      statut: targetStatut,
      motif_id: input.motifId ?? null,
      variante_key: input.varianteKey ?? null,
      destinataires: input.destinataires?.length ? input.destinataires : null,
      occasions: input.occasions?.length ? input.occasions : null,
      product_ids: input.productIds?.length ? input.productIds : null,
      deadline: input.deadline ?? null,
      notes: input.notes ?? null,
      cover_url: input.coverUrl ?? null,
      position: nextPosition,
    })
    .select()
    .single();
  if (error) throw new Error(`Create social_project échouée : ${error.message}`);
  return data as SocialProject;
}

export async function updateSocialProject(
  id: string,
  patch: Partial<Omit<SocialProject, "id" | "created_at" | "updated_at">>
): Promise<void> {
  if (!supabase) throw new Error("Supabase non configuré");
  const { error } = await supabase.from("social_projects").update(patch).eq("id", id);
  if (error) throw new Error(`Update social_project échouée : ${error.message}`);
}

export async function moveProjectToStatut(
  id: string,
  newStatut: SocialProjectStatut
): Promise<void> {
  if (!supabase) throw new Error("Supabase non configuré");
  const { data: max } = await supabase
    .from("social_projects")
    .select("position")
    .eq("statut", newStatut)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextPosition = (max?.position ?? -1) + 1;
  const { error } = await supabase
    .from("social_projects")
    .update({ statut: newStatut, position: nextPosition })
    .eq("id", id);
  if (error) throw new Error(`Move social_project échouée : ${error.message}`);
}

export async function deleteSocialProject(id: string): Promise<void> {
  if (!supabase) throw new Error("Supabase non configuré");
  const { error } = await supabase.from("social_projects").delete().eq("id", id);
  if (error) throw new Error(`Delete social_project échouée : ${error.message}`);
}
