-- Atelier Production — table `commandes` (30/09/2026)
--
-- Remplace le stockage fichier referentiels/commandes/*.json (perdu à chaque
-- redeploy Railway, disque éphémère). Colonnes normalisées pour les besoins
-- de tri/recherche/bilan ; le reste (adresses, articles/broderies, planning,
-- journal, rework, bon PDF) reste en jsonb pour ne pas réécrire
-- recalculerDureesCommande() ni le système de types imbriqués existant.

create type commande_statut as enum
  ('a_planifier','planifiee','en_cours','terminee','expediee','archivee');
create type commande_priorite as enum ('normale','urgente');
create type commande_source as enum ('shopify','etsy','manuel');

create table commandes (
  id                       text primary key,  -- id métier existant (ex. "1002", "4182262557", "1002-R1")
  numero_shopify           text not null,
  source                   commande_source not null default 'manuel',
  date_commande            date not null,
  date_impression_bon      date,
  statut                   commande_statut not null default 'a_planifier',
  priorite                 commande_priorite not null default 'normale',

  client_nom               text,
  client_ville             text,
  client_code_postal       text,
  montant_total_ttc        numeric(10,2),
  devise                   text not null default 'EUR',
  duree_total_min          integer not null default 0,
  nb_changements_fil_total integer not null default 0,

  expedition               jsonb not null default '{}',
  facturation              jsonb not null default '{}',
  articles                 jsonb not null default '[]',
  planning                 jsonb,
  journal                  jsonb,
  rework_de                jsonb,
  bon_preparation_pdf      jsonb,
  notes                    text,

  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);

create index idx_commandes_statut on commandes(statut);
create index idx_commandes_date_commande on commandes(date_commande desc);
create index idx_commandes_source on commandes(source);

drop trigger if exists trg_commandes_updated_at on commandes;
create trigger trg_commandes_updated_at
  before update on commandes
  for each row execute function update_updated_at_column();

alter table commandes enable row level security;
create policy "commandes read" on commandes for select using (true);
create policy "commandes write" on commandes for all using (true) with check (true);
