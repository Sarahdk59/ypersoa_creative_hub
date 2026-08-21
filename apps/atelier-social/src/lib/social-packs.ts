import { supabase } from './supabase';

const BUCKET = 'social-packs';

export interface Collection {
  id: string;
  created_at: string;
  updated_at: string;
  name: string;
  description: string | null;
  cover_url: string | null;
  color: string | null;
}

export interface SocialPack {
  id: string;
  created_at: string;
  updated_at: string;
  collection_id: string | null;
  source_shot_id: string | null;

  title: string | null;
  platform: 'instagram' | 'pinterest';

  caption_text: string | null;
  caption_hooks: Record<string, string> | null;
  pinterest_title: string | null;
  pinterest_description: string | null;
  pinterest_tags: string[];

  brand_safety: unknown;

  vibe_id: string | null;
  occasion_id: string | null;
  canonique_ids: string[];
  custom_prompt: string | null;
  with_overlay: boolean;

  image_urls: string[];
  image_storage_paths: string[];

  notes: string | null;
  is_favorite: boolean;
}

/** Tag à attacher au média mirroré, résolu par l'appelant (labels déjà connus côté UI). */
export interface MediaTagHint {
  category: string;
  slug: string;
  label: string;
}

export interface SaveSocialPackInput {
  collectionId: string | null;
  title: string;
  platform: 'instagram' | 'pinterest';
  imageDataUrls: string[];
  captionText: string | null;
  captionHooks: Record<string, string> | null;
  pinterestTitle?: string | null;
  pinterestDescription?: string | null;
  pinterestTags?: string[];
  brandSafety?: unknown;
  vibeId?: string | null;
  occasionId?: string | null;
  canoniqueIds?: string[];
  customPrompt?: string | null;
  withOverlay?: boolean;
  sourceShotId?: string | null;
  notes?: string | null;
  /** Motif/incarnation/ambiance/occasion/mannequin déjà connus côté UI, à auto-tagger sur le mirror médiathèque. */
  mediaTagHints?: MediaTagHint[];
}

// ───────── Collections ─────────

export async function listCollections(): Promise<Collection[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('collections')
    .select('*')
    .order('updated_at', { ascending: false });
  if (error) throw new Error(`Lecture collections échouée : ${error.message}`);
  return (data || []) as Collection[];
}

export async function createCollection(name: string, description?: string): Promise<Collection> {
  if (!supabase) throw new Error('Supabase non configuré');
  const { data, error } = await supabase
    .from('collections')
    .insert({ name: name.trim(), description: description?.trim() || null })
    .select()
    .single();
  if (error) throw new Error(`Création collection échouée : ${error.message}`);
  return data as Collection;
}

export async function deleteCollection(collectionId: string): Promise<void> {
  if (!supabase) throw new Error('Supabase non configuré');
  const { error } = await supabase.from('collections').delete().eq('id', collectionId);
  if (error) throw new Error(`Delete collection échouée : ${error.message}`);
}

// ───────── Image upload ─────────

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

async function uploadImages(
  packId: string,
  imageDataUrls: string[]
): Promise<{ urls: string[]; paths: string[] }> {
  if (!supabase) throw new Error('Supabase non configuré');
  const urls: string[] = [];
  const paths: string[] = [];
  for (let i = 0; i < imageDataUrls.length; i++) {
    const { blob, ext } = dataUrlToBlob(imageDataUrls[i]);
    const path = `${packId}/slide-${String(i + 1).padStart(2, '0')}.${ext}`;
    const { error } = await supabase.storage.from(BUCKET).upload(path, blob, {
      contentType: blob.type,
      cacheControl: '31536000',
      upsert: false
    });
    if (error) throw new Error(`Upload slide ${i + 1} échoué : ${error.message}`);
    paths.push(path);
    urls.push(supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl);
  }
  return { urls, paths };
}

/**
 * Résout un tag médiathèque (catégorie+slug) vers son id, en le créant si
 * besoin (upsert idempotent, même format d'id que `store.ts::createTag`
 * côté serveur : `tag-${category}-${slug}`). Ce module tourne côté
 * navigateur (bucket/insert directs) et ne peut pas importer `lib/mediatheque/store.ts`
 * (qui dépend de `fs` via le loader de référentiels) — d'où ce petit
 * doublon volontaire plutôt qu'un import cross-couche.
 */
