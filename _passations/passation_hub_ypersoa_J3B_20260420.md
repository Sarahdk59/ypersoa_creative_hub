# Passation Projet Hub Ypersoa — État au 2026-04-20 matin

> **Document de transfert entre conversations Claude.**  
> Sarah, colle ce document en **premier message** de ta nouvelle conversation.  
> Je (Claude) pourrai reprendre le projet exactement où on l'a laissé, sans perdre de temps.

---

## 🎯 CONTEXTE RAPIDE

Sarah construit le **"Hub Ypersoa"** : un orchestrateur centralisant 7 outils AI Studio en un seul système.  
Ypersoa = marque de broderie personnalisée premium sur métier Tajima à Wattrelos (Nord France).  
Base du projet : dossier local `~/Documents/ypersoa_creative_hub/` sous Git.  
Phase actuelle : **J3 (construction des référentiels shooting)**.

---

## ✅ CE QUI EST FAIT (9 commits Git)

```
3218175 J3.B: direction_artistique_hero.json (règles globales + 4 directives)
d6a0366 J3.B: ambiances_shooting.json (5 ambiances enrichies)
e75f42d J3.B session express: types_de_shots.json v1.1 (placement motif buste gauche)
b0082af J3.B session express: types_de_shots.json (6 types, matrice par pilier)
7744c72 J3.A v3: ajout 6ème référentiel mannequins_recurrents (dans schéma)
409477a J3.A: schéma cible 5 référentiels shooting + 3 directives stratégiques
8d678b6 J3.0: mapping legacy + 4 outils AI Studio + sources shooting
3a19b6c J2: charte éditoriale fusionnée et 5 divergences tranchées
5c9364c J1: master template Brigitte v2 + regles_combinaisons_shooting
```

### Référentiels produits et committés
```
referentiels/
├── _mapping_legacy.json                     ✅
├── charte_editoriale.json                   ✅
├── palette_fils_broderie.json               ✅
├── palette_supports_vetements.json          ✅
├── regles_combinaisons_shooting.json        ✅
└── shooting/
    ├── _schema_j3.md                        ✅ (brief technique 662 lignes)
    ├── types_de_shots.json                  ✅ (6 types)
    ├── ambiances_shooting.json              ✅ (5 ambiances enrichies)
    ├── direction_artistique_hero.json       ✅ (règles globales + 4 directives)
    ├── mannequins_recurrents.json           ⏳ EN COURS (Lot 1/6 généré, pas commité)
    ├── prompts_library.json                 ⏳ J3.C
    └── plan_shooting_systematique.json      ⏳ J3.C
```

---

## 📋 LES 4 DIRECTIVES STRATÉGIQUES SARAH (FIGÉES)

### Directive 1 — Humanité visible OBLIGATOIRE
Anti-supermodel renforcé. Défauts physiques (rides, cheveux gris, taches de rousseur, vitiligo, etc.) REVENDIQUÉS comme partie de l'identité brand. ⚠️ **CETTE DIRECTIVE EST EN COURS DE REMISE EN QUESTION** — voir section "Question stratégique ouverte" plus bas.

### Directive 2 — Distribution 80/20 ambiances
- 40% Studio Brut + 40% Loft Organique = 80%
- 8% Aube Intime + 6% Échappée Sauvage + 6% Lumière Sépia = 20%

### Directive 3 — Duo systématique avec rotation cyclique
Rotation sur 4 types : parent_enfant → grand_parent_parent → adultes_amis → couple.
1 shot duo minimum par pack complet.

