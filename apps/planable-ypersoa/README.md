# Planable Ypersoa — V1.0

Calendrier éditorial Hub Ypersoa. Remplace l'outil tiers Planable par un module interne intégré au monorepo, qui :
- centralise toutes les pubs Insta + Pinterest planifiées,
- calcule automatiquement les **deadlines commande** depuis les occasions (formule `occurrence - lead_days`),
- propose des **packs candidats** + permet de **planifier une campagne complète** (ex: Fête des Pères 2026 → 19 entrées draft d'un coup).

## Statut V1.0

✅ Scaffold + migration Supabase + seed occasions
✅ Calculator (next occurrence + deadline + urgence) + tests vitest
✅ Vue calendrier mois custom CSS Grid
✅ SuggestionsPanel (occasions à venir + bouton "Planifier la campagne complète")
✅ EntryDialog CRUD + EntryDetailPanel
✅ API routes calendar/suggestions/campaigns
✅ Mock generate-pack (cf. TODO_INTEGRATION pour V1.1)
✅ Mode QA `today` override (input header) pour tester engagement_only

🚧 Hors V1.0 (cf. CHANGELOG roadmap) : drag&drop, vue semaine, intégration atelier-social, Meta Graph publication, Pinterest API, métriques.

## Lancer en local

```bash
cd ~/Documents/ypersoa_creative_hub
pnpm install                    # installe les deps de tous les workspaces
cp apps/planable-ypersoa/.env.local.example apps/planable-ypersoa/.env.local
# Remplir SUPABASE keys (cf. dashboard ypersoa-hub)
pnpm dev:planable               # http://localhost:3002
```

## Smoke test V1.0

1. Ouvre http://localhost:3002
2. Sidebar gauche : Fête des Pères doit apparaître en 🟠 (J-38), bouton "Planifier la campagne complète".
3. Click bouton → 19 entrées créées, visibles dans le calendrier mai/juin 2026.
4. Click sur une entrée du 25/05 → sidebar droite affiche le détail.
5. Click "Générer le pack" → mock pack créé, slides + caption affichés.
6. Click une case vide du calendrier → ouvre EntryDialog pour créer manuellement.
7. Header : input `QA today` mis à `2026-06-15` → bandeau orange "RDV manqué Fête des Pères 2026" + le pack candidat passe en mode engagement.

## Tests

```bash
pnpm --filter @ypersoa/planable-ypersoa test
```

Vitest couvre `lib/occasions/calculator.ts` (next occurrence, buyByDeadline, computeUrgency).

## Type-check

```bash
pnpm --filter @ypersoa/planable-ypersoa type-check
```

## Architecture

```
apps/planable-ypersoa/
├── src/
│   ├── app/                            # Next.js App Router
│   │   ├── api/calendar/               # CRUD entries
│   │   ├── api/calendar/[id]/generate-pack/   # MOCK V1.0
│   │   ├── api/suggestions/            # Sidebar gauche
│   │   ├── api/campaigns/[slug]/expand/       # FdP 2026 → 19 entries
│   │   └── page.tsx                    # Layout 3 cols
│   ├── components/                     # CalendarView / EntryDialog / etc.
│   └── lib/
│       ├── occasions/                  # calculator + suggestions + special-campaigns
│       ├── supabase/                   # server / client / types
│       └── brand/tokens.ts             # cream / ink / terracotta
└── supabase/migrations/                # SQL traçable (déjà appliqué via MCP)
```

## Données Supabase

Projet `ypersoa-hub` (`frvhjjijoccqreidyucp`). Tables Planable préfixées `planable_*` pour cohabiter avec les tables atelier-social (`liked_shots`, `lookbooks`, `social_packs`, etc.).

- `planable_occasions` (7 rows seed : Saint-Valentin / FdM disabled 2026 / FdP / Rentrée / Mariage / Naissance / Noël)
- `planable_calendar_entries`
- `planable_packs`
- `planable_post_metrics`

RLS V1 : ouvert (Sarah seule user). À durcir en V2 quand multi-user.

## Licence

Privé Ypersoa.
