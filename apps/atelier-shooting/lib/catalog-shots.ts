/**
 * catalog-shots — Ranger un shot dans le catalogue créatif Ypersoa.
 *
 * Pattern aligné sur liked-shots.ts. Différence : ces shots ne servent pas
 * à générer des captions RS — ils sont taggés par destinataire (papa, maman,
 * couple…) ou occasion (mariage, anniversaire…) et viennent peupler la galerie
 * variante côté /atelier-da/motifs (Phase 2D, à venir).
 *
 * Sarah peut aussi linker à un motif YPM précis et un produit (YP005, YP019…)
 * pour reconstituer une "collection prête à publier" sur Shopify.
 *
 * --- MIGRATION SUPABASE (à exécuter une fois côté MCP) ---
 *
 * 1) Bucket
 *    insert into storage.buckets (id, name, public) values ('catalog-shots', 'catalog-shots', true);
 *    create policy "Public read catalog-shots" on storage.objects for select using (bucket_id = 'catalog-shots');
 *    create policy "Anyone insert catalog-shots" on storage.objects for insert with check (bucket_id = 'catalog-shots');
 *    create policy "Anyone delete catalog-shots" on storage.objects for delete using (bucket_id = 'catalog-shots');
 *
 * 2) Table
 *    create table public.catalog_shots (
 *      id uuid primary key,
 *      created_at timestamptz default now(),
 *      image_url text not null,
 *      image_storage_path text,
 *      shot_label text,
 *      product_id text,          -- YP001, YP005…
 *      motif_id text,            -- YPM-007 ou null
 *      variante_key text,        -- "CHOUCHOU-mamie" ou null
 *      destinataire text,        -- "papa", "maman"… ou null
 *      occasion text,            -- "mariage", "anniversaire"… ou null
 *      pack_settings jsonb
 *    );
 *    alter table public.catalog_shots enable row level security;
 *    create policy "Anyone read" on public.catalog_shots for select using (true);
 *    create policy "Anyone insert" on public.catalog_shots for insert with check (true);
 *    create policy "Anyone delete" on public.catalog_shots for delete using (true);
 */
import { supabase } from './supabase';
import { GenerationSettings } from '../types';
import { resolveMediaTagId, linkMediaTags } from './mediatheque-bridge';

export interface CatalogShot {
  id: string;
  created_at: string;
  image_url: string;
  image_storage_path: string | null;
  shot_label: string | null;
  product_id: string | null;
  motif_id: string | null;
  variante_key: string | null;
  // text[] côté Postgres — un shot peut être taggé multi-destinataires
  // (ex: papa + maman) ou multi-occasions (ex: mariage + déclaration).
  destinataire: string[] | null;
  occasion: string[] | null;
  // Tags libres (animaux, famille, lifestyle…) saisis dans la modal Ranger.
  tags: string[] | null;
  pack_settings: GenerationSettings | null;
}

const BUCKET = 'catalog-shots';
const MEDIA_TABLE = 'mediatheque_media';

function dataUrlToBlob(dataUrl: string): { blob: Blob; ext: string } {
  const match = dataUrl.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
  if (!match) throw new Error('Invalid data URL');
  const mimeType = match[1];
  const base64 = match[2];
  const ext = mimeType.split('/')[1].replace('jpeg', 'jpg');
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return { blob: new Blob([bytes], { type: mimeType }), ext };
}

export interface AddToCatalogPayload {
  destinataires?: string[] | null;
  occasions?: string[] | null;
  tags?: string[] | null;
  motifId?: string | null;
  varianteKey?: string | null;
  productId?: string | null;
  shotLabel?: string | null;
  settings?: GenerationSettings | null;
}

function capitalize(s: string): string {
  return s.length > 0 ? s[0].toUpperCase() + s.slice(1) : s;
}

async function mirrorCatalogShotToMediaLibrary(
  shot: CatalogShot,
  mimeType: string,
  source: 'shooting_studio' | 'packshot',
): Promise<void> {
  if (!supabase) throw new Error('Supabase non configuré');

  const { data: existing, error: existingError } = await supabase
    .from(MEDIA_TABLE)
    .select('id')
    .eq('public_url', shot.image_url)
    .maybeSingle();
  if (existingError) throw new Error(`Lecture médiathèque échouée : ${existingError.message}`);
  if (existing) return;

  const ext = mimeType.split('/')[1].replace('jpeg', 'jpg');
  const { data: inserted, error } = await supabase
    .from(MEDIA_TABLE)
    .insert({
      filename: `${shot.shot_label ?? 'Shot atelier'}-${shot.id}.${ext}`,
      storage_path: shot.image_storage_path ?? undefined,
      public_url: shot.image_url,
      mime_type: mimeType,
      source,
      statut: 'a_valider',
      notes: `Catalog shot ${shot.id}`,
    })
    .select('id')
    .single();
  if (error) throw new Error(`Ajout médiathèque échoué : ${error.message}`);

  // Auto-tag à la source : motif/gabarit/occasion déjà connus sur le shot,
  // pas de saisie manuelle nécessaire (règle d'or Bibliothèque).
  const hints: { category: string; slug: string; label: string }[] = [];
  if (shot.motif_id) hints.push({ category: 'motif', slug: shot.motif_id.toLowerCase(), label: shot.motif_id });
  if (shot.product_id) hints.push({ category: 'gabarit', slug: shot.product_id.toLowerCase(), label: shot.product_id });
  for (const occasion of shot.occasion ?? []) {
    hints.push({ category: 'occasion', slug: occasion, label: capitalize(occasion) });
  }

  const tagIds = (
    await Promise.all(hints.map((h) => resolveMediaTagId(h.category, h.slug, h.label)))
  ).filter((id): id is string => Boolean(id));
  if (tagIds.length === 0) return;

  await linkMediaTags((inserted as { id: string }).id, tagIds);
}

