# CLAUDE.md — Ypersoa Content Studio

> Fichier de référence pour tout agent IA travaillant sur les contenus Ypersoa.
> Lire intégralement avant de générer le moindre output.

---

## 1. Identité de marque

**Ypersoa** est une marque française de broderie personnalisée sur métier Tajima TMEZ, fabriquée à **Wattrelos, Nord de France**, sous l'entité PhenixLog / Phenix Group.

### Promesse
Offrir une pièce unique, brodée à la demande sur métier professionnel, chargée d'une intention personnelle — pour soi ou pour quelqu'un qu'on aime.

### Positionnement
Premium accessible. Artisanat industriel de précision. Made in France. Pas une boutique Etsy, pas du mass market.

---

## 2. Charte graphique

### Couleurs

| Nom       | Hex       | Usage principal                        |
|-----------|-----------|----------------------------------------|
| Cream     | `#F5F0EA` | Fond principal, arrière-plans, cartes  |
| Ink       | `#1E2D4A` | Texte principal, titres, headers       |
| Terracotta| `#C4694A` | Accents, CTA, highlights, séparateurs  |
| Cream Dark| `#EDE8E0` | Fonds secondaires, tags, surfaces      |

> Ne jamais introduire d'autres couleurs sans validation. Pas de noir pur, pas de blanc pur.

### Typographies

| Rôle        | Police           | Usage                                      |
|-------------|------------------|--------------------------------------------|
| Titres      | **Josefin Sans** | Hooks, accroches, headings, labels UI      |
| Corps       | **DM Sans**      | Captions, descriptions, texte courant      |
| Accent      | *Cormorant Garamond italic* | Sous-titres éditoriaux, citations   |

> Google Fonts. Import systématique avant usage dans tout output HTML/JSX.

### Style visuel
- Ambiance douce, lumière naturelle, fonds neutres (Cream ou blanc cassé)
- Gros plans sur matières : tissu, fil, texture broderie, machine Tajima
- Compositions épurées, asymétrie légère, beaucoup de respiration
- Pas de fonds noirs, pas de néons, pas de filtres Instagram agressifs
- Pas de typographies fantaisie ou script imitant l'écriture manuscrite

---

## 3. Ton de voix

### Règles absolues
- **Tutoiement systématique** — toujours "tu", jamais "vous"
- **Élégant mais direct** — poétique sans être précieux
- **Jamais urgentiste** — pas de "commandez maintenant", "offre limitée", "plus que X en stock"
- **Jamais générique** — pas de "qualité supérieure", "fait avec amour", "prix compétitifs"

### Vocabulaire interdit ❌
| À ne jamais dire | Dire à la place |
|-----------------|-----------------|
| brodé à la main | brodé sur métier Tajima |
| fait main | réalisé sur notre métier Tajima TMEZ |
| trace (mot émotionnel) | lien / souvenir / présence / mémoire |
| artisanal générique | précision, savoir-faire, métier |
| petits prix / pas cher | — (ne pas parler de prix dans les contenus organiques) |
| Etsy / boutique en ligne générique | ypersoa.fr |
| personnalisable | brodé à ton prénom / brodé selon tes envies |

### Exemples de ton juste ✅
> "Ton prénom. Brodé sur métier Tajima. Pour toi, ou pour quelqu'un que tu aimes."

> "Certains cadeaux deviennent des souvenirs. Celui-là le sera."

> "Même loin. Ta présence brodée sur un tissu qu'ils portent tous les jours."

---

## 4. Catalogue produits

### Bases disponibles
- Sweat (col rond)
- Hoodie (capuche)
- T-shirt

### Motifs
- 17 motifs référencés : YPM-001 à YPM-017
- Toujours présenter comme "17 motifs" sans les lister exhaustivement sauf si nécessaire

### Personnalisation
- 20 coloris de fil disponibles
- Option broderie poignet : +6 €
- Prénom, mot, initiale — toujours dire "brodé à ton prénom" ou "brodé selon tes envies"

### Délais & logistique
- Livraison sous 72h
- Fabriqué à Wattrelos, Nord de France
- Made in France — toujours mentionner

---

## 5. Piliers de contenu

### Process
Coulisses de fabrication, machine Tajima TMEZ, précision du point, savoir-faire technique.
> Montrer la machine, Adriana en production, les gros plans d'aiguilles, le fil.

### Émotion — 3 variantes
Lien affectif entre le produit et la personne qui offre ou reçoit.

| Variante  | Hook de référence                              | Contexte d'usage              |
|-----------|------------------------------------------------|-------------------------------|
| Lien      | "Pas un cadeau. Un lien. Pour toujours."       | Couple, famille, amis proches |
| Souvenir  | "Certains cadeaux deviennent des souvenirs."   | Naissance, diplôme, départ    |
| Présence  | "Même loin. Ta présence. Brodée."              | Distance, expatrié, deuil     |

### Produit
Catalogue, configurateur, personnalisation. Montrer le produit fini, le processus de commande, les variantes.

### Preuve
Social proof : avis clients, délais tenus, chiffres (150+ commandes). Reformuler les retours clients sans les citer mot pour mot.

---

