# AUDIT — SPEC_atelier-lookbook (relecture critique)

> **Audité par** : Claude Opus 4.7 (1M context)
> **Date** : 30 avril 2026
> **Source auditée** : `_passations/IDEES_FUTURES/SPEC_atelier-lookbook.md` (29/04, V1 décisionnelle)
> **Mode** : lecture seule. Aucune modification de la spec.
> **Objectif** : évaluer si la spec est prête à passer à l'implémentation V0.

---

## 1. RÉSUMÉ EN 5 LIGNES

Atelier-Lookbook est un studio créatif où Sarah tape un brief poétique court
("Vacances à Porto Vecchio") et l'outil produit 12-20 visuels Ypersoa cohérents
qui définissent une ambiance saisonnière. L'ambiance sert deux usages : rythmer
la communication réseaux sociaux pendant ~3 semaines, et alimenter une bibliothèque
permanente où chaque saison est conservée et réutilisable. Sarah peut activer
plusieurs lookbooks en parallèle, les archiver, les dupliquer, les retrouver
n'importe quand pour réinjecter une ambiance dans atelier-shooting. Le tout est
exportable en PDF/ZIP comme livrable de marque.

> ⚠️ Si Sarah lit ces 5 lignes et ne reconnaît pas son intention initiale,
> c'est que la spec a dérivé.

---

## 2. INCOHÉRENCES INTERNES

### 2.1 Nombre d'images flou
- Section 2 dit **"12-20 images"**.
- Section 3 dit "20 prompts" puis "Gemini × 12-20" puis "Sur 20 prompts".
- Section 4 schéma JSON ne précise pas de plage.
- Section 7 V0 dit "Lance Gemini × 20 en parallèle".
→ **C'est 20 ou 12-20 ?** Si 12-20, qu'est-ce qui détermine le nombre exact ?
GPT-5.5 décide selon le brief (mentionné Section 3) ou 20 fixe en V0 ?

### 2.2 Critère V0 incompatible avec V0
- Section 7 V0 dit "Pas de stockage" et critère = "Sarah génère 3 lookbooks
  différents et juge la qualité satisfaisante".
- Mais sans stockage, les 3 lookbooks ne sont pas comparables côte à côte.
- Section 9 Q5 fait un calcul de stockage (~1 GB/an) qui présuppose stockage.
→ Soit V0 inclut un mini-stockage (au moins en mémoire pour comparer), soit
le critère doit être révisé en "Sarah valide la qualité sur 1 brief".

### 2.3 Conflit format ambiance vs format atelier-shooting
- Section 4 dit : "le format est identique à ce que shoot_studio utilise déjà
  pour ses ambiances hardcodées (Parisien, A.P.C., Loft)".
- **C'est faux** — voir section 4 de cet audit (incohérence repo). Les
  formats sont incompatibles. Cette phrase laisse croire que V2 est triviale,
  alors qu'elle nécessite un adapter ou un refactor.

### 2.4 Roadmap V2 — durée vs validation
- V2 dit "1-2 jours" mais le critère de validation est "Sarah produit un shot
  produit en utilisant l'ambiance Porto Vecchio **6 mois après**". Le critère
  ne peut pas être validé pendant les 1-2 jours d'implémentation.
→ Reformuler en "Sarah produit avec succès un shot produit Ypersoa via une
ambiance archivée" (sans la fenêtre temporelle).

### 2.5 Lookbook actif sans signal d'expiration
- Section 2 dit "rotation manuelle, pas d'auto-archivage temporel".
- Section 5 affiche les Active "encadrés vert ou badge 'actif'" mais
  ne décrit pas comment Sarah saura qu'un lookbook est "vieux" et
  qu'il est temps de le rotater.
→ Manque un signal visuel passif (âge, jours actifs) ou explicite (rappel
manuel) pour aider la rotation.

### 2.6 Génération de l'ambiance_extraite — pas claire
- Section 3 dit "GPT-5.5 produit : 12-20 prompts EN + sélection canoniques
  + tags ambiance + signature visuelle commune".
- Section 4 schéma place `ambiance_extraite` à côté des images.
- **Quand est-elle calculée ?** En amont par GPT-5.5 (= input de la génération
des prompts) ou en aval par post-processing (= analyse rétro des images
générées) ? Les deux sont possibles, le choix change l'architecture.

---

## 3. ZONES TROP VAGUES — décisions à trancher

### 3.1 Stack frontend (Section 6 — explicitement "à trancher")
**Options** :
- (A) Next.js — cohérent avec atelier-social, server actions pratiques pour
  les 20 appels Gemini en parallèle, app router.
- (B) Vite + React — cohérent avec atelier-shooting forké, plus simple pour
  un POC, mais isole le lookbook de l'écosystème social.
- (C) Reuse atelier-social en route `/lookbook` — pas un nouveau dossier
  d'app, juste une nouvelle route Next.js dans atelier-social.

→ Recommandation : **(A) Next.js dans `apps/atelier-lookbook/`** parce que
les server actions facilitent les 20 calls Gemini, et Supabase est déjà
plombé Next-side dans atelier-social.

