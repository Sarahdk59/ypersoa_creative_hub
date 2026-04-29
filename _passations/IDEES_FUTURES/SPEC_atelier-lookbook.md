# Atelier-Lookbook — Spécification produit

> **Fichier** : `_passations/IDEES_FUTURES/SPEC_atelier-lookbook.md`
> **Auteur** : Sarah Kedziora + Claude (session cadrage)
> **Date** : 29 avril 2026
> **Statut** : Spec V1 — décisionnelle, à valider avant implémentation
> **Dépendances bloquantes** : fork shoot_studio (Phase 0+1 minimum)

---

## 1. Concept et positionnement

### Phrase d'intention

Atelier-Lookbook est un studio de production de lookbooks IA Ypersoa qui sert
deux usages parallèles : alimenter la communication réseaux sociaux saisonnière
(rotation ~3 semaines) et constituer une bibliothèque permanente d'ambiances
réinjectables dans atelier-shooting pour produire des collections de shots
produit cohérents à n'importe quel moment.

### Ce que c'est

- Un outil de génération créative à partir d'un brief poétique court
  ("Vacances à Porto Vecchio", "Rouge amour passion", "Nuit à Londres").
- Un calendrier éditorial : un lookbook actif rythme la communication
  marque pendant ~3 semaines, puis cède la place au suivant.
- Une bibliothèque permanente : les lookbooks archivés restent consultables,
  téléchargeables, et réinjectables dans atelier-shooting des mois plus tard.
- Un livrable : chaque lookbook est exportable en PDF/ZIP comme asset de marque.

### Ce que ce n'est pas

