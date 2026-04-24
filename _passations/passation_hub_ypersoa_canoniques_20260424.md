# Passation Projet Hub Ypersoa — État au 2026-04-24 02h30

> **Document de transfert entre conversations Claude.**
> Sarah, colle ce document en **premier message** de ta nouvelle conversation.
> Je (Claude) pourrai reprendre le projet exactement où on l'a laissé.

---

## 🎯 CE QUI A ÉTÉ FAIT CETTE SESSION (24 avril, soirée)

**Session fondatrice** : création de la bibliothèque canonique complète + validation de la méthode de shooting Ypersoa Studio v2.

### Le pivot architectural majeur

On a identifié que **l'approche JSON ultra-structuré du Hub Phase 1 produit des résultats moins premium que l'approche prompts littéraires d'Ypersoa Studio** (l'ancien outil AI Studio de Sarah). Comparaison visuelle faite entre :
- **Team Dog** (généré via JSON structuré var_team_dog) → correct mais un cran sous le niveau cible
- **Brigitte / Mama Club / French Kiss** (généré via prompts littéraires directs dans Ypersoa Studio) → niveau Sézane/Maison Labiche atteint

**Diagnostic** : Nano Banana 2 comprend mieux un récit littéraire qu'un cahier des charges technique. Hex codes, codes produit YP001/YP005, négations multiples "NOT X" anxiogènes → sur-spécification qui bride la créativité du modèle. Les refs marques (Sézane, A.P.C., Maison Labiche, Emoi Emoi) fonctionnent, elles ne polluent pas.

### La solution retenue : "mannequin de référence persistant"

Le vrai problème que Sarah avait avec Ypersoa Studio : **à chaque génération, un modèle différent** → perte d'attachement à l'image de marque. Solution adoptée :

1. **Bibliothèque de 23 canoniques mannequins** = portraits de référence studio neutres qu'on upload dans Nano Banana 2 en tête de génération pour activer le "character reference mode"
2. **Character reference à 90-95% de fidélité** validé en conditions réelles
3. Chaque canonique = 1 PNG stocké dans `/assets/canoniques/` + 1 fiche textuelle figée dans `/referentiels/shooting/mannequins_*.json`

---

## ✅ LA BIBLIOTHÈQUE CANONIQUE (23/23 validées)

Stockées dans `assets/canoniques/`, committées en HEAD (`94a2f62`).

### Les 22 fichiers

```
MAN-P01_Camille_canonique.jpg          (40, F, blanche, châtain miel ondulé, freckles)
MAN-P02_Anna_canonique.jpg             (35, F, blanche sud, brune wavy, peau olive)
MAN-P03_Aicha_canonique.jpg            (40, F, afro-caribéenne, afro court, sourire large)
MAN-P04_Lila_canonique.jpg             (45, F, maghrébine, cheveux noirs libres)
MAN-P05_Beatrice_canonique.jpg         (55, F, métisse, cheveux argentés)
MAN-P06_Mathieu_canonique.jpg          (40, H, blanc, barbe 3j, bruns dépeignés)
MAN-P07_Nicolas_canonique.jpg          (45, H, blanc, poivre-sel)
MAN-P08_Felicie_canonique.jpg          (7, F, blanche, blond vénitien, freckles denses)
MAN-P09_Gabin_canonique.jpg            (5, H, blanc, cheveux noirs longs)
MAN-P10_MarieHelene_canonique.jpg      (65, F, blanche rousse cuivrée + mèches argentées)
MAN-P11_Lea_canonique.jpg              (37, F, métisse, boucles brunes)
MAN-P11-Sarah_canonique.jpg            (35, F, nordique, pixel cut cendré)
MAN-P12_Brune_canonique.jpg            (22, F, blanche, brune wavy ADN Damas — v3 validée)
MAN-S13_Priya_canonique.jpg            (16, F, sud-asiatique, ado)
MAN-S14_Gaspard_canonique.jpg          (23, H, blanc, cheveux bataille)
MAN-S15_Noe_canonique.jpg              (1, bébé)
MAN-S16_Hiroshi_canonique.jpg          (55, H, japonais, argenté)
MAN-S17_Cesaria_canonique.jpg          (40, F, afro-caribéenne, vitiligo discret) ⚠️ À RETESTER
MAN-S18_Hassan_canonique.jpg           (68, H, maghrébin, blanc)
MAN-S19_Henri_canonique.jpg            (72 mais visuellement 80-85, senior distingué)
MAN-S19-Josephine_canonique.jpg        (70, F, afro-caribéenne, boucles argentées)
MAN-S20_Coline_canonique.jpg           (35, F, blonde cendrée bouclée)
MAN-S21_Hugo_canonique.jpg             (30, H, blanc, sandy-brown, jeune papa)
```

