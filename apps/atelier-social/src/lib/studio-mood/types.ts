export type StatutEpisode = "brouillon" | "ready" | "tourne" | "monte" | "publie";

export type SupportType = "sweat" | "tshirt" | "casquette" | "accessoire";

export interface StudioMoodEpisode {
  id: string;
  titre: string;
  humeur: string;
  mot_brode: string;
  motif_ypm_id: string | null;
  motif_ypm_nom: string | null;
  support: SupportType;
  couleur_produit: string | null;
  decor: string | null;
  occasion: string | null;
  ampli_saisonnier: string | null;
  hook: string | null;
  legende_question: string | null;
  hashtags: string[];
  statut: StatutEpisode;
  assets_avatar: string | null;
  assets_variante_vetement: string | null;
  assets_autres: string[];
  storyboard_md: string | null;
  storyboard_exported_at: string | null;
  created_at: string;
  updated_at: string;
}

export type EpisodeInsert = Omit<
  StudioMoodEpisode,
  "id" | "created_at" | "updated_at" | "storyboard_md" | "storyboard_exported_at"
>;

export type EpisodePatch = Partial<EpisodeInsert> & {
  storyboard_md?: string | null;
  storyboard_exported_at?: string | null;
};

export interface GeneratedCopy {
  hook: string;
  legende_question: string;
  hashtags: string[];
  source: "anthropic" | "openai" | "fallback";
  brand_safe: boolean;
  violations: string[];
}

export interface StoryboardFrame {
  index: number;
  label: string;
  duree_s: string;
  description: string;
  note_montage: string;
}

export interface Storyboard {
  episode_id: string;
  titre: string;
  humeur: string;
  mot_brode: string;
  motif_ypm_nom: string | null;
  support: string;
  occasion: string | null;
  decor: string | null;
  frames: StoryboardFrame[];
  hook: string;
  legende_question: string;
  hashtags: string[];
  generated_at: string;
}

export const STATUT_META: Record<
  StatutEpisode,
  { label: string; bg: string; fg: string }
> = {
  brouillon: { label: "Brouillon", bg: "#F0EDE8", fg: "#5C5248" },
  ready:     { label: "Prêt à tourner", bg: "#EAF3FD", fg: "#1E4D7B" },
  tourne:    { label: "Tourné", bg: "#FEF6E0", fg: "#7A5800" },
  monte:     { label: "Monté", bg: "#EDF8EF", fg: "#1D6130" },
  publie:    { label: "Publié", bg: "#1E6E77", fg: "#FFFFFF" },
};

export const SUPPORT_LABELS: Record<SupportType, string> = {
  sweat:      "Sweat à capuche",
  tshirt:     "T-shirt",
  casquette:  "Casquette",
  accessoire: "Accessoire",
};

export const HUMEURS_PRESETS = [
  "Tendresse",
  "Fierté",
  "Complicité",
  "Joyeux bordel",
  "Nostalgie douce",
  "Surprise",
  "Quotidien magique",
  "Espièglerie",
  "Amour assumé",
  "Retour en forme",
];

export const OCCASIONS_PRESETS = [
  "Fête des Mères",
  "Fête des Pères",
  "Fête des Grands-mères",
  "Noël",
  "Saint-Valentin",
  "Naissance",
  "Mariage",
  "Anniversaire",
  "Rentrée",
  "Été / Vacances",
  "Evergreen",
];
