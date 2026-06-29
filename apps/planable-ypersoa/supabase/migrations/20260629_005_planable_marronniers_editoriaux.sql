-- Planable Ypersoa — Marronniers ÉDITORIAUX (moments de vie / engagement)
-- Session 2026-06-29.
--
-- Problème : le panneau "À planifier" ne proposait que des marronniers "cadeau"
-- (anniversaire, mariage, naissance, thèmes saison). En été → 4 cartes fades, et
-- "Printemps" affichait "RDV manqué côté commande" alors que c'est un thème
-- d'ambiance sans deadline de commande.
--
-- Solution :
--   1) Colonne `kind` : 'marche' (cadeau, deadline commande réelle) vs
--      'editorial' (moment de vie / engagement, AUCUNE deadline commande).
--   2) Les 4 thèmes d'ambiance saison passent en 'editorial' (plus de faux "RDV manqué").
--   3) +10 moments éditoriaux : créatifs, pertinents, drôles, taggés.
--
-- Voix de marque : tutoiement, sobre mais drôle, jamais marketing criard.
-- Les `notes` s'affichent sur la carte → c'est l'angle éditorial que voit Sarah.

alter table planable_occasions
  add column if not exists kind text not null default 'marche';

comment on column planable_occasions.kind is
  'marche = cadeau avec deadline commande | editorial = moment de vie / engagement sans deadline';

-- ── 1) Les thèmes d''ambiance deviennent éditoriaux + notes plus punchy ────────
update planable_occasions set kind = 'editorial',
  notes = 'Renouveau, premières terrasses, naissances et communions. L''Aube Intime, lumière qui revient. On respire, on ressort les couleurs claires.'
  where slug = 'printemps';

update planable_occasions set kind = 'editorial',
  notes = 'Échappée Sauvage / Lumière Sépia. Tote de plage, lin froissé, glace qui coule. Le grand thème d''été — décline-le en vacances à la mer, apéros, canicule.'
  where slug = 'voila_lete';

update planable_occasions set kind = 'editorial',
  notes = 'Loft Organique / Lumière Sépia. Retour du sweat, palette chaude, premiers feux. Cocooning assumé.'
  where slug = 'automne';

update planable_occasions set kind = 'editorial',
  notes = 'Thème hivernal cocooning. Attention au chevauchement Noël — ne pas cannibaliser le pic commande.'
  where slug = 'hiver';

-- Anniversaire reste 'marche' (vrai moteur cadeau) mais on punch les notes.
update planable_occasions set
  notes = 'Always-on, le marronnier le plus volumineux en cumul. On brode ton prénom, pas ton âge. Initiale / date / « pour quelqu''un de spécial ». Deadline = J-10 par commande.'
  where slug = 'anniversaire';

-- ── 2) Nouveaux moments éditoriaux ───────────────────────────────────────────
insert into planable_occasions
  (slug, name_fr, date_strategy, campaign_lead_days, pinterest_lead_days, lead_days,
   recommended_motifs, recommended_casting, recommended_duos,
   hashtags_brand, notes, auto_campaign_disabled_year, kind) values

-- Tennis club : preppy chic, le motif Le Club détourné en esprit court.
('tennis_club', 'Le Tennis Club', 'season:6-8', 30, 45, 10,
  '{YPM-003, YPM-016}',
  '{MAN-P01, MAN-P03}',
  '{}',
  '{#TennisClub, #LeClub, #QuietLuxury, #YPERSOA}',
  'Esprit court : blanc cassé, liserés verts, gestes lents. Le sweat « club » de celles qui ne courent pas après le bus. Roland / Wimbledon sans la sueur. Le Club brodé poitrine.',
  null, 'editorial'),

-- Vacances à la mer (demandé par Sarah).
('vacances_mer', 'Vacances à la Mer', 'season:7-8', 30, 45, 10,
  '{YPM-009, YPM-002}',
  '{MAN-P11, MAN-P03}',
  '{DUO_LEA_SARAH}',
  '{#VacancesÀLaMer, #SacDePlage, #YPERSOA}',
  'Le tote brodé qui revient toujours plein de sable. Serviette, crème solaire, roman corné. Échappée Sauvage / Lumière Sépia. Décline le sac de plage prénom.',
  null, 'editorial'),

