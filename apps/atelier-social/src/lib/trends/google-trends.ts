/**
 * Connecteur Google Trends (serveur only) — Lot 1 socle.
 *
 * Source : flux RSS public "recherches tendances du jour" par pays. Gratuit,
 * sans clé, sans login, sans scraping de DOM. C'est la source libre la plus
 * STABLE (le reste de l'API Google Trends est non-officiel et casse souvent).
 *
 * Limite assumée (CDC §1.1 / §6) : endpoint non contractuel. Garde-fous :
 *   - plusieurs URLs candidates essayées dans l'ordre,
 *   - retry court,
 *   - erreur claire remontée (le loader conserve le dernier snapshot valide).
 *
 * Pas de dépendance XML : on parse les <item> du RSS à la main.
 */

import type { Trend } from "./trends";

const GEO = process.env.GOOGLE_TRENDS_GEO || "FR";

/** URLs candidates (la 1re qui répond un RSS valide gagne). Surchageable par env. */
function candidateUrls(): string[] {
  const override = process.env.GOOGLE_TRENDS_RSS_URL;
  if (override) return [override];
  return [
    `https://trends.google.com/trending/rss?geo=${GEO}`,
    `https://trends.google.com/trends/trendingsearches/daily/rss?geo=${GEO}`,
  ];
}

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/124.0 Safari/537.36";

function decodeEntities(s: string): string {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(parseInt(d, 10)))
    .trim();
}

/** Extrait le contenu de la 1re balise `<tag>...</tag>` (ns inclus). */
function pickTag(block: string, tag: string): string | null {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i");
  const m = block.match(re);
  return m ? decodeEntities(m[1]) : null;
}

/** Extrait toutes les occurrences d'une balise. */
function pickAll(block: string, tag: string): string[] {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "gi");
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(block)) !== null) out.push(decodeEntities(m[1]));
  return out;
}

function parseRss(xml: string): Trend[] {
  const items = xml.split(/<item[\s>]/i).slice(1);
  const trends: Trend[] = [];
  for (const chunk of items) {
    const block = chunk.slice(0, chunk.search(/<\/item>/i));
    const terme = pickTag(block, "title");
    if (!terme) continue;
    const trafic =
      pickTag(block, "ht:approx_traffic") || pickTag(block, "approx_traffic");
    const news = [
      ...pickAll(block, "ht:news_item_title"),
      ...pickAll(block, "news_item_title"),
    ];
    // Le <link> du flux est générique (URL du feed) : on construit un lien
    // "explore" par terme, bien plus utile pour creuser la tendance.
    const url = `https://trends.google.com/trends/explore?q=${encodeURIComponent(terme)}&geo=${GEO}`;
    trends.push({
      terme,
      source: "google",
      type: "mot",
      signal: "montant",
      trafic_estime: trafic,
      contexte: news.slice(0, 3),
      url,
      enrichissement: null,
    });
  }
  return trends;
}

async function fetchWithRetry(url: string, tries = 2): Promise<string> {
  let lastErr: unknown;
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": UA, Accept: "application/rss+xml, application/xml, text/xml" },
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await res.text();
      if (!/<item[\s>]/i.test(text)) throw new Error("réponse sans <item> RSS");
      return text;
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}

export interface GoogleTrendsResult {
  trends: Trend[];
  source_url: string;
  errors: string[];
}

/** Récupère les recherches tendances du jour (FR par défaut). */
export async function fetchGoogleTrends(): Promise<GoogleTrendsResult> {
  const errors: string[] = [];
  for (const url of candidateUrls()) {
    try {
      const xml = await fetchWithRetry(url);
      const trends = parseRss(xml);
      if (trends.length > 0) return { trends, source_url: url, errors };
      errors.push(`${url} : RSS vide`);
    } catch (e) {
      errors.push(`${url} : ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  return { trends: [], source_url: candidateUrls()[0], errors };
}
