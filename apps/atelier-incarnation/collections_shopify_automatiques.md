# Collections Shopify automatiques à créer pour Ypersoa

Les collections ci-dessous se génèrent automatiquement grâce aux tags produits.
Dans Shopify : **Produits → Collections → Créer une collection** → **Type : automatique** → règle « Le tag est égal à `[handle]` ».

Chaque produit Shopify (1 par motif) doit porter **tous les tags** correspondant aux incarnations
qu'il propose. Exemple pour « T-Shirt Brodé — Le Club » qui couvre 7 incarnations actives :

```
motif-le-club, pour-maman, fete-des-meres, naissance, pour-papa, fete-des-peres,
pour-soeur, pour-amie, anniversaire, pour-famille, noel, pour-couple, saint-valentin,
pour-mariee, evjf, mariage, animaux, ete, voyage
```

---

## DESTINATAIRES — « Un cadeau pour »

| Handle collection | Titre affiché | Règle de tag |
|---|---|---|
| `pour-maman` | Pour Maman | tag = `pour-maman` |
| `pour-papa` | Pour Papa | tag = `pour-papa` |
| `pour-mamie` | Pour Mamie | tag = `pour-mamie` |
| `pour-papi` | Pour Papi | tag = `pour-papi` |
| `pour-soeur` | Pour Sœur | tag = `pour-soeur` |
| `pour-frere` | Pour Frère | tag = `pour-frere` |
| `pour-amie` | Pour BFF | tag = `pour-amie` |
| `pour-couple` | Pour le couple | tag = `pour-couple` |
| `pour-famille` | Pour la famille | tag = `pour-famille` |
| `pour-mariee` | Pour la mariée | tag = `pour-mariee` |
| `grands-parents` | Grands-parents | tag = `grands-parents` |
| `nounou-maitresse` | Merci nounou, maîtresse | tag = `nounou-maitresse` |

## OCCASIONS

| Handle collection | Titre affiché | Règle de tag |
|---|---|---|
| `fete-des-meres` | Fête des Mères | tag = `fete-des-meres` |
| `fete-des-peres` | Fête des Pères | tag = `fete-des-peres` |
| `naissance` | Naissance | tag = `naissance` |
| `anniversaire` | Anniversaire | tag = `anniversaire` |
| `saint-valentin` | Saint-Valentin | tag = `saint-valentin` |
| `evjf` | EVJF & Mariage | tag = `evjf` OU `mariage` |
| `noel` | Noël | tag = `noel` |

## MOTIFS

| Handle collection | Titre affiché | Règle de tag |
|---|---|---|
| `motif-le-club` | Le Club | tag = `motif-le-club` |
| `motif-la-signature` | La Signature | tag = `motif-la-signature` |
| `motif-la-florale` | La Florale | tag = `motif-la-florale` |
| `motif-l-annonce` | L'Annonce | tag = `motif-l-annonce` |
| *... etc pour les 17 motifs YPM-001 à YPM-017* | | |

## TONS / REGISTRES

| Handle collection | Titre affiché | Règle de tag |
|---|---|---|
| `tendre` | Tendre & sincère | tag = `ton-tendre` |
| `complice` | Complice & fun | tag = `ton-complice` |
| `humour` | Humour & second degré | tag = `ton-humour` |
| `affirme` | Affirmé & statement | tag = `ton-affirme` |

## THÉMATIQUES

| Handle collection | Titre affiché | Règle de tag |
|---|---|---|
| `animaux` | Pour les amoureux des animaux | tag = `animaux` |
| `ete` | Vibes d'été | tag = `ete` |

---

## Procédure d'installation

1. Dans **Shopify → Produits → Collections** : créer chaque collection ci-dessus en automatique.
2. Pour chaque produit (1 par motif), aller dans la fiche → section **Tags** → ajouter tous les tags des incarnations actives du motif.
3. Vérifier que les produits remontent bien dans les bonnes collections.
4. Ajouter le snippet `card_product_contextuel.liquid` dans le thème pour que les tuiles affichent la bonne photo selon la collection d'entrée.
5. Attacher le metafield `custom.incarnations` (JSON) à chaque produit pour activer la magie contextuelle.

## Architecture du menu site (cohérente)

```
Les Collections        → toutes les fiches produit
Les Broderies          → familles de motifs (Cœurs, Script, Aa Typo, Famille, Nouveautés, Les Best)
Un cadeau pour         → destinataires + occasions
  ├── Pour Maman, Pour Papa, Pour Mamie, Pour Papi, Pour Sœur, Pour BFF, Couple, Famille, Mariée
  └── Fête des Mères, Fête des Pères, Naissance, Anniversaire, EVJF, Noël, Saint-Valentin
L'humeur                → tons (Tendre, Complice, Humour, Affirmé)  ← optionnel V2
```
