/**
 * Lecture serveur des référentiels casting (mannequins, affinités, calendrier, métiers).
 * Les fichiers JSON vivent à la racine du repo `referentiels/` — source de vérité.
 * On lit avec fs depuis l'API route Next.js, pas d'import statique pour éviter
 * d'embarquer ~1500 lignes de JSON dans le bundle client.
 */
import { readFileSync, readdirSync, existsSync } from "fs";
import { join } from "path";

// process.cwd() depuis Next.js dev server = apps/atelier-social/
// Les référentiels sont à ../../referentiels/
const REFS_DIR = join(process.cwd(), "..", "..", "referentiels");

export interface RawCanonique {
  id: string;
  prenom: string;
  age: number | string;
  genre: string;
  ethnicite: string;
  famille_esthetique?: string;
  particularite?: string | null;
  duo: string | null;
  style_wear_signature: string;
  date_anniversaire?: string;
  saison_preferee?: string;
  metier?: string;
  lieu_de_vie?: string;
  statut_relationnel?: string;
  evenements_de_vie?: string[];
  traits_narratifs?: string[];
  affinites_qualifiees?: Record<string, string>;
}

export interface DispositifEtabli {
  id: string;
  type: "duo" | "trio";
  membres: string[];
  nature: string;
  lieu?: string;
  qualifiers: string[];
  themes_compatibles: string[];
  ambiances_recommandees: string[];
  occasions_clientes: string[];
}

export interface AffinitesNarratives {
  dispositifs_etablis: DispositifEtabli[];
  affinites_latentes: Array<DispositifEtabli & { _propose_pour?: string; statut?: string }>;
  qualifiers_index: Record<string, string[]>;
  themes_index: Record<string, string[]>;
  lignees_familiales: Record<string, { ids: string[]; narration: string; duos_associes: string[]; trios_associes: string[] }>;
}

export interface AnniversaireEntry {
  date: string;
  date_naissance_complete: string;
  id: string;
  prenom: string;
  age: number;
  saison: string;
}

export interface FenetreCommerciale {
  date: string;
  nom: string;
  canoniques_pertinents: string[];
  angle: string;
}

export interface CalendrierCanoniques {
  anniversaires: AnniversaireEntry[];
  fenetres_commerciales_ypersoa: { fenetres: FenetreCommerciale[] };
}

export interface MetierHub {
  id: number;
  metier: string;
  module_hub: string;
  statut: string;
  apps_principales: string[];
}

export interface MetiersHub {
  metiers_remplaces: MetierHub[];
  mapping_app_metiers: Record<string, { metiers_principaux: number[]; label_chrome: string; label_long: string }>;
}

export interface MotifVariante {
  file: string;
  label: string;
  tags?: string[];
  /**
   * Catalogue site-web fine-grained : tags propres à CETTE variante.
   * Un motif comme CHOUCHOU regroupe Papa Chéri (→ papa), Ma Maman (→ maman),
   * Marié 2026 (→ mariage), donc le tag au niveau motif n'est pas pertinent —
   * c'est la variante qui porte l'occasion/destinataire réelle.
   *
   * Les tags du motif racine restent valables comme défaut (vue "Motifs"),
   * mais la vue "Variantes" et /atelier-da/motifs/[destinataire] utilisent
   * EN PRIORITÉ ces tags fine-grained.
   */
  destinataires?: string[];
  occasions?: string[];
  /**
   * Produits Ypersoa sur lesquels cette variante est applicable (YP001 sweat,
   * YP005 sweat col rond, YP019 t-shirt, YP021 zoodie, YP004 hoodie enfant).
   * Sert à filtrer le catalogue côté shooting (« montre-moi toutes les variantes
   * compatibles avec un t-shirt ») et à signaler les contraintes prod.
   */
  produits?: string[];
}

export interface ShootingPng {
  file: string;
  label: string;
  tags?: string[];
}

