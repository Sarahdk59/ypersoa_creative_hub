# prod_hub — Spécification décisionnelle

> Spec V1 décisionnelle de prod_hub, le second hub de l'écosystème Ypersoa.
> Cadrée le 2 mai 2026 après livraison V0 du moteur d'attribution
> couleur→lettre (commit `9a1a571`).
> Décisions Sarah tranchées le 2 mai 2026 au soir (cf. encadré ci-dessous).

---

## 0. Décisions tranchées (2026-05-02 soir)

| Q | Décision | Conséquence |
|---|---|---|
| Q1 | **A** — 2 dossiers parallèles dans monorepo | prod_hub reste séparé en logique (lib Python autonome) |
| Q2 | **A** — lib Python + CLI + PDF en V1 | UI atelier-DA branchée en V2 via couche d'appel à définir |
| Q3 | **A** — prod_hub s'arrête à la fiche technique | Adriana garde Wilcom pour le DST. Lib Python DST = backlog futur |
| Q4 | **B** — Adriana + Sarah ont accès | Sous-module dans atelier-DA en V2 (cf. §10) |
| Q5 | **B** — pas de cache séparé | SQLite locale (Phase 2) fait office de cache via traçabilité |
| Q6 | **A + B** — référentiel partagé + gammes locales | `referentiels/motifs_ypm.json` au root + `prod_hub/gammes/gammes_ypm*.json` côté prod_hub |

**Décision implicite** : prod_hub reste séparé en logique (lib Python
autonome), mais branché en UI depuis atelier-DA via une couche d'appel
à définir en V2 (REST, subprocess ou IPC — à trancher au moment de
l'implémentation V2).

---

## 1. Concept et positionnement

prod_hub est **le hub jumeau du Hub communication**. Il automatise la chaîne
**production broderie** depuis la commande client Shopify jusqu'au fichier
DST imprimable par les machines Tajima TMEZ.

Cadrage stratégique fondateur (CLAUDE.md, citation gravée Sarah) :

> *"Le Hub ne remplace pas le produit, le stock, la broderie. Il remplace
> les 14 métiers de la communication."*

Cette phrase exclut volontairement la production du périmètre du Hub
communication. **prod_hub vit donc en parallèle**, dans la même monorepo
mais avec son propre périmètre, son propre vocabulaire métier, et ses
propres utilisateurs (Adriana en première ligne).

### Frontière nette avec le Hub communication

| Hub communication (apps `atelier-*/`) | prod_hub |
|---|---|
| Génère du contenu (image, caption, plan shooting) | Génère de la matière prod (DST, fiche technique, étiquette) |
| Cible utilisatrice : Sarah (DA) | Cible utilisatrice : Adriana (atelier) |
| LLM-driven (Gemini, gpt-4o) | Algorithmique-driven (backtracking déterministe) |
| Output : fichiers digitaux marketing | Output : fichiers machine + papier atelier |
| Métiers remplacés : les 14 du manifeste | Rôles automatisés : 4 rôles prod (cf. §3) |

### Pourquoi le séparer

1. **Pas le même métier**. Communication = créativité scénarisée.
   Production = règles dures, déterminisme, traçabilité.
2. **Pas la même tolérance à l'erreur**. Une caption ratée = pas grave.
   Un DST raté = sweat client cousu en double-couleur fausse.
3. **Pas le même rythme**. La com tourne en burst (drop saisonnier),
   la prod tourne en continu (chaque commande Shopify).
4. **Pas les mêmes utilisateurs**. Mélanger les UI confondrait les
   workflows (Sarah n'a pas à voir la fiche Tajima d'Adriana, et
   réciproquement).

### Passerelles assumées

prod_hub et le Hub communication partagent les **référentiels canoniques**
au niveau racine du repo (`referentiels/palette_fils_broderie_v2.json`,
`referentiels/palette_supports_par_produit.json` à venir, etc.).
C'est la **seule surface de couplage** : aucune app du Hub communication
ne consomme du code prod_hub, aucun module prod_hub n'appelle un LLM du
Hub communication.

---

## 2. Place dans l'écosystème global

```
ypersoa_creative_hub/                       (monorepo Ypersoa)
│
├── apps/                                   ← Hub communication
│   ├── atelier-social
│   ├── atelier-shooting
│   └── atelier-lookbook
│
├── prod_hub/                               ← CE HUB
│   ├── moteur_attribution/
│   ├── gammes/
│   └── fiches_techniques/                  (à venir)
│
└── referentiels/                           ← surface de couplage partagée
    ├── palette_fils_broderie_v2.json       (consommé par les deux hubs)
    ├── palette_supports_par_produit.json   (consommé par les deux hubs)
    ├── motifs_ypm.json                     (consommé par les deux hubs)
    └── canoniques.ts / ambiances.json      (Hub communication uniquement)
```

prod_hub n'est ni une "app" du Hub au sens manifeste (ce n'est pas un
métier de communication remplacé), ni un référentiel passif.
C'est un **système de production** distinct, hébergé dans la même
monorepo pour des raisons pragmatiques (un seul `git`, un seul lieu pour
les référentiels canoniques).

