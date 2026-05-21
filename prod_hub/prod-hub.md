# prod-hub — Atelier Production Ypersoa

Cadrage complet de l'outil interne de production broderie Ypersoa. Centralise
le catalogue de production figé, les modes opératoires, la queue de commandes,
le pilotage opérationnel et le moteur d'attribution multicolore.

L'objectif : qu'Adriana puisse faire tourner la prod en autonomie sur les 70 %
de commandes standard, et que Sarah ne soit sollicitée que sur seuils d'alerte
ou décisions stratégiques.

---

## Vision

Transformer la production Ypersoa d'une opération artisanale dépendante de
décisions au cas par cas en un **système industriel reproductible**, sans
sacrifier la qualité ni la flexibilité multicolore qui fait la singularité de
la marque.

Trois principes structurants :

1. **Standardisation maximale en V1.** Catalogue figé, placement unique buste
   8-10 cm, 10 fils canoniques fixés sur les aiguilles, palettes multicolores
   prédéfinies. Aucune variable de décision en production sauf exception
   documentée.
2. **Autonomie opérationnelle d'Adriana.** Toutes les décisions de production
   quotidiennes sont prises seule, dans le cadre d'un système qui les supporte.
   Sarah n'intervient que sur seuils d'alerte (stock, backlog, qualité).
3. **Traçabilité et amélioration continue.** Chaque commande produite laisse
   une trace exploitable (temps, défauts, choix multicolore). Le système
   s'affine en boucle fermée.

---

## Position dans l'écosystème Ypersoa Creative Hub

```
ypersoa-creative-hub/
├── apps/
│   ├── atelier-social/             ← génération contenu Instagram/Pinterest
│   ├── planable-ypersoa/           ← calendrier éditorial
│   └── atelier-production/         ← prod-hub (cette spec)
│
├── services/
│   └── prod_hub_engine/            ← moteur d'attribution Python (existant)
│       ├── moteur_attribution/
│       ├── visualisation/
│       ├── fiches_techniques/
│       └── api/                    ← FastAPI exposé pour atelier-production
│
└── referentiels/                   ← données partagées cross-app
    ├── motifs_ypm.json             ← 17 motifs + 80 variantes
    ├── palette_fils_broderie_v2.json  ← 33 fils Gunold Poly 40
    ├── palettes_associations.json  ← 13 palettes (camaïeux + multicolores)
    └── gammes_ypm009.json          ← gammes par variante
```

L'app `atelier-production` consomme les référentiels du Hub et appelle le
service `prod_hub_engine` via API pour toute opération multicolore.

---

## Architecture des modules

Neuf modules, organisés en trois couches :

**Couche référentielle (données figées)**
- Module 1 — Catalogue V1 figé
- Module 2 — Modes opératoires (SOPs)

**Couche opérationnelle (flux quotidien)**
- Module 3 — Queue de production
- Module 4 — Fiches techniques par commande
- Module 5 — Stock fils & approvisionnement
- Module 6 — Contrôle qualité

**Couche pilotage & moteur**
- Module 7 — Tableau de bord opérationnel
- Module 8 — Moteur d'attribution multicolore (intégration prod_hub_engine)
- Module 9 — Capsule grands motifs (dormant V1, activable phase 2)

---

## Module 1 — Catalogue V1 figé

### Objectif

Source unique de vérité de ce qui est produit en V1. Vue read-only pour
Adriana. Toute commande qui sort de ce catalogue ne peut pas être traitée
sans validation Sarah.

### Périmètre

- **14 motifs actifs** : les 17 motifs YPM moins les 3 grands motifs >9 cm
  (qui passent en module 9, dormant).
- **Placement unique** : buste centré, hauteur 8-10 cm.
- **18 palettes autorisées** : 10 palettes monochromes canoniques (camaïeux)
  + 7-8 palettes multicolores prédéfinies.
- **Cadre standardisé** : un seul format de cadre pour 100 % de la prod V1.

### Données affichées

