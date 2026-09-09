/**
 * Maillage interne du blog — types + helpers purs (client + serveur).
 *
 * La donnée canonique vit dans `referentiels/blog_internal_links.json` (éditable,
 * git-traçable, handles réels uniquement). Le loader fs est dans
 * `internal-links.server.ts` ; ce module ne contient que des types et des
 * fonctions pures.
 */

export interface BlogInternalLink {
  id: string;
  label: string;
  url: string;
  tags: string[];
}

export interface BlogInternalLinksReferentiel {
  _meta: { schema_version: string; referentiel: string; last_updated: string; description: string; regle: string };
  links: BlogInternalLink[];
}

const KEYWORD_TAGS: Record<string, string[]> = {
  maman: ["maman"], "fête des mères": ["maman"], "fete des meres": ["maman"],
  papa: ["papa"], "fête des pères": ["papa"], "fete des peres": ["papa"],
  famille: ["famille"],
  couple: ["couple", "mariage"], mariage: ["mariage", "couple"], marié: ["mariage"], evjf: ["evjf", "mariage"],
  naissance: ["naissance", "bebe"], bébé: ["naissance", "bebe"], bebe: ["naissance", "bebe"],
  animal: ["animaux"], animaux: ["animaux"],
  anniversaire: ["anniversaire"],
  rentrée: ["rentree"], rentree: ["rentree"], école: ["rentree"], ecole: ["rentree"], enfant: ["enfant", "rentree"],
  noël: ["noel"], noel: ["noel"], "secret santa": ["secret-santa"],
  humour: ["humour"],
  cadeau: ["cadeau", "offrir"], offrir: ["cadeau", "offrir"],
  motif: ["motifs"], personnalis: ["personnalisation"],
  entretien: ["entretien"], lavage: ["entretien"], durabilité: ["entretien"], durabilite: ["entretien"],
  sweat: ["sweat"], hoodie: ["hoodie"], "t-shirt": ["tshirt"], tshirt: ["tshirt"],
  atelier: ["atelier", "technique"], broderie: ["broderie", "technique"],
};

function normalize(s: string): string {
  return s.toLocaleLowerCase("fr-FR").normalize("NFD").replace(/[̀-ͯ]/g, "");
}

function relevantTags(targetQuery: string, angle: string, subQueries: string[]): Set<string> {
  const brief = normalize([targetQuery, angle, ...subQueries].join(" "));
  const tags = new Set<string>();
  for (const [keyword, mapped] of Object.entries(KEYWORD_TAGS)) {
    if (brief.includes(normalize(keyword))) mapped.forEach((t) => tags.add(t));
  }
  return tags;
}

/** Sélectionne 1 à `limit` liens pertinents pour le brief ; complète avec des liens génériques si besoin. */
export function selectInternalLinks(
  referentiel: BlogInternalLinksReferentiel,
  targetQuery: string,
  angle: string,
  subQueries: string[],
  limit = 3
): BlogInternalLink[] {
  const tags = relevantTags(targetQuery, angle, subQueries);
  const scored = referentiel.links
    .map((link) => ({ link, score: link.tags.filter((t) => tags.has(t)).length }))
    .sort((a, b) => b.score - a.score);

  const picked: BlogInternalLink[] = [];
  for (const { link, score } of scored) {
    if (picked.length >= limit) break;
    if (score > 0 || picked.length < Math.min(1, limit)) picked.push(link);
  }
  if (picked.length === 0) return referentiel.links.slice(0, Math.min(limit, referentiel.links.length));
  return picked;
}
