# Ypersoa Creative Hub

Monorepo qui automatise les **14 métiers de la communication** d'Ypersoa (broderie personnalisée, atelier Wattrelos). Plusieurs applications spécialisées partagent un même socle de référentiels métier (motifs, fils, mannequins canoniques, palettes, ambiances, charte éditoriale).

> **Cible** : usage interne Ypersoa. Sarah (direction artistique + admin) et l'équipe atelier (Adriana, Felismina, Rebecca, Maï…). Pas d'accès public client.

---

## TL;DR

- **5 apps Web** (4 Next.js + 1 Vite) en monorepo `pnpm`
- **1 app Streamlit** Python pour la prod broderie (`prod_hub/`)
- **2 modules en cours** (atelier-motion = lib TS scaffold, atelier-incarnation = spec uniquement)
- **1 Supabase partagé** (`ypersoa-hub` — Sarah seule user, RLS ouverte V1)
- **Storage référentiels** : JSON dans `referentiels/` (lus par toutes les apps), assets dans `assets/`
- **Pas d'auth implémentée** à ce jour — handoff à Keyvan, cf. [docs/HANDOFF_KEYVAN.md](docs/HANDOFF_KEYVAN.md)

---

## Démarrage rapide

```bash
# 1. Cloner et installer
git clone <repo-url> ypersoa_creative_hub
cd ypersoa_creative_hub
pnpm install

# 2. Créer les .env.local pour chaque app
cp apps/atelier-social/.env.example apps/atelier-social/.env.local
cp apps/atelier-lookbook/.env.local.example apps/atelier-lookbook/.env.local
cp apps/atelier-shooting/.env.local.example apps/atelier-shooting/.env.local
cp apps/planable-ypersoa/.env.local.example apps/planable-ypersoa/.env.local
# Remplir chaque .env.local avec les clés réelles (cf. docs/HANDOFF_KEYVAN.md §Secrets)

# 3. Démarrer le hub principal
pnpm dev:atelier              # http://localhost:3000

# Autres apps (chacune dans un terminal séparé)
pnpm dev:atelier-shooting     # http://localhost:3001
pnpm dev:planable             # http://localhost:3002
# Atelier Lookbook : pnpm --filter @ypersoa/atelier-lookbook dev → http://localhost:3003
```

### Streamlit (production broderie)

```bash
cd prod_hub
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
streamlit run preview_app.py  # http://localhost:8501
```

---

## Inventaire des applications

| App | Port | Stack | Métier principal | Statut |
|---|---|---|---|---|
| **atelier-social** | 3000 | Next.js 15 | Hub principal — DA + Production + Social | V1 prod local |
| **atelier-shooting** | 3001 | Vite + React 19 | Génération shootings produits (Gemini) | V1 prod local |
| **planable-ypersoa** | 3002 | Next.js 15 | Calendrier éditorial Insta + Pinterest | V1.0.1 |
| **atelier-lookbook** | 3003 | Next.js 15 | Lookbooks IA (brief poétique → 12-20 visuels) | V1 prod local |
| **atelier-motion** | — | TypeScript (lib) | image → vidéo Veo 3.1 (Reels 9:16) | Scaffold, pas d'UI |
| **atelier-incarnation** | — | (spec only) | Référentiel YPI déclinaisons éditoriales | SPEC + XLSX + SQL |
| **atelier-mediateque** | — | (dossier vide) | Médiathèque centrale photos shooting | Migration prête, pas branchée |
| **prod_hub** (Python) | 8501 | Streamlit | Moteur attribution couleur→lettre broderie | Preview interactive |

