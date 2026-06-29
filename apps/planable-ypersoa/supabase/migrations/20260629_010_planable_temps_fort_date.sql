-- Planable Ypersoa — date de « temps fort » explicite + éditable (29/06/2026)
-- Problème : les moments saison s'écrasent tous sur "aujourd'hui" (29 juin) → pile illisible.
-- Solution : colonne `temps_fort_date` (date) qui FIXE la date affichée/filtrée du planifiable,
-- éditable depuis l'UI (PATCH /api/occasions/[slug]). Si null → date calculée (date_strategy).

alter table planable_occasions
  add column if not exists temps_fort_date date;

comment on column planable_occasions.temps_fort_date is
  'Date de temps fort explicite (override la date calculée). Éditable côté UI. Null → fallback date_strategy.';

-- ── Dates demandées par Sarah ────────────────────────────────────────────────
update planable_occasions set temps_fort_date = '2026-07-08' where slug = 'voila_lete';
update planable_occasions set temps_fort_date = '2026-07-10' where slug = 'canicule';
update planable_occasions set temps_fort_date = '2026-07-30' where slug = 'tennis_club';
-- Printemps : trop tard cette année → renvoyé au prochain printemps (sort de la fenêtre 60j).
update planable_occasions set temps_fort_date = '2027-03-20' where slug = 'printemps';

-- ── Nouveaux moments « Club » ────────────────────────────────────────────────
insert into planable_occasions
  (slug, name_fr, date_strategy, campaign_lead_days, pinterest_lead_days, lead_days,
   recommended_motifs, recommended_casting, recommended_duos,
   hashtags_brand, notes, auto_campaign_disabled_year, kind, temps_fort_date) values

('france_club', 'La France Club', 'fixed:07-14', 21, 30, 10,
  '{YPM-003, YPM-001}', '{MAN-P03, MAN-P01, MAN-P11}', '{}',
  '{#FranceClub, #14Juillet, #YPERSOA}',
  '« On a tous le même maillot aujourd''hui. » Esprit cocarde bleu-blanc-rouge, le Club version 14 juillet — bal de quartier, feu d''artifice, fierté tranquille.',
  null, 'editorial', '2026-07-14'),

('velo_club', 'Le Vélo Club', 'fixed:07-04', 21, 30, 10,
  '{YPM-003, YPM-016}', '{MAN-P06, MAN-S21}', '{}',
  '{#VéloClub, #TourDeFrance, #YPERSOA}',
  '« Maillot jaune non requis. » Départ du Tour de France : esprit vélo vintage, musette, col mythique. Le Club brodé pour les supporters de juillet.',
  null, 'editorial', '2026-07-04');
