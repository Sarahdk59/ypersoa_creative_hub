-- Atelier Production — Zone de test persistée en base (12/11/2026)
--
-- Remplace referentiels/zone_test.json + assets/zone-test/ : le disque Railway
-- est éphémère, chaque déploiement effaçait les tests créés en ligne et leurs
-- fichiers (DST / PXF / aperçus). Même correctif que `commandes` le 30/09.
--
-- 1 ligne = 1 test ; le test complet (phase, attribution, fichiers…) reste en
-- jsonb pour garder le type ZoneTest tel quel côté code.

create table if not exists zone_tests (
  id          text primary key,              -- ex. "test_mpmlyelcmqtc"
  data        jsonb not null,                -- ZoneTest complet
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

drop trigger if exists trg_zone_tests_updated_at on zone_tests;
create trigger trg_zone_tests_updated_at
  before update on zone_tests
  for each row execute function update_updated_at_column();

alter table zone_tests enable row level security;
create policy "zone_tests read"  on zone_tests for select using (true);
create policy "zone_tests write" on zone_tests for all using (true) with check (true);

-- Fichiers des tests : {test_id}/{file_id}.{ext}. Servis par l'API (téléchargement
-- avec le nom d'origine), le bucket reste privé.
insert into storage.buckets (id, name, public, file_size_limit)
values ('zone-test', 'zone-test', false, 26214400)  -- 25 Mo, aligné sur la route d'upload
on conflict (id) do nothing;

drop policy if exists "v1_anon_read_zone_test_bucket" on storage.objects;
create policy "v1_anon_read_zone_test_bucket" on storage.objects
  for select to anon, authenticated using (bucket_id = 'zone-test');

drop policy if exists "v1_anon_write_zone_test_bucket" on storage.objects;
create policy "v1_anon_write_zone_test_bucket" on storage.objects
  for insert to anon, authenticated with check (bucket_id = 'zone-test');

drop policy if exists "v1_anon_update_zone_test_bucket" on storage.objects;
create policy "v1_anon_update_zone_test_bucket" on storage.objects
  for update to anon, authenticated using (bucket_id = 'zone-test');

drop policy if exists "v1_anon_delete_zone_test_bucket" on storage.objects;
create policy "v1_anon_delete_zone_test_bucket" on storage.objects
  for delete to anon, authenticated using (bucket_id = 'zone-test');
