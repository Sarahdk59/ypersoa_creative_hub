# J3 — Schéma cible des 6 référentiels shooting (v3)

> **Statut** : J3.A figé le 2026-04-19 — sert de brief technique pour J3.B et J3.C
> **Version 3** : ajoute le 6ème référentiel `mannequins_recurrents.json` (casting fixe 12+8 = 20 personnages, 100% IA, répartition démographique française)
> **Localisation cible** : `referentiels/shooting/`
> **Sources consommées** : 4 outils AI Studio + DOCX prompts + XLSX plan + Brigitte v2 + charte éditoriale

---

## 1. Architecture cible

```
referentiels/
├── _mapping_legacy.json                        ✅ J3.0
├── charte_editoriale.json                      ✅ J2
├── palette_fils_broderie.json                  ✅ J0
├── palette_supports_vetements.json             ✅ J0
├── regles_combinaisons_shooting.json           ✅ J1
└── shooting/                                   ⏳ J3.B + J3.C
    ├── _schema_j3.md                           ⏳ J3.A (ce document)
    ├── direction_artistique_hero.json          ⏳ J3.B
    ├── ambiances_shooting.json                 ⏳ J3.B
    ├── types_de_shots.json                     ⏳ J3.B
    ├── mannequins_recurrents.json              ⏳ J3.B  (6ème référentiel - NOUVEAU)
    ├── prompts_library.json                    ⏳ J3.C
    └── plan_shooting_systematique.json         ⏳ J3.C
```

---

## 2. Logique d'orchestration des 6 référentiels

Les 4 axes orthogonaux du système shooting Ypersoa :

```
AXE 1 : AMBIANCE (mood/lumière/lieu)        → ambiances_shooting.json
AXE 2 : TYPE DE SHOT (cadrage/composition)  → types_de_shots.json
AXE 3 : MANNEQUIN (qui apparaît à l'image)  → mannequins_recurrents.json
AXE 4 : PROMPT TEMPLATE (texte EN)          → prompts_library.json
```

Pour générer une image, le Hub combine 1 valeur de chaque axe :
> "Génère un **Crop** (axe 2) en **Studio Brut** (axe 1) avec **Marie #1** (axe 3) et le template **PP-H03** (axe 4)"

Au-dessus de ces 4 axes, 2 référentiels stratégiques :
- `direction_artistique_hero.json` — la grammaire visuelle globale + règles de production pack
- `plan_shooting_systematique.json` — la matrice 408 shots (planification production)

---

## 3. Référentiel 1 — direction_artistique_hero.json

### Source
- `archives/aistudio_legacy/shooting_director/src/services/gemini.ts`
- Section "anti-supermodel" du `archives/aistudio_legacy/atelier_social/src/lib/gemini.ts`
- **Directives Sarah J3.A** (3 règles ajoutées en v2)

### Rôle
Définir la **grammaire visuelle globale** que tous les shootings doivent respecter par défaut, avec règles de production pack et possibilité d'override par motif spécifique.

### Structure cible

