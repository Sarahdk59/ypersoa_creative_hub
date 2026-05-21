# Module Médiathèque Ypersoa — Spec technique pour Claude Code

> **Contexte** : Ce document est une spécification destinée à Claude Code en agent.
> Le repo cible est le Hub Ypersoa (Next.js 14 + TypeScript + Tailwind + shadcn/ui + Supabase).
> Volumétrie attendue : 200-1000 photos initialement, jusqu'à ~10000 à 1 an.
> Deadline : opérationnel pour piloter Fête des Pères / Noël 2026.

---

## Objectif fonctionnel

Construire un module Médiathèque dans le Hub Ypersoa permettant de :

1. **Centraliser** toutes les photos shooting (studio, lifestyle, IA, packshot) au même endroit
2. **Tagger** chaque photo avec une taxonomie catégorisée (incarnation, motif, gabarit, ambiance, mannequin, plan, occasion, ton, couleur produit, saison)
3. **Filtrer & rechercher** rapidement par combinaisons de tags
4. **Exporter / exploiter** pour alimenter Shopify (metafields), Instagram, moodboards PDF, audits production

---

## Architecture data

### Tables Supabase à créer

```sql
-- ─────────────────────────────────────────────────────────────────
-- MEDIA : la photo et ses métadonnées techniques
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE media (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filename        TEXT NOT NULL,
  storage_path    TEXT NOT NULL UNIQUE,
  public_url      TEXT NOT NULL,
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

CREATE INDEX idx_media_statut ON media(statut);
CREATE INDEX idx_media_source ON media(source);
CREATE INDEX idx_media_uploaded ON media(uploaded_at DESC);

-- ─────────────────────────────────────────────────────────────────
-- TAGS : taxonomie catégorisée
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE tags (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category    TEXT NOT NULL,
  slug        TEXT NOT NULL,
  label       TEXT NOT NULL,
  color_hex   TEXT DEFAULT '#1E2D4A',
  parent_id   UUID REFERENCES tags(id),
  created_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE(category, slug)
);

-- Catégories valides : incarnation, motif, gabarit, couleur_produit,
-- ambiance, mannequin, plan, saison, occasion, ton, custom

CREATE INDEX idx_tags_category ON tags(category);

-- ─────────────────────────────────────────────────────────────────
-- MEDIA_TAGS : liaison many-to-many
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE media_tags (
  media_id  UUID REFERENCES media(id) ON DELETE CASCADE,
  tag_id    UUID REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (media_id, tag_id)
);

CREATE INDEX idx_media_tags_media ON media_tags(media_id);
CREATE INDEX idx_media_tags_tag ON media_tags(tag_id);

-- ─────────────────────────────────────────────────────────────────
-- MEDIA_COLLECTIONS : albums/moodboards
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE media_collections (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nom          TEXT NOT NULL,
  description  TEXT,
  cover_media_id UUID REFERENCES media(id),
  created_at   TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE media_collections_items (
  collection_id  UUID REFERENCES media_collections(id) ON DELETE CASCADE,
  media_id       UUID REFERENCES media(id) ON DELETE CASCADE,
  ordre          INT,
  PRIMARY KEY (collection_id, media_id)
);
```

### Taxonomie de tags pré-remplie (seed)

À importer en SEED après création des tables :

