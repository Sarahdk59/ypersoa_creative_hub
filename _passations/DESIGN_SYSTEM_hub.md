# Design System — Hub Ypersoa (v2)

> Source de vérité visuelle du chrome ET du contenu des pages internes du Hub.
> v1 verrouillée en session du 30 avril 2026. **v2 — recadrage du 20 août 2026**,
> suite à l'audit du 18/08 et aux maquettes `hub-accueil-relook.html` /
> `atelier-blog-relook.html` validées par Sarah.
> NE PAS DÉVIER de ces décisions sans nouveau recadrage explicite avec Sarah.

## Ce qui a changé en v2, et pourquoi

L'audit du 18/08 a identifié 3 palettes de marque contradictoires dans le repo
(CLAUDE.md §2, `charte_editoriale.json`, Brand Voice & Design System v1) sans
trancher laquelle fait foi pour le Hub. En pratique, les tokens `--hub-*`
définis ici pilotent déjà ~76 fichiers (chrome ET contenu de toutes les pages
internes), pas seulement la "coquille" décrite en v1 — la séparation stricte
"shell neutre / apps colorées" de la v1 n'a jamais vraiment tenu dans le code.

**Décision v2** : `--hub-*` devient officiellement LE système visuel du Hub
(navigation + contenu de ses propres pages), réchauffé avec les accents
coquelicot/blush des maquettes. `--brand-*` reste une palette séparée,
réservée au **produit/marketing** (CLAUDE.md §2 — visuels Instagram/Pinterest,
overlay, contenu généré pour publication externe). Un changement du Hub ne
doit jamais faire dériver un visuel publié, et inversement.

## Tokens couleur du chrome — v2

```css
:root {
  --hub-bg:            #F7F2E8;  /* crème réchauffée */
  --hub-bg-alt:         #EFE7D6;  /* crème secondaire (cartes sur cartes) */
  --hub-foreground:    #1C3A36;  /* marine-teal profond — ink dominant */
  --hub-border:        #E2D8C6;
  --hub-accent:        #C23A2D;  /* coquelicot — CTA, pouls, attention */
  --hub-accent-hover:  #A22F24;
  --hub-accent-soft:   #EAB4C4;  /* blush — highlights doux, séries */
  --hub-accent-wash:   #F7E3E9;  /* blush très clair — fonds de nudge */
  --hub-teal:          #2E7D74;  /* teinte secondaire — succès, "publié" */
}
```

Le coquelicot est la seule couleur d'alerte/attention du chrome (pastille qui
pulse pour "ce qui demande ton attention" sur l'accueil). Ne pas la dupliquer
avec une autre teinte "urgence" ailleurs dans le chrome.

## Typographie — inchangée depuis Brand Voice & Design System v1

Le Hub réutilise la typographie déjà en place dans `globals.css`
(`referentiels/brand voice design system/`), pour rester "dans la même langue"
que le reste de la marque — pas de 4e/5e typo ajoutée pour la refonte :

- **Newsreader** (`--font-serif`) — titres de page, accueil, gros chiffres du
  pouls de la semaine, voix éditoriale.
- **Hanken Grotesk** (`--font-sans`) — nav, labels, boutons, formulaires, corps
  de texte.
- **Josefin Sans** (`--font-logo`) — logo Hub uniquement (wordmark topbar).

## Tokens layout du chrome — v2

```css
:root {
  --sidebar-width:    236px;  /* v1 : 64px icônes seules → v2 : sidebar libellée */
  --sidebar-icon:     20px;
  --topbar-height:    56px;
  --content-padding:  32px;
}
```

## Composants du chrome

### Topbar
- Hauteur : 56px, fond `var(--hub-bg)`, bordure bottom 0.5px `var(--hub-border)`.
- Logo Y rond + wordmark Josefin Sans, search Cmd+K, chip utilisateur + logout.
- Inchangé fonctionnellement en v2, restylé aux nouveaux tokens.

### Sidebar (v2 — étendue, libellée)
- Largeur : 236px, fond `var(--hub-bg)`, bordure right 0.5px `var(--hub-border)`.
- Groupe "Les ateliers" : Social, Blog, Planning, Studio, Bibliothèque —
  avec badge de compteur si pertinent (ex. "2" posts à valider).
- Groupe suivant, même niveau visuel : Atelier DA (casting/ambiances/
  incarnations/Radar), Atelier Production. Radar a rejoint Atelier DA le
  21/08/2026 (n'était plus un atelier de premier niveau), débarrassé de
  Google Trends à cette occasion (Pinterest seul en V1).
- Icône/libellé actif : fond `var(--hub-bg-alt)` ou `var(--hub-bg)`, texte
  `var(--hub-foreground)`, trait vertical `var(--hub-accent)` à gauche.
- Icône/libellé inactif : opacité ~0.7, hover → opacité 1.
- Bas de sidebar : Brand Book, Guide, puis chip utilisateur (avatar initiale +
  prénom + rôle).

### Accueil
- Bloc hello personnalisé (prénom depuis `profiles.full_name`), Newsreader.
- 4 cartes "pouls de la semaine" — un point coquelicot qui pulse = ce qui
  demande l'attention de l'utilisateur.
- Grille "Les ateliers" : cartes éditoriales teintées (pas des tuiles
  identiques), une teinte + une phrase d'état réelle par atelier.

### Fil de broderie
- Classe utilitaire `.hub-stitch` (`app/globals.css`) : ligne pointillée en
  `currentColor`, réutilisée dans la sidebar, l'accueil, l'en-tête des cartes.
  C'est l'élément qui signe "Ypersoa" plutôt qu'un template SaaS générique.

## Règles de cohabitation chrome ↔ contenu métier

1. `--hub-*` pilote le chrome ET les pages internes du Hub (accueil, ateliers,
   listes, formulaires). C'est la norme désormais, pas une exception.
2. `--brand-*` (CLAUDE.md §2) reste réservé au contenu **produit/marketing** —
   overlay Instagram/Pinterest, hashtags, visuels générés pour publication.
   Ne jamais faire fuiter `--hub-accent` (coquelicot chrome) dans un template
   d'overlay ou une palette de packshot : ce sont deux systèmes différents qui
   peuvent partager des teintes proches par coïncidence, jamais par référence.
3. Les titres de page utilisent Newsreader (`var(--font-serif)`).
4. Les éléments fonctionnels (boutons, labels de form) utilisent Hanken
   Grotesk (`var(--font-sans)`).
5. Le logo/wordmark Hub reste seul à utiliser Josefin Sans.

## Évolutions interdites sans recadrage

- Ajouter une 4e couleur d'accent au chrome (au-delà crème/marine/coquelicot/
  blush/teal ci-dessus).
- Ajouter une typo supplémentaire au chrome.
- Faire dériver `--brand-*` (palette produit) depuis ce document — l'inverse
  n'est pas non plus permis.
- Changer la largeur sidebar ou la hauteur topbar hors session de recadrage.

Toute évolution structurante demande un nouveau passage en cadrage avec Sarah.
