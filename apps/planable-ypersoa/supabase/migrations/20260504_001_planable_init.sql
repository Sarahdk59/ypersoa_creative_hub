-- Planable Ypersoa V1.0 — schema init
-- Tables : planable_occasions, planable_packs, planable_calendar_entries, planable_post_metrics
-- Préfixe `planable_` pour cohabiter avec les tables atelier-social/lookbook (liked_shots, lookbooks, social_packs).
-- Appliqué via MCP Supabase le 2026-05-04 sur projet ypersoa-hub (frvhjjijoccqreidyucp).

create type planable_platform as enum (
  'instagram_post',
  'instagram_reel',
  'instagram_story',
  'pinterest_pin'
);

create type planable_entry_status as enum (
  'draft',
  'pack_generated',
  'scheduled',
  'published',
  'failed'
);

create type planable_media_format as enum ('1:1', '4:5', '9:16', '2:3');

create table planable_occasions (
  slug text primary key,
  name_fr text not null,
  date_strategy text not null,
  campaign_lead_days int not null default 30,
  lead_days int not null default 10,
  recommended_motifs text[] not null default '{}',
  recommended_casting text[] not null default '{}',
  recommended_duos text[] not null default '{}',
  hashtags_brand text[] not null default '{}',
  notes text,
  auto_campaign_disabled_year int,
  created_at timestamptz default now()
);

create table planable_packs (
  id uuid primary key default gen_random_uuid(),
  motif_code text not null,
  ambiance_id int not null check (ambiance_id between 1 and 5),
  casting_ids text[] not null,
  format planable_media_format not null,
  slides jsonb not null,
  caption text not null,
  hashtags text[] not null,
  brand_safety_status text not null default 'ok',
  brand_safety_issues jsonb,
  generated_at timestamptz default now()
);

create table planable_calendar_entries (
  id uuid primary key default gen_random_uuid(),
  scheduled_at timestamptz not null,
  platform planable_platform not null,
  motif_code text not null,
  occasion_slug text references planable_occasions(slug),
  format planable_media_format not null,
  status planable_entry_status not null default 'draft',
  pack_id uuid references planable_packs(id),
  meta_media_id text,
  meta_permalink text,
  notes text,
  created_by text default 'sarah',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_planable_calendar_scheduled on planable_calendar_entries(scheduled_at);
create index idx_planable_calendar_status on planable_calendar_entries(status);
create index idx_planable_calendar_occasion on planable_calendar_entries(occasion_slug);

create or replace function planable_set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger planable_calendar_updated_at
  before update on planable_calendar_entries
  for each row execute function planable_set_updated_at();

create table planable_post_metrics (
  id uuid primary key default gen_random_uuid(),
  calendar_entry_id uuid not null references planable_calendar_entries(id) on delete cascade,
  meta_media_id text not null,
  likes int default 0,
  comments int default 0,
  saves int default 0,
  shares int default 0,
  reach int default 0,
  impressions int default 0,
  fetched_at timestamptz default now()
);

create index idx_planable_metrics_entry on planable_post_metrics(calendar_entry_id);

alter table planable_occasions enable row level security;
alter table planable_packs enable row level security;
alter table planable_calendar_entries enable row level security;
alter table planable_post_metrics enable row level security;

create policy planable_occasions_all on planable_occasions for all using (true);
create policy planable_packs_all on planable_packs for all using (true);
create policy planable_calendar_all on planable_calendar_entries for all using (true);
create policy planable_metrics_all on planable_post_metrics for all using (true);
