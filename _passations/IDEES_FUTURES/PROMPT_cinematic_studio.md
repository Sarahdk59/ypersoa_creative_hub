# Cinematic Studio — Prompt archivé pour cadrage futur

> Prompt rédigé le 30/04/2026 fin de session.
> Cinematic Studio = sous-module futur de **atelier-DA**.
> Métiers concernés : n°1 Directeur Artistique + n°2 Photographe shooting (extension vidéo).
>
> NE PAS coder ce prompt tel quel comme HTML/Vite standalone dans tools/.
> Cadrer d'abord en session dédiée la place exacte du module dans
> atelier-DA et son articulation avec atelier-shooting (vidéo =
> extension photographe) avant toute implémentation.
>
> À traiter en session dédiée, après stabilisation atelier-DA V1.

## Source historique

Code legacy AI Studio existant dans le repo :
[archives/aistudio_legacy/cinematic/](../../archives/aistudio_legacy/cinematic/)

Stack legacy : Vite + React + Gemini Veo 3 + TTS + Lyria. Métadonnées :
*"Ypersoa Cinematic Studio — Créez des vidéos promotionnelles
cinématiques pour la marque Ypersoa avec l'esprit tribu, des tons
naturels et une lumière dorée."*

Citation Sarah CLAUDE.md ligne 565 :
*"Cinematic pour mes hero banners, instamatic pour mes posts insta"*

## Articulation pressentie avec le Hub

- atelier-DA.cinematic-studio  (le module)
- consomme atelier-DA :
    référentiel motifs YPM (sous-module 3)
    référentiel ambiances (sous-module 6)
    casting (sous-module 1)
    bible de marque visuelle (sous-module 7)
- consomme atelier-shooting :
    canoniques AI character ref
    règles éditoriales photo
- complémentarité avec Reels Studio (atelier-social) :
    Cinematic = hero banners, vidéos brand identitaires (DA)
    Reels = formats sociaux mobile-first (CM)

## Décisions à prendre avant code

1. Stack : intégré Next.js dans atelier-DA, ou Vite standalone
   importé en iframe ? (cohérence Hub vs vélocité de fork du legacy)
2. Source des motifs/casting/ambiances : import depuis atelier-DA
   via lecture JSON, ou copies locales ?
3. Modèle IA vidéo : Gemini Veo 3 (legacy v1) — confirmer ou tester
   alternatives (Runway Gen-4, Sora, Kling) selon coûts et qualité
4. Génération audio : conserver TTS Gemini + Lyria, ou pivoter
   (ElevenLabs voix, Suno musique) ?
5. Sortie : bundle ZIP (vidéo + voix off + musique + metadata)
   comme prévu en v2, ou export segmenté ?
