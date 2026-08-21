# Modèle métier — Planning Ypersoa « Le tempo »

> Décision du 20 août 2026. Ce document décrit le contrat métier avant la
> migration technique. Le Planning remplace le kanban comme point d'entrée
> quotidien ; le Blog reste relié. Planable est sorti du flux quotidien.

## 1. Promesse

Le Tempo répond à une seule question : **qu'est-ce qu'on doit faire cette
semaine pour que la prochaine soit tenable ?**

Il ne compte pas toutes les micro-tâches. Il montre au maximum trois priorités
par métier, le contenu prévu, le jeudi du Blog, et la prochaine tension.

La voix est commune au Brand Book et au Blog : Sarah parle avec chaleur, un peu
d'acide et du concret. Exemple : « Les tests Noël attendent leur créneau.
Deux heures maintenant, et Maï pourra les filmer sans faire du stop-motion avec
des promesses. »

## 2. Une donnée, un propriétaire

| Information | Propriétaire | Où elle est modifiée | Ce que le Tempo fait |
|---|---|---|---|
| Thème et tension de la semaine | Sarah | Tempo, après réunion de collection | Affiche et distribue le contexte partout |
| Campagnes / collections | Sarah | Fil de l'année | Relie les semaines, le contenu et les préparations |
| Date et état de programmation d'une publication | Maï / Tempo | Tempo | Une seule vue de planification, sans Planable parallèle |
| Brief, brouillon et publication de l'article | Blog | Atelier Blog | Crée/actualise automatiquement le rendez-vous du jeudi |
| Avancement des priorités Créa / Prod / Comm | Métier concerné | Tempo | Remplace le kanban séparé |
| Arbitrage de la semaine | Sarah | Tempo | Peut reclasser, déplacer ou retirer une priorité |

**Règle :** le Planning est le cockpit unique. Planable n'est plus une étape
du travail de Maï et ne crée plus de packs ou de publications depuis le Tempo.

## 3. Les objets métier

```text
Campagne / collection
       │
       ├──── Semaines (thème, chaleur, événement)
       │        │
       │        ├──── Priorités hebdomadaires (Créa, Prod, Comm)
       │        │        └──── Élément de travail canonique
       │        │              ├── publication Planable
       │        │              ├── article Blog
       │        │              ├── test produit / broderie
       │        │              ├── shooting / visuel
       │        │              └── préparation collection
       │        │
       │        └──── Article du jeudi
       │
       └──── Jalons annuels et charge macro
```

### `planning_campaigns`

Une campagne ou collection : Noël, Bonne Rentrée, Braderie, Bonnet, etc. Elle
donne le contexte à plusieurs semaines et à plusieurs éléments de travail.

| Champ | Rôle |
|---|---|
| `id` | identifiant |
| `nom`, `description` | intitulé humain et intention |
| `date_debut`, `date_fin` | fenêtre macro |
| `heat` | `calm`, `hot`, `peak` |
| `marronnier` | Noël, Saint-Valentin, rentrée… si applicable |
| `statut` | `a_venir`, `en_cours`, `terminee` |

### `planning_weeks`

Une ligne par lundi. C'est l'épine dorsale du Tempo.

| Champ | Rôle |
|---|---|
| `id`, `date_debut`, `date_fin` | semaine lundi → dimanche |
| `campaign_id` | campagne liée, facultative pour l'evergreen |
| `theme`, `sous_theme` | choisi par Sarah après réunion de collection |
| `heat`, `evenement`, `club_launch` | tension et éléments visuels du fil |
| `charge_publis` | nombre calculé depuis les publications liées, avec surcharge manuelle exceptionnelle |
| `statut` | `a_venir`, `en_cours`, `faite` |
| `source_theme` | `reunion_collection`, `planable`, `manuel` |
| `note_sarah` | contexte court, pas une liste de tâches |

Une semaine sans campagne est légitime : elle prend le thème **Evergreen**
(mariage, anniversaire, couple, cadeau original, idée cadeau, hiver/bonnet),
avec une respiration humour ou magie de Noël quand c'est de saison.

### `planning_items`

L'élément de travail canonique. Il remplace les cartes isolées du kanban et
permet à la même chose d'être vue par tous les métiers sans être dupliquée.

| Champ | Rôle |
|---|---|
| `id`, `titre`, `description` | contenu humain de la carte |
| `kind` | `publication`, `article`, `test`, `shooting`, `visuel`, `preparation`, `autre` |
| `campaign_id`, `week_id` | contexte de campagne et semaine cible |
| `owner_role` | `crea`, `prod`, `comm` |
| `statut` | `a_faire`, `en_cours`, `bloque`, `fait`, `annule` |
| `due_date` | date utile, jamais imposée pour une idée |
| `source` | `planning`, `planable`, `blog`, `pack`, `atelier` |
| `source_id`, `source_url` | identifiant et lien de l'objet source |
| `blocking_item_id` | dépendance éventuelle : le tournage attend le test Prod |

Une publication conserve son pilier, son verbe, son format, sa date et son
statut dans le Tempo. Les anciennes références Planable peuvent être gardées
pour l'historique, mais ne pilotent plus l'interface.

