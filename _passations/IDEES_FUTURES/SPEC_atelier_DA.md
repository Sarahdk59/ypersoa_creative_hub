# Atelier-DA — Spécification décisionnelle

> Spec V1 décisionnelle de l'app atelier-DA.
> Cadrée le 30 avril 2026 en fin de journée après livraison shell.
> NE PAS commencer l'implémentation sans relecture à tête fraîche
> le lendemain matin.

## 1. Concept et positionnement

Atelier-DA est l'app du Hub Ypersoa qui porte le métier
"Directeur Artistique" (n°1 du manifeste). Elle centralise
tous les espaces de travail dans lesquels Sarah pense, décide
et oriente la direction artistique de la marque, depuis la
mémoire vivante du casting jusqu'au plan de shooting.

## 2. Place dans l'écosystème Hub

```
HUB YPERSOA (shell unifié, déjà livré)
│
├── atelier-social          (Copywriter + CM + Content + SEO + Graphiste)
├── atelier-shooting        (Photographe + Retoucheur, à forker)
├── atelier-DA              ← CETTE APP
└── atelier-lookbook        (cousin proche, migration future
                             vers atelier-DA/lookbook/)
```

Atelier-DA est un nouveau venu majeur dans le Hub. Elle
s'appuie sur les fondations existantes (canoniques, ambiances,
motifs YPM) qui vivaient jusqu'ici comme données mortes dans
referentiels/ et CLAUDE.md, et elle les transforme en espaces
de travail vivants.

## 3. Les 8 sous-modules de l'app DA

### Sous-module 1 — Casting / mur des canoniques

L'espace de travail du **directeur de casting** intégré au DA.
Pas une simple visualisation : un moteur narratif intelligent
qui transforme les 23 canoniques en personnalités vivantes.

Cas d'usage formulés par Sarah :
- "Je veux un shooting pour un anniversaire en mai"
  → "C'est l'anniversaire de Gabin"
- "Noël"
  → "Pense à shooter Coline, Hugo, Noé"

Voir _passations/IDEES_FUTURES/NOTE_atelier_casting.md pour le
détail de ce moteur narratif.

### Sous-module 2 — Plan de shooting

Intègre l'app shooting_director existante (Vite + React +
Express + better-sqlite3, Gemini 3.1 Pro pour génération de
plans structurés). Production de plans de shooting cohérents
pour une collection : DA globale, casting, scènes, shotlist,
planning par jours.

Migration depuis shooting_director standalone vers sous-module
de atelier-DA à cadrer en session dédiée.

### Sous-module 3 — Référentiel motifs YPM

