# `@ypersoa/atelier-shooting`

Studio de génération de shootings produits Ypersoa. Fork standalone de l'app `shoot_studio` AIStudio (cf. `archives/aistudio_legacy/shoot_studio/`), désormais hébergé dans le monorepo Hub Ypersoa et branché aux référentiels (canoniques, variantes, palettes).

## Stack

- React 19 + TypeScript + Vite 6
- Tailwind CSS via CDN (`cdn.tailwindcss.com`)
- Font Awesome 6 via CDN
- Google Fonts : Playfair Display + Inter
- API : `@google/genai` (modèle `gemini-3.1-flash-image-preview`)

## Installation

Depuis la racine du monorepo :

```bash
pnpm install
```

## Configuration

L'app a besoin d'une clé API Gemini. Crée un fichier `.env.local` dans **ce dossier** (`apps/atelier-shooting/.env.local`) :

```env
VITE_GEMINI_API_KEY=ta-clé-gemini-ici
```

Récupère une clé sur [Google AI Studio](https://aistudio.google.com/app/apikey).

⚠️ **Sécurité** : Vite expose toutes les variables `VITE_*` au bundle client. C'est OK pour un usage local-only (machine de Sarah uniquement). Si l'app passe un jour en production publique, il faudra la déplacer derrière un proxy backend.

## Lancer en dev

Depuis la racine :

```bash
pnpm dev:atelier-shooting
```

Ou directement dans le dossier de l'app :

```bash
cd apps/atelier-shooting && pnpm dev
```

L'app démarre sur `http://localhost:3001` (le port `3000` est réservé à `atelier-social` Next.js).

## Architecture

```
apps/atelier-shooting/
├── App.tsx                      ← root, gère state + génération
├── index.tsx                    ← bootstrap React
├── index.html                   ← Tailwind CDN, Font Awesome, fonts
├── components/
│   └── Sidebar.tsx              ← panneau config (steps 1-6)
├── services/
│   └── geminiService.ts         ← appel Gemini, fallbacks IMAGE_OTHER
├── constants.tsx                ← PROMPT_BASE, SHOTS_CONFIG, palettes
├── types.ts                     ← GenerationSettings, etc.
└── package.json
```

## Modes de génération

- `mannequin` : modèle solo + diversity controls
- `packshot` : produit ghost sur fond neutre, sans modèle
- `family` : couple + N enfants
- `full` : pack 6 shots avec style (`parisien` / `minimalist` / `loft`)

## Hook 1 — Casting canonique (Hub)

Au-dessus du système `diversity` legacy (random visages), un **toggle "Casting canonique"** permet de sélectionner un mannequin persistant parmi les 23 canoniques du Hub :

- Lecture des fiches dans `referentiels/shooting/mannequins_recurrents.json` + `mannequins_lot*.json`
- Le canonique JPG correspondant (`assets/canoniques/MAN-Pxx_Prenom_canonique.jpg`) est uploadé en `parts[]` Gemini AVANT le prompt = activation du mode character reference (95% fidélité visage validée)

Le mode `diversity` reste actif comme défaut (random visages, exploration créative). Le toggle bascule sur "Canonique" quand on veut une cohérence brand sur la durée (ex: Anna persistante sur 5 régénérations Mama Club).

## Référence prompts

Le pattern de prompts (PROMPT_BASE, SHOTS_CONFIG, FULL_PACK_*) est hérité de l'app `shoot_studio` originale. Aligné sur la directive D2_DEUX_FAMILLES_ESTHETIQUES (Émoï-Émoï × Sézane × A.P.C. × Maison Labiche × AMI Paris × Octobre Éditions).

## Historique

- **2026-04-30** : fork de `archives/aistudio_legacy/shoot_studio/` vers `apps/atelier-shooting/` (Phase 0 du plan migration). Sanitization standalone (retrait `window.aistudio`, `process.env.API_KEY`, importmap esm.sh, metadata AIStudio). Port 3001.
