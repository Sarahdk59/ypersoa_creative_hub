# Module Incarnations Ypersoa — Spec technique pour Claude Code

> **Contexte** : Ce document est une spécification destinée à Claude Code en agent.
> Le repo cible est le Hub Ypersoa (Next.js 14 + TypeScript + Tailwind + shadcn/ui + Supabase).
> Ce module est étroitement lié au module Médiathèque (voir `SPEC_MEDIATHEQUE.md`).
> Source de données initiale : `04_INCARNATIONS.xlsx` (5 feuilles).

---

## Définition métier

Une **incarnation** est une déclinaison éditoriale pré-définie d'un motif de broderie Ypersoa.

Exemple : sur le motif `YPM-003 Le Club`, on peut décliner :
- **MAMA CLUB** : badge rond, mot haut "MAMA", mot bas "CLUB", symbole Cœur, fil Vert sapin
- **PAPA CLUB** : mêmes traits structurels, mais "PAPA" + "CLUB" + Cœur + Bleu marine
- **DOG DAD GANG** : "DOG DAD" + "GANG" + Patte + Crème
- **BRIDE TEAM** : "BRIDE" + "TEAM" + Cœur + Rose poudré
- etc.

Une incarnation **n'est pas un produit Shopify**. C'est :
1. Une suggestion de texte exposée comme **chip** dans le configurateur
2. Une photo qui s'affiche **contextuellement** selon la collection d'entrée du client (PAPA CLUB sur `/collections/pour-papa`, MAMA CLUB sur `/collections/pour-maman`)
3. Une entrée dans le **carrousel "Tu aimeras aussi"** de la PDP
4. Un élément de **moodboard** que le Hub référence pour la production de visuels
5. Un **objectif de production** : pour chaque incarnation, on sait ce qu'il faut digitaliser, shooter, publier

Le client reste **libre** de personnaliser au-delà : il peut taper "COOL GIRLS", "TEAM 2024", "BEST DAD EVER", n'importe quoi. Les incarnations sont des **propositions**, pas des contraintes.

---

## Objectifs fonctionnels du module

1. **Centraliser** le référentiel des incarnations (CRUD)
2. **Lier** chaque incarnation à un motif YPM + ses gabarits cibles + ses tags éditoriaux
3. **Auditer** ce qui est shooté vs ce qui manque, motif par motif
4. **Générer** les metafields Shopify pour activer les photos contextuelles
5. **Alimenter** les chips du configurateur Shopify via export JSON
6. **Lier** chaque incarnation à ses photos dans la Médiathèque

---

## Architecture data

### Tables Supabase à créer

```sql
-- ─────────────────────────────────────────────────────────────────
-- TABLE : incarnations
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE incarnations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code            TEXT NOT NULL UNIQUE,           -- YPI-001
  nom_commercial  TEXT NOT NULL,                  -- "MAMA CLUB"
  motif_ypm       TEXT NOT NULL,                  -- "YPM-003" (FK logique vers motifs)
  
  -- Spec broderie (pour pré-remplir le configurateur)
  spec_broderie   JSONB NOT NULL,                 -- {mot_haut, mot_bas, symbole, couleur_fil_defaut, ...}
  
  -- Ciblage éditorial
  gabarits_cibles  TEXT[] DEFAULT '{}',           -- ["YP001","YP005","YP019"]
  collections_cibles TEXT[] DEFAULT '{}',         -- ["pour-maman","fete-des-meres"]
  ton              TEXT CHECK (ton IN ('tendre','complice','humour','affirme')),
  
  -- Workflow
  statut           TEXT DEFAULT 'concept' CHECK (statut IN (
                     'concept',        -- idée à valider
                     'a_digitaliser',  -- validée, à digitaliser sur Hatch/PulseID
                     'a_shooter',      -- digitalisée, à photographier
                     'a_publier',      -- photographiée, à intégrer dans le Hub
                     'actif',          -- active, alimente le site
                     'archive'         -- retirée
                   )),
  
  -- Contenu généré
  description_template TEXT,           -- template body produit (pour générateur Shopify)
  
  -- Audit
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_incarnations_motif ON incarnations(motif_ypm);
CREATE INDEX idx_incarnations_statut ON incarnations(statut);
CREATE INDEX idx_incarnations_ton ON incarnations(ton);
CREATE INDEX idx_incarnations_collections ON incarnations USING gin(collections_cibles);
CREATE INDEX idx_incarnations_gabarits ON incarnations USING gin(gabarits_cibles);

-- ─────────────────────────────────────────────────────────────────
-- TABLE : incarnations_photos (liaison vers media)
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE incarnations_photos (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incarnation_id  UUID REFERENCES incarnations(id) ON DELETE CASCADE,
  media_id        UUID REFERENCES media(id) ON DELETE CASCADE,
  gabarit         TEXT NOT NULL,                  -- "YP001" (sur quel gabarit cette photo a été shootée)
  couleur_produit TEXT,                           -- "creme" (couleur du textile)
  is_hero         BOOLEAN DEFAULT false,          -- photo principale de l'incarnation pour ce gabarit
  ordre           INT DEFAULT 0,                  -- ordre d'affichage
  created_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE(incarnation_id, media_id)
);

CREATE INDEX idx_incarnations_photos_inc ON incarnations_photos(incarnation_id);
CREATE INDEX idx_incarnations_photos_media ON incarnations_photos(media_id);

-- Contrainte : une seule photo hero par (incarnation, gabarit)
CREATE UNIQUE INDEX idx_incarnations_photos_hero_unique 
  ON incarnations_photos(incarnation_id, gabarit) 
  WHERE is_hero = true;

-- ─────────────────────────────────────────────────────────────────
-- TABLE : motifs (référentiel YPM, si pas déjà existant)
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS motifs (
  code        TEXT PRIMARY KEY,                   -- "YPM-003"
  nom         TEXT NOT NULL,                      -- "Le Club"
  famille     TEXT,                               -- "Signes/Badges"
  description TEXT,
  fichier_dst TEXT,                               -- chemin vers le fichier broderie Tajima
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- Si la table existe déjà dans le Hub, ignorer ce bloc.
-- Sinon, peupler avec les 17 motifs depuis le référentiel.
```

