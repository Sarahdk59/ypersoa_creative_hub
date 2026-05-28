/**
 * Médiathèque — upload de fichiers vers Supabase Storage (bucket `mediatheque`).
 *
 * Côté navigateur : on POST le fichier directement dans le bucket public, puis
 * on récupère l'URL publique persistante (servie par Supabase, survit aux
 * redéploiements). L'enregistrement des métadonnées se fait ensuite via
 * createMedia() avec ce public_url + storage_path.
 */
"use client";

import { createClient } from "@/lib/supabase/client";

const BUCKET = "mediatheque";

/** Nettoie le nom de fichier pour un chemin Storage sûr (sans accents/espaces). */
function slugifyFilename(name: string): string {
  const dot = name.lastIndexOf(".");
  const ext = (dot >= 0 ? name.slice(dot + 1) : "jpg").toLowerCase();
  const base =
    (dot >= 0 ? name.slice(0, dot) : name)
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "image";
  return `${base}.${ext}`;
}

function shortId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID().slice(0, 8);
  }
  return Math.random().toString(36).slice(2, 10);
}

export interface UploadedFile {
  storage_path: string;
  public_url: string;
}

/**
 * Upload un fichier dans le bucket `mediatheque` sous
 * `{source}/{yyyy-mm}/{id8}-{nom-nettoye}` et renvoie son URL publique.
 */
export async function uploadMediaFile(
  file: File,
  source: string,
): Promise<UploadedFile> {
  const supabase = createClient();
  const now = new Date();
  const yyyymm = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const storage_path = `${source}/${yyyymm}/${shortId()}-${slugifyFilename(file.name)}`;

  const { error } = await supabase.storage.from(BUCKET).upload(storage_path, file, {
    contentType: file.type || "image/jpeg",
    upsert: false,
  });
  if (error) throw new Error(`Upload Storage échoué : ${error.message}`);

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(storage_path);
  return { storage_path, public_url: data.publicUrl };
}
