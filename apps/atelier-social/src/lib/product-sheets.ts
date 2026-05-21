/**
 * product-sheets — fiches produit éditoriales.
 *
 * Une fiche produit groupe 2+ shots du catalogue qui définissent ensemble une
 * "page Shopify" : ex. "La Déclaration · Papa · YP019" rassemble 4 shots
 * déclaration papa pris sous des angles différents → 1 fiche, prête à monter
 * en page produit.
 *
 * Schéma : product_sheets (méta) + product_sheet_shots (join N-N).
 */
import { supabase } from "./supabase";
import type { CatalogShot } from "./catalog-shots";

export interface ProductSheet {
  id: string;
  created_at: string;
  updated_at: string;
  title: string;
  description: string | null;
  motif_id: string | null;
  variante_key: string | null;
  product_id: string | null;
  destinataires: string[] | null;
  occasions: string[] | null;
  tags: string[] | null;
  cover_shot_id: string | null;
}

export interface ProductSheetWithShots extends ProductSheet {
  shots: CatalogShot[];
}

export interface CreateProductSheetInput {
  title: string;
  description?: string | null;
  motifId?: string | null;
  varianteKey?: string | null;
  productId?: string | null;
  destinataires?: string[] | null;
  occasions?: string[] | null;
  tags?: string[] | null;
  shotIds: string[]; // au moins 1, idéalement 2+
  coverShotId?: string | null; // par défaut le premier
}

export async function createProductSheet(input: CreateProductSheetInput): Promise<ProductSheetWithShots> {
  if (!supabase) throw new Error("Supabase non configuré");
  if (input.shotIds.length === 0) throw new Error("Au moins 1 shot requis pour créer une fiche");

  const { data: sheet, error: insErr } = await supabase
    .from("product_sheets")
    .insert({
      title: input.title.trim(),
      description: input.description?.trim() || null,
      motif_id: input.motifId ?? null,
      variante_key: input.varianteKey ?? null,
      product_id: input.productId ?? null,
      destinataires: input.destinataires && input.destinataires.length > 0 ? input.destinataires : null,
      occasions: input.occasions && input.occasions.length > 0 ? input.occasions : null,
      tags: input.tags && input.tags.length > 0 ? input.tags.map((t) => t.toLowerCase()) : null,
      cover_shot_id: input.coverShotId ?? input.shotIds[0] ?? null,
    })
    .select()
    .single();
  if (insErr) throw new Error(`Insert product_sheet échoué : ${insErr.message}`);

  const joinRows = input.shotIds.map((shotId, idx) => ({
    product_sheet_id: sheet.id,
    catalog_shot_id: shotId,
    position: idx,
  }));
  const { error: joinErr } = await supabase.from("product_sheet_shots").insert(joinRows);
  if (joinErr) {
    await supabase.from("product_sheets").delete().eq("id", sheet.id);
    throw new Error(`Insert join échoué : ${joinErr.message}`);
  }

  return { ...(sheet as ProductSheet), shots: [] };
}

export async function listProductSheets(filter?: {
  motifId?: string;
  destinataire?: string;
  occasion?: string;
  limit?: number;
}): Promise<ProductSheetWithShots[]> {
  if (!supabase) return [];
  let q = supabase
    .from("product_sheets")
    .select(`
      *,
      shots:product_sheet_shots(
        position,
        catalog_shot:catalog_shots(*)
      )
    `)
    .order("updated_at", { ascending: false });
  if (filter?.motifId) q = q.eq("motif_id", filter.motifId);
  if (filter?.destinataire) q = q.contains("destinataires", [filter.destinataire]);
  if (filter?.occasion) q = q.contains("occasions", [filter.occasion]);
  q = q.limit(filter?.limit ?? 60);
  const { data, error } = await q;
  if (error) throw new Error(`Lecture product_sheets échouée : ${error.message}`);
  return ((data ?? []) as Array<ProductSheet & { shots: Array<{ position: number; catalog_shot: CatalogShot }> }>).map((row) => ({
    ...row,
    shots: (row.shots ?? [])
      .sort((a, b) => a.position - b.position)
      .map((j) => j.catalog_shot),
  }));
}

export async function listSheetsForShot(shotId: string): Promise<ProductSheet[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("product_sheet_shots")
    .select(`product_sheet:product_sheets(*)`)
    .eq("catalog_shot_id", shotId);
  if (error) throw new Error(`Lecture sheets/shot échouée : ${error.message}`);
  return ((data ?? []) as unknown as Array<{ product_sheet: ProductSheet }>).map((r) => r.product_sheet);
}

export async function deleteProductSheet(id: string): Promise<void> {
  if (!supabase) throw new Error("Supabase non configuré");
  // cascade côté DB supprime aussi les join rows
  const { error } = await supabase.from("product_sheets").delete().eq("id", id);
  if (error) throw new Error(`Delete product_sheet échoué : ${error.message}`);
}
