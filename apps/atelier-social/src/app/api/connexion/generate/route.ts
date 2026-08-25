/**
 * API Route: /api/connexion/generate
 *
 * Générateur multi-piliers (22/08/2026) : couvrait uniquement le pilier
 * Connexion (4 angles) ; couvre désormais aussi Preuve et Communauté, dont
 * les 8 fiches (P1-P4/C1-C4) vivaient jusqu'ici seulement comme doc dans
 * Le Livre (lib/social/fiches-editoriales.ts) sans aucun outil pour les
 * produire réellement (colonne "à faire" du tableau des 6 piliers).
 *
 * - pilier "connexion" : 4 angles, qui_sommes_nous/lien/souvenir/presence
 *   (cf. referentiels/charte_editoriale.json → piliers_editoriaux_hub.connexion.angles,
 *   dupliqué ici en TS pour rester dans le même pattern léger que /api/avis/generate).
 * - pilier "preuve"/"communaute" : fiches P1-P4/C1-C4, le hookVisual/hookEcrit/
 *   question déjà validés par Sarah servent d'inspiration de ton à l'IA (jamais
 *   recopiés mot pour mot puisqu'ils contiennent des placeholders génériques).
 *
 * Chaque pilier produit désormais aussi un reelsShotlist (3-4 plans + voix-off/
 * overlay) — l'automatisation Reels/Carrousel demandée par Sarah le 22/08 : elle
 * garde sa voix (system prompt inchangé sur le fond), l'outil fait le découpage.
 *
 * Même architecture que /api/avis/generate : cascade OpenAI → Gemini → repli
 * déterministe (jamais de réponse vide), brand-safety côté serveur.
 */

import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { GoogleGenAI } from "@google/genai";
import { loadInstagramHashtags } from "@/lib/instagram-hashtags.server";
import { buildInstagramHashtags } from "@/lib/instagram-hashtags";
import { type Pilier, type Fiche, findFiche, fallbackReelsShotlist } from "@/lib/social/fiches-editoriales";

export const runtime = "nodejs";
export const maxDuration = 30;

export type ConnexionAngle = "qui_sommes_nous" | "lien" | "souvenir" | "presence";

interface ReelShot {
  plan: string;
  texte: string;
}

interface RequestBody {
  /** Défaut "connexion" pour compat avec les appels existants qui n'envoient pas ce champ. */
  pilier?: Pilier;
  angle?: ConnexionAngle;
  /** Requis si pilier = "preuve" | "communaute" (id de fiche, ex "P1", "C4"). */
  ficheId?: string;
  /** Teaser du lancement DTF (octobre 2026) en plus de la broderie — cf. memory project_dtf_lancement_octobre. Pilier connexion uniquement. */
  dtfTeaser?: boolean;
  /** Détail réel collé par Sarah (histoire cliente, anecdote, motif, avis...) — matière à incarner, jamais recopiée mot pour mot. */
  histoireClient?: string;
  /** "Étoffer le post" (UI) : redemande un passage sur le même brief avec un détail concret en plus, sans changer la fourchette de longueur. */
  develop?: boolean;
}

interface BrandViolation {
  term: string;
  position: number;
  severity: "critical" | "warning";
}

interface BrandSafety {
  safe: boolean;
  criticalViolations: BrandViolation[];
  warnings: BrandViolation[];
}

// Red lines CLAUDE.md §2 + Le Livre v1.0 §4 (table brand-safe) — même liste que /api/avis/generate.
const FORBIDDEN_TERMS_CRITICAL = [
  "brodé à la main",
  "brodés à la main",
  "brodée à la main",
  "brodées à la main",
  "broderie à la main",
  "fait main",
  "faite main",
  "marketplace",
  "Etsy",
  "Amazon",
  "Vinted",
  "Made in France",
  "fabriqué en France",
];

// Consumer-facing : aucune référence machine/fil, réservée au pro (mémoire feedback_vocab_fabrication).
const FORBIDDEN_TERMS_MACHINE = ["métier Tajima", "Tajima", "machine à broder", "Gunold", "Madeira", "Isacord"];

function checkBrandSafety(text: string): BrandSafety {
  const lower = text.toLowerCase();
  const criticalViolations: BrandViolation[] = [];
  const warnings: BrandViolation[] = [];

  for (const term of [...FORBIDDEN_TERMS_CRITICAL, ...FORBIDDEN_TERMS_MACHINE]) {
    const idx = lower.indexOf(term.toLowerCase());
    if (idx !== -1) {
      criticalViolations.push({ term, position: idx, severity: "critical" });
    }
  }

  const vouvoiementRegex = /\b(vous|votre|vos)\b/gi;
  let match;
  while ((match = vouvoiementRegex.exec(text)) !== null) {
    warnings.push({ term: match[0], position: match.index, severity: "warning" });
  }

  return { safe: criticalViolations.length === 0, criticalViolations, warnings };
}

