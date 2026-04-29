# PLAN SESSION 30/04/2026

> **Préparation nocturne — lecture seule.** Aucune modification de fichier existant. Production d'un rapport unique pour la session de demain.
> Rédigé le 2026-04-29 nuit, après audit doc maître (cf. session du 29/04).
>
> **MAJ post-rédaction** : décision Sarah reçue 29/04 nuit — **"Clémence possible sur S03 ou S04 si pas de prise de vue avec un enfant"**. Cela résout les questions ouvertes 🔴 #1 et #2 (cf. décision lockée plus bas). Le plan d'exécution est désormais fermé pour la matinée.

---

## ⚠️ ALERTE CONTEXTE — À LIRE EN PREMIER

**La cascade Camille → Clémence + redistribution Anna a déjà été exécutée hier soir.** Voir commits `a9549dc`, `880734b`, `15c5953`, `c7a4a48`. Le repo est dans un état **post-cascade propre**.

Cela impacte directement le brief de cette session :
- **Section 1** : la cascade décrite comme "à faire" est en réalité **déjà faite**. L'inventaire confirme l'état propre. Pas de travail réel demain sur ce point.
- **Section 2** : `var_mama_club.json` S03/S05/S06 ont déjà été basculés vers **Anna** (pas vers le scénario hybride avec Clémence). Le brief actuel décrit "Clémence sur shots identité produit + Anna sur S05/S06" — ce scénario hybride n'est **pas implémenté**. Si c'est bien la directive DA finale, S03 (et possiblement S04) doivent revenir à Clémence avec réécriture prose.
- **Sections 3-4** : factuelles, pas de delta.
- **Section 5** : `constants.tsx` non modifié — audit standalone toujours valide.
- **Section 6** : le plan d'attaque a été ré-priorisé en fonction de l'état réel. La cascade est sortie. Le scénario hybride (si confirmé) entre en priorité 1.

→ **Question d'arbitrage critique en tête de file** (cf. Section "Questions ouvertes" item 1).

---

## SECTION 1 — Cascade Camille → Clémence : inventaire exhaustif

### Méthode

```bash
grep -rin --exclude-dir={node_modules,.git,.next,archives,_passations} "camille"
grep -rinE --exclude-dir={node_modules,.git,.next} "ch[âa]tain[\s-]miel|chestnut[\s-]honey|honey[\s-]chestnut"
```

### 1.1 — Hors archives + passations (état actif)

**18 occurrences trouvées. Toutes sont historiques légitimes.** Aucune action requise.

| # | Fichier | Ligne | Contenu (extrait) | Type | Action |
|---|---|---|---|---|---|
| 1 | `CLAUDE.md` | 140 | Règle nommage : *"TOUJOURS le prénom complet ('Clémence', pas 'Camille v2')"* | Doc maître | **Garder** — règle pédagogique |
| 2 | `CLAUDE.md` | 141 | *"Si refonte d'identité majeure : changer le prénom (Camille → Clémence)"* | Doc maître | **Garder** — règle |
| 3 | `CLAUDE.md` | 213 | Apprentissage 28-29/04 fatigue Camille v2 → Clémence à tête fraîche | Doc maître | **Garder** — récit historique |
| 4 | `CLAUDE.md` | 244 | *"Les 23 canoniques (post 29/04, après remplacement Camille → Clémence)"* | Doc maître | **Garder** — titre section |
| 5 | `CLAUDE.md` | 324 | Mobile Editing Club → "point de départ refonte casting Camille→Clémence" | Doc maître | **Garder** — historique |
| 6 | `CLAUDE.md` | 338 | Jeanne Damas — *"référence ancienne Camille v1 dépréciée"* | Doc maître | **Garder** — historique |
| 7 | `CLAUDE.md` | 339 | Lou Doillon — *"référence ancienne Camille v1"* | Doc maître | **Garder** — historique |
| 8 | `CLAUDE.md` | 390 | *"1h30 sur Camille v2 le 28/04 18h-19h30 → rien tranché"* | Doc maître | **Garder** — apprentissage |
| 9 | `CLAUDE.md` | 494 | Section Q ouverte (résolue) "Ancienne Camille MAN-P01 v1 — devenir" | Doc maître | **Garder** — historique |
| 10 | `CLAUDE.md` | 495 | *"Photo MAN-P01_Camille_canonique.jpg ancien à archiver ou supprimer"* | Doc maître | **Garder** — résolu via `_deprecated/` |
| 11 | `CLAUDE.md` | 579 | Citation Sarah *"Style Camille MAN-001 peut devenir Clémence MAN-001"* | Doc maître | **Garder** — citation |
| 12 | `docs/casting/FAMILLES-ESTHETIQUES.md` | 161 | *"Option A — Camille v2 maquillée bouche rouge..."* | Doc maître | **Garder** — citation Sarah |
| 13 | `docs/casting/FAMILLES-ESTHETIQUES.md` | 163 | *"Clémence remplace Camille (nouveau prénom = nouvelle identité marque)"* | Doc maître | **Garder** — citation Sarah |
| 14 | `referentiels/variantes/le_club/var_mama_club.json` | 265 | Patch note `[PATCH 2026-04-29] Camille → Anna pour cohérence Mother's Day no-makeup naturelle` | Golden JSON | **Garder** — note de patch |
| 15 | `referentiels/shooting/mannequins_lot1_5fiches.json` | 8 | Field `_changelog_vs_v2` (transition Camille→Clémence) | Référentiel | **Garder** — changelog |
| 16 | `referentiels/shooting/mannequins_lot2_2fiches.json` | 14 | Changelog v1.1 Anna (cite Camille comme contexte historique 24/04) | Référentiel | **Garder** — changelog |
| 17 | `referentiels/shooting/_README_casting.md` | 146 | *"ex : ancienne Camille MAN-P01 archivée 2026-04-29 → remplacée par Clémence MAN-P01"* | Référentiel | **Garder** — doc convention |
| 18 | `apps/atelier-social/src/lib/canoniques.ts` | 28, 32, 38 | 3 lignes commentées historiques expliquant la migration | Code | **Garder** — commentaires historiques |
| – | `.claude/settings.local.json` | 4 | Path d'une commande Bash déjà exécutée hier | Config | **Garder** — historique perm |

### 1.2 — Référence cheveux *"châtain miel"* / *"chestnut honey"* (active hors archives)

**3 occurrences, toutes historiques légitimes.**

