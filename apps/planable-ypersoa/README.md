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
✅ Suppression & reset (V1.0.1, mai 2026) — cf. section dédiée

🚧 Hors V1.0 (cf. CHANGELOG roadmap) : drag&drop, vue semaine, intégration atelier-social, Meta Graph publication, Pinterest API, métriques.

## Suppression & reset (V1.0.1)

Trois façons d'effacer une planification, toutes protégées contre la suppression d'entrées `published` :

| Geste | Où | Quoi | Endpoint |
|---|---|---|---|
| **Corbeille au survol** | Calendrier — hover sur un chip | Supprime 1 entrée après confirmation | `DELETE /api/calendar/[id]` |
| **Sélection multiple** | Bouton "Sélectionner" dans le header → cliquer plusieurs chips → toolbar "Supprimer la sélection" | Supprime N entrées en un appel | `POST /api/calendar/bulk-delete` body `{ ids: string[] }` |
| **Reset campagne** | SuggestionsPanel — bouton rouge "Effacer la planification (N)" sur la carte d'occasion (apparaît dès qu'au moins 1 entrée non-publiée existe pour ce slug) | Supprime toutes les entrées liées à un `occasion_slug` | `DELETE /api/campaigns/[slug]/entries` |

### Règle : `published` jamais supprimé

- Côté serveur : tous les endpoints chaînent `.neq("status", "published")` sur le delete. Réponse `409` si l'entrée individuelle ciblée est publiée, ou comptage `skipped_published` pour les batchs.
- Côté UI : la corbeille de chip n'apparaît pas sur les chips publiés, le bouton "Supprimer" du panneau de détail est remplacé par un message vert "déjà publiée — suppression désactivée", et les flux batch affichent un récap `alert("X supprimées · Y ignorées car publiées")`.

### Mode sélection — UX

- Toggle "Sélectionner" dans le header (icône case à cocher) → bascule l'app en mode sélection.
- En mode sélection : chaque chip affiche une checkbox visuelle, le clic toggle l'appartenance au set sélectionné (au lieu d'ouvrir le détail). Le clic sur une case vide du calendrier est désactivé (pas de création accidentelle).
- Toolbar persistante sous le header : `N sélectionnée(s) · Annuler · Supprimer la sélection`.

### Reset campagne — usage typique

Workflow : clic "Planifier la campagne complète" → ça crée 19 entrées draft → tu n'aimes pas la répartition → bouton "Effacer la planification (19)" sur la même carte → re-clic "Planifier" pour repartir de zéro.

Le bouton n'apparaît que si `plannedCountBySlug.get(slug) > 0` (calculé côté client à partir de la liste d'entrées du mois affiché — un slug avec 0 entrée draft visible n'affiche pas le bouton).

### Bug latent corrigé au passage

Avant V1.0.1, cliquer sur un chip propageait le `onClick` jusqu'à la case du jour, ce qui ouvrait *aussi* le dialog "Nouvelle entrée" en arrière-plan. Le chip appelle maintenant `event.stopPropagation()`.

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

### Smoke test V1.0.1 (suppression & reset)

8. Survole un chip dans le calendrier → petite corbeille rouge en haut à droite du chip → click + confirmer → l'entrée disparaît.
9. Click "Sélectionner" dans le header → l'app passe en mode sélection (case à cocher pleine sur le bouton). Click sur 3 chips → toolbar affiche "3 sélectionnée(s)". Click "Supprimer la sélection" → confirmation → les 3 entrées disparaissent.
10. Re-planifie Fête des Pères (click "Planifier la campagne complète" → 19 entrées). Sur la carte de suggestion, un bouton rouge "Effacer la planification (19)" apparaît → click → confirmation → les 19 entrées disparaissent d'un coup, le bouton "Planifier" est de nouveau dispo.
11. Crée une entrée puis force `status=published` en SQL direct (ou via Supabase Studio) → vérifie : pas de corbeille au survol, le panneau de détail affiche "déjà publiée — suppression désactivée", et tenter un bulk-delete sur cet ID renvoie `skipped_published: 1`.

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
│   │   ├── api/calendar/               # CRUD entries (DELETE refuse `published`)
│   │   ├── api/calendar/[id]/generate-pack/   # MOCK V1.0
│   │   ├── api/calendar/bulk-delete/   # V1.0.1 — suppression multi-IDs
│   │   ├── api/suggestions/            # Sidebar gauche
│   │   ├── api/campaigns/[slug]/expand/       # FdP 2026 → 19 entries
│   │   ├── api/campaigns/[slug]/entries/      # V1.0.1 — DELETE = reset campagne
│   │   └── page.tsx                    # Layout 3 cols + mode sélection global
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
