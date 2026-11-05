-- Atelier Social — fix RLS bucket `commandes-pdf` (25/08/2026)
--
-- Le bucket `commandes-pdf` et ses policies SELECT/INSERT/DELETE
-- (`v1_anon_read/write/delete_commandes_pdf_bucket`, anon+authenticated)
-- existaient déjà (créés 28/05/2026, hors migration trackée). Il manquait
-- la policy UPDATE. Or POST /api/production/commandes/parse-pdf uploade
-- avec `upsert: true` : si le storage_path calculé
-- (`${yyyymm}/${numero}-${filename}`) existe déjà — ré-upload du même PDF,
-- retry après une erreur de parsing, etc. — Storage fait un UPDATE au lieu
-- d'un INSERT. Sans policy UPDATE, RLS le refusait avec
-- "new row violates row-level security policy", quel que soit l'état
-- d'authentification de l'appelant.

drop policy if exists "v1_anon_update_commandes_pdf_bucket" on storage.objects;
create policy "v1_anon_update_commandes_pdf_bucket" on storage.objects
  for update to anon, authenticated using (bucket_id = 'commandes-pdf');