interface AngleConfig {
  nom: string;
  objectif: string;
  contexteUsage: string;
  /** Qui ce post doit hooker en premier — sa situation précise, pas une cible démographique. */
  avatar: string;
  fallbackCaption: string;
  fallbackHooks: [string, string, string, string, string];
  fallbackReelsShotlist: ReelShot[];
}

// Reprend telle quelle referentiels/charte_editoriale.json → piliers_editoriaux_hub.connexion.angles
// (lien/souvenir/presence = ancien p2_emotion.sous_piliers, qui_sommes_nous = nouveau).
const ANGLES: Record<ConnexionAngle, AngleConfig> = {
  qui_sommes_nous: {
    nom: "Qui sommes-nous",
    objectif:
      "Présenter l'atelier, l'équipe, la promesse — l'héritage textile familial du Nord et le choix de la personnalisation comme liberté offerte au client.",
    contexteUsage: "post d'introduction, présentation d'équipe, storytelling atelier",
    avatar:
      "Quelqu'un qui scrolle sans connaître Ypersoa — méfiant des marques génériques, cherche une vraie raison de faire confiance avant d'acheter.",
    fallbackCaption: [
      "Encore une pub de « cadeau personnalisé » qui défile... attends une seconde. 🧡",
      "Enfants et petits-enfants des ouvriers des lainières du Nord, on brode à la commande dans notre atelier des Hauts-de-France — pour t'offrir la liberté d'être qui tu veux être.",
      "Tu nous découvres aujourd'hui — qu'est-ce qui t'amène ?",
      "→ ypersoa.fr",
    ].join("\n"),
    fallbackHooks: [
      "On ne brode pas des vêtements, on brode le droit de te démarquer — voilà pourquoi Ypersoa existe.",
      "Tu sais ce qui fait la différence entre un cadeau et un vrai cadeau ?",
      "POV : tu découvres l'atelier fondé par des enfants d'ouvriers du textile du Nord.",
      "20 ans de vente à distance, et toujours la même conviction : personnaliser, c'est se créer ses propres souvenirs.",
      "Une pièce unique, à ton image, brodée à la commande.",
    ],
    fallbackReelsShotlist: [
      { plan: "Toi, face cam, dans l'atelier, lumière naturelle.", texte: "On brode à la commande depuis Wattrelos, dans les Hauts-de-France." },
      { plan: "Plan sur tes mains qui choisissent une nuance de fil.", texte: "Chaque pièce part d'un choix qu'on fait avec toi, pas pour toi." },
      { plan: "Plan large sur une pile de pièces prêtes à partir.", texte: "Découvre l'atelier → lien en bio." },
    ],
  },
  lien: {
    nom: "Lien",
    objectif: "Le lien entre deux personnes, matérialisé par la broderie — couple, famille, amis proches.",
    contexteUsage: "couple, famille, amis proches",
    avatar:
      "Quelqu'un qui a une relation forte (couple, sœur, meilleure amie, ami d'enfance) qu'il a envie de marquer, mais que les cadeaux habituels trouvent trop impersonnels.",
    fallbackCaption: [
      "Encore un mug « meilleure amie » dans le panier ? On peut faire mieux 🧡",
      "Deux prénoms, une date, un mot qu'on garde pour soi : brodé à la commande, ça devient un lien qu'on porte.",
      "Et toi, tu le broderais pour qui ?",
      "→ ypersoa.fr",
    ].join("\n"),
    fallbackHooks: [
      "Il y a des liens qui se passent de mots, mais pas d'un prénom brodé.",
      "Et si le prochain cadeau que tu offrais racontait vraiment quelque chose ?",
      "POV : tu portes le prénom de la personne qui compte le plus.",
      "On ne juge pas si tu craques pour un porte-clés à deux prénoms.",
      "Un lien, brodé à la commande, à ton image.",
    ],
    fallbackReelsShotlist: [
      { plan: "Macro sur deux prénoms en cours de broderie.", texte: "Deux prénoms, un lien, brodé à la commande." },
      { plan: "Plan sur la pièce finie, portée par deux personnes proches.", texte: "Ce qu'on ne dit pas toujours à voix haute, on peut le broder." },
      { plan: "Cadré serré sur toi, regard caméra.", texte: "Et toi, tu le broderais pour qui ?" },
    ],
  },
  souvenir: {
    nom: "Souvenir / Occasion",
    objectif: "Le cadeau qui marque un moment — étape de vie (naissance, diplôme, départ) ou occasion récurrente (anniversaire, fête, saison).",
    contexteUsage: "naissance, diplôme, départ, anniversaire, fêtes calendaires",
    avatar:
      "Quelqu'un qui prépare un cadeau pour un moment précis qui approche (naissance, anniversaire, départ, diplôme) et qui cherche mieux qu'un cadeau passe-partout.",
    fallbackCaption: [
      "La date est dans ton agenda depuis des semaines. Le cadeau, pas encore 🧡",
      "Une naissance, un anniversaire, un départ : brodé à la commande dans notre atelier des Hauts-de-France, ce moment-là se garde longtemps.",
      "C'est quoi le souvenir que tu broderais ?",
      "→ ypersoa.fr",
    ].join("\n"),
    fallbackHooks: [
      "Certains cadeaux s'oublient. D'autres deviennent des souvenirs.",
      "Comment garder une trace d'un jour qu'on ne veut jamais oublier ?",
      "POV : tu ouvres un cadeau qui raconte exactement ce jour-là.",
      "Pas besoin d'un album photo pour se souvenir — un prénom brodé suffit.",
      "Un souvenir, brodé à la commande, qui dure.",
    ],
    fallbackReelsShotlist: [
      { plan: "Plan sur un calendrier ou une date entourée.", texte: "La date est dans ton agenda depuis des semaines." },
      { plan: "Plan sur la broderie en cours, motif lié à l'occasion.", texte: "Brodé à la commande, ce moment-là se garde longtemps." },
      { plan: "Plan final sur la pièce emballée.", texte: "C'est quoi le souvenir que tu broderais ?" },
    ],
  },
  presence: {
    nom: "Présence",
    objectif: "La présence malgré la distance — expatriés, deuil, éloignement.",
    contexteUsage: "distance, expatrié, deuil",
    avatar:
      "Quelqu'un dont une personne chère est loin (expatriée, en deuil, déménagée) et qui cherche un moyen de rester proche malgré la distance.",
    fallbackCaption: [
      "Le décalage horaire, encore. L'appel qui raccroche trop vite 🧡",
      "Un prénom, une date, un mot : brodé à la commande dans notre atelier des Hauts-de-France, ça reste avec toi même à des milliers de kilomètres.",
      "Qui est loin de toi, aujourd'hui ?",
      "→ ypersoa.fr",
    ].join("\n"),
    fallbackHooks: [
      "La distance n'efface rien quand on porte quelqu'un sur soi.",
      "Comment rester proche de quelqu'un qui est loin ?",
      "POV : tu portes la présence de quelqu'un que tu ne peux pas serrer dans tes bras.",
      "Le décalage horaire n'a jamais empêché un prénom d'être brodé.",
      "Une présence, brodée à la commande, à ton image.",
    ],
    fallbackReelsShotlist: [
      { plan: "Plan sur un téléphone affichant un décalage horaire ou une carte.", texte: "Le décalage horaire, encore." },
      { plan: "Plan sur la broderie d'un prénom en cours.", texte: "Un prénom, une date, un mot : ça reste avec toi, même loin." },
      { plan: "Plan sur la pièce portée, regard caméra.", texte: "Qui est loin de toi, aujourd'hui ?" },
    ],
  },
};

