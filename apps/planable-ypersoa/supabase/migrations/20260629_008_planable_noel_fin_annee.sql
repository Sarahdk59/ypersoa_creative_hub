-- Planable Ypersoa — Noël / fin d'année + coulisses (29/06/2026)
-- Contexte : Sarah tourne déjà le contenu Noël/fin d'année 2026 + Collection 27.
-- 4 moments datés décembre (editorial) + 2 evergreen brand (coulisses atelier, nouvelle collection).
-- + punchline sur l'occasion `noel` existante (marche).

update planable_occasions set
  notes = '« Le seul cadeau qu''on n''échange pas le 26. » lead_days = 15 (saturation transporteurs décembre). Deadline commande = 10 décembre, démarrage mi-novembre. Pinterest dès octobre (J-75).'
  where slug = 'noel';

insert into planable_occasions
  (slug, name_fr, date_strategy, campaign_lead_days, pinterest_lead_days, lead_days,
   recommended_motifs, recommended_casting, recommended_duos,
   hashtags_brand, notes, auto_campaign_disabled_year, kind) values

('pull_noel', 'Le Pull de Noël (mais beau)', 'fixed:12-15', 30, 45, 10,
  '{YPM-012, YPM-001}', '{MAN-P01, MAN-P10}', '{}',
  '{#PullDeNoël, #NoëlChic, #YPERSOA}',
  '« Le pull de Noël qu''on ne cache pas le 26. Brodé, pas kitsch. » L''anti-ugly-sweater chic, celui qu''on garde en janvier. Loft Organique / Lumière Sépia.',
  null, 'editorial'),

('au_pied_du_sapin', 'Au Pied du Sapin', 'fixed:12-20', 30, 45, 10,
  '{YPM-006, YPM-015}', '{MAN-P05, MAN-P08}', '{DUO_BEATRICE_FELICIE}',
  '{#SousLeSapin, #Noël, #YPERSOA}',
  '« Le paquet mou sous le sapin, celui qu''on espère. Cette année c''est le bon. » Magie de l''attente, transmission grand-mère ↔ petite-fille.',
  null, 'editorial'),

('reveillon', 'Le Réveillon', 'fixed:12-31', 21, 30, 10,
  '{YPM-002, YPM-016}', '{MAN-P03, MAN-P01}', '{}',
  '{#Réveillon, #NouvelAn, #YPERSOA}',
  '« Robe pour le 31, sweat brodé pour le 1er. Priorités. » Bascule de l''année, paillettes vs confort assumé.',
  null, 'editorial'),

('bilan_annee', 'Bilan de Fin d''Année', 'fixed:12-28', 21, 30, 10,
  '{YPM-016}', '{MAN-P01}', '{}',
  '{#FinDAnnée, #MerciÀVous, #YPERSOA}',
  '« On a brodé des milliers de prénoms cette année. Le tien manquait. » Récap de marque chaleureux, gratitude communauté.',
  null, 'editorial'),

('dans_atelier', 'Dans l''Atelier (coulisses)', 'season:1-12', 30, 45, 10,
  '{YPM-016, YPM-003}', '{MAN-P10}', '{}',
  '{#DansLAtelier, #BehindTheScenes, #YPERSOA}',
  '« Spoiler : beaucoup de fils, un métier Tajima qui ronronne, un peu de café. » Making-of broderie, behind-the-scenes evergreen. Parfait quand tu tournes du contenu atelier.',
  null, 'editorial'),

('nouvelle_collection', 'La Nouvelle Collection', 'season:1-12', 30, 45, 10,
  '{YPM-017, YPM-016}', '{MAN-P01, MAN-P03}', '{}',
  '{#NouvelleCollection, #Collection27, #YPERSOA}',
  '« On a gardé nos meilleures idées, jeté les autres. » Lancement de collection / capsule, réutilisable à chaque drop (ex. Collection 27). Studio Brut, focus produit.',
  null, 'editorial');
