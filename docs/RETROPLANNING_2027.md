# Rétroplanning maître 2027 — Créa × Prod × Comm

> Construit le 29/06/2026. Orchestre les **3 couches** (Création, Production, Communication) sur toute l'année 2027, ancré sur les motifs YPM et les occasions du Planable.
>
> Source de vérité comm : table `planable_occasions` (leads J-45/60/75 encodés). Source de vérité prod : §9 CLAUDE.md (800 pts/min, 2 TMEZ, 6h/j). Règle 45 jours : `lib/occasions/auto-plan.ts`.

---

## 1. Le moteur (chaîne de dépendances, réutilisable)

On part **toujours de l'événement** et on remonte. La créa étant batchée, elle travaille en **drops trimestriels** ; la comm se déclenche beat par beat.

| Couche | Étape | Décalage vs **Pinterest live** | Décalage vs **événement** |
|---|---|---|---|
| Créa | Début plan de collection | PL − 9 sem | — |
| Créa/Prod | Dév + digitalisation motifs (DST) | PL − 7 à −4 sem | — |
| **Prod** | **Fin tests prod motifs** (broderie réelle 2 TMEZ) | PL − 4 sem | ⚠️ avant saturation machines |
| Jalon | **Présentation collection** (motifs + produits + specs site) | PL − 3 sem | — |
| Créa/Web | **Mise en ligne site** (produits + fiches) | PL − 1 sem | — |
| **Comm** | **Pinterest LIVE** (J‑45/60/75) | J 0 | E − `pinterest_lead_days` |
| Comm | Instagram — fenêtre conversion | — | E − `campaign_lead_days` → cutoff |
| Comm | **Cutoff commandes** | — | E − `lead_days` (10, Noël 15) |
| Prod | Fin de prod des cadeaux (atelier) | — | ≈ cutoff + 2 j |

**Règle d'or** : Pinterest doit être live au plus tard à son J‑45/60/75 ; tout le reste (site, visuels, motifs testés) doit donc exister **avant** cette date. C'est Pinterest qui commande le calendrier amont.

---

## 2. Les 4 drops de collection 2027 (couche Créa + Prod)

Chaque drop = 1 présentation collection + 1 mise en ligne site, et alimente les campagnes de son trimestre.

### Drop 1 — « Cœur d'Hiver » → St‑Valentin + Grands‑Mères
*(préparé fin 2026 car Pinterest St‑Val live dès le 31/12/2026)*

| Date | Étape |
|---|---|
| 27 oct. 2026 | 🟢 Début plan de collection |
| 10 nov. → 1 déc. 2026 | Dév + digitalisation motifs |
| **20 nov. 2026** | ✅ Fin tests prod ⚠️ *avant la saturation machines Noël 2026* |
| 10 déc. 2026 | 🎤 Présentation collection |
| 24 déc. 2026 | 🌐 Mise en ligne site |

### Drop 2 — « Printemps‑Été » → Fête des Mères, Pères, Merci Maîtresse, Mariage, Vacances

| Date | Étape |
|---|---|
| 27 janv. 2027 | 🟢 Début plan de collection |
| 10 févr. → 3 mars 2027 | Dév + digitalisation motifs |
| **3 mars 2027** | ✅ Fin tests prod motifs |
| 10 mars 2027 | 🎤 Présentation collection |
| 24 mars 2027 | 🌐 Mise en ligne site |

### Drop 3 — « Rentrée‑Automne » → Rentrée, Rentrée U, Grands‑Pères, Automne

| Date | Étape |
|---|---|
| 1 mai 2027 | 🟢 Début plan de collection |
| 17 mai → 7 juin 2027 | Dév + digitalisation motifs |
| **11 juin 2027** | ✅ Fin tests prod motifs |
| 18 juin 2027 | 🎤 Présentation collection |
| 5 juil. 2027 | 🌐 Mise en ligne site |

### Drop 4 — « Fêtes de fin d'année » → Black Friday + Noël + beats décembre

