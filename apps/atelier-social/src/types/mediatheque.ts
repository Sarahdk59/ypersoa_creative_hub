/**
 * Médiathèque Ypersoa — types partagés (client + serveur).
 *
 * Cf. docs/PLAN_MEDIATHEQUE/SPEC_MEDIATHEQUE.md
 */

export type MediaSource =
  | "shooting_studio"
  | "shooting_lifestyle"
  | "ia_generation"
  | "packshot"
  | "user_content";

export type MediaStatut =
  | "a_valider"
  | "validee"
  | "publiee_shopify"
  | "archivee";

export type TagCategory =
  | "incarnation"
  | "motif"
  | "gabarit"
  | "couleur_produit"
  | "ambiance"
  | "mannequin"
  | "plan"
  | "saison"
  | "occasion"
  | "ton"
  | "custom";

export interface Tag {
  id: string;
  category: TagCategory;
  slug: string;
  label: string;
  color_hex?: string | null;
  parent_id?: string | null;
}

export interface Media {
  id: string;
  filename: string;
  storage_path: string;
  public_url: string;
  width?: number | null;
  height?: number | null;
  size_bytes?: number | null;
  mime_type?: string | null;
  source: MediaSource;
  date_shoot?: string | null;
  photographe?: string | null;
  statut: MediaStatut;
  notes?: string | null;
  uploaded_by?: string | null;
  uploaded_at: string;
  updated_at: string;
}

export interface MediaWithTags extends Media {
  tags: Tag[];
}

export type SortOrder = "date_desc" | "date_asc" | "name_asc";

export interface MediaFilters {
  tags?: string[];
  q?: string;
  source?: MediaSource;
  statut?: MediaStatut;
  page?: number;
  per_page?: number;
  sort?: SortOrder;
}

export interface MediaListResponse {
  data: MediaWithTags[];
  meta: {
    total: number;
    page: number;
    per_page: number;
    total_pages: number;
  };
}

export interface TagsByCategory {
  category: TagCategory;
  label: string;
  tags: Tag[];
}

export const TAG_CATEGORY_LABELS: Record<TagCategory, string> = {
  incarnation: "Incarnation",
  motif: "Motif",
  gabarit: "Gabarit",
  couleur_produit: "Couleur produit",
  ambiance: "Ambiance",
  mannequin: "Mannequin",
  plan: "Plan",
  saison: "Saison",
  occasion: "Occasion",
  ton: "Ton",
  custom: "Custom",
};

export const TAG_CATEGORY_ORDER: TagCategory[] = [
  "incarnation",
  "motif",
  "gabarit",
  "couleur_produit",
  "ambiance",
  "plan",
  "occasion",
  "saison",
  "ton",
  "mannequin",
  "custom",
];

export const SOURCE_LABELS: Record<MediaSource, string> = {
  shooting_studio: "Shooting studio",
  shooting_lifestyle: "Shooting lifestyle",
  ia_generation: "Génération IA",
  packshot: "Packshot",
  user_content: "User content",
};

export const STATUT_LABELS: Record<MediaStatut, string> = {
  a_valider: "À valider",
  validee: "Validée",
  publiee_shopify: "Publiée Shopify",
  archivee: "Archivée",
};

export type TagRef = `${TagCategory}:${string}`;

export function parseTagRef(ref: string): { category: TagCategory; slug: string } | null {
  const [category, slug] = ref.split(":");
  if (!category || !slug) return null;
  return { category: category as TagCategory, slug };
}