async function resolveMediaTagId(category: string, slug: string, label: string): Promise<string | null> {
  if (!supabase) return null;
  const id = `tag-${category}-${slug}`;
  const { error } = await supabase
    .from('mediatheque_tags')
    .upsert({ id, category, slug, label }, { onConflict: 'id', ignoreDuplicates: true });
  if (error) return null;
  return id;
}

/**
 * Les images ne rejoignent la médiathèque qu'une fois le pack réellement
 * sauvegardé. Elles restent dans leur bucket `social-packs` d'origine : la
 * médiathèque ne conserve ici qu'une référence publique vers ce fichier.
 */
async function mirrorPackImagesToMediaLibrary(
  packId: string,
  title: string,
  urls: string[],
  paths: string[],
  imageDataUrls: string[],
  platform: 'instagram' | 'pinterest',
  mediaTagHints: MediaTagHint[] = [],
): Promise<void> {
  if (!supabase || urls.length === 0) return;

  const { data: existing, error: existingError } = await supabase
    .from('mediatheque_media')
    .select('public_url')
    .in('public_url', urls);
  if (existingError) throw new Error(`Lecture médiathèque échouée : ${existingError.message}`);

  const existingUrls = new Set((existing ?? []).map((row) => row.public_url as string));
  const rows = urls.flatMap((publicUrl, index) => {
    if (existingUrls.has(publicUrl)) return [];
    const mimeType = imageDataUrls[index]?.match(/^data:(image\/[a-zA-Z+]+);base64,/)?.[1] ?? null;
    const ext = mimeType?.split('/')[1].replace('jpeg', 'jpg') ?? 'jpg';
    return [{
      filename: `${title} — slide ${index + 1}.${ext}`,
      storage_path: paths[index],
      public_url: publicUrl,
      mime_type: mimeType,
      source: 'ia_generation',
      statut: 'a_valider',
      notes: `Pack social ${packId}`,
    }];
  });

  if (rows.length === 0) return;
  const { data: inserted, error } = await supabase.from('mediatheque_media').insert(rows).select('id');
  if (error) throw new Error(`Ajout médiathèque échoué : ${error.message}`);

  const hints: MediaTagHint[] = [
    { category: 'canal', slug: platform, label: platform === 'instagram' ? 'Instagram' : 'Pinterest' },
    ...mediaTagHints,
  ];
  const tagIds = (
    await Promise.all(hints.map((h) => resolveMediaTagId(h.category, h.slug, h.label)))
  ).filter((id): id is string => Boolean(id));
  if (tagIds.length === 0) return;

  const links = (inserted ?? []).flatMap((row) =>
    tagIds.map((tag_id) => ({ media_id: (row as { id: string }).id, tag_id })),
  );
  if (links.length > 0) {
    const { error: linkErr } = await supabase.from('mediatheque_media_tags').insert(links);
    if (linkErr) throw new Error(`Association tags médiathèque échouée : ${linkErr.message}`);
  }
}

// ───────── Social packs CRUD ─────────

