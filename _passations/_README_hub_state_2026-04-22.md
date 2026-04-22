# 🎯 État du Hub Ypersoa — 22 avril 2026

> Document de passation après 21 commits sur 2 jours intenses (J3.B + J3.C + Phase 1 Hub + corrections + 3ème variante).
> À lire en priorité au démarrage de toute nouvelle session.

---

## 🏗️ Architecture du Hub (vue 10 000 pieds)

Le Hub Ypersoa est un **moteur de production créative multi-canal** conçu pour transformer un nouveau motif (template + variantes) en livrables complets sur **8 modules d'agence** :

1. Copywriter produit Shopify
2. Directeur artistique + Styliste shooting
3. Designer carrousel IG
4. Video editor / Reels
5. Community manager (posts récurrents)
6. Editorial / hooks
7. Sondages / stories
8. Tags RS multi-plateforme

**Cible :** 150 motifs/an déployés sur Shopify + RS, en batch.

### Architecture en 3 couches

```
COUCHE 1 — DATA (existe ✅)
  motifs/          → templates paramétrables (YPM-001 à YPM-017)
  referentiels/    → palettes, axes Shopify, mannequins, ambiances
  variantes/       → instanciations de templates avec 8 modules

COUCHE 2 — ENGINES (à coder en Phase 2+)
  engines/shooting.ts
  engines/carrousel.ts
  engines/reel.ts
  engines/posts.ts
  engines/copywriter_shopify.ts
  engines/hooks.ts
  engines/tags_rs.ts
  engines/sondages.ts

COUCHE 3 — ORCHESTRATEUR (à coder en Phase 6)
  hub.ts → input PNG motif → propose variantes → orchestre engines
```

---

## ✅ Ce qui est fait et figé

### J3.B + J3.C (hier, 17 commits) — Direction artistique
- ✅ Casting 21 mannequins (12 principaux + 9 secondaires) avec style_wear détaillés
- ✅ 4 duos avec dynamiques (Beatrice/Felicie, Mathieu/Gabin, Léa/Sarah, Henri/Joséphine)
- ✅ Particularités physiques distribuées (vitiligo, canne, fauteuil)
- ✅ Directive 1 v2.0 "Beauté Incarnée à la Française" (anti-supermodel + anti-réalité crue)
- ✅ 7 types de shots dont **famille_vivante** (nouveau)
- ✅ Pack hero famille 8 shots pour motifs YPM-010/003/004
- ✅ Override Brigitte v2.1 (regard contemplatif hors champ)
- ✅ 40 templates de prompts EN dans `prompts_library.json`

### Phase 1 Hub (aujourd'hui matin, 3 commits) — Architecture
- ✅ Template **YPM-003 Le Club v3.0** refondu en **paramétrable**
  - 4 zones éditables (mot_haut 7 car, mot_bas 7 car, symbole, couleur_fil)
  - 6 symboles autorisés (Cœur default + Étoile + Trèfle + Fleur + Infini + Patte)
  - Typographie Arial Rounded, dimensions 8-10 cm
  - Séparation claire **canon Shopify** (5 suggestions PDP) vs **éditorial hub** (variantes RS/landing)
- ✅ **Schéma variante complet** (8 modules agence + checklist validation 11 points)
- ✅ **axes_shopify.json** : 14 axes (6 BRODERIES + 8 CADEAU POUR) + règle critique buffer 15j production
- ✅ 2 goldens initiaux : `var_mama_club.json` + `var_team_dog.json`

### Phase 1 corrections (aujourd'hui après-midi, 2 commits)
- ✅ **Bug couleurs supports inventées corrigé** (test Sarah sur Gemini)
  - Création `palette_supports_par_produit.json` (sous-catalogue couleurs disponibles par YPxxx)
  - Goldens patchés avec ids officiels uniquement
- ✅ **Standard formats v2 figé** : 4:5 par défaut (PDP) + 1:1 et 16:9 en exceptions justifiées
- ✅ Audit croisé : tous les goldens conformes au catalogue produit réel

### Bonus fin de session (22h-00h, 1 commit)
- ✅ 3ème variante : `var_sista_club.json` (canonique, registre sororité EVJF/best friends)
  - Construite directement avec les bons standards (pas de patch nécessaire)

---

## 📊 État des fichiers actuels

```
~/Documents/ypersoa_creative_hub/
├── motifs/
│   ├── ypm_001_brigitte.json (v2.1, override contemplatif)
│   └── ypm_003_le_club.json (v3.0, template paramétrable)
│
├── referentiels/
│   ├── axes_shopify.json
│   ├── palette_fils_broderie.json (20 fils, source de vérité)
│   ├── palette_supports_vetements.json (21 couleurs, source de vérité)
│   ├── palette_supports_par_produit.json (NOUVEAU — sous-catalogue par produit)
│   ├── _mapping_legacy.json (table de traduction termes inventés → ids)
│   ├── shooting/
│   │   ├── direction_artistique_hero.json (D1 v2.0 Beauté Incarnée)
│   │   ├── mannequins_recurrents.json (casting 21)
│   │   ├── types_de_shots.json (7 types dont famille_vivante)
│   │   ├── duos_detailles_et_distribution.json
│   │   ├── prompts_library.json (40 templates EN)
│   │   └── _README_casting.md
│   └── variantes/
│       ├── schema_variante_complete.json (LE schéma 8 modules)
│       └── le_club/
│           ├── var_mama_club.json (canon, hero famille 8 shots)
│           ├── var_team_dog.json (édito Patte, 6 shots)
│           └── var_sista_club.json (canon, sororité, 6 shots)
│
├── archives/
│   └── ypm_001_brigitte copie.json (ancienne version v2.0)
│
└── assets_produits/
    ├── YP001/YP001_fiche_produit.json
    ├── YP004/YP004_fiche_produit.json
    ├── YP005/YP005_fiche_produit.json
    ├── YP019/YP019_fiche_produit.json
    └── YP021/YP021_fiche_produit.json
```

