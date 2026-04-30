# SPEC — atelier-casting : intelligence de casting Ypersoa

> Spec posée le 30/04/2026 (nuit) par Claude Code en travail autonome.
> Valide les 21 entrées canoniques et les 4 référentiels casting comme
> base de connaissance. Les apps Hub interrogeront cette base via
> une fonction commune `queryCasting(brief)`.
>
> **À valider Sarah au matin.** Les inférences biographiques posées
> dans cette nuit (anniversaires, événements de vie, traits narratifs,
> affinités latentes) sont des hypothèses plausibles déduites des fiches
> détaillées — pas des décisions DA. Sarah écrase via un round de validation.

## 1. Pourquoi atelier-casting

Le mapping 14 métiers (cf. `referentiels/metiers_hub.json` + memory project)
positionne **atelier-casting** comme l'app dédiée au métier "Directeur de
Casting". Aujourd'hui, les choix de canoniques sont faits manuellement par
Sarah dans chaque app (social/shooting/lookbook) en parcourant les 23 vignettes.

L'app atelier-casting matérialisera :
1. Une **base de connaissance** unifiée du casting (qui est qui, qui aime qui,
   qui fête quoi quand, quels duos racontent quoi).
2. Une **fonction d'interrogation en langage naturel** :
   `queryCasting(brief)` retourne des suggestions de canoniques + duos +
   ambiances + dates, alignés avec la red line Ypersoa.

Cette nuit, on pose la base de connaissance (4 fichiers JSON). L'app, le
moteur de query et l'UI viendront en sessions dédiées.

## 2. État de la base de connaissance après la session 30/04 nuit

### Fichiers source (lecture seule pour atelier-casting)

| Fichier | Rôle | Volume |
|---|---|---|
| `referentiels/shooting/mannequins_recurrents.json` | Index + métadonnées + 5 nouveaux champs biographiques pour les 21 entrées | 21 entrées (22 individus) |
| `referentiels/shooting/mannequins_lot1_5fiches.json` | Fiches détaillées Lot 1 | 5 fiches |
| `referentiels/shooting/mannequins_lot2_2fiches.json` | Fiches détaillées Lot 2 | 2 fiches |
| `referentiels/shooting/mannequins_lot3_6fiches.json` | Fiches détaillées Lot 3 | 6 fiches |
| `referentiels/shooting/mannequins_lot4_8fiches.json` | Fiches détaillées Lot 4 | 7 fiches |
| `referentiels/shooting/mannequins_coline_fiche.json` | Fiche Coline (Lot 4 bis) | 1 fiche |
| `referentiels/shooting/duos_detailles_et_distribution.json` | 12 dispositifs (8 duos + 4 trios) — direction photo, scènes types | 977 lignes |
| `referentiels/casting/calendrier_canoniques.json` | Anniversaires + événements + fenêtres commerciales Ypersoa (NOUVEAU) | 23 anniversaires |
| `referentiels/casting/affinites_narratives.json` | Dispositifs établis + affinités latentes + index par qualifier/thème (NOUVEAU) | 12 + 6 latents |
| `referentiels/metiers_hub.json` | Mapping 14 métiers ↔ modules ↔ apps (NOUVEAU) | 14 métiers |

### Champs biographiques ajoutés cette nuit aux 21 entrées

Pour chaque mannequin de `mannequins_recurrents.json` :

```json
{
  "date_anniversaire": "MM-DD",          // inférence plausible
  "saison_preferee": "automne|hiver|printemps|été",
  "evenements_de_vie": [string],          // 2-4 jalons biographiques
  "traits_narratifs": [string],           // 3-5 mots-clés
  "affinites_qualifiees": {               // dict id_canonique_ou_dispositif → phrase
    "MAN-XXX": "phrase",
    "DUO_XXX": "phrase"
  }
}
```

Pour les couples (MAN-P11 Léa+Sarah, MAN-S19 Henri+Joséphine), on a :
- `date_anniversaire_lea` + `date_anniversaire_sarah` (et idem Henri/Joséphine)
- `date_mariage`
- `saison_preferee` partagée

