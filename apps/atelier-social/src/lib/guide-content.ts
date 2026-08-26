/**
 * Contenu de la page Guide d'utilisation (`/guide`).
 *
 * ⚠️ CONTENU SÉPARÉ DE LA MISE EN PAGE — c'est volontaire.
 * Pour ajouter, corriger ou réorganiser une fiche, édite UNIQUEMENT ce fichier :
 *   - GUIDE_INTRO  → l'introduction, le démarrage rapide, le pied de page.
 *   - GUIDE_SECTIONS → les sections (rangées par intention) et leurs fiches.
 * La mise en page (sommaire sticky, scroll-spy, gabarit des fiches) vit dans
 * `app/guide/page.tsx` et n'a pas à être touchée pour mettre la doc à jour.
 *
 * Gabarit OBLIGATOIRE d'une fiche (FeatureDoc) — garde les 6 blocs, c'est ce qui
 * rend la doc régulière et lisible :
 *   aQuoiCaSert · quandUtiliser · commentFaire · exemple · resultat · limites
 */

export interface FeatureDoc {
  /** ancre unique (slug kebab) — sert au sommaire et aux liens. */
  id: string;
  /** nom clair de la fonction. */
  name: string;
  /** À quoi ça sert — une phrase, bénéfice concret. */
  aQuoiCaSert: string;
  /** Quand l'utiliser — le bon cas (et quand NE PAS si pertinent). */
  quandUtiliser: string;
  /** Comment faire — étapes numérotées, précises. */
  commentFaire: string[];
  /** Exemple concret — scénario réel ancré Ypersoa. */
  exemple: string;
  /** Résultat attendu — ce que la personne voit / récupère. */
  resultat: string;
  /** Limites & pièges — erreurs fréquentes, contraintes. */
  limites: string[];
}

export interface GuideSection {
  /** ancre de la section. */
  id: string;
  /** numéro d'intention (ordre d'affichage). */
  num: number;
  /** intitulé de l'intention utilisateur. */
  title: string;
  /** atelier(s) concerné(s) — affiché en surtitre. */
  atelier?: string;
  /** 2-3 phrases d'intro de la section. */
  pitch: string;
  /** fiches de la section. */
  features: FeatureDoc[];
}

export interface QuickStartItem {
  /** ancre de la fiche visée. */
  href: string;
  /** libellé de l'action. */
  label: string;
}

export const GUIDE_INTRO: {
  titre: string;
  pitch: string;
  pourQui: string;
  demarrageRapide: QuickStartItem[];
  piedDePage: string;
} = {
  titre: "Le mode d'emploi du Hub Créatif",
  pitch:
    "Le Hub Créatif Ypersoa réunit en un seul endroit tout ce que tu fais autour de la broderie : créer tes visuels et tes textes pour les réseaux, préparer tes shootings et tes vidéos, piloter ta direction artistique, suivre les tendances et gérer la production en atelier. Un seul outil à la place des 14 métiers de la communication.",
  pourQui:
    "Pour toute l'équipe Ypersoa — créa et comm, direction artistique, et atelier de production. Cette page est faite pour s'y retrouver sans être technique : chaque fonction est expliquée pas à pas, avec un exemple réel.",
  demarrageRapide: [
    { href: "social-generer-pack", label: "Générer un carrousel Instagram ou un shooting Pinterest" },
    { href: "social-overlay-texte", label: "Ajouter du texte sur un visuel (overlay)" },
    { href: "bibliotheque-packs", label: "Retrouver un pack que j'ai déjà sauvegardé" },
    { href: "prod-commandes-shopify", label: "Importer et suivre une commande Shopify" },
    { href: "recherche-globale", label: "Chercher un motif, une commande ou une couleur" },
    { href: "le-livre", label: "Vérifier la voix, la couleur ou le vocabulaire avant de publier" },
  ],
  piedDePage:
    "Guide d'utilisation du Hub Créatif Ypersoa — couvre les 5 ateliers (Social, Blog, Planning, Studio, Bibliothèque), les 2 référentiels (Atelier DA, Atelier Production), Le Livre et la recherche globale. Pour mettre à jour cette page, édite lib/guide-content.ts.",
};