## 6. Formats de contenu

### Post statique
- Ratio : 4:5 (portrait) ou 1:1 (carré)
- Structure : hook Josefin Sans bold + sous-titre italic + caption 80-100 mots + CTA
- Image : fond Cream, gros plan broderie, lumière naturelle

### Carrousel
- 6 slides minimum
- Slide 1 : hook accrocheur (stopper le scroll)
- Slides 2-5 : développement (une idée par slide, concis)
- Slide 6 : CTA + lien bio
- Fond cohérent sur toutes les slides : Cream ou Ink

### Reel / Vidéo
- Durée : 15-20 secondes
- Structure : [0-3s] hook overlay → [3-10s] plan produit/machine → [10-15s] révélation → [15-20s] CTA
- Musique : instrumental doux, pas de drop brutal, tempo modéré
- Texte overlay : Josefin Sans, couleur Cream sur fond Ink ou Terracotta sur Cream

---

## 7. Architecture du Content Studio

### Stack
- **React / JSX** — interface principale
- **Anthropic API** (`claude-sonnet-4-20250514`) — génération de texte structuré (JSON)
- **Pollinations.ai / Flux** — génération d'images (`image.pollinations.ai`)

### Fichiers
```
/
├── CLAUDE.md                        ← ce fichier
└── ypersoa-content-studio.jsx       ← outil React principal
```

### Fonctionnement
1. L'utilisateur sélectionne : Format (Post / Carrousel / Reel) + Pilier + Angle (si Émotion)
2. L'outil construit un prompt structuré avec les règles de marque intégrées
3. Appel API Anthropic → retour JSON strict (hook, caption, image_prompt, hashtags…)
4. Affichage du contenu + bouton "Générer l'image" → appel Pollinations/Flux
5. Copie caption + hashtags en un clic

### Champs JSON retournés par l'API

**Post**
```json
{
  "hook": "accroche 6 mots max",
  "subhook": "sous-titre 8 mots italic",
  "caption": "légende 80-100 mots",
  "image_prompt": "prompt Flux en anglais 60 mots",
  "cta": "appel à l'action court",
  "hashtags": ["5 hashtags sans #"]
}
```

**Carrousel**
```json
{
  "hook": "accroche slide 1",
  "slides": [{ "num": 1, "titre": "...", "texte": "..." }],
  "caption": "légende 60-80 mots",
  "image_prompt": "prompt Flux pour slide couverture",
  "hashtags": ["5 hashtags"]
}
```

**Reel**
```json
{
  "hook": "overlay hook",
  "script": [{ "timecode": "0-3s", "plan": "...", "overlay": "...", "voix": "..." }],
  "musique": "direction musicale",
  "caption": "légende 70-90 mots",
  "image_prompt": "prompt Flux pour vignette thumbnail",
  "hashtags": ["5 hashtags"]
}
```

---

## 8. Règles de génération d'images (Flux / Imagen)

### Toujours inclure
- Fond : cream linen texture / background `#F5F0EA`
- Matière : embroidery thread detail, fabric close-up
- Lumière : warm soft natural light, no harsh shadows
- Style : editorial product photography, minimal clean composition

### Ne jamais inclure
- Texte dans l'image (`no text, no watermark`)
- Visages identifiables
- Fonds noirs ou très sombres
- Effets digitaux, néons, renders 3D génériques

### Template de prompt
```
[description précise de la scène en anglais],
cream linen background, Tajima embroidery close-up detail,
warm soft natural light, terracotta thread, [couleur vêtement] garment,
minimal editorial fashion photography, no text, no watermark, photorealistic
```

---

## 9. Hashtags — règles

- Maximum 5 par post (qualité > quantité)
- Toujours en français sauf exception
- Catégories à couvrir : broderie/personnalisation + cadeau + made in france + niche produit + local/artisanat
- Exemples validés : `#broderiepersonnalisee` `#cadeauunique` `#madeinFrance` `#broderie` `#cadeauoriginal` `#prénombrodé` `#sweatpersonnalisé`
- Jamais : hashtags trop génériques (`#mode` `#fashion`), hashtags achetés ou spam

---

## 10. Lignes rouges — ce qu'on ne fait jamais

- ❌ "brodé à la main" — faux techniquement
- ❌ Comparer à d'autres boutiques Etsy ou marques de broderie
- ❌ Promettre des délais sans validation côté production (Adriana)
- ❌ Ton agressif ou urgentiste ("vite", "soldé", "dernier stock")
- ❌ Parler de "petit prix" ou se positionner sur le bas de gamme
- ❌ Utiliser "trace" comme mot émotionnel clé
- ❌ Emojis en excès dans les textes de marque (max 1-2 si vraiment nécessaire)
- ❌ Typographies script imitant l'écriture manuscrite dans les visuels

---

## 11. Équipe

| Personne | Rôle |
|----------|------|
| Sarah | Directrice créative, co-fondatrice |
| Adriana | Production, opératrice Tajima TMEZ |
| Maï | Communication, réseaux sociaux |

---

*Dernière mise à jour : avril 2026*
*Ce fichier fait autorité sur tout output IA lié à Ypersoa.*
