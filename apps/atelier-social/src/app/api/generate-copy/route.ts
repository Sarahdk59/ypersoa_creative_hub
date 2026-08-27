/**
 * API Route: /api/generate-copy
 *
 * Insta : caption courte structurée (hook/corps/question/CTA) + 5 hooks
 * Pinterest : titre court (100 chars) + description SEO (500 chars) + tags + 5 hooks
 */

import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { GoogleGenAI } from "@google/genai";
import { loadPinterestStrategy } from "@/lib/pinterest-strategy.server";
import {
  buildPinterestKeywords,
  productNounFor,
  type PinterestKeywords,
} from "@/lib/pinterest-strategy";
import { loadInstagramHashtags } from "@/lib/instagram-hashtags.server";
import {
  buildInstagramHashtags,
  type InstagramHashtags,
} from "@/lib/instagram-hashtags";
import { checkBrandSafety as checkBrandSafetyCore } from "@/lib/brand-rules";

export const runtime = "nodejs";
export const maxDuration = 90;

interface RequestBody {
  base64Image: string;
  mimeType: string;
  platform: "instagram" | "pinterest";
  vibeLabel: string;
  occasionContext: string;
  customPrompt?: string;
  canoniqueContext?: string;
  // Pinterest : fiche stratégie + occasion → mots-clés longue traîne pilotés
  pinterestFicheId?: string;
  occasionId?: string;
  productId?: string; // YP001… → la copy décrit CE produit (pas celui implicite de la fiche)
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

// Détection déléguée à lib/brand-rules.ts (source canonique, cf. Le Livre §4/§9) —
// cette fonction ne fait plus que reformer la forme { criticalViolations, warnings }
// attendue par les composants front (BrandSafetyBadge, VisuelWorkspace, PostCard, ResultPanel...).
function checkBrandSafety(text: string): BrandSafety {
  const { safe, violations } = checkBrandSafetyCore(text);
  return {
    safe,
    criticalViolations: violations.filter((v) => v.severity === "critical"),
    warnings: violations.filter((v) => v.severity === "warning"),
  };
}

const SYSTEM_PROMPT_INSTAGRAM = `Tu es la voix Ypersoa pour Instagram — vêtements et accessoires brodés personnalisés, brodés à la commande dans notre atelier des Hauts-de-France.

# STRUCTURE DE LA LÉGENDE (OBLIGATOIRE — exactement cet ordre, séparé par des retours à la ligne)
Légende COURTE, punchy, conversationnelle (200-500 caractères MAX). JAMAIS un long paragraphe littéraire. 4 temps :
1. HOOK — 1 ligne avec 1 emoji : accroche stop-scroll (une idée, un teaser, une scène, un chiffre, ou une question forte).
2. CORPS — 1 à 2 lignes COURTES et CONCRÈTES : un détail vrai (le mot brodé, la couleur du fil, l'occasion, le destinataire). Du concret, pas du lyrisme.
3. QUESTION D'ENGAGEMENT — 1 ligne qui invite à répondre en commentaire ("Et toi, tu l'offrirais à qui ?", "C'est quoi ta team ?", "Tu en ajouterais laquelle ?").
4. CTA — sur sa propre ligne, EXACTEMENT : "→ ypersoa.fr"

# TON
- Conversationnel, complice, direct — tu parles à une copine.
- Phrases courtes, du rythme. 1 à 3 emojis MAX sur toute la légende.
- CONCRET avant tout : un mot brodé, une couleur, une occasion, une mini-histoire vraie.
- INTERDIT le registre "poème" : pas de "chaque courbe raconte une histoire", "affirmation douce mais forte de ton identité", "sublimer ton quotidien avec authenticité". On bannit ce ton ampoulé.

# RÈGLES ABSOLUES
- TOUJOURS tutoyer ("tu", "ton", "ta") — JAMAIS "vous", "votre", "vos"
- JAMAIS "brodé à la main" / "fait main" → dis "brodé à la commande", "brodé dans notre atelier des Hauts-de-France", "brodé avec attention"
- JAMAIS de référence machine/équipement (PAS de "métier Tajima", PAS de "machine à broder", PAS de "atelier français" générique → dis "Hauts-de-France")
- JAMAIS Etsy, Amazon, Vinted, marketplace
- Vocabulaire de marque : personnalisation, à ton image, brodé à la commande, durable, Hauts-de-France

# HASHTAGS — N'EN ÉCRIS AUCUN
N'ajoute AUCUN hashtag dans la caption (ils sont ajoutés automatiquement après). La dernière ligne reste le CTA "→ ypersoa.fr".

# OUTPUT REQUIS — JSON STRICT
{
  "caption": "Légende COURTE 200-500 chars. Structure Hook / Corps concret / Question d'engagement / CTA (→ ypersoa.fr) avec retours à la ligne. AUCUN hashtag.",
  "hooks": [
    "Hook ÉMOTION (12-15 mots) — phrase qui touche directement",
    "Hook QUESTION (8-12 mots) — question qui interpelle",
    "Hook POV (8-12 mots) — perspective vécue, format POV: ...",
    "Hook HUMOUR (8-12 mots) — léger sourire, jeu de mot",
    "Hook AFFIRMATION (8-12 mots) — promesse forte courte"
  ]
}

# EXEMPLE DE BONNE LÉGENDE (produit = casquette brodée "SOEUR")
Il y a des liens qui se passent de mots 💛
Une casquette beige, le mot « SOEUR » brodé en bordeaux : le clin d'œil discret à LA personne qui compte.
Et toi, tu l'offrirais à qui ?
→ ypersoa.fr

Réponds UNIQUEMENT en JSON valide, rien d'autre.`;

const SYSTEM_PROMPT_PINTEREST = `Tu es la voix Ypersoa pour Pinterest — vêtements brodés personnalisés, brodés à la commande dans notre atelier des Hauts-de-France.

# CONTEXTE PINTEREST = MOTEUR DE RECHERCHE (pas un réseau social)
Sur Pinterest, le mot-clé est une REQUÊTE longue traîne — une phrase que les gens tapent vraiment ("idée cadeau fête des mères personnalisé"), PAS un tag court façon Etsy. Le mot-clé doit vivre dans le TITRE, la DESCRIPTION et (côté image) la surimpression.
Règle d'or : 1 épingle = 1 mot-clé PRINCIPAL longue traîne + 4-6 mots-clés secondaires répartis naturellement.

# TON & BRAND VOICE (PRIORITAIRE)
Écris de façon HUMAINE, CHALEUREUSE, EMPATHIQUE — comme une amie bienveillante qui te conseille, pas un texte SEO robotique. On parle d'émotion, de lien, de la personne à qui on offre. Le SEO se TISSE dans des phrases chaleureuses, il ne se juxtapose jamais en liste froide. Sobre et complice, jamais mièvre ni marketing criard. Une vraie attention, un cadeau qui touche.

# RÈGLES ABSOLUES
- TOUJOURS tutoyer ("tu", "ton", "ta") — JAMAIS "vous", "votre", "vos"
- JAMAIS "brodé à la main" / "fait main" → dis "brodé à la commande", "brodé pour toi", "à ton image"
- JAMAIS de référence machine/équipement (pas de "métier Tajima", pas de "machine à broder")
- JAMAIS Etsy, Amazon, Vinted, marketplace
- Vocabulaire de marque : personnalisation, à ton image, brodé à la commande, durable, Hauts-de-France, atelier français, made in France
- Ton inspirationnel et chaleureux (registre Émoï-Émoï / Sézane)

# PRODUIT — FIDÉLITÉ ABSOLUE
Si un PRODUIT RÉEL t'est indiqué dans le message, décris CE produit exactement (ex. un "sweat à capuche"). N'invente JAMAIS un autre type de vêtement (ne dis pas "casquette" si c'est un sweat). Les mots-clés priment sur le SEO, mais le produit prime sur les mots-clés : adapte tout mot-clé qui nommerait un autre vêtement.

# MOTS-CLÉS IMPOSÉS
Une liste de mots-clés t'est fournie dans le message (1 PRINCIPAL + des secondaires). Tu DOIS :
- commencer le titre par le mot-clé PRINCIPAL
- ouvrir la description par le mot-clé PRINCIPAL puis tisser 4-6 secondaires en phrases naturelles ET chaleureuses
- ne pas inventer d'autres axes : reste sur ces mots-clés et l'occasion donnée

# OUTPUT REQUIS — JSON STRICT — STANDARD PINTEREST OFFICIEL
{
  "title": "Titre épingle MAX 100 caractères (compte les caractères !) — commence par le mot-clé PRINCIPAL",
  "description": "Description MAX 500 caractères, CHALEUREUSE et humaine. Mot-clé principal en ouverture + secondaires tissés dans des phrases qui parlent à la personne et à l'émotion du cadeau (pour qui, ce que ça raconte, pourquoi ça touche). Personnalisé, brodé à la commande, durable. PAS de hashtags, PAS de #.",
  "tags": ["8-10 mots-clés longue traîne", "minuscules", "sans dièse", "phrases naturelles"],
  "hooks": [
    "Hook ÉMOTION (12-15 mots) — phrase qui touche directement",
    "Hook QUESTION (8-12 mots) — question qui interpelle",
    "Hook POV (8-12 mots) — perspective vécue",
    "Hook HUMOUR (8-12 mots) — léger sourire",
    "Hook AFFIRMATION (8-12 mots) — promesse forte courte"
  ]
}

# EXEMPLE BONNE PRATIQUE (chaleureux, produit = sweat à capuche)
- Titre : "Cadeau fête des mères personnalisé — un sweat à capuche brodé à son prénom"
- Description : "Cadeau fête des mères personnalisé : et si tu lui offrais un sweat à capuche brodé à son prénom, rien qu'à elle ? Brodé à la commande dans notre atelier des Hauts-de-France, c'est le genre de petite attention qui se garde longtemps et se porte tous les jours. Doux, durable, à son image — un cadeau maman qui dit « je pense à toi » sans un mot."
- Tags : ["cadeau fête des mères personnalisé", "sweat à capuche brodé prénom", "broderie personnalisée", "cadeau maman prénom", "vêtement brodé personnalisé", "idée cadeau originale"]

Réponds UNIQUEMENT en JSON valide, rien d'autre.`;

// ──────────────────────────────────────────────────────────────────────────
// Moteurs de génération de copy. On essaie OpenAI (qualité éditoriale FR de
// référence) puis Gemini en secours (clé qui marche déjà pour les images), puis
// un repli déterministe construit sur les mots-clés stratégie — pour que le
// texte, les tags et le SEO ne reviennent JAMAIS vides, même OpenAI à sec.
// ──────────────────────────────────────────────────────────────────────────

const errMsg = (e: unknown) => (e instanceof Error ? e.message : String(e));

async function runOpenAI(
  apiKey: string,
  systemPrompt: string,
  userMessage: string,
  mimeType: string,
  base64Image: string
): Promise<Record<string, unknown>> {
  const openai = new OpenAI({ apiKey });
  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: [
          { type: "text", text: userMessage },
          { type: "image_url", image_url: { url: `data:${mimeType};base64,${base64Image}` } },
        ],
      },
    ],
    max_tokens: 1500,
    temperature: 0.85,
  });
  const raw = completion.choices[0]?.message?.content;
  if (!raw) throw new Error("Pas de contenu OpenAI");
  return JSON.parse(raw);
}

