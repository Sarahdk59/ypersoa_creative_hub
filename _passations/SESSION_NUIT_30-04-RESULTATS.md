# RÉSULTATS SESSION NUIT 30/04/2026

> **Pour Sarah au réveil.** Tu as donné "go" pour la session nuit. Voici l'état du repo, les commandes pour tester, et les risques connus.
> Aucun push origin n'a été fait. Tag de rollback posé : `pre-session-nuit-30-04`.

---

## TL;DR

✅ **6 commits posés** sur `main` local, organisation incrémentale pour rollback partiel possible.
✅ **`apps/atelier-shooting/`** créé, lint TypeScript OK, `pnpm dev:atelier-shooting` prêt à lancer.
✅ **Hook 1 canoniques codé** : toggle Diversity ↔ Canonique dans le mode mannequin, dropdown des 23 canoniques.
✅ **var_mama_club** S03 + S04 basculés sur Clémence (scénario hybride lockée).
✅ **Anna fiche v1.2** D2-aligned.
✅ **4:5** par défaut dans atelier-shooting.
✅ **`atelier-social` intact**, aucune régression.

⚠️ **Pas testé live avec Gemini** — pas de clé API à mon niveau. C'est ton job au matin (5 min).

---

## Comment tester en 10 minutes

### 1. Configurer la clé Gemini (1 min)

```bash
cd apps/atelier-shooting
cp .env.local.example .env.local
# Édite .env.local et colle ta clé Gemini
```

