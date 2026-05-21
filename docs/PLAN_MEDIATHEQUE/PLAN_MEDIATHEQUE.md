# Plan d'implémentation Médiathèque Ypersoa

> Roadmap structurée pour Claude Code en agent — 4 sprints sur ~2 semaines

---

## Phase 0 — Préparation (15 min, manuel par Sarah)

1. **Lire** `SPEC_MEDIATHEQUE.md` pour s'aligner sur l'objectif
2. **Placer** `migration_mediatheque.sql` dans `supabase/migrations/`
3. **Placer** `seed_tags_taxonomie.sql` dans `supabase/seeds/`
4. **Vérifier** que ces extensions Postgres sont actives dans Supabase :
   - `uuid-ossp` (pour `gen_random_uuid`)
   - `pg_trgm` (pour l'index full-text sur filename)
5. **Lancer** la migration :
   ```bash
   supabase db push
   psql -f supabase/seeds/media_tags_seed.sql
   ```
6. **Vérifier** que le bucket `ypersoa-media` est bien créé dans Supabase Storage
7. **Créer le fichier** `docs/SPEC_MEDIATHEQUE.md` à la racine du repo avec le contenu fourni

---

## Sprint 1 — MVP fonctionnel (2-3 jours)

**Objectif** : pouvoir uploader des photos, les tagger, et les retrouver via filtres.

### Tâches Claude Code

1. **Types TypeScript** (`types/media.ts`)
   - `Media`, `Tag`, `MediaWithTags`, `TagCategory`
   - Helpers de validation Zod

2. **Helpers Supabase** (`lib/supabase/media.ts`)
   - `fetchMedia(filters)`, `fetchMediaById(id)`
   - `createMedia(file, tags)`, `updateMedia(id, data)`, `deleteMedia(id)`
   - `addTagToMedia(mediaId, tagId)`, `removeTagFromMedia(mediaId, tagId)`
   - `uploadFile(file, source)` (upload vers Supabase Storage avec arborescence par source/date)

3. **API Routes** (`app/api/media/...`, `app/api/tags/...`)
   - `GET /api/media` avec filtres tags + pagination
   - `POST /api/media` (upload + création)
   - `GET /api/media/[id]`, `PATCH`, `DELETE`
   - `GET /api/tags` (liste par catégorie)

4. **Page galerie** (`app/(hub)/media/page.tsx`)
   - Sidebar filtres (Incarnation, Motif, Gabarit, Statut)
   - Grid masonry des médias
   - Composant `MediaCard` avec thumbnail + chips tags
   - URL state pour les filtres (shareable)

5. **Page upload** (`app/(hub)/media/upload/page.tsx`)
   - Dropzone multi-fichiers (react-dropzone)
   - Preview list avec champs tags par fichier
   - Bouton "Appliquer ces tags à tous les fichiers"
   - Upload progressif avec feedback

### Critères d'acceptation

- [ ] J'arrive sur `/hub/media`, je vois mes photos taggées et je peux filtrer
- [ ] J'upload 10 photos d'un coup en glisser-déposer, j'applique les bons tags en batch, et elles apparaissent dans la galerie
- [ ] Je filtre par "incarnation: MAMA CLUB" + "gabarit: Hoodie", je vois 5 photos
- [ ] Les filtres se cumulent (AND entre catégories, OR dans une catégorie)
- [ ] La galerie est responsive (4 col desktop, 2 col mobile)
- [ ] Le design respecte la charte Ypersoa (Cream, Terracotta, Ink, Cormorant Garamond)

---

## Sprint 2 — Édition et workflow (2-3 jours)

**Objectif** : pouvoir éditer une photo en détail, gérer le statut, gérer la taxonomie.

### Tâches Claude Code

1. **Page fiche photo** (`app/(hub)/media/[id]/page.tsx`)
   - Preview grand format avec navigation prev/next (touches flèches)
   - Panneau droit : métadonnées, tags par catégorie, statut, notes
   - Auto-complétion pour ajout de tags
   - Actions : Dupliquer, Archiver, Télécharger, Copier URL

2. **Mode sélection multiple sur la galerie**
   - Checkbox top-left de chaque card
   - Barre flottante quand >0 sélections : Tagger en lot, Changer statut, Archiver, Supprimer
   - Modal "Tagger en lot" : ajouter/retirer plusieurs tags d'un coup

3. **Page gestion taxonomie** (`app/(hub)/media/tags/page.tsx`)
   - Liste des tags groupés par catégorie
   - Compteur d'usage par tag
   - Édition inline du label et color_hex
   - Bouton fusionner (déplace tous les media_tags du tag A vers le tag B, supprime A)
   - Création de nouveaux tags avec sélecteur de catégorie

4. **Recherche full-text**
   - Champ recherche dans le header de la galerie
   - Recherche sur filename + notes + label des tags associés
   - Utilise `pg_trgm` pour la tolérance aux fautes

### Critères d'acceptation

- [ ] Je clique sur une photo, j'arrive sur sa fiche, je peux modifier ses tags et son statut
- [ ] Je sélectionne 20 photos, je leur ajoute le tag "validee" en un clic
- [ ] Je vais sur la page Tags, je vois que "mama-club" est utilisé sur 47 photos
- [ ] Je tape "mama" dans la recherche, je trouve toutes les photos pertinentes même si le filename est `IMG_4521.jpg`
- [ ] Je fusionne le tag "papa-club" et "papaclub" en un seul, les liaisons sont conservées

---

## Sprint 3 — Exploitation / exports Shopify (2-3 jours)

**Objectif** : pouvoir générer des sorties exploitables (metafields Shopify, albums, exports).

### Tâches Claude Code

1. **Export metafield Shopify** (`app/api/exports/shopify-metafield/route.ts`)
   - POST avec body `{media_ids: [], product_motif: "YPM-003"}`
   - Génère le JSON metafield au format `metafield_le_club_exemple.json`
   - Pour chaque média, déduit l'incarnation depuis les tags
   - Retourne le JSON avec bouton "Copier" et "Télécharger .json"

2. **Albums / Collections** (`app/(hub)/media/collections/...`)
   - CRUD albums (création, liste grid, édition)
   - Drag-and-drop pour ordonner les médias dans un album
   - Page album publique (URL partageable type `/m/album-fete-des-peres-2026`)
   - Cover image automatique = premier média de l'album

3. **Audit production** (`app/(hub)/media/audit/page.tsx`)
   - Matrice motifs × incarnations × gabarits
   - Compteur de photos par cellule (cliquer = filtrer la galerie sur cette cellule)
   - Export CSV de l'audit (compatible avec la feuille `AUDIT_MANQUES` du référentiel)

4. **Stats dashboard** (intégrer dans la page galerie ou page séparée)
   - Compteur total de médias
   - Répartition par statut (camembert)
   - Top 10 incarnations les plus représentées
   - Photos uploadées ce mois / mois dernier

### Critères d'acceptation

- [ ] Je sélectionne 6 photos (1 par incarnation) du motif Le Club, je clique "Export Shopify", je copie le JSON, je le colle dans le metafield du produit Shopify
- [ ] Je crée un album "Moodboard Fête des Pères 2026", je glisse 12 photos dedans, je partage le lien à Maï
- [ ] Sur la page audit, je vois en un coup d'œil "Il manque PAPI CLUB sur Sweat et T-Shirt"
- [ ] Le dashboard me dit "247 photos validées, 32 en attente, 45 manquantes pour atteindre la cible Fête des Pères"

---

## Sprint 4 — Polish et optimisation (1-2 jours)

### Tâches Claude Code

1. **Génération thumbnails**
   - Edge function Supabase OU API route Next.js avec `sharp`
   - À l'upload, créer automatiquement une version 600px (WebP) dans `thumbnails/`
   - La galerie charge les thumbnails, la fiche détail charge l'original
   - Gain de bandwidth ~80%

2. **Pack Instagram ZIP** (`app/api/exports/instagram-pack/route.ts`)
   - Sélection de 9 photos → ZIP avec 9 images 1080×1080 numérotées
   - Utilise `archiver` côté Node + `sharp` pour resize

3. **Moodboard PDF** (`app/api/exports/moodboard-pdf/route.ts`)
   - Sélection N photos → PDF A4 paysage 3×4 ou 4×3 selon nombre
   - Titre + date en en-tête, logo Ypersoa en pied de page
   - Utilise `@react-pdf/renderer`

4. **Suggestions automatiques de tags à l'upload**
   - Si le filename contient des patterns connus (`mama-club`, `hoodie`, `creme`), pré-cocher les tags correspondants
   - Améliore la productivité d'upload massif

5. **Tests E2E sur les flux critiques**
   - Upload + tagging + retrieval
   - Filtres combinés AND/OR
   - Export metafield Shopify
   - Création album et partage

### Critères d'acceptation

- [ ] Les thumbnails s'affichent en <500ms même sur une galerie de 200 photos
- [ ] Je sélectionne 9 photos, je clique "Pack Instagram", je récupère un ZIP prêt à uploader
- [ ] Je génère un PDF moodboard, c'est imprimable A4 et propre
- [ ] J'uploade une photo nommée `mama-club-hoodie-creme-001.jpg`, les tags MAMA CLUB + Hoodie + Crème sont pré-cochés

---

## Sprint 5+ — Évolutions futures (post-prod)

Pas pour Claude Code maintenant, mais à garder en tête :

- **Lien Atelier Social** : bouton "Utiliser dans un post Instagram/Pinterest" depuis la fiche photo
- **Lien Production Hub** : associer un média à une variante produit Shopify (pour pouvoir générer les fiches produit enrichies)
- **Versioning des photos** : garder l'historique des éditions (retouche, recadrage)
- **API publique en lecture** : permettre à des partenaires presse de piocher dans la médiathèque via clé API
- **Détection automatique IA** : à l'upload, Claude Vision analyse la photo et propose les tags (couleur produit, plan, ambiance détectés visuellement)
- **Sync bidirectionnelle Shopify** : pousser automatiquement les photos vers les metafields produits

---

## Estimation totale

- Phase 0 (setup) : 15 min Sarah
- Sprint 1 (MVP) : 2-3 jours Claude Code
- Sprint 2 (édition) : 2-3 jours Claude Code
- Sprint 3 (exports) : 2-3 jours Claude Code
- Sprint 4 (polish) : 1-2 jours Claude Code

**Total : ~10 jours de dev sur 2-3 semaines calendaires.**

Le MVP (Sprint 1) seul te permet déjà de centraliser tes 200-1000 photos et de les piloter. Tu peux commencer à uploader dès la fin du Sprint 1.

---

## Prompt initial à donner à Claude Code

```
Lis la spec dans `docs/SPEC_MEDIATHEQUE.md` et le plan dans
`docs/PLAN_MEDIATHEQUE.md`. Démarre par Phase 0 : crée les fichiers
de migration et seed dans supabase/, puis Sprint 1 complet (MVP) :
types TypeScript, helpers Supabase, API routes, page galerie, page upload.

Respecte la stack du Hub (Next.js 14 App Router, TypeScript strict,
Tailwind, shadcn/ui, Supabase) et la charte Ypersoa.

À chaque sprint terminé : propose un commit avec message clair,
et attends mon feu vert avant d'attaquer le sprint suivant.

Si tu as un doute fonctionnel, demande-moi plutôt que d'inventer.
```
