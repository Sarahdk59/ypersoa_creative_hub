# Prompt — Remédiation du Guide (`guide-content.ts`)

> **Chantier 1/2 — DOCUMENTAIRE.** Ce prompt met le Guide à jour sur la nav réelle. Il ne corrige aucun bug applicatif : le slug `/pages/cercle`, `EDITORIAL_PILLARS` et les 3 `checkBrandSafety` dupliqués sont le **chantier 2/2 (code)**, à faire dans une autre session.
> À coller dans Claude Code (VS Code), à la racine du monorepo.

---

## Contexte

Une refonte de navigation (« chrome v2 », 20-21/08/2026) a remplacé les 6 ateliers historiques par une nav à 5 ateliers + 2 référentiels + Le Livre. Le fichier `apps/atelier-social/src/lib/guide-content.ts` décrit encore l'ancienne structure : 5 entrées de nav de premier niveau et 2 modes de génération sont invisibles pour un lecteur du Guide, et plusieurs fiches donnent des chemins de clic qui pointent vers des cartes disparues.

Un audit a déjà produit les brouillons des fiches manquantes (fournis en fin de ce prompt) et la liste précise des écarts. Ta mission : appliquer ces corrections dans `guide-content.ts`, en collant au réel du code, pas aux brouillons pris au pied de la lettre.

## Périmètre — strict

- **Écriture autorisée : `apps/atelier-social/src/lib/guide-content.ts` uniquement.**
- Lecture autorisée partout (pour vérifier les faits avant de rédiger).
- **Interdit** : modifier tout autre fichier, corriger un bug applicatif croisé en chemin, « améliorer » du code. Si tu repères un problème hors Guide, note-le dans le récap final, ne le touche pas.

## Étape 0 — Ancrage sur le réel (avant d'écrire une seule fiche)

1. Ouvre `guide-content.ts` et relève **le type/interface exact d'une fiche** (`FeatureDoc` ou équivalent) : noms et nombre de champs. **Reprends ce gabarit à la lettre. N'invente aucun champ, n'en supprime aucun.** (Les brouillons ci-dessous utilisent aQuoiCaSert / quandUtiliser / commentFaire / limites — si la structure réelle diffère, c'est la structure réelle qui gagne.)
2. Lis 2-3 fiches existantes pour caler **la voix** : tutoiement, non-technique, phrases courtes, orienté « quand j'ai besoin de X, je fais Y », exemples concrets. Tes fiches doivent être indiscernables des leurs.
3. Ouvre `apps/atelier-social/src/components/HubSidebar.tsx` et relève **l'ordre et les libellés exacts** des entrées de nav actuelles. C'est la référence pour l'ossature et pour tous les chemins de clic.

## Étape 1 — Trancher les 2 points incertains par lecture de code (ne devine pas)

- **Exports du Blog** : lis `apps/atelier-social/src/app/api/blog/generate/route.ts` **et** `app/blog/page.tsx`. Le générateur renvoie-t-il encore Liquid + JSON-LD, ou seulement un HTML « Copier pour Shopify » ? La fiche Blog devra décrire **ce qui existe réellement**, pas ce que l'ancienne fiche `da-blog` promettait. Si ça reste ambigu après lecture → écris la fiche sur le minimum confirmé et marque le reste `[À CONFIRMER: Sarah]`.
- **Libellé du sélecteur de mode Social** : lis `app/social/page.tsx` et le composant qui rend le switch de mode (`visuel`/`avis`/`histoire`/`reel`). Relève **l'intitulé exact affiché à l'utilisateur** (bouton ? onglet ? quel texte ?). Les fiches Histoire/Reel doivent citer ce vrai libellé dans leur `commentFaire`. Introuvable en UI → `[À CONFIRMER: Sarah]`.

## Étape 2 — Réécrire l'ossature

- **`GUIDE_INTRO`** : remplacer la description « 6 ateliers » par la structure réelle — **5 ateliers** (Social, Blog, Planning, Studio, Bibliothèque) + **2 référentiels** (Atelier DA, Atelier Production) + **Le Livre** (lien en pied de barre latérale). Ordre = celui de `HubSidebar.tsx`.
- **Sommaire / table des sections** : refléter cette structure. Les nouvelles entrées de niveau 1 (Blog, Planning, Studio, Bibliothèque, Le Livre) deviennent des sections, pas des sous-fiches noyées sous Atelier DA.

## Étape 3 — Ajouter les 6 fiches manquantes

À partir des brouillons (§ Brouillons ci-dessous), coulés dans le gabarit réel de l'étape 0 :

