# Audit fonctionnel du Hub Créatif Ypersoa

> **But de ce document** — inventaire RÉEL de tout ce que l'outil sait faire, vérifié dans le code (pas de supposition). Il sert de base à la future page de documentation. Regroupé par **intention utilisateur** (« ce que la personne veut accomplir »), pas par ordre technique.
>
> **Méthode** — parcours exhaustif des 43 pages, 67 routes API et ~25 composants de l'app `atelier-social` (le Hub), + les 2 ateliers embarqués en iframe (Shooting, Lookbook) et l'app Planable.
>
> **Date de l'audit** — 30 juin 2026. **Statut** — Phase 1 (audit), en attente de validation avant rédaction de la doc.

---

## 1. Carte d'ensemble

Le Hub est une seule application web (`atelier-social`) avec une barre latérale gauche de **6 ateliers**, une barre du haut (logo + recherche + compte), et une protection par connexion + rôles.

| # | Atelier (barre latérale) | Adresse | Ce qu'on y fait | Rôles qui y accèdent |
|---|---|---|---|---|
| 1 | **Atelier Social** | `/social` | Générer des visuels + textes pour Insta/Pinterest | tous |
| 2 | **Atelier Shooting** | `/shooting` | Outil de shooting IA (app séparée en iframe) | admin, créa |
| 3 | **Atelier Lookbook** | `/lookbook` | Moodboards d'ambiances (app séparée en iframe) | admin, créa |
| 4 | **Atelier DA** | `/atelier-da` | Direction artistique : casting, motifs, médiathèque, incarnations, planning, motion… (10 sous-modules) | admin, créa |
| 5 | **Atelier Trends** | `/atelier-trends` | Veille tendances Pinterest + Google Trends | admin, créa |
| 6 | **Atelier Production** | `/atelier-production` | Production broderie : commandes, attribution couleur, référentiels techniques, planning machines (10 sous-modules) | admin, prod (+ créa sur motifs/palettes) |

**Hors barre latérale** (accessibles seulement par liens internes) : la **recherche globale** (`/search`), le **Kanban contenu** (`/social/kanban`), et l'app **Planable** (planning éditorial, port séparé) — voir « À simplifier ».

La page d'accueil `/` redirige automatiquement vers `/social`.

---

## 2. Inventaire par intention utilisateur

Format de chaque fiche : **Nom** · *Emplacement* · Ce que ça fait · Entrées → Sorties · (Dépendances).

---

### INTENTION 1 — Me connecter, chercher et naviguer

#### 1.1 Se connecter
*Page `/login`.* Connexion par email + mot de passe (Supabase Auth).
Champs : `Email`, `Mot de passe`, bouton `Se connecter`, lien `Mot de passe oublié ?`.
Entrées : email + mot de passe → Sortie : session + redirection vers la page demandée.

#### 1.2 Mot de passe oublié / réinitialisation
*Pages `/login/forgot-password` et `/auth/reset-password`.* Envoi d'un email de réinitialisation puis saisie d'un nouveau mot de passe (min. 8 caractères).
Champs : `Email` + `Envoyer le lien` ; puis `Nouveau mot de passe` + `Confirme le mot de passe` + `Réinitialiser le mot de passe`.

#### 1.3 Barre du haut (chrome global)
*Présente sur toutes les pages (`HubTopbar`).* Logo « Y · YPERSOA HUB » (retour accueil), champ de recherche central, email + libellé du rôle affichés, bouton de déconnexion.
Raccourci clavier **Cmd/Ctrl + K** = focus sur la recherche.

#### 1.4 Recherche globale
*Page `/search?q=…`* (déclenchée par la barre du haut). Recherche unifiée, insensible à la casse, logique ET (tous les mots doivent matcher) sur **9 familles** : Commandes Shopify (actives + archivées), Couleurs de fil, Palettes, Motifs YPM, Shoots du catalogue, Lookbooks, Règles broderie, Packs sociaux, Projets sociaux.
Entrée : texte (ex. « club », « mariage », « YPM-007 », « 1002 ») → Sorties : résultats groupés par famille (max 30/famille), chaque carte cliquable vers la fiche concernée. Les commandes ont un boost de score si l'ID matche exactement (`1002` ≡ `#1002`).

