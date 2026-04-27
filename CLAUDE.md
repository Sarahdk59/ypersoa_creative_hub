# CLAUDE.md — Hub Ypersoa

> **Fichier maître du projet.** À lire en premier au démarrage de toute nouvelle conversation Claude.
> Synthèse des décisions, règles, méthodes et acquis du Hub.
> Les passations dynamiques (état session par session) vivent dans `_passations/`.
>
> **Version 1.1** — mise à jour 2026-04-27 (intégration session post-canoniques + GitHub config + 50 réponses QCM Phase 2).

---

## 0. PRINCIPE ARCHITECTURAL FONDAMENTAL

Le Hub Ypersoa est un **système d'automatisation des métiers de la communication**.

### Ce que le Hub REMPLACE (~14 métiers communication)
Community manager, copywriter PDP Shopify, copywriter captions IG, directeur photo, directeur artistique éditorial production (pas la vision DA stratégique), photographe shooting, styliste shooting, designer carrousel IG, video editor / monteur reels, hooks éditoriaux, sondages stories, tags RS multi-plateforme, SEO / meta descriptions, traducteur multi-langue.

**Coût externalisé évité** : ~10-15k€/mois en agence digitale.

### Ce que le Hub NE REMPLACE PAS
- Le **produit** physique (vêtements, supports textiles)
- Le **stock** et l'approvisionnement (Awdis, B&C)
- La **broderie** (numérisation PulseID/Hatch, fil, métier Tajima)
- **Adriana** (production atelier, expédition, contrôle qualité)
- **Sarah en tant que DA** (validation visuelle finale, arbitrage stratégique, vision brand)
- Le SAV, la facturation, la gestion client

### Conséquences architecturales
- **Scope** : le Hub est un outil de production CONTENU, pas un ERP / PIM / CRM.
- **Adriana** est amont du Hub (fournit les PNG broderie via PulseID), pas dans le Hub.
- **Sarah DA** est au-dessus du Hub (le Hub exécute selon CLAUDE.md + référentiels).
- **L'IA propose, Sarah dispose** (validation humaine systématique avant publication).

---

## 0bis. IDENTITÉ DU PROJET

**Hub Ypersoa** = système orchestré multi-modules pour transformer un nouveau motif (PNG + brief) en livrables complets sur tous les canaux : Shopify, Instagram (carrousel + reels + posts), hooks éditoriaux, sondages stories, tags RS multi-plateforme.

**Cible volumétrique long-terme** : ~167 motifs total (17 actuels + 150 en collection à digitaliser), 30-50 packs de contenus / mois, multi-langue 6-7 langues à l'horizon 2027.

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

### Mono-repo (structure cible)
```
ypersoa_creative_hub/
├── motifs/                      ← templates YPM-xxx (DATA)
├── referentiels/                ← palettes, casting, ambiances, schémas (DATA)
├── assets/canoniques/           ← 23 portraits mannequins (DATA)
├── variantes/                   ← goldens par template (DATA)
├── _passations/                 ← docs de session
├── apps/                        ← toutes les apps consommatrices
│   ├── studio/                  ← Phase 2 — génération shooting + carrousel
│   ├── shopify-writer/          ← Phase 3 — copywriter PDP
│   ├── reel-engine/             ← Phase 3 — reels (cinematic + instamatic)
│   ├── posts-engine/            ← Phase 3 — captions/hooks/tags
│   └── carousel-builder/        ← intégré dans studio/ ou standalone
├── packages/                    ← code partagé entre apps
│   ├── shared-types/            ← types TS communs
│   ├── data-loader/             ← lit les JSON de referentiels/
│   ├── brand-rules/             ← règles tone, interdits CLAUDE.md
│   └── ai-clients/              ← wrappers API Gemini/Claude/Runway/Pika
├── CLAUDE.md                    ← CE FICHIER
├── .gitignore
└── package.json (workspace root pnpm)
```
- **Raison** : tous les modules consomment les mêmes référentiels. Mono-repo = atomicité, un changement de référentiel propage immédiatement à tous les outils.
- **Écarté** : multi-repo (synchronisation enfer), repos séparés par module.

### Stack Phase 2 (Ypersoa Studio v2) — Q1
- **Frontend** : Next.js + TypeScript + Tailwind
- **Backend** : Node (workers Next.js) + APIs externes
- **Workspace manager** : **pnpm workspaces** (rapide, propre, simple)
- **IDE** : VSCode (commande `code` configurée dans le PATH)
- **Architecture i18n** : à poser dès le bootstrap (next-intl ou next-i18next), même si seul `fr` activé en V1
- **Hub web multi-device** avec login (Q10), pas d'app native
- **Raison** : Sarah veut "passer par VSCode et donner ses codes API". Stack moderne, cohérente avec écosystème Shopify, productivité élevée.
- **Écarté** : Vite/React standalone (pas de SSR), Astro, Python.

