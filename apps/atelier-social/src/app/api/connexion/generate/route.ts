/**
 * API Route: /api/connexion/generate
 *
 * Générateur de post "pilier connexion" (Pourquoi Ypersoa) — contenu de marque,
 * pas lié à un produit ni à un avis client précis. 4 angles : qui_sommes_nous,
 * lien, souvenir, presence (cf. referentiels/charte_editoriale.json →
 * piliers_editoriaux_hub.connexion.angles, source de vérité éditoriale ;
 * dupliqué ici en TS pour rester dans le même pattern léger que PHRASES_PONT/
 * CTAS de /api/avis/generate plutôt que d'ajouter un loader fs pour 4 entrées).
 *
 * Même architecture que /api/avis/generate : cascade OpenAI → Gemini → repli
 * déterministe (jamais de réponse vide), brand-safety côté serveur.
 */

import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { GoogleGenAI } from "@google/genai";
import { loadInstagramHashtags } from "@/lib/instagram-hashtags.server";
import { buildInstagramHashtags } from "@/lib/instagram-hashtags";

export const runtime = "nodejs";
export const maxDuration = 30;

export type ConnexionAngle = "qui_sommes_nous" | "lien" | "souvenir" | "presence";

interface RequestBody {
  angle: ConnexionAngle;
  /** Teaser du lancement DTF (octobre 2026) en plus de la broderie — cf. memory project_dtf_lancement_octobre. */
  dtfTeaser?: boolean;
  /** Histoire/anecdote cliente réelle collée par Sarah, à utiliser comme matière — jamais recopiée mot pour mot. */
  histoireClient?: string;
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

// Red lines CLAUDE.md §2 — même liste que /api/avis/generate.
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
];

// Consumer-facing : aucune référence machine (mémoire feedback_vocab_fabrication).
const FORBIDDEN_TERMS_MACHINE = ["métier Tajima", "Tajima", "machine à broder"];

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
  },
};

const SYSTEM_PROMPT = `Tu es la voix Ypersoa pour Instagram — vêtements et accessoires brodés personnalisés, brodés à la commande dans notre atelier des Hauts-de-France.

# TÂCHE
Écris un post "pilier connexion" : un post de MARQUE, pas centré sur un produit ni un avis client précis. Il crée un lien identitaire avec Ypersoa — pourquoi la marque existe, ce qu'elle représente.

# IDENTITÉ DE MARQUE (à incarner, jamais à réciter)
- Promesse : offrir une pièce unique, brodée à la commande sur métier professionnel, chargée d'une intention personnelle — pour soi ou pour quelqu'un qu'on aime.
- Positionnement : premium accessible, artisanat industriel de précision, made in France.
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
Légende COURTE, punchy, conversationnelle (200-500 caractères MAX). JAMAIS un long paragraphe littéraire. 4 temps :
1. HOOK — 1 ligne avec 1 emoji max : la scène/le détail qui accroche l'avatar (cf. section STORYTELLING ci-dessus).
2. CORPS — 1 à 2 lignes COURTES et CONCRÈTES : Ypersoa comme réponse à ce que l'avatar vient de reconnaître, ancré sur l'angle demandé.
3. QUESTION D'ENGAGEMENT — 1 ligne qui invite à répondre en commentaire, dans la continuité de la scène du hook.
4. CTA — sur sa propre ligne, EXACTEMENT : "→ ypersoa.fr"

# TON
- Intime, pudique, sobre, chaleureux, direct — jamais publicitaire agressif, jamais "Hallmark", jamais maternaliste.
- INTERDIT le registre "poème" : pas de "chaque courbe raconte une histoire", "sublimer ton quotidien avec authenticité". On bannit ce ton ampoulé.
- Jamais d'urgentisme ("commandez maintenant", "offre limitée").

# RÈGLES ABSOLUES
- TOUJOURS tutoyer ("tu", "ton", "ta") — JAMAIS "vous", "votre", "vos"
- JAMAIS "brodé à la main" / "fait main" → dis "brodé à la commande", "brodé dans notre atelier des Hauts-de-France"
- JAMAIS de référence machine/équipement (PAS de "métier Tajima", PAS de "machine à broder")
- JAMAIS Etsy, Amazon, Vinted, marketplace
- Un seul atelier (Wattrelos) : toujours "notre atelier" au singulier, JAMAIS "nos ateliers"
- Vocabulaire de marque : personnalisation, à ton image, brodé à la commande, durable, Hauts-de-France

# HASHTAGS — N'EN ÉCRIS AUCUN
N'ajoute AUCUN hashtag dans la caption (ils sont ajoutés automatiquement après). La dernière ligne reste le CTA "→ ypersoa.fr".

# OUTPUT REQUIS — JSON STRICT
Les 5 hooks sont 5 tentatives DIFFÉRENTES d'accrocher le même avatar (pas 5 sujets différents) — chacun doit pouvoir remplacer la ligne 1 de la caption.
{
  "caption": "Légende COURTE 200-500 chars. Structure Hook / Corps concret / Question d'engagement / CTA (→ ypersoa.fr) avec retours à la ligne. AUCUN hashtag.",
  "hooks": [
    "Hook ÉMOTION (12-15 mots) — la scène/le détail qui accroche l'avatar, registre sensible",
    "Hook QUESTION (8-12 mots) — une question que l'avatar se pose déjà dans sa tête",
    "Hook POV (8-12 mots) — perspective vécue de l'avatar, format POV: ...",
    "Hook HUMOUR (8-12 mots) — léger sourire, jeu de mot, toujours depuis la situation de l'avatar",
    "Hook AFFIRMATION (8-12 mots) — promesse forte courte, adressée à l'avatar"
  ]
}

Réponds UNIQUEMENT en JSON valide, rien d'autre.`;

