/**
 * Médiathèque — médias mockés pour la démo Sprint 1.
 *
 * 30 photos référencées sur les image services publics (Unsplash random
 * via picsum / placeholder éditorial). Chaque entrée est taggée pour
 * couvrir les filtres principaux (incarnation × motif × gabarit × plan).
 *
 * Sera remplacé par les vraies entrées Supabase Sprint 2.
 */

import type { MediaWithTags } from "@/types/mediatheque";
import { SEED_TAGS } from "./taxonomie";

const tag = (cat: string, slug: string) => {
  const t = SEED_TAGS.find((x) => x.category === cat && x.slug === slug);
  if (!t) throw new Error(`Mock: tag introuvable ${cat}:${slug}`);
  return t;
};

const img = (seed: string, w = 1080, h = 1350) =>
  `https://picsum.photos/seed/${seed}/${w}/${h}`;

const ts = (daysAgo: number) => {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString();
};

interface MockSeed {
  id: string;
  filename: string;
  picsum: string;
  width: number;
  height: number;
  source: MediaWithTags["source"];
  statut: MediaWithTags["statut"];
  date_shoot?: string;
  photographe?: string;
  notes?: string;
  uploaded_days_ago: number;
  tags: Array<[string, string]>;
}

const SEEDS: MockSeed[] = [
  // MAMA CLUB × Le Club
  {
    id: "med-001",
    filename: "mama-club-hoodie-creme-hero-001.jpg",
    picsum: "ypersoa-mama-01",
    width: 1080,
    height: 1350,
    source: "shooting_studio",
    statut: "validee",
    date_shoot: "2026-04-12",
    photographe: "Maï",
    uploaded_days_ago: 12,
    tags: [
      ["incarnation", "mama-club"],
      ["motif", "ypm-003"],
      ["gabarit", "yp001"],
      ["couleur_produit", "creme"],
      ["ambiance", "studio-brut"],
      ["plan", "hero"],
      ["occasion", "fete-des-meres"],
      ["ton", "tendre"],
    ],
  },
  {
    id: "med-002",
    filename: "mama-club-tshirt-beige-buste-002.jpg",
    picsum: "ypersoa-mama-02",
    width: 1080,
    height: 1350,
    source: "shooting_studio",
    statut: "validee",
    date_shoot: "2026-04-12",
    uploaded_days_ago: 12,
    tags: [
      ["incarnation", "mama-club"],
      ["motif", "ypm-003"],
      ["gabarit", "yp019"],
      ["couleur_produit", "beige"],
      ["plan", "buste"],
      ["occasion", "fete-des-meres"],
    ],
  },
  {
    id: "med-003",
    filename: "mama-club-sweat-rose-lifestyle-003.jpg",
    picsum: "ypersoa-mama-03",
    width: 1080,
    height: 1350,
    source: "shooting_lifestyle",
    statut: "validee",
    date_shoot: "2026-04-14",
    photographe: "Maï",
    uploaded_days_ago: 10,
    tags: [
      ["incarnation", "mama-club"],
      ["motif", "ypm-005"],
      ["gabarit", "yp005"],
      ["couleur_produit", "rose-pale"],
      ["ambiance", "aube-intime"],
      ["plan", "lifestyle"],
      ["mannequin", "man-p10"],
    ],
  },

  // PAPA CLUB
  {
    id: "med-004",
    filename: "papa-club-hoodie-marine-hero-004.jpg",
    picsum: "ypersoa-papa-01",
    width: 1080,
    height: 1350,
    source: "shooting_studio",
    statut: "validee",
    date_shoot: "2026-04-18",
    uploaded_days_ago: 8,
    tags: [
      ["incarnation", "papa-club"],
      ["motif", "ypm-003"],
      ["gabarit", "yp001"],
      ["couleur_produit", "marine"],
      ["plan", "hero"],
      ["occasion", "fete-des-peres"],
      ["mannequin", "man-p06"],
      ["ton", "affirme"],
    ],
  },
  {
    id: "med-005",
    filename: "papa-club-tshirt-noir-buste-005.jpg",
    picsum: "ypersoa-papa-02",
    width: 1080,
    height: 1350,
    source: "shooting_studio",
    statut: "a_valider",
    date_shoot: "2026-04-18",
    uploaded_days_ago: 8,
    tags: [
      ["incarnation", "papa-club"],
      ["motif", "ypm-016"],
      ["gabarit", "yp019"],
      ["couleur_produit", "noir"],
      ["plan", "buste"],
      ["occasion", "fete-des-peres"],
    ],
  },
  {
    id: "med-006",
    filename: "papa-club-zoodie-kaki-lifestyle-006.jpg",
    picsum: "ypersoa-papa-03",
    width: 1080,
    height: 1350,
    source: "shooting_lifestyle",
    statut: "validee",
    date_shoot: "2026-04-20",
    photographe: "Maï",
    uploaded_days_ago: 6,
    tags: [
      ["incarnation", "papa-club"],
      ["motif", "ypm-013"],
      ["gabarit", "yp021"],
      ["couleur_produit", "kaki"],
      ["ambiance", "echappee-sauvage"],
      ["plan", "lifestyle"],
    ],
  },

  // SISTA CLUB
  {
    id: "med-007",
    filename: "sista-club-tshirt-lilas-007.jpg",
    picsum: "ypersoa-sista-01",
    width: 1080,
    height: 1350,
    source: "shooting_studio",
    statut: "validee",
    date_shoot: "2026-04-22",
    uploaded_days_ago: 5,
    tags: [
      ["incarnation", "sista-club"],
      ["motif", "ypm-011"],
      ["gabarit", "yp019"],
      ["couleur_produit", "lilas"],
      ["plan", "buste"],
      ["ton", "complice"],
    ],
  },
  {
    id: "med-008",
    filename: "sista-club-sweat-creme-008.jpg",
    picsum: "ypersoa-sista-02",
    width: 1080,
    height: 1350,
    source: "shooting_lifestyle",
    statut: "validee",
    date_shoot: "2026-04-22",
    uploaded_days_ago: 5,
    tags: [
      ["incarnation", "sista-club"],
      ["motif", "ypm-011"],
      ["gabarit", "yp005"],
      ["couleur_produit", "creme"],
      ["ambiance", "loft-organique"],
      ["plan", "lifestyle"],
      ["mannequin", "man-p11"],
    ],
  },

  // FAMILLE CLUB
  {
    id: "med-009",
    filename: "famille-club-hoodie-sauge-009.jpg",
    picsum: "ypersoa-famille-01",
    width: 1080,
    height: 1350,
    source: "shooting_lifestyle",
    statut: "validee",
    date_shoot: "2026-04-25",
    uploaded_days_ago: 3,
    tags: [
      ["incarnation", "famille-club"],
      ["motif", "ypm-004"],
      ["gabarit", "yp001"],
      ["couleur_produit", "vert-sauge"],
      ["ambiance", "echappee-sauvage"],
      ["plan", "lifestyle"],
      ["mannequin", "man-p06"],
    ],
  },
  {
    id: "med-010",
    filename: "famille-club-hoodie-enfant-010.jpg",
    picsum: "ypersoa-famille-02",
    width: 1080,
    height: 1350,
    source: "shooting_studio",
    statut: "a_valider",
    date_shoot: "2026-04-25",
    uploaded_days_ago: 3,
    tags: [
      ["incarnation", "famille-club"],
      ["motif", "ypm-004"],
      ["gabarit", "yp004"],
      ["couleur_produit", "creme"],
      ["plan", "hero"],
      ["mannequin", "man-p08"],
    ],
  },

  // AMOUR CLUB
  {
    id: "med-011",
    filename: "amour-club-tshirt-blanc-011.jpg",
    picsum: "ypersoa-amour-01",
    width: 1080,
    height: 1350,
    source: "ia_generation",
    statut: "validee",
    uploaded_days_ago: 4,
    notes: "Pack Saint-Valentin nano-banana 04/26",
    tags: [
      ["incarnation", "amour-club"],
      ["motif", "ypm-015"],
      ["gabarit", "yp019"],
      ["couleur_produit", "blanc"],
      ["plan", "buste"],
      ["occasion", "saint-valentin"],
      ["ton", "tendre"],
    ],
  },
  {
    id: "med-012",
    filename: "amour-club-hoodie-noir-012.jpg",
    picsum: "ypersoa-amour-02",
    width: 1080,
    height: 1350,
    source: "ia_generation",
    statut: "validee",
    uploaded_days_ago: 4,
    tags: [
      ["incarnation", "amour-club"],
      ["motif", "ypm-015"],
      ["gabarit", "yp001"],
      ["couleur_produit", "noir"],
      ["plan", "lifestyle"],
      ["occasion", "saint-valentin"],
    ],
  },

  // BRIDE TEAM
  {
    id: "med-013",
    filename: "bride-team-tshirt-blanc-013.jpg",
    picsum: "ypersoa-bride-01",
    width: 1080,
    height: 1350,
    source: "shooting_lifestyle",
    statut: "validee",
    date_shoot: "2026-04-08",
    uploaded_days_ago: 16,
    tags: [
      ["incarnation", "bride-team"],
      ["motif", "ypm-016"],
      ["gabarit", "yp019"],
      ["couleur_produit", "blanc"],
      ["ambiance", "lumiere-sepia"],
      ["plan", "lifestyle"],
      ["occasion", "evjf"],
      ["ton", "complice"],
    ],
  },
  {
    id: "med-014",
    filename: "bride-team-sweat-creme-014.jpg",
    picsum: "ypersoa-bride-02",
    width: 1080,
    height: 1350,
    source: "shooting_lifestyle",
    statut: "publiee_shopify",
    date_shoot: "2026-04-08",
    uploaded_days_ago: 16,
    tags: [
      ["incarnation", "bride-team"],
      ["motif", "ypm-016"],
      ["gabarit", "yp005"],
      ["couleur_produit", "creme"],
      ["plan", "buste"],
      ["occasion", "mariage"],
    ],
  },

  // DOG DAD GANG
  {
    id: "med-015",
    filename: "dog-dad-tshirt-gris-015.jpg",
    picsum: "ypersoa-dog-01",
    width: 1080,
    height: 1350,
    source: "shooting_lifestyle",
    statut: "validee",
    uploaded_days_ago: 7,
    tags: [
      ["incarnation", "dog-dad-gang"],
      ["motif", "ypm-012"],
      ["gabarit", "yp019"],
      ["couleur_produit", "gris-fonce"],
      ["plan", "lifestyle"],
      ["ton", "humour"],
    ],
  },
  {
    id: "med-016",
    filename: "team-dog-hoodie-kaki-016.jpg",
    picsum: "ypersoa-dog-02",
    width: 1080,
    height: 1350,
    source: "shooting_lifestyle",
    statut: "a_valider",
    uploaded_days_ago: 7,
    tags: [
      ["incarnation", "team-dog"],
      ["motif", "ypm-012"],
      ["gabarit", "yp001"],
      ["couleur_produit", "kaki"],
      ["ambiance", "echappee-sauvage"],
      ["plan", "lifestyle"],
    ],
  },

  // CREW SUMMER
  {
    id: "med-017",
    filename: "crew-summer-tshirt-blanc-017.jpg",
    picsum: "ypersoa-crew-01",
    width: 1080,
    height: 1350,
    source: "shooting_lifestyle",
    statut: "validee",
    uploaded_days_ago: 14,
    tags: [
      ["incarnation", "crew-summer"],
      ["motif", "ypm-009"],
      ["gabarit", "yp019"],
      ["couleur_produit", "blanc"],
      ["ambiance", "echappee-sauvage"],
      ["plan", "lifestyle"],
      ["saison", "ete"],
      ["occasion", "ete-vacances"],
    ],
  },
  {
    id: "med-018",
    filename: "crew-summer-tshirt-lilas-018.jpg",
    picsum: "ypersoa-crew-02",
    width: 1080,
    height: 1350,
    source: "shooting_studio",
    statut: "validee",
    uploaded_days_ago: 14,
    tags: [
      ["incarnation", "crew-summer"],
      ["motif", "ypm-009"],
      ["gabarit", "yp019"],
      ["couleur_produit", "lilas"],
      ["plan", "hero"],
      ["saison", "ete"],
    ],
  },

  // PAPI / MAMIE CLUB
  {
    id: "med-019",
    filename: "papi-club-sweat-marine-019.jpg",
    picsum: "ypersoa-papi-01",
    width: 1080,
    height: 1350,
    source: "shooting_studio",
    statut: "validee",
    uploaded_days_ago: 9,
    tags: [
      ["incarnation", "papi-club"],
      ["motif", "ypm-004"],
      ["gabarit", "yp005"],
      ["couleur_produit", "marine"],
      ["plan", "buste"],
    ],
  },
  {
    id: "med-020",
    filename: "mamie-club-tshirt-rose-020.jpg",
    picsum: "ypersoa-mamie-01",
    width: 1080,
    height: 1350,
    source: "shooting_studio",
    statut: "a_valider",
    uploaded_days_ago: 9,
    tags: [
      ["incarnation", "mamie-club"],
      ["motif", "ypm-004"],
      ["gabarit", "yp019"],
      ["couleur_produit", "rose-pale"],
      ["plan", "buste"],
    ],
  },

  // DÉTAILS BRODERIE (macros)
  {
    id: "med-021",
    filename: "detail-brodue-le-club-021.jpg",
    picsum: "ypersoa-detail-01",
    width: 1080,
    height: 1080,
    source: "packshot",
    statut: "validee",
    uploaded_days_ago: 20,
    tags: [
      ["motif", "ypm-003"],
      ["plan", "detail-broderie"],
    ],
  },
  {
    id: "med-022",
    filename: "detail-brodue-signature-022.jpg",
    picsum: "ypersoa-detail-02",
    width: 1080,
    height: 1080,
    source: "packshot",
    statut: "validee",
    uploaded_days_ago: 20,
    tags: [
      ["motif", "ypm-016"],
      ["plan", "detail-broderie"],
    ],
  },
  {
    id: "med-023",
    filename: "detail-brodue-florale-023.jpg",
    picsum: "ypersoa-detail-03",
    width: 1080,
    height: 1080,
    source: "packshot",
    statut: "validee",
    uploaded_days_ago: 20,
    tags: [
      ["motif", "ypm-017"],
      ["plan", "detail-broderie"],
    ],
  },

  // PACKSHOTS
  {
    id: "med-024",
    filename: "packshot-hoodie-creme-024.jpg",
    picsum: "ypersoa-pack-01",
    width: 1080,
    height: 1350,
    source: "packshot",
    statut: "publiee_shopify",
    uploaded_days_ago: 30,
    tags: [
      ["gabarit", "yp001"],
      ["couleur_produit", "creme"],
      ["plan", "plat"],
      ["motif", "ypm-003"],
    ],
  },
  {
    id: "med-025",
    filename: "packshot-tshirt-marine-025.jpg",
    picsum: "ypersoa-pack-02",
    width: 1080,
    height: 1350,
    source: "packshot",
    statut: "publiee_shopify",
    uploaded_days_ago: 30,
    tags: [
      ["gabarit", "yp019"],
      ["couleur_produit", "marine"],
      ["plan", "plat"],
      ["motif", "ypm-016"],
    ],
  },
  {
    id: "med-026",
    filename: "packshot-zoodie-noir-026.jpg",
    picsum: "ypersoa-pack-03",
    width: 1080,
    height: 1350,
    source: "packshot",
    statut: "publiee_shopify",
    uploaded_days_ago: 32,
    tags: [
      ["gabarit", "yp021"],
      ["couleur_produit", "noir"],
      ["plan", "plat"],
    ],
  },

  // NOËL / HIVER
  {
    id: "med-027",
    filename: "noel-amour-hoodie-marine-027.jpg",
    picsum: "ypersoa-noel-01",
    width: 1080,
    height: 1350,
    source: "ia_generation",
    statut: "a_valider",
    uploaded_days_ago: 2,
    notes: "Génération test pack Noël 2026",
    tags: [
      ["incarnation", "amour-club"],
      ["motif", "ypm-006"],
      ["gabarit", "yp001"],
      ["couleur_produit", "marine"],
      ["plan", "lifestyle"],
      ["saison", "hiver"],
      ["occasion", "noel"],
      ["ton", "tendre"],
    ],
  },
  {
    id: "med-028",
    filename: "noel-famille-club-028.jpg",
    picsum: "ypersoa-noel-02",
    width: 1080,
    height: 1350,
    source: "ia_generation",
    statut: "a_valider",
    uploaded_days_ago: 2,
    tags: [
      ["incarnation", "famille-club"],
      ["motif", "ypm-013"],
      ["gabarit", "yp005"],
      ["couleur_produit", "creme"],
      ["plan", "lifestyle"],
      ["saison", "hiver"],
      ["occasion", "noel"],
    ],
  },

  // NAISSANCE
  {
    id: "med-029",
    filename: "naissance-annonce-029.jpg",
    picsum: "ypersoa-naissance-01",
    width: 1080,
    height: 1350,
    source: "shooting_lifestyle",
    statut: "validee",
    uploaded_days_ago: 1,
    tags: [
      ["motif", "ypm-005"],
      ["gabarit", "yp019"],
      ["couleur_produit", "creme"],
      ["plan", "lifestyle"],
      ["occasion", "naissance"],
      ["ambiance", "aube-intime"],
      ["ton", "tendre"],
    ],
  },
  {
    id: "med-030",
    filename: "naissance-calin-030.jpg",
    picsum: "ypersoa-naissance-02",
    width: 1080,
    height: 1350,
    source: "shooting_studio",
    statut: "validee",
    uploaded_days_ago: 1,
    tags: [
      ["motif", "ypm-006"],
      ["gabarit", "yp019"],
      ["couleur_produit", "rose-pale"],
      ["plan", "detail-broderie"],
      ["occasion", "naissance"],
    ],
  },
];

export const MOCK_MEDIA: MediaWithTags[] = SEEDS.map((s) => ({
  id: s.id,
  filename: s.filename,
  storage_path: `${s.source}/${s.date_shoot ?? "2026-04"}/${s.filename}`,
  public_url: img(s.picsum, s.width, s.height),
  width: s.width,
  height: s.height,
  size_bytes: 1_800_000,
  mime_type: "image/jpeg",
  source: s.source,
  date_shoot: s.date_shoot ?? null,
  photographe: s.photographe ?? null,
  statut: s.statut,
  notes: s.notes ?? null,
  uploaded_by: "innovation@ypersoa.fr",
  uploaded_at: ts(s.uploaded_days_ago),
  updated_at: ts(s.uploaded_days_ago),
  tags: s.tags
    .map(([cat, slug]) => SEED_TAGS.find((t) => t.category === cat && t.slug === slug))
    .filter((t): t is (typeof SEED_TAGS)[number] => Boolean(t)),
}));