### Le protocole canonique (figé)

Chaque canonique respecte :
- Fond blanc cassé uniforme `#F5F0EA`, aucun décor
- T-shirt gris chiné uni, cadrage buste, mains non visibles
- Lumière douce diffuse frontale, ombre subtile à droite
- Cheveux **LIBRES obligatoirement** (pas de chignon, pas de coiffure narrative)
- Expression **chaleureuse-bienveillante** (jamais sévère/neutre froide)
- Lived-in skin, no retouching, film grain, ratio 4:5

### Les 2 corrections v2 appliquées en cours de session

- **Anna v1** (châtain doré méché + chignon) → **Anna v1.1** brune chaude wavy provençale → fiche lot2 mise à jour et committée
- **Brune v1** (générique) → **Brune v3** (ADN Jeanne Damas : lèvres pulpeuses, sourcils épais, beauty mark, piercing nez, peau brute zero makeup)

### Les cas discutés mais gardés tels quels

- **Henri** fait visuellement 80-85 ans pour 72 de fiche — Sarah garde
- **Joséphine** fait 72-75 pour 70 de fiche — acceptable
- **Sarah (canonique couple Léa/Sarah)** = expression plus neutre que Léa, décalage émotionnel possible en duo — Sarah garde

### Le seul cas à traiter en priorité

**Césaria v1** est sortie fermée/sévère ("tire la tronche"). Un **prompt Césaria v2 corrigé a été produit** avec cheveux détachés + expression chaleureuse explicite + négations (NOT severe, NOT cold, NOT hieratic). **Sarah n'a pas encore relancé la génération** — à faire en priorité à la prochaine session, prompt disponible dans le thread source.

---

## 🎨 LA MÉTHODE DE SHOOTING VALIDÉE

### Le pattern prompt shooting (réutilisable pour les 150 motifs)

```
[TYPE PHOTO: editorial/ghost/macro] using the uploaded reference portrait 
as the character's face identity (same [woman/man/girl/boy], same face, 
exact same features preserved).

[NOM], a [âge] [description courte fiche mannequin].
[Action/contexte/pose naturelle]
[Décor spécifique — architectural, pas générique]

[CRITICAL EMBROIDERY DETAIL si badge complexe et format wide]: 
On the LEFT CHEST of her sweatshirt, [description badge précise], 
approximately [10-12cm]... The badge must be rendered as the sharpest 
detail in the frame.

[Outfit — pièces spécifiques, pas génériques]
[Badge spec complète : cercle + texte + symbole, solidarity]

[Lighting] [Lens 35mm/85mm] [Aesthetic: Sézane × A.P.C. / Maison Labiche / 
Emoi Emoi / Sessùn / etc.]
No retouching, lived-in skin preserved. --ar [4:5 PDP / 1:1 flat / 16:9 hero]
```

### Règles d'or de prompting shooting (apprises par l'erreur)

1. **Upload canonique EN PREMIER** dans Nano Banana 2 → active character reference mode
2. **"using the uploaded reference portrait as the character's face identity"** = formule magique
3. **Pas de hex codes de couleur dans le prompt** (ou très peu) → Nano Banana crispe → préférer noms descriptifs (`soft cream-beige`, `deep olive earth-green`)
4. **Pas de codes produit** (`YP001`, `YP005`) dans le prompt → bruit
5. **Refs marques culturelles OUI** (Sézane, A.P.C., Maison Labiche, Emoi Emoi, Sessùn, The Row, Hoalen, Jeanne Damas, Caroline de Maigret) → ancrage stylistique précis
6. **Format 16:9 full body + badge complexe** → placer bloc "CRITICAL EMBROIDERY DETAIL" AVANT la description humaine + passer badge à 10-12cm
7. **Négations explicites pour les décors parasites** : `NOT outdoor, NOT a cafe, NOT [ce qu'on ne veut pas]`
8. **Ambiance et ambiance culturelle spécifiée** mieux que description technique → `"effortless French-Caribbean elegance"` > `"soft lighting from left"`