/** Upload + insert row catalog_shots. */
export async function addShotToCatalog(
  imageDataUrl: string,
  payload: AddToCatalogPayload
): Promise<CatalogShot> {
  if (!supabase) throw new Error('Supabase non configuré (manque VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY)');

  const { blob, ext } = dataUrlToBlob(imageDataUrl);
  const id = crypto.randomUUID();
  const path = `${id}.${ext}`;

  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, blob, {
    contentType: blob.type,
    cacheControl: '31536000',
    upsert: false,
  });
  if (uploadError) throw new Error(`Upload échoué : ${uploadError.message}`);

  const { data: publicUrlData } = supabase.storage.from(BUCKET).getPublicUrl(path);

  const settingsLite = payload.settings
    ? { ...payload.settings, embroideryImage: payload.settings.embroideryImage ? '[stripped]' : null, wristEmbroideryImage: payload.settings.wristEmbroideryImage ? '[stripped]' : null }
    : null;

  const { data, error } = await supabase
    .from('catalog_shots')
    .insert({
      id,
      image_url: publicUrlData.publicUrl,
      image_storage_path: path,
      shot_label: payload.shotLabel ?? null,
      product_id: payload.productId ?? null,
      motif_id: payload.motifId ?? null,
      variante_key: payload.varianteKey ?? null,
      destinataire: payload.destinataires && payload.destinataires.length > 0 ? payload.destinataires : null,
      occasion: payload.occasions && payload.occasions.length > 0 ? payload.occasions : null,
      tags: payload.tags && payload.tags.length > 0 ? payload.tags.map((t) => t.toLowerCase()) : null,
      pack_settings: settingsLite,
    })
    .select()
    .single();
  if (error) {
    await supabase.storage.from(BUCKET).remove([path]);
    throw new Error(`Insert row échoué : ${error.message}`);
  }
  const shot = data as CatalogShot;
  try {
    await mirrorCatalogShotToMediaLibrary(
      shot,
      blob.type,
      payload.settings?.mode === 'packshot' ? 'packshot' : 'shooting_studio',
    );
  } catch (mediaError) {
    await supabase.from('catalog_shots').delete().eq('id', shot.id);
    await supabase.storage.from(BUCKET).remove([path]);
    throw mediaError;
  }
  return shot;
}

/** Liste paginée des shots catalogués, plus récents en premier. */
export async function listCatalogShots(filter?: {
  destinataire?: string;
  occasion?: string;
  motifId?: string;
  varianteKey?: string;
  productId?: string;
  limit?: number;
}): Promise<CatalogShot[]> {
  if (!supabase) return [];
  let q = supabase.from('catalog_shots').select('*').order('created_at', { ascending: false });
  // contains pour text[] : .contains('destinataire', ['papa']) renvoie tous les
  // shots dont l'array destinataire CONTIENT 'papa' (parmi d'autres possibles).
  if (filter?.destinataire) q = q.contains('destinataire', [filter.destinataire]);
  if (filter?.occasion) q = q.contains('occasion', [filter.occasion]);
  if (filter?.motifId) q = q.eq('motif_id', filter.motifId);
  if (filter?.varianteKey) q = q.eq('variante_key', filter.varianteKey);
  if (filter?.productId) q = q.eq('product_id', filter.productId);
  q = q.limit(filter?.limit ?? 60);
  const { data, error } = await q;
  if (error) throw new Error(`Lecture catalog_shots échouée : ${error.message}`);
  return (data || []) as CatalogShot[];
}

export interface AddExistingShotPayload {
  imageUrl: string;
  shotLabel?: string | null;
  productId?: string | null;
  motifId?: string | null;
  varianteKey?: string | null;
  destinataires?: string[] | null;
  occasions?: string[] | null;
  tags?: string[] | null;
}

/**
 * Ajoute au catalogue un shot dont l'image est DÉJÀ sur Supabase (typiquement
 * un favori atelier-shooting — bucket `liked-shots`). On ne fait QUE l'insert
 * row, l'image reste dans son bucket source.
 *
 * `image_storage_path = null` pour ne pas supprimer accidentellement le fichier
 * du bucket source lors d'un deleteCatalogShot ultérieur.
 */
export async function addExistingShotToCatalog(payload: AddExistingShotPayload): Promise<CatalogShot> {
  if (!supabase) throw new Error('Supabase non configuré');
  const id = crypto.randomUUID();
  const { data, error } = await supabase
    .from('catalog_shots')
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

export async function deleteCatalogShot(shot: CatalogShot): Promise<void> {
  if (!supabase) throw new Error('Supabase non configuré');
  if (shot.image_storage_path) {
    await supabase.storage.from(BUCKET).remove([shot.image_storage_path]);
  }
  const { error } = await supabase.from('catalog_shots').delete().eq('id', shot.id);
  if (error) throw new Error(`Delete row échoué : ${error.message}`);
}