### 3.2 Stockage images (Section 6 — "à trancher")
**Options** :
- (A) Bucket Supabase Storage (`lookbook-images`)
- (B) Filesystem local `/assets/lookbooks/{slug}/`

→ Recommandation : **(A) Supabase Storage**. Le projet `ypersoa-hub` existe
déjà avec 2 buckets (`liked-shots`, `social-packs`). Cohérent. ~1 GB/an
restera bien dans le free tier.

### 3.3 Connexion atelier-shooting → lookbooks (Section 6 — "à trancher")
**Options** :
- (A) Lecture Supabase directe depuis atelier-shooting (déjà
  `@supabase/supabase-js` installé).
- (B) Export JSON statique régénéré à chaque modification de lookbook.

→ Recommandation : **(A) Lecture directe Supabase**. Aucun coût
d'infrastructure additionnel, bibliothèque toujours à jour.

### 3.4 Tags automatiques GPT — taxonomie et langue (Sections 7 V1 + 9 Q6)
**Options** :
- (A) Taxonomie libre (GPT décide), tout en français.
- (B) Taxonomie libre, tout en anglais (cohérent avec les prompts EN).
- (C) Taxonomie contrôlée (liste prédéfinie : saison, géo, palette, mood)
  avec valeurs libres dans chaque catégorie.

→ Recommandation : **(C) taxonomie contrôlée**, car les filtres Section 5
(par statut, mannequin, palette) supposent des champs typés.

### 3.5 Modèle OpenAI — quelle version ? (Section 3)
La spec dit "GPT-5.5" partout, mais ce modèle n'existe pas chez OpenAI au
30/04/2026. Atelier-social utilise gpt-4o.
**Options** :
- (A) gpt-4o (déjà en place dans Hub).
- (B) gpt-5 / gpt-5-turbo si récemment publié (à vérifier).
- (C) Migration générale Hub vers le dernier modèle disponible.

