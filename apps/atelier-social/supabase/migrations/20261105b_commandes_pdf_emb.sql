-- Dossier de commande : fiche technique PDF + fichier de travail Hatch (.emb).
-- Le .emb est un binaire propriétaire sans type MIME standard → stocké en
-- application/octet-stream dans le bucket `commandes-pdf`.
update storage.buckets
set allowed_mime_types = array['application/pdf', 'image/png', 'image/jpeg', 'image/webp', 'application/octet-stream']
where id = 'commandes-pdf';