6. Mode batch (génération multi-motifs en file d'attente) :
   v1 ou v2 ?

---

## Prompt original — archive intention initiale

# 🎬 PROMPT — Hub Ypersoa · Module Vidéo Filmée (v2)

> **Comment l'utiliser** : copier-coller intégralement dans Claude, AI Studio, Bolt, v0 ou Lovable. Le brief est conçu pour un one-shot complet. Adapter la stack si tu cibles un autre builder.
>
> **Hypothèses prises** : on garde Gemini (Veo 3 + TTS + Lyria) car ta version v1 tourne déjà dessus. Si tu veux migrer sur Runway / Sora / Kling, remplacer la section *Stack technique* uniquement.

---

## 🎯 Objectif

Construire une app web qui génère des **vidéos cinématographiques au rendu filmé** (pas motion design, pas slideshow) pour Ypersoa, intégrable au **Hub Ypersoa**. L'app orchestre trois générations en parallèle :

- **Vidéo** (Veo 3) — plan filmé style éditorial
- **Voix off** (TTS Gemini) — narration française premium
- **Musique d'ambiance** (Lyria) — bande son matchée à la durée

Les trois pistes sont synchronisées dans un player unique et exportables séparément ou en bundle.

**Cible esthétique** : Maison Labiche, Sézane, A.P.C., Polène, Emoi-Emoi, Gamin Gamine.

---

## 🧠 Contexte marque (à respecter intégralement)

**Ypersoa** est une marque française de broderie premium personnalisée, basée à Wattrelos (Nord). Toutes les broderies sont réalisées sur **métier industriel Tajima**. Cette précision est non négociable dans tout contenu produit.

### Lexique imposé
- ✅ AUTORISÉ : « brodé sur métier Tajima », « pièce sur-mesure », « atelier Wattrelos », « broderie industrielle premium »
- ❌ INTERDIT : « brodé à la main », « hand-embroidered », « handmade », « DIY », « craft », « custom » (en français), « marketplace »

### Catalogue motifs (17 motifs)
Codes `YPM-001` à `YPM-017`, noms commerciaux :
La Brigitte · L'Ambre · Le Club · Notre Héritage · L'Annonce · Le Câlin · Le Chouchou · La Féline · La Palette · La Ronde · La Confidence · La Meute · Le Depuis · La Tigresse · La Déclaration · La Signature · La Florale.

### Charte visuelle (CLAUDE.md Ypersoa)
| Token | Valeur | Usage |
|---|---|---|
| `--cream` | `#F5F0EA` | Fond principal |
| `--ink` | `#1E2D4A` | Texte, headers, CTA secondaires |
| `--terracotta` | `#C4694A` | CTA primaire, accents |
| `--cream-warm` | `#EDE3D3` | Surfaces secondaires |
| `--ink-soft` | `#4A5878` | Texte secondaire |

**Typographie** : Cormorant Garamond (titres, italiques privilégiés) + DM Sans (corps, UI, boutons en uppercase letter-spacing).

### Tone de voix
Tutoiement systématique. Phrases courtes. Pas de superlatifs marketplace (« incroyable », « unique au monde »). Émotion concrète, pas de promesse vague.

---

## 🏗️ Stack technique

- **React 18 + TypeScript + Vite**
- **Tailwind CSS** avec config étendue (custom colors, custom fonts via Google Fonts)
- **API Gemini** : conserver l'interface du service existant
  - `generateYpersoaVideo(prompt, images, aspectRatio, onProgress)` → Veo 3
  - `generateVoiceOver(text)` → TTS Gemini
  - `generateMusic(brief)` → Lyria
  - `fileToBase64(file)` → util
- Variables d'env : `GEMINI_API_KEY` dans `.env.local`
- Garder le fichier `services/geminiService.ts` de la v1 (signatures stables)

---

## 🧩 Architecture UI

```
┌──────────────────────────────────────────────────┐
│  Header (wordmark Ypersoa · état API · langue)   │
├────────────────────┬─────────────────────────────┤
│                    │                             │
│  Colonne narrative │   Générateur (sticky)       │
│  • Pitch éditorial │   1. Motif                  │
│  • Carrousel       │   2. Casting                │
│    inspiration     │   3. Shot type              │
│    (3 visuels      │   4. Ambiance               │
│    golden stds)    │   5. Format                 │
│  • Mini-doc        │   6. Voix off               │
│    « Pourquoi      │   7. Musique                │
│    Ypersoa »       │   8. Réf. images            │
│                    │   ───────                   │
│                    │   ▶ Générer                 │
│                    │                             │
│                    │   → Preview vidéo + audio   │
│                    │   → Export                  │
└────────────────────┴─────────────────────────────┘
                  Footer minimal
```

---

## 🎛️ Modules fonctionnels du générateur

### 1. Sélecteur de motif
- Grille 4 colonnes des 17 motifs
- Chaque carte : thumbnail golden standard + code YPM + nom commercial
- Sélection unique (un motif = une vidéo)
- Le motif sélectionné injecte automatiquement dans le prompt Veo :
  `[motif visual description] embroidered on [support] using Tajima industrial embroidery machine, dense satin stitches`
- **Source de données** : `data/motifs.json` à créer (voir Annexe A)

### 2. Sélecteur de casting
- Bibliothèque des **20 mannequins AI récurrents** (référentiel Hub Ypersoa)
- Chaque entrée : ID, nom interne, photo de réf, descripteur prompt (âge, morphologie, vibe)
- 3 modes :
  - **Aucun mannequin** (packshot pur)
  - **1 mannequin sélectionné** (cohérence série)
  - **Mannequin random** (au sein d'un sous-set filtré par vibe)
- **Source** : `data/casting.json`

### 3. Sélecteur de shot type
Chips horizontales scrollables :
- 🔬 **Macro broderie** — extreme close-up, threads visibles
- ✋ **POV main** — main tient la pièce, perspective 1ère personne
- 📦 **Packshot rotatif** — produit isolé fond neutre
- 🧥 **Lifestyle porté** — mannequin porte la pièce, mouvement naturel
- 🎁 **Moment cadeau** — déballage, ruban, papier de soie
- 🏭 **Atelier Tajima** — machine en fonctionnement, fil qui défile
- 🎬 **Plan ensemble** — produit + accessoires, flat-lay animé
- 🪡 **Détail couture** — focus sur point satin / point de remplissage

Chaque shot ajoute une chaîne typée au prompt final (voir Annexe B).

### 4. Sélecteur d'ambiance
Reprend le référentiel v1 + nouvelles options du référentiel Hub :
- 🌿 Studio Serre (greenhouse victorienne) — *défaut*
- 🪴 Atelier Botanique (établi bois + terracotta)
- 🧱 Mur Béton Éditorial (minimaliste, ombres dures)
- 🌸 Floral Serré (peonies + delphiniums, dreamy)
- 🏭 Atelier Wattrelos (ambiance industrielle authentique)
- 🛋️ Maison française (canapé lin, lumière fenêtre)
- 🌷 Jardin printemps (extérieur, golden hour)
- ☕ Café parisien (terrasse, lumière mid-day)

### 5. Format
- 📱 **Reel / Story 9:16** — par défaut
- ◻️ **Square 1:1** — Instagram feed
- 🖥️ **Banner Hero 16:9** — site, YouTube
- 📌 **Vertical 4:5** — Pinterest

### 6. Voix off
- Textarea libre (max 200 caractères) + bibliothèque de **8 presets** dans le tone Ypersoa
- Compteur de mots interdits en live (highlight rouge si « main », « hand », « craft »)
- Bouton « ✨ Réécrire en Ypersoa » qui appelle Gemini avec un meta-prompt de réécriture conforme

**Exemple preset** :
> *« L'émotion dans chaque détail. Une pièce brodée sur métier Tajima, pensée juste pour toi. »*

### 7. Musique
- Textarea brief libre + bibliothèque de **6 presets**
  - Indie pop premium (style Sézane reels)
  - Classique moderne piano
  - Ambient acoustique (folk doux)
  - Vintage français (chanson 60s)
  - Lo-fi élégant
  - Cinematic emotional
- Durée alignée automatiquement sur la durée vidéo générée

### 8. Upload référence (optionnel)
- Jusqu'à 3 images en drag & drop
- Cas d'usage : moodboard ambiance, photo réelle d'un produit, palette inspiration
- Limite : 5 Mo / image, formats JPG/PNG/WEBP

---

## ✍️ Prompt engineering Veo

### Prompt de base (immuable)
```
Hyper-realistic edge-to-edge full screen video, NO black borders.
Dynamic moving camera. Shot on medium format camera.
Editorial, timeless, organic mood. Natural soft daylight, warm tones, slight bokeh.
Color grading: cream tones, ink blue shadows, terracotta accents.
```

### Construction dynamique du prompt final
```
[BASE_PROMPT]
+ [SHOT_TYPE_FRAGMENT]
+ [AMBIANCE_FRAGMENT]
+ [MOTIF_FRAGMENT]  ← inclut OBLIGATOIREMENT « Tajima industrial embroidery machine »
+ [CASTING_FRAGMENT]  ← si applicable
+ aspect ratio [9:16 / 16:9 / 1:1 / 4:5]
```

### Règles ABSOLUES (validation côté client avant envoi)
1. Si le prompt final ne contient pas le mot « Tajima » → injection auto
2. Si le prompt contient « hand », « manual », « craft », « DIY », « stitched by hand » → blocage + alerte UI
3. Toujours mentionner la lumière naturelle
4. Toujours finir par la directive de format

### Panneau « Prompt final » (transparence)
Replié par défaut, déployable pour voir/copier le prompt qui sera envoyé à Veo. Permet le debug et l'apprentissage.

---

## 🔊 Génération audio

- **Voix off** : TTS Gemini, voix française féminine, débit posé, ton chaleureux mais maîtrisé
- **Musique** : Lyria, durée ≈ durée vidéo, fade-in 0.5s + fade-out 1s automatiques
- **Synchronisation** : la `<video>` ref pilote les `<audio>` refs (logique déjà présente dans la v1 via `syncAudio`, à conserver)

---

## 📦 Sortie & Export

Player intégré (vidéo + 2 pistes audio sync) puis bloc d'export :

| Bouton | Action |
|---|---|
| ⬇️ Vidéo | `ypersoa_[motif]_[date].mp4` |
| ⬇️ Voix off | `ypersoa_voix_[date].wav` |
| ⬇️ Musique | `ypersoa_musique_[date].wav` |
| 📦 **Bundle ZIP** | Les 3 fichiers + `metadata.json` (motif, casting, shot, ambiance, format, prompts, date) |
| 🎬 Nouvelle prise | Rerun mêmes paramètres, nouveau seed |
| 🆕 Nouveau projet | Reset complet |

---

## 🚦 Garde-fous éditoriaux

- **Validation prompt** côté client avant chaque appel Veo (cf. règles absolues)
- **Historique** : sauvegarder les 20 dernières générations en mémoire (state React, pas de localStorage — non supporté en environnement artifact)
- **Quota Gemini** : afficher un warning si 3 erreurs de quota consécutives
- **Cohérence série** : si deux générations consécutives utilisent le même casting + même ambiance, propose un toast « Tu construis une série, on garde les paramètres ? »

---

## 📐 Détails UI obligatoires

- CTA principal en **Terracotta `#C4694A`** (pas en olive comme la v1)
- Headers en **Cormorant Garamond italique**, taille généreuse (text-5xl à text-6xl)
- Coins arrondis : `rounded-2xl` à `rounded-3xl`
- Ombres douces et chaudes : `shadow-xl` avec `shadow-ink/10`
- Animations : `fade-in` + `slide-from-bottom`, durée 600-1000ms, pas d'effet bling
- États loading : spinner discret + message contextuel
  - « Préparation du tournage… »
  - « Veo encode la scène… »
  - « Lyria compose la bande son… »
  - « Synchronisation des pistes… »
- Mobile-first : le générateur passe full-width, la colonne narrative passe au-dessus

---

## 🔁 Mode batch (v2 — à scaffolder dès la v1, activable plus tard)

- Sélection multiple de motifs (jusqu'à 10 d'un coup)
- Pour chaque motif : génération auto avec mêmes paramètres ambiance/casting/shot/format
- Output : ZIP unique avec un dossier par motif (vidéo + audios + metadata)
- File d'attente visible avec progress bar par item

---

## 📁 Annexes (à créer si absentes)

### Annexe A — `data/motifs.json` (squelette)
```json
[
  {
    "id": "YPM-001",
    "name": "La Brigitte",
    "thumbnail": "/motifs/ypm-001.jpg",
    "veoFragment": "delicate floral monogram embroidery, soft pastel threads, vintage feminine aesthetic"
  },
  // ... 16 autres entries
]
```

### Annexe B — `data/shotTypes.json` (squelette)
```json
[
  {
    "id": "macro",
    "label": "Macro broderie",
    "veoFragment": "extreme macro zoom on embroidery threads, shallow depth of field, threads in sharp focus, fabric texture visible"
  },
  // ...
]
```

### Annexe C — `data/casting.json` (squelette)
```json
[
  {
    "id": "C-01",
    "internalName": "Margaux",
    "thumbnail": "/casting/c-01.jpg",
    "veoFragment": "French woman late 20s, natural brunette, soft features, casual elegance, no makeup look"
  },
  // ... 19 autres
]
```

---

## ✅ Livrables attendus

1. **Repo complet** : `App.tsx`, `components/`, `services/`, `data/`, `types/`, `tailwind.config.js`
2. **README** clair : install, run, troubleshooting Gemini quota, comment ajouter un motif/mannequin/shot
3. **Une vidéo de démo** générée (ou une trace de génération réussie)
4. **Tournage** en local : `npm install && npm run dev` après config `.env.local`
5. **Composants typés strictement** (TypeScript strict mode)
6. **Aucun usage de `localStorage` ni `sessionStorage`** (state React only)

---

## 🚫 Anti-patterns à éviter

- ❌ Couleurs olive/sauge (réservées à la v1, à retirer)
- ❌ Voix off ou musique en dur dans le code (toujours customizable + presets)
- ❌ Boutons « Submit » génériques — toujours formulation Ypersoa (« Lancer le tournage », « Nouvelle prise »)
- ❌ Emojis partout dans l'UI utilisateur (réservés aux chips internes, pas aux CTA)
- ❌ Reproduction d'images de marques tierces dans les références
