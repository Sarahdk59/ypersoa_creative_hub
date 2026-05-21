-- ═══════════════════════════════════════════════════════════════════
-- MIGRATION : Module Incarnations Ypersoa
-- À placer dans : supabase/migrations/20260521010000_create_incarnations_module.sql
-- 
-- Prérequis : le module Médiathèque doit être créé avant
-- (tables media et tags doivent exister)
-- ═══════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────
-- TABLE : motifs (référentiel YPM)
-- À ignorer si déjà existant dans le Hub
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS motifs (
  code        TEXT PRIMARY KEY,
  nom         TEXT NOT NULL,
  famille     TEXT,
  description TEXT,
  fichier_dst TEXT,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

-- Seed des 17 motifs (sera ignoré si déjà présents)
INSERT INTO motifs (code, nom, famille) VALUES
  ('YPM-001', 'La Brigitte',     'Cœurs'),
  ('YPM-002', 'L''Ambre',        'Cœurs'),
  ('YPM-003', 'Le Club',         'Signes/Badges'),
  ('YPM-004', 'Notre Héritage',  'Liens familiaux'),
  ('YPM-005', 'L''Annonce',      'Mariage/EVJF'),
  ('YPM-006', 'Le Câlin',        'Cœurs'),
  ('YPM-007', 'Le Chouchou',     'Scripts'),
  ('YPM-008', 'La Féline',       'Cœurs'),
  ('YPM-009', 'La Palette',      'Famille'),
  ('YPM-010', 'La Ronde',        'Aa Typo'),
  ('YPM-011', 'La Confidence',   'Cœurs'),
  ('YPM-012', 'La Meute',        'Aa Typo'),
  ('YPM-013', 'Le Depuis',       'Scripts'),
  ('YPM-014', 'La Tigresse',     'Cœurs'),
  ('YPM-015', 'La Déclaration',  'Cœurs'),
  ('YPM-016', 'La Signature',    'Scripts'),
  ('YPM-017', 'La Florale',      'Aa Typo')
ON CONFLICT (code) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────
-- TABLE : incarnations
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS incarnations (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code                 TEXT NOT NULL UNIQUE,
  nom_commercial       TEXT NOT NULL,
  motif_ypm            TEXT NOT NULL REFERENCES motifs(code),
  
  -- Spec broderie
  spec_broderie        JSONB NOT NULL DEFAULT '{}'::jsonb,
  
  -- Ciblage éditorial
  gabarits_cibles      TEXT[] DEFAULT '{}',
  collections_cibles   TEXT[] DEFAULT '{}',
  ton                  TEXT CHECK (ton IN ('tendre','complice','humour','affirme')),
  
  -- Workflow
  statut               TEXT DEFAULT 'concept' CHECK (statut IN (
                         'concept','a_digitaliser','a_shooter',
                         'a_publier','actif','archive'
                       )),
  
  -- Contenu
  description_template TEXT,
  notes                TEXT,
  
  -- Audit
  created_at           TIMESTAMPTZ DEFAULT now(),
  updated_at           TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_incarnations_motif ON incarnations(motif_ypm);
CREATE INDEX IF NOT EXISTS idx_incarnations_statut ON incarnations(statut);
CREATE INDEX IF NOT EXISTS idx_incarnations_ton ON incarnations(ton);
CREATE INDEX IF NOT EXISTS idx_incarnations_collections ON incarnations USING gin(collections_cibles);
CREATE INDEX IF NOT EXISTS idx_incarnations_gabarits ON incarnations USING gin(gabarits_cibles);
CREATE INDEX IF NOT EXISTS idx_incarnations_nom_trgm ON incarnations USING gin (nom_commercial gin_trgm_ops);

-- ─────────────────────────────────────────────────────────────────
-- TABLE : incarnations_photos (liaison vers media)
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS incarnations_photos (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incarnation_id   UUID NOT NULL REFERENCES incarnations(id) ON DELETE CASCADE,
  media_id         UUID NOT NULL REFERENCES media(id) ON DELETE CASCADE,
  gabarit          TEXT NOT NULL,
  couleur_produit  TEXT,
  is_hero          BOOLEAN DEFAULT false,
  ordre            INT DEFAULT 0,
  created_at       TIMESTAMPTZ DEFAULT now(),
  UNIQUE(incarnation_id, media_id)
);

CREATE INDEX IF NOT EXISTS idx_inc_photos_inc ON incarnations_photos(incarnation_id);
CREATE INDEX IF NOT EXISTS idx_inc_photos_media ON incarnations_photos(media_id);

-- Une seule photo hero par (incarnation, gabarit)
CREATE UNIQUE INDEX IF NOT EXISTS idx_inc_photos_hero_unique
  ON incarnations_photos(incarnation_id, gabarit)
  WHERE is_hero = true;

-- ─────────────────────────────────────────────────────────────────
-- TRIGGERS
-- ─────────────────────────────────────────────────────────────────
-- Fonction update_updated_at_column déjà créée par la migration médiathèque

DROP TRIGGER IF EXISTS update_incarnations_updated_at ON incarnations;
CREATE TRIGGER update_incarnations_updated_at BEFORE UPDATE ON incarnations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_motifs_updated_at ON motifs;
CREATE TRIGGER update_motifs_updated_at BEFORE UPDATE ON motifs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─────────────────────────────────────────────────────────────────
-- VUES UTILES
-- ─────────────────────────────────────────────────────────────────

-- Vue : incarnation enrichie avec motif + photos agrégées
CREATE OR REPLACE VIEW incarnations_enriched AS
SELECT
  i.*,
  m.nom AS motif_nom,
  m.famille AS motif_famille,
  COALESCE(
    json_agg(
      json_build_object(
        'id', ip.id,
        'gabarit', ip.gabarit,
        'couleur_produit', ip.couleur_produit,
        'media_id', ip.media_id,
        'public_url', med.public_url,
        'thumbnail_url', med.thumbnail_url,
        'is_hero', ip.is_hero,
        'ordre', ip.ordre
      ) ORDER BY ip.is_hero DESC, ip.ordre
    ) FILTER (WHERE ip.id IS NOT NULL),
    '[]'::json
  ) AS photos,
  COUNT(DISTINCT ip.gabarit) FILTER (WHERE ip.id IS NOT NULL) AS gabarits_shootes_count,
  COALESCE(array_length(i.gabarits_cibles, 1), 0) AS gabarits_cibles_count
FROM incarnations i
LEFT JOIN motifs m ON i.motif_ypm = m.code
LEFT JOIN incarnations_photos ip ON i.id = ip.incarnation_id
LEFT JOIN media med ON ip.media_id = med.id
GROUP BY i.id, m.nom, m.famille;

-- Vue : audit par motif (count incarnations par statut)
CREATE OR REPLACE VIEW motifs_audit AS
SELECT
  m.code,
  m.nom,
  m.famille,
  COUNT(i.id) FILTER (WHERE i.statut = 'actif') AS actives,
  COUNT(i.id) FILTER (WHERE i.statut = 'a_shooter') AS a_shooter,
  COUNT(i.id) FILTER (WHERE i.statut = 'a_digitaliser') AS a_digitaliser,
  COUNT(i.id) FILTER (WHERE i.statut = 'concept') AS concepts,
  COUNT(i.id) AS total
FROM motifs m
LEFT JOIN incarnations i ON i.motif_ypm = m.code
GROUP BY m.code, m.nom, m.famille
ORDER BY m.code;

-- ─────────────────────────────────────────────────────────────────
-- RLS
-- ─────────────────────────────────────────────────────────────────
ALTER TABLE motifs ENABLE ROW LEVEL SECURITY;
ALTER TABLE incarnations ENABLE ROW LEVEL SECURITY;
ALTER TABLE incarnations_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read motifs" ON motifs FOR SELECT USING (true);
CREATE POLICY "Public read incarnations" ON incarnations FOR SELECT
  USING (statut != 'archive');
CREATE POLICY "Public read incarnations_photos" ON incarnations_photos FOR SELECT
  USING (true);

CREATE POLICY "Auth write motifs" ON motifs FOR ALL
  USING (auth.role() = 'authenticated');
CREATE POLICY "Auth write incarnations" ON incarnations FOR ALL
  USING (auth.role() = 'authenticated');
CREATE POLICY "Auth write incarnations_photos" ON incarnations_photos FOR ALL
  USING (auth.role() = 'authenticated');

-- ─────────────────────────────────────────────────────────────────
-- SEED initial : les 13 incarnations du XLSX
-- ─────────────────────────────────────────────────────────────────
INSERT INTO incarnations (code, nom_commercial, motif_ypm, spec_broderie, gabarits_cibles, collections_cibles, ton, statut) VALUES
  ('YPI-001', 'MAMA CLUB',     'YPM-003',
   '{"mot_haut":"MAMA","mot_bas":"CLUB","symbole":"Cœur","couleur_fil_defaut":"Vert sapin"}'::jsonb,
   ARRAY['YP001','YP005','YP019'],
   ARRAY['pour-maman','fete-des-meres','naissance'],
   'tendre', 'actif'),
  ('YPI-002', 'PAPA CLUB',     'YPM-003',
   '{"mot_haut":"PAPA","mot_bas":"CLUB","symbole":"Cœur","couleur_fil_defaut":"Bleu marine"}'::jsonb,
   ARRAY['YP001','YP019'],
   ARRAY['pour-papa','fete-des-peres'],
   'tendre', 'actif'),
  ('YPI-003', 'SISTA CLUB',    'YPM-003',
   '{"mot_haut":"SISTA","mot_bas":"CLUB","symbole":"Cœur","couleur_fil_defaut":"Rose framboise"}'::jsonb,
   ARRAY['YP001','YP005'],
   ARRAY['pour-soeur','pour-amie','anniversaire'],
   'complice', 'actif'),
  ('YPI-004', 'FAMILLE CLUB',  'YPM-003',
   '{"mot_haut":"FAMILLE","mot_bas":"CLUB","symbole":"Cœur","couleur_fil_defaut":"Bleu marine"}'::jsonb,
   ARRAY['YP001','YP019'],
   ARRAY['pour-famille','noel'],
   'tendre', 'actif'),
  ('YPI-005', 'AMOUR CLUB',    'YPM-003',
   '{"mot_haut":"AMOUR","mot_bas":"CLUB","symbole":"Cœur","couleur_fil_defaut":"Rose framboise"}'::jsonb,
   ARRAY['YP005'],
   ARRAY['pour-couple','saint-valentin'],
   'tendre', 'actif'),
  ('YPI-006', 'BRIDE TEAM',    'YPM-003',
   '{"mot_haut":"BRIDE","mot_bas":"TEAM","symbole":"Cœur","couleur_fil_defaut":"Rose poudré"}'::jsonb,
   ARRAY['YP001'],
   ARRAY['pour-mariee','evjf','mariage'],
   'complice', 'actif'),
  ('YPI-007', 'DOG DAD GANG',  'YPM-003',
   '{"mot_haut":"DOG DAD","mot_bas":"GANG","symbole":"Patte","couleur_fil_defaut":"Crème"}'::jsonb,
   ARRAY['YP001'],
   ARRAY['pour-papa','animaux'],
   'complice', 'actif'),
  ('YPI-008', 'CREW SUMMER',   'YPM-003',
   '{"mot_haut":"CREW","mot_bas":"SUMMER","symbole":"Fleur","couleur_fil_defaut":"Bleu marine"}'::jsonb,
   ARRAY['YP001'],
   ARRAY['pour-amies','ete','voyage'],
   'complice', 'actif'),
  ('YPI-009', 'TEAM DOG',      'YPM-003',
   '{"mot_haut":"TEAM","mot_bas":"DOG","symbole":"Patte","couleur_fil_defaut":"Crème"}'::jsonb,
   ARRAY['YP001'],
   ARRAY['pour-famille','animaux'],
   'complice', 'actif'),
  ('YPI-010', 'PAPI CLUB',     'YPM-003',
   '{"mot_haut":"PAPI","mot_bas":"CLUB","symbole":"Cœur","couleur_fil_defaut":"Bleu marine"}'::jsonb,
   ARRAY['YP001','YP005','YP019'],
   ARRAY['pour-papi','grands-parents','fete-des-peres'],
   'tendre', 'a_shooter'),
  ('YPI-011', 'MAMIE CLUB',    'YPM-003',
   '{"mot_haut":"MAMIE","mot_bas":"CLUB","symbole":"Cœur","couleur_fil_defaut":"Vert sauge"}'::jsonb,
   ARRAY['YP001','YP005','YP019'],
   ARRAY['pour-mamie','grands-parents','fete-des-meres'],
   'tendre', 'a_shooter'),
  ('YPI-012', 'CONNASSE CLUB', 'YPM-003',
   '{"mot_haut":"CONNASSE","mot_bas":"CLUB","symbole":"Cœur","couleur_fil_defaut":"Bordeaux"}'::jsonb,
   ARRAY['YP001','YP005','YP019'],
   ARRAY['pour-bff','evjf','humour'],
   'humour', 'concept'),
  ('YPI-013', 'COOL GIRLS',    'YPM-016',
   '{"mot_haut":"Cool","mot_bas":"Girls","symbole":"—","couleur_fil_defaut":"Rose framboise"}'::jsonb,
   ARRAY['YP001','YP005','YP019'],
   ARRAY['pour-amies','anniversaire','ete'],
   'complice', 'concept')
ON CONFLICT (code) DO NOTHING;
