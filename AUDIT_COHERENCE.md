# Audit de cohérence — Hub ↔ Livre ↔ Guide d'utilisation

> Lecture seule. Aucune modification de code. Chaque constat cite un fichier (et une ligne quand c'est pertinent). Ce qui n'a pas pu être vérifié par la lecture est marqué **À vérifier manuellement**.
> Date de l'audit : 26 août 2026.

---

## 1. Synthèse

**Score : 58/100.** Le Hub fonctionne : les fonctionnalités existantes tournent, et là où le Guide documente une fiche, il le fait bien (gabarit à 6 blocs, exemples concrets, limites honnêtes). Le problème n'est pas la qualité de ce qui est écrit — c'est que **le Guide décrit un Hub qui n'existe plus**. Une refonte de navigation du 20-21/08/2026 (« chrome v2 », commits `14640c2` et `8a15296`) a remplacé les 6 ateliers historiques par une nouvelle barre latérale à 5 ateliers (Social, **Blog**, **Planning**, **Studio**, **Bibliothèque**) + 2 référentiels (Atelier DA, Atelier Production) + Le Livre en pied de page. Le Guide (`guide-content.ts`) n'a pas suivi.

**Les 3 écarts les plus graves :**
1. **Cinq entrées de navigation permanentes sont invisibles dans le Guide** : Blog (rituel hebdo « article du jeudi »), Planning (tempo hebdo 3 équipes), Studio (hub Shooting/Lookbook/Shooting Book/Studio Mood), Bibliothèque (hub visuels/motifs/produits/packs), et **Le Livre** lui-même — présent dans le pied de la barre latérale de chaque utilisateur, jamais mentionné dans le mode d'emploi.
2. **Le Guide donne des instructions de navigation mortes** : « Ouvre Atelier DA, puis la carte Blog / Shooting Book / Studio Mood » — ces cartes n'existent plus sur l'accueil Atelier DA (elles ne sont plus que des redirections techniques vers les nouvelles pages).
3. **Deux fonctions de génération de contenu entières (Histoire = Connexion/Preuve/Communauté, et Reel) n'ont aucune fiche** alors qu'elles sont un mode à part entière de l'Atelier Social (`/social?mode=histoire`, `/social?mode=reel`).

**Verdict : NO-GO en l'état pour une diffusion du Guide comme unique référence utilisateurs.** Le produit est plus riche et plus utilisable que ce que le Guide promet — ce n'est pas une régression produit, c'est une dette documentaire concentrée sur une seule refonte récente, corrigible en une session ciblée sur `guide-content.ts`.

---

## 2. Scorecard

| Bloc | /20 | Justification |
|---|---|---|
| **1. Opérationnalité** | 15 | La quasi-totalité des fonctionnalités recensées tournent réellement ; les redirections de la refonte de nav fonctionnent techniquement. Déduit pour : dépendance fragile aux iframes Shooting/Lookbook, 3 routes de génération de copy dupliquant `checkBrandSafety` sans le contrôle de cran (dette déjà connue), planning multi-commandes non global (V2 assumé). |
| **2. Utilisabilité** | 11 | Chaque fiche existante est claire pour une non-technicienne. Mais suivre le Guide au pied de la lettre mène à des impasses (cartes disparues) et cinq espaces entiers du produit ne sont accessibles qu'en cliquant au hasard dans la barre latérale. |
| **3. Couverture documentaire (connu)** | 6 | Le bloc le plus faible : 5 ateliers de premier niveau + 1 lien pied de page + 2 modes de génération sont des fantômes purs (Type A) pour un lecteur du Guide. |
| **4. Profondeur documentaire (détaillé)** | 12 | Ce qui est documenté est détaillé et actionnable (gabarit 6 blocs systématique). Mais plusieurs fiches existantes donnent un how-to obsolète (chemin de clics mort), ce qui est pire qu'une absence — l'utilisatrice suit une instruction fausse. |
| **5. Conformité normative au Livre** | 14 | Palette, typo et vocabulaire brand-safe sont bien câblés côté génération pilotée par `brand-rules.ts`/Le Livre. Mais 3 générateurs (avis, connexion, generate-copy) gardent une copie locale non synchronisée du contrôle brand-safety (dette déjà auto-documentée par Le Livre §9, vérifiée ici dans le code), une constante de code contredit le nouveau système de piliers, et l'ancien nom « Cercle » survit comme URL réelle dans le contenu généré. |
| **TOTAL** | **58/100** | |

---

## 3. Top P0 — à traiter dans cet ordre

1. **Mettre à jour `guide-content.ts` pour refléter la nav du 20-21/08/2026** : ajouter 5 sections/fiches (Blog, Planning, Studio, Bibliothèque, Le Livre) et corriger les chemins de clic vers Studio Mood, Shooting Book, Blog qui pointent vers des cartes Atelier DA disparues. *(Sans ça, tout le reste de ce rapport est cosmétique — c'est le seul écart qui bloque réellement une utilisatrice.)*
2. **Documenter les modes Histoire et Reel de l'Atelier Social** (`/social?mode=histoire`, `/social?mode=reel`) — actuellement zéro fiche pour une fonctionnalité de génération de contenu à part entière.
3. **Corriger le lien `/pages/cercle`** dans `apps/atelier-social/src/app/blog/page.tsx:90` (et son exemple `apps/atelier-blog/exemple-brief-P0.json:26`) vers le vrai slug Shopify du Club Ypersoa — chaque article de blog généré pousse ce lien mort/obsolète en prod.
4. **Aligner `EDITORIAL_PILLARS` dans `brand-rules.ts:201-206`** sur la nomenclature à 6 piliers du Livre §6 (Connexion/Réassurance/Qualification/Preuve/Occasions/Communauté), ou supprimer la constante si plus rien ne la consomme — dans l'état, le code contredit littéralement l'avertissement du Livre sur le piège de nom « Preuve ».
5. **Consolider `checkBrandSafety()`** dans `avis/generate`, `connexion/generate`, `generate-copy` pour importer `lib/brand-rules.ts` au lieu de leur copie locale — dette déjà identifiée par Le Livre lui-même (§9), confirmée ligne à ligne dans le code de cet audit.

---

## 4. Matrice d'écarts complète

| ID | Type | Module | Fonctionnalité | Preuve code | Preuve guide | Constat | Correctif | Priorité |
|---|---|---|---|---|---|---|---|---|
| E01 | A | Navigation globale | Barre latérale « Les ateliers » (Social/Blog/Planning/Studio/Bibliothèque) + « Référentiels » (Atelier DA/Atelier Production) | `apps/atelier-social/src/components/HubSidebar.tsx:42-53` | `guide-content.ts` GUIDE_INTRO + sections 1-8 (structure « 6 ateliers » : Social, Shooting, Lookbook, Atelier DA, Atelier Trends, Atelier Production) | Le Guide décrit une barre latérale qui n'existe plus depuis le 21/08/2026 | Réécrire GUIDE_INTRO et la table des sections sur les 5+2 ateliers réels | P0 |
| E02 | A | Blog | `/blog` — rituel hebdo « Article du jeudi » (brief mercredi soir → publication jeudi, streak « jeudis tenus ») | `apps/atelier-social/src/app/blog/page.tsx` (hero, footer rituel) ; `apps/atelier-social/src/app/page.tsx:102,198,201` (Pulse cards accueil) | Aucune fiche « Blog » de premier niveau ; seule `da-blog` (guide-content.ts:898-922) décrit un accès via « Atelier DA, carte Blog » | Fonctionnalité vivante et quotidienne, invisible du Guide | Nouvelle section « Blog » niveau 1 dans le Guide | P0 |
| E03 | B | Blog | Chemin de navigation « Atelier DA → carte Blog » | `apps/atelier-social/src/app/atelier-da/blog/page.tsx` = redirection pure vers `/blog` ; `atelier-da/page.tsx:1-9` confirme « Atelier Blog est passé atelier de premier niveau » (plus de carte) | `guide-content.ts:904` : « Ouvre Atelier DA, puis la carte "Blog" » | Instruction de clic morte : la carte n'existe plus | Remplacer par le chemin réel (barre latérale → Blog) | P0 |
| E04 | A | Planning | `/planning` — tempo hebdo (3 priorités max par équipe créa/prod/comm, brief de Maï, alerte rentrée) | `apps/atelier-social/src/app/planning/page.tsx` | Guide ne documente que `planning-commun` = `/atelier-da/planning` (rétroplanning 2027) | Deux outils "Planning" coexistent dans la nav réelle ; un seul documenté | Ajouter la fiche `/planning` et clarifier la distinction dans le Guide (comme il le fait déjà pour planning machines vs rétroplanning) | P0 |
| E05 | A | Studio | `/studio` — hub consolidant Shooting / Lookbook / Shooting Book / Studio Mood en 4 « parcours » | `apps/atelier-social/src/app/studio/page.tsx` | Guide documente ces 4 briques comme dispersées : Shooting/Lookbook en items de barre latérale directs, Shooting Book et Studio Mood en cartes Atelier DA | La porte d'entrée réelle (Studio) n'est décrite nulle part | Nouvelle section « Studio » regroupant les 4 fiches existantes sous le bon point d'entrée | P0 |
| E06 | B | Studio | Chemins « Atelier DA → carte Shooting Book / Studio Mood brodé » | `atelier-da/shooting-book/page.tsx` et `atelier-da/studio-mood/page.tsx` = redirections pures vers `/studio/shooting-book` et `/studio/studio-mood` | `guide-content.ts:679,879` : « Ouvre Atelier DA, puis la carte "Shooting Book" / "Studio Mood brodé" » | Mêmes cartes disparues qu'E03 | Corriger les 2 chemins vers Studio | P0 |
| E07 | A | Bibliothèque | `/bibliotheque` — hub consolidant visuels, motifs, produits, packs, articles (fusion Référentiel + Médiathèque + packs, 21/08/2026) | `apps/atelier-social/src/app/bibliotheque/page.tsx` (redirige `/bibliotheque/visuels`), `apps/atelier-social/src/app/referentiel/page.tsx` (redirige vers `/bibliotheque/produits`) | Guide ne connaît qu'une « Bibliothèque » = tiroir de packs dans l'en-tête Social (`social-bibliotheque`), et une « Médiathèque » séparée sous Atelier DA (`da-mediatheque`) | Le point d'entrée réel, plus large, n'est pas documenté ; l'ancienne description (tiroir) est partiellement obsolète | Nouvelle section « Bibliothèque » niveau 1, fusionnant/actualisant `social-bibliotheque` + `da-mediatheque` | P0 |
| E08 | A | Le Livre | `/le-livre` — rendu Hub du brand book (Identité/Visuel/Playbook/Mood), lien permanent en pied de barre latérale | `apps/atelier-social/src/components/HubSidebar.tsx:134` ; `apps/atelier-social/src/app/le-livre/page.tsx` | Aucune mention dans `guide-content.ts` | Un lien visible sur chaque écran, jamais expliqué à l'utilisatrice | Ajouter une fiche « Le Livre » (à quoi ça sert : vérifier voix/couleurs/piliers avant de publier) | P0 |
| E09 | A | Atelier Social | Mode `histoire` — générateur 3 piliers Connexion/Preuve/Communauté + Reels (`/social?mode=histoire`) | `apps/atelier-social/src/app/social/page.tsx:8,32` + `components/social/workspaces/HistoireWorkspace.tsx` | Aucune fiche | Fonctionnalité de génération de contenu à part entière, invisible | Nouvelle fiche `social-histoire` | P0 |
| E10 | A | Atelier Social | Mode `reel` — script Reel (`/social?mode=reel`) | `apps/atelier-social/src/app/social/page.tsx:9,33` + `components/social/workspaces/ReelWorkspace.tsx` | Aucune fiche | Idem E09 | Nouvelle fiche `social-reel` | P1 |
| E11 | E | Atelier Social | `/social/connexion` et `/social/playbook` sont d'anciennes URLs, maintenant des redirections | `social/connexion/page.tsx` → `/social?mode=histoire` ; `social/playbook/page.tsx` → `/le-livre?tab=playbook` | Guide ne mentionne ni l'une ni l'autre URL | Sans impact utilisateur direct (redirection transparente), mais confirme que le Guide n'a jamais suivi cette zone du produit | Couvert par E08/E09 | P2 |
| E12 | D | Vocabulaire/code | `EDITORIAL_PILLARS` code encore P1-P4 (Process/Émotion/Produit/Preuve) | `apps/atelier-social/src/lib/brand-rules.ts:201-206` | Le Livre §6 déclare cette hiérarchie « historique », remplacée par 6 piliers stratégiques, avec avertissement explicite sur le piège du nom « Preuve » | Le code contredit la gouvernance du Livre sur un point que le Livre signale lui-même comme piégeux | Mettre à jour la constante ou la retirer si inutilisée | P1 |
| E13 | D | Vocabulaire/nommage | URL `/pages/cercle` utilisée comme lien interne pour « Le Club » | `apps/atelier-social/src/app/blog/page.tsx:90` ; `apps/atelier-blog/exemple-brief-P0.json:26` (label « Le Club Ypersoa », url `/pages/cercle`) | Le Livre / CLAUDE.md imposent « Club Ypersoa », jamais « Cercle » | L'ancien nom de marque survit comme chemin d'URL réel, poussé dans chaque article de blog généré | Vérifier le slug Shopify réel et corriger la constante `internalLinks` | P1 |
| E14 | D | Brand-safety technique | `checkBrandSafety()` dupliqué 3 fois sans contrôle de cran (`VoiceLevel`) | `apps/atelier-social/src/app/api/avis/generate/route.ts:55-57`, `api/connexion/generate/route.ts:86-88`, `api/generate-copy/route.ts:78-86` (comparer à l'implémentation canonique `lib/brand-rules.ts` importée correctement par `lib/studio-mood/copy-generator.ts:6`) | Le Livre §9 documente cette dette lui-même et note qu'`avis/generate` interdit totalement « Tajima », plus strict que la règle contextuelle §4 | Confirmé ligne à ligne : dette réelle, pas juste documentée | Faire importer `lib/brand-rules.ts` aux 3 routes | P1 |
| E15 | C | Gouvernance technique | En-tête de `brand-rules.ts` dit « Synchronisé avec CLAUDE.md v1.1 (27/04/2026) » | `apps/atelier-social/src/lib/brand-rules.ts:1-6` | Le contenu réel (bannissement Tajima/Gunold du 24/08, thermostat citron du 21/08) est en fait synchronisé avec `docs/VOIX_YPERSOA.md`, pas CLAUDE.md | Commentaire de provenance obsolète, risque de mal orienter la prochaine session technique | Mettre à jour le commentaire d'en-tête | P2 |
| E16 | C | Atelier Blog | Guide décrit un générateur avec 3 angles éditoriaux, rapport de lint et exports HTML/Liquid/JSON-LD distincts | `guide-content.ts:898-921` | `apps/atelier-social/src/app/blog/page.tsx` (178 lignes) montre une UI simplifiée : brouillon hebdo, boutons Générer/Étoffer/Régénérer, un seul bouton « Copier pour Shopify » (HTML) | **À vérifier manuellement** si le lint et les exports Liquid/JSON-LD existent encore ailleurs (ex. `/api/blog/generate` peut les renvoyer sans UI dédiée) ou ont été simplifiés lors de la refonte du 20-21/08 | Revérifier `route.ts` de `/api/blog/generate` puis ajuster la fiche | P1 |
| E17 | F | Mediatheque | « Mode sélection » médiathèque affiche « Actions batch en Sprint 2 » | `guide-content.ts:846` (« limites ») le signale déjà correctement | — | Pas un écart : c'est un des rares cas où le Guide prévient honnêtement d'une fonction non finie | Aucun — exemple à suivre ailleurs | — |
| E18 | — | Nommage « Cercle Ypersoa » | Recherche exhaustive du terme dans le contenu de marque | `grep -ri "Cercle Ypersoa"` sur tout le repo : aucune occurrence hors de ce prompt d'audit lui-même | — | Le libellé fautif n'existe nulle part dans le copy — seul le slug technique E13 en garde la trace | Couvert par E13 | — |

---

## 5. Fonctionnalités fantômes (Type A) — brouillons de fiches à ajouter en priorité

Gabarit repris du `FeatureDoc` existant (`lib/guide-content.ts`), rempli à partir de la lecture du code réel — à affiner avec Sarah avant publication (notamment les exemples).

### Le Livre
- **aQuoiCaSert** : Vérifier en un clic la voix, la palette, le vocabulaire brand-safe et le Range Bisous avant de publier quoi que ce soit.
- **quandUtiliser** : Avant de publier un post, un article ou une carte, en cas de doute sur le ton (quel cran ?) ou la couleur à utiliser.
- **commentFaire** : Clique « Le Livre » en bas de la barre latérale → onglets Identité / Visuel / Playbook / Mood → repère le territoire, le cran (Citron/Zeste/Crème/Coton) et la checklist avant publication en fin de page.
- **limites** : Page de lecture, ne modifie rien ; en cas de divergence, `docs/VOIX_YPERSOA.md` fait foi sur le contenu affiché.

### Blog (rituel « Article du jeudi »)
- **aQuoiCaSert** : Tenir le rendez-vous hebdomadaire du blog sans repartir de zéro chaque semaine.
- **quandUtiliser** : Le mercredi soir (brief/génération) et le jeudi matin (relecture + publication).
- **commentFaire** : Clique « Blog » dans la barre latérale → lis le brouillon généré → « Étoffer » si trop court (cible 700-1100 mots) → « Copier pour Shopify » une fois validé.
- **limites** : Le brouillon est un point de départ, pas un article prêt à publier tel quel ; **à vérifier** si les exports Liquid/JSON-LD documentés côté Atelier DA existent toujours ici (cf. E16).

### Planning (tempo hebdo)
- **aQuoiCaSert** : Voir en un coup d'œil la semaine en cours (thème, publications prévues, article du jeudi) et les 3 priorités max de chaque équipe.
- **quandUtiliser** : En début de semaine pour se caler, ou pour noter le brief de Maï.
- **commentFaire** : Clique « Planning » dans la barre latérale → lis « Le tempo » de la semaine → ajoute/édite les priorités de ton équipe (3 max) → écris le brief dans le champ dédié (sauvegarde automatique).
- **limites** : Ne pas confondre avec le rétroplanning 2027 (`/atelier-da/planning`), qui reste l'outil de campagne long terme.

### Studio
- **aQuoiCaSert** : Point d'entrée unique pour choisir son terrain de jeu visuel : pièce (Shooting), ambiance (Lookbook), plan de tournage (Shooting Book) ou humeur/Reel (Studio Mood).
- **quandUtiliser** : Quand tu ne sais pas encore par quel bout prendre un shooting ou une vidéo.
- **commentFaire** : Clique « Studio » dans la barre latérale → choisis le parcours (Shooting / Lookbook / Shooting Book / Studio Mood) → tu es redirigée vers l'outil correspondant.
- **limites** : C'est un aiguillage, pas un outil en soi — les fiches existantes (5.1-4.4 du Guide actuel) restent valables une fois sur la bonne page, seul le chemin d'accès change.

### Bibliothèque
- **aQuoiCaSert** : Retrouver tout ce qui a été produit ou référencé — visuels, motifs, produits, packs sociaux, articles — au même endroit.
- **quandUtiliser** : Pour rechercher un visuel déjà généré, consulter le catalogue motifs/produits ou rouvrir un pack sauvegardé, sans savoir dans quel ancien module ça vivait.
- **commentFaire** : Clique « Bibliothèque » dans la barre latérale → choisis l'onglet (Visuels / Motifs / Produits / Packs / Articles).
- **limites** : Remplace les anciens points d'entrée « Référentiel » et « Médiathèque » (fusionnés le 21/08/2026) ; les habitudes prises sur ces anciennes URLs redirigent automatiquement mais ne sont plus la référence.

### Histoire (Connexion/Preuve/Communauté) & Reel — Atelier Social
- **aQuoiCaSert** : Générer du contenu narratif par pilier stratégique (Connexion, Preuve, Communauté) ou un script de Reel, sans repasser par le studio visuel classique.
- **quandUtiliser** : Pour une caption manifeste/lien/souvenir (Connexion), une preuve process/atelier (Preuve), un contenu communauté/UGC, ou pour cadrer un Reel scène par scène.
- **commentFaire** : Dans Atelier Social, bascule sur le mode « Histoire » (ou « Reel ») — **à vérifier avec Sarah** l'intitulé exact du sélecteur de mode dans l'UI, non confirmé par la seule lecture du code.
- **limites** : Le Reel reste un script texte, jamais une vidéo générée (cf. `project_connexion_multi_piliers` en mémoire).

---

## 6. Annexes — inventaires bruts

### 6.1 Inventaire CODE (routes réelles, `apps/atelier-social/src/app`, 26/08/2026)

**Ateliers niveau 1 (barre latérale, `HubSidebar.tsx`)** : `/social` (modes `visuel`/`avis`/`histoire`/`reel`), `/blog`, `/planning` (+ `/planning/annee`, `/planning/semaine`, `/planning/retroplanning`), `/studio` (+ `/studio/shooting`, `/studio/lookbook`, `/studio/shooting-book`, `/studio/studio-mood*`), `/bibliotheque` (+ `/bibliotheque/visuels`, `/motifs`, `/produits`, `/packs`, `/articles`).

**Référentiels** : `/atelier-da` (casting, ambiances, incarnations, mediatheque, motion, planning [rétroplanning 2027]), `/atelier-production` (commandes, attribution, motifs, fils, palettes, base-produit, regles, kanban, zone-test), `/atelier-trends` (désormais nichée sous Atelier DA côté nav mais route encore servie directement).

**Pied de page** : `/le-livre`, `/guide`, `/brand`.

**Redirections techniques identifiées (ancienne URL → nouvelle)** : `atelier-da/blog` → `/blog` ; `atelier-da/studio-mood` → `/studio/studio-mood` ; `atelier-da/shooting-book` → `/studio/shooting-book` ; `referentiel` → `/bibliotheque/produits` ; `bibliotheque` (racine) → `/bibliotheque/visuels` ; `social/connexion` → `/social?mode=histoire` ; `social/playbook` → `/le-livre?tab=playbook`.

**Statuts partiels relevés (`[STUB]`/V2 désactivé)** : mode sélection médiathèque (« Actions batch en Sprint 2 »), cartes V2 Atelier DA désactivées (« Bible de marque visuelle », « Décisions DA archivées »), planning production limité à l'intra-commande (pas de vrai OTIF multi-commandes), génération `generate-pack` Planable en mock (cf. mémoire `project_planable_image_bridge`).

### 6.2 Inventaire GUIDE (`apps/atelier-social/src/lib/guide-content.ts`, 1237 lignes, 8 sections)

1. Me connecter, chercher et naviguer (5 fiches)
2. Créer des visuels et du texte pour les réseaux — Atelier Social (16 fiches, dont Avis et Fonds)
3. Piloter mes projets de contenu — Kanban contenu (2 fiches)
4. Concevoir un shooting et des vidéos — Shooting Book, Atelier Shooting, Atelier Lookbook, Atelier Motion (4 fiches)
5. Diriger l'image de marque — Casting, Ambiances, Motifs créatif, Médiathèque, Incarnations, Studio Mood, Blog GEO, autres cartes DA (8 fiches)
6. Planifier le travail des équipes — Planning commun/rétroplanning (1 fiche)
7. Surveiller les tendances — Atelier Trends/Radar (1 fiche)
8. Gérer la production broderie — Commandes, Attribution, Motifs technique, Fils, Palettes, Base produit, Règles, Kanban prod, Zone de test (11 fiches)

**Absent du sommaire** : Blog (comme atelier niveau 1), Planning (comme atelier niveau 1, distinct du rétroplanning), Studio (comme hub), Bibliothèque (comme hub), Le Livre, modes Histoire/Reel de l'Atelier Social.

### 6.3 Inventaire LIVRE (`docs/VOIX_YPERSOA.md` v1.1, 21/08/2026)

- §0-1 : ambition (« la marque des mots qu'on garde »), 3 territoires (mot/geste/présence), tension à préserver
- §2 : thermostat citron — 4 crans (Coton/Crème/Zeste/Citron), défaut = Zeste
- §3 : système visuel — marine `#16324C`, teal `#1E6E77`, crème `#F4EEE2`, coquelicot `#C23A2D`, blush, Newsreader + Hanken Grotesk
- §4 : vocabulaire brand-safe — « brodé à la commande », interdits Made in France/fait main/Tajima-Gunold grand public
- §5 : Range Bisous — signature `Bisous [X]`, carte deuil silencieuse
- §6 : Playbook — 6 piliers stratégiques (Connexion/Réassurance/Qualification/Preuve/Occasions/Communauté), avertissement explicite sur le piège de nom « Preuve »
- §7 : Studio Mood — cycle de vie épisode, cran par humeur
- §8 : Carte récit — gabarit de brief transverse
- §9 : gouvernance — hiérarchie des sources, dette technique auto-documentée (3 routes non synchronisées avec `brand-rules.ts`)

---

*Rapport produit par lecture directe du code (`apps/atelier-social`), de `docs/VOIX_YPERSOA.md` et de `lib/guide-content.ts`. Aucun fichier modifié.*
