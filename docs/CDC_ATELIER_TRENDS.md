# Cahier des charges — Atelier Trends (V1)

**Statut** : cadrage validé 29/06/2026. Pas encore implémenté.
**Objectif produit** : transformer le bruit des réseaux sociaux en **3-5 tendances actionnables par semaine**, déjà traduites en idée de broderie + occasion + créneau Planable.
**Principe directeur** : *« Cette tendance, est-ce que je peux la broder et la poster ? »* — une trend qui ne devient pas un post Ypersoa n'a pas sa place dans l'outil.

---

## 0. Arbitrages validés (Sarah, 29/06/2026)

| Décision | Choix | Conséquence |
|---|---|---|
| **Sources / budget** | **Gratuit only** | Google Trends + Pinterest Trends. Pas d'agrégateur payant (Apify/SerpApi). |
| **Plateformes V1** | **Pinterest + Google Trends** | TikTok et Instagram hors V1. |
| **Cœur de valeur** | **Trend → action broderie** | Chaque tendance arrive avec motif YPM suggéré + occasion + créneau 45j + bouton « Générer ce post ». Pas un radar brut. |

### Conséquence directe, assumée
- ❌ **Pas de musiques / sons tendances en V1** → ils n'existent que via TikTok Creative Center, écarté. **Renvoyé en V2.**
- ❌ **Pas de « ce qui like sur Insta »** → aucune API fiable, écarté. Approximation manuelle seulement.
- ✅ V1 couvre : **mots/requêtes tendances, looks & esthétiques, motifs** (le tout via mots-clés, pas via images en masse).

---

## 1. La réalité technique (pourquoi pas de « scraping magique »)

Scraper directement Pinterest/Insta/TikTok = interdit CGU + instable (anti-bot, login, DOM qui change) + cassé en permanence. On ne fait **pas** ça. Les deux sources V1 :

### 1.1 Google Trends (gratuit, mots tendances FR)
- **Accès** : pas d'API officielle. On utilise un connecteur non-officiel (`google-trends-api` npm côté Node, ou `pytrends` côté `prod_hub` Python).
- **Données** : requêtes montantes (`risingQueries`), intérêt dans le temps, comparaison de termes, par région (FR).
- **Usage Ypersoa** : valider la **saisonnalité des marronniers** (règle 45j) + repérer les mots qui montent (ex. « cadeau fête des mères personnalisé »).
- **Limite honnête** : connecteur non-officiel → rate-limit possible, peut casser à l'occasion. Acceptable pour un run **hebdo** (pas temps réel). Prévoir un retry + un cache du dernier snapshot valide.

### 1.2 Pinterest Trends (gratuit, le moteur d'achat Ypersoa)
- **Accès recommandé** : **Pinterest API v5 — endpoint Trends** (`/trends/keywords/{region}/top/{trend_type}`). Gratuit, mais nécessite un **compte business + validation d'app** (gratuite, à demander). C'est la voie légale et stable.
- **Données** : mots-clés top / croissants (growing) / mensuels / annuels, par région (FR dispo).
- **Fallback si app non validée** : saisie manuelle hebdo de 10-15 mots-clés depuis `trends.pinterest.com` (public). On démarre comme ça, on bascule sur l'API dès validation.
- **Usage Ypersoa** : aligné §11 stratégie Pinterest — le mot-clé longue traîne nourrit titre + description + surimpression.

> **La « magie » n'est pas le scraping. C'est la couche d'interprétation IA (§3) qui traduit ces mots-clés bruts en idées broderie.**

---

## 2. Architecture (alignée Hub)

```
referentiels/trends/
  {YYYY-MM-DD}.json          ← 1 snapshot par run hebdo (traçable git, comme commandes/)
  _schema.md

apps/atelier-social/src/
  lib/trends/
    google-trends.ts         ← connecteur Google Trends (+ retry + cache)
    pinterest-trends.ts       ← connecteur Pinterest API v5 (+ fallback saisie manuelle)
    trends-synthesis.ts       ← couche gpt-4o : brut → actionnable (§3)
    trends-loader.ts          ← lecture/écriture snapshots fs (pattern commandes-loader)
  app/api/trends/
    route.ts                 ← GET dernier snapshot / POST déclenche un run
  app/atelier-trends/
    page.tsx                 ← dashboard hebdo (§4)
```