export async function saveSocialPack(input: SaveSocialPackInput): Promise<SocialPack> {
  if (!supabase) throw new Error('Supabase non configuré');
  const packId = crypto.randomUUID();
  const { urls, paths } = await uploadImages(packId, input.imageDataUrls);

  const { data, error } = await supabase
    .from('social_packs')
    .insert({
      id: packId,
      collection_id: input.collectionId,
      source_shot_id: input.sourceShotId ?? null,
      title: input.title,
      platform: input.platform,
      caption_text: input.captionText,
      caption_hooks: input.captionHooks,
      pinterest_title: input.pinterestTitle ?? null,
      pinterest_description: input.pinterestDescription ?? null,
      pinterest_tags: input.pinterestTags ?? [],
      brand_safety: input.brandSafety ?? null,
      vibe_id: input.vibeId ?? null,
      occasion_id: input.occasionId ?? null,
      canonique_ids: input.canoniqueIds ?? [],
      custom_prompt: input.customPrompt ?? null,
      with_overlay: input.withOverlay ?? false,
      image_urls: urls,
      image_storage_paths: paths,
      notes: input.notes ?? null
    })
    .select()
    .single();
  if (error) {
    await supabase.storage.from(BUCKET).remove(paths);
    throw new Error(`Insert social_pack échoué : ${error.message}`);
  }
  try {
    await mirrorPackImagesToMediaLibrary(
      packId,
      input.title,
      urls,
      paths,
      input.imageDataUrls,
      input.platform,
      input.mediaTagHints,
    );
  } catch (mediaError) {
    // Une sauvegarde n'est considérée comme réussie que si le miroir
    // médiathèque existe aussi. Le rollback évite les doublons lors d'un retry.
    await supabase.from('social_packs').delete().eq('id', packId);
    await supabase.storage.from(BUCKET).remove(paths);
    throw mediaError;
  }
  return data as SocialPack;
}

export async function listSocialPacks(filters?: {
  collectionId?: string | null;
  platform?: 'instagram' | 'pinterest';
  favoriteOnly?: boolean;
  limit?: number;
}): Promise<SocialPack[]> {
  if (!supabase) return [];
  let query = supabase.from('social_packs').select('*').order('created_at', { ascending: false });
  if (filters?.collectionId !== undefined) {
    query = filters.collectionId === null
      ? query.is('collection_id', null)
      : query.eq('collection_id', filters.collectionId);
  }
  if (filters?.platform) query = query.eq('platform', filters.platform);
  if (filters?.favoriteOnly) query = query.eq('is_favorite', true);
  query = query.limit(filters?.limit ?? 100);
  const { data, error } = await query;
  if (error) throw new Error(`Lecture social_packs échouée : ${error.message}`);
  return (data || []) as SocialPack[];
}

export async function updatePackCaption(
  packId: string,
  patch: Partial<Pick<SocialPack, 'caption_text' | 'caption_hooks' | 'pinterest_title' | 'pinterest_description' | 'pinterest_tags' | 'notes' | 'title' | 'collection_id'>>
): Promise<void> {
  if (!supabase) throw new Error('Supabase non configuré');
  const { error } = await supabase.from('social_packs').update(patch).eq('id', packId);
  if (error) throw new Error(`Update pack échoué : ${error.message}`);
}

export async function togglePackFavorite(packId: string, current: boolean): Promise<void> {
  if (!supabase) throw new Error('Supabase non configuré');
  const { error } = await supabase
    .from('social_packs')
    .update({ is_favorite: !current })
    .eq('id', packId);
  if (error) throw new Error(`Toggle favorite échoué : ${error.message}`);
}

/**
 * Supprime une slide du pack (image_urls[idx] + storage_paths[idx] + storage file).
 * Le pack reste intact, seule cette image disparaît.
 */
export async function deleteSlideFromPack(pack: SocialPack, idx: number): Promise<SocialPack> {
  if (!supabase) throw new Error('Supabase non configuré');
  if (idx < 0 || idx >= pack.image_urls.length) throw new Error('Index hors borne');

  const removedPath = pack.image_storage_paths[idx];
  const newUrls = pack.image_urls.filter((_, i) => i !== idx);
  const newPaths = pack.image_storage_paths.filter((_, i) => i !== idx);

  const { data, error } = await supabase
    .from('social_packs')
    .update({ image_urls: newUrls, image_storage_paths: newPaths })
    .eq('id', pack.id)
    .select()
    .single();
  if (error) throw new Error(`Update slides échoué : ${error.message}`);

  if (removedPath) {
    await supabase.storage.from(BUCKET).remove([removedPath]);
  }
  return data as SocialPack;
}

export async function deleteSocialPack(pack: SocialPack): Promise<void> {
  if (!supabase) throw new Error('Supabase non configuré');
  if (pack.image_storage_paths.length > 0) {
    await supabase.storage.from(BUCKET).remove(pack.image_storage_paths);
  }
  const { error } = await supabase.from('social_packs').delete().eq('id', pack.id);
  if (error) throw new Error(`Delete pack échoué : ${error.message}`);
}
