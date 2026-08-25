/**
 * Brand-safety Planable — vérifie le texte consumer-facing (caption, overlay, hashtags)
 * contre les red lines Ypersoa. Aligné sur atelier-social + mémoire feedback_vocab_fabrication :
 * vocabulaire client = « brodé à la commande », JAMAIS de référence machine ni « fait main ».
 */

export type BrandSafetyStatus = "ok" | "warning" | "critical";

export interface BrandSafetyIssue {
  term: string;
  severity: "critical" | "warning";
}

export interface BrandSafetyResult {
  status: BrandSafetyStatus;
  issues: BrandSafetyIssue[];
}

// CRITICAL = red lines absolues : machine/équipement/fil (réservé au pro), « fait main », marketplaces.
const FORBIDDEN_CRITICAL = [
  "métier tajima",
  "tajima",
  "machine à broder",
  "gunold",
  "madeira",
  "isacord",
  "brodé à la main",
  "brodée à la main",
  "brodés à la main",
  "brodées à la main",
  "broderie à la main",
  "fait main",
  "faite main",
  "etsy",
  "amazon",
  "vinted",
  "marketplace",
];

// WARNING = vouvoiement (la marque tutoie toujours).
const WARNING_REGEX = /\b(vous|votre|vos)\b/i;

export function checkBrandSafety(...texts: Array<string | null | undefined>): BrandSafetyResult {
  const haystack = texts.filter(Boolean).join(" \n ");
  const lower = haystack.toLowerCase();
  const issues: BrandSafetyIssue[] = [];

  for (const term of FORBIDDEN_CRITICAL) {
    if (lower.includes(term)) issues.push({ term, severity: "critical" });
  }
  if (WARNING_REGEX.test(haystack)) {
    issues.push({ term: "vouvoiement", severity: "warning" });
  }

  const status: BrandSafetyStatus = issues.some((i) => i.severity === "critical")
    ? "critical"
    : issues.length > 0
      ? "warning"
      : "ok";

  return { status, issues };
}
