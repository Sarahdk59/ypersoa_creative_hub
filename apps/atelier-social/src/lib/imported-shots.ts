import { supabase } from './supabase';

export interface ImportedShot {
  id: string;
  created_at: string;
  image_url: string;
  shot_label: string | null;
  pack_settings: Record<string, unknown> | null;
  used_in_caption_at: string | null;
}

/** Liste les shots likés depuis atelier-shooting, plus récents en premier. */
export async function listImportedShots(limit = 50): Promise<ImportedShot[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('liked_shots')
    .select('id,created_at,image_url,shot_label,pack_settings,used_in_caption_at')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw new Error(`Lecture liked_shots échouée : ${error.message}`);
  return (data || []) as ImportedShot[];
}

/**
 * Convertit un ImportedShot en File + base64 prêts à passer à handleImageSelected
 * (pré-remplissage du générateur de caption depuis un shot likeé).
 */
export async function fetchShotAsFile(shot: ImportedShot): Promise<{ file: File; base64: string }> {
  const response = await fetch(shot.image_url);
  if (!response.ok) throw new Error(`Fetch shot image failed (${response.status})`);
  const blob = await response.blob();
  const ext = blob.type.split('/')[1] || 'jpg';
  const filename = `imported-shot-${shot.id.slice(0, 8)}.${ext}`;
  const file = new File([blob], filename, { type: blob.type });

  const base64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });

  return { file, base64 };
}

/** Marque un shot comme "utilisé pour caption" (timestamp). */
export async function markShotAsUsed(shotId: string): Promise<void> {
  if (!supabase) return;
  await supabase
    .from('liked_shots')
    .update({ used_in_caption_at: new Date().toISOString() })
    .eq('id', shotId);
}
