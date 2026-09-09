import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { GoogleGenAI } from "@google/genai";
import {
  buildRepairPrompt,
  lintArticle,
  runGate,
  type ArticlePayload,
  type LintReport,
} from "@/lib/blog/geo-guards";
import {
  buildSystemPrompt,
  buildUserPrompt,
  type ArticleBrief,
  type BrandFact,
} from "@/lib/blog/geo-prompt";
import {
  toFaqJsonLd,
  toShopifyArticleBody,
  toShopifyHtml,
  toShopifyLiquidBundle,
} from "@/lib/blog/geo-export";
import { saveBlogArticle } from "@/lib/blog/article-store";
import { selectEditorialDetails } from "@/lib/blog/editorial-bank";
import { loadBlogInternalLinks } from "@/lib/blog/internal-links.server";
import { selectInternalLinks } from "@/lib/blog/internal-links";

export const runtime = "nodejs";
export const maxDuration = 120;

interface RequestBody {
  targetQuery: string;
  angle: string;
  subQueries: string[];
  outOfScope: string[];
  serpSoftness: number;
  conversionGoal: ArticleBrief["conversionGoal"];
  internalLinks?: { label: string; url: string }[];
  brandFacts?: BrandFact[];
}

function shuffleArray<T>(items: T[]): T[] {
  const next = [...items];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

const DEFAULT_BRAND_FACTS: BrandFact[] = [
  { topic: "atelier", fact: "Je brode a Wattrelos, dans les Hauts-de-France." },
  { topic: "production", fact: "Chaque piece est brodee a la commande : elle a deja un prenom avant d'exister, sans stock qui dort." },
  { topic: "technique", fact: "Le fil est pris dans la maille : l'imprime peut craqueler ou se decoller, la broderie tient tant que le sweat tient." },
  { topic: "delais", fact: "Les delais standards sont de 5 a 11 jours ouvres selon le modele. Le click and collect peut accelerer les choses quand c'est possible." },
  { topic: "fil", fact: "Tu choisis parmi les coloris de fil disponibles, et tu peux demander une couleur particuliere par mail." },
  { topic: "perso", fact: "Tu choisis ton texte, ta typographie et ta couleur de fil." },
];

function parseJson(raw: string): ArticlePayload {
  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/, "")
    .trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1) {
    throw new Error("Reponse du modele non parsable.");
  }
  return JSON.parse(cleaned.slice(start, end + 1)) as ArticlePayload;
}

interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

async function runOpenAI(system: string, turns: ChatTurn[], temperature: number) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY manquante.");
  const openai = new OpenAI({ apiKey });
  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    response_format: { type: "json_object" },
    temperature,
    max_tokens: 4000,
    messages: [{ role: "system", content: system }, ...turns],
  });
  const text = completion.choices[0]?.message?.content;
  if (!text) throw new Error("Pas de contenu OpenAI.");
  return text;
}

async function runGemini(system: string, turns: ChatTurn[], temperature: number) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY manquante.");
  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: turns.map((t) => ({ role: t.role === "assistant" ? "model" : "user", parts: [{ text: t.content }] })),
    config: {
      systemInstruction: system,
      responseMimeType: "application/json",
      temperature,
    },
  });
  if (!response.text) throw new Error("Pas de contenu Gemini.");
  return response.text;
}

/**
 * `turns` porte l'historique complet (prompt initial, puis tour par tour les
 * reponses precedentes + les demandes de reparation) : la reparation doit
 * revoir sa propre tentative, pas regenerer a l'aveugle a partir d'une seule
 * liste de reproches. La temperature baisse sur reparation (correction
 * ciblee, pas nouvelle creation).
 */
async function generateArticle(system: string, turns: ChatTurn[], temperature: number) {
  try {
    return await runOpenAI(system, turns, temperature);
  } catch (openAiError) {
    try {
      return await runGemini(system, turns, temperature);
    } catch (geminiError) {
      const detail = [
        openAiError instanceof Error ? `OpenAI: ${openAiError.message}` : "OpenAI indisponible",
        geminiError instanceof Error ? `Gemini: ${geminiError.message}` : "Gemini indisponible",
      ].join(" | ");
      throw new Error(detail);
    }
  }
}

