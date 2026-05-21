# Tests Status — Ypersoa Creative Hub

> Document handoff. État au 22 mai 2026.
> Honnêteté maximale : ce qui a été testé, par qui, comment ; ce qui ne l'a pas été et pourquoi.

---

## 1. Vue d'ensemble

| Catégorie | État |
|---|---|
| **Tests unitaires automatisés** | 1 fichier vitest (`planable-ypersoa/.../calculator.test.ts`) |
| **Tests d'intégration** | 0 |
| **Tests E2E** | 0 |
| **Type-check TypeScript** | OK sur tous les apps Next.js (`pnpm type-check`) |
| **Tests manuels Sarah** | Nombreux — détails ci-dessous app par app |
| **CI / CD** | Aucun pipeline configuré |

**Implication** : ne **pas** déployer une app sans avoir refait les smoke tests documentés ci-dessous + un round de QA avec Sarah.

---

## 2. App par app

### 2.1 atelier-social (port 3000) — Hub principal

**Code modifié dans cette session (21-22 mai 2026)** : module Atelier Production → Commandes Shopify (cf. CLAUDE.md §9).

#### Tested manuellement ✅

- Création commande JSON (`referentiels/commandes/1002.json`) — 3 articles, 86 min total
- Calcul durées broderie via classification (mot court / moyen / texte long / symbole)
- Recalibrage vitesse machine 650 → 800 pts/min (CLAUDE.md §9.2)
- Algorithme planning **OTIF** sur la commande 1002 (préférence machine avec fil principal identique)
- Algorithme planning **LPT** sur la commande 1002 (machine la moins chargée)
- Journal 4 étapes (DST/Broderie/CQ/Expédition) — saisie inline avec datalist personnes
- Archivage commande (`journal.archivee_le = "2026-05-23"`)
- Désarchivage intelligent (restaure le statut selon le journal)
- Création commande rework via modal "Rebroder cet article" → `1002-R1.json`
- Search globale — bucket "Commandes Shopify" en première position, match sur `#1002`, `adriana`, `archivee`
- Fix bug régénération planning qui downgrade le statut (cf. CLAUDE.md §9.13)
- Fix bug classification "COEUR" mot vs symbole (cf. CLAUDE.md §9.13)

#### Tested mais incomplet ⚠️

- Type-check : `pnpm --filter @ypersoa/atelier-social type-check` passe
- Lint : non systématiquement exécuté
- Recalcul durées sur grosse commande (>10 articles) : pas testé, jamais rencontré
- Multi-commandes simultanées dans le planning : pas testé (V1 = 1 planning par commande)

#### Pas testé ❌

- Module `/atelier-da/incarnations/` — route créée vide, pas d'UI ni d'API (spec uniquement)
- Module `/atelier-da/mediatheque/` — UI partielle, intégration Supabase Storage pas vérifiée bout-en-bout
- API `/api/da/mediatheque/audit/` — créée, pas testée
- API `/api/da/motifs/[id]/prod-file-upload/` — créée pour upload DST opérationnel, pas testée bout-en-bout
- API `/api/da/motifs/[id]/catalog/` — créée, pas testée
- Génération vidéo Veo 3.1 via `/api/da/motifs/[id]/...` — branche `ATELIER_MOTION_ENGINE=veo-3.1` jamais lancée en bout-en-bout
- Search bucket "Médiathèque" — créé, pas validé sur volume réel
- Comportement en cas de panne API (OpenAI / Gemini) — retry IMAGE_OTHER documenté, mais pas testé sur autres erreurs (rate limit, 500)

### 2.2 atelier-shooting (port 3001)

#### Tested manuellement ✅

- Toggle "Casting canonique" : charge le JPG canonique + l'envoie en `parts[]` Gemini → fidélité ~95%
- Mode `mannequin`, `packshot`, `family`, `full` — testés sur les 23 canoniques
- Catalog Shot Modal (`CatalogShotModal.tsx`) — nouvelle UI ajoutée mais **pas validée en flow complet**
- Sidebar MotifPickerPanel — sélection motif YPM
- Lecture `referentiels/casting/mannequins_*.json` via hub-data

#### Pas testé ❌

- `lib/catalog-shots.ts` (nouveau) — librairie ajoutée, integration UI pas validée
- `public/packshots/` (nouveau dossier) — assets non revus
- Flux likes Shooting → captions RS (atelier-social via Supabase) — code existe, pas re-testé après modif

### 2.3 atelier-lookbook (port 3003)

#### Tested manuellement ✅