### Vue agrégée

```sql
-- Vue : incarnation enrichie avec compteurs photos et statut shooting par gabarit
CREATE OR REPLACE VIEW incarnations_enriched AS
SELECT
  i.*,
  m.nom AS motif_nom,
  m.famille AS motif_famille,
  COALESCE(
    json_agg(
      json_build_object(
        'gabarit', ip.gabarit,
        'couleur_produit', ip.couleur_produit,
        'media_id', ip.media_id,
        'public_url', med.public_url,
        'is_hero', ip.is_hero
      ) ORDER BY ip.is_hero DESC, ip.ordre
    ) FILTER (WHERE ip.id IS NOT NULL),
    '[]'::json
  ) AS photos,
  COUNT(DISTINCT ip.gabarit) FILTER (WHERE ip.id IS NOT NULL) AS gabarits_shootes_count,
  array_length(i.gabarits_cibles, 1) AS gabarits_cibles_count
FROM incarnations i
LEFT JOIN motifs m ON i.motif_ypm = m.code
LEFT JOIN incarnations_photos ip ON i.id = ip.incarnation_id
LEFT JOIN media med ON ip.media_id = med.id
GROUP BY i.id, m.nom, m.famille;
```

---

## Routes API à créer

```
/app/api/incarnations/route.ts                       → GET (liste filtrée) + POST (création)
/app/api/incarnations/[id]/route.ts                  → GET + PATCH + DELETE
/app/api/incarnations/[id]/photos/route.ts           → GET (photos liées) + POST (liaison)
/app/api/incarnations/[id]/photos/[mediaId]/route.ts → DELETE (déliaison) + PATCH (is_hero, ordre)
/app/api/incarnations/audit/route.ts                 → GET (matrice motif × incarnation × gabarit)
/app/api/incarnations/import-xlsx/route.ts           → POST (import depuis 04_INCARNATIONS.xlsx)
/app/api/exports/chips-configurateur/route.ts        → POST : génère JSON chips pour Shopify
/app/api/exports/metafield-incarnations/route.ts     → POST : génère metafield complet pour un motif
```

### Spécification GET /api/incarnations

Query params :
- `motif_ypm=` (filtre par motif)
- `statut=` (filtre par statut workflow)
- `ton=` (filtre par registre)
- `gabarit=` (filtre par gabarit cible)
- `collection=` (filtre par collection cible)
- `q=` (recherche full-text sur nom_commercial)
- `sort=` (code_asc, nom_asc, statut, updated_desc)