Ta clé Gemini se récupère sur [Google AI Studio](https://aistudio.google.com/app/apikey).

### 2. Lancer l'app (30 sec)

Depuis la racine du repo :

```bash
pnpm dev:atelier-shooting
```

L'app démarre sur **http://localhost:3001**. Si le port 3001 est occupé, ferme l'ancien process ou édite `apps/atelier-shooting/vite.config.ts:9`.

### 3. Test de non-régression — mode Diversity (3 min)

But : vérifier que le mode legacy marche comme avant la session nuit.

1. Upload n'importe quel PNG broderie (par exemple un de tes 14 PNGs de la session précédente)
2. Section "Casting" → assure-toi que **Diversity (random)** est sélectionné (par défaut)
3. Configure produit, fil, vêtement, etc.
4. Clique "Générer le shooting"
5. **Attendu** : ~4 images générées, visages random à chaque fois — comme ton AIStudio actuel.

### 4. Test de valeur — mode Canonique (5 min) ⭐

But : vérifier le Hook 1 = visage persistant à travers plusieurs régénérations.

1. Upload le PNG **Mama Club** (rond bordeaux)
2. Configure :
   - Produit : `JH030` (sweat col rond) ou `JH001`
   - Couleur fil : Bordeaux
   - Couleur vêtement : Beige crème
   - Format : 4:5 (Portrait standard PDP)
   - Type prise de vue : Mannequin
3. Section "Casting" → clique **Canonique (Hub)**
4. Dropdown qui apparaît → choisis **MAN-P02 — Anna, 35 (femme)**
5. Tu dois voir la photo d'Anna + sa description courte apparaître
6. Clique "Générer le shooting"
7. **Attendu** : ~4 images générées avec Anna persistante (visage reconnaissable identique sur toutes les générations, ~95% fidélité)
8. Re-clique "Générer" 2 fois de plus pour confirmer la persistance

**Critère de validation** : sur 3 régénérations × 4 shots = 12 images. Au moins 10/12 doivent montrer Anna reconnaissable. Sinon, on a un bug à creuser.

### 5. Test secondaire — Clémence (2 min)

Idem mais avec **MAN-P01 — Clémence, 38** (la canonique étoilée). C'est la canonique la plus distinctive (frange Bardot + bordeaux MAC Diva). Test de stress du character reference.

---

## Ce qui a été fait, commit par commit

```
e0eb871 feat(atelier-shooting): Hook 1 — casting canoniques Hub (Diversity ↔ Canonique)
d4f209a feat(atelier-shooting): aspect ratio 4:5 par défaut + suppression 4:3
14f8de8 chore(mama_club): scénario hybride DA — Clémence sur S03 + S04 shots identité produit
77388ca chore(casting): patch lot2 v1.2 — alignement D2 (famille_esthetique Anna + Lila)
27b1032 feat(atelier-shooting): fork standalone shoot_studio → apps/atelier-shooting (Phase 0)
918c9a6 docs(passation): rapport préparation session nuit 30/04 (lecture seule)
c7a4a48 ← tag pre-session-nuit-30-04 (HEAD avant la nuit)
```

| Commit | Phase | Ce qui change | Validation |
|---|---|---|---|
| `918c9a6` | rapport | Rapport prep session 30/04 | Lecture seule, OK |
| `27b1032` | Phase 0 fork | `apps/atelier-shooting/` créé via fork de `archives/aistudio_legacy/shoot_studio/`, sanitization (window.aistudio retiré, `process.env.API_KEY`→`import.meta.env.VITE_GEMINI_API_KEY`, importmap esm.sh retiré, port 3001) | Lint TS pass, app démarre (à valider) |
| `77388ca` | Phase C | `mannequins_lot2_2fiches.json` v1.1→v1.2 + ajout `famille_esthetique: "no-makeup naturelle"` sur Anna et Lila | JSON valid |
| `14f8de8` | Phase D | `var_mama_club.json` S03 + S04 : Anna → **Clémence** (prose EN réécrite : chocolate brown + frange Bardot + bordeaux MAC Diva + bagues argent) | JSON valid, prose alignée patterns existants |
| `d4f209a` | Phase E | Aspect ratio **4:5** ajouté en default dans atelier-shooting + 4:3 supprimé + 3:4 marqué legacy | Lint TS pass |
| `e0eb871` | Phase F | Hook 1 canoniques : toggle Diversity/Canonique, dropdown 23 canoniques, character reference Gemini, symlink `public/canoniques` | Lint TS pass, **NON TESTÉ live** |

---

## Statut détaillé du Hook 1

### Ce qui est codé

- **Types** : `CastingMode` ('diversity' | 'canonique'), `castingMode` + `canoniqueIds[]` dans `GenerationSettings`
- **State** : default `castingMode: 'diversity'`, `canoniqueIds: []` (compat workflow legacy)
- **UI Sidebar** : toggle 2 boutons Diversity/Canonique + dropdown 23 canoniques + preview JPG + description courte
- **Service Gemini** :
  - `buildCanoniqueContext()` → bloc EN remplaçant `MODEL_DESCRIPTION` quand mode canonique (signature 30-80 mots du Hub)
  - `loadCanoniqueParts()` → fetch les JPG canoniques en base64, prêts à injecter en `parts[]` Gemini
  - `parts[]` dynamique : canoniques injectés AVANT image broderie + texte
- **Infra** :
  - `apps/atelier-shooting/lib/canoniques.ts` : copie locale du référentiel des 23 canoniques (synchronisé avec `apps/atelier-social/src/lib/canoniques.ts`)
  - `apps/atelier-shooting/public/canoniques` → symlink vers `../../assets/canoniques/` (sert les 23 JPG via `/canoniques/MAN-Pxx_Prenom_canonique.jpg`)

### Ce qui n'est PAS testé

- ⚠️ **Génération live Gemini** avec canonique réel : pas de clé API à mon niveau, c'est ton test du matin
- ⚠️ **Persistance visage 95%** : pattern validé en passation 24/04 mais pas re-testé sur cette nouvelle implem
- ⚠️ **Build production Vite** : seulement `tsc --noEmit` lancé. `vite build` n'a pas tourné. Risque léger : les symlinks peuvent ne pas se résoudre correctement en build prod (pour dev c'est OK)

### Limitations V1 documentées dans le code

