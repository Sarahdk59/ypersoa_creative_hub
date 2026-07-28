-- ═══════════════════════════════════════════════════════════════════
-- MIGRATION : Collections Motion — Atelier Motion Ypersoa
-- Date : 2026-07-28
-- Usage : collections de photos nommées et ordonnées servant de source
--         au mode "Reel Insta animé" de l'Atelier Motion.
-- ═══════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────
-- TABLE : motion_collections
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS motion_collections (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label       TEXT NOT NULL,
  description TEXT,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_motion_collections_created
  ON motion_collections(created_at DESC);

-- ─────────────────────────────────────────────────────────────────
-- TABLE : motion_collection_shots
-- Chaque ligne = 1 photo dans la séquence de clips de la collection.
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS motion_collection_shots (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id UUID NOT NULL REFERENCES motion_collections(id) ON DELETE CASCADE,
  -- Type de plan : MACRO BRODERIE | PORTRAIT ÉDITORIAL | LIFESTYLE MODE | etc.
  shot_type     TEXT NOT NULL DEFAULT 'LIFESTYLE MODE',
  -- URL publique de la photo (stockée directement pour éviter les jointures)
  public_url    TEXT NOT NULL,
  -- Lien optionnel vers la médiathèque (traçabilité, pas obligatoire)
  media_id      UUID NULL,
  -- Origine : 'media' | 'liked-shot' | 'url'
  source_type   TEXT NOT NULL DEFAULT 'media',
  -- ID dans le système source (media_id ou liked_shot.id)
  source_id     TEXT NULL,
  -- Position dans la séquence (0-indexed)
  ordre         INT NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_motion_shots_collection
  ON motion_collection_shots(collection_id, ordre);

-- ─────────────────────────────────────────────────────────────────
-- TRIGGER : updated_at auto sur motion_collections
-- ─────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS trg_motion_collections_updated_at ON motion_collections;
CREATE TRIGGER trg_motion_collections_updated_at
  BEFORE UPDATE ON motion_collections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─────────────────────────────────────────────────────────────────
-- ROW LEVEL SECURITY
-- ─────────────────────────────────────────────────────────────────
ALTER TABLE motion_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE motion_collection_shots ENABLE ROW LEVEL SECURITY;

-- Lecture publique (pas de données sensibles)
CREATE POLICY "Public read motion_collections"
  ON motion_collections FOR SELECT USING (true);

CREATE POLICY "Public read motion_collection_shots"
  ON motion_collection_shots FOR SELECT USING (true);

-- Écriture authentifiée
CREATE POLICY "Auth write motion_collections"
  ON motion_collections FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Auth write motion_collection_shots"
  ON motion_collection_shots FOR ALL USING (auth.role() = 'authenticated');