| Fichier | Ligne | Contenu | Action |
|---|---|---|---|
| `mannequins_lot1_5fiches.json` | 8 | Changelog *"Camille (40 ans, châtain miel...)"* | **Garder** |
| `mannequins_lot2_2fiches.json` | 14 | Changelog Anna v1.1 *"Redondance visuelle avec Camille (châtain miel) évitée"* | **Garder** |
| `apps/atelier-social/src/lib/canoniques.ts` | 36-37 | 2 lignes **commentées** : `description: "...châtain miel ondulé..."` + `signature: "chestnut-honey mid-length wavy hair..."` | **Garder** — déjà commenté |

### 1.3 — Archives + passations (signalées séparément, pas modifiées)

`grep` dans `archives/` + `_passations/` : **occurrences nombreuses, toutes historiques**.
- `archives/` contient les anciens motifs JSON, anciens .liquid, ancien CLAUDE.md, ancien YPM-001, JS legacy. Tout statut "archivé" par convention.
- `_passations/` contient les passations datées du 20-22-24/04 qui décrivent l'état du repo à ces moments. **Snapshots historiques à ne JAMAIS réécrire.**

→ **Aucune action prévue sur ces deux répertoires.**

### 1.4 — Vérification spécifique `prompts_library.json` (40 templates EN)

`grep` Camille : **0 occurrence active**. ✅ Cascade propre.
`grep` Clémence : 7 occurrences (lignes 416, 477, 535, 942, 970, 1025, 1083). Tous remplacements appliqués hier.

### 1.5 — Vérification chemins mentionnés dans le brief Sarah

| Chemin mentionné dans le brief | Existe ? | Vrai chemin |
|---|---|---|
| `referentiels/casting/mannequins_recurrents.json` | ❌ NON | `referentiels/shooting/mannequins_recurrents.json` |
| `referentiels/casting/_README_casting.md` | ❌ NON | `referentiels/shooting/_README_casting.md` |
| `referentiels/casting/duos_detailles_et_distribution.json` | ❌ NON | `referentiels/shooting/duos_detailles_et_distribution.json` |
| `referentiels/casting/direction_artistique_hero.json` | ❌ NON | `referentiels/shooting/direction_artistique_hero.json` |
| `referentiels/shooting/types_de_shots.json` | ✅ OUI | (chemin correct) |
| `referentiels/prompts/prompts_library.json` | ❌ NON | `referentiels/shooting/prompts_library.json` |
| `referentiels/variantes/le_club/var_*.json` | ✅ OUI | (chemin correct) |

**Le brief mentionne un dossier `referentiels/casting/` qui n'existe pas. La structure réelle est `referentiels/shooting/` qui regroupe casting + types_de_shots + ambiances + prompts_library + direction_artistique_hero. Aucune migration de chemin n'est requise — c'est juste une coquille dans le brief de Sarah à signaler.**

### 1.6 — Bilan

- **Occurrences hors archives** : 18 (Camille) + 3 (châtain miel/chestnut honey) = **21 mentions**, toutes **historiques légitimes**
- **Fichiers concernés** : 9 fichiers (CLAUDE.md, FAMILLES-ESTHETIQUES.md, var_mama_club.json, lot1_5fiches.json, lot2_2fiches.json, _README_casting.md, canoniques.ts, settings.local.json, _deprecated/README.md)
- **Charge estimée** : **0h** — la cascade est complète et propre. Aucune correction nécessaire.

---

## SECTION 2 — `var_mama_club.json` : contenu littéral S03, S05, S06 (état actuel)

⚠️ **L'état actuel correspond à la décision DA prise hier (basculer Camille → Anna sur les 3 shots), pas au scénario hybride raisonné mentionné dans le brief de demain.**

### 2.1 — S03 (lignes 187-205)

```json
{
  "code_shot": "VAR-003-MAMA-CLUB-S03",
  "titre_humain": "Anna portée lifestyle studio vert sauge",
  "type_de_shot": "lifestyle_studio",
  "ambiance": "loft_organique",
  "mannequins_assignes": ["MAN-P02 Anna"],
  "support_produit": {
    "produit_id": "YP005",
    "couleur_support": "marine"
  },
  "fil_broderie": "fil_ivoire",
  "pilier_contenu": "P2_emotion",
  "aspect_ratio": "4:5",
  "prompt_en_complet": "Editorial fashion photography, 35-year-old Anna, a beautiful French Provençale woman with sun-streaked dark blonde mid-length wavy hair, freckles across her nose and shoulders, naturally tanned olive Mediterranean skin, natural expression wrinkles around her eyes when she smiles, lived-in skin texture (no smoothing), standing relaxed in a curated Parisian apartment. Sage green paneled wall, dark wooden parquet floor, vintage props: old leather suitcase, framed botanical prints, potted eucalyptus. She wears an oversized Ypersoa marine #1E2D4A crewneck sweatshirt YP005 with the embroidered Mama Club badge visible on the LEFT CHEST — cream ivory thread, circular badge with 'MAMA' on top arc, heart center, 'CLUB' on bottom arc, 8-10cm diameter. Paired with raw denim jeans and cream leather sabots. Relaxed confident pose, hand near the embroidery, soft smile, warm gaze off-frame. [...] Reference: Maison Labiche lookbook style, Sessùn Provençale moderne. --ar 4:5",
  "notes_styliste": "Hero lifestyle femme adulte — Anna (provençale moderne 35 ans, peau hâlée, no-makeup naturelle) = profil iconique 'mère de famille complice' pour Mother's Day. Garder son grain de peau naturel et ses taches de rousseur naturelles."
}
```

- **Inférence brief "S03 = lifestyle_studio solo"** : ✅ confirmée (`type_de_shot: "lifestyle_studio"`, 1 seul mannequin)
- **Mention ancienne Camille** : 0 (entièrement réécrit pour Anna hier)
- **Identité produit vs scène mère ?** : c'est un **shot solo lifestyle** sans enfant. Si le scénario hybride pose Clémence sur les "shots identité produit", S03 est dans la zone grise — solo Anna porte le produit en contexte Loft Organique mais sans dimension maternelle. Argument pour Clémence : c'est le portrait de la cliente brand. Argument pour Anna : cohérence Mother's Day no-makeup. **À arbitrer.**
- **Difficultés à porter sur Clémence** : prompt mentionne Provençale, peau olive Mediterranean, dark blonde sun-streaked. Clémence = brune chocolat, frange Bardot, lèvres bordeaux. Réécriture complète prose nécessaire (~30 min).

### 2.2 — S05 (lignes 225-244)

