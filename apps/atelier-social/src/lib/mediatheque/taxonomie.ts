/**
 * Médiathèque — taxonomie de tags (seed).
 *
 * Copie typée du seed SQL `docs/PLAN_MEDIATHEQUE/seed_tags_taxonomie.sql`.
 * Sert de fallback côté UI tant que la table `tags` n'est pas branchée.
 *
 * Motif et Incarnation ne sont PAS listés à la main ici : ils sont dérivés
 * de la bible `referentiels/motifs/motifs_ypm.json` (via `getMotifs()`) pour
 * ne jamais dupliquer le référentiel — chaque variante devient un tag
 * `incarnation` avec `parent_id` pointant vers le tag `motif` de sa famille
 * (cf. TagFilterSidebar, hiérarchie Motif → Incarnation).
 */

import { getMotifs } from "@/lib/atelier-da/referentiels-loader";
import type { Tag, TagCategory } from "@/types/mediatheque";

interface SeedTag {
  category: TagCategory;
  slug: string;
  label: string;
  color_hex?: string;
  parent_id?: string;
}

/** Couleurs conservées à la main pour les incarnations qui en avaient une avant la dérivation auto. */
const INCARNATION_COLOR_OVERRIDES: Record<string, string> = {
  "mama-club": "#1A2E4F",
  "papa-club": "#1A2E4F",
  "sista-club": "#A76059",
  "famille-club": "#8A9E8C",
  "amour-club": "#B4665F",
};

const ACCENT_MAP: Record<string, string> = {
  à: "a", â: "a", ä: "a",
  é: "e", è: "e", ê: "e", ë: "e",
  î: "i", ï: "i",
  ô: "o", ö: "o",
  ù: "u", û: "u", ü: "u",
  ç: "c",
  œ: "oe",
};

