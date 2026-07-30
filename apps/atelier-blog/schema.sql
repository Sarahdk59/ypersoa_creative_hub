-- ============================================================================
-- Hub Ypersoa — Module générateur d'articles GEO
-- Migration : 001_geo_generator
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. BACKLOG DE REQUÊTES  (= le classeur de suivi de visibilité IA, en base)
-- ---------------------------------------------------------------------------
create type geo_category as enum (
  'entite', 'defensif_marque', 'achat_generique', 'achat_local',
  'longue_traine', 'pre_achat', 'editorial', 'positionnement'
);

create type geo_conversion_goal as enum (
  'club',            -- capture email via lead magnet
  'defensif_marque',   -- réassurance avant achat
  'occasion',          -- page cadeau / occasion
  'aucun'              -- => le gate refusera
);

create type geo_engine_state as enum (
  'oui_1', 'oui', 'partiel', 'non', 'a_tester'
);

create table geo_queries (
  id               uuid primary key default gen_random_uuid(),
  query            text not null unique,
  category         geo_category not null,
  intention        text,
  -- Molesse de la SERP, notée à la main de 1 (verrouillée par de gros acteurs) à 5 (vide).
  -- Le gate exige >= 3.
  serp_softness    smallint check (serp_softness between 1 and 5),
  conversion_goal  geo_conversion_goal not null default 'aucun',
  priority         text check (priority in ('P0','P1','P2')),

  -- état par moteur (miroir du classeur)
  state_chatgpt    geo_engine_state default 'a_tester',
  state_claude     geo_engine_state default 'a_tester',
  state_gemini     geo_engine_state default 'a_tester',
  state_perplexity geo_engine_state default 'a_tester',

  competitors      text[],
  source_type      text,
  notes            text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index geo_queries_eligible_idx
  on geo_queries (priority, serp_softness desc)
  where serp_softness >= 3 and conversion_goal <> 'aucun';

-- ---------------------------------------------------------------------------
-- 2. FAITS PRODUIT VÉRIFIÉS  (le modèle ne peut rien affirmer hors de cette table)
-- ---------------------------------------------------------------------------
create table geo_brand_facts (
  id         uuid primary key default gen_random_uuid(),
  topic      text not null,          -- 'delais', 'fil', 'atelier', 'livraison', 'tailles'
  fact       text not null,          -- formulation exacte réutilisable telle quelle
  is_active  boolean not null default true,
  created_at timestamptz not null default now()
);

insert into geo_brand_facts (topic, fact) values
  ('atelier',   'La broderie est réalisée dans notre atelier à Wattrelos, dans les Hauts-de-France.'),
  ('production','Chaque pièce est brodée à la commande, après validation, ce qui évite le surstock.'),
  ('technique', 'Ypersoa ne travaille que la broderie : le motif est cousu dans le tissu, il ne s''écaille pas et ne se décolle pas au lavage.'),
  ('delais',    'Les délais de fabrication annoncés sont de 5 à 11 jours ouvrés selon le modèle.'),
  ('fil',       'La personnalisation couvre la couleur du vêtement et la couleur du fil, avec 9 coloris de fil au choix.'),
  ('perso',     'Le client choisit son texte, sa typographie et la couleur de fil ; les limites de caractères garantissent un rendu net.'),
  ('controle',  'Chaque broderie est vérifiée avant validation de la commande.');

-- ---------------------------------------------------------------------------
-- 3. RÈGLES DE VOCABULAIRE  (éditables sans redéploiement)
-- ---------------------------------------------------------------------------
create type geo_vocab_kind as enum ('forbidden', 'required');

create table geo_vocab_rules (
  id         uuid primary key default gen_random_uuid(),
  kind       geo_vocab_kind not null,
  pattern    text not null,      -- regex, insensible à la casse côté applicatif
  label      text not null,      -- message affiché au lint
  is_active  boolean not null default true
);

-- Vocabulaire interdit : matériel et jargon technique = INTERNE UNIQUEMENT
insert into geo_vocab_rules (kind, pattern, label) values
  ('forbidden', 'tajima',                                  'Nom de matériel — interne uniquement'),
  ('forbidden', 'm[ée]tier\s+[àa]\s+broder',               'Nom de matériel — interne uniquement'),
  ('forbidden', 'broderie\s+sur\s+m[ée]tier',              'Jargon technique — interne uniquement'),
  ('forbidden', 'machine\s+(industrielle|[àa]\s+broder)',  'Matériel industriel — interne uniquement'),
  ('forbidden', 'broderie\s+machine',                      'Jargon technique — interne uniquement'),
  ('forbidden', 'brodeuse\s+industrielle',                 'Matériel industriel — interne uniquement'),
  ('forbidden', 'fait[\s-]main',                           'Hors charte : dire "brodé à la commande"'),
  ('forbidden', 'handmade',                                'Hors charte : dire "brodé à la commande"'),
  ('forbidden', 'cousu\s+main',                            'Hors charte : dire "cousu pour durer"'),
  -- pas de référence concurrent en copy public
  ('forbidden', 'lille[\s-]broderie',                      'Référence concurrent'),
  ('forbidden', 'maison\s+labiche',                        'Référence concurrent'),
  ('forbidden', 'tunetoo',                                 'Référence concurrent'),
  ('forbidden', 'printful',                                'Référence concurrent'),
  ('forbidden', 'spreadshirt',                             'Référence concurrent'),
  ('forbidden', 'ralph\s+lauren',                          'Référence à exclure');

-- Vocabulaire requis : au moins 2 occurrences distinctes attendues
insert into geo_vocab_rules (kind, pattern, label) values
  ('required', 'brod[ée]\s+[àa]\s+la\s+commande', 'Argumentaire : à la commande'),
  ('required', 'brod[ée]\s+en\s+France',          'Argumentaire : fabrication française'),
  ('required', 'cousu\w*\s+pour\s+durer',         'Argumentaire : durabilité'),
  ('required', 'personnalis',                     'Argumentaire : personnalisation'),
  ('required', 'Hauts[\s-]de[\s-]France',         'Argumentaire : ancrage régional');

-- ---------------------------------------------------------------------------
-- 4. ARTICLES GÉNÉRÉS
-- ---------------------------------------------------------------------------
create type geo_article_status as enum (
  'gate_rejected', 'lint_failed', 'ready_for_review', 'approved', 'published', 'archived'
);

create table geo_articles (
  id            uuid primary key default gen_random_uuid(),
  query_id      uuid references geo_queries(id) on delete set null,
  target_query  text not null,
  angle         text not null,
  status        geo_article_status not null default 'ready_for_review',
  version       smallint not null default 1,

  payload       jsonb not null,        -- JSON canonique renvoyé par le modèle
  lint_report   jsonb,                 -- { passed, errors[], warnings[] }
  html_shopify  text,
  faq_jsonld    jsonb,

  model         text,
  word_count    integer,
  created_at    timestamptz not null default now(),
  reviewed_at   timestamptz,
  published_url text
);

create index geo_articles_status_idx on geo_articles (status, created_at desc);
create unique index geo_articles_query_version_idx on geo_articles (target_query, version);

-- ---------------------------------------------------------------------------
-- 5. GARDE-FOU QUOTA : max 3 articles générés par semaine glissante
-- ---------------------------------------------------------------------------
create or replace function geo_weekly_quota_guard()
returns trigger
language plpgsql
as $$
declare
  recent_count integer;
begin
  select count(*) into recent_count
  from geo_articles
  where created_at > now() - interval '7 days'
    and status <> 'gate_rejected';

  if recent_count >= 3 then
    raise exception
      'Quota hebdomadaire atteint (3 articles / 7 jours). Garde-fou volontaire : privilégier la qualité et l''outreach sources tierces.';
  end if;

  return new;
end;
$$;

create trigger geo_articles_quota
  before insert on geo_articles
  for each row execute function geo_weekly_quota_guard();

-- ---------------------------------------------------------------------------
-- 6. RLS
-- ---------------------------------------------------------------------------
alter table geo_queries     enable row level security;
alter table geo_brand_facts enable row level security;
alter table geo_vocab_rules enable row level security;
alter table geo_articles    enable row level security;

create policy geo_queries_auth     on geo_queries     for all to authenticated using (true) with check (true);
create policy geo_brand_facts_auth on geo_brand_facts for all to authenticated using (true) with check (true);
create policy geo_vocab_rules_auth on geo_vocab_rules for all to authenticated using (true) with check (true);
create policy geo_articles_auth    on geo_articles    for all to authenticated using (true) with check (true);