```json
{
  "_meta": {
    "schema_version": "2.0",
    "referentiel": "direction_artistique_hero",
    "description": "Grammaire visuelle globale Ypersoa. Inspirée de Shooting Director (univers décor) + Atelier Social (direction modèles). Intègre les directives stratégiques Sarah de J3.A. Override possible au niveau motif.",
    "directives_strategiques_integrees": [
      "Humanité visible OBLIGATOIRE (anti-supermodel renforcé)",
      "Distribution ambiances 80% Studio Brut + Loft Organique (40/40), 20% autres",
      "Duo systématique par pack avec rotation cyclique sur 4 types",
      "Casting fixé à 20 mannequins récurrents (12 principaux + 8 secondaires)"
    ]
  },

  "univers_signature": {
    "decor_principal": "appartement éditorial parisien, mur moulé vert sauge, parquet chevron",
    "lumiere_dominante": "naturelle, lumière de fenêtre",
    "accessoires": "botaniques, vintage, bois clair, céramique"
  },

  "direction_modeles_globale": {
    "regle_par_defaut": "humanite_visible",
    "statut": "REGLE_ABSOLUE",
    "philosophie": "Pro-humanité visible. Les défauts physiques ne sont pas tolérés mais REVENDIQUÉS comme partie intégrante de l'identité brand. Une image Ypersoa doit montrer une personne qui pourrait être ta voisine, ta mère, ta tante.",
    "casting_fixe": "Voir mannequins_recurrents.json - 20 personnages récurrents (12 principaux + 8 secondaires)",

    "specifications": {
      "age_cible": "5 à 75 ans (incluant enfants, jeunes, adultes, seniors)",
      "physique_obligatoire_au_choix": [
        "rides et lignes d'expression naturelles",
        "cheveux gris, blancs ou poivre-et-sel bienvenus",
        "taches de rousseur visibles",
        "morphologies non-standard (curvy, plus-size)",
        "eczéma, vitiligo, cicatrices, vergetures",
        "imperfections visibles et assumées"
      ],
      "regle_application": "Au moins UN défaut physique visible par modèle, parfois plusieurs",
      "regard_par_defaut": "directement dans l'objectif",
      "expression_par_defaut": "sourire authentique, vraie vie, émotion palpable",
      "interdictions_absolues": [
        "mannequins lisses ou retouchés",
        "perfection plastique",
        "expressions figées style catalogue",
        "skin smoothing (filtre lissant la peau)",
        "filtre beauté",
        "retouches Photoshop sur le visage"
      ]
    },

    "override_possible_par_motif": true,
    "exemples_overrides_documentes": [
      {
        "motif": "YPM-001 La Brigitte",
        "override": "Regard hors champ pensif (pas le sourire caméra)",
        "raison": "Sobriété épurée du motif demande une attitude plus contemplative"
      }
    ]
  },

  "regles_production_pack": {
    "description": "Règles de génération d'un pack d'images pour un motif. RÈGLES OBLIGATOIRES, pas des préférences.",

    "distribution_ambiances": {
      "regle": "80/20 entre cluster premium-sobre et autres ambiances",
      "studio_brut": "40%",
      "loft_organique": "40%",
      "aube_intime": "8%",
      "echappee_sauvage": "6%",
      "lumiere_sepia": "6%",
      "calcul_pour_pack_de_10": "4 Studio Brut + 4 Loft Organique + 1 ambiance_autre + 1 ambiance_autre",
      "calcul_pour_pack_de_6": "3 Studio Brut + 2 Loft Organique + 1 ambiance_autre"
    },

    "duo_obligatoire_par_pack": {
      "regle": "Minimum 1 shot duo par pack complet, choisi par rotation cyclique",
      "rotation_cyclique": ["parent_enfant", "grand_parent_parent", "adultes_amis", "couple"],
      "logique_rotation": "Chaque nouveau pack avance d'un cran. Pack 1 = parent_enfant, Pack 2 = grand_parent_parent, Pack 3 = adultes_amis, Pack 4 = couple, Pack 5 = retour parent_enfant."
    },

    "casting_par_pack": {
      "regle": "Chaque pack utilise 2-3 mannequins maximum (cohérence visuelle)",
      "rotation_long_terme": "Sur 6 mois, chaque mannequin principal doit apparaître dans minimum 30 shots",
      "mannequins_secondaires": "Apparaissent 5-10 fois maximum sur tout le catalogue"
    }
  },

  "specifications_techniques_par_defaut": {
    "aspect_ratio_default": "1:1",
    "image_size": "2K",
    "style_photographique": "35mm film photography, medium format camera, soft cinematic natural lighting",
    "post_processing": "no retouching feel, analog film grain, raw editorial",
    "modeles_gemini": ["gemini-3.1-flash-image-preview (principal)", "gemini-2.5-flash-image (fallback)"]
  }
}
```

---

## 4. Référentiel 2 — ambiances_shooting.json

### Source
- `archives/aistudio_legacy/atelier_social/src/components/VibeSelector.tsx` (5 vibes codifiées)

### Rôle
Catalogue des 5 ambiances/moods disponibles. Axe 1 du système. Enrichies avec palette + mannequins + usage par pilier.

### Structure cible (résumé)

5 ambiances ordonnées par priorité :
1. **Studio Brut** (40% pack) — minimalisme absolu, ombres franches
2. **Loft Organique** (40% pack) — béton ciré, serre lumineuse, chic végétal
3. **L'Aube Intime** (8% pack) — lumière matinale, intimité
4. **Échappée Sauvage** (6% pack) — vent, mouvement, nature brute
5. **Lumière Sépia** (6% pack) — heure dorée, nostalgie

Chaque ambiance contient : `id`, `label_fr`, `prompt_en_keywords`, `lumiere_dominante`, `tons_chromatiques`, `lieu_type`, `mannequins_compatibles_par_id` (référence vers mannequins_recurrents.json), `usage_par_pilier`.

---

## 5. Référentiel 3 — types_de_shots.json

### Source
- `archives/shooting_legacy/ypersoa_shooting_complet_v5.xlsx` onglet "Récap"
- Sections du DOCX `prompt_shooting_Site.docx`

