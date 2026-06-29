/**
 * Connecteur Pinterest Trends (serveur only) — Lot 2.
 *
 * Source : API Pinterest v5, endpoint Trends keywords
 *   GET /v5/trends/keywords/{region}/top/{trend_type}
 * Gratuite mais nécessite un compte business + app validée (cf. CDC §1.2).
 * Tant que `PINTEREST_ACCESS_TOKEN` n'est pas fourni, le connecteur renvoie
 * `configured: false` → le rail "saisie manuelle" prend le relais (loader).
 *
 * Parsing DÉFENSIF : la forme exacte de la réponse ne pourra être confirmée
 * qu'une fois l'app validée. On cherche le tableau de tendances et la clé du
 * mot-clé parmi plusieurs noms candidats, sans casser si le schéma diffère.
 */

import type { Trend, TrendSignal } from "./trends";

const REGION = process.env.PINTEREST_TRENDS_REGION || "FR";
const TREND_TYPE = process.env.PINTEREST_TRENDS_TYPE || "growing"; // growing | monthly | yearly | seasonal
const BASE = process.env.PINTEREST_API_BASE || "https://api.pinterest.com/v5";

function signalForType(trendType: string): TrendSignal {
  if (trendType === "seasonal") return "saisonnier";
  if (trendType === "growing") return "montant";
  return "stable"; // monthly / yearly
}

/** Récupère le 1er tableau plausible de tendances dans une réponse inconnue. */
function pickTrendArray(json: unknown): unknown[] {
  if (Array.isArray(json)) return json;
  if (json && typeof json === "object") {
    const o = json as Record<string, unknown>;
    for (const key of ["trends", "items", "data", "keywords"]) {
      if (Array.isArray(o[key])) return o[key] as unknown[];
    }
  }
  return [];
}

/** Extrait le mot-clé d'un item de forme inconnue. */
function pickKeyword(item: unknown): string | null {
  if (typeof item === "string") return item;
  if (item && typeof item === "object") {
    const o = item as Record<string, unknown>;
    for (const key of ["keyword", "term", "query", "name", "value"]) {
      if (typeof o[key] === "string" && o[key]) return o[key] as string;
    }
  }
  return null;
}

export interface PinterestTrendsResult {
  trends: Trend[];
  configured: boolean;
  source_url: string;
  errors: string[];
}

export async function fetchPinterestTrends(): Promise<PinterestTrendsResult> {
  const token = process.env.PINTEREST_ACCESS_TOKEN;
  const url = `${BASE}/trends/keywords/${REGION}/top/${TREND_TYPE}`;

  if (!token) {
    return {
      trends: [],
      configured: false,
      source_url: url,
      errors: [
        "Pinterest API non configurée (PINTEREST_ACCESS_TOKEN manquant). " +
          "Saisie manuelle des mots-clés en attendant la validation de l'app business.",
      ],
    };
  }

  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`HTTP ${res.status}${body ? ` — ${body.slice(0, 200)}` : ""}`);
    }
    const json = await res.json();
    const signal = signalForType(TREND_TYPE);
    const trends: Trend[] = pickTrendArray(json)
      .map((item): Trend | null => {
        const terme = pickKeyword(item);
        if (!terme) return null;
        return {
          terme,
          source: "pinterest",
          type: "mot",
          signal,
          trafic_estime: null,
          contexte: [],
          url: `https://trends.pinterest.com/?country=${REGION}&query=${encodeURIComponent(terme)}`,
          enrichissement: null,
        };
      })
      .filter((t): t is Trend => t !== null);

    return { trends, configured: true, source_url: url, errors: [] };
  } catch (e) {
    return {
      trends: [],
      configured: true,
      source_url: url,
      errors: [`Pinterest API : ${e instanceof Error ? e.message : String(e)}`],
    };
  }
}