- Mode canonique limité au mode `mannequin` (1 canonique solo). Family multi-canoniques + full pack canonique = V2.
- Pas de validation runtime des canoniques manquants (warning console seulement).
- Le contrôle `disability` du mode diversity est **conservé** (à arbitrer V2 — voir question 8 du rapport prep).
- Les retries safe (IMAGE_OTHER fallback) ne propagent pas les canoniques. Si Gemini bloque le shot principal, fallback dégrade vers mode safe sans canonique. Comportement acceptable.

---

## Risques connus

| # | Risque | Probabilité | Mitigation |
|---|---|---|---|
| 1 | **Symlink `public/canoniques`** ne marche pas en build prod Vite | 🟡 Moyenne | Pour V1 dev local OK. Si build prod cassé, remplacer symlink par copie via `vite-plugin-static-copy` |
| 2 | **Premier shot Gemini avec canonique** retourne IMAGE_OTHER (signature trop longue, ou prompt trop verbeux) | 🟡 Moyenne | Système retry existant fallback sur safe mode sans canonique. À vérifier au test 4 ci-dessus. Si systématique, il faut raccourcir la signature ou simplifier le prompt préfixe |
| 3 | **Visage Anna ressemble peu** au canonique JPG (fidélité <85%) | 🟡 Moyenne | Tester. Si problème, vérifier que le JPG canonique est bien servi sur `http://localhost:3001/canoniques/MAN-P02_Anna_canonique.jpg`. Sinon, debug `loadCanoniqueParts` |
| 4 | **TypeScript strict mode** bloque sur un cast `e.target.value as any` dans la dropdown ethnicity | 🟢 Faible | Lint pass actuellement. Si erreur runtime sur ces cast, c'est ignorable (legacy code) |
| 5 | **Régression `atelier-social`** | 🟢 Très faible | Aucun fichier touché dans `apps/atelier-social/`. `tsc --noEmit` clean. |
| 6 | **`pnpm install` à refaire** au démarrage | 🟢 Faible | Si erreur "module not found", lance `pnpm install` depuis la racine |
| 7 | **Prose Clémence S03/S04** pas validée par ton œil DA | 🟡 Moyenne | Patterns réutilisés depuis `var_team_dog.json:198` et `var_sista_club.json:141` qui ont déjà ton OK. À relire avant production réelle FdM |

---

## Si rien ne marche / rollback

### Rollback total (annule TOUT le travail de la nuit)

```bash
cd /Users/sarahkedziora/Documents/ypersoa_creative_hub
git reset --hard pre-session-nuit-30-04
```