/** Bible technique motif — règles prod broderie. */
export interface MotifBible {
  /** Dimensions brodées en cm (largeur × hauteur). */
  dimensions_cm?: { largeur: number; hauteur: number };
  /** Nb max de couleurs simultanées sur le motif. */
  nb_couleurs_max?: number;
  /** Description du motif (composition, ex. "Cœur + une initiale"). */
  composition?: string;
  /** Typographie utilisée pour les lettres/textes du motif (ex. "Playfair Display Regular 16pt"). */
  typographie?: string;
  /** Règles de validation libres (multi-lignes, retour à la ligne = nouveau item). */
  regles_validation?: string;
  /** Filename relatif du fichier PXF (Tajima Pulse) dans assets/motifs/prod/. */
  fichier_pxf?: string;
  /** Filename relatif du fichier DST (Tajima broderie) dans assets/motifs/prod/. */
  fichier_dst?: string;
  /** Template version poignet (filename DST/PXF de la version réduite pour placement poignet, ou texte libre "à créer"). */
  template_poignet?: string;
  /** Notes prod additionnelles (vitesse machine, support compatible, etc.). */
  notes_prod?: string;
  /** IDs de fils canoniques associés (palette multicolore figée). Référence palette_fils_broderie_v2. */
  fils_associes?: string[];
  /** IDs de palettes d'association référencées. Référence palettes_fils_associations.json. */
  palettes_associees?: string[];
  /** Pattern de distribution figé (ex. YPM-004 dates : AABB/CCDD/BBCC/DDAA + DDDD signature). */
  distribution_pattern?: {
    type: "fixed_per_line";
    comment?: string;
    /** Ordre A/B/C/D des fils canoniques (A = index 0, B = 1, etc.). */
    fils_order: string[];
    /** Map nb_lignes_dates → tableau de patterns par ligne (chaque chaîne = lettres A/B/C/D). */
    patterns_dates: Record<string, string[]>;
    /** Pattern appliqué à la ligne signature texte si présente (ex. "DDDD" = tout en D). */
    signature_line?: string;
  };
}

/**
 * Fichier de prod broderie (PXF Tajima Pulse, DST Tajima broderie).
 * Une "key" = une variante prod (lettre A-Z, année 1976, prénom slugifié...).
 * Un fichier peut être présent en PXF, DST, ou les deux. `null` = absent.
 * Le préfixe motif + key reconstitue le filename : `${motifId}-${key}.PXF`.
 */
export interface MotifProdFile {
  key: string;
  pxf: string | null;
  dst: string | null;
  png: string | null;
  /** Fiche technique Tajima (PDF) — référence humaine pour la prod machine. */
  ft: string | null;
}

export interface MotifYpm {
  id: string;
  nom_commercial: string;
  asset_principal: string;
  nb_variantes: number;
  variantes: MotifVariante[];
  tags?: string[];
  /**
   * Catalogue site-web (atelier-da/motifs) : "pour qui ce motif est-il pensé ?"
   * Liste figée (cf. DESTINATAIRES dans atelier-da/motifs/page.tsx). Plusieurs
   * destinataires possibles par motif. Vide = motif non encore taggé.
   */
  destinataires?: string[];
  /**
   * Catalogue site-web (atelier-da/motifs) : "pour quelle occasion ?"
   * Liste figée (cf. OCCASIONS dans atelier-da/motifs/page.tsx). Plusieurs
   * occasions possibles. Vide = motif non encore taggé.
   */
  occasions?: string[];
  /**
   * Produits Ypersoa applicables à l'asset_principal (hero) du motif.
   * Sert aussi de fallback si une variante n'a pas son propre `produits[]`.
   * Cf. PRODUITS dans atelier-da/motifs/page.tsx.
   */
  produits?: string[];
  shooting_pngs?: ShootingPng[];
  bible?: MotifBible;
  prod_files?: MotifProdFile[];
}

export interface MotifsYpmRef {
  _meta: { nb_motifs: number; nb_variantes_total: number; last_updated?: string; [k: string]: unknown };
  motifs: MotifYpm[];
}