```json
{
  "code_shot": "VAR-003-MAMA-CLUB-S05",
  "titre_humain": "Duo Anna + Félicie mère-fille sweats Mama Club assortis",
  "type_de_shot": "duo_couple",
  "ambiance": "loft_organique",
  "mannequins_assignes": ["MAN-P02 Anna", "MAN-P08 Félicie"],
  "support_produit": {
    "produit_id": "YP005_et_YP004",
    "couleur_support": "marine (les deux)"
  },
  "fil_broderie": "fil_ivoire",
  "pilier_contenu": "P2_emotion",
  "aspect_ratio": "4:5",
  "prompt_en_complet": "Tight cropped fashion editorial photograph, mother-daughter duo standing close together in front of a soft cream interior wall. Mother: Anna, 35, sun-streaked dark blonde wavy hair, freckles, naturally tanned olive Mediterranean skin, natural smile lines, wearing oversized Ypersoa marine #1E2D4A adult crewneck sweatshirt YP005. Daughter: Félicie, 7, blond vénitien long wavy hair, dense freckles across nose and cheeks, dimples when she smiles, wearing matching child Ypersoa marine #1E2D4A hoodie YP004. Both garments feature the embroidered circular Mama Club badge on the LEFT CHEST in cream ivory thread (MAMA top arc, heart center, CLUB bottom arc). Mother's arm around daughter's shoulder, daughter leaning into mother, both looking slightly off-camera with authentic complicity, no forced smiles. [...] A.P.C. × Emoi Emoi campaign aesthetic, French elegance, tender without demonstration. --ar 4:5",
  "notes_styliste": "Pivot émotionnel du pack. Rotation cyclique position = parent_enfant. La tendresse doit être évidente sans dramatisation."
}
```

- **Inférence brief "S05 = duo_couple parent_enfant"** : ✅ confirmée (`type_de_shot: "duo_couple"`, mannequins_assignes Anna + Félicie)
- **Mention ancienne Camille** : 0
- **Fit Anna pour rôle mère-fille avec Félicie 7** : ✅ excellent. Anna 35 no-makeup naturelle, registre tendre cohérent avec D2 famille 1.
- **Si Sarah veut maintenir Anna ici** : aucune action.

### 2.3 — S06 (lignes 245-265)

```json
{
  "code_shot": "VAR-003-MAMA-CLUB-S06",
  "titre_humain": "Famille vivante 3 générations (Béatrice + Anna + Félicie)",
  "type_de_shot": "famille_vivante",
  "ambiance": "loft_organique",
  "mannequins_assignes": ["MAN-P05 Béatrice", "MAN-P02 Anna", "MAN-P08 Félicie"],
  "support_produit": {
    "produit_id": "YP005_YP001_YP004",
    "couleur_support": "Béatrice: beige · Anna: marine · Félicie: marine"
  },
  "fil_broderie": "fil_ivoire",
  "pilier_contenu": "P2_emotion",
  "aspect_ratio": "4:5",
  "prompt_en_complet": "Lively family editorial photograph, three generations sharing a Sunday breakfast moment around a wooden kitchen table in a sunlit Normandy countryside home. Grandmother Béatrice, 55, métisse (black-white heritage), silver-gray hair loosely tied back, natural wrinkles, pouring tea, wearing Ypersoa beige #F5F0E0 crewneck sweatshirt YP005. Mother Anna, 35, sun-streaked dark blonde wavy hair, freckles, naturally tanned olive Mediterranean skin, laughing at something her daughter said, wearing Ypersoa marine #1E2D4A crewneck sweatshirt YP005. Daughter Félicie, 7, blonde vénitienne, dense freckles, reaching for a piece of bread, wearing Ypersoa marine #1E2D4A hoodie YP004. [...] Bonpoint × Gamin Gamine family campaign aesthetic, real French family life, warm saturated color palette with terracotta/ochre accents from props. The scene reads as 'Sunday morning joy' first, 'mixed-heritage family' only as secondary observation. --ar 4:5",
  "notes_styliste": "Shot hero famille 3 générations — teste la règle famille_vivante. Particularité ethnicité de Béatrice présente mais pas centrée. Test validation: est-ce qu'on décrit la scène par 'joie familiale du dimanche' ou 'famille inclusive' ? Réponse attendue: le premier. [PATCH 2026-04-22] Format passé de 4:3 vers 4:5 (PDP). Couleurs précisées par personne (Béatrice beige, Anna+Félicie marine) au lieu de 'variés marine et écru'. [PATCH 2026-04-29] Camille → Anna pour cohérence Mother's Day no-makeup naturelle."
}
```

- **Inférence brief "S06 = famille_vivante 3_generations"** : ✅ confirmée (`type_de_shot: "famille_vivante"`, 3 mannequins de 3 générations)
- **Mention ancienne Camille** : 0 (sauf dans la note de patch documentant la transition)
- **Fit Anna pour rôle mère médiatrice 3 gen** : ✅ cohérent — c'est le rôle décidé hier ([decision 29/04 de Sarah](decision-anna-mediatrice)).
- **Petit accroc narratif à signaler** : Anna est documentée dans `mannequins_lot2_2fiches.json:24` comme *"Aix-en-Provence / Arles / arrière-pays varois"*, alors que la scène S06 est *"sunlit Normandy countryside home"*. Anna devient ad-hoc une mère normande pour ce shot. Pas bloquant pour Gemini (le prompt est self-contained), mais incohérence narrative douce avec la fiche.

### 2.4 — Synthèse des 3 shots vs scénario hybride raisonné

| Shot | État actuel | Scénario hybride brief | Action si on applique le scénario |
|---|---|---|---|
| S03 lifestyle solo | Anna | **Clémence** (identité produit) | Réécriture prose Clémence (~30 min) |
| S04 crop poitrine | Anna | **Clémence ?** (identité produit) | À arbitrer — c'est aussi un shot identité ; réécriture ~15 min |
| S05 duo mère-fille | Anna + Félicie | Anna + Félicie ✅ | Aucune |
| S06 famille 3 gen | Béatrice + Anna + Félicie | Béatrice + Anna + Félicie ✅ | Aucune |

**S07 (Aïcha lifestyle outdoor) et S08 (flat lay)** ne sont pas dans le scope du scénario hybride mère.

---

## SECTION 3 — Canon Clémence : citation littérale (maternité, famille, muses)

### 3.1 — État du fichier source

- **Source unique** : `referentiels/shooting/mannequins_lot1_5fiches.json` (v3.0, 2026-04-29)
- **Doublon** : `docs/casting/mannequins_lot1_5fiches.json` a été supprimé hier (commit `a9549dc`, opération D1 de migration source unique)
- ✅ Plus de divergence à surveiller

### 3.2 — Citations littérales (fiche MAN-P01)