#### 1.5 Rôles & droits d'accès
*Géré par `lib/access.ts` + middleware.* 4 rôles :
- **admin** (« Admin ») — accès total.
- **crea** (« Créa ») — tableau de bord, Atelier DA (+ Shooting/Lookbook/Trends), référentiels prod en lecture (motifs/palettes), Planable. **Pas** la production.
- **prod** (« Production ») — tableau de bord, Atelier Production, référentiels prod. **Pas** l'Atelier DA ni Planable.
- **viewer** (« Lecture ») — tableau de bord (`/social`, `/search`) seulement.
Une section interdite redirige vers `/social`. La barre latérale masque les ateliers non autorisés.

---

### INTENTION 2 — Créer des visuels et du texte pour les réseaux

**Atelier Social** (`/social`) — studio principal. Colonne gauche = configuration (6 sections numérotées + pied de page sticky), colonne droite = résultats (carrousel + onglets texte).

#### 2.1 Charger une photo produit
*Gauche, section « 2. Ton produit ».* Charge l'image de base (vêtement + broderie) qui sert à la génération IA. 3 sources : upload manuel (« Glisse ta photo ici »), choix d'un motif du **Référentiel motifs Hub**, ou un **Shot favori depuis Atelier Shooting**.
Entrée : JPG/PNG/WEBP → Sortie : image de base. Bouton « Changer la photo » une fois chargée.
*Dépendance : une image est obligatoire avant de générer.*

#### 2.2 Choisir le produit et sa couleur
*Gauche, section « 2. Ton produit » (bas).* Sélectionne le produit exact (YP001 hoodie, YP005 crewneck, YP013, YP019, YP021, YP022, YP023…) et sa couleur. Palette tirée en direct de l'API Hub, aperçu mockup + pastille hex.
Entrées : ID produit + ID couleur → Sortie : produit/couleur verrouillés dans le prompt (« product lock »).
*Dépendance : API `/api/hub/products`.*

#### 2.3 Décrire sa vision (prompt libre)
*Gauche, section « 1. Ta vision ».* Texte libre pour orienter la génération (ex. « très coloré, femme brune 30 ans, ambiance parisienne »). Optionnel.

#### 2.4 Choisir l'ambiance (vibe)
*Gauche, section « 4. L'ambiance ».* 6 ambiances officielles (Doux Minimaliste, Sépia Rétro, Sézane Mode, Émoï Émoï, Make My Lemonade, Gamin Gamine) + les **lookbooks ❤️ actifs** (issus d'Atelier Lookbook, valides 7 jours, avec date d'expiration affichée).
Entrée : ID vibe → Sortie : prompt esthétique injecté dans image + texte.

#### 2.5 Choisir l'occasion
*Gauche, section « 5. L'occasion ».* 11 occasions (Fête des Mères/Pères/Grands-mères, Mariage, Naissance, Saint-Valentin, Rentrée, Été, Noël, Quotidien…). Chaque occasion porte un contexte de marque pour l'IA et peut auto-suggérer une fiche Pinterest.

#### 2.6 Choisir les mannequins (canoniques)
*Gauche, section « 3. Tes mannequins ».* 0 à 3 personnages canoniques (recherche + filtres Genre / Âge / Type ; favoris ⭐ en tête). Vides = visage aléatoire.
Entrées : jusqu'à 3 IDs canoniques → Sortie : contexte casting + visages de référence (`/api/canonique-image`).

#### 2.7 Choisir la plateforme et le style
*Gauche, section « 6. Style » + pied de page.* Bascule **Instagram** (boutons « Photo pure » 1:1 / « Avec texte » 4:5) vs **Pinterest** (2:3 imposé, 4 visuels). Le libellé du bouton de génération s'adapte : « Générer mon carrousel (5 slides) » vs « Générer mon shooting Pinterest (4 visuels) ».

#### 2.8 Choisir une fiche Pinterest (stratégie par motif)
*Gauche, section « Fiche Pinterest » (visible si Pinterest).* Choix d'une fiche motif (ex. « Chouchou Mamie ») qui ancre les mots-clés longue traîne, le texte de surimpression et les 4 formats (Hero flatlay / Désir porté / Association déclinaisons / Lifestyle). Suggestions filtrées par occasion.
*Dépendance : `/api/social/pinterest-strategy`.*

