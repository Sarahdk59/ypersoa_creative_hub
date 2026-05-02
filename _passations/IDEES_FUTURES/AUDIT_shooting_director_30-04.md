# AUDIT — shooting_director vs Hub Ypersoa apps

> **Audité par** : Claude Opus 4.7 (1M context)
> **Date** : 30 avril 2026
> **Source auditée** : `archives/aistudio_legacy/shooting_director/`
> **Mode** : lecture seule. Aucune modification de fichiers source.
> **Référence amont** : `referentiels/shooting/direction_artistique_hero.json`
> cite ce projet comme **source historique** de l'univers signature
> (`_meta.sources[0]`).

---

## 1. RÉSUMÉ FONCTIONNEL EN 5 LIGNES

**shooting_director** est un **planificateur de collection** : Sarah saisit les
contraintes brutes (produits adulte/enfant, couleurs, motifs, casting profils),
clique "Générer le plan", et obtient en retour un **ShootingPlan JSON très
structuré** — direction artistique, casting détaillé, 10+ scènes avec
deliverables et image_prompt, 20+ shots typés, et un planning de tournage par
journée. **Valeur unique vs humain** : la décomposition "contraintes commerciales
→ scènes scénarisées + shotlist + planning chronologique" en 60-90 secondes au
lieu d'1-2 jours de travail manuel d'une DA + planification studio. C'est l'outil
de **production amont du brief**, pas de production des images finales.

---

## 2. ANALYSE DU CODE

### 2.1 Stack réelle

- **Frontend pur** Vite 6.2 + React 19.0 + Tailwind 4.1 + Motion 12.23
- **Service IA** : `@google/genai` 1.29 (modèle texte `gemini-3.1-pro-preview`,
  modèle image optionnel `gemini-2.5-flash-image`)
- **Dépendances mortes** : `express` 4.21 et `better-sqlite3` 12.4 sont
  **déclarés dans `package.json` mais jamais importés** — dette tech à nettoyer
  avant production. Aucun backend Express, aucune DB SQLite, malgré les
  annonces du brief original Sarah.

### 2.2 Architecture

- **Frontend monolithique** : tout est dans `App.tsx` (state global, sidebar
  inputs, panneau résultat). Un seul sous-composant interne `BadgeInput`
  (lignes 7-43) pour les widgets de tags.
- **Backend** : aucun. Pas de routes API, pas de middleware.
- **Persistance** : aucune. Pas de DB, pas de `localStorage`, pas de
  `sessionStorage`. Reload de la page = plan perdu.
- **Service Gemini** : `src/services/gemini.ts` avec un system prompt
  hardcodé qui décrit le contexte Ypersoa (univers signature appartement
  éditorial parisien, mur vert sauge, parquet chevron) et un
  `responseSchema` Gemini structured output qui force la sortie JSON.

### 2.3 Modèles + coût + latence

- **Texte** : `gemini-3.1-pro-preview` — Sarah saisit les contraintes,
  Gemini renvoie le ShootingPlan complet. Latence : ~30-90s pour un plan
  de 20 shots. Coût ordre de grandeur : ~0.05-0.10€ par appel.
- **Images optionnelles** : `gemini-2.5-flash-image` (pas la même API que
  `gemini-3.1-flash-image-preview` utilisé par atelier-shooting et
  atelier-lookbook). ~0.04€/image, donc +0.80-1.20€ si Sarah génère
  toutes les visualisations des scènes.

### 2.4 Schéma `ShootingPlan` (qualité du JSON)

Type défini dans `src/types.ts`. Champs :

| Champ | Sous-structure | Granularité |
|---|---|---|
| `collection_name` | string | Faible (1 ligne) |
| `art_direction` | `{decor, light, mood}` | Moyenne (3 phrases) |
| `casting` | `{adults[], kids[]}` avec `id, role, ethnic_profile` par persona | **Élevée** |
| `scenes[]` | min 10 — `scene_id, type, required_products[], required_interaction, motifs_visible, decor_zone, framing, deliverables[], image_prompt` | **Très élevée** |
| `motif_strategy` | `{hero_motifs[], detail_only_motifs[]}` | Moyenne |
| `color_strategy` | `{hero_colors[], secondary_colors[]}` | Moyenne |
| `shotlist[]` | min 20 — `shot_id, scene_id, models[], product, color, motif, shot_type` | **Très élevée** |
| `planning[]` | array `{day, title, description, shots_count}` | Élevée |