### Rôle
Catalogue des 6 types de cadrage/composition. Axe 2 du système.

### Structure cible (résumé)

6 types :
1. **Ghost Packshot** (sans modèle, fond blanc)
2. **Crop Poitrine** (cadrage serré, broderie en focal)
3. **Lifestyle Studio** (intérieur curé, ambiance Maison Labiche)
4. **Lifestyle Outdoor** (rue côtière, golden hour)
5. **Macro Broderie** (gros plan, savoir-faire)
6. **Duo / Couple** (intergénérationnel obligatoire)

Chaque type contient : `id`, `label_fr`, `usage_principal`, `specs_techniques`, `duo_compatible`, `prompt_en_keywords`, `mannequins_minimum_requis`, `nb_mannequins_typique`.

---

## 6. Référentiel 4 — mannequins_recurrents.json (NOUVEAU)

### Source
- **Décision stratégique Sarah J3.A** (2026-04-19, séance de nuit)
- Inspiration : direction modèles d'Atelier Social + biais corrigés

### Rôle
Casting FIXE de 20 personnages récurrents qui apparaissent sur tous les shootings et toutes les communications RS pour créer une **reconnaissance brand** et incarner authentiquement la **diversité française**.

### Philosophie

> Une communauté reconnaît ses visages. Plutôt que 408 modèles anonymes générés par IA à chaque appel, on fixe 20 personnages qui reviennent et créent une narration visuelle continue. La cliente d'Ypersoa finit par "connaître" Marie, Karim, Léa & Lila.

### Politique générale

- **100% IA pure** : aucun droit à l'image à gérer, full liberté créative
- **20 personnages au total** : 12 principaux (récurrents souvent) + 8 secondaires (apparitions ponctuelles)
- **Stabilité IA** : chaque mannequin a une "image de référence" générée une fois et injectée systématiquement dans les prompts pour cohérence visuelle (~70-80% de stabilité avec Gemini 3.1)

### Structure cible