#### Personnalité / situation familiale (ligne 30)
> *"Antiquaire à Honfleur, propriétaire de sa boutique sur les quais. **38 ans, divorcée, mère épanouie d'un ado de 14-16 ans.** Forte et indépendante, ne demande jamais de validation. Se fait plaisir sans culpabilité — s'offre des bijoux, des objets, des broderies pour elle d'abord. A vécu son divorce comme libération, pas comme échec. [...] Lit, voyage seule, accueille son ado avec présence sans étouffer. Une Parisienne qui a déménagé en Normandie pour reprendre la boutique de sa grand-mère, et qui a fini par ne plus vouloir partir."*

→ **Implication critique** : Clémence est mère d'un **ado 14-16 ans**, pas mère d'une enfant 7 ans (Félicie). Si on la met en duo avec Félicie en S05, l'écart d'âge enfant ne colle pas avec son personnage. Logique narrative pour le scénario hybride : **garder S05 sur Anna**.

#### Famille esthétique (ligne 17)
> ```json
> "famille_esthetique": "maquillée chic assumée"
> ```

→ Famille 2, seule canonique de cette famille à ce jour.

#### Maquillage signature (lignes 24-29)
> ```json
> "maquillage_signature": {
>   "rouge_a_levres": "Bordeaux profond MAC Diva — mat ou satiné, jamais glossy. Couleur signature de Clémence, élément distinctif du casting Ypersoa.",
>   "yeux": "Mascara léger, sourcils définis naturels. Pas de eyeliner, pas de smoky eye, pas de fard à paupières marqué.",
>   "teint": "Pas de fond de teint visible, peau naturelle préservée. Les taches de rousseur restent pleinement visibles.",
>   "principe": "Concentration sur la bouche. Le bordeaux est l'unique élément maquillage fort. Le reste reste naturel. Code de la Parisienne qui choisit un signe fort."
> }
> ```

#### Références muses (lignes 80-87)
> ```json
> "styles_francais_refs": [
>   "Charlotte Gainsbourg adulte",
>   "Sophie Marceau élégante",
>   "Audrey Tautou Parisienne",
>   "Caroline de Maigret bohème",
>   "Brigitte Bardot (curtain bangs uniquement)",
>   "Clara Luciani (brune longs raie milieu, lèvres pleines)"
> ]
> ```

