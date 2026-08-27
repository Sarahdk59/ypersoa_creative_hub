-- Atelier Production — bucket `commandes-broderies` (27/08/2026)
--
-- Fichiers attachés à une broderie précise d'une commande : visuel attendu
-- (png/jpg), fichier machine (pxf/dst), ou PDF (sortie du moteur d'attribution
-- ou capture d'une demande client). Utilisé par
-- POST/DELETE /api/production/commandes/[id]/articles/[articleId]/broderies/[index]/file.
--
-- Contrairement à `commandes-pdf` (créé manuellement le 28/05/2026, policy
-- UPDATE ajoutée après coup le 25/08 suite à un bug d'upsert), le bucket et
-- ses 4 policies sont créés ensemble ici pour ne pas reproduire le trou.

insert into storage.buckets (id, name, public)
values ('commandes-broderies', 'commandes-broderies', true)
on conflict (id) do nothing;

drop policy if exists "v1_anon_read_commandes_broderies_bucket" on storage.objects;
create policy "v1_anon_read_commandes_broderies_bucket" on storage.objects
  for select to anon, authenticated using (bucket_id = 'commandes-broderies');

drop policy if exists "v1_anon_write_commandes_broderies_bucket" on storage.objects;
create policy "v1_anon_write_commandes_broderies_bucket" on storage.objects
  for insert to anon, authenticated with check (bucket_id = 'commandes-broderies');

drop policy if exists "v1_anon_update_commandes_broderies_bucket" on storage.objects;
create policy "v1_anon_update_commandes_broderies_bucket" on storage.objects
  for update to anon, authenticated using (bucket_id = 'commandes-broderies');

drop policy if exists "v1_anon_delete_commandes_broderies_bucket" on storage.objects;
create policy "v1_anon_delete_commandes_broderies_bucket" on storage.objects
  for delete to anon, authenticated using (bucket_id = 'commandes-broderies');