```json
{
  "_meta": {
    "schema_version": "1.0",
    "referentiel": "mannequins_recurrents",
    "description": "Casting fixe Ypersoa — 20 personnages récurrents (12 principaux + 8 secondaires). 100% IA pure. Répartition démographique française.",
    "nb_mannequins": 20,
    "axe_systeme": "3 sur 4 (qui apparaît à l'image)"
  },

  "philosophie": "Une communauté reconnaît ses visages. Plutôt que 408 modèles anonymes, 20 personnages qui reviennent et créent une narration visuelle continue.",

  "politique_generale": {
    "type_creation": "100% IA pure",
    "modele_ia_recommande": "gemini-3.1-flash-image-preview",
    "stabilite_visuelle": "Image de référence générée une fois par mannequin, injectée dans tous les prompts ultérieurs pour cohérence ~75%",
    "droits_image": "Aucun (100% IA, pas de personnes réelles)"
  },

  "repartition_demographique_visee": {
    "blanc_he_s": 6,
    "noir_e_s": 3,
    "maghrebin_e_s_moyen_orient": 2,
    "metisses": 6,
    "afro_caribeen_ne": 1,
    "sud_asiatique": 1,
    "asiatique_est": 1,
    "mediterraneen_ne": 1,
    "total": 20,
    "commentaire": "Répartition basée sur la démographie française réelle (~70% origine européenne, 30% origines diverses dont fortes communautés afro et maghrébine)"
  },

  "particularites_physiques_distribuees": {
    "vitiligo": "Sur mannequin afro-caribéenne (#17) - encore plus visible sur peau foncée",
    "canne_marche": "Sur mannequin maghrébin senior (#18)",
    "fauteuil_roulant": "Sur mannequin métisse (#20)",
    "eczema": "Sur mannequin métisse maghrébin-européen (#7)",
    "rides_marquees": "Sur tous les seniors et plusieurs adultes 35+",
    "taches_rousseur": "#1 française brune, #8 enfant métisse",
    "cheveux_gris_blancs": "#5, #7, #10, #16, #18, #19"
  },

  "mannequins_principaux": [
    {
      "id": "MAN-P01",
      "prenom_brand": "Clémence",
      "tier": "principal",
      "age": 40,
      "genre": "femme",
      "ethnicite": "blanche française",
      "morphologie": "curvy",
      "cheveux": "bruns mi-longs ondulés",
      "particularites": ["taches de rousseur visage", "rides sourires marquées"],
      "personnalite_visuelle": "lumineuse, complice, accessible",
      "scenes_recommandees": ["lifestyle_studio", "duo_couple", "lifestyle_outdoor"],
      "pilier_affinite": ["p2_emotion", "p3_produit"],
      "image_reference_a_generer": "mannequins/MAN-P01_clemence_reference.png",
      "prompt_en_signature": "A 40-year-old French woman, curvy figure, brown wavy shoulder-length hair, freckles on face, deep laugh lines around eyes and mouth, luminous and warm expression"
    },
    {
      "id": "MAN-P02",
      "prenom_brand": "Sofia",
      "tier": "principal",
      "age": 35,
      "genre": "femme",
      "ethnicite": "méditerranéenne (italienne/espagnole)",
      "morphologie": "slim",
      "cheveux": "noirs longs ondulés",
      "particularites": ["peau olive", "expression intense"],
      "personnalite_visuelle": "élégante, intense, classique",
      "scenes_recommandees": ["studio_brut", "lifestyle_studio", "lumiere_sepia"],
      "prompt_en_signature": "A 35-year-old Mediterranean woman (Italian or Spanish heritage), slim figure, long black wavy hair, olive skin tone, natural intense gaze"
    },
    {
      "id": "MAN-P03",
      "prenom_brand": "Aïcha",
      "tier": "principal",
      "age": 40,
      "genre": "femme",
      "ethnicite": "afro-caribéenne",
      "morphologie": "athletic",
      "cheveux": "crépus naturels mi-longs",
      "particularites": ["sourire éclatant", "peau foncée lumineuse"],
      "scenes_recommandees": ["loft_organique", "studio_brut", "lifestyle_outdoor"],
      "prompt_en_signature": "A 40-year-old Afro-Caribbean woman, athletic build, natural shoulder-length curly afro hair, dark luminous skin, radiant smile"
    },
    {
      "id": "MAN-P04",
      "prenom_brand": "Yasmine",
      "tier": "principal",
      "age": 45,
      "genre": "femme",
      "ethnicite": "maghrébine (marocaine/algérienne)",
      "morphologie": "curvy",
      "cheveux": "noirs ondulés longs",
      "particularites": ["regard intense", "peau mate"],
      "scenes_recommandees": ["loft_organique", "lifestyle_studio"],
      "prompt_en_signature": "A 45-year-old Maghrebi woman (Moroccan or Algerian heritage), curvy figure, long black wavy hair, intense gaze, matte skin tone"
    },
    {
      "id": "MAN-P05",
      "prenom_brand": "Béatrice",
      "tier": "principal",
      "age": 55,
      "genre": "femme",
      "ethnicite": "métisse noir-blanc",
      "morphologie": "plus-size",
      "cheveux": "gris-blancs courts naturels",
      "particularites": ["cheveux argentés", "rides marquées sourire"],
      "scenes_recommandees": ["lifestyle_studio", "duo_couple", "aube_intime"],
      "rotation_duo": "grand_parent_parent",
      "prompt_en_signature": "A 55-year-old mixed-race (Black and White) woman, plus-size figure, short natural silver-gray hair, deep smile lines, warm motherly expression"
    },
    {
      "id": "MAN-P06",
      "prenom_brand": "Mathieu",
      "tier": "principal",
      "age": 40,
      "genre": "homme",
      "ethnicite": "blanc français",
      "morphologie": "athletic",
      "cheveux": "bruns épais avec barbe courte",
      "particularites": ["barbe naturelle", "regard franc"],
      "personnalite_visuelle": "papa moderne, mari aimant",
      "scenes_recommandees": ["duo_couple", "lifestyle_outdoor", "lifestyle_studio"],
      "rotation_duo": "couple OR parent_enfant",
      "prompt_en_signature": "A 40-year-old French man, white European, athletic build, thick brown hair, well-groomed short beard, natural confident gaze"
    },
    {
      "id": "MAN-P07",
      "prenom_brand": "Karim",
      "tier": "principal",
      "age": 45,
      "genre": "homme",
      "ethnicite": "métisse maghrébin-européen",
      "morphologie": "curvy",
      "cheveux": "gris poivre-sel courts",
      "particularites": ["eczéma sur les mains assumé", "barbe poivre-sel"],
      "scenes_recommandees": ["lifestyle_studio", "duo_couple", "studio_brut"],
      "rotation_duo": "grand_parent_parent",
      "prompt_en_signature": "A 45-year-old mixed-race man (Maghrebi and European heritage), slightly curvy build, short salt-and-pepper hair, matching beard, visible eczema on hands"
    },
    {
      "id": "MAN-P08",
      "prenom_brand": "Lila",
      "tier": "principal",
      "age": 7,
      "genre": "fille",
      "ethnicite": "métisse noir-blanche",
      "morphologie": "enfant",
      "cheveux": "bouclés afro mi-longs",
      "particularites": ["taches de rousseur", "sourire enfantin"],
      "scenes_recommandees": ["duo_couple"],
      "rotation_duo": "parent_enfant (avec MAN-P05 ou MAN-P03)",
      "prompt_en_signature": "A 7-year-old mixed-race girl, shoulder-length curly afro hair, freckles on face, joyful childlike smile"
    },
    {
      "id": "MAN-P09",
      "prenom_brand": "Théo",
      "tier": "principal",
      "age": 5,
      "genre": "garçon",
      "ethnicite": "métisse maghrébin-blanc",
      "morphologie": "enfant",
      "cheveux": "noirs lisses courts",
      "particularites": ["yeux noisette", "petite cicatrice menton"],
      "scenes_recommandees": ["duo_couple"],
      "rotation_duo": "parent_enfant (avec MAN-P06 ou MAN-P07)",
      "prompt_en_signature": "A 5-year-old mixed-race boy (Maghrebi and European), straight short black hair, hazel eyes, small chin scar"
    },
    {
      "id": "MAN-P10",
      "prenom_brand": "Marie-Hélène",
      "tier": "principal",
      "age": 65,
      "genre": "femme",
      "ethnicite": "blanche française",
      "morphologie": "slim",
      "cheveux": "roux blanchissants longs",
      "particularites": ["taches de rousseur sur tout le corps", "lignes d'expression marquées", "yeux verts"],
      "scenes_recommandees": ["lifestyle_studio", "lumiere_sepia", "duo_couple"],
      "rotation_duo": "grand_parent_parent",
      "prompt_en_signature": "A 65-year-old French woman, slim figure, long red-graying hair, freckles on face and arms, deep expression lines, green eyes, elegant senior"
    },
    {
      "id": "MAN-P11",
      "prenom_brand": "Léa & Sarah",
      "tier": "principal",
      "type": "couple",
      "age": "35-40",
      "genre": "couple femme/femme",
      "ethnicite_membre_1": "métisse afro",
      "ethnicite_membre_2": "blanche nordique",
      "morphologie": "athletic",
      "particularites": "Couple LGBTQ+ visible (alliance, complicité)",
      "scenes_recommandees": ["duo_couple", "lifestyle_studio"],
      "rotation_duo": "couple",
      "prompt_en_signature": "A loving lesbian couple, both around 35-40 years old. Léa is mixed-race (Black/White) with curly hair. Sarah is Nordic White with blonde hair. Athletic builds, visible commitment, natural intimacy"
    },
    {
      "id": "MAN-P12",
      "prenom_brand": "Lucia",
      "tier": "principal",
      "age": 22,
      "genre": "femme",
      "ethnicite": "métisse hispanique",
      "morphologie": "slim",
      "cheveux": "noirs ondulés longs",
      "particularites": ["énergie jeune", "expression vive"],
      "personnalite_visuelle": "jeune adulte connectée, génération Z",
      "scenes_recommandees": ["lifestyle_outdoor", "echappee_sauvage", "studio_brut"],
      "prompt_en_signature": "A 22-year-old mixed-race Hispanic woman, slim figure, long black wavy hair, vibrant energetic expression, Gen Z urban style"
    }
  ],

  "mannequins_secondaires": [
    {
      "id": "MAN-S13",
      "prenom_brand": "Priya",
      "tier": "secondaire",
      "age": 16,
      "genre": "femme",
      "ethnicite": "sud-asiatique (sri-lankaise)",
      "morphologie": "slim",
      "cheveux": "noirs longs lisses",
      "particularites": ["sourire timide", "regard contemplatif"],
      "personnalite_visuelle": "adolescente sensible",
      "scenes_recommandees": ["aube_intime", "lifestyle_studio"],
      "usage_specifique": "Adolescente Fête des mères, génération teen",
      "prompt_en_signature": "A 16-year-old South Asian girl (Sri Lankan heritage), slim figure, long straight black hair, shy smile, contemplative gaze"
    },
    {
      "id": "MAN-S14",
      "prenom_brand": "Marcus",
      "tier": "secondaire",
      "age": 23,
      "genre": "homme",
      "ethnicite": "afro-américain",
      "morphologie": "athletic",
      "cheveux": "dreadlocks mi-longs",
      "particularites": ["dreadlocks", "tatouage visible"],
      "scenes_recommandees": ["lifestyle_outdoor", "studio_brut", "echappee_sauvage"],
      "usage_specifique": "Jeune homme Génération Z",
      "prompt_en_signature": "A 23-year-old Afro-American man, athletic build, shoulder-length dreadlocks, visible arm tattoo"
    },
    {
      "id": "MAN-S15",
      "prenom_brand": "Bébé Noé",
      "tier": "secondaire",
      "age": 1,
      "genre": "indéfini",
      "ethnicite": "métisse",
      "morphologie": "bébé",
      "cheveux": "bouclés naissants",
      "scenes_recommandees": ["duo_couple", "aube_intime"],
      "usage_specifique": "Naissance, fête des parents, baby shower",
      "rotation_duo": "parent_enfant (porté)",
      "prompt_en_signature": "A 12-month-old mixed-race baby (gender neutral presentation), tiny soft curly hair, peaceful expression"
    },
    {
      "id": "MAN-S16",
      "prenom_brand": "Hiroshi",
      "tier": "secondaire",
      "age": 55,
      "genre": "homme",
      "ethnicite": "asiatique de l'est (japonais)",
      "morphologie": "athletic",
      "cheveux": "gris noirs courts",
      "particularites": ["lunettes design", "rides discrètes"],
      "scenes_recommandees": ["studio_brut", "loft_organique"],
      "usage_specifique": "Diversité asiatique unique, senior actif",
      "prompt_en_signature": "A 55-year-old East Asian man (Japanese heritage), athletic build, salt-and-pepper short hair, design glasses, subtle wrinkles"
    },
    {
      "id": "MAN-S17",
      "prenom_brand": "Fatou",
      "tier": "secondaire",
      "age": 40,
      "genre": "femme",
      "ethnicite": "afro-caribéenne",
      "morphologie": "athletic",
      "cheveux": "crépus courts",
      "particularites": ["VITILIGO visible mains, cou et visage", "peau foncée avec dépigmentation patches"],
      "scenes_recommandees": ["studio_brut", "lifestyle_studio", "macro_broderie"],
      "usage_specifique": "Visibilité vitiligo - particularité physique célébrée",
      "prompt_en_signature": "A 40-year-old Afro-Caribbean woman with prominent VITILIGO patches visible on hands, neck, and face, athletic build, short natural curly hair, dark skin with depigmented areas, confident proud expression"
    },
    {
      "id": "MAN-S18",
      "prenom_brand": "Hassan",
      "tier": "secondaire",
      "age": 68,
      "genre": "homme",
      "ethnicite": "maghrébin (algérien)",
      "morphologie": "slim",
      "cheveux": "blancs courts",
      "particularites": ["CANNE EN BOIS pour marcher", "rides marquées sourires", "barbe blanche taillée"],
      "scenes_recommandees": ["lifestyle_studio", "lumiere_sepia", "aube_intime"],
      "rotation_duo": "grand_parent_parent",
      "usage_specifique": "Senior + canne, sagesse, transmission familiale",
      "prompt_en_signature": "A 68-year-old Maghrebi man (Algerian heritage), slim figure, short white hair, neatly trimmed white beard, deep smile lines, walking with a wooden cane"
    },
    {
      "id": "MAN-S19",
      "prenom_brand": "Couple Henri & Joséphine",
      "tier": "secondaire",
      "type": "couple",
      "age": "70-72",
      "genre": "couple homme/femme",
      "ethnicite_homme": "blanc nordique français",
      "ethnicite_femme": "afro-caribéenne",
      "morphologie": "homme slim, femme curvy",
      "cheveux": "homme cheveux blancs, femme cheveux gris-blancs courts",
      "particularites": "Couple senior mixte ethnique, alliances visibles, complicité de longue date",
      "scenes_recommandees": ["lumiere_sepia", "lifestyle_studio", "duo_couple"],
      "rotation_duo": "couple (senior)",
      "usage_specifique": "Anniversaire de mariage, longévité, couple intergénérationnel mixte",
      "prompt_en_signature": "A senior couple in their early 70s. Henri is a Nordic French white man with white hair, slim. Joséphine is an Afro-Caribbean woman with short gray-white hair, curvy. Visible wedding rings, deep complicity, lifelong love"
    },
    {
      "id": "MAN-S20",
      "prenom_brand": "Anaïs",
      "tier": "secondaire",
      "age": 35,
      "genre": "femme",
      "ethnicite": "métisse",
      "morphologie": "slim",
      "cheveux": "bruns longs",
      "particularites": ["FAUTEUIL ROULANT (utilisatrice quotidienne)", "regard franc", "tenue stylée"],
      "scenes_recommandees": ["studio_brut", "lifestyle_studio", "loft_organique"],
      "usage_specifique": "Visibilité handicap moteur, mode adaptive",
      "prompt_en_signature": "A 35-year-old mixed-race woman in a wheelchair (active daily user), slim figure, long brown hair, direct confident gaze, stylish outfit"
    }
  ],

  "duo_recurrents_etablis": [
    {
      "id": "DUO_BEATRICE_LILA",
      "type_rotation": "grand_parent_parent",
      "membre_1": "MAN-P05",
      "membre_2": "MAN-P08",
      "lien": "grand-mère et petite-fille",
      "scenes_recommandees": ["duo_couple", "aube_intime"]
    },
    {
      "id": "DUO_MATHIEU_THEO",
      "type_rotation": "parent_enfant",
      "membre_1": "MAN-P06",
      "membre_2": "MAN-P09",
      "lien": "père et fils",
      "scenes_recommandees": ["duo_couple", "lifestyle_outdoor"]
    },
    {
      "id": "DUO_LEA_SARAH",
      "type_rotation": "couple",
      "membre_1": "MAN-P11_lea",
      "membre_2": "MAN-P11_sarah",
      "lien": "couple lesbien marié",
      "scenes_recommandees": ["duo_couple", "lifestyle_studio"]
    },
    {
      "id": "DUO_HENRI_JOSEPHINE",
      "type_rotation": "couple senior",
      "membre_1": "MAN-S19_henri",
      "membre_2": "MAN-S19_josephine",
      "lien": "couple senior marié 50 ans",
      "scenes_recommandees": ["lumiere_sepia", "duo_couple"]
    }
  ],

  "regles_distribution": {
    "par_pack": "Chaque pack utilise 2-3 mannequins maximum (cohérence visuelle)",
    "par_collection": "Tous les mannequins principaux apparaissent au moins une fois sur la durée d'une collection",
    "rotation_long_terme": "Sur 6 mois, chaque mannequin principal doit apparaître dans minimum 30 shots",
    "mannequins_secondaires_quota": "Apparaissent 5-10 fois maximum sur tout le catalogue (gardés pour des occasions précises)"
  }
}
```

