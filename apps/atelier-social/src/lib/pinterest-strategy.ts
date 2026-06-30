/**
 * Stratégie Pinterest Ypersoa — types + helpers purs (client + serveur).
 *
 * La donnée canonique vit dans `referentiels/pinterest_strategy.json` (éditable,
 * git-traçable). Le loader fs est dans `pinterest-strategy.server.ts` ; ce module
 * ne contient QUE des types et des fonctions pures (importable côté client).
 *
 * Logique : Pinterest = moteur de recherche. 1 épingle = 1 mot-clé principal
 * (longue traîne) en tête de titre + description + surimpression image, puis
 * 4-6 mots-clés secondaires. Voir CLAUDE.md règles brand (vocabulaire
 * consumer-facing : jamais de référence machine ni « fait main »).
 */

export type PinterestComposition = "flatlay" | "worn";

export interface PinterestFormat {
  id: string;
  label: string;
  role: string;
  composition: PinterestComposition;
  prompt: string;
}

export interface PinterestFiche {
  id: string;
  ypm_id: string;
  nom: string;
  intention: string;
  occasions_cles: string[];
  format_hero_hint: string;
  texte_surimpression: string;
  mots_cles: string[];
}

export interface PinterestStrategy {
  _meta: {
    schema_version: string;
    referentiel: string;
    last_updated: string;
    description: string;
    format: { ratio: string; px: string; note: string };
    logique_seo: string;
  };
  vocabulaire: { autorise: string[]; interdit: string[] };
  ancres_generiques: string[];
  /** Tags présents sur CHAQUE épingle (trafic large). Le tag produit s'adapte au produit réel. */
  tags_permanents?: string[];
  slots_saisonniers: Record<string, string | null>;
  formats: {
    hero: PinterestFormat;
    desir: PinterestFormat;
    association: PinterestFormat;
    lifestyle: PinterestFormat;
  };
  fiches: PinterestFiche[];
  mapping_occasions: Record<string, string[]>;
}

/** Retrouve une fiche par son id. */
export function getFiche(strategy: PinterestStrategy, ficheId: string): PinterestFiche | undefined {
  return strategy.fiches.find((f) => f.id === ficheId);
}

/** Fiches recommandées pour une occasion (mapping occasions → motifs). */
export function suggestFichesForOccasion(
  strategy: PinterestStrategy,
  occasionId: string
): PinterestFiche[] {
  const ids = strategy.mapping_occasions[occasionId] ?? [];
  return ids
    .map((id) => getFiche(strategy, id))
    .filter((f): f is PinterestFiche => Boolean(f));
}

/** Première fiche suggérée pour une occasion, ou la première fiche du catalogue en secours. */
export function defaultFicheForOccasion(
  strategy: PinterestStrategy,
  occasionId: string
): PinterestFiche | undefined {
  return suggestFichesForOccasion(strategy, occasionId)[0] ?? strategy.fiches[0];
}

/** Tags Pinterest groupés par intention de trafic (pour affichage + ordre). */
export interface PinterestTagCategories {
  /** Lié à l'occasion / la saison (slot saisonnier). */
  saisonnier: string[];
  /** Lié au motif + au type de produit (mots-clés niche + produit). */
  produit: string[];
  /** Trafic constant toute l'année (ancres génériques). */
  evergreen: string[];
  /** Présents sur chaque épingle (trafic large garanti). */
  permanent: string[];
}

export interface PinterestKeywords {
  /** Mot-clé principal longue traîne — tête de titre + début de description + surimpression. */
  principal: string;
  /** Mots-clés secondaires (niche fiche + ancres génériques + slot saisonnier), dédupliqués. */
  secondaires: string[];
  /** Liste complète ordonnée (principal en tête) — sert de tags Pinterest. */
  tous: string[];
  /** Mêmes tags que `tous`, groupés par intention de trafic. */
  categories: PinterestTagCategories;
  /** Texte de surimpression recommandé pour l'image. */
  surimpression: string;
}

const norm = (s: string) => s.trim().toLowerCase();

// Nom consumer du produit (pour que la copy parle du VRAI vêtement sélectionné,
// pas de celui implicite dans les mots-clés de la fiche). Ex. fiche Le Roman =
// casquette, mais si Sarah sélectionne un hoodie → on parle de « sweat à capuche ».
export const PRODUCT_NOUNS: Record<string, string> = {
  YP001: "sweat à capuche",
  YP004: "sweat à capuche enfant",
  YP005: "sweat",
  YP019: "t-shirt",
  YP021: "hoodie zippé",
  YP013: "casquette",
  YP022: "t-shirt",
  YP023: "t-shirt",
};