Pour chaque motif :
- Code YPM (YPM-001 à YPM-017)
- Nom commercial (La Brigitte, L'Ambre, Le Club, etc.)
- Image de référence (rendu broderie sur support neutre)
- Dimensions broderie (largeur × hauteur en cm)
- Nombre de points (info technique Tajima)
- Temps de broderie estimé (min)
- Fichier DST source (lien)
- Status : *actif V1 / capsule future / archivé*
- Palettes compatibles (liens vers Module 8)
- Supports textiles compatibles
- Date de validation Sarah + Adriana

### Fonctionnalités

- Recherche / filtre par nom, code, palette, statut
- Vue détail d'un motif avec aperçu visuel
- Bouton "Utiliser pour une commande" → crée une entrée dans la queue
- Bouton "Demander une exception" → notifie Sarah pour cas hors V1
- Export PDF du catalogue (pour affichage atelier)

### Dépendances

- Référentiel partagé `motifs_ypm.json`
- Module 8 pour les palettes compatibles

---

## Module 2 — Modes opératoires (SOPs)

### Objectif

Documentation gestuelle et procédurale de chaque étape de production. Format
dual : web (consultation tablette atelier) + PDF imprimé plastifié à côté de
chaque machine.

### Liste des 10 SOPs à rédiger

| ID | Titre | Priorité | Auteur principal |
|---|---|---|---|
| MO-001 | Setup machine quotidien | Sprint 2 | Adriana |
| MO-002 | Préparation commande / hooping | Sprint 2 | Adriana |
| MO-003 | Lancement broderie | Sprint 2 | Adriana |
| MO-004 | Surveillance en cours de broderie | Sprint 2 | Adriana |
| MO-005 | Finition pièce | Sprint 2 | Adriana |
| MO-006 | Conditionnement & expédition | Sprint 4 | Sarah + Adriana |
| MO-007 | Changement de fil (5 aiguilles rotation) | Sprint 4 | Adriana |
| MO-008 | Maintenance préventive hebdomadaire | Sprint 4 | Adriana |
| MO-009 | Maintenance préventive mensuelle | Sprint 4 | Adriana |
| MO-010 | Gestion défaut & rebroderie | Sprint 4 | Adriana |

### Template de SOP

Chaque SOP suit la structure suivante :

```
# MO-XXX — Titre

**Version** : 1.0
**Dernière mise à jour** : YYYY-MM-DD
**Auteur** : Adriana / Sarah
**Fréquence d'application** : quotidienne / par commande / hebdo / mensuelle

## Objectif
Phrase courte : à quoi sert cette procédure.

## Prérequis
- Liste des prérequis matériels, machine, fichiers, etc.

## Étapes

### Étape 1 — Nom de l'étape
1. Action concrète
2. Action concrète
3. ⚠️ Point de vigilance

[photo ou vidéo courte intégrée]

### Étape 2 — ...

## Critères de réussite
- ✅ Critère objectif 1 (mesurable)
- ✅ Critère objectif 2
- ❌ Cas de non-conformité

## En cas de problème
Si X → faire Y. Si Z → notifier Sarah.

## Changelog
- v1.0 — Création (YYYY-MM-DD)
- v1.1 — Ajout du point de vigilance sur l'étape 3 (YYYY-MM-DD)
```

### Fonctionnalités

- Affichage web responsive (tablette-first)
- Recherche full-text sur les SOPs
- Marquage "appliqué aujourd'hui" pour les SOPs quotidiennes (MO-001, MO-008)
- Export PDF par SOP pour impression atelier
- Versioning : chaque modification crée une nouvelle version, ancien historique conservé
- Médias intégrés : photos et vidéos courtes (10-30s) hébergées Supabase Storage

### Contenu détaillé des SOPs critiques

**MO-001 — Setup machine quotidien**
- Allumage TMEZ (séquence et durée du warm-up)
- Check visuel des 10 fils canoniques en place (check-list)
- Vérification tension fils (référence par couleur si applicable)
- Test sur chute textile (échantillon tampon 5×5 cm)
- Calibration cadre buste (gabarit physique de référence)
- Validation : voyant vert sur les deux machines

**MO-002 — Préparation commande / hooping**
- Lecture fiche de prod (générée par Module 4)
- Préparation textile (taille commandée, type sweat/t-shirt)
- Sélection entoilage selon type textile :
  - Sweat épais → tearaway 80 g/m²
  - T-shirt léger → cutaway 50 g/m²
  - Maille technique → polysoluble
- Technique de hooping centré buste (gabarit physique 8-10 cm)
- Contrôle tension cadre (test du tambourin : son clair)
- Validation alignement vs gabarit

**MO-003 — Lancement broderie**
- Chargement du fichier DST sur la TMEZ via USB ou réseau
- Vérification séquence couleurs vs palette commande (Module 4)
- Positionnement origin point
- Test à vide sur 1 cm (machine en mode tracé)
- Lancement et observation des 30 premières secondes
- ⚠️ Point de vigilance : tension fil sur les 5 premiers points

**MO-004 — Surveillance en cours**
- Fréquence de check : toutes les 5 minutes
- Surveillance des cassures fil (capteur Tajima + visuel)
- Procédure d'intervention sur cassure :
  1. Stop machine
  2. Identifier le fil cassé
  3. Re-thread complet (chemin TMEZ documenté)
  4. Reprise au point grâce à la fonction recovery TMEZ
- Surveillance tension dynamique
- Intervention sur fronces ou défaut visible

**MO-005 — Finition pièce**
- Retrait du cadre (technique pour ne pas marquer le textile)
- Coupe des fils flottants au ciseau courbe
- Retrait entoilage (tear pour tearaway, cut au ras pour cutaway)
- Repassage si nécessaire :
  - Sweat coton → 150°C avec pattemouille
  - T-shirt → 130°C envers
- Contrôle qualité final vs photo de référence du motif (Module 6)

---

## Module 3 — Queue de production

### Objectif

Orchestrer le flux de commandes en mode "batching par colorway" plutôt qu'en
FIFO. Adriana prend "le prochain batch" à traiter, sans décision de
priorisation.

### Logique de tri

Les commandes entrantes sont automatiquement triées selon l'algorithme suivant :

1. **Échéance critique d'abord** (lead time client - 1 jour) : tout ce qui
   doit absolument partir aujourd'hui ou demain remonte en haut.
2. **Puis batching par palette** : les commandes restantes sont groupées par
   palette pour minimiser les changements de fil sur la rotation 5 aiguilles.
3. **Au sein d'une palette, FIFO par date de commande.**

### Statuts

```
nouvelle → à hooper → en broderie → finition → contrôle → prête expédition → expédiée
                                       ↓
                                  défaut → rebroderie (retour à "à hooper")
```

### Données par commande

- ID commande Shopify (saisi manuellement en V1, automatique en phase 2)
- Date de commande
- Échéance d'expédition (calculée selon lead time = 10j, ou 15j pour Noël)
- Motif (YPM-XXX) + variante
- Texte personnalisé (1 à 4 lignes)
- Palette choisie (canonique ou multicolore)
- Couleur cœur le cas échéant
- Support textile (référence + taille)
- Machine affectée (1 ou 2)
- Statut actuel + horodatage du dernier changement
- Lien vers fiche technique (Module 4)
- Lien vers attribution multicolore le cas échéant (Module 8)

### Vues

**Vue Adriana (tablette atelier)**
- Liste prioritaire : prochaine commande à traiter en gros
- Bouton "Démarrer" qui passe au statut suivant
- Bouton "Signaler défaut" qui ouvre Module 6
- Vue par machine (1 et 2) pour suivi visuel

**Vue Sarah (desktop)**
- Liste complète avec filtres (statut, échéance, motif, palette)
- Édition possible (correction texte client, palette, etc.)
- **Saisie manuelle d'une commande** (méthode principale en V1, depuis l'interface admin de Shopify ou la notification email de commande)
- Création manuelle d'une commande interne (samples, refonte)

