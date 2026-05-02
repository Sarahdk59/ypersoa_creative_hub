# TODO — prochaine session prod_hub + atelier-DA

> Cadré le 2026-05-03 à la fin de la session nuit cadrage motifs multicolore.
> 5 commits locaux d'avance sur origin/main : prod_hub V0 + outils + cadrage.

---

## État actuel

### Ce qui est en place
- Moteur attribution prod_hub V0 (commit `9a1a571`) : backtracking déterministe + 3 règles dures + 4 règles molles (entropie, orpheline, colonne d'attaque, cohérence cœur) + filtre support.
- SPEC + AUDIT décisionnels (`9e053b8`) : `_passations/IDEES_FUTURES/SPEC_prod_hub.md` + `AUDIT_shooting_director_30-04.md`.
- Upload PNG dans atelier-DA modale motif (`76bf6cc`) : variante client / shooting interne, slug auto.
- Tests viz cœur + filtre support (`f4d3947`).
- Preview Streamlit + Cadrer motifs page (`a75f5d8`) : UX swatches Ypersoa, lecture des 3 sources canoniques, sauvegarde dans `prod_hub/gammes/`.
- Cadrage de 3 motifs multicolore : YPM-004 (1 gamme), YPM-009 (3 gammes : palette / camaïeu bleu / camaïeu rose lavande), YPM-017 (1 gamme). Total 5 gammes, 5 fils non-canoniques identifiés.

### Ce qui est en attente
- Routine remote `trig_01DryuVsiGFUqpjDbTMKQ3Zb` qui se déclenche le **2026-05-09 06:00 UTC** (8h Paris) : ouvre une PR de stabilisation référentiels en lisant `prod_hub/gammes/gammes_ypm_all.json` + `_fils_non_canoniques_a_ajouter_v2.json` + Liquid templates. La PR sera prête à reviewer ce vendredi-là.

---

## Bloquant — à faire en début de session

### 1. Valider les 5 hex non-canoniques contre le nuancier Gunold physique
Fichier : `prod_hub/gammes/_fils_non_canoniques_a_ajouter_v2.json`

Hex à valider visuellement avec Adriana :
- Moutarde `#D4A12A` (Gunold 61137 présumé)
- Rose poudré `#E8C4C0`
- Gris perle `#DDD8D0`
- Rose vif `#E84B7C` (possiblement Gunold 61119)
- Corail `#E89B82` (validé sur photo MAMA, à confirmer fil physique)

**Action** : modifier directement `_fils_non_canoniques_a_ajouter_v2.json` après validation, ou laisser l'agent du 9 mai surfacer dans la PR.

### 2. Brancher la preview app sur `gammes_ypm_all.json`
Aujourd'hui la preview est générique. À faire :
- Ajouter en haut de `prod_hub/preview_app.py` un sélecteur motif (dropdown des 17 motifs depuis `motifs_ypm.json`)
- Au choix d'un motif : auto-load asset_principal en preview + variantes texte en dropdown + gammes prod auto-cochent les fils
- Sarah garde le pouvoir d'override (cœur, support, fils)

**Effort** : ~30-45 min.

---

## Backlog priorité haute

### 3. Affichage "nombre de changements d'aiguille" dans la preview
Ajouter dans le panneau résultat :
- *Naïf (séquence d'écriture)* : compte les transitions de couleur en parcourant les lettres dans l'ordre de broderie
- *Optimisé (regroupé par couleur, ce que la TMEZ fait via DST)* : `len(distinct_fils) - 1`

Métrique critique pour Adriana (chaque changement = arrêt machine, coût prod).

### 4. Lexique "Comprendre le score"
Expander dans la preview avec les 4 règles molles vulgarisées :
- **Entropie** : équilibre des couleurs (ex. 4/3/3/3/3 sur 16 lettres = bon, 10/3/2/1 = mauvais)
- **Orpheline** : pas une seule lettre isolée d'une couleur quand une autre est dominante
- **Colonne d'attaque** : la 1re lettre de chaque ligne ≠ couleur de la 1re lettre de la ligne suivante
- **Cohérence cœur** : le cœur doit ≠ couleur dominante, sinon il "se perd" visuellement

### 5. Promotion fil custom → v2
Dans la page "Cadrer motifs" : bouton "Proposer ce fil pour le référentiel v2" qui ajoute l'entrée dans `_fils_non_canoniques_a_ajouter_v2.json` (au lieu de juste `gammes_ypm_all.json`). Phase 1 progresse au fil de l'usage.

---

## Backlog priorité moyenne

### 6. Feature B atelier-DA — recommandations variantes basées casting
On a tout côté data (`affinites_narratives.json` + `calendrier_canoniques.json`). Pour YPM-004 : suggérer "1976/1997 Coline & Hugo" (couple) ou "1968/1998/2018 Marie-Hélène/Anna/Félicie" (3 générations). Voir conversation initiale.

Étapes :
- Ajouter `type_motif` dans motifs_ypm.json (year_stack, prenom, family_text, etc.)
- Moteur de reco : croise type × dispositifs/lignées/anniversaires
- UI : suggestions au bas de la modale motif, bouton "créer cette variante" qui pré-remplit l'upload PNG

### 7. Phase 2 prod_hub — webhook Shopify
Tranché en SPEC §7. À démarrer après stabilisation référentiels (Phase 1 PR mergée).

Étapes :
- Webhook Shopify "order created" → extraction texte + variante + cœur
- CLI `prod-hub commande <id>` qui appelle le moteur + génère un PDF fiche technique
- SQLite locale atelier pour traçabilité

---

## Backlog priorité basse / idées futures

### 8. Mode "rapide" page Cadrer motifs
La forme actuelle (17 expanders) est OK pour saisir motif par motif. Une vue table compacte (1 ligne par motif, gammes en chips) pourrait être plus rapide pour relire / corriger.

### 9. Sous-module "Règles & contraintes broderie" dans atelier-DA (V2 SPEC §10)
Migrer la page Cadrer motifs Streamlit vers un vrai sous-module Next.js dans atelier-DA. Couche d'appel UI ↔ moteur Python à définir (REST, subprocess, IPC). Pas urgent tant que Streamlit fait le job.

### 10. Phase 3 prod_hub — génération DST native
Lib Python ou wrapper. Étude faisabilité d'abord (format Tajima binaire propriétaire). Pas démarré.

---

## Décisions Sarah en attente

- **Camel vs Taupe** dans `palette_fils_broderie_v2.json` : faut-il renommer `fil_camel` en `fil_taupe` (cohérent avec usage prod 61380) ? `_meta.decisions_a_trancher` ouvert depuis la création v2.
- **Sable vs Beige** : idem, `fil_sable` à renommer en `fil_beige` (61071) ?
- **Liquid Shopify** : Sarah doit mettre à jour les templates `archives/perso-ypm004.liquid` et `archives/perso-ypm017.liquid` pour aligner avec le cadrage prod (gammes spécifiées explicitement). Ou laisser la PR du 9 mai le faire.
- **Texte client custom** : pas pré-générable (R6 SPEC), le moteur tourne à la commande. À confirmer en Phase 2 que la latence (~150ms) reste acceptable sur 100+ commandes/jour.

---

## Routines / agents en cours

| ID | Date prévue | Action | Statut |
|---|---|---|---|
| `trig_01DryuVsiGFUqpjDbTMKQ3Zb` | 2026-05-09 06:00 UTC | PR de stabilisation référentiels Phase 1 (audit avancement + reconciliation Liquid + scaffold gammes manquantes) | armée |

---

## Fichiers clés à connaître

- `prod_hub/preview_app.py` : preview Streamlit (entry point, port 8501)
- `prod_hub/pages/1_Cadrer_motifs.py` : page cadrage 17 motifs
- `prod_hub/moteur_attribution/moteur_attribution.py` : moteur core
- `prod_hub/moteur_attribution/visualisation.py` : rendu PNG matplotlib
- `prod_hub/gammes/gammes_ypm_all.json` : cadrage gammes par motif (3 motifs cadrés)
- `prod_hub/gammes/_fils_non_canoniques_a_ajouter_v2.json` : 5 fils à ajouter en v2
- `referentiels/motifs/motifs_ypm.json` : 17 motifs canoniques (lu par les 2 outils)
- `referentiels/palette_fils_broderie_v2.json` : 20 fils canoniques (lu par les 2 outils)
- `_passations/IDEES_FUTURES/SPEC_prod_hub.md` : la spec décisionnelle complète

---

## Pour démarrer la prochaine session

```bash
# 1. Vérifier l'état git
git -C /Users/sarahkedziora/Documents/ypersoa_creative_hub status
git -C /Users/sarahkedziora/Documents/ypersoa_creative_hub log --oneline -10

# 2. Lancer Streamlit (depuis prod_hub/)
cd /Users/sarahkedziora/Documents/ypersoa_creative_hub/prod_hub
python3 -m streamlit run preview_app.py
# Ouvre http://localhost:8501

# 3. Lancer atelier-DA (depuis racine)
pnpm dev:atelier
# Ouvre http://localhost:3000/atelier-da
```

Si la routine du 9 mai a déjà tiré : checker la PR ouverte par l'agent (`gh pr list`).
