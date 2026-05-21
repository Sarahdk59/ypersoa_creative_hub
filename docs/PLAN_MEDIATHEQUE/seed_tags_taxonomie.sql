-- ═══════════════════════════════════════════════════════════════════
-- SEED : Taxonomie initiale des tags Ypersoa
-- À placer dans : supabase/seeds/media_tags_seed.sql
-- ═══════════════════════════════════════════════════════════════════

-- INCARNATIONS (à compléter au fil des shootings)
INSERT INTO tags (category, slug, label, color_hex) VALUES
  ('incarnation', 'mama-club',       'MAMA CLUB',       '#C4694A'),
  ('incarnation', 'papa-club',       'PAPA CLUB',       '#1E2D4A'),
  ('incarnation', 'sista-club',      'SISTA CLUB',      '#E879A6'),
  ('incarnation', 'famille-club',    'FAMILLE CLUB',    '#5A8A6E'),
  ('incarnation', 'amour-club',      'AMOUR CLUB',      '#D14F8B'),
  ('incarnation', 'bride-team',      'BRIDE TEAM',      '#F5C6D6'),
  ('incarnation', 'dog-dad-gang',    'DOG DAD GANG',    '#8B6F47'),
  ('incarnation', 'crew-summer',     'CREW SUMMER',     '#3A7CA5'),
  ('incarnation', 'team-dog',        'TEAM DOG',        '#8B6F47'),
  ('incarnation', 'papi-club',       'PAPI CLUB',       '#1E2D4A'),
  ('incarnation', 'mamie-club',      'MAMIE CLUB',      '#9CAF88'),
  ('incarnation', 'connasse-club',   'CONNASSE CLUB',   '#7C2D3F'),
  ('incarnation', 'cool-girls',      'COOL GIRLS',      '#E879A6')
ON CONFLICT (category, slug) DO NOTHING;

-- MOTIFS (référentiel YPM)
INSERT INTO tags (category, slug, label) VALUES
  ('motif', 'ypm-001', 'La Brigitte'),
  ('motif', 'ypm-002', 'L''Ambre'),
  ('motif', 'ypm-003', 'Le Club'),
  ('motif', 'ypm-004', 'Notre Héritage'),
  ('motif', 'ypm-005', 'L''Annonce'),
  ('motif', 'ypm-006', 'Le Câlin'),
  ('motif', 'ypm-007', 'Le Chouchou'),
  ('motif', 'ypm-008', 'La Féline'),
  ('motif', 'ypm-009', 'La Palette'),
  ('motif', 'ypm-010', 'La Ronde'),
  ('motif', 'ypm-011', 'La Confidence'),
  ('motif', 'ypm-012', 'La Meute'),
  ('motif', 'ypm-013', 'Le Depuis'),
  ('motif', 'ypm-014', 'La Tigresse'),
  ('motif', 'ypm-015', 'La Déclaration'),
  ('motif', 'ypm-016', 'La Signature'),
  ('motif', 'ypm-017', 'La Florale')
ON CONFLICT (category, slug) DO NOTHING;

-- GABARITS (référentiel YP)
INSERT INTO tags (category, slug, label) VALUES
  ('gabarit', 'yp001', 'Hoodie Adulte'),
  ('gabarit', 'yp004', 'Hoodie Enfant'),
  ('gabarit', 'yp005', 'Sweat Adulte'),
  ('gabarit', 'yp019', 'T-Shirt Adulte'),
  ('gabarit', 'yp020', 'Zoodie (S)'),
  ('gabarit', 'yp021', 'Zoodie')
ON CONFLICT (category, slug) DO NOTHING;

-- COULEURS PRODUIT (textile)
INSERT INTO tags (category, slug, label, color_hex) VALUES
  ('couleur_produit', 'creme',         'Crème',           '#F5F0EA'),
  ('couleur_produit', 'blanc',         'Blanc',           '#FFFFFF'),
  ('couleur_produit', 'beige',         'Beige',           '#E8D9C0'),
  ('couleur_produit', 'noir',          'Noir',            '#000000'),
  ('couleur_produit', 'marine',        'Marine',          '#1E2D4A'),
  ('couleur_produit', 'vert-sauge',    'Vert Sauge',      '#9CAF88'),
  ('couleur_produit', 'rose-pale',     'Rose Pâle',       '#F5C6D6'),
  ('couleur_produit', 'kaki',          'Kaki',            '#8A8B5C'),
  ('couleur_produit', 'lilas',         'Lilas',           '#C8A4D4'),
  ('couleur_produit', 'gris-fonce',    'Gris Foncé',      '#4A4A4A'),
  ('couleur_produit', 'canard',        'Canard',          '#0F5257'),
  ('couleur_produit', 'pierre',        'Pierre Naturelle','#D4C5A9'),
  ('couleur_produit', 'bleu-clair',    'Bleu Clair',      '#A8C8DC'),
  ('couleur_produit', 'vert-terre',    'Vert Terre',      '#6B8E5A')
