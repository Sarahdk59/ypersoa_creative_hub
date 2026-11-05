# Prompt — Audit de cohérence Hub ↔ Livre ↔ Guide d'utilisation

> À coller dans Claude Code (VS Code) à la racine du monorepo Ypersoa Creative Hub.
> Objectif : vérifier que tout est **opérationnel**, **utilisable**, **connu** et **documenté** — et que le guide ne ment ni au Livre ni au code.

---

## Rôle

Tu es auditeur produit + documentation. Tu travailles en lecture seule (aucune modif de code). Tu croises **trois sources de vérité** et tu remontes chaque écart de façon factuelle, sourcée (fichier + ligne), priorisée.

## Les trois sources

1. **LE LIVRE** — brand book / playbook, source de vérité stratégique et normative.
   Cherche : `**/Livre*.md`, `**/brand*book*`, `**/*playbook*`, `**/BRAND*`, blocs marqués `[VERROUILLÉ]`.
2. **LE GUIDE** — guide d'utilisation destiné aux utilisateurs (Maï, Adriana, Rebecca, moi).
   Cherche : `**/guide*`, `**/GUIDE*`, `**/*utilisation*`, `**/docs/**`, `README*` par module.
3. **LE CODE** — l'état réel du hub.
   Cherche : structure des modules (Atelier Social, Atelier Blog, Planning, Bibliothèque, et tout autre), routes Next.js (`app/**`, `pages/**`), composants, appels Supabase, jobs, scripts, variables d'env attendues.

Si l'une des sources est absente ou éclatée en plusieurs fichiers, liste ce que tu as trouvé et où, avant d'auditer.

## Étape 0 — Inventaire (avant tout jugement)

