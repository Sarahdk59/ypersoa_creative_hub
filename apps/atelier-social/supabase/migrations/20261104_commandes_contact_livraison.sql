-- Atelier Production — packing list (04/11/2026)
-- Contact client (mail + téléphone) et mode de livraison (transporteur, locker /
-- point relais / domicile, n° de suivi) au niveau de la commande.
alter table commandes add column if not exists contact   jsonb;
alter table commandes add column if not exists livraison jsonb;
