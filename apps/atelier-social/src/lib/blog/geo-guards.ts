import type { ConversionGoal } from "./geo-prompt";

export interface GateInput {
  targetQuery: string;
  serpSoftness: number;
  conversionGoal: ConversionGoal | "aucun";
  angle: string;
}

export interface GateResult {
  passed: boolean;
  reasons: string[];
}

const TRANSACTIONAL_PATTERNS = [
  /^(acheter|achat|prix|pas cher|promo|soldes)\b/i,
  /\b(pas cher|meilleur prix|moins cher)\b/i,
];

export function runGate(input: GateInput): GateResult {
  const reasons: string[] = [];
  const q = input.targetQuery.trim();
  const wordCount = q.split(/\s+/).filter(Boolean).length;

  if (wordCount < 3) {
    reasons.push(`Requete trop courte (${wordCount} mots). Resserre en longue traine.`);
  }
  if (TRANSACTIONAL_PATTERNS.some((p) => p.test(q))) {
    reasons.push("Requete trop transactionnelle pour un article SEO editorial.");
  }
  if (!Number.isFinite(input.serpSoftness) || input.serpSoftness < 3) {
    reasons.push(`SERP trop concurrentielle (${input.serpSoftness}/5). Minimum attendu : 3.`);
  }
  if (input.conversionGoal === "aucun") {
    reasons.push("Aucun objectif de conversion defini.");
  }
  if (!input.angle || input.angle.trim().length < 15) {
    reasons.push("Angle absent ou trop vague.");
  }

  return { passed: reasons.length === 0, reasons };
}

export interface VocabRule {
  kind: "forbidden" | "required";
  pattern: string;
  label: string;
}

export interface ArticlePayload {
  h1: string;
  slug: string;
  meta_title: string;
  meta_description: string;
  direct_answer: string;
  sections: { h2: string; body: string }[];
  faq: { question: string; answer: string }[];
  cta: { label: string; body: string };
  internal_links: string[];
  coverage_note: string;
}

export interface LintReport {
  passed: boolean;
  errors: string[];
  warnings: string[];
  wordCount: number;
}

export const DEFAULT_VOCAB_RULES: VocabRule[] = [
  { kind: "forbidden", pattern: "tajima", label: "Nom de materiel interne" },
  { kind: "forbidden", pattern: "m[ée]tier\\s+[àa]\\s+broder", label: "Nom de materiel interne" },
  { kind: "forbidden", pattern: "machine\\s+(industrielle|[àa]\\s+broder)", label: "Materiel industriel" },
  { kind: "forbidden", pattern: "brodeuse\\s+industrielle", label: "Materiel industriel" },
  { kind: "forbidden", pattern: "fait[\\s-]main", label: "Hors charte" },
  { kind: "forbidden", pattern: "handmade", label: "Hors charte" },
  { kind: "forbidden", pattern: "cousu\\s+main", label: "Hors charte" },
  { kind: "required", pattern: "brod[ée]\\s+[àa]\\s+la\\s+commande", label: "A la commande" },
  { kind: "required", pattern: "brod[ée]\\s+en\\s+France", label: "Fabrication francaise" },
  { kind: "required", pattern: "cousu\\w*\\s+pour\\s+durer", label: "Durabilite" },
  { kind: "required", pattern: "personnalis", label: "Personnalisation" },
  { kind: "required", pattern: "Hauts[\\s-]de[\\s-]France", label: "Ancrage regional" },
];

function flatten(a: ArticlePayload): string {
  return [
    a.h1,
    a.meta_title,
    a.meta_description,
    a.direct_answer,
    ...a.sections.flatMap((s) => [s.h2, s.body]),
    ...a.faq.flatMap((f) => [f.question, f.answer]),
    a.cta.label,
    a.cta.body,
    a.coverage_note,
  ].join("\n");
}

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function lintArticle(
  article: ArticlePayload,
  opts: {
    targetQuery: string;
    rules?: VocabRule[];
    brandFacts: string[];
    minRequiredHits?: number;
  }
): LintReport {
  const errors: string[] = [];
  const warnings: string[] = [];
  const rules = opts.rules ?? DEFAULT_VOCAB_RULES;
  const text = flatten(article);
  const wordCount = text.split(/\s+/).filter(Boolean).length;

  for (const rule of rules.filter((r) => r.kind === "forbidden")) {
    const re = new RegExp(rule.pattern, "i");
    if (re.test(text)) {
      errors.push(`Vocabulaire interdit : ${rule.label}`);
    }
  }

  const required = rules.filter((r) => r.kind === "required");
  const hits = required.filter((r) => new RegExp(r.pattern, "i").test(text));
  const minHits = opts.minRequiredHits ?? 2;
  if (hits.length < minHits) {
    errors.push(`Argumentaire de marque trop faible : ${hits.length}/${minHits}.`);
  }

  if (normalize(article.h1) !== normalize(opts.targetQuery)) {
    errors.push("Le H1 ne correspond pas exactement a la requete cible.");
  }
  if (article.sections.length < 3 || article.sections.length > 5) {
    errors.push(`Nombre de sections invalide : ${article.sections.length}.`);
  }
  if (article.faq.length < 3 || article.faq.length > 5) {
    errors.push(`Nombre d'entrees FAQ invalide : ${article.faq.length}.`);
  }
  if (!article.coverage_note || article.coverage_note.trim().length < 20) {
    errors.push("coverage_note trop faible.");
  }
  if (article.meta_title.length > 60) {
    warnings.push(`meta_title trop long (${article.meta_title.length}).`);
  }
  if (article.meta_description.length > 155) {
    warnings.push(`meta_description trop longue (${article.meta_description.length}).`);
  }
  if (wordCount < 600) {
    warnings.push(`${wordCount} mots seulement. Viser 700 a 1100.`);
  }
  if (wordCount > 1300) {
    warnings.push(`${wordCount} mots. Trop long pour un article GEO specialise.`);
  }

  const answerSentences = article.direct_answer
    .split(/[.!?]+/)
    .filter((s) => s.trim().length > 0).length;
  if (answerSentences > 4) {
    warnings.push("direct_answer trop long.");
  }
  if (/^(dans cet article|nous allons|vous decouvrirez|cet article)/i.test(normalize(article.direct_answer))) {
    errors.push("direct_answer commence par une introduction.");
  }

  const factBlob = normalize(opts.brandFacts.join(" "));
  const numbers = [...text.matchAll(/\b\d+([.,]\d+)?\s?(€|%|g\/m|jours?|coloris|cm)?/gi)]
    .map((m) => m[0].trim())
    .filter((n) => /\d/.test(n));
  const unbacked = [...new Set(numbers)].filter((n) => {
    const digits = n.match(/\d+/)?.[0];
    return digits && !factBlob.includes(digits);
  });
  if (unbacked.length > 0) {
    warnings.push(`Chiffres a verifier : ${unbacked.join(", ")}`);
  }

  return { passed: errors.length === 0, errors, warnings, wordCount };
}

export function buildRepairPrompt(report: LintReport): string {
  return `L'article ne passe pas le controle qualite. Corrige strictement les points suivants et renvoie le JSON complet :

${report.errors.map((e) => `- ${e}`).join("\n")}
${report.warnings.length ? `\nA ameliorer si possible :\n${report.warnings.map((w) => `- ${w}`).join("\n")}` : ""}`;
}
