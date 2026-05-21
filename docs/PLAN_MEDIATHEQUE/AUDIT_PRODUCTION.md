# Audit Production — Médiathèque

> Feature ajoutée le 22 mai 2026. Livrée dans le sprint d'extension de la
> médiathèque (post-Sprint 1 Médiathèque + post-Atelier Production Sprint 1).

---

## 1. Contexte / objectif

Sarah a 32 photos dans sa médiathèque, mais aucune vue de **couverture** : impossible de savoir d'un coup d'œil quelles combinaisons motif × produit × ambiance lui manquent encore avant un drop Shopify.

**Besoin formulé** :
> *"dans la médiathèque, est-ce que je peux avoir l'audit de production pour tous les motifs de YPM-000 à YPM-017 avec les 5 produits (YP001, YP004, YP005, YP019, YP021) — je veux pouvoir upload rapidement en 3 clics max"*

Suivi de :
> *"dans les ambiances, je veux le lookbook, ou le lifestyle"*

→ Une matrice **18 motifs × 5 produits × 2 ambiances = 180 cases** à remplir, avec upload en 2 clics max par case vide.

---

## 2. Décisions architecturales

### Matrice dense en lignes/colonnes avec 2 mini-slots par cellule
- **Décision** : layout `motifs en lignes / produits en colonnes / cellule = 2 carrés côte-à-côte (LB | LS)`. Tout l'audit en 1 écran.
- **Raison** : Sarah préfère la densité (cf §1 CLAUDE.md "Mac sans scroll, tout visible en 1 coup d'œil")
- **Écarté** : onglets Lookbook/Lifestyle séparés (2 clics pour switcher), accordéon par motif (perd la vue globale)

### Drawer plein écran, pas de page séparée ni d'onglet permanent
- **Décision** : bouton "Audit production" en haut de la médiathèque → drawer overlay plein écran (top/right/bottom/left = 24px)
- **Raison** : l'audit est un mode d'usage **ponctuel** (session de remplissage), pas une vue permanente. Ne pollue pas la grille de filtrage standard.
- **Écarté** : page `/atelier-da/mediatheque/audit` (bookmarkable mais alourdit la navigation), onglet permanent (toujours visible mais usage rare).

### Upload pré-taggé en 2 clics via file picker système
- **Décision** : click sur cellule vide `[+]` → `requestAnimationFrame(() => fileInputRef.current?.click())` ouvre le file picker natif. L'utilisateur choisit 1 fichier → upload immédiat avec les 3 tags pré-remplis (motif + gabarit + plan).
- **Raison** : Sarah a demandé "3 clics max". On fait **2** : (1) click cellule, (2) sélection fichier dans picker.
- **Écarté** : modal avec dropzone + champs métadonnées + bouton "Valider" (3 clics minimum + saisie), drag-drop direct sur la cellule (UX moins évidente sur une matrice dense de 90 cellules).

