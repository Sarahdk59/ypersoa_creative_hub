-- Atelier Production — dossier de commande multi-documents (04/11/2026)
-- Une commande regroupe plusieurs pièces : bon de commande, devis, BAT, bon de
-- livraison, étiquette d'expédition, autre. Les fichiers vont dans le bucket
-- `commandes-pdf`, qui accepte désormais les images (BAT et étiquettes sont
-- souvent des PNG/JPG ou des captures).
alter table commandes add column if not exists documents jsonb;

update storage.buckets
   set allowed_mime_types = array['application/pdf', 'image/png', 'image/jpeg', 'image/webp']
 where id = 'commandes-pdf';