export const GUIDE_SECTIONS: GuideSection[] = [
  {
    id: "naviguer",
    num: 1,
    title: "Me connecter, chercher et naviguer",
    atelier: "Tout le Hub",
    pitch:
      "Avant tout le reste : entrer dans le Hub, retrouver instantanément ce que tu cherches, et comprendre ce que tu as le droit de voir. Le Hub est protégé par connexion et par rôle, et une barre du haut te suit partout. Une seule frappe suffit souvent à retomber sur la bonne fiche.",
    features: [
      {
        id: "se-connecter",
        name: "Se connecter au Hub",
        aQuoiCaSert: "Ouvrir ta session pour accéder à tes ateliers, tes packs et tes projets.",
        quandUtiliser:
          "À chaque nouvelle session, ou quand le Hub te renvoie vers l'écran de connexion. Si tu es déjà connectée, tu n'as rien à refaire.",
        commentFaire: [
          "Va sur la page de connexion (le Hub t'y amène tout seul si tu n'es pas identifiée).",
          "Saisis ton email et ton mot de passe.",
          "Clique sur « Se connecter ».",
          "Tu arrives sur la page que tu voulais ouvrir (ou sur l'Atelier Social par défaut).",
        ],
        exemple:
          "Tu ouvres le Hub le matin avec innovation@ypersoa.fr et ton mot de passe, tu cliques « Se connecter » : tu retombes directement sur l'Atelier Social, prête à générer ton carrousel.",
        resultat:
          "Ta session est ouverte, ton email et ton rôle s'affichent en haut à droite, et tous tes ateliers autorisés apparaissent dans la barre de gauche.",
        limites: [
          "Sans connexion valide, tu ne vois aucune page : le Hub te renvoie toujours vers l'écran de connexion.",
          "Pas de compte en libre-service : l'accès se fait sur invitation. Si tu n'as pas d'identifiants, demande à l'admin.",
        ],
      },
      {
        id: "mot-de-passe-oublie",
        name: "Mot de passe oublié / réinitialisation",
        aQuoiCaSert: "Récupérer l'accès quand tu ne te souviens plus de ton mot de passe.",
        quandUtiliser:
          "Quand « Se connecter » refuse ton mot de passe, ou que tu veux simplement en changer. Inutile si tu connais ton mot de passe : connecte-toi normalement.",
        commentFaire: [
          "Sur l'écran de connexion, clique sur « Mot de passe oublié ? ».",
          "Saisis ton email puis clique « Envoyer le lien ».",
          "Ouvre l'email reçu et clique sur le lien.",
          "Saisis ton « Nouveau mot de passe » (8 caractères minimum), confirme-le, puis clique « Réinitialiser le mot de passe ».",
        ],
        exemple:
          "Au retour de congés tu as oublié ton mot de passe : tu cliques « Mot de passe oublié ? », tu tapes innovation@ypersoa.fr, tu reçois l'email, tu choisis un nouveau mot de passe d'au moins 8 caractères, et te revoilà dans le Hub.",
        resultat:
          "Un email de réinitialisation arrive dans ta boîte, et une fois le nouveau mot de passe validé tu peux te reconnecter aussitôt.",
        limites: [
          "Le mot de passe doit faire au moins 8 caractères, sinon la confirmation est refusée.",
          "Si l'email n'arrive pas, vérifie tes spams et que tu as bien saisi l'adresse exacte de ton compte.",
        ],
      },
      {
        id: "barre-du-haut",
        name: "La barre du haut (toujours là)",
        aQuoiCaSert: "Te repérer et naviguer depuis n'importe quelle page : accueil, recherche, ton compte.",
        quandUtiliser:
          "Tout le temps : elle est présente sur chaque écran. C'est ton point de repère permanent.",
        commentFaire: [
          "Clique sur le logo « Y · YPERSOA HUB » à gauche pour revenir à l'accueil.",
          "Utilise le champ de recherche au centre pour chercher dans tout le Hub.",
          "Repère ton email et ton rôle affichés à droite pour savoir qui tu es et ce que tu peux faire.",
          "Clique sur le bouton de déconnexion pour fermer ta session.",
        ],
        exemple:
          "Tu es perdue au fond de l'Atelier Production : un clic sur « Y · YPERSOA HUB » en haut à gauche te ramène à l'accueil sans avoir à fouiller dans les menus.",
        resultat:
          "Une barre fixe en haut de l'écran avec le logo cliquable, la recherche centrale, ton identité et le bouton de déconnexion.",
        limites: [
          "La barre du haut ne remplace pas la barre latérale de gauche : pour passer d'un atelier à l'autre, c'est la colonne de gauche.",
          "Pense à te déconnecter sur un poste partagé : ta session reste ouverte sinon.",
        ],
      },
      {
        id: "recherche-globale",
        name: "Chercher dans tout le Hub",
        aQuoiCaSert:
          "Retrouver en une frappe n'importe quel motif, commande, pack, couleur ou projet, où qu'il soit rangé.",
        quandUtiliser:
          "Dès que tu sais quoi chercher mais plus où c'est rangé. Inutile pour explorer une catégorie de bout en bout : passe plutôt par l'atelier concerné.",
        commentFaire: [
          "Clique dans la barre de recherche en haut (ou tape Cmd/Ctrl + K pour t'y poser directement).",
          "Saisis ton terme : un mot, un numéro de commande ou un code (« mariage », « 1002 », « YPM-007 »).",
          "Appuie sur Entrée.",
          "Clique sur un résultat pour ouvrir sa fiche.",
        ],
        exemple:
          "Tu cherches la commande livrée à Mouvaux : tu tapes « 1002 », Entrée, et la commande #1002 ressort en tête avec son statut. Un clic ouvre sa fiche de production.",
        resultat:
          "Des résultats groupés par famille (Commandes Shopify, Couleurs de fil, Palettes, Motifs YPM, Shoots du catalogue, Lookbooks, Règles broderie, Packs sociaux, Projets sociaux), chaque carte cliquable vers sa fiche.",
        limites: [
          "La recherche exige que TOUS les mots correspondent : « sweat rouge » ne sort rien si aucune fiche ne contient les deux mots.",
          "Limité à 30 résultats par famille : si tu cherches large, affine ton terme.",
          "Un numéro de commande ressort en priorité, qu'il soit tapé « 1002 » ou « #1002 ».",
        ],
      },
      {
        id: "roles-et-droits",
        name: "Les 4 rôles et ce qu'ils ouvrent",
        aQuoiCaSert:
          "Comprendre pourquoi tu vois (ou pas) certains ateliers : chaque rôle ouvre un périmètre précis.",
        quandUtiliser:
          "Quand un atelier manque dans ta barre de gauche, ou qu'un lien te renvoie ailleurs sans prévenir. C'est normal : ton rôle ne couvre pas cette section.",
        commentFaire: [
          "Regarde le libellé de ton rôle affiché en haut à droite (Admin, Créa, Production ou Lecture).",
          "Admin : accès total à tout le Hub.",
          "Créa : tableau de bord, Atelier DA, Shooting, Lookbook, Trends, Planable, et les référentiels prod motifs/palettes en lecture seule — mais pas la production.",
          "Production : tableau de bord, Atelier Production et ses référentiels — mais pas l'Atelier DA ni Planable. Lecture : seulement le tableau de bord et la recherche.",
        ],
        exemple:
          "Tu es en rôle Créa et tu cliques sur un lien vers les commandes de production : le Hub te ramène à l'Atelier Social. Ce n'est pas un bug — la production est réservée aux rôles Admin et Production.",
        resultat:
          "Ta barre latérale n'affiche que les ateliers autorisés, et toute tentative d'aller ailleurs te redirige proprement vers l'Atelier Social.",
        limites: [
          "Tu ne peux pas changer ton propre rôle : seul un admin le fait.",
          "Les pages interdites ne sont pas « grisées », elles redirigent : ne crois pas à un dysfonctionnement si tu reviens à l'Atelier Social.",
          "Le rôle Lecture est volontairement très restreint (tableau de bord + recherche uniquement).",
        ],
      },
      {
        id: "le-livre",
        name: "Le Livre",
        aQuoiCaSert:
          "Vérifier en un clic la voix, la palette, le vocabulaire brand-safe et la signature « Bisous » de la marque avant de publier quoi que ce soit.",
        quandUtiliser:
          "Avant de publier un post, un article ou une carte, ou en cas de doute sur le ton à employer (quel cran de voix ?) ou sur une couleur à utiliser.",
        commentFaire: [
          "Clique « Le Livre » en bas de la barre latérale.",
          "Navigue entre les onglets : Identité, Visuel, Playbook, Mood.",
          "Repère le territoire (mot / geste / présence), le cran de voix (Citron / Zeste / Crème / Coton) adapté à ton contenu, et la checklist avant publication en fin de page.",
        ],
        exemple:
          "Avant de publier une carte pour un deuil, tu ouvres Le Livre, tu relis la règle du cran Coton : aucune vanne, aucune question de fin, signature silencieuse.",
        resultat: "Une référence de lecture complète sur la voix, les couleurs officielles, les 6 piliers stratégiques et le rituel Studio Mood.",
        limites: [
          "C'est une page de lecture : elle ne modifie rien dans le Hub.",
          "En cas de divergence, le document source `docs/VOIX_YPERSOA.md` fait foi sur le contenu affiché ici.",
        ],
      },
    ],
  },
  {
    id: "creer-visuels",
    num: 2,
    title: "Créer des visuels et du texte pour les réseaux",
    atelier: "Atelier Social",
    pitch:
      "C'est ton studio pour transformer un vêtement brodé en pack complet pour Instagram ou Pinterest. En haut de la page, 4 boutons de mode (Visuel produit / Avis client / Histoire de marque / Réel) donnent chacun accès à un générateur différent — les fiches ci-dessous couvrent d'abord le mode par défaut, Visuel produit : tu charges ta broderie, tu règles l'ambiance, l'occasion et tes mannequins, et l'IA te sort les visuels + le texte prêts à publier, config à gauche et résultats à droite.",
    features: [
      {
        id: "social-photo-produit",
        name: "Charger une photo produit",
        aQuoiCaSert: "Donner à l'IA le vêtement brodé exact qui servira de base à tous tes visuels.",
        quandUtiliser:
          "Au tout début de chaque génération, c'est l'étape obligatoire. Si tu n'as pas de packshot sous la main, pioche un motif du Référentiel ou un shot que tu as aimé dans le Shooting plutôt que de chercher un fichier.",
        commentFaire: [
          "Ouvre Atelier Social.",
          "Dans la colonne de gauche, va à la section « 2. Ton produit ».",
          "Glisse ta photo dans la zone « Glisse ta photo ici » (ou clique pour parcourir tes fichiers).",
          "Sinon, clique sur « Référentiel motifs Hub » pour piocher un motif existant, ou « Shot favori depuis Atelier Shooting » pour réutiliser un shot que tu as aimé.",
          "Pour repartir d'une autre image, clique sur « Changer la photo ».",
        ],
        exemple:
          "Tu lances une série Fête des Mères avec le sweat « MAMA CLUB » beige. Tu exportes le packshot depuis Shopify, tu le glisses dans « Glisse ta photo ici ». La vignette s'affiche : l'IA partira de cette broderie exacte, sans la déformer.",
        resultat:
          "Ta photo apparaît en vignette dans « Ton produit », et toutes les générations qui suivent partent de ce vêtement brodé.",
        limites: [
          "Formats acceptés : JPG, PNG, WEBP.",
          "Une image est obligatoire : sans elle, tu ne peux pas générer.",
          "Changer la photo te fait repartir de zéro : termine et sauvegarde ton pack avant de changer de base.",
        ],
      },
      {
        id: "social-produit-couleur",
        name: "Choisir le produit et sa couleur",
        aQuoiCaSert:
          "Verrouiller le support exact (type de vêtement + couleur) pour que l'IA ne t'invente pas un autre produit.",
        quandUtiliser:
          "Juste après avoir chargé ta photo, en bas de la même section. Indispensable dès que tu veux un rendu fidèle à ce que tu vends vraiment.",
        commentFaire: [
          "Reste dans la section « 2. Ton produit », partie basse.",
          "Choisis le produit dans la liste (YP001 hoodie, YP005 crewneck, YP019, YP021, YP022, YP023…).",
          "Sélectionne la couleur : les pastilles s'affichent avec l'aperçu mockup et la teinte exacte.",
          "Vérifie que la pastille sélectionnée correspond bien à la couleur que tu veux.",
        ],
        exemple:
          "Pour ta série Fête des Mères, tu choisis le crewneck YP005 en beige. L'IA est alors « verrouillée » : elle gardera ce crewneck beige sur tous les visuels, sans le transformer en t-shirt gris chiné ou en pull en maille.",
        resultat:
          "Le produit et la couleur sont verrouillés dans la génération (« product lock ») : tous tes visuels respectent ce support précis.",
        limites: [
          "La palette vient en direct du Hub : si un produit ou une couleur manque, c'est que le référentiel ne le propose pas encore.",
          "Si tu changes de produit en cours de route, relance une génération pour que ça soit pris en compte.",
        ],
      },
      {
        id: "social-vision-prompt",
        name: "Décrire ta vision",
        aQuoiCaSert: "Donner une direction libre à l'IA avec tes propres mots, en plus des réglages prédéfinis.",
        quandUtiliser:
          "Quand tu as une intention précise en tête (un type de femme, une couleur dominante, une atmosphère). À laisser vide si tu fais confiance aux réglages d'ambiance et d'occasion.",
        commentFaire: [
          "Va à la section « 1. Ta vision », tout en haut de la colonne de gauche.",
          "Écris en texte libre ce que tu imagines.",
          "Reste concrète : âge, attitude, couleurs, lieu fonctionnent bien.",
          "Laisse vide si tu n'as pas d'idée précise : ce champ est optionnel.",
        ],
        exemple:
          "Tu tapes « très coloré, femme brune 30 ans, ambiance parisienne lumineuse ». L'IA oriente le casting et le décor dans ce sens, en plus de l'ambiance et de l'occasion que tu as choisies par ailleurs.",
        resultat: "Ta description est injectée dans la génération des images ET du texte, pour coller à ton intention.",
        limites: [
          "Champ optionnel : pas besoin de le remplir pour générer.",
          "Reste dans l'esprit de la marque : inutile de demander des choses qui contredisent l'ambiance Ypersoa.",
          "Plus c'est concret, mieux l'IA suit ; les descriptions trop vagues changent peu le résultat.",
        ],
      },
      {
        id: "social-ambiance-vibe",
        name: "Choisir l'ambiance",
        aQuoiCaSert: "Donner l'atmosphère visuelle et le ton du pack (lumière, style, décor).",
        quandUtiliser:
          "À chaque génération, pour que tes visuels aient une direction artistique cohérente. Utilise un lookbook ❤️ actif quand tu veux coller à un moodboard que tu viens de construire.",
        commentFaire: [
          "Ouvre la section « 4. L'ambiance ».",
          "Choisis l'une des 6 ambiances officielles : Doux Minimaliste, Sépia Rétro, Sézane Mode, Émoï Émoï, Make My Lemonade ou Gamin Gamine.",
          "Ou sélectionne un lookbook ❤️ actif (créé dans Atelier Lookbook) si tu en as un en cours.",
          "Repère la date d'expiration affichée sur les lookbooks : ils ne restent valides que 7 jours.",
        ],
        exemple:
          "Pour ta série Fête des Mères, tu choisis « Émoï Émoï » : lumière douce, props délicats, rendu tendre. L'IA applique ce style à la fois sur les images et sur le ton du texte.",
        resultat: "L'esthétique choisie est injectée dans les images et dans le texte généré, pour un pack homogène.",
        limites: [
          "Les lookbooks ❤️ expirent au bout de 7 jours : passé la date affichée, ils disparaissent de la liste.",
          "Une seule ambiance à la fois : choisis celle qui colle le mieux à ta campagne.",
        ],
      },
      {
        id: "social-occasion",
        name: "Choisir l'occasion",
        aQuoiCaSert: "Caler le contexte de marque (Fête des Mères, Mariage, Noël…) pour que l'IA adapte le message.",
        quandUtiliser:
          "Dès que ton pack vise un temps fort précis. C'est aussi ce qui peut te suggérer automatiquement la bonne fiche Pinterest.",
        commentFaire: [
          "Va à la section « 5. L'occasion ».",
          "Choisis parmi les 11 occasions : Fête des Mères, Fête des Pères, Fête des Grands-mères, Mariage, Naissance, Saint-Valentin, Rentrée, Été, Noël, Quotidien…",
          "Si tu es en mode Pinterest, une fiche Pinterest adaptée peut t'être suggérée automatiquement.",
        ],
        exemple:
          "Tu sélectionnes « Fête des Mères ». L'IA oriente la caption et les hooks vers la tendresse et la transmission mère-fille, et te propose la fiche Pinterest la plus pertinente.",
        resultat: "Le contexte de l'occasion guide le ton du texte et peut pré-sélectionner ta fiche Pinterest.",
        limites: [
          "Une occasion à la fois.",
          "Choisis « Quotidien » si ton visuel n'est lié à aucun temps fort, pour éviter un message hors sujet.",
        ],
      },
      {
        id: "social-mannequins-canoniques",
        name: "Choisir tes mannequins",
        aQuoiCaSert: "Décider quels visages (tes canoniques) portent le vêtement brodé sur les visuels.",
        quandUtiliser:
          "Quand tu veux un casting précis et cohérent avec tes campagnes. Laisse vide si un visage aléatoire te convient.",
        commentFaire: [
          "Ouvre la section « 3. Tes mannequins ».",
          "Cherche un canonique ou filtre par Genre, Âge ou Type.",
          "Les favoris ⭐ apparaissent en tête de liste.",
          "Sélectionne jusqu'à 3 personnages.",
          "Laisse la sélection vide si tu préfères un visage non défini.",
        ],
        exemple:
          "Pour la Fête des Mères, tu choisis Clémence (la brune frange rideau, lèvres bordeaux) et la petite Félicie. L'IA les place ensemble, dans une scène mère-fille, en gardant leurs traits de référence.",
        resultat:
          "Les visages choisis servent de référence : tes mannequins apparaissent fidèlement sur les visuels générés.",
        limites: [
          "Maximum 3 mannequins par génération.",
          "Sans sélection, le visage sera aléatoire à chaque slide.",
          "Évite de mélanger des codes maquillage contradictoires : chaque canonique garde son style (Clémence garde son bordeaux, les naturelles restent no-makeup).",
        ],
      },
      {
        id: "social-plateforme-style",
        name: "Choisir la plateforme et le style",
        aQuoiCaSert: "Régler le format de sortie selon où tu vas publier (Instagram ou Pinterest).",
        quandUtiliser:
          "Avant de générer, pour obtenir le bon ratio d'image et le bon type de pack. Choisis Pinterest pour le moteur de recherche/save, Instagram pour le feed.",
        commentFaire: [
          "Va à la section « 6. Style » et au pied de page de la colonne gauche.",
          "Bascule sur « Instagram » ou « Pinterest ».",
          "En Instagram, choisis « Photo pure » (carré 1:1) ou « Avec texte » (4:5, prêt pour la surimpression).",
          "En Pinterest, le format 2:3 vertical (1000×1500) est imposé et tu obtiens 4 visuels.",
          "Vérifie le libellé du bouton de génération : il s'adapte à ton choix.",
        ],
        exemple:
          "Tu pars sur Pinterest pour semer tôt avant la Fête des Mères : le format 2:3 se cale tout seul, le bouton affiche « Générer mon shooting Pinterest (4 visuels) ». Pour une story feed, tu repasses sur Instagram « Avec texte » en 4:5.",
        resultat: "Le ratio d'image et le nombre de visuels sont calés, et le bouton de génération affiche le bon libellé.",
        limites: [
          "En Pinterest, le format 2:3 est imposé : tu ne peux pas le changer.",
          "« Photo pure » sort en 1:1 sans place pour l'overlay ; choisis « Avec texte » si tu veux écrire sur l'image.",
        ],
      },
      {
        id: "social-fiche-pinterest",
        name: "Choisir une fiche Pinterest",
        aQuoiCaSert:
          "Ancrer ta génération Pinterest sur une stratégie par motif : bons mots-clés, bon texte sur l'image, bons formats.",
        quandUtiliser:
          "Uniquement en mode Pinterest. C'est ce qui transforme un joli visuel en épingle qui se trouve dans la recherche et qui se save.",
        commentFaire: [
          "Passe d'abord en mode Pinterest (section 6).",
          "Ouvre la section « Fiche Pinterest » qui apparaît.",
          "Choisis la fiche motif adaptée (ex. « Chouchou Mamie », « La Brigitte », « Le Câlin »).",
          "Si tu as choisi une occasion, des fiches te sont déjà suggérées en priorité.",
          "La fiche cale automatiquement les mots-clés longue traîne, le texte de surimpression et les 4 formats.",
        ],
        exemple:
          "Pour la Fête des Grands-mères, tu choisis la fiche « Chouchou Mamie ». Elle apporte les mots-clés du genre « cadeau personnalisé grand-mère brodé », le texte à surimprimer, et les 4 formats : Hero flatlay, Désir porté serré, Association déclinaisons et Lifestyle.",
        resultat:
          "Tes épingles partent avec des mots-clés ciblés et des formats pensés pour le save et le clic, pas juste de jolies photos.",
        limites: [
          "Visible seulement en mode Pinterest.",
          "Le format vidéo process n'existe pas encore ici : le moteur ne génère que des images fixes.",
          "Une fiche par génération : choisis celle qui colle vraiment au motif et à l'occasion.",
        ],
      },
      {
        id: "social-generer-pack",
        name: "Générer le carrousel / shooting",
        aQuoiCaSert: "Lancer l'IA qui produit d'un coup tes visuels et tout le texte à partir de tes réglages.",
        quandUtiliser: "Une fois ta photo chargée et tes réglages posés. C'est le clic central de l'outil.",
        commentFaire: [
          "Vérifie que ta photo est chargée et tes réglages prêts.",
          "En bas de la colonne gauche, clique sur le bouton de génération.",
          "En Instagram il affiche « Générer mon carrousel (5 slides) », en Pinterest « Générer mon shooting Pinterest (4 visuels) ».",
          "Patiente : le message « Création… (5-7 min) » s'affiche, les images apparaissent au fil de l'eau.",
        ],
        exemple:
          "Avec ton crewneck MAMA CLUB beige, ambiance Émoï Émoï, occasion Fête des Mères et Clémence + Félicie en mannequins, tu cliques « Générer mon carrousel (5 slides) ». Au bout de quelques minutes, 5 visuels s'affichent à droite, avec la caption et les 5 hooks.",
        resultat: "Tu obtiens 5 visuels (Insta) ou 4 (Pinterest), plus le texte associé et un contrôle brand-safety.",
        limites: [
          "Compte 5 à 7 minutes : c'est normal, l'IA travaille en arrière-plan.",
          "Si le texte semble bloqué (« Impossible de générer le texte »), c'est souvent un quota OpenAI épuisé : un repli automatique évite que ce soit vide, mais recharge le crédit pour la pleine qualité.",
          "Ne change pas tes réglages pendant la génération.",
        ],
      },
      {
        id: "social-naviguer-carrousel",
        name: "Naviguer et trier le carrousel",
        aQuoiCaSert: "Parcourir tes visuels générés, garder les meilleurs et écarter les ratés.",
        quandUtiliser: "Juste après une génération, pour faire ton tri avant de sauvegarder ou de publier.",
        commentFaire: [
          "Regarde la colonne centrale : le visuel s'affiche en grand.",
          "Navigue avec les flèches précédent/suivant, les points indicateurs ou les miniatures cliquables.",
          "Au survol d'une slide : clique l'icône télécharger, marque « best » (cœur, ruban « Best ») ou supprime (croix + confirmation).",
          "Clique « Tout » pour télécharger toutes les images d'un coup.",
        ],
        exemple:
          "Sur tes 5 slides Fête des Mères, deux sortent vraiment du lot. Tu cliques le cœur sur ces deux-là (ruban « Best »), tu supprimes une slide où la broderie est mal cadrée, puis tu télécharges le reste.",
        resultat: "Tes meilleurs visuels sont marqués « Best », les ratés supprimés, et tu peux tout télécharger en un clic.",
        limites: [
          "La suppression demande une confirmation, mais reste définitive pour cette session : sauvegarde ton pack si tu veux le garder.",
          "Le « best » sert à repérer tes favoris, il ne publie rien automatiquement.",
        ],
      },
      {
        id: "social-overlay-texte",
        name: "Ajouter du texte sur l'image",
        aQuoiCaSert: "Poser une typo propre et lisible (titre, citation, signature) directement sur ton visuel.",
        quandUtiliser:
          "En mode « Avec texte » ou Pinterest, quand tu veux que l'occasion ou un hook vive sur l'image elle-même.",
        commentFaire: [
          "Va dans la colonne de droite, onglet « Overlay ».",
          "Choisis un des 5 gabarits : Title Bottom, Quote Center, Title Top Large, Signature Corner ou Banner Bottom Color.",
          "Sélectionne un de tes hooks générés ou écris un texte libre.",
          "Règle la couleur : Auto, Blanc ou Marine.",
          "Regarde l'aperçu temps réel, puis clique « Télécharger » pour récupérer le PNG.",
        ],
        exemple:
          "Sur ta plus belle épingle Pinterest Fête des Mères, tu choisis le gabarit « Title Bottom » et tu poses « Pour la maman la plus brodée » en marine. L'aperçu se met à jour tout de suite, tu télécharges le PNG fini.",
        resultat: "Tu récupères une image PNG avec ton texte intégré, en typo brand, prête à publier.",
        limites: [
          "Le texte est composé dans ton navigateur, jamais peint par l'IA sur l'image : c'est ce qui garantit une typo nette.",
          "L'onglet Overlay n'apparaît qu'en mode « Avec texte » ou Pinterest, pas en « Photo pure ».",
        ],
      },
      {
        id: "social-caption-hooks",
        name: "Récupérer le texte — Caption + Hooks (Insta)",
        aQuoiCaSert: "Copier la légende Instagram complète et ses 5 accroches prêtes à publier.",
        quandUtiliser: "Après une génération Instagram, au moment de rédiger ta publication.",
        commentFaire: [
          "Colonne de droite, ouvre l'onglet « Caption + Hooks ».",
          "Lis la caption narrative complète.",
          "Parcours les 5 hooks : Émotion, Question, POV, Humour, Affirmation.",
          "Clique « Copier » sur la caption ou sur le hook que tu veux.",
          "Vérifie l'indicateur brand-safety en haut : vert « Brand-safe ✓ » ou rouge avec le nombre de violations.",
        ],
        exemple:
          "Pour ta publi Fête des Mères, tu copies la caption qui parle de transmission, puis tu testes le hook POV « POV : tu découvres ce sweat brodé qui touche ton cœur » en première ligne. L'indicateur affiche « Brand-safe ✓ ».",
        resultat:
          "Tu as ta légende et tes 5 hooks copiables, avec un voyant qui te dit si le texte respecte les règles de marque.",
        limites: [
          "Onglet réservé au mode Instagram.",
          "Si le voyant passe au rouge, corrige avant de publier : c'est souvent un vouvoiement résiduel ou un terme interdit.",
          "Garde le tutoiement : on ne dit jamais « vous » chez Ypersoa.",
        ],
      },
      {
        id: "social-pin-seo",
        name: "Récupérer le texte — Pin SEO (Pinterest)",
        aQuoiCaSert: "Copier le titre, la description SEO et les tags optimisés pour ton épingle Pinterest.",
        quandUtiliser: "Après une génération Pinterest, pour remplir le titre, la description et les tags de ton épingle.",
        commentFaire: [
          "Colonne de droite, ouvre l'onglet « Pin SEO ».",
          "Récupère le titre (100 caractères max).",
          "Récupère la description (500 caractères max) ; les compteurs colorés (vert/ambre/rouge) t'alertent si tu dépasses.",
          "Parcours les tags groupés par intention : Saisonnier, Produit, Evergreen, Permanent.",
          "Clique « Copier » sur chaque élément.",
        ],
        exemple:
          "Pour ta fiche « Chouchou Mamie », tu copies le titre « Cadeau brodé personnalisé pour mamie », la description avec ses mots-clés naturels, et les tags evergreen + saisonniers. Tous les compteurs restent au vert.",
        resultat: "Tu as un titre, une description SEO et des tags prêts à coller dans Pinterest, calés sur les bons mots-clés.",
        limites: [
          "Onglet réservé au mode Pinterest.",
          "Respecte les compteurs : un compteur rouge signifie que tu dépasses la limite de la plateforme.",
          "Sur Pinterest, pas de hashtags dans la description : utilise bien les tags fournis.",
        ],
      },
      {
        id: "social-sauvegarder-pack",
        name: "Sauvegarder le pack dans le Hub",
        aQuoiCaSert: "Archiver ton pack (visuels + textes) pour le retrouver plus tard, depuis n'importe où.",
        quandUtiliser: "Une fois ta génération validée. C'est ce qui évite de tout reperdre quand tu fermes la page.",
        commentFaire: [
          "Après une génération, va au pied de page de la colonne gauche.",
          "Clique « Sauvegarder dans le hub ».",
          "Dans la fenêtre, vérifie le « Titre du pack » (déjà pré-rempli).",
          "Choisis une « Collection (dossier) » existante ou crée-en une nouvelle.",
          "Ajoute des « Notes » si besoin, puis valide.",
        ],
        exemple:
          "Ton pack Fête des Mères est prêt : tu cliques « Sauvegarder dans le hub », tu le ranges dans une collection « Campagne Mai 2027 » et tu notes « validé Sarah, à publier J-30 ». Il est archivé.",
        resultat: "Tes images et leurs métadonnées sont rangées dans la Bibliothèque, retrouvables par collection et par recherche.",
        limites: [
          "La sauvegarde s'appuie sur Supabase : si la connexion n'est pas configurée, l'enregistrement échoue.",
          "Bien ranger en collection dès le départ t'évite de chercher pendant des heures plus tard.",
        ],
      },
      {
        id: "social-exporter-telecharger",
        name: "Exporter / télécharger",
        aQuoiCaSert: "Récupérer tes visuels sur ton ordinateur, à l'unité ou en pack complet.",
        quandUtiliser: "Quand tu es prête à publier ou à transmettre tes visuels à quelqu'un.",
        commentFaire: [
          "Depuis le carrousel : survole une slide et clique l'icône télécharger pour un seul visuel.",
          "Clique « Tout » pour télécharger toutes les images l'une après l'autre.",
          "Depuis la Bibliothèque : ouvre un pack et clique « télécharger en ZIP » pour tout récupérer d'un coup (images + metadata), ou télécharge un slide précis.",
        ],
        exemple:
          "Tu télécharges en ZIP ton pack Fête des Mères depuis la Bibliothèque : tu obtiens un dossier avec les 5 slides nommées (ypersoa-slide-1…png) et le fichier de métadonnées, prêt à archiver ou à partager.",
        resultat: "Tes images sont sur ton ordinateur, nommées proprement, en fichiers séparés ou en un seul ZIP avec les métadonnées.",
        limites: [
          "Le « Tout télécharger » enregistre les images une par une : laisse ton navigateur finir.",
          "Le ZIP complet n'est disponible que depuis la Bibliothèque, donc seulement pour un pack déjà sauvegardé.",
        ],
      },
      {
        id: "social-ajouter-catalogue",
        name: "Ajouter un shot au catalogue",
        aQuoiCaSert: "Référencer un visuel généré dans le catalogue de shots pour le retrouver ensuite via la recherche.",
        quandUtiliser: "Quand un visuel mérite d'être réutilisé plus tard (par toi ou l'équipe), classé par motif et par occasion.",
        commentFaire: [
          "Depuis le carrousel ou la Bibliothèque, choisis le visuel à indexer.",
          "Ouvre l'ajout au catalogue (fenêtre dédiée).",
          "Renseigne le motif et la variante, le produit, le destinataire, l'occasion, des tags et un libellé.",
          "Valide pour l'enregistrer dans le catalogue de shots.",
        ],
        exemple:
          "Ton plus beau visuel MAMA CLUB beige, tu l'ajoutes au catalogue avec motif YPM-006, destinataire « maman », occasion « Fête des Mères », tags « émoï émoï, beige ». Plus tard, en cherchant « maman beige » dans la recherche globale, tu le retrouves direct.",
        resultat: "Le visuel est indexé dans le catalogue de shots et remonte dans la recherche globale et le catalogue motifs.",
        limites: [
          "Plus tu tagues précisément (motif, destinataire, occasion), plus tu le retrouveras vite.",
          "Un shot mal tagué se perd dans la masse : prends 30 secondes pour bien remplir les champs.",
        ],
      },
      {
        id: "social-fonds",
        name: "Générer un fond ou recolorer un motif SVG",
        aQuoiCaSert:
          "Créer des fonds de posts Instagram (motifs procéduraux) ou recolorer un motif SVG que tu fournis (tulipes, oiseau, cœur-prénoms…) sur ta palette de marque, sans passer par une génération IA.",
        quandUtiliser:
          "Quand tu as besoin d'un visuel graphique rapide et déterministe (fond de carrousel, carte, story) plutôt qu'une photo générée — ou quand tu veux réutiliser un motif signature existant dans de nouvelles couleurs.",
        commentFaire: [
          "Depuis Atelier Social, clique « Fonds » dans l'en-tête.",
          "Onglet « Générer un fond » : choisis un motif (Uni, Rayures, Pois, Carreaux, Cœurs, Fleurs), assigne une couleur de la palette à chaque rôle (Fond / Motif / Secondaire), règle densité et taille, choisis un format.",
          "Onglet « Recolorer un SVG » : colle ton SVG, le moteur détecte ses couleurs et propose de les remapper sur les couleurs de la palette (ou de garder l'originale).",
          "Si la couleur qu'il te faut n'est pas dans la palette, ajoute un « Amplificateur » (nom + hex + occasion optionnelle) — il reste propre à l'atelier social, pas remonté au brand book.",
          "Télécharge en PNG (raster, prêt à poster) ou en SVG (vectoriel, réutilisable).",
        ],
        exemple:
          "Pour la rentrée scolaire, tu ajoutes l'amplificateur « Rentrée · Kaki », tu l'assignes au rôle Motif sur un fond Pois en Crème, tu regénères 12 fonds avec des tirages différents pour ta série de posts.",
        resultat:
          "Un visuel vectoriel déterministe (même réglages = même rendu), aux couleurs exactes de ta palette, téléchargeable en PNG ou SVG.",
        limites: [
          "Aucune IA ici : c'est un moteur de génération procédurale, pas un générateur de scènes ou de mannequins.",
          "La recoloration reconnaît les couleurs en hex ou rgb() dans le SVG collé — les dégradés ou couleurs nommées (ex. « red ») ne sont pas détectés.",
          "Les amplificateurs sont propres à l'atelier social : ils n'apparaissent pas dans le brand book officiel.",
        ],
      },
      {
        id: "social-avis",
        name: "Générer la légende d'un avis client",
        aQuoiCaSert:
          "Transformer un avis client (copié depuis Shopify/Insta/mail) en légende Instagram complète — étoiles + merci, citation, mini-histoire, phrase-pont personnalisation, CTA, hashtags — pour accompagner la carte visuelle composée à la main dans Illustrator.",
        quandUtiliser:
          "Chaque fois que tu veux publier un avis client en post « Merci » : tu as l'avis, le prénom, le produit acheté et l'occasion, et tu veux la légende prête à coller sans réécrire le squelette à chaque fois.",
        commentFaire: [
          "Depuis Atelier Social, clique le bouton de mode « Avis client » en haut de la page.",
          "Colle le prénom de la cliente et l'avis tel quel (obligatoires).",
          "Précise le produit acheté et l'occasion / pourquoi si tu les as — la légende et les hashtags sont plus justes.",
          "Clique « Générer la légende », puis « Copier » pour coller la légende sous ton visuel Illustrator.",
        ],
        exemple:
          "Prénom « Justine », avis « Super qualité et broderie au top », produit « Sweat S&J brodé », occasion « Anniversaire de rencontre » → légende avec étoiles, citation, histoire du couple, phrase-pont et hashtags #broderiepersonnalisee #cadeaucouple #cadeauamoureux #hautsdefrance.",
        resultat:
          "Une légende Instagram complète, brand-safe (jamais « fait main », jamais vouvoiement, jamais référence machine), avec 6 hashtags dont #hautsdefrance toujours en dernier.",
        limites: [
          "Le squelette (étoiles, citation, structure) est verrouillé côté serveur — seule la mini-histoire est écrite par l'IA (OpenAI puis Gemini en repli, sinon un texte déterministe minimal).",
          "Produit et occasion sont détectés par mots-clés simples sur le texte libre pour choisir les hashtags — un texte inhabituel peut retomber sur des hashtags génériques.",
          "Ne génère pas le visuel (carte étoiles + citation) : ça reste composé à la main dans Illustrator.",
        ],
      },
      {
        id: "social-histoire",
        name: "Générer une histoire de marque (Connexion / Preuve / Communauté)",
        aQuoiCaSert:
          "Écrire un post de marque qui ne part ni d'un produit ni d'un avis : un manifeste, une coulisse d'atelier ou un contenu qui fait parler la communauté.",
        quandUtiliser:
          "Pour 3 des 6 piliers du Playbook — Connexion, Preuve, Communauté (les 3 autres, Réassurance / Qualification / Occasions, ont déjà leur outil : respectivement le mode Avis client, le mode Visuel produit, et la fiche Pinterest du mode Visuel produit).",
        commentFaire: [
          "Depuis Atelier Social, clique le bouton de mode « Histoire de marque » en haut de la page.",
          "Choisis ton pilier : Connexion (post de marque, sans produit ni avis précis), Preuve (matière, mains, atelier, une commande vraie) ou Communauté (avis, question — jamais de vente).",
          "En Connexion, choisis un « Angle » : Qui sommes-nous (présentation atelier, équipe, promesse), Lien (couple, famille, amis proches), Souvenir / Occasion (naissance, diplôme, départ, anniversaire, fêtes) ou Présence (distance, expatrié, deuil). En Preuve ou Communauté, choisis une « Fiche » dans la banque proposée.",
          "Si tu as une vraie histoire cliente, écris-la dans « Raconte-moi ton histoire » (optionnel, mais ancre le post — sinon il reste générique à l'angle).",
          "Coche « Teaser DTF » si tu veux glisser une mention du lancement DTF d'octobre (séries uniques, sur-mesure) en plus de la broderie.",
          "Passe entre les 3 onglets de résultat : Légende, Visuel, Carrousel.",
          "Clique « Générer le post », relis, copie.",
        ],
        exemple:
          "Pilier Connexion, angle « Souvenir / Occasion », tu racontes en 2 lignes une commande naissance récente : tu obtiens une légende « Pourquoi Ypersoa », prête à coller dans Planable, avec 5 hooks alternatifs et les hashtags.",
        resultat: "Une légende prête à coller dans Planable (avec 5 hooks alternatifs et les hashtags), plus un visuel/carrousel associé selon l'onglet choisi.",
        limites: [
          "Ce mode ne couvre que 3 des 6 piliers stratégiques du Livre — les 3 autres passent par d'autres modes/outils (cf. « quand l'utiliser »).",
          "Les banques de fiches Preuve et Communauté sont prédéfinies : si aucune ne convient, repars sur un angle Connexion en texte plus libre.",
          "Sans histoire cliente réelle dans le champ optionnel, le post reste générique à l'angle choisi.",
        ],
      },
      {
        id: "social-reel",
        name: "Préparer un script de Réel",
        aQuoiCaSert: "Cadrer un Réel plan par plan — le hook des 3 premières secondes, le texte de chaque plan, la légende — et générer un visuel par plan si besoin.",
        quandUtiliser: "Quand tu pars filmer et que tu veux un script prêt, plutôt que d'improviser devant la caméra.",
        commentFaire: [
          "Depuis Atelier Social, clique le bouton de mode « Réel » en haut de la page.",
          "Choisis ton pilier : Connexion, Preuve ou Communauté (même logique que le mode Histoire de marque).",
          "Onglet « Script » : remplis le champ proposé, clique « Générer le script ».",
          "Onglet « Focus motif » : choisis un ou plusieurs motifs, clique « Générer le réel », puis « Générer un visuel » sur les plans qui en ont besoin.",
          "Dans « Aperçu », télécharge ce dont tu as besoin.",
        ],
        exemple:
          "Pilier Preuve, onglet Script : tu obtiens un plan par plan (hook, coulisse atelier, révélation broderie, CTA), puis tu génères un visuel pour le plan « révélation » avant de partir filmer.",
        resultat: "Un script de Réel scène par scène, avec éventuellement un visuel généré par plan.",
        limites: [
          "Le Réel produit un script et des visuels fixes plan par plan — jamais un clip vidéo monté automatiquement.",
          "« Focus motif » nécessite de sélectionner un ou plusieurs motifs avant de générer.",
        ],
      },
    ],
  },
  {
    id: "projets-contenu",
    num: 3,
    title: "Piloter mes projets de contenu",
    atelier: "Atelier Social",
    pitch:
      "Tes idées de contenu ne vivent pas que dans ta tête : le Kanban contenu les met en colonnes, du concept à la publication. Tu vois d'un coup d'œil ce qui est à filmer cette semaine, ce qui attend en production et ce qui est déjà publié. Chaque projet porte son motif, ses destinataires, ses occasions et sa deadline.",
    features: [
      {
        id: "kanban-contenu",
        name: "Suivre mes projets de contenu (Kanban)",
        aQuoiCaSert: "Visualiser l'avancement de tous tes contenus sur un seul tableau, du concept à la publication.",
        quandUtiliser:
          "Pour piloter ta production de contenu au quotidien et repérer ce qui avance ou ce qui traîne. Inutile pour générer des visuels : ça, c'est l'Atelier Social.",
        commentFaire: [
          "Depuis l'Atelier Social, ouvre le Kanban contenu via le lien dans l'en-tête.",
          "Lis les 5 colonnes de gauche à droite : Concept → Shooting → À filmer cette semaine → Production → Publié.",
          "Repère une carte par son titre, son motif et ses pastilles (destinataires, occasions, produits).",
          "Pour faire avancer un projet, utilise les flèches gauche/droite de la carte pour le déplacer de colonne en colonne.",
        ],
        exemple:
          "Ton projet « Carrousel Fête des Pères » est en colonne Shooting. Une fois les photos prises, tu cliques la flèche droite : il passe à « À filmer cette semaine », puis « Production » quand le montage démarre.",
        resultat:
          "Un tableau à 5 colonnes où chaque carte montre son titre, son motif/variante, ses pastilles et sa deadline (avec une alerte ⚠️ si la date est dépassée).",
        limites: [
          "Pas de glisser-déposer : on déplace une carte avec les flèches gauche/droite, pas à la souris.",
          "Le Kanban contenu se trouve uniquement via le lien dans l'en-tête de l'Atelier Social — il n'est pas dans la barre latérale, facile à rater.",
          "Ne le confonds pas avec le Kanban prod ou la Zone de test, qui sont d'autres tableaux pour la production.",
        ],
      },
      {
        id: "creer-editer-projet",
        name: "Créer ou modifier un projet de contenu",
        aQuoiCaSert: "Poser un nouveau contenu sur le tableau avec tout son contexte, ou mettre à jour un projet existant.",
        quandUtiliser:
          "Quand une nouvelle idée de contenu démarre, ou pour ajuster un projet (changer son statut, sa deadline, ses occasions). Pas pour générer le visuel lui-même.",
        commentFaire: [
          "Dans le Kanban contenu, clique sur « + Nouveau projet » (ou clique une carte existante pour l'éditer).",
          "Renseigne le « Titre » (obligatoire) et choisis le « Statut » (la colonne de départ).",
          "Renseigne le « Motif (YPM-XXX) » et la « Variante », puis « Pour qui ? », « Occasion(s) » et « Produit(s) » (plusieurs choix possibles).",
          "Ajoute une « Deadline » et des « Notes » si besoin, puis clique « Créer le projet » (ou « Mettre à jour »).",
        ],
        exemple:
          "Tu lances un « Carrousel Fête des Pères » : titre saisi, statut Concept, motif YPM-003 Le Club, variante PAPA CLUB, « Pour qui ? » = papa, occasion = Fête des Pères, produit = sweat YP005, deadline au 10 juin. Tu cliques « Créer le projet » et la carte apparaît en colonne Concept.",
        resultat: "Une carte de projet complète sur le Kanban, avec ses pastilles et sa deadline, prête à avancer de colonne en colonne.",
        limites: [
          "Le « Titre » est le seul champ obligatoire ; sans lui, impossible de créer le projet.",
          "Le bouton « Supprimer » retire le projet définitivement du tableau — pas de corbeille.",
          "Ce projet ne génère pas de visuel tout seul : il sert à piloter, la création se fait dans l'Atelier Social.",
        ],
      },
    ],
  },
  {
    id: "blog",
    num: 4,
    title: "Tenir le rendez-vous du blog",
    atelier: "Blog",
    pitch:
      "Depuis la refonte du 20-21/08/2026, le Blog est un atelier de premier niveau, organisé autour d'un rituel hebdomadaire : le brouillon s'écrit, tu le relis et l'étoffes, puis tu le pousses sur Shopify le jeudi. C'est le même générateur d'articles qu'avant, dans une interface pensée pour la cadence plutôt que pour le réglage fin.",
    features: [
      {
        id: "blog-article-semaine",
        name: "Écrire l'article de la semaine",
        aQuoiCaSert: "Générer, relire et pousser l'article de blog hebdomadaire sans repartir de zéro.",
        quandUtiliser: "Le mercredi soir pour lancer le brouillon, le jeudi matin pour le relire et le publier.",
        commentFaire: [
          "Clique « Blog » dans la barre latérale.",
          "Renseigne le sujet et, si tu veux, l'angle en texte libre (laisse vide pour que le Blog en propose un dans la voix Ypersoa).",
          "Clique « Lancer le brouillon ».",
          "Relis le brouillon : le mot-compteur t'indique si tu es dans la cible (700-1100 mots).",
          "Si c'est trop court, clique « Étoffer le brouillon » ; si le résultat ne convient pas, clique « Régénérer ».",
          "Une fois satisfaite, clique « Copier pour Shopify » et colle le HTML dans ta fiche article Shopify.",
        ],
        exemple:
          "Mercredi soir tu tapes le sujet « idée cadeau broderie maman », tu laisses l'angle vide. Jeudi matin le brouillon affiche 850 mots, dans la cible : tu relis, cliques « Copier pour Shopify », et tu colles direct dans l'admin Shopify.",
        resultat: "Un brouillon d'article (titre, réponse directe, contenu) avec compteur de mots, et un bouton qui copie le HTML prêt à coller dans Shopify.",
        limites: [
          "Le bouton « Copier pour Shopify » copie le HTML de l'article — il n'y a pas, dans cette interface, de bouton séparé pour un bloc Liquid ou un export FAQ JSON-LD distinct : tout est dans ce même HTML.",
          "Le brouillon est un point de départ : c'est à toi de le relire avant de le publier.",
          "« Étoffer » et « Régénérer » relancent une génération : ça prend quelques secondes, ne ferme pas la page.",
        ],
      },
    ],
  },
  {
    id: "planning-tempo",
    num: 5,
    title: "Caler le tempo de la semaine",
    atelier: "Planning",
    pitch:
      "Depuis la refonte du 20-21/08/2026, Planning est un atelier de premier niveau centré sur le rythme hebdomadaire : où on en est cette semaine, ce que chaque équipe doit sortir (3 priorités maximum), et le brief de la personne qui écrit les publications. Ce n'est PAS le rétroplanning 2027 — celui-là reste dans Atelier DA (cf. section Diriger l'image de marque).",
    features: [
      {
        id: "planning-tempo-hebdo",
        name: "Suivre le tempo de la semaine",
        aQuoiCaSert: "Voir en un coup d'œil le thème de la semaine, ce qui est prévu (publications, article du jeudi) et les 3 priorités max de chaque équipe.",
        quandUtiliser: "En début de semaine pour se caler, ou à tout moment pour mettre à jour une priorité ou le brief de la semaine.",
        commentFaire: [
          "Clique « Planning » dans la barre latérale.",
          "Lis « Le tempo » : thème de la semaine, nombre de publications prévues, date de l'article du jeudi.",
          "Dans « Le fil de Maï », écris ou ajuste le brief de la semaine (angle, humeur, ce qu'on veut montrer) — la sauvegarde se fait automatiquement.",
          "Dans « Les 3 ateliers », ajoute jusqu'à 3 priorités par équipe (Créa / Prod / Comm) avec « + Ajouter », et fais-les avancer (à faire / en cours / fait).",
        ],
        exemple:
          "En ouvrant Planning le lundi, tu vois la semaine « Bonne Rentrée » (14 publications prévues, article jeudi 4), tu ajoutes la priorité Créa « Finaliser les visuels rentrée » et tu notes le brief de Maï pour le ton de la semaine.",
        resultat: "Une vue hebdomadaire à jour : thème de la semaine, brief éditorial, et jusqu'à 9 priorités (3 par équipe) avec leur statut.",
        limites: [
          "Volontairement limité à 3 priorités par équipe : le reste attend la semaine suivante plutôt que de tout entasser.",
          "Une priorité peut dépendre d'une autre (par ex. la Prod attend un envoi de la Créa) : elle reste bloquée tant que la dépendance n'est pas faite.",
          "Ne remplace pas le rétroplanning 2027 (Atelier DA) pour les campagnes long terme, ni le planning machines de chaque commande (Atelier Production).",
        ],
      },
    ],
  },
  {
    id: "studio",
    num: 6,
    title: "Studio — shooting, ambiances et vidéos",
    atelier: "Studio",
    pitch:
      "Studio est le point d'entrée unique pour tout ce qui est visuel de prise de vue : la pièce (Shooting), l'ambiance (Lookbook), le plan de tournage (Shooting Book) et l'humeur/Reel (Studio Mood). Les 4 outils qu'il regroupe n'ont pas changé, seul le chemin pour y arriver a bougé depuis la refonte du 20-21/08/2026 (avant, ils étaient dispersés entre la barre latérale directe et des cartes Atelier DA).",
    features: [
      {
        id: "studio-hub",
        name: "Choisir son terrain de jeu (accueil Studio)",
        aQuoiCaSert: "Aiguiller vers le bon outil visuel sans avoir à se souvenir où il vit.",
        quandUtiliser: "Dès que tu veux lancer un shooting, un moodboard ou une préparation vidéo et que tu ne sais pas par quel outil commencer.",
        commentFaire: [
          "Clique « Studio » dans la barre latérale.",
          "Choisis le parcours qui correspond à ton besoin : Shooting, Lookbook, Shooting Book ou Studio Mood.",
          "Tu es redirigée directement vers l'outil correspondant.",
        ],
        exemple:
          "Tu veux caler l'ambiance d'une nouvelle collection avant de shooter : tu ouvres Studio, tu cliques le parcours « Lookbook ».",
        resultat: "Un accueil avec 4 cartes cliquables, plus un raccourci vers la Bibliothèque visuelle.",
        limites: [
          "C'est un aiguillage, pas un outil en soi : les fiches suivantes décrivent ce que fait chaque parcours une fois dedans.",
          "Atelier Motion (génération vidéo) n'est pas un parcours Studio : il reste dans Atelier DA (cf. section Direction artistique).",
        ],
      },
      {
        id: "shooting-book",
        name: "Shooting Book (plan de shooting depuis un brief)",
        aQuoiCaSert:
          "Transformer un brief poétique en plan de shooting structuré (casting, ambiances, shotlist, hooks) et générer les premiers visuels d'un coup.",
        quandUtiliser:
          "Quand tu lances une campagne et que tu veux cadrer le shooting avant de produire. Pas le bon outil si tu veux juste une seule image vite faite pour un post : passe par Atelier Social.",
        commentFaire: [
          "Ouvre Studio (barre latérale), puis le parcours « Shooting Book ».",
          "Écris ton brief poétique (400 caractères max), choisis le produit Ypersoa et, si tu veux, le motif YPM.",
          "Charge le PNG du motif, règle la taille brodée (Petit / Moyen / Grand) et la couleur du support.",
          "Sélectionne tes ambiances préférées (les lookbooks ❤️ actifs apparaissent aussi).",
          "Choisis le format attendu (Instagram 5 angles / Pinterest 3 angles / Lookbook 12-20 / Shooting full pack / Hero banner), puis clique « Générer le plan ».",
          "Récupère chaque visuel avec « Télécharger », ou pousse-le avec « Envoyer vers Planable ».",
        ],
        exemple:
          "Pour la Fête des Mères tu pars du motif YPM-008 La Féline sur un sweat beige, brief « la douceur d'un matin partagé entre une mère et sa fille », ambiance Sépia Rétro, format Pinterest 3 angles. Le Book te sort un plan casting + shotlist + une image hero à valider.",
        resultat:
          "Un plan de shooting écrit (casting, ambiances, shotlist, hooks temporels) accompagné d'une image hero ou de N angles, téléchargeables un par un.",
        limites: [
          "Le bouton « Envoyer vers Planable » ne fonctionne que si tu es arrivée sur le Shooting Book depuis un lien Planable. Hors de ce contexte, il ne fait rien.",
          "C'est un point de départ : les images générées sont des pistes, pas des visuels finaux à publier tels quels.",
        ],
      },
      {
        id: "atelier-shooting-iframe",
        name: "Atelier Shooting (outil de shooting IA)",
        aQuoiCaSert:
          "Faire poser tes produits en shooting IA dans un atelier dédié, et remonter tes meilleures prises dans le reste du Hub.",
        quandUtiliser:
          "Quand tu veux travailler le shooting IA en profondeur, prise par prise. Les shots que tu marques « favoris » reviennent ensuite comme photo de base dans Atelier Social.",
        commentFaire: [
          "Ouvre Studio (barre latérale), puis le parcours « Shooting ».",
          "Travaille tes prises directement dans l'outil embarqué.",
          "Marque tes meilleures images en « favori » pour les retrouver ailleurs.",
          "Dans Atelier Social, section « Ton produit », choisis « Shot favori depuis Atelier Shooting » pour réutiliser une prise.",
        ],
        exemple:
          "Tu shootes la casquette YP013 avec le motif Le Roman en écriture muséo, tu retiens deux prises en favori, et tu les réutilises ensuite comme base pour générer un carrousel Insta.",
        resultat: "Tes prises de shooting IA, avec les favorites disponibles dans Atelier Social.",
        limites: [
          "C'est un outil embarqué qui tourne à part : il doit être lancé en parallèle, sinon tu tombes sur une page blanche. Si l'écran reste vide, préviens l'équipe technique.",
          "Réservé aux rôles admin et créa.",
        ],
      },
      {
        id: "atelier-lookbook-iframe",
        name: "Atelier Lookbook (moodboards d'ambiances)",
        aQuoiCaSert: "Construire des moodboards d'ambiances qui deviennent ensuite des « vibes » réutilisables partout dans le Hub.",
        quandUtiliser:
          "Quand tu veux définir une ambiance visuelle sur mesure pour une saison ou une campagne. Un lookbook que tu mets en ❤️ reste actif 7 jours et nourrit les ambiances ailleurs.",
        commentFaire: [
          "Ouvre Studio (barre latérale), puis le parcours « Lookbook ».",
          "Compose ton moodboard dans l'outil embarqué.",
          "Mets en ❤️ le lookbook que tu veux rendre actif.",
          "Retrouve-le ensuite comme ambiance dans Atelier Social, le Shooting Book et le référentiel Ambiances.",
        ],
        exemple:
          "Tu montes un moodboard « lumière dorée fin d'été » pour la collection de rentrée, tu le passes en ❤️, et il apparaît aussitôt dans le sélecteur d'ambiances d'Atelier Social pendant 7 jours.",
        resultat: "Des moodboards d'ambiance ; ceux en ❤️ alimentent les vibes d'Atelier Social, du Shooting Book et du référentiel Ambiances.",
        limites: [
          "Comme l'Atelier Shooting, c'est un outil embarqué qui doit tourner en parallèle : sans ça, page blanche.",
          "Un lookbook ❤️ n'est actif que 7 jours : sa date d'expiration s'affiche, repasse-le en ❤️ si tu veux le garder.",
        ],
      },
      {
        id: "studio-mood",
        name: "Studio Mood brodé (épisodes vidéo)",
        aQuoiCaSert:
          "Préparer et piloter des épisodes vidéo (Reels, Stories) autour des motifs brodés : brief, storyboard scène par scène, copy brand-safe et visuel de test, du brouillon à la publication.",
        quandUtiliser:
          "Quand tu veux créer du contenu vidéo ou Reel pour un motif ou une occasion. Pour les images fixes (carrousel, Pinterest), reste sur l'Atelier Social.",
        commentFaire: [
          "Ouvre Studio (barre latérale), puis le parcours « Studio Mood ».",
          "Clique « + Nouvel épisode » ou injecte la banque pré-remplie (12 épisodes) via « Injecter la banque ».",
          "Dans la fiche épisode, renseigne le titre, l'humeur (Tendresse, Fierté, Complicité…), le mot brodé, le motif YPM, le support et l'occasion.",
          "Clique « Générer le storyboard » pour obtenir un plan scène par scène (frames avec durée, description, note de montage).",
          "Clique « Générer le copy » pour obtenir le hook + la légende-question + les hashtags, vérifiés brand-safe.",
          "Génère un visuel de test en choisissant composition (flatlay ou porté), ratio (9:16 / 1:1 / 4:5) et canonique.",
          "Fais avancer le statut : Brouillon → Prêt à tourner → Tourné → Monté → Publié.",
        ],
        exemple:
          "Pour la Fête des Mères tu crées l'épisode « Tendresse matinale » sur le motif MAMA CLUB, sweat beige, humeur Tendresse. Tu génères le storyboard (5 frames) et le copy. L'épisode passe en « Prêt à tourner » : tu peux filer le plan à l'équipe.",
        resultat:
          "Un épisode complet avec storyboard scène par scène, hook + légende + hashtags brand-safe, et un visuel de test téléchargeable. Statut qui évolue jusqu'à « Publié ».",
        limites: [
          "Le storyboard est un guide de tournage, pas un script final : adapte les frames à ton matériel.",
          "La banque pré-remplie (12 épisodes) : ne clique « Injecter la banque » qu'une seule fois, sinon tu doubles les épisodes.",
          "La génération du visuel de test utilise Gemini : si IMAGE_OTHER s'affiche, change la composition ou le ratio et régénère.",
        ],
      },
    ],
  },
  {
    id: "direction-artistique",
    num: 7,
    title: "Diriger l'image de marque et gérer mes référentiels créa",
    atelier: "Atelier DA",
    pitch:
      "C'est ta direction artistique au quotidien : les visages de la marque, les ambiances, les vidéos, les déclinaisons éditoriales. Depuis la refonte du 20-21/08/2026, Atelier DA s'est resserré : Motifs créatif et Médiathèque ont rejoint la Bibliothèque, Shooting Book et Studio Mood ont rejoint Studio, Planning commun a rejoint Planning, l'ancien Atelier Blog est devenu l'atelier Blog de premier niveau, et Radar (ex-Atelier Trends) y a emménagé.",
    features: [
      {
        id: "atelier-motion",
        name: "Atelier Motion (vidéo IA)",
        aQuoiCaSert: "Générer des vidéos courtes à partir de tes shootings, ambiances ou packshots.",
        quandUtiliser:
          "Quand tu veux du mouvement : un reel narratif, une vidéo d'ambiance ou un packshot animé. Pas pour des images fixes (reste sur Atelier Social).",
        commentFaire: [
          "Ouvre Atelier DA, puis « Atelier Motion », et clique « Nouvelle vidéo ».",
          "Étape 1 : choisis le mode (Reel / Ambiance / Packshot).",
          "Étape 2 : choisis la source (par ex. une collection shooting).",
          "Étape 3 (mode Reel) : ajoute une image de style.",
          "Étape 4 : choisis le format (Court ~32s / 4 clips, ou Complet ~56s / 7 clips), écris ton brief éditorial et choisis le moteur.",
          "Suis l'avancement par statut (en attente → en cours → généré / échec) et lis les clips.",
        ],
        exemple:
          "Tu transformes une collection shooting MAMA CLUB en Reel court de 4 clips pour Instagram, avec un brief « tendresse du quotidien », et tu récupères les clips générés une fois le statut passé à « généré ».",
        resultat:
          "Des clips vidéo lisibles dans l'outil, suivis par statut, plus une liste « À faire manuel » pour ce qui reste à finaliser à la main.",
        limites: [
          "La génération vidéo prend du temps et peut échouer : surveille le statut « échec ».",
          "Certaines finitions ne sont pas automatiques : la liste « À faire manuel » te dit ce qu'il reste à faire toi-même.",
        ],
      },
      {
        id: "da-casting",
        name: "Casting / Mur des canoniques",
        aQuoiCaSert: "Retrouver d'un coup d'œil tous les visages-modèles de la marque et leurs histoires.",
        quandUtiliser:
          "Quand tu cherches le bon mannequin pour un visuel ou une campagne. Pour l'utiliser DANS une génération, passe plutôt par le sélecteur de mannequins d'Atelier Social.",
        commentFaire: [
          "Ouvre Atelier DA, puis la carte « Casting / Mur des canoniques ».",
          "Bascule entre « Mur » (toutes les têtes) et « Familles » (les lignées).",
          "Affine avec les filtres : famille esthétique (No-makeup / Maquillée chic), genre (Femmes / Hommes / Enfants / Ados), lieu, ou la recherche.",
          "Clique sur une tête pour ouvrir sa fiche complète et ses dispositifs liés.",
        ],
        exemple:
          "Tu prépares une campagne Fête des Mères et tu veux une maman « maquillée chic ». Tu filtres sur « Maquillée chic » : Clémence (38 ans, antiquaire à Honfleur) ressort. Un clic affiche sa fiche et ses duos/trios ❤️ associés.",
        resultat: "Une grille filtrable des 23 canoniques + 3 lignées familiales ; chaque fiche détaille bio, traits et dispositifs liés.",
        limites: [
          "C'est un référentiel de consultation : on ne génère pas d'image depuis cette page.",
          "Le casting est figé (23 canoniques) — on n'en crée pas ici.",
        ],
      },
      {
        id: "da-ambiances",
        name: "Référentiel d'ambiances",
        aQuoiCaSert: "Garder sous la main les ambiances officielles de la marque et leurs visuels de référence.",
        quandUtiliser:
          "Quand tu veux revoir une ambiance ou mettre à jour son image de référence. Pour construire une nouvelle ambiance, c'est l'Atelier Lookbook.",
        commentFaire: [
          "Ouvre Atelier DA, puis la carte « Ambiances ».",
          "Parcours les 6 ambiances officielles (Doux Minimaliste, Sépia Rétro, Sézane Mode, Émoï Émoï, Make My Lemonade, Gamin Gamine).",
          "Clique « Voir prompt EN » pour lire le prompt anglais associé à une ambiance.",
          "Pour changer l'image d'une ambiance, utilise « Uploader / Remplacer » (JPG, 5 Mo max).",
        ],
        exemple:
          "Tu veux rafraîchir l'image de référence de l'ambiance Sépia Rétro avec une prise récente plus douce : tu ouvres la fiche et tu cliques « Uploader / Remplacer ».",
        resultat: "Le catalogue des 6 ambiances officielles (image + prompt EN), plus les lookbooks ❤️ actifs venus de l'Atelier Lookbook.",
        limites: [
          "Les 6 ambiances officielles sont la base de marque : on remplace leur image, on ne les supprime pas.",
          "Les lookbooks ❤️ qui apparaissent ici sont temporaires (7 jours) et viennent de l'Atelier Lookbook, pas d'ici.",
        ],
      },
      {
        id: "da-incarnations",
        name: "Incarnations",
        aQuoiCaSert: "Gérer les déclinaisons éditoriales (MAMA CLUB, PAPA CLUB, DOG DAD GANG…) qui pilotent les options du configurateur Shopify.",
        quandUtiliser:
          "Quand tu crées ou ajustes une déclinaison commerciale d'un motif et que tu veux vérifier qu'elle est complète avant publication. Pas un outil de génération d'image.",
        commentFaire: [
          "Ouvre Atelier DA, puis la carte « Incarnations ».",
          "Filtre la liste (recherche, motif, statut, ton) ou crée avec « Nouvelle incarnation ».",
          "Dans une fiche, renseigne nom commercial, motif YPM, spec broderie, gabarits cibles, collections Shopify, ton éditorial, statut et notes.",
          "Utilise « Importer XLSX » pour charger en masse, ou l'export « Metafield Shopify » pour pousser vers la boutique.",
          "Ouvre « Audit production » pour repérer les trous, et « Exporter CSV » si besoin.",
        ],
        exemple:
          "Tu ouvres l'incarnation MAMA CLUB (motif YPM-003 Le Club), tu vérifies qu'elle a bien ses gabarits sweat et t-shirt, tu lui rattaches deux photos de la médiathèque, puis tu exportes son Metafield Shopify.",
        resultat: "Le référentiel des incarnations, leurs fiches complètes, l'import XLSX et la matrice d'audit motif × incarnation × gabarit (✓ / ⚠ / Manquant).",
        limites: [
          "L'audit signale les cases ⚠ et Manquant, mais c'est à toi de compléter les specs ou visuels manquants.",
          "Il existe deux « audits » dans le Hub (Incarnations et Médiathèque) présentés différemment : ne les confonds pas.",
        ],
      },
    ],
  },
  {
    id: "bibliotheque",
    num: 8,
    title: "Retrouver tout ce qui a été produit ou référencé",
    atelier: "Bibliothèque",
    pitch:
      "Depuis la fusion du 21/08/2026 (« tout au même endroit »), Bibliothèque est l'atelier de premier niveau où vivent les visuels, les motifs côté créatif, les produits, les packs sociaux sauvegardés et les articles de blog générés. Elle remplace les anciens points d'entrée dispersés (tiroir « Bibliothèque » de l'Atelier Social, carte « Médiathèque » et carte « Motifs » d'Atelier DA, page « Référentiel »).",
    features: [
      {
        id: "bibliotheque-hub",
        name: "Choisir son onglet (accueil Bibliothèque)",
        aQuoiCaSert: "Retrouver un visuel, un motif, un produit, un pack ou un article sans se souvenir de son ancien emplacement.",
        quandUtiliser: "Dès que tu cherches quelque chose de déjà produit ou déjà référencé et que tu ne sais pas dans quel onglet il vit.",
        commentFaire: [
          "Clique « Bibliothèque » dans la barre latérale.",
          "Choisis l'onglet : Visuels / Motifs / Produits / Packs / Articles.",
        ],
        exemple:
          "Tu cherches une ancienne photo de shooting MAMA CLUB : tu ouvres Bibliothèque, onglet Visuels, et tu la retrouves par ses tags.",
        resultat: "Un accueil à 5 onglets, chacun détaillé dans les fiches suivantes.",
        limites: [
          "Motifs et Produits gardent aussi des vues plus complètes et orientées métier ailleurs : Atelier DA pour le taggage créatif fin des motifs, Atelier Production pour les fiches techniques (DST, dimensions, fils) et pour le statut de vente détaillé des produits. La Bibliothèque en est la vue de recherche transverse.",
        ],
      },
      {
        id: "bibliotheque-visuels",
        name: "Onglet Visuels (médiathèque)",
        aQuoiCaSert: "Centraliser toutes tes photos (shooting, lifestyle, IA, packshot) au même endroit, taguées et statutées.",
        quandUtiliser:
          "Quand tu veux retrouver une photo, suivre son statut de validation ou récupérer son URL publique. C'est le seul endroit où toutes les images vivent ensemble.",
        commentFaire: [
          "Ouvre Bibliothèque (barre latérale), onglet « Visuels ».",
          "Cherche, trie (date / nom) et filtre par tags catégorisés.",
          "Pour ajouter des photos : « Ajout rapide » (auto-tag depuis le nom de fichier) ou déplie « Ajout détaillé » pour renseigner source / date / photographe / tags par lot.",
          "Ouvre une fiche photo pour changer son statut en 1 clic (À valider / Validée / Publiée Shopify / Archivée), écrire des notes, ou « Copier l'URL publique ».",
        ],
        exemple:
          "Tu déposes un lot de shooting nommés YPM-001_MAMA_CLUB_beige.jpg : l'Ajout rapide les tague tout seul. Tu passes ensuite les meilleures en « Validée » et tu copies l'URL publique de l'une d'elles pour Shopify.",
        resultat: "Une galerie centrale recherchable, des fiches photo avec statut, source, photographe, tags et notes auto-sauvegardées.",
        limites: [
          "Le « Mode sélection » affiche « Actions batch en Sprint 2 » : il s'affiche mais ne fait encore rien.",
          "L'« Ajout détaillé » est replié par défaut — pense à le déplier si tu veux renseigner source, date et photographe par lot.",
        ],
      },
      {
        id: "bibliotheque-motifs",
        name: "Onglet Motifs (catalogue créatif)",
        aQuoiCaSert: "Voir tes motifs YPM comme sur un site web et les taguer pour qu'on les retrouve facilement.",
        quandUtiliser:
          "Quand tu veux ranger, taguer ou explorer les motifs côté créa. Pour les fiches techniques (DST, dimensions, palettes), c'est l'Atelier Production.",
        commentFaire: [
          "Ouvre Bibliothèque (barre latérale), onglet « Motifs ».",
          "Navigue entre les 3 sous-onglets : « Motifs / Variantes / Catalogue ».",
          "Filtre par « Pour qui ? » (papa, maman, mamie…), « Occasion » et « Autres tags ».",
          "Ouvre la modale d'édition pour taguer le motif hero et chaque variante (destinataires, occasions, produits, tags libres), puis clique « Enregistrer tous les tags ».",
          "Utilise les liens « Utiliser dans Shooting » ou « Fiche technique » pour rebondir.",
        ],
        exemple:
          "Tu ouvres le motif YPM-003 Le Club, tu tagues sa variante « La Team » avec destinataire « équipe », occasion « Rentrée » et produit « sweat », puis tu cliques « Enregistrer tous les tags » pour qu'elle remonte dans la recherche.",
        resultat: "Une vue catalogue filtrable des motifs et variantes, des tags sauvegardés, et une galerie de shots catalogués par produit.",
        limites: [
          "Il existe une autre page « Motifs » côté Atelier Production, purement technique : ne confonds pas les deux. Ici c'est créa et taggage, là-bas c'est DST / dimensions.",
          "Cette page sert à organiser, pas à générer des visuels.",
        ],
      },
      {
        id: "bibliotheque-produits",
        name: "Onglet Produits",
        aQuoiCaSert: "Voir tous les produits disponibles sur le site avec leurs gammes de couleurs, depuis un seul endroit.",
        quandUtiliser: "Quand tu veux vérifier qu'un produit existe, combien de couleurs il propose, ou retrouver sa référence fournisseur.",
        commentFaire: [
          "Ouvre Bibliothèque (barre latérale), onglet « Produits ».",
          "Parcours les cartes produits (Hoodie Adulte YP001, Sweat Adulte YP005, T-Shirt Épais Adulte YP019, Casquette Vintage YP013…) : catégorie, fournisseur + référence (ex. Awdis JH001), nombre et pastilles des couleurs disponibles.",
          "Clique « Voir les fiches techniques (Atelier Production) » ou « Voir les palettes de fils (Atelier Production) » pour rebondir côté production.",
        ],
        exemple:
          "Une commande mentionne le t-shirt YP019 : tu ouvres Bibliothèque, onglet Produits, tu retrouves ses 10 couleurs disponibles et sa référence B&C (BC09T).",
        resultat: "Le catalogue des produits vendus sur le site avec leurs gammes de couleurs, plus deux raccourcis vers l'Atelier Production (fiches techniques, palettes de fils).",
        limites: [
          "C'est une vue en lecture : elle ne se modifie pas depuis cet onglet.",
          "Certains produits récents n'ont pas encore de fournisseur renseigné (référence affichée « — (—) », image grisée) : normal, pas une erreur d'affichage.",
        ],
      },
      {
        id: "bibliotheque-packs",
        name: "Onglet Packs (packs sociaux sauvegardés)",
        aQuoiCaSert: "Retrouver, consulter et rééditer tous les packs que tu as déjà sauvegardés depuis l'Atelier Social.",
        quandUtiliser:
          "Quand tu veux reprendre un ancien pack, le télécharger à nouveau, ou récupérer une caption. C'est le seul endroit où ton travail sauvegardé est conservé.",
        commentFaire: [
          "Ouvre Bibliothèque (barre latérale), onglet « Packs ».",
          "Filtre par collection, plateforme ou favori, ou tape ta recherche (plusieurs mots possibles).",
          "Clique une carte pour ouvrir le détail.",
          "Là, tu peux : supprimer, marquer favori ❤️, éditer la caption en ligne, ajouter un slide au catalogue, télécharger en ZIP ou télécharger un slide.",
        ],
        exemple:
          "Trois semaines après, tu retapes « MAMA CLUB » dans la recherche de l'onglet Packs, tu retrouves ton pack Fête des Mères, tu corriges un mot dans la caption et tu le retélécharges en ZIP pour le calendrier éditorial.",
        resultat: "Tu as accès à toute ton archive de packs, filtrable et rééditable, avec téléchargement à la carte.",
        limites: [
          "Depuis la refonte du 20-21/08/2026, ce n'est plus un tiroir dans l'en-tête de l'Atelier Social : c'est cet onglet de la Bibliothèque.",
          "Seuls les packs sauvegardés y apparaissent : un pack non enregistré est perdu en fermant la page.",
        ],
      },
      {
        id: "bibliotheque-articles",
        name: "Onglet Articles",
        aQuoiCaSert: "Consulter la liste des articles de blog déjà générés.",
        quandUtiliser: "Pour retrouver un article publié ou en brouillon sans rouvrir tout l'atelier Blog.",
        commentFaire: [
          "Ouvre Bibliothèque (barre latérale), onglet « Articles ».",
          "Parcours la liste des articles générés.",
        ],
        exemple:
          "Tu veux vérifier le titre exact de l'article publié deux semaines plus tôt : tu ouvres Bibliothèque, onglet Articles, tu le retrouves dans la liste.",
        resultat: "La liste des articles de blog générés (requête, date, statut).",
        limites: [
          "Onglet en lecture seule : pour relire, étoffer ou régénérer un article, retourne dans l'atelier Blog (cf. section Tenir le rendez-vous du blog).",
        ],
      },
    ],
  },
  {
    id: "planifier-equipes",
    num: 9,
    title: "Planifier le travail des équipes",
    atelier: "Atelier DA",
    pitch:
      "Un seul rétroplanning 2027 partagé entre la créa, la prod et la comm. Tu vois qui fait quoi et quand, en Gantt ou en liste, et tu cales tes campagnes dans le temps. C'est la vue d'ensemble qui aligne tout le monde.",
    features: [
      {
        id: "planning-commun",
        name: "Planning commun (créa / prod / comm)",
        aQuoiCaSert: "Piloter le rétroplanning 2027 des trois équipes au même endroit, avec leur charge et leurs réunions.",
        quandUtiliser:
          "Quand tu organises les campagnes de l'année et que tu veux voir l'enchaînement créa → prod → comm. Attention : ce n'est PAS le planning des machines à broder (celui-là vit dans chaque commande de l'Atelier Production).",
        commentFaire: [
          "Ouvre Atelier DA, puis la carte « Planning ».",
          "Bascule entre la vue « Gantt » (couloirs dans le temps) et la vue « Liste ».",
          "Filtre par Équipe (Créa / Prod / Comm) et par Statut, et suis la barre de progression « N/M fait ».",
          "Clique « + Ajouter un événement » : renseigne Titre, Date début (obligatoires), Date fin, Équipe, Type, Collection / campagne, Responsable.",
          "Ouvre un événement pour éditer Début, Fin, Responsable, faire tourner son statut (À faire / En cours / Fait) ou le supprimer.",
        ],
        exemple:
          "Pour le drop Fête des Mères, tu ajoutes un événement créa « Shooting MAMA CLUB » début mars, responsable Sarah, puis tu cales en Gantt la fenêtre comm Pinterest qui démarre 45 jours avant la deadline. La ligne rouge « aujourd'hui » te situe d'un coup d'œil.",
        resultat:
          "Une vue Gantt ou Liste du rétroplanning 2027 : couloirs par campagne, ligne « Charge prép. » (bandes ×2 / ×3 = double / triple run), ligne « Réunions » (★), ligne rouge du jour.",
        limites: [
          "Ne pas confondre avec le planning machines de la production (dans chaque commande, cf. section Production) : deux outils distincts qui portent le même mot « planning ».",
          "Ne pas confondre non plus avec l'atelier « Planning » de premier niveau (barre latérale) : celui-ci est le rétroplanning long terme 2027, l'autre est le tempo hebdomadaire des 3 équipes (cf. section Planning).",
          "Le volet comm ici est une vue de pilotage : ce n'est pas synchronisé en direct avec Planable.",
        ],
      },
    ],
  },
  {
    id: "tendances",
    num: 10,
    title: "Surveiller les tendances",
    atelier: "Atelier DA",
    pitch:
      "Avant de créer, sache ce qui monte : Radar (dans Atelier DA) rassemble les tendances Pinterest sur un seul tableau de bord. Une IA note chaque tendance et la relie à un motif et une occasion Ypersoa, pour transformer un signal en idée de broderie. Tu vois tout de suite ce qui est actionnable et ce qui est à écarter.",
    features: [
      {
        id: "atelier-trends",
        name: "Surveiller les tendances et les transformer en idées",
        aQuoiCaSert: "Repérer les tendances qui montent et savoir lesquelles valent un contenu Ypersoa, motif et occasion à l'appui.",
        quandUtiliser:
          "En amont d'une campagne ou pour nourrir ton planning éditorial. Inutile si tu sais déjà exactement quoi produire : passe directement à l'Atelier Social.",
        commentFaire: [
          "Ouvre Atelier DA puis Radar dans la barre latérale.",
          "Clique « Rafraîchir » pour récupérer les dernières tendances Pinterest.",
          "Clique « Analyser (IA) » pour que chaque tendance soit notée et reliée à un motif et une occasion.",
          "Affine avec les filtres Source, Signal (Montant / Saisonnier / Stable) et Type, et lis les cartes des sections « Actionnable » puis « Écartées ».",
        ],
        exemple:
          "Tu remarques que « chouchou personnalisé » grimpe sur Pinterest : tu cliques « Analyser (IA) », la carte affiche un score de 8/10, suggère le motif La Palette pour l'occasion Rentrée, propose un créneau Planable et un angle de caption. Tu la bascules en idée de contenu.",
        resultat:
          "Des cartes de tendance avec score 0-10 coloré, occasion + motif suggérés, créneau Planable, angle de caption, raison de pertinence et drapeau brand-safe — réparties en « Actionnable (score ≥5 & brand-safe) » et « Écartées ».",
        limites: [
          "Sans « Rafraîchir » puis « Analyser (IA) », les cartes restent vides ou non notées : les deux étapes sont nécessaires.",
          "Tu peux ajouter ou supprimer tes propres mots-clés Pinterest à la main dans la section dédiée, mais le scoring reste piloté par l'IA.",
          "Une tendance « Écartée » l'est souvent pour une raison brand-safety : vérifie le drapeau avant de forcer son usage.",
        ],
      },
    ],
  },
  {
    id: "production-broderie",
    num: 11,
    title: "Gérer la production broderie",
    atelier: "Atelier Production",
    pitch:
      "C'est l'atelier où la commande devient broderie. Tu y transformes un bon Shopify en fiche de prod planifiée sur tes deux machines, tu attribues les couleurs aux lettres, tu pioches dans tes motifs, fils et palettes, et tu suis chaque pièce jusqu'à l'expédition. Tout ce dont Adriana, Felismina et Rebecca ont besoin pour broder vite et bien est ici.",
    features: [
      {
        id: "prod-commandes-shopify",
        name: "Importer et suivre une commande Shopify",
        aQuoiCaSert:
          "Transformer un bon de préparation Shopify en fiche de production complète : motif, fils, durées, planning machines et suivi jusqu'à l'expédition.",
        quandUtiliser:
          "Dès qu'une commande payée arrive et doit passer en atelier. Le dépôt du PDF est réservé à l'admin. N'utilise pas l'import PDF pour une commande de test : crée plutôt une commande à la main.",
        commentFaire: [
          "Ouvre Atelier Production (barre de gauche), puis la carte « Commandes Shopify ».",
          "Pour une nouvelle commande, clique « Déposer un bon de préparation » et glisse le PDF Shopify : l'outil le lit et croise SKU, motif YPM, fils Gunold et durées.",
          "Vérifie l'aperçu, corrige le JSON éditable si besoin, puis clique « Créer la commande ».",
          "Ouvre la fiche : remplis le journal 4 étapes (DST → Broderie → CQ → Expédition) avec « Qui ? » et « Le ? » au fil de l'avancement.",
          "Pour planifier, choisis l'algo (OTIF par défaut ou LPT), pose la date de début et clique « Générer auto » puis lis le Gantt 2 machines.",
          "En fin de cycle, clique « Archiver » ; pour la relancer plus tard, « Désarchiver et remettre en prod ».",
        ],
        exemple:
          "Le bon #1002 arrive : 3 sweats brodés (motif Le Câlin YPM-006), livraison à Mouvaux. Tu déposes le PDF, l'outil reconnaît le motif, associe le fil Gunold et calcule 86 min de production. Tu valides : la commande passe « À planifier ». Tu génères le planning en OTIF, le Gantt répartit les articles sur TMEZ-1 et TMEZ-2. Adriana note la DST le 20/05, Felismina la broderie le 22/05, Rebecca l'expédition le 23/05.",
        resultat:
          "Une fiche commande avec ses articles, fils (hex + code Gunold), durées, un journal de suivi et un planning Gantt sur 2 machines. Statut qui évolue d'« À planifier » à « Expédiée » puis « Archivée ».",
        limites: [
          "Le dépôt du PDF est réservé au rôle Admin.",
          "Si un SKU n'est pas reconnu, un avertissement s'affiche : vérifie le mapping avant de créer.",
          "Le planning est par commande (pas encore un planning global qui empile plusieurs commandes du jour).",
        ],
      },
      {
        id: "prod-attribution-couleur-lettre",
        name: "Attribuer les couleurs aux lettres (moteur)",
        aQuoiCaSert:
          "Répartir automatiquement les couleurs de fil sur chaque lettre d'un texte multicolore, avec un rendu harmonieux et un ordre de broderie clair.",
        quandUtiliser:
          "Quand un client commande un texte personnalisé en plusieurs couleurs et que tu veux un rendu équilibré sans tâtonner. Inutile pour un mot monochrome simple : choisis juste le mode Monochrome.",
        commentFaire: [
          "Ouvre Atelier Production, puis « Moteur d'attribution » (page attribution).",
          "Choisis le motif et le mode : Monochrome (une couleur) ou Multicolore (couleur de fil OU gamme imposée, fils éditables, couleur du cœur).",
          "Saisis 1 à 4 lignes de texte (12 caractères max par ligne).",
          "Choisis la police (Russ Times, Arial Rounded, Looney, Diana, Museo ou Script New) et la couleur de fond.",
          "Clique « Lancer l'attribution » et lis le score d'harmonie, les violations et l'aperçu coloré.",
          "Si le résultat te plaît, clique « Sauvegarder », « Télécharger SVG » ou « Télécharger PDF ».",
        ],
        exemple:
          "Une cliente commande « LÉON » en 4 couleurs sur le motif La Palette. Tu passes en Multicolore, tu imposes une gamme chaude, tu choisis Russ Times et un fond crème. Tu cliques « Lancer l'attribution » : le solveur pose une couleur différente par lettre, affiche un bon score d'harmonie et te donne l'ordre de broderie. Tu télécharges le PDF pour Felismina.",
        resultat:
          "Un aperçu coloré du texte, un score d'harmonie avec les éventuelles violations, et une légende (distribution des couleurs + ordre de broderie). Tu peux sauvegarder ou exporter en SVG/PDF.",
        limites: [
          "12 caractères maximum par ligne, 4 lignes maximum.",
          "Un score bas signale un déséquilibre : relance avec une autre gamme plutôt que de forcer.",
        ],
      },
      {
        id: "prod-bibliotheque-attributions",
        name: "Retrouver tes attributions sauvegardées",
        aQuoiCaSert: "Garder sous la main toutes les attributions couleur déjà validées pour les réutiliser sans tout refaire.",
        quandUtiliser:
          "Quand un motif ou un combo couleurs revient souvent et que tu veux repartir d'une base validée. Pratique aussi pour comparer deux versions avant de trancher.",
        commentFaire: [
          "Ouvre le « Moteur d'attribution » et descends en bas de page jusqu'à la bibliothèque.",
          "Repère l'attribution voulue grâce à ses pastilles palette, son texte, son mode, son score et sa date.",
          "Clique « Restaurer » pour la recharger dans le moteur, ou renomme-la / supprime-la.",
        ],
        exemple:
          "Tu as déjà fait une belle attribution « MAMAN » en camaïeu rose pour une commande Fête des Mères. Le mois suivant, une cliente veut le même esprit : tu descends dans la bibliothèque, tu repères la pastille rose, tu cliques « Restaurer », tu changes juste le prénom et tu réexportes.",
        resultat: "La liste de tes attributions enregistrées avec aperçu palette, texte, mode et score ; un clic « Restaurer » les recharge dans le moteur.",
        limites: [
          "La bibliothèque est en bas de la page d'attribution : il faut scroller pour la voir.",
          "Une suppression est définitive : restaure plutôt si tu hésites.",
        ],
      },
      {
        id: "prod-fiche-impression-attribution",
        name: "Imprimer la fiche atelier d'une attribution",
        aQuoiCaSert: "Obtenir une feuille A4 prête pour l'atelier, avec les lettres colorées, les numéros d'aiguille et les codes Gunold.",
        quandUtiliser:
          "Juste avant de lancer la broderie d'un texte multicolore, pour que la brodeuse ait la fiche papier sous les yeux à la machine.",
        commentFaire: [
          "Dans le moteur d'attribution, finalise ton attribution.",
          "Clique « PDF » dans le moteur : la fiche d'impression s'ouvre (page attribution/print).",
          "Vérifie les lettres colorées, les numéros d'aiguille et la légende des codes Gunold.",
          "Clique « Imprimer / Enregistrer en PDF ».",
        ],
        exemple:
          "Pour la commande « LÉON » multicolore, tu cliques « PDF » : la feuille A4 s'affiche avec chaque lettre dans sa couleur, le numéro d'aiguille en face et les codes Gunold en légende. Tu l'imprimes et tu la poses à côté de la TMEZ-1 pour Felismina.",
        resultat: "Une feuille A4 imprimable (ou PDF) avec les lettres colorées, les aiguilles et les codes Gunold, prête à poser près de la machine.",
        limites: [
          "La fiche n'est accessible qu'après avoir cliqué « PDF » dans le moteur : il n'y a pas de lien direct depuis la navigation.",
        ],
      },
      {
        id: "prod-referentiel-motifs-ypm",
        name: "Consulter le référentiel motifs YPM (technique)",
        aQuoiCaSert:
          "Accéder à la fiche technique de chaque motif : dimensions, composition, palettes associées et fichiers DST/PXF/FT à télécharger.",
        quandUtiliser:
          "Quand tu prépares la broderie d'un motif et qu'il te faut ses dimensions, sa bible ou ses fichiers machine. C'est la vue prod ; pour le catalogue créatif et le taggage, va plutôt dans Atelier DA › Motifs.",
        commentFaire: [
          "Ouvre Atelier Production, puis « Motifs ».",
          "Choisis la vue « Galerie » ou « Bibles ».",
          "Clique sur un motif pour ouvrir sa modale : bible (dimensions, composition, palettes associées), fichiers et variantes.",
          "Télécharge le DST, le PXF ou la FT selon ton besoin.",
        ],
        exemple:
          "Avant de programmer Le Câlin (YPM-006) sur la machine, tu ouvres « Motifs », tu cliques sur sa carte, tu lis ses dimensions dans la bible et tu télécharges le fichier DST pour le charger dans la TMEZ.",
        resultat: "Une fiche technique par motif avec bible, palettes associées et fichiers DST/PXF/FT téléchargeables. 17 motifs et 80 variantes disponibles.",
        limites: [
          "Il existe une autre page « Motifs » côté Atelier DA, plus créative : ne les confonds pas, celle-ci est la vue technique.",
        ],
      },
      {
        id: "prod-referentiel-fils-gunold",
        name: "Gérer le référentiel fils Gunold",
        aQuoiCaSert: "Centraliser tes 33 couleurs de fil Gunold-Poly avec leur code, leur Pantone, leurs usages et leurs incompatibilités.",
        quandUtiliser: "Quand tu veux retrouver un code Gunold, marquer un fil comme favori ou canonique, ou ajouter une nouvelle couleur à ta gamme.",
        commentFaire: [
          "Ouvre Atelier Production, puis « Fils ».",
          "Parcours les fils classés en Canoniques TMEZ (★, 10 max), Gamme étendue et Archives.",
          "Clique sur un fil pour voir sa fiche : hex, code Gunold (validé ✓ ou TODO), Pantone TPG, usage, ambiance, incompatibilités et notes.",
          "Active les toggles « Favori B2C ⭐ » (8 max), « Canonique TMEZ ★ » ou « Archiver » selon le besoin.",
          "Pour une nouvelle couleur, clique « Nouveau fil » : le code se cherche tout seul dans le catalogue Gunold (300 codes).",
        ],
        exemple:
          "Tu veux un bordeaux pour une commande. Tu ouvres « Fils », tu repères le bordeaux, tu vérifies son code Gunold (validé ✓) et tu vois la liste des palettes qui l'utilisent. Tu le marques « Canonique TMEZ ★ » pour qu'il reste prioritaire à l'atelier.",
        resultat:
          "La liste de tes 33 fils Gunold classés, avec fiche détaillée par couleur et toggles favori/canonique/archive. La liste des palettes qui utilisent chaque fil est visible.",
        limites: [
          "10 canoniques TMEZ maximum et 8 favoris B2C maximum : c'est volontaire pour garder une gamme resserrée.",
          "Un code marqué TODO n'est pas encore validé : confirme-le avant de t'en servir en prod.",
        ],
      },
      {
        id: "prod-palettes-associations",
        name: "Composer et imprimer tes palettes",
        aQuoiCaSert: "Regrouper des fils en associations cohérentes (camaïeux ou multicolores) et sortir une fiche prod imprimable par palette.",
        quandUtiliser: "Quand tu prépares une gamme de couleurs réutilisable ou que tu veux donner à l'atelier la composition exacte d'une palette sur papier.",
        commentFaire: [
          "Ouvre Atelier Production, puis « Palettes ».",
          "Parcours les 13 palettes, organisées en favoris ♥ épinglés, palettes actives et archives.",
          "Clique sur une palette pour voir sa composition (fils, codes, Pantone, hex), l'éditer ou remplacer un fil.",
          "Active les toggles favori / archive selon l'usage.",
          "Clique pour ouvrir la fiche prod imprimable (A4) et l'envoyer à l'atelier.",
        ],
        exemple:
          "Tu prépares un camaïeu de roses pour une série Fête des Mères. Tu ouvres la palette, tu vérifies les codes Gunold et les Pantone, tu remplaces un fil un peu trop vif, tu l'épingles en favori ♥, puis tu imprimes la fiche prod A4 pour Adriana.",
        resultat: "Tes 13 palettes classées, une modale de composition éditable par palette, et une fiche prod A4 imprimable.",
        limites: [
          "La fiche prod imprimable s'ouvre depuis la palette, pas depuis la navigation : passe par la modale.",
          "Remplacer un fil dans une palette change sa composition partout : vérifie avant de valider.",
        ],
      },
      {
        id: "prod-base-produit",
        name: "Consulter la base produit",
        aQuoiCaSert: "Voir tous les supports en vente (sweats, t-shirts…) et leurs variantes couleur, avec packshot, fournisseur et statut de vente.",
        quandUtiliser: "Quand tu veux vérifier qu'un produit existe, retrouver sa couleur exacte ou savoir s'il est en vente sur Shopify ou seulement au catalogue.",
        commentFaire: [
          "Ouvre Atelier Production, puis « Base produit ».",
          "Parcours le catalogue des supports (YP001, YP004, YP019, YP021…).",
          "Ouvre un produit pour voir ses variantes couleur (hex, packshot, fournisseur) et le badge « En vente Shopify » ou « Catalogue ».",
        ],
        exemple:
          "Une commande mentionne le t-shirt YP019. Tu ouvres « Base produit », tu repères YP019, tu vérifies sa couleur, son packshot et son fournisseur, et tu confirmes qu'il porte bien le badge « En vente Shopify ».",
        resultat: "Le catalogue lecture de tes supports avec variantes couleur, packshots, fournisseurs et statut de vente.",
        limites: [
          "C'est une vue en lecture : la base produit se consulte ici, elle ne se modifie pas depuis cette page.",
        ],
      },
      {
        id: "prod-regles-contraintes-broderie",
        name: "Définir les règles & contraintes broderie",
        aQuoiCaSert: "Fixer les dimensions et ajustements de broderie par emplacement, pour cadrer aussi bien l'atelier que les générations d'images IA.",
        quandUtiliser: "Quand tu veux poser ou ajuster une règle de taille pour un placement, ou vérifier la contrainte d'un emplacement avant de broder.",
        commentFaire: [
          "Ouvre Atelier Production, puis « Règles ».",
          "Parcours les règles par placement (buste, poignet, centre, dos, nuque…) : dimensions max et défaut, ajustements 2XL/3XL, icône.",
          "Crée, édite ou supprime une règle selon le besoin.",
        ],
        exemple:
          "Tu constates qu'un motif buste dépasse en taille 3XL. Tu ouvres « Règles », tu vas sur le placement buste, et tu ajustes la dimension max pour le 3XL. Adriana et les générations IA suivront désormais cette nouvelle contrainte.",
        resultat: "La liste des règles par placement, modifiables, qui sert de source de vérité pour Adriana et pour les générations d'images.",
        limites: [
          "Une règle modifiée s'applique partout (atelier et IA) : change-la en connaissance de cause.",
        ],
      },
      {
        id: "prod-kanban-prod",
        name: "Suivre les sujets de prod (Kanban)",
        aQuoiCaSert: "Garder une vue claire des questions, bugs, améliorations, décisions et règles de l'atelier sur un tableau à colonnes.",
        quandUtiliser: "Quand un sujet de prod doit être noté, assigné et suivi jusqu'à résolution. Ce n'est pas le kanban de contenu (celui-là est côté Social).",
        commentFaire: [
          "Ouvre Atelier Production, puis « Kanban ».",
          "Ajoute un item en choisissant son type (question, bug, amélioration, décision, règle).",
          "Assigne-le à un membre de l'équipe.",
          "Fais glisser la carte de colonne en colonne : Backlog → Prochain → En cours → Testé → Fait.",
        ],
        exemple:
          "Felismina signale qu'un fil casse souvent sur la TMEZ-2. Tu crées un item « bug » dans le Kanban prod, tu l'assignes à Thierry et tu le déplaces vers « En cours ». Une fois réglé et vérifié, tu le passes en « Fait » : il s'archivera tout seul au bout de 7 jours.",
        resultat: "Un tableau 5 colonnes (Backlog → Prochain → En cours → Testé → Fait) avec items typés et assignés, archivage auto après 7 jours en « Fait ».",
        limites: [
          "Il existe plusieurs tableaux qui se ressemblent (Kanban contenu côté Social, Zone de test) : assure-toi d'être sur le Kanban prod.",
          "Une carte en « Fait » disparaît automatiquement après 7 jours.",
        ],
      },
      {
        id: "prod-zone-test",
        name: "Piloter la zone de test broderie",
        aQuoiCaSert: "Suivre les tests de broderie phase par phase, avec leurs fichiers DST/PXF/JPG et la personne en charge.",
        quandUtiliser: "Quand tu valides un nouveau motif ou un réglage avant de le passer en production réelle. C'est l'espace des essais, pas des commandes clients.",
        commentFaire: [
          "Ouvre Atelier Production, puis « Zone de test ».",
          "Clique « Nouveau test » pour créer une carte.",
          "Ajoute les fichiers DST/PXF/JPG (upload) et assigne le test (Adriana, Rebecca ou Cyrielle).",
          "Fais avancer la carte de phase en phase : En réception → En machine → Modification à prévoir → Modification faite → Validé.",
        ],
        exemple:
          "Tu testes une nouvelle variante du motif Le Club avant de l'ouvrir aux commandes. Tu crées un « Nouveau test », tu uploades le DST et un JPG d'aperçu, tu l'assignes à Adriana, puis tu suis la carte « En machine ». Après un ajustement, elle passe « Modification faite » puis « Validé ».",
        resultat: "Un tableau 5 phases avec des cartes de test, leurs fichiers téléchargeables et leur assignation, du « En réception » au « Validé ».",
        limites: [
          "La zone de test ressemble au Kanban prod mais sert aux essais broderie, pas au suivi des sujets : ne mélange pas les deux.",
        ],
      },
    ],
  },
];
