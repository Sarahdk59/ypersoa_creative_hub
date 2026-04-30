# Reels Studio — Prompt archivé pour cadrage futur

> Prompt rédigé le 30/04/2026 fin de session.
> Reels Studio = sous-module futur d'atelier-social.
> Métiers concernés : n°9 Community Manager + n°12 Stratégiste contenu.
>
> NE PAS coder ce prompt tel quel comme HTML standalone dans tools/.
> Cadrer d'abord en session dédiée la place exacte du module dans
> atelier-social et son articulation avec atelier-DA (qui fournit
> motifs, ambiances, casting) avant toute implémentation.
>
> À traiter en session dédiée, après stabilisation atelier-DA V1.

## Articulation pressentie avec le Hub

- atelier-social.reels-studio  (le module)
- consomme atelier-DA :
    référentiel motifs YPM (sous-module 3)
    référentiel ambiances (sous-module 6)
    casting (sous-module 1)
- consomme atelier-social :
    calendrier éditorial hebdo
    bibliothèque hashtags
    voix tonale captions

## Décisions à prendre avant code

1. Stack : intégré Next.js dans atelier-social, ou HTML standalone
   importé en iframe ? (HTML standalone du prompt original = mauvaise
   piste pour cohérence Hub)
2. Source des motifs/couleurs/casting/ambiances : import depuis
   atelier-DA via lecture JSON, ou copies locales ?
3. Modèle IA : claude-sonnet-4-20250514 mentionné dans le prompt
   original — à valider vs autres modèles disponibles
4. Sortie : JSON structuré seul, ou export markdown + PDF storyboard ?

---

## Prompt original — archive intention initiale

> [À COMPLÉTER — coller ici le prompt complet "Construire Ypersoa
> Reels Studio" rédigé le 30/04/2026, tel quel, comme archive de
> l'intention initiale. Ne pas reformuler.]
