export type LookbookStatut = "brouillon" | "active" | "archive";

export type ImageFamille =
  | "canonique_humain"
  | "scene_large"
  | "texture_detail"
  | "objet_prop"
  | "atmosphere";

export interface AmbianceExtraite {
  palette: string[];
  lieux: string[];
  props: string[];
  lumiere: string;
  grain: string;
  postures: string;
  references_implicites: string[];
}

export interface LookbookImage {
  id: string;
  lookbook_id: string;
  position: number;
  famille: ImageFamille;
  canonique_injecte: string | null;
  prompt_en: string;
  image_url: string | null;
  image_storage_path: string | null;
  valide: boolean;
  annotation_sarah: string | null;
  created_at: string;
}

export interface Lookbook {
  id: string;
  created_at: string;
  updated_at: string;
  brief_original: string;
  titre: string;
  slug: string;
  statut: LookbookStatut;
  date_activation: string | null;
  date_archivage: string | null;
  tags: string[];
  canoniques_inclus: string[];
  ambiance_extraite: AmbianceExtraite | null;
  is_favorite: boolean;
  llm_model_used: string | null;
  generation_meta: Record<string, unknown> | null;
}

/** Output JSON attendu de gpt-5 / gpt-4o pour la décomposition d'un brief. */
export interface DecompositionLLM {
  titre: string;
  slug: string;
  tags: string[];
  ambiance_extraite: AmbianceExtraite;
  prompts: Array<{
    famille: ImageFamille;
    canonique_injecte: string | null;
    prompt_en: string;
  }>;
}