-- "La rentrée ? Non, j''irai pas" (demandé par Sarah — angle humour).
('rentree_non', 'La Rentrée ? Non, j''irai pas', 'fixed:08-25', 21, 30, 10,
  '{YPM-013, YPM-016}',
  '{MAN-S20, MAN-S21}',
  '{}',
  '{#NonJiraiPas, #DernierJourDeVacances, #YPERSOA}',
  'Le sweat anti-réveil. Mood « encore cinq minutes », café qui refroidit, valise pas défaite. On brode l''humeur, pas l''emploi du temps. Pendant ironique de la rentrée scolaire.',
  null, 'editorial'),

-- Galentine : la Saint-Valentin entre copines.
('galentine', 'Galentine — entre copines', 'fixed:02-13', 21, 30, 10,
  '{YPM-003, YPM-007}',
  '{MAN-P03, MAN-P01}',
  '{}',
  '{#Galentine, #SistaClub, #YPERSOA}',
  'La Saint-Valentin sans mec, mais avec les bonnes. Le Club version sista : l''amitié est un statement assumé. Veille du 14, on prend les devants.',
  null, 'editorial'),

-- Le club des copines (apéro obligatoire).
('sista_club_apero', 'Le Club des Copines', 'season:5-9', 30, 45, 10,
  '{YPM-003}',
  '{MAN-P03, MAN-P01, MAN-P10}',
  '{}',
  '{#SistaClub, #ApéroEntreCopines, #YPERSOA}',
  'Un club, une seule règle : tu ramènes le rosé. Le Club brodé prénoms, esprit bande de filles. Loft Organique en terrasse, fin de journée d''été.',
  null, 'editorial'),

-- Dimanche au jardin : slow living.
('slow_sunday', 'Dimanche au Jardin', 'season:4-9', 30, 45, 10,
  '{YPM-007, YPM-010}',
  '{MAN-P10, MAN-P01}',
  '{}',
  '{#SlowSunday, #DimancheAuJardin, #YPERSOA}',
  'Le sweat du dimanche, le café qui traîne, le sécateur jamais loin. Slow living assumé. L''Aube Intime, lumière matinale, grain de peau.',
  null, 'editorial'),

-- Canicule : humour estival.
('canicule', 'Trop Chaud pour Réfléchir', 'season:7-8', 21, 30, 10,
  '{YPM-002}',
  '{MAN-P03}',
  '{}',
  '{#Canicule, #TeamOmbre, #YPERSOA}',
  '39°C, lin froissé, store baissé, glaçons qui fondent. La broderie légère des journées où on ne fait rien — et c''est très bien comme ça.',
  null, 'editorial'),

-- Le retour du pull : transition automne.
('retour_pull', 'Le Retour du Pull', 'fixed:10-10', 30, 45, 10,
  '{YPM-012, YPM-001}',
  '{MAN-P01, MAN-P10}',
  '{}',
  '{#RetourDuPull, #PremierFeu, #YPERSOA}',
  'Première laine de la saison, premier feu, premières mains rentrées dans les manches. Le grand sweat brodé qu''on ne quitte plus jusqu''en mars. Lumière Sépia.',
  null, 'editorial'),

-- Nouvel an : résolutions ironiques.
('nouvel_an', 'Bonnes Résolutions', 'fixed:01-02', 21, 30, 10,
  '{YPM-016, YPM-013}',
  '{MAN-P01}',
  '{}',
  '{#BonnesRésolutions, #NouvelAn, #YPERSOA}',
  'Résolution n°1 : porter plus de broderie. Résolution n°2 : tenir la n°1. Ton clean de début d''année, initiale sur fond cream. Studio Brut.',
  null, 'editorial'),

-- Team brunch : evergreen lifestyle, bouche-trou de calendrier de qualité.
('brunch_club', 'Team Brunch (jamais avant midi)', 'season:1-12', 30, 45, 10,
  '{YPM-003, YPM-007}',
  '{MAN-P03, MAN-P01}',
  '{}',
  '{#TeamBrunch, #SistaClub, #YPERSOA}',
  'Evergreen : œufs, pain perdu, ragots. Le Club brodé des dimanches qui commencent à 13h. Toujours dispo quand le calendrier a un trou.',
  null, 'editorial');
