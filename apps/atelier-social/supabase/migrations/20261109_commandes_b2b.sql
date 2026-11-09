-- Atelier Production — commandes B2B (09/11/2026)
-- 1. Nouveau canal de vente `b2b` (devis We Are Perso validés, clients pro).
-- 2. Dossier de commande : fichiers graphiques clients (AI, EPS, SVG, PSD, ZIP)
--    et mails (.eml / .msg), stockés en application/octet-stream (déjà autorisé),
--    souvent lourds → limite du bucket portée de 20 à 50 Mo par fichier.
alter type commande_source add value if not exists 'b2b';

update storage.buckets
   set file_size_limit = 52428800
 where id = 'commandes-pdf';
