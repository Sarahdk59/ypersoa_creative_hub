import { supabase } from './supabase';
import { GenerationSettings } from '../types';

export interface LikedShot {
  id: string;
  created_at: string;
  image_url: string;
  image_storage_path: string | null;
  shot_label: string | null;
  pack_settings: GenerationSettings | null;
  tags: string[];
  notes: string | null;
  used_in_caption_at: string | null;
}

const BUCKET = 'liked-shots';

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

/**
 * Upload une image (data URL) dans le bucket liked-shots et insert
 * une row dans la table public.liked_shots. Retourne le LikedShot créé.
 */
export async function likeShot(
  imageDataUrl: string,
  settings: GenerationSettings,
  shotLabel: string
): Promise<LikedShot> {
  if (!supabase) throw new Error('Supabase non configuré (manque VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY)');

  const { blob, ext } = dataUrlToBlob(imageDataUrl);
  const id = crypto.randomUUID();
  const path = `${id}.${ext}`;

  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, blob, {
    contentType: blob.type,
    cacheControl: '31536000',
    upsert: false
  });
  if (uploadError) throw new Error(`Upload échoué : ${uploadError.message}`);

  const { data: publicUrlData } = supabase.storage.from(BUCKET).getPublicUrl(path);

  // settings contient embroideryImage (data URL = potentiellement gros) — on la nettoie
  // pour ne pas alourdir la row jsonb. Le shot final image_url suffit pour atelier-social.
  const settingsLite = { ...settings, embroideryImage: settings.embroideryImage ? '[stripped]' : null };

  const { data, error } = await supabase
    .from('liked_shots')
    .insert({
      id,
      image_url: publicUrlData.publicUrl,
      image_storage_path: path,
      shot_label: shotLabel,
      pack_settings: settingsLite
    })
    .select()
    .single();
  if (error) {
    await supabase.storage.from(BUCKET).remove([path]);
    throw new Error(`Insert row échoué : ${error.message}`);
  }
  return data as LikedShot;
}

/** Liste tous les shots likés, plus récents en premier. */
export async function listLikedShots(limit = 50): Promise<LikedShot[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('liked_shots')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw new Error(`Lecture liked_shots échouée : ${error.message}`);
  return (data || []) as LikedShot[];
}

/** Supprime un shot liké (DB + storage). */
export async function unlikeShot(shot: LikedShot): Promise<void> {
  if (!supabase) throw new Error('Supabase non configuré');
  if (shot.image_storage_path) {
    await supabase.storage.from(BUCKET).remove([shot.image_storage_path]);
  }
  const { error } = await supabase.from('liked_shots').delete().eq('id', shot.id);
  if (error) throw new Error(`Delete row échoué : ${error.message}`);
}
