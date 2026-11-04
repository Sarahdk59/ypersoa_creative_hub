-- Atelier Production — table `motifs_ypm` + bucket `motifs-prod-files` (04/11/2026)
--
-- Remplace le stockage fichier referentiels/motifs/motifs_ypm.json et
-- assets/motifs pxf|dst|png|ft/ (perdus à chaque redeploy Railway, disque
-- éphémère) — même panne que les commandes (cf. 20260930_commandes.sql),
-- découverte après la perte des commandes post-27/09 lors du déploiement du
-- 22/10. Les motifs créés/édités via le Hub (Nouveau motif, variantes,
-- bible, catalogue, fichiers prod buste/poignet) ne survivaient pas à un
-- déploiement.
--
-- `data` jsonb porte tout le contenu du motif sauf prod_files, qui reste
-- calculé dynamiquement (désormais depuis le bucket Storage plutôt que le
-- disque, même logique de clé `{motif_id}-{key}.{ext}`). Les images hero/
-- variante (PNG) restent sur le bucket `motifs-png` existant, déjà
-- persistant — seule la métadonnée JSON et les fichiers prod machine
-- (PXF/DST/FT + preview PNG) manquaient de persistance.

create table motifs_ypm (
  id         text primary key,  -- ex. "YPM-018"
  data       jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_motifs_ypm_updated_at on motifs_ypm;
create trigger trg_motifs_ypm_updated_at
  before update on motifs_ypm
  for each row execute function update_updated_at_column();

alter table motifs_ypm enable row level security;
create policy "motifs_ypm read" on motifs_ypm for select using (true);
create policy "motifs_ypm write" on motifs_ypm for all using (true) with check (true);

insert into storage.buckets (id, name, public)
values ('motifs-prod-files', 'motifs-prod-files', true)
on conflict (id) do nothing;

drop policy if exists "v1_anon_read_motifs_prod_files_bucket" on storage.objects;
create policy "v1_anon_read_motifs_prod_files_bucket" on storage.objects
  for select to anon, authenticated using (bucket_id = 'motifs-prod-files');

drop policy if exists "v1_anon_write_motifs_prod_files_bucket" on storage.objects;
create policy "v1_anon_write_motifs_prod_files_bucket" on storage.objects
  for insert to anon, authenticated with check (bucket_id = 'motifs-prod-files');

drop policy if exists "v1_anon_update_motifs_prod_files_bucket" on storage.objects;
create policy "v1_anon_update_motifs_prod_files_bucket" on storage.objects
  for update to anon, authenticated using (bucket_id = 'motifs-prod-files');

drop policy if exists "v1_anon_delete_motifs_prod_files_bucket" on storage.objects;
create policy "v1_anon_delete_motifs_prod_files_bucket" on storage.objects
  for delete to anon, authenticated using (bucket_id = 'motifs-prod-files');
