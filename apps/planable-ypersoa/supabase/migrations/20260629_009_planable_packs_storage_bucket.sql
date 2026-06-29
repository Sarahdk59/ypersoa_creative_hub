-- Planable Ypersoa — bucket Storage `planable-packs` (29/06/2026)
-- Pont « Envoyer vers Planable » depuis le Shooting Book : les visuels Gemini
-- (rendus base64, non persistés côté atelier-social) sont uploadés ici puis
-- attachés comme slides au pack de l'entrée (cf. /api/calendar/[id]/attach-image).
-- Bucket public (URLs persistantes, survivent aux redéploiements), RLS V1 permissive.

insert into storage.buckets (id, name, public)
values ('planable-packs', 'planable-packs', true)
on conflict (id) do update set public = true;

drop policy if exists "v1_anon_read_planable_packs_bucket" on storage.objects;
drop policy if exists "v1_anon_write_planable_packs_bucket" on storage.objects;
drop policy if exists "v1_anon_delete_planable_packs_bucket" on storage.objects;

create policy "v1_anon_read_planable_packs_bucket" on storage.objects
  for select to anon, authenticated using (bucket_id = 'planable-packs');
create policy "v1_anon_write_planable_packs_bucket" on storage.objects
  for insert to anon, authenticated with check (bucket_id = 'planable-packs');
create policy "v1_anon_delete_planable_packs_bucket" on storage.objects
  for delete to anon, authenticated using (bucket_id = 'planable-packs');
