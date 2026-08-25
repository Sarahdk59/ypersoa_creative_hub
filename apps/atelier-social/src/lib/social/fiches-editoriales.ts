/**
 * Fiches éditoriales — piliers Preuve et Communauté (Le Livre §Playbook).
 *
 * Source de vérité unique, réutilisée par :
 *  - app/le-livre/sections/PlaybookSection.tsx (affichage doc/recette)
 *  - app/social/connexion/page.tsx + api/connexion/generate (génération réelle)
 *
 * Avant le 22/08/2026 ce contenu était dupliqué en dur dans PlaybookSection.
 * Extrait ici pour que le générateur s'appuie sur le même texte déjà validé
 * par Sarah (hookEcrit/question), plutôt que de le réinventer.
 */

export type Pilier = "connexion" | "preuve" | "communaute";

export interface Fiche {
  id: string;
  nom: string;
  star?: boolean;
  tagline: string;
  frequence: string;
  /** Description de la scène du frame 1 — sert aussi de plan 1 pour le Reels. */
  hookVisual: string;
  /** Gabarit texte avec placeholders ([Prénom], [l'idée...]) — jamais recopié tel quel par le générateur, une inspiration de ton. */
  hookEcrit: string;
  overlayStyle: "overlay" | "editorial";
  /** La question/CTA qui invite au commentaire ou au clic. */
  question: string;
  mojito: ("menthe" | "citron" | "rhum" | "sucre" | "bulles")[];
  mojitoCheck: string;
  traduction: string;
  reproductible: string;
  extra?: string;
}

export const FICHES_PREUVE: Fiche[] = [
  {
    id: "P1",
    nom: "Le déballage",
    tagline: "Le colis qui s'ouvre. Le vrai, filmé.",
    frequence: "Dès qu'une vraie commande part · vise 1×/semaine",
    hookVisual: "Colis fermé, papier de soie, ta main dessus. Macro. On ne voit pas encore la pièce.",
    hookEcrit: "Ce qu'il y a dans le colis de [Prénom].",
    overlayStyle: "overlay",
    question: "Tu veux voir le tien ? → configurateur en bio. (variante : « Commente TIEN »)",
    mojito: ["rhum", "menthe"],
    mojitoCheck: "On voit tes vraies mains et un vrai colis — pas un flatlay studio. Si c'est trop propre, c'est faux.",
    traduction:
      "Fond crème pour l'overlay texte. Filmé en atelier réel, lumière naturelle. Papier de soie en rouge coquelicot possible. Jamais l'équipement — la matière, le fil, tes mains. Vocabulaire : « brodé à la commande », « cousu pour durer ».",
    reproductible: "Chaque commande est un épisode. Numérotable (« Colis #47 »).",
  },
  {
    id: "P2",
    nom: "Photo produit ⟷ vrai",
    tagline: "Le split : la version catalogue, et ce qu'il s'est vraiment passé.",
    frequence: "2×/mois",
    hookVisual:
      "Split screen. Gauche : photo produit léchée. Droite : le chaos réel (atelier, chutes de fil, 4e tentative).",
    hookEcrit: "Ce que tu vois sur la photo ⟷ ce qu'il s'est vraiment passé.",
    overlayStyle: "editorial",
    question: "Team photo parfaite ou team coulisses ? Dis-moi en commentaire.",
    mojito: ["rhum"],
    mojitoCheck: "Tu te mets TOI en cible — pas le client, pas « les autres marques ».",
    traduction:
      "Marine en fond de la partie « vrai », crème sur la partie « photo ». Titre en Newsreader. La franchise du split fait le travail — pas besoin de fioritures.",
    reproductible: "Un « vrai » derrière chaque pièce. Format infini.",
  },
  {
    id: "P3",
    nom: "Étape X sur 47",
    tagline: "Le work-in-progress, avec le compteur autodérision.",
    frequence: "1×/semaine, Reels ou Story",
    hookVisual: "Macro sur le motif à moitié brodé, le fil en cours.",
    hookEcrit: "Étape 12 sur 47 avant que ce soit parfait (ou que je craque).",
    overlayStyle: "overlay",
    question: "À ton avis, ça part sur quelle nuance ? (pick-one, léger et vrai)",
    mojito: ["rhum", "citron"],
    mojitoCheck: "Le compteur est drôle ET vrai — l'obsession du détail assumée, pas la plainte.",
    traduction:
      "Overlay crème sur la matière réelle. Le compteur en Cafeteria bold (ou Arial Rounded). Une nuance de fil qui varie à chaque épisode = série.",
    reproductible: "Chaque commande a 47 étapes (ou 12, ou 3). Compteur infini.",
  },
  {
    id: "P4",
    nom: "À ton image : [Prénom]",
    tagline: "Une commande custom racontée. La preuve incarnée.",
    frequence: "Dès qu'un client envoie une photo",
    hookVisual: "La pièce portée, par le vrai client, dans sa vraie vie. Regram.",
    hookEcrit: "[Prénom] voulait [l'idée derrière le motif]. Voilà ce qu'on a brodé.",
    overlayStyle: "editorial",
    question: "Et toi, ce serait quoi TON motif ? (pick-one + amorce configurateur)",
    mojito: ["menthe", "citron"],
    mojitoCheck: "C'est l'histoire du client, pas ton argumentaire. Tu racontes pourquoi ce motif existe pour cette personne.",
    traduction:
      "Cadre discret teal autour de la photo client, prénom en Newsreader. RGPD/consentement : repost uniquement si le client a dit oui.",
    reproductible: "Chaque commande est un « À ton image ». Format signature, numérotable.",
    extra:
      "Comment collecter les photos (à brancher sur le hub) : un mot dans le colis (carte insert) + un DM automatisable à J+10 : « Si tu la portes, envoie-moi une photo — j'adorerais la montrer (avec ton accord). » Referme la boucle avis→visuel avec de vraies photos.",
  },
];

