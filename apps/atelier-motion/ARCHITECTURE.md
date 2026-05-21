# apps/atelier-motion — Atelier Motion

8ᵉ atelier du hub Ypersoa. **Une seule responsabilité : animer une
Collection.** Tout le reste (casting, fils, ambiances, brand-safety,
génération d'images) vit déjà dans le hub et n'est jamais recalculé ici.

C'est la version juste de ce qui s'appelait `atelier-reels` : ce module-là
refaisait le casting et la brand-safety que le hub fait déjà mieux. Ici, on a
dégagé tous les doublons. Ne reste que le maillon réellement manquant :
image → vidéo.

---

## Pourquoi ce module est mince

Le hub (vu dans les captures) fait déjà 90 % du travail :

| Besoin | Déjà fait dans le hub |
|---|---|
| Mannequins cohérents | Casting / Mur des canoniques (23 + 3 lignées), Atelier Shooting (~95 % fidélité visage via canonique en réf. Gemini) |
| Fils | Référentiel fils Gunold (55, 10 TMEZ canoniques) |
| Ambiances / DA | Atelier Lookbook (6 ambiances + lookbooks actifs 7 j) |
| Brand-safety | Atelier Social (badge « Brand-safe ✓ ») |
| Images produit-porté | Atelier Shooting (collections datées, ex. « YP001 — 22:59:25 ») |

Le **seul** manque : transformer ces images figées en clips animés. C'est
tout ce que fait Atelier Motion.

## Entrée : une `Collection` (deux origines, un seul chemin)

L'unité d'entrée est toujours une `Collection` produite par l'Atelier
Shooting. Deux façons d'en obtenir une (choix Q1 = les deux) :

- **A. Archivée** — `hub.getCollection("YP001 — 22:59:25")` : on rejoue une
  série déjà générée (bouton « Restaurer cette collection » du hub).
- **B. Fraîche** — l'Atelier Shooting génère puis enchaîne directement. Même
  interface : la `Collection` est l'unité commune, peu importe son origine.

## Le hub est lu, jamais recalculé (choix Q2)

`src/hub/index.ts` définit `HubGateway` : le contrat de lecture.

- `HubMonorepo` — implémentation réelle, à brancher sur les vrais modules
  (Casting, Atelier Lookbook, Atelier Shooting, `atelier-social`).
- `HubStub` — reproduit la *forme* des données des captures pour tourner hors
  hub (dev/test).

La brand-safety est **relayée**, pas recodée : `verifierBrandSafety` délègue à
`atelier-social`. Si le hub a rejeté une collection, Motion s'arrête net — il
n'outrepasse jamais le verdict du hub.

## Pipeline

```
hub.getCollection(id)                 ← Collection (archivée ou fraîche)
  → hub.verifierBrandSafety()         ← verdict atelier-social (relayé)
  → hub.getLookbookActif()            ← image de STYLE (lookbook 7j)
  → sélection narrative (court/complet)
  → ClipPlan[]  (sujet = photo Shooting, style = lookbook, prompt = mouvement)
  → Veo 3.1 image→vidéo (8s, 9:16)
  → Motion { clips, ordreMontage, aFaireManuel }
                                       ↑
                  assemblage A/V + son tendance = MANUEL (Veo ne le fait pas)
```

## Sélection narrative

7 clips × 8 s = 56 s : trop long et coûteux. Défaut = **court** (~32 s) :
un shot par type prioritaire, le **MACRO BRODERIE en hook** (le détail qui
arrête le scroll), clôture lifestyle. Format **complet** disponible si tu
assumes un Reel long. Les types de shot sont ceux du hub (tags Atelier
Shooting : PORTRAIT ÉDITORIAL, MACRO BRODERIE, LIFESTYLE MODE/EXTÉRIEUR,
SCÈNE LARGE, TEXTURE/DÉTAIL, OBJET/PROP).

## Pourquoi la photo Shooting devient l'image SUJET

C'est le cœur du design. La photo de l'Atelier Shooting est **déjà** validée
et cohérente au canonique (~95 %). En la passant comme image sujet à Veo, on
neutralise la faiblesse connue de Veo (continuité de personnage entre plans)
sans rien recalculer. Le lookbook actif sert d'image de style pour verrouiller
la DA. Veo n'invente pas le mannequin : il anime une image déjà juste.

## Ce que Veo NE fait pas (listé, pas masqué)

`Motion.aFaireManuel` énumère sans détour :

1. assemblage A/V des clips isolés ;
2. son tendance Instagram (aucune API ne fournit légalement les audios
   viraux — choix éditorial humain) ;
3. incrustation hook/sous-titres animés (la copy vient de l'Atelier Social) ;
4. contrôle qualité visuel final ;
5. publication / pousser dans `apps/planable-ypersoa`.

## Stack & intégration

TypeScript, `tsc` clean, testé bout en bout (stub hub + stub Veo) sur la
collection réelle des captures. Clé `GEMINI_API_KEY` — la même que ton app
AI Studio existante. Le risque de dérive du contrat d'API Veo est isolé dans
`src/engine/veo-client.ts`.

```
apps/atelier-motion/
├── ARCHITECTURE.md
└── src/
    ├── types/index.ts        Collection (entrée) + Motion (sortie)
    ├── hub/index.ts          HubGateway : lecture du hub, jamais recalcul
    ├── engine/
    │   ├── motion.ts         orchestrateur
    │   └── veo-client.ts     Veo 3.1 image+style→vidéo (risque API isolé)
    ├── cli.ts                npm run anim -- "YP001 — 22:59:25"
    └── ui/                   (coquille à brancher comme 8ᵉ atelier du hub)
```
