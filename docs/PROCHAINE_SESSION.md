# Prochaine session — incohérences et questions ouvertes

> Rédigé le 22 mai 2026 à la sortie de la session "Module Commandes Shopify V1".
> À mettre à jour à chaque session. Sert de point d'entrée pour Sarah + Claude.

---

## 0. Préambule

Cette session de handoff (22/05) n'a pas écrit de code feature. Elle a :
1. Documenté l'architecture multi-app et le mapping métiers
2. Préparé l'hébergement et l'auth pour Keyvan (`HANDOFF_KEYVAN.md`)
3. Listé ce qui est testé vs pas testé
4. Cartographié les incohérences et questions ouvertes (ce document)
5. Mis à jour les `.env.example` + créé `requirements.txt`

La prochaine session **technique** doit trancher les questions ci-dessous avant d'attaquer du code feature.

---

## 1. Incohérences à résoudre

### 1.1 Le dossier `apps/atelier-mediateque/` est vide

**Constat** : `apps/atelier-mediateque/` existe sur le filesystem mais est vide. Pendant ce temps :
- La spec est dans `docs/PLAN_MEDIATHEQUE/SPEC_MEDIATHEQUE.md`
- La migration est dans `docs/PLAN_MEDIATHEQUE/migration_mediatheque.sql`
- L'implémentation **a commencé dans `atelier-social`** (routes `/atelier-da/mediatheque/`, API `/api/da/mediatheque/audit/`)

**Décision attendue** :
- Soit on **supprime** `apps/atelier-mediateque/` (le dossier vide est trompeur)
- Soit on **migre** ce qui est dans `atelier-social/src/app/atelier-da/mediatheque/` vers une vraie app séparée

Recommandation Claude : supprimer le dossier vide, garder la médiathèque comme module interne au hub `atelier-social`. C'est cohérent avec le principe "atelier-social = hub principal".

### 1.2 `apps/atelier-incarnation/` ne contient que de la doc

**Constat** : le dossier contient SPEC + XLSX + SQL + Liquid, mais zéro code TS/TSX. La route `apps/atelier-social/src/app/atelier-da/incarnations/` existe (vide).

**Décision attendue** : même choix que §1.1 — implémenter dans `atelier-social/.../atelier-da/incarnations/` (Sprint 1 MVP de la spec) ou créer une vraie app séparée.

Recommandation : implémenter dans `atelier-social`. L'isolation par app n'apporte rien ici.

### 1.3 Double route motifs : `/atelier-da/motifs` vs `/atelier-production/motifs`

Cf. commentaire dans `apps/atelier-social/next.config.ts` (lignes 11-15) :
> *"Le redirect /atelier-da/motifs → /atelier-production/motifs a été RETIRÉ le 20/05 : /atelier-da/motifs est désormais la vue catalogue créative (Motifs / Variantes / Catalogue) et /atelier-production/motifs reste la vue technique pour Adriana."*

**Constat** : deux vues coexistent, peut-être avec du code dupliqué. À auditer.

**Action** : grep `atelier-da/motifs` et `atelier-production/motifs` côté composants — confirmer qu'on n'a pas de logique métier dupliquée. Si oui, extraire dans `src/lib/motifs/`.

### 1.4 `referentiels/palette_fils_broderie.json` vs `palette_fils_broderie_v2.json`

Les deux existent en parallèle. v2 est la canonique d'après CLAUDE.md (cf. §6 prod_hub_README) mais v1 traîne.

**Action** : auditer les imports — quelles apps lisent v1 ? Si plus rien : supprimer. Si oui : migrer vers v2 puis supprimer.

### 1.5 `next_config.ts` du module `atelier-social/next.config.ts` a un redirect manquant ?

Le commentaire dit que le redirect `/atelier-da/motifs` → `/atelier-production/motifs` a été retiré. Sarah doit confirmer qu'aucun navigateur ne reste bloqué sur cache 308.

### 1.6 22 canoniques documentés, 23 sur le mur

CLAUDE.md mentionne 23 canoniques (22 famille no-makeup + 1 maquillée chic), mais §4 ne détaille que 21 (P01-P12 + S13-S21). Le 22e et 23e ne sont pas dans la table.

**Action** : aller voir `referentiels/casting/mannequins_*.json` pour compter exactement, et compléter le tableau CLAUDE.md.

### 1.7 Hexes vs noms dans les prompts vs swatches

Règle CLAUDE.md : `#5C0E1F` interdit en prompt, OK en swatch UI. Cf. CLAUDE.md §6 et §9.13. À garder en tête lors des refacto.

---

## 2. Questions ouvertes non tranchées

### 2.1 De CLAUDE.md §7 — questions toujours d'actualité

