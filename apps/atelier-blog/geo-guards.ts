/**
 * Hub Ypersoa — Générateur d'articles GEO
 * Garde-fous déterministes : gate (avant IA) et lint (après IA).
 *
 * Volontairement sans appel modèle. Les règles de vocabulaire Ypersoa sont
 * absolues : on ne demande pas à un modèle de juger s'il a respecté une
 * interdiction, on vérifie.
 */

import type { ConversionGoal } from "./geo-prompt";

// ============================================================================
// 1. GATE — s'exécute AVANT toute génération
// ============================================================================

export interface GateInput {
  targetQuery: string;
  /** 1 = SERP verrouillée par de gros acteurs · 5 = SERP vide. Noté à la main. */
  serpSoftness: number;
  conversionGoal: ConversionGoal | "aucun";
  angle: string;
}

export interface GateResult {
  passed: boolean;
  reasons: string[];
}

/** Requêtes transactionnelles courtes : terrain payant, pas SEO organique. */
const TRANSACTIONAL_PATTERNS = [
  /^(acheter|achat|prix|pas cher|promo|soldes)\b/i,
  /\b(pas cher|meilleur prix|moins cher)\b/i,
];

export function runGate(input: GateInput): GateResult {
  const reasons: string[] = [];
  const q = input.targetQuery.trim();

  // Critère 1 — la requête est-elle assez précise pour porter un H1 ?
  const wordCount = q.split(/\s+/).filter(Boolean).length;
  if (wordCount < 3) {
    reasons.push(
      `Requête trop courte (${wordCount} mots). Une requête de tête ne se gagne pas en organique : resserre en longue traîne.`
    );
  }
  if (TRANSACTIONAL_PATTERNS.some((p) => p.test(q))) {
    reasons.push(
      "Requête transactionnelle courte. Terrain SEA / Google Shopping / Pinterest, pas SEO organique. Le générateur ne produit pas dessus."
    );
  }

  // Critère 2 — la SERP est-elle molle ?
  if (!Number.isFinite(input.serpSoftness) || input.serpSoftness < 3) {
    reasons.push(
      `SERP trop concurrentielle (molesse ${input.serpSoftness}/5, minimum 3). Le rang de récupération domine : une page non récupérée n'est jamais citée.`
    );
  }

  // Critère 3 — l'article sert-il une conversion identifiée ?
  if (input.conversionGoal === "aucun") {
    reasons.push(
      "Aucun objectif de conversion. Un article qui ne sert ni le Club, ni le défensif de marque, ni une occasion ne sert à rien."
    );
  }

  // Garde-fou anti-exhaustivité dès le brief
  if (!input.angle || input.angle.trim().length < 15) {
    reasons.push(
      "Angle absent ou trop vague. Un angle unique et nommé est la condition de la spécialisation."
    );
  }

  return { passed: reasons.length === 0, reasons };
}

