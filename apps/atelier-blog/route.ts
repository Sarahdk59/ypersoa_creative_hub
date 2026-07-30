/**
 * Hub Ypersoa — POST /api/geo/generate
 * Pipeline : brief → gate → génération → lint (+1 réparation) → export → Supabase.
 */

import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";

import {
  buildSystemPrompt,
  buildUserPrompt,
  type ArticleBrief,
} from "./geo-prompt";
import {
  runGate,
  lintArticle,
  buildRepairPrompt,
  type ArticlePayload,
  type LintReport,
  type VocabRule,
} from "./geo-guards";
import {
  toFaqJsonLd,
  toShopifyArticleBody,
  toShopifyHtml,
  toShopifyLiquidBundle,
} from "./geo-export";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const MODEL = process.env.GEO_MODEL ?? "claude-sonnet-5";

interface RequestBody {
  queryId?: string;
  targetQuery: string;
  angle: string;
  subQueries: string[];
  outOfScope: string[];
  serpSoftness: number;
  conversionGoal: ArticleBrief["conversionGoal"];
  internalLinks?: { label: string; url: string }[];
  /** Modèle héros : passer 'claude-opus-5'. */
  model?: string;
}

function parseJson(raw: string): ArticlePayload {
  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/, "")
    .trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1) {
    throw new Error("Réponse du modèle non parsable : aucun objet JSON trouvé.");
  }
  return JSON.parse(cleaned.slice(start, end + 1)) as ArticlePayload;
}

function textOf(msg: Anthropic.Message): string {
  return msg.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n");
}

export async function POST(req: Request) {
  let body: RequestBody;
  try {
    body = (await req.json()) as RequestBody;
  } catch {
    return NextResponse.json({ error: "Corps de requête invalide." }, { status: 400 });
  }

  // ---------------------------------------------------------------- 1. GATE
  const gate = runGate({
    targetQuery: body.targetQuery,
    serpSoftness: body.serpSoftness,
    conversionGoal: body.conversionGoal,
    angle: body.angle,
  });

  if (!gate.passed) {
    // Le refus est tracé : il documente pourquoi on n'a PAS produit.
    await supabase.from("geo_articles").insert({
      query_id: body.queryId ?? null,
      target_query: body.targetQuery,
      angle: body.angle || "—",
      status: "gate_rejected",
      payload: {},
      lint_report: { passed: false, errors: gate.reasons, warnings: [] },
      model: null,
    });

    return NextResponse.json(
      { stage: "gate", passed: false, reasons: gate.reasons },
      { status: 422 }
    );
  }

  // ------------------------------------------------ 2. Contexte depuis Supabase
  const [{ data: facts }, { data: rules }] = await Promise.all([
    supabase.from("geo_brand_facts").select("topic, fact").eq("is_active", true),
    supabase.from("geo_vocab_rules").select("kind, pattern, label").eq("is_active", true),
  ]);

  const brandFacts = facts ?? [];
  const vocabRules = (rules ?? []) as VocabRule[];

  const brief: ArticleBrief = {
    targetQuery: body.targetQuery,
    angle: body.angle,
    subQueries: body.subQueries,
    outOfScope: body.outOfScope,
    conversionGoal: body.conversionGoal,
    brandFacts,
    internalLinks: body.internalLinks,
  };

  const system = buildSystemPrompt();
  const model = body.model ?? MODEL;

  // ---------------------------------------------------------- 3. GÉNÉRATION
  const messages: Anthropic.MessageParam[] = [
    { role: "user", content: buildUserPrompt(brief) },
  ];

  let article: ArticlePayload;
  let report: LintReport;
  let repaired = false;

  try {
    const first = await anthropic.messages.create({
      model,
      max_tokens: 4000,
      temperature: 0.7,
      system,
      messages,
    });
    article = parseJson(textOf(first));

    // -------------------------------------------------------------- 4. LINT
    report = lintArticle(article, {
      targetQuery: body.targetQuery,
      rules: vocabRules,
      brandFacts: brandFacts.map((f) => f.fact),
    });

    // Une seule passe de réparation. Au-delà, c'est un problème de brief, pas de modèle.
    if (!report.passed) {
      repaired = true;
      const second = await anthropic.messages.create({
        model,
        max_tokens: 4000,
        temperature: 0.4,
        system,
        messages: [
          ...messages,
          { role: "assistant", content: JSON.stringify(article) },
          { role: "user", content: buildRepairPrompt(report) },
        ],
      });
      article = parseJson(textOf(second));
      report = lintArticle(article, {
        targetQuery: body.targetQuery,
        rules: vocabRules,
        brandFacts: brandFacts.map((f) => f.fact),
      });
    }
  } catch (err) {
    return NextResponse.json(
      { stage: "generation", error: err instanceof Error ? err.message : "Échec de génération." },
      { status: 502 }
    );
  }

  // -------------------------------------------------------------- 5. EXPORT
  const html = toShopifyHtml(article);
  const articleBodyHtml = toShopifyArticleBody(article);
  const jsonld = toFaqJsonLd(article);
  const shopify = toShopifyLiquidBundle(article);

  const { data: saved, error } = await supabase
    .from("geo_articles")
    .insert({
      query_id: body.queryId ?? null,
      target_query: body.targetQuery,
      angle: body.angle,
      status: report.passed ? "ready_for_review" : "lint_failed",
      payload: article,
      lint_report: report,
      html_shopify: html,
      faq_jsonld: jsonld,
      model,
      word_count: report.wordCount,
    })
    .select("id")
    .single();

  if (error) {
    // Le trigger de quota remonte ici : c'est un refus attendu, pas un bug.
    return NextResponse.json(
      { stage: "persist", error: error.message, article, lint: report },
      { status: 409 }
    );
  }

  return NextResponse.json({
    stage: "done",
    id: saved.id,
    status: report.passed ? "ready_for_review" : "lint_failed",
    repaired,
    lint: report,
    article,
    html,
    articleBodyHtml,
    jsonld,
    shopify,
  });
}