---

## 3. Les 4 rôles prod automatisés

prod_hub n'efface aucun des 14 métiers du manifeste (qui sont tous de
communication). Il automatise des rôles **production** que le manifeste
ne couvre pas :

| # | Rôle prod automatisé | Module prod_hub correspondant |
|---|---|---|
| P1 | DA broderie multicolore (choix couleur → lettre) | `moteur_attribution/` |
| P2 | Préparation fiche technique Tajima | `fiches_techniques/` (V1 à venir) |
| P3 | Optimisation séquence DST (minimiser changements aiguille) | `dst_optimizer/` (V2 à venir) |
| P4 | Traçabilité commande → DST → étiquette | `tracage/` (V3 à venir) |

**Règle de pureté** identique au Hub communication : un module = un rôle
prod. Si une fonctionnalité chevauche deux rôles, elle vit dans le module
du rôle dominant.

---

## 4. Pipeline cible (commande → broderie)

```
[Shopify webhook commande]
       │
       ▼
┌──────────────────────────────────┐
│ 1. EXTRACTION                    │
│ - YPM motif + variante (gamme)   │
│ - Texte client (1-4 lignes)      │
│ - Couleur du cœur                │
│ - Support (couleur sweat)        │
└──────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────┐
│ 2. ATTRIBUTION (V0 ✅)           │
│ moteur_attribution.attribuer()   │
│ - Filtre support → palette eff.  │
│ - Backtracking règles dures      │
│ - Scoring molles + cœur          │
│ - Seed = SHA-256(texte, gamme)   │
└──────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────┐
│ 3. FICHE TECHNIQUE (V1 ⏳)       │
│ - PDF format Tajima imprimable   │
│ - Plan d'aiguille TMEZ canonique │
│ - Codes Gunold + numéros aiguille│
│ - Preview visuel (matplotlib)    │
└──────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────┐
│ 4. DST (V2 ⏳)                   │
│ - Génération fichier .dst        │
│ - Optimisation séquence couleur  │
│ - Validation par tests visuels   │
└──────────────────────────────────┘
       │
       ▼
[Machine Tajima] → broderie cousue
       │
       ▼
┌──────────────────────────────────┐
│ 5. TRAÇABILITÉ (V3 ⏳)           │
│ - Numéro commande → fichier .dst │
│ - Archivage + cache              │
│ - Étiquette colis Shopify        │
└──────────────────────────────────┘
```

Chaque étape est **indépendante** et **testable**. La V0 livrée couvre
strictement l'étape 2.

---

## 5. État actuel V0 (commit `9a1a571`)

### Ce qui existe et fonctionne

- **Moteur d'attribution** déterministe en Python (~400 lignes, sans
  dépendance lourde, fonctionnel sans LLM).
  - 3 règles dures : adjacence H, alignement V (y compris lignes
    centrées de longueurs variables), diagonale x3.
  - 4 règles molles scorées : entropie Shannon (distribution),
    pénalité orpheline, pénalité colonne d'attaque, **cohérence cœur**.
  - **Filtre support/fil** intégré : retire les fils peu lisibles sur
    le support choisi avant backtracking.
  - Visualisation matplotlib pour preview rapide.
  - Performance : ~150 ms pour 100 candidats sur texte de 16 lettres.

- **Référentiel `palette_fils_broderie_v2.json`** au niveau racine :
  20 fils Gunold Poly 40, codes fournisseur (validés ou TODO), numéros
  d'aiguille canoniques TMEZ, familles éditoriales, supports
  incompatibles. Partagé avec le Hub communication.

- **Référentiel gammes YPM-009** bootstrappé sur 3 variantes
  (chocolat / rose / bleu) avec fil_ids réels. Trous flagués
  explicitement (gamme chocolat à 3 fils faute de brun foncé dans la
  palette v2).

### Ce qui ne fonctionne pas encore