export const FICHES_COMMUNAUTE: Fiche[] = [
  {
    id: "C1",
    nom: "Le pick-one",
    star: true,
    tagline: "Le mécanisme roi. Si tu ne gardes qu'une fiche, c'est celle-là.",
    frequence: "1×/semaine minimum — ton moteur d'engagement",
    hookVisual: "Carrousel. Une idée / permission / mini-histoire par slide, sur une belle photo de matière ou d'atelier.",
    hookEcrit: "5 trucs que je me répète quand je doute sur une commande.",
    overlayStyle: "editorial",
    question: "Laquelle te parle le plus ? Dis-moi en commentaire. — c'est LA ligne.",
    mojito: ["menthe", "bulles"],
    mojitoCheck: "Chaque slide se lit d'une gorgée. Aucune ne sonne coach.",
    traduction:
      "Newsreader crème sur photo de matière réelle (fil, tissu, atelier) — pas de serif doré sur plage léchée. Une nuance de fil différente par slide = ta signature. Rouge coquelicot en accent sur la slide-question.",
    reproductible: "Infini. « 5 [n'importe quoi] » + « laquelle ? ». Gabarit à vie.",
  },
  {
    id: "C2",
    nom: "La note d'atelier",
    tagline: "La note à moi-même — mais vraie.",
    frequence: "1×/semaine, quand tu as un truc vrai en tête",
    hookVisual:
      "Ta note, écrite à la main, dans ton vrai carnet d'atelier ou épinglée sur une chute de tissu. Pas un Clairefontaine rose.",
    hookEcrit: "Note à moi-même : [la vraie pensée qui parle en fait à ta cliente].",
    overlayStyle: "editorial",
    question: "Ça te parle ? / Dis-moi si t'es pareille.",
    mojito: ["menthe"],
    mojitoCheck: "Intime et vrai. Écrit comme tu écris, pas comme une citation motivante.",
    traduction: "Ta vraie écriture sur ta vraie matière = déjà anti-beige par nature. Photo brute. Si overlay : marine sur crème.",
    reproductible: "Une note par jour dans ta tête. Format infini.",
  },
  {
    id: "C3",
    nom: "J'ai un avis",
    tagline: "L'opinion du mois. Le citron vert pur.",
    frequence: "1×/mois — rare = fort",
    hookVisual: "Toi, cash, face cam. Ou fond marine plein, texte gros.",
    hookEcrit: "Mon avis qui va pas plaire : [l'opinion qui pique].",
    overlayStyle: "editorial",
    question: "T'es d'accord ou pas ? Je lis tout.",
    mojito: ["citron"],
    mojitoCheck: "Une vraie opinion qui dérange un peu — pas un consensus déguisé.",
    traduction: "Fond marine, texte crème gros en Newsreader. Sobre, tranchant. Aucun emoji cœur.",
    reproductible: "Un avis par mois, facile. Format « J'ai un avis — édition [mois] ».",
  },
  {
    id: "C4",
    nom: "Commente [MOT]",
    tagline: "La capture Club, en douceur.",
    frequence: "2×/mois, jamais plus (sinon ça devient promo)",
    hookVisual: "Aperçu du lead magnet (guide d'entretien) ou une pièce en teaser.",
    hookEcrit: "Le guide pour que ta pièce brodée dure des années. Gratuit.",
    overlayStyle: "overlay",
    question: "Commente ENTRETIEN et je te l'envoie.",
    mojito: ["menthe", "bulles"],
    mojitoCheck: "Un cadeau utile, jamais une promo/réduction. Le Club, c'est l'accès — jamais le discount.",
    traduction:
      "Teal en dominante, Cafeteria (ou Arial Rounded). Le mot à commenter en majuscules, rouge coquelicot. Vit sur le feed/Stories, pas dans les Messages Etsy — la carte insert reste le canal compliant pour l'offre Club.",
    reproductible: "Un lead magnet = une campagne. Réutilisable à chaque drop.",
  },
];

export function findFiche(pilier: Pilier, ficheId: string): Fiche | undefined {
  const bank = pilier === "preuve" ? FICHES_PREUVE : pilier === "communaute" ? FICHES_COMMUNAUTE : [];
  return bank.find((f) => f.id === ficheId);
}

/** Reels shot-list dérivé mécaniquement du gabarit — sert de repli déterministe si l'IA échoue. */
export function fallbackReelsShotlist(fiche: Fiche): { plan: string; texte: string }[] {
  return [
    { plan: fiche.hookVisual, texte: fiche.hookEcrit },
    { plan: "Plan de coupe sur le geste ou la matière, 2-3 secondes, silence.", texte: "" },
    { plan: "Dernier plan, cadré serré, toi ou la pièce, regard caméra.", texte: fiche.question },
  ];
}
