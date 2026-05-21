# Schéma référentiel `commandes/`

Chaque commande Shopify est stockée comme `referentiels/commandes/{id}.json`.

## Source

Bon de préparation Shopify (PDF) → import manuel V1 / parser auto V2.

## Champs

| Champ | Type | Description |
|---|---|---|
| `id` | string | ID interne (= numéro Shopify sans `#`). |
| `numero_shopify` | string | Numéro Shopify avec `#`. |
| `date_commande` | YYYY-MM-DD | Date de passage commande. |
| `date_impression_bon` | YYYY-MM-DD | Date d'impression du bon de prép. |
| `statut` | enum | `a_planifier` \| `planifiee` \| `en_cours` \| `terminee` \| `expediee`. |
| `priorite` | enum | `normale` \| `urgente` (deadline serrée). |
| `expedition` | object | Adresse livraison (nom, adresse_ligne1, code_postal, ville, pays). |
| `facturation` | object | Adresse facturation (mêmes champs). |
| `articles` | array | Liste des articles à broder (cf. ci-dessous). |
| `planning` | object \| null | Allocation machines (cf. ci-dessous). Null si pas encore planifiée. |
| `duree_total_min` | number | Somme des `duree_total_article_min × quantite` — calculée. |
| `nb_changements_fil_total` | number | Pour info atelier. |
| `notes` | string | Notes libres Adriana / Sarah. |
| `created_at` | YYYY-MM-DD | |
| `updated_at` | YYYY-MM-DD | |

## Sous-objet `article`

| Champ | Type | Description |
|---|---|---|
| `id` | string | `art_{commande}_{ordre}`. |
| `sku` | string | SKU brut Shopify. |
| `produit_id` | string | Ex `YP005`. |
| `produit_nom` | string | Ex `Sweat Brodé`. |
| `motif_sku` | string | Code SKU motif (ex `CAL`). |
| `ypm_id` | string | Ex `YPM-006`. |
| `ypm_nom` | string | Ex `Le Câlin`. |
| `couleur_support` | string | Ex `beige`. |
| `taille` | string | Ex `XS`. |
| `quantite` | number | |
| `broderies` | array | Une entrée par zone (buste / poignet / dos / nuque). |
| `duree_setup_min` | number | |
| `duree_cq_min` | number | |
| `duree_total_article_min` | number | Somme. |

## Sous-objet `broderie`

| Champ | Type | Description |
|---|---|---|
| `placement` | enum | `buste` \| `poignet` \| `dos` \| `nuque`. |
| `champs` | array | Liste des champs personnalisés saisis par le client (label + valeur + type classifié). |
| `fil_id` | string | ID dans `palette_fils_broderie_v2.json`. |
| `fil_nom` | string | Nom français. |
| `fil_hex` | string | Hex pour preview. |
| `fil_code_gunold` | string | Code fournisseur. |
| `duree_broderie_min` | number | Somme des durées des champs. |
| `duree_cadrage_min` | number | Toujours 3 par zone. |
| `duree_changement_fil_min` | number | 2 si nouveau fil par rapport à la zone précédente, 0 sinon. |
| `duree_total_min` | number | Somme. |

## Sous-objet `planning`

| Champ | Type | Description |
|---|---|---|
| `mode` | enum | `auto` \| `manuel`. |
| `horizon_jours` | number | Par défaut 3. |
| `date_debut` | YYYY-MM-DD | Premier jour planifié. |
| `slots` | array | Tâches allouées (cf. ci-dessous). |
| `genere_le` | ISO8601 | Timestamp dernière génération auto. |

## Sous-objet `slot`

| Champ | Type | Description |
|---|---|---|
| `id` | string | UUID court. |
| `machine` | string | `TMEZ-1` \| `TMEZ-2`. |
| `jour` | YYYY-MM-DD | |
| `heure_debut` | HH:MM | |
| `heure_fin` | HH:MM | |
| `duree_min` | number | |
| `article_id` | string | Référence l'article (1 slot = 1 article complet). |
| `commande_id` | string | Référence la commande (utile pour vue multi-commandes). |
