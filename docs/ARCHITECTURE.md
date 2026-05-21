# Architecture — Ypersoa Creative Hub

> Document handoff. État au 22 mai 2026.
> Pour les décisions Claude session par session, voir [CLAUDE.md](../CLAUDE.md).
> Pour la mémoire long-terme, voir `~/.claude/projects/.../memory/`.

---

## 1. Vision : un orchestrateur multi-AI qui remplace 14 métiers

Le Hub Ypersoa n'est pas une app, c'est un **orchestrateur d'AI Studio tools** centralisé qui industrialise la production de contenus pour la marque Ypersoa (broderie personnalisée, atelier Wattrelos).

Source canonique du mapping métier ↔ app : [referentiels/metiers_hub.json](../referentiels/metiers_hub.json).

**14 métiers d'agence créative** remplacés (ou en cours) :

| # | Métier remplacé | Module Hub | App principale |
|---|---|---|---|
| 1 | Directeur Artistique | Ambiances + canoniques + angles narratifs | atelier-lookbook |
| 2 | Photographe shooting | Génération Gemini 3.1 (5 angles éditoriaux) | atelier-shooting |
| 3 | Mannequin | 23 canoniques AI character ref | atelier-shooting |
| 4 | Maquilleuse / Coiffeuse | Signatures dans fiches mannequins | atelier-shooting |
| 5 | Styliste | `style_wear` par canonique | atelier-shooting + lookbook |
| 6 | Décorateur / Régisseur | 5 ambiances pré-définies | atelier-shooting |
| 7 | Retoucheur photo | Sortie Gemini directe | atelier-shooting |
| 8 | Copywriter | OpenAI gpt-4o (caption Insta + Pinterest) | atelier-social |
| 9 | Community Manager | 5 hooks éditoriaux par registre | atelier-social |
| 10 | Brand Manager | Brand-safety regex + red lines | atelier-social |
| 11 | Graphiste mise en page | Module overlay 5 templates HTML/Canvas | atelier-social |
| 12 | Stratégiste contenu | Mode Insta vs Pinterest (formats + angles) | atelier-social |
| 13 | SEO manager | Caption Pinterest officielle (titre + desc + tags) | atelier-social |
| 14 | Traducteur | Multi-langue 6-7 langues prévue 2027 | (futur) |

---

## 2. Carte des applications

### Production active (5 apps, V1)

```
                    ┌────────────────────┐
                    │   ypersoa-hub      │  ← Supabase (1 projet partagé)
                    │   (Postgres + S3)  │
                    └─────────┬──────────┘
                              │
        ┌────────┬────────────┼────────────┬─────────────┐
        │        │            │            │             │
   atelier-   atelier-     atelier-     atelier-      planable-
   social    shooting      lookbook      motion       ypersoa
   (3000)    (3001)        (3003)       (lib TS)      (3002)
        │        │            │
        └────────┴────────────┴──────── referentiels/*.json (FS)
                                         assets/canoniques (FS)
                                         assets/motifs (FS)
```

Le **partage par filesystem** (`referentiels/`, `assets/`) est volontaire : pas de dépendance réseau pour les données canoniques, modif d'un référentiel propagée instantanément par hot-reload Next.js.

### atelier-social — Hub principal (port 3000)

L'app la plus large : 52 routes API, 4 espaces métier dans le router.

```
src/app/
├── atelier-da/                    ← Direction Artistique (DA)
│   ├── motifs/                    Catalogue créatif des 17 motifs YPM
│   ├── casting/                   23 canoniques mannequins
│   ├── ambiances/                 5 ambiances officielles
│   ├── incarnations/              13 incarnations YPI (déclinaisons éditoriales)
│   ├── mediatheque/               Bibliothèque photos centralisée
│   ├── motion/                    8e atelier — image → vidéo Veo 3.1
│   └── shooting-book/             Sessions de shooting archivées
│
├── atelier-production/            ← Atelier broderie Wattrelos
│   ├── motifs/                    Vue technique motifs (Adriana)
│   ├── fils/                      55 fils Gunold (10 TMEZ canoniques)
│   ├── palettes/                  Palettes par variante
│   ├── commandes/                 Commandes Shopify + planning OTIF/LPT
│   ├── kanban/                    Vue kanban prod
│   ├── attribution/               Moteur attribution couleur→lettre
│   └── regles/                    Règles broderie (3 dures, N molles)
│
├── social/                        ← Génération packs RS (5 slides Insta / 3 Pinterest)
├── lookbook/                      Vue lookbooks intégrés (proxy)
├── shooting/                      Vue shooting intégrée (proxy)
└── search/                        Recherche globale 9 buckets
```