| Date | Étape |
|---|---|
| 2 août 2027 | 🟢 Début plan de collection |
| 16 août → 6 sept. 2027 | Dév + digitalisation motifs |
| **10 sept. 2027** | ✅ Fin tests prod motifs ⚠️ *avant la saturation machines Noël 2027* |
| 17 sept. 2027 | 🎤 Présentation collection |
| 1 oct. 2027 | 🌐 Mise en ligne site |

---

## 3. Calendrier comm 2027 — campagne par campagne (couche Comm)

Dates calculées avec les leads encodés dans `planable_occasions`. Motifs = `recommended_motifs` de chaque occasion.

| Campagne | Événement | 📌 Pinterest live | 📱 Insta (conversion) | 🛑 Cutoff cmd | 🏁 Fin prod | Motifs YPM |
|---|---|---|---|---|---|---|
| **St‑Valentin** | dim. 14 févr. | 31 déc. 2026 (J‑45) | 31 déc. → 4 févr. | 4 févr. | ~7 févr. | 002, 005 |
| **Fête Grands‑Mères** | dim. 7 mars | 21 janv. (J‑45) | 21 janv. → 25 févr. | 25 févr. | ~28 févr. | 007, 010 |
| Pâques (éditorial) | dim. 28 mars | ~11 févr. | léger | — | — | 009, 002 |
| **Fête des Mères** | dim. 30 mai | 31 mars (J‑60) | 15 avr. → 20 mai | 20 mai | ~23 mai | 003, 007, 010 |
| **Fête des Pères** | dim. 20 juin | 21 avr. (J‑60) | 6 mai → 10 juin | 10 juin | ~13 juin | 006, 011 |
| **Merci Maîtresse** | ven. 25 juin | 11 mai (J‑45) | 11 mai → 15 juin | 15 juin | ~18 juin | 008, 013 |
| **Mariage** (saison) | mai → sept. | dès ~1 mars (J‑60) | rolling | rolling | rolling | 004, 008 |
| Voilà l'Été (éditorial) | juin → août | ~15 avr. (J‑45) | rolling | — | — | 002, 004 |
| **Rentrée** | mer. 1 sept. | 18 juil. (J‑45) | 18 juil. → 22 août | 22 août | ~25 août | 013, 014 |
| **Rentrée Universitaire** | mer. 15 sept. | 1 août (J‑45) | 1 août → 5 sept. | 5 sept. | ~8 sept. | 013, 014 |
| **Fête Grands‑Pères** | dim. 3 oct. | 19 août (J‑45) | 19 août → 23 sept. | 23 sept. | ~26 sept. | 006, 011 |
| Halloween (secondaire) | dim. 31 oct. | 21 sept. (J‑40) | léger | — | — | 014 |
| **Black Friday** | ven. 26 nov. | 27 oct. (J‑30) | 5 nov. → 16 nov. | 16 nov. | ~19 nov. | 001, 003, 006 |
| **Noël** | sam. 25 déc. | **11 oct. (J‑75)** | 26 oct. → 10 déc. | **10 déc.** | ~13 déc. | 001, 007, 012 |

