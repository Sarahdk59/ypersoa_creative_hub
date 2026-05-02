# prod_hub

Outil de production broderie multicolore Ypersoa. Convertit une commande client
en attribution couleur → lettre, génère la fiche technique pour la prod, et
définit les règles de non-qualité broderie.

L'objectif : qu'Adriana puisse traiter une commande multicolore sans avoir à
arbitrer manuellement quelle couleur va sur quelle lettre. Le moteur applique
les règles qualité Ypersoa, le DST sort cohérent, le résultat est reproductible.

---

## À quoi ça répond

Quand un client passe une commande Ypersoa multicolore (variante avec palette
imposée, ex. YPM-009 gamme chocolat), il choisit son texte (1 à 4 lignes, max
10 caractères par ligne) et la couleur du cœur. La gamme de fils est imposée
par la variante, pas par le client.

Aujourd'hui, il faut décider à la main : quelle couleur sur le M de "MAMAN" ?
Quelle couleur sur le A ? Faut-il éviter que la lettre du milieu soit la même
que celle juste au-dessus ? Le moteur fait ce choix automatiquement, en
respectant les règles dures (collisions interdites) et en optimisant les règles
molles (distribution, harmonie).

---

## Architecture

```
prod_hub/
├── README.md                           ← ce fichier
├── moteur_attribution/
│   ├── moteur_attribution.py           ← l'algo (backtracking + scoring)
│   ├── visualisation.py                ← rendu matplotlib pour preview
│   └── tests/                          ← PNG de référence pour validation visuelle
├── gammes/
│   └── gammes_ypm009.json              ← palettes par variante (à compléter)
└── fiches_techniques/                  ← générateur PDF Tajima (à venir)

../referentiels/
└── palette_fils_broderie_v2.json       ← 20 fils Gunold Poly 40 + codes + aiguilles
                                          (canonique Hub, partagé cross-app)
```

---

## Règles qualité broderie

### Règles dures (jamais violées par le moteur)

1. **Pas d'adjacence horizontale identique.** Deux lettres collées sur la même
   ligne ne peuvent pas avoir la même couleur.
2. **Pas de chevauchement vertical identique.** Deux lettres sur lignes
   adjacentes dont les positions x se chevauchent (écart < 1 largeur de lettre)
   ne peuvent pas avoir la même couleur. Ça gère les lignes de longueurs
   différentes : par exemple "DE" centré au-dessus de "GABIN", le D chevauche
   visuellement le A et le B, donc D ≠ A et D ≠ B.
3. **Pas de diagonale 3-de-suite identique.** Trois lettres en diagonale stricte
   (écart x ≈ 1) ne peuvent pas être toutes de la même couleur. Deux à la suite
   reste tolérable.

### Règles molles (scorées, le moteur cherche le meilleur compromis)

- **Distribution équilibrée** mesurée par l'entropie de Shannon. L'objectif :
  aucune couleur ne représente plus de 35 % des lettres.
- **Pas de couleur orpheline.** Si une couleur apparaît une seule fois alors
  qu'une autre apparaît 4 fois, c'est lu comme une erreur et pénalisé.
- **Pas de colonne d'attaque mono.** Les premières lettres de deux lignes
  consécutives ne devraient pas être de la même couleur (idem dernières lettres).

### Règle de cohérence cœur (à intégrer)

La couleur du cœur doit différer des deux couleurs majoritaires du texte. Si
elle se confond avec la couleur dominante, le cœur "se perd" visuellement.

---

## Démarrage rapide

```python
from moteur_attribution import attribuer, Couleur

# Définition de la palette
palette = {
    "sable":     Couleur("sable", "Sable", "#D4C4A8"),
    "taupe":     Couleur("taupe", "Taupe", "#8B6F5C"),
    "chocolat":  Couleur("chocolat", "Chocolat", "#5C3A28"),
    "ivoire":    Couleur("ivoire", "Ivoire", "#F5F0E0"),
}

# Texte client (1 à 4 lignes)
texte = ["MAMAN", "DE", "GABIN", "& LOU"]

# Attribution
resultat = attribuer(
    texte_lignes=texte,
    palette=list(palette.keys()),
    palette_id="chocolat",        # identifiant de la gamme
    n_candidats=100,              # nombre de candidats à scorer
)

# Inspection
print(f"Score : {resultat.score:.3f}")
print(f"Violations dures : {resultat.violations_dures}")
for idx, couleur_id in resultat.attribution.items():
    pos = resultat.positions[idx]
    print(f"L{pos.ligne} '{pos.caractere}' → {couleur_id}")

# Visualisation
from visualisation import render_resultat
render_resultat(resultat, palette, chemin_sortie="preview.png")
```

