/**
 * Lecture serveur des référentiels casting (mannequins, affinités, calendrier, métiers).
 * Les fichiers JSON vivent à la racine du repo `referentiels/` — source de vérité.
 * On lit avec fs depuis l'API route Next.js, pas d'import statique pour éviter
 * d'embarquer ~1500 lignes de JSON dans le bundle client.
 */
import { readFileSync } from "fs";
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

let _cache: {
  mannequins?: { mannequins: RawCanonique[]; cartographie_regionale?: Record<string, string[]> };
  affinites?: AffinitesNarratives;
  calendrier?: CalendrierCanoniques;
  metiers?: MetiersHub;
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

export function getAllReferentiels() {
  return {
    mannequins: getMannequins(),
    affinites: getAffinites(),
    calendrier: getCalendrier(),
    metiers: getMetiers(),
  };
}