---

## 7. Référentiel 5 — prompts_library.json

### Source
- `archives/shooting_legacy/prompt_shooting_Site.docx` (37 prompts paramétrables)

### Rôle
Bibliothèque opérationnelle de prompts paramétrables. Axe 4 du système.

### Variables universelles (mises à jour avec mannequin)

```json
"variables_universelles": {
  "PRODUIT": "type de vêtement (ex: hoodie, sweat, t-shirt, zoodie)",
  "MOTIF": "id YPM-XXX + image jointe en pièce jointe",
  "COULEUR_FIL": "id fil_xxx (ex: fil_vert_jade, fil_terracotta)",
  "COULEUR_SWEAT": "id couleur_support (ex: marine, beige, blanc)",
  "MANNEQUIN_ID": "id MAN-PXX ou MAN-SXX (référence vers mannequins_recurrents.json)",
  "MANNEQUIN_PROMPT_SIGNATURE": "injection automatique du prompt_en_signature du mannequin"
}
```

### Règle universelle anti-supermodel + mannequin

> Tous les prompts ajoutent automatiquement les suffixes :
> 1. **Mannequin signature** : `[MANNEQUIN_PROMPT_SIGNATURE]`
> 2. **Anti-supermodel** : `Real human model with visible imperfections (wrinkles, gray hair, freckles, scars, eczema, body diversity). No retouching, no skin smoothing, no perfection plastic.`

