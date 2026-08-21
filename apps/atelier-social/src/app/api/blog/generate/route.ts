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

export const runtime = "nodejs";
export const maxDuration = 90;

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

async function runOpenAI(system: string, prompt: string) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY manquante.");
  const openai = new OpenAI({ apiKey });
  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    response_format: { type: "json_object" },
    temperature: 0.7,
    max_tokens: 4000,
    messages: [
      { role: "system", content: system },
      { role: "user", content: prompt },
    ],
  });
  const text = completion.choices[0]?.message?.content;
  if (!text) throw new Error("Pas de contenu OpenAI.");
  return text;
}

async function runGemini(system: string, prompt: string) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY manquante.");
  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    config: {
      systemInstruction: system,
      responseMimeType: "application/json",
      temperature: 0.7,
    },
  });
  if (!response.text) throw new Error("Pas de contenu Gemini.");
  return response.text;
}

async function generateArticle(system: string, prompt: string) {
  try {
    return await runOpenAI(system, prompt);
  } catch (openAiError) {
    try {
      return await runGemini(system, prompt);
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

  const brief: ArticleBrief = {
    targetQuery: body.targetQuery,
    angle: body.angle,
    subQueries: shuffleArray(body.subQueries),
    outOfScope: body.outOfScope,
    conversionGoal: body.conversionGoal,
    brandFacts: body.brandFacts?.length ? body.brandFacts : DEFAULT_BRAND_FACTS,
    internalLinks: body.internalLinks,
    editorialDetails: selectEditorialDetails(body.targetQuery, body.angle),
  };

  const system = buildSystemPrompt();
  const userPrompt = buildUserPrompt(brief);

  let article: ArticlePayload;
  let lint: LintReport;
  let repaired = false;

  try {
    article = parseJson(await generateArticle(system, userPrompt));
    lint = lintArticle(article, {
      targetQuery: body.targetQuery,
      brandFacts: brief.brandFacts.map((f) => f.fact),
      editorialDetails: brief.editorialDetails,
    });

    if (!lint.passed) {
      repaired = true;
      article = parseJson(await generateArticle(system, `${userPrompt}\n\n${buildRepairPrompt(lint)}`));
      lint = lintArticle(article, {
        targetQuery: body.targetQuery,
        brandFacts: brief.brandFacts.map((f) => f.fact),
        editorialDetails: brief.editorialDetails,
      });
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
      internal_links: body.internalLinks ?? [],
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