- Brief poétique FR → décomposition gpt-4o → prompts EN → 12-20 visuels Gemini
- Stockage Supabase (`lookbooks` table + `lookbook-images` bucket) — flow validé
- Modal "Add custom image" (nouveau, non commité) — création récente
- API `/api/add-custom-image` (nouveau) — créée, pas testée
- API `/api/palettes` (nouveau) — créée, pas testée
- API `/api/regenerate-image` (nouveau) — créée, pas testée

#### Pas testé ❌

- Comportement multi-utilisateur (V1 mono-user)
- Backup / restauration des lookbooks générés

### 2.4 planable-ypersoa (port 3002)

#### Tested ✅ (le mieux couvert des apps)

- **Vitest** : `src/lib/occasions/calculator.test.ts` — tests sur next occurrence + buyByDeadline + computeUrgency
- Lancer : `pnpm --filter @ypersoa/planable-ypersoa test`
- Smoke test V1.0 documenté dans le README de l'app (11 étapes)
- Smoke test V1.0.1 documenté (suppression individuelle / bulk / reset campagne)
- Protection `published` jamais supprimable — validée
- Mode sélection multiple — validé
- Bouton "Effacer la planification (N)" sur card suggestion — validé

#### Pas testé ❌

- Génération pack via atelier-social (V1.1 — mock uniquement en V1.0)
- Meta Graph API publication (V1.2)
- Pinterest API (V2)
- Drag-and-drop des entrées calendrier (V2)
- Métriques post-publication (V2)

### 2.5 atelier-motion (lib TS, pas d'UI)

#### Tested ✅

- Per `ARCHITECTURE.md` : *"TypeScript, tsc clean, testé bout en bout (stub hub + stub Veo) sur la collection réelle des captures"*
- Pipeline `hub.getCollection() → verifierBrandSafety() → getLookbookActif() → sélection narrative → ClipPlan[] → Veo 3.1`

#### Pas testé ❌

- Appel Veo 3.1 réel (l'API n'était pas dispo au moment du dev)
- UI 8e atelier — coquille pas branchée dans `atelier-social`
- CLI `npm run anim -- "YP001 — 22:59:25"` — pas exécuté bout-en-bout

### 2.6 atelier-incarnation (spec uniquement)

#### Tested ✅

- Fichier `04_INCARNATIONS.xlsx` ouvert et 13 incarnations inventoriées
- Migration SQL `migration_incarnations.sql` — relecture humaine, pas appliquée
- Snippet Liquid `card_product_contextuel.liquid` — pas testé sur Shopify

#### Pas testé ❌

- Implémentation : il n'y a **aucun code TS** dans `apps/atelier-incarnation/`
- Migration SQL non appliquée sur Supabase
- API d'import XLSX prévue par la spec n'existe pas
- Routes UI prévues (`/hub/incarnations`, `/hub/incarnations/[code]`, `/hub/incarnations/audit`) n'existent pas

**Le dossier `apps/atelier-incarnation/` contient uniquement la spec.** L'implémentation cible est dans `apps/atelier-social/src/app/atelier-da/incarnations/` (route créée vide).

### 2.7 atelier-mediateque (dossier vide)

#### Tested ❌

- Dossier `apps/atelier-mediateque/` **vide**
- Spec dans `docs/PLAN_MEDIATHEQUE/SPEC_MEDIATHEQUE.md` (existante avant cette session)
- Migration SQL `docs/PLAN_MEDIATHEQUE/migration_mediatheque.sql` — pas appliquée
- Seed tags `docs/PLAN_MEDIATHEQUE/seed_tags_taxonomie.sql` — pas appliqué

L'implémentation est en cours **dans atelier-social** (route `/atelier-da/mediatheque/`, API `/api/da/mediatheque/audit/`). Pas validée bout-en-bout.

### 2.8 prod_hub (Python Streamlit)

#### Tested ✅

