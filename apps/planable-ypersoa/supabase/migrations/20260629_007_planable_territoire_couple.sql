-- Planable Ypersoa — Territoire COUPLE / MARIAGE #brodéàdeux (29/06/2026)
-- Slot marche/editorial tranché par Sarah :
--   marche   = vraie date-deadline (anniversaire de mariage, noces, saison mariage) → CTA commande
--   editorial = moment de vie evergreen (rencontre, emménagement, fiançailles…) → engagement
-- Statut `rolling` (côté code) gère les marche saisonniers en cours (pas de faux "RDV manqué").
--
-- 2 updates : merci_maitresse (punchline) + saint_valentin (angle couple anti-cliché).

-- ── Updates notes ────────────────────────────────────────────────────────────
update planable_occasions set
  notes = '« Le tote / le tablier brodé qui bat le mug pour la 12e fois. » Fin d''année scolaire, fenêtre courte avant les vacances — à activer cette semaine. Casting enfants Félicie + Gabin.'
  where slug = 'merci_maitresse';

update planable_occasions set
  notes = '« Les fleurs fanent. Le prénom, non. » Version couple anti-cliché (complète Galentine côté célibataires). Couple = un fait, jamais un statement. Deadline commande = 4 février.'
  where slug = 'saint_valentin';

-- ── Territoire couple — marche (vraie occasion d''achat) ──────────────────────
insert into planable_occasions
  (slug, name_fr, date_strategy, campaign_lead_days, pinterest_lead_days, lead_days,
   recommended_motifs, recommended_casting, recommended_duos,
   hashtags_brand, notes, auto_campaign_disabled_year, kind) values

('noces_coton', 'Noces de Coton', 'season:1-12', 45, 60, 10,
  '{YPM-016, YPM-015}', '{MAN-P11}', '{DUO_LEA_SARAH}',
  '{#NocesDeCoton, #brodéàdeux, #YPERSOA}',
  '« Noces de coton. On était prévenus pour ce job. » 1 an de mariage = le SEUL marronnier mariage où ton matériau EST le cadeau. Date brodée, La Signature. Deadline = J-10 par commande.',
  null, 'marche'),

('date_brodee', 'La Date Brodée', 'season:1-12', 30, 45, 10,
  '{YPM-016, YPM-015}', '{MAN-P11, MAN-P01}', '{DUO_LEA_SARAH}',
  '{#LaDateBrodée, #brodéàdeux, #YPERSOA}',
  '« La date est brodée. Plus aucune excuse pour l''oublier. » Broder la date (mariage, rencontre, 1er appart) : perso maximale, cadeau introuvable ailleurs. Plug La Signature / La Déclaration.',
  null, 'marche'),

('cadeau_mariage', 'Cadeau de Mariage', 'season:5-9', 45, 60, 10,
  '{YPM-004, YPM-008}', '{MAN-P11}', '{DUO_LEA_SARAH}',
  '{#CadeauDeMariage, #brodéàdeux, #YPERSOA}',
  '« Le 4e grille-pain… ou un truc à leurs deux prénoms ? » Détourne la liste de mariage côté invité. Saison mai–sept, actif maintenant.',
  null, 'marche'),

-- ── Territoire couple — editorial (moment de vie evergreen) ───────────────────
('notre_date', 'Notre Date (rencontre)', 'season:1-12', 30, 45, 10,
  '{YPM-016, YPM-011}', '{MAN-P11}', '{DUO_LEA_SARAH}',
  '{#NotreDate, #brodéàdeux, #YPERSOA}',
  '« 6 ans qu''on s''est rencontrés. Lui : un resto. Moi : un truc qui dure plus longtemps que l''addition. » L''anniversaire de rencontre, pas que le mariage.',
  null, 'editorial'),

('on_emenage', 'On Emménage Ensemble', 'season:1-12', 30, 45, 10,
  '{YPM-010, YPM-016}', '{MAN-P11}', '{DUO_LEA_SARAH}',
  '{#OnEmménage, #brodéàdeux, #YPERSOA}',
  '« Deux prénoms, un seul plaid, et le débat sur le thermostat. » Version couple de la crémaillère : on emménage ensemble.',
  null, 'editorial'),

('on_se_dit_oui', 'On se Dit Oui (fiançailles)', 'season:1-12', 30, 45, 10,
  '{YPM-015, YPM-016}', '{MAN-P11}', '{DUO_LEA_SARAH}',
  '{#OnSeDitOui, #brodéàdeux, #YPERSOA}',
  '« Bague validée. Reste à broder le reste. » Pour les fraîchement fiancés.',
  null, 'editorial'),

('vie_de_couple', 'Vie de Couple (anti-routine)', 'season:1-12', 30, 45, 10,
  '{YPM-011, YPM-006}', '{MAN-P11}', '{DUO_LEA_SARAH}',
  '{#VieDeCouple, #brodéàdeux, #YPERSOA}',
  '« 8 ans ensemble et il offre encore un parfum. On brode pour lui montrer l''exemple. » Humour couple installé, anti-routine.',
  null, 'editorial'),

('brode_a_distance', 'Brodé À Distance', 'season:1-12', 30, 45, 10,
  '{YPM-011, YPM-016}', '{MAN-P11}', '{}',
  '{#BrodéÀDistance, #brodéàdeux, #YPERSOA}',
  '« 300 km entre nous. Le même sweat sur le dos. » Couple longue distance, le textile-lien.',
  null, 'editorial');