## 3. Architecture cible — `queryCasting(brief)`

### 3.1 Signature

```ts
type CastingSuggestion = {
  canoniques: { id: string; score: number; raison: string }[];
  dispositifs: { id: string; score: number; raison: string }[];
  ambiances_recommandees: string[];
  hooks_temporels: { date_iso: string; evenement: string }[];
  warnings: string[]; // ex: "Saison choisie incompatible avec le mannequin (canne marche en hiver glacé déconseillé)"
};

async function queryCasting(brief: {
  texte: string;                    // brief en langage naturel
  date_cible?: string;              // ISO date pour l'usage temporel
  occasion?: string;                // 'fete-meres' | 'noel' | etc.
  ambiances_preferees?: string[];   // restriction
  exclusions?: string[];            // ids de canoniques à exclure
  limite?: number;                  // nombre de suggestions retournées
}): Promise<CastingSuggestion>;
```

### 3.2 Pipeline (V1)

1. **Parse du brief** par OpenAI gpt-4o (ou Claude Haiku pour le coût)
   en JSON structuré :
   - Détection occasion (fete-meres, naissance, saint-valentin, etc.)
   - Détection date implicite (mai = fete des mères probable)
   - Détection mood (tendresse, transmission, complicité, etc.)
   - Détection famille esthétique préférée (no-makeup ou maquillée chic)
   - Détection contraintes (genre, âge, ethnicité explicite)

2. **Recherche dans la base** :
   - `themes_index` de `affinites_narratives.json` → dispositifs pertinents
   - `qualifiers_index` → match par mood
   - `calendrier_canoniques.json` → match par date implicite ou explicite
   - `mannequins_recurrents.json` → filtre démographique

3. **Scoring** combinant :
   - Match de thème (poids 3)
   - Match de qualifier (poids 2)
   - Match de date / saison (poids 2)
   - Affinité qualifiée du canonique (poids 1)
   - Bonus famille esthétique (poids 1)
   - Penalty exclusions / contraintes incompatibles (-∞)

4. **Composition de la réponse** :
   - 3-5 canoniques solos triés par score
   - 1-3 dispositifs (duos/trios) triés par score
   - Ambiances recommandées agrégées depuis les dispositifs sélectionnés
   - Hooks temporels (anniversaires + fenêtres commerciales dans la fenêtre de date)

### 3.3 Exemples d'usage

**Brief 1 :** *"Campagne fête des mères 2026, je veux deux générations de
femmes afro-caribéennes, ambiance loft parisien."*

```json
{
  "canoniques": [
    { "id": "MAN-S19-JOSEPHINE", "score": 12, "raison": "afro-caribéenne, mère matriarche, fête des mères" },
    { "id": "MAN-P03", "score": 10, "raison": "afro-caribéenne, fille de Joséphine, hôte" },
    { "id": "MAN-S17", "score": 9, "raison": "afro-caribéenne, fille de Joséphine, lectrice" }
  ],
  "dispositifs": [
    { "id": "TRIO_AICHA_CESARIA_JOSEPHINE", "score": 14, "raison": "3 générations femmes afro-caribéennes (mère + 2 filles), parfait fête des mères" }
  ],
  "ambiances_recommandees": ["loft", "minimalist"],
  "hooks_temporels": [
    { "date_iso": "06-30", "evenement": "Anniversaire Joséphine 70 ans" }
  ],
  "warnings": []
}
```

**Brief 2 :** *"Saint-Valentin, jeune couple, Brune et Gaspard."*

```json
{
  "canoniques": [
    { "id": "MAN-P12", "score": 8, "raison": "Brune, jeune femme, en couple Gaspard" },
    { "id": "MAN-S14", "score": 8, "raison": "Gaspard, en couple Brune" }
  ],
  "dispositifs": [
    { "id": "DUO_GASPARD_BRUNE", "score": 15, "raison": "couple étudiants créatifs établi" }
  ],
  "ambiances_recommandees": ["sauvage", "minimalist"],
  "hooks_temporels": [
    { "date_iso": "02-14", "evenement": "Saint-Valentin (anniversaire Sarah=14/02 clin d'œil hors couple)" },
    { "date_iso": "04-25", "evenement": "Anniversaire Brune (printemps)" }
  ],
  "warnings": []
}
```