- `preview_app.py` — lancé manuellement par Sarah, swatches cliquables alignés Ypersoa
- `pages/1_Cadrer_motifs.py` — lancé manuellement, écriture dans `gammes/gammes_ypm_all.json`
- Moteur attribution :
  - Backtracking déterministe (seed dérivé SHA-256)
  - Validation 3 règles dures (adjacence, chevauchement vertical, diagonale)
  - Géométrie centrée (lignes de longueurs variables, espaces ignorés)
  - Scoring molles (entropie + orphelin + colonne d'attaque)
  - Performance ~150 ms pour 100 candidats sur texte 16 lettres

#### Pas testé ❌

- Contrainte support / fil (champ `supports_incompatibles` du référentiel) — non implémentée
- Règle cohérence cœur — non implémentée
- Gammes par variante YPM-009 (mocks dans le proto)
- Codes Gunold à valider visuellement avec nuancier physique
- Générateur PDF Tajima — pas commencé
- Intégration avec Shopify (commande → moteur → fiche) — pas commencée

---

## 3. Référentiels modifiés cette session

| Fichier | Type modif | Impact | Risque |
|---|---|---|---|
| `referentiels/motifs/motifs_ypm.json` | Ajout templates poignets + variantes | Lecture par toutes apps | Faible (rétro-compat) |
| `referentiels/palette_fils_broderie.json` | Sync v1 → v2 | Lecture par toutes apps | Faible |
| `referentiels/palette_fils_broderie_v2.json` | Codes Gunold mis à jour | Lecture par toutes apps + prod_hub | Faible (codes non-canoniques marqués) |
| `referentiels/charte_editoriale.json` | Mise à jour règles brand | Lecture par atelier-social | Faible |
| `referentiels/shooting/ambiances_shooting.json` | Ajustements ambiances | Lecture par shooting + lookbook | Faible |
| `referentiels/commandes/1002.json` (nouveau) | Commande test | Aucun (data test) | Aucun |
| `referentiels/fiches_techniques_ypm.json` (nouveau) | FT YPM-001-K importée | Lecture commandes-loader | Faible |
| `referentiels/shopify_sku_mapping.json` (nouveau) | Pivot SKU↔YPM↔fils | Lecture commandes-loader | Faible (mappings BRI/AMB/etc. non validés en prod) |
| `referentiels/durees_broderie.json` | v1.2 — 800 pts/min, prep DST | Lecture commandes-loader | Faible |
| `referentiels/attributions_library.json` (nouveau) | Bibliothèque attributions | Lecture par atelier-social | Pas testé |
| `referentiels/regles_broderie.json` (nouveau) | Règles broderie codées | Lecture par atelier-social + prod_hub | Pas testé |
| `referentiels/prod_kanban.json` (nouveau) | État kanban prod | Lecture par atelier-social | Pas testé |
| `referentiels/gunold_poly40_catalog.json` (nouveau) | Catalogue Gunold complet | Lecture par atelier-social | Pas testé |
| `referentiels/palettes_fils_associations.json` (nouveau) | Associations fils par palette | Lecture par atelier-social | Pas testé |

---

## 4. Méthodologie de test à mettre en place (V2)

### 4.1 Niveau minimum recommandé

| Niveau | Outil | Couverture cible |
|---|---|---|
| **Type-check** | `tsc --noEmit` (déjà OK) | 100% du code TS |
| **Lint** | `eslint` (configuré non systématique) | Pre-commit hook |
| **Unit tests** | `vitest` | Lib `commandes-loader.ts`, `planning-allocator.ts`, `brand-rules.ts`, `incarnations-store.ts` |
| **Integration** | `vitest` + Supabase test instance | Routes API critiques (génération pack, planning, search) |
| **E2E** | `playwright` | Flow Sarah : "ouvrir commande 1002 → générer planning OTIF → marquer DST" |
| **Visual regression** | Percy / Chromatic | UI Gantt, calendrier Planable, search results |

### 4.2 Priorité de couverture

1. **Lib `planning-allocator.ts`** — algos OTIF / LPT sont critiques business
2. **Lib `commandes-loader.ts`** — recalcul durées avec respect des `source_duree === "manuel"`
3. **Lib `brand-rules.ts`** — regex brand-safety (les red lines non négociables)
4. **Moteur attribution Python** — déjà déterministe, tests visuels PNG de référence à automatiser
5. **Route `/api/generate-image`** — gestion retry IMAGE_OTHER
6. **Route `/api/generate-copy`** — vérification brand-safety post-génération

---

## 5. Régressions connues mais non corrigées

Aucune régression bloquante identifiée au 22 mai 2026.

Bugs latents potentiels :
- Si Sarah édite manuellement un JSON commande pendant qu'une autre tab est ouverte sur la fiche → reload requis (pas de live reload côté UI)
- Le port 3000 reste parfois occupé après crash Next.js → `lsof -ti:3000 | xargs kill -9` puis relancer (CLAUDE.md §6)
- Le redirect `308` des routes DA vers Production reste agressivement caché en navigateur → vider le cache si comportement bizarre (cf. `next.config.ts` commentaire)

---

## 6. Conclusion honnête

Ce repo est **dans un état "production locale pour Sarah seule"**, pas dans un état "déployable publiquement". Les fonctionnalités cœur (génération pack, planning broderie, calendrier) fonctionnent et ont été éprouvées par Sarah au quotidien sur des cas réels.

Mais avant tout déploiement à plus large échelle :
1. Couvrir les libs critiques de tests unitaires (planning-allocator surtout)
2. Implémenter l'auth (cf. HANDOFF_KEYVAN.md)
3. Ajouter un smoke test E2E par app pour ne pas casser silencieusement
4. Mettre en place un CI minimal (`pnpm type-check` + `pnpm test`)
