/**
 * catalog-shots (côté atelier-social) — lecture des shots rangés depuis
 * l'atelier-shooting. Cf. apps/atelier-shooting/lib/catalog-shots.ts pour le
 * pendant upload.
 *
 * Utilisé par la galerie de la modal variante (/atelier-da/motifs) pour afficher
 * tous les shots taggés sur une variante, regroupés par produit.
 */
import { supabase } from "./supabase";

export interface CatalogShot {
  id: string;
  created_at: string;
  image_url: string;
  image_storage_path: string | null;
  shot_label: string | null;
  product_id: string | null;
  motif_id: string | null;
  variante_key: string | null;
  destinataire: string[] | null;
  occasion: string[] | null;
  tags: string[] | null;
  pack_settings: unknown;
}

export async function listCatalogShots(filter: {
  motifId?: string;
  varianteKey?: string;
  destinataire?: string;
  occasion?: string;
  tag?: string;
  productId?: string;
  limit?: number;
}): Promise<CatalogShot[]> {
  if (!supabase) return [];
  let q = supabase.from("catalog_shots").select("*").order("created_at", { ascending: false });
  if (filter.motifId) q = q.eq("motif_id", filter.motifId);
  if (filter.varianteKey) q = q.eq("variante_key", filter.varianteKey);
  if (filter.destinataire) q = q.contains("destinataire", [filter.destinataire]);
  if (filter.occasion) q = q.contains("occasion", [filter.occasion]);
  if (filter.tag) q = q.contains("tags", [filter.tag.toLowerCase()]);
  if (filter.productId) q = q.eq("product_id", filter.productId);
  q = q.limit(filter.limit ?? 60);
  const { data, error } = await q;
  if (error) throw new Error(`Lecture catalog_shots échouée : ${error.message}`);
  return (data || []) as CatalogShot[];
}

export async function deleteCatalogShot(shot: CatalogShot): Promise<void> {
  if (!supabase) throw new Error("Supabase non configuré");
  // On ne supprime le fichier storage QUE si la source est notre bucket catalog-shots.
  // Les shots ajoutés depuis un social_pack pointent vers le bucket social-packs ;
  // dans ce cas le fichier reste (il appartient au pack source).
  if (shot.image_storage_path && shot.image_storage_path.startsWith("catalog-shots/")) {
    const cleanPath = shot.image_storage_path.replace(/^catalog-shots\//, "");
    await supabase.storage.from("catalog-shots").remove([cleanPath]);
  }
  const { error } = await supabase.from("catalog_shots").delete().eq("id", shot.id);
  if (error) throw new Error(`Delete échoué : ${error.message}`);
}

export interface UpdateCatalogShotPatch {
  destinataires?: string[] | null;
  occasions?: string[] | null;
  tags?: string[] | null;
  motif_id?: string | null;
  variante_key?: string | null;
  product_id?: string | null;
}

/**
 * Update partiel d'un shot existant — utilisé par la modal d'édition côté
 * Catalogue (vue top-level /atelier-da/motifs). Pour effacer un tag, passe
 * un array vide [] (qui sera converti en null en DB).
 */
export async function updateCatalogShot(id: string, patch: UpdateCatalogShotPatch): Promise<CatalogShot> {
  if (!supabase) throw new Error("Supabase non configuré");
  const dbPatch: Record<string, unknown> = {};
  if ("destinataires" in patch) {
    dbPatch.destinataire = patch.destinataires && patch.destinataires.length > 0 ? patch.destinataires : null;
  }
  if ("occasions" in patch) {
    dbPatch.occasion = patch.occasions && patch.occasions.length > 0 ? patch.occasions : null;
  }
  if ("tags" in patch) {
    dbPatch.tags = patch.tags && patch.tags.length > 0 ? patch.tags.map((t) => t.toLowerCase()) : null;
  }
  if ("motif_id" in patch) dbPatch.motif_id = patch.motif_id || null;
  if ("variante_key" in patch) dbPatch.variante_key = patch.variante_key || null;
  if ("product_id" in patch) dbPatch.product_id = patch.product_id || null;
  const { data, error } = await supabase
    .from("catalog_shots")
    .update(dbPatch)
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(`Update échoué : ${error.message}`);
  return data as CatalogShot;
}

export interface AddExistingShotPayload {
  imageUrl: string;
  storagePath?: string | null; // null si l'image vient d'un autre bucket (social-packs)
  shotLabel?: string | null;
  productId?: string | null;
  motifId?: string | null;
  varianteKey?: string | null;
  destinataires?: string[] | null;
  occasions?: string[] | null;
  tags?: string[] | null;
}

/**
 * Ajoute au catalogue un shot dont l'image est DÉJÀ stockée quelque part (typiquement
 * un slide d'un social_pack — bucket `social-packs`). On ne fait QUE l'insert row :
 * pas de upload, l'image reste en place dans son bucket source.
 *
 * Le `image_storage_path` est mis à null pour éviter de supprimer accidentellement
 * le fichier du bucket source lors d'un deleteCatalogShot ultérieur.
 */
export async function addExistingShotToCatalog(payload: AddExistingShotPayload): Promise<CatalogShot> {
  if (!supabase) throw new Error("Supabase non configuré");
  const id = crypto.randomUUID();
  const { data, error } = await supabase
    .from("catalog_shots")
    .insert({
      id,
      image_url: payload.imageUrl,
      image_storage_path: null,
      shot_label: payload.shotLabel ?? null,
      product_id: payload.productId ?? null,
      motif_id: payload.motifId ?? null,
      variante_key: payload.varianteKey ?? null,
      destinataire: payload.destinataires && payload.destinataires.length > 0 ? payload.destinataires : null,
      occasion: payload.occasions && payload.occasions.length > 0 ? payload.occasions : null,
      tags: payload.tags && payload.tags.length > 0 ? payload.tags.map((t) => t.toLowerCase()) : null,
    })
    .select()
    .single();
  if (error) throw new Error(`Insert catalog_shot échoué : ${error.message}`);
  return data as CatalogShot;
}
