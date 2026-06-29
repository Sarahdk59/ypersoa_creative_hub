# Schéma référentiel `trends/`

Chaque run de veille tendances Ypersoa est stocké comme `referentiels/trends/{YYYY-MM-DD}.json`.
Voir le cahier des charges complet : `docs/CDC_ATELIER_TRENDS.md`.

## Sources
- **Lot 1** — Flux **Google Trends — recherches tendances FR** (RSS public, gratuit, sans clé).
- **Lot 2** — **Pinterest** : API Trends v5 si `PINTEREST_ACCESS_TOKEN` fourni (app validée),
  sinon **mots-clés curés à la main** dans `_pinterest_manuel.json` (rail principal actuel).
  Les deux sources sont fusionnées (dédup par terme, Pinterest prioritaire).
- **Lot 3** — couche de synthèse IA (gpt-4o) : remplit `enrichissement` (score,
  occasion, motif YPM snapé sur `pinterest_strategy.json`, créneau J-45, angle).
  Déclenchée par POST `/api/trends/enrich` → passe le snapshot en `status: "enriched"`.

Pas de scraping de DOM, pas de login.

## Fichier annexe `_pinterest_manuel.json`
Liste éditable de mots-clés Pinterest curés (préfixe `_` → ignoré comme snapshot).
`{ _meta, keywords: [{ terme, trafic_estime?, signal?, note? }] }`. Éditable à la main
(git-traçable) OU via le panneau « Mots-clés Pinterest » du dashboard
(POST `/api/trends/pinterest-manuel` — runtime, éphémère sur Railway).

## État (`status`)
- `raw` — Lot 1 : tendances brutes Google, pas encore filtrées/mappées Ypersoa.
- `enriched` — Lot 3 : chaque tendance porte un bloc `enrichissement` (score, motif, occasion…).

## Champs top-level
| Champ | Type | Description |
|---|---|---|
| `id` | string | = date du run `YYYY-MM-DD` (1 run/jour max écrase). |
| `date` | string | Date du run `YYYY-MM-DD`. |
| `generated_at` | string | Timestamp ISO de génération. |
| `sources` | string[] | Sources interrogées (`["google-trends"]` en V1). |
| `status` | `raw` \| `enriched` | Voir ci-dessus. |
| `trends` | `Trend[]` | Liste des tendances détectées (triées par ordre source). |
| `meta` | object | `{ trends_count, source_url, note }`. |
| `errors` | string[] | Erreurs non bloquantes du run (source injoignable, etc.). |

## Sous-objet `Trend`
| Champ | Type | Description |
|---|---|---|
| `terme` | string | Le mot-clé / la requête tendance. |
| `source` | `google` \| `pinterest` | Plateforme d'origine. |
| `type` | `mot` \| `look` \| `motif` | Catégorie. V1 = `mot` par défaut. |
| `signal` | `montant` \| `saisonnier` \| `stable` | Daily trending Google = `montant`. |
| `trafic_estime` | string \| null | Volume approximatif fourni par la source (ex. `"200 000+"`). |
| `contexte` | string[] | Titres d'actus liées (aide à comprendre pourquoi ça monte). |
| `url` | string \| null | Lien vers la tendance sur la source. |
| `enrichissement` | `Enrichissement` \| null | **Lot 3** — null en V1. Voir ci-dessous. |

## Sous-objet `Enrichissement` (Lot 3 — null en Lot 1)
| Champ | Type | Description |
|---|---|---|
| `pertinence_ypersoa` | number (0-10) | Score d'actionnabilité broderie. |
| `raison_pertinence` | string | Pourquoi c'est brodable pour Ypersoa. |
| `motif_ypm_suggere` | string \| null | YPM-XXX (via `pinterest_strategy.json`). |
| `occasion_liee` | string \| null | Marronnier associé. |
| `creneau_planable` | string \| null | Date de semis Pinterest (J-45). |
| `angle_caption` | string \| null | Amorce d'angle éditorial (tutoiement, vocab consumer). |
| `brand_safe` | boolean | Passé par `checkBrandSafety`. |