→ Recommandation : **gpt-4o** pour V0 (zéro coût d'intégration), réévaluer
en V1 si meilleurs modèles sortent.

### 3.6 Génération automatique vs manuelle de l'ambiance_extraite (Section 4)
**Options** :
- (A) GPT-5.5 produit `ambiance_extraite` AVANT la génération images (sert
  de "charte" passée à chaque prompt EN).
- (B) Post-processing : un 2e appel LLM analyse les 20 images générées
  (vision) et extrait l'ambiance.
- (C) Sarah remplit le bloc à la main après génération.

→ Recommandation : **(A) en amont** — l'ambiance devient la signature commune
qui assure la cohérence des 20 prompts. Moins coûteux qu'un 2e appel vision.

---

## 4. INCOHÉRENCES AVEC LE REPO (vérifications effectuées)

### 4.1 ✅ `mannequins_recurrents.json` — existe
Chemin précis : `referentiels/shooting/mannequins_recurrents.json`.
La spec (Section 3, Section 9 Q1) cite juste `mannequins_recurrents.json`
sans chemin. À préciser si pertinent.

### 4.2 ✅ `direction_artistique_hero.json > prompt_suffix_universel` — existe
Chemin : `referentiels/shooting/direction_artistique_hero.json`.
La clé `prompt_suffix_universel` est bien présente dans le JSON.

### 4.3 ✅ Brune (MAN-P12) — existe dans le casting + canonique JPG
- Casting : `MAN-P12 Brune, 22 ans, F, blanche française, cheveux bruns
  longs, piercing discret, style Gen Z créative, statut DETAILLEE_LOT3`.
- Image canonique : `apps/atelier-shooting/public/canoniques/MAN-P12_Brune_canonique.jpg` ✅
- Aussi dans le duo `DUO_GASPARD_BRUNE` (jeune couple étudiants créatifs).
→ **Section 9 Q1 est levée.** Brune est utilisable.

### 4.4 ❌ Format ambiance vs format atelier-shooting — **conflit majeur**
La spec dit (Section 4) : "Le format est identique à ce que shoot_studio
utilise déjà pour ses ambiances hardcodées (Parisien, A.P.C., Loft)".

**État réel au 30/04** :
- atelier-shooting a **7 décors** (post-session 30/04) : `minimalist`,
  `parisien`, `loft`, `serre`, `aube`, `sauvage`, `sepia`.
- Le format actuel est `DECOR_DESCRIPTIONS: Record<DecorStyle, { short:
  string; full: string }>` (descripteurs EN injectés dans les prompts via
  placeholder `[DECOR]`). Voir `apps/atelier-shooting/constants.tsx`.
- La spec décrit un format `ambiance_extraite` riche : `{ palette[],
  lieux[], props[], lumiere, grain, postures, references_implicites[] }`.

**Les deux formats sont incompatibles.** V2 nécessitera donc un adapter
qui transforme `ambiance_extraite` → prompt EN injectable. Soit on refait
la couche `DECOR_DESCRIPTIONS` au nouveau format (gros chantier), soit on
ajoute juste un transformateur côté lookbook → atelier-shooting.

### 4.5 ⚠️ "Ambiances hardcodées Parisien, A.P.C., Loft" — descriptif obsolète
La spec parle de 3 ambiances. Au 30/04, atelier-shooting en a 7 (cf 4.4).
La spec date du 29/04 et a été dépassée par la session du 30/04. À mettre
à jour si la spec reste référence canonique.

### 4.6 ⚠️ "GPT-5.5" — modèle inexistant
Mention répétée Sections 3, 7, 8, 9. GPT-5.5 n'est pas un modèle public
OpenAI au 30/04/2026. Le Hub utilise gpt-4o (cf atelier-social `/api/generate-copy`).
Soit la spec anticipe un futur modèle, soit erreur de version.

### 4.7 ✅ Dépendances bloquantes Section 8 — déjà levées au 30/04
- "fork shoot_studio (Phase 0+1)" → fait : `apps/atelier-shooting/` existe,
  Hook 1 canoniques opérationnel (`lib/canoniques.ts` + `Sidebar.tsx` mode
  canonique).
- "Supabase Hub configuré" → fait : projet `ypersoa-hub` créé (id
  `frvhjjijoccqreidyucp`, eu-west-3), tables `liked_shots`, `social_packs`,
  `collections` + 2 buckets en place.
- "Clé OpenAI active" → ✅ dans atelier-social `.env.local`.
- "Clé Gemini active" → ✅ dans atelier-shooting `.env.local`.
→ **V0 + V1 + V2 peuvent démarrer côté infra dès que les questions
décisionnelles sont tranchées.**

### 4.8 ℹ️ Fichier non mentionné mais pertinent
`referentiels/shooting/ambiances_shooting.json` existe dans le repo. La spec
ne le cite pas. À vérifier s'il contient des données réutilisables pour
peupler le format `ambiance_extraite`.

---

## 5. QUESTIONS À TRANCHER PAR SARAH (top 5 par criticité)

### Q1 — Stack frontend (BLOQUANT V0) 🔴
Next.js dans `apps/atelier-lookbook/`, Vite, ou route Next.js ajoutée à
atelier-social ? **Sans réponse, V0 ne peut pas démarrer.**

> Reco Claude : Next.js standalone dans `apps/atelier-lookbook/`.

### Q2 — Quel modèle LLM pour la décomposition ? (BLOQUANT V0) 🔴
La spec dit "GPT-5.5" qui n'existe pas. gpt-4o est la valeur par défaut
du Hub. Tu confirmes gpt-4o, ou tu vises un autre modèle ?

> Reco Claude : gpt-4o pour V0, réévaluer ensuite.

### Q3 — Format ambiance lookbook → format prompt atelier-shooting (BLOQUANT V2) 🔴
La structure riche (palette, lieux, props, lumière, grain, postures,
références) du lookbook ne matche pas la structure simple `{short, full}`
des décors actuels d'atelier-shooting. Comment on les réconcilie ?

- (A) Refondre les 7 décors actuels au nouveau format (casse des prompts
  qui marchent aujourd'hui)
- (B) Adapter ambiance_extraite → prompt EN au moment de l'injection
- (C) Ne pas faire V2 maintenant, juste afficher les lookbooks en read-only

> Reco Claude : (B), un adapter pur, sans toucher aux décors actuels.

### Q4 — Critère de validation V0 (BLOQUANT pour fermer V0) 🟠
"Sarah génère 3 lookbooks et juge satisfaisant" + V0 sans stockage = pas
comparable. Tu veux quel critère réel ?

- (A) 1 lookbook qui te plaît visuellement = V0 OK
- (B) Mini-stockage in-memory de 3 derniers en V0 pour comparer
- (C) Stockage Supabase intégré dès V0 (et V1 = juste UI bibliothèque)

> Reco Claude : (C). C'est ~1 jour de plus mais ça simplifie tout.

### Q5 — Budget par génération de lookbook (À CADRER) 🟡
Estimation : ~1€ par génération (20 images Gemini ~0.80€ + GPT décomposition
~0.20€). Une session de test = 3-5 générations = 3-5€. OK pour toi, ou tu
veux un mode "preview cheap" (4 images en mode brouillon avant le full 20) ?

> Reco Claude : OK pour V0/V1 sans mode preview ; ajouter le mode preview
> en V1.5 si tu sens que tu jettes beaucoup de générations.

---

## VERDICT

**La spec est globalement saine, mais elle a 3 décisions structurantes encore
ouvertes (Q1, Q2, Q3) et 1 incohérence factuelle avec le repo (format ambiance
vs format DECOR_DESCRIPTIONS).** Une fois ces 4 points tranchés, V0 peut
démarrer en ~1-2 jours comme prévu.

Les dépendances bloquantes "infra" listées Section 8 sont **toutes déjà
levées** au 30/04 par les sessions intermédiaires (fork atelier-shooting,
Hook 1 canoniques, projet Supabase ypersoa-hub).

La question Section 9 Q1 (Brune) est également levée : elle existe avec
canonique JPG validé.

**Ordre d'action recommandé** :
1. Sarah tranche Q1, Q2, Q3, Q4 (ci-dessus).
2. Mise à jour de la spec V1.1 avec les choix.
3. Implémentation V0 (~1-2 jours).
