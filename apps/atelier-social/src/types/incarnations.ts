/**
 * Incarnations Ypersoa — types partagés.
 *
 * Cf. apps/atelier-incarnation/SPEC_INCARNATIONS.md
 */

export type IncarnationStatut =
  | "concept"
  | "a_digitaliser"
  | "a_shooter"
  | "a_publier"
  | "actif"
  | "archive";

export type IncarnationTon = "tendre" | "complice" | "humour" | "affirme";

export type SymboleIncarnation =
  | "Cœur"
  | "Étoile"
  | "Trèfle"
  | "Fleur"
  | "Infini"
  | "Patte"
  | "Aucun"
  | "Custom"
  | "—";

export interface SpecBroderie {
  mot_haut: string;
  mot_bas: string;
  symbole: SymboleIncarnation | string;
  couleur_fil_defaut: string;
}

export interface Motif {
  code: string; // YPM-003
  nom: string; // "Le Club"
  famille?: string | null; // "Signes/Badges"
  description?: string | null;
  fichier_dst?: string | null;
}

export interface Incarnation {
  id: string;
  code: string; // YPI-001
  nom_commercial: string; // "MAMA CLUB"
  motif_ypm: string; // FK -> motifs.code
  variante_file?: string | null; // ex. "YPM-003-mama-club.png" — liaison vers variante motif
  spec_broderie: SpecBroderie;
  gabarits_cibles: string[]; // ["YP001","YP005","YP019"]
  collections_cibles: string[]; // ["pour-maman","fete-des-meres"]
  ton: IncarnationTon | null;
  statut: IncarnationStatut;
  description_template?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface MotifVariante {
  file: string;
  label: string;
  tags?: string[];
  destinataires?: string[];
  occasions?: string[];
  produits?: string[];
}

export interface IncarnationPhoto {
  id: string;
  gabarit: string; // "YP001"
  couleur_produit: string | null; // "creme"
  media_id: string;
  public_url: string;
  filename: string;
  width?: number | null;
  height?: number | null;
  is_hero: boolean;
  ordre: number;
  created_at: string;
}

export interface IncarnationEnriched extends Incarnation {
  motif_nom: string;
  motif_famille: string | null;
  gabarits_shootes_count: number;
  gabarits_cibles_count: number;
  photos: IncarnationPhoto[];
}

export interface IncarnationFilters {
  motif_ypm?: string;
  statut?: IncarnationStatut;
  ton?: IncarnationTon;
  gabarit?: string;
  collection?: string;
  q?: string;
  sort?: "code_asc" | "nom_asc" | "statut" | "updated_desc";
}

export interface IncarnationListResponse {
  data: IncarnationEnriched[];
  meta: { total: number };
}

export const STATUT_LABELS: Record<IncarnationStatut, string> = {
  concept: "Concept",
  a_digitaliser: "À digitaliser",
  a_shooter: "À shooter",
  a_publier: "À publier",
  actif: "Actif",
  archive: "Archivé",
};

export const STATUT_ORDER: IncarnationStatut[] = [
  "concept",
  "a_digitaliser",
  "a_shooter",
  "a_publier",
  "actif",
  "archive",
];

export const TON_LABELS: Record<IncarnationTon, string> = {
  tendre: "Tendre & sincère",
  complice: "Complice & fun",
  humour: "Humour & second degré",
  affirme: "Affirmé & statement",
};

export const TON_ORDER: IncarnationTon[] = ["tendre", "complice", "humour", "affirme"];

export const GABARITS_DISPONIBLES: Array<{ code: string; label: string }> = [
  { code: "YP001", label: "Hoodie Adulte" },
  { code: "YP004", label: "Hoodie Enfant" },
  { code: "YP005", label: "Sweat Adulte" },
  { code: "YP019", label: "T-Shirt Adulte" },
  { code: "YP020", label: "Zoodie (S)" },
  { code: "YP021", label: "Zoodie" },
];

export const SYMBOLES_DISPONIBLES: SymboleIncarnation[] = [
  "Cœur",
  "Étoile",
  "Trèfle",
  "Fleur",
  "Infini",
  "Patte",
  "Aucun",
  "Custom",
];

/**
 * Collections cibles Shopify standard (cf. collections_shopify_automatiques.md).
 * Suggestions non-exhaustives — le champ accepte n'importe quel handle libre.
 */
export const COLLECTIONS_SUGGESTIONS = [
  // Destinataires
  "pour-maman",
  "pour-papa",
  "pour-mamie",
  "pour-papi",
  "pour-soeur",
  "pour-frere",
  "pour-amie",
  "pour-amies",
  "pour-couple",
  "pour-famille",
  "pour-mariee",
  "pour-bff",
  "grands-parents",
  "nounou-maitresse",
  // Occasions
  "fete-des-meres",
  "fete-des-peres",
  "naissance",
  "anniversaire",
  "saint-valentin",
  "evjf",
  "mariage",
  "noel",
  // Thématiques
  "animaux",
  "ete",
  "voyage",
  "humour",
];

export const STATUT_COLORS: Record<IncarnationStatut, { bg: string; fg: string }> = {
  concept: { bg: "#F0E2D2", fg: "#7A5A1E" },
  a_digitaliser: { bg: "#E5DDF0", fg: "#4E3E73" },
  a_shooter: { bg: "#F3E0C5", fg: "#8A5A1E" },
  a_publier: { bg: "#D7E5F0", fg: "#2E4D6E" },
  actif: { bg: "#D7E5DA", fg: "#365D40" },
  archive: { bg: "#E8E1D6", fg: "#5A5A5A" },
};

export const TON_COLORS: Record<IncarnationTon, string> = {
  tendre: "#A76059",
  complice: "#8A9E8C",
  humour: "#C49B5C",
  affirme: "#1E2D4A",
};