- **Combien de canoniques dans la famille "maquillée chic"** ? 1 à ce jour (Clémence). Ajouter Mathilde / Salomé ?
- **Casting enfants** : 2 enfants + 1 bébé suffisants ? Ajouter 1 ado 12-15 ans pour cohérence "mère d'ado Clémence" ?
- **Documentation canoniques restantes** : ~17 fiches au format `mannequins_lot1` complet à écrire
- **Module Reels + Stories 9:16** : ouverture par atelier-motion mais pas encore implémenté UI
- **Mémoire favoris ❤️** : où stocker, comment afficher
- **Personnalisation overlay au-delà des 5 templates** : ajouter "split-vertical", "magazine-cover", "instagram-frame" ?
- **Pinterest avec overlay (V2)** : limitations algo Pinterest sur texte sur image à étudier

### 2.2 De CLAUDE.md §9.14 — TODOs V2 module Commandes

| Feature | Effort estimé |
|---|---|
| Upload PDF Shopify auto-parsé | 1 session |
| Planning global multi-commandes (vrai OTIF inter-commandes) | 2-3 sessions |
| Drag-and-drop manuel des slots planning | 1-2 sessions |
| Export PDF bons d'atelier | 1 session |
| Import en masse FT YPM (parser PDF Tajima Pulse) | 1 session |
| Mode "broderie en cours" avec timer live | 1 session |
| Notifications statut (Slack / email) | 1 session |
| Webhook Shopify création commande auto | 2 sessions |

### 2.3 Nouvelles questions remontées par cette session de handoff (22/05)

- **Auth : Supabase Auth ou NextAuth ?** — Sarah laisse Keyvan trancher, cf. HANDOFF_KEYVAN.md §4.1
- **Hébergement : Vercel ou VPS ?** — pareil, à voir avec Keyvan
- **Domaine racine** : `hub.ypersoa.fr` confirmé ? Ou un autre ?
- **Storage assets** : faut-il vraiment migrer 400 MB d'assets de FS vers Supabase Storage ? CDN externe ?
- **Rotation des clés** : faut-il rotater MAINTENANT (avant handoff Keyvan) ou attendre le déploiement ?
- **Backup actuel** : aucun backup Supabase ni assets configuré. À mettre en place AVANT toute manipulation lourde par Keyvan.

---

## 3. Implémentation en attente (commits non finalisés)

Au 22 mai 2026, 212 fichiers en `git status`. Cette session a documenté mais pas committé toutes les features. Les groupes en cours (à valider par Sarah avant commit feature) :

### 3.1 Module Atelier DA — Médiathèque + Incarnations + Motion (en cours)

- Routes UI `/atelier-da/incarnations/`, `/atelier-da/mediatheque/`, `/atelier-da/motion/`
- API associées sous `/api/da/`
- Composants `AuditProductionDrawer.tsx`, `AddCustomImageModal.tsx`, `CreateProductSheetModal.tsx`, etc.
- Libs `incarnations/store.ts`, `mediatheque/store.ts`, `mediatheque/taxonomie.ts`, `motion/engine.ts`

### 3.2 Module Atelier Production — Catalogue, Fils, Palettes, Règles, Kanban, Attribution

- Routes UI `/atelier-production/{motifs,fils,palettes,kanban,attribution,regles}/`
- API `/api/da/{fils,palettes,regles-broderie,attribution-library,gunold-catalog,prod-kanban}/`
- Lib `atelier-da/moteur-attribution.ts`

### 3.3 Module Commandes Shopify (CLAUDE.md §9)

- Routes UI `/atelier-production/commandes/` + `[id]/` ✅ documentées dans CLAUDE.md §9
- API `/api/production/commandes/` + `[id]/` + `[id]/planning/` + `[id]/rebroder/`
- Libs `production/commandes-loader.ts` + `production/planning-allocator.ts`

### 3.4 Module Atelier Shooting — Catalog shots + Packshots

- `apps/atelier-shooting/components/CatalogShotModal.tsx`
- `apps/atelier-shooting/lib/catalog-shots.ts`
- `apps/atelier-shooting/public/packshots/`

### 3.5 Module Atelier Lookbook — Custom image

- Routes API `/api/add-custom-image/`, `/api/palettes/`, `/api/regenerate-image/`
- Composant `AddCustomImageModal.tsx`

### 3.6 Module Planable — Bulk delete + campaigns delete

- Routes API `/api/calendar/bulk-delete/`, `/api/campaigns/[slug]/entries/`

### 3.7 Atelier Motion (lib TS)

- `apps/atelier-motion/{ARCHITECTURE.md, index.ts, motion.ts, veo-client.ts}`

### 3.8 Atelier Incarnation (spec)

- `apps/atelier-incarnation/{04_INCARNATIONS.xlsx, SPEC_INCARNATIONS.md, card_product_contextuel.liquid, collections_shopify_automatiques.md, metafield_le_club_exemple.json, migration_incarnations.sql}`

### 3.9 Assets binaires

