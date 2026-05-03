# Idée — Documentation technique des motifs YPM

> Cadrée 2026-05-04 dans la session relance hub. Mise en pause : besoin de réflexion sur structure + intégration prod_hub.

## Besoin Sarah

Enrichir le référentiel `referentiels/motifs/motifs_ypm.json` avec une fiche technique broderie par motif :

- **Dimensions du motif** (taille brodée)
- **Typographies possibles** (fonts utilisables sur ce motif)
- **Nombre de couleurs possibles**

## Questions ouvertes à trancher avant de coder

### 1. Dimensions
- Un seul format (`"8 × 12 cm"`) ou plusieurs tailles proposables (cœur 6cm + sweat 12cm + tote bag 20cm) ?
- Unité : cm ou mm ?
- Si plusieurs tailles : faut-il associer chaque taille à un type de support (sweat / tee / tote / casquette) ?

### 2. Typographies
- Liste libre de strings (`["Cormorant", "Inter Bold"]`) ou référentiel typos canoniques séparé (`referentiels/typos_canoniques.json`) avec ID et propriétés (poids, hauteur min lisible, …) ?
- Lien éventuel avec un sous-module futur "Règles & contraintes broderie" (V2 SPEC §10 atelier-DA).

### 3. Nombre de couleurs
- Nombre fixe (`3`) — peu flexible
- Fourchette (`{ min: 1, max: 5 }`) — flexible mais flou
- Liste discrète (`[1, 2, 3]` = "marche en 1, 2 ou 3 couleurs") — explicite
- **Lien fort prod_hub** : le moteur attribution prod_hub utilise déjà des contraintes couleurs par motif (cf. `prod_hub/gammes/gammes_ypm_all.json`). Si on ajoute le champ ici, il doit rester cohérent avec les gammes prod ou être source de vérité unique.

### 4. Saisie
- Formulaire dans la modale atelier-DA (ergonomie Sarah) — coût UI ~1h
- Édition directe JSON (pragmatique court terme) — affichage seulement dans la modale
- Édition Streamlit (`prod_hub/pages/1_Cadrer_motifs.py` enrichie) — cohérent avec le workflow cadrage déjà en place

### 5. Usage aval
- **Doc visuelle pure** dans atelier-DA : info pour Sarah quand elle prépare un shooting/post
- **Input fiche technique prod** : envoyée à Adriana avec la commande (Phase 2 prod_hub webhook Shopify)
- **Contrainte génération** : si Gemini génère une image avec un texte trop long → croiser avec la typo + dimensions = warning "ce texte ne tiendra pas dans ce motif"

## Recommandation

Plutôt que de l'ajouter à chaud, l'inclure dans la prochaine itération du référentiel motifs en même temps que la **stabilisation Phase 1 prod_hub** (PR du 9 mai par l'agent `trig_01DryuVsiGFUqpjDbTMKQ3Zb`). L'agent travaille déjà sur les gammes — il peut lire les contraintes couleurs et proposer une structure cohérente qui ne duplique pas l'info entre `motifs_ypm.json` et `gammes_ypm_all.json`.

## Fichiers à toucher (estimation)

- `referentiels/motifs/motifs_ypm.json` : ajout des 3 champs sur les 17 motifs (saisie ~30 min)
- `apps/atelier-social/src/lib/atelier-da/referentiels-loader.ts` : extension de `MotifYpm`
- `apps/atelier-social/src/app/atelier-da/motifs/page.tsx` : section "Fiche technique" dans la modale
- (optionnel) `prod_hub/pages/1_Cadrer_motifs.py` : ajout des 3 champs en saisie Streamlit
- (optionnel) `referentiels/typos_canoniques.json` : nouveau référentiel si typos = liste fermée

## Effort total estimé
- Affichage seulement (édition JSON manuelle) : ~45 min
- Avec formulaire modale : ~2h
- Avec référentiel typos canoniques + intégration prod_hub : ~4h