**Le hub est la porte d'entrée** : Sarah s'y connecte le matin, navigue vers les sous-apps via topbar.

### atelier-shooting — Studio shootings produits (port 3001)

Vite + React 19. Fork standalone d'`aistudio_legacy/shoot_studio`. Génère :
- mode `mannequin` : modèle solo + diversity controls
- mode `packshot` : produit ghost sur fond neutre
- mode `family` : couple + N enfants
- mode `full` : pack 6 shots avec style preset

Toggle "Casting canonique" qui upload le JPG canonique en `parts[]` Gemini avant le prompt = activation character reference (~95 % fidélité visage validée).

### atelier-lookbook — Lookbooks IA (port 3003)

Brief poétique en FR → décomposition gpt-4o en prompts EN structurés → 12-20 visuels d'ambiance saisonnière via Gemini. Stockage Supabase (`lookbooks` table + `lookbook-images` bucket).

### atelier-motion — Veo 3.1 image→vidéo (lib TS, pas d'UI)

Scaffold TypeScript dans `apps/atelier-motion/`. 8e atelier prévu. **Une seule responsabilité** : animer une `Collection` de l'atelier-shooting via Veo 3.1 (8 s, 9:16). Tout le reste est relayé depuis le hub (casting, brand-safety, ambiances), jamais recalculé.

Pipeline : `hub.getCollection() → hub.verifierBrandSafety() → hub.getLookbookActif() → sélection narrative → ClipPlan[] → Veo 3.1 → Motion { clips, ordreMontage, aFaireManuel }`.

Pas d'UI branchée à ce jour. CLI `npm run anim -- "YP001 — 22:59:25"`. Détails : [apps/atelier-motion/ARCHITECTURE.md](../apps/atelier-motion/ARCHITECTURE.md).

### atelier-incarnation — Référentiel YPI (spec uniquement)

Pas de code TS, juste :
- [apps/atelier-incarnation/SPEC_INCARNATIONS.md](../apps/atelier-incarnation/SPEC_INCARNATIONS.md) — spec détaillée pour Claude Code agent
- `04_INCARNATIONS.xlsx` — 13 incarnations pré-saisies (MAMA CLUB, PAPA CLUB, etc.)
- `migration_incarnations.sql` — migration Supabase prête à appliquer
- `metafield_le_club_exemple.json` — exemple metafield Shopify cible
- `card_product_contextuel.liquid` — snippet Liquid configurateur Shopify

À implémenter dans `apps/atelier-social/src/app/atelier-da/incarnations/` (route déjà créée mais vide). Cf. [docs/PROCHAINE_SESSION.md](PROCHAINE_SESSION.md).

### atelier-mediateque — Médiathèque centrale (vide)

Dossier `apps/atelier-mediateque/` est vide. Mais :
- [docs/PLAN_MEDIATHEQUE/SPEC_MEDIATHEQUE.md](PLAN_MEDIATHEQUE/SPEC_MEDIATHEQUE.md) existe
- [docs/PLAN_MEDIATHEQUE/migration_mediatheque.sql](PLAN_MEDIATHEQUE/migration_mediatheque.sql) prête
- Route `atelier-social/src/app/atelier-da/mediatheque/` ajoutée (UI partielle)
- API routes `apps/atelier-social/src/app/api/da/mediatheque/audit/` ajoutées

C'est un module **en cours d'absorption dans atelier-social** plutôt qu'une app séparée. Le dossier `apps/atelier-mediateque/` peut probablement être supprimé après vérification.

### planable-ypersoa — Calendrier éditorial (port 3002)

