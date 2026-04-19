# J3 — Schéma cible des 5 référentiels shooting (v2)

> **Statut** : J3.A figé le 2026-04-19 — sert de brief technique pour J3.B et J3.C
> **Version 2** : intègre 3 directives stratégiques de Sarah (humanité visible obligatoire, distribution 80/20 ambiances, duo cyclique par pack)
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
    ├── prompts_library.json                    ⏳ J3.C
    └── plan_shooting_systematique.json         ⏳ J3.C
```

---

## 2. Logique d'orchestration des 5 référentiels

Les 3 axes orthogonaux du système shooting Ypersoa :

```
AXE 1 : AMBIANCE (mood/lumière/lieu)        → ambiances_shooting.json
AXE 2 : TYPE DE SHOT (cadrage/composition)  → types_de_shots.json
AXE 3 : PROMPT TEMPLATE (texte EN)          → prompts_library.json
```

Pour générer une image, le Hub combine 1 valeur de chaque axe :
> "Génère un **Crop** (axe 2) en **Studio Brut** (axe 1) avec le template **PP-H03** (axe 3)"

Au-dessus de ces 3 axes, 2 référentiels stratégiques :
- `direction_artistique_hero.json` — la grammaire visuelle globale + règles de production pack
- `plan_shooting_systematique.json` — la matrice 408 shots (planification production)

---

## 3. Référentiel 1 — direction_artistique_hero.json

### Source
- `archives/aistudio_legacy/shooting_director/src/services/gemini.ts`
- Section "anti-supermodel" du `archives/aistudio_legacy/atelier_social/src/lib/gemini.ts`
- **Directives Sarah J3.A** (3 règles ajoutées)

### Rôle
Définir la **grammaire visuelle globale** que tous les shootings doivent respecter par défaut, avec règles de production pack et possibilité d'override par motif spécifique.

### Structure cible

```json
{
  "_meta": {
    "schema_version": "2.0",
    "referentiel": "direction_artistique_hero",
    "description": "Grammaire visuelle globale Ypersoa. Inspirée de Shooting Director (univers décor) + Atelier Social (direction modèles). Intègre les 3 directives stratégiques Sarah de J3.A. Override possible au niveau motif.",
    "directives_strategiques_integrees": [
      "Humanité visible OBLIGATOIRE (anti-supermodel renforcé)",
      "Distribution ambiances 80% Studio Brut + Loft Organique (40/40), 20% autres",
      "Duo systématique par pack avec rotation cyclique sur 4 types"
    ]
  },

  "univers_signature": {
    "decor_principal": "appartement éditorial parisien, mur moulé vert sauge, parquet chevron",
    "lumiere_dominante": "naturelle, lumière de fenêtre",
    "accessoires": "botaniques, vintage, bois clair, céramique",
    "source": "Shooting Director gemini.ts ligne 28"
  },

  "direction_modeles_globale": {
    "regle_par_defaut": "humanite_visible",
    "statut": "REGLE_ABSOLUE",
    "philosophie": "Pro-humanité visible. Les défauts physiques ne sont pas tolérés mais REVENDIQUÉS comme partie intégrante de l'identité brand. Une image Ypersoa doit montrer une personne qui pourrait être ta voisine, ta mère, ta tante.",

    "specifications": {
      "age_cible": "30 à 60 ans (étendu pour inclure cheveux gris)",
      "physique_obligatoire_au_choix": [
        "rides et lignes d'expression naturelles autour des yeux et de la bouche",
        "cheveux gris, blancs ou poivre-et-sel bienvenus",
        "taches de rousseur visibles si présentes",
        "morphologies non-standard (surpoids, body curvy, plus-size)",
        "eczéma, cicatrices, marques de peau, vergetures",
        "imperfections visibles et assumées"
      ],
      "regle_application": "Au moins UN défaut physique visible par modèle, parfois plusieurs",
      "regard_par_defaut": "directement dans l'objectif",
      "expression_par_defaut": "sourire authentique, vraie vie, émotion palpable, regard qui sourit aussi",
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

  "casting_diversite": {
    "ethnicites_a_inclure": ["diverse", "white", "black", "asian", "hispanic", "middle-eastern", "south-asian"],
    "age_ranges": ["young (20-30)", "middle-aged (35-50)", "senior (60+)", "child"],
    "morphologies": ["slim", "athletic", "curvy", "plus-size"],
    "particularites_physiques_a_inclure": ["wheelchair", "prosthetic", "hearing-aid", "visible-disability"],
    "interactions_obligatoires_par_collection": [
      "couple adulte",
      "duo mère-fille",
      "interactions adulte-enfant",
      "solos adulte",
      "solos enfant",
      "duos adultes multiculturels"
    ],
    "source": "Shoot Studio constants.tsx + Shooting Director gemini.ts"
  },

  "regles_production_pack": {
    "description": "Règles de génération d'un pack d'images pour un motif (typiquement 6-10 shots). RÈGLES OBLIGATOIRES, pas des préférences.",

    "distribution_ambiances": {
      "regle": "80/20 entre cluster premium-sobre et autres ambiances",
      "studio_brut": "40%",
      "loft_organique": "40%",
      "aube_intime": "8%",
      "echappee_sauvage": "6%",
      "lumiere_sepia": "6%",
      "calcul_pour_pack_de_10": "4 Studio Brut + 4 Loft Organique + 1 ambiance_autre + 1 ambiance_autre",
      "calcul_pour_pack_de_6": "3 Studio Brut + 2 Loft Organique + 1 ambiance_autre",
      "raison": "Les 80% Studio Brut + Loft Organique garantissent la cohérence brand premium et minimaliste. Les 20% restants apportent la variété éditoriale (chaleur, intimité, romance) sans diluer l'identité."
    },

    "duo_obligatoire_par_pack": {
      "regle": "Minimum 1 shot duo par pack complet, choisi par rotation cyclique",
      "rotation_cyclique": ["parent_enfant", "grand_parent_parent", "adultes_amis", "couple"],
      "logique_rotation": "Chaque nouveau pack avance d'un cran dans la liste. Pack 1 = parent_enfant, Pack 2 = grand_parent_parent, Pack 3 = adultes_amis, Pack 4 = couple, Pack 5 = retour parent_enfant.",
      "raison": "Le duo incarne la dimension affective du motif (offert à quelqu'un qu'on aime). La rotation garantit une représentation équilibrée des liens familiaux et amicaux dans la communication brand sur la durée."
    }
  },

  "specifications_techniques_par_defaut": {
    "aspect_ratio_default": "1:1",
    "image_size": "2K",
    "style_photographique": "35mm film photography, medium format camera, soft cinematic natural lighting",
    "post_processing": "no retouching feel, analog film grain, raw editorial",
    "modeles_gemini": ["gemini-3.1-flash-image-preview (principal)", "gemini-2.5-flash-image (fallback)"]
  },

  "strategies_optimisation_collection": {
    "volume_max_images": "500-600 photos par collection",
    "hierarchie_motifs": {
      "hero_lifestyle": "10-15 motifs maximum (le top)",
      "produit_standard": "tous les motifs (packshot + crop)",
      "detail_broderie": "tous les motifs (macro)"
    },
    "hierarchie_couleurs": {
      "hero_colors": "4-6 couleurs",
      "secondary_colors": "le reste de la palette"
    },
    "source": "Shooting Director gemini.ts règles d'optimisation"
  }
}
```

---

## 4. Référentiel 2 — ambiances_shooting.json

### Source
- `archives/aistudio_legacy/atelier_social/src/components/VibeSelector.tsx` (5 vibes codifiées)
- Section `direction_artistique_shooting.ambiances_recommandees` de Brigitte v2

### Rôle
Catalogue des 5 ambiances/moods disponibles. Axe 1 du système. Enrichies avec palette + mannequins + usage par pilier.

### Structure cible

```json
{
  "_meta": {
    "schema_version": "1.0",
    "referentiel": "ambiances_shooting",
    "description": "5 ambiances visuelles officielles Ypersoa, enrichies avec palette chromatique et profils mannequins. Source : VibeSelector.tsx d'Atelier Social.",
    "nb_ambiances": 5,
    "axe_systeme": "1 sur 3 (mood/lumière/lieu)",
    "distribution_recommandee_par_pack": "Voir direction_artistique_hero.json > regles_production_pack > distribution_ambiances"
  },

  "ambiances": [
    {
      "id": "studio_brut",
      "label_fr": "Studio Brut",
      "id_legacy_vibeselector": "minimal",
      "icone_legacy": "Sparkles",
      "rang_priorite_pack": 1,
      "pourcentage_pack_default": "40%",
      "description_courte": "Minimalisme absolu, ombres franches, haute couture",
      "prompt_en_keywords": "High-end minimalist studio, concrete or pure off-white background, sharp elegant shadows, avant-garde fashion editorial, pure and sophisticated",

      "lumiere_dominante": "studio_directionnelle_franche",
      "tons_chromatiques": ["blanc_casse", "beton", "noir_anthracite"],
      "lieu_type": "studio photo, fond uni",

      "mannequins_recommandes": [
        "femme 30-50 ans pose épurée, peau texturée visible",
        "homme 40-60 ans cheveux gris, regard hors champ",
        "femme senior cheveux blancs, taches de rousseur"
      ],

      "compatible_motifs_priorite": ["YPM-001", "YPM-011"],
      "incompatible_motifs": [],

      "usage_par_pilier": {
        "p1_process": false,
        "p2_emotion": false,
        "p3_produit": true,
        "p4_preuve": true
      }
    },
    {
      "id": "loft_organique",
      "label_fr": "Loft Organique",
      "id_legacy_vibeselector": "botanical-loft",
      "icone_legacy": "Flower",
      "rang_priorite_pack": 2,
      "pourcentage_pack_default": "40%",
      "description_courte": "Béton ciré, serre lumineuse, chic et végétal",
      "prompt_en_keywords": "Premium chic aesthetic, modern botanical greenhouse loft, polished concrete floors, abundant bright natural light, lush organic plants, Vogue living editorial",

      "lumiere_dominante": "naturelle_zenithale_serre",
      "tons_chromatiques": ["vert_sauge", "beton", "blanc_lumineux", "vert_jade"],
      "lieu_type": "loft architectural, serre, jardin d'hiver",

      "mannequins_recommandes": [
        "femme 30-50 ans urbaine sobre, eczéma assumé",
        "couple créatif, complicité réelle",
        "homme senior cheveux gris, posture confiante"
      ],

      "compatible_motifs_priorite": [],
      "incompatible_motifs": ["YPM-001"],
      "raison_incompatibilite_brigitte": "Brigitte est trop sobre, l'environnement végétal détourne du motif minimal"
    },
    {
      "id": "aube_intime",
      "label_fr": "L'Aube Intime",
      "id_legacy_vibeselector": "cozy",
      "icone_legacy": "Coffee",
      "rang_priorite_pack": 3,
      "pourcentage_pack_default": "8%",
      "description_courte": "Lumière matinale, grain de peau, douceur du coton",
      "prompt_en_keywords": "Intimate morning light, soft shadows, warm skin tones, wrinkled white linen, slow living, deep comfort, highly emotional",

      "lumiere_dominante": "douce_naturelle_matin",
      "tons_chromatiques": ["beige_chaud", "blanc_casse", "rose_pale", "lin"],
      "lieu_type": "intérieur intimiste, chambre, cuisine matinale",

      "mannequins_recommandes": [
        "femme 30-40 ans cheveux en bataille naturels",
        "couple complicité tendre matinale",
        "mère-enfant lien intimiste",
        "grand-mère cheveux blancs, sourire ridé"
      ],

      "compatible_motifs_priorite": ["YPM-001", "YPM-011"],
      "incompatible_motifs": [],

      "usage_par_pilier": {
        "p1_process": false,
        "p2_emotion": true,
        "p3_produit": true,
        "p4_preuve": true
      }
    },
    {
      "id": "echappee_sauvage",
      "label_fr": "Échappée Sauvage",
      "id_legacy_vibeselector": "nature",
      "icone_legacy": "Leaf",
      "rang_priorite_pack": 4,
      "pourcentage_pack_default": "6%",
      "description_courte": "Vent, mouvement, éléments naturels bruts",
      "prompt_en_keywords": "Wild natural setting, wind in the hair and fabric, dappled sunlight, organic textures, freedom and connection to earth, cinematic outdoor",

      "lumiere_dominante": "naturelle_exterieur_dynamique",
      "tons_chromatiques": ["vert_jardin", "ocre", "ciel_blanc", "terracotta"],
      "lieu_type": "extérieur, plage, forêt, dunes, prairie",

      "mannequins_recommandes": [
        "couple aventureux, tâches de rousseur visibles",
        "famille en weekend, énergie réelle",
        "femme solo cheveux au vent, rides au coin des yeux"
      ],

      "compatible_motifs_priorite": [],
      "incompatible_motifs": ["YPM-001"],
      "raison_incompatibilite_brigitte": "Brigitte évoque l'intime, le vent et la nature dispersent l'attention"
    },
    {
      "id": "lumiere_sepia",
      "label_fr": "Lumière Sépia",
      "id_legacy_vibeselector": "romantic",
      "icone_legacy": "Sun",
      "rang_priorite_pack": 5,
      "pourcentage_pack_default": "6%",
      "description_courte": "Heure dorée, nostalgie, poésie visuelle",
      "prompt_en_keywords": "Golden hour lighting, nostalgic 35mm film look, romantic and poetic atmosphere, warm sunset glow, soft focus, highly emotive and timeless",

      "lumiere_dominante": "doree_couchant",
      "tons_chromatiques": ["dore", "ocre", "terracotta", "brun_chaud"],
      "lieu_type": "extérieur fin de journée, terrasse, balcon, fenêtre couchant",

      "mannequins_recommandes": [
        "couple intemporel, signes de l'âge assumés",
        "femme 30-50 ans regard contemplatif, cicatrice visible",
        "mère-enfant moment précieux, vraie tendresse"
      ],

      "compatible_motifs_priorite": ["YPM-001", "YPM-011"],
      "incompatible_motifs": [],

      "usage_par_pilier": {
        "p1_process": false,
        "p2_emotion": true,
        "p3_produit": false,
        "p4_preuve": true
      }
    }
  ]
}
```

---

## 5. Référentiel 3 — types_de_shots.json

### Source
- `archives/shooting_legacy/ypersoa_shooting_complet_v5.xlsx` onglet "Récap"
- Sections du DOCX `prompt_shooting_Site.docx` (PP-H01 à AM-04)

### Rôle
Catalogue des 6 types de cadrage/composition disponibles. Axe 2 du système.

### Structure cible

```json
{
  "_meta": {
    "schema_version": "1.0",
    "referentiel": "types_de_shots",
    "description": "6 types de cadrage/composition officiels Ypersoa, indépendants des ambiances. Axe 2 sur 3.",
    "nb_types": 6,
    "axe_systeme": "2 sur 3 (cadrage/composition technique)"
  },

  "types_de_shots": [
    {
      "id": "ghost",
      "label_fr": "Ghost Packshot",
      "icone_legacy": "👻",
      "usage_principal": "image 1 hero PDP fiche produit",
      "description_courte": "Mannequin fantôme fond blanc, vue de face, broderie nette",
      "specs_techniques": "vue de face symétrique, fond blanc pur, sans modèle visible",
      "duo_compatible": false,
      "prompt_en_keywords": "Clean e-commerce product photography, ghost mannequin, pure white background, perfectly lit with soft studio lighting, no harsh shadows, true-to-color, symmetrical front view, commercial fashion packshot, Maison Labiche product page style"
    },
    {
      "id": "crop_poitrine",
      "label_fr": "Crop Poitrine",
      "icone_legacy": "✂️",
      "usage_principal": "image 2 fiche produit, focus broderie portée",
      "description_courte": "Plan poitrine serré porté, menton coupé, broderie en focal",
      "specs_techniques": "menton à peine visible, mains partiellement visibles, fond uni",
      "duo_compatible": false,
      "prompt_en_keywords": "Tight cropped fashion editorial, chin barely visible at top of frame, hands partially visible at bottom, plain off-white background, flat soft studio lighting, sharp detail on embroidery stitching"
    },
    {
      "id": "lifestyle_studio",
      "label_fr": "Lifestyle Studio",
      "icone_legacy": "🏠",
      "usage_principal": "image 3 carrousel, ambiance Maison Labiche",
      "description_courte": "Porté intérieur curé, ambiance vert sauge ou lin",
      "specs_techniques": "intérieur structuré, mur moulé, lumière de fenêtre, modèle 3/4",
      "duo_compatible": true,
      "prompt_en_keywords": "Editorial fashion photography, curated Parisian apartment, sage green paneled wall, dark wooden parquet floor, vintage props, full body or 3/4 shot, relaxed confident pose, soft ambient interior lighting, Maison Labiche lookbook style"
    },
    {
      "id": "lifestyle_outdoor",
      "label_fr": "Lifestyle Outdoor",
      "icone_legacy": "🌿",
      "usage_principal": "image 3 alt, style français brut",
      "description_courte": "Porté extérieur rue pavée golden hour",
      "specs_techniques": "extérieur ville côtière française, golden hour, marche naturelle",
      "duo_compatible": true,
      "prompt_en_keywords": "Fashion editorial photograph, woman walking quiet cobblestone street in small French coastal town, golden hour backlight, soft lens flare, muted earthy color grading, full body composition, Hoalen and October brand aesthetic, effortless French style, cinematic depth of field"
    },
    {
      "id": "macro_broderie",
      "label_fr": "Macro Broderie",
      "icone_legacy": "🔍",
      "usage_principal": "image 4 fiche produit, savoir-faire",
      "description_courte": "Gros plan broderie bokeh, texture fil visible",
      "specs_techniques": "macro lens 100mm, bokeh crémeux, mise au point ultra nette sur la broderie",
      "duo_compatible": false,
      "prompt_en_keywords": "Extreme close-up macro photography, dark forest green thread embroidery, visible thread texture and fabric weave details, soft directional side lighting creating subtle shadows on stitching, Canon 100mm macro lens f/4, ultra sharp focus on embroidery with creamy bokeh background, luxury fashion product photography, artisan craftsmanship detail shot"
    },
    {
      "id": "duo_couple",
      "label_fr": "Duo / Couple",
      "icone_legacy": "👫",
      "usage_principal": "image 5 galerie, intimité storytelling, OBLIGATOIRE par pack",
      "description_courte": "Couple/mère-enfant/grand-parent/amis - duo intergénérationnel",
      "specs_techniques": "2 modèles cadrage serré, complicité réelle, fond uni ou intérieur",
      "duo_compatible": true,
      "rotation_cyclique_obligatoire": ["parent_enfant", "grand_parent_parent", "adultes_amis", "couple"],
      "prompt_en_keywords": "Tight cropped fashion editorial, two people standing close together, plain off-white studio backdrop, both wearing matching natural raw beige hoodies, intimate framing cropped from mid-thigh to head, A.P.C. campaign aesthetic, no retouching feel, analog film grain, real human imperfections visible"
    }
  ],

  "matrice_combinaison_par_defaut_par_pilier": {
    "p1_process": ["macro_broderie"],
    "p2_emotion": ["lifestyle_studio", "lifestyle_outdoor", "duo_couple"],
    "p3_produit": ["ghost", "crop_poitrine", "lifestyle_studio", "duo_couple"],
    "p4_preuve": ["lifestyle_studio", "duo_couple", "macro_broderie"]
  },

  "regle_duo_systematique": {
    "description": "Chaque pack complet DOIT contenir au moins 1 shot duo_couple. Voir direction_artistique_hero.json > regles_production_pack > duo_obligatoire_par_pack pour la logique de rotation cyclique."
  }
}
```

---

## 6. Référentiel 4 — prompts_library.json

### Source
- `archives/shooting_legacy/prompt_shooting_Site.docx` (37 prompts paramétrables)
- Variables universelles : `[MOTIF]`, `[COULEUR FIL]`, `[COULEUR SWEAT]`, `[PRODUIT]`

### Rôle
Bibliothèque opérationnelle de prompts paramétrables. Axe 3 du système. Le Hub injecte les vraies valeurs (motif YPM-XXX, fil_xxx, support_xxx) à la place des variables.

### Structure cible

```json
{
  "_meta": {
    "schema_version": "1.0",
    "referentiel": "prompts_library",
    "description": "37 prompts paramétrables pour génération d'images IA. Variables universelles : [MOTIF], [COULEUR FIL], [COULEUR SWEAT], [PRODUIT]. Tous les prompts intègrent la règle anti-supermodel (humanité visible).",
    "nb_prompts": 37,
    "axe_systeme": "3 sur 3 (template texte EN)",
    "regle_universelle_appendee": "Tous les prompts ajoutent automatiquement le suffixe : '. Real human models with visible imperfections (wrinkles, gray hair, freckles, scars, eczema, body diversity). No retouching, no skin smoothing, no perfection plastic.'"
  },

  "variables_universelles": {
    "PRODUIT": "type de vêtement (ex: hoodie, sweat, t-shirt, zoodie)",
    "MOTIF": "id YPM-XXX + image jointe en pièce jointe",
    "COULEUR_FIL": "id fil_xxx (ex: fil_vert_jade, fil_terracotta)",
    "COULEUR_SWEAT": "id couleur_support (ex: marine, beige, blanc)"
  },

  "sections": {
    "section_1_packshots_produit": {
      "description": "Packshots produit - 16 prompts par type de vêtement",
      "prompts": [
        {
          "id": "PP-H01",
          "label": "Hoodie - Flat lay éditorial",
          "type_de_shot_associe": "lifestyle_studio",
          "ambiance_associee_par_defaut": "aube_intime",
          "prompt_en_template": "Professional flat lay photography of a [PRODUIT] in [COULEUR_SWEAT], with embroidered [MOTIF] in [COULEUR_FIL] thread on the left chest, laid on a crumpled off-white linen bedsheet. Morning golden hour light streaming from the left. Styled with a small dried eucalyptus branch and a ceramic coffee mug. Shot from directly above, Canon EOS R5, 35mm lens, f/2.8, soft diffused natural light, warm muted tones, editorial fashion photography, minimalist Scandinavian aesthetic, 4K ultra sharp"
        }
      ]
    },
    "section_2_portraits_studio_adulte": { "prompts": [] },
    "section_3_duo_couple": { "prompts": [] },
    "section_4_famille": { "prompts": [] },
    "section_5_enfant": { "prompts": [] },
    "section_6_lifestyle_ambiance": { "prompts": [] }
  }
}
```

---

## 7. Référentiel 5 — plan_shooting_systematique.json

### Source
- `archives/shooting_legacy/ypersoa_shooting_complet_v5.xlsx` onglet "Motifs — 6 shots"

### Rôle
Matrice de 408 shots à produire pour couvrir tout le catalogue (17 motifs × 5 supports × 6 types de shots, optimisé pour ne pas tout shooter sur tout).

### Structure cible

```json
{
  "_meta": {
    "schema_version": "1.0",
    "referentiel": "plan_shooting_systematique",
    "description": "408 shots indexés selon la matrice motif × produit × type de shot. Filenames standardisés. Sert de plan de production pour le Hub.",
    "nb_shots_total": 408,
    "calcul": "68 combinaisons motif × produit × 6 shots minimum",
    "convention_filename": "[Motif]-[Produit]-[Couleur]-[Genre]-[TypeShot]-[Numero].png"
  },

  "shots_par_combinaison": [
    {
      "combinaison_id": "YPM-001-YP001-Beige-Adulte",
      "motif_code": "YPM-001",
      "motif_nom": "La Brigitte",
      "famille_motif": "Cœurs",
      "produit_id": "YP001",
      "produit_nom": "Hoodie Adulte",
      "couleur_support": "beige",
      "dimension_broderie_cm": "4-6",
      "emplacement_broderie": "poignet ou buste gauche",

      "shots": [
        {
          "type": "ghost",
          "filename": "Brigitte-Hoodie-Beige-Adulte-Ghost-01.png",
          "prompt_template_id": "PP-H02",
          "ambiance_default": "studio_brut"
        },
        {
          "type": "crop_poitrine",
          "filename": "Brigitte-Hoodie-Beige-Adulte-Crop-01.jpg",
          "prompt_template_id": "PP-H04",
          "ambiance_default": "loft_organique"
        }
      ]
    }
  ]
}
```

---

## 8. Plan d'exécution J3.B et J3.C

### Session J3.B (estimée 2h30 — augmentée car directives Sarah enrichissent les fichiers)

1. **direction_artistique_hero.json** (1h)
   - Lire `Shooting Director gemini.ts` complet
   - Lire la section anti-supermodel d'Atelier Social
   - Intégrer les 3 directives Sarah J3.A
   - Générer le fichier
2. **ambiances_shooting.json** (1h)
   - Lire VibeSelector.tsx (déjà fait en J3.A)
   - Enrichir chaque ambiance avec palette + mannequins (validation Sarah par questions)
   - Intégrer la distribution 80/20
   - Générer le fichier
3. **types_de_shots.json** (30 min)
   - Lire le récap XLSX (déjà fait en J3.A)
   - Lire les sections DOCX (déjà fait en J3.A)
   - Ajouter rotation cyclique duo
   - Générer le fichier

**Commit** : `J3.B: 3 référentiels shooting (DA hero + ambiances + types_de_shots)`

### Session J3.C (estimée 2h) — 2 référentiels volumineux

1. **prompts_library.json** (1h15)
   - Extraire les 37 prompts du DOCX un par un
   - Nettoyer les variables (remplacer "vert forêt" par fil_vert_jade via _mapping_legacy)
   - Catégoriser par section + associer ambiance + type de shot
   - Ajouter le suffixe universel "anti-supermodel"
   - Générer le fichier
2. **plan_shooting_systematique.json** (45 min)
   - Parser l'XLSX onglet "Motifs — 6 shots"
   - Générer les 408 entrées avec filenames standardisés
   - Vérifier cohérence avec types_de_shots.json
   - Appliquer la distribution 80/20 ambiances aux 408 shots
   - Générer le fichier

**Commit** : `J3.C: 2 référentiels shooting volumineux (prompts_library + plan_shooting)`

---

## 9. Réconciliations à faire en J3.B

### Réconciliation 1 — Direction modèles Brigitte
Brigitte v2 dit "regard hors champ pensif". Atelier Social dit "regard caméra direct".
**Décision J3.A** : globale = caméra direct, override Brigitte = hors champ pensif.
**Action J3.B** : ajouter un override `direction_modeles_override` dans Brigitte v2 + documenter le mécanisme dans `direction_artistique_hero.json`.

### Réconciliation 2 — Mention "Tajima TMEZ" dans Brigitte v2
Brigitte v2 contient encore : *"mentionner brode sur metier Tajima uniquement si contexte technique"*.
**Décision J2** : "Tajima TMEZ" interdit, remplacer par "brodé à la commande" + "brodé sur métier Tajima" en contexte long.
**Action J3.B** : corriger cette ligne dans Brigitte v2 et propager aux 16 autres motifs en J6+.

### Réconciliation 3 — Couleurs incohérentes legacy
Le DOCX prompts utilise "vert forêt" qui n'existe pas. Le mapping legacy `_mapping_legacy.json` traduit `vert forêt → fil_vert_jade`.
**Action J3.C** : appliquer le mapping à TOUS les 37 prompts lors de l'extraction.

---

## 10. Checklist de validation J3 complet

À la fin de J3 (après J3.B + J3.C), on aura :

- [ ] 5 référentiels dans `referentiels/shooting/`
- [ ] Brigitte v2 corrigé (override DA + correction Tajima TMEZ)
- [ ] Tous les prompts nettoyés via `_mapping_legacy.json`
- [ ] Suffixe "anti-supermodel" appliqué à tous les prompts
- [ ] Distribution 80/20 ambiances appliquée au plan systématique
- [ ] Rotation cyclique duo documentée
- [ ] 4 commits Git J3.0, J3.A, J3.B, J3.C
- [ ] Cohérence vérifiée entre les 3 axes (ambiances × types × prompts)
- [ ] Plan de 408 shots utilisable directement par le Hub

---

## 11. Directives stratégiques Sarah J3.A — récapitulatif

### Directive 1 — Humanité visible OBLIGATOIRE
> "L'anti-supermodel c'est une règle. On veut des modèles humains (avec des défauts, des rides, des cheveux gris, des taches de rousseur, du surpoids, de l'eczéma...)"

**Application** :
- Renforcement de la section `direction_modeles_globale` avec liste de défauts physiques OBLIGATOIRES
- Suffixe systématique ajouté à tous les prompts en J3.C
- Statut REGLE_ABSOLUE (pas guideline)

### Directive 2 — Distribution 80/20 ambiances (40/40)
> "Pour les styles de shots, j'aimerais garder une proportionnelle : minimaliste/botanical loft à 80% (40/40)"

**Application** :
- 40% Studio Brut + 40% Loft Organique = 80%
- 8% Aube Intime + 6% Échappée Sauvage + 6% Lumière Sépia = 20%
- Calculs précis donnés pour packs de 6 et de 10

### Directive 3 — Duo systématique avec rotation cyclique
> "Un duo (parent-enfant, grand-parent parent, adultes, couple...) dans chaque génération de pack complet"

**Application** :
- Minimum 1 shot duo_couple par pack
- Rotation cyclique sur 4 types
- Mécanisme documenté dans `direction_artistique_hero.json`

---

*Document figé en J3.A v2 le 2026-04-19 — sert de brief technique pour les sessions J3.B et J3.C.*
