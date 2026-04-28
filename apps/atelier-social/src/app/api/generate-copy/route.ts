/**
 * API Route: /api/generate-copy
 *
 * Insta : caption narrative + 5 hooks
 * Pinterest : titre court (100 chars) + description SEO (500 chars) + tags + 5 hooks
 */

import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

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

function checkBrandSafety(text: string): BrandSafety {
  const lower = text.toLowerCase();
  const criticalViolations: BrandViolation[] = [];
  const warnings: BrandViolation[] = [];

  for (const term of FORBIDDEN_TERMS_CRITICAL) {
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

const SYSTEM_PROMPT_PINTEREST = `Tu es la voix Ypersoa pour Pinterest — broderie premium sur métier Tajima depuis un atelier français.

# CONTEXTE PINTEREST
Pinterest est une plateforme de découverte SEO. Les utilisateurs cherchent des idées, inspirations, cadeaux. La description doit contenir des mots-clés naturels que les gens tapent.

# RÈGLES ABSOLUES
- TOUJOURS tutoyer ("tu", "ton", "ta")
- JAMAIS "vous", "votre", "vos"
- JAMAIS "brodé à la main" / "fait main" → toujours "brodé sur métier Tajima" ou "brodé dans notre atelier"
- JAMAIS Etsy, Amazon, marketplace
- Ton inspirationnel, descriptif (pas narratif personnel comme Insta)

# OUTPUT REQUIS — JSON STRICT — STANDARD PINTEREST OFFICIEL
{
  "title": "Titre épingle MAX 100 caractères (compte les caractères !) — accrocheur SEO, mots-clés en début",
  "description": "Description SEO MAX 500 caractères. Phrases naturelles avec mots-clés intégrés. Décris ce que c'est, pour qui, pourquoi c'est unique. Pas de hashtags. Pas de #.",
  "tags": ["8-10 tags", "sans dièse", "minuscules", "séparés", "mots-clés naturels"],
  "hooks": [
    "Hook ÉMOTION (12-15 mots) — phrase qui touche directement",
    "Hook QUESTION (8-12 mots) — question qui interpelle",
    "Hook POV (8-12 mots) — perspective vécue",
    "Hook HUMOUR (8-12 mots) — léger sourire",
    "Hook AFFIRMATION (8-12 mots) — promesse forte courte"
  ]
}

# EXEMPLES BONNES PRATIQUES PINTEREST
- Titre : "Sweat brodé Mama Club — Cadeau Fête des Mères personnalisé"
- Description : "Offre à ta maman un sweat unique brodé sur métier Tajima dans notre atelier français. Personnalisable, doux, durable. Le cadeau qui raconte votre lien — fabriqué à la commande, prêt en 7 jours. Idéal pour la Fête des Mères, un anniversaire, ou simplement lui dire merci."
- Tags : ["cadeau fête des mères", "broderie personnalisée", "sweat brodé", "atelier français", "made in france", "cadeau maman", "mama club", "broderie sur mesure"]

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
  } = body;

  console.log("[INFO] Platform:", platform);
  console.log("[INFO] Vibe:", vibeLabel, "| Occasion:", occasionContext.substring(0, 60));

  if (!base64Image || !mimeType) {
    return NextResponse.json({ message: "Image manquante" }, { status: 400 });
  }

  const openai = new OpenAI({ apiKey });

  const systemPrompt =
    platform === "pinterest" ? SYSTEM_PROMPT_PINTEREST : SYSTEM_PROMPT_INSTAGRAM;

  const userMessage = `Voici les éléments du visuel à promouvoir :

📸 AMBIANCE : ${vibeLabel}
🎁 OCCASION : ${occasionContext}
${canoniqueContext ? `👤 PERSONNAGES : ${canoniqueContext}` : ""}
${customPrompt ? `💡 VISION CRÉATIVE : "${customPrompt}"` : ""}

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
      const tags = Array.isArray(parsed.tags) ? parsed.tags : [];
      const hooks = Array.isArray(parsed.hooks) ? parsed.hooks : [];

      // Brand safety check sur titre + description
      const fullText = `${title} ${description}`;
      const brandSafety = checkBrandSafety(fullText);

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