- Pas un mood board manuel à plat (pas de drag & drop d'images existantes).
- Pas un outil de recherche d'images web (pas de Pinterest/Unsplash).
- Pas un générateur de produits Ypersoa (atelier-shooting le fait déjà).
- Pas un outil multi-utilisateur (V1 single-user, Sarah uniquement).
- Pas un outil de publication directe RS (les images sont produites,
  Sarah les diffuse comme elle veut ailleurs).

### Place dans l'écosystème Hub

```
Hub Ypersoa
├── apps/atelier-social/      [ Génération captions, posts ]
├── apps/atelier-shooting/    [ Génération shots produit ]
└── apps/atelier-lookbook/    [ Génération ambiances de saison ]  ← NEW
```

Flux de données :

```
atelier-lookbook ───[ JSON ambiance ]───▶ atelier-shooting
                  (consommée comme paramètre de génération)
```

Atelier-shooting gagne un dropdown "Ambiance lookbook" qui liste tous les
lookbooks de la bibliothèque (actifs et archivés) et applique l'ambiance
sélectionnée aux shots produit générés.

---

## 2. Modèle conceptuel : le lookbook

### Cycle de vie

```
[ Brouillon ]
      │
      ▼ (génération réussie + validation Sarah)
[ Active ]  ─── plusieurs lookbooks peuvent être Active simultanément
      │
      ▼ (rotation manuelle par Sarah)
[ Archive ]  ─── reste consultable et utilisable indéfiniment
      │
      ▼ (réactivable à tout moment)
[ Active ]
```

**Pas d'auto-archivage temporel.** La rotation est une décision manuelle de
Sarah. Un lookbook peut rester Active 3 semaines, 3 mois, ou 6 jours selon
le besoin de communication. La durée nominale "~3 semaines" est un repère,
pas une règle système.

### Anatomie d'un lookbook

Chaque lookbook contient :

**Métadonnées**
- ID unique (slug type `voyage_porto_vecchio_2026_07`)
- Titre humain (`Vacances à Porto Vecchio`)
- Brief original tel que tapé par Sarah
- Date création / date d'activation / date d'archivage
- Statut courant (Brouillon / Active / Archive)
- Tags extraits automatiquement par GPT-5.5 (saison, géo, palette dominante,
  mood général, mannequins inclus)

**Images générées**
- 12-20 images Gemini en haute résolution
- Chaque image porte : son prompt EN, le canonique injecté (le cas échéant),
  son tag de famille (canonique humain / ambiance pure / texture détail /
  scène large), et une annotation libre éditable par Sarah

**Ambiance extraite** *(consommable par atelier-shooting)*
- Palette de couleurs dominante (3-5 hex codes)
- Lieux types (intérieur / extérieur / variétés)
- Props récurrents
- Lumière dominante (matin doré, contre-jour, néon, ombre douce, etc.)
- Grain photographique (argentique 35mm, polaroid, digital crisp, etc.)
- Postures et énergies
- Photographes de référence implicites

### Règle d'unicité

Plusieurs lookbooks peuvent être Active simultanément. Cas d'usage typique :
un lookbook "fond de saison" (ex: "Vacances à Porto Vecchio" actif tout l'été)
+ un lookbook "ponctuel court" (ex: "Saint-Valentin Rouge Passion" actif
2 semaines en février même si un autre lookbook est aussi actif).

Atelier-shooting laisse Sarah choisir lequel utiliser au shot par shot.

---

## 3. Génération : du brief aux 20 images

### Pipeline complet

```
[ Brief poétique court ]
      │  Sarah tape "Vacances à Porto Vecchio"
      ▼
[ GPT-5.5 décompose ]
      │  Reçoit en contexte : brief + D2 Ypersoa + liste canoniques
      │  Produit : 12-20 prompts EN structurés + sélection canoniques
      │           + tags ambiance + signature visuelle commune
      ▼
[ Gemini génère × 12-20 ]
      │  Chaque prompt EN → image
      │  Pour les shots avec canonique : injection image reference
      │  (pattern 95% fidélité validé sur atelier-social)
      ▼
[ Résultat : 12-20 images haute résolution + métadonnées ]
      │
      ▼
[ Sarah valide / ajuste / re-génère unitairement / archive ]
```

### Famille de prompts générés par GPT-5.5

Sur 20 prompts, GPT-5.5 répartit par convention :

| Famille                  | Quantité indicative | Exemples Porto Vecchio                         |
|--------------------------|---------------------|------------------------------------------------|
| Canonique humain         | 4-6                 | Clémence pieds dans le sable, Aïcha sur dock   |
| Scène large ambiance     | 3-5                 | Plage déserte au crépuscule, ruelle pavée      |
| Texture / détail         | 4-6                 | Rotin tressé, sable grain, eau translucide     |
| Objet / prop             | 2-4                 | Chapeau paille sur chaise, panier osier        |
| Atmosphère pure          | 1-3                 | Coucher de soleil sur mer, nuages contre-jour  |

La répartition exacte dépend du brief — un brief urbain "Nuit à Londres"
aura plus de scènes larges et moins de textures. C'est GPT-5.5 qui décide.

### Application implicite de la D2 Ypersoa

Le system prompt de GPT-5.5 inclut en permanence :
- La D2 brand (Sézane × A.P.C. × Maison Labiche × Émoï-Émoï × etc.)
- L'esthétique "imperfect human model, no celebrity look"
- Le suffix universel défini dans `direction_artistique_hero.json`
- Les contraintes brand-safety (pas de "brodé à la main" dans les outputs textuels)

Sarah n'a jamais à le redire dans son brief.

### Sélection intelligente des canoniques

GPT-5.5 reçoit en contexte la liste complète des canoniques disponibles
(lecture de `mannequins_recurrents.json`). Selon le sens du brief :
- "femme forte" → Clémence (F2 maquillée chic, antiquaire indépendante)
- "couple" → Léa & Sarah, ou autre duo selon âge implicite
- "jeune en road trip" → Brune ou autre canonique jeune
- "famille élargie" → composition 3 générations

Sarah peut **override** avant génération si elle veut imposer un casting
spécifique, mais le défaut est l'adaptation intelligente.

### Re-génération unitaire

Sur les 20 images d'un lookbook, Sarah peut :
- Re-générer une image (même prompt EN, nouvelle exécution Gemini)
- Éditer manuellement le prompt EN d'une image et re-générer juste celle-là
- Marquer une image comme "validée" pour la protéger des re-générations massives

Pas de re-génération de tout le lookbook d'un clic — c'est un choix conscient,
on veut que les itérations soient ciblées et que la cohérence visuelle de
l'ensemble soit préservée.

---

## 4. Schéma de données

### Format JSON d'un lookbook

```json
{
  "id": "voyage_porto_vecchio_2026_07",
  "titre": "Vacances à Porto Vecchio",
  "brief_original": "Vacances à Porto Vecchio",
  "date_creation": "2026-04-29T22:30:00Z",
  "date_activation": null,
  "date_archivage": null,
  "statut": "brouillon",
  "tags": ["été", "méditerranée", "corse", "soleil", "ocre", "bleu profond"],
  "canoniques_inclus": ["MAN-P01", "MAN-P02", "MAN-P03"],
  "images": [
    {
      "id": "img_001",
      "famille": "canonique_humain",
      "canonique_injecte": "MAN-P01",
      "prompt_en": "[prompt EN détaillé généré par GPT-5.5]",
      "url_image": "/assets/lookbooks/voyage_porto_vecchio_2026_07/img_001.jpg",
      "valide": false,
      "annotation_sarah": ""
    }
  ],
  "ambiance_extraite": {
    "palette": ["#E8D5B7", "#1B5E7A", "#D4A574", "#F5F1E8"],
    "lieux": ["plage de sable fin", "ruelle pavée", "terrasse face mer"],
    "props": ["rotin", "panier osier", "lin froissé", "céramique terre cuite"],
    "lumiere": "soleil méditerranéen direct, ombres dures milieu de journée + dorée fin de journée",
    "grain": "argentique 35mm chaud, légère désaturation cyan",
    "postures": "détendues, contemplatives, groupes informels",
    "references_implicites": ["Yvonne Venegas", "Slim Aarons revisité"]
  }
}
```

### Format consommable par atelier-shooting

Atelier-shooting lit le bloc `ambiance_extraite` et l'injecte dans ses
prompts de génération de shots produit. Le format est identique à ce que
shoot_studio utilise déjà pour ses ambiances hardcodées (Parisien, A.P.C.,
Loft) — atelier-lookbook ajoute juste de nouvelles entrées dynamiques au
même format.

---

## 5. UI bibliothèque dynamique

### Vue Dashboard

Page d'accueil de l'app : grille de tous les lookbooks de la bibliothèque.

- Lookbooks **Active** affichés en haut, encadrés vert ou badge "actif"
- Lookbooks **Archive** en dessous, regroupés par tag (saison, géo, mood)
- Lookbooks **Brouillon** dans une section dédiée "En cours"
- Recherche full-text sur titre + brief + tags
- Filtres : par statut, par mannequin canonique inclus, par palette dominante
- Tri : date de création, date d'activation, ordre alphabétique

### Vue Détail lookbook

Cliquer sur un lookbook ouvre la vue détail.

- En-tête : titre, brief, statut, dates, tags, boutons actions
  (Activer / Archiver / Dupliquer / Télécharger PDF / Télécharger ZIP)
- Grille des 12-20 images, avec pour chacune :
  - Aperçu image
  - Famille (canonique / scène / texture / etc.)
  - Canonique injecté (le cas échéant)
  - Bouton "Voir prompt EN" (modal en lecture seule par défaut)
  - Bouton "Éditer prompt EN" (modal édition + re-gen)
  - Bouton "Re-générer" (relance Gemini avec même prompt)
  - Champ annotation libre Sarah
  - Toggle "Validée" (protection re-gen)
- Bloc "Ambiance extraite" affichée en lecture seule (palette, lieux, etc.)

### Vue Création

- Champ "Brief poétique" (input texte libre, max 200 chars)
- Bouton "Générer le lookbook"
- État de progression visible pendant la génération (étape 1 GPT-5.5,
  étape 2 Gemini × 20, etc.)
- Une fois généré, redirige automatiquement vers la vue Détail en mode Brouillon

### Cycle Activer / Archiver / Dupliquer

- **Activer** : passe le statut Brouillon ou Archive → Active. Renseigne
  date_activation. N'affecte pas les autres lookbooks Active.
- **Archiver** : passe Active → Archive. Renseigne date_archivage. Le
  lookbook reste consultable et téléchargeable.
- **Dupliquer** : crée un nouveau lookbook Brouillon basé sur l'existant.
  Sarah peut alors modifier brief, prompts EN, re-générer. Utile pour
  itérer sur une saison passée sans la détruire.

---

## 6. Stack technique

### Recommandations indicatives (à trancher avec Claude Code au moment du build)

**Frontend** : Next.js si l'on veut s'aligner avec atelier-social, OU Vite +
React si l'on s'aligne avec atelier-shooting forké. La cohérence interne du
Hub plaide pour l'uniformisation à terme — choix à faire en cohérence avec
la trajectoire de migration globale.

**Stockage des données** : Supabase (déjà connecté au Hub d'après le contexte
MCP). Une table `lookbooks` (métadonnées + JSON ambiance) + un bucket
`lookbook_images` pour les fichiers Gemini en haute résolution.

**Stockage des images** : bucket Supabase Storage (cohérence Hub) ou
système de fichiers local sous `/assets/lookbooks/{slug}/`. Le bucket cloud
permet le partage / consultation depuis plusieurs machines, le local évite
toute dépendance externe. À trancher selon le besoin de mobilité de Sarah.

**APIs LLM** :
- OpenAI GPT-5.5 pour la décomposition créative du brief (clé existante Hub)
- Google Gemini pour la génération d'images (clé existante shoot_studio)

**Connexion atelier-shooting** : lecture directe Supabase (atelier-shooting
fait une requête à la table `lookbooks` pour peupler son dropdown), ou
export JSON statique régénéré à chaque modification. Le premier est plus
dynamique, le second plus simple.

**Téléchargement PDF/ZIP** : génération côté serveur (Node) avec une lib
type `pdfkit` pour le PDF et `archiver` pour le ZIP.

---

## 7. Roadmap d'implémentation

### V0 — POC (1-2 jours)

Objectif : valider le pipeline brief → 20 images.

- Page unique React avec un champ texte et un bouton
- Backend Node minimal qui :
  - Appelle GPT-5.5 avec le brief + system prompt D2
  - Récupère les 20 prompts EN
  - Lance Gemini × 20 en parallèle (Promise.allSettled)
  - Renvoie les 20 images à l'écran
- Pas de stockage, pas de bibliothèque, pas de tags, pas d'export.
- Critère de validation : Sarah génère 3 lookbooks différents
  ("Porto Vecchio", "Nuit à Londres", "Rouge Passion") et juge la qualité
  visuelle satisfaisante pour passer en V1.

### V1 — Bibliothèque dynamique (3-5 jours)

Objectif : transformer le POC en outil utilisable.

- Stockage Supabase (lookbooks + images)
- Vues Dashboard / Détail / Création
- Cycle de vie Active / Archive / Brouillon / Dupliquer
- Re-génération unitaire d'image
- Édition manuelle de prompt EN
- Tags automatiques par GPT-5.5
- Recherche + filtres dans la bibliothèque

### V2 — Connexion atelier-shooting (1-2 jours)

Objectif : faire vivre le lookbook au-delà des RS.

- Atelier-shooting gagne un dropdown "Ambiance lookbook"
- Lecture du bloc `ambiance_extraite` injectée dans les prompts de shots
- Validation : Sarah produit un shot produit Ypersoa en utilisant
  l'ambiance "Porto Vecchio" 6 mois après l'avoir générée

### V3 — Raffinements (au fil de l'eau)

- Export PDF léché (template livrable de marque)
- Export ZIP avec dossier structuré
- Annotations enrichies sur les images
- Versioning des lookbooks (snapshot avant édition majeure)
- Partage de lien lecture seule pour Adriana / Maï (préfigure B2B)

---

## 8. Dépendances bloquantes

**Avant V0** :
- Clé OpenAI GPT-5.5 active (déjà dans le Hub ✅)
- Clé Google Gemini active (déjà dans shoot_studio ✅)
- Décision sur la stack frontend (Next vs Vite)

**Avant V1** :
- Supabase Hub configuré pour accueillir les nouvelles tables
- Décision stockage images : bucket cloud ou file system local

**Avant V2** :
- atelier-shooting forké (Phase 0+1 du plan migration shoot_studio)
- Hook 1 canoniques opérationnel dans atelier-shooting
- Schéma "ambiance" stabilisé entre les deux apps

---

## 9. Questions ouvertes restantes

1. **Casting Brune.** Sarah a mentionné "Brune" comme canonique candidat
   pour profil "jeune en road trip". À vérifier dans
   `mannequins_recurrents.json` que Brune est bien fichée et a un canonique
   visuel validé. Sinon, à ajouter au casting avant que atelier-lookbook
   puisse l'utiliser.

2. **Stack frontend du Hub.** Y a-t-il une décision globale en cours
   d'uniformisation Next vs Vite ? Atelier-lookbook devrait suivre cette
   direction plutôt que d'en ajouter une troisième.

3. **Format du PDF de téléchargement.** Maquette-papier-livrable type
   magazine de mode ? Catalogue avec grille standard ? Document à part
   entière à designer, peut-être en collab avec Maï.

4. **Qui peut activer / archiver ?** Si V3 ouvre à Adriana / Maï en
   lecture seule, il faut clarifier qui a le droit de modifier le statut
   d'un lookbook. V1 = Sarah uniquement, mais à anticiper.

5. **Limite de stockage / coût.** À 17 lookbooks/an × 20 images × 3 MB =
   ~1 GB/an. Pas de problème à court terme, mais prévoir une politique
   de rétention si la bibliothèque dépasse 100 lookbooks (5+ ans d'usage).

6. **Internationalisation des briefs.** Sarah tape en français, GPT-5.5
   produit des prompts EN. Le tag "saison" est-il extrait en français ou
   en anglais ? À décider pour la cohérence des filtres.

7. **Brand-safety sur les outputs visuels.** Les images Gemini sont
   produites par IA. Y a-t-il un check automatique avant intégration au
   lookbook (pas de logo concurrent visible, pas de visage célébrité, etc.) ?
   Ou est-ce que Sarah valide manuellement à chaque génération ?

---

## 10. Notes de session

Cette spec a été cadrée le 29 avril 2026 lors d'une session de fin de journée
après livraison Mama Club et migration VSCode. Décisions prises à tête fraîche
en milieu de journée, conformément au pattern Clémence du 29/04/2026.

Les décisions structurantes (UI bibliothèque dynamique permanente, GPT-5.5
intermédiaire, sélection canoniques intelligente) ont été tranchées sans
hésitation après que Sarah ait clarifié l'usage double : campagne + bibliothèque
permanente.

À ce stade, atelier-lookbook reste un chantier post-Mama Club. Aucun travail
d'implémentation ne démarre avant que le fork shoot_studio (Phase 0+1) ne soit
livré, parce que la connexion atelier-shooting est essentielle au sens du
produit.