### Déterminisme

Le moteur est garanti déterministe : pour un même triplet `(texte_lignes,
palette, palette_id)`, le résultat est toujours identique. Le seed est dérivé
d'un hash SHA-256 du tuple. Conséquence pratique : un client qui repasse la
même commande obtient la même broderie. Et la pré-génération d'un cache pour
les textes courants ("MAMAN", "PAPA", etc.) est sûre.

---

## État actuel

### Ce qui marche

- Backtracking déterministe avec randomisation seedée
- Validation des 3 règles dures (adjacence, chevauchement vertical, diagonale)
- Géométrie centrée correcte (lignes de longueurs variables, espaces ignorés)
- Scoring molles (entropie + orphelin + colonne d'attaque)
- Visualisation matplotlib pour preview rapide
- Performance : ~150 ms pour 100 candidats sur un texte de 16 lettres

### Limites identifiées

- Le **contraste support / fil** n'est pas pris en compte. Sur un support
  cream, les fils ivoire deviennent quasi invisibles. Il faut brancher le
  champ `supports_incompatibles` du référentiel.
- Le référentiel `palette_fils_broderie_v2.json` contient encore des codes
  Gunold à valider visuellement avec le nuancier physique.
- Les **gammes par variante YPM-009** sont mock dans le proto. Il faut
  remplir `gammes/gammes_ypm009.json` avec les vraies palettes (chocolat,
  rose, bleu, etc.).
- La **règle de cohérence cœur** n'est pas implémentée.

### Roadmap

1. Stabiliser le référentiel fils (codes Gunold validés, mapping aiguilles)
2. Définir les gammes par variante YPM-009
3. Intégrer la contrainte support / fil
4. Ajouter la règle de cohérence cœur
5. Pré-génération d'un cache pour les textes courants
6. Générateur de fiche technique PDF (format Tajima)
7. Optimisation du séquençage DST pour minimiser les changements de couleur

---

## Lexique

- **DST** : format de fichier propriétaire Tajima qui contient la séquence des
  points et des changements d'aiguille. C'est ce que la machine lit.
- **Gunold Poly 40** : référence fil polyester 400 dtex utilisée comme standard
  Ypersoa. 20 couleurs officielles dans la palette.
- **TMEZ** : modèle de machine à broder Tajima. Ypersoa en a deux, chacune
  équipée de 15 aiguilles.
- **Aiguille canonique** : numéro de tête sur la TMEZ où un fil donné est chargé
  par défaut, défini dans le plan de cônage.
- **Gamme** : palette de fils prédéfinie pour une variante Shopify (ex. gamme
  chocolat = sable / taupe / chocolat / ivoire). Imposée par la variante, le
  client ne la modifie pas.
- **Variante** : déclinaison Shopify d'un même motif YPM avec une gamme couleur
  différente. Le client choisit la variante, pas les couleurs individuelles.
- **Position relative au centre (x_relatif)** : modélisation géométrique
  utilisée par le moteur pour gérer les lignes centrées de longueurs
  différentes. Une lettre à l'indice i d'une ligne de N caractères a une
  position x = i - (N-1)/2.

---

## Notes pour Adriana

Le moteur n'est pas encore branché sur Shopify. À terme, le flux sera :
commande Shopify → extraction du texte et de la variante → appel du moteur →
fiche technique PDF imprimable + DST optimisé. En attendant, tu peux tester
manuellement en lançant `python3 visualisation.py` depuis
`moteur_attribution/`, et adapter les exemples du `if __name__ == "__main__"`
avec un vrai texte client pour vérifier le rendu.

Si tu vois un cas où l'attribution générée ne te plaît pas visuellement,
note-le et partage avec Sarah : c'est un signal qu'une règle qualité manque
ou qu'un poids du scoring est mal calibré.