export interface HubFil {
  id: string;
  rang: number;
  nom: string;
  hex: string;
  code_gunold: string;
  numero_aiguille_canonique: number | null;
  famille: string;
  usage_recommande?: string;
  supports_incompatibles?: string[];
  ambiance_editoriale?: string[];
  note_prod?: string;
  /** Favori = retenu pour le sélecteur B2C ypersoa.fr (max 8). */
  favori?: boolean;
  /** Canonique = fil chargé en permanence sur une aiguille TMEZ (max 10, couvre 70% des commandes). */
  canonique?: boolean;
  /** Référence Pantone TPG officielle (ex. "19-4203 TPG"). */
  pantone_tpg?: string;
  /** Archivé = testé et non validé. Masqué par défaut, accessible via la section Archives. */
  archive?: boolean;
}

export interface FilsRef {
  _meta: Record<string, unknown>;
  couleurs: HubFil[];
}

/** Palette d'association — ensemble réutilisable de fils référencé par les motifs. */
export interface Palette {
  id: string;
  nom: string;
  type: "camaieu" | "multicolore" | "duo" | "trio";
  fils: string[];
  description?: string;
  /** Archivée = testée et non validée. Masquée par défaut dans la grille, accessible via la section Archives. */
  archive?: boolean;
  /** Favori Sarah — remontée en tête de liste partout où la palette est affichée (production + lookbook). */
  favori?: boolean;
}

export interface PalettesRef {
  _meta: Record<string, unknown>;
  palettes: Palette[];
}

let _cache: {
  mannequins?: { mannequins: RawCanonique[]; cartographie_regionale?: Record<string, string[]> };
  affinites?: AffinitesNarratives;
  calendrier?: CalendrierCanoniques;
  metiers?: MetiersHub;
  motifs?: MotifsYpmRef;
  fils?: FilsRef;
  palettes?: PalettesRef;
  reglesBroderie?: ReglesBroderieRef;
} = {};

export interface ReglePlacement {
  id: string;
  label: string;
  icone?: string;
  dimension_max_cm?: number;
  dimension_par_defaut_cm?: number;
  dimension_xxl_cm?: number;
  dimension_axe?: "largeur" | "hauteur";
  regles: string[];
  note?: string;
}
export interface ReglesBroderieRef {
  _meta: { schema_version: string; referentiel: string; last_updated?: string; description?: string };
  placements: ReglePlacement[];
}

function readJson<T>(relativePath: string): T {
  const full = join(REFS_DIR, relativePath);
  const raw = readFileSync(full, "utf-8");
  return JSON.parse(raw) as T;
}

export function getMannequins() {
  if (!_cache.mannequins) {
    const data = readJson<{ mannequins: RawCanonique[]; _meta: { cartographie_regionale?: Record<string, string[]> } }>(
      "shooting/mannequins_recurrents.json"
    );
    _cache.mannequins = {
      mannequins: data.mannequins,
      cartographie_regionale: data._meta?.cartographie_regionale,
    };
  }
  return _cache.mannequins;
}

export function getAffinites(): AffinitesNarratives {
  if (!_cache.affinites) {
    _cache.affinites = readJson<AffinitesNarratives>("casting/affinites_narratives.json");
  }
  return _cache.affinites;
}

export function getCalendrier(): CalendrierCanoniques {
  if (!_cache.calendrier) {
    _cache.calendrier = readJson<CalendrierCanoniques>("casting/calendrier_canoniques.json");
  }
  return _cache.calendrier;
}

export function getMetiers(): MetiersHub {
  if (!_cache.metiers) {
    _cache.metiers = readJson<MetiersHub>("metiers_hub.json");
  }
  return _cache.metiers;
}

export function getMotifs(): MotifsYpmRef {
  if (!_cache.motifs) {
    _cache.motifs = readJson<MotifsYpmRef>("motifs/motifs_ypm.json");
  }
  const prodIndex = scanProdFilesByMotif();
  return {
    ..._cache.motifs,
    motifs: _cache.motifs.motifs.map((m) => ({
      ...m,
      prod_files: prodIndex.get(m.id) ?? [],
    })),
  };
}

