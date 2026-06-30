/**
 * Hashtags Instagram Ypersoa — types + helper pur (client + serveur).
 *
 * La donnée canonique vit dans `referentiels/instagram_hashtags.json` (éditable,
 * git-traçable). Le loader fs est dans `instagram-hashtags.server.ts` ; ce module
 * ne contient QUE des types et des fonctions pures (importable côté client).
 *
 * Logique : Instagram ≠ Pinterest. Pas de mots-clés longue traîne SEO, mais des
 * hashtags d'ENGAGEMENT + ACQUISITION qui fédèrent et amènent du trafic. On
 * construit une banque evergreen puis on pioche 5 tags ciblés et variés à chaque
 * post selon la formule de Maï :
 *
 *   1 socle marque + 1 produit + 1 occasion + 1 niche/style + 1 communauté/local
 *
 * La rotation (offset) évite de re-servir le même paquet de hashtags à chaque
 * génération — Instagram déprécie les blocs de tags identiques répétés.
 */

export interface InstagramHashtagBank {
  _meta: Record<string, unknown>;
  socle_marque: string[];
  communaute_local: string[];
  niche_style: string[];
  niche_groupes: Record<string, string[]>;
  produits: Record<string, string[]>;
  occasions: Record<string, string[]>;
  produit_mapping: Record<string, string>;
  occasion_mapping: Record<string, { occasion: string | null; niche: string | null }>;
}

/** Les 5 emplacements de la formule, dans l'ordre d'affichage. */
export interface InstagramHashtagSlots {
  /** Identité de marque / craft (#ypersoa, #broderiepersonnalisée…). */
  socle: string[];
  /** Type de vêtement réel (#sweatbrodé, #casquettebrodée…). */
  produit: string[];
  /** Moment / motivation d'achat (#cadeaunaissance, #cadeaufêtedesmères…). */
  occasion: string[];
  /** Territoire éditorial ou style (#brodéàdeux, #prénombrodé…). */
  niche: string[];
  /** Communauté & ancrage local (#madeinfrance, #hautsdefrance…). */
  communaute: string[];
}

export interface InstagramHashtags {
  /** Les hashtags retenus, ordre formule, dédupliqués. */
  tags: string[];
  /** Mêmes tags groupés par emplacement (pour l'affichage). */
  slots: InstagramHashtagSlots;
  /** Ligne prête à coller (tags séparés par espace). */
  ligne: string;
}

const normTag = (s: string) => s.trim().toLowerCase();

/** Pioche `n` tags distincts d'un pool à partir d'un offset (rotation circulaire). */
function pickFrom(pool: string[] | undefined, n: number, offset: number, seen: Set<string>): string[] {
  if (!pool || pool.length === 0 || n <= 0) return [];
  const out: string[] = [];
  const len = pool.length;
  for (let i = 0; i < len && out.length < n; i++) {
    const tag = pool[(offset + i) % len];
    const key = normTag(tag);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(tag);
  }
  return out;
}

/**
 * Construit le paquet de hashtags d'un post Instagram en mixant les 5 emplacements
 * de la formule. `rotate` fait tourner les pools (passe un entier dérivé du temps
 * ou aléatoire pour varier d'un post à l'autre). `perSlot` = nb de tags par
 * emplacement (1 par défaut → 5 tags au total).
 *
 * Robustesse : si un emplacement n'a pas de mapping (produit/occasion inconnus),
 * on complète depuis les pools evergreen (niche → socle → communauté) pour
 * toujours rendre un paquet utile et varié.
 */
export function buildInstagramHashtags(
  bank: InstagramHashtagBank,
  opts: {
    productId?: string;
    occasionId?: string;
    rotate?: number;
    perSlot?: number;
  } = {}
): InstagramHashtags {
  const rotate = Math.abs(Math.trunc(opts.rotate ?? 0));
  const perSlot = Math.max(1, opts.perSlot ?? 1);
  const seen = new Set<string>();

  const occMap = opts.occasionId ? bank.occasion_mapping[opts.occasionId] : undefined;
  const prodKey = opts.productId ? bank.produit_mapping[opts.productId] : undefined;

  const occasionPool = occMap?.occasion ? bank.occasions[occMap.occasion] : undefined;
  const nichePool = occMap?.niche ? bank.niche_groupes[occMap.niche] : undefined;
  const produitPool = prodKey ? bank.produits[prodKey] : undefined;

  // Offsets décalés par emplacement pour ne pas piocher toujours le 1er tag.
  const slots: InstagramHashtagSlots = {
    socle: pickFrom(bank.socle_marque, perSlot, rotate, seen),
    produit: pickFrom(produitPool, perSlot, rotate, seen),
    occasion: pickFrom(occasionPool, perSlot, rotate, seen),
    // niche : territoire éditorial dédié sinon pool style générique.
    niche: pickFrom(nichePool ?? bank.niche_style, perSlot, rotate + 1, seen),
    communaute: pickFrom(bank.communaute_local, perSlot, rotate, seen),
  };

  // Complète les emplacements vides (produit/occasion sans mapping) pour garder
  // un paquet riche et varié : niche style → socle → communauté.
  const want = perSlot * 5;
  let total =
    slots.socle.length +
    slots.produit.length +
    slots.occasion.length +
    slots.niche.length +
    slots.communaute.length;
  if (total < want) {
    const fillers = [bank.niche_style, bank.socle_marque, bank.communaute_local];
    for (const pool of fillers) {
      if (total >= want) break;
      const extra = pickFrom(pool, want - total, rotate + 2, seen);
      slots.niche.push(...extra);
      total += extra.length;
    }
  }

  const tags = [
    ...slots.socle,
    ...slots.produit,
    ...slots.occasion,
    ...slots.niche,
    ...slots.communaute,
  ];

  return { tags, slots, ligne: tags.join(" ") };
}
