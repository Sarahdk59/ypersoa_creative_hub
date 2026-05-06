/**
 * Types Supabase générés automatiquement via MCP `generate_typescript_types`.
 * Projet : ypersoa-hub (frvhjjijoccqreidyucp).
 *
 * NE PAS éditer à la main — régénérer après chaque migration via MCP.
 *
 * On expose ici uniquement le subset Planable (planable_*) + helpers,
 * pour ne pas polluer avec les tables atelier-social/lookbook qui ne
 * concernent pas cette app.
 */
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type PlanablePlatform =
  | "instagram_post"
  | "instagram_reel"
  | "instagram_story"
  | "pinterest_pin";

export type PlanableEntryStatus =
  | "draft"
  | "pack_generated"
  | "scheduled"
  | "published"
  | "failed";

export type PlanableMediaFormat = "1:1" | "4:5" | "9:16" | "2:3";

export interface PlanableOccasionRow {
  slug: string;
  name_fr: string;
  date_strategy: string;
  campaign_lead_days: number;
  lead_days: number;
  recommended_motifs: string[];
  recommended_casting: string[];
  recommended_duos: string[];
  hashtags_brand: string[];
  notes: string | null;
  auto_campaign_disabled_year: number | null;
  created_at: string | null;
}

export interface PlanablePackRow {
  id: string;
  motif_code: string;
  ambiance_id: number;
  casting_ids: string[];
  format: PlanableMediaFormat;
  slides: Json;
  caption: string;
  hashtags: string[];
  brand_safety_status: string;
  brand_safety_issues: Json | null;
  generated_at: string | null;
}

export interface PlanableCalendarEntryRow {
  id: string;
  scheduled_at: string;
  platform: PlanablePlatform;
  motif_code: string;
  variante_file: string | null;
  occasion_slug: string | null;
  format: PlanableMediaFormat;
  status: PlanableEntryStatus;
  pack_id: string | null;
  meta_media_id: string | null;
  meta_permalink: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface PlanablePostMetricRow {
  id: string;
  calendar_entry_id: string;
  meta_media_id: string;
  likes: number | null;
  comments: number | null;
  saves: number | null;
  shares: number | null;
  reach: number | null;
  impressions: number | null;
  fetched_at: string | null;
}

/** Inserts (champs auto omis : id, created_at, updated_at, status default). */
export type PlanableCalendarEntryInsert = Omit<
  PlanableCalendarEntryRow,
  "id" | "created_at" | "updated_at" | "status" | "pack_id" | "meta_media_id" | "meta_permalink" | "created_by"
> & {
  status?: PlanableEntryStatus;
  pack_id?: string | null;
  meta_media_id?: string | null;
  meta_permalink?: string | null;
  notes?: string | null;
  created_by?: string;
};

export type PlanableCalendarEntryUpdate = Partial<
  Omit<PlanableCalendarEntryRow, "id" | "created_at">
>;
