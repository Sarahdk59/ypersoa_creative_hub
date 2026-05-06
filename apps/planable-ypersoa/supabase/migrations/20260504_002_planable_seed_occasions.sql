-- Seed initial occasions FR — appliqué via MCP le 2026-05-04
-- Formule deadline : buy_by_deadline = occurrence - lead_days

insert into planable_occasions
  (slug, name_fr, date_strategy, campaign_lead_days, lead_days,
   recommended_motifs, recommended_casting, recommended_duos,
   hashtags_brand, notes, auto_campaign_disabled_year) values

('saint_valentin', 'Saint-Valentin', 'fixed:02-14', 30, 10,
  '{YPM-002, YPM-005}',
  '{MAN-P11}',
  '{DUO_LEA_SARAH, DUO_HENRI_JOSEPHINE}',
  '{#SaintValentin, #CadeauCouple, #YPERSOA}',
  'Couple = un fait, jamais un statement. Deadline commande = 4 février.',
  null),

('fete_des_meres', 'Fête des Mères', 'last_sunday_of:5', 45, 10,
  '{YPM-003, YPM-007, YPM-010}',
  '{MAN-P01, MAN-P05, MAN-P08, MAN-P10}',
  '{DUO_BEATRICE_FELICIE}',
  '{#FêteDesMères, #CadeauMaman, #YPERSOA}',
  'EN 2026 : campagne déjà en cours hors Planable. Reprise normale du cycle 2027.',
  2026),

('fete_des_peres', 'Fête des Pères', 'nth_sunday_of:6:3', 50, 10,
  '{YPM-006, YPM-011}',
  '{MAN-P06, MAN-S18, MAN-S19, MAN-P07, MAN-S14}',
  '{DUO_MATHIEU_GABIN}',
  '{#FêteDesPères, #CadeauPapa, #YPERSOA}',
  'EN 2026 = DIM 21 JUIN. Deadline commande = JEU 11 JUIN 2026 (21−10). Démarrer campagne 1er mai. Shoots papas individuels (Mathieu, Hassan, Henri) + photo trio (Henri + Nicolas + Gaspard) à briefer Adriana.',
  null),

('rentree', 'Rentrée scolaire', 'fixed:09-01', 30, 10,
  '{YPM-013, YPM-014}',
  '{MAN-P08, MAN-P09}',
  '{}',
  '{#Rentrée, #CadeauEnfant, #YPERSOA}',
  'Deadline commande = 22 août. Casting enfants Félicie + Gabin.',
  null),

('mariage', 'Saison Mariage', 'season:5-9', 60, 10,
  '{YPM-004, YPM-008}',
  '{MAN-P11}',
  '{DUO_LEA_SARAH}',
  '{#Mariage, #CadeauMariés, #YPERSOA}',
  'Saison mai à septembre — saisonnier, deadline glissante par mariage client.',
  null),

('naissance', 'Naissance', 'season:1-12', 14, 10,
  '{YPM-009, YPM-015}',
  '{MAN-S15}',
  '{}',
  '{#Naissance, #CadeauNaissance, #YPERSOA}',
  'Toute l''année, demande pull (cadeau ponctuel, pas de deadline marché).',
  null),

('noel', 'Noël', 'fixed:12-25', 60, 15,
  '{YPM-001, YPM-007, YPM-012}',
  '{MAN-P01, MAN-P05, MAN-P10, MAN-P08}',
  '{DUO_BEATRICE_FELICIE, DUO_HENRI_JOSEPHINE}',
  '{#Noël, #CadeauNoël, #YPERSOA}',
  'lead_days = 15 (saturation transporteurs décembre). Deadline commande = 10 décembre. Démarrer mi-novembre.',
  null);
