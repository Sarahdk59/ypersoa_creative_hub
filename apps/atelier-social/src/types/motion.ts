/**
 * Atelier Motion — types.
 *
 * 3 modes de génération vidéo :
 *  - reel       : Reel Insta narratif depuis une Collection Shooting (multi-clips)
 *  - ambiance   : ambiance vidéo lookbook (1 clip, pas de mannequin)
 *  - packshot   : motion packshot (rotation/swing/zoom, pas de mannequin)
 *
 * Cf. apps/atelier-motion/ARCHITECTURE.md pour le contexte historique.
 */

export type MotionMode = "reel" | "ambiance" | "packshot";

export type MotionEngine = "omni-flash" | "veo-3.1" | "stub";

export type MotionJobStatut =
  | "en_attente" // job créé, pas encore lancé
  | "en_cours" // appel API en cours
  | "termine" // tous les clips OK
  | "partiel" // certains clips OK, d'autres en échec
  | "echec"; // tous les clips en échec

export type ClipStatut = "en_attente" | "en_cours" | "genere" | "echec";

export type ReelFormat = "court" | "complet";

/** Type de plan de Reel (mode reel). Reprend les tags Atelier Shooting. */
export type ShotType =
  | "MACRO BRODERIE"
  | "PORTRAIT ÉDITORIAL"
  | "LIFESTYLE MODE"
  | "LIFESTYLE EXTÉRIEUR"
  | "SCÈNE LARGE"
  | "TEXTURE / DÉTAIL"
  | "OBJET / PROP"
  | string; // ouvert (les tags shooting peuvent évoluer)

export interface ClipPlan {
  ordre: number;
  shot_type: ShotType;
  asset_sujet_url: string; // image input principale
  asset_style_url?: string; // image style optionnelle (lookbook)
  prompt_mouvement: string;
  duree_sec: number; // 4 | 8 | 12 selon engine et mode
  clip_url: string | null; // mp4 généré (data URL en stub, URL signée en réel)
  statut: ClipStatut;
  erreur?: string;
}

export interface MotionJob {
  id: string;
  code: string; // MOT-001 (lisible)
  mode: MotionMode;
  engine: MotionEngine;
  /** Reel : "court" | "complet". Autres modes : non utilisé. */
  format?: ReelFormat;
  /** ID source selon mode :
   *  - reel     : Collection id de l'Atelier Shooting
   *  - ambiance : Lookbook id (ou Media id de la médiathèque)
   *  - packshot : Media id de la médiathèque (packshot)
   */
  source_id: string;
  source_label: string;
  /** Lookbook id optionnel pour mode reel (image style). */
  lookbook_id?: string | null;
  /** Description libre saisie par Sarah (sert au prompt final). */
  brief?: string | null;
  /** Statut workflow. */
  statut: MotionJobStatut;
  clips: ClipPlan[];
  duree_totale_sec: number;
  brand_safety_ok: boolean;
  brand_safety_message?: string | null;
  a_faire_manuel: string[];
  created_at: string;
  updated_at: string;
}

export interface CreateMotionJobInput {
  mode: MotionMode;
  engine?: MotionEngine;
  format?: ReelFormat;
  source_id: string;
  lookbook_id?: string | null;
  brief?: string;
}

export interface MotionJobListResponse {
  data: Array<Pick<MotionJob, "id" | "code" | "mode" | "engine" | "statut" | "source_label" | "duree_totale_sec" | "clips" | "created_at">>;
  meta: { total: number };
}

// ─── Source data (lue depuis le Hub) ───────────────────────────────────────

export interface MotionSourcePackshot {
  type: "packshot";
  id: string; // media_id
  label: string;
  public_url: string;
}

export interface MotionSourceLookbook {
  type: "lookbook";
  id: string;
  label: string;
  public_url: string;
}

export interface MotionSourceCollection {
  type: "collection";
  id: string;
  label: string;
  shots: Array<{
    id: string;
    shot_type: ShotType;
    public_url: string;
    ordre: number;
  }>;
}

export interface MotionSourceLikedShot {
  type: "liked-shot";
  id: string;
  label: string;
  public_url: string;
  origin?: string; // "shooting" | "social" | autre
  liked_at?: string;
}

export interface MotionSourceCanonique {
  type: "canonique";
  id: string; // MAN-P01
  label: string; // "Clémence"
  public_url: string;
  favorite?: boolean;
}

export interface MotionSourceMedia {
  type: "media";
  id: string; // media_id (médiathèque)
  label: string;
  public_url: string;
}

export type MotionSource =
  | MotionSourcePackshot
  | MotionSourceLookbook
  | MotionSourceCollection
  | MotionSourceLikedShot
  | MotionSourceCanonique
  | MotionSourceMedia;

/** Origine d'une source (pour grouper dans le sélecteur). */
export type SourceOrigin =
  | "collection"
  | "lookbook"
  | "packshot"
  | "liked-shot"
  | "canonique"
  | "media";

export const SOURCE_ORIGIN_LABELS: Record<SourceOrigin, string> = {
  collection: "Collections Shooting",
  lookbook: "Lookbooks & Ambiances",
  packshot: "Packshots",
  "liked-shot": "Visuels likés ❤",
  canonique: "Casting canoniques",
  media: "Médiathèque",
};

export const MODE_LABELS: Record<MotionMode, string> = {
  reel: "Reel Insta animé",
  ambiance: "Ambiance vidéo lookbook",
  packshot: "Motion packshot",
};

export const MODE_DESCRIPTIONS: Record<MotionMode, string> = {
  reel: "Reel narratif 9:16 depuis une collection Atelier Shooting. Sélection automatique : MACRO BRODERIE en hook + LIFESTYLE + PORTRAIT + clôture. 4 clips × 8s = 32s.",
  ambiance: "1 clip 9:16 d'ambiance à partir d'une image lookbook (vent, lumière qui tourne, respiration textile). Pas de mannequin. 8-12s.",
  packshot: "1 clip 9:16 depuis un packshot statique : rotation lente, swing du tissu, ou zoom sur la broderie. 6-8s. Idéal e-commerce.",
};

export const ENGINE_LABELS: Record<MotionEngine, string> = {
  "omni-flash": "Gemini Omni Flash (preview)",
  "veo-3.1": "Veo 3.1 (stable)",
  stub: "Stub (sans API)",
};

export const STATUT_LABELS: Record<MotionJobStatut, string> = {
  en_attente: "En attente",
  en_cours: "En cours",
  termine: "Terminé",
  partiel: "Partiel",
  echec: "Échec",
};

export const STATUT_COLORS: Record<MotionJobStatut, { bg: string; fg: string }> = {
  en_attente: { bg: "#E8E1D6", fg: "#5A5A5A" },
  en_cours: { bg: "#D7E5F0", fg: "#2E4D6E" },
  termine: { bg: "#D7E5DA", fg: "#365D40" },
  partiel: { bg: "#F3E0C5", fg: "#8A5A1E" },
  echec: { bg: "#FAEBE8", fg: "#7C2A24" },
};
