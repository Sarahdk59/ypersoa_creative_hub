/**
 * Récupère la liste des lookbooks ❤️ actifs (date_archivage > now)
 * exposés comme ambiance custom de référence dans l'Atelier Shooting.
 *
 * Source : table `lookbooks` (Supabase partagé entre les 3 apps Hub).
 * L'activation 7j est gérée par atelier-lookbook → setLookbookActiveAmbiance().
 */
import { supabase } from './supabase';
import type { ActiveLookbookAmbiance, LookbookAmbianceExtraite } from '../types';

interface LookbookRow {
  id: string;
  titre: string;
  slug: string;
  date_archivage: string | null;
  ambiance_extraite: LookbookAmbianceExtraite | null;
  is_favorite: boolean;
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
    .from('lookbooks')
    .select('id, titre, slug, date_archivage, ambiance_extraite, is_favorite')
    .eq('is_favorite', true)
    .or(`date_archivage.is.null,date_archivage.gt.${nowIso}`)
    .order('date_activation', { ascending: false });

  if (error) {
    console.error('[active-ambiances] fetch lookbooks failed:', error.message);
    return [];
  }
  const rows = (lookbooks || []) as LookbookRow[];
  if (rows.length === 0) return [];

  const ids = rows.map((r) => r.id);
  const { data: covers } = await supabase
    .from('lookbook_images')
    .select('lookbook_id, image_url, position')
    .in('lookbook_id', ids)
    .eq('position', 1);

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
 * Construit un descripteur de scène (EN) depuis l'ambiance_extraite,
 * réutilisable dans les prompts FULL_PACK qui ont leur décor inline.
 * Format : phrase de scène (sans label/intro) — peut être insérée dans un
 * prompt existant à la place du décor parisien.
 */
function buildSceneDescription(lb: ActiveLookbookAmbiance): string {
  const a = lb.ambiance_extraite;
  if (!a) return `a curated editorial setting inspired by the lookbook "${lb.titre}"`;
  const lieux = a.lieux?.length ? a.lieux.join(" or ") : "an intimate French interior";
  const palette = a.palette?.length ? `dominant colors ${a.palette.join(", ")}` : "warm cream tones";
  const lumiere = a.lumiere || "soft natural editorial light";
  return `${lieux} (${palette}, ${lumiere})`;
}

/**
 * Construit un FULL_PACK dynamique pour un lookbook ambiance.
 * GHOST/CROP/MACRO : conservés tels quels (fond blanc studio, pas de décor).
 * LIFESTYLE/DUO/PORTRAIT : régénérés avec le décor custom du lookbook.
 *
 * Compatible avec la signature attendue par geminiService.getFullPackPrompts —
 * mêmes clés (GHOST, CROP, MACRO, LIFESTYLE, DUO, PORTRAIT), même shape { label, prompt }.
 */
export function buildFullPackFromLookbook(
  lb: ActiveLookbookAmbiance,
  fallbackPack: Record<string, { label: string; prompt: string }>
): Record<string, { label: string; prompt: string }> {
  const a = lb.ambiance_extraite;
  const scene = buildSceneDescription(lb);
  const props = a?.props?.length ? a.props.join(", ") : "natural curated objects";
  const postures = a?.postures || "natural relaxed body language";
  const grain = a?.grain || "premium editorial grain";
  const refs = a?.references_implicites?.length
    ? a.references_implicites.join(", ")
    : "Sézane × A.P.C. × Émoï-Émoï";
  const COPYRIGHT_DISCLAIMER = "${COPYRIGHT_DISCLAIMER}";

  return {
    GHOST: fallbackPack.GHOST,
    CROP: fallbackPack.CROP,
    MACRO: fallbackPack.MACRO,
    LIFESTYLE: {
      label: "Lifestyle",
      prompt:
        `Generate an image of: Editorial fashion photography, an ultra-realistic, imperfect human model (visible pores, natural skin texture, freckles, natural/messy hair, not a perfect celebrity, age-appropriate features) in ${scene}. ` +
        `Wearing a premium [PRODUIT] in [COULEUR SWEAT] ([MATERIAL]). The attached motif is embroidered in [COULEUR FIL] thread on the [EMPLACEMENT] (max [DIMENSION]). ` +
        `Recurring props/details: ${props}. Body language: ${postures}. Photographic grain: ${grain}. Visual references: ${refs}.\n` +
        `Niveau vrai shooting photo professionnel premium. Photos lifestyle très émotionnelles, vivantes et ultra-réalistes.\n` +
        `Objectif 50mm ou 85mm, profondeur de champ douce, rendu éditorial premium de très haute qualité.\n` +
        `ATTENTION : La broderie doit être EXTRÊMEMENT PLATE, SANS AUCUN RELIEF, SANS EFFET 3D NI GONFLÉ. Rendu 100% plat, lisse et ultra-réaliste, intégré au tissu sans surépaisseur.\n` +
        `IMPORTANT : Plan large ou plein corps uniquement. AUCUN zoom sur la broderie, la broderie doit rester un détail discret dans la composition globale.${COPYRIGHT_DISCLAIMER}`,
    },
    DUO: {
      label: "Duo Éditorial",
      prompt:
        `Generate an image of: Editorial fashion photography, two ultra-realistic, imperfect human models (visible pores, natural skin texture, freckles, natural/messy hair, not perfect celebrities, age-appropriate features) sharing a candid moment together in ${scene}. ` +
        `Both wearing matching premium [PRODUIT]s in [COULEUR SWEAT] ([MATERIAL]), with the attached motif embroidered in [COULEUR FIL] thread on the [EMPLACEMENT] (max [DIMENSION]). Both embroidery motifs clearly visible but extremely flat and realistic. ` +
        `Recurring props: ${props}. Body language: ${postures}. Photographic grain: ${grain}. Visual references: ${refs}.\n` +
        `Niveau vrai shooting photo professionnel, ultra-réaliste, très émotionnel.\n` +
        `ATTENTION : La broderie doit être EXTRÊMEMENT PLATE, SANS AUCUN RELIEF, SANS EFFET 3D NI GONFLÉ.${COPYRIGHT_DISCLAIMER}`,
    },
    PORTRAIT: {
      label: "Portrait Mi-Corps",
      prompt:
        `Generate an image of: Photography of an ultra-realistic, imperfect human model (visible pores, natural skin texture, freckles, natural/messy hair, not a perfect celebrity, age-appropriate features) in ${scene}, ` +
        `wearing a premium [PRODUIT] in [COULEUR SWEAT] ([MATERIAL]). The attached motif is embroidered in [COULEUR FIL] thread on the [EMPLACEMENT] (max [DIMENSION]). The model looks at the camera or slightly off-camera with a warm, authentic expression. ` +
        `Body language: ${postures}. Photographic grain: ${grain}. Visual references: ${refs}.\n` +
        `Photographie professionnelle premium, niveau vrai shooting photo. Esthétique chic, émotionnelle et ultra-authentique.\n` +
        `ATTENTION : La broderie doit être EXTRÊMEMENT PLATE, SANS AUCUN RELIEF, SANS EFFET 3D NI GONFLÉ.${COPYRIGHT_DISCLAIMER}`,
    },
  };
}

/**
 * Reconstitue un { short, full } prompt EN à partir de l'ambiance_extraite
 * d'un lookbook — même format que DECOR_DESCRIPTIONS pour pouvoir l'injecter
 * en place dans le pipeline Gemini existant.
 */
export function buildDecorFromLookbookAmbiance(
  lb: ActiveLookbookAmbiance
): { short: string; full: string } {
  const a = lb.ambiance_extraite;
  if (!a) {
    return {
      short: `Editorial photography ambiance inspired by the curated lookbook "${lb.titre}".`,
      full: `Editorial photography ambiance inspired by the curated Ypersoa lookbook "${lb.titre}".`,
    };
  }

  const palette = a.palette?.length ? a.palette.join(", ") : "warm cream and natural tones";
  const lieux = a.lieux?.length ? a.lieux.join(", ") : "intimate French interior";
  const props = a.props?.length ? a.props.join(", ") : "natural curated objects";
  const refs = a.references_implicites?.length
    ? a.references_implicites.join(", ")
    : "Sézane × A.P.C. quiet luxury";

  const short =
    `Custom ambiance from lookbook "${lb.titre}" — color palette: ${palette}; setting: ${lieux}; ` +
    `lighting: ${a.lumiere || "soft natural editorial"}; grain: ${a.grain || "premium digital"}; ` +
    `postures: ${a.postures || "natural relaxed"}.`;

  const full =
    `Editorial scene built from the curated Ypersoa lookbook "${lb.titre}". ` +
    `Color palette dominated by ${palette}. ` +
    `Setting: ${lieux}. ` +
    `Recurring props: ${props}. ` +
    `Lighting: ${a.lumiere || "soft natural editorial light"}. ` +
    `Photographic grain: ${a.grain || "premium digital with subtle organic texture"}. ` +
    `Body language and energy: ${a.postures || "natural, relaxed, present, never posed"}. ` +
    `Visual references: ${refs}. ` +
    `Maintain Ypersoa quiet-luxury embroidery aesthetic — no logos, no visible text in the environment, real skin texture, no retouching.`;

  return { short, full };
}
