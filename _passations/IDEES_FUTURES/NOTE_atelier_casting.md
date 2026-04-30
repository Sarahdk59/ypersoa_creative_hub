# Atelier-Casting — Note de cadrage (sous-module de atelier-DA)

> Note ouverte transformée en sous-module 1 de l'app atelier-DA.
> Voir SPEC_atelier_DA.md pour la place dans l'architecture globale.
>
> Ce fichier détaille spécifiquement le moteur narratif du Casting,
> qui est la fonctionnalité phare du sous-module.

**Date** : 30 avril 2026
**Statut** : intégré au manifeste comme sous-module de atelier-DA
**Évolution** : initialement pensée comme app séparée, finalement
absorbée dans atelier-DA pour respecter la pureté du manifeste
14 métiers (Casting = sous-fonction du Directeur Artistique).

## L'idée en 4 lignes

Un système qui transforme les 23 canoniques de fiches techniques
en personnalités vivantes avec biographie, anniversaires, affinités
narratives. Le système comprend du langage naturel ("anniversaire
en mai", "shoot Noël") et restitue les bons canoniques avec leurs
contextes narratifs.

## Cas d'usage formulés par Sarah

Sarah écrit : "je veux faire un shooting pour un anniversaire en mai"
Le système répond : "C'est l'anniversaire de Gabin"

Sarah écrit : "Noël"
Le système répond : "Pense à shooter Coline, Hugo et Noé"

## Pourquoi cette intelligence est plus profonde qu'une visualisation

L'outil n'est pas une visualisation passive du casting. C'est un
moteur narratif actif qui :
- connaît les dates clés et événements de la mythologie Ypersoa
- track l'historique d'usage de chaque canonique
- connaît les affinités narratives entre canoniques
- comprend du langage naturel
- pousse des suggestions proactives

C'est l'inverse d'un annuaire. C'est un directeur de casting
personnel qui chuchote à l'oreille de Sarah pendant qu'elle brief
son shooting.

## Travail biographique préalable nécessaire

Pour que le moteur fonctionne, chaque canonique doit être enrichi :
- Date d'anniversaire (réelle ou fictive)
- Saison préférée
- Événements de vie (mariage, naissance, déménagement…)
- Traits narratifs invocables
- Affinités narratives qualifiées (pas juste "duo possible" mais
  "duo de transmission", "duo de complicité", "duo de tension")

Estimation du travail biographique : 8-12h Sarah seule, ou 2-3h
en validation IA-assistée (proposition GPT-5.5, validation Sarah).

## Croisements potentiels avec les autres outils du Hub

Le moteur narratif du Casting est **transverse** au Hub : tous
les outils peuvent l'interroger.

- atelier-DA / Plan de shooting → suggérer canoniques cohérents
  avec un brief
- atelier-DA / Référentiel ambiances → matcher canoniques avec
  ambiances par affinité narrative
- atelier-shooting → suggérer canoniques sous-utilisés au moment
  de la génération
- atelier-social → générer captions personnalisées par canonique
- atelier-lookbook → sélectionner canoniques cohérents avec
  un thème de lookbook

C'est l'outil qui rend le Hub "qui se souvient" plutôt qu'un
Hub "qui exécute".

## Architecture pressentie : intelligence ambiante

Pas une app dédiée, pas un onglet figé : **une couche transverse**
exposée comme service interne du Hub. Les apps consommatrices
appellent une fonction du type :

```
queryCasting(brief: string) → SuggestionCasting[]
```

L'implémentation V1 peut être une simple fonction TypeScript +
GPT-5.5 + lecture des fichiers de référentiels enrichis.

## Questions ouvertes pour cadrage final

1. Travail biographique : Sarah seule, IA-assistée, hybride ?

2. Comment Sarah veut-elle interagir avec le moteur ?
   - Champ texte libre + LLM qui interprète ("Noël" → suggestions)
   - Calendrier visuel avec dates marquées par canonique
   - Les deux

3. Granularité du tracking d'usage : quels événements compte-t-on
   ("a été utilisé dans X shots du pack Mama Club") ?

4. Connexion avec les autres apps du Hub : suggestion active
   (popup quand l'utilisateur génère) ou passive (consultable
   sur demande) ?

5. Place dans le mur des canoniques : le moteur est-il un onglet
   séparé ou imbriqué dans la fiche de chaque canonique ?

## À traiter quand

Sous-module 1 de atelier-DA en V1 priorité forte. À cadrer
finement en session dédiée d'implémentation, après le travail
biographique préalable sur les 23 canoniques.

Pas urgent au sens deadline. Très important au sens valeur.
