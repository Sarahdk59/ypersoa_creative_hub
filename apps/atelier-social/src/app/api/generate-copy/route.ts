/**
 * API Route: /api/generate-copy
 *
 * Insta : caption narrative + 5 hooks
 * Pinterest : titre court (100 chars) + description SEO (500 chars) + tags + 5 hooks
 */

import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { loadPinterestStrategy } from "@/lib/pinterest-strategy.server";
import { buildPinterestKeywords, productNounFor } from "@/lib/pinterest-strategy";

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

// Termes interdits (red lines CLAUDE.md)
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

const FORBIDDEN_TERMS_WARNING = [
  "vous",
  "votre",
  "vos",
  "Bonjour",
  "Bonsoir",
];

// Pinterest = consumer-facing : aucune référence machine/équipement (cf. mémoire
// feedback_vocab_fabrication → préférer « brodé à la commande »).
const FORBIDDEN_TERMS_MACHINE = [
  "métier Tajima",
  "Tajima",
  "machine à broder",
];

function checkBrandSafety(text: string, extraCritical: string[] = []): BrandSafety {
  const lower = text.toLowerCase();
  const criticalViolations: BrandViolation[] = [];
  const warnings: BrandViolation[] = [];

  for (const term of [...FORBIDDEN_TERMS_CRITICAL, ...extraCritical]) {
    const idx = lower.indexOf(term.toLowerCase());
    if (idx !== -1) {
      criticalViolations.push({ term, position: idx, severity: "critical" });
    }
  }

  // Warnings : vouvoiement détecté par regex pour limiter les faux positifs
  const vouvoiementRegex = /\b(vous|votre|vos)\b/gi;
  let match;
  while ((match = vouvoiementRegex.exec(text)) !== null) {
    warnings.push({ term: match[0], position: match.index, severity: "warning" });
  }

  return {
    safe: criticalViolations.length === 0,
    criticalViolations,
    warnings,
  };
}

const SYSTEM_PROMPT_INSTAGRAM = `Tu es la voix Ypersoa pour Instagram — broderie premium sur métier Tajima depuis un atelier français.

# RÈGLES ABSOLUES
- TOUJOURS tutoyer ("tu", "ton", "ta")
- JAMAIS "vous", "votre", "vos"
- JAMAIS "brodé à la main" / "fait main" → toujours "brodé sur métier Tajima" ou "brodé dans notre atelier"
- JAMAIS mentionner Etsy, Amazon, marketplace
- Ton sobre, intime, narratif — JAMAIS marketing criard

# OUTPUT REQUIS — JSON STRICT
{
  "caption": "Légende Instagram complète, 600-1200 chars, narrative, avec 5-8 hashtags brand à la fin",
  "hooks": [
    "Hook ÉMOTION (12-15 mots) — phrase qui touche directement",
    "Hook QUESTION (8-12 mots) — question qui interpelle",
    "Hook POV (8-12 mots) — perspective vécue, format POV: ...",
    "Hook HUMOUR (8-12 mots) — léger sourire, jeu de mot",
    "Hook AFFIRMATION (8-12 mots) — promesse forte courte"
  ]
}

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

  const openai = new OpenAI({ apiKey });

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

Analyse l'image attentivement (motif brodé, couleurs, support textile) et produis le contenu pour ${platform === "pinterest" ? "Pinterest (standard officiel : titre + description + tags + 5 hooks)" : "Instagram (légende narrative + 5 hooks)"}.

⚠️ CRITIQUE : Si tu vois un design "Mama Club" mais l'occasion est "Fête des Pères", ADAPTE le ton pour parler aux papas (et inversement). La VISION CRÉATIVE doit dicter l'occasion mentionnée, pas le visuel produit.`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: [
            { type: "text", text: userMessage },
            {
              type: "image_url",
              image_url: { url: `data:${mimeType};base64,${base64Image}` },
            },
          ],
        },
      ],
      max_tokens: 1500,
      temperature: 0.85,
    });

    const rawContent = completion.choices[0]?.message?.content;
    if (!rawContent) {
      return NextResponse.json({ message: "Pas de contenu généré" }, { status: 500 });
    }

    let parsed;
    try {
      parsed = JSON.parse(rawContent);
    } catch (e) {
      console.error("[FAIL] JSON parse:", rawContent);
      return NextResponse.json({ message: "Réponse OpenAI mal formée" }, { status: 500 });
    }

    if (platform === "pinterest") {
      const title = parsed.title || "";
      const description = parsed.description || "";
      const gptTags: string[] = Array.isArray(parsed.tags) ? parsed.tags : [];
      const hooks = Array.isArray(parsed.hooks) ? parsed.hooks : [];

      // Tags = mots-clés stratégie en priorité (déterministes, alignés Sarah),
      // complétés par les tags GPT jusqu'à 10. Si pas de fiche → tags GPT seuls.
      let tags: string[] = gptTags;
      if (pinterestKeywords) {
        const seen = new Set<string>();
        tags = [];
        for (const kw of [...pinterestKeywords.tous, ...gptTags]) {
          const n = kw.trim().toLowerCase();
          if (n && !seen.has(n)) {
            seen.add(n);
            tags.push(kw.trim());
          }
          if (tags.length >= 10) break;
        }
      }

      // Brand safety check sur titre + description (+ interdiction machine sur Pinterest)
      const fullText = `${title} ${description}`;
      const brandSafety = checkBrandSafety(fullText, FORBIDDEN_TERMS_MACHINE);

      console.log("[OK] Pinterest output - title:", title.length, "chars, desc:", description.length, "chars, tags:", tags.length);
      console.log("========== END ==========\n");

      return NextResponse.json({
        // Pour compatibilité backwards : on remplit aussi text avec tout combiné
        text: `**${title}**\n\n${description}\n\n_Tags : ${tags.join(", ")}_`,
        title,
        description,
        tags,
        hooks,
        brandSafety,
        platform: "pinterest",
      });
    }

    // Instagram (existant)
    const caption = parsed.caption || "";
    const hooks = Array.isArray(parsed.hooks) ? parsed.hooks : [];
    const brandSafety = checkBrandSafety(caption);

    console.log("[OK] Instagram output - caption:", caption.length, "chars, hooks:", hooks.length);
    console.log("========== END ==========\n");

    return NextResponse.json({
      text: caption,
      hooks,
      brandSafety,
      platform: "instagram",
    });
  } catch (error) {
    console.error("[FAIL] OpenAI error:", error);
    const message = error instanceof Error ? error.message : "Erreur inconnue";
    return NextResponse.json({ message: `Erreur OpenAI: ${message}` }, { status: 500 });
  }
}