const SYSTEM_PROMPT = `Tu es la voix Ypersoa pour Instagram — vêtements et accessoires brodés personnalisés, brodés à la commande dans notre atelier des Hauts-de-France.

# TÂCHE
Écris un post "pilier connexion" : un post de MARQUE, pas centré sur un produit ni un avis client précis. Il crée un lien identitaire avec Ypersoa — pourquoi la marque existe, ce qu'elle représente.

# IDENTITÉ DE MARQUE (à incarner, jamais à réciter)
- Promesse : offrir une pièce unique, brodée à la commande sur métier professionnel, chargée d'une intention personnelle — pour soi ou pour quelqu'un qu'on aime.
- Positionnement : premium accessible, artisanat industriel de précision, brodé à la commande dans notre atelier de Wattrelos (JAMAIS "made in France" — allégation interdite, cf. RÈGLES ABSOLUES).
- Ce qu'on n'est PAS : pas une boutique Etsy, pas du mass market, pas du bas de gamme, pas de l'artisanal générique sans signature.
- Atelier à Wattrelos, Hauts-de-France — une petite équipe, pas une usine anonyme.
- Héritage : une équipe de passionnés, riche de 20 ans d'expérience dans la vente à distance — enfants et petits-enfants des ouvriers des lainières et des usines textiles du Nord. Le textile est une histoire de famille avant d'être un métier.
- Ce qu'on offre au client : la liberté d'être qui il veut être, le choix de se démarquer, de créer sa propre marque, ses propres souvenirs — la personnalisation comme émancipation, pas comme option.

# FOCUS OBLIGATOIRE — 4 phrases qui doivent transparaître (jamais citées telles quelles, toujours incarnées)
- On personnalise : la personnalisation EST le produit, pas un service en plus.
- On répond au besoin de nos clients : on part de ce que VIT ou VEUT le client (une envie, un besoin, un moment) — jamais du produit en premier.
- On crée pour eux : la marque est au service du client, jamais l'inverse. Jamais "on est doués" — toujours "on fait ça pour toi".
- On personnalise leur histoire : le post raconte l'histoire DU CLIENT (ce qu'il vit, ce qu'il offre, pourquoi), pas l'histoire de la marque en boucle.

# THÉMATIQUES À CONVOQUER (n'hésite pas à t'y ancrer, ce sont elles qui font le pilier connexion)
- Territoire local : les Hauts-de-France, l'atelier, le fait de broder ici plutôt que d'importer un cadeau générique.
- L'émotionnel : ce que ça change de porter quelque chose de pensé pour toi précisément — pas la fonction du vêtement, ce qu'il représente.
- L'histoire d'Ypersoa : une petite équipe qui a choisi de broder plutôt que de vendre du tout-fait — une conviction, pas un pitch marketing.
- La personnalisation : le cœur du produit — un prénom, un mot, une date, une couleur de fil choisie ; jamais une pièce générique.

# STORYTELLING — HOOKER L'AVATAR (priorité absolue sur le HOOK)
Un AVATAR précis t'est donné dans le message (sa situation, ce qu'il vit, ce qu'il cherche) — pas une cible démographique vague. Le HOOK doit le faire s'arrêter en 1 seconde avec un déclic "c'est moi, là". Pour ça :
- Ouvre sur une SCÈNE ou un DÉTAIL concret que l'avatar reconnaît immédiatement (un geste, un instant, un objet, une situation vécue) — jamais une déclaration abstraite sur la marque ou le produit.
- Évoque sa situation SANS la nommer platement (pas "toi qui es loin de ta famille" — plutôt un détail qui la fait reconnaître : un fuseau horaire, une valise, un appel qui raccroche).
- Le HOOK parle de LUI (sa vie, son besoin, son émotion), pas d'Ypersoa. Ypersoa arrive dans le CORPS, comme la réponse à ce qu'il vient de reconnaître.
- Interdit : les hooks génériques qui marcheraient pour n'importe quelle marque de cadeaux ("Certains cadeaux sont spéciaux 🧡" = à bannir, trop vague).

# STRUCTURE DE LA LÉGENDE (OBLIGATOIRE — exactement cet ordre, séparé par des retours à la ligne)
Légende COURTE, punchy, conversationnelle (200-500 caractères MAX). JAMAIS un long paragraphe littéraire. 4 temps, +1 optionnel :
1. HOOK — 1 ligne avec 1 emoji max : la scène/le détail qui accroche l'avatar (cf. section STORYTELLING ci-dessus).
2. CORPS — 1 à 2 lignes COURTES et CONCRÈTES : Ypersoa comme réponse à ce que l'avatar vient de reconnaître, ancré sur l'angle demandé.
3. QUESTION D'ENGAGEMENT — 1 ligne qui invite à répondre en commentaire, dans la continuité de la scène du hook. Privilégie une formulation "raconte-moi"/"dis-nous" quand le ton s'y prête (le post réchauffe, il ne vend pas) — jamais un "tag un pote" générique sur ce pilier.
3bis. (OPTIONNEL, rare — pas à chaque génération, JAMAIS sur l'angle "presence" en registre dur) — sa propre ligne : "Bisou Cœur." La signature Ypersoa, un mot doux avant de refermer. Ne remplace pas le CTA, s'ajoute avant lui.
4. CTA — sur sa propre ligne, EXACTEMENT : "→ ypersoa.fr"

# TON — le thermostat citron
Ypersoa est tendre AVEC une bouche : le mot juste et le mot vrai, et le mot vrai est parfois piquant. Le dosage est un thermostat à 4 crans :
- Coton (0) : tendresse pure, zéro clin d'œil, registre sacré (deuil, séparation dure) — n'utilise ce cran QUE si l'angle "presence" est traité sous cet aspect.
- Crème (1) : tendre et précis, aucune vanne, jamais mièvre — naissance, déclaration, présence douce.
- Zeste (2), DÉFAUT : chaleur + un clin d'œil + un détail vrai. C'est le réglage par défaut de ce post, sauf si l'angle appelle clairement Coton/Crème.
- Citron (3) : mordant, connivence — JAMAIS sur un post ancré produit/pièce, réservé au registre communauté/coulisses. Ne pas utiliser ici.
Règle de direction : on tape toujours AVEC l'avatar, contre le monde extérieur — jamais contre lui, jamais contre la personne qui reçoit le cadeau. Un souffle = un cran ; pas de vanne dans un post au ton de naissance/deuil.
- Intime, pudique, sobre, chaleureux, direct — jamais publicitaire agressif, jamais "Hallmark", jamais maternaliste.
- INTERDIT le registre "poème" : pas de "chaque courbe raconte une histoire", "sublimer ton quotidien avec authenticité". On bannit ce ton ampoulé.
- Jamais d'urgentisme ("commandez maintenant", "offre limitée").

# RÈGLES ABSOLUES
- TOUJOURS tutoyer ("tu", "ton", "ta") — JAMAIS "vous", "votre", "vos"
- JAMAIS "brodé à la main" / "fait main" → dis "brodé à la commande", "brodé dans notre atelier des Hauts-de-France"
- JAMAIS de référence machine/équipement (PAS de "métier Tajima", PAS de "machine à broder")
- JAMAIS Etsy, Amazon, Vinted, marketplace
- JAMAIS "Made in France" / "fabriqué en France" (allégation interdite légalement — la confection n'est pas française, seule la broderie l'est) → dis "brodé à la commande dans notre atelier de Wattrelos"
- Un seul atelier (Wattrelos) : toujours "notre atelier" au singulier, JAMAIS "nos ateliers"
- Vocabulaire de marque : personnalisation, à ton image, pour toi, brodé à la commande, durable, Hauts-de-France

# HASHTAGS — N'EN ÉCRIS AUCUN
N'ajoute AUCUN hashtag dans la caption (ils sont ajoutés automatiquement après). La dernière ligne reste le CTA "→ ypersoa.fr".

# REELS — DÉCOUPAGE EN PLANS
En plus de la caption, découpe le même contenu en 3-4 plans filmables pour un Reels de 10-20 secondes. Chaque plan a une direction visuelle concrète (ce qu'on filme, pas une ambiance vague) et un texte (voix-off ou overlay écrit — laisse "" si le plan doit rester silencieux). Le dernier plan porte la question/CTA.

# OUTPUT REQUIS — JSON STRICT
Les 5 hooks sont 5 tentatives DIFFÉRENTES d'accrocher le même avatar (pas 5 sujets différents) — chacun doit pouvoir remplacer la ligne 1 de la caption.
{
  "caption": "Légende COURTE 200-500 chars. Structure Hook / Corps concret / Question d'engagement / (optionnel : Bisou Cœur.) / CTA (→ ypersoa.fr) avec retours à la ligne. AUCUN hashtag.",
  "hooks": [
    "Hook ÉMOTION (12-15 mots) — la scène/le détail qui accroche l'avatar, registre sensible",
    "Hook QUESTION (8-12 mots) — une question que l'avatar se pose déjà dans sa tête",
    "Hook POV (8-12 mots) — perspective vécue de l'avatar, format POV: ...",
    "Hook HUMOUR (8-12 mots) — léger sourire, jeu de mot, toujours depuis la situation de l'avatar",
    "Hook AFFIRMATION (8-12 mots) — promesse forte courte, adressée à l'avatar"
  ],
  "reelsShotlist": [
    { "plan": "Direction visuelle concrète du plan 1", "texte": "Voix-off ou overlay, ou \\"\\" si silencieux" },
    { "plan": "Plan 2", "texte": "..." },
    { "plan": "Dernier plan — porte la question/CTA", "texte": "..." }
  ]
}

Réponds UNIQUEMENT en JSON valide, rien d'autre.`;