Next.js 15 + tests vitest (1 fichier). Remplace l'outil tiers Planable :
- Calendrier mois CSS Grid
- Suggestions automatiques basées sur les occasions (Fête des Mères / Pères / Saint-Valentin / etc.)
- Bouton "Planifier la campagne complète" (Fête des Pères 2026 → 19 entrées draft d'un coup)
- DELETE individuel / bulk / par campagne, avec protection `published` jamais supprimable

Tables : `planable_occasions`, `planable_calendar_entries`, `planable_packs`, `planable_post_metrics`.

### prod_hub (Python Streamlit)

Outil de production broderie. **Pas un site web**, c'est un outil interne pour Adriana.

- `preview_app.py` — preview interactive moteur attribution
- `pages/1_Cadrer_motifs.py` — page de cadrage des 17 motifs (Phase 1)
- `moteur_attribution/moteur_attribution.py` — backtracking + scoring déterministe
- `moteur_attribution/visualisation.py` — rendu matplotlib

Lecture seule de `referentiels/palette_fils_broderie_v2.json` + `referentiels/motifs/motifs_ypm.json`.

---

## 3. Mapping métier → app (chrome topbar)

Cf. [referentiels/metiers_hub.json](../referentiels/metiers_hub.json) `mapping_app_metiers`.

| App | Label chrome topbar (futur breadcrumb) |
|---|---|
| atelier-social | Community Manager |
| atelier-shooting | Photographe & Retouche |
| atelier-lookbook | Direction Artistique |
| shooting-director | Direction de Production (à scaffolder) |
| atelier-casting | Direction de Casting (à scaffolder, base 30/04 posée) |

Le topbar `YPERSOA HUB › Direction Artistique` doit être branché dans `apps/atelier-social/src/components/HubTopbar.tsx` (piste A discutée 30/04, pas implémentée).

---

## 4. Stack et conventions

### Langages et runtimes

- **TypeScript strict** partout côté JS (Next.js + Vite)
- **Python 3.11+** pour `prod_hub/`
- **Node ≥ 20**, **pnpm ≥ 9** (engine pinned dans `package.json` racine)

### Framework choices et raisons

- **Next.js 15 App Router** pour les 4 apps qui ont besoin de routes API serverless (clés OpenAI/Gemini protégées server-side)
- **Vite 6** pour `atelier-shooting` parce que c'était un fork standalone d'AIStudio — pas de besoin de routes API (clé Gemini exposée client OK en local-only)
- **Tailwind 4** partout + tokens partagés (`brand-rose`, `brand-bg`, `brand-text`, `brand-marine`, `brand-sage`)
- **shadcn/ui** prévu côté `atelier-social` (cf. SPEC_INCARNATIONS) — pas systématique
- **lucide-react** pour les icônes
- **Streamlit** pour Python parce que Sarah/Adriana doivent pouvoir tester sans dev local — installation `pip install` + `streamlit run` suffit

### Modèles IA utilisés

| Modèle | Usage | App | API |
|---|---|---|---|
| OpenAI gpt-4o | Caption FR + hooks éditoriaux brand-safe | social, lookbook | `openai` SDK |
| Google Gemini 3 Pro Image / Nano Banana | Génération images | social, shooting, lookbook | `@google/genai` |
| Google Veo 3.1 | image → vidéo 8s 9:16 | motion | `@google/genai` |
| Anthropic Claude | Mentionné dans atelier-social README, mais code n'utilise plus que gpt-4o | (potentiel) | non actif |

---

## 5. Dataflow type — Pack Instagram 5 slides

```
Sarah ouvre /social
   ↓
Configure : ambiance + canonique + occasion + motif
   ↓
Click "Générer"
   ↓
[atelier-social] /api/generate-image (server)
   → lit referentiels/casting/MAN-P10.json (signature canonique)
   → upload assets/canoniques/MAN-P10_Marie-Helene_canonique.jpg en parts[]
   → POST Gemini avec prompt + character ref
   → 5 angles narratifs (retry IMAGE_OTHER si besoin)
   ↓
[atelier-social] /api/generate-copy (server)
   → lit brand-safety regex de src/lib/brand-rules.ts
   → POST gpt-4o avec image en multimodal
   → 5 hooks (Émotion / Question / POV / Humour / Affirmation) + caption + tags
   → checkBrandSafety() côté serveur
   ↓
UI : 5 slides + tabs Caption/Overlay
   ↓
(optionnel) Toggle "Avec texte" → composeOverlay() côté React HTML/Canvas
   ↓
Export pack ZIP / publication directe Instagram (V2)
```

---

## 6. Dataflow type — Commande Shopify → broderie

```
PDF bon de préparation Shopify
   ↓ (saisie manuelle V1, parsing auto V2)
referentiels/commandes/1002.json
   ↓
[atelier-social] /atelier-production/commandes/1002
   ↓ Click "Générer planning"
[atelier-social] /api/production/commandes/1002/planning
   → planning-allocator.ts → OTIF (par défaut) ou LPT
   → 2 machines × 6h/jour
   → mutualisation fil principal entre articles
   ↓
Vue Gantt 2 machines TMEZ-1 / TMEZ-2
   ↓
Adriana coche "DST par Adriana le 20/05"
Felismina coche "Broderie par Felismina le 22/05"
Adriana coche "CQ le 22/05"
Rebecca coche "Expédition par Rebecca le 23/05"
   ↓
Statut commande passe automatiquement : a_planifier → planifiee → terminee → expediee
   ↓
Click "Archiver" → journal.archivee_le = "2026-05-23"
```

Si défaut : bouton "Rebroder cet article" → crée `1002-R1.json` avec `rework_de`.

---

## 7. Limites et conventions à respecter

### Pas d'invention dans les référentiels

Tous les apps **lisent** `referentiels/`. Seul un workflow explicite (UI dédiée + bouton "Modifier") peut écrire. Pas de mutation implicite, pas de "régénérer ce JSON parce qu'on régénère le planning".

Exemple : `recalculerDureesCommande()` dans `lib/production/commandes-loader.ts` respecte `champ.source_duree === "manuel"` pour ne pas écraser les ajustements Sarah.

### Pas d'auth → toutes les routes sont ouvertes

Conséquence : ne **jamais** publier ces apps en accès public sans la couche auth de Keyvan. Cf. [HANDOFF_KEYVAN.md](HANDOFF_KEYVAN.md).

### Hex codes vs noms de couleurs

- **JSON pour data structurée OK** (palette_fils_broderie_v2.json a des hex)
- **JSON en input LLM KO** — toujours nommer ("deep bordeaux", "MAC Diva matte")
- **UI swatches** lisent les hex pour colorier les puces

### Photo de référence canonique = format strict

Portrait 3:4, fond cream uni, chest-up, t-shirt gris. Cf. CLAUDE.md §6 pour les anti-patterns.

### Le couple n'est pas un statement

`DUO_LEA_SARAH`, `DUO_HENRI_JOSEPHINE` : jamais baiser frontal démonstratif, complicité silencieuse uniquement.

---

## 8. Schéma Supabase (`ypersoa-hub`)

Projet : `frvhjjijoccqreidyucp` (Sarah seule user V1).

### Tables actives

| Table | App propriétaire | Usage |
|---|---|---|
| `liked_shots` | atelier-shooting | Shots likés persistés pour réusage |
| `lookbooks` | atelier-lookbook | Lookbooks générés (12-20 visuels par lookbook) |
| `social_packs` | atelier-social | Packs Insta/Pinterest générés |
| `planable_occasions` | planable | 7 occasions seed (Saint-Valentin, FdM, FdP, Rentrée, Mariage, Naissance, Noël) |
| `planable_calendar_entries` | planable | Entrées du calendrier |
| `planable_packs` | planable | Packs liés aux entrées |
| `planable_post_metrics` | planable | Métriques post-publication (V2) |

### Tables à créer (migrations prêtes)

| Table | Migration | Statut |
|---|---|---|
| `incarnations`, `incarnations_photos`, `motifs` | `apps/atelier-incarnation/migration_incarnations.sql` | À appliquer |
| `media`, `media_tags`, `tags` (médiathèque) | `docs/PLAN_MEDIATHEQUE/migration_mediatheque.sql` | À appliquer |

### Buckets Storage

| Bucket | Contenu |
|---|---|
| `lookbook-images` | Images générées par atelier-lookbook |
| (à confirmer) `mediatheque-photos` | Photos shooting upload (cf. PLAN_MEDIATHEQUE) |

### RLS

V1 = ouvert (Sarah seule user). À durcir en V2 → rôles `admin` (Sarah) / `operateur` (Adriana / Felismina / Rebecca / Maï). Cf. [HANDOFF_KEYVAN.md](HANDOFF_KEYVAN.md).

---

## 9. Communications inter-apps

Aucune communication réseau pour les données canoniques (lecture FS partagée). Les communications HTTP existent uniquement pour :

| Source | Destination | Endpoint | Usage |
|---|---|---|---|
| atelier-shooting (3001) | atelier-social (3000) | `/api/da/referentiels` | Liste motifs Hub |
| atelier-shooting (3001) | atelier-social (3000) | `/api/da/motifs/[id]/*` | Preview / prod-file / promote |
| atelier-shooting (3001) | atelier-social (3000) | `/motifs/<file>` | PNG des motifs (symlink) |
| atelier-social (3000) | planable (3002) | (V1.1) `/api/calendar` | Push entrée planifiée |

Le `middleware.ts` de `atelier-social` autorise CORS `*` sur ces routes — à durcir en prod (cf. HANDOFF_KEYVAN.md).

---

## 10. État au 22 mai 2026

- **Production active** : 4 apps Next.js + 1 Vite + 1 Streamlit
- **En cours** : atelier-motion (lib seule, à brancher en 8e atelier UI), atelier-incarnation (spec → impl pending), médiathèque (en cours d'absorption dans atelier-social)
- **Pas démarré** : auth, shooting-director, atelier-casting, intégration Meta/Pinterest, parsing PDF Shopify auto, drag-and-drop planning, export PDF bons d'atelier

Roadmap consolidée : [docs/PROCHAINE_SESSION.md](PROCHAINE_SESSION.md).
