-- Planable Ypersoa — Règle des 45 jours + calendrier complet des marronniers
-- Session 2026-06-29.
--
-- 1) Ajoute `pinterest_lead_days` : Pinterest est semée TÔT (slow-burn / moteur de recherche).
--    Une pin met des semaines à remonter dans les résultats → on la publie en avance,
--    concentrée en début de runway. pinterest_lead_days ≥ campaign_lead_days.
-- 2) Recalibre les 7 occasions existantes sur la règle des 45 jours (fenêtre Instagram = J-45 → deadline).
-- 3) Seed les marronniers manquants (grands-mères/pères, merci maîtresse, rentrée univ,
--    anniversaire, saisons été/automne/hiver/printemps, Halloween, Black Friday).
--
-- Rappels :
--   deadline commande = occurrence − lead_days  (prod broderie Tajima + expé + livraison)
--   fenêtre Instagram = occurrence − campaign_lead_days → deadline (conversion)
--   fenêtre Pinterest = occurrence − pinterest_lead_days, semée sur ~3 semaines (front-load)

alter table planable_occasions
  add column if not exists pinterest_lead_days int not null default 45;

-- ── 2) Recalibrage des occasions existantes ────────────────────────────────
-- Instagram standardisé à J-45 ; Pinterest semée plus tôt sur les pics (mères/pères/Noël).

update planable_occasions set campaign_lead_days = 45, pinterest_lead_days = 45 where slug = 'saint_valentin';
update planable_occasions set campaign_lead_days = 45, pinterest_lead_days = 60 where slug = 'fete_des_meres';
update planable_occasions set campaign_lead_days = 45, pinterest_lead_days = 60 where slug = 'fete_des_peres';
update planable_occasions set campaign_lead_days = 45, pinterest_lead_days = 45 where slug = 'rentree';
update planable_occasions set campaign_lead_days = 60, pinterest_lead_days = 60 where slug = 'mariage';
update planable_occasions set campaign_lead_days = 30, pinterest_lead_days = 30 where slug = 'naissance';
update planable_occasions set campaign_lead_days = 60, pinterest_lead_days = 75 where slug = 'noel';

-- ── 3) Nouveaux marronniers ────────────────────────────────────────────────
insert into planable_occasions
  (slug, name_fr, date_strategy, campaign_lead_days, pinterest_lead_days, lead_days,
   recommended_motifs, recommended_casting, recommended_duos,
   hashtags_brand, notes, auto_campaign_disabled_year) values

-- Fête des grands-mères = 1er dimanche de mars (07/03/2027). Transmission générationnelle.
('fete_des_grands_meres', 'Fête des Grands-Mères', 'nth_sunday_of:3:1', 45, 45, 10,
  '{YPM-007, YPM-010}',
  '{MAN-P05, MAN-S19, MAN-P10}',
  '{DUO_BEATRICE_FELICIE}',
  '{#FêteDesGrandsMères, #CadeauMamie, #YPERSOA}',
  'Angle transmission mamie ↔ petite-fille. Duo Béatrice + Félicie. Deadline = J-10.',
  null),

-- Fête des grands-pères = 1er dimanche d''octobre (04/10/2026). Pendant masculin.
('fete_des_grands_peres', 'Fête des Grands-Pères', 'nth_sunday_of:10:1', 45, 45, 10,
  '{YPM-006, YPM-011}',
  '{MAN-S19, MAN-P07}',
  '{DUO_HENRI_JOSEPHINE}',
  '{#FêteDesGrandsPères, #CadeauPapy, #YPERSOA}',
  'Angle papy ↔ petits-enfants. Henri. Deadline = J-10.',
  null),

-- Merci maîtresse = fin d''année scolaire (~25/06). Cadeau enfant → enseignant·e.
('merci_maitresse', 'Merci Maîtresse / Maître', 'fixed:06-25', 45, 45, 10,
  '{YPM-008, YPM-013}',
  '{MAN-P08, MAN-P09}',
  '{}',
  '{#MerciMaîtresse, #CadeauMaîtresse, #CadeauFinAnnée, #YPERSOA}',
  'Fenêtre courte avant les vacances. Trousse/tote brodé prénom. Casting enfants Félicie + Gabin.',
  null),