/**
 * System prompt Preuve/Communauté — même socle de règles (tutoiement, red
 * lines, hashtags) que SYSTEM_PROMPT, mais tâche différente : incarner une
 * fiche déjà écrite par Sarah (hookVisual/hookEcrit/question) plutôt qu'un
 * angle de marque. Les placeholders ([Prénom], [l'idée derrière le motif]…)
 * sont une inspiration de ton, jamais recopiés tels quels.
 */
function buildFicheSystemPrompt(pilier: "preuve" | "communaute"): string {
  const tache =
    pilier === "preuve"
      ? `Écris un post "pilier Preuve" : tu montres du réel — la matière, tes mains, l'atelier, une commande vraie. Ce que les autres marques planquent, Ypersoa le montre. Le post suit le mécanisme de la fiche donnée (déballage, avant/après, étape de fabrication, commande client racontée) — pas un argumentaire produit.`
      : `Écris un post "pilier Communauté" : tu ne vends rien, tu fais parler. Le post suit le mécanisme de la fiche donnée (pick-one, note d'atelier, avis, appel à commentaire) — l'objectif est le commentaire, pas le clic.`;

  // Défaut de cran par pilier (Playbook Le Livre v1.0 §6) : Preuve reste Zeste, Communauté peut monter à Citron.
  const cranDefault =
    pilier === "preuve"
      ? `DÉFAUT Zeste (2) : chaleur + un clin d'œil + un détail vrai. Ne monte pas à Citron ici — Preuve reste ancré dans le réel, pas dans la vanne.`
      : `DÉFAUT Zeste (2), peut monter à Citron (3) — mordant, connivence, autodérision — c'est le pilier où le Citron a sa place. Reste toujours Crème/Coton si la fiche touche un sujet sensible (deuil, difficulté réelle).`;

  return `Tu es la voix Ypersoa pour Instagram — vêtements et accessoires brodés personnalisés, brodés à la commande dans notre atelier des Hauts-de-France.

# TÂCHE
${tache}

# LA FICHE (mécanisme à suivre, PAS un texte à recopier)
Le message utilisateur te donne : le nom de la fiche, sa mécanique, une inspiration visuelle (hookVisual), une inspiration de hook écrit (hookEcrit — contient parfois des placeholders entre crochets, à remplacer par du vrai contenu si Sarah en a fourni, sinon à généraliser sans crochets), la question/CTA qui convertit, et un rappel "anti-beige" (ce qu'il faut éviter visuellement/tonalement).

# IDENTITÉ DE MARQUE (à incarner, jamais à réciter)
- Promesse : offrir une pièce unique, brodée à la commande sur métier professionnel, chargée d'une intention personnelle.
- Ce qu'on n'est PAS : pas une boutique Etsy, pas du mass market, pas de l'artisanal générique sans signature.
- Atelier à Wattrelos, Hauts-de-France — une petite équipe, pas une usine anonyme.

# TON — le thermostat citron
${cranDefault}
Règle de direction : on tape toujours AVEC l'avatar/la cliente, jamais contre elle ni contre qui reçoit le cadeau.
- Intime, pudique, sobre, chaleureux, direct — jamais publicitaire agressif, jamais "Hallmark", jamais "coach".
- INTERDIT le registre "poème" : pas de "chaque courbe raconte une histoire", pas de "sublimer ton quotidien avec authenticité".
- Une vraie franchise, un vrai détail concret — jamais une déclaration abstraite ou un consensus déguisé.

# STRUCTURE DE LA LÉGENDE (OBLIGATOIRE)
Légende COURTE, punchy, conversationnelle (150-400 caractères MAX). 3 temps :
1. HOOK — 1 ligne, la scène/le détail concret (inspiré du hookEcrit de la fiche, jamais recopié mot pour mot).
2. CORPS — 1 ligne courte qui ancre le hook dans le réel (l'atelier, la matière, la commande).
3. QUESTION D'ENGAGEMENT/CTA — sur sa propre ligne, reprend l'esprit de la question de la fiche.

# RÈGLES ABSOLUES
- TOUJOURS tutoyer ("tu", "ton", "ta") — JAMAIS "vous", "votre", "vos"
- JAMAIS "brodé à la main" / "fait main" → dis "brodé à la commande", "brodé dans notre atelier des Hauts-de-France"
- JAMAIS de référence machine/équipement (PAS de "métier Tajima", PAS de "machine à broder")
- JAMAIS Etsy, Amazon, Vinted, marketplace
- JAMAIS "Made in France" / "fabriqué en France" (allégation interdite légalement) → dis "brodé à la commande dans notre atelier de Wattrelos"
- Un seul atelier (Wattrelos) : toujours "notre atelier" au singulier, JAMAIS "nos ateliers"

# HASHTAGS — N'EN ÉCRIS AUCUN
N'ajoute AUCUN hashtag dans la caption (ils sont ajoutés automatiquement après).

# REELS — DÉCOUPAGE EN PLANS
Découpe le même contenu en 3-4 plans filmables pour un Reels de 10-20 secondes, en partant du hookVisual de la fiche comme plan 1 si c'est cohérent. Chaque plan a une direction visuelle concrète et un texte (voix-off/overlay, ou "" si silencieux). Le dernier plan porte la question/CTA.

# OUTPUT REQUIS — JSON STRICT
{
  "caption": "Légende COURTE 150-400 chars, structure Hook / Corps / Question-CTA, retours à la ligne, AUCUN hashtag.",
  "hooks": [
    "Hook ÉMOTION (12-15 mots)",
    "Hook QUESTION (8-12 mots)",
    "Hook POV (8-12 mots, format POV: ...)",
    "Hook HUMOUR (8-12 mots)",
    "Hook AFFIRMATION (8-12 mots)"
  ],
  "reelsShotlist": [
    { "plan": "Direction visuelle concrète du plan 1 (peut reprendre/adapter le hookVisual)", "texte": "Voix-off/overlay ou \\"\\"" },
    { "plan": "Plan 2", "texte": "..." },
    { "plan": "Dernier plan — porte la question/CTA de la fiche", "texte": "..." }
  ]
}

Réponds UNIQUEMENT en JSON valide, rien d'autre.`;
}