### Tags utilisent le pattern `seed-{category}-{slug}` directement côté client
- **Décision** : pour pré-remplir `tag_ids` dans `createMedia()`, on construit l'ID directement : `seed-motif-ypm-006`, `seed-gabarit-yp001`, `seed-plan-lookbook`. Pas d'appel à `/api/da/mediatheque/tags` au préalable.
- **Raison** : `SEED_TAGS` génère les IDs déterministiquement avec ce pattern (cf [taxonomie.ts:118-125](apps/atelier-social/src/lib/mediatheque/taxonomie.ts#L118-L125)). Économise un round-trip réseau.
- **Limite assumée** : ne marche **que** pour les seed tags. Les tags custom (UUIDs créés via `createTag()`) ne sont pas concernés par l'audit, ce qui est OK car les 18 motifs / 5 gabarits / 2 plans sont **tous** des seed tags.

### Source `shooting_studio` pour lookbook, `shooting_lifestyle` pour lifestyle
- **Décision** : mapping automatique dans le drawer (`PLAN_SOURCE` constant) au moment du POST.
- **Raison** : Sarah n'a pas à choisir manuellement la source, le plan le détermine.
- **Écarté** : laisser l'utilisateur choisir (1 clic en plus, pas nécessaire).

### Slug "lookbook" ajouté à la catégorie `plan` (pas une nouvelle catégorie)
- **Décision** : nouveau slug `{ category: "plan", slug: "lookbook", label: "Lookbook / packshot porté" }` à côté de `lifestyle` qui existait déjà.
- **Raison** : ces 2 concepts sont des **plans photo** (cadrage/contexte), pas des ambiances au sens "5 ambiances Sézane" du CLAUDE.md. Cohérent avec `hero`, `buste`, `detail-broderie`, etc. déjà dans `plan`.
- **Écarté** : créer une nouvelle catégorie `usage` ou `contexte` (overhead taxonomie inutile), réutiliser `ambiance` (collision avec les 5 ambiances shooting).

### Pas d'édition inline d'une cellule remplie en V1
- **Décision** : click sur une cellule remplie (✓) = no-op. Sarah passe par la galerie normale pour modifier/supprimer une photo.
- **Raison** : l'audit a un seul job — combler les trous. La modif/suppression a son propre flow (galerie → détail photo).
- **Écarté** : ouvrir un modal de détail au click (complexifie le composant, doublonne le flow galerie).

---

## 3. Schéma data

Pas de nouvelle table. La feature est **100% calculée à la demande** depuis le store médiathèque existant.

### Fonction d'agrégation

[`getAuditMatrix(options)`](apps/atelier-social/src/lib/mediatheque/store.ts) dans `store.ts` :
- Parcourt tous les `MediaRow` du store
- Pour chaque média, extrait les tags catégorisés `motif`, `gabarit`, `plan`
- Si le média a (1 motif ∈ options.motif_slugs) ET (1 gabarit ∈ options.produit_slugs) ET (≥1 plan ∈ options.plan_slugs) → l'incrémente dans la(les) bonne(s) cellule(s)
- Note : un média avec **les 2 plans LB + LS taggés** comptera dans **les 2 cellules** (ce qui est correct sémantiquement)

### Réponse `AuditMatrix`

```ts
{
  motifs: [{ slug: "ypm-000", label: "Le Lien" }, ...],       // 18 entrées
  produits: [{ slug: "yp001", label: "Hoodie Adulte" }, ...],  // 5 entrées
  plans: [{ slug: "lookbook", label: "..." }, { slug: "lifestyle", ... }],
  matrix: {
    "ypm-000": {
      "yp001": {
        "lookbook": { count: 1, sample: { id, public_url, filename, statut } },
        "lifestyle": { count: 0, sample: null }
      },
      "yp004": { ... },
      ...
    },
    ...
  },
  totals: {
    cells_total: 180,
    cells_filled: 47,
    photos_total: 62
  }
}
```

Le `sample` est la **première** photo trouvée pour la cellule (sert de thumbnail dans l'UI).

---

## 4. API

### Route `GET /api/da/mediatheque/audit`

[apps/atelier-social/src/app/api/da/mediatheque/audit/route.ts](apps/atelier-social/src/app/api/da/mediatheque/audit/route.ts)

**Query params** (tous optionnels — défauts intégrés) :
- `motif` (multi) — slugs motifs à inclure. Défaut : `ypm-000` à `ypm-017`
- `produit` (multi) — slugs gabarits. Défaut : `yp001, yp004, yp005, yp019, yp021`
- `plan` (multi) — slugs plans. Défaut : `lookbook, lifestyle`

Permet de réutiliser la même route pour des audits custom (ex. uniquement la collection Fête des Pères).

### Client TypeScript

[`fetchAuditMatrix(params?)`](apps/atelier-social/src/lib/mediatheque/api-client.ts) — wrapper fetch typé.

L'upload réutilise [`createMedia()`](apps/atelier-social/src/lib/mediatheque/api-client.ts) existant, avec `source` calculé selon le plan et `tag_ids` construits avec le pattern `seed-{category}-{slug}`.

---

## 5. UI — flow utilisateur

### Entrée
Bouton "Audit production" (icône `LayoutGrid`) dans [GalleryHeader.tsx](apps/atelier-social/src/components/mediatheque/GalleryHeader.tsx), entre les contrôles existants et le bouton Uploader.

### Drawer

[`AuditProductionDrawer`](apps/atelier-social/src/components/mediatheque/AuditProductionDrawer.tsx) :
- Overlay sombre `rgba(26, 22, 20, 0.55)` + backdrop-filter blur
- Panneau blanc 24px de marge, `border-radius: 20`
- Header sticky : titre + ligne stats ("47/180 cases (26%) · 62 photos") + bouton close
- Body scrollable horizontal+vertical avec table
- Footer apparaît pendant l'upload : "Upload en cours : YPM-006 · YP001 · LB"
- Escape pour fermer + click sur overlay pour fermer + body scroll lock

### Table

- **Première colonne** sticky (left: 0) avec ID motif (YPM-000) + label éditorial italique ("Le Lien")
- **Colonnes** = 5 produits (YP001 → YP021), header avec label dessous
- **Cellule** (motif × produit) = container flex avec 2 `CellSlot` côte-à-côte
- **Lignes** alternées blanc / rgba(255,255,255,0.55) pour la lisibilité

### CellSlot (52×64px)

| État | Rendu |
|---|---|
| Vide (`count === 0`) | Fond gris pâle + border dashed + icône `+` au centre + badge `LB`/`LS` en bas-gauche. Cursor pointer. |
| Rempli | Thumbnail de `sample.public_url` en `object-fit: cover` + badge plan en overlay bas-gauche (fond `rgba(26,22,20,0.7)`). Cursor default. |
| > 1 photo | Badge `×N` en haut-droite (rose terracotta `--color-brand-rose`) |
| Upload en cours | Spinner `Loader2` rose terracotta |
| Vient d'être rempli | Check vert `#365D40` flash en haut-droite |

### Mécanique upload

1. Click sur slot vide → `setPendingCell({ motif, produit, plan })` puis `requestAnimationFrame(() => fileInputRef.current?.click())`
2. Input file caché (1 seul dans le drawer) ouvre le picker système
3. `onChange` lit le fichier en data URL via `FileReader.readAsDataURL`, mesure dimensions via `new Image()`
4. POST `/api/da/mediatheque/media` avec `tag_ids: [seed-motif-X, seed-gabarit-Y, seed-plan-Z]` + `source` auto
5. Re-fetch la matrice → la cellule passe à ✓ avec flash check vert
6. `onChanged` callback bubble vers la page parent → `setReloadKey()` force le re-fetch de la galerie principale

---

## 6. Pièges et anti-patterns

### Pas mettre `lookbook` dans `ambiance` (collision sémantique)
- **Testé** : tentation de coller `lookbook` dans la catégorie `ambiance` à côté de Studio Brut / Loft Organique / etc.
- **Leçon** : les 5 ambiances Sézane sont des **moodboards visuels** (lumière, décor, palette). `lookbook` et `lifestyle` sont des **plans photo** (cadrage, intention). Catégorie `plan` reste le bon home.

### IDs tags : seed pattern vs UUID
- **Risque** : si demain quelqu'un crée un tag custom via `createTag()` avec un UUID, le pattern `seed-{cat}-{slug}` côté client ne le trouvera pas.
- **Mitigation actuelle** : l'audit travaille uniquement avec les seed tags (motifs/gabarits/plans sont tous figés). Documenté ici.
- **V2** : si l'audit doit supporter des tags custom, faire un fetch préalable de `/api/da/mediatheque/tags` pour résoudre les vrais IDs.

### Un média avec 2 plans taggés (LB + LS) compte dans 2 cellules
- **Décision assumée** : un média qui a à la fois le tag `plan:lookbook` ET `plan:lifestyle` incrémente les 2 cellules.
- **Raison** : c'est la **véritable** couverture — si la photo sert aux 2 usages, les 2 cellules sont effectivement "remplies".
- **Conséquence** : `photos_total` peut être < somme des `count` (un même média compté plusieurs fois).

### File picker programmatique : `requestAnimationFrame` obligatoire
- **Testé sans rAF** : Safari peut ignorer `inputRef.current.click()` s'il est appelé en plein milieu d'un render React (perçu comme "pas un user gesture")
- **Fix appliqué** : wrap dans `requestAnimationFrame(() => …)` pour laisser le browser finir le cycle d'event handler et l'attribuer à un user gesture valide
- **Leçon** : `<input type="file">` programmatique = toujours wrapper en rAF (ou `setTimeout(_, 0)`)

### Reset `e.target.value = ""` après chaque upload
- **Sans reset** : si Sarah upload le même fichier 2 fois (ex. test sur une autre cellule), le `onChange` ne se déclenche pas car le browser pense que la valeur n'a pas changé
- **Fix appliqué** : `e.target.value = ""` immédiatement après extraction du file

---

## 7. Limites V1 / TODOs V2

| Limite V1 | Pourquoi | V2 possible |
|---|---|---|
| Pas de drag-drop sur cellule | UX dense, picker plus clair | Activer drag-drop par-cellule avec react-dropzone (1-2h) |
| Pas d'édition inline | Hors scope (1 job = combler) | Modal de détail au click sur ✓ rempli (2-3h) |
| Tags via seed pattern uniquement | Pas de tags custom dans l'audit | Pré-fetch `/api/da/mediatheque/tags` au mount du drawer (30 min) |
| 1 seule photo par upload | Sarah n'a pas demandé batch | Multi-file dans le picker avec attribution séquentielle à plusieurs cellules (4-6h, UX à designer) |
| Audit fixe sur 5 produits | Spec V1 | Sélecteur de produits/motifs/plans en header du drawer (1-2h) |
| Pas de filtre statut (à valider / validée) | Audit = quantité, pas qualité | Toggle "Compter uniquement les validées" (30 min) |
| Source figée par plan | Logique simple | Permettre override dans un sous-menu sur l'upload (1h) |
| Pas de bulk-tag (re-tagger des photos existantes) | Audit est en mode "upload" | Mode "audit-tag" : pour chaque cellule, drag-drop d'une photo existante depuis la galerie pour la tagger (3-4h) |

---

## 8. Inventaire fichiers livrés

### Modifiés

- [apps/atelier-social/src/lib/mediatheque/taxonomie.ts](apps/atelier-social/src/lib/mediatheque/taxonomie.ts) — ajout slug `plan/lookbook`
- [apps/atelier-social/src/lib/mediatheque/store.ts](apps/atelier-social/src/lib/mediatheque/store.ts) — fonction `getAuditMatrix()`
- [apps/atelier-social/src/lib/mediatheque/api-client.ts](apps/atelier-social/src/lib/mediatheque/api-client.ts) — `fetchAuditMatrix()` + types `AuditMatrixResponse`
- [apps/atelier-social/src/components/mediatheque/GalleryHeader.tsx](apps/atelier-social/src/components/mediatheque/GalleryHeader.tsx) — bouton "Audit production" + prop `onOpenAudit`
- [apps/atelier-social/src/app/atelier-da/mediatheque/page.tsx](apps/atelier-social/src/app/atelier-da/mediatheque/page.tsx) — état drawer + reload key sur upload

### Créés

- [apps/atelier-social/src/app/api/da/mediatheque/audit/route.ts](apps/atelier-social/src/app/api/da/mediatheque/audit/route.ts) — route GET avec défauts intégrés
- [apps/atelier-social/src/components/mediatheque/AuditProductionDrawer.tsx](apps/atelier-social/src/components/mediatheque/AuditProductionDrawer.tsx) — drawer + table + CellSlot

---

## 9. Citation Sarah à graver

> *"dans la médiathèque, est-ce que je peux avoir l'audit de production pour tous les motifs de YPM-000 à YPM-017 avec les 5 produits — je veux pouvoir upload rapidement en 3 clics max"*

> *"dans les ambiances, je veux le lookbook, ou le lifestyle"*

(22 mai 2026 — itération en 2 messages, livraison 2 clics réels au lieu des 3 demandés)