function slugify(label: string): string {
  return label
    .toLowerCase()
    .split("")
    .map((ch) => ACCENT_MAP[ch] ?? ch)
    .join("")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Labels avec accent/graphie propre pour les tags thématiques du référentiel (leurs slugs bruts n'en portent pas). */
const THEME_LABEL_OVERRIDES: Record<string, string> = {
  amitie: "Amitié",
  feminin: "Féminin",
  caractere: "Caractère",
  "anniversaire-date": "Anniversaire (date)",
  "grand-parents": "Grands-parents",
  "garde-enfant": "Garde d'enfant",
};

/** Entrées bruit du référentiel (fautes de frappe / restes de dev), jamais des vrais thèmes. */
const THEME_TAG_EXCLUDE = new Set(["brigitte", "alphabet", "default", "template", "ypm-001", "ypm-003"]);

function buildThemeTags(
  motifs: { tags?: string[]; variantes: { tags?: string[] }[] }[],
): SeedTag[] {
  const seen = new Set<string>();
  const out: SeedTag[] = [];
  const addAll = (tags?: string[]) => {
    for (const raw of tags ?? []) {
      const slug = slugify(raw);
      if (!slug || THEME_TAG_EXCLUDE.has(slug) || seen.has(slug)) continue;
      seen.add(slug);
      out.push({
        category: "theme",
        slug,
        label: THEME_LABEL_OVERRIDES[slug] ?? slug.charAt(0).toUpperCase() + slug.slice(1),
      });
    }
  };
  for (const motif of motifs) {
    addAll(motif.tags);
    for (const v of motif.variantes) addAll(v.tags);
  }
  return out;
}

function buildMotifDerivedTags(): SeedTag[] {
  const out: SeedTag[] = [];
  let motifs: {
    id: string;
    nom_commercial: string;
    tags?: string[];
    variantes: { label: string; tags?: string[] }[];
  }[] = [];
  try {
    motifs = getMotifs().motifs;
  } catch {
    // Référentiel indisponible (ex. contexte hors process.cwd() attendu) : pas de motif/incarnation/thème dérivés.
    return out;
  }
  for (const motif of motifs) {
    const motifSlug = motif.id.toLowerCase();
    out.push({ category: "motif", slug: motifSlug, label: motif.nom_commercial });
    for (const variante of motif.variantes) {
      const slug = slugify(variante.label);
      if (!slug) continue;
      out.push({
        category: "incarnation",
        slug,
        label: variante.label,
        color_hex: INCARNATION_COLOR_OVERRIDES[slug],
        parent_id: `seed-motif-${motifSlug}`,
      });
    }
  }
  out.push(...buildThemeTags(motifs));
  return out;
}

const RAW: SeedTag[] = [
  ...buildMotifDerivedTags(),

  // GABARITS (référentiel YP)
  { category: "gabarit", slug: "yp001", label: "Hoodie Adulte" },
  { category: "gabarit", slug: "yp004", label: "Hoodie Enfant" },
  { category: "gabarit", slug: "yp005", label: "Sweat Adulte" },
  { category: "gabarit", slug: "yp019", label: "T-Shirt Adulte" },
  { category: "gabarit", slug: "yp020", label: "Zoodie (S)" },
  { category: "gabarit", slug: "yp021", label: "Zoodie" },

  // COULEURS PRODUIT
  { category: "couleur_produit", slug: "creme", label: "Crème", color_hex: "#F5EFE2" },
  { category: "couleur_produit", slug: "blanc", label: "Blanc", color_hex: "#FFFFFF" },
  { category: "couleur_produit", slug: "beige", label: "Beige", color_hex: "#D9CBB3" },
  { category: "couleur_produit", slug: "noir", label: "Noir", color_hex: "#1A1614" },
  { category: "couleur_produit", slug: "marine", label: "Marine", color_hex: "#1A2E4F" },
  { category: "couleur_produit", slug: "vert-sauge", label: "Vert Sauge", color_hex: "#8A9E8C" },
  { category: "couleur_produit", slug: "rose-pale", label: "Rose Pâle", color_hex: "#E8C9C2" },
  { category: "couleur_produit", slug: "kaki", label: "Kaki", color_hex: "#7A7548" },
  { category: "couleur_produit", slug: "lilas", label: "Lilas", color_hex: "#BFA8C9" },
  { category: "couleur_produit", slug: "gris-fonce", label: "Gris foncé", color_hex: "#3A3A3A" },

  // AMBIANCES SHOOTING
  { category: "ambiance", slug: "studio-brut", label: "Studio Brut" },
  { category: "ambiance", slug: "loft-organique", label: "Loft Organique" },
  { category: "ambiance", slug: "aube-intime", label: "L'Aube Intime" },
  { category: "ambiance", slug: "echappee-sauvage", label: "Échappée Sauvage" },
  { category: "ambiance", slug: "lumiere-sepia", label: "Lumière Sépia" },

  // MANNEQUINS (top du casting)
  { category: "mannequin", slug: "man-p01", label: "Clémence (P01)" },
  { category: "mannequin", slug: "man-p03", label: "Aïcha (P03)" },
  { category: "mannequin", slug: "man-p06", label: "Mathieu (P06)" },
  { category: "mannequin", slug: "man-p08", label: "Félicie (P08)" },
  { category: "mannequin", slug: "man-p10", label: "Marie-Hélène (P10)" },
  { category: "mannequin", slug: "man-p11", label: "Léa & Sarah (P11)" },
  { category: "mannequin", slug: "man-p12", label: "Brune (P12)" },

  // PLANS
  { category: "plan", slug: "hero", label: "Hero / packshot principal" },
  { category: "plan", slug: "buste", label: "Buste / détail broderie" },
  { category: "plan", slug: "lookbook", label: "Lookbook / packshot porté" },
  { category: "plan", slug: "lifestyle", label: "Lifestyle / en situation" },
  { category: "plan", slug: "detail-broderie", label: "Macro broderie" },
  { category: "plan", slug: "plat", label: "Pose à plat" },
  { category: "plan", slug: "porte", label: "Porté de dos" },

  // SAISONS
  { category: "saison", slug: "ete", label: "Été" },
  { category: "saison", slug: "hiver", label: "Hiver" },
  { category: "saison", slug: "mi-saison", label: "Mi-saison" },
  { category: "saison", slug: "intemporel", label: "Intemporel" },

  // OCCASIONS
  { category: "occasion", slug: "fete-des-meres", label: "Fête des Mères" },
  { category: "occasion", slug: "fete-des-peres", label: "Fête des Pères" },
  { category: "occasion", slug: "naissance", label: "Naissance" },
  { category: "occasion", slug: "anniversaire", label: "Anniversaire" },
  { category: "occasion", slug: "saint-valentin", label: "Saint-Valentin" },
  { category: "occasion", slug: "evjf", label: "EVJF" },
  { category: "occasion", slug: "mariage", label: "Mariage" },
  { category: "occasion", slug: "noel", label: "Noël" },
  { category: "occasion", slug: "ete-vacances", label: "Été / vacances" },

  // TONS
  { category: "ton", slug: "tendre", label: "Tendre & sincère" },
  { category: "ton", slug: "complice", label: "Complice & fun" },
  { category: "ton", slug: "humour", label: "Humour & second degré" },
  { category: "ton", slug: "affirme", label: "Affirmé & statement" },

  // CANAL (déduit du format de sortie à la génération, cf. deduceCanalFromRatio)
  { category: "canal", slug: "instagram", label: "Instagram" },
  { category: "canal", slug: "shopify", label: "Shopify" },
  { category: "canal", slug: "pinterest", label: "Pinterest" },
];

export const SEED_TAGS: Tag[] = RAW.map((t) => ({
  id: `seed-${t.category}-${t.slug}`,
  category: t.category,
  slug: t.slug,
  label: t.label,
  color_hex: t.color_hex ?? "#1E2D4A",
  parent_id: t.parent_id ?? null,
}));

export function findSeedTag(category: TagCategory, slug: string): Tag | undefined {
  return SEED_TAGS.find((t) => t.category === category && t.slug === slug);
}

export function findSeedTagById(id: string): Tag | undefined {
  return SEED_TAGS.find((t) => t.id === id);
}

/**
 * Déduit le canal (slug de la catégorie `canal`) depuis le ratio d'une image,
 * quand il n'est pas déjà connu explicitement (ex. `platform` posé à la
 * génération dans social-packs). Règle Sarah : 4:5 → Instagram, 2:3/9:16 →
 * Pinterest, 1:1 → Shopify (packshot) par défaut si rien d'autre n'est connu.
 */
export function deduceCanalFromRatio(width: number, height: number): string | null {
  if (!width || !height) return null;
  const ratio = width / height;
  const isClose = (target: number, tolerance = 0.04) => Math.abs(ratio - target) <= tolerance;

  if (isClose(4 / 5)) return "instagram";
  if (isClose(2 / 3) || isClose(9 / 16)) return "pinterest";
  if (isClose(1)) return "shopify";
  return null;
}