export function productNounFor(productId?: string): string | undefined {
  return productId ? PRODUCT_NOUNS[productId] : undefined;
}

// Noms de vêtement détectables dans un mot-clé, du plus long au plus court.
const GARMENT_NOUNS = [
  "sweat à capuche",
  "hoodie zippé",
  "tee-shirt",
  "t-shirt",
  "casquette",
  "hoodie",
  "sweat",
  "body",
];

/** Remplace le nom de vêtement présent dans un texte par le produit réellement sélectionné. */
function adaptGarment(text: string, productNoun?: string): string {
  if (!productNoun) return text;
  if (text.toLowerCase().includes(productNoun.toLowerCase())) return text;
  for (const g of GARMENT_NOUNS) {
    if (g.toLowerCase() === productNoun.toLowerCase()) continue;
    const re = new RegExp(g.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    if (re.test(text)) return text.replace(re, productNoun);
  }
  return text;
}

/**
 * Assemble les mots-clés d'une épingle en mixant 4 intentions de trafic :
 *  - SAISONNIER : slot saisonnier de l'occasion (cadeau fête des mères personnalisé…)
 *  - PRODUIT    : mots-clés niche du motif + type de produit réel (t-shirt personnalisé…)
 *  - EVERGREEN  : ancres génériques (trafic constant toute l'année)
 *  - PERMANENT  : `tags_permanents`, présents sur CHAQUE épingle (trafic large garanti)
 *
 * Le mot-clé `principal` (tête de titre + ouverture description) = slot saisonnier
 * sinon 1er mot-clé niche. Le tout est dédupliqué (précédence permanent > saisonnier
 * > produit > evergreen pour le classement) et capé à `maxTags`, les permanents
 * étant toujours conservés.
 */
export function buildPinterestKeywords(
  strategy: PinterestStrategy,
  ficheId: string,
  occasionId: string,
  productNoun?: string,
  maxTags = 15
): PinterestKeywords | null {
  const fiche = getFiche(strategy, ficheId);
  if (!fiche) return null;

  const slot = strategy.slots_saisonniers[occasionId] ?? null;
  // On adapte le nom de vêtement des mots-clés au produit réellement sélectionné.
  const niche = fiche.mots_cles.map((k) => adaptGarment(k, productNoun));
  const principal = adaptGarment(slot ?? niche[0], productNoun);

  // Sources brutes par catégorie (déjà adaptées au produit réel).
  const saisonnierRaw = slot ? [adaptGarment(slot, productNoun)] : [];
  const produitRaw = [
    ...niche,
    ...(productNoun
      ? [`${productNoun} personnalisé`, `${productNoun} brodé prénom`]
      : []),
  ];
  const evergreenRaw = strategy.ancres_generiques.map((a) => adaptGarment(a, productNoun));
  const permanentRaw = (strategy.tags_permanents ?? []).map((a) => adaptGarment(a, productNoun));

  // Liste plate ordonnée : saisonnier → produit → evergreen (le principal arrive
  // naturellement en tête), puis permanents toujours ajoutés en réserve.
  const seen = new Set<string>();
  const tous: string[] = [];
  const tryPush = (kw: string, limit: number) => {
    const n = norm(kw);
    if (!kw || seen.has(n) || tous.length >= limit) return;
    seen.add(n);
    tous.push(kw);
  };

  const nonPermLimit = Math.max(0, maxTags - permanentRaw.length);
  [...saisonnierRaw, ...produitRaw, ...evergreenRaw].forEach((kw) =>
    tryPush(kw, nonPermLimit)
  );
  // Permanents : toujours présents (réserve garantie en fin de liste).
  permanentRaw.forEach((kw) => tryPush(kw, maxTags));

  // Classement par catégorie (précédence permanent > saisonnier > produit > evergreen).
  const permSet = new Set(permanentRaw.map(norm));
  const saisSet = new Set(saisonnierRaw.map(norm));
  const prodSet = new Set(produitRaw.map(norm));
  const categories: PinterestTagCategories = {
    saisonnier: [],
    produit: [],
    evergreen: [],
    permanent: [],
  };
  for (const tag of tous) {
    const n = norm(tag);
    if (permSet.has(n)) categories.permanent.push(tag);
    else if (saisSet.has(n)) categories.saisonnier.push(tag);
    else if (prodSet.has(n)) categories.produit.push(tag);
    else categories.evergreen.push(tag);
  }

  return {
    principal,
    secondaires: tous.filter((t) => norm(t) !== norm(principal)),
    tous,
    categories,
    surimpression: adaptGarment(fiche.texte_surimpression, productNoun),
  };
}