- Tout `assets/motifs dst/*.DST` (~40 fichiers) ⚠️ versionner sur git ?
- Tout `assets/motifs pxf/*.PXF` (~40 fichiers) ⚠️ versionner sur git ?
- Tout `assets/motifs ft/*.pdf` (~20 fichiers) ⚠️ versionner sur git ?
- PNG aperçus motifs `assets/motifs/YPM-*.PNG`

⚠️ **Question critique** : faut-il commiter ces binaires sur git ? Estimation ~200 MB. Recommandation : **non**, gérer via Git LFS ou Supabase Storage directement. À discuter avec Keyvan AVANT de pousser sur un remote partagé.

---

## 4. Dépendances cassées potentielles

À auditer en début de prochaine session :

- [ ] `pnpm install` à neuf fonctionne-t-il sur tous les workspaces ?
- [ ] `pnpm type-check` passe-t-il sur les 4 apps Next.js ?
- [ ] `pnpm --filter @ypersoa/planable-ypersoa test` passe-t-il toujours ?
- [ ] Le symlink `apps/atelier-social/public/motifs` → `assets/motifs` existe-t-il (sinon les PNG sont 404) ?
- [ ] `streamlit run prod_hub/preview_app.py` démarre-t-il sur Python 3.11+ avec `requirements.txt` ?

---

## 5. Risques produit identifiés

### 5.1 Drift entre référentiel et UI

Les 14 référentiels JSON sont modifiables à la main par Sarah. Si elle édite `motifs_ypm.json` pendant qu'une commande référence un motif supprimé → exception côté commandes-loader. **Pas de garde-fou actuel**.

**Mitigation V2** : `pnpm validate:referentiels` qui run un schema check (Zod ou Ajv) + détection des FK orphelines.

### 5.2 Une commande archivée n'apparaît dans la search que si la search la trouve

Le bucket "Commandes Shopify" scanne TOUTES les commandes (actives + archivées). Match sur N champs. Mais si une commande a un champ vide ou typo (ex. ville mal saisie), elle peut être introuvable.

**Mitigation V2** : ajouter un champ `search_text` pré-calculé qui concatène tous les champs cherchables.

### 5.3 Le moteur d'attribution Python n'est pas branché sur Shopify

Aujourd'hui, Adriana lance `streamlit run preview_app.py` à la main. Le moteur n'est pas appelé automatiquement par une commande Shopify.

**Mitigation V2** : route `/api/production/commandes/[id]/attribuer-couleurs` qui appelle le moteur Python via subprocess ou Lambda dédiée.

### 5.4 La rotation des clés API n'a pas de processus documenté

Si une clé Gemini fuite : changer dans `.env.local` de chaque app + redéployer chacune. Manuel.

**Mitigation V2** : centraliser dans un secret manager (Vercel env vars, AWS Secrets Manager, etc.) — cf. HANDOFF_KEYVAN.md §5.4.

---

## 6. Recommandations pour la prochaine session

### Priorité 1 — Hygiène repo (avant tout code feature)

1. Décider : on commite les binaires assets ou pas ?
2. Lancer `pnpm install` propre, vérifier que tout boot
3. Faire les commits thématiques restants (cf. §3 de ce doc)
4. Confirmer rotation des clés ou pas

### Priorité 2 — Stabilisation modules en cours

1. Finir le module Incarnations Sprint 1 (cf. spec) — c'est différenciant pour Shopify
2. Brancher Atelier Motion en 8e atelier UI dans `atelier-social`
3. Valider la médiathèque bout-en-bout (upload photo shooting → audit produit → tag)

### Priorité 3 — Tests et CI

1. Couvrir `planning-allocator.ts` en vitest
2. Couvrir `commandes-loader.ts` (surtout `recalculerDureesCommande` avec respect manuel)
3. Couvrir `brand-rules.ts` (red lines absolues)
4. Mettre en place un workflow GitHub Actions minimal : `pnpm install` + `pnpm type-check` + `pnpm test`

### Priorité 4 — Préparation handoff Keyvan

1. Briefer Keyvan en visio sur l'archi (30 min)
2. Lui donner un accès admin Supabase
3. Le laisser choisir sa stack auth (cf. HANDOFF_KEYVAN.md §4.1)
4. Décider domaine + provider

---

## 7. Citations Sarah à se rappeler avant de coder

> *"DA = elle tranche le goût ; Claude fait la technique"* (CLAUDE.md §3)

> *"Mieux vaut 5 régénérations qu'une mauvaise canonique de référence"* (CLAUDE.md §3)

> *"Les décisions DA importantes ne se prennent pas en fin de journée fatiguée"* (CLAUDE.md §3)

> *"On innove, on crée, on teste"* (28/04 16h45 — décision overlay)

> *"Préfère doc trop long à doc qui fait perdre 2h de re-création"* (CLAUDE.md §3)