1. **Le Livre** — à quoi ça sert avant de publier (voix, palette, brand-safe).
2. **Blog** (niveau 1, rituel « article du jeudi ») — avec le set d'exports confirmé à l'étape 1.
3. **Planning** (tempo hebdo, 3 priorités/équipe) — **distinguer explicitement** du rétroplanning 2027 (`/atelier-da/planning`), comme le Guide sait déjà le faire pour planning machines vs rétroplanning.
4. **Studio** (hub d'aiguillage vers Shooting / Lookbook / Shooting Book / Studio Mood).
5. **Bibliothèque** (hub : Visuels / Motifs / Produits / Packs / Articles).
6. **Histoire** + **Reel** (modes de l'Atelier Social) — libellé de mode confirmé à l'étape 1.

## Étape 4 — Corriger / réconcilier les fiches obsolètes existantes

- **`da-blog`** : son chemin « Atelier DA → carte Blog » est mort (la carte est devenue une redirection). Fusionne-la dans la nouvelle fiche Blog **ou** réduis-la à une note « le Blog est passé atelier de premier niveau, voir section Blog ». **Ne pas laisser deux fiches Blog qui se contredisent.**
- **Chemins de clic morts** vers Shooting Book et Studio Mood : remplacer « Ouvre Atelier DA, puis la carte X » par le chemin réel « barre latérale → Studio → X ».
- **`social-bibliotheque`** (tiroir de packs) et **`da-mediatheque`** : actualiser/fusionner vers la nouvelle fiche Bibliothèque niveau 1. Vérifier qu'on ne présente plus la Médiathèque comme un espace séparé sous Atelier DA si elle vit désormais dans Bibliothèque.
- **`social/connexion` / `social/playbook`** : ce sont des redirections ; pas de fiche à créer, juste s'assurer qu'aucune fiche existante n'envoie l'utilisatrice vers ces vieilles URLs comme si c'étaient des destinations.

## Étape 5 — Cohérence & vérification finale

- **Chemins de clic** : chaque `commentFaire` nouveau ou modifié doit correspondre à une entrée réellement présente dans `HubSidebar.tsx`. Teste mentalement le premier clic.
- **Nommage** : zéro occurrence de « Cercle » dans le copy que tu écris — c'est **Club Ypersoa**, toujours.
- **Brand-safe** : le Guide est interne (le jargon d'atelier y est toléré), mais tout **exemple de contenu généré** que tu montres dans une fiche doit rester brand-safe côté public (pas de Tajima/Gunold/métier à broder dans un exemple de caption ou d'article).
- **Ne rien promettre que le code ne fait pas** : si l'étape 1 montre qu'un export n'existe plus, la fiche ne le mentionne pas.
- **Types** : `guide-content.ts` doit compiler — tous les champs du gabarit remplis, aucun champ inventé. Lance le check TS/build si dispo.
- **Récap de fin de session** : liste (a) fiches ajoutées, (b) fiches modifiées/fusionnées, (c) tout `[À CONFIRMER: Sarah]` restant, (d) tout problème hors-périmètre repéré mais non touché.

---

## Brouillons de fiches (matière première — à couler dans le gabarit réel, à affiner sur la voix)

### Le Livre
- **aQuoiCaSert** : Vérifier en un clic la voix, la palette, le vocabulaire brand-safe et le Range Bisous avant de publier quoi que ce soit.
- **quandUtiliser** : Avant de publier un post, un article ou une carte ; en cas de doute sur le ton (quel cran ?) ou la couleur.
- **commentFaire** : Clique « Le Livre » en bas de la barre latérale → onglets Identité / Visuel / Playbook / Mood → repère le territoire, le cran (Citron/Zeste/Crème/Coton) et la checklist avant publication en fin de page.
- **limites** : Page de lecture, ne modifie rien.

### Blog — rituel « Article du jeudi »
- **aQuoiCaSert** : Tenir le rendez-vous hebdo du blog sans repartir de zéro chaque semaine.
- **quandUtiliser** : Mercredi soir (brief/génération), jeudi matin (relecture + publication).
- **commentFaire** : Clique « Blog » dans la barre latérale → lis le brouillon → « Étoffer » si trop court (cible 700-1100 mots) → [export confirmé à l'étape 1] une fois validé.
- **limites** : Le brouillon est un point de départ, pas un article prêt à publier tel quel.

### Planning — tempo hebdo
- **aQuoiCaSert** : Voir en un coup d'œil la semaine (thème, publications prévues, article du jeudi) et les 3 priorités max de chaque équipe.
- **quandUtiliser** : En début de semaine pour se caler, ou pour noter le brief de Maï.
- **commentFaire** : Clique « Planning » dans la barre latérale → lis « Le tempo » de la semaine → ajoute/édite les priorités de ton équipe (3 max) → écris le brief (sauvegarde auto).
- **limites** : Ne pas confondre avec le rétroplanning 2027 (`/atelier-da/planning`), outil de campagne long terme.

### Studio
- **aQuoiCaSert** : Point d'entrée unique pour choisir son terrain de jeu visuel : pièce (Shooting), ambiance (Lookbook), plan de tournage (Shooting Book), humeur/Reel (Studio Mood).
- **quandUtiliser** : Quand tu ne sais pas encore par quel bout prendre un shooting ou une vidéo.
- **commentFaire** : Clique « Studio » dans la barre latérale → choisis le parcours → tu es redirigée vers l'outil correspondant.
- **limites** : C'est un aiguillage ; les fiches détaillées des 4 outils restent valables, seul le chemin d'accès change.

### Bibliothèque
- **aQuoiCaSert** : Retrouver tout ce qui a été produit ou référencé — visuels, motifs, produits, packs, articles — au même endroit.
- **quandUtiliser** : Pour rechercher un visuel déjà généré, consulter le catalogue motifs/produits, ou rouvrir un pack sauvegardé.
- **commentFaire** : Clique « Bibliothèque » dans la barre latérale → choisis l'onglet (Visuels / Motifs / Produits / Packs / Articles).
- **limites** : Remplace les anciens points d'entrée « Référentiel » et « Médiathèque » (fusionnés le 21/08/2026) ; les anciennes URLs redirigent mais ne sont plus la référence.

### Histoire & Reel — Atelier Social
- **aQuoiCaSert** : Générer du contenu narratif par pilier (Connexion, Preuve, Communauté) ou un script de Reel, sans passer par le studio visuel classique.
- **quandUtiliser** : Pour une caption manifeste/lien/souvenir (Connexion), une preuve process/atelier (Preuve), un contenu communauté, ou pour cadrer un Reel scène par scène.
- **commentFaire** : Dans Atelier Social, bascule sur le mode « [libellé confirmé à l'étape 1] ».
- **limites** : Le Reel reste un script texte, jamais une vidéo générée.
