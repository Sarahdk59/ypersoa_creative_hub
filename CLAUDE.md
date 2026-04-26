# CLAUDE.md — Hub Ypersoa

> **Fichier maître du projet.** À lire en premier au démarrage de toute nouvelle conversation Claude.
> Synthèse des décisions, règles, méthodes et acquis du Hub.
> Les passations dynamiques (état session par session) vivent dans `_passations/`.
>
> Dernière mise à jour : 2026-04-26 (post-session GitHub config + bibliothèque canonique 23/23).

---

## 0. IDENTITÉ DU PROJET

**Hub Ypersoa** = système orchestré multi-modules pour transformer un nouveau motif (PNG + brief) en livrables complets sur tous les canaux : Shopify, Instagram (carrousel + reels + posts), hooks éditoriaux, sondages stories, tags RS multi-plateforme.

**Cible volumétrique** : 150 motifs/an × ~20 variantes moyennes par motif × 8 modules de livrables = un atelier IA personnel, pas une agence externalisée.

**Maître du projet** : Sarah Kedziora, co-fondatrice et directrice créative Ypersoa, atelier broderie Tajima à Wattrelos (Nord, France), sous PhenixLog/Phenix Group.

**Repo** : `~/Documents/ypersoa_creative_hub/` (local Mac) + `https://github.com/Sarahdk59/ypersoa_creative_hub` (privé). Branche : `main`. Identité Git : Sarah Kedziora + Gmail perso.

---

## 1. DÉCISIONS ARCHITECTURALES (verrouillées)

### Architecture en 3 couches
```
COUCHE 1 — DATA (existe)         motifs/, referentiels/, variantes/
COUCHE 2 — ENGINES (Phase 2+)    shooting, carrousel, reel, posts,
                                 copywriter_shopify, hooks, tags_rs, sondages
COUCHE 3 — ORCHESTRATEUR (Phase 6) hub.ts : input PNG → variantes → engines
```
- **Raison** : ajout incrémental de modules sans refonte. 1 module qui marche > 8 modules qui plantent.
- **Écarté** : architecture monolithique, script standalone.

### Mono-repo (décision 26/04)
**Tout dans `ypersoa_creative_hub/`**, structure prévue :
```
ypersoa_creative_hub/
├── motifs/                      ← templates YPM-xxx (DATA)
├── referentiels/                ← palettes, casting, ambiances, schémas (DATA)
├── assets/canoniques/           ← 23 portraits mannequins (DATA)
├── variantes/                   ← goldens par template (DATA)
├── _passations/                 ← docs de session
├── apps/                        ← 🆕 toutes les apps consommatrices
│   ├── studio/                  ← Phase 2 — génération shooting
│   ├── shopify-writer/          ← Phase 3 — copywriter PDP
│   ├── carousel-builder/        ← Phase 3 — carrousels IG
│   ├── reel-scripter/           ← Phase 3 — reels
│   └── posts-engine/            ← Phase 3 — posts/hooks/tags
├── packages/                    ← 🆕 code partagé entre apps
│   ├── shared-types/            ← types TS communs
│   ├── data-loader/             ← lit les JSON de referentiels/
│   ├── brand-rules/             ← règles tone, interdits
│   └── ai-clients/              ← wrappers API Gemini/Claude/OpenAI
├── CLAUDE.md                    ← CE FICHIER
├── .gitignore
└── package.json (workspace root)
```
- **Raison** : tous les modules consomment les mêmes référentiels. Mono-repo = atomicité (un changement de référentiel propage immédiatement à tous les outils). Sarah travaille seule, pas d'équipe distribuée à synchroniser.
- **Écarté** : multi-repo (référentiels séparés des apps) — créerait un enfer de synchronisation des versions.

### Stack Phase 2 (Ypersoa Studio v2)
- **Frontend** : Next.js + TypeScript + Tailwind
- **Backend** : Node (workers Next.js) + API Gemini 3 Pro Image (génération) + API Anthropic (orchestration prompts)
- **Workspace manager** : pnpm workspaces (rapide, propre, simple)
- **IDE** : VSCode (commande `code` configurée dans le PATH)
- **Raison** : Sarah a explicitement dit "à un moment, on passe par VSCode, je donne mes codes API et on produit". Stack moderne, cohérente avec écosystème Shopify.
- **Écarté** : Vite/React standalone (pas de SSR, moins productif), Python (incohérent avec workflow JS de Sarah).

### Pivot architectural majeur — prompts littéraires > JSON ultra-structuré
**Décidé le 24/04, validé empiriquement.**

L'approche JSON 8-modules détaillé pour briefer Nano Banana 2 produit des résultats **un cran sous le niveau cible** (Sézane / Maison Labiche). Les prompts littéraires courts avec refs marques produisent des résultats **niveau cible atteint**.

- **Décision** : Le JSON reste source de vérité DATA, mais l'engine de génération fait un travail de **traduction copywriter** entre JSON structuré et prompt EN narratif. Pas de dump direct du JSON dans le prompt.
- **Écarté** : sur-spécification (hex codes systématiques, IDs produit dans le prompt, négations multiples préventives, casting cyclique forcé par règle).

