import type { ConversionGoal } from "./geo-prompt";
import type { EditorialDetail } from "./editorial-bank";

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
  internal_links: { label: string; url: string }[];
  coverage_note: string;
}

export interface LintReport {
  passed: boolean;
  errors: string[];
  warnings: string[];
  wordCount: number;
  editorialFingerprintHits: string[];
  editorialDetailIds: string[];
}

export const DEFAULT_VOCAB_RULES: VocabRule[] = [
  { kind: "forbidden", pattern: "tajima", label: "Nom de materiel interne" },
  { kind: "forbidden", pattern: "m[ée]tier\\s+[àa]\\s+broder", label: "Nom de materiel interne" },
  { kind: "forbidden", pattern: "machine\\s+(industrielle|[àa]\\s+broder)", label: "Materiel industriel" },
  { kind: "forbidden", pattern: "brodeuse\\s+industrielle", label: "Materiel industriel" },
  { kind: "forbidden", pattern: "fait[\\s-]main", label: "Hors charte" },
  { kind: "forbidden", pattern: "handmade", label: "Hors charte" },
  { kind: "forbidden", pattern: "cousu\\s+main", label: "Hors charte" },
  {
    kind: "forbidden",
    pattern: "(tienn|dur)\\w*\\s+aussi\\s+longtemps\\s+que\\s+(tes|ses|vos|leurs)",
    label: "Promesse emotionnelle vague (motif banni, ex: \"tienne aussi longtemps que tes plus belles aventures\")",
  },
  { kind: "required", pattern: "brod[ée]\\s+[àa]\\s+la\\s+commande", label: "A la commande" },
  { kind: "required", pattern: "Wattrelos|Hauts[\\s-]de[\\s-]France", label: "Ancrage regional" },
  { kind: "required", pattern: "cousu\\w*\\s+pour\\s+durer", label: "Durabilite" },
  { kind: "required", pattern: "personnalis", label: "Personnalisation" },
  { kind: "required", pattern: "Hauts[\\s-]de[\\s-]France", label: "Ancrage regional" },
];

