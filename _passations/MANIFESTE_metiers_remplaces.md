# Manifeste — Les métiers remplacés par le Hub Ypersoa

> Source de vérité fondatrice du Hub Ypersoa.
> Chaque app du Hub correspond à un métier d'agence créative
> qu'elle remplace.
>
> Document figé le 30 avril 2026 par Sarah Kedziora.
> À utiliser comme boussole pour toute évolution architecturale
> du Hub.

## Vision

Le Hub Ypersoa est un AI orchestrator centralisant des outils
AI Studio conçus pour remplacer les rôles d'agence créative.
Il enable le batch deployment de 150 motifs/an sur Shopify avec
full multi-channel content output.

## Liste des 14 métiers remplacés

| # | Métier remplacé | Module Hub correspondant |
|---|---|---|
| 1 | Directeur Artistique (DA) | Choix ambiances, canoniques, angles narratifs (atelier-DA) |
| 2 | Photographe shooting | Génération Gemini 3.1 — 5 angles éditoriaux (atelier-shooting) |
| 3 | Modèle / Mannequin | 23 canoniques AI character ref |
| 4 | Maquilleuse / Coiffeuse | Signatures style_wear + maquillage_signature dans fiches |
| 5 | Styliste shooting | style_wear par canonique avec pieces_favorites |
| 6 | Décorateur / Régisseur | 5 ambiances pré-définies (Studio Brut, Loft Organique...) |
| 7 | Retoucheur photo | Sortie Gemini directe (pas de retouche) |
| 8 | Copywriter | OpenAI gpt-4o — caption Insta + caption Pinterest (atelier-social) |
| 9 | Community Manager | 5 hooks éditoriaux par registre (atelier-social) |
| 10 | Brand Manager | Brand-safety regex + red lines automatiques (transverse) |
| 11 | Graphiste mise en page | Module overlay 5 templates HTML/Canvas (atelier-social) |
| 12 | Stratégiste contenu / Content planner | Mode Insta vs Pinterest avec formats spécifiques + calendrier hebdo (atelier-social) |
| 13 | SEO manager | Caption Pinterest officielle + rédacteur métadonnées (atelier-social) |
| 14 | Traducteur | Multi-langue 6-7 langues prévue d'ici 2027 (pas encore livré) |

## Cartographie des apps du Hub

```
HUB YPERSOA
│
├── atelier-DA              → Métier 1 : Directeur Artistique
│   (8 sous-modules — voir SPEC_atelier_DA.md)
│
├── atelier-shooting        → Métiers 2 + 7 : Photographe + Retoucheur
│   (à forker depuis shoot_studio legacy AIStudio)
│
├── atelier-social          → Métiers 8, 9, 11, 12, 13 :
│   Copywriter + CM + Graphiste + Content Planner + SEO
│
├── atelier-lookbook        → Métier 1 (sous-module DA, code séparé
│   pour migration future vers atelier-DA/lookbook/)
│
└── Brand-safety            → Métier 10 : Brand Manager (transverse,
                              regex + red lines partout)
```

## Règle de pureté du manifeste

Un sous-module = un métier. Si une fonctionnalité chevauche
plusieurs métiers, elle vit dans l'app du métier dominant.

### Cas tranchés le 30/04/2026

- Rédacteur fiche produit PDP Shopify → COPYWRITER (n°8) → atelier-social
- Rédacteur métadonnées → SEO MANAGER (n°13) → atelier-social
- Calendrier hebdo de publication → STRATÉGISTE CONTENU (n°12) → atelier-social

Ces fonctionnalités N'appartiennent PAS à atelier-DA, malgré
leur proximité créative avec le métier de DA.

## Évolutions du manifeste

Toute évolution de cette liste (ajout d'un métier, fusion
de deux métiers, déplacement d'une fonctionnalité d'une app
à une autre) demande un cadrage explicite avec Sarah.

Pas de drift silencieux. Le manifeste est la boussole.