---

## 🎯 Ce qui reste à faire — Plan par phases

### Phase 2 — Moteur shooting (NEXT)
**Stack :** TypeScript/Node (cohérent avec le repo existant)
**Mode :** Hybride (déterministe pour structure + appel API Anthropic pour génératif)

**Objectif :** transformer automatiquement (template + brief variante) en `module_2_shooting_pack` complet avec 6-8 shots prêts pour Gemini.

**Étapes proposées :**
1. Setup `hub/` : structure dossiers + types TypeScript partagés (`Variante`, `Template`, `ShootingShot`...) + helper API Claude
2. `engines/shooting.ts` MVP — 1er engine
3. Test sur Team Dog : compare output engine vs golden manuel, ajuste règles
4. Si OK → applique sur 5 autres variantes Le Club pour valider scaling

**Durée estimée :** 2-3h focused

### Phase 3 — Moteurs RS (carrousel + reel + posts + hooks + sondages + tags)
Une fois shooting validé, construire les autres engines sur le même pattern.

### Phase 4 — Moteur Copywriter Shopify
Engine qui produit titre SEO + meta + description + bullets + tags + handle.

### Phase 5 — Marketing saisonnier
Compléter `axes_shopify.campagnes_saisonnieres_calendrier_fr` (actuellement TODO) + module orchestrateur saisonnier.

### Phase 6 — Agent orchestrateur
`hub.ts` qui :
1. Prend un PNG de motif en input
2. Détecte le template parent
3. Propose 5-10 variantes inspirées
4. Pour chaque variante choisie, orchestre les engines pour produire les 8 modules
5. Sort un dossier complet par variante prêt à push Shopify + scheduler RS

### Phases parallèles (à n'importe quel moment)
- Étendre aux 16 autres templates (YPM-001, 002, 004 à 017) en suivant le pattern Le Club
- Construire `palette_supports_par_produit.json` enrichi (déjà fait, mais à étendre si nouveaux produits)
- Nettoyer `gris` et `vert_olive` de `palette_supports_vetements.json` (indispo aucun produit)

---

## ⚠️ Points de vigilance

### Règles brand absolues (à ne JAMAIS oublier)
- Tutoiement systématique
- "Brodé sur métier Tajima" en contexte technique, "brodé à la commande" en contexte client
- **JAMAIS** : "brodé à la main", "fait main", "artisanal", "TMEZ"
- **JAMAIS** de référence Etsy ou marketplace
- D1 Beauté Incarnée v2.0 : tous les prompts IA appliquent suffix universel (lived-in skin, French elegance, Emoi Emoi/Make My Lemonade refs, no retouching)

### Règles techniques
- **Toute variante** doit consulter `palette_supports_par_produit.json` avant de proposer un shot
- **Format 4:5 par défaut** (PDP), 1:1 et 16:9 réservés aux exceptions justifiées
- **Buffer 15j production** (Adriana) → toute campagne saisonnière démarre J-30 minimum
- **Particularités physiques** : présentes mais jamais centrées (test "inclusif = raté")

### Décisions verrouillées
- **Variantes éditoriales hub** ne créent PAS de PDP Shopify dédiées — elles vivent sur RS + landing pages, redirigent vers PDP unique du template
- **Hub ne génère PAS de PNG broderie** — c'est le rôle d'Adriana (production). Le hub produit le brief.
- **Mode hybride** : structure déterministe + appel API Claude pour créatif (pas tout-IA, pas tout-statique)

---

## 📈 Bilan numérique

- **21 commits** sur 2 jours
- **3 variantes Le Club** complètes (2 canon + 1 édito)
- **40 templates de prompts** EN dans la library
- **21 mannequins** au casting détaillé
- **5 fiches produit** YPxxx référencées
- **21 couleurs supports** + **20 fils** broderie dans les palettes officielles
- **14 axes Shopify** mappés
- **8 modules d'agence** structurés dans le schéma variante

---

## 🚀 Pour reprendre la prochaine session

Copie ce prompt pour démarrer une nouvelle conversation propre :

> "Claude, on reprend le Hub Ypersoa. Lis d'abord `_passations/_README_hub_state_2026-04-22.md` pour le contexte complet. État actuel : 21 commits, Phase 1 bouclée + 3 variantes Le Club golden + corrections couleurs/formats appliquées. On attaque la **Phase 2 — Moteur shooting** : engine TypeScript hybride qui transforme (template + brief variante) en module_2_shooting_pack. Stack : TypeScript/Node, mode hybride (structure déterministe + API Claude pour créatif). Première étape : setup hub/ avec types TS partagés. Tu confirmes ce point de départ ?"

---

*Sarah, repose-toi. Tu as fait un boulot massif sur 2 jours. Le hub a une fondation solide pour scaler. À la prochaine.* 🌙