→ Schéma riche, exhaustif, **production-ready côté donnée**. Le `image_prompt`
par scène est même prêt à être réinjecté dans atelier-shooting.

### 2.5 Maturité

**POC / early MVP.** Indices concrets :
- ❌ Aucun test (pas de `*.test.ts`)
- ❌ Pas de logger structuré, juste `console.error` en 1 endroit
- ❌ Error handling fragile (`JSON.parse()` peut crasher sans fallback solide)
- ❌ Pas de validation des inputs (Sarah peut envoyer `colors=[]`)
- ❌ Pas de persistance — un reload tue tout
- ❌ Dépendances mortes Express + SQLite (5 MB de poids inutile)
- ✅ Schéma `ShootingPlan` propre et bien typé
- ✅ Code lisible, pas de TODO/FIXME laissés
- ✅ System prompt soigné

→ **Verdict** : fonctionnel pour usage personnel par Sarah elle-même, **non
prod-ready** pour intégration directe dans le Hub. Refactor nécessaire.

### 2.6 Inputs utilisateur

Pas de brief libre type "Vacances à Porto Vecchio" — uniquement des **paramètres
typés** :
- Produits adulte / enfant (tags)
- Couleurs (12 par défaut)
- Nombre de motifs (entier, défaut 50)
- Taille motif (dropdown)
- Images référence motif (upload optionnel × 2)
- Casting (6 profils par défaut, structurés `{role, profile}`)

C'est **le même métier** qu'atelier-lookbook (transformer une intention en
prompts), mais sur des **paramètres différents** : techniques/commerciaux ici,
poétiques chez le lookbook.

---

## 3. COMPARAISON AVEC LES 3 OUTILS DU HUB

| Aspect | shooting_director | atelier-lookbook | atelier-shooting | atelier-social |
|---|---|---|---|---|
| **Input** | Params typés (produits, couleurs, motifs, casting profils) | Brief poétique court (200 chars) | PNG broderie + product + color + thread + decor + casting (canonique/diversity) | Image source + vibe + occasion + canoniques |
| **Output** | `ShootingPlan` JSON (10+ scènes, 20+ shots, planning) | 12-20 images d'ambiance + `ambiance_extraite` jsonb | 4-6 shots produit haute fidélité (mannequin / family / packshot / pack complet) | Caption + 5 hooks + carrousel 5 slides Insta OU 3 épingles Pinterest |
| **Persistance** | ❌ Aucune (in-memory React) | ✅ Supabase `lookbooks` + `lookbook_images` + bucket | ✅ Partielle — `liked_shots` + bucket (favoris uniquement, pas les packs entiers) | ✅ Supabase `social_packs` + `collections` + bucket |
| **Modèle IA** | `gemini-3.1-pro-preview` (texte) + `gemini-2.5-flash-image` (images) | gpt-5 → fallback gpt-4o (décomposition) + `gemini-3.1-flash-image-preview` (images) | `gemini-3.1-flash-image-preview` (images, character ref via parts[]) | gpt-4o (caption + brand-safety) + `gemini-3.1-flash-image-preview` (images) |
| **Place pipeline** | **Phase 0 — direction et planification** | **Phase 1 — moodboard saison** (consommé en V2 par atelier-shooting) | **Phase 2 — production des shots produit** | **Phase 3 — publication RS** |
| **Stack** | Vite 6 + React 19 (frontend pur) | Next.js 15 + Tailwind 4 (full-stack server actions) | Vite + React (legacy fork) | Next.js 15 + Tailwind 4 |
| **Maturité** | POC / early MVP | V0 testé fonctionnel | V1 stabilisé (30+ commits, prod-ready) | V1+ prod-ready avec bibliothèque |
| **Brand-safety check** | ❌ Aucun | ⚠️ Embarqué dans le system prompt | ⚠️ COPYRIGHT_DISCLAIMER guards (no text, no logo, drawstrings, anatomy, posture) | ✅ Explicite (regex CRITICAL/WARNING) |

---

## 4. TROIS SCÉNARIOS D'ARTICULATION

### Scénario A — Pipeline strict (Lookbook → Director → Shooting → Social)

```
Brief saison → Lookbook (ambiance) → Director (planification chiffrée)
            → Shooting (exécution shots) → Social (caption RS)
```

