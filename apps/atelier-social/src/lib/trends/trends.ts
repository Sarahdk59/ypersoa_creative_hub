/**
 * Atelier Trends — types + helpers purs (client + serveur).
 *
 * La donnée canonique vit dans `referentiels/trends/{date}.json` (éditable,
 * git-traçable). Le loader fs est dans `trends-loader.ts`, le connecteur source
 * dans `pinterest-trends.ts` (serveur only). Ce module ne contient QUE des types
 * et des fonctions pures (importable côté client / dashboard).
 *
 * Google Trends a été retiré le 21/08/2026 (jugé peu actionnable pour la
 * broderie personnalisée) — Pinterest est l'unique source active en V1.
 * TikTok/Instagram restent hors V1 (pas de connecteur gratuit fiable).
 *
 * CDC : docs/CDC_ATELIER_TRENDS.md.
 */

export type TrendSource = "pinterest";
export type TrendType = "mot" | "look" | "motif";
export type TrendSignal = "montant" | "saisonnier" | "stable";
export type SnapshotStatus = "raw" | "enriched";

/** Bloc d'enrichissement IA — rempli au Lot 3, `null` en Lot 1. */
export interface TrendEnrichissement {
  pertinence_ypersoa: number; // 0-10
  raison_pertinence: string;
  motif_ypm_suggere: string | null;
  occasion_liee: string | null;
  creneau_planable: string | null;
  angle_caption: string | null;
  brand_safe: boolean;
}

export interface Trend {
  terme: string;
  source: TrendSource;
  type: TrendType;
  signal: TrendSignal;
  trafic_estime: string | null;
  contexte: string[];
  url: string | null;
  enrichissement: TrendEnrichissement | null;
}

export interface TrendsSnapshot {
  id: string; // = date YYYY-MM-DD
  date: string; // YYYY-MM-DD
  generated_at: string; // ISO
  sources: TrendSource[];
  status: SnapshotStatus;
  trends: Trend[];
  meta: {
    trends_count: number;
    source_url?: string;
    note?: string;
  };
  errors: string[];
}

/** Mot-clé Pinterest saisi/curé manuellement (rail principal tant que l'API
 *  Pinterest Trends n'est pas validée — cf. CDC §1.2). Stocké dans
 *  `referentiels/trends/_pinterest_manuel.json`, fusionné à chaque run. */
export interface PinterestManualKeyword {
  terme: string;
  trafic_estime?: string | null;
  signal?: TrendSignal;
  note?: string;
}

// ── Helpers purs ──────────────────────────────────────────────────────────

/** Convertit un mot-clé Pinterest manuel en Trend (lien explore Pinterest). */
export function manualKeywordToTrend(kw: PinterestManualKeyword): Trend {
  return {
    terme: kw.terme,
    source: "pinterest",
    type: "mot",
    signal: kw.signal ?? "stable",
    trafic_estime: kw.trafic_estime ?? null,
    contexte: kw.note ? [kw.note] : [],
    url: `https://trends.pinterest.com/?country=FR&query=${encodeURIComponent(kw.terme)}`,
    enrichissement: null,
  };
}

/** Fusionne plusieurs listes de tendances en dédupliquant par terme (casse/espaces
 *  ignorés). Priorité au 1er rencontré → passer l'API Pinterest avant les
 *  mots-clés saisis à la main. */
export function mergeTrends(...lists: Trend[][]): Trend[] {
  const seen = new Set<string>();
  const out: Trend[] = [];
  for (const list of lists) {
    for (const t of list) {
      const key = t.terme.toLowerCase().trim();
      if (!key || seen.has(key)) continue;
      seen.add(key);
      out.push(t);
    }
  }
  return out;
}

/** Convertit "200 000+" / "1 M+" en nombre pour le tri (best-effort). */
export function parseTrafic(trafic: string | null): number {
  if (!trafic) return 0;
  const cleaned = trafic.toLowerCase().replace(/\s| | /g, "");
  const match = cleaned.match(/([\d.,]+)\s*([mk]?)/);
  if (!match) return 0;
  const num = parseFloat(match[1].replace(",", "."));
  if (Number.isNaN(num)) return 0;
  const unit = match[2];
  if (unit === "m") return num * 1_000_000;
  if (unit === "k") return num * 1_000;
  return num;
}