-- Rentrée universitaire = mi-septembre (15/09). Jeunes adultes, cadeau départ / études.
('rentree_universitaire', 'Rentrée Universitaire', 'fixed:09-15', 45, 45, 10,
  '{YPM-013, YPM-014}',
  '{MAN-S20, MAN-S21}',
  '{}',
  '{#RentréeÉtudiante, #CadeauÉtudiant, #YPERSOA}',
  'Cible 18-25 ans (tote, sweat brodé prénom/promo). Casting jeunes adultes Coline + Hugo.',
  null),

-- Anniversaire = evergreen toute l''année. Le marronnier le plus volumineux en cumul.
('anniversaire', 'Anniversaire', 'season:1-12', 30, 30, 10,
  '{YPM-001, YPM-005}',
  '{MAN-P01, MAN-P10, MAN-P03}',
  '{}',
  '{#CadeauAnniversaire, #CadeauPersonnalisé, #YPERSOA}',
  'Always-on : initiale/prénom brodé, cadeau "pour quelqu''un de spécial". Pas de deadline marché, deadline = J-10 par commande.',
  null),

-- "Voilà l''été" = thème saison juin-août. Ambiance, pas de deadline marché.
('voila_lete', 'Voilà l''Été', 'season:6-8', 30, 45, 10,
  '{YPM-002, YPM-004}',
  '{MAN-P03, MAN-P11, MAN-S20}',
  '{DUO_LEA_SARAH}',
  '{#VoilàLÉté, #CadeauÉté, #YPERSOA}',
  'Thème d''ambiance (Échappée Sauvage / Lumière Sépia). Cadeaux de vacances, sac de plage brodé.',
  null),

-- Automne = thème saison sept-nov. Cocooning, retour au calme.
('automne', 'Automne', 'season:9-11', 30, 45, 10,
  '{YPM-007, YPM-012}',
  '{MAN-P01, MAN-P10}',
  '{}',
  '{#Automne, #CocooningAutomne, #YPERSOA}',
  'Thème d''ambiance (Loft Organique / Lumière Sépia). Sweats brodés, palette chaude.',
  null),

-- Hiver = thème saison déc-fév (chevauche Noël). Cocooning, fêtes.
('hiver', 'Hiver', 'season:12-2', 30, 45, 10,
  '{YPM-001, YPM-012}',
  '{MAN-P05, MAN-S19}',
  '{DUO_HENRI_JOSEPHINE}',
  '{#Hiver, #Cocooning, #YPERSOA}',
  'Thème d''ambiance hivernal. Attention au chevauchement Noël (ne pas cannibaliser le pic).',
  null),

-- Printemps = thème saison mars-mai (chevauche grands-mères + fête des mères).
('printemps', 'Printemps', 'season:3-5', 30, 45, 10,
  '{YPM-002, YPM-009}',
  '{MAN-P10, MAN-P03}',
  '{}',
  '{#Printemps, #Renouveau, #YPERSOA}',
  'Thème d''ambiance (L''Aube Intime). Renouveau, naissances, communions.',
  null),

-- Halloween = 31/10. Marronnier secondaire (faible sur le cadeau brodé premium).
('halloween', 'Halloween', 'fixed:10-31', 30, 40, 10,
  '{YPM-014}',
  '{MAN-P08, MAN-P09}',
  '{}',
  '{#Halloween, #YPERSOA}',
  'Secondaire pour une marque cadeau premium — contenu ludique enfants, pas de gros budget.',
  null),

-- Black Friday = 4e vendredi de novembre (27/11/2026). Levier OFFRE, pas émotion.
('black_friday', 'Black Friday', 'nth_weekday_of:11:5:4', 21, 30, 10,
  '{YPM-001, YPM-003, YPM-006}',
  '{MAN-P01, MAN-P06, MAN-P10}',
  '{}',
  '{#BlackFriday, #YPERSOA}',
  'Pilier OFFRE : urgence + dernières commandes avant Noël. Fenêtre Insta courte (J-21), Pinterest J-30. Articuler avec le pic Noël.',
  null);
