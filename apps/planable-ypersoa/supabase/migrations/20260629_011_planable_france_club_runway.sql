-- Planable Ypersoa — France Club runway à J-30 (29/06/2026)
-- Sarah veut un runway éditorial complet pour les moments DATÉS (ex. 14 juillet) :
-- 1er post à J-30, reel "moment ou jamais" à la deadline commande, post final le jour J
-- en engagement pur (trop tard pour broder). On allonge la fenêtre France Club à 30 jours.
update planable_occasions set campaign_lead_days = 30 where slug = 'france_club';