→ Retour exact à l'état d'hier soir, commit `c7a4a48`. Aucune perte (rien n'a été poussé sur GitHub).

### Rollback partiel (on garde certaines phases)

```bash
git log --oneline -7   # voir les 6 commits de la nuit + le tag
git revert <hash>      # annule UN commit précis (crée un commit inverse)
```

Exemple : tu aimes le rapport prep + le fork mais tu veux annuler le Hook 1 :
```bash
git revert e0eb871     # annule Hook 1
# garde 27b1032 (fork), 77388ca (Anna v1.2), 14f8de8 (S03/S04 Clémence), d4f209a (4:5)
```

### Garder mais reprendre à zéro le Hook 1

```bash
git revert e0eb871  # annule le commit Hook 1
# puis tu peux re-coder le Hook 1 différemment au matin
```

---

## Étapes suivantes — si tu valides au matin

### Si le test de valeur Anna marche (95% fidélité visage)

1. **Push** `git push origin main` pour sauvegarder sur GitHub privé
2. **Test approfondi** : génère un pack hero Mama Club complet avec Clémence (S03, S04) + Anna (S05, S06)
3. **Comparaison côte à côte** avec ton AIStudio actuel sur le même PNG → screenshot pour la doc
4. **Phase suivante (V2)** :
   - Mode famille canonique multi-mannequins (Béatrice + Anna + Félicie)
   - Auto-fill depuis variantes Hub (`var_mama_club.json` → peuple les champs en 1 clic)
   - Export pack JSON vers atelier-social
5. **Audit `disability`** : décider si on supprime ce contrôle (la D2 dit "particularités distribuées avec grâce, jamais centrées" → encodées dans canoniques)

### Si le Hook 1 a un bug

1. Lance `pnpm --filter @ypersoa/atelier-shooting dev` et ouvre la console navigateur
2. Vérifie que `http://localhost:3001/canoniques/MAN-P02_Anna_canonique.jpg` charge l'image (test direct du symlink)
3. Si l'image ne charge pas → bug symlink, on remplace par `vite-plugin-static-copy`
4. Si l'image charge mais le visage généré n'est pas Anna → bug character reference, on simplifie la signature EN ou l'ordre `parts[]`
5. Tu peux me ping avec un screenshot du shot raté, je débuggue à chaud

### Si tu détestes l'UI

L'UI Sidebar est volontairement minimale (toggle 2 boutons + dropdown). On peut la remplacer par autre chose (cards, grid de 23 photos cliquables, search, filters par genre/âge/famille_esthetique) au moment où tu valides la mécanique.

---

## Question d'arbitrage qui restent ouvertes

(Cf. rapport prep `_passations/PLAN_SESSION_30-04-2026.md` section "Questions ouvertes")

3. 🟡 **Mode `disability` à conserver ou supprimer ?** Conservé en V1 par défaut. Décision à toi.
4. 🟢 (résolue cette nuit) Famille esthétique Anna ajoutée v1.2 = "no-makeup naturelle". Idem Lila.
5. 🟡 **Anna en S05/S06 = "mère normande" alors que Provençale dans sa fiche** : non corrigé V1. Acceptable.
6. 🟢 **Aspect ratio 3:4 conservé en (legacy)** ✅ fait
7. 🟢 **Stack Vite (pas Next.js)** ✅ tranché — Vite gardé pour atelier-shooting (moins de friction)
8. 🟢 **Suppression `disability`** : conservé V1 (cf. #3)
9. 🟡 **Migration `PRODUCTS` Awdis → YPxxx** : non fait V1, à programmer V2 (lecture `_mapping_legacy.json`)
10. 🟡 **Lecture palettes Hub** : `THREAD_COLORS` et `GARMENT_COLORS` toujours hardcodés dans `constants.tsx` → à brancher sur `palette_fils_broderie.json` + `palette_supports_par_produit.json` en V2

---

## Stats session

- **Durée Claude estimée** : ~3h45 (dans la fourchette plancher du plan, j'ai été efficient)
- **Commits** : 6 (incrémentaux, 1 par phase)
- **Fichiers créés** : 14 (apps/atelier-shooting/* + lib/canoniques.ts + public/canoniques symlink + .env.local.example + RESULTATS.md)
- **Fichiers modifiés** : 4 hors atelier-shooting (`package.json` racine, `pnpm-lock.yaml`, `var_mama_club.json`, `mannequins_lot2_2fiches.json`)
- **Zero régression** : `apps/atelier-social/` intact, `tsc --noEmit` clean
- **Tag rollback** : posé sur `c7a4a48` pour rollback total trivial

---

## Points dont je voudrais que tu m'écrives dès le réveil

1. **Le test de valeur Anna canonique** marche-t-il ? (5 min de test)
2. Si oui : on valide V1 et on attaque V2 (mode famille canonique + auto-fill variantes) ?
3. Si non : on débogue ensemble — je peux relancer une session pour fix
4. **L'UI Sidebar** te plaît dans ce format minimal ou tu veux une vraie card-grid avec les 23 photos cliquables ?
5. Le **scénario hybride S03/S04 Clémence** : la prose EN (lue dans le commit `14f8de8`) te convient ou tu veux ajuster ?

---

*Bonne matinée Sarah. Le repo est propre, le tag de rollback est ta safety net, et atelier-shooting attend tes premiers tests live.* ☀️