**Evergreen marché** (toute l'année, sans deadline) : Naissance (009, 015), Anniversaire (001, 005), Noces de Coton / Date Brodée (016, 015). Pinterest semé en continu, 1 épingle/sem en rotation.

---

## 4. Couche éditoriale (comm seule, motifs existants, zéro créa neuve)

Entre les campagnes, le calendrier se remplit avec les ~30 occasions éditoriales du Planable (humour, lifestyle, coulisses). Elles **n'engagent ni créa ni prod** : on réutilise les motifs validés. Cadence éditoriale = 1 épingle + 1 reel, sans escalade.

Exemples de remplissage par mois creux :
- **Janvier** : Bonnes Résolutions (02/01), Je me fais un cadeau (03/01), Journée du Câlin (21/01), Galentine (13/02)
- **Avril–mai** : Dimanche au Jardin, Le Club des Copines, Tennis Club
- **Juillet–août** : Vacances à la Mer, Canicule, La Rentrée ? Non
- **Sept.** : Braderie de Lille (1er w‑e sept.), Le Retour du Pull (10/10)
- **Déc.** : Secret Santa (05/12), Pull de Noël (15/12), Au Pied du Sapin (20/12), Bilan d'année (28/12), Le Réveillon (31/12)

---

## 5. Vue d'ensemble — rythme annuel (qui fait quoi, quand)

| Mois 2027 | Créa (drop) | Prod (tests + cadeaux) | Comm (campagnes live) |
|---|---|---|---|
| **Janv.** | Drop 2 : plan collection | — | St‑Valentin (Pin+Insta), Grands‑Mères seed |
| **Févr.** | Drop 2 : dév + tests motifs | — | St‑Valentin cutoff, Grands‑Mères |
| **Mars** | Drop 2 : présentation + site | — | Mères seed (Pin J‑60), Mariage seed |
| **Avr.** | — | — | Mères, Pères seed |
| **Mai** | Drop 3 : plan collection | Prod cadeaux Mères | Mères cutoff, Pères, Maîtresse seed |
| **Juin** | Drop 3 : dév + tests + présentation | Prod cadeaux Pères/Maîtresse | Pères + Maîtresse cutoff |
| **Juil.** | Drop 3 : site en ligne | — | Rentrée seed (Pin J‑45) |
| **Août** | Drop 4 : plan collection + dév | — | Rentrée + Rentrée U cutoff, Grands‑Pères seed |
| **Sept.** | Drop 4 : tests + présentation | Prod cadeaux rentrée | Grands‑Pères, Noël prép |
| **Oct.** | Drop 4 : site en ligne | — | **Noël Pinterest live (11/10, J‑75)**, Black Friday seed |
| **Nov.** | — | Prod cadeaux Noël (montée) | Black Friday cutoff, Noël Insta |
| **Déc.** | Drop 1 (2028) : plan | **Prod Noël (pic)** → fin 10‑13 déc | Noël cutoff (10/12), beats déc |

---

## 6. Points de vigilance

1. **Pinterest commande tout.** Chaque drop doit livrer site + visuels **avant** le J‑45/60/75 de sa première campagne. Drop 1 doit donc être bouclé **fin 2026**.
2. **Saturation machines.** Les tests prod des nouveaux motifs doivent finir **avant** les pics de prod (Noël nov‑déc, Mères mai). D'où Drop 1 testé le 20/11/2026 et Drop 4 testé le 10/09/2027.
3. **Chevauchement Noël ↔ St‑Valentin** (déc–janv) : la créa St‑Valentin (Drop 1) tourne pendant la prod Noël. Anticiper.
4. **Noël = J‑75 Pinterest** (pas J‑45) : le seul beat où la comm démarre 2,5 mois avant. Pinterest live **11 octobre**.

---

## 7. Lancer dans le Planable (couche comm exécutable)

La couche comm de ce plan est générable automatiquement : pour chaque occasion, l'endpoint **`POST /api/campaigns/{slug}/expand`** applique `generateAutoPlan` (règle 45 j) et insère les entrées dans `planable_calendar_entries`.

Slugs marché 2027 à étendre :
`saint_valentin`, `fete_des_grands_meres`, `fete_des_meres`, `fete_des_peres`, `merci_maitresse`, `mariage`, `rentree`, `rentree_universitaire`, `fete_des_grands_peres`, `black_friday`, `noel`.

> ⚠️ `generateAutoPlan` calcule la **prochaine occurrence** depuis « aujourd'hui ». Pour cibler 2027 spécifiquement (et non l'occurrence 2026 la plus proche), il faut passer une date d'ancrage 2027 OU lancer l'expand après le 1er janvier 2027. Les jalons **créa + prod** (drops, présentations, tests, mise en ligne site) ne sont pas modélisés par le Planable actuel → ce document en est la source jusqu'à une éventuelle extension du modèle (TODO : ajouter un type d'entrée `milestone` créa/prod).