### Fonctionnalités

- Saisie manuelle des commandes en V1 (formulaire dédié optimisé pour rapidité de saisie)
- Recalcul automatique du tri à chaque nouvelle commande
- Notification mobile Adriana quand le backlog dépasse 5 jours
- Export CSV pour analyse mensuelle

### Dépendances

- Module 4 (fiche technique)
- Module 8 (moteur d'attribution multicolore)

> **Phase 2** : automatisation de l'entrée des commandes via connexion directe entre la base Shopify et l'atelier production (voir section "Ouvertures phase 2").

---

## Module 4 — Fiches techniques par commande

### Objectif

Générer une fiche imprimable A4 par commande, contenant toutes les
informations nécessaires à Adriana pour produire sans questions. Une commande =
une fiche = une pièce.

### Contenu d'une fiche technique

**En-tête**
- N° commande Shopify
- Date d'échéance (en gros)
- Code-barres ou QR code (scan pour passer au statut suivant)

**Bloc produit**
- Motif YPM-XXX avec mini-aperçu visuel
- Variante (nom commercial)
- Support : type textile + taille
- Référence d'emplacement du textile dans le stock atelier

**Bloc broderie**
- Texte personnalisé (police d'affichage en grand)
- Palette : liste des fils Gunold à utiliser avec codes + n° d'aiguille
- Couleur cœur le cas échéant
- Pour les multicolores : tableau d'attribution lettre → couleur (généré par Module 8)
- Aperçu visuel du rendu attendu

**Bloc machine**
- Machine affectée (1 ou 2)
- Fichier DST à charger (nom et chemin)
- Temps de broderie estimé
- Cadre à utiliser (un seul en V1)
- Entoilage recommandé (selon textile)

**Bloc qualité**
- Critères de validation visuelle (liste à cocher)
- Photo de référence du motif fini
- Case "défaut détecté" avec champ libre

**Pied de page**
- Préparé par : Adriana
- Date / heure de démarrage
- Date / heure de finition
- Signature finale après contrôle qualité

### Génération

Côté backend : appel au service `prod_hub_engine` qui retourne :
- Le JSON d'attribution (pour multicolores)
- Le PDF de la fiche technique
- Le DST optimisé (séquençage couleurs minimisé)

### Fonctionnalités

- Génération à la demande depuis Module 3 (bouton "Imprimer fiche")
- Génération automatique en batch tous les matins pour les commandes du jour
- Archivage : toutes les fiches générées sont conservées 12 mois minimum
- Re-génération possible si modification commande

---

## Module 5 — Stock fils & approvisionnement

### Objectif

Garantir zéro rupture sur les 10 fils canoniques. Anticiper les commandes
Gunold. Suivre le stock global des 33 fils du référentiel.

### Données suivies

Pour chaque fil :
- Code Gunold canonique
- Nom commercial Ypersoa (si applicable)
- Status : *canonique fixé* / *rotation* / *archive*
- Stock actuel en cônes
- Stock de sécurité (3 cônes pour canoniques, 1 cône pour rotation)
- Consommation moyenne mensuelle (calculée sur 3 derniers mois)
- Dernière commande Gunold (date + quantité)
- Lead time fournisseur Gunold (en jours)

### Logique d'alerte

**Seuil critique canonique**
- Stock < 3 cônes → alerte SMS / email à Sarah
- Email pré-rédigé pour Gunold prêt à envoyer (avec quantité recommandée)

**Seuil bas rotation**
- Stock < 1 cône → alerte dashboard (pas d'urgence absolue)

**Anomalie consommation**
- Consommation +50 % vs moyenne sur 7 jours → alerte (analyse de cause)

### Fonctionnalités

- Décrément automatique du stock à chaque commande produite (basé sur estimation
  des cônes consommés par broderie)
- Saisie manuelle d'une réception Gunold (mise à jour stock)
- Historique des commandes Gunold (date, quantité, prix unitaire)
- Calcul de la valeur du stock total (€)
- Export CSV mensuel pour comptabilité Phenix

### Dépendances

- Référentiel `palette_fils_broderie_v2.json`
- Module 3 (consommation par commande produite)

---

## Module 6 — Contrôle qualité

### Objectif

Établir des critères objectifs de qualité, tracer les défauts pour analyse de
causes racines, alimenter l'amélioration continue.

### Bibliothèque de référence

Pour chaque motif YPM, une fiche qualité contient :
- Photo de référence "rendu parfait"
- Photos de défauts courants typés (avec verdict : sauvable / rebut)
- Critères mesurables :
  - Alignement axe central : tolérance ±2 mm
  - Densité broderie : pas de support visible à travers les points
  - Tension : pas de fronces > 1 mm
  - Fils flottants : 0 fil flottant > 2 mm visible
  - Propreté : pas de fil errant, pas de tache d'entoilage

### Workflow de signalement

Quand Adriana détecte un défaut :
1. Photographie le défaut depuis l'app (caméra tablette)
2. Sélectionne la typologie de défaut (liste prédéfinie + champ libre)
3. Indique si sauvable (rebroderie) ou rebut
4. Le système crée une entrée dans le log qualité
5. La commande retourne au statut "à hooper" si rebroderie, ou "rebut" si perte

### Typologies de défauts (à enrichir au fil du temps)

- Cassure fil non récupérée
- Désalignement broderie / textile
- Fronces (tension cadre incorrecte)
- Fils flottants non coupés
- Mauvaise palette utilisée
- Mauvais texte brodé (erreur de fiche)
- Tache textile (avant broderie non détectée)
- Tache entoilage (résidu colle)
- Mauvais centrage
- Densité insuffisante (transparence support)
- Brûlure repassage

### Analyse périodique

Vue mensuelle automatisée :
- Taux de défaut global (% pièces avec défaut détecté)
- Taux de rebut (% pièces perdues)
- Top 3 typologies de défauts
- Top 3 motifs problématiques
- Évolution mois par mois

Cette vue alimente le point hebdo Sarah + Adriana.

### Dépendances

- Module 3 (commande concernée)
- Supabase Storage (photos défauts)

---

## Module 7 — Tableau de bord opérationnel

### Objectif

Vue de pilotage temps réel pour Sarah. Indicateurs de seuil, pas de pilotage
quotidien. Si tout est vert, Sarah ne regarde pas. Si une alerte saute, elle
intervient.

### Indicateurs principaux

**Capacité**
- Pièces produites aujourd'hui / semaine / mois
- Capacité utilisée % (par rapport à 25 pièces/jour/machine cible)
- Évolution sur 30 jours

**Backlog**
- Nombre de commandes en attente
- Backlog en jours (basé sur capacité)
- Commandes en retard d'échéance

**Qualité**
- Taux de défaut 7 derniers jours
- Taux de rebut 7 derniers jours
- Comparaison vs mois précédent

**Stock**
- Statut des 10 canoniques (vert / orange / rouge)
- Prochaine commande Gunold prévue
- Valeur stock total

**Machines**
- Heures de marche aujourd'hui (machine 1 / machine 2)
- Dernière maintenance hebdo
- Dernière maintenance mensuelle

### Système d'alertes

Quatre niveaux :
- 🟢 **Vert** : tout OK, aucune action requise
- 🟡 **Orange** : surveillance, info Sarah par email synthèse hebdo
- 🟠 **Attention** : action sous 48h, notification dashboard
- 🔴 **Critique** : action immédiate, SMS Sarah

Seuils déclencheurs (Niveau Critique) :
- Stock canonique < 3 cônes
- Backlog > 5 jours
- Taux défaut > 5 % sur 7 jours
- Panne machine ou maintenance manquée

### Fonctionnalités

- Vue desktop principale (Sarah)
- Vue mobile résumée
- Export PDF rapport hebdo automatique chaque lundi matin
- Drill-down possible sur chaque indicateur (vers le module source)

---

## Module 8 — Moteur d'attribution multicolore

### Objectif

Intégrer le service Python `prod_hub_engine` existant comme module à part
entière de l'app `atelier-production`. Toute commande multicolore appelle ce
moteur pour générer une attribution couleur → lettre cohérente et reproductible.

### Architecture d'intégration

```
Next.js (atelier-production)
        │
        │ POST /api/attribution
        │ { texte, palette_id, motif_id }
        │
        ▼
FastAPI service (prod_hub_engine)
        │
        ├── moteur_attribution → calcul backtracking + scoring
        ├── visualisation → preview PNG
        └── fiches_techniques → PDF Tajima
        │
        ▼
Retour :
{
  attribution: { ... },
  score: 0.87,
  preview_url: "...",
  fiche_pdf_url: "...",
  dst_optimisé_url: "..."
}
```

### Périmètre fonctionnel

Reprend les fonctionnalités du `prod_hub_engine` existant et ajoute :

**Existant (déjà codé)**
- Backtracking déterministe seedé SHA-256
- 3 règles dures (adjacence horizontale, chevauchement vertical, diagonale)
- Scoring molles (entropie, orphelin, colonne d'attaque)
- Visualisation matplotlib preview
- Géométrie centrée multi-lignes

**À ajouter / compléter**
- Règle de cohérence cœur (couleur cœur ≠ 2 couleurs majoritaires texte)
- Contrainte support / fil (champ `supports_incompatibles` du référentiel)
- Optimisation séquençage DST (minimiser changements de couleur)
- Génération PDF fiche technique Tajima
- Cache pré-généré pour textes courants ("MAMAN", "PAPA", "MAMIE", etc.)
- API REST FastAPI exposée pour l'app Next.js
- Endpoint `/preview` pour aperçu temps réel pendant la saisie commande

### Endpoints API

```
POST /api/attribution
  Input : { texte_lignes, palette_id, motif_id, n_candidats? }
  Output : { attribution, score, violations_dures, preview_url }

GET /api/preview/:attribution_id.png
  Retourne l'image preview matplotlib

POST /api/fiche-technique
  Input : { commande_id, attribution_id }
  Output : { fiche_pdf_url, dst_optimisé_url }

GET /api/gammes
  Retourne la liste des palettes disponibles par motif

POST /api/cache/precharge
  Action admin : pré-génère le cache pour les textes courants
```

### Déploiement

Service Docker autonome, déployé sur Fly.io ou Railway. Communication HTTPS
avec l'app Next.js. Variables d'environnement pour les credentials Supabase
(lecture référentiels).

### Dépendances

- Référentiel `palette_fils_broderie_v2.json` (33 fils Gunold)
- Référentiel `gammes_ypm009.json` et autres gammes par variante
- Référentiel `palettes_associations.json` (13 palettes canoniques)
- Supabase Storage (stockage previews et fiches PDF)

### Roadmap d'intégration

1. **Sprint 2** : exposer le moteur existant en API FastAPI minimale
   (endpoints `/attribution` et `/preview`)
2. **Sprint 3** : intégration depuis l'app Next.js (appel API depuis Module 4)
3. **Sprint 4** : ajout des règles manquantes (cohérence cœur, contrainte
   support)
4. **Sprint 5** : génération PDF fiche technique
5. **Sprint 6** : cache pré-généré et optimisation DST

---

## Module 9 — Capsule grands motifs (dormant V1)

### Objectif

Pipeline séparé pour les 3 motifs >9 cm mis en sourdine en V1. Activable en
phase 2 pour la première capsule édition limitée.

### Configuration phase 2

- Volume capsule : 50 pièces maximum
- Lead time affiché : 10 jours ouvrés
- Prix premium : +30 à 40 % vs buste standard
- Shooting dédié (référentiel Shooting Book ambiance Loft Organique)
- Communication événementielle (Module Planable Ypersoa)

### Pipeline production

- Une machine dédiée pendant la durée de la capsule (option 2 de la stratégie)
- Cadre spécifique grand motif
- DST validés à part avec densité ajustée
- Contrôle qualité renforcé (taux défaut accepté < 2 %)
- Fiches techniques marquées "Capsule édition limitée"

### Données spécifiques

- Date d'ouverture commandes capsule
- Date de fermeture commandes capsule
- Volume vendu / volume disponible
- Take rate (% atteint vs objectif)
- Décision post-capsule : pérenniser / itérer / abandonner

### Activation

Module désactivé par défaut. Activation par flag Supabase quand Sarah décide
de lancer une capsule. Réintroduction permanente possible si la première
capsule performe > 10 % du CA sur 6 semaines.

---

## Modèle de données Supabase

### Tables principales

```sql
-- Catalogue de production V1
CREATE TABLE motifs_v1 (
  id UUID PRIMARY KEY,
  code_ypm VARCHAR(10) NOT NULL UNIQUE,
  nom_commercial VARCHAR(50) NOT NULL,
  dimensions_largeur_cm DECIMAL(4,1),
  dimensions_hauteur_cm DECIMAL(4,1),
  nombre_points INT,
  temps_broderie_estime_min INT,
  dst_url TEXT,
  image_reference_url TEXT,
  status VARCHAR(20) DEFAULT 'actif_v1',  -- actif_v1 / capsule_future / archive
  date_validation_v1 TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Palettes disponibles
CREATE TABLE palettes (
  id UUID PRIMARY KEY,
  code VARCHAR(20) NOT NULL UNIQUE,
  nom_commercial VARCHAR(50),
  type VARCHAR(20),  -- canonique / multicolore
  fils JSONB NOT NULL,  -- [{ gunold_code, aiguille, role }]
  is_v1_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Lien motifs / palettes compatibles
CREATE TABLE motifs_palettes (
  motif_id UUID REFERENCES motifs_v1,
  palette_id UUID REFERENCES palettes,
  PRIMARY KEY (motif_id, palette_id)
);

-- SOPs
CREATE TABLE sops (
  id UUID PRIMARY KEY,
  code VARCHAR(10) NOT NULL UNIQUE,  -- MO-001, MO-002, ...
  titre VARCHAR(100),
  contenu_markdown TEXT,
  version VARCHAR(10) DEFAULT '1.0',
  frequence VARCHAR(20),  -- quotidienne / par_commande / hebdo / mensuelle
  auteur VARCHAR(50),
  derniere_maj TIMESTAMP DEFAULT NOW(),
  pdf_url TEXT,
  is_active BOOLEAN DEFAULT true
);

CREATE TABLE sops_medias (
  id UUID PRIMARY KEY,
  sop_id UUID REFERENCES sops,
  type VARCHAR(20),  -- photo / video
  url TEXT,
  legende TEXT,
  ordre INT
);

CREATE TABLE sops_versions (
  id UUID PRIMARY KEY,
  sop_id UUID REFERENCES sops,
  version VARCHAR(10),
  contenu_markdown TEXT,
  changelog TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Queue de production
CREATE TABLE commandes (
  id UUID PRIMARY KEY,
  shopify_order_id VARCHAR(50) UNIQUE,
  date_commande TIMESTAMP,
  echeance_expedition DATE,
  motif_id UUID REFERENCES motifs_v1,
  texte_personnalise JSONB,  -- [{ ligne: 1, contenu: "MAMAN" }, ...]
  palette_id UUID REFERENCES palettes,
  couleur_coeur VARCHAR(20),
  support_type VARCHAR(30),
  support_taille VARCHAR(10),
  machine_affectee INT,  -- 1 ou 2
  status VARCHAR(30) DEFAULT 'nouvelle',
  attribution_id UUID,  -- si multicolore, lien vers attribution
  fiche_technique_url TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE commandes_evenements (
  id UUID PRIMARY KEY,
  commande_id UUID REFERENCES commandes,
  type VARCHAR(30),  -- changement_statut / signalement_defaut / ...
  ancien_statut VARCHAR(30),
  nouveau_statut VARCHAR(30),
  acteur VARCHAR(50),  -- adriana / sarah / système
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Stock fils
CREATE TABLE stock_fils (
  id UUID PRIMARY KEY,
  gunold_code VARCHAR(20) UNIQUE,
  nom_commercial VARCHAR(50),
  status VARCHAR(20),  -- canonique / rotation / archive
  aiguille_canonique INT,
  stock_cones INT DEFAULT 0,
  stock_securite INT DEFAULT 1,
  consommation_moyenne_mensuelle DECIMAL(5,2),
  derniere_commande_gunold TIMESTAMP,
  lead_time_jours INT DEFAULT 7
);

CREATE TABLE stock_mouvements (
  id UUID PRIMARY KEY,
  fil_id UUID REFERENCES stock_fils,
  type VARCHAR(20),  -- reception / consommation / ajustement
  quantite INT,
  commande_id UUID REFERENCES commandes,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Contrôle qualité
CREATE TABLE defauts (
  id UUID PRIMARY KEY,
  commande_id UUID REFERENCES commandes,
  typologie VARCHAR(50),
  description TEXT,
  photo_url TEXT,
  decision VARCHAR(20),  -- rebroderie / rebut
  acteur VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE qualite_references (
  id UUID PRIMARY KEY,
  motif_id UUID REFERENCES motifs_v1,
  type VARCHAR(20),  -- ok / nok
  photo_url TEXT,
  legende TEXT,
  ordre INT
);

-- Attributions multicolores (cache)
CREATE TABLE attributions (
  id UUID PRIMARY KEY,
  hash_input VARCHAR(64) UNIQUE,  -- SHA-256 de (texte + palette_id + motif_id)
  texte_lignes JSONB,
  palette_id UUID REFERENCES palettes,
  motif_id UUID REFERENCES motifs_v1,
  attribution_json JSONB,
  score DECIMAL(4,3),
  preview_url TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Index recommandés

```sql
CREATE INDEX idx_commandes_status ON commandes(status);
CREATE INDEX idx_commandes_echeance ON commandes(echeance_expedition);
CREATE INDEX idx_commandes_palette ON commandes(palette_id);
CREATE INDEX idx_stock_fils_status ON stock_fils(status);
CREATE INDEX idx_attributions_hash ON attributions(hash_input);
```

---

## Stack technique recommandé

### Frontend (atelier-production)
- **Next.js 15** (App Router) — cohérent avec `planable-ypersoa`
- **Tailwind CSS** — design system Ypersoa (Cream, Ink, Terracotta)
- **shadcn/ui** — composants accessibles
- **TanStack Query** — fetching et cache côté client
- **React Hook Form + Zod** — gestion des formulaires (édition commandes)

### Backend (services partagés)
- **Supabase** — base de données, auth, storage, edge functions
- **prod_hub_engine** — service Python FastAPI containerisé (Docker)
  - Déploiement : Fly.io ou Railway
  - Communication : HTTPS REST

### Intégrations externes (V1)
- **Gunold** — email pré-rédigé (pas d'API publique)
- **Tajima TMEZ** — fichiers DST déposés sur dossier réseau atelier (USB ou
  partage SMB)

### Intégrations phase 2
- **Shopify** — connexion directe entre la base de commandes Shopify et l'atelier production (entrée automatique des commandes dans la queue)

### Outils support
- **Vercel** — déploiement Next.js
- **GitHub Actions** — CI/CD
- **Sentry** — monitoring erreurs
- **PostHog** — analytics usage interne

---

## Roadmap par sprints

### Sprint 1 — Verrouillage (semaine 1)
- ✅ Décision : catalogue V1 fermé à 14 motifs, placement buste 8-10 cm, 18 palettes
- ✅ Choix des 10 fils canoniques (basé sur mix CA Etsy + projections)
- ✅ Commande de stock de sécurité Gunold (3 cônes minimum par canonique)
- ✅ Setup repo `atelier-production` dans le monorepo Hub
- ✅ Schéma Supabase initial déployé

### Sprint 2 — Référentiel et SOPs critiques (semaine 2)
- Module 1 (Catalogue V1) UI minimale, lecture du référentiel
- Module 2 squelette + rédaction MO-001 à MO-005 (les 5 critiques)
- Module 5 (Stock fils) avec saisie manuelle initiale
- Session tournage vidéos courtes avec Adriana (1 demi-journée)
- prod_hub_engine exposé en API FastAPI (endpoints `/attribution` et `/preview`)

### Sprint 3 — Flux production (semaine 3)
- Module 3 (Queue de production) avec saisie manuelle des commandes
- Module 4 (Fiches techniques) génération PDF basique
- Module 8 connecté à Module 4 (multicolores OK)
- Test à blanc : 1 semaine de production avec le système

### Sprint 4 — Qualité et complétion (semaine 4)
- Module 6 (Contrôle qualité) avec photos de référence
- MO-006 à MO-010 rédigés
- Module 7 (Dashboard) version minimale avec alertes critiques

### Sprint 5 — Affinage et règles avancées (semaine 5-6)
- Module 8 : ajout règle cohérence cœur, contrainte support
- Module 7 : reporting hebdo automatique
- Module 8 : génération PDF fiche technique enrichie
- Module 8 : cache pré-généré pour textes courants

### Sprint 6 — Polish et optimisation (semaine 7-8)
- Optimisation séquençage DST
- UX tablette atelier : adaptations selon retours Adriana
- Tests de charge sur queue (simulation pic acquisition)
- Documentation utilisateur finale

### Phase 2 — Activation capsule (mois 4-6)
- Module 9 activé
- Première capsule grands motifs lancée
- Mesure take rate et décision pérennisation

---

## Critères de succès

### Court terme (3 mois après lancement)

**Autonomie opérationnelle**
- < 5 sollicitations Sarah / semaine par Adriana sur sujets prod
- 100 % des commandes V1 traitées sans exception
- 0 rupture de stock canonique

**Productivité**
- 25 pièces/jour/machine en moyenne (cible)
- Backlog moyen < 3 jours

**Qualité**
- Taux de défaut < 3 %
- Taux de rebut < 1 %

### Moyen terme (6 mois après lancement)

**Scaling**
- 30 pièces/jour/machine atteint (via batching et pré-staging)
- Capacité utilisée 70-80 % du plafond

**Capsule**
- Première capsule grands motifs lancée et mesurée
- Décision pérennisation prise sur données

**Système**
- Tous les modules opérationnels
- SOPs versionnées et améliorées en boucle (v1.x)

---

## Lexique technique

- **DST** : format de fichier propriétaire Tajima qui contient la séquence des
  points et des changements d'aiguille. C'est ce que la machine lit.
- **Gunold Poly 40** : référence fil polyester 400 dtex utilisée comme standard
  Ypersoa. 20 couleurs officielles dans la palette principale, 33 au total
  dans le référentiel étendu.
- **TMEZ** : modèle de machine à broder Tajima. Ypersoa en a deux, chacune
  équipée de 15 aiguilles.
- **Aiguille canonique** : numéro de tête sur la TMEZ où un fil donné est chargé
  par défaut, défini dans le plan de cônage. En V1, 10 aiguilles sont canoniques
  fixes (les fils des 70 % de commandes standard), 5 aiguilles sont en
  rotation pour les palettes multicolores.
- **Gamme** : palette de fils prédéfinie pour une variante Shopify (ex. gamme
  chocolat = sable / taupe / chocolat / ivoire). Imposée par la variante, le
  client ne la modifie pas.
- **Variante** : déclinaison Shopify d'un même motif YPM avec une gamme couleur
  différente. Le client choisit la variante, pas les couleurs individuelles.
- **Hooping** : opération de tendre le textile dans le cadre avant broderie.
  Étape critique : 30-40 % du temps de cycle hors machine.
- **Entoilage** : support technique placé sous le textile pour stabiliser la
  broderie. Tearaway (arrachable), cutaway (à découper), polysoluble (soluble
  à l'eau) selon le type de support.
- **Backtracking** : algorithme du moteur d'attribution qui explore les
  solutions en arrière-marche quand une contrainte est violée.
- **Batching colorway** : pratique de grouper les commandes par palette de
  couleur pour minimiser les changements de fil. Gain de productivité massif
  identifié comme le principal levier de scaling.
- **Lead time** : délai entre la commande client et l'expédition. Standard
  Ypersoa : 10 jours. Cas Noël : 15 jours. Capsule grand motif : 10 jours
  affichés.
- **Canonical** : se dit d'un fil dont l'aiguille est fixée en permanence sur
  la TMEZ. Les 10 canoniques couvrent 70 % des commandes sans changement.

---

## Notes méthodologiques

### Principe de séparation des responsabilités

**Sarah** définit le cadre (catalogue, SOPs, seuils) et intervient sur
exception. **Adriana** exécute dans le cadre, prend les décisions de
production quotidiennes, propose les améliorations. Le système supporte cette
séparation : pas d'écran "Sarah" et "Adriana" séparés, mais des vues et des
permissions différenciées.

### Versioning et amélioration continue

Tout est versionné : SOPs, palettes, catalogue, règles qualité. Chaque
modification crée un nouvel état avec changelog. L'historique permet d'analyser
ce qui a marché ou pas dans le temps.

### Documentation comme produit

Les SOPs ne sont pas un livrable secondaire. Ce sont le **produit principal**
de la phase 1. Une SOP mal écrite ou non utilisée = un point de friction qui
ramène Sarah dans la prod. Investir massivement sur la qualité des SOPs et
leur usage quotidien.

### Critère de "fait"

Un module est "fait" quand Adriana l'utilise au quotidien sans assistance.
Tant qu'il faut expliquer comment l'utiliser, ce n'est pas fini.

---

## Ouvertures phase 2 et au-delà

- **Connexion Shopify ↔ atelier production** : intégration directe pour que les commandes Shopify entrent automatiquement dans la queue de production (webhook ou polling régulier vers l'API Shopify), avec mapping automatique motif / variante / palette
- Intégration n8n pour automatisations (notifications Slack, emails clients)
- Module formation : onboarding d'un second opérateur quand Adriana sera
  saturée
- Module sous-traitance : workflow pour confier ponctuellement de la prod à
  un atelier externe en cas de pic

---

*Document de cadrage — version 1.0 — à itérer au fil des sprints.*