### Mannequin de référence persistant (canonique uploadée)
**Solution au problème "modèle différent à chaque génération".**
- **Décision** : Bibliothèque de 23 portraits canoniques figés dans `assets/canoniques/`. Upload de la canonique EN PREMIER dans Nano Banana 2 → active le character reference mode → fidélité faciale **90-95%** validée empiriquement (Camille / Mathieu / Aïcha).
- **Écarté** : Description textuelle ultra-détaillée seule (~70-80% de cohérence, insuffisant). Génération random à chaque fois (perte d'attachement à l'image de marque, bug critique d'Ypersoa Studio v1).

### Mode hybride déterministe + IA (sur les engines)
- **Décision** : Engines = structure déterministe (sélection mannequin, ambiance, format, distribution pack) + appel API Claude/Gemini pour le créatif (prompt EN, caption, hook).
- **Raison** : Prévisibilité + maîtrise coûts + qualité créative.
- **Écarté** : 100% statique (perd en qualité créative), 100% IA (imprévisible et coûteux).

### Variante = surcouche d'un template (Option B)
- **Décision** : Un template `YPM-xxx` reste seul dans `motifs/`. Les variantes sont des entrées dans `referentiels/variantes/[template]/var_*.json` qui pointent vers leur parent et surchargent 3-4 champs.
- **Raison** : Scalabilité (150 motifs/an × 20 variantes en moyenne = ingérable si chaque variante = nouveau YPM).
- **Écarté** : Option A "chaque variante = nouveau code YPM" (explosion volumétrique).

### Distinction canon Shopify vs éditorial hub
- **Décision** : 5 variantes canoniques par template = pré-codées dans le configurateur PDP Shopify (ex: MAMA, SISTA, TEAM, AMOUR, FAMILLE pour Le Club). Variantes éditoriales hub = vivent en RS + landing pages, **PAS de PDP Shopify dédiée**, redirigent vers PDP unique avec configurateur libre.
- **Écarté** : Une PDP par variante éditoriale (explosion catalogue Shopify).

### Hub ne génère PAS le PNG broderie (Choix C)
- **Décision** : Adriana (production atelier) numérise les motifs via PulseID/Hatch. Le hub produit le **brief de production** pour elle.
- **Écarté** : SVG paramétrable côté client, prompt Gemini pour générer le PNG broderie.

### Format image standardisé
- **4:5 par défaut** (PDP Shopify, ~80% des shots)
- **1:1** pour flat lay et carrousels IG carrés (1-2 shots ponctuels)
- **16:9** pour hero banners landing (1 shot ponctuel)
- **9:16** pour stories / reels uniquement
- **Écarté** : 4:3, 3:4, ratios libres (interdits PDP Shopify).

### Buffer 15 jours production + expédition
Toute campagne saisonnière démarre **J-30 minimum**. Composition : 7-10j production atelier Adriana + 2-5j expédition transporteur. Deadline commande client affichée à J-15 sur PDP.

### Schéma variante = 8 modules d'agence
Une variante doit produire 8 livrables structurés :
1. Fiche Shopify (titre SEO + meta + description + bullets + tags + handle)
2. Shooting pack (6-8 shots prêts pour Gemini avec prompts EN + metadata)
3. Carrousel IG 10 slides
4. Reel 20s (script + storyboard)
5. Posts récurrents
6. Hooks éditoriaux
7. Sondages stories
8. Tags RS par plateforme

### Repo Git
- **GitHub privé** `Sarahdk59/ypersoa_creative_hub`, branche `main`, identité Sarah Kedziora + Gmail perso
- **PAT fine-grained** scope minimal (Contents R/W + Metadata R), expiration 90j à renouveler
- **`.gitignore`** : `.DS_Store`, `.env`, `node_modules/`, `__pycache__/`, `*.zip`
- **Historique propre** : nettoyé via `git filter-repo` le 26/04 (ancienne clé OpenAI retirée d'un fichier `archives/ypersoa_content_os_v3.html` obsolète)

---

## 2. RÈGLES BRAND ET ÉDITORIALES (absolues)

### Lexique technique vs client (immuable)
- **Contexte client / PDP** : "brodé à la commande"
- **Contexte savoir-faire / atelier / blog** : "brodé sur métier Tajima"
- **INTERDIT ABSOLU** : "brodé à la main", "fait main", "artisanal", "Tajima TMEZ" (jargon technique banni)
- **INTERDIT ABSOLU** : référence Etsy, "marketplace", autres canaux passés

### Tutoiement systématique
Tous les textes clients (Shopify, RS, emails). Jamais "vous", "votre", "offrez", "découvrez" (formules creuses).

### Direction Artistique D1 — "Beauté Incarnée à la Française" v2.0
**Position figée** : juste milieu entre anti-supermodel pur et Sézane esthétique classique. Belle ET vraie, pas miroir déprimant.

Application photo systématique :
- Lived-in skin texture preserved
- No retouching, no skin smoothing, no beauty filter
- Analog film grain
- Sous-tons rosés visibles sur peaux claires (anti-effet "Nosferatu / vampire")
- Rides naturelles, expression lines acceptées et valorisées
- Anti-supermodel ET anti-réalité crue
- **Test de validation** : "Cette personne pourrait être l'égérie d'Emoi Emoi ?"

### Particularités physiques — règle critique
> "Présentes dans le casting, distribuées avec grâce. JAMAIS au centre du cadrage, JAMAIS sujet principal."

**Test de validation** : si on décrit un shot par "inclusif" ou "militant" → shot raté. Premier mot attendu : "chaleureux", "vivant", "famille", "vraie vie".

Distribution actuelle :
- Vitiligo discret → MAN-S17 Césaria (lumière qui unifie, jamais accentué)
- Canne → MAN-S18 Hassan (cadrages "assis élégant" ou buste majoritaires)
- Fauteuil → MAN-S20 Coline (cadrages buste majoritaires, scènes quotidiennes non-thématisées)

### Couples LGBTQ+
> "Le couple est un fait, pas un statement."

DUO_LEA_SARAH : pas de démonstrations sexualisées, pas de baisers sur la bouche en packshot. Préférer complicité pudique, mains entrelacées, rires partagés. Baiser tempe/front autorisé ponctuellement.

### Cible cliente positionnement
- **Emoi Emoi × Make My Lemonade × Gamin Gamine**
- Pas Sézane pure (trop fantasme parisien sans diversité)
- Pas Aerie #AerieREAL militant
- Type : femme française CSP+ urbaine 30-50 ans, sensible et cultivée, exigeante sur la qualité sans snobisme. Offre des cadeaux qui durent.

### 4 piliers éditoriaux
- **P1 Process / Savoir-Faire** — atelier, broderie Tajima, métier
- **P2 Émotion** — lien, cadeau chargé de sens, transmission, présence
- **P3 Produit / Usage** — catalogue, configurateur, occasions de port
- **P4 Preuve** — témoignages, communauté, longévité

Sous-piliers P2 : Lien (couple, famille, amis), Souvenir (naissance, diplôme, étape), Présence (distance, expatrié, deuil).

### Pas d'urgentisme dans le ton
Pas de "vite", "dépêchez-vous", "dernières heures". Préférer sobriété et invitation calme.

### Diversité incarnée vs décorative (citation Sarah)
> "Je ne veux pas une diversité décorative, je veux une diversité incarnée et précise."

Chaque blanc·he doit avoir un type identifiable (méditerranéenne, rousse irlandaise, française brune, nordique blonde, etc.) — pas de "blanc·he générique".

### Charte template Le Club
- Nommer **"badge"** ou **"blason"** — JAMAIS "logo" (corporate) ni "écusson" (mauvais registre)
- Mentionner "solidaires" pour décrire l'unité cercle + symbole + textes (1 seule couleur fil)
- Ton autorisé : complice, inclusif, joueur, fédérateur, sobre
- Ton interdit : corporate, hallmark, publicitaire, exclusif_snob

### Charte motif Brigitte (registre minimaliste contemplatif)
- Mots-clés positifs : minimaliste, essentiel, intime, signé, sobre, élégant, discret, intemporel, silencieux, reconnaissance, lien, pudeur, évidence, épure
- **Override modèles** : regard hors champ pensif, JAMAIS regard direct caméra. Expression contemplative, pudique, émotion retenue. Sourire infime ou pas de sourire.
- **Test de validation Brigitte** : "Cette personne pense à quelqu'un ou à quelque chose ?" Si elle 'performe' pour la caméra → NON.
- Ambiances privilégiées : Aube Intime > Loft Organique > Lumière Sépia
- Ambiances à éviter : Studio Brut (trop clinique), Échappée Sauvage (trop dynamique)

### Charte Sista Club
- Tagline : *"Pour celles qui ne sont pas sœurs de sang. Mais sœurs de cœur."*
- Éviter le registre 'girlboss' / 'féministe statement'
- Privilégier rose pâle, framboise, lilas (sophistiqués) — éviter rose pétard caricatural

### Charte Team Dog
- Anti-kitsch animalier explicite : pas d'empreintes colorées criardes, pas de "I love my dog", pas de chiens déguisés, pas de bandana à pois
- Registre A.P.C. × Sézane "partenaire de vie sobre"
- Chien présent mais jamais sujet — la relation calme est le sujet
- Chiens autorisés : golden retriever, labrador, border collie (famille-friendly, non menaçants)
- INTERDIT : rottweiler, bulldog français mise en scène hipster, statement breeds

### Volume max collection
500-600 photos par collection. 10-15 motifs hero lifestyle max sur les 17. 4-6 couleurs hero.

### Charte graphique brand
- Couleurs : Cream `#F5F0EA` / Ink `#1E2D4A` / Terracotta `#C4694A`
- Typographie : Josefin Sans (titres) + DM Sans (corps) + Cormorant Garamond italic (accent)

### Placement motif (REGLE_ABSOLUE)
- **TOUJOURS** côté buste gauche (côté cœur)
- **JAMAIS** au centre de la poitrine
- Exceptions autorisées : poignet gauche (option add-on), dos centre haut sur certains motifs (à documenter)

---

## 3. MÉTHODE DE TRAVAIL ACQUISE

### Hiérarchie d'approche prompting (validée empiriquement)
1. Approche **littéraire courte avec refs culturelles** > approche technique exhaustive
2. **Description narrative** > liste de specs
3. **Refs marques** (Sézane, A.P.C.) > hex codes
4. **1 paragraphe dense bien construit** > prompt 200 lignes ventilé en sections

### Pattern prompt shooting validé (réutilisable 150 motifs)
```
[TYPE: editorial/ghost/macro] using the uploaded reference portrait
as the character's face identity (same [genre], same face, exact same
features preserved).

[NOM], a [âge] [description courte 2-3 lignes max de la fiche mannequin].
[Action/contexte/pose naturelle dans le décor]
[Décor SPÉCIFIQUE — architectural et nommé, pas générique]

[CRITICAL EMBROIDERY DETAIL — uniquement si badge complexe et format wide] :
On the LEFT CHEST of [vêtement], an embroidered [description badge précise],
approximately 10-12cm. The badge must be rendered as the sharpest detail
in the frame.

Outfit : [pièces SPÉCIFIQUES, pas génériques — type "wide-leg cream linen
trousers" pas "pantalon"]
[Spec badge complète : cercle + texte + symbole + couleur fil + typo +
solidarity principle]

[Lighting] [Lens 35mm/85mm] [Aesthetic refs marques]
No retouching, lived-in skin preserved. --ar [4:5 PDP / 1:1 flat / 16:9 hero]
```

### Règles d'or de prompting shooting (apprises par l'erreur)
1. **Upload canonique EN PREMIER** dans Nano Banana 2 → active character reference mode
2. **Formule magique** : `"using the uploaded reference portrait as the character's face identity (same [woman/man/girl/boy], same face, exact same features preserved)"`
3. **Pas (ou peu) de hex codes** dans le prompt → Nano Banana crispe sur la précision colorimétrique et perd le mood. Préférer noms descriptifs (`soft cream-beige`, `deep olive earth-green`).
4. **Pas de codes produit** (`YP001`, `YP005`) dans le prompt → bruit. Décrire le vêtement par nature (`oversized crewneck sweatshirt`).
5. **Refs marques OUI** → Sézane, A.P.C., Maison Labiche, Emoi Emoi, Sessùn, The Row, Hoalen → ancrage stylistique précis. **3 refs marques max par prompt** (au-delà, dilution).
6. **Format 16:9 full body + badge complexe** → placer bloc `CRITICAL EMBROIDERY DETAIL` AVANT la description du sujet humain + badge à 10-12cm + ajouter "must be rendered as the sharpest detail in the frame".
7. **Négations explicites pour les décors parasites** : `NOT outdoor, NOT a cafe, NOT [ce qu'on ne veut pas]` — 1-3 max ciblées contre des défauts qu'on a effectivement vu sortir.
8. **Ambiance culturelle spécifiée** > description technique : `"effortless French-Caribbean elegance"` > `"soft lighting from left at f/2.8"`

### Suffixe universel D1 Beauté Incarnée (à appender à TOUS les prompts shooting)
```
Real humans with natural features, lived-in skin conserved, no retouching,
no skin smoothing, no beauty filter. Analog film grain, raw editorial feel.
```

### Anti-vampire (peaux très claires)
Ajouter explicitement : `healthy pink undertones`, `warm flush on cheeks and nose bridge`, `NOT pale, NOT sickly, NOT washed out`, `warm human presence, NOT cold, NOT clinical, NOT ethereal`.

### Méthode validation canonique (workflow)
- Sarah = DA, tranche le goût et le style
- Claude = technique du prompt
- Quand Sarah dit "je trouve ça plat / quelconque / moyen" → ne pas défendre, **diagnostiquer et proposer un fix immédiatement** (cheveux ? expression ? contexte ?)
- Quand Sarah valide → on enchaîne, on ne sur-vérifie pas

### Génération en série : 3-4 versions / shot
Pour les shots difficiles (broderie complexe, bébé, mannequin à signature forte), prévoir 3-4 générations Nano Banana 2 et garder la meilleure. La 3ème version est souvent la bonne sur les briefs marqués (cf. Brune v3 type Damas).

### Ordre de test recommandé pour un nouveau motif
1. **S02 macro broderie** (test diagnostic broderie isolée)
2. **S01 ghost packshot** (broderie en contexte produit)
3. **S03/S04** (humain + canonique, intérieur ou crop)
4. **S05** (full body 16:9, le plus dur — dernier)
5. **S06 flat lay** (optionnel, pas critique)

Si S02 plante → itérer prompt broderie avant d'aller plus loin. Pas la peine de tenter S05 si la broderie n'est pas validée.

### Workflow général
- **Tout part dans VSCode** : tous les fichiers vivent dans le repo Git, commits fréquents, un commit ≈ une étape verrouillée
- **Découpage en lots** : pour les fichiers >15 KB, découper en 6 lots. Lot 1 = validation format (5 fiches), lots 2-5 = production, lot 6 = assemblage final + commit
- **Validation avant production de masse** : toujours présenter 5 exemples avant les 15 suivants
- **Réflexe "search before assume"** : consulter le référentiel officiel avant d'inventer (palette_supports_par_produit.json, _mapping_legacy.json, ypersoa.fr)
- **Question stratégique non-tranchée = NE PAS commiter** : suspendre les commits jusqu'à arbitrage Sarah
- **Pattern commit message** : `[Phase]: [livrable] ([détails techniques])` — exemple : `J3.B: ambiances_shooting.json (5 ambiances enrichies palette+mannequins+matrice piliers)`

### Timer dur en début de session
**Pattern récurrent** : Sarah dit "1h30 max" puis déborde à 3-6h. Conséquences : nuit courte, fatigue cumulée, qualité décisionnelle dégradée en fin de session.
- Annoncer un timer dur au début
- Commit à mi-chemin si nécessaire
- "70% fait et committed > 100% fait à 4h du matin"
- Refuser fermement quand le timer est dépassé, même si Sarah pousse

### Format brief variante minimaliste
YAML-ish : `template, nom_commercial, zones, type, axes_shopify_principal, cible_brief, fils_recommandes_hero` — assez d'info pour générer, pas trop pour ralentir.

### Single source of truth
Pour chaque mannequin : **canonique JPG** (`assets/canoniques/MAN-XX_Prenom_canonique.jpg`) + **fiche textuelle** (`referentiels/shooting/mannequins_*.json`) — si l'un évolue, l'autre doit suivre.

---

## 4. CASTING ET RÉFÉRENTIELS FIGÉS

### Bibliothèque canonique — 23/23 validées (HEAD, commit 26/04 post-filter-repo)

**Stockage** : `assets/canoniques/MAN-XX_Prenom_canonique.jpg`

#### Principaux MAN-P01 à MAN-P12 (13 entrées car P11 = couple)

| ID | Prénom | Âge | Profil |
|---|---|---|---|
| MAN-P01 | Camille | 40 | Blanche française, châtain miel ondulé, freckles, mère vintage Caroline de Maigret |
| MAN-P02 | Anna | 35 | Blanche sud, brune wavy, peau olive, provençale Sessùn (v1.1 corrigée) |
| MAN-P03 | Aïcha | 40 | Afro-caribéenne, afro court, sourire large, élégance parisienne-caribéenne |
| MAN-P04 | Lila | 45 | Maghrébine, cheveux noirs libres, parisienne sophistiquée Leïla Bekhti |
| MAN-P05 | Béatrice | 55 | Métisse, cheveux argentés, bourgeoise campagne normande |
| MAN-P06 | Mathieu | 40 | Blanc, barbe 3j, bruns dépeignés, papa sportwear chic |
| MAN-P07 | Nicolas | 45 | Blanc, poivre-sel, mari attentionné classique Octobre |
| MAN-P08 | Félicie | 7 | Blanche, blond vénitien, freckles denses, mini-vintage Bonpoint |
| MAN-P09 | Gabin | 5 | Blanc, cheveux noirs longs, mini-sportwear chic |
| MAN-P10 | Marie-Hélène | 65 | Blanche, rousse cuivrée + mèches argentées, Inès de la Fressange campagne |
| MAN-P11-LEA | Léa | 37 | Métisse boucles brunes, denim Canadian tuxedo (couple) |
| MAN-P11-SARAH | Sarah | 35 | Nordique pixel cut cendré, minimalisme nordique (couple) |
| MAN-P12 | Brune | 22 | Blanche, brune wavy, lèvres pulpeuses, beauty mark, ADN Damas (v3 validée) |

#### Secondaires MAN-S13 à MAN-S21 (10 entrées car S19 = couple)

| ID | Prénom | Âge | Profil |
|---|---|---|---|
| MAN-S13 | Priya | 16 | Sud-asiatique, cheveux lisses, ado sportwear |
| MAN-S14 | Gaspard | 23 | Blanc, cheveux bataille, skateur élégant archi |
| MAN-S15 | Bébé Noé | 1 | Blanc, body brodé Ypersoa |
| MAN-S16 | Hiroshi | 55 | Japonais, argenté, architecte minimaliste Yohji |
| MAN-S17 | Césaria | 40 | Afro-caribéenne, vitiligo discret, expression chaleureuse (v2 validée 26/04) |
| MAN-S18 | Hassan | 68 | Maghrébin, cheveux blancs, patriarche algérois Paris |
| MAN-S19-HENRI | Henri | 72 (visuel 80-85) | Blanc nordique, bourgeoisie rive gauche |
| MAN-S19-JOSEPHINE | Joséphine | 70 | Afro-caribéenne, boucles argentées, bourgeoisie rive gauche |
| MAN-S20 | Coline | 35 | Blanche, blonde cendrée bouclée, minimaliste urbaine Emoi Emoi |
| MAN-S21 | Hugo | 30 | Blanc, sandy-brown, jeune papa urbain |

### Le protocole canonique (figé)
Chaque canonique respecte :
- Fond blanc cassé uniforme `#F5F0EA`, **aucun décor**
- T-shirt gris chiné uni, cadrage buste, mains non visibles
- Lumière douce diffuse frontale, ombre subtile à droite
- Cheveux **LIBRES obligatoirement** (pas de chignon, pas de coiffure narrative — la coiffure appartient aux shots en contexte)
- Expression **chaleureuse-bienveillante** (jamais sévère, jamais neutre froide, jamais "photo d'identité")
- Lived-in skin, no retouching, film grain
- Ratio 4:5

### 4 duos établis

| Duo | Composition | Catégorie usage |
|---|---|---|
| DUO_BEATRICE_FELICIE | grand-mère métisse + petite-fille blanche | Principal forte rotation (4-6 shots/collection) |
| DUO_MATHIEU_GABIN | père blanc + fils blanc | Principal forte rotation (4-6 shots/collection) |
| DUO_LEA_SARAH | couple lesbien marié, métisse + nordique | Iconique rare (1-2 shots/collection max — préserver force symbolique) |
| DUO_HENRI_JOSEPHINE | couple senior mixte blanc + afro, 40 ans mariés | Seniors rare transmission (1-3 shots hero famille) |

### Quotas long terme (6 mois)
- Principaux MAN-P01 à P12 : minimum **30 shots** chacun
- Secondaires MAN-S13 à S21 : maximum **10 shots** chacun
- DUO_LEA_SARAH : maximum **12 shots** (préserver force symbolique)
- DUO_HENRI_JOSEPHINE : maximum **15 shots** (réserver hero famille)

### Rotation cyclique duos par pack (obligatoire)
`parent_enfant → grand_parent_parent → adultes_amis → couple → retour parent_enfant`

### Les 5 ambiances shooting officielles (axe 1/4 du système)

| ID | Label | % default pack | Mood |
|---|---|---|---|
| `studio_brut` | Studio Brut | 40% | Minimalisme absolu, ombres franches, haute couture, fond uni |
| `loft_organique` | Loft Organique | 40% | Béton ciré, serre lumineuse, chic et végétal, Vogue Living |
| `aube_intime` | L'Aube Intime | 8% | Lumière matinale, grain de peau, douceur du coton, slow living |
| `echappee_sauvage` | Échappée Sauvage | 6% | Vent, mouvement, éléments naturels, cinematic outdoor |
| `lumiere_sepia` | Lumière Sépia | 6% | Heure dorée, nostalgie 35mm, poésie visuelle |

### Distribution par pack standard
- **Pack 6 shots** : 3 Studio Brut + 2 Loft Organique + 1 ambiance autre
- **Pack 10 shots** : 4 Studio Brut + 4 Loft Organique + 1 Aube Intime + 1 ambiance autre

### Les 7 types de shots (axe 2/4)
1. Ghost packshot
2. Crop poitrine
3. Lifestyle studio
4. Lifestyle outdoor
5. Duo couple
6. Macro broderie
7. **Famille_vivante** (ajouté en J3.B, 3+ personnes scène vivante — réservé aux motifs YPM-010 La Ronde, YPM-003 Le Club, YPM-004 Notre Héritage)

### 3 styles de pack validés (Ypersoa Studio v2)
1. **Minimaliste A.P.C.**
2. **Premium Parisien Sézane × Labiche**
3. **Loft Brut & Serre Botanique**

### Particularités physiques distribuées (3 sur 23)
- **Vitiligo** → MAN-S17 Césaria (lumière qui unifie, jamais accentué)
- **Canne** → MAN-S18 Hassan (cadrages "assis élégant" ou buste majoritaires)
- **Fauteuil** → MAN-S20 Coline (cadrages buste majoritaires, scènes quotidiennes non-thématisées)

### Catalogue produit (5 supports figés)
- **YP001** Hoodie Adulte (Awdis JH001) — 12 couleurs, le plus large
- **YP004** Hoodie Enfant (Awdis JH01J) — 9 couleurs, **sans cordons** (norme EN 14682)
- **YP005** Sweat Adulte col rond (Awdis JH030) — 9 couleurs : beige, blanc, vert_sauge, noir, rose_pale, pierre_naturelle, marine, bleu_clair, vert_terre
- **YP019** T-Shirt Épais (B&C BC09T) — 10 couleurs uniques : offwhite, mastic, rose_orchidee, bleu_pastel, canard, gris_fonce, kaki + standards
- **YP021** Zoodie (Awdis JH050) — 7 couleurs, le plus restreint

**Couleurs palette indispo aucun produit** (à nettoyer dans une session future) : `gris`, `vert_olive`

**Couleurs uniques par produit** (différenciation) :
- YP001 seul : citron, bleu_petrole
- YP019 seul : offwhite, mastic, rose_orchidee, bleu_pastel, canard, gris_fonce, kaki
- YP021 seul : bleu_ciel
- YP001 + YP005 uniquement : vert_terre
- YP001 + YP004 uniquement : lilas

### 14 axes Shopify
- **Menu LES BRODERIES (6)** : Cœurs, Script, Aa Typo, @ Famille, Nouveautés, Les Best
- **Menu UN CADEAU POUR (8)** : Fête des Mères, Pour Maman, Pour Papa, Anniversaire, EVJF & Mariage, Grands-parents, Naissance, Merci Nounou Maitresse

### 17 motifs YPM (catalogue figé Phase 1)
YPM-001 (La Brigitte) à YPM-017 (La Florale) — Le Club est YPM-003.

### Variantes Le Club golden validées
- `var_mama_club.json` (canon, hero famille 8 shots)
- `var_team_dog.json` (édito Patte, 6 shots — testé en session 24/04)
- `var_sista_club.json` (canon, sororité, 6 shots)

---

## 5. CIBLE CLIENTE ET RÉFÉRENCES VISUELLES

### Marques de référence stylistique (à utiliser dans les prompts EN, jamais dans le copywriting FR client)

**Premium parisien** : Sézane, A.P.C., Maison Labiche, Soeur, Octobre, Rouje
**Provençal méditerranéen** : Sessùn, Soeur (sub-line)
**Minimaliste éditorial** : The Row, Khaite, Totême, Arket, The Frankie Shop, Phoebe Philo Céline
**Streetwear premium** : Maison Kitsuné, AMI Paris, Polo Ralph Lauren (registre crest)
**Casual young** : AGOLDE, Citizens of Humanity, Make My Lemonade
**Outdoor élégant** : Hoalen, October
**Architecte minimaliste** : Yohji Yamamoto, CDG, Lemaire
**Mode enfant** : Bonpoint × Petit Bateau, Amaia Kids, Gamin Gamine
**Brands inspiration** : Saint James, Stan Smith (papa sportwear chic)
**Hero brand references Ypersoa** : Émoï-Émoï × Make My Lemonade × Gamin Gamine

### Personnalités de référence casting (D1 Beauté Incarnée)

**Femmes adultes** : Jeanne Damas (lèvres pulpeuses, wavy hair, beauty marks — réf Brune), Caroline de Maigret (vintage français brut — réf Camille), Lou Doillon (décontractée période jeune), Clémentine Desseaux (élégance afro-caribéenne), Tina Kunakey, Adèle Farine (sobriété intemporelle), Mélodie Vaxelaire (denim couple — réf Coline), Louise Follain (couple aesthetic), Inès de la Fressange (intemporelle — réf Marie-Hélène + Césaria), Leïla Bekhti (élégance maghrébine — réf Lila), Carla Bruni, Vanessa Seward (bourgeoise campagne — réf Béatrice), Tina Knowles, Diahann Carroll (réf Joséphine senior), Phoebe Philo (Céline jeune vibe), Thylane Blondeau civile (Gen Z créative — réf Brune)

**Femmes pop référence ado/jeune** : Prune Pauchet, Lena Simonne, Mariacarla Boscono (modèles Sézane)

### Imagerie de référence ambiance
- Vogue Living editorial — Loft Organique
- Vogue Arabia body-positivism — Césaria
- Films Claude Sautet — ambiance enfant Lila
- Photos de classe années 70 — registre Lila
- A.P.C. campaign aesthetic + Maison Labiche lookbook style — packshots et lifestyle studio

### Cibles clientes par variante
- **Mama Club** : 30-55 ans (acheteuse mère), 25-45 (offreur enfant adulte/conjoint). Anti-bibi-kitsch. Premium accessible.
- **Sista Club** : 22-40 ans, 98% féminin. 3 sous-cibles : EVJF, best friends, sœurs réelles. Sororité moderne sans pathos. Anti-girlboss caricaturale. Esthétique IG soft-girl / clean-girl.
- **Team Dog** : 25-45 ans, mixte (55% féminin). Urbain CSP+. "Parent de chien" sobre. Anti-empreintes colorées criardes.

---

## 6. PIÈGES ET ANTI-PATTERNS (apprentissages négatifs)

### Sur le prompting Nano Banana 2

**Hex codes dans les prompts** → Nano Banana crispe sur la précision colorimétrique et perd le mood, le décor devient générique studio. **Leçon** : pas de hex, ou hex + description naturelle. Hex code OK pour le fond canonique, jamais pour le shooting.

**Codes produit YP001 / YP005 dans les prompts** → bruit, Nano Banana ne comprend pas. **Leçon** : garder dans le JSON metadata, jamais dans le prompt EN. Décrire par nature.

**Sur-spécification "NOT X" préventive** → multiplier les négations défensives → Nano Banana défocalise du sujet et l'ambiance devient ratée. **Leçon** : 1-3 négations max, ciblées contre des défauts qu'on a effectivement vu sortir, pas préventives.

**Refs marques niche que Nano Banana ne connaît pas** (ex: Hoalen + October + Maison Labiche + Soeur + Colorful Standard + Emoi Emoi + Make My Lemonade + Sessùn dans un seul prompt) → tokens bruités, dilution du style. **Leçon** : 3 refs marques max par prompt. Sézane + APC + Maison Labiche comme pivot, +1 niche selon contexte.

**"camel leash"** → ambiguïté avec l'animal chameau, Nano Banana sort parfois un chameau. **Leçon** : écrire `caramel-tan leather leash` ou `tan leather leash`.

**Décors trop génériques** (ex: `apartment`, `park`) → écart qualitatif visible vs Mama Club shots avec décors nommés. **Leçon** : décor architectural et nommé : `Parisian apartment with sage green paneled wall`, `Tuileries park lined with tall trees`.

**`head on her lap` pour gros chien** → un golden retriever pèse 30kg, "tête sur les genoux" est physiquement compliqué à générer crédible. **Leçon** : `head resting against her thigh`.

### Sur les canoniques

**Canonique avec contexte parasitaire** (1ère série Camille en village provençal, Mathieu jardin avec roses, Marie-Hélène "Café du Marais") → Nano Banana ramène ces éléments dans les shootings ultérieurs. **Leçon** : canonique = fond neutre `#F5F0EA` + t-shirt gris chiné + ZÉRO décor + ZÉRO contexte. STRICTEMENT.

**Cheveux attachés / coiffés dans les canoniques** (Anna v1 chignon, Lila v1 cheveux tirés, Coline v1 cheveux plaqués) → toutes les générations futures héritent de la coiffure narrative. **Leçon** : cheveux toujours libres dans la canonique, négations triplées (`NOT tied, NOT in a bun, NOT slicked back`). La coiffure appartient aux shots en contexte.

**Expression neutre/fermée dans les canoniques** (Lila v1 "tire la tronche", Coline v1 "photo d'identité judiciaire", Césaria v1 sévère) → image inutilisable. **Leçon** : expression neutre-bienveillante = micro-sourire + sous-tons rosés visibles + warm gaze. Pas juste "calm composed" qui glisse vers le froid. Mieux vaut légèrement trop souriante que légèrement trop neutre.

**Effet "Nosferatu / vampire" sur peaux très claires** (Sarah v1 nordique froide / cadavérique avec "ash-blonde + pale blue eyes + very fair clear skin + serene composed expression") → surcharger la pâleur tire vers le surnaturel. **Leçon** : ajouter explicitement `healthy pink undertones`, `warm flush on cheeks and nose bridge`, `subtle freckles or light sun marks`, `rose-tinted lips`, `warm human presence, NOT cold, NOT clinical, NOT ethereal`.

**"Mannequin agence générique" pour fortes personnalités** (Brune v1 "quelconque") → Nano Banana sort un visage joli-banal sans signature. **Leçon** : pour les personnalités fortes (Brune, Coline), donner refs culturelles ultra-précises (`Jeanne Damas in her early twenties`, `young Lou Doillon`, `Thylane Blondeau civilian casual`) + signatures physiques précises (lèvres pulpeuses, beauty mark, sourcils épais naturels).

**Tokens "Canon 85mm f/2.8 portrait lens" + "editorial commercial photography" pour canoniques** → activent le réflexe "photo magazine avec décor narratif". **Leçon** : pour canonique neutre, remplacer par `Studio reference portrait — neutral, clean, isolated subject on empty background`.

### Sur l'architecture et le workflow

**JSON 500 lignes pour briefer un shooting** (var_team_dog 8 modules) → engine surchargé, prompt EN technique, output un cran sous le niveau cible. **Leçon** : JSON = source de vérité DATA structurée. Prompt EN = récit littéraire dense court. Engine = traducteur intelligent entre les deux.

**Architecture avant exemples** → tentation Phase 2 : "setup hub/, types TS partagés, helper API" avant 3 variantes manuelles. **Leçon** : 2-3 exemples manuels AVANT d'automatiser. Règle "automatise quand tu l'as fait 3 fois".

**Variante = nouveau YPM** → tentation : chaque MAMA / SISTA / BRIDE TEAM = nouveau code YPM-xxx. **Réalité** : explosion volumétrique (Le Club seul aurait 20+ YPM-xxx fictifs). **Leçon** : Option B (variante = surcouche d'un template parent) verrouillée.

**PDP Shopify dédiée par variante éditoriale** → tentation : créer une PDP "Papi Gâteau", "Tata Cool". **Réalité** : explosion catalogue. **Leçon** : 5 PDP canoniques + landing pages "inspirations" hybrides.

**Indexer 408 shots statiques** → tentation initiale : `plan_shooting_systematique.json` comme référentiel exhaustif. **Vraie ambition** : moteur génératif. **Leçon** : ne pas confondre référentiel statique et moteur de génération.

### Sur la production et les couleurs

**BUG MAJEUR — Couleurs supports inventées** (ex: "beige camel", "marine foncé", "beige naturel brut") → Sarah a testé sur Gemini, "beige camel" n'existe ni dans `palette_supports_vetements.json` ni sur YP005 réel. **Leçon** : TOUJOURS consulter `palette_supports_par_produit.json` avant de proposer une combinaison produit/couleur.

**BUG — Réinvention de noms déjà mappés** (`écru` / `blanc cassé` au lieu d'`offwhite`, `vert anglais foncé` au lieu de `fil_vert_jade`). **Leçon** : `_mapping_legacy.json` premier réflexe pour les termes legacy.

**BUG — Aspect ratios freestyle** (4:3 sur shot famille, 1:1 sur ghost packshot). **Leçon** : 4:5 par défaut, 1:1 et 16:9 en exceptions justifiées.

**BUG — Inventer un mapping JH → YP non confirmé** → la table officielle est dans `_mapping_legacy.json` (JH001=YP001, JH030=YP005, JH050=YP021, JH01J=YP004). **Leçon** : toujours regarder le mapping legacy avant de déduire.

### Sur le casting (biais et leçons)

**11 blanc·he·s sur 20 mannequins** (proposition Claude initiale) → Sarah a recadré : démographie française réelle = équilibre.

**Particularités physiques sur profils blancs** (proposition initiale : vitiligo sur rousse, canne sur blanc senior, fauteuil sur blanche brune) → biais "handicap visible sur peau claire uniquement". Sarah a redistribué sur non-blancs.

**Diversité décorative vs incarnée** → "blanc·he·s" comme bloc indistinct. Sarah a exigé : chaque blanc·he avec un type identifiable.

### Sur les contenus visuels

**Flat lay rejeté comme hero** (V1 dog-parent kitsch, V2 manches en boule moodboard brief, V3 banc APC propre mais "pas utile") → le flat lay n'est pas un format Sézane / APC. **Leçon** : flat lay en filler carrousel uniquement, jamais en hero.

**"head on her lap" / "ground sat dog"** → physiquement peu crédibles avec gros chiens. **Leçon** : poses naturelles : `dog sitting beside her`, `head against her thigh`.

### Sur les sessions et la gestion d'énergie

**Sessions qui débordent** (1h30 → 3h, voire 6h+) → nuit courte, fatigue, qualité décisionnelle dégradée. **Leçon** : timer dur, commit à mi-chemin, refus de Claude quand le timer dépasse.

**Question stratégique posée à 1h du matin** (mannequins récurrents, anti-supermodel vs Sézane) → Claude doit dire "on note l'idée, on traite demain à tête reposée".

**Vouloir tout finir en une session** → "encore 30 min", "encore 20 min". **Leçon** : refuser fermement quand le timer est dépassé, même si Sarah pousse.

**Pas commiter le lot 1 mannequins immédiatement** quand une question stratégique majeure est ouverte → si Sarah change d'avis, il faut tout défaire. **Leçon** : suspendre les commits quand un débat stratégique est ouvert.

### Sur les secrets

**BUG critique — clé OpenAI hardcodée dans `archives/ypersoa_content_os_v3.html`** → bloqué par GitHub Push Protection au premier push. **Leçon** : `.gitignore` sérieux dès le début (`.env`, `secrets/`, `**/api_keys.json`). Toujours utiliser variables d'environnement, jamais hardcoder.

**PAT collé en clair dans une conversation Claude** → considérer compromis, révoquer immédiatement. **Leçon** : les secrets restent dans le Keychain / gestionnaire de mots de passe / `.env`. Jamais dans un chat, même privé.

---

## 7. QUESTIONS OUVERTES NON TRANCHÉES

### Stratégique
- **Casting direction (anti-supermodel vs Sézane vs juste milieu)** — D1 Beauté Incarnée v2.0 a été posée comme position centrale, mais le débat conceptuel n'a jamais été tranché formellement par écrit. Position de fait : v2.0. À reconfirmer si Sarah veut faire évoluer le casting un jour.

### Produit / Marketing
- **Marketing saisonnier complet** — calendrier annuel, ratio saisonnier vs evergreen, anticipation par saison, motifs activés exclusivement en saison vs evergreen, lien variantes éditoriales hub avec saisons. TODO_SESSION_DEDIEE.
- **Campagne Mama Club Fête des Mères 2026** — décidée prioritaire (deadline 31/05/2026), pas planifiée explicitement (date démarrage, copy final, budget pub).
- **Couleurs palette indispo aucun produit** (`gris`, `vert_olive`) — alerté mais non décidé : nettoyer la palette ou les garder pour futurs produits ?
- **Couleurs disponibles par produit non auditées sur écarts B&C** (Lake Blue, Teal sur YP019).
- **Profilage des 17 motifs en archétypes narratifs** — proposition de 5 archétypes (Contemplatif intime / Déclaration amoureuse / Famille quotidienne / Transmission-héritage / Célébration-saisonnier) non validée. YPM-005 Annonce, YPM-010 Ronde, YPM-012 Meute, YPM-014 Depuis, YPM-016 Signature, YPM-017 Florale restent non profilés.

### Technique / Phase 2
- **Génération PNG broderie pour preview RS/site** — Choix C verrouillé pour les vraies broderies (Adriana fait la prod), mais pas tranché si on veut un SVG paramétrable côté client (Option A) ou un prompt Gemini (Option B) pour les MOCKUPS RS uniquement.
- **Format brief variante en input du moteur** — proposé en YAML/JSON minimaliste, format exact non validé.
- **Casting favoris UI** — Sarah a dit "3-5 favoris étoilés en haut du dropdown", pas tranché précisément.
- **Configuration API Anthropic + Gemini** — clés et variables d'environnement (`ANTHROPIC_API_KEY`, `GEMINI_API_KEY`) à setup proprement dans `.env`.
- **Volume de production réel** — 500-600 images max par collection, mais combien de COLLECTIONS par an ? Saint-Valentin / Fête Mères / Pères / Grands-Mères / Naissance / Mariage / Diplôme / Noël ? Faisable avec quels budgets API Gemini ?

### Réconciliations en attente
- **Brigitte v2** : ajouter `direction_modeles_override` (regard hors champ pensif) + corriger mention "Tajima TMEZ" → "brodé à la commande" + remplacer description vague mannequins par IDs (MAN-P01, MAN-P02, MAN-P10).
- **suggestions_shopify_canoniques mot_bas** Le Club — j'avais inventé `["CLUB", "TEAM", "FAMILY", "2024", "FOREVER"]`, le Liquid n'a que `"2024"`. À valider par Sarah.
- **Référentiel `regles_combinaisons_shooting.json`** — référencé par Brigitte mais structure exacte pas figée.
- **Mannequins-types pour shooting Brigitte** — pas validé spécifiquement quels IDs (probablement P01 / P02 / P10).
- **Henri à 80-85 ans visuels pour 72 fiche** — Sarah garde, mais écart avec Joséphine (70 paraissant 72-75) à surveiller en duo.
- **Sarah du couple Léa/Sarah expression plus neutre que Léa** — Sarah garde, décalage émotionnel possible en duo.

### Politique éditoriale
- **Flat lay** — rejeté V1/V2/V3, pas de décision finale écrite. "Sort du pack standard" ? "Filler carrousel uniquement" ? "Remplacé par sweat sur banc bois APC" ?

---

## 8. PHRASES ET FORMULATIONS À RÉUTILISER TEXTUELLEMENT

### Activation character reference Nano Banana 2 (formule magique)
```
using the uploaded reference portrait as the character's face identity
(same woman, same face, exact same features preserved)
```
*(adapter `woman` en `man` / `girl` / `boy` selon mannequin)*

### Forcer la priorité broderie (format wide)
```
CRITICAL EMBROIDERY DETAIL (must be rendered sharp and accurate):
[description badge]. The badge must be rendered as the sharpest detail
in the frame.
```

### Setting strict pour canonique
```
STRICT SETTING REQUIREMENTS (MANDATORY): Pure off-white seamless studio
backdrop, uniform color #F5F0EA, NO texture, NO walls, NO floor, NO furniture.
NO decor whatsoever, NO props, NO background elements, NO environment, NO scene.
```

### Fin canonique (anti-vampire / anti-froid)
```
Lived-in skin texture preserved, no retouching, no beauty filter,
analog film grain. Studio reference portrait — neutral, clean,
isolated subject on empty background. Warm human presence,
NOT cold, NOT clinical, NOT ethereal.
```

### Solidarity principle (broderie circulaire)
```
thin embroidered circle outline, the word '[X]' curved along the upper arc,
a stylized flat-icon [SYMBOLE] in the center, the word '[Y]' curved along
the lower arc — all four elements (circle, [X], [SYMBOLE], [Y])
embroidered in the same [couleur] thread, single-color solidarity principle
```

### Description patte chien (anti-réaliste)
```
stylized flat-icon DOG PAW (1 oval central pad + 4 round toe pads above it,
simplified geometric embroidered design, NOT a realistic photo paw print)
```

### Description broderie typo
```
Typography: Arial Rounded bold, sans-serif, sharp legible letters.
Visible thread texture, individual stitch rows, dense satin stitch fill,
subtle fabric weave detail. Industrial Tajima machine embroidery quality.
```

### Suffixe universel D1 Beauté Incarnée v2.0
```
Real humans with natural features, lived-in skin conserved, no retouching,
no skin smoothing, no beauty filter. Analog film grain, raw editorial feel.
```

### Refs aesthetic shot (par style pack)
**Minimaliste APC** :
```
Sézane × A.P.C. campaign aesthetic, Maison Labiche lookbook style,
effortless French quiet luxury
```
**Loft Brut & Serre Botanique** :
```
premium chic aesthetic, Vogue Living editorial,
high-end interior design photography
```
**Premium Parisien Sézane × Labiche** :
```
effortless French elegance, Mélodie Vaxelaire × Caroline de Maigret
urban aesthetic
```

### Description badge Le Club zone par zone (formule récurrente)
```
the badge shows the word 'XXXX' on the upper arc, a filled heart in the
center, the word 'XXXX' on the lower arc, all in [color] thread,
sans-serif rounded bold typography (Arial Rounded style),
circle outline + heart + both words all in the same [color] color
(solidarity principle)
```

### Signatures cibles mannequins (à conserver mot pour mot)

**Camille** :
```
chestnut-honey mid-length wavy hair parted in the middle,
freckles across her nose and cheekbones, lived-in skin with a glow,
warm hazel eyes, half-smile
```

**Aïcha** :
```
short sculpted natural afro hair, deep luminous dark brown skin,
high cheekbones, warm wide smile, elegant tall posture
```

**Brune (v3 ADN Damas)** :
```
long wavy dark brown hair with visible texture, full pulpy naturally-shaped
lips, thick natural untweezed eyebrows, beauty mark, ZERO makeup,
subtle playful half-smile with a hint of mischief
```

**Mathieu** :
```
medium-short dark brown hair slightly tousled, trimmed 3-day dark brown beard,
warm brown eyes, lived-in masculine skin
```

**Marie-Hélène** :
```
coppery-red shoulder-length hair with natural silver streaks at the temples,
dense freckles, soft natural expression lines, serene warm half-smile
```

**Coline** :
```
ash-blonde shoulder-length hair in a structured natural bob with visible
soft movement, blue-grey eyes with a warm subtle glint, healthy pink undertones,
serene confident presence — Mélodie Vaxelaire / Louise Follain register
```

### Phrasé brand pour copywriting RS / Shopify (FR)
- Tutoiement systématique
- "Pour celle qui..." / "Pour celui qui..."
- "Brodé sur métier Tajima dans notre atelier de Wattrelos"
- "Un cadeau qui dure" / "Un cadeau chargé de sens"
- Pas de "fait main" / "artisanal" / "Etsy"

### Taglines templates / variantes
- **Le Club** : *"Ton club. Ton blason."* / *"Deux mots, un symbole, une couleur. C'est le tien."* / *"Il y a les clubs officiels. Et il y a le tien."*
- **Brigitte** : *"Un cœur, une initiale. C'est tout, c'est assez."* / *"Le motif qui dit l'essentiel sans bavardage."* / *"Pour celles et ceux qui aiment les signes discrets."*
- **Sista Club** : *"Pour celles qui ne sont pas sœurs de sang. Mais sœurs de cœur."*
- **Team Dog** : *"Parce qu'un chien, c'est pas un animal. C'est une famille."*
- **Mama Club** : *"Le badge officiel des mamans du quotidien. Le tien, en un mot."*

### Hooks éditoriaux
**Mama Club** :
- *"Il y a les clubs officiels. Et il y a le tien."*
- *"Le seul club où ta seule cotisation, c'est l'amour."*
- *"Maman, c'est pas une fonction. C'est un club."*
- *"Deux mots, un cœur, une couleur. Ton Mama Club."*

**Sista Club** :
- *"Plus jamais témoin de mariage avec un t-shirt cheap."*
- *"POV : ta sista, c'est ta personne."*
- *"Tu vas te marier ? On a le badge des copines."*
- *"Le club le plus exclusif du monde : le tien et celui de ta sista."*

**Team Dog** :
- *"POV : tu es officiellement dans le Team Dog."*
- *"Ton chien mérite un badge brodé, pas un pull à pois kitsch."*
- *"La tribu dog-parents a un blason, maintenant. Le tien."*

### CTA configurateur
- *"Compose ton Mama Club."*
- *"Compose ton Sista Club."*
- *"Compose ton Team [ton chien]."*
- *"Compose ton EVJF."*

### Brief Adriana production type
```
Badge YPM-003 Le Club. Mot haut: [MOT] ([X] car). Mot bas: [MOT] ([Y] car).
Symbole central: [Symbole]. Dimensions cibles 8-10cm diamètre.
Typographie Arial Rounded Bold. 1 couleur fil solidaire (cercle + symbole + textes).
Format PDP hoodie/sweat/t-shirt buste gauche.
```

### Note solidarité couleur fil (PDP)
- *"Même couleur que le mot du haut — cercle, cœur et textes sont solidaires"*
- *"S'applique à l'ensemble du badge — cercle, symbole et les deux mots prennent la même couleur"*

### Mention Adriana dans description PDP
*"Les dimensions indiquées sont indicatives. Adriana adapte la taille du motif à ta typo et au nombre de caractères pour un rendu harmonieux."*

### Description Le Club PDP
*"Il y a les clubs officiels. Et il y a le tien. Le Club, c'est un badge brodé rond — ton mot en haut, un cœur au centre, ton mot en bas. Une typographie nette, tout dans une couleur, sur le buste gauche."*

### Tagline EVJF / Sista
*"Parfait pour créer des looks coordonnés famille, EVJF, ou squad."*

### Caption type "question communauté"
**Sista Club** : *"Ta sista, tu l'as rencontrée comment ? (école / boulot / soirée / hasard)"*

**Team Dog** : *"Quel mot tu broderais sous TEAM pour ton chien ? (le nom, la race, l'attitude... on prend tout en commentaires)"*

### Citations Sarah à graver
> *"Je ne veux pas une diversité décorative, je veux une diversité incarnée et précise."*

> *"Je ne veux pas mettre Ypersoa dans une voie à sens unique."*

> *"Je veux qu'on les identifie dans les styles à la française, mais qui portent de l'Ypersoa, soir, week-end, sur une chemise en jean, sur une robe de mariée, ou dans un champ de coquelicot au coucher de soleil."*

> *"Le couple est un fait, pas un statement."*

> *"À un moment, on passe par VSCode, je donne mes codes API et on produit."*

### Tests de validation
- **D1 Beauté Incarnée** : *"Cette personne pourrait être l'égérie d'Emoi Emoi ?"*
- **Famille_vivante** : *"Si on décrit le shot par 'photo inclusive' → raté. Le shot doit se lire 'joie familiale du dimanche' en premier, 'famille mixed-heritage' en observation secondaire."*
- **Brigitte contemplatif** : *"Cette personne pense à quelqu'un ou à quelque chose ?"*

### Métaphores cadrage particularités physiques
- *"Le fauteuil fait partie d'elle sans la définir"* (Coline)
- *"Le vitiligo est présent mais jamais le sujet du portrait"* (Césaria)
- *"La canne est présente, jamais sujet"* (Hassan)

### Tournures décor architectural précis (Mama Club style validé)
- `Sage green paneled wall background, dark wooden parquet floor`
- `warm off-white lime-washed wall with subtle texture and imperfections`
- `Parisian park path lined with tall trees` *(vs juste "park")*
- `modern botanical greenhouse loft, polished concrete floors`

### Style photographique universel
```
35mm film photography, medium format camera feel, no retouching feel,
analog film grain subtle, raw editorial
```

### Pattern commit Git
```
[Phase]: [livrable] ([détails techniques])
```
Exemple : `J3.B: ambiances_shooting.json (5 ambiances enrichies palette+mannequins+matrice piliers)`

---

## 🚀 PROMPT DE REPRISE DE SESSION

Pour ouvrir une nouvelle conversation Claude sur le Hub Ypersoa, copie-colle ces 3 lignes :

> Claude, on reprend Hub Ypersoa. Lis `CLAUDE.md` à la racine du repo + la dernière passation dans `_passations/`. On attaque [PHASE 2 / Césaria / autre]. Tu confirmes ce point de départ ?

---

## 📋 ÉTAT DES PHASES (au 26/04/2026)

| Phase | Statut | Description |
|---|---|---|
| Phase 1 — Hub référentiels | ✅ BOUCLÉE | Casting 23, ambiances, types shots, schéma variante, axes Shopify, 3 goldens Le Club |
| Phase 1.5 — Bibliothèque canonique | ✅ BOUCLÉE | 23 canoniques validées, méthode shooting validée empiriquement |
| Phase 1.6 — GitHub + sécurité | ✅ BOUCLÉE | Push GitHub privé, historique nettoyé, identité Git configurée |
| Phase 2 — Ypersoa Studio v2 | 🔜 NEXT | Mono-repo Next.js + API Gemini + UI génération shooting |
| Phase 3 — Moteurs RS | 🔜 PLUS TARD | Carrousel + reel + posts + hooks + sondages + tags |
| Phase 4 — Copywriter Shopify | 🔜 PLUS TARD | Engine fiche PDP complète |
| Phase 5 — Marketing saisonnier | 🔜 PLUS TARD | Calendrier campagnes annuel |
| Phase 6 — Orchestrateur | 🔜 FINAL | hub.ts : input PNG → variantes → orchestrate engines |

---

*Fichier maître Hub Ypersoa. Version 1.0 du 26/04/2026.*
*À mettre à jour après chaque session qui ajoute une décision durable, un acquis méthodologique, un casting, une règle.*