const errMsg = (e: unknown) => (e instanceof Error ? e.message : String(e));

async function runOpenAI(apiKey: string, userMessage: string): Promise<Record<string, unknown>> {
  const openai = new OpenAI({ apiKey });
  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userMessage },
    ],
    max_tokens: 700,
    temperature: 0.85,
  });
  const raw = completion.choices[0]?.message?.content;
  if (!raw) throw new Error("Pas de contenu OpenAI");
  return JSON.parse(raw);
}

async function runGemini(apiKey: string, userMessage: string): Promise<Record<string, unknown>> {
  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: { parts: [{ text: userMessage }] },
    config: {
      systemInstruction: SYSTEM_PROMPT,
      responseMimeType: "application/json",
      temperature: 0.85,
    },
  });
  const raw = response.text;
  if (!raw) throw new Error("Pas de contenu Gemini");
  return JSON.parse(raw);
}

function pickIndex(seed: string, mod: number): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return hash % mod;
}

export async function POST(request: NextRequest) {
  let body: RequestBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "JSON invalide" }, { status: 400 });
  }

  const angle = body.angle;
  const config = ANGLES[angle];
  if (!config) {
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

  const userMessage = `Angle demandé : ${config.nom}
Objectif de cet angle : ${config.objectif}
Contexte d'usage : ${config.contexteUsage}
Avatar à hooker (sa situation précise — le hook doit lui donner un déclic "c'est moi") : ${config.avatar}${dtfBlock}${histoireBlock}

Écris le post selon les consignes, ancré sur cet angle précis. Priorité absolue : le hook doit accrocher CET avatar, pas un public générique.`;

  let parsed: Record<string, unknown> | null = null;
  let source: "openai" | "gemini" | "fallback" = "openai";
  const engineErrors: string[] = [];

  const openaiKey = process.env.OPENAI_API_KEY;
  if (openaiKey) {
    try {
      parsed = await runOpenAI(openaiKey, userMessage);
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
        parsed = await runGemini(geminiKey, userMessage);
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

  if (!caption || hooks.length < 5) {
    source = "fallback";
    caption = config.fallbackCaption;
    hooks = [...config.fallbackHooks];
  }

  const bank = await loadInstagramHashtags();
  const rotate = pickIndex(`${angle}|${Date.now()}`, 997);
  const built = buildInstagramHashtags(bank, { rotate });
  const hashtagLigne = built.tags.join(" ");

  const brandSafety = checkBrandSafety(`${caption} ${hooks.join(" ")}`);

  const notice =
    source === "fallback"
      ? "Post généré sans IA (clés indisponibles ou erreur) — relis avant de publier."
      : source === "gemini"
        ? "Post généré par Gemini (repli OpenAI)."
        : undefined;

  return NextResponse.json({
    ok: true,
    angle,
    caption,
    hooks,
    hashtags: built.tags,
    hashtagLigne,
    brandSafety,
    source,
    notice,
    engineErrors: engineErrors.length ? engineErrors : undefined,
  });
}