**Brief 3 :** *"Lookbook automne, ambiance Honfleur."*

```json
{
  "canoniques": [
    { "id": "MAN-P01", "score": 15, "raison": "Clémence antiquaire Honfleur, anniversaire 22/10 → automne saison préférée" },
    { "id": "MAN-P10", "score": 9, "raison": "Marie-Hélène campagne, anniversaire 09/10 → automne" }
  ],
  "dispositifs": [
    { "id": "LIEN_CLEMENCE_MARIE_HELENE", "score": 7, "raison": "duo latent transmission femmes indépendantes campagne" }
  ],
  "ambiances_recommandees": ["sepia", "aube"],
  "hooks_temporels": [
    { "date_iso": "09-28", "evenement": "Anniversaire Béatrice 55 ans" },
    { "date_iso": "10-09", "evenement": "Anniversaire Marie-Hélène 65 ans" },
    { "date_iso": "10-22", "evenement": "Anniversaire Clémence 38 ans" }
  ],
  "warnings": ["Duo LIEN_CLEMENCE_MARIE_HELENE encore latent, à promote en formel si validé"]
}
```

## 4. Implémentation par couches

### Couche 1 — Lecture (V0, 30 min)

Une lib `apps/atelier-casting/src/lib/casting-data.ts` qui charge les 4 JSON
en mémoire au mount, les normalise dans des structures TypeScript typées :

```ts
interface CanoniqueEnriched {
  id: string;
  prenom: string;
  age: number | string;
  genre: 'F' | 'H' | 'enfant' | 'indéf';
  ethnicite: string;
  famille_esthetique?: 'no-makeup naturelle' | 'maquillée chic assumée';
  date_anniversaire?: string;
  saison_preferee?: 'automne' | 'hiver' | 'printemps' | 'été';
  evenements_de_vie?: string[];
  traits_narratifs?: string[];
  affinites_qualifiees?: Record<string, string>;
  duo?: string | null;
  fiche_complete_path?: string;  // lazy-loaded only on demand
}
```

### Couche 2 — Query déterministe (V1, 1-2j)

Implémentation de `queryCasting()` SANS LLM :
- Match exact par occasion → `themes_index`
- Match par date → `anniversaires` + `fenetres_commerciales_ypersoa`
- Match par mood mots-clés → `qualifiers_index`
- Score additif