/** Tri d'affichage : enrichi d'abord par pertinence, sinon par trafic estimé. */
export function sortTrends(trends: Trend[]): Trend[] {
  return [...trends].sort((a, b) => {
    const pa = a.enrichissement?.pertinence_ypersoa ?? -1;
    const pb = b.enrichissement?.pertinence_ypersoa ?? -1;
    if (pa !== pb) return pb - pa;
    return parseTrafic(b.trafic_estime) - parseTrafic(a.trafic_estime);
  });
}

export const SIGNAL_LABELS: Record<TrendSignal, string> = {
  montant: "Montant",
  saisonnier: "Saisonnier",
  stable: "Stable",
};

export const TYPE_LABELS: Record<TrendType, string> = {
  mot: "Mot-clé",
  look: "Look",
  motif: "Motif",
};

export const SOURCE_LABELS: Record<TrendSource, string> = {
  pinterest: "Pinterest Trends",
};

// ── Occasions & créneau Planable (règle des 45 jours) ───────────────────────
//
// Clés alignées sur `referentiels/pinterest_strategy.json` (mapping_occasions).
// Calendrier éditable et auto-suffisant côté atelier-social (les dates exactes
// vivent aussi dans Planable/Supabase — à synchroniser plus tard). Dates 2026-2027.

export const OCCASION_LABELS: Record<string, string> = {
  amour: "Saint-Valentin",
  "fete-des-meres": "Fête des Mères",
  "fete-des-peres": "Fête des Pères",
  "fete-grands-meres": "Fête des grands-mères",
  naissance: "Naissance",
  mariage: "Mariage / EVJF",
  rentree: "Rentrée",
  ete: "Été / Vacances",
  noel: "Noël",
  nounou: "Fête des maîtresses / nounous",
  quotidien: "Quotidien (evergreen)",
};

/** Dates ISO des occasions datées (triées). Les evergreen (naissance, mariage,
 *  quotidien) sont absentes → pas de créneau J-45. */
export const OCCASION_CALENDAR: Record<string, string[]> = {
  amour: ["2027-02-14", "2028-02-14"],
  "fete-des-meres": ["2027-05-30", "2028-05-28"],
  "fete-des-peres": ["2027-06-20", "2028-06-18"],
  "fete-grands-meres": ["2027-03-07", "2028-03-05"],
  rentree: ["2026-09-01", "2027-09-01"],
  ete: ["2026-07-01", "2027-07-01"],
  noel: ["2026-12-25", "2027-12-25"],
  nounou: ["2026-07-03", "2027-07-02"],
};

const MOIS_FR = [
  "janv.", "févr.", "mars", "avr.", "mai", "juin",
  "juil.", "août", "sept.", "oct.", "nov.", "déc.",
];

function formatFR(d: Date): string {
  return `${d.getDate()} ${MOIS_FR[d.getMonth()]} ${d.getFullYear()}`;
}

/** Prochaine occurrence (ISO) d'une occasion à partir de `fromISO`, ou null. */
export function nextOccurrenceISO(occasion: string, fromISO: string): string | null {
  const dates = OCCASION_CALENDAR[occasion];
  if (!dates) return null;
  return dates.find((d) => d >= fromISO) ?? null;
}

/**
 * Phrase de créneau Planable selon la règle des 45 jours (Pinterest semée tôt).
 * Ex. "À semer dès le 15 avr. 2027 (Fête des Mères, 30 mai)". null si evergreen.
 */
export function creneauPlanable(
  occasion: string,
  fromISO: string,
  leadDays = 45,
): string | null {
  const occISO = nextOccurrenceISO(occasion, fromISO);
  if (!occISO) return null;
  const occ = new Date(occISO + "T00:00:00");
  const seed = new Date(occ);
  seed.setDate(seed.getDate() - leadDays);
  const label = OCCASION_LABELS[occasion] ?? occasion;
  return `À semer dès le ${formatFR(seed)} (${label}, ${occ.getDate()} ${MOIS_FR[occ.getMonth()]})`;
}