### APIs IA — Q2 + Q32
- **Images** : **Gemini 3 Pro Image (Nano Banana 2)** par défaut pour la génération photo + character reference
- **Copy / brief / copywriting brand-safe** : **API Anthropic Claude** (meilleure nuance brand FR)
- **Vidéo cinematic** (hero banners landing, vidéos site, longs formats, ratios cinéma) : **Runway / Veo 3**
- **Vidéo instamatic** (reels Insta, posts vidéo, courts formats, vibe casual/spontané) : **Pika / Veo léger**
- **Raison** : meilleur modèle par cas d'usage. Nano Banana 2 prouvé pour le character reference. Anthropic Claude meilleur pour la nuance brand FR. Distinction cinematic vs instamatic = catégorie figée niveau brand, pas juste technique.
- **Écarté** : tout-Gemini (faiblesse copy nuancé), tout-OpenAI (DALL-E pas au niveau), Midjourney (pas d'API stable).

### Mode hybride déterministe + IA (sur les engines)
- **Décision** : Engines = structure déterministe (sélection mannequin, ambiance, format, distribution pack) + appel API pour le créatif (prompt EN, caption, hook).
- **Raison** : Prévisibilité + maîtrise coûts + qualité créative.
- **Écarté** : 100% statique (perd en qualité créative), 100% IA (imprévisible et coûteux).

### Pivot architectural majeur — prompts littéraires > JSON ultra-structuré
**Décidé le 24/04, validé empiriquement.**

L'approche JSON 8-modules détaillé pour briefer Nano Banana 2 produit des résultats **un cran sous le niveau cible** (Sézane / Maison Labiche). Les prompts littéraires courts avec refs marques produisent des résultats **niveau cible atteint**.

- **Décision** : Le JSON reste source de vérité DATA, mais l'engine fait un travail de **traduction copywriter** entre JSON structuré et prompt EN narratif. Pas de dump direct du JSON dans le prompt.
- **Écarté** : sur-spécification (hex codes systématiques, IDs produit dans le prompt, négations multiples préventives, casting cyclique forcé par règle).

### Mannequin de référence persistant (canonique uploadée)
**Solution au problème "modèle différent à chaque génération".**
- **Décision** : Bibliothèque de 23 portraits canoniques figés dans `assets/canoniques/`. Upload de la canonique EN PREMIER dans Nano Banana 2 → active le character reference mode → fidélité faciale **90-95%** validée empiriquement (Camille / Mathieu / Aïcha).
- **Écarté** : description textuelle ultra-détaillée seule (~70-80% de cohérence, insuffisant), génération random à chaque fois (perte d'attachement à l'image de marque).

### UI mannequins — Q3 + Q16
- **5 favoris étoilés** en haut du dropdown, 18 autres canoniques accessibles rapidement.
- **Badge mannequin visible** sur le shot généré + dropdown switch avant génération.
- **Raison** : équilibre rapidité (3-5 mannequins utilisés à 80% du temps) et accès complet au cast.

### Workflow nouveau motif — Q4 + Q7 + Q11 + Q12
- **Upload PNG** → l'app détecte le template parent automatiquement
- **IA génère la fiche template Shopify** : 3 versions à choisir (titre / desc / bullets différents)
- **Auto-génération des 5 variantes canoniques thématiques** (parents, enfants, lifestyle, cadeaux, anniversaire/couple — thématiques **modulaires par motif**, pas liste fixe)
- **Mapping thématiques sur archi Shopify réelle** (axes_shopify.json à auditer en début Phase 2)
- **Raison** : workflow le plus rapide pour scaler à 167 motifs.
- **Écarté** : remplissage manuel formulaire variante par variante, IA décide seule sans proposer.

### Sortie pack shooting — Q5
- **6 images minimum** générées
- **Regen par image individuelle** (bouton 🔄 sous chaque slot, indépendant)
- **Cache historique** des générations par slot
- **Raison** : les hallucinations Gemini sont fréquentes, regénérer 1 shot raté ne doit pas obliger à regénérer le pack entier.
- **Écarté** : pack global atomique (regen tout ou rien).

### Système ❤️ favoris + apprentissage — Q15 (FEATURE CRITIQUE DIFFÉRENCIANTE)
- **Court terme** : bouton ❤️ sur chaque génération + "Garder uniquement les favorites" en bulk. Fallback : si pas de ❤️ posé, garde les 5 dernières générations.
- **Moyen terme** : système **in-context learning** — les images ❤️ deviennent des few-shot examples dans les prompts suivants ("génère dans le style de ces images favorites précédentes").
- **Long terme (V2+)** : classifier "Sarah's taste" qui pré-filtre les générations Gemini avant affichage.
- **Raison** : Hub qui apprend les goûts au fil des sessions = vraie feature différenciante, rare dans les outils du marché.
- **Écarté** : fine-tuning de modèle (coûteux et complexe), garde tout sans tri (bruit).

### Régénération shot — Q14
- **Décision** : même prompt, nouveau seed (variation aléatoire).
- **Écarté** : même seed (pas de variation), modifier prompt à la main (UX lourde).

### Style pack par génération — Q13
- **1 style pack/génération** : Minimaliste APC / Premium Parisien Sézane / Loft Brut & Serre Botanique
- **Override post-prod possible** : regen avec autre style sans détruire l'ancien
- **Implication archi** : storage par génération avec version + style.

### 5 templates carrousel signature Ypersoa — Q31
**Pierre angulaire du module Carrousel.** Toggle on/off overlay au moment de la génération (Q31 A+C).

1. **Diptyque émotionnel** — 2 slides (portrait hors-cadre → révélation broderie)
2. **Détail vers contexte** — 3 slides (macro fil → mid vêtement → wide personne)
3. **Before / After temporel** — 2-3 slides (mère âgée + photo archives jeune avec enfant aujourd'hui)
4. **Objet posé** — 3 slides nature morte sans modèle (style Sézane, sweat plié sur draps)
5. **Témoignage visuel** — 3 slides (UGC client + citation grosse typo cream + produit final)

**Texte overlay** : HTML/CSS/Canvas (`html2canvas` ou `dom-to-image`) avec typo brand (Josefin Sans + DM Sans), **PAS de génération texte dans l'image** (Gemini hallucine la typo).

**Architecture hybride 2 couches** :
- Couche 1 : image générée (Gemini), aucun texte
- Couche 2 : overlay HTML/CSS/Canvas avec typo et couleurs brand exactes
- Export PNG haute déf via canvas.toBlob()

**Raison** : signature visuelle reconnaissable sans logo, pas du "carrousel qui claque" viral mais du distinctif sobre brand.

**Écarté** : 1 template universel (pas distinctif), 10+ templates (complexité), texte généré par Gemini dans l'image (hallucinations systématiques).

### Module Vidéo — distinction cinematic vs instamatic — Q32
- **Cinematic** = hero banners landing, vidéos site, longs formats, ratios cinéma → **Runway / Veo 3**
- **Instamatic** = reels Insta, posts vidéo, courts formats, vibe casual/spontané → **Pika / Veo léger**
- Le module `reel-engine` doit gérer les 2 registres avec prompts distincts.

### Brief Adriana — Q6 + Q17
- **PDF/email manuel ultra-complet** : specs broderie + PNG motif d'origine + 6 packshots ghost de référence + métadonnées variante.
- **Adriana** est sur PulseID/Hatch, pas dans le Hub. Brief auto-généré, transmission manuelle (mail).
- **Écarté** : compte Hub pour Adriana, push direct Trello/Notion, push API PulseID (pas dispo).

### Push Shopify — Q18
- **API Shopify direct** mais en **BROUILLON**, validation manuelle Sarah avant publication.
- **Raison** : automatisation maximale + garde-fou humain avant le live.
- **Écarté** : push direct en publication (trop risqué), export manuel zip à uploader (perte de temps).

### Variantes éditoriales hub — Q19
- **Workflow complet** : shooting + caption + carrousel + reel + posts
- **Landing page éditoriale auto-générée** qui redirige vers PDP canonique du template parent
- **PAS de PDP Shopify dédiée** par variante éditoriale (explosion catalogue évitée)

### IA copywriter dual mode — Q20 + Q39
- **Mode strict** pour PDP/SEO (respect absolu CLAUDE.md, pas de dérive)
- **Mode créatif** pour hooks/captions (s'inspire mais propose)
- **Pipeline créatif** : premier jet créatif → polissage conservateur → validation humaine systématique avant publication
- **Écarté** : tout-strict (perd la fraîcheur captions), tout-créatif (dérive brand).

### Variante = surcouche d'un template (Option B)
- Un template `YPM-xxx` reste seul dans `motifs/`. Les variantes sont des entrées dans `referentiels/variantes/[template]/var_*.json` qui pointent vers leur parent et surchargent 3-4 champs.
- **Raison** : scalabilité (167 motifs × 20 variantes en moyenne = ingérable si chaque variante = nouveau YPM).
- **Écarté** : Option A "chaque variante = nouveau code YPM" (explosion volumétrique).

### Distinction canon Shopify vs éditorial hub
- **5 variantes canoniques par template** = pré-codées dans le configurateur PDP Shopify (ex: MAMA, SISTA, TEAM, AMOUR, FAMILLE pour Le Club).
- **Variantes éditoriales hub** = vivent en RS + landing pages, **PAS de PDP Shopify dédiée**, redirigent vers PDP unique avec configurateur libre.

### Hub ne génère PAS le PNG broderie (Choix C)
- **Adriana** numérise les motifs via PulseID/Hatch.
- Le **Hub produit le brief de production** pour elle.
- **Écarté** : SVG paramétrable côté client, prompt Gemini pour générer le PNG broderie.

### Format image standardisé
- **4:5 par défaut** (PDP Shopify, ~80% des shots)
- **1:1** pour flat lay et carrousels IG carrés (1-2 shots ponctuels)
- **16:9** pour hero banners landing (1 shot ponctuel)
- **9:16** pour stories / reels uniquement
- **Écarté** : 4:3, 3:4, ratios libres (interdits PDP Shopify).

### Buffer campagne saisonnière (J-45 minimum)
Toute campagne saisonnière démarre **J-45 minimum** par rapport à l'événement.

**Décomposition** :
- **J-45 → J-15** : 30 jours de campagne active (teaser → reveal → push → urgency → close)
- **J-15 → J-7** : 7-10j production atelier Adriana
- **J-7 → J-0** : 2-5j expédition transporteur
- **Deadline commande client** affichée à J-15 sur PDP

⚠️ **Règle d'or** : J-30 est INSUFFISANT (ne laisse que 15j de campagne, impossible de monter une vraie séquence éditoriale). Toujours penser J-45.

**Erreur Claude récurrente à éviter** : confondre date de l'événement et deadline de livraison. La livraison c'est J-45 AVANT la fête, pas la fête elle-même.

### Schéma variante = 8 modules d'agence — Q48
Une variante doit produire 8 livrables structurés :
1. Fiche Shopify (titre SEO + meta + description + bullets + tags + handle)
2. Shooting pack (6-8 shots prêts pour Gemini avec prompts EN + metadata)
3. Carrousel IG 10 slides (avec overlay)
4. Reel 20s (script + storyboard, cinematic ou instamatic)
5. Posts récurrents
6. Hooks éditoriaux
7. Sondages stories
8. Tags RS par plateforme

**Schema structuré 8 modules pour V1**, peut-être minimaliste après V1 selon retour usage.

### Posts récurrents — cadence — Q33
- **Calendrier saisonnier dicte la cadence** (printemps fleuries, été vacances, rentrée enfants, fêtes fin d'année)
- **Écarté** : cadence fixe (4-6/mois), rotation aveugle full catalogue, suggestions au coup par coup.

### Hooks éditoriaux — Q34
- **5 hooks/variante** générés ET **banque de hooks par registre** (humour / émotion / question / POV) avec filtre dans l'UI.
- **Hybride** : génération + bibliothèque persistante.

### Sondages stories — Q35
- **3-5 sondages prêts par variante** (slider, choix multiple, question ouverte)

### Hashtags multi-plateforme + métriques — Q36 + Q38
- **Hashtags dynamiques avec apprentissage sur perfs**
- **Intégration API Insta + TikTok** pour récup auto métriques + apprentissage
- **Implication** : storage perfs RS dans DB Hub (Supabase à confirmer), cron job métriques, algo de scoring qui pondère hashtags
- **Maturité** : feature **Hub V2** (post-Noël 2026), pas V1

### Calendrier éditorial — Q37 + Q41
- **Planning auto dans calendrier visuel** Hub (vue calendrier avec contenus pré-affectés aux slots)
- **Auto-détection complète du calendrier français** (toutes fêtes/événements). Implique base de données saisons FR + algo de priorisation par type de motif.
- **Écarté** : 3 grosses fêtes seulement, sélection manuelle, intégration scheduler tiers.

### Capsules édition limitée — Q42
- **Format spécifique supporté** : deadline serrée + scarcity (X exemplaires uniquement)
- Engine commerce + RS adapté

### Maï rôle dans le Hub — Q40
- **Pas de compte Hub à V1**
- **Hub finalise pack → upload auto SharePoint structuré** : `Ypersoa/Hub/[année]/[mois]/[campagne]/`
- **Notification Maï** (email/Teams) avec lien direct vers le dossier SharePoint
- **Maï bosse depuis SharePoint** qu'elle connaît déjà (outil Phenix Group), zéro courbe d'apprentissage
- **Compte Hub envisagé V2+** (accès limité à définir)
- **À trancher Phase 2** : Microsoft Graph API ou WebDAV pour l'upload auto

### Volumétrie cible — Q44 + Q47
- **30-50 packs de contenus / mois** = ~360-600 packs/an = **rythme industriel**
- **17 motifs YPM-001 → YPM-017 actuels** + **150 motifs additionnels en collection** à digitaliser et adapter aux règles CLAUDE.md = **~167 motifs total à terme**
- **Implication** : infra solide, monitoring API, gestion concurrence des appels

⚠️ **Tension Q39 (validation humaine systématique) + Q44 (30-50 packs/mois)** : à résoudre en Phase 2 par **validation par batch** (un pack entier validé en bloc) plutôt que pièce par pièce. Délégation partielle à Maï quand elle aura un compte Hub (V2+).

### Multi-langue — Q9 + Q43
- **2026** : FR uniquement
- **2026/27** : ajout EN (UK + USA, valider perfs avant d'élargir)
- **2027** : ajout DE + NL + ES + IT + BE + LU
- **Architecture i18n** dès Phase 2 obligatoire, même si seul `fr` activé en V1
- **Recommandation** : EN d'abord, valider perfs, **puis** seulement DE/NL/ES/IT/BE/LU pour éviter l'éparpillement

### Budget API — Q8 + Q45
- **Pas de plafond**, on suit la facture en backend
- **Implication** : dashboard de suivi facturation Hub obligatoire pour éviter les surprises

### Hub agentic Phase 6 — Q46
- **NON tranché**, on verra à l'usage post-V1
- **Raison** : impossible de décider avant d'avoir vécu le V1 et compris les vrais points de friction

### Hub résilient — Q49
- **Hub doit pouvoir tourner sans Adriana ni Maï** (sur la **partie contenu**, pas la production physique)
- **Posture forte** : Sarah peut publier seule
- **Implication** : Hub + scheduler RS + push Shopify auto + notifications partenaires automatisées

### Vision long-terme SaaS — Q50
- **SaaS multi-tenant à terme** pour autres marques broderie/textile premium
- **D'abord focus Ypersoa** avant de penser SaaS
- **Implication archi** : code pensé multi-tenant-ready dès Phase 2 (structure permettant), sans le forcer

### Repo Git — état au 27 avril 2026
- **Backup ZIP 74 Mo** sur SharePoint
- **Repo GitHub privé** `Sarahdk59/ypersoa_creative_hub`, branche `main`
- **Identité Git** : Sarah Kedziora + Gmail perso
- **PAT fine-grained** scope minimal (Contents R/W + Metadata R), expiration 90j à renouveler
- **`.gitignore`** : `.DS_Store`, `.env`, `node_modules/`, `__pycache__/`, `*.zip`
- **Historique propre** : nettoyé via `git filter-repo` le 26/04 (ancienne clé OpenAI retirée d'un fichier `archives/ypersoa_content_os_v3.html` obsolète)
- **313+ objets pushés** sur `main` (CLAUDE.md inclus)

### Roadmap recadrée
- **Fête des Mères 2026** : couverte avec posts existants (pas de sujet)
- **Fête des Pères 21 juin 2026** : test grandeur nature avec outil **Atelier Social** actuel après fix `gemini.ts`
- **Cible Hub Phase 2 V1** : **Noël 2026** (deadline J-45 = 11 novembre, ~6 mois de runway sain)
- **Bonus** : rentrée 1er septembre si Hub prêt avant
- **Décision** : ne pas rusher Phase 2 pour Fête des Pères. Construire dans les meilleures conditions pour produire un système réutilisable sur 5 ans.

---

## 2. RÈGLES BRAND ET ÉDITORIALES (absolues)

### Lexique technique vs client (immuable)
- **Contexte client par défaut** (PDP, RS, copywriting général, captions, emails, hooks, taglines) : **"brodé à la commande"** ou **"brodé à la demande"** (synonymes, alterner pour rythme)
- **Contexte ultra-niche uniquement** (articles blog "visite atelier", vidéos process où on filme la machine, fiches produit backend Hub) : "brodé sur métier Tajima" autorisé
- **Règle de doute** : si tu hésites, c'est "à la commande". Tajima est l'exception, pas la norme.
- **INTERDIT ABSOLU partout** : "brodé à la main", "fait main", "artisanal", "Tajima TMEZ" (jargon technique banni partout, même atelier), **"par le fil et l'aiguille"** (suggère artisanat manuel, contradiction brand)
- **INTERDIT ABSOLU** : référence Etsy, "marketplace", autres canaux passés

### Tutoiement systématique
Tous les textes clients (Shopify, RS, emails). Jamais "vous", "votre", "offrez", "découvrez" (formules creuses vouvoyantes).

### Direction Artistique D1 — "Beauté Incarnée à la Française" v2.0
**Position figée** : juste milieu entre anti-supermodel pur et Sézane esthétique classique. Belle ET vraie, pas miroir déprimant.

Application photo systématique :
- Lived-in skin texture preserved
- No retouching, no skin smoothing, no beauty filter
- Analog film grain
- Sous-tons rosés visibles sur peaux claires (anti-effet "Nosferatu / vampire")
- Rides naturelles, expression lines acceptées et valorisées
- Anti-supermodel ET anti-réalité crue
- **Test de validation** : *"Cette personne pourrait être l'égérie d'Emoi Emoi ?"*

### Particularités physiques — règle critique
> *"Présentes dans le casting, distribuées avec grâce. JAMAIS au centre du cadrage, JAMAIS sujet principal."*

**Test de validation** : si on décrit un shot par "inclusif" ou "militant" → shot raté. Premier mot attendu : "chaleureux", "vivant", "famille", "vraie vie".

Distribution actuelle :
- **Vitiligo** discret → MAN-S17 Césaria (lumière qui unifie, jamais accentué)
- **Canne** → MAN-S18 Hassan (cadrages "assis élégant" ou buste majoritaires)
- **Fauteuil** → MAN-S20 Coline (cadrages buste majoritaires, scènes quotidiennes non-thématisées)

### Couples LGBTQ+
> *"Le couple est un fait, pas un statement."*

DUO_LEA_SARAH : pas de démonstrations sexualisées, pas de baisers sur la bouche en packshot. Préférer complicité pudique, mains entrelacées, rires partagés. Baiser tempe/front autorisé ponctuellement.

### Cible cliente positionnement
- **Emoi Emoi × Make My Lemonade × Gamin Gamine**
- Pas Sézane pure (trop fantasme parisien sans diversité)
- Pas Aerie #AerieREAL militant
- Type : femme française CSP+ urbaine 30-50 ans, sensible et cultivée, exigeante sur la qualité sans snobisme. Offre des cadeaux qui durent.

### 4 piliers éditoriaux
- **P1 Process / Savoir-Faire** — atelier, broderie Tajima (contexte ultra-niche), métier
- **P2 Émotion** — lien, cadeau chargé de sens, transmission, présence
- **P3 Produit / Usage** — catalogue, configurateur, occasions de port
- **P4 Preuve** — témoignages, communauté, longévité

Sous-piliers P2 : Lien (couple, famille, amis), Souvenir (naissance, diplôme, étape), Présence (distance, expatrié, deuil).

### Pas d'urgentisme dans le ton
Pas de "vite", "dépêchez-vous", "dernières heures". Préférer sobriété et invitation calme.

### Diversité incarnée vs décorative (citation Sarah)
> *"Je ne veux pas une diversité décorative, je veux une diversité incarnée et précise."*

Chaque blanc·he doit avoir un type identifiable (méditerranéenne, rousse irlandaise, française brune, nordique blonde, etc.) — pas de "blanc·he générique".

### Pas de "carrousel qui claque" stop-scroll viral
> *"Une signature visuelle, pas un effet de mode."*

- Sézane / Maison Labiche / Emoi Emoi ne font JAMAIS du stop-scroll bruyant. Leur feed est calme, sobre, presque ennuyeux au scroll. Et ils performent en CA.
- Distinction critique : **soporifique** (générique, copy creux, photos jolies sans POV) ≠ **calme** (visuel pur, voix unique, POV affirmé, détail surprenant).
- Ypersoa = patte distinctive sobre, reconnaissable au premier coup d'œil sans voir le @.
- **Test** : *"Quand quelqu'un voit un carrousel Ypersoa dans son feed sans voir le @ypersoa, est-ce qu'il sait que c'est nous ?"*

### Charte template Le Club
- Nommer **"badge"** ou **"blason"** — JAMAIS "logo" (corporate) ni "écusson" (mauvais registre)
- Mentionner "solidaires" pour décrire l'unité cercle + symbole + textes (1 seule couleur fil)
- Ton autorisé : complice, inclusif, joueur, fédérateur, sobre
- Ton interdit : corporate, hallmark, publicitaire, exclusif_snob

### Charte motif Brigitte (registre minimaliste contemplatif)
- Mots-clés positifs : minimaliste, essentiel, intime, signé, sobre, élégant, discret, intemporel, silencieux, reconnaissance, lien, pudeur, évidence, épure
- **Override modèles** : regard hors champ pensif, JAMAIS regard direct caméra. Expression contemplative, pudique, émotion retenue. Sourire infime ou pas de sourire.
- **Test** : *"Cette personne pense à quelqu'un ou à quelque chose ?"* Si elle 'performe' pour la caméra → NON.
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
- Typographie : Josefin Sans (titres serif) + DM Sans (corps sans) + Cormorant Garamond italic (accent)

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

### Pattern prompt shooting validé (réutilisable 167 motifs)
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
7. **Négations explicites pour les décors parasites** : `NOT outdoor, NOT a cafe, NOT [ce qu'on ne veut pas]` — 1-3 max ciblées contre des défauts qu'on a effectivement vu sortir, pas préventives.
8. **Ambiance culturelle spécifiée** > description technique : `"effortless French-Caribbean elegance"` > `"soft lighting from left at f/2.8"`

### Suffixe universel D1 Beauté Incarnée (à appender à TOUS les prompts shooting)
```
Real humans with natural features, lived-in skin conserved, no retouching,
no skin smoothing, no beauty filter. Analog film grain, raw editorial feel.
```

### Anti-vampire (peaux très claires)
Ajouter explicitement : `healthy pink undertones`, `warm flush on cheeks and nose bridge`, `NOT pale, NOT sickly, NOT washed out`, `warm human presence, NOT cold, NOT clinical, NOT ethereal`.

### Méthode validation canonique (workflow)
- **Sarah = DA**, tranche le goût et le style
- **Claude = technique** du prompt
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

Si S02 plante → itérer prompt broderie avant d'aller plus loin.

### Workflow général
- **Tout part dans VSCode** : commits fréquents, un commit ≈ une étape verrouillée
- **Découpage en lots** : pour fichiers >15 KB, découper en 6 lots. Lot 1 = validation format (5 fiches), lots 2-5 = production, lot 6 = assemblage final + commit
- **Validation avant production de masse** : toujours présenter 5 exemples avant les 15 suivants
- **Réflexe "search before assume"** : consulter le référentiel officiel avant d'inventer (`palette_supports_par_produit.json`, `_mapping_legacy.json`, ypersoa.fr)
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

### Système de gestion documentaire CLAUDE.md
- **Patches incrémentaux** par session (5-10 min de prompt court "donne-moi UNIQUEMENT les nouveautés à ajouter") plutôt que régénération complète
- **Fusion en version Nx** (régénération propre intégrée dans les sections existantes) tous les 2-3 mois ou quand le doc devient incohérent
- **Passations courtes** dans `_passations/` pour les sessions techniques sans décisions structurantes
- **Récap 5-10 lignes en fin de toute session** ("fait / TODO / décisions / question ouverte")

### Carrousels — architecture hybride en 2 couches
- **Couche 1** : image générée (Gemini), aucun texte dans l'image
- **Couche 2** : overlay HTML/CSS/Canvas avec typo brand contrôlée (Josefin Sans + DM Sans), couleurs brand exactes
- Export PNG via `html2canvas` ou `dom-to-image`
- **Avantages** : typo parfaite, couleurs exactes, modifiable post-prod sans regénérer l'image, économie API massive, Maï peut éditer le texte sans toucher à la génération

### Stratégie volumétrie vs validation humaine
- Q39 (validation humaine systématique) + Q44 (30-50 packs/mois) entrent en tension
- **Résolution Phase 2** : validation par batch (un pack entier validé en bloc) plutôt que pièce par pièce. Délégation partielle à Maï quand elle aura un compte Hub (V2+).

---

## 4. CASTING ET RÉFÉRENTIELS FIGÉS

### Bibliothèque canonique — 23/23 validées (HEAD post-26/04)
Stockage : `assets/canoniques/MAN-XX_Prenom_canonique.jpg`

#### Principaux MAN-P01 à MAN-P12 (13 entrées car P11 = couple)
| ID | Prénom | Âge | Profil |
|---|---|---|---|
| MAN-P01 | Camille | 40 | Blanche française, châtain miel ondulé, freckles, mère vintage Caroline de Maigret |
| MAN-P02 | Anna | 35 | Blanche sud, brune wavy, peau olive, provençale Sessùn (v1.1) |
| MAN-P03 | Aïcha | 40 | Afro-caribéenne, afro court, sourire large, élégance parisienne-caribéenne |
| MAN-P04 | Lila | 45 | Maghrébine, cheveux noirs libres, parisienne sophistiquée Leïla Bekhti |
| MAN-P05 | Béatrice | 55 | Métisse, cheveux argentés, bourgeoise campagne normande |
| MAN-P06 | Mathieu | 40 | Blanc, barbe 3j, bruns dépeignés, papa sportwear chic |
| MAN-P07 | Nicolas | 45 | Blanc, poivre-sel, mari attentionné classique Octobre |
| MAN-P08 | Félicie | 7 | Blanche, blond vénitien, freckles denses, mini-vintage Bonpoint |
| MAN-P09 | Gabin | 5 | Blanc, cheveux noirs longs, mini-sportwear chic |
| MAN-P10 | Marie-Hélène | 65 | Blanche, rousse cuivrée + mèches argentées, Inès de la Fressange campagne |
| MAN-P11-LEA | Léa | 37 | Métisse boucles brunes, denim Canadian tuxedo (couple) |
| MAN-P11-SARAH | Sarah | 35 | Nordique pixel cut cendré, minimalisme nordique (couple, **v2 chaleureuse régénérée — à vérifier dans assets**) |
| MAN-P12 | Brune | 22 | Blanche, brune wavy, lèvres pulpeuses, beauty mark, ADN Damas (**v3 confirmée définitivement**) |

#### Secondaires MAN-S13 à MAN-S21 (10 entrées car S19 = couple)
| ID | Prénom | Âge | Profil |
|---|---|---|---|
| MAN-S13 | Priya | 16 | Sud-asiatique, cheveux lisses, ado sportwear |
| MAN-S14 | Gaspard | 23 | Blanc, cheveux bataille, skateur élégant archi |
| MAN-S15 | Bébé Noé | 1 | Blanc, body brodé Ypersoa |
| MAN-S16 | Hiroshi | 55 | Japonais, argenté, architecte minimaliste Yohji |
| MAN-S17 | Césaria | 40 | Afro-caribéenne, vitiligo discret, expression chaleureuse (**v2 validée 26/04**) |
| MAN-S18 | Hassan | 68 | Maghrébin, cheveux blancs, patriarche algérois Paris |
| MAN-S19-HENRI | Henri | 72 (visuel 80-85) | Blanc nordique, bourgeoisie rive gauche (**accepté définitivement**) |
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

### Rotation cyclique duos par pack — Q25
- **Suggérée** mais override possible : `parent_enfant → grand_parent_parent → adultes_amis → couple → retour parent_enfant`
- Sarah peut forcer un duo spécifique si le contexte le demande

### Familles 3+ personnes — Q26
- **3 canoniques simultanées** dans Nano Banana 2 = validé (à confirmer empiriquement Phase 2 sur cas réels)

### `style_wear` injection — Q27
- Injection dans les prompts EN **selon contexte du shot** : lifestyle = oui (style perso valorisé), ghost packshot = non (vêtement seul, pas de personnalité)

### 5 ambiances shooting officielles (axe 1/4 du système)
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

### 7 types de shots (axe 2/4)
1. Ghost packshot
2. Crop poitrine
3. Lifestyle studio
4. Lifestyle outdoor
5. Duo couple
6. Macro broderie
7. **Famille_vivante** (3+ personnes scène vivante — réservé aux motifs YPM-010 La Ronde, YPM-003 Le Club, YPM-004 Notre Héritage)

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

### Catalogue motifs YPM
- **17 motifs actuels figés Phase 1** : YPM-001 (La Brigitte) à YPM-017 (La Florale). Le Club est YPM-003.
- **150 motifs additionnels en collection** à digitaliser et adapter aux règles CLAUDE.md
- **Total cible à terme** : ~167 motifs

### Variantes Le Club golden validées
- `var_mama_club.json` (canon, hero famille 8 shots)
- `var_team_dog.json` (édito Patte, 6 shots — testé en session 24/04)
- `var_sista_club.json` (canon, sororité, 6 shots)

### Goldens — Q28
- Refaire **UNIQUEMENT** les shots qui n'atteignent pas le niveau cible (pas tous, pas zéro)
- Implique **système de scoring/validation par shot** dans les goldens (tag "validé golden" vs "à refaire")

### Pack golden validé — Q29
- **Export auto + filing** dans dossier motif : `motifs/YPM-018/shooting/fete_des_peres/` (ou autre catégorie)
- Zip nommé proprement : `YPM-018_pack_fete_des_peres_v1.zip`
- **Pas de prompts dans l'export** (restent en backend Hub)
- **Metadata oui** (variante, date, mannequins utilisés, type pack)
- **Pas de calibrage automatique** des futures générations sur ces goldens — logique "archive d'usage", pas "training data"

---

## 5. CIBLE CLIENTE ET RÉFÉRENCES VISUELLES

### Marques de référence stylistique (à utiliser dans les prompts EN, jamais dans le copywriting FR client)

**Premium parisien** : Sézane, A.P.C., Maison Labiche, Soeur, Octobre, Rouje
**Provençal méditerranéen** : Sessùn, Soeur (sub-line)
**Minimaliste éditorial** : The Row, Khaite, Totême, Arket, The Frankie Shop, Phoebe Philo Céline
**Streetwear premium** : Maison Kitsuné, AMI Paris, Polo Ralph Lauren (registre crest)
**Casual young** : AGOLDE, Citizens of Humanity, Make My Lemonade
**Outdoor élégant** : Hoalen, October
**Architecte minimaliste** : Yohji Yamamoto, CDG (Comme des Garçons), Lemaire
**Mode enfant** : Bonpoint × Petit Bateau, Amaia Kids, Gamin Gamine
**Brands inspiration** : Saint James, Stan Smith (papa sportwear chic)
**Hero brand references Ypersoa** : Émoï-Émoï × Make My Lemonade × Gamin Gamine

### Personnalités de référence casting (D1 Beauté Incarnée)

**Femmes adultes** : Jeanne Damas (lèvres pulpeuses, wavy hair, beauty marks — réf Brune), Caroline de Maigret (vintage français brut — réf Camille), Lou Doillon (décontractée période jeune), Clémentine Desseaux (élégance afro-caribéenne), Tina Kunakey (élégance jeune), Adèle Farine (sobriété intemporelle), Mélodie Vaxelaire (denim couple — réf Coline), Louise Follain (couple aesthetic), Inès de la Fressange (intemporelle — réf Marie-Hélène + Césaria), Leïla Bekhti (élégance maghrébine — réf Lila), Carla Bruni, Vanessa Seward (bourgeoise campagne — réf Béatrice), Tina Knowles, Diahann Carroll (réf Joséphine senior), Phoebe Philo (Céline jeune vibe), Thylane Blondeau civile (Gen Z créative — réf Brune)

**Femmes pop référence ado/jeune** : Prune Pauchet, Lena Simonne, Mariacarla Boscono (modèles Sézane)

### Imagerie de référence ambiance
- **Vogue Living editorial** — pour Loft Organique
- **Vogue Arabia body-positivism** — pour Césaria
- **Films Claude Sautet** — pour ambiance enfant Lila
- **Photos de classe années 70** — pour registre Lila
- **A.P.C. campaign aesthetic** + **Maison Labiche lookbook style** — pour packshots et lifestyle studio

### Cibles clientes par variante
- **Mama Club** : 30-55 ans (acheteuse mère), 25-45 (offreur enfant adulte/conjoint). Anti-bibi-kitsch. Premium accessible.
- **Sista Club** : 22-40 ans, 98% féminin. 3 sous-cibles : EVJF, best friends, sœurs réelles. Sororité moderne sans pathos. Anti-girlboss caricaturale. Esthétique IG soft-girl / clean-girl.
- **Team Dog** : 25-45 ans, mixte (55% féminin). Urbain CSP+. "Parent de chien" sobre. Anti-empreintes colorées criardes.

---

## 6. PIÈGES ET ANTI-PATTERNS (apprentissages négatifs)

### Sur le copywriting brand-safe

**BUG CRITIQUE — outil "Atelier Social" actuel (`gemini.ts` ligne ~30)** : le prompt système contient *"L'ADN de la marque est émotionnel, **artisanal**, unique et chaleureux"*. Conséquence : l'outil sort du copy "broderies artisanales par le fil et l'aiguille" qui contredit toute la charte brand. **À corriger d'urgence avant prochaine génération.**

**Anti-pattern "Etsy 2018" dans les captions** : décalage entre visuels premium (au top) et copy kitsch ("écrin de douceur", "Maman d'amour entre guillemets", vouvoiement, "#artisanatfrançais"). Sape complètement le positionnement premium.

**Anti-pattern "carrousel qui claque" stop-scroll viral** : Sézane / Maison Labiche / Emoi Emoi font calme et sobre, jamais bruyant. Vouloir "claquer" sur Insta = attirer un public engagement qui ne convertit pas + repousser la cible CSP+ qui veut du repos visuel. Distinction critique soporifique vs calme : viser le **distinctif sobre brand**, pas le viral.

### Sur le prompting Nano Banana 2

**Hex codes dans les prompts** → Nano Banana crispe sur la précision colorimétrique, perd le mood, décor devient générique studio. **Leçon** : pas de hex, ou hex + description naturelle. Hex code OK pour le fond canonique, jamais pour le shooting.

**Codes produit YP001 / YP005 dans les prompts** → bruit, Nano Banana ne comprend pas. **Leçon** : garder dans le JSON metadata, jamais dans le prompt EN. Décrire par nature.

**Sur-spécification "NOT X" préventive** → multiplier les négations défensives → Nano Banana défocalise du sujet, ambiance ratée. **Leçon** : 1-3 négations max, ciblées contre des défauts vus, pas préventives.

**Refs marques niche en bloc** (Hoalen + October + Maison Labiche + Soeur + Colorful Standard + Emoi Emoi + Make My Lemonade + Sessùn dans un seul prompt) → tokens bruités, dilution du style. **Leçon** : 3 refs marques max. Sézane + APC + Maison Labiche pivot, +1 niche selon contexte.

**"camel leash"** → ambiguïté avec l'animal chameau, parfois Nano Banana sort un chameau. **Leçon** : `caramel-tan leather leash` ou `tan leather leash`.

**Décors trop génériques** (`apartment`, `park`) → écart qualitatif visible vs Mama Club shots avec décors nommés. **Leçon** : décor architectural et nommé : `Parisian apartment with sage green paneled wall`, `Tuileries park lined with tall trees`.

**`head on her lap` pour gros chien** → physiquement peu crédible (golden 30kg). **Leçon** : `head resting against her thigh`.

### Sur les canoniques

**Canonique avec contexte parasitaire** (1ère série Camille en village provençal, Mathieu jardin avec roses, Marie-Hélène "Café du Marais") → Nano Banana ramène ces éléments dans les shootings ultérieurs. **Leçon** : canonique = fond neutre `#F5F0EA` + t-shirt gris chiné + ZÉRO décor + ZÉRO contexte. STRICTEMENT.

**Cheveux attachés / coiffés** (Anna v1 chignon, Lila v1 cheveux tirés, Coline v1 cheveux plaqués) → toutes les générations futures héritent de la coiffure narrative. **Leçon** : cheveux toujours libres dans canonique, négations triplées (`NOT tied, NOT in a bun, NOT slicked back`).

**Expression neutre/fermée** (Lila v1 "tire la tronche", Coline v1 "photo d'identité judiciaire", Césaria v1 sévère) → image inutilisable. **Leçon** : micro-sourire + sous-tons rosés visibles + warm gaze. Pas juste "calm composed" qui glisse vers le froid. Mieux légèrement trop souriante que légèrement trop neutre.

**Effet "Nosferatu / vampire" sur peaux très claires** (Sarah v1 nordique froide / cadavérique avec "ash-blonde + pale blue eyes + very fair clear skin + serene composed expression") → surcharger la pâleur tire vers le surnaturel. **Leçon** : ajouter explicitement `healthy pink undertones`, `warm flush on cheeks and nose bridge`, `subtle freckles or light sun marks`, `rose-tinted lips`, `warm human presence, NOT cold, NOT clinical, NOT ethereal`.

**"Mannequin agence générique" pour fortes personnalités** (Brune v1 "quelconque") → Nano Banana sort un visage joli-banal sans signature. **Leçon** : pour les personnalités fortes (Brune, Coline), donner refs culturelles ultra-précises (`Jeanne Damas in her early twenties`, `young Lou Doillon`, `Thylane Blondeau civilian casual`) + signatures physiques précises.

**Tokens "Canon 85mm f/2.8 portrait lens" + "editorial commercial photography" pour canoniques** → activent le réflexe "photo magazine avec décor narratif" chez Nano Banana. **Leçon** : pour canonique neutre, remplacer par `Studio reference portrait — neutral, clean, isolated subject on empty background`.

### Sur l'architecture et le workflow

**JSON 500 lignes pour briefer un shooting** (var_team_dog 8 modules) → engine surchargé, prompt EN technique, output un cran sous le niveau cible. **Leçon** : JSON = source de vérité DATA structurée. Prompt EN = récit littéraire dense court. Engine = traducteur intelligent entre les deux.

**Architecture avant exemples** → tentation Phase 2 : "setup hub/, types TS partagés, helper API" avant 3 variantes manuelles. **Leçon** : 2-3 exemples manuels AVANT d'automatiser. Règle "automatise quand tu l'as fait 3 fois".

**Variante = nouveau YPM** → tentation : chaque MAMA / SISTA / BRIDE TEAM = nouveau code YPM-xxx. **Réalité** : explosion volumétrique (Le Club seul aurait 20+ YPM-xxx fictifs). **Leçon** : Option B (variante = surcouche d'un template parent) verrouillée.

**PDP Shopify dédiée par variante éditoriale** → tentation : créer une PDP "Papi Gâteau", "Tata Cool". **Réalité** : explosion catalogue. **Leçon** : 5 PDP canoniques + landing pages "inspirations" hybrides.

**Indexer 408 shots statiques** → tentation initiale : `plan_shooting_systematique.json` comme référentiel exhaustif. **Vraie ambition** : moteur génératif. **Leçon** : ne pas confondre référentiel statique et moteur de génération.

**Texte généré DANS l'image par Gemini (overlay)** → hallucinations typographiques systématiques, accents qui sautent, couleurs dérivantes, placement imprévisible. Sur 10 générations, 7-8 à jeter. **Leçon** : architecture hybride 2 couches — image pure (Gemini) + overlay HTML/CSS/Canvas avec typo brand contrôlée.

**Buffer J-30 pour campagnes saisonnières** → ne laisse que 15j de campagne active, impossible de monter une vraie séquence éditoriale. **Leçon** : J-45 minimum.

**Confondre date événement et deadline livraison** (erreur Claude session 27/04) → roadmap calculée sur "55 jours jusqu'à Fête des Pères" en oubliant que la livraison c'est J-45 AVANT, pas la fête elle-même. **Leçon** : toujours raisonner en J-45 livraison, pas date événement.

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

### Sur les sessions et la gestion d'énergie

**Sessions qui débordent** (1h30 → 3h, voire 6h+) → nuit courte, fatigue, qualité décisionnelle dégradée. **Leçon** : timer dur, commit à mi-chemin, refus de Claude quand le timer dépasse.

**Question stratégique posée à 1h du matin** (mannequins récurrents, anti-supermodel vs Sézane) → Claude doit dire "on note l'idée, on traite demain à tête reposée".

**Vouloir tout finir en une session** → "encore 30 min", "encore 20 min". **Leçon** : refuser fermement quand le timer est dépassé, même si Sarah pousse.

### Sur les recommandations Claude trop ambitieuses

**Roadmap 8 semaines pour Phase 2 livré à Fête des Pères** → impossible avec les contraintes Sarah (data analyst La Redoute en parallèle + Phenix Group + perso). **Leçon Claude** : toujours vérifier avec Sarah son temps disponible réel **avant** de proposer une roadmap, pas après.

### Sur les secrets

**BUG critique — clé OpenAI hardcodée dans `archives/ypersoa_content_os_v3.html`** → bloqué par GitHub Push Protection au premier push. **Leçon** : `.gitignore` sérieux dès le début (`.env`, `secrets/`, `**/api_keys.json`). Toujours utiliser variables d'environnement, jamais hardcoder.

**PAT collé en clair dans une conversation Claude** → considérer compromis, révoquer immédiatement. **Leçon** : les secrets restent dans le Keychain / gestionnaire de mots de passe / `.env`. Jamais dans un chat, même privé.

---

## 7. QUESTIONS OUVERTES NON TRANCHÉES

### Stratégique
- **Casting direction (anti-supermodel vs Sézane vs juste milieu)** — D1 Beauté Incarnée v2.0 a été posée comme position centrale, mais le débat conceptuel n'a jamais été tranché formellement par écrit. Position de fait : v2.0. À reconfirmer si Sarah veut faire évoluer le casting un jour.
- **Phase 6 agentic (Hub pilote tout seul)** — Q46 non tranchée, on verra à l'usage post-V1.

### Workflow Maï / SharePoint
- **Microsoft Graph API ou WebDAV** pour l'upload auto Hub → SharePoint (à trancher Phase 2)
- **Notification Maï** : email, Teams, Slack ? (à trancher Phase 2)
- **Compte Hub pour Maï V2+** : accès limité à quoi exactement ? (à reposer en V2)

### Multi-langue
- **Ordre exact 2027** : EN d'abord obligatoire, puis priorité DE / NL / ES / IT / BE / LU à trancher selon performance EN
- **Architecture i18n technique** : next-intl ou next-i18next (à trancher au bootstrap Phase 2)

### Volumétrie vs validation humaine
- Q39 (validation humaine systématique) + Q44 (30-50 packs/mois) en tension. Résolution probable : validation par batch, pas par pièce. À tester en conditions réelles Phase 2.

### Stratégie hashtags + métriques
- **Storage perfs RS dans DB Hub** : Supabase ? Postgres direct ? (à trancher Phase 2)
- **Cron job métriques** : fréquence (quotidien ? hebdo ?), provider (Insta Graph API / TikTok Display API)
- **Algo de scoring** hashtags : pondération exacte à définir selon premiers retours data (V2+)

### Carrousels
- **Politique flat lay** : intégré dans les 5 templates ou exclu définitivement ? Décision implicite "filler carrousel uniquement" mais pas formalisée

### Marketing saisonnier
- **Campagnes spécifiques** au-delà de Mama/Papa/Noël : EVJF/mariage été, grands-parents, naissance, rentrée, Halloween, Black Friday — tous activés mais pas de planning détaillé
- **Capsules édition limitée** : combien d'exemplaires limites ? Quand activer ? (à tester sur premier cas Phase 2)

### Produit / Référentiels
- **Nettoyer `gris` et `vert_olive`** de `palette_supports_vetements.json` (indispo aucun produit) — alerté mais non fait
- **Audit archi Shopify réelle** pour figer thématiques canoniques modulaires (Q12) — toujours à faire en début Phase 2
- **Couleurs disponibles par produit non auditées sur écarts B&C** (Lake Blue, Teal sur YP019)
- **Profilage des 17 motifs en archétypes narratifs** — proposition de 5 archétypes (Contemplatif intime / Déclaration amoureuse / Famille quotidienne / Transmission-héritage / Célébration-saisonnier) non validée par Sarah

### Réconciliations en attente
- **Vérifier que `MAN-P11-Sarah_canonique.jpg` est bien la v2 chaleureuse** régénérée (à checker visuellement dans le repo)
- **Brigitte v2** : ajouter `direction_modeles_override` (regard hors champ pensif) + corriger mention "Tajima TMEZ" → "brodé à la commande" + remplacer description vague mannequins par IDs (MAN-P01, MAN-P02, MAN-P10)
- **`suggestions_shopify_canoniques mot_bas`** Le Club — Claude avait inventé `["CLUB", "TEAM", "FAMILY", "2024", "FOREVER"]`, le Liquid n'a que `"2024"`. À valider par Sarah.
- **Référentiel `regles_combinaisons_shooting.json`** — référencé par Brigitte mais structure exacte pas figée
- **Mannequins-types pour shooting Brigitte** — pas validé spécifiquement quels IDs

### UI / UX Phase 2
- **Décision UX différenciation canonique vs éditoriale** dans l'UI (Q30 — toujours à trancher en design Phase 2 : tag visuel, sections différentes, modules différents activés, ou tout combiné)

### Architecture post-V1
- **Schema variante** : structuré 8 modules pour V1, peut-être minimaliste après V1 selon retour usage (Q48)
- **SaaS multi-tenant** : architecture Phase 2 pensée multi-tenant-ready, mais structure exacte (qui gère les tenants ? authentification ? séparation data ?) — à concevoir avant le SaaS launch

### Outil "Atelier Social" actuel
- **Fix `gemini.ts`** — virer "artisanal", aligner avec CLAUDE.md, tutoiement, ton Emoi Emoi. URGENT avant Fête des Pères.

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
- "Brodé à la commande dans notre atelier de Wattrelos"
- "Brodé à la demande, dans le Nord"
- "Un cadeau qui dure" / "Un cadeau chargé de sens"
- Pas de "fait main" / "artisanal" / "Etsy" / "par le fil et l'aiguille"
- ⚠️ "Brodé sur métier Tajima" UNIQUEMENT en contexte article blog atelier ou vidéo process — JAMAIS en copy PDP, captions IG, hooks ou tagline

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

> *"Le Hub ne remplace pas le produit, le stock, la broderie. Il ne remplace pas Adriana et la production. Il remplace les 14 métiers cités de la communication."*

> *"Cinematic pour mes hero banners, instamatic pour mes posts insta."*

> *"Une signature visuelle, pas un effet de mode."*

> *"On doit publier un mois avant la fête des pères minimum donc maintenant."* (recadrage J-45 vs date événement)

> *"J'ai déjà mes posts prêts pour la fête des mères. Donc pas de sujet. Focus fête des pères maintenant."*

> *"Bah non. On intègre dans le hub. C'est l'objectif. Intégrer ce qui marche avec la pâte Ypersoa."*

> *"J'ai encore 150 motifs en collection que je dois shooter et adapter à l'image Claude.md."*

### Tests de validation
- **D1 Beauté Incarnée** : *"Cette personne pourrait être l'égérie d'Emoi Emoi ?"*
- **Famille_vivante** : *"Si on décrit le shot par 'photo inclusive' → raté. Le shot doit se lire 'joie familiale du dimanche' en premier, 'famille mixed-heritage' en observation secondaire."*
- **Brigitte contemplatif** : *"Cette personne pense à quelqu'un ou à quelque chose ?"*
- **Carrousel signature Ypersoa** : *"Quand quelqu'un voit un carrousel Ypersoa dans son feed sans voir le @ypersoa, est-ce qu'il sait que c'est nous ?"*

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

## ANNEXE A — 50 RÉPONSES QCM (traçabilité décisions Phase 2)

### Batch 1 — Architecture & Workflow (Q1-Q10)

| Q | Question | Réponse Sarah |
|---|---|---|
| Q1 | Stack Phase 2 | **A** — Next.js + TS + Tailwind + pnpm validé |
| Q2 | API génération images | **A ou C** — Gemini par défaut, Claude pour copy/brief |
| Q3 | Mannequins favoris dropdown UI | **B + accès rapide** — 5 favoris étoilés, autres accessibles |
| Q4 | Format brief d'entrée variante | **A** — Upload PNG, app détecte template parent automatiquement |
| Q5 | Sortie pack shooting | **6 images mini + regen partielle critique** — slot regen par image |
| Q6 | Workflow Adriana | **B** — PDF/email manuel, pas d'app dédiée |
| Q7 | Nouveau motif workflow | **Fiche template IA + auto-variantes 5 canoniques** |
| Q8 | Budget API | **D** — Pas de limite, on suit la facture |
| Q9 | Multi-langue | **A puis C** — FR 2026, +EN 2027, +DE/NL/ES/IT/BE/PT 2027+ |
| Q10 | Hub accessible depuis | **C** — Web + login multi-device |

### Batch 2 — Phase 2 UX & Génération (Q11-Q20)

| Q | Question | Réponse Sarah |
|---|---|---|
| Q11 | IA fiche template Shopify | **B** — 3 versions à choisir |
| Q12 | Thématiques canoniques | **B + dépend Shopify** — modulaires, mapping archi Shopify |
| Q13 | Style pack/génération | **A + revenir dessus** — 1 style/génération, override post-prod |
| Q14 | Régénération shot | **B** — Même prompt, nouveau seed |
| Q15 | Historique générations | **❤️ favoris + fallback 5 derniers + apprentissage modèle** |
| Q16 | UI mannequins | **D** — Badge visible + switch dropdown |
| Q17 | Brief Adriana contenu | **D** — Tout (specs + PNG + 6 packshots + metadata) |
| Q18 | Push Shopify | **C** — API direct mais en BROUILLON, validation manuelle |
| Q19 | Variantes éditoriales hub | **C** — Workflow complet + landing page redirection PDP |
| Q20 | IA copywriter mode | **C** — 2 modes : strict PDP/SEO, créatif hooks/captions |

### Batch 3 — Casting & Goldens (Q21-Q30)

| Q | Question | Réponse Sarah |
|---|---|---|
| Q21 | Brune v2 vs v3 | **A** — v3 ADN Damas confirmée |
| Q22 | Henri 80-85 ans | **A** — Accepté définitivement |
| Q23 | Sarah couple expression | **A — déjà régénérée plus vivante** — v2 chaleureuse OK |
| Q24 | Casting 23 manquant | **C** — Suffit, ajout possible plus tard |
| Q25 | Rotation duos | **B** — Suggérée mais override possible |
| Q26 | Familles 3+ canoniques | **A** — Validée |
| Q27 | `style_wear` injection | **C** — Selon contexte (lifestyle oui, ghost non) |
| Q28 | Goldens existants à refaire | **C** — Uniquement shots qui n'atteignent pas niveau cible |
| Q29 | Pack golden validé déclenche | **Export auto + filing dossier motif, PAS calibrage futur** |
| Q30 | Différenciation canonique vs éditoriale UI | **À TRANCHER en design Phase 2** |

### Batch 4 — Production contenus secondaires (Q31-Q40)

| Q | Question | Réponse Sarah |
|---|---|---|
| Q31 | Carrousel IG texte overlay | **A + C** — Overlay auto par template + toggle on/off |
| Q32 | Reel 20s | **A + cinematic existant à porter** — distinction cinematic vs instamatic |
| Q33 | Posts récurrents cadence | **D** — Calendrier saisonnier dicte |
| Q34 | Hooks éditoriaux | **A + C** — 5 hooks/variante + banque par registre |
| Q35 | Sondages stories | **A** — 3-5 sondages prêts par variante |
| Q36 | Tags RS multi-plateforme | **B** — Hashtags dynamiques avec apprentissage |
| Q37 | Calendrier éditorial | **Planning auto dans calendrier visuel** |
| Q38 | Métriques RS | **B** — API Insta/TikTok pour récup auto + apprentissage |
| Q39 | IA contenus émotionnels | **C + D** — 2 modes (créatif → polissage) + validation humaine |
| Q40 | Maï rôle Hub | **A puis SharePoint canal Hub → Maï, accès Hub plus tard** |

### Batch 5 — Marketing saisonnier, scaling & vision long-terme (Q41-Q50)

| Q | Question | Réponse Sarah |
|---|---|---|
| Q41 | Calendrier saisonnier | **D** — Auto-détection complète calendrier français |
| Q42 | Capsules édition limitée | **A** — Format spécifique (deadline + scarcity) |
| Q43 | Multi-langue priorisation | **B + C + D + EN 2026/27** — EN d'abord, puis DE/NL/ES/IT/BE/LU |
| Q44 | Volumétrie packs/mois | **C** — 30-50 packs/mois (rythme industriel) |
| Q45 | Budget API mensuel | **D** — Pas de plafond, on suit la facture |
| Q46 | Hub agentic Phase 6 | **D** — Pas tranché, on verra à l'usage |
| Q47 | Roadmap motifs futurs | **150 motifs en collection à shooter et adapter CLAUDE.md** |
| Q48 | Format JSON variante | **A pour l'instant, peut-être minimaliste après V1** |
| Q49 | Résilience Hub sans Maï/Adriana | **A** — Hub doit pouvoir tourner sans elles (partie contenu) |
| Q50 | Vision Hub post-V1 | **B mais d'abord D** — SaaS à terme, focus Ypersoa d'abord |

---

## 🚀 PROMPT DE REPRISE DE SESSION

Pour ouvrir une nouvelle conversation Claude sur le Hub Ypersoa, copie-colle ces 3 lignes :

> Claude, on reprend Hub Ypersoa. Lis `CLAUDE.md` à la racine du repo + la dernière passation dans `_passations/`. On attaque [PHASE 2 / Césaria / autre]. Tu confirmes ce point de départ ?

---

## 📋 ÉTAT DES PHASES (au 27/04/2026)

| Phase | Statut | Description |
|---|---|---|
| Phase 1 — Hub référentiels | ✅ BOUCLÉE | Casting 23, ambiances, types shots, schéma variante, axes Shopify, 3 goldens Le Club |
| Phase 1.5 — Bibliothèque canonique | ✅ BOUCLÉE | 23 canoniques validées, méthode shooting validée empiriquement |
| Phase 1.6 — GitHub + sécurité | ✅ BOUCLÉE | Push GitHub privé, historique nettoyé, identité Git configurée |
| Phase 1.7 — CLAUDE.md v1.1 | ✅ BOUCLÉE | 50 QCM répondues, fichier maître complet et fusionné |
| Phase 2 — Ypersoa Studio v2 | 🔜 NEXT | Mono-repo Next.js + 5 templates carrousel + canoniques + cinematic/instamatic |
| Phase 3 — Moteurs RS | 🔜 PLUS TARD | Reel + posts + hooks + sondages + tags |
| Phase 4 — Copywriter Shopify | 🔜 PLUS TARD | Engine fiche PDP complète |
| Phase 5 — Marketing saisonnier | 🔜 PLUS TARD | Calendrier campagnes annuel auto-détection FR |
| Phase 6 — Orchestrateur | 🔜 FINAL | hub.ts : input PNG → variantes → orchestrate engines |

**Cible Hub V1** : **Noël 2026** (deadline J-45 = 11 novembre, ~6 mois de runway).
**Bonus** : rentrée 1er septembre si Hub prêt avant.
**Test grandeur nature avant V1** : Fête des Pères 21 juin avec outil Atelier Social actuel après fix `gemini.ts`.

---

*Fichier maître Hub Ypersoa. Version 1.1 du 27/04/2026 — fusion propre des sessions 20-27 avril.*
*À mettre à jour après chaque session qui ajoute une décision durable, un acquis méthodologique, un casting, une règle.*