// ============================================================================
// 2. LINT — s'exécute APRÈS génération
// ============================================================================

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
    rules: VocabRule[];
    brandFacts: string[];
    minRequiredHits?: number;
  }
): LintReport {
  const errors: string[] = [];
  const warnings: string[] = [];
  const text = flatten(article);
  const wordCount = text.split(/\s+/).filter(Boolean).length;

  // --- Vocabulaire interdit : hard fail ---
  for (const rule of opts.rules.filter((r) => r.kind === "forbidden")) {
    const re = new RegExp(rule.pattern, "i");
    if (re.test(text)) {
      const hit = text.match(re)?.[0] ?? rule.pattern;
      errors.push(`Vocabulaire interdit : « ${hit} » — ${rule.label}`);
    }
  }

  // --- Vocabulaire requis : au moins N règles distinctes présentes ---
  const required = opts.rules.filter((r) => r.kind === "required");
  const hits = required.filter((r) => new RegExp(r.pattern, "i").test(text));
  const minHits = opts.minRequiredHits ?? 2;
  if (hits.length < minHits) {
    errors.push(
      `Argumentaire de marque trop faible : ${hits.length}/${minHits} axes présents. Manquants : ${required
        .filter((r) => !hits.includes(r))
        .map((r) => r.label)
        .join(", ")}`
    );
  }

  // --- H1 = requête cible, mot pour mot ---
  if (normalize(article.h1) !== normalize(opts.targetQuery)) {
    errors.push(
      `H1 ≠ requête cible. Attendu « ${opts.targetQuery} », obtenu « ${article.h1} ». La correspondance exacte des titres est le principal levier de citation.`
    );
  }

  // --- Structure ---
  if (article.sections.length < 3 || article.sections.length > 5) {
    errors.push(
      `${article.sections.length} sections (attendu 3 à 5). Trop peu = trop mince, trop = glissement vers le guide exhaustif.`
    );
  }
  if (article.faq.length < 3 || article.faq.length > 5) {
    errors.push(`${article.faq.length} entrées FAQ (attendu 3 à 5).`);
  }
  if (!article.coverage_note || article.coverage_note.trim().length < 20) {
    errors.push(
      "coverage_note vide ou trop courte : l'article ne prouve pas sa spécialisation. Resserrer l'angle."
    );
  }

  // --- Métadonnées ---
  if (article.meta_title.length > 60) {
    warnings.push(`meta_title : ${article.meta_title.length} car. (max 60).`);
  }
  if (article.meta_description.length > 155) {
    warnings.push(
      `meta_description : ${article.meta_description.length} car. (max 155).`
    );
  }

  // --- Longueur ---
  if (wordCount < 600) {
    warnings.push(`${wordCount} mots — court, viser 700 à 1100.`);
  }
  if (wordCount > 1300) {
    warnings.push(
      `${wordCount} mots — au-delà de 1100, on glisse vers le guide exhaustif qui sous-performe en citation.`
    );
  }

  // --- Réponse directe extractible ---
  const answerSentences = article.direct_answer
    .split(/[.!?]+/)
    .filter((s) => s.trim().length > 0).length;
  if (answerSentences > 4) {
    warnings.push(
      `direct_answer : ${answerSentences} phrases — viser 2 à 3 pour un bloc citable net.`
    );
  }
  if (/^(dans cet article|nous allons|vous découvrirez|cet article)/i.test(article.direct_answer.trim())) {
    errors.push(
      "direct_answer commence par une formule d'introduction : le bloc doit répondre immédiatement, sans annonce."
    );
  }

  // --- Chiffres non adossés aux faits vérifiés (warning) ---
  const factBlob = normalize(opts.brandFacts.join(" "));
  const numbers = [...text.matchAll(/\b\d+([.,]\d+)?\s?(€|%|g\/m|jours?|coloris|cm)?/gi)]
    .map((m) => m[0].trim())
    .filter((n) => /\d/.test(n));
  const unbacked = [...new Set(numbers)].filter((n) => {
    const digits = n.match(/\d+/)?.[0];
    return digits && digits.length > 0 && !factBlob.includes(digits);
  });
  if (unbacked.length > 0) {
    warnings.push(
      `Chiffres absents des faits vérifiés, à contrôler manuellement : ${unbacked.join(", ")}`
    );
  }

  return { passed: errors.length === 0, errors, warnings, wordCount };
}

/** Feedback injecté dans la boucle de correction (1 seule passe). */
export function buildRepairPrompt(report: LintReport): string {
  return `L'article ne passe pas le contrôle qualité. Corrige STRICTEMENT les points suivants, sans réécrire ce qui est déjà conforme, et renvoie le JSON complet corrigé :

${report.errors.map((e) => `- ${e}`).join("\n")}
${report.warnings.length ? `\nÀ améliorer si possible :\n${report.warnings.map((w) => `- ${w}`).join("\n")}` : ""}`;
}
