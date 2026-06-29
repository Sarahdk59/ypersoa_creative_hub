/**
 * Résolution de l'URL d'aperçu d'un PNG motif.
 *
 * Deux origines coexistent :
 *  - Fichiers historiques commités dans assets/motifs/ → servis par Next via
 *    le symlink public/motifs (`/motifs/<file>`). Pas d'`url`.
 *  - PNG uploadés au runtime via l'UI → Supabase Storage (bucket `motifs-png`),
 *    avec une `url` publique persistante. Le filesystem du conteneur étant
 *    éphémère en prod, ces fichiers ne sont PAS servables via /motifs/.
 *
 * On préfère donc toujours l'`url` Supabase si présente, sinon on retombe sur
 * le chemin statique. Utilisable côté client comme côté serveur.
 */
export function motifImageSrc(file: string, url?: string | null): string {
  if (url) return url;
  return `/motifs/${encodeURIComponent(file)}`;
}