---

## 8. Référentiel 6 — plan_shooting_systematique.json

### Source
- `archives/shooting_legacy/ypersoa_shooting_complet_v5.xlsx` onglet "Motifs — 6 shots"

### Rôle
Matrice de 408 shots à produire. Indexée motif × produit × type de shot. **Inclut maintenant la référence au mannequin assigné** (axe 3).

### Structure (avec mannequin)

```json
"shots_par_combinaison": [
  {
    "combinaison_id": "YPM-001-YP001-Beige-Adulte",
    "motif_code": "YPM-001",
    "produit_id": "YP001",
    "shots": [
      {
        "type": "ghost",
        "filename": "Brigitte-Hoodie-Beige-Adulte-Ghost-01.png",
        "prompt_template_id": "PP-H02",
        "ambiance_default": "studio_brut",
        "mannequin_assigned": null
      },
      {
        "type": "lifestyle_studio",
        "filename": "Brigitte-Hoodie-Beige-Adulte-Lifestyle-Studio-01.jpg",
        "prompt_template_id": "PP-H03",
        "ambiance_default": "loft_organique",
        "mannequin_assigned": "MAN-P01"
      },
      {
        "type": "duo_couple",
        "filename": "Brigitte-Hoodie-Beige-Adulte-Duo-01.jpg",
        "prompt_template_id": "PP-H05",
        "ambiance_default": "studio_brut",
        "mannequin_assigned": "DUO_LEA_SARAH",
        "rotation_cyclique": "couple"
      }
    ]
  }
]
```