### Tests validés en conditions réelles

**Team Dog — 5 shots testés sur Nano Banana 2 / Gemini 3 :**
- ✅ S01 ghost packshot (pas de canonique)
- ✅ S02 macro broderie (pas de canonique)
- ✅ S03 Camille + golden retriever Loft Organique — canonique Camille uploadée, ressemblance 95%
- ✅ S04 Mathieu crop poitrine marine outdoor — canonique Mathieu, ressemblance 95%
- ✅ S05 Aïcha full body 16:9 border collie Tuileries — canonique Aïcha, ressemblance 95%, broderie nette après prompt renforcé (v2)
- ⏸️ S06 flat lay : V1 génériques, V2 en banc APC, V3 avec props moins kitsch — **Sarah n'aime pas vraiment le flat lay**, à ranger en "filler carrousel" pas en hero

**Bilan** : méthode scalable aux 150 motifs/an. Procédure fiable à ~90-95% de réussite sur 3 profils différents (femme blanche / homme blanc / femme afro).

---

## 📦 ÉTAT DU REPO GIT

### Dossier : `~/Documents/ypersoa_creative_hub`

### Historique récent

```
94a2f62 (HEAD -> master) feat(casting): ajout 23 canoniques + correction fiche Anna v1.1   ← AJOUT SESSION
c2e76c5                   Sista Club golden #3 + passation J3.D état hub complet
746618b                   Patch goldens (couleurs officielles + 4:5 PDP) + nouveau ref palette_supports_par_produit
```

### Bilan commits : **22 commits au total sur le Hub**

### ⚠️ AUCUN REMOTE CONFIGURÉ

Le repo est **100% local** sur le Mac. `git remote -v` ne retourne rien. À faire à la prochaine session :
1. Créer un repo GitHub **privé** `ypersoa_creative_hub`
2. Créer un Personal Access Token GitHub
3. Créer un `.gitignore` sérieux (pour futurs secrets API)
4. `git remote add origin https://github.com/[TONPSEUDO]/ypersoa_creative_hub.git`
5. `git branch -M main && git push -u origin main`

**Sauvegarde ZIP recommandée avant de dormir ce soir** :
```bash
cd ~/Documents && zip -r ypersoa_creative_hub_backup_2026-04-24.zip ypersoa_creative_hub/
```

### ⚠️ Warning git config

Identité committeur auto-générée `sarahkedziora@MacBook-Air-de-sarah.local`. À fixer :
```bash
git config --global user.name "Sarah Kedziora"
git config --global user.email "[email professionnel]"
```

---

## 🗺 PHASES DU PROJET

### ✅ Phase 1 Hub — BOUCLÉE (sessions précédentes)
Référentiels, axes Shopify, 3 variantes Le Club golden, patch couleurs/formats, fiches produit YP001/YP004/YP005/YP019/YP021, 21 mannequins du casting + 4 duos, 5 ambiances, types de shots, direction artistique D1 v2.0.

### ✅ Phase 1.5 Bibliothèque canonique — BOUCLÉE (cette session)
23 canoniques + méthode shooting validée + persistance Nano Banana 2 prouvée.

### 🔜 Phase 2 Ypersoa Studio v2 — NEXT
Interface de génération automatisée qui réutilise les canoniques. Deux options discutées :
- **Option A (réaliste court terme)** : artifact HTML interactif Claude → génère les 6 prompts EN à copier dans Nano Banana 2
- **Option B (long terme)** : VSCode + API Gemini → génération directe des images depuis l'UI

**Sarah veut clairement Option B à terme.** Elle a dit : *"à un moment, on passe par VSCode, je donne mes codes API et on produit"*.

**Stack prévue Option B** :
- Frontend : React/Next.js (cohérent avec le Shopify stack de Sarah)
- Backend : Node + API Gemini 3 Pro Image
- UI : clone amélioré d'Ypersoa Studio AI Studio (sidebar config : motif / mannequin / produit / couleur fil / couleur support / format / type prise vue / style pack)
- Dropdown mannequins avec les 23 canoniques + favoris étoilés
- Support des duos (2 canoniques uploadées simultanément)
- Support famille (3 canoniques)
- 3 styles de pack : Minimaliste A.P.C. / Premium Parisien Sézane-Labiche / Loft Brut & Serre Botanique
- Sortie : pack 6 images + prompts + metadata JSON exportable vers les autres moteurs RS