Vue catalogue des 17 motifs Ypersoa avec leurs noms commerciaux
(La Brigitte, L'Ambre, Le Club, Notre Héritage, etc.), leurs
assets sources, leurs statuts, et les shots qui les ont mis
en scène.

Aujourd'hui éparpillé dans assets_produits, CLAUDE.md, Shopify.

### Sous-module 4 — Création motifs YPM et variantes

Outil de création de nouveaux motifs YPM selon un template
défini, et de variantes des motifs existants. Pendant créatif
du sous-module 3 qui n'expose que les motifs déjà créés.

À cadrer plus précisément : quel template, quel pipeline,
quelle validation.

### Sous-module 5 — Règles et contraintes broderies pour production

Aide à la production. Documente et expose les règles techniques
de broderie sur métier Tajima : tailles compatibles, contraintes
de couleurs, exclusions par produit, formats DST, paramètres
de digitalisation.

Sert d'interface entre la créativité DA et la réalité atelier
Adriana.

### Sous-module 6 — Référentiel d'ambiances

Vue catalogue des ambiances créées dans le Hub (issues de
atelier-lookbook + 5 ambiances pré-définies hardcodées). Le DA
peut faire glisser une ambiance dans son brief de shooting.

Lien direct avec atelier-lookbook (migration future vers
atelier-DA/lookbook/).

### Sous-module 7 — Bible de marque visuelle

Référence vivante de l'identité Ypersoa, consultable pendant
le travail :
- Palette officielle
- Typographies (Cormorant, DM Sans, Josefin Sans)
- Exemples "yes/no" en images
- Références muses (Sézane × A.P.C. × Maison Labiche)
- Red lines vocabulaires (interdiction "brodé à la main", etc.)

Aujourd'hui dans CLAUDE.md, charte_editoriale.json. Devient
visible et navigable.

### Sous-module 8 — Décisions DA archivées

Trace des grandes décisions DA dans le temps : "29/04/2026 :
Camille → Clémence, refonte hero canonique, raison X."
Aujourd'hui dans _passations/. Devient consultable dans
l'app comme histoire éditoriale de la marque.

## 4. Priorisation V1 / V2

### V1 (priorité forte)

1. Casting / mur des canoniques (le démangeant immédiat)
2. Plan de shooting (intégration shooting_director)
3. Référentiel motifs YPM (visuellement majestueux, identitaire fort)
4. Référentiel d'ambiances (lien naturel avec lookbook)

### V2 (priorité moyenne)

5. Bible de marque visuelle (utile mais pas urgent)
6. Création motifs YPM et variantes (créatif, demande cadrage produit dédié)
7. Règles broderies pour production (utile pour collaboration Adriana)
8. Décisions DA archivées (naturel comme évolution de _passations/)

## 5. Stack technique pressentie

À trancher en session dédiée d'implémentation. Hypothèses :
- Frontend Next.js (cohérence avec atelier-social et le shell Hub)
- Backend : selon besoins par sous-module (Express + SQLite
  pour shooting_director migré, lectures fichier pour les
  référentiels statiques)
- Modèles IA : Gemini 3.1 Pro (plans), GPT-5.5 (moteur narratif
  Casting)

## 6. Migration atelier-lookbook

Décision actée le 30/04/2026 : atelier-lookbook (existant,
fonctionnel partiel sur localhost:3003) deviendra à terme un
sous-module de atelier-DA, à l'emplacement
apps/atelier-DA/lookbook/.

Aujourd'hui : lookbook reste sur son port séparé, branché au
shell Hub (livré dans la session 30/04 matin).

Migration : non urgente. À planifier en session dédiée quand
atelier-DA aura sa structure de sous-modules en place.

## 7. Dépendances bloquantes

Avant le début d'implémentation V1 :
- Shell Hub livré (fait, branche feature/hub-shell)
- Manifeste 14 métiers figé (fait, ce dossier)
- Spec décisionnelle atelier-DA validée (ce document)

Pour le sous-module 2 (Plan de shooting) :
- Décision méthode d'intégration shooting_director :
  fork dans apps/atelier-DA/ ou intégration progressive ?

Pour le sous-module 1 (Casting) :
- Travail biographique préalable sur les 23 canoniques
  (date_anniversaire, saison_preferee, evenements_de_vie,
   traits_narratifs, affinites_qualifiees) — voir
  NOTE_atelier_casting.md

## 8. Questions ouvertes restantes

1. Stack frontend de l'app : Next.js ou autre ?
2. Comment Sarah accède aux sous-modules dans l'app : sidebar
   secondaire interne, tabs, navigation par cartes en home ?
3. Calendrier de livraison V1 : un sous-module à la fois ou
   scaffolding global puis remplissage progressif ?
4. Articulation finale lookbook : iframe persistant, merge
   complet, ou évolution progressive ?
5. Casting moteur narratif : déclenchement automatique pendant
   un brief shooting, ou consultation manuelle uniquement ?

## 9. Notes de session

Cette spec a été cadrée le 30 avril 2026 en fin de journée
(21h+) après livraison du shell Hub. Décisions prises dans
le flux d'une journée intense, méritant validation à tête
fraîche le lendemain matin.

Ne pas commencer l'implémentation avant relecture matinale
de cette spec et confirmation des choix par Sarah.