**Avantages** :
- Lecture pédagogique, chaque outil a une place claire.
- Lookbook nourrit Director en `ambiance_extraite` riche → Director génère
  un plan qui hérite déjà du mood.
- Director nourrit Shooting en `image_prompt` par scène → Shooting exécute
  avec character ref + product injection.
- Shooting nourrit Social en images likées → Social génère captions.

**Inconvénients** :
- Lourd pour les drops simples ("juste une nouvelle couleur") où Sarah saute
  les phases.
- Création d'un couplage fort : si Director casse, Shooting est bloqué.
- shooting_director **doit être réécrit prod-ready** (Express + SQLite vivants
  + persistance Supabase + tests).

**Coût d'intégration** : **élevé** — 5-10 jours pour Director (refactor +
Supabase + connexion Lookbook/Shooting/Social).

### Scénario B — Outils indépendants (Sarah choisit selon le projet)

```
[Lookbook]  [Director]  [Shooting]  [Social]
   ↕           ↕           ↕           ↕
  Sarah décide à chaque projet quels outils utiliser
```

**Avantages** :
- Zéro couplage, robustesse maximale.
- Sarah peut faire un drop "juste une couleur" en lançant Shooting seul.
- Director reste utilisable comme c'est sans refactor majeur.

**Inconvénients** :
- Pas de continuité automatique entre les outils.
- Sarah doit **manuellement copier** les sorties de l'un dans l'autre.
- Risque de duplication de saisie (couleurs / produits / canoniques) entre Director, Lookbook et Shooting.
- shooting_director reste isolé en `archives/aistudio_legacy/` sans réintégration.

**Coût d'intégration** : **faible** — 0-2 jours (juste sortir Director de
`archives/` et le relancer en standalone si Sarah veut).

### Scénario C — Hybride (Director consomme Lookbook, Shooting consomme Director, Social consomme Shooting)

```
Lookbook ────[ambiance_extraite]────▶ Director
                                          │
                                  [shotlist[] + scenes[]]
                                          │
                                          ▼
Shooting ◀──[character ref + image_prompt par scène]
   │
   │ shots likés
   ▼
Social ──[caption + carrousel]
```

**Avantages** :
- Chaque flèche est **optionnelle** : Director peut tourner sans Lookbook
  (params seuls), Shooting peut tourner sans Director (mode actuel).
- Quand on enchaîne, tout se branche naturellement.
- Permet de garder shooting_director **avec ses inputs typés actuels**
  (produits, couleurs, casting) tout en lui donnant l'option d'enrichir
  avec `ambiance_extraite` venant d'un lookbook liké.
- Lookbook ↔ Shooting via "lookbook liké comme décor" est **déjà câblé**
  (`is_favorite` dans la table `lookbooks`, V2 dans atelier-shooting).
- shooting_director devient `apps/atelier-director/` avec migration Supabase
  identique au pattern Lookbook (table `shooting_plans`).

**Inconvénients** :
- Plus complexe à expliquer à un nouveau collaborateur que A.
- Demande une discipline : Sarah doit savoir quand enchaîner et quand non.
- Coût d'intégration intermédiaire.

**Coût d'intégration** : **moyen** — 3-5 jours pour Director (fork legacy →
`apps/atelier-director/`, refactor identique au pattern Lookbook V0 + V1, plus
le câblage optionnel des flèches Lookbook→Director et Director→Shooting).

---

## 5. RECOMMANDATION

### **Scénario C (hybride)**

**Pourquoi** :

1. **Cohérence d'architecture**. Le Hub vient de poser un pattern clair avec
   atelier-lookbook V0 : Next.js + Supabase + table dédiée + bucket dédié.
   shooting_director peut suivre le même pattern → `apps/atelier-director/`
   avec table `shooting_plans` et bucket `shooting-plans-images`. Aucune
   surprise stack-side.