const errMsg = (e: unknown) => (e instanceof Error ? e.message : String(e));

async function runOpenAI(apiKey: string, systemPrompt: string, userMessage: string): Promise<Record<string, unknown>> {
  const openai = new OpenAI({ apiKey });
  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage },
    ],
    max_tokens: 800,
    temperature: 0.85,
  });
  const raw = completion.choices[0]?.message?.content;
  if (!raw) throw new Error("Pas de contenu OpenAI");
  return JSON.parse(raw);
}

async function runGemini(apiKey: string, systemPrompt: string, userMessage: string): Promise<Record<string, unknown>> {
  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: { parts: [{ text: userMessage }] },
    config: {
      systemInstruction: systemPrompt,
      responseMimeType: "application/json",
      temperature: 0.85,
    },
  });
  const raw = response.text;
  if (!raw) throw new Error("Pas de contenu Gemini");
  return JSON.parse(raw);
}

/** Normalise le reelsShotlist parsé (IA peu fiable sur la forme exacte) — jamais de plan sans direction visuelle. */
function parseReelsShotlist(raw: unknown): ReelShot[] {
  if (!Array.isArray(raw)) return [];
  const shots: ReelShot[] = [];
  for (const item of raw) {
    if (item && typeof item === "object") {
      const plan = "plan" in item ? String((item as { plan: unknown }).plan ?? "").trim() : "";
      const texte = "texte" in item ? String((item as { texte: unknown }).texte ?? "").trim() : "";
      if (plan) shots.push({ plan, texte });
    }
  }
  return shots;
}