- **Aucune intégration Shopify**. Le moteur prend des paramètres en
  Python, pas un webhook ou un JSON commande.
- **Aucune génération PDF**. La fiche technique reste manuelle.
- **Aucun générateur DST**. Le format Tajima propriétaire n'est pas
  encore traité — Sarah génère encore les `.dst` à la main via
  Wilcom ou équivalent.
- **Cohérence cœur non documentée côté Adriana**. La règle existe en
  scoring mais le workflow opérationnel ne l'expose pas.
- **Tests visuels non automatisés**. Les 3 PNG de référence
  (`tests/test_*.png`) sont gitignorés et ne servent qu'au debug local.

---

## 6. Stack technique (à trancher)

### Choix actuels (V0)

- **Python 3** pur, sans framework. `dataclasses` + `typing`,
  `matplotlib` pour la viz, `hashlib` pour le seed.
- Pas de DB, pas d'API, pas de service. Tout en mémoire.
- Pas de tests automatisés (les tests visuels existent comme PNG de
  référence, à comparer à l'œil).

### Décisions tranchées V1 (cf. §0)

| Dimension | Choix V1 | Évolution V2+ |
|---|---|---|
| **Forme de prod_hub** | Lib Python importée | Statu quo (couche d'appel ajoutée pour atelier-DA) |
| **Persistance** | SQLite local atelier | Migration Supabase si Sarah veut accéder à distance |
| **Trigger** | CLI manuelle Adriana | Webhook Shopify direct |
| **Génération DST** | Wilcom manuel (Adriana) | Lib Python DST = backlog, pas de date |
| **UI Adriana** | CLI + PDF | Sous-module dans atelier-DA "Règles & contraintes broderie" |

Logique : tester la chaîne end-to-end avec Adriana sans surinvestir
dans une UI qu'elle pourrait rejeter. Le CLI + PDF est le minimum
fonctionnel ; une UI vient en V2 une fois le workflow validé en
production réelle.

---

## 7. Roadmap par phases

### Phase 0 — Moteur d'attribution V0 (✅ livrée 2026-05-02)

Commit `9a1a571`. Décrit en §5.

### Phase 1 — Stabilisation référentiels (1 semaine)

Préalable à toute intégration Shopify.
- Valider visuellement les 20 fils du référentiel v2 contre le
  nuancier physique Gunold (Sarah + Adriana ensemble).
- Trancher les 4 décisions ouvertes du `_meta.decisions_a_trancher`
  (Camel/Taupe, Sable/Beige, jaune moutarde dans palette, Madeira → Gunold).
- Compléter `gammes_ypm009.json` avec **toutes** les variantes Shopify
  YPM-009 réelles (aujourd'hui 3 sur N).
- Bootstrapper `gammes_ypm010.json`, `gammes_ypm011.json`, etc. pour
  les autres motifs multicolores.
- Créer `palette_supports_par_produit.json` enrichi (déjà mentionné
  par le Hub communication, à factoriser).

### Phase 2 — Intégration Shopify (2-3 semaines)

- Webhook Shopify "order created" → extraction texte + variante + cœur.
- Lib Python prod_hub appelée depuis worker.
- Génération PDF fiche technique imprimable (format Tajima A4).
- Stockage SQLite local atelier : commande → attribution → PDF généré.
- CLI Adriana : `prod-hub commande <id_commande>` qui imprime la fiche.

### Phase 3 — Génération DST native (4-6 semaines)

- Étude faisabilité format DST (binaire propriétaire Tajima).
- Lib Python ou wrapper d'un outil existant.
- Optimisation séquence : minimiser nombre de changements de couleur
  (chaque changement = un arrêt machine).
- Validation par 50 broderies test croisé (Wilcom vs prod_hub).

### Phase 4 — Traçabilité + UI (durée TBD)

- UI Streamlit ou Next.js pour Adriana : tableau de bord commandes,
  recherche, ré-impression, export.
- Étiquette colis avec QR code commande.
- Cache pré-généré pour les 100 textes les plus fréquents
  ("MAMAN", "PAPA", "GABIN", etc.).

---

## 8. Workflow Adriana cible (V1)

1. Commande Shopify reçue → notification atelier.
2. Adriana ouvre le terminal atelier, tape :
   `prod-hub commande 12847`
3. Le moteur récupère le texte + variante + couleur cœur depuis Shopify,
   filtre les fils selon le support, attribue les couleurs.
4. Une fiche technique PDF s'imprime sur l'imprimante atelier :
   - Plan d'aiguille TMEZ avec codes Gunold
   - Preview visuel de l'attribution
   - Numéro de commande + nom client + date
   - Code-barres pour suivi
5. Adriana charge les fils sur la TMEZ selon le plan d'aiguille.
6. (V2) Le `.dst` est généré automatiquement et chargé sur la machine.
7. La broderie sort, Adriana scanne le code-barres → état "produit".

Si Adriana voit une attribution qui ne lui plaît pas visuellement
(cas tordu), elle note la commande + le souci et l'envoie à Sarah
en fin de journée. C'est le **signal de re-calibration** des règles
molles ou d'ajout d'une règle dure manquante.

---

## 9. Risques principaux

- **R1 — Référentiel fils incomplet**. Plusieurs codes Gunold sont
  encore TODO_validate, plusieurs ambiguïtés (Camel vs Taupe, Sable
  vs Beige) non tranchées. Toute intégration prod en aval crashe sur
  ces trous. Mitigation : Phase 1 obligatoire avant Phase 2.

- **R2 — DST propriétaire**. Le format Tajima est binaire, pas
  documenté publiquement, et la moindre erreur génère une broderie
  ratée. Mitigation : Phase 3 démarre par une étude faisabilité, pas
  par du code.

- **R3 — Adriana ne s'approprie pas l'outil**. Si le CLI/UI ne colle
  pas à son workflow physique d'atelier, elle reviendra à Wilcom +
  attribution manuelle. Mitigation : Phase 2 pilotée avec elle, pas
  pour elle.

- **R4 — Détérioration des règles molles**. Le scoring a été calibré
  sur ~6 textes mock. En prod réelle (centaines de cas par mois), des
  cas tordus vont émerger. Mitigation : journal des "attributions
  rejetées par Adriana" dès la V1.

- **R5 — Couplage caché avec le Hub communication**. Si les
  référentiels partagés évoluent (renommage `fil_camel` → `fil_taupe`),
  les deux hubs cassent. Mitigation : changements aux référentiels
  partagés = revue Sarah systématique avant merge, jamais d'edit
  silencieux.

- **R6 — Combinatoire variantes × texte client**. Chaque motif YPM a
  N variantes Shopify (gammes de couleurs imposées), ET le client
  saisit son propre texte personnalisé (1-4 lignes, max 10 chars/ligne)
  → impossible de pré-générer toutes les attributions. Conséquence :
  le moteur tourne **à la commande**, pas en batch. Mitigation :
  Phase 1 énumère **motifs × variantes** (ensemble fini, gérable),
  pas les textes (impossible). Le déterminisme du seed garantit qu'un
  même client repassant la même commande obtient la même broderie.

---

## 10. Périmètre Adriana et accès

Adriana et Sarah ont **toutes les deux** accès à prod_hub (Q4=B).

### Adriana — point d'entrée principal

- **V1** : terminal atelier, CLI `prod-hub commande <id>`, fiche
  technique PDF imprimée localement.
- **V2** : sous-module **"Règles & contraintes broderie"** dans
  `atelier-DA/`. Adriana y prépare sa fiche technique en ligne et
  visualise les règles de gestion (3 dures, 4 molles, cohérence cœur,
  filtre support). Cohérent avec la décision implicite §0 :
  prod_hub reste séparé en logique, mais branché en UI depuis
  atelier-DA via une couche d'appel à définir.

### Sarah — accès secondaire

- **Monitoring** : tableau de bord commandes (volume jour/semaine,
  cas tordus, attributions rejetées par Adriana).
- **Calibration** : ajustement des poids de scoring des règles molles
  quand un signal Adriana le justifie.
- **Référentiels** : édition de `palette_fils_broderie_v2.json`,
  `motifs_ypm.json`, `gammes_ypm*.json`. Toute modification sur les
  référentiels partagés = revue obligatoire (cf. R5).

### Surface de couplage UI ↔ moteur

À trancher au moment de l'implémentation V2 (subprocess Python,
service REST local, IPC). Ne préempte pas la décision aujourd'hui :
le V1 CLI ne dépend que de la lib Python en import direct.

---

**Verdict global** : prod_hub est validé comme second hub de la
monorepo, séparé du Hub communication en logique mais branché en UI
en V2. La V0 livrée couvre l'attribution couleur. Phases 1 à 3
identifiées et tranchées (cf. §7), Phase 4 = UI + traçabilité sans
cache séparé. Prochaine étape concrète : **Phase 1 — stabilisation
des référentiels** (4 décisions ouvertes v2 + énumération exhaustive
motifs × variantes).
