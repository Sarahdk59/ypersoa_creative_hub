/**
 * Petit pont partagé Atelier Shooting → médiathèque (mediatheque_tags).
 * Utilisé par `catalog-shots.ts` et `liked-shots.ts` — deux mirrors distincts
 * qui ont besoin de la même résolution catégorie+slug → id de tag.
 *
 * Dupliqué volontairement depuis `lib/mediatheque/store.ts::resolveTagId`
 * côté atelier-social (Next.js) : cette app est un projet Vite séparé, pas
 * d'import cross-app possible. Même Supabase project, même format d'id
 * déterministe (`tag-${category}-${slug}`).
 */
import { supabase } from './supabase';

export const TAGS_TABLE = 'mediatheque_tags';
export const LINK_TABLE = 'mediatheque_media_tags';

export async function resolveMediaTagId(
  category: string,
  slug: string,
  label: string,
): Promise<string | null> {
  if (!supabase) return null;
  const id = `tag-${category}-${slug}`;
  const { error } = await supabase
    .from(TAGS_TABLE)
    .upsert({ id, category, slug, label }, { onConflict: 'id', ignoreDuplicates: true });
  if (error) return null;
  return id;
}

export async function linkMediaTags(mediaId: string, tagIds: string[]): Promise<void> {
  if (!supabase || tagIds.length === 0) return;
  const { error } = await supabase
    .from(LINK_TABLE)
    .insert(tagIds.map((tag_id) => ({ media_id: mediaId, tag_id })));
  if (error) throw new Error(`Association tags médiathèque échouée : ${error.message}`);
}