function pickIndex(seed: string, mod: number): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return hash % mod;
}

/** Repli déterministe pour Preuve/Communauté — construit directement à partir du texte déjà validé par Sarah dans la fiche (jamais vide). */
function buildFicheFallback(fiche: Fiche, pilier: "preuve" | "communaute"): { caption: string; hooks: string[] } {
  const bodyLine =
    pilier === "preuve"
      ? "Brodé à la commande dans notre atelier des Hauts-de-France — ce que tu vois est vrai."
      : "Ça fait partie du métier, autant en parler.";
  const caption = [fiche.hookEcrit, bodyLine, fiche.question].join("\n");
  const hooks = [fiche.hookEcrit, fiche.question, `POV : ${fiche.tagline}`, `${fiche.nom} : ${fiche.hookEcrit}`, fiche.question];
  return { caption, hooks };
}

export async function POST(request: NextRequest) {
  let body: RequestBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "JSON invalide" }, { status: 400 });
  }

  const pilier: Pilier = body.pilier ?? "connexion";

  let systemPrompt: string;
  let userMessage: string;
  let fallbackCaption: string;
  let fallbackHooks: string[];
  let fallbackReels: ReelShot[];
  let seed: string;
  let responsePilierFields: Record<string, unknown>;

  if (pilier === "connexion") {
    const angle = body.angle;
    const config = angle ? ANGLES[angle] : undefined;
    if (!config || !angle) {
      return NextResponse.json(
        { ok: false, error: "Angle inconnu (qui_sommes_nous, lien, souvenir, presence)." },
        { status: 400 }
      );
    }

    const dtfBlock = body.dtfTeaser
      ? `\n\nTEASER DTF : Ypersoa lance le DTF (impression textile) à partir d'octobre 2026, en plus de la broderie — ça permet des séries uniques, sur-mesure selon l'envie du client, pour un event, un cadeau, une soirée ou pour toute la vie. Glisse un teaser léger de ce lancement dans le post (pas le sujet principal, une mention qui donne envie). Vocabulaire public pour le DTF : "imprimé à la commande" (même logique que "brodé à la commande" pour la broderie) — jamais "floqué", jamais de référence machine/industrielle.`
      : "";

    const histoireBlock = body.histoireClient
      ? `\n\nHISTOIRE CLIENTE RÉELLE (à t'en inspirer comme matière, ne JAMAIS la recopier mot pour mot, ne mentionne aucun nom si non fourni, respecte sa vie privée) : ${body.histoireClient}`
      : "";

    const developBlock = body.develop
      ? `\n\nDÉVELOPPE DAVANTAGE : approfondis le corps du post avec un détail concret supplémentaire ancré sur cet angle, sans dépasser la fourchette de caractères imposée.`
      : "";

    systemPrompt = SYSTEM_PROMPT;
    userMessage = `Angle demandé : ${config.nom}
Objectif de cet angle : ${config.objectif}
Contexte d'usage : ${config.contexteUsage}
Avatar à hooker (sa situation précise — le hook doit lui donner un déclic "c'est moi") : ${config.avatar}${dtfBlock}${histoireBlock}${developBlock}

Écris le post selon les consignes, ancré sur cet angle précis. Priorité absolue : le hook doit accrocher CET avatar, pas un public générique.`;
    fallbackCaption = config.fallbackCaption;
    fallbackHooks = [...config.fallbackHooks];
    fallbackReels = config.fallbackReelsShotlist;
    seed = angle;
    responsePilierFields = { angle };
  } else {
    if (!body.ficheId) {
      return NextResponse.json({ ok: false, error: "ficheId requis pour pilier preuve/communaute." }, { status: 400 });
    }
    const fiche = findFiche(pilier, body.ficheId);
    if (!fiche) {
      return NextResponse.json({ ok: false, error: `Fiche inconnue: ${body.ficheId}` }, { status: 400 });
    }

    const histoireBlock = body.histoireClient
      ? `\n\nDÉTAIL RÉEL FOURNI PAR SARAH (à utiliser comme matière, ne JAMAIS le recopier mot pour mot, respecte la vie privée du client) : ${body.histoireClient}`
      : "\n\nAucun détail réel fourni — généralise la fiche sans placeholder entre crochets ni prénom inventé.";

    const developBlock = body.develop
      ? `\n\nDÉVELOPPE DAVANTAGE : approfondis le corps du post avec un détail concret supplémentaire ancré sur cette fiche, sans dépasser la fourchette de caractères imposée.`
      : "";

    systemPrompt = buildFicheSystemPrompt(pilier);
    userMessage = `Fiche : ${fiche.nom} (${fiche.id})
Mécanique : ${fiche.tagline}
Fréquence d'usage : ${fiche.frequence}
Inspiration visuelle (hookVisual) : ${fiche.hookVisual}
Inspiration de hook écrit (hookEcrit, à réincarner, jamais recopier) : ${fiche.hookEcrit}
Question/CTA qui convertit : ${fiche.question}
Rappel anti-beige : ${fiche.mojitoCheck}${histoireBlock}${developBlock}

Écris le post selon les consignes, ancré sur cette fiche précise.`;

    const fb = buildFicheFallback(fiche, pilier);
    fallbackCaption = fb.caption;
    fallbackHooks = fb.hooks;
    fallbackReels = fallbackReelsShotlist(fiche);
    seed = `${pilier}:${fiche.id}`;
    responsePilierFields = { pilier, ficheId: fiche.id };
  }

  let parsed: Record<string, unknown> | null = null;
  let source: "openai" | "gemini" | "fallback" = "openai";
  const engineErrors: string[] = [];

  const openaiKey = process.env.OPENAI_API_KEY;
  if (openaiKey) {
    try {
      parsed = await runOpenAI(openaiKey, systemPrompt, userMessage);
    } catch (e) {
      engineErrors.push(`openai: ${errMsg(e)}`);
    }
  } else {
    engineErrors.push("openai: OPENAI_API_KEY manquante");
  }

  if (!parsed) {
    const geminiKey = process.env.GEMINI_API_KEY;
    if (geminiKey) {
      try {
        parsed = await runGemini(geminiKey, systemPrompt, userMessage);
        source = "gemini";
      } catch (e) {
        engineErrors.push(`gemini: ${errMsg(e)}`);
      }
    } else {
      engineErrors.push("gemini: GEMINI_API_KEY manquante");
    }
  }

  let caption = typeof parsed?.caption === "string" ? parsed.caption.trim() : "";
  let hooks = Array.isArray(parsed?.hooks) ? (parsed.hooks as unknown[]).map(String) : [];
  let reelsShotlist = parseReelsShotlist(parsed?.reelsShotlist);

  if (!caption || hooks.length < 5) {
    source = "fallback";
    caption = fallbackCaption;
    hooks = [...fallbackHooks];
  }
  if (reelsShotlist.length === 0) {
    reelsShotlist = fallbackReels;
  }

  const bank = await loadInstagramHashtags();
  const rotate = pickIndex(`${seed}|${Date.now()}`, 997);
  const built = buildInstagramHashtags(bank, { rotate });
  const hashtagLigne = built.tags.join(" ");

  const brandSafety = checkBrandSafety(`${caption} ${hooks.join(" ")} ${reelsShotlist.map((s) => s.texte).join(" ")}`);

  const notice =
    source === "fallback"
      ? "Post généré sans IA (clés indisponibles ou erreur) — relis avant de publier."
      : source === "gemini"
        ? "Post généré par Gemini (repli OpenAI)."
        : undefined;

  return NextResponse.json({
    ok: true,
    ...responsePilierFields,
    caption,
    hooks,
    reelsShotlist,
    hashtags: built.tags,
    hashtagLigne,
    brandSafety,
    source,
    notice,
    engineErrors: engineErrors.length ? engineErrors : undefined,
  });
}