Réponse :
```json
{
  "data": [
    {
      "id": "uuid",
      "code": "YPI-001",
      "nom_commercial": "MAMA CLUB",
      "motif_ypm": "YPM-003",
      "motif_nom": "Le Club",
      "statut": "actif",
      "ton": "tendre",
      "spec_broderie": {
        "mot_haut": "MAMA",
        "mot_bas": "CLUB",
        "symbole": "Cœur",
        "couleur_fil_defaut": "Vert sapin"
      },
      "gabarits_cibles": ["YP001","YP005","YP019"],
      "collections_cibles": ["pour-maman","fete-des-meres","naissance"],
      "gabarits_shootes_count": 3,
      "gabarits_cibles_count": 3,
      "photos": [
        {
          "gabarit": "YP001",
          "couleur_produit": "creme",
          "media_id": "uuid",
          "public_url": "https://...",
          "is_hero": true
        }
      ]
    }
  ],
  "meta": {"total": 13, "page": 1}
}
```

### Spécification GET /api/incarnations/audit

Retourne une matrice utilisable pour l'écran d'audit.

```json
{
  "motifs": [
    {
      "code": "YPM-003",
      "nom": "Le Club",
      "incarnations_actuelles": 9,
      "incarnations_a_creer": ["PAPI LE CLUB", "MAMIE LE CLUB", "TONTON LE CLUB"],
      "priorite": "haute",
      "details": [
        {
          "incarnation_code": "YPI-001",
          "incarnation_nom": "MAMA CLUB",
          "statut": "actif",
          "gabarits": {
            "YP001": {"statut": "shootee", "photos_count": 3, "is_hero_defined": true},
            "YP005": {"statut": "shootee", "photos_count": 2, "is_hero_defined": true},
            "YP019": {"statut": "manquant", "photos_count": 0, "is_hero_defined": false},
            "YP021": {"statut": "non_cible", "photos_count": 0}
          }
        }
      ]
    }
  ]
}
```

---

## Pages UI à créer

### 1. `/hub/incarnations` — Liste des incarnations

Layout (cohérent avec ta page palettes mix & match) :
- Sidebar gauche : filtres par motif, statut, ton, gabarit, collection cible
- Grid de cards 3-4 colonnes
- Chaque card affiche :
  - Photo hero (ou placeholder gris si pas de photo)
  - Code (YPI-001) en petit
  - Nom commercial (MAMA CLUB) en titre Cormorant Garamond
  - Badge motif (Le Club) en chip Terracotta
  - Badge statut coloré (vert actif, jaune à shooter, rouge concept)
  - Mini-icônes des gabarits cibles avec checkmark vert si shooté
  - Compteur "3/3 gabarits shootés" ou "1/4 manquants"
- Bouton "+ Nouvelle incarnation" en haut à droite
- Bouton "Importer XLSX" pour importer le fichier `04_INCARNATIONS.xlsx`

### 2. `/hub/incarnations/[code]` — Fiche détaillée

Layout 2 colonnes :

**Colonne gauche (40%) — Identité** :
- Code + nom commercial (éditables)
- Motif YPM (select avec recherche, vers référentiel motifs)
- Statut (dropdown avec couleurs)
- Ton (4 boutons : tendre / complice / humour / affirmé)
- Spec broderie (formulaire structuré) :
  - Mot haut (input)
  - Mot bas (input)
  - Symbole (select : Cœur, Étoile, Trèfle, Fleur, Infini, Patte, Aucun, Custom)
  - Couleur fil défaut (select sur référentiel couleurs fils, avec swatch)
- Gabarits cibles (checkboxes multi-select sur référentiel YP)
- Collections cibles (multi-select avec tags éditoriaux)
- Notes (textarea)