```sql
-- INCARNATIONS (sera complété au fur et à mesure des shootings)
INSERT INTO tags (category, slug, label) VALUES
  ('incarnation', 'mama-club',       'MAMA CLUB'),
  ('incarnation', 'papa-club',       'PAPA CLUB'),
  ('incarnation', 'sista-club',      'SISTA CLUB'),
  ('incarnation', 'famille-club',    'FAMILLE CLUB'),
  ('incarnation', 'amour-club',      'AMOUR CLUB'),
  ('incarnation', 'bride-team',      'BRIDE TEAM'),
  ('incarnation', 'dog-dad-gang',    'DOG DAD GANG'),
  ('incarnation', 'crew-summer',     'CREW SUMMER'),
  ('incarnation', 'team-dog',        'TEAM DOG'),
  ('incarnation', 'papi-club',       'PAPI CLUB'),
  ('incarnation', 'mamie-club',      'MAMIE CLUB');

-- MOTIFS (depuis le référentiel YPM)
INSERT INTO tags (category, slug, label) VALUES
  ('motif', 'ypm-001', 'La Brigitte'),
  ('motif', 'ypm-002', "L'Ambre"),
  ('motif', 'ypm-003', 'Le Club'),
  ('motif', 'ypm-004', 'Notre Héritage'),
  ('motif', 'ypm-005', "L'Annonce"),
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
  ('motif', 'ypm-017', 'La Florale');

-- GABARITS (depuis le référentiel YP)
INSERT INTO tags (category, slug, label) VALUES
  ('gabarit', 'yp001', 'Hoodie Adulte'),
  ('gabarit', 'yp004', 'Hoodie Enfant'),
  ('gabarit', 'yp005', 'Sweat Adulte'),
  ('gabarit', 'yp019', 'T-Shirt Adulte'),
  ('gabarit', 'yp020', 'Zoodie (S)'),
  ('gabarit', 'yp021', 'Zoodie');

-- COULEURS PRODUIT (depuis le référentiel couleurs textile, pas fils)
INSERT INTO tags (category, slug, label) VALUES
  ('couleur_produit', 'creme',         'Crème'),
  ('couleur_produit', 'blanc',         'Blanc'),
  ('couleur_produit', 'beige',         'Beige'),
  ('couleur_produit', 'noir',          'Noir'),
  ('couleur_produit', 'marine',        'Marine'),
  ('couleur_produit', 'vert-sauge',    'Vert Sauge'),
  ('couleur_produit', 'rose-pale',     'Rose Pâle'),
  ('couleur_produit', 'kaki',          'Kaki'),
  ('couleur_produit', 'lilas',         'Lilas'),
  ('couleur_produit', 'gris-fonce',    'Gris foncé');

-- AMBIANCES SHOOTING (depuis ambiances_shooting.json)
INSERT INTO tags (category, slug, label) VALUES
  ('ambiance', 'studio-brut',      'Studio Brut'),
  ('ambiance', 'loft-organique',   'Loft Organique'),
  ('ambiance', 'aube-intime',      "L'Aube Intime"),
  ('ambiance', 'echappee-sauvage', 'Échappée Sauvage'),
  ('ambiance', 'lumiere-sepia',    'Lumière Sépia');

-- MANNEQUINS (top 12 du référentiel principal)
INSERT INTO tags (category, slug, label) VALUES
  ('mannequin', 'man-p01', 'Mannequin P01'),
  ('mannequin', 'man-p06', 'Mathieu (P06)'),
  ('mannequin', 'man-p12', 'Mannequin P12');
  -- (à compléter avec les 20 mannequins du référentiel mannequins_recurrents.json)

-- TYPES DE PLAN (depuis types_de_shots.json)
INSERT INTO tags (category, slug, label) VALUES
  ('plan', 'hero',              'Hero / packshot principal'),
  ('plan', 'buste',             'Buste / détail broderie'),
  ('plan', 'lifestyle',         'Lifestyle / en situation'),
  ('plan', 'detail-broderie',   'Macro broderie'),
  ('plan', 'plat',              'Pose à plat (flat lay)'),
  ('plan', 'porte',             'Porté de dos');

-- SAISONS
INSERT INTO tags (category, slug, label) VALUES
  ('saison', 'ete',           'Été'),
  ('saison', 'hiver',         'Hiver'),
  ('saison', 'mi-saison',     'Mi-saison'),
  ('saison', 'intemporel',    'Intemporel');

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
  ('occasion', 'ete',             'Été / vacances');

-- TONS
INSERT INTO tags (category, slug, label) VALUES
  ('ton', 'tendre',    'Tendre & sincère'),
  ('ton', 'complice',  'Complice & fun'),
  ('ton', 'humour',    'Humour & second degré'),
  ('ton', 'affirme',   'Affirmé & statement');
```