#### 2.9 Générer le carrousel / shooting
*Pied de page gauche, bouton « Générer… ».* Envoie l'image + tous les réglages à l'IA : **Gemini** pour les images (5 Insta ou 4 Pinterest, en parallèle, apparition au fil de l'eau), **OpenAI** pour le texte. Affiche « Création… (5-7 min) ».
Sorties : images base64, caption + 5 hooks (Insta) OU titre + description + tags Pinterest, + contrôle brand-safety.
*Dépendances : `/api/generate-image`, `/api/generate-copy`. Cascade de repli OpenAI → Gemini → déterministe pour ne jamais laisser le texte vide.*

#### 2.10 Naviguer et trier le carrousel
*Colonne centre.* Affichage plein, flèches précédent/suivant, points indicateurs, miniatures cliquables.
Actions au survol par slide : **télécharger** (icône), **marquer « best »** (cœur, ruban « Best »), **supprimer** (croix + confirmation). Bouton « Tout » = télécharger toutes les images.

#### 2.11 Ajouter du texte sur l'image (overlay)
*Droite, onglet « Overlay »* (si « Avec texte » ou Pinterest). 5 gabarits (Title Bottom, Quote Center, Title Top Large, Signature Corner, Banner Bottom Color), choix d'un hook OU texte libre, couleur Auto/Blanc/Marine, aperçu temps réel, bouton « Télécharger » (PNG).
*Le texte est composé côté navigateur (canvas), jamais généré par l'IA sur l'image.*

#### 2.12 Récupérer le texte — Caption + Hooks (Insta)
*Droite, onglet « Caption + Hooks ».* Caption narrative complète + 5 hooks (Émotion, Question, POV, Humour, Affirmation), chacun avec bouton « Copier ». Indicateur brand-safety en haut (vert « Brand-safe ✓ » / rouge « X violation(s) »).

#### 2.13 Récupérer le texte — Pin SEO (Pinterest)
*Droite, onglet « Pin SEO ».* Titre (≤100 car.), description (≤500 car.) avec compteurs colorés (vert/ambre/rouge), tags groupés par intention (Saisonnier / Produit / Evergreen / Permanent), boutons « Copier ».

#### 2.14 Sauvegarder le pack dans le Hub
*Pied de page gauche, « Sauvegarder dans le hub »* (après génération). Ouvre une fenêtre : `Titre du pack` (pré-rempli), `Collection (dossier)` (existante ou nouvelle), `Notes`. Enregistre images + métadonnées dans Supabase.
*Dépendance : Supabase configuré.*

#### 2.15 Bibliothèque des packs sauvegardés
*Tiroir latéral droit, bouton « Bibliothèque » dans l'en-tête.* Archive consultable de tous les packs : filtres collection / plateforme / favori, recherche plein texte multi-mots. Carte → détail : supprimer, favori ❤️, éditer la caption en ligne, ajouter un slide au catalogue, **télécharger en ZIP**, télécharger un slide.

#### 2.16 Exporter / télécharger
*Carrousel + bibliothèque.* Télécharger un slide (`ypersoa-slide-N-…png`), tout télécharger (séquentiel), ou pack complet en **ZIP** (images + metadata).

#### 2.17 Ajouter un shot au catalogue
*Bibliothèque + carrousel (`AddToCatalogModal` / `EditCatalogShotModal`).* Indexe un visuel généré dans le catalogue de shots (motif, variante, produit, destinataire, occasion, tags, libellé) pour le retrouver via la recherche globale et le catalogue motifs.

---

### INTENTION 3 — Piloter mes projets de contenu

#### 3.1 Kanban contenu
*Page `/social/kanban`* (lien depuis l'en-tête d'Atelier Social). Tableau 5 colonnes : **Concept → Shooting → À filmer cette semaine → Production → Publié**. Déplacement par flèches gauche/droite (pas de glisser-déposer).
Carte projet : titre + motif/variante + pastilles (destinataires, occasions, produits) + deadline (alerte ⚠️ si dépassée).

#### 3.2 Créer / éditer un projet
*Modale du Kanban, « + Nouveau projet ».* Champs : `Titre*`, `Statut`, `Motif (YPM-XXX)`, `Variante`, `Pour qui ?` (multi), `Occasion(s)` (multi), `Produit(s)` (multi), `Deadline`, `Notes`. Boutons « Créer le projet » / « Mettre à jour » / « Supprimer ».

---

### INTENTION 4 — Concevoir un shooting et des vidéos

#### 4.1 Shooting Book (plan de shooting depuis un brief)
*`/atelier-da/shooting-book`.* Transforme un brief poétique en plan structuré (casting + ambiances + shotlist + hooks temporels) et génère les images.
Champs : `Brief poétique` (≤400 car.), `Produit Ypersoa`, `Motif YPM (optionnel)`, upload `PNG du motif`, `Taille du motif brodé` (Petit/Moyen/Grand), `Couleur du support`, `Ambiances préférées` (multi + lookbooks actifs), `Format attendu` (Instagram 5 angles / Pinterest 3 angles / Lookbook 12-20 / Shooting full pack / Hero banner). Bouton « Générer le plan ».
Sorties : plan + image hero (ou N angles), bouton « Télécharger » par visuel, et **« Envoyer vers Planable »** (deep-link).
*Dépendances : `/api/da/shooting-plan` + `/render`, Planable.*

#### 4.2 Atelier Shooting (iframe)
*`/shooting`.* Outil de shooting IA standalone (app Vite séparée, port 3001) embarqué en iframe. Les shots « favoris » remontent dans l'Atelier Social (section 2.1).
*Dépendance runtime : l'app doit tourner sur le port 3001, sinon page blanche.*

#### 4.3 Atelier Lookbook (iframe)
*`/lookbook`.* Constructeur de moodboards d'ambiances standalone (app Vite, port 3003). Les lookbooks ❤️ actifs alimentent les ambiances d'Atelier Social, Shooting Book et le référentiel Ambiances.
*Dépendance runtime : port 3003.*

#### 4.4 Atelier Motion (vidéo IA)
*`/atelier-da/motion`, `/new`, `/[id]`.* Génération vidéo (Gemini Omni Flash / Veo 3.1). 3 modes : **Reel** (clips Insta narratifs depuis une collection shooting), **Ambiance** (vidéo lookbook), **Packshot** (motion produit).
Flux « Nouvelle vidéo » : 1·Mode → 2·Source → 3·Image de style (Reel) → 4·Format (Court ~32s/4 clips ou Complet ~56s/7 clips) → Brief éditorial → Moteur. Suivi par statut (en attente → en cours → généré/échec), clips lisibles, liste « À faire manuel ».

---

### INTENTION 5 — Diriger l'image de marque et gérer mes référentiels créa

**Atelier DA** (`/atelier-da`) — page d'accueil listant les sous-modules.

#### 5.1 Casting / Mur des canoniques
*`/atelier-da/casting`.* Mur filtrable des 23 canoniques + 3 lignées familiales. Vues « Mur » / « Familles ». Filtres : famille esthétique (No-makeup / Maquillée chic), genre (Femmes/Hommes/Enfants/Ados), lieu, recherche. Clic carte → fiche complète + dispositifs liés (duos/trios ❤️).

#### 5.2 Référentiel d'ambiances
*`/atelier-da/ambiances`.* Catalogue des 6 ambiances officielles (image + prompt EN « Voir prompt EN ») + lookbooks ❤️ actifs. Upload/Remplacer l'image par ambiance (JPG ≤5 Mo).

#### 5.3 Motifs — catalogue créatif
*`/atelier-da/motifs` + `/atelier-da/motifs/[destinataire]`.* Vue « site web » des motifs YPM. 3 onglets : **Motifs / Variantes / Catalogue**. Filtres `Pour qui ?` (papa, maman, mamie…), `Occasion`, `Autres tags`. Modale d'édition : tague le motif hero + chaque variante (destinataires, occasions, produits, tags libres), bouton « Enregistrer tous les tags ». Liens « Utiliser dans Shooting » et « Fiche technique ». Galerie de shots catalogués par produit.

#### 5.4 Médiathèque
*`/atelier-da/mediatheque`, `/[id]`, `/upload`.* Toutes les photos (shooting/lifestyle/IA/packshot) centralisées. Galerie : recherche, tri (date/nom), barre de filtres par tags catégorisés, « Mode sélection » (batch annoncé Sprint 2), tiroir « Audit production ».
Fiche photo : statut 1-clic (À valider / Validée / Publiée Shopify / Archivée), source, date, photographe, tags par catégorie, notes (auto-save), « Copier l'URL publique ».
Upload : « Ajout rapide » (auto-tag depuis le nom de fichier `YPM-001_MAMA_CLUB_beige.jpg`) + « Ajout détaillé » (drag-drop, source/date/photographe/tags par lot).

#### 5.5 Incarnations
*`/atelier-da/incarnations`, `/[code]`, `/new`, `/import`, `/audit`.* Référentiel des déclinaisons éditoriales (MAMA CLUB, PAPA CLUB, DOG DAD GANG…) qui pilotent les chips du configurateur Shopify.
Liste : filtres (recherche, motif, statut, ton, tri) + boutons « Audit production », « Importer XLSX », « Nouvelle incarnation ».
Fiche : nom commercial, motif YPM, spec broderie, gabarits cibles, collections Shopify, ton éditorial, statut, notes ; lien variante ; bibliothèque visuelle (photos médiathèque) ; export « Metafield Shopify ».
Import XLSX (`04_INCARNATIONS.xlsx`). Audit : matrice motif × incarnation × gabarit (cellules ✓/⚠/Manquant) + « Exporter CSV ».

#### 5.6 Autres entrées du hub DA
*Cartes de `/atelier-da`.* « Motifs — fiches techniques » et « Palettes d'associations » sont des **raccourcis vers l'Atelier Production** (mêmes pages). Cartes V2 désactivées : « Bible de marque visuelle », « Décisions DA archivées ».

---

### INTENTION 6 — Planifier le travail des équipes

#### 6.1 Planning commun (créa / prod / comm)
*`/atelier-da/planning`.* Rétroplanning 2027 piloté pour les 3 équipes. Vues **Gantt** / **Liste**, filtres Équipe (Créa/Prod/Comm) + Statut, barre de progression « N/M fait », bouton « + Ajouter un événement ».
Gantt : couloirs par campagne, ligne « Charge prép. » (bandes ×2/×3 = double/triple run), ligne « Réunions » (★ présentation/validation), ligne rouge = aujourd'hui.
Détail/édition d'un événement : Début, Fin, Responsable, cycle de statut (À faire/En cours/Fait), Supprimer.
Création : Titre*, Date début*, Date fin, Équipe, Type (≈30 types), Collection/campagne, Responsable.
*Le planning machines de la production est séparé (voir 8.1).*

---

### INTENTION 7 — Surveiller les tendances

#### 7.1 Atelier Trends
*`/atelier-trends`.* Tableau de bord Google Trends FR + Pinterest. Boutons « Rafraîchir » (fetch) et « Analyser (IA) » (scoring + liaison motifs/occasions via GPT-4o). Filtres Source / Signal (Montant/Saisonnier/Stable) / Type. Section « Mots-clés Pinterest (saisie manuelle) » : ajouter/supprimer des mots-clés.
Cartes tendance : score 0-10 coloré, occasion + motif suggérés, créneau Planable, angle caption, raison de pertinence, drapeau brand-safe, lien « Voir ». Sections « Actionnable (score ≥5 & brand-safe) » et « Écartées ».

---

### INTENTION 8 — Gérer la production broderie

**Atelier Production** (`/atelier-production`) — page d'accueil listant les sous-modules.

#### 8.1 Commandes Shopify (import → suivi → planning → rework)
*`/atelier-production/commandes`, `/[id]`, `/upload`.*
- **Liste** : commandes actives + archivées (toggle « Voir les N archivées »), badges statut (À planifier → Planifiée → En cours → Terminée → Expédiée → Archivée), badge urgent. Bouton « Déposer un bon de préparation » (admin).
- **Upload PDF** (admin) : dépôt du bon Shopify → parsing OpenAI gpt-4o → croisement SKU/motif YPM/fils Gunold/durées → aperçu + JSON éditable → « Créer la commande ».
- **Fiche** : adresses, articles (produit, motif, couleur, taille, quantité, fils avec hex + code Gunold), **journal 4 étapes** (DST → Broderie → CQ → Expédition ; champs « Qui ? » avec autocomplétion équipe + « Le ? »), « Archiver » / « Désarchiver et remettre en prod » (recalcule le statut).
- **Planning machines** : algo **OTIF** (défaut, FIFO + regroupement fils) vs **LPT** (équilibrage charge), date de début, « Générer auto / Régénérer », Gantt 2 machines TMEZ-1/TMEZ-2 sur 3 jours (6h/jour, pause déj 12h-13h hachurée).
- **Rebroder** : modale (zones à rebroder + motif du défaut) → crée une commande rework `{id}-R{n}`, urgente.

#### 8.2 Moteur d'attribution couleur → lettre
*`/atelier-production/attribution`.* Solveur (backtracking) qui répartit les couleurs sur les lettres d'un texte client multicolore.
Entrées : motif (pattern figé éventuel), mode Monochrome/Multicolore (couleur fil OU gamme imposée + fils éditables + couleur cœur), 1-4 lignes de texte (≤12 car.), police (Russ Times, Arial Rounded, Looney, Diana, Museo, Script New), couleur de fond. Bouton « Lancer l'attribution ».
Sorties : score d'harmonie + violations, aperçu coloré, légende (distribution + ordre de broderie). Boutons « Sauvegarder », « Télécharger SVG », « Télécharger PDF ».

#### 8.3 Bibliothèque d'attributions
*Bas de `/atelier-production/attribution`.* Attributions sauvegardées (pastilles palette, texte, mode, score, date) : « Restaurer », renommer, supprimer.

#### 8.4 Fiche d'impression attribution
*`/atelier-production/attribution/print`.* Feuille A4 atelier (lettres colorées, numéros d'aiguille, légende codes Gunold). Bouton « Imprimer / Enregistrer en PDF ». *Accessible seulement après avoir cliqué « PDF » dans le moteur.*

#### 8.5 Référentiel motifs YPM (technique)
*`/atelier-production/motifs`.* 17 motifs + 80 variantes. Vues **Galerie** / **Bibles**. Modale : bible (dimensions, composition, palettes associées), fichiers (DST/PXF/FT téléchargeables), variantes.

#### 8.6 Référentiel fils Gunold
*`/atelier-production/fils`.* 33 couleurs Gunold-Poly classées : Canoniques TMEZ (★, max 10), Gamme étendue, Archives. Fiche fil : hex, code Gunold (validé ✓/TODO), Pantone TPG, usage, ambiance, incompatibilités, notes ; toggles « Favori B2C ⭐ » (max 8), « Canonique TMEZ ★ », « Archiver » ; liste des palettes qui l'utilisent. « Nouveau fil » avec auto-lookup du code dans le catalogue Gunold (300 codes).

#### 8.7 Palettes d'associations
*`/atelier-production/palettes`, `/[id]/fiche-prod`.* 13 palettes (camaïeus + multicolores), favoris ♥ épinglés + actives + archives. Modale : composition (fils, codes, Pantone, hex), édition, remplacement de fil, toggles favori/archive. **Fiche prod imprimable** (A4) par palette.

#### 8.8 Base produit
*`/atelier-production/base-produit`.* Catalogue lecture des supports en vente (YP001, YP004, YP019, YP021…) et leurs variantes couleur (hex, packshot, fournisseur, badge « En vente Shopify » / « Catalogue »).

#### 8.9 Règles & contraintes broderie
*`/atelier-production/regles`.* Règles par placement (buste, poignet, centre, dos, nuque…) : dimensions max/défaut, ajustements 2XL/3XL, icône. Créer/éditer/supprimer. Source de vérité pour Adriana + les générations IA.

#### 8.10 Kanban prod
*`/atelier-production/kanban`.* Tableau 5 colonnes (Backlog → Prochain → En cours → Testé → Fait) pour questions/bugs/améliorations/décisions/règles. Types d'items, assignation équipe, archivage auto après 7 jours en « Fait ».

#### 8.11 Zone de test
*`/atelier-production/zone-test`.* Tableau 5 phases (En réception → En machine → Modification à prévoir → Modification faite → Validé) pour les tests broderie. Carte : fichiers DST/PXF/JPG (upload + download), assignation (Adriana/Rebecca/Cyrielle). « Nouveau test ».

---

## ⚠️ À simplifier

Observations issues de l'audit — points qui brouillent le parcours et qu'il faudra clarifier dans la doc (et idéalement dans le produit).

### Doublons et entrées multiples pour la même chose

1. **Les « Motifs » existent en double**, avec deux logiques distinctes : `/atelier-da/motifs` (catalogue créatif, taggage) et `/atelier-production/motifs` (fiche technique). La page d'accueil DA propose en plus une carte « Motifs — fiches techniques » qui renvoie… vers la page Production. → Trois portes d'entrée pour deux vues d'un même objet : source de confusion.
2. **Les « Palettes » et la carte DA #9** ne sont qu'un raccourci vers la page Production. La page d'accueil DA mélange ainsi de vraies pages DA et des deep-links Production.
3. **Trois tableaux type « Kanban » au modèle de carte différent** : Kanban contenu (`/social/kanban`), Kanban prod (`/atelier-production/kanban`), Zone de test (`/atelier-production/zone-test`, 5 phases). Même métaphore visuelle, trois implémentations.
4. **Deux notions de « planning »** sans lien : le rétroplanning 2027 (`/atelier-da/planning`, équipes) et le planning machines (Gantt dans chaque commande). Le mot « planning » désigne deux outils.
5. **L'« ambiance » vit à trois endroits** : on la *construit* dans Atelier Lookbook (iframe), on la *référence* dans Atelier DA › Ambiances, on la *consomme* comme vibe dans Atelier Social et Shooting Book. Le même lookbook ❤️ actif réapparaît dans 3 écrans.
6. **Deux « audits »** distincts (Incarnations et Médiathèque) avec des présentations différentes.
7. **Sélection des mannequins en double logique** : mur de casting (DA), sélecteur dans Atelier Social, casting auto dans Shooting Book — trois UI sur les mêmes 23 canoniques.

### Fonctions cachées ou difficiles à trouver

8. **La recherche globale, le Kanban contenu (`/social/kanban`) et l'app Planable** ne sont dans aucune barre latérale. On n'y accède que par un lien interne (en-tête Social) ou un raccourci clavier. Planable (port séparé) est carrément hors du Hub mais référencé par Shooting Book et le planning DA.
9. **La « Bibliothèque » des packs sauvegardés** n'est qu'un bouton dans l'en-tête d'Atelier Social — facile à rater alors que c'est le seul endroit pour retrouver son travail.
10. **Fiches imprimables enfouies** : la feuille d'impression attribution (`/attribution/print`) et la fiche prod palette (`/palettes/[id]/fiche-prod`) ne sont accessibles qu'après une action précise, jamais depuis la navigation.
11. **« Ajout détaillé » de la médiathèque** est replié par défaut ; l'upload avancé (source/date/photographe par lot) passe inaperçu.

### Ruptures de parcours / incohérences

12. **Shooting et Lookbook sont des iframes** vers des apps Vite séparées (ports 3001/3003). Si ces serveurs ne tournent pas, l'utilisateur voit une page blanche sans explication. Dépendance runtime fragile.
13. **Textes des pages d'accueil obsolètes** : la carte « Commandes Shopify » annonce le planning en *LPT* alors que le défaut réel est *OTIF* ; le pied de page Production parle encore du « Moteur d'attribution Streamlit sur localhost:8501 » alors qu'il est désormais en React. La page DA dit « 10 sous-modules » mais en affiche 12, et son pied de page en compte « 5 opérationnels » puis « 8 ». Compteurs et descriptions à réaligner.
14. **« Envoyer vers Planable »** suppose que l'utilisateur soit arrivé sur Shooting Book via un deep-link Planable (paramètres `planable_entry`/`planable_url`). Hors de ce contexte, le bouton ne fait rien — comportement non évident.
15. **Mélange de langues et de codes** : références produits (YP0xx), motifs (YPM-0xx), incarnations (YPI-xxx), SKU Shopify… La doc devra fournir un mini-glossaire, sinon un profil non-technique se perd.

### Fonctions peu utiles ou non finies (à signaler comme telles)

16. **« Mode sélection » de la médiathèque** affiche « Actions batch en Sprint 2 » : la fonction existe visuellement mais ne fait rien encore.
17. **Cartes V2 désactivées** présentes dans les accueils : « Bible de marque visuelle », « Décisions DA archivées », « Plans techniques DST/PXF ». Elles occupent de l'espace sans être cliquables — à mentionner comme « à venir » ou à masquer.

---

## Récapitulatif

- **6 ateliers** dans la barre latérale + recherche globale + auth/rôles.
- **~50 fonctionnalités utilisateur** recensées, réparties en **8 intentions**.
- **43 pages**, **67 routes API**, **2 apps embarquées** (iframe), **1 app liée** (Planable).
- **17 points** identifiés « à simplifier » (doublons, fonctions cachées, ruptures UX, fonctions non finies).

➡️ **Phase 1 terminée. En attente de ta validation avant de rédiger la page de documentation (Phase 2).**