Cette couche couvre les 80% de cas où Sarah pose un brief explicite ("fête des
mères + 3 générations afro-caribéennes" → match déterministe).

### Couche 3 — Query LLM (V2, plus tard)

Layer GPT/Claude qui pré-parse les briefs ambigus ("la femme qui rentre des
courses dans le marais" → contexte → type de canonique → score). Fallback
sur la couche déterministe.

### Couche 4 — UI atelier-casting (V3, plus tard)

Mur des canoniques + barre de recherche en haut + résultats sortis du `queryCasting()`.
Pattern UI : voir lookbook (CastingPicker existant) en plus riche.

## 5. Gouvernance des données

### Validation Sarah requise (au matin du 01/05)

- [ ] Anniversaires (23 dates inférées)
- [ ] Saisons préférées (déductibles mais subjectives)
- [ ] Événements de vie (2-4 jalons par mannequin)
- [ ] Traits narratifs (3-5 mots-clés)
- [ ] Affinités qualifiées (liens entre canoniques au-delà des duos formels)
- [ ] Affinités latentes (6 propositions de duos/trios non encore formalisés)

### Mise à jour future

- Toute modification d'une fiche canonique met à jour le `last_updated` du fichier source.
- Tout ajout de canonique requiert :
  1. Entrée dans `mannequins_recurrents.json` (avec les 5 champs bio)
  2. Image `MAN-XXX_Prenom_canonique.jpg` dans `assets/canoniques/`
  3. Mise à jour du `repartition_demographique`
  4. Décision d'ajouter ou non aux dispositifs (duos / trios)
- Toute promotion d'une affinité latente en formelle :
  1. Déplacer de `affinites_latentes` vers `dispositifs_etablis`
  2. Créer la fiche détaillée dans `duos_detailles_et_distribution.json`
  3. Ajouter au `themes_index` et `qualifiers_index`

## 6. Open questions / décisions à trancher

| Question | Statut | Note |
|---|---|---|
| Atelier-casting = app standalone Next.js (port 3004) ou route interne lookbook ? | non tranché | Reco : standalone car logique distincte |
| Stockage de la mémoire d'usage (combien de fois Clémence a été utilisée ce trimestre, etc.) | non tranché | Probablement Supabase table `casting_usage` |
| LLM pour parsing brief : OpenAI gpt-4o vs Claude Haiku 4.5 (coût ~10x différent) | non tranché | À tester en V2 |
| Format date anniversaire : MM-DD seul ou avec année (38 ans) ? | tranché | MM-DD seul (cycle annuel) |
| Mood boards / inspirations dans atelier-casting ? | hors scope | Vit dans atelier-DA si elle reprend ce sous-module |
| Comment exposer atelier-casting depuis le shell Hub ? | post-validation | Sidebar 4ème icône (sous shooting/lookbook) |

## 7. Risques et caveats

1. **Inférences biographiques cette nuit = drafts à valider.** Si Sarah refuse
   la majorité des anniversaires, il faut un round de validation manuelle
   (45 min estimé pour les 23 dates).

2. **Calendrier en boucle annuelle (MM-DD).** Si plus tard on veut tracker
   les âges réels par année, il faudra ajouter un champ `annee_naissance`
   séparé. Pour l'instant pas nécessaire.

3. **Liens familiaux complexes** (Aïcha + Césaria filles de Joséphine, Henri
   beau-père) sont documentés en plusieurs endroits — risque de divergence
   à terme. Source canonique = `affinites_narratives.json` + nouveau champ
   `affinites_qualifiees` dans `mannequins_recurrents.json`.

4. **Affinités latentes** (6 propositions de duos non formels) sont des
   hypothèses créatives — elles peuvent inspirer mais ne doivent pas être
   prises pour établies. UI atelier-casting devra les afficher distinctement.

5. **Cohérence avec `duos_detailles_et_distribution.json`.** Le fichier
   existant contient les 12 dispositifs avec direction photo détaillée (977
   lignes). `affinites_narratives.json` synthétise sans dupliquer — la fiche
   complète reste la source pour la prod shooting.

## 8. Prochaines étapes proposées

1. **Demain matin (1er mai) — Validation Sarah** sur les 5 nouveaux champs
   biographiques (~45 min).
2. **Décision GO/NO-GO atelier-casting** comme app dédiée ou route lookbook.
3. **Si GO** — scaffolding atelier-casting (1 session) :
   - `apps/atelier-casting/` Next.js port 3004
   - Lib `casting-data.ts` qui charge les JSON
   - UI mur des canoniques avec filtres famille/saison/genre/âge
   - Premier `queryCasting()` couche 2 (déterministe)
4. **Intégration shell Hub** — ajouter l'icône atelier-casting dans la
   sidebar (4ème position) avec label_chrome "Direction de Casting".
5. **V2 LLM parsing** — quand Sarah aura testé V1 et identifié les briefs
   ambigus.

## 9. Liens

- Memory : `~/.claude/projects/.../memory/project_14_metiers_hub.md`
- Référentiel : `referentiels/metiers_hub.json`
- Casting : `referentiels/casting/calendrier_canoniques.json`
- Casting : `referentiels/casting/affinites_narratives.json`
- Mannequins : `referentiels/shooting/mannequins_recurrents.json` (v3.2)
- Duos : `referentiels/shooting/duos_detailles_et_distribution.json`
- Citation gravée : CLAUDE.md ligne 563 ("Le Hub remplace les 14 métiers")