---

## Routes API à créer (Next.js App Router)

```
/app/api/media/route.ts                  → GET (liste filtrée) + POST (upload)
/app/api/media/[id]/route.ts             → GET (détail) + PATCH (édition) + DELETE
/app/api/media/[id]/tags/route.ts        → POST (ajout tag) + DELETE (retrait tag)
/app/api/tags/route.ts                   → GET (liste) + POST (création)
/app/api/tags/[id]/route.ts              → PATCH + DELETE (avec merge)
/app/api/collections/route.ts            → CRUD albums
/app/api/exports/shopify-metafield/route.ts  → POST : génère JSON metafield depuis sélection
/app/api/exports/moodboard-pdf/route.ts  → POST : génère PDF depuis sélection
```

### Spécification GET /api/media (l'endpoint clé)

Query params supportés (combinables) :
- `tags[]=` (multi-valué, ex: `tags[]=incarnation:mama-club&tags[]=gabarit:yp001`)
- `q=` (recherche full-text sur filename + notes)
- `source=` (filtre source)
- `statut=` (filtre statut)
- `page=` (pagination, défaut 1)
- `per_page=` (défaut 48)
- `sort=` (date_desc, date_asc, name_asc)

Logique de filtrage tags : **AND** entre catégories, **OR** dans une même catégorie.
Exemple : `tags[]=incarnation:mama-club&tags[]=incarnation:papa-club&tags[]=gabarit:yp001`
→ Photos qui ont (MAMA CLUB OR PAPA CLUB) AND gabarit Hoodie.

Réponse :
```json
{
  "data": [
    {
      "id": "uuid",
      "filename": "mama-club-hoodie-001.jpg",
      "public_url": "https://...",
      "width": 1920, "height": 2880,
      "source": "shooting_studio",
      "statut": "validee",
      "uploaded_at": "2026-04-15T...",
      "tags": [
        {"category": "incarnation", "slug": "mama-club", "label": "MAMA CLUB"},
        {"category": "motif", "slug": "ypm-003", "label": "Le Club"},
        {"category": "gabarit", "slug": "yp001", "label": "Hoodie Adulte"}
      ]
    }
  ],
  "meta": {"total": 247, "page": 1, "per_page": 48, "total_pages": 6}
}
```

---

## Pages UI à créer

### 1. `/hub/media` — Galerie principale

Layout :
- Sidebar gauche (260px) : filtres par catégorie (Incarnation, Motif, Gabarit, Ambiance, Plan, Occasion, Ton)
- Header sticky : barre de recherche + tri + bouton « + Upload » (style ta page palettes)
- Grid masonry 4 colonnes desktop / 2 mobile
- Card photo : image + chip incarnation + chip motif + (au survol) actions (édit, supprimer, sélectionner)
- Mode sélection multiple (checkbox top-left de chaque card)
- Quand >0 sélections : barre flottante en bas avec actions batch (tagger, exporter, archiver, supprimer)

Style cohérent avec ta page Palettes mix & match (capture précédente) :
- Background `#F5F0EA`
- Cartes blanches arrondies avec ombre légère
- Titre Cormorant Garamond
- Body Helvetica Neue
- Accents Terracotta `#C4694A` et Ink `#1E2D4A`

### 2. `/hub/media/upload` — Upload batch

- Zone drag-and-drop full-width centrée
- Liste verticale des fichiers en cours d'upload
- Pour chaque fichier : miniature + champs tags + barre progression
- Bouton « Appliquer ces tags à tous les fichiers » (gain de temps)
- Auto-suggestion de tags depuis le nom de fichier (si pattern « mama-club-hoodie » détecté → propose les tags correspondants)
- Upload vers Supabase Storage bucket `ypersoa-media/` avec arborescence par source/date
- Insertion en base avec statut `a_valider` par défaut

### 3. `/hub/media/[id]` — Édition photo