ON CONFLICT (category, slug) DO NOTHING;

-- AMBIANCES SHOOTING
INSERT INTO tags (category, slug, label) VALUES
  ('ambiance', 'studio-brut',      'Studio Brut'),
  ('ambiance', 'loft-organique',   'Loft Organique'),
  ('ambiance', 'aube-intime',      'L''Aube Intime'),
  ('ambiance', 'echappee-sauvage', 'Échappée Sauvage'),
  ('ambiance', 'lumiere-sepia',    'Lumière Sépia')
ON CONFLICT (category, slug) DO NOTHING;

-- TYPES DE PLAN
INSERT INTO tags (category, slug, label) VALUES
  ('plan', 'hero',              'Hero / packshot principal'),
  ('plan', 'buste',             'Buste / détail broderie'),
  ('plan', 'lifestyle',         'Lifestyle / en situation'),
  ('plan', 'detail-broderie',   'Macro broderie'),
  ('plan', 'plat',              'Pose à plat (flat lay)'),
  ('plan', 'porte-dos',         'Porté de dos'),
  ('plan', 'duo',               'Duo / scène collective'),
  ('plan', 'main-coeur',        'Main sur cœur (mise en valeur broderie)')
ON CONFLICT (category, slug) DO NOTHING;

-- SAISONS
INSERT INTO tags (category, slug, label) VALUES
  ('saison', 'ete',           'Été'),
  ('saison', 'automne',       'Automne'),
  ('saison', 'hiver',         'Hiver'),
  ('saison', 'printemps',     'Printemps'),
  ('saison', 'mi-saison',     'Mi-saison'),
  ('saison', 'intemporel',    'Intemporel')
ON CONFLICT (category, slug) DO NOTHING;

-- OCCASIONS (matchent les collections Shopify)
INSERT INTO tags (category, slug, label) VALUES
  ('occasion', 'fete-des-meres',  'Fête des Mères'),
  ('occasion', 'fete-des-peres',  'Fête des Pères'),
  ('occasion', 'naissance',       'Naissance'),
  ('occasion', 'anniversaire',    'Anniversaire'),
  ('occasion', 'saint-valentin',  'Saint-Valentin'),
  ('occasion', 'evjf',            'EVJF'),
  ('occasion', 'mariage',         'Mariage'),
  ('occasion', 'noel',            'Noël'),
  ('occasion', 'paques',          'Pâques'),
  ('occasion', 'rentree',         'Rentrée scolaire'),
  ('occasion', 'fin-annee',       'Fin d''année')
ON CONFLICT (category, slug) DO NOTHING;

-- TONS
INSERT INTO tags (category, slug, label, color_hex) VALUES
  ('ton', 'tendre',    'Tendre & sincère',     '#F5C6D6'),
  ('ton', 'complice',  'Complice & fun',       '#F4B860'),
  ('ton', 'humour',    'Humour & second degré','#7C2D3F'),
  ('ton', 'affirme',   'Affirmé & statement',  '#1E2D4A')
ON CONFLICT (category, slug) DO NOTHING;

-- MANNEQUINS (placeholder, à enrichir depuis mannequins_recurrents.json)
INSERT INTO tags (category, slug, label) VALUES
  ('mannequin', 'man-p01', 'Mannequin P01'),
  ('mannequin', 'man-p02', 'Mannequin P02'),
  ('mannequin', 'man-p03', 'Mannequin P03'),
  ('mannequin', 'man-p04', 'Mannequin P04'),
  ('mannequin', 'man-p05', 'Mannequin P05'),
  ('mannequin', 'man-p06', 'Mathieu (P06)'),
  ('mannequin', 'man-p07', 'Mannequin P07'),
  ('mannequin', 'man-p08', 'Mannequin P08'),
  ('mannequin', 'man-p09', 'Mannequin P09'),
  ('mannequin', 'man-p10', 'Mannequin P10'),
  ('mannequin', 'man-p11', 'Mannequin P11'),
  ('mannequin', 'man-p12', 'Mannequin P12')
ON CONFLICT (category, slug) DO NOTHING;
