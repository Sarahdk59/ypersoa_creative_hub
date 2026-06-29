/**
 * Atelier Trends — types + helpers purs (client + serveur).
 *
 * La donnée canonique vit dans `referentiels/trends/{date}.json` (éditable,
 * git-traçable). Le loader fs est dans `trends-loader.ts`, le connecteur source
 * dans `google-trends.ts` (serveur only). Ce module ne contient QUE des types
 * et des fonctions pures (importable côté client / dashboard).
 *
 * CDC : docs/CDC_ATELIER_TRENDS.md — Lot 1 = socle Google Trends (status "raw").
 */

export type TrendSource = "google" | "pinterest";
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

// ── Helpers purs ──────────────────────────────────────────────────────────

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
  google: "Google Trends",
  pinterest: "Pinterest Trends",
};
