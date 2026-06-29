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

export interface PinterestKeywords {
  /** Mot-clé principal longue traîne — tête de titre + début de description + surimpression. */
  principal: string;
  /** Mots-clés secondaires (niche fiche + ancres génériques + slot saisonnier), dédupliqués. */
  secondaires: string[];
  /** Liste complète ordonnée (principal en tête) — sert de tags Pinterest. */
  tous: string[];
  /** Texte de surimpression recommandé pour l'image. */
  surimpression: string;
}

const norm = (s: string) => s.trim().toLowerCase();

/**
 * Assemble les mots-clés d'une épingle :
 *  - principal = slot saisonnier de l'occasion s'il existe, sinon 1er mot-clé niche
 *  - secondaires = mots-clés niche restants + ancres génériques (longue traîne)
 *  - capés à `maxTags` au total (Pinterest tags 8-10)
 */
export function buildPinterestKeywords(
  strategy: PinterestStrategy,
  ficheId: string,
  occasionId: string,
  maxTags = 10
): PinterestKeywords | null {
  const fiche = getFiche(strategy, ficheId);
  if (!fiche) return null;

  const slot = strategy.slots_saisonniers[occasionId] ?? null;
  const niche = fiche.mots_cles;
  const principal = slot ?? niche[0];

  const ordered: string[] = [principal];
  const seen = new Set<string>([norm(principal)]);
  const push = (kw: string) => {
    const n = norm(kw);
    if (!seen.has(n)) {
      seen.add(n);
      ordered.push(kw);
    }
  };

  // 1. mots-clés niche (cœur du ciblage)
  niche.forEach(push);
  // 2. ancres génériques (longue traîne réutilisable)
  strategy.ancres_generiques.forEach(push);

  const tous = ordered.slice(0, maxTags);
  return {
    principal,
    secondaires: tous.slice(1),
    tous,
    surimpression: fiche.texte_surimpression,
  };
}