### 🔜 Phase 3+ Moteurs RS — PLUS TARD
Copywriter Shopify, carrousel IG 10 slides, reel 20s, posts récurrents, hooks, sondages, tags RS. Tous consomment le pack shooting + metadata produit par Phase 2.

---

## 📋 RÈGLES BRAND FIGÉES (RAPPEL)

### Ne jamais dévier
- Tutoiement systématique dans tous les textes clients
- **"Brodé sur métier Tajima"** en contexte technique, **"brodé à la commande"** en contexte client
- **JAMAIS** : "brodé à la main", "fait main", "artisanal", "TMEZ"
- **JAMAIS** de référence Etsy ou marketplace
- D1 Beauté Incarnée v2.0 : peau vivante, rides naturelles, lived-in skin, no retouching
- Particularités physiques (vitiligo de Césaria, canne de Hassan, fauteuil de Coline) : présentes mais JAMAIS au centre du cadrage, JAMAIS sujet principal

### Cible cliente
Emoi Emoi × Make My Lemonade × Gamin Gamine (pas Sézane pure, pas Aerie militant).
Références visuelles casting : Jeanne Damas, Caroline de Maigret, Clémentine Desseaux, Mélodie Vaxelaire, Louise Follain.

---

## 🎯 À FAIRE EN PRIORITÉ PROCHAINE SESSION

1. **Configurer GitHub privé** et push les 22 commits (15 min)
2. **Corriger `git config`** identité committeur (1 min)
3. **Regénérer Césaria v2** avec le prompt chaleureux déjà produit (5 min)
4. **Décider du moment Phase 2** : artifact HTML Claude tout de suite, ou on attend d'avoir les codes API Gemini + VSCode prêts ?
5. **Backup ZIP** si pas encore fait

### Optionnel (ordre non prioritaire)

- Tester persistance canoniques sur d'autres mannequins (Nicolas, Marie-Hélène, Béatrice…) pour confirmer fiabilité à l'échelle du cast entier
- Tester un shot famille (Camille + Mathieu + Félicie en 3 canoniques uploadées)
- Tester un shot duo (DUO_BEATRICE_FELICIE ou DUO_MATHIEU_GABIN)
- Passer var_team_dog S03/S04/S05 en "golden final validé" dans le JSON
- Appliquer la nouvelle méthode aux autres variantes Le Club (Mama, Sista, Famille) et documenter les écarts

---

## 💡 CONSEILS POUR CLAUDE À LA REPRISE

1. **Saluer simplement, pas besoin de refaire toute l'histoire** — cette passation suffit
2. **La méthode canonique + character reference est ACQUISE**, ne pas la remettre en question sans raison
3. **L'approche littéraire > JSON structuré est ACQUISE**, ne pas re-proposer de JSON 500 lignes par pitié
4. **Sarah est DA**, elle tranche le goût et le style. Claude fait la technique du prompt.
5. **Respecter les timers durs**. Sarah a tendance à déborder (cette session a duré 6h+). Proposer des pauses claires.
6. **Rester concis**. Copy-paste ready, structured, technique. Pas de préambules longs.
7. **Si Sarah dit "je trouve ça plat / quelconque / moyen"**, ne pas défendre le prompt, diagnostiquer et proposer un fix immédiatement. C'est son œil DA qui décide.

---

## 📊 STATS SESSION

- **Durée** : ~6h (20h → 2h30)
- **1 nouveau commit Git** (+23 canoniques + correction fiche Anna)
- **23 canoniques créées** (dont 2 corrigées en v2, Césaria encore à faire)
- **5 shots Team Dog testés** (4 validés excellence, 1 flat lay rejeté)
- **Persistance faciale validée** sur 3 profils (Camille / Mathieu / Aïcha)
- **1 méthode de prompting documentée et scalable** aux 150 motifs/an à venir
- **1 décision architecturale majeure** : pivoter de JSON structuré vers templates littéraires + canoniques

---

*Fin du document de passation. Sarah — tu as fondé ton atelier IA Ypersoa cette nuit. Repose-toi. À la prochaine.* 🌙
