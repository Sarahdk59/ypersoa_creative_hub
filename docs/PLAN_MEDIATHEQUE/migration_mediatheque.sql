-- ═══════════════════════════════════════════════════════════════════
-- MIGRATION : Module Médiathèque Ypersoa
-- À placer dans : supabase/migrations/20260521000000_create_media_module.sql
-- ═══════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────
-- TABLE : media
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS media (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filename        TEXT NOT NULL,
  storage_path    TEXT NOT NULL UNIQUE,
  public_url      TEXT NOT NULL,
  thumbnail_url   TEXT,
  width           INT,
  height          INT,
  size_bytes      BIGINT,
  mime_type       TEXT,
  source          TEXT CHECK (source IN (
                    'shooting_studio',
                    'shooting_lifestyle',
                    'ia_generation',
                    'packshot',
                    'user_content'
                  )),
  date_shoot      DATE,
  photographe     TEXT,
  statut          TEXT DEFAULT 'a_valider' CHECK (statut IN (
                    'a_valider',
                    'validee',
                    'publiee_shopify',
                    'archivee'
                  )),
  notes           TEXT,
  uploaded_by     TEXT,
  uploaded_at     TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_media_statut ON media(statut);
CREATE INDEX IF NOT EXISTS idx_media_source ON media(source);
CREATE INDEX IF NOT EXISTS idx_media_uploaded ON media(uploaded_at DESC);
CREATE INDEX IF NOT EXISTS idx_media_filename_trgm ON media USING gin (filename gin_trgm_ops);

-- ─────────────────────────────────────────────────────────────────
-- TABLE : tags
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tags (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category    TEXT NOT NULL CHECK (category IN (
                'incarnation','motif','gabarit','couleur_produit',
                'ambiance','mannequin','plan','saison','occasion','ton','custom'
              )),
  slug        TEXT NOT NULL,
  label       TEXT NOT NULL,
  color_hex   TEXT DEFAULT '#1E2D4A',
  parent_id   UUID REFERENCES tags(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE(category, slug)
);

CREATE INDEX IF NOT EXISTS idx_tags_category ON tags(category);

-- ─────────────────────────────────────────────────────────────────
-- TABLE : media_tags (liaison)
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS media_tags (
  media_id  UUID REFERENCES media(id) ON DELETE CASCADE,
  tag_id    UUID REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (media_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_media_tags_media ON media_tags(media_id);
CREATE INDEX IF NOT EXISTS idx_media_tags_tag ON media_tags(tag_id);

-- ─────────────────────────────────────────────────────────────────
-- TABLE : media_collections (albums/moodboards)
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS media_collections (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nom             TEXT NOT NULL,
  description     TEXT,
  cover_media_id  UUID REFERENCES media(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS media_collections_items (
  collection_id  UUID REFERENCES media_collections(id) ON DELETE CASCADE,
  media_id       UUID REFERENCES media(id) ON DELETE CASCADE,
  ordre          INT DEFAULT 0,
  PRIMARY KEY (collection_id, media_id)
);

-- ─────────────────────────────────────────────────────────────────
-- TRIGGERS : auto-update updated_at
-- ─────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_media_updated_at ON media;
CREATE TRIGGER update_media_updated_at BEFORE UPDATE ON media
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_media_collections_updated_at ON media_collections;
CREATE TRIGGER update_media_collections_updated_at BEFORE UPDATE ON media_collections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─────────────────────────────────────────────────────────────────
-- VUES UTILES
-- ─────────────────────────────────────────────────────────────────

-- Vue : média + tags agrégés (pour API GET)
CREATE OR REPLACE VIEW media_with_tags AS
SELECT
  m.*,
  COALESCE(
    json_agg(
      json_build_object(
        'id', t.id,
        'category', t.category,
        'slug', t.slug,
        'label', t.label,
        'color_hex', t.color_hex
      )
    ) FILTER (WHERE t.id IS NOT NULL),
    '[]'::json
  ) AS tags
FROM media m
LEFT JOIN media_tags mt ON m.id = mt.media_id
LEFT JOIN tags t ON mt.tag_id = t.id
GROUP BY m.id;

-- Vue : compteur d'usage par tag
CREATE OR REPLACE VIEW tags_with_usage AS
SELECT
  t.*,
  COUNT(mt.media_id) AS usage_count
FROM tags t
LEFT JOIN media_tags mt ON t.id = mt.tag_id
GROUP BY t.id;

-- ─────────────────────────────────────────────────────────────────
-- ROW LEVEL SECURITY
-- ─────────────────────────────────────────────────────────────────

ALTER TABLE media ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_collections_items ENABLE ROW LEVEL SECURITY;

-- Lecture publique (les URLs des photos doivent être accessibles)
CREATE POLICY "Public read media" ON media FOR SELECT USING (statut != 'archivee');
CREATE POLICY "Public read tags" ON tags FOR SELECT USING (true);
CREATE POLICY "Public read media_tags" ON media_tags FOR SELECT USING (true);
CREATE POLICY "Public read collections" ON media_collections FOR SELECT USING (true);
CREATE POLICY "Public read collections_items" ON media_collections_items FOR SELECT USING (true);

-- Écriture authentifiée uniquement (à ajuster selon ton modèle d'auth Hub)
CREATE POLICY "Auth write media" ON media FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Auth write tags" ON tags FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Auth write media_tags" ON media_tags FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Auth write collections" ON media_collections FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Auth write collections_items" ON media_collections_items FOR ALL USING (auth.role() = 'authenticated');

-- ─────────────────────────────────────────────────────────────────
-- STORAGE BUCKET
-- ─────────────────────────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('ypersoa-media', 'ypersoa-media', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read media bucket" ON storage.objects
  FOR SELECT USING (bucket_id = 'ypersoa-media');

CREATE POLICY "Auth upload media bucket" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'ypersoa-media' AND auth.role() = 'authenticated'
  );

CREATE POLICY "Auth update media bucket" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'ypersoa-media' AND auth.role() = 'authenticated'
  );

CREATE POLICY "Auth delete media bucket" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'ypersoa-media' AND auth.role() = 'authenticated'
  );