---

## 9. Plan d'exécution J3.B et J3.C

### Session J3.B (estimée 3h — augmentée car 6ème référentiel)

1. **direction_artistique_hero.json** (45 min)
2. **ambiances_shooting.json** (45 min)
3. **types_de_shots.json** (30 min)
4. **mannequins_recurrents.json** (1h - NOUVEAU 6ème référentiel)

**Commit** : `J3.B: 4 référentiels shooting (DA hero + ambiances + types_de_shots + mannequins_recurrents)`

### Session J3.C (estimée 2h) — 2 référentiels volumineux

1. **prompts_library.json** (1h15)
2. **plan_shooting_systematique.json** (45 min) — assignation mannequins aux 408 shots

**Commit** : `J3.C: 2 référentiels shooting volumineux (prompts_library + plan_shooting avec mannequins assignés)`

---

## 10. Réconciliations à faire en J3.B

### Réconciliation 1 — Direction modèles Brigitte
Brigitte v2 dit "regard hors champ pensif". Atelier Social dit "regard caméra direct".
**Action J3.B** : ajouter override Brigitte dans son JSON.

### Réconciliation 2 — Mention "Tajima TMEZ" dans Brigitte v2
**Action J3.B** : corriger cette ligne dans Brigitte v2.

### Réconciliation 3 — Couleurs incohérentes legacy
**Action J3.C** : appliquer le _mapping_legacy aux 37 prompts.

