/**
 * Médiathèque — taxonomie de tags (seed).
 *
 * Copie typée du seed SQL `docs/PLAN_MEDIATHEQUE/seed_tags_taxonomie.sql`.
 * Sert de fallback côté UI tant que la table `tags` n'est pas branchée.
 */

import type { Tag, TagCategory } from "@/types/mediatheque";

interface SeedTag {
  category: TagCategory;
  slug: string;
  label: string;
  color_hex?: string;
}

const RAW: SeedTag[] = [
  // INCARNATIONS
  { category: "incarnation", slug: "mama-club", label: "MAMA CLUB", color_hex: "#1A2E4F" },
  { category: "incarnation", slug: "papa-club", label: "PAPA CLUB", color_hex: "#1A2E4F" },
  { category: "incarnation", slug: "sista-club", label: "SISTA CLUB", color_hex: "#A76059" },
  { category: "incarnation", slug: "famille-club", label: "FAMILLE CLUB", color_hex: "#8A9E8C" },
  { category: "incarnation", slug: "amour-club", label: "AMOUR CLUB", color_hex: "#B4665F" },
  { category: "incarnation", slug: "bride-team", label: "BRIDE TEAM" },
  { category: "incarnation", slug: "dog-dad-gang", label: "DOG DAD GANG" },
  { category: "incarnation", slug: "crew-summer", label: "CREW SUMMER" },
  { category: "incarnation", slug: "team-dog", label: "TEAM DOG" },
  { category: "incarnation", slug: "papi-club", label: "PAPI CLUB" },
  { category: "incarnation", slug: "mamie-club", label: "MAMIE CLUB" },

  // MOTIFS (référentiel YPM)
  { category: "motif", slug: "ypm-001", label: "La Brigitte" },
  { category: "motif", slug: "ypm-002", label: "L'Ambre" },
  { category: "motif", slug: "ypm-003", label: "Le Club" },
  { category: "motif", slug: "ypm-004", label: "Notre Héritage" },
  { category: "motif", slug: "ypm-005", label: "L'Annonce" },
  { category: "motif", slug: "ypm-006", label: "Le Câlin" },
  { category: "motif", slug: "ypm-007", label: "Le Chouchou" },
  { category: "motif", slug: "ypm-008", label: "La Féline" },
  { category: "motif", slug: "ypm-009", label: "La Palette" },
  { category: "motif", slug: "ypm-010", label: "La Ronde" },
  { category: "motif", slug: "ypm-011", label: "La Confidence" },
  { category: "motif", slug: "ypm-012", label: "La Meute" },
  { category: "motif", slug: "ypm-013", label: "Le Depuis" },
  { category: "motif", slug: "ypm-014", label: "La Tigresse" },
  { category: "motif", slug: "ypm-015", label: "La Déclaration" },
  { category: "motif", slug: "ypm-016", label: "La Signature" },
  { category: "motif", slug: "ypm-017", label: "La Florale" },

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
];

export const SEED_TAGS: Tag[] = RAW.map((t) => ({
  id: `seed-${t.category}-${t.slug}`,
  category: t.category,
  slug: t.slug,
  label: t.label,
  color_hex: t.color_hex ?? "#1E2D4A",
  parent_id: null,
}));

export function findSeedTag(category: TagCategory, slug: string): Tag | undefined {
  return SEED_TAGS.find((t) => t.category === category && t.slug === slug);
}

export function findSeedTagById(id: string): Tag | undefined {
  return SEED_TAGS.find((t) => t.id === id);
}
