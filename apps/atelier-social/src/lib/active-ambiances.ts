/**
 * Lookbooks ❤️ actifs comme ambiances de référence (shared avec shooting/lookbook).
 * Filtre `is_favorite=true AND date_archivage > now()`.
 *
 * Source : table `lookbooks` (Supabase partagé entre les 3 apps Hub).
 * L'activation 7j est gérée par atelier-lookbook → setLookbookActiveAmbiance().
 */
import { supabase } from "./supabase";

export interface LookbookAmbianceExtraite {
  palette: string[];
  lieux: string[];
  props: string[];
  lumiere: string;
  grain: string;
  postures: string;
  references_implicites: string[];
}

export interface ActiveLookbookAmbiance {
  id: string;
  titre: string;
  slug: string;
  date_archivage: string | null;
  ambiance_extraite: LookbookAmbianceExtraite | null;
  cover_image_url: string | null;
}

interface LookbookRow {
  id: string;
  titre: string;
  slug: string;
  date_archivage: string | null;
  ambiance_extraite: LookbookAmbianceExtraite | null;
}

interface LookbookImageRow {
  lookbook_id: string;
  image_url: string | null;
  position: number;
}

export async function listActiveLookbookAmbiances(): Promise<ActiveLookbookAmbiance[]> {
  if (!supabase) return [];
  const nowIso = new Date().toISOString();

  const { data: lookbooks, error } = await supabase
    .from("lookbooks")
    .select("id, titre, slug, date_archivage, ambiance_extraite")
    .eq("is_favorite", true)
    .or(`date_archivage.is.null,date_archivage.gt.${nowIso}`)
    .order("date_activation", { ascending: false });

  if (error) {
    console.error("[active-ambiances social] fetch lookbooks failed:", error.message);
    return [];
  }
  const rows = (lookbooks || []) as LookbookRow[];
  if (rows.length === 0) return [];

  const ids = rows.map((r) => r.id);
  const { data: covers } = await supabase
    .from("lookbook_images")
    .select("lookbook_id, image_url, position")
    .in("lookbook_id", ids)
    .eq("position", 1);

  const coverMap = new Map<string, string | null>();
  for (const img of (covers || []) as LookbookImageRow[]) {
    coverMap.set(img.lookbook_id, img.image_url);
  }

  return rows.map((r) => ({
    id: r.id,
    titre: r.titre,
    slug: r.slug,
    date_archivage: r.date_archivage,
    ambiance_extraite: r.ambiance_extraite,
    cover_image_url: coverMap.get(r.id) ?? null,
  }));
}

/**
 * Construit le prompt EN d'ambiance pour la génération d'image Gemini, à
 * partir de l'ambiance_extraite d'un lookbook ❤️ actif. Format aligné sur
 * VIBES[i].prompt — ligne unique riche injectée dans le pipeline existant.
 */
export function buildVibePromptFromLookbook(lb: ActiveLookbookAmbiance): string {
  const a = lb.ambiance_extraite;
  if (!a) {
    return `Editorial photography ambiance inspired by the curated lookbook "${lb.titre}", quiet luxury Ypersoa aesthetic.`;
  }
  const palette = a.palette?.length ? a.palette.join(", ") : "warm cream tones";
  const lieux = a.lieux?.length ? a.lieux.join(", ") : "intimate French interior";
  const refs = a.references_implicites?.length ? a.references_implicites.join(", ") : "Sézane × A.P.C.";
  return (
    `Custom ambiance from curated Ypersoa lookbook "${lb.titre}" — ` +
    `color palette: ${palette}; setting: ${lieux}; ` +
    `lighting: ${a.lumiere || "soft natural editorial"}; grain: ${a.grain || "premium digital"}; ` +
    `body language: ${a.postures || "natural relaxed"}; references: ${refs}. ` +
    `Real skin texture, no retouching, quiet luxury embroidery aesthetic.`
  );
}

export const LOOKBOOK_VIBE_PREFIX = "lookbook:";