**Colonne droite (60%) — Bibliothèque visuelle** :
- Grid des photos liées, groupées par gabarit
- Pour chaque gabarit cible :
  - Header "Hoodie (YP001) — 3 photos"
  - Mini-grid des photos avec :
    - Toggle "Hero" (l'étoile, une seule photo hero par gabarit)
    - Bouton "Délier"
    - Ordre drag-and-drop
  - Si 0 photo : message "Aucune photo pour ce gabarit" + bouton "+ Lier depuis la médiathèque"
- Bouton "+ Ajouter des photos" → ouvre une modale picker depuis la Médiathèque (galerie filtrable par tags)

**En bas** :
- Bouton "Générer fiche Shopify" (export metafield + chips)
- Bouton "Archiver"

### 3. `/hub/incarnations/audit` — Matrice de production

Vue tableau dense :

```
                    YP001  YP005  YP019  YP021
MAMA CLUB           ✓ 3   ✓ 2   ✓ 4   —
PAPA CLUB           ✓ 2   —     ✓ 3   ✓ 1
SISTA CLUB          ✓ 2   ✓ 1   —     —
PAPI CLUB           —     —     —     —
MAMIE CLUB          —     —     —     —
```

- ✓ vert = shooté avec hero défini
- ⚠ orange = shooté mais pas de hero
- — gris = manquant ou non ciblé
- Click sur une cellule → filtre la médiathèque sur cette combinaison

Filtres en haut : motif, ton, priorité.
KPI en header :
- "12 incarnations actives sur 17 motifs"
- "47 photos à produire pour atteindre la cible"
- "3 motifs à digitaliser (Papi, Mamie, Cool Girls)"

Boutons exports :
- "Exporter audit CSV" (compatible avec la feuille `AUDIT_MANQUES` du référentiel)
- "Exporter plan production PDF" (checklist par responsable : Maï/Adriana/Sarah)

### 4. `/hub/incarnations/import` — Import XLSX

Page simple :
- Zone drop pour `04_INCARNATIONS.xlsx`
- Aperçu des incarnations détectées dans le fichier
- Pour chaque ligne :
  - Statut : "Nouvelle" / "Existante (sera mise à jour)" / "Conflit (à résoudre)"
  - Checkbox pour inclure/exclure
- Bouton "Importer X incarnations"

L'import lit les 5 feuilles du XLSX :
- INCARNATIONS → table `incarnations`
- CHIPS_CONFIGURATEUR → ne touche pas la base, sert juste à la prévisualisation
- COLLECTIONS_PHOTOS → ne touche pas (sera reconstruit dynamiquement depuis les tags)
- AUDIT_MANQUES → ne touche pas (sera recalculé)
- STATUTS → ne touche pas (déjà encodé dans les CHECK CONSTRAINT)

---

## Fonctionnalités d'export

### Export 1 : Metafield Shopify pour un motif

Endpoint : `POST /api/exports/metafield-incarnations`
Body : `{motif_ypm: "YPM-003"}`

Génère le JSON metafield au format de `metafield_le_club_exemple.json` :

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
      "photo_hero": "https://supabase-storage/.../mama-club-hoodie-creme.jpg",
      "photo_thumb": "https://supabase-storage/.../thumbnails/mama-club-hoodie-creme.jpg",
      "collections_cibles": ["pour-maman", "fete-des-meres", "naissance"],
      "ton": "tendre"
    },
    ...
  ],
  "chips_configurateur": ["MAMA", "PAPA", "SISTA", "AMOUR", "FAMILLE", "TEAM"]
}
```

Logique :
- Récupère toutes les incarnations actives du motif YPM-003
- Pour chaque, prend la photo hero (priorité YP001 puis YP005 puis YP019)
- Construit la liste chips depuis les mot_haut des incarnations actives, dans l'ordre alphabétique ou un ordre configurable

UI : modal qui affiche le JSON, bouton "Copier", bouton "Télécharger .json".

### Export 2 : Chips configurateur (export rapide)

Endpoint : `POST /api/exports/chips-configurateur`
Body : `{motif_ypm: "YPM-003", limit: 6}`

Retourne juste le tableau de chips :
```json
{"chips": ["MAMA", "PAPA", "SISTA", "AMOUR", "FAMILLE", "TEAM"]}
```

Pour alimenter le snippet Liquid du configurateur.

### Export 3 : Audit CSV

Endpoint : `GET /api/exports/audit-csv`

Retourne un CSV téléchargeable, structure identique à la feuille `AUDIT_MANQUES` de `04_INCARNATIONS.xlsx` :

```csv
Motif YPM,Motif nom,Famille,Incarnations actuelles,Nb actuelles,Incarnations suggérées à créer,Nb manquantes,Priorité
YPM-003,Le Club,Signes/Badges,MAMA CLUB · PAPA CLUB · ...,9,PAPI LE CLUB · MAMIE LE CLUB,2,haute
```

### Export 4 : Plan de production PDF

Endpoint : `POST /api/exports/plan-production-pdf`
Body : `{horizon_campagne: "fete-des-peres-2026", deadline: "2026-06-11"}`

PDF A4 portrait avec :
- En-tête : "Plan production Ypersoa — Fête des Pères 2026"
- Section "À digitaliser" (pour Sarah) : liste des motifs à digitaliser
- Section "À shooter" (pour Maï) : liste des incarnations à shooter, groupées par incarnation × gabarit
- Section "À publier" (pour Sarah) : liste des incarnations dont les photos sont prêtes, à intégrer

---

## Intégration avec les autres modules du Hub

### Lien avec Médiathèque (`media`)

- Table `incarnations_photos` liée à `media` par FK
- Quand on lie une photo dans la fiche incarnation :
  - Soit on pioche dans la galerie existante
  - Soit on upload une nouvelle photo (utilise le module Médiathèque sous le capot)
- Lors de la liaison, le tag `incarnation:mama-club` est automatiquement ajouté à la photo dans la médiathèque

### Lien avec Référentiel Motifs (`motifs`)

- FK `incarnations.motif_ypm` → `motifs.code`
- La fiche motif liste toutes les incarnations qui en dépendent
- Compteur sur la fiche motif : "9 incarnations actives, 3 à shooter"

### Lien avec Référentiel Mannequins (`mannequins`)

- Pas de lien direct, mais via les tags de la photo (le mannequin est un tag média)
- Permet de filtrer "toutes les incarnations shootées avec MAN-P06 Mathieu"

### Lien avec Atelier Social (`apps/atelier-social/`)

- Bouton "Générer un post Instagram" sur la fiche incarnation
- Passe l'incarnation comme contexte au générateur de contenu social
- Le post est enrichi avec la photo hero, le nom de l'incarnation, le motif, le ton

### Lien avec Production Hub (`prod_hub/`)

- Pas de lien direct (la production atelier ne dépend que du SKU + LIP commande)
- Mais le référentiel d'incarnations peut alimenter des suggestions pour `moteur_attribution.py` (couleur fil par défaut quand le client tape un mot sans choisir explicitement)

---

## Priorisation d'implémentation

### Sprint 1 (MVP, 2-3 jours)

- Migration Supabase (tables incarnations + incarnations_photos + motifs)
- Import du XLSX `04_INCARNATIONS.xlsx`
- Page liste `/hub/incarnations` avec filtres motif/statut/ton
- Page fiche détaillée (lecture + édition de base)
- API CRUD incarnations

### Sprint 2 (V1, 2-3 jours)

- Liaison avec module Médiathèque (picker de photos, gestion is_hero)
- Page audit `/hub/incarnations/audit` (matrice motif × incarnation × gabarit)
- Exports CSV audit
- Recherche full-text

### Sprint 3 (différenciants, 2-3 jours)

- Export metafield Shopify (le bijou)
- Export chips configurateur
- Plan de production PDF
- Stats dashboard (compteurs par statut, ton, motif)

### Sprint 4 (polish, 1-2 jours)

- Auto-suggestions de nouvelles incarnations basées sur les patterns du XLSX (MAMA + nom_motif, PAPA + nom_motif, etc.)
- Bouton "Cloner cette incarnation" (pratique pour créer rapidement PAPI CLUB depuis PAPA CLUB)
- Workflow de validation : transition concept → à_digitaliser → à_shooter → à_publier → actif avec timestamps
- Historique des changements (audit log)

---

## Critères d'acceptation par sprint

### Sprint 1
- [ ] J'arrive sur `/hub/incarnations`, je vois mes 13 incarnations pré-saisies dans le XLSX
- [ ] Je filtre par "motif: Le Club" → je vois 9 incarnations
- [ ] Je filtre par "statut: à shooter" → je vois PAPI CLUB et MAMIE CLUB
- [ ] Je clique sur MAMA CLUB, j'arrive sur sa fiche, je modifie le ton, ça sauvegarde
- [ ] Je crée une nouvelle incarnation TONTON CLUB depuis le bouton "+"
- [ ] J'importe une nouvelle version de `04_INCARNATIONS.xlsx`, les incarnations existantes sont mises à jour et les nouvelles ajoutées

### Sprint 2
- [ ] Sur la fiche MAMA CLUB, je vois les 3 photos shootées avec leur gabarit et hero défini
- [ ] Je peux lier une nouvelle photo depuis la médiathèque (modale picker filtrée)
- [ ] Je peux changer la photo hero d'un gabarit (l'ancienne perd son statut hero)
- [ ] Sur l'écran audit, je vois la matrice complète et identifie les manques
- [ ] Le CSV audit est téléchargeable et structuré correctement

### Sprint 3
- [ ] Je clique "Générer metafield Shopify" pour Le Club, je récupère un JSON valide
- [ ] Je copie le JSON, je le colle dans le metafield Shopify du produit, ça marche
- [ ] Je génère les chips pour Le Club, j'obtiens ["MAMA","PAPA","SISTA","AMOUR","FAMILLE","TEAM"]
- [ ] Je télécharge le plan de production PDF, c'est lisible et utilisable par Maï/Adriana

---

## Stack technique recommandée

- **Next.js 14** (App Router)
- **TypeScript** strict
- **Tailwind CSS** + **shadcn/ui** (Card, Dialog, Select, Badge, Combobox, Table)
- **Supabase** (Database + Storage déjà configurés via module Médiathèque)
- **xlsx** (SheetJS) pour parser le fichier XLSX à l'import
- **@react-pdf/renderer** pour générer les PDF plan production
- **react-dnd** ou **dnd-kit** pour le drag-and-drop sur les photos

---

## Livrables attendus de Claude Code

1. Migration SQL (`supabase/migrations/XXXX_create_incarnations_module.sql`)
2. Types TypeScript (`types/incarnations.ts`)
3. API routes complètes (`app/api/incarnations/...`)
4. Composants React :
   - `IncarnationsList.tsx` (grid de cards)
   - `IncarnationCard.tsx` (card individuelle)
   - `IncarnationDetail.tsx` (fiche détaillée)
   - `IncarnationPhotoPicker.tsx` (modale picker depuis médiathèque)
   - `AuditMatrix.tsx` (matrice de production)
   - `XlsxImporter.tsx` (drop XLSX + aperçu + import)
5. Pages (`app/(hub)/incarnations/...`)
6. Helpers Supabase (`lib/supabase/incarnations.ts`)
7. Helpers XLSX (`lib/xlsx/parseIncarnations.ts`)
8. Helpers exports (`lib/exports/shopify-metafield.ts`, `lib/exports/audit-csv.ts`)
9. Tests sur les flux critiques (import XLSX, export metafield, transition de statut)

---

## Prompt à donner à Claude Code

```
Je veux ajouter le module Incarnations au Hub Ypersoa selon la spec
dans `docs/SPEC_INCARNATIONS.md`. Ce module est lié au module
Médiathèque (`docs/SPEC_MEDIATHEQUE.md`) — assure-toi que celui-ci
est en place ou démarre par lui.

