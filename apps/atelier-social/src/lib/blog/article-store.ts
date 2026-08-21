import { supabase } from "@/lib/supabase";
import type { ArticlePayload, LintReport } from "./geo-guards";
import type { BrandFact, ConversionGoal } from "./geo-prompt";

export interface BlogArticleRecord {
  id: string;
  created_at: string;
  updated_at: string;
  target_query: string;
  angle: string;
  serp_softness: number;
  conversion_goal: ConversionGoal;
  sub_queries: string[];
  out_of_scope: string[];
  internal_links: { label: string; url: string }[];
  brand_facts: BrandFact[];
  status: "ready_for_review" | "lint_failed";
  repaired: boolean;
  article: ArticlePayload;
  lint: LintReport;
  html: string;
  article_body_html: string;
  jsonld: unknown;
  shopify: {
    handle: string;
    title: string;
    admin: { title: string; blog_handle: string; tags: string[] };
    seo: { title: string; handle: string; meta_title: string; meta_description: string };
    article_body_html: string;
    faq_jsonld: string;
    liquid_section: string;
  };
}

export interface SaveBlogArticleInput
  extends Omit<BlogArticleRecord, "id" | "created_at" | "updated_at"> {}

interface MemStore {
  articles: Map<string, BlogArticleRecord>;
}

declare global {
  // eslint-disable-next-line no-var
  var __ypersoa_blog_articles__: MemStore | undefined;
}

function mem(): MemStore {
  if (!globalThis.__ypersoa_blog_articles__) {
    globalThis.__ypersoa_blog_articles__ = { articles: new Map() };
  }
  return globalThis.__ypersoa_blog_articles__;
}

function makeId(): string {
  return `blog_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
}

function now(): string {
  return new Date().toISOString();
}

const TBL = "geo_articles";

function isMissingTableError(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes("could not find the table") ||
    lower.includes("relation") ||
    lower.includes("does not exist") ||
    lower.includes("schema cache")
  );
}

function isRecoverablePersistenceError(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    isMissingTableError(message) ||
    lower.includes("the string did not match the expected pattern") ||
    lower.includes("failed to parse url") ||
    lower.includes("invalid url") ||
    lower.includes("fetch failed") ||
    lower.includes("networkerror") ||
    lower.includes("network request failed")
  );
}

function normalizeRow(row: Partial<BlogArticleRecord> & { id: string }): BlogArticleRecord {
  return {
    id: row.id,
    created_at: row.created_at ?? now(),
    updated_at: row.updated_at ?? row.created_at ?? now(),
    target_query: row.target_query ?? "",
    angle: row.angle ?? "",
    serp_softness: row.serp_softness ?? 3,
    conversion_goal: (row.conversion_goal ?? "club") as ConversionGoal,
    sub_queries: row.sub_queries ?? [],
    out_of_scope: row.out_of_scope ?? [],
    internal_links: row.internal_links ?? [],
    brand_facts: row.brand_facts ?? [],
    status: (row.status ?? "ready_for_review") as "ready_for_review" | "lint_failed",
    repaired: Boolean(row.repaired),
    article: row.article as ArticlePayload,
    lint: row.lint as LintReport,
    html: row.html ?? "",
    article_body_html: row.article_body_html ?? "",
    jsonld: row.jsonld ?? null,
    shopify: row.shopify as BlogArticleRecord["shopify"],
  };
}

export async function listBlogArticles(): Promise<BlogArticleRecord[]> {
  if (!supabase) {
    return Array.from(mem().articles.values()).sort((a, b) => b.created_at.localeCompare(a.created_at));
  }

  const { data, error } = await supabase.from(TBL).select("*").order("created_at", { ascending: false }).limit(50);
  if (error) {
    if (isRecoverablePersistenceError(error.message)) {
      return Array.from(mem().articles.values()).sort((a, b) => b.created_at.localeCompare(a.created_at));
    }
    throw new Error(`Lecture geo_articles echouee : ${error.message}`);
  }
  return (data ?? []).map((row) => normalizeRow(row as BlogArticleRecord));
}

export async function getBlogArticle(id: string): Promise<BlogArticleRecord | null> {
  if (!supabase) {
    return mem().articles.get(id) ?? null;
  }

  const { data, error } = await supabase.from(TBL).select("*").eq("id", id).maybeSingle();
  if (error) {
    if (isRecoverablePersistenceError(error.message)) {
      return mem().articles.get(id) ?? null;
    }
    throw new Error(`Lecture article echouee : ${error.message}`);
  }
  return data ? normalizeRow(data as BlogArticleRecord) : null;
}

export async function deleteBlogArticle(id: string): Promise<void> {
  mem().articles.delete(id);
  if (!supabase) return;

  const { error } = await supabase.from(TBL).delete().eq("id", id);
  if (error && !isRecoverablePersistenceError(error.message)) {
    throw new Error(`Suppression article echouee : ${error.message}`);
  }
}

export async function saveBlogArticle(input: SaveBlogArticleInput): Promise<BlogArticleRecord> {
  if (!supabase) {
    const id = makeId();
    const ts = now();
    const row: BlogArticleRecord = { id, created_at: ts, updated_at: ts, ...input };
    mem().articles.set(id, row);
    return row;
  }

  const fallbackToMemory = () => {
    const id = makeId();
    const ts = now();
    const row: BlogArticleRecord = { id, created_at: ts, updated_at: ts, ...input };
    mem().articles.set(id, row);
    return row;
  };

  const { data, error } = await supabase
    .from(TBL)
    .insert({
      target_query: input.target_query,
      angle: input.angle,
      serp_softness: input.serp_softness,
      conversion_goal: input.conversion_goal,
      sub_queries: input.sub_queries,
      out_of_scope: input.out_of_scope,
      internal_links: input.internal_links,
      brand_facts: input.brand_facts,
      status: input.status,
      repaired: input.repaired,
      article: input.article,
      lint: input.lint,
      html: input.html,
      article_body_html: input.article_body_html,
      jsonld: input.jsonld,
      shopify: input.shopify,
    })
    .select("*")
    .single();

  if (error) {
    if (isRecoverablePersistenceError(error.message)) {
      return fallbackToMemory();
    }
    throw new Error(`Sauvegarde article echouee : ${error.message}`);
  }
  return normalizeRow(data as BlogArticleRecord);
}