- **Stockage** : 1 JSON par run dans `referentiels/trends/` (pas de Supabase V1 — pattern aligné `commandes/`).
- **Cadence** : **1 run hebdo** via cron Railway. Pas de temps réel (une trend broderie ne se périme pas en 24h + ménage le rate-limit gratuit).
- **Réutilisations** : `brand-safety` (filtre les trends incompatibles), `motifs_ypm.json`, `pinterest_strategy.json` (mapping motifs↔occasions), `pinterest_lead_days` (règle 45j), pipeline `generate-copy`/`generate-image` d'atelier-social.

---

## 3. Couche cœur : synthèse IA (gpt-4o) — « Trend → action broderie »

C'est la valeur de l'outil. Entrée = mots-clés bruts Google + Pinterest. Sortie = JSON structuré, 1 entrée par tendance retenue :

```json
{
  "tendance": "string (le mot-clé / l'esthétique repérée)",
  "type": "mot" | "look" | "motif",
  "source": "google" | "pinterest",
  "signal": "montant" | "saisonnier" | "stable",
  "pertinence_ypersoa": 0-10,
  "raison_pertinence": "pourquoi c'est brodage-able pour Ypersoa",
  "motif_ypm_suggere": "YPM-XXX (via pinterest_strategy mapping)",
  "occasion_liee": "Fête des Mères | ... (marronnier)",
  "creneau_planable": "date de semis Pinterest (J-45) calculée",
  "angle_caption": "amorce d'angle éditorial (tutoiement, vocab consumer)",
  "brand_safe": true
}
```

Règles de la synthèse :
- **Filtre brand-safety** : écarte tout ce qui touche fait-main, glamour interdit, marketplaces, etc. (réutilise `checkBrandSafety`).
- **Mapping déterministe** motif ↔ occasion via `pinterest_strategy.json` (pas inventé par GPT).
- **Vocab consumer-facing** (jamais « métier Tajima » côté Pinterest — cf. mémoire `feedback_vocab_fabrication`).
- **Score < 5 = écarté du dashboard** (on ne montre que l'actionnable).

---

## 4. UI — dashboard hebdo (pas une liste brute)

`/atelier-trends` :
- **Header** : date du run, source, bouton « Rafraîchir » (relance un run).
- **Cards tendances** triées par `pertinence_ypersoa` décroissant. Chaque card :
  - le mot-clé / l'esthétique + badge type (mot/look/motif) + badge signal (montant/saisonnier)
  - score de pertinence (puce colorée)
  - **motif YPM suggéré** (avec aperçu) + **occasion liée**
  - **créneau Planable J-45** (« à semer le 12/04 pour la Fête des Mères »)
  - bouton **« Générer ce post »** → ouvre atelier-social pré-rempli (occasion + motif + fiche Pinterest + angle caption)
- **Section « écartées »** pliable : trends détectées mais hors brand ou score faible (transparence, pas de boîte noire).

---

## 5. Hors V1 (TODO V2, cadrés)

| Feature | Pourquoi V2 | Pré-requis |
|---|---|---|
| **Musiques / sons tendances** | Source = TikTok Creative Center, écarté (gratuit only) | Budget agrégateur OU connecteur TikTok |
| **TikTok hashtags + vidéos** | idem | idem |
| **Instagram « ce qui like »** | Pas d'API fiable | Veille manuelle assistée IA |
| **Images de looks en masse** | Gratuit ne permet pas le scrap d'images | Agrégateur payant |
| **Temps réel / alertes** | V1 = hebdo suffisant | Cron + webhook |
| **Lien direct → Planable auto** | V1 = bouton manuel « Générer post » | Intégration Planable poussée |

---

## 6. Risques & garde-fous

- **Connecteurs non-officiels (Google)** → peuvent casser. Garde-fou : retry + cache du dernier snapshot + run hebdo (faible fréquence).
- **Validation app Pinterest** → peut prendre du temps. Garde-fou : fallback saisie manuelle dès V1, l'outil est utile sans attendre l'API.
- **Hallucination GPT sur le mapping motif** → mapping déterministe via référentiel, GPT ne fait que scorer/rédiger l'angle.
- **Dérive brand** → tout passe par `checkBrandSafety` avant affichage.

---

## 7. Découpage de livraison suggéré

1. **Lot 1 — socle** : `trends-loader` + schéma JSON + connecteur Google Trends + run manuel + dashboard read-only.
2. **Lot 2 — Pinterest** : connecteur Pinterest (API ou saisie manuelle) + fusion des deux sources.
3. **Lot 3 — synthèse IA** : couche gpt-4o + scoring + mapping motif/occasion/45j + brand-safety.
4. **Lot 4 — action** : bouton « Générer ce post » → pré-remplissage atelier-social + cron hebdo Railway.
