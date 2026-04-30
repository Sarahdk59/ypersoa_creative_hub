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
  patch: Partial<Pick<SocialPack, 'caption_text' | 'pinterest_title' | 'pinterest_description' | 'pinterest_tags' | 'notes' | 'title' | 'collection_id'>>
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

export async function deleteSocialPack(pack: SocialPack): Promise<void> {
  if (!supabase) throw new Error('Supabase non configuré');
  if (pack.image_storage_paths.length > 0) {
    await supabase.storage.from(BUCKET).remove(pack.image_storage_paths);
  }
  const { error } = await supabase.from('social_packs').delete().eq('id', pack.id);
  if (error) throw new Error(`Delete pack échoué : ${error.message}`);
}