export function clearMotifsCache(): void {
  _cache.motifs = undefined;
}

export function getFils(): FilsRef {
  if (!_cache.fils) {
    _cache.fils = readJson<FilsRef>("palette_fils_broderie_v2.json");
  }
  return _cache.fils;
}

export function clearFilsCache(): void {
  _cache.fils = undefined;
}

export const FILS_REF_PATH = join(REFS_DIR, "palette_fils_broderie_v2.json");

export function getPalettes(): PalettesRef {
  if (!_cache.palettes) {
    _cache.palettes = readJson<PalettesRef>("palettes_fils_associations.json");
  }
  return _cache.palettes;
}

export function clearPalettesCache(): void {
  _cache.palettes = undefined;
}

export const PALETTES_REF_PATH = join(REFS_DIR, "palettes_fils_associations.json");

export function getReglesBroderie(): ReglesBroderieRef {
  if (!_cache.reglesBroderie) {
    _cache.reglesBroderie = readJson<ReglesBroderieRef>("regles_broderie.json");
  }
  return _cache.reglesBroderie;
}

export function clearReglesBroderieCache(): void {
  _cache.reglesBroderie = undefined;
}

export const REGLES_BRODERIE_REF_PATH = join(REFS_DIR, "regles_broderie.json");

export interface KanbanColumn {
  id: string;
  label: string;
  ordre: number;
  couleur?: string;
}
export type KanbanCardType = "question" | "bug" | "amelioration" | "decision" | "regle" | "autre";
export type KanbanStakeholder = "Rebecca" | "Cyrielle" | "Adriana" | "Thierry" | "Sarah";
export interface KanbanCard {
  id: string;
  column_id: string;
  title: string;
  body?: string;
  type?: KanbanCardType;
  tags?: string[];
  auteur?: "sarah" | "adriana" | "autre";
  /** Parties prenantes informées sur la card (Rebecca, Cyrielle, Adriana, Thierry, Sarah). */
  stakeholders?: KanbanStakeholder[];
  /** Date à laquelle la card est passée en colonne "fait" (pour archive auto à +7j). */
  done_at?: string;
  created_at: string;
  updated_at: string;
}
export const KANBAN_STAKEHOLDERS: KanbanStakeholder[] = ["Rebecca", "Cyrielle", "Adriana", "Thierry", "Sarah"];
export interface ProdKanbanRef {
  _meta: { schema_version: string; referentiel: string; last_updated?: string; description?: string };
  columns: KanbanColumn[];
  cards: KanbanCard[];
}

export function getProdKanban(): ProdKanbanRef {
  const ref = readJson<ProdKanbanRef>("prod_kanban.json");
  return ref;
}

export const PROD_KANBAN_REF_PATH = join(REFS_DIR, "prod_kanban.json");

export interface GunoldCatalogEntry {
  code_gunold: string;
  hex: string;
  pantone_pms?: string;
  pantone_pms_named?: string;
}
export interface GunoldCatalogRef {
  _meta: Record<string, unknown>;
  couleurs: GunoldCatalogEntry[];
}
export function getGunoldCatalog(): GunoldCatalogRef {
  return readJson<GunoldCatalogRef>("gunold_poly40_catalog.json");
}

export interface AttributionEntry {
  id: string;
  name: string;
  motif_id?: string;
  mode: "mono" | "palette";
  couleur_id?: string;
  palette_id?: string;
  coeur_couleur_id?: string | null;
  texte_lignes: string[];
  typo_id: "russ_times" | "arial_rounded" | "looney";
  bg_fond?: string;
  /** Snapshot du résultat algo (positions + attribution + score) pour rejouer le rendu. */
  result: {
    attribution: Record<number, string>;
    positions: Array<{ ligne: number; indice: number; x_relatif: number; caractere: string }>;
    score: number;
    seed: number;
    distribution: Array<{ couleur_id: string; count: number }>;
  };
  created_at: string;
}
export interface AttributionsLibraryRef {
  _meta: Record<string, unknown>;
  attributions: AttributionEntry[];
}
export const ATTRIBUTIONS_LIB_PATH = join(REFS_DIR, "attributions_library.json");

