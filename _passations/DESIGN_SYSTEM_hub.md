# Design System — Hub Ypersoa

> Source de vérité visuelle du shell Hub.
> Décisions verrouillées en session du 30 avril 2026.
> NE PAS DÉVIER de ces décisions sans recadrage explicite avec Sarah.

## Philosophie : la hiérarchie à deux niveaux

Le Hub fonctionne comme un studio textile physique : les murs
(le shell) sont neutres et permanents. Les mood boards (les apps)
sont colorés et changent. Le shell est le cadre, les apps sont
les toiles.

**Le shell ne porte JAMAIS de couleur d'app.**
**Le contenu d'une app porte SES couleurs, jamais celles d'une autre.**

## Les 4 principes verrouillés

### Principe 1 — Rôle émotionnel
Choix : atelier artisanal premium contemporain.
Référence mentale : studio textile haut de gamme,
lumière naturelle, lin, bois clair.

### Principe 2 — Contraste avec les apps
Choix : shell très silencieux, presque monochrome.
Les apps colorées doivent éclater contre le shell.

### Principe 3 — Typographie
Choix : 3 typos Josefin Sans + DM Sans + Cormorant Garamond
avec grammaire d'usage stricte (voir section Typographie ci-dessous).

### Principe 4 — Ornements
Choix : minimaux. Lignes 0.5px, ombres très douces uniquement
fonctionnelles (focus, hover). Pas de textures, pas de gradients,
pas de fioritures.

## Tokens couleur du shell — 3 valeurs SEULEMENT

```css
:root {
  --hub-bg:         #FAF7F2;  /* cream très pâle, papier de lin */
  --hub-foreground: #1E2D4A;  /* ink profond bleu-noir doux */
  --hub-border:     #E8E1D6;  /* gris cream subtil pour séparateurs */
}
```

INTERDICTION ABSOLUE d'introduire une 4ème couleur dans la chrome.
Le terracotta, le vert olive, le rouge passion vivent UNIQUEMENT
dans le contenu des apps.

Test pratique : si tu plisses les yeux devant la chrome, les bordures
doivent presque disparaître. Si elles sautent aux yeux, le contraste
border/bg est trop fort.

## Tokens typographie

### Josefin Sans — IDENTITÉ DE MARQUE
- Usage : logo Hub, titres de campagnes iconiques
- letter-spacing : 0.06em à 0.08em
- Poids : 400 et 500
- Tailles types : 16px (logo Hub topbar), 14px (mots-poésie petits)

### DM Sans — VOIX UTILITAIRE
- Usage : nav, labels, boutons, formulaires, tooltips, badges
- letter-spacing : 0
- Poids : 400 et 500
- Tailles types : 14px (nav), 13px (labels), 12px (badges)

### Cormorant Garamond — VOIX ÉDITORIALE
- Usage : titres de page dans les apps, intertitres évocateurs
- letter-spacing : -0.01em (légèrement serré)
- Poids : 400, 500, 600
- Tailles types : 32px (h1 app), 24px (h2), 18px (h3)
- Italic occasionnel pour intertitres évocateurs

INTERDICTION : Cormorant pour de la nav, Cormorant pour des boutons.
Cormorant est réservée à la prose éditoriale.

## Tokens layout du shell

```css
:root {
  --sidebar-width:    64px;
  --sidebar-icon:     20px;
  --topbar-height:    56px;
  --content-padding:  32px;

  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-6: 24px;
  --space-8: 32px;
  --space-12: 48px;
}
```

## Composants du shell

### Topbar
- Hauteur : 56px
- Background : var(--hub-bg)
- Bordure bottom : 0.5px solid var(--hub-border)
- Contenu gauche : logo Y rond ink + texte "YPERSOA HUB"
  en Josefin Sans 13px, letter-spacing 0.08em, weight 500
- Contenu droit : search (placeholder visuel), profile

### Sidebar
- Largeur : 64px
- Background : var(--hub-bg)
- Bordure right : 0.5px solid var(--hub-border)
- Icônes alignées verticalement, gap 6px, padding-top 12px
- Icône active : background var(--hub-foreground), icon stroke
  var(--hub-bg), border-radius 8px
- Icône inactive : opacity 0.45, icon stroke var(--hub-foreground),
  no background
- Hover icône inactive : opacity 0.8, transition 150ms
- Tooltip au hover : DM Sans 12px, fond var(--hub-foreground),
  texte var(--hub-bg)

### Zone de contenu
- Background : var(--hub-bg)
- Padding : 32px
- Contient l'app active

## Règles de cohabitation chrome ↔ contenu

1. La chrome (topbar + sidebar) est invariable selon l'app active.
   Seule l'icône sidebar active change de highlight.

2. Le contenu de l'app peut introduire SES couleurs accent
   (terracotta, vert olive, etc.) UNIQUEMENT dans ses boutons,
   chips, cards, badges. JAMAIS en background de section qui
   toucherait la chrome.

3. Les titres de page DANS une app utilisent Cormorant
   (var(--font-serif) ou import direct).

4. Les éléments fonctionnels DANS une app (boutons d'action,
   labels de form) utilisent DM Sans.

5. Si une app a besoin d'un branding fort (nom de campagne,
   nom de motif iconique), c'est Josefin Sans.

## Évolutions interdites sans recadrage

- Ajouter une 4ème typo
- Modifier les 3 hex codes du shell
- Introduire des gradients, textures, ornements lourds
- Brancher une couleur d'app dans la chrome
- Changer la largeur sidebar ou hauteur topbar

Toute évolution structurante demande un nouveau passage en cadrage
avec Sarah.
