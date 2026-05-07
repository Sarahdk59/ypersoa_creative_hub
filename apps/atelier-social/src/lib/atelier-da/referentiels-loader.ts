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
  /** Règles de validation libres (multi-lignes, retour à la ligne = nouveau item). */
  regles_validation?: string;
  /** Filename relatif du fichier PXF (Tajima Pulse) dans assets/motifs/prod/. */
  fichier_pxf?: string;
  /** Filename relatif du fichier DST (Tajima broderie) dans assets/motifs/prod/. */
  fichier_dst?: string;
  /** Notes prod additionnelles (vitesse machine, support compatible, etc.). */
  notes_prod?: string;
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
}

export interface MotifYpm {
  id: string;
  nom_commercial: string;
  asset_principal: string;
  nb_variantes: number;
  variantes: MotifVariante[];
  tags?: string[];
  shooting_pngs?: ShootingPng[];
  bible?: MotifBible;
  prod_files?: MotifProdFile[];
}

export interface MotifsYpmRef {
  _meta: { nb_motifs: number; nb_variantes_total: number; last_updated?: string; [k: string]: unknown };
  motifs: MotifYpm[];
}

let _cache: {
  mannequins?: { mannequins: RawCanonique[]; cartographie_regionale?: Record<string, string[]> };
  affinites?: AffinitesNarratives;
  calendrier?: CalendrierCanoniques;
  metiers?: MetiersHub;
  motifs?: MotifsYpmRef;
} = {};

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

export const MOTIFS_REF_PATH = join(REFS_DIR, "motifs", "motifs_ypm.json");
export const ASSETS_MOTIFS_DIR = join(process.cwd(), "..", "..", "assets", "motifs");
export const ASSETS_MOTIFS_PXF_DIR = join(process.cwd(), "..", "..", "assets", "motifs pxf");
export const ASSETS_MOTIFS_DST_DIR = join(process.cwd(), "..", "..", "assets", "motifs dst");
export const ASSETS_MOTIFS_PNG_DIR = join(process.cwd(), "..", "..", "assets", "motifs png");

const PROD_FILE_RE = /^(YPM-\d{3})-(.+)\.(pxf|dst|png)$/i;

/**
 * Scanne les dossiers `assets/motifs pxf/` et `assets/motifs dst/`,
 * regroupe par motif id puis par key. Source de vérité = le disque.
 */
export function scanProdFilesByMotif(): Map<string, MotifProdFile[]> {
  const byMotif = new Map<string, Map<string, MotifProdFile>>();

  const ingest = (dir: string, ext: "pxf" | "dst" | "png") => {
    if (!existsSync(dir)) return;
    let entries: string[];
    try {
      entries = readdirSync(dir);
    } catch {
      return;
    }
    for (const filename of entries) {
      const match = PROD_FILE_RE.exec(filename);
      if (!match) continue;
      const fileExt = match[3].toLowerCase();
      if (fileExt !== ext) continue;
      const motifId = match[1];
      const key = match[2].trim();
      let motifMap = byMotif.get(motifId);
      if (!motifMap) {
        motifMap = new Map();
        byMotif.set(motifId, motifMap);
      }
      const existing = motifMap.get(key) ?? { key, pxf: null, dst: null, png: null };
      existing[ext] = filename;
      motifMap.set(key, existing);
    }
  };

  ingest(ASSETS_MOTIFS_PXF_DIR, "pxf");
  ingest(ASSETS_MOTIFS_DST_DIR, "dst");
  ingest(ASSETS_MOTIFS_PNG_DIR, "png");

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
  };
}