export const MOTIFS_REF_PATH = join(REFS_DIR, "motifs", "motifs_ypm.json");
export const ASSETS_MOTIFS_DIR = join(process.cwd(), "..", "..", "assets", "motifs");
export const ASSETS_MOTIFS_PXF_DIR = join(process.cwd(), "..", "..", "assets", "motifs pxf");
export const ASSETS_MOTIFS_DST_DIR = join(process.cwd(), "..", "..", "assets", "motifs dst");
export const ASSETS_MOTIFS_PNG_DIR = join(process.cwd(), "..", "..", "assets", "motifs png");
export const ASSETS_MOTIFS_FT_DIR = join(process.cwd(), "..", "..", "assets", "motifs ft");

// Accepte les fichiers avec tiret OU espace comme séparateur après l'id motif.
// Ex. "YPM-001-A.pxf" et "YPM-000 Russ Times.pxf" sont tous deux capturés.
const buildProdRe = (ext: string) => new RegExp(`^(YPM-\\d{3})[- ](.+)\\.(${ext})$`, "i");

/**
 * Scanne les dossiers `assets/motifs pxf/` et `assets/motifs dst/`,
 * regroupe par motif id puis par key. Source de vérité = le disque.
 */
export function scanProdFilesByMotif(): Map<string, MotifProdFile[]> {
  const byMotif = new Map<string, Map<string, MotifProdFile>>();

  const ingest = (dir: string, slot: "pxf" | "dst" | "png" | "ft", ext: string) => {
    if (!existsSync(dir)) return;
    let entries: string[];
    try {
      entries = readdirSync(dir);
    } catch {
      return;
    }
    const re = buildProdRe(ext);
    for (const filename of entries) {
      const match = re.exec(filename);
      if (!match) continue;
      const motifId = match[1];
      const key = match[2].trim();
      let motifMap = byMotif.get(motifId);
      if (!motifMap) {
        motifMap = new Map();
        byMotif.set(motifId, motifMap);
      }
      const existing = motifMap.get(key) ?? { key, pxf: null, dst: null, png: null, ft: null };
      existing[slot] = filename;
      motifMap.set(key, existing);
    }
  };

  ingest(ASSETS_MOTIFS_PXF_DIR, "pxf", "pxf");
  ingest(ASSETS_MOTIFS_DST_DIR, "dst", "dst");
  ingest(ASSETS_MOTIFS_PNG_DIR, "png", "png");
  ingest(ASSETS_MOTIFS_FT_DIR, "ft", "pdf");

  const out = new Map<string, MotifProdFile[]>();
  for (const [motifId, keyMap] of byMotif) {
    const list = Array.from(keyMap.values()).sort(compareProdKeys);
    out.set(motifId, list);
  }
  return out;
}

/**
 * Tri "métier" : variantes commerciales courtes d'abord (A-Z, 0-9),
 * puis numériques pures (années 1976, 1997...), puis labels textuels (BRIGITTE V2…).
 */
function compareProdKeys(a: MotifProdFile, b: MotifProdFile): number {
  const ta = keyType(a.key);
  const tb = keyType(b.key);
  if (ta !== tb) return ta - tb;
  if (ta === 1) return Number(a.key) - Number(b.key);
  return a.key.localeCompare(b.key, "fr", { numeric: true, sensitivity: "base" });
}

function keyType(k: string): number {
  if (/^[A-Za-z0-9]$/.test(k)) return 0;
  if (/^\d+$/.test(k)) return 1;
  return 2;
}

export function getAllReferentiels() {
  return {
    mannequins: getMannequins(),
    affinites: getAffinites(),
    calendrier: getCalendrier(),
    metiers: getMetiers(),
    motifs: getMotifs(),
    fils: getFils(),
    palettes: getPalettes(),
  };
}