→ 6 références (Clara Luciani ajoutée hier en commit `880734b`, item #1 de la session 29/04).

### 3.3 — Disponibilité du canonique

✅ `assets/canoniques/MAN-P01_Clemence_canonique.jpg` (752 719 bytes, créé 2026-04-28 21:02). Validé "Image 5 du test 29/04 matin" ([_notes_techniques ligne 110](referentiels/shooting/mannequins_lot1_5fiches.json#L110)).

---

## SECTION 4 — Anna canonique : fiche complète + statut visuel

### 4.1 — Existence du canonique

✅ `assets/canoniques/MAN-P02_Anna_canonique.jpg` (791 169 bytes, créé 2026-04-24 00:56)

### 4.2 — Création (git log)

```
06c7dbc feat(casting): ajout 23 canoniques + correction fiche Anna v1.1
```

C'est le commit du **24 avril 2026** (session J3.B). Anna v1.1 est la version corrigée après que la v1.0 ait produit "châtain doré méché" — corrigée en "brun chaud provençal" pour éviter la redondance visuelle avec l'ancienne Camille.

### 4.3 — Fiche détaillée (`referentiels/shooting/mannequins_lot2_2fiches.json` v1.1, 2026-04-24)

#### Description physique (lignes 25-30)
> ```json
> "apparence_physique": {
>   "silhouette": "1m70, silhouette détendue et ancrée, posture relâchée mais droite — le port d'une femme qui ne court pas",
>   "cheveux": "Brun chaud châtain foncé, mi-longs, ondulations naturelles marquées, portés LIBRES (pas d'attaches, pas de chignons en ref canonique — le chignon bas appartient aux shots en contexte), quelques mèches devant le visage",
>   "visage": "Traits réguliers et doux, yeux noisette, quelques taches de rousseur sur le nez et les épaules (dues au soleil), sourire paisible",
>   "peau": "Olive-chaude méditerranéenne naturellement hâlée (pas bronzée cabine), grain de peau habité, quelques ridules autour des yeux"
> }
> ```

#### Personnalité narrative (ligne 31)
> *"Céramiste ou architecte d'intérieur installée dans une maison en pierre de l'arrière-pays. Reçoit ses amis en terrasse sous la glycine, offre des cadeaux en vacances, incarne la douceur provençale contemporaine. Client type : gens qui fuient Paris mais gardent l'exigence."*

#### Famille esthétique
> ⚠️ **Le champ `famille_esthetique` N'EXISTE PAS dans la fiche v1.1 d'Anna.** La fiche est sous directive `D1_BEAUTE_INCARNEE v2.0` (datée 24/04) et n'a pas été mise à jour pour `D2_DEUX_FAMILLES_ESTHETIQUES v1.0` (29/04). En revanche, la fiche v3.0 du Lot 1 a été enrichie pour les 5 fiches du lot 1.
>
> → **Trou de doc à signaler.** Anna est implicitement famille 1 "no-makeup naturelle" (cohérent avec son profil Provençale moderne, no-makeup) mais le champ doit être ajouté. **Charge ~2 min** pour aligner.

#### Références muses (lignes 60-65)
> ```json
> "styles_francais_refs": [
>   "Caroline de Maigret en vacances en Provence",
>   "Jeanne Damas période maison de famille",
>   "campagnes Sessùn × Soeur",
>   "Inès de la Fressange à l'étranger"
> ]
> ```

### 4.4 — Cohérence vs usage S05/S06 du Mama Club

| Critère | Anna fiche | Usage S05/S06 | Cohérent ? |
|---|---|---|---|
| Âge | 35 | "Mother Anna, 35" | ✅ |
| Cheveux | Brun chaud châtain foncé ondulés | "sun-streaked dark blonde wavy hair" | ⚠️ **Léger glissement** : "brun chaud châtain" v.s. "dark blonde sun-streaked". Pas grave, registre proche, mais à harmoniser |
| Peau | Olive-chaude méditerranéenne | "naturally tanned olive Mediterranean skin" | ✅ |
| Lieu narratif | Provence (Aix / Arles / arrière-pays) | "Parisian apartment" (S03) + "Normandy countryside home" (S06) | ⚠️ **Anna sortie de son ancrage Provence pour Mother's Day**. Pas bloquant pour Gemini, mais accroc narratif doux à long terme |
| Maternité | Pas explicitement décrite (pas de mention enfant) | "Mother of Félicie 7" | ⚠️ **Trou de fiche** : Anna n'est pas explicitement décrite comme mère. À ajouter en V2 pour cohérence avec usage Mother's Day |
| Famille esthétique | (champ manquant) | F1 no-makeup naturelle (implicite) | ⚠️ Champ à ajouter |

→ **Anna est utilisable en l'état pour S05/S06**, mais sa fiche v1.1 mérite un patch v1.2 pour aligner sur D2 (`famille_esthetique`, ajout maternité explicite, cheveux harmonisés avec usage prompts). **Charge estimée ~15 min**.

---

## SECTION 5 — Audit `shoot_studio` : lecture `constants.tsx` (entier)

Fichier : `archives/aistudio_legacy/shoot_studio/constants.tsx` (257 lignes).

### 5.1 — Constantes exportées

| Constante | Lignes | Contenu | Devenir prévu |
|---|---|---|---|
| `PRODUCTS` | 5-11 | 5 codes Awdis : `JH001 Hoodie cordons ronds sans embout`, `Zoodie JH050`, `JH030`, `T-shirt Epais`, `JH01J` | **REMPLACER** par lecture de `referentiels/_mapping_legacy.json` + `assets_produits/YPxxx/` |
| `SIZES` | 13 | 6 tailles broderie : `2 / 4 / 6 / 8 / 12 / 20` cm | **CONSERVER** (cohérent avec `parametres_techniques_broderie` des variantes) |
| `ASPECT_RATIOS` | 15-21 | 5 ratios : `1:1 / 3:4 / 4:3 / 9:16 / 16:9` (labels actuels FAUX : "1:1 = Carré (PDP)" mais charte = 4:5) | **EXTEND** : ajouter `4:5` en default, supprimer `4:3` (non utilisé), garder `3:4` legacy |
| `ETHNICITIES`, `AGES`, `BODY_TYPES`, `DISABILITIES` | 23-55 | Système diversity (random) | **CONSERVER + EXTEND** : reste actif en mode "Diversity", + ajouter mode "Canonique" à côté (toggle, cf. décision Sarah) |
| `PRODUCT_MATERIALS` | 58-64 | Description technique précieuse par produit (cordons ronds, AUCUNE poche kangourou…) | **CONSERVER intégralement** — pépite à transposer dans la nouvelle structure produit |
| `THREAD_COLORS` | 66-80 | 12 fils hardcodés avec hex | **REMPLACER** par lecture de `referentiels/palette_fils_broderie.json` (20 fils Hub) |
| `GARMENT_COLORS` | 82-98 | 15 couleurs vêtement hardcodées | **REMPLACER** par lecture de `referentiels/palette_supports_par_produit.json` (filtrage dynamique par YPxxx) |
| `BRAND_PALETTE` | 100-105 | 4 couleurs UI app : `linen / sable / paleOlive / deepOlive` | **CONSERVER** ou aligner sur charte Hub (la charte_editoriale.json a ses propres couleurs UI) |
| `COPYRIGHT_DISCLAIMER` | 107 | Anti-trigger Gemini sur "PAPI / MAMIE" et autres mots tendre | **CONSERVER mot pour mot** — précieux pour bypass safety |
| `PROMPT_BASE` | 109-119 | Template prompt général multi-mode | **EXTEND** : injecter au bon endroit le bloc canonique (parts[] image + signature EN courte) quand mode = "Canonique" |
| `PACKSHOT_PROMPT` | 121 | Template ghost mannequin | **CONSERVER** — pas affecté par le casting |
| `SHOTS_CONFIG` | 123-148 | 4 types de shots : `PORTRAIT, DETAIL, MACRO, LIFESTYLE, OUTDOOR` (5 en réalité). Chaque shot a 3 variantes (mannequin / packshot / family). | **CONSERVER + EXTEND** : aligner les labels avec `referentiels/shooting/types_de_shots.json` |
| `FULL_PACK_PARISIEN` | 150-183 | Pack 6 shots : GHOST, CROP, MACRO, LIFESTYLE, DUO, PORTRAIT | **REMPLACER** par chargement dynamique depuis `referentiels/variantes/le_club/var_*.json` |
| `FULL_PACK_MINIMALIST` | 185-210 | Pack 6 shots : STUDIO_FEMME, PACKSHOT_PORTE, BUSTE_HOMME, BUSTE_FEMME, GHOST, MACRO | **REMPLACER** par variantes Hub |
| `FULL_PACK_LOFT` | 212-237 | Pack 6 shots : PLEIN_PIED, PLAN_AMERICAIN, BUSTE, RAPPROCHE, MOUVEMENT, NATURE_MORTE | **REMPLACER** par variantes Hub |
| `MODEL_DESCRIPTION` | 240-246 | Template anti-supermodel avec placeholder `[DIVERSITY_DESCRIPTION]` | **REMPLACER** par lecture de `direction_artistique_hero.json:307` `prompt_suffix_universel` (source unique D2) |
| `FLAT_LAY_DESCRIPTION` | 248 | 1 ligne d'instruction flatlay | **CONSERVER** ou intégrer dans variantes |
| `FAMILY_DESCRIPTION` | 250-256 | Template family avec placeholders `[COUPLE_TYPE]`, `[CHILDREN_COUNT]`, `[MATERIAL]` | **EXTEND** : ajouter mode "canoniques multi-sélectionnés" (ex : Béatrice+Anna+Félicie) |

### 5.2 — Contenu intégral de `PROMPT_BASE` (lignes 109-119)

```
Generate an image of:
Hyper-realistic digital mockup of a fashion editorial concept. 
QUALITÉ : Rendu 3D hyper-réaliste 2K ultra-détaillé, cinématographique, grain de pellicule argentique (analog film quality), mise au point macro d'une précision absolue.
STYLE : Photographie professionnelle premium, niveau campagne publicitaire haut de gamme. Effortless French cool, chic, émotionnel et ultra-authentique. Ambiance A.P.C., Octobre Éditions, Sézane, et émoi émoi.
DÉCOR : Editorial apartment with sage green molded walls, chevron parquet floor, and vintage decor (like a stylish sofa).
LUMIÈRE : Lumière naturelle zénithale, morning window light ou golden hour douce.
PALETTE : Tons neutres désaturés, beige "natural raw", sable, crème, avec des touches de [THREAD_COLOR].
PRODUIT : Un [PRODUCT] de couleur unie et constante [GARMENT_COLOR] confectionné en [MATERIAL]. Le vêtement est vierge à l'intérieur, sans aucune étiquette ou label de marque visible au niveau du col. La texture du tissu doit être parfaitement visible au niveau des mailles.
BRODERIE : Le motif joint est brodé en fil [THREAD_COLOR] côté cœur. ATTENTION PARTICULIÈRE : La broderie doit être EXTRÊMEMENT PLATE, SANS AUCUN RELIEF, SANS EFFET 3D NI GONFLÉ. Elle doit s'intégrer complètement au tissu comme une broderie fine et délicate, sans aucune surépaisseur. Si le motif contient du texte, les lettres brodées doivent être d'une lisibilité et d'une précision chirurgicale, sans aucune déformation. Les points de broderie (satin stitch, fill stitch) doivent être distincts et épouser parfaitement la tension et la maille du vêtement. Le rendu doit être 100% plat, lisse et ultra-réaliste.
TAILLE : La broderie mesure [SIZE] cm.${COPYRIGHT_DISCLAIMER}
```

### 5.3 — Structure `SHOTS_CONFIG` (lignes 123-148)

5 types de shots, chaque shot a 3 variantes (`promptSuffix`, `packshotSuffix`, `familySuffix`) :

| Shot | Label | Usage |
|---|---|---|
| `PORTRAIT` | "Portrait Éditorial" | Portrait mi-corps, 85mm f/2 |
| `DETAIL` | "Macro Broderie" | Gros plan macro 100mm |
| `LIFESTYLE` | "Lifestyle Mode" | Studio sage green / vintage |
| `OUTDOOR` | "Lifestyle Extérieur" | Plan large extérieur, golden hour |
| (MACRO non séparée — fusion possible avec DETAIL) | – | – |

### 5.4 — `FULL_PACK_*` (3 styles)

- **`FULL_PACK_PARISIEN`** : 6 shots — GHOST, CROP, MACRO, LIFESTYLE, DUO, PORTRAIT
- **`FULL_PACK_MINIMALIST`** : 6 shots — STUDIO_FEMME, PACKSHOT_PORTE, BUSTE_HOMME, BUSTE_FEMME, GHOST, MACRO
- **`FULL_PACK_LOFT`** : 6 shots — PLEIN_PIED, PLAN_AMERICAIN, BUSTE, RAPPROCHE, MOUVEMENT, NATURE_MORTE

Tous les prompts sont déjà alignés sur la D2 brand (Émoï-Émoï, Sézane, A.P.C., Maison Labiche, AMI Paris, Octobre Éditions, "imperfect human model"). Pas de réécriture massive nécessaire — c'est l'**injection canonique au bon endroit** qui transforme l'output.

### 5.5 — Palettes hardcodées

- 12 fils dans `THREAD_COLORS` ([lignes 66-80](archives/aistudio_legacy/shoot_studio/constants.tsx#L66-L80))
- 15 couleurs vêtement dans `GARMENT_COLORS` ([lignes 82-98](archives/aistudio_legacy/shoot_studio/constants.tsx#L82-L98))

→ Les deux à remplacer par lecture des JSON Hub (`palette_fils_broderie.json` 20 fils, `palette_supports_par_produit.json` filtrable par YPxxx).

### 5.6 — Anti-patterns vs Hook 1 canoniques

| Anti-pattern identifié | Sévérité | Fix |
|---|---|---|
| `MODEL_DESCRIPTION` doublonne avec `direction_artistique_hero.json:307` (`prompt_suffix_universel` D2) | 🟡 | Lire depuis le JSON, ne plus hardcoder |
| Système `diversity` figé en placeholders FR (`ethnie noir(e)`, `âge senior 60+`) → cohabitation avec mode canonique nécessite un branchement clair côté `geminiService.ts` | 🟢 | Conditionnel `if (canoniqueIds.length > 0) inject parts[] else use diversity` |
| `process.env.API_KEY` côté client (ligne 13 `geminiService.ts`) | 🔴 | Vite n'expose pas `process.env` → utiliser `import.meta.env.VITE_GEMINI_API_KEY` |
| Pas de cache des canoniques côté front | 🟢 | Trivial : charger les 23 JPGs en lazy + base64 cache (sans bloquer démarrage) |
| `index.html` importmap esm.sh doublonne avec bundler Vite | 🟡 | Retirer importmap |

**Aucun anti-pattern bloquant pour Hook 1.** L'archi est saine, le branchement canonique se fait à 1 endroit du `geminiService.ts` (ajout `parts[]` avant le prompt) + 1 endroit dans `Sidebar.tsx` (toggle Diversity/Canonique + dropdown).

---

## SECTION 6 — Plan d'exécution séquencé pour la session du 30/04

> **Hypothèse** : la cascade Camille → Clémence est sortie ; la session se concentre sur (a) arbitrage scénario hybride + patch éventuel S03/S04, (b) fork shoot_studio Phase 0, (c) ajout 4:5, (d) Hook 1 canoniques, (e) test de valeur.

| Ordre | Tâche | Fichiers touchés | Charge | Dépendances | Risque |
|---|---|---|---|---|---|
| **0 (matin, tête fraîche)** | ~~Arbitrage DA scénario hybride~~ ✅ **DÉCIDÉ 29/04 nuit** : *"Clémence possible sur S03 ou S04 si pas de prise de vue avec un enfant"*. Donc S03 → Clémence, S04 → Clémence (deux shots solo / crop sans enfant). S05 et S06 restent Anna (rôles maternels avec Félicie 7). | aucun | 0 min | aucune | Levé |
| **1** | **Patch v1.2 fiche Anna** : ajout `famille_esthetique: "no-makeup naturelle"`, mention explicite "mère d'enfants jeunes (Félicie 7 ans implicite)", harmonisation cheveux ("brun chaud / dark blonde sun-streaked = même registre"). 1 commit. | `referentiels/shooting/mannequins_lot2_2fiches.json` | 15 min | Étape 0 | Faible — ajout de fields sans réécriture |
| **2** | **Réécriture S03 + S04 prose Clémence** (scénario hybride lockée) : chocolate brown wavy + curtain bangs Bardot + bordeaux MAC Diva + freckles + grey-green eyes + antique silver rings. Maj `titre_humain`, `mannequins_assignes: ["MAN-P01 Clémence"]`, `notes_styliste` (documenter le patch). 1 commit `chore(mama_club): scénario hybride DA — Clémence sur S03 + S04 shots identité produit`. | `referentiels/variantes/le_club/var_mama_club.json` (S03 + S04) | ~45 min | Étape 1 | 🟡 Moyen — réécriture prose EN, repère existant : `var_team_dog.json:198` (S03 Clémence avec retriever) et `var_sista_club.json:141` (trio Clémence + Anna + Aïcha) déjà rédigés |
| **3** | **Phase 0 fork shoot_studio** : créer `apps/atelier-shooting/` en copiant `archives/aistudio_legacy/shoot_studio/` ; setup `pnpm-workspace.yaml` ; remplacer `process.env.API_KEY` → `import.meta.env.VITE_GEMINI_API_KEY` ; retirer importmap esm.sh ; supprimer `metadata.json` AIStudio ; remplacer `App.tsx` `window.aistudio` par fallback ENV ; réécrire README. 1 commit. | `apps/atelier-shooting/*` (création) | 1h | aucune (parallélisable avec étape 2) | Faible — fork mécanique, instructions claires |
| **4** | **Ajout aspect ratio 4:5** : modifier `ASPECT_RATIOS` dans `constants.tsx` du nouveau `apps/atelier-shooting/` : ajouter `{ value: '4:5', label: 'Portrait (standard PDP)', icon: 'fa-rectangle-portrait' }` en première position, marquer `3:4` "(legacy)", supprimer `4:3`. Mettre à jour `types.ts` `AspectRatio` type. 1 commit. | `apps/atelier-shooting/constants.tsx`, `apps/atelier-shooting/types.ts` | 10 min | Étape 3 | Très faible |
| **5** | **Hook 1 canoniques (le cœur)** : (a) ajout du champ `castingMode: 'diversity' \| 'canonique'` + `canoniqueIds: string[]` dans `types.ts` + `App.tsx` state ; (b) UI Sidebar : toggle radio + dropdown des 23 canoniques (lit `referentiels/shooting/mannequins_recurrents.json` au démarrage) ; (c) `geminiService.ts` : si `canoniqueIds.length > 0`, charger les JPGs depuis `assets/canoniques/`, convertir en base64, injecter en `parts[]` AVANT l'image broderie + remplacer `MODEL_DESCRIPTION` par signature courte EN tirée de `apps/atelier-social/src/lib/canoniques.ts` (réutiliser le pattern existant 95% fidélité). 1 commit. | `apps/atelier-shooting/types.ts`, `App.tsx`, `components/Sidebar.tsx`, `services/geminiService.ts`, **lecture** `referentiels/shooting/mannequins_recurrents.json` + `assets/canoniques/*.jpg` | 1.5-2h | Étapes 3, 4 | 🟡 Moyen — premier code "réel" du Hub, il faut tester que la lecture du JSON marche, que les JPGs sont accessibles, que Gemini accepte 2 images en `parts[]` |
| **6** | **Test de valeur Mother's Day comparatif** : générer 3 fois S05 (duo Anna + Félicie) avec atelier-shooting nouveau Hook canoniques activé. Comparer côte à côte avec output AIStudio actuel (random visages). Critère : Anna doit avoir le même visage à 95% sur les 3 régénérations. Documenter résultat dans `_passations/`. | 0 fichier modifié, juste production d'images + screenshot | 30-45 min | Étape 5 fonctionnelle | 🟡 Moyen — c'est le moment de vérité ; si fidélité < 90%, il faut itérer sur la signature EN ou l'ordre des `parts[]` |

### 6.1 — Précisions par tâche

#### Tâche 0 — Arbitrage scénario hybride
- **Claude seul ou décision Sarah ?** Décision Sarah uniquement.
- **Critère de validation** : Sarah écrit clairement *"S03 → Clémence"* OU *"S03 → Anna"* (et idem S04).
- **Charge honnête** : 5 min si Sarah a déjà tranché en tête, 30 min si elle veut comparer les 2 options visuellement avant.

#### Tâche 1 — Patch fiche Anna v1.2
- **Claude seul ?** ✅ Oui, ajouts mécaniques.
- **Critère de validation** : `famille_esthetique` présent, version bumpée à v1.2, changelog ajouté.
- **Charge honnête** : 15 min, marges 5 min relecture.

#### Tâche 2 — Réécriture S03 (et S04 ?) Clémence
- **Claude seul ?** ⚠️ Génération de prose EN par Claude OK, mais Sarah doit relire avant commit (les prompts de prose Clémence existent déjà dans `var_team_dog.json:198` et `var_sista_club.json:141` — bon repère).
- **Critère de validation** : (a) titre_humain mentionne Clémence, (b) `mannequins_assignes: ["MAN-P01 Clémence"]`, (c) prose EN inclut au minimum *"chocolate brown wavy hair", "curtain bangs Bardot", "deep bordeaux MAC Diva lips"*, (d) note_styliste documente le patch hybride.
- **Charge honnête** : 30 min si S03 seul, 45 min si S03 + S04.

#### Tâche 3 — Phase 0 fork shoot_studio
- **Claude seul ?** ✅ Oui, étapes mécaniques documentées (cf. audit `apps/atelier-shooting` du 29/04).
- **Critère de validation** : `pnpm dev:atelier-shooting` démarre sans erreur, l'app affiche la sidebar, un click "Générer" sans clé Gemini affiche un message d'erreur clair (pas de crash).
- **Charge honnête** : 1h en première intention, +30 min de marge si problème pnpm-workspace.

#### Tâche 4 — Aspect ratio 4:5
- **Claude seul ?** ✅ Oui.
- **Critère de validation** : 4:5 apparaît dans la dropdown du sidebar, est sélectionné par défaut, l'API Gemini accepte la valeur.
- **Charge honnête** : 10 min.

#### Tâche 5 — Hook 1 canoniques
- **Claude seul ?** ✅ Pour la mécanique. Sarah doit tester visuellement après.
- **Critère de validation** : (a) la dropdown des 23 canoniques s'affiche correctement, (b) sélectionner "Anna" → générer un shot → l'image générée a le visage d'Anna à >85% (visuel approximatif). Le test détaillé est en tâche 6.
- **Charge honnête** : 1.5-2h. **Attention au piège** : si on essaie d'injecter trop de signature EN dans le prompt, Gemini rejette en `IMAGE_OTHER`. Pattern validé : signature 30-80 mots EN + 1 JPG canonique dans `parts[]` + prompt minimal.

#### Tâche 6 — Test de valeur Mother's Day
- **Claude seul ?** ✅ Pour la génération + screenshot. Sarah valide la fidélité.
- **Critère de validation** : 3 régénérations S05 avec Anna canonique → 3 images où le visage d'Anna est reconnaissable et stable. Critère minimal : 2/3 réussites.
- **Charge honnête** : 30-45 min. Échec possible : Gemini IMAGE_OTHER → fallback retry simplifié.

### 6.2 — Récap charge totale

| Scénario | Durée prévue |
|---|---|
| **Plancher** (étapes 0-1-3-4 sans scénario hybride et sans Hook 1) | ~1h45 |
| **Réaliste** (étapes 0-1-3-4-5 + scénario hybride S03 seul + Hook 1 + test) | ~5-6h |
| **Maximum** (toutes les étapes y compris S03+S04 réécrits, fiche Anna v1.2, fork complet, Hook 1 + tests) | ~7-8h |

→ **Recommandation Claude** : viser le scénario réaliste (~5-6h). Tâches 0-1-3-4 le matin (parallélisables, charges courtes), tâche 5 l'après-midi (tête plus fraîche), tâche 6 fin de journée pour valider.

---

## QUESTIONS OUVERTES (ordonnées par criticité)

1. ✅ **RÉSOLUE 29/04 nuit** — Scénario hybride confirmé. *"Clémence possible sur S03 ou S04 si pas de prise de vue avec un enfant"*. Donc **S03 = Clémence**, **S04 = Clémence**, **S05 = Anna** (avec Félicie 7), **S06 = Anna** (avec Félicie 7 et Béatrice). Logique : Clémence est canon mère d'**ado 14-16**, pas d'enfant 7 — donc OK sur shots solo et crop, exclue des shots maternels avec Félicie.
2. ✅ **RÉSOLUE 29/04 nuit** — S04 inclus dans le scope Clémence (crop poitrine = shot identité produit, sans enfant).
3. 🟡 **Mode `diversity` à conserver ou supprimer ?** Sarah a écrit clairement le 29/04 : *"coexistence — diversity = défaut, canonique = override"*. Confirmation pour locker cette décision avant fork.
4. 🟡 **Famille esthétique manquante dans Anna v1.1** : ajout `"famille_esthetique": "no-makeup naturelle"` OK ou besoin d'arbitrage spécifique ? (A priori trivial — Anna est natural-fit famille 1.)
5. 🟡 **Anna comme "mère normande" en S06** : Anna est documentée Provençale (Aix/Arles), S06 la place en Normandie. Acceptable comme licence narrative ou créer un trou de doc à corriger ? (Pas bloquant pour Mother's Day, à arbitrer en V2 fiche Anna.)
6. 🟢 **Aspect ratio 3:4 : conserver "(legacy)" ou supprimer ?** Recommandation Claude : conserver en "(legacy/déprécié)" pour rétrocompatibilité avec quelques shots historiques.
7. 🟢 **Stack Vite vs Next.js pour `apps/atelier-shooting/`** : `atelier-social` est en Next.js, `shoot_studio` est en Vite. Garder Vite (moins de friction migration, pattern différent dans le monorepo) ou uniformiser sur Next.js (plus de cohérence) ?
8. 🟢 **Suppression du contrôle `disability` dans diversity mode** ? Vu que les particularités physiques sont encodées dans les canoniques (Coline=fauteuil, Hassan=canne, Césaria=vitiligo), le contrôle `disability` du mode diversity peut être supprimé. À confirmer.
9. 🟢 **Migration `PRODUCTS` Awdis → YPxxx** : faire dans Phase 0 fork (au moment de toucher au code) ou en V2 propre ?
10. 🟢 **Lecture des palettes Hub vs hardcoded** : faire en Phase 0 (cohérent) ou différer en V2 ?

---

## 🚨 Découvertes hors périmètre

### A. Le brief mentionne `referentiels/casting/` qui n'existe pas

La structure réelle du repo place le casting dans `referentiels/shooting/` (mannequins_recurrents.json, _README_casting.md, duos_detailles_et_distribution.json, direction_artistique_hero.json). Le brief écrit comme s'il y avait un dossier `referentiels/casting/` séparé. **Aucune migration de chemin requise**, c'est juste une coquille du brief.

### B. La cascade Camille → Clémence est complète et propre

Hier soir (29/04 nuit, commits `880734b` + `15c5953` + `c7a4a48` + `a9549dc`), les actions suivantes ont été appliquées :
- 13 fichiers modifiés (référentiels, goldens, motifs, code app, doc maître)
- Source unique JSON consolidée (`docs/casting/mannequins_lot1_5fiches.json` supprimé, `referentiels/shooting/mannequins_lot1_5fiches.json` v3.0 conservé)
- 4:5 enforcement (PATCH 2026-04-22 sur var_mama_club)
- Brand-safety (`brodé main` purgé des goldens et archive blog ; `Cadeaux fait main` retiré des Pinterest categories)
- Convention nommage canoniques (couples standardisés en `_Prénom_canonique.jpg`)

→ **Le repo est en bonne santé pour attaquer le Hook 1 canoniques en confiance.** La majorité du travail "doc maître" est dehors.

### C. Anna v1.1 est sous directive D1 obsolète

`mannequins_lot2_2fiches.json` v1.1 (2026-04-24) référence `D1_BEAUTE_INCARNEE v2.0`. La directive en vigueur est `D2_DEUX_FAMILLES_ESTHETIQUES v1.0` (29/04). **Le Lot 2 entier (Anna + Lila) doit être migré v1.2 avec ajout `famille_esthetique` à minima**. Charge ~15 min pour Anna seule, ~25 min pour Anna + Lila.

### D. `apps/atelier-social/src/lib/canoniques.ts` contient déjà des signatures EN courtes pour les 23 canoniques

C'est une **mine d'or pour Hook 1**. Au lieu de lire les JSON `mannequins_lot*` et reconstruire la signature, le pattern le plus rapide est de **réutiliser directement `apps/atelier-social/src/lib/canoniques.ts`** dans `apps/atelier-shooting/` (import partagé via `packages/casting/` à créer dans le monorepo, ou simple copie pour V1).

→ **Recommandation V1** : copier le tableau des 23 canoniques dans `apps/atelier-shooting/src/lib/canoniques.ts` (DRY violation acceptée pour V1, à factoriser en `packages/` quand un 3ème app aura besoin).

### E. `_README_casting.md:146` a été mis à jour en commit `880734b` avec convention de nommage des canoniques

Section *"Convention de nommage des canoniques"* documente maintenant solo / duo / déprécié. **Bonus** : si quelqu'un (ou Claude) crée demain de nouveaux canoniques (ex : Anna v2 avec famille_esthetique D2-aligned), la convention est claire.

### F. Tu as 4 commits non poussés sur `origin/main`

```
c7a4a48 fix(brand-safety): 'brodé sur métier Tajima' → 'à la commande' (trop technique consumer-facing)
15c5953 chore(brand-safety): supprime formulations interdites (goldens + archive blog)
880734b chore(casting): align doc/JSON post-refonte Clémence + conventions nommage
ce3dde3 chore(casting): archive deprecated Camille canonical → Clémence active
```
*(Plus le commit `a9549dc` cascade Camille → Clémence + redistribute rôles narratifs, qui est le plus volumineux.)*

→ **Penser à `git push` avant de fermer la session du 30/04** pour ne rien perdre côté sauvegarde GitHub privée.

---

*Bonne nuit Sarah. Le rapport est pret. Le repo est propre. Demain matin tete fraiche, tu attaques.* 🌙
