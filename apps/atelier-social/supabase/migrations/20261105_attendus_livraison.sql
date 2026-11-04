-- Atelier Production — attendus de livraison fournisseur (05/11/2026)
--
-- Quand on commande chez un fournisseur (Ralawise, Imbretex, L-Shop…), on attend
-- une livraison sous 24/48h. L'atelier doit savoir ce qui arrive en réception.
-- On dépose la facture / le bon de livraison (PDF), le Hub extrait les lignes
-- (réf fournisseur, désignation, coloris, taille, qté, PU HT, total HT) et les
-- rattache à une réf. article Ypersoa YPxxx-CCCC-TTTT.
--
-- Si la réf. n'existe pas (article R&D jamais commandé), on la crée depuis le
-- Hub : produit et/ou couleur et/ou taille. Le disque Railway étant éphémère,
-- ces créations vivent en base, à côté de catalogue_couleurs_ajouts.

-- 1. Attendus ---------------------------------------------------------------

create table if not exists attendus_livraison (
  id                          text primary key,          -- ex. "AL-20261105-ab12"
  fournisseur                 text not null default '',
  numero_facture              text,
  numero_commande_fournisseur text,
  date_commande               date,                      -- date de commande fournisseur
  date_facture                date,
  date_livraison_prevue       date,                      -- par défaut commande + 2 jours
  statut                      text not null default 'attendu'
                              check (statut in ('attendu','recu_partiel','recu','litige')),
  total_ht                    numeric(10,2),
  total_ttc                   numeric(10,2),
  devise                      text not null default 'EUR',
  lignes                      jsonb not null default '[]',
  documents                   jsonb not null default '[]',
  notes                       text,
  recu_par                    text,
  recu_le                     date,
  created_by                  text,
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now()
);

create index if not exists idx_attendus_statut on attendus_livraison(statut);
create index if not exists idx_attendus_livraison_prevue on attendus_livraison(date_livraison_prevue);

drop trigger if exists trg_attendus_updated_at on attendus_livraison;
create trigger trg_attendus_updated_at
  before update on attendus_livraison
  for each row execute function update_updated_at_column();

alter table attendus_livraison enable row level security;
create policy "attendus read" on attendus_livraison for select using (true);
create policy "attendus write" on attendus_livraison for all using (true) with check (true);

-- 2. Base produit : créations depuis le Hub ---------------------------------

-- Produit R&D (nouvelle réf. YPxxx absente du classeur Akanea).
create table if not exists catalogue_produits_ajouts (
  ref            text primary key check (ref ~ '^YP\d{3}$'),
  ref_fabricant  text not null default '',
  libelle        text not null,
  famille        text not null default '',
  sous_famille   text not null default '',
  genre          text not null default '',
  statut         text not null default 'R&D',
  fournisseur    text,
  created_by     text,
  created_at     timestamptz not null default now()
);
alter table catalogue_produits_ajouts enable row level security;
create policy "catalogue_produits_ajouts read" on catalogue_produits_ajouts for select using (true);
create policy "catalogue_produits_ajouts insert" on catalogue_produits_ajouts for insert with check (true);

-- Taille ajoutée à un produit (code taille Akanea existant).
create table if not exists catalogue_tailles_ajouts (
  id           uuid primary key default gen_random_uuid(),
  ref_produit  text not null,
  code_taille  text not null check (code_taille ~ '^\d{4}$'),
  created_by   text,
  created_at   timestamptz not null default now(),
  unique (ref_produit, code_taille)
);
alter table catalogue_tailles_ajouts enable row level security;
create policy "catalogue_tailles_ajouts read" on catalogue_tailles_ajouts for select using (true);
create policy "catalogue_tailles_ajouts insert" on catalogue_tailles_ajouts for insert with check (true);

-- Réf. article créée depuis le Hub (produit × couleur × taille).
create table if not exists catalogue_skus_ajouts (
  ref_article   text primary key check (ref_article ~ '^YP\d{3}-\d{4}-\d{4}$'),
  ref_produit   text not null,
  code_couleur  text not null,
  code_taille   text not null,
  origine       text,          -- ex. "attendu AL-20261105-ab12 · facture OP/I036845"
  created_by    text,
  created_at    timestamptz not null default now()
);
alter table catalogue_skus_ajouts enable row level security;
create policy "catalogue_skus_ajouts read" on catalogue_skus_ajouts for select using (true);
create policy "catalogue_skus_ajouts insert" on catalogue_skus_ajouts for insert with check (true);

-- 3. Bucket des factures / bons de livraison ---------------------------------

insert into storage.buckets (id, name, public, allowed_mime_types)
values ('attendus-pdf', 'attendus-pdf', true, array['application/pdf','image/png','image/jpeg','image/webp'])
on conflict (id) do nothing;

drop policy if exists "attendus_pdf read" on storage.objects;
drop policy if exists "attendus_pdf insert" on storage.objects;
drop policy if exists "attendus_pdf update" on storage.objects;
drop policy if exists "attendus_pdf delete" on storage.objects;
create policy "attendus_pdf read" on storage.objects
  for select to anon, authenticated using (bucket_id = 'attendus-pdf');
create policy "attendus_pdf insert" on storage.objects
  for insert to anon, authenticated with check (bucket_id = 'attendus-pdf');
-- upsert: true → UPDATE si le même fichier est redéposé (cf. 20260825_commandes_pdf_bucket.sql)
create policy "attendus_pdf update" on storage.objects
  for update to anon, authenticated using (bucket_id = 'attendus-pdf');
create policy "attendus_pdf delete" on storage.objects
  for delete to anon, authenticated using (bucket_id = 'attendus-pdf');