Démarre par le Sprint 1 (MVP) : migration Supabase, import du XLSX
`04_INCARNATIONS.xlsx` (déjà présent dans le repo), page liste avec
filtres, fiche détaillée éditable, API CRUD.

Respecte la stack existante du Hub (Next.js 14 App Router,
TypeScript strict, Tailwind, shadcn/ui, Supabase) et la charte
Ypersoa (background `#F5F0EA`, accents Terracotta `#C4694A` et
Ink `#1E2D4A`, titres Cormorant Garamond, body Helvetica Neue).

Quand le sprint est terminé, propose-moi le commit et passe au suivant.
Si tu as un doute fonctionnel, demande-moi plutôt que d'inventer.
```

---

## Données initiales (seed) à importer depuis le XLSX

Le fichier `04_INCARNATIONS.xlsx` contient 13 incarnations pré-saisies à importer :

| Code    | Nom            | Motif    | Statut       |
|---------|----------------|----------|--------------|
| YPI-001 | MAMA CLUB      | YPM-003  | actif        |
| YPI-002 | PAPA CLUB      | YPM-003  | actif        |
| YPI-003 | SISTA CLUB     | YPM-003  | actif        |
| YPI-004 | FAMILLE CLUB   | YPM-003  | actif        |
| YPI-005 | AMOUR CLUB     | YPM-003  | actif        |
| YPI-006 | BRIDE TEAM     | YPM-003  | actif        |
| YPI-007 | DOG DAD GANG   | YPM-003  | actif        |
| YPI-008 | CREW SUMMER    | YPM-003  | actif        |
| YPI-009 | TEAM DOG       | YPM-003  | actif        |
| YPI-010 | PAPI CLUB      | YPM-003  | a_shooter    |
| YPI-011 | MAMIE CLUB     | YPM-003  | a_shooter    |
| YPI-012 | CONNASSE CLUB  | YPM-003  | concept      |
| YPI-013 | COOL GIRLS     | YPM-016  | concept      |

Sarah complétera ce référentiel au fil des shootings.