Layout 2 colonnes :
- Colonne gauche (60%) : preview grand format avec navigation prev/next
- Colonne droite (40%) :
  - Métadonnées techniques (read-only)
  - Source, date, photographe (éditables)
  - Tags actuels en chips supprimables, groupés par catégorie
  - Champ « Ajouter un tag » avec auto-complétion
  - Statut (dropdown)
  - Notes (textarea)
  - Actions : Dupliquer, Archiver, Télécharger original, Copier URL

### 4. `/hub/media/tags` — Gestion taxonomie

Liste des tags par catégorie, avec :
- Compteur d'usage (combien de médias utilisent ce tag)
- Bouton renommer
- Bouton fusionner (merge 2 tags en 1, déplace les liaisons)
- Bouton supprimer (si 0 usage)
- Bouton « + Nouveau tag »

### 5. `/hub/media/collections` — Albums

Vue grid des albums (comme ta page palettes mais pour albums).
Click sur un album → page album = galerie filtrée sur les médias de l'album, avec ordre custom (drag-and-drop pour réordonner).

---

## Fonctionnalités d'export (différenciantes Ypersoa)

### Export 1 : Metafield Shopify

Depuis une sélection de N photos (idéalement 4-8), le bouton « Générer metafield Shopify » produit le JSON exact à coller dans le metafield `custom.incarnations` d'un produit Shopify, au format :

```json
{
  "incarnations": [
    {
      "code": "YPI-001",
      "nom": "MAMA CLUB",
      "mot_haut": "MAMA",
      "mot_bas": "CLUB",
      "symbole": "Cœur",
      "couleur_fil": "Vert sapin",
      "photo_hero": "https://supabase-storage-url/.../mama-club-hoodie-001.jpg",
      "collections_cibles": ["pour-maman", "fete-des-meres", "naissance"]
    }
  ]
}
```

Logique : pour chaque photo de la sélection, on lit ses tags et on construit l'entrée incarnation. L'utilisateur peut ajuster avant copie.

### Export 2 : Moodboard PDF

Sélection de N photos → bouton « Moodboard PDF » → PDF A4 paysage avec grille 3×4 photos + titre + date. Pour partager à un partenaire, presse, ou imprimer en atelier.

### Export 3 : Pack Instagram

Sélection de 9 photos → bouton « Pack Instagram 3×3 » → ZIP contenant les 9 images redimensionnées 1080×1080, numérotées dans l'ordre de la sélection. Pour préparer une grille Instagram cohérente.

### Export 4 : Audit production CSV

Bouton « Exporter l'audit » sur la page galerie → CSV listant pour chaque combinaison motif × incarnation × gabarit le statut « shooté / à shooter ». Permet à Sarah de piloter le planning Maï/Adriana.

---

## Storage Supabase

Bucket public : `ypersoa-media`
Arborescence :
```
ypersoa-media/
├── shooting-studio/2026-04-mama-club-batch/
├── shooting-lifestyle/2026-04-loft-organique/
├── ia-generation/2026-04-nano-banana/
└── packshot/2026-05/
```

Policies RLS : lecture publique (les URLs des photos doivent être accessibles depuis Shopify et Instagram), écriture authentifiée (admin Hub uniquement).

Quotas à monitorer :
- Supabase Free : 1 GB storage, 5 GB bandwidth/mois
- Supabase Pro : 100 GB storage, 200 GB bandwidth
- Avec ~1000 photos à 2 Mo/photo en moyenne → 2 GB → migrer en Pro dès 500+ photos

Optimisation : générer une thumbnail 600px lors de l'upload (via API route ou Edge function) et stocker dans `thumbnails/`. La galerie affiche les thumbnails, la fiche détail charge l'original.

---

## Stack technique recommandée

- **Next.js 14** (App Router)
- **TypeScript** strict
- **Tailwind CSS** + **shadcn/ui** (Card, Dialog, Select, Badge, Button cohérents avec ta page palettes)
- **Supabase** (Database + Storage + Auth)
- **react-dropzone** pour l'upload drag-and-drop
- **react-pdf** ou **@react-pdf/renderer** pour la génération moodboard PDF
- **sharp** côté serveur pour génération thumbnails
- **archiver** pour la génération ZIP Instagram pack