Les champs propres au jeudi restent liés à l'article `geo_articles` :
`article_id`, titre, état du brouillon et URL Shopify.

### `planning_week_priorities`

La sélection éditoriale de la semaine. Elle ne crée pas une tâche : elle place
un `planning_item` dans la colonne d'un métier.

| Champ | Rôle |
|---|---|
| `week_id` | semaine concernée |
| `item_id` | élément canonique |
| `role` | `crea`, `prod`, `comm` |
| `rank` | 1, 2 ou 3 |
| `state` | miroir de lecture de l'état, calculé depuis l'item |

**Contrainte métier :** unicité `(week_id, role, rank)` et rang compris entre
1 et 3. Ainsi, jamais plus de trois priorités par métier.

## 4. Le parcours d'une information

### Exemple « tests Noël »

1. Sarah relie la campagne Noël à une semaine et pose ses priorités.
2. Elle crée « Envoyer les tests Noël à la Prod » comme priorité Créa.
3. L'élément « Tester les broderies Noël » appartient à la Prod et dépend de
   l'envoi des tests.
4. Maï voit automatiquement que les tests sont `en_cours` : sa priorité
   « filmer les tests Noël » reste visible mais marquée « attend la Prod ».
5. Quand Adriana passe le test à `fait`, Maï a un signal discret : elle peut
   filmer. Aucune carte n'a été réécrite trois fois.

## 5. Rituels et automatisations

| Moment | Déclencheur | Effet |
|---|---|---|
| Réunion de collection | Sarah | ajuste le thème, la campagne et les 3 priorités par métier |
| Sélection d'une idée ou création de contenu | Maï dans le Tempo | crée ou met à jour la publication liée dans le Tempo |
| Mercredi 19 h | job Blog | crée le brief/rendez-vous de l'article du jeudi dans la semaine en cours |
| État d'une priorité | geste du métier propriétaire | met à jour l'élément et libère ses dépendances |
| Arrivée à moins de 10 jours d'un pic | calcul Tempo | affiche une alerte encourageante, sans fabriquer de tâche |

Si le connecteur n'est pas disponible, le Tempo propose un ajout manuel court ;
il ne doit jamais dépendre d'une saisie quotidienne.

## 6. Droits d'accès

| Rôle | Lecture | Écriture |
|---|---|---|
| Sarah / admin | tout | thèmes, campagnes, toutes les priorités, arbitrages |
| Créa | tout | ses éléments et priorités Créa |
| Production / Adriana | tout, y compris Planning | ses éléments et priorités Prod |
| Comm / Maï | tout | ses éléments et priorités Comm |
| Lecture | tout le Tempo | aucune |

Le Blog écrit son rendez-vous du jeudi par connecteur. Les publications sont
gérées directement dans le Tempo, sans second outil à maintenir.

## 7. KPI et règles de lecture

- Une semaine est **tenue** dès que trois priorités au total passent à `fait`.
  Ce n'est pas un compteur de tâches exhaustif.
- La carte Instagram garde sa source `insta_stats` et montre les abonnés, le
  delta 30 jours et la tendance ; jamais une valeur inventée.
- Les publications affichent le **pilier** par défaut, avec un basculement
  possible vers le verbe. Une publication contient toujours : 1 pilier,
  1 verbe, 1 format.
- Une priorité bloquée montre ce qui lui manque, pas une alerte culpabilisante.
- Une semaine calme à zéro publication reste saine : elle peut être consacrée
  aux tests, à la préparation ou à l'evergreen.

## 8. Écrans qui en découlent

### Le tempo — accueil

1. Rituel de la semaine + tension à venir.
2. Semaines tenues et croissance Instagram.
3. Ruban des quatre prochaines semaines.
4. Alerte de pic, si nécessaire.
5. Le jeudi du Blog, les publications Planable et les trois colonnes de
   priorités (Créa, Prod, Comm).

### Le fil de l'année — macro

1. Bande de charge par campagne.
2. Collections regroupées, jalons et pics.
3. Filtres par métier et état.
4. Aucune vue plate de centaines de tâches ni compteur « fait / total ».

## 9. Migration depuis l'existant

1. Ouvrir `/planning` sur **Le tempo** et donner l'accès au rôle `prod`.
2. Transformer les cartes du kanban actuel en `planning_items`; le kanban ne
   demeure pas comme outil parallèle.
3. Conserver le rétroplanning 2027 comme source de départ, puis le migrer du
   fichier JSON vers `planning_campaigns` et les jalons macro.
4. Ajouter le connecteur du Blog du mercredi soir ; importer seulement les
   anciennes données Planable utiles à l'historique.
5. Ne migrer que ce qui sert aux semaines à venir : les anciennes micro-tâches
   restent de l'historique, pas une dette à nettoyer.

## 10. Décision de mise en œuvre

Le premier lot doit livrer le modèle `planning_weeks` + `planning_items` +
`planning_week_priorities`, l'accès Production et le Tempo en lecture/édition
des priorités. Les connecteurs Planable et Blog viennent ensuite, avec leurs
fallbacks manuels déjà présents dans l'interface.