export async function POST(req: NextRequest) {
  let body: RequestBody;
  try {
    body = (await req.json()) as RequestBody;
  } catch {
    return NextResponse.json({ ok: false, error: "Corps de requete invalide." }, { status: 400 });
  }

  const gate = runGate({
    targetQuery: body.targetQuery,
    serpSoftness: body.serpSoftness,
    conversionGoal: body.conversionGoal,
    angle: body.angle,
  });

  if (!gate.passed) {
    return NextResponse.json({ ok: false, stage: "gate", reasons: gate.reasons }, { status: 422 });
  }

  const linksReferentiel = await loadBlogInternalLinks();
  const internalLinks = body.internalLinks?.length
    ? body.internalLinks
    : selectInternalLinks(linksReferentiel, body.targetQuery, body.angle, body.subQueries);

  const brief: ArticleBrief = {
    targetQuery: body.targetQuery,
    angle: body.angle,
    subQueries: shuffleArray(body.subQueries),
    outOfScope: body.outOfScope,
    conversionGoal: body.conversionGoal,
    brandFacts: body.brandFacts?.length ? body.brandFacts : DEFAULT_BRAND_FACTS,
    internalLinks,
    editorialDetails: selectEditorialDetails(body.targetQuery, body.angle),
  };

  const system = buildSystemPrompt();
  const userPrompt = buildUserPrompt(brief);
  const lintOpts = {
    targetQuery: body.targetQuery,
    brandFacts: brief.brandFacts.map((f) => f.fact),
    editorialDetails: brief.editorialDetails,
    subQueries: body.subQueries,
    linkPool: internalLinks,
  };
  const MAX_REPAIR_ATTEMPTS = 2;

  let article: ArticlePayload;
  let lint: LintReport;
  let repaired = false;

  try {
    const turns: ChatTurn[] = [{ role: "user", content: userPrompt }];
    article = parseJson(await generateArticle(system, turns, 0.7));
    lint = lintArticle(article, lintOpts);

    let attempts = 0;
    while (!lint.passed && attempts < MAX_REPAIR_ATTEMPTS) {
      attempts += 1;
      repaired = true;
      turns.push({ role: "assistant", content: JSON.stringify(article) });
      turns.push({ role: "user", content: buildRepairPrompt(lint) });
      article = parseJson(await generateArticle(system, turns, 0.4));
      lint = lintArticle(article, lintOpts);
    }
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        stage: "generation",
        error: error instanceof Error ? error.message : "Echec de generation.",
      },
      { status: 502 }
    );
  }

  const html = toShopifyHtml(article);
  const articleBodyHtml = toShopifyArticleBody(article);
  const jsonld = toFaqJsonLd(article);
  const shopify = toShopifyLiquidBundle(article);
  let savedId: string | null = null;
  let persistenceWarning: string | null = null;

  try {
    const saved = await saveBlogArticle({
      target_query: body.targetQuery,
      angle: body.angle,
      serp_softness: body.serpSoftness,
      conversion_goal: body.conversionGoal,
      sub_queries: brief.subQueries,
      out_of_scope: body.outOfScope,
      internal_links: internalLinks,
      brand_facts: brief.brandFacts,
      status: lint.passed ? "ready_for_review" : "lint_failed",
      repaired,
      article,
      lint,
      html,
      article_body_html: articleBodyHtml,
      jsonld,
      shopify,
    });
    savedId = saved.id;
  } catch (error) {
    persistenceWarning =
      error instanceof Error
        ? `Article genere, mais non sauvegarde dans la bibliotheque : ${error.message}`
        : "Article genere, mais non sauvegarde dans la bibliotheque.";
  }

  return NextResponse.json({
    ok: true,
    stage: "done",
    id: savedId,
    repaired,
    lint,
    article,
    html,
    articleBodyHtml,
    jsonld,
    shopify,
    editorialDetailIds: lint.editorialDetailIds,
    warning: persistenceWarning,
  });
}