Produis trois inventaires à plat :
- **Inventaire CODE** : liste chaque module → sous-fonctionnalité réellement présente dans le code (route accessible, composant monté, action serveur/branchée Supabase). Marque `[STUB]` / `[TODO]` / `[MOCK]` / `[DEAD]` ce qui est amorcé mais pas fini, commenté, ou pointant vers du vide.
- **Inventaire GUIDE** : liste chaque fonctionnalité *décrite* dans le guide, avec la promesse faite à l'utilisateur (ce qu'il croit pouvoir faire).
- **Inventaire LIVRE** : liste les règles normatives applicables au produit (nommage, vocabulaire, ton, palette, comportements attendus, rituels comme « L'article du jeudi »).

## Étape 1 — Les 4 questions d'audit

Pour **chaque fonctionnalité** croise les inventaires et réponds :

**Q1 — Opérationnel ?** La feature existe-t-elle vraiment et tourne-t-elle ? (route atteignable, pas de `[STUB]`/`[TODO]`, dépendances Supabase/env présentes, pas d'erreur bloquante évidente à la lecture). → `OK / Partiel / Cassé / Absent`

**Q2 — Utilisable ?** Un utilisateur non-technique (Maï, Adriana, Rebecca) peut-il s'en servir seul ? (point d'entrée clair dans l'UI, libellés compréhensibles, pas de manip cachée en base ou en CLI). → `OK / Friction / Bloquant`

**Q3 — Connu ?** La feature est-elle mentionnée dans le guide, à un endroit qu'un utilisateur trouverait ? Y a-t-il des fonctionnalités **live mais invisibles dans le guide** (personne ne sait qu'elles existent) ? → `Documentée / Sous-documentée / Fantôme (non mentionnée)`

**Q4 — Documentée & détaillée ?** Le guide donne-t-il un how-to actionnable (étapes, entrées/sorties, cas d'erreur, exemple), ou juste une phrase de survol ? → `Complète / Superficielle / Absente`

## Étape 2 — Matrice d'écarts (le cœur du livrable)

Classe chaque écart dans l'un de ces types :

| Type | Définition | Risque |
|---|---|---|
| **A — Fonctionnalité fantôme** | existe dans le code, absente du guide | utilisateurs ignorent une capacité |
| **B — Promesse creuse** | décrite dans le guide, absente/cassée dans le code | utilisateur bloqué, perte de confiance |
| **C — Doc superficielle** | présente des deux côtés mais how-to insuffisant | mauvaise utilisation, support à répétition |
| **D — Dérive normative** | le guide ou l'UI viole une règle `[VERROUILLÉ]` du Livre | incohérence de marque |
| **E — Désynchro comportement** | le guide décrit un comportement ≠ du réel (labels, étapes, résultats) | confusion |
| **F — Orphelin Livre** | règle/rituel prévu au Livre, jamais implémenté ni outillé | intention non tenue |

Pour chaque écart : `ID | Type | Module | Fonctionnalité | Preuve code (fichier:ligne) | Preuve guide (fichier:section) | Constat | Correctif proposé | Priorité (P0/P1/P2)`

- **P0** = casse l'usage ou trompe l'utilisateur (types B, E, D publics)
- **P1** = capacité perdue ou apprentissage bloqué (A, C)
- **P2** = confort, cohérence de fond (F, D internes)

## Étape 3 — Contrôles normatifs Ypersoa (règles à vérifier explicitement)

- **Nommage** : jamais « Cercle Ypersoa » → toujours **Club Ypersoa**. Signale toute occurrence obsolète.
- **Vocabulaire public** : dans tout contenu ou libellé *destiné au public/argumentaire*, interdits → machine industrielle, métier à broder, broderie sur métier, Tajima, tout jargon d'atelier. Autorisé = brodé à la commande, brodé en France, Hauts-de-France, sans minimum de commande, à l'unité dès une pièce, à ton image. (Note : dans un guide *interne* le jargon technique est toléré — mais alerte si ce vocabulaire fuit dans un module qui génère du contenu public : Atelier Social, Atelier Blog, PDP.)
- **Cohérence de marque** : palette (marine #16324C, teal #1E6E77, crème #F4EEE2, rouge coquelicot #C23A2D, blush #EAB4C4), typo (Fraunces + Instrument Sans), système de voix « thermostat » (Citron/Zeste/Crème/Coton). Le guide décrit-il ces systèmes conformément au Livre ?
- **Rituels** : « L'article du jeudi » (Atelier Blog), tempo hebdo + rétroplanning (Planning) — existants dans le code ET expliqués dans le guide ?

## Étape 4 — Scoring

Note le hub sur **100**, réparti sur 5 blocs (20 pts chacun) :
1. Opérationnalité (Q1)
2. Utilisabilité (Q2)
3. Couverture documentaire — connu (Q3)
4. Profondeur documentaire — détaillé (Q4)
5. Conformité normative au Livre (Étape 3)

Donne le score par bloc + total, avec 1 phrase justifiant chaque note.

## Format de sortie

Écris un fichier `AUDIT_COHERENCE.md` structuré ainsi :
1. **Synthèse** (10 lignes max) : score /100, les 3 écarts les plus graves, verdict go/no-go pour diffusion aux utilisateurs.
2. **Scorecard** (tableau 5 blocs).
3. **Top P0** : la liste des correctifs bloquants, dans l'ordre où les traiter.
4. **Matrice d'écarts complète** (Étape 2).
5. **Fonctionnalités fantômes** (type A isolé) : ce qu'il faut ajouter au guide en priorité, avec un brouillon de section how-to pour chacune.
6. **Annexe** : les trois inventaires bruts (Étape 0).

## Règles

- Aucune modif de fichier. Lecture + rapport uniquement.
- Chaque constat = une preuve (chemin + ligne ou section). Pas d'affirmation sans source.
- Distingue toujours *ce que le guide promet* de *ce que le code fait* : ne comble pas mentalement un écart pour faire coïncider les deux.
- Si une info manque pour trancher (ex. feature branchée sur un service externe non lisible), classe en `À vérifier manuellement` plutôt que d'inventer.
- Priorise. Un rapport de 200 lignes exploitables vaut mieux qu'un dump exhaustif.