2. **Réalité du workflow Sarah** (à valider via le `WORKFLOW_sarah_template.md`
   qui vient d'être créé). Ses drops ne sont pas tous des collections
   complètes. Parfois c'est juste "nouvelle couleur sur motif existant", parfois
   "Fête des Mères 2026 = collection complète à planifier". Le scénario A
   force le pipeline complet pour tous les cas, le scénario C laisse la
   flexibilité.

3. **shooting_director est mature côté schéma `ShootingPlan`** mais POC côté
   infra. Le scénario C reconnait cette dette tech : il doit être refactoré
   pour passer en prod, mais les flèches optionnelles permettent un upgrade
   incrémental — d'abord on le sort de `archives/`, on lui donne Supabase,
   puis on plombe les connexions une par une.

4. **Connexion Lookbook → Director déjà naturelle**. La structure
   `ambiance_extraite` du Lookbook (palette, lieux, props, lumière, grain,
   postures, refs) est exactement le **bloc `art_direction` enrichi** dont
   shooting_director a besoin pour générer un plan plus fin. Le LLM Gemini de
   Director peut consommer `ambiance_extraite` en JSON dans le user prompt
   sans changer le `responseSchema`.

5. **Connexion Director → Shooting déjà câblable**. Le champ `image_prompt`
   par scène + `shotlist[]` (avec `models[]`, `product`, `color`, `motif`,
   `shot_type`) **est exactement** ce qu'atelier-shooting attend en input
   actuellement, juste écrit en JSON au lieu de cliqué dans la sidebar.

### Risques principaux

- **R1 — Sarah ne veut pas piloter 4 outils.** Si l'usage réel (révélé par le
  `WORKFLOW_sarah_template.md`) montre que Sarah travaille toujours dans le
  même outil et copie-colle entre eux, le scénario C devient lourd. Mitigation :
  V0 du `apps/atelier-director/` doit déjà inclure les boutons "Importer
  ambiance d'un lookbook" et "Exporter le plan vers atelier-shooting".
- **R2 — Dette tech shooting_director.** Express et SQLite morts dans
  package.json à nettoyer. Sinon `pnpm install` casse quand le projet est
  promu hors d'`archives/`.
- **R3 — Coût Gemini sur Director.** Le modèle `gemini-3.1-pro-preview` est
  plus cher que les models flash. À mesurer en V0.
- **R4 — Conflit de `casting`.** shooting_director a sa propre logique de
  casting (6 profils par défaut typés `{role, ethnic_profile}`), Lookbook et
  Shooting consomment `mannequins_recurrents.json` (23 canoniques nommées).
  Il faut **réconcilier** : le Director migre vers `mannequins_recurrents.json`
  (au lieu d'avoir ses 6 profils ad-hoc).

### Première étape concrète si Sarah valide le scénario C

**Phase 0 — Migration legacy → app** *(2-3 jours)* :

1. Fork `archives/aistudio_legacy/shooting_director/` → `apps/atelier-director/`
   (cp + git add, comme on a fait pour `atelier-shooting`)
2. Nettoyage `package.json` : retirer `express` et `better-sqlite3`, ajouter
   `@supabase/supabase-js`, `next` (port 3004 cohérent avec 3000/3002/3003).
3. Migration vers Next.js (cohérence avec atelier-social et atelier-lookbook).
4. Migration Supabase : table `shooting_plans` + bucket `shooting-plans-scenes`,
   sur la même DB `ypersoa-hub`.
5. Réécriture du casting : remplacer les 6 profils ad-hoc par lecture de
   `referentiels/shooting/mannequins_recurrents.json` (les 23 canoniques).
6. Page principale : input params typés (comme aujourd'hui) + nouveau bloc
   "Importer ambiance d'un lookbook" (lit la table `lookbooks` Supabase).
7. Bouton "Exporter vers atelier-shooting" qui prépare un JSON de session
   pré-remplie pour atelier-shooting.

À l'issue de cette Phase 0 : **4 apps Hub en place, indépendantes mais reliées
par flèches optionnelles via Supabase.**

---

## RAPPEL DES TRAVAUX EN ATTENTE LIÉS

1. ✅ `WORKFLOW_sarah_template.md` créé — à remplir par Sarah pour confirmer/
   infirmer ce scénario C avec son usage réel.
2. 🔴 Décision Sarah Q1-Q5 lookbook (cf `AUDIT_spec_lookbook_30-04.md`) — déjà
   tranchées (A/B+A/B+like/C/A) et implémentées en V0.
3. ⏸️ Connexion `is_favorite` lookbook → décor atelier-shooting (V2 du
   lookbook). Indépendante de shooting_director.

---

**Verdict global** : shooting_director **mérite d'être promu hors d'`archives/`**
en `apps/atelier-director/` selon le scénario C. C'est cohérent avec le pattern
établi par atelier-lookbook V0 cette nuit et donne au Hub son **outil de
planification amont** qui manque aujourd'hui.