### Réconciliation 4 (NOUVELLE) — Mannequins recommandés Brigitte
Brigitte v2 dit "femme 30-45 cheveux chatains". Maintenant on a 20 mannequins fixes.
**Action J3.B** : remplacer la description vague par une liste de mannequins compatibles (ex: MAN-P01, MAN-P02, MAN-P10).

---

## 11. Checklist de validation J3 complet

- [ ] 6 référentiels dans `referentiels/shooting/`
- [ ] Brigitte v2 corrigé (override DA + correction Tajima TMEZ + mannequins compatibles)
- [ ] Tous les prompts nettoyés via `_mapping_legacy.json`
- [ ] Suffixe "anti-supermodel" + injection mannequin appliqués à tous les prompts
- [ ] Distribution 80/20 ambiances appliquée au plan systématique
- [ ] Rotation cyclique duo documentée
- [ ] 408 shots assignés à un mannequin (ou null pour Ghost/Macro)
- [ ] 4 commits Git J3.0, J3.A, J3.B, J3.C
- [ ] Cohérence vérifiée entre les 4 axes (ambiances × types × mannequins × prompts)
- [ ] Plan de 408 shots utilisable directement par le Hub

---

## 12. Directives stratégiques Sarah J3.A — récapitulatif final

### Directive 1 — Humanité visible OBLIGATOIRE
> "L'anti-supermodel c'est une règle. On veut des modèles humains (avec des défauts, des rides, des cheveux gris, des taches de rousseur, du surpoids, de l'eczéma...)"

### Directive 2 — Distribution 80/20 ambiances (40/40)
> "Pour les styles de shots, j'aimerais garder une proportionnelle : minimaliste/botanical loft à 80% (40/40)"

### Directive 3 — Duo systématique avec rotation cyclique
> "Un duo (parent-enfant, grand-parent parent, adultes, couple...) dans chaque génération de pack complet"

### Directive 4 (NOUVELLE) — Casting fixe 20 mannequins récurrents
> "Je me demandais si on devait pas créer un outil de mannequin et fixer que le mannequin qui sert pour le shooting, sert pour les RS..."

**Application** :
- 12 mannequins principaux + 8 secondaires = 20 personnages
- 100% IA pure (pas de droits à l'image)
- Répartition démographique française réelle (6 blanc·he·s, 3 noir·e·s, 2 maghrébin·e·s, 6 métisses, etc.)
- Particularités physiques distribuées sur profils non-blancs (vitiligo sur afro-caribéenne, canne sur maghrébin senior, fauteuil roulant sur métisse)
- Couples établis à l'avance (Léa & Sarah lesbien, Henri & Joséphine senior mixte)
- Image de référence générée une fois par mannequin pour stabilité visuelle

---

*Document figé en J3.A v3 le 2026-04-19 — sert de brief technique pour les sessions J3.B et J3.C.*