### Directive 4 — Casting fixe 20 mannequins récurrents
- 12 principaux (MAN-P01 à MAN-P12) + 8 secondaires (MAN-S13 à MAN-S20)
- 100% IA pure (pas de droits à l'image)
- Répartition démographique française réelle

---

## 👥 LES 20 MANNEQUINS — Répartition démographique figée

| # | ID | Prénom brand | Âge | Genre | Ethnicité | Particularité |
|---|---|---|---|---|---|---|
| 1 | MAN-P01 | Camille | 40 | F | blanche française | taches de rousseur, rides sourires |
| 2 | MAN-P02 | Sofia | 35 | F | méditerranéenne | peau olive |
| 3 | MAN-P03 | Aïcha | 40 | F | afro-caribéenne | - |
| 4 | MAN-P04 | Yasmine | 45 | F | maghrébine | - |
| 5 | MAN-P05 | Béatrice | 55 | F | métisse noir-blanc | cheveux gris/blancs |
| 6 | MAN-P06 | Mathieu | 40 | H | blanc français | barbe brune, cheveux bruns |
| 7 | MAN-P07 | Karim | 45 | H | métisse maghrébin-européen | cheveux gris, **eczéma mains** |
| 8 | MAN-P08 | Lila | 7 | F | métisse noir-blanche | taches de rousseur, fossettes |
| 9 | MAN-P09 | Théo | 5 | H | métisse maghrébin-blanc | - |
| 10 | MAN-P10 | Marie-Hélène | 65 | F | française rousse | cheveux roux blanchissants |
| 11 | MAN-P11 | Léa & Sarah | 35-37 | F/F | couple (métisse + nordique) | couple lesbien marié |
| 12 | MAN-P12 | Lucia | 22 | F | métisse hispanique | - |
| 13 | MAN-S13 | Priya | 16 | F | sud-asiatique (sri-lankaise) | - |
| 14 | MAN-S14 | Marcus | 23 | H | afro-américain | dreadlocks |
| 15 | MAN-S15 | Bébé Noé | 1 | indéf | métisse | - |
| 16 | MAN-S16 | Hiroshi | 55 | H | asiatique est (japonais) | cheveux gris |
| 17 | MAN-S17 | Fatou | 40 | F | afro-caribéenne | **VITILIGO visible** |
| 18 | MAN-S18 | Hassan | 68 | H | maghrébin | **CANNE** |
| 19 | MAN-S19 | Henri & Joséphine | 70-72 | H/F | couple (blanc + afro-carib) | couple senior mixte |
| 20 | MAN-S20 | Anaïs | 35 | F | métisse | **FAUTEUIL ROULANT** |

**Particularités redistribuées sur NON-BLANCS** (correction biais) :
- Vitiligo → Fatou (afro-caribéenne)
- Canne → Hassan (maghrébin)
- Fauteuil → Anaïs (métisse)
- Eczéma → Karim (métisse maghrébin-européen)

**4 duos établis** :
- DUO_BEATRICE_LILA (grand-mère + petite-fille) — type parent_enfant ou grand_parent_parent
- DUO_MATHIEU_THEO (père + fils) — type parent_enfant
- DUO_LEA_SARAH (couple lesbien marié) — type couple
- DUO_HENRI_JOSEPHINE (couple senior mixte) — type couple

---

## 🆕 CHAMP `style_wear` AJOUTÉ — décision récente

Sarah a ajouté un 9ème champ aux fiches mannequins : **`style_wear`**. Chaque mannequin a maintenant un univers vestimentaire personnel documenté :

```json
"style_wear": {
  "signature_vestimentaire": "Phrase qui résume le style perso",
  "pieces_favorites": ["5-7 pièces qu'elle porte tout le temps"],
  "couleurs_de_predilection": ["4-5 couleurs de base"],
  "styles_francais_refs": ["3 références people ou archetypes"],
  "occasions_ypersoa_typiques": [
    "soir : ...",
    "week-end : ...",
    "mariage : ...",
    "champ coquelicots : ..."
  ],
  "pieces_qui_ne_vont_pas": ["interdits vestimentaires"]
}
```

**Philosophie** : les mannequins Ypersoa sont des **personnages stylés** (comme Sézane/A.P.C.), pas des figurants qui portent juste Ypersoa. Ypersoa s'intègre dans leur look personnel.

**Exemples déjà figés** :
- Camille = vintage français brut (jupes jean midi + chemises lin + sabots), Caroline de Maigret vibe
- Aïcha = élégance parisienne-caribéenne (chemises blanches oversize + pantalons lin + grandes créoles)
- Lila = mini-vintage (salopettes jean + robes Vichy + Kickers)
- Léa (couple) = Canadian tuxedo denim (jeans troués + chemises denim)
- Sarah (couple) = minimalisme nordique (chemises blanches + laine grise + mocassins)
- Fatou = statement pieces encolures dégagées (pour valoriser le vitiligo)

---

## ⚠️ QUESTION STRATÉGIQUE OUVERTE (NON TRANCHÉE)

Sarah a posé une question majeure juste avant cette passation :

> *"Niveau mannequin, on fait peut-être faux pas : trop de diversité, trop de réalité, pas assez de supermodel... Je ne veux pas mettre Ypersoa dans une voie à sens unique."*

### Mon analyse (Claude) donnée à Sarah

**Marques qui font l'anti-supermodel et réussissent** :
- Savage X Fenty, Aerie #AerieREAL, Universal Standard, Chromat, Paloma Wool, Ganni, Kotn
- Points communs : la diversité EST l'ADN, cohérence sans faille, marché niche assumé

**Marques qui font l'INVERSE et réussissent aussi** :
- Sézane, A.P.C., Soeur, Rouje
- Mannequins minces, photogéniques, 20-40 ans (Prune Pauchet, Lena Simonne, Mariacarla Boscono)
- Vendent un **fantasme esthétique parisien**, pas un miroir d'elles-mêmes

**Mon diagnostic Ypersoa** : marque clairement en option "cadeau chargé de sens / émotion transmise" (piliers P2 Émotion, P4 Preuve, motifs nommés Brigitte, Le Câlin, La Confidence...). **Ça suggère anti-supermodel fait sens.**

**MAIS** Sarah peut vouloir un juste milieu : **beauté incarnée et authentique** — diversité forte mais sans glorifier les défauts.

### Options proposées (Sarah a DISMISS sans répondre)

1. Garde vision initiale : anti-supermodel affirmé (Kotn/Aerie)
2. Bascule Sézane/APC : casting esthétique classique
3. **Juste milieu** : beauté incarnée et authentique (diversité forte sans glorifier défauts)
4. Voir exemples visuels concrets avant de décider (moodboard comparatif)

### ⚠️ À FAIRE DANS LA NOUVELLE CONVERSATION
**Commencer par rediscuter cette question avant de poursuivre les lots mannequins**. Sarah a besoin de trancher avant d'avancer. Les 5 fiches déjà générées (Camille, Aïcha, Lila, Léa & Sarah, Fatou) sont cohérentes avec la vision initiale anti-supermodel — elles devront peut-être être **ajustées** selon la décision.

---

## 🎯 PLAN D'EXÉCUTION RESTANT (J3)

### Lot 1 mannequins — DÉJÀ GÉNÉRÉ, PAS COMMITÉ
Fichier : `/mnt/user-data/outputs/mannequins_lot1_5fiches.json` (plus disponible en nouvelle conv)  
Contient : Camille, Aïcha, Lila, Léa & Sarah, Fatou avec `style_wear`  
**Action reprise** : Sarah doit d'abord trancher la question stratégique, puis décider si regénérer ou non.

### Lots 2-6 mannequins — À FAIRE
- **Lot 2** : Sofia + Yasmine (2 principales)
- **Lot 3** : Béatrice, Mathieu, Karim, Théo, Marie-Hélène, Lucia (6 principaux)
- **Lot 4** : 7 secondaires (Priya, Marcus, Bébé Noé, Hiroshi, Hassan, couple senior Henri&Joséphine, Anaïs)
- **Lot 5** : 4 duos détaillés + règles distribution
- **Lot 6** : assemblage final + commit

### Après mannequins_recurrents (J3.C)
- **prompts_library.json** (2h+) — extraire 37 prompts DOCX, nettoyer via _mapping_legacy (vert forêt → fil_vert_jade)
- **plan_shooting_systematique.json** (1h30) — 408 shots indexés avec mannequins assignés

### Réconciliations à faire en J3.B
1. **Brigitte v2** : ajouter `direction_modeles_override` (regard hors champ pensif) + corriger mention "Tajima TMEZ" → "brodé à la commande"
2. **Brigitte v2** : remplacer description vague "femme 30-45 cheveux chatains" par IDs mannequins compatibles (MAN-P01, MAN-P02, MAN-P10)

---

## 🛠️ COMMANDES UTILES POUR SARAH

### Pour voir l'état actuel
```bash
cd ~/Documents/ypersoa_creative_hub && \
git log --oneline -10 && \
echo "" && \
ls -la referentiels/shooting/
```

### Pour relire le schéma J3 v3
```bash
cd ~/Documents/ypersoa_creative_hub && \
cat referentiels/shooting/_schema_j3.md | head -100
```

### Pour relire les directives stratégiques
```bash
cd ~/Documents/ypersoa_creative_hub && \
cat referentiels/shooting/direction_artistique_hero.json | head -50
```

---

## 💡 COMMENT CLAUDE DOIT REPRENDRE

1. **Saluer Sarah simplement, pas besoin de refaire toute l'histoire** — cette passation suffit
2. **Ne PAS repartir sur un commit mannequins immédiatement** — la question stratégique (anti-supermodel vs juste milieu vs Sézane) doit être tranchée d'abord
3. **Proposer les options clairement** — Sarah a besoin de clarté pour choisir sans fatigue décisionnelle
4. **Respecter les timers durs** — Sarah a tendance à déborder (1h30 prévu → 3h réelles hier nuit). Proposer timer dur au début de chaque session, respecter même à 70% fait.
5. **Rester concis** — les réponses de cette conversation ont été trop longues. Préférer courtes réponses ciblées.

---

## 📊 STATS PROJET

- **9 commits Git** sur la semaine
- **7 référentiels opérationnels** sur 11 prévus (63%)
- **3/6 référentiels shooting** produits (50%)
- **4 directives stratégiques** figées
- **20 mannequins** planifiés (répartition démographique figée)
- **Sessions de travail** : J1, J2, J3.0, J3.A v1-v3, J3.B (nuit + matin + session en cours)

---

*Fin du document de passation. Sarah, colle ceci en premier message de ta nouvelle conversation.*