async function runGemini(
  apiKey: string,
  systemPrompt: string,
  userMessage: string,
  mimeType: string,
  base64Image: string
): Promise<Record<string, unknown>> {
  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: {
      parts: [
        { inlineData: { data: base64Image, mimeType } },
        { text: userMessage },
      ],
    },
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

const clip = (s: string, n: number) =>
  s.length <= n ? s : s.slice(0, n - 1).trimEnd() + "…";
const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

/**
 * Repli déterministe Pinterest : construit titre + description + tags + hooks à
 * partir des mots-clés stratégie et du produit réel. Garantit un SEO correct
 * (mot-clé longue traîne, personnalisation, produit) sans aucun LLM.
 */
function fallbackPinterest(
  kw: PinterestKeywords | null,
  productNoun: string | undefined,
  occasionContext: string
): Record<string, unknown> {
  const noun = productNoun ?? "vêtement brodé";
  const principal = kw?.principal ?? `${noun} personnalisé`;
  const secondaires = kw?.secondaires ?? [];
  const tags =
    kw?.tous ?? [
      principal,
      "cadeau personnalisé",
      "vêtement brodé personnalisé",
      "broderie personnalisée",
      "made in France",
    ];
  const weave = secondaires.slice(0, 4).join(", ");
  const title = clip(`${cap(principal)} — un ${noun} brodé à ton image`, 100);
  const description = clip(
    `${cap(principal)} : et si tu offrais un ${noun} brodé à la commande, rien qu'à son image ? ` +
      `Brodé pour toi dans notre atelier des Hauts-de-France, c'est une attention personnalisée et durable qui se garde longtemps. ` +
      (weave ? `On pense aussi à ${weave}. ` : "") +
      `Un cadeau qui dit « je pense à toi » sans un mot.`,
    500
  );
  return {
    title,
    description,
    tags,
    hooks: [
      "Une attention brodée à son image, le genre de cadeau qui se garde des années ❤️",
      "Et si ton cadeau était brodé rien que pour elle ?",
      `POV : tu offres un ${noun} personnalisé qu'elle ne quittera plus.`,
      `Un ${noun} qui parle à sa place, un point à la fois.`,
      "Brodé à la commande, à ton image, fait pour durer.",
    ],
    _occasion: occasionContext,
  };
}

/** Repli déterministe Instagram : caption structurée (hook/corps/question/CTA) + 5 hooks. */
function fallbackInstagram(
  productNoun: string | undefined,
  occasionContext: string
): Record<string, unknown> {
  const noun = productNoun ?? "vêtement brodé";
  // Structure : hook / corps concret / question d'engagement / CTA.
  const caption =
    `Le petit détail qui change tout ✨\n` +
    `Un ${noun} brodé à ton image, dans notre atelier des Hauts-de-France — le mot qui compte, juste pour toi.\n` +
    `Et toi, tu le ferais broder comment ?\n` +
    `→ ypersoa.fr`;
  return {
    caption,
    hooks: [
      "Une attention brodée à ton image, le genre de cadeau qui se garde des années ❤️",
      "Et si ton cadeau racontait vraiment quelque chose ?",
      `POV : tu offres un ${noun} brodé qu'on ne quitte plus.`,
      `Un ${noun} qui dit « je t'aime » sans un mot.`,
      "Brodé à la commande, à ton image, fait pour durer.",
    ],
  };
}

export async function POST(request: NextRequest) {
  console.log("\n========== /api/generate-copy START ==========");

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ message: "OPENAI_API_KEY manquante" }, { status: 500 });
  }

  let body: RequestBody;
  try {
    body = await request.json();
  } catch (e) {
    return NextResponse.json({ message: "Body JSON invalide" }, { status: 400 });
  }

  const {
    base64Image,
    mimeType,
    platform,
    vibeLabel,
    occasionContext,
    customPrompt,
    canoniqueContext,
    pinterestFicheId,
    occasionId,
    productId,
  } = body;

  const productNoun = productNounFor(productId);

  console.log("[INFO] Platform:", platform);
  console.log("[INFO] Vibe:", vibeLabel, "| Occasion:", occasionContext.substring(0, 60));

  if (!base64Image || !mimeType) {
    return NextResponse.json({ message: "Image manquante" }, { status: 400 });
  }

  // Pinterest : on calcule les mots-clés longue traîne pilotés par la fiche stratégie.
  let pinterestKeywords: ReturnType<typeof buildPinterestKeywords> = null;
  let pinterestFicheNom = "";
  if (platform === "pinterest" && pinterestFicheId && occasionId) {
    try {
      const strategy = await loadPinterestStrategy();
      pinterestKeywords = buildPinterestKeywords(strategy, pinterestFicheId, occasionId, productNoun);
      pinterestFicheNom = strategy.fiches.find((f) => f.id === pinterestFicheId)?.nom ?? "";
    } catch (e) {
      console.error("[WARN] Pinterest strategy load failed:", e);
    }
  }

  const systemPrompt =
    platform === "pinterest" ? SYSTEM_PROMPT_PINTEREST : SYSTEM_PROMPT_INSTAGRAM;

  const keywordsBlock = pinterestKeywords
    ? `

🔑 MOTS-CLÉS À UTILISER (longue traîne) :
- PRINCIPAL (tête de titre + ouverture description) : "${pinterestKeywords.principal}"
- SECONDAIRES (à tisser dans la description) : ${pinterestKeywords.secondaires.map((k) => `"${k}"`).join(", ")}
${pinterestFicheNom ? `- MOTIF : ${pinterestFicheNom}` : ""}`
    : "";

  const productBlock = productNoun
    ? `\n\n👕 PRODUIT RÉEL : ${productNoun}. Décris CE produit et UNIQUEMENT lui. N'emploie JAMAIS un autre nom de vêtement (n'écris pas "casquette" si c'est un ${productNoun}, etc.). Si un mot-clé nomme un autre vêtement, adapte-le au ${productNoun}.`
    : "";

  const userMessage = `Voici les éléments du visuel à promouvoir :

📸 AMBIANCE : ${vibeLabel}
🎁 OCCASION : ${occasionContext}
${canoniqueContext ? `👤 PERSONNAGES : ${canoniqueContext}` : ""}
${customPrompt ? `💡 VISION CRÉATIVE : "${customPrompt}"` : ""}${productBlock}${keywordsBlock}

Analyse l'image attentivement (motif brodé, couleurs, support textile) et produis le contenu pour ${platform === "pinterest" ? "Pinterest (standard officiel : titre + description + tags + 5 hooks)" : "Instagram (légende COURTE structurée : hook / corps concret / question d'engagement / CTA → ypersoa.fr + 5 hooks)"}.

⚠️ CRITIQUE : Si tu vois un design "Mama Club" mais l'occasion est "Fête des Pères", ADAPTE le ton pour parler aux papas (et inversement). La VISION CRÉATIVE doit dicter l'occasion mentionnée, pas le visuel produit.`;

  // Cascade : OpenAI → Gemini → repli déterministe. La copy ne revient jamais vide.
  let parsed: Record<string, unknown> | null = null;
  let source: "openai" | "gemini" | "fallback" = "openai";
  const engineErrors: string[] = [];

  try {
    parsed = await runOpenAI(apiKey, systemPrompt, userMessage, mimeType, base64Image);
  } catch (e) {
    engineErrors.push(`openai: ${errMsg(e)}`);
    console.warn("[WARN] OpenAI copy KO → fallback Gemini:", errMsg(e));
    const geminiKey = process.env.GEMINI_API_KEY;
    if (geminiKey) {
      try {
        parsed = await runGemini(geminiKey, systemPrompt, userMessage, mimeType, base64Image);
        source = "gemini";
      } catch (e2) {
        engineErrors.push(`gemini: ${errMsg(e2)}`);
        console.warn("[WARN] Gemini copy KO aussi:", errMsg(e2));
      }
    }
  }

  if (!parsed) {
    source = "fallback";
    parsed =
      platform === "pinterest"
        ? fallbackPinterest(pinterestKeywords, productNoun, occasionContext)
        : fallbackInstagram(productNoun, occasionContext);
    console.warn("[WARN] Copy en repli déterministe (LLMs KO):", engineErrors.join(" | "));
  }

  // Note non-bloquante affichée côté UI quand la copy ne vient pas d'OpenAI.
  const notice =
    source === "openai"
      ? null
      : source === "gemini"
        ? "Copy générée via Gemini (OpenAI indisponible — vérifie le crédit OpenAI)."
        : "OpenAI et Gemini indisponibles : copy de secours générée depuis les mots-clés. Recharge le crédit OpenAI pour la qualité éditoriale.";

  if (platform === "pinterest") {
    const title = (parsed.title as string) || "";
    const description = (parsed.description as string) || "";
    const gptTags: string[] = Array.isArray(parsed.tags) ? (parsed.tags as string[]) : [];
    const hooks = Array.isArray(parsed.hooks) ? parsed.hooks : [];

    // Tags 100% déterministes quand une fiche est sélectionnée (mix saisonnier /
    // produit / evergreen / permanent, alignés Sarah). Sans fiche → tags LLM seuls.
    const tags: string[] = pinterestKeywords ? pinterestKeywords.tous : gptTags;
    const tagCategories = pinterestKeywords ? pinterestKeywords.categories : null;

    // Brand safety check sur titre + description
    const fullText = `${title} ${description}`;
    const brandSafety = checkBrandSafety(fullText);

    console.log(
      `[OK:${source}] Pinterest output - title: ${title.length} chars, desc: ${description.length} chars, tags: ${tags.length}`
    );
    console.log("========== END ==========\n");

    return NextResponse.json({
      // Pour compatibilité backwards : on remplit aussi text avec tout combiné
      text: `**${title}**\n\n${description}\n\n_Tags : ${tags.join(", ")}_`,
      title,
      description,
      tags,
      tagCategories,
      hooks,
      brandSafety,
      platform: "pinterest",
      source,
      notice,
    });
  }

  // Instagram
  const rawCaption = (parsed.caption as string) || "";
  const hooks = Array.isArray(parsed.hooks) ? parsed.hooks : [];

  // Hashtags d'engagement/acquisition déterministes (formule 5 emplacements :
  // socle marque + produit + occasion + niche/style + communauté/local). Pilotés
  // par la banque evergreen — pas par le LLM qui produisait des tags littéraires
  // (#PassionCerise…) sans valeur de trafic. La rotation varie les combos.
  let igHashtags: InstagramHashtags | null = null;
  try {
    const bank = await loadInstagramHashtags();
    // Rotation dérivée du temps + des entrées → paquet varié d'un post à l'autre,
    // tout en restant pertinent (produit/occasion fixent les slots ciblés).
    const rotate =
      Math.floor(Date.now() / 1000) + occasionContext.length + (productId?.length ?? 0);
    igHashtags = buildInstagramHashtags(bank, { productId, occasionId, rotate });
  } catch (e) {
    console.error("[WARN] Instagram hashtags load failed:", e);
  }

  // La caption ne doit plus porter de hashtags (le LLM en glisse parfois malgré
  // la consigne) : on retire toute traîne de "#tag" en fin de légende, puis on
  // appose notre bloc piloté.
  const cleanedCaption = rawCaption
    .replace(/\n*(?:#[^\s#]+(?:\s+|$))+$/u, "")
    .trimEnd();
  const caption = igHashtags?.tags.length
    ? `${cleanedCaption}\n\n${igHashtags.ligne}`
    : cleanedCaption;

  const brandSafety = checkBrandSafety(caption);

  console.log(
    `[OK:${source}] Instagram output - caption: ${caption.length} chars, hooks: ${hooks.length}, hashtags: ${igHashtags?.tags.length ?? 0}`
  );
  console.log("========== END ==========\n");

  return NextResponse.json({
    text: caption,
    hooks,
    hashtags: igHashtags?.tags ?? [],
    hashtagSlots: igHashtags?.slots ?? null,
    brandSafety,
    platform: "instagram",
    source,
    notice,
  });
}