const CLICHES_BANNED = [
  "fait la difference", "marque les esprits", "un veritable compagnon",
  "va bien au-dela de l'ordinaire", "afficher un style qui lui ressemble",
  "une promesse de durabilite", "l'energie debordante de nos petits",
  "d'innombrables aventures", "lui donner une ame", "une qualite percue incomparable",
  "le secret d'un vetement qui plait et qui dure", "repartir du bon pied",
  "des nouveautes qui donnent le sourire", "un cadeau pense et prepare avec soin",
  "consommer mieux", "des objets qui ont du sens", "a portee de clic",
  "la qualite est au rendez-vous",
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
    ...a.internal_links.map((l) => l.label),
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

/** Un fingerprint purement numerique doit matcher un nombre entier (evite "24" dans "124"). */
function matchesFingerprint(normalizedText: string, fingerprint: string): boolean {
  const norm = normalize(fingerprint);
  if (/^\d+$/.test(norm)) {
    return new RegExp(`(?<!\\d)${norm}(?!\\d)`).test(normalizedText);
  }
  return normalizedText.includes(norm);
}

const STOPWORDS = new Set([
  "dans", "avec", "pour", "sans", "cette", "vous", "nous", "leur", "leurs",
  "elle", "elles", "sont", "\u00eatre", "etre", "faire", "fait", "peut", "peux",
  "veux", "veut", "sur", "une", "des", "les", "que", "qui", "est", "vos",
  "ton", "tes", "notre", "votre", "comment", "quel", "quels", "quelle",
  "quelles", "sera", "j'ai", "je", "tu", "on",
]);

function significantWords(s: string): Set<string> {
  return new Set(
    normalize(s)
      .split(/[^a-z0-9']+/)
      .filter((w) => w.length >= 4 && !STOPWORDS.has(w))
  );
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const w of a) if (b.has(w)) inter += 1;
  const union = a.size + b.size - inter;
  return union === 0 ? 0 : inter / union;
}

export function lintArticle(
  article: ArticlePayload,
  opts: {
    targetQuery: string;
    rules?: VocabRule[];
    brandFacts: string[];
    minRequiredHits?: number;
    editorialDetails?: EditorialDetail[];
    subQueries?: string[];
    linkPool?: { url: string }[];
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

  const normalizedText = normalize(text);

  // Une empreinte de la banque de vrai ne compte que si TOUS ses mots-cles
  // survivent : une empreinte partielle est le signe d'un fait paraphrase
  // jusqu'a perdre sa chute (ex: "9, 10, 12, 24" degrade en "entre 9 et 24").
  const detailStatuses = (opts.editorialDetails ?? []).map((detail) => {
    const hits = detail.fingerprints.filter((fp) => matchesFingerprint(normalizedText, fp));
    return { detail, hits, complete: hits.length > 0 && hits.length === detail.fingerprints.length };
  });
  const partialDetails = detailStatuses.filter((s) => s.hits.length > 0 && !s.complete);
  for (const p of partialDetails) {
    errors.push(
      `Empreinte partielle sur la banque de vrai "${p.detail.id}" : ${p.hits.length}/${p.detail.fingerprints.length} mots-cles gardes (${p.hits.join(", ")}). La chute du fait est paraphrasee ou incomplete. Reprends le fait avec tous ses mots-cles, ou ne l'utilise pas.`
    );
  }
  const completeDetails = detailStatuses.filter((s) => s.complete);
  const editorialDetailIds = completeDetails.map((s) => s.detail.id);
  const editorialFingerprintHits = [...new Set(completeDetails.flatMap((s) => s.hits))];

  for (const cliche of CLICHES_BANNED) {
    if (normalizedText.includes(cliche)) errors.push(`Cliche interdit : « ${cliche} ».`);
  }

  const required = rules.filter((r) => r.kind === "required");
  const hits = required.filter((r) => new RegExp(r.pattern, "i").test(text));
  const minHits = opts.minRequiredHits ?? 2;
  if (hits.length < minHits) {
    errors.push(`Argumentaire de marque trop faible : ${hits.length}/${minHits}.`);
  }
  if (opts.editorialDetails?.length && completeDetails.length < 2) {
    errors.push(`Pas assez d'empreintes completes de la banque de vrai : ${completeDetails.length}/2 requises (chaque fait garde TOUS ses mots-cles, pas une partie).`);
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

  // Une section H2 ne doit pas recopier mot pour mot la question cliente
  // fournie en brief : elle doit devenir un titre thematique, pas une citation.
  for (const sub of opts.subQueries ?? []) {
    const subNorm = normalize(sub);
    const echoedH2 = article.sections.find((s) => normalize(s.h2) === subNorm);
    if (echoedH2) {
      errors.push(`Le H2 "${echoedH2.h2}" recopie mot pour mot une question cliente du brief ; reformule en titre thematique.`);
    }
  }

  // La FAQ finale doit couvrir des questions distinctes des sections, pas les
  // reformuler : sinon l'article a deux blocs FAQ qui se marchent dessus.
  for (const f of article.faq) {
    const faqWords = significantWords(f.question);
    for (const s of article.sections) {
      const overlap = jaccard(faqWords, significantWords(s.h2));
      if (overlap > 0.5) {
        errors.push(`La question FAQ "${f.question}" redite la section "${s.h2}" ; couvre une question distincte, pas deja traitee.`);
        break;
      }
    }
  }

  // Les liens internes doivent venir du pool fourni (jamais un handle invente)
  // et etre en nombre raisonnable pour un article court.
  if (article.internal_links.length < 1) {
    errors.push("Aucun lien interne : ajoute 1 a 3 liens choisis dans la liste fournie.");
  } else if (article.internal_links.length > 4) {
    warnings.push(`${article.internal_links.length} liens internes : reste plutot sur 1 a 3 pour un article court.`);
  }
  const GENERIC_ANCHORS = ["cliquez ici", "ici", "en savoir plus", "lien"];
  for (const l of article.internal_links) {
    if (GENERIC_ANCHORS.includes(normalize(l.label))) {
      errors.push(`Ancre de lien trop generique : "${l.label}". Ecris une ancre descriptive.`);
    }
    if (opts.linkPool?.length && !opts.linkPool.some((p) => p.url === l.url)) {
      errors.push(`Lien interne hors liste : "${l.url}" n'existe pas dans le pool fourni. N'invente jamais un handle.`);
    }
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
  if (wordCount < 650) {
    warnings.push(`${wordCount} mots seulement. Viser 650 a 1100.`);
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

  return { passed: errors.length === 0, errors, warnings, wordCount, editorialFingerprintHits, editorialDetailIds };
}

export function buildRepairPrompt(report: LintReport): string {
  return `L'article ne passe pas le controle qualite. Corrige strictement les points suivants et renvoie le JSON complet :

${report.errors.map((e) => `- ${e}`).join("\n")}
${report.warnings.length ? `\nA ameliorer si possible :\n${report.warnings.map((w) => `- ${w}`).join("\n")}` : ""}`;
}