Détail dans [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

---

## Structure du repo

```
ypersoa_creative_hub/
├── apps/                       # 7 dossiers (5 apps actives + 2 en cours)
│   ├── atelier-social/         # Hub principal Next.js
│   ├── atelier-shooting/       # Studio shootings Vite
│   ├── atelier-lookbook/       # Lookbooks Next.js
│   ├── atelier-motion/         # Lib TS Veo (8e atelier)
│   ├── atelier-incarnation/    # Spec + XLSX (pas de code)
│   ├── atelier-mediateque/     # Vide (migration prête dans docs/PLAN_MEDIATHEQUE/)
│   └── planable-ypersoa/       # Calendrier éditorial
│
├── prod_hub/                   # Python Streamlit — moteur attribution broderie
│
├── referentiels/               # Source de vérité métier (JSON, partagé cross-app)
│   ├── motifs/motifs_ypm.json
│   ├── casting/                # 23 canoniques mannequins
│   ├── shooting/ambiances_*.json
│   ├── palette_fils_broderie_v2.json
│   ├── commandes/{id}.json     # Commandes Shopify (1 fichier par commande)
│   ├── fiches_techniques_ypm.json
│   ├── shopify_sku_mapping.json
│   └── …                       # ~20 référentiels au total
│
├── assets/                     # Assets binaires non versionnés sur CDN
│   ├── canoniques/             # JPG des 23 canoniques mannequins
│   ├── motifs/                 # PNG aperçus des motifs
│   ├── motifs dst/             # Fichiers DST Tajima (broderie machine)
│   ├── motifs pxf/             # Fichiers PXF Pulse (édition)
│   └── referentiel_ambiance/   # Moodboards
│
├── docs/                       # Documentation handoff + specs
│   ├── ARCHITECTURE.md         # Multi-app, métiers, dataflow
│   ├── HANDOFF_KEYVAN.md       # Hébergement + auth + accès
│   ├── TESTS_STATUS.md         # Tested vs non-tested
│   ├── PROCHAINE_SESSION.md    # Questions ouvertes + incohérences
│   ├── PLAN_MEDIATHEQUE/       # Spec + migration SQL médiathèque
│   ├── casting/                # Fiches mannequins canoniques
│   └── …
│
├── _passations/                # Historique des passations Claude → Sarah
├── archives/                   # Code legacy auditer ou supprimer
├── CLAUDE.md                   # Mémoire projet (lue à chaque session Claude)
├── package.json                # Workspace racine pnpm
└── pnpm-workspace.yaml         # apps/* + packages/*
```

---

## Référentiels (source de vérité partagée)

Tous les apps lisent les mêmes JSON dans `referentiels/`. C'est volontaire : pas de duplication, une modif d'ambiance ou d'un canonique se propage instantanément à toutes les apps.

Référentiels les plus chauds :
- `motifs/motifs_ypm.json` — 17 motifs YPM-001 → YPM-017
- `casting/mannequins_*.json` — 23 canoniques (5 favoris ⭐ : Clémence, Aïcha, Mathieu, Marie-Hélène, Brune)
- `palette_fils_broderie_v2.json` — 20 couleurs Gunold Poly 40 + codes + aiguilles TMEZ
- `shooting/ambiances_shooting.json` — 5 ambiances officielles
- `commandes/{id}.json` — 1 fichier par commande Shopify (FIFO, OTIF)
- `fiches_techniques_ypm.json` — FT Tajima Pulse (nb points, fils, aiguilles)
- `shopify_sku_mapping.json` — pivot SKU ↔ YPM ↔ fils

---

## Documentation Claude

[CLAUDE.md](CLAUDE.md) est lu à chaque session par Claude Code. Il contient :
- Décisions architecturales verrouillées
- Règles brand et éditoriales absolues (tutoiement, marketplaces interdites, etc.)
- Méthode de travail (prompts littéraires Gemini, etc.)
- Casting et référentiels figés
- Pièges et anti-patterns (apprentissages négatifs)
- Sections datées par session — la plus récente est §9 (sessions 21-22 mai 2026, module Commandes Shopify)

---

## Stack technique commune

- **Node** ≥ 20, **pnpm** ≥ 9
- **Python** ≥ 3.11 (prod_hub uniquement)
- **Next.js 15** (App Router) + **React 19** + **TypeScript** strict + **Tailwind 4**
- **Vite 6** (atelier-shooting uniquement)
- **Supabase JS v2** (auth potentielle + storage + DB)
- **OpenAI SDK** (`openai` ^4.77) — gpt-4o pour le copy brand-safe FR
- **Google GenAI** (`@google/genai` ^1.29) — Gemini images + Veo 3.1 vidéo
- **Streamlit** ≥ 1.36 + **matplotlib** ≥ 3.8 (prod_hub Python)

---

## Limites importantes à connaître

1. **Aucune authentification implémentée.** Toutes les apps tournent en local-only. `middleware.ts` actuel = CORS ouvert (`*`). Voir [docs/HANDOFF_KEYVAN.md](docs/HANDOFF_KEYVAN.md) pour la stratégie auth attendue.
2. **`.env.local` contient des clés réelles** (OpenAI, Gemini, Supabase). À **rotater avant tout déploiement** ou partage de repo.
3. **RLS Supabase ouverte** (Sarah seule user V1). À durcir quand multi-user.
4. **`atelier-shooting` (Vite)** expose `VITE_GEMINI_API_KEY` au bundle client — OK en local-only, KO en prod publique sans proxy backend.
5. **Pas de CI/CD** configuré. Pas de tests E2E. 1 seul fichier vitest (`planable-ypersoa/.../calculator.test.ts`).
6. **Le hub `atelier-social` symlinke `/motifs/<file>`** vers `assets/motifs/` — vérifier que le symlink est recréé après clone (cf. CORS middleware).

---

## Liens utiles pour la suite

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — architecture multi-app, mapping métier, dataflow
- [docs/HANDOFF_KEYVAN.md](docs/HANDOFF_KEYVAN.md) — hébergement, auth admin/opérationnel, dépôt DST
- [docs/TESTS_STATUS.md](docs/TESTS_STATUS.md) — ce qui a été testé manuellement vs ce qui ne l'est pas
- [docs/PROCHAINE_SESSION.md](docs/PROCHAINE_SESSION.md) — questions ouvertes, incohérences, TODO V2
- [CLAUDE.md](CLAUDE.md) — mémoire projet (sessions cumulées)

---

## Licence

Privé Ypersoa — usage interne uniquement.