---

## Priorisation d'implémentation (MVP → V1)

### Sprint 1 (MVP, 2-3 jours dev)
- Migrations Supabase + seed taxonomie
- Page galerie basique (grid + filtres incarnation + motif + gabarit)
- Page upload batch avec drag-and-drop
- API CRUD médias et tags

### Sprint 2 (V1, 2-3 jours)
- Édition d'une photo (tags ajout/retrait, métadonnées)
- Recherche full-text
- Mode sélection multiple + actions batch (tagger en masse, archiver)
- Page gestion taxonomie

### Sprint 3 (différenciants, 2-3 jours)
- Export metafield Shopify
- Albums / collections
- Moodboard PDF
- Audit production CSV

### Sprint 4 (polish, 1-2 jours)
- Optimisation thumbnails
- Pack Instagram ZIP
- Stats dashboard (combien de photos par incarnation, par motif, par statut)

---

## Cohérence avec l'écosystème Hub Ypersoa

Le module Médiathèque doit s'intégrer avec :

1. **Référentiel incarnations** (`04_INCARNATIONS.xlsx` → table `incarnations`) :
   - Quand on tagge une photo `incarnation:mama-club`, le tag est lié à l'incarnation YPI-001
   - La fiche incarnation affiche automatiquement toutes les photos taggées

2. **Référentiel motifs** (table `motifs`) :
   - Idem pour les tags `motif:ypm-XXX`

3. **Atelier social** (`apps/atelier-social/`) :
   - Pouvoir piocher directement dans la médiathèque pour générer des posts Instagram/Pinterest
   - Le bouton « Utiliser dans Atelier Social » lance le générateur de contenu avec la photo sélectionnée

4. **Production hub** (`prod_hub/`) :
   - Pouvoir lier une photo à une variante produit (couleur de fil utilisée, palette mix & match appliquée)

5. **Bordereau atelier Shopify** :
   - Pas de lien direct nécessaire pour MVP

---

## Inspirations UX

Pour la galerie : **Eagle.cool**, **Pinterest**, **Cloudinary Media Explorer**, **Are.na**.
Pour les filtres : **Linear** (sidebar avec compteurs), **Notion** (filtres par propriété).
Pour l'upload : **Vercel** (drag-and-drop avec preview live), **Cloudinary**.

---

## Livrables attendus de Claude Code

1. Migration SQL (`supabase/migrations/XXXX_create_media_module.sql`)
2. Seed taxonomie (`supabase/seeds/media_tags.sql`)
3. Types TypeScript (`types/media.ts`)
4. API routes complètes (`app/api/media/...`, `app/api/tags/...`)
5. Composants React (`components/media/Gallery.tsx`, `UploadDropzone.tsx`, `TagFilter.tsx`, `MediaCard.tsx`, `MediaDetail.tsx`)
6. Pages (`app/(hub)/media/page.tsx`, `app/(hub)/media/upload/page.tsx`, etc.)
7. Helpers Supabase (`lib/supabase/media.ts`)
8. Tests sur les endpoints critiques (filtre tags AND/OR, upload batch)

---

## Prompt à donner à Claude Code

> Je veux ajouter un module Médiathèque au Hub Ypersoa selon la spec dans
> `docs/SPEC_MEDIATHEQUE.md`. Démarre par le sprint 1 (MVP) : crée la
> migration Supabase, le seed de taxonomie, les API routes CRUD médias
> et tags, et la page galerie basique avec filtres incarnation/motif/gabarit
> et l'upload drag-and-drop. Respecte la stack existante du Hub
> (Next.js 14 App Router, TypeScript strict, Tailwind, shadcn/ui, Supabase)
> et la charte graphique (background `#F5F0EA`, accents Terracotta `#C4694A`
> et Ink `#1E2D4A`, titres Cormorant Garamond, body Helvetica Neue).
> Quand le sprint 1 est terminé, propose-moi le commit et passe au sprint 2.
