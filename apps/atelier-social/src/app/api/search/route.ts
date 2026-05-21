/**
 * GET /api/search?q=<query>
 *
 * Recherche globale transverse Hub Ypersoa. Pour `?q=club` retourne tout ce qui
 * matche "club" :
 *   - motifs YPM (id, nom commercial, tags, variantes, bible)
 *   - shoots du catalogue (catalog_shots Supabase)
 *   - lookbooks (titre, slug, tags, ambiance)
 *   - règles & contraintes broderie (regles_broderie.json)
 *   - social packs (title, caption_text, pinterest_tags)
 *   - projets sociaux (social_projects Supabase)
 *
 * Match case-insensitive (toLowerCase). Tokens séparés par espace = AND logique
 * sur chaque haystack par item.
 *
 * Réponse : { ok, data: { motifs, shoots, lookbooks, regles, packs, projets } }
 * Chaque section liste les top 30 résultats triés par pertinence
 * (= nombre de tokens matchés, puis longueur du haystack).
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getMotifs, getReglesBroderie, getFils, getPalettes, type ReglePlacement } from "@/lib/atelier-da/referentiels-loader";
import { listCommandes, type StatutCommande } from "@/lib/production/commandes-loader";

const PER_BUCKET_LIMIT = 30;

interface SearchHit<T> {
  item: T;
  score: number;
  preview: string;
}

function tokenize(q: string): string[] {
  return q.trim().toLowerCase().split(/\s+/).filter(Boolean);
}

function matchScore(haystack: string, tokens: string[]): number {
  if (tokens.length === 0) return 0;
  let hits = 0;
  for (const t of tokens) {
    if (haystack.includes(t)) hits++;
  }
  return hits === tokens.length ? hits : 0; // AND logique : tous les tokens doivent matcher
}

function previewSnippet(haystack: string, tokens: string[]): string {
  if (tokens.length === 0) return haystack.slice(0, 100);
  const firstToken = tokens[0];
  const idx = haystack.toLowerCase().indexOf(firstToken);
  if (idx < 0) return haystack.slice(0, 100);
  const start = Math.max(0, idx - 30);
  const end = Math.min(haystack.length, idx + 80);
  return (start > 0 ? "…" : "") + haystack.slice(start, end).trim() + (end < haystack.length ? "…" : "");
}

interface MotifHitData {
  id: string;
  nom_commercial: string;
  asset_principal: string;
  tags: string[];
  variantes_matchees: Array<{ label: string; file: string }>;
  matched_in: string[];
}

interface ShootHitData {
  id: string;
  image_url: string;
  motif_id: string | null;
  variante_key: string | null;
  product_id: string | null;
  destinataire: string[];
  occasion: string[];
  tags: string[];
}

interface LookbookHitData {
  id: string;
  titre: string;
  slug: string;
  cover_url: string | null;
  tags: string[];
  date_archivage: string | null;
}

interface RegleHitData {
  id: string;
  label: string;
  icone?: string;
  matched_regles: string[];
  note?: string;
}

interface PackHitData {
  id: string;
  title: string | null;
  platform: string;
  image_url: string | null;
  caption_snippet: string | null;
}

interface ProjetHitData {
  id: string;
  title: string;
  statut: string;
  motif_id: string | null;
  destinataires: string[];
  occasions: string[];
}

interface FilHitData {
  id: string;
  nom: string;
  hex: string;
  code_gunold?: string;
  pantone_tpg?: string;
  famille: string;
  canonique?: boolean;
  favori?: boolean;
}

interface PaletteHitData {
  id: string;
  nom: string;
  type: string;
  fils: string[];
  description?: string;
}

interface CommandeHitData {
  id: string;
  numero_shopify: string;
  date_commande: string;
  statut: StatutCommande;
  nom_client: string;
  ville: string;
  nb_articles: number;
  motifs: string[];
  duree_total_min: number;
  is_rework: boolean;
  archivee_le?: string;
  matched_in: string[];
}

export async function GET(req: NextRequest) {
  try {
    const q = (req.nextUrl.searchParams.get("q") ?? "").trim();
    if (!q) {
      return NextResponse.json({
        ok: true,
        data: { motifs: [], shoots: [], lookbooks: [], regles: [], packs: [], projets: [], commandes: [] },
      });
    }
    const tokens = tokenize(q);

    // 1. MOTIFS YPM ---------------------------------------------------------
    const motifsHits: SearchHit<MotifHitData>[] = [];
    const motifsRef = getMotifs();
    for (const m of motifsRef.motifs) {
      const motifLevelHay = [
        m.id, m.nom_commercial,
        ...(m.tags ?? []),
        ...(m.destinataires ?? []),
        ...(m.occasions ?? []),
        m.bible?.composition ?? "",
        m.bible?.regles_validation ?? "",
        m.bible?.notes_prod ?? "",
        m.bible?.typographie ?? "",
      ].join(" ").toLowerCase();

      const matchedVariantes: Array<{ label: string; file: string }> = [];
      const matchedIn: string[] = [];

      const motifScore = matchScore(motifLevelHay, tokens);
      if (motifScore > 0) {
        if (m.id.toLowerCase().includes(tokens[0])) matchedIn.push("id");
        if (m.nom_commercial.toLowerCase().includes(tokens[0])) matchedIn.push("nom");
        if ((m.tags ?? []).some((t) => t.toLowerCase().includes(tokens[0]))) matchedIn.push("tags motif");
        if (m.bible?.composition?.toLowerCase().includes(tokens[0])) matchedIn.push("composition");
        if (m.bible?.regles_validation?.toLowerCase().includes(tokens[0])) matchedIn.push("règles");
        if (m.bible?.notes_prod?.toLowerCase().includes(tokens[0])) matchedIn.push("notes prod");
      }

      for (const v of m.variantes ?? []) {
        const vHay = [
          v.label, v.file,
          ...(v.tags ?? []),
          ...(v.destinataires ?? []),
          ...(v.occasions ?? []),
          ...(v.produits ?? []),
        ].join(" ").toLowerCase();
        if (matchScore(vHay, tokens) > 0) {
          matchedVariantes.push({ label: v.label, file: v.file });
        }
      }

      const totalScore = motifScore + matchedVariantes.length * 0.5;
      if (totalScore > 0 || matchedVariantes.length > 0) {
        motifsHits.push({
          item: {
            id: m.id,
            nom_commercial: m.nom_commercial,
            asset_principal: m.asset_principal,
            tags: m.tags ?? [],
            variantes_matchees: matchedVariantes,
            matched_in: matchedIn.length > 0 ? matchedIn : matchedVariantes.length > 0 ? ["variantes"] : [],
          },
          score: totalScore,
          preview: matchedVariantes.length > 0 ? matchedVariantes.map((v) => v.label).join(" · ") : m.nom_commercial,
        });
      }
    }

    // 1bis. FILS (couleurs de broderie) ------------------------------------
    const filsHits: SearchHit<FilHitData>[] = [];
    try {
      const filsRef = getFils();
      for (const f of filsRef.couleurs) {
        const hay = [
          f.id, f.nom, f.hex,
          f.code_gunold ?? "", f.pantone_tpg ?? "",
          f.famille,
          ...(f.ambiance_editoriale ?? []),
          f.usage_recommande ?? "",
        ].join(" ").toLowerCase();
        const score = matchScore(hay, tokens);
        if (score > 0) {
          filsHits.push({
            item: {
              id: f.id, nom: f.nom, hex: f.hex,
              code_gunold: f.code_gunold,
              pantone_tpg: f.pantone_tpg,
              famille: f.famille,
              canonique: f.canonique,
              favori: f.favori,
            },
            score,
            preview: [f.nom, f.code_gunold, f.hex, f.famille].filter(Boolean).join(" · "),
          });
        }
      }
    } catch { /* fichier absent : skip */ }

    // 1ter. PALETTES -------------------------------------------------------
    const palettesHits: SearchHit<PaletteHitData>[] = [];
    try {
      const palettesRef = getPalettes();
      for (const p of palettesRef.palettes) {
        const hay = [
          p.id, p.nom, p.type,
          ...(p.fils ?? []),
          p.description ?? "",
        ].join(" ").toLowerCase();
        const score = matchScore(hay, tokens);
        if (score > 0) {
          palettesHits.push({
            item: {
              id: p.id, nom: p.nom, type: p.type,
              fils: p.fils ?? [],
              description: p.description,
            },
            score,
            preview: [p.nom, p.type, `${(p.fils ?? []).length} fils`].filter(Boolean).join(" · "),
          });
        }
      }
    } catch { /* fichier absent : skip */ }

    // 2. RÈGLES BRODERIE ---------------------------------------------------
    const reglesHits: SearchHit<RegleHitData>[] = [];
    let reglesRef: { placements: ReglePlacement[] } | null = null;
    try {
      reglesRef = getReglesBroderie();
    } catch { /* fichier absent : skip */ }
    if (reglesRef) {
      for (const p of reglesRef.placements) {
        const matchedRegles: string[] = [];
        const pHayFields = [p.id, p.label, p.note ?? ""];
        const pHay = pHayFields.join(" ").toLowerCase();
        if (matchScore(pHay, tokens) > 0) {
          // règle entière matche
          matchedRegles.push(...p.regles);
        }
        for (const r of p.regles) {
          if (matchScore(r.toLowerCase(), tokens) > 0 && !matchedRegles.includes(r)) {
            matchedRegles.push(r);
          }
        }
        if (matchedRegles.length > 0) {
          reglesHits.push({
            item: { id: p.id, label: p.label, icone: p.icone, matched_regles: matchedRegles.slice(0, 5), note: p.note },
            score: matchedRegles.length,
            preview: matchedRegles[0] ?? p.label,
          });
        }
      }
    }

    // 3. SUPABASE : shoots / lookbooks / packs / projets ---------------------
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    let shootsHits: SearchHit<ShootHitData>[] = [];
    let lookbooksHits: SearchHit<LookbookHitData>[] = [];
    let packsHits: SearchHit<PackHitData>[] = [];
    let projetsHits: SearchHit<ProjetHitData>[] = [];

    if (supabaseUrl && supabaseAnon) {
      const supabase = createClient(supabaseUrl, supabaseAnon);

      // Shoots
      const { data: shotsData } = await supabase
        .from("catalog_shots")
        .select("id, image_url, motif_id, variante_key, product_id, destinataire, occasion, tags, shot_label")
        .limit(500);
      for (const s of (shotsData ?? []) as Array<{
        id: string;
        image_url: string;
        motif_id: string | null;
        variante_key: string | null;
        product_id: string | null;
        destinataire: string[] | null;
        occasion: string[] | null;
        tags: string[] | null;
        shot_label: string | null;
      }>) {
        const hay = [
          s.motif_id ?? "", s.variante_key ?? "", s.product_id ?? "", s.shot_label ?? "",
          ...(s.destinataire ?? []), ...(s.occasion ?? []), ...(s.tags ?? []),
        ].join(" ").toLowerCase();
        const score = matchScore(hay, tokens);
        if (score > 0) {
          shootsHits.push({
            item: {
              id: s.id,
              image_url: s.image_url,
              motif_id: s.motif_id,
              variante_key: s.variante_key,
              product_id: s.product_id,
              destinataire: s.destinataire ?? [],
              occasion: s.occasion ?? [],
              tags: s.tags ?? [],
            },
            score,
            preview: [s.motif_id, s.variante_key, ...(s.destinataire ?? []), ...(s.occasion ?? []), ...(s.tags ?? [])]
              .filter(Boolean)
              .join(" · ") || (s.shot_label ?? "shot"),
          });
        }
      }

      // Lookbooks
      const { data: lookData } = await supabase
        .from("lookbooks")
        .select("id, titre, slug, cover_url, tags, ambiance_extraite, date_archivage")
        .limit(200);
      for (const l of (lookData ?? []) as Array<{
        id: string;
        titre: string;
        slug: string;
        cover_url: string | null;
        tags: string[] | null;
        ambiance_extraite: { lieux?: string[]; lumiere?: string; postures?: string } | null;
        date_archivage: string | null;
      }>) {
        const hay = [
          l.titre, l.slug,
          ...(l.tags ?? []),
          ...(l.ambiance_extraite?.lieux ?? []),
          l.ambiance_extraite?.lumiere ?? "",
          l.ambiance_extraite?.postures ?? "",
        ].join(" ").toLowerCase();
        const score = matchScore(hay, tokens);
        if (score > 0) {
          lookbooksHits.push({
            item: {
              id: l.id,
              titre: l.titre,
              slug: l.slug,
              cover_url: l.cover_url,
              tags: l.tags ?? [],
              date_archivage: l.date_archivage,
            },
            score,
            preview: previewSnippet(l.titre + " · " + (l.tags ?? []).join(", "), tokens),
          });
        }
      }

      // Social packs
      const { data: packData } = await supabase
        .from("social_packs")
        .select("id, title, platform, image_urls, caption_text, pinterest_tags, occasion_id")
        .limit(300);
      for (const p of (packData ?? []) as Array<{
        id: string;
        title: string | null;
        platform: string;
        image_urls: string[] | null;
        caption_text: string | null;
        pinterest_tags: string[] | null;
        occasion_id: string | null;
      }>) {
        const hay = [
          p.title ?? "", p.caption_text ?? "", p.occasion_id ?? "",
          ...(p.pinterest_tags ?? []),
        ].join(" ").toLowerCase();
        const score = matchScore(hay, tokens);
        if (score > 0) {
          packsHits.push({
            item: {
              id: p.id,
              title: p.title,
              platform: p.platform,
              image_url: p.image_urls?.[0] ?? null,
              caption_snippet: p.caption_text ? previewSnippet(p.caption_text, tokens) : null,
            },
            score,
            preview: p.title ?? (p.caption_text ? previewSnippet(p.caption_text, tokens) : "pack"),
          });
        }
      }

      // Projets sociaux
      const { data: projData } = await supabase
        .from("social_projects")
        .select("id, title, statut, motif_id, destinataires, occasions")
        .limit(200);
      for (const pr of (projData ?? []) as Array<{
        id: string;
        title: string;
        statut: string;
        motif_id: string | null;
        destinataires: string[] | null;
        occasions: string[] | null;
      }>) {
        const hay = [
          pr.title, pr.motif_id ?? "", pr.statut,
          ...(pr.destinataires ?? []), ...(pr.occasions ?? []),
        ].join(" ").toLowerCase();
        const score = matchScore(hay, tokens);
        if (score > 0) {
          projetsHits.push({
            item: {
              id: pr.id,
              title: pr.title,
              statut: pr.statut,
              motif_id: pr.motif_id,
              destinataires: pr.destinataires ?? [],
              occasions: pr.occasions ?? [],
            },
            score,
            preview: pr.title,
          });
        }
      }
    }

    // 9. COMMANDES Shopify (archivées comprises) -------------------------------
    const commandesHits: SearchHit<CommandeHitData>[] = [];
    // Normalise les tokens pour matcher "1002" et "#1002" indifféremment
    const normalizedTokens = tokens.map((t) => t.replace(/^#/, ""));
    try {
      const commandes = listCommandes();
      for (const c of commandes) {
        const motifs = Array.from(new Set(c.articles.map((a) => `${a.ypm_id} ${a.ypm_nom}`)));
        const skus = c.articles.map((a) => a.sku).join(" ");
        const journalPersonnes = [
          c.journal?.dst?.par,
          c.journal?.broderie?.par,
          c.journal?.cq?.par,
          c.journal?.expedition?.par,
        ].filter(Boolean).join(" ");
        const hay = [
          c.id, c.numero_shopify, c.numero_shopify.replace(/^#/, ""),
          c.statut, c.priorite,
          c.expedition?.nom, c.expedition?.ville, c.expedition?.code_postal,
          c.facturation?.nom,
          c.notes ?? "",
          skus, motifs.join(" "),
          journalPersonnes,
          c.rework_de?.commande_id ?? "", c.rework_de?.motif ?? "",
        ].join(" ").toLowerCase();

        const score = matchScore(hay, normalizedTokens);
        if (score > 0) {
          const matched_in: string[] = [];
          const firstT = normalizedTokens[0];
          if (c.id.toLowerCase().includes(firstT) || c.numero_shopify.toLowerCase().includes(firstT) || c.numero_shopify.replace(/^#/, "").includes(firstT)) matched_in.push("numéro");
          if (c.expedition?.nom?.toLowerCase().includes(firstT)) matched_in.push("client");
          if (c.expedition?.ville?.toLowerCase().includes(firstT)) matched_in.push("ville");
          if (skus.toLowerCase().includes(firstT)) matched_in.push("SKU");
          if (motifs.join(" ").toLowerCase().includes(firstT)) matched_in.push("motif");
          if (journalPersonnes.toLowerCase().includes(firstT)) matched_in.push("équipe");
          if (c.statut.toLowerCase().includes(firstT)) matched_in.push("statut");

          // Boost de score si l'ID match exactement (priorité absolue)
          const idBoost = (c.id === firstT || c.numero_shopify === firstT || c.numero_shopify.replace(/^#/, "") === firstT) ? 100 : 0;

          commandesHits.push({
            item: {
              id: c.id,
              numero_shopify: c.numero_shopify,
              date_commande: c.date_commande,
              statut: c.statut,
              nom_client: c.expedition?.nom ?? "",
              ville: c.expedition?.ville ?? "",
              nb_articles: c.articles.length,
              motifs: Array.from(new Set(c.articles.map((a) => a.ypm_nom))),
              duree_total_min: c.duree_total_min,
              is_rework: !!c.rework_de,
              archivee_le: c.journal?.archivee_le,
              matched_in,
            },
            score: score + idBoost,
            preview: `${c.numero_shopify} · ${c.expedition?.nom ?? "?"} · ${c.articles.length} article${c.articles.length > 1 ? "s" : ""}`,
          });
        }
      }
    } catch {
      // Si le dossier commandes n'existe pas encore : on saute silencieusement.
    }

    const trim = <T>(arr: SearchHit<T>[]) =>
      arr.sort((a, b) => b.score - a.score).slice(0, PER_BUCKET_LIMIT);

    return NextResponse.json({
      ok: true,
      data: {
        motifs: trim(motifsHits),
        fils: trim(filsHits),
        palettes: trim(palettesHits),
        shoots: trim(shootsHits),
        lookbooks: trim(lookbooksHits),
        regles: trim(reglesHits),
        packs: trim(packsHits),
        projets: trim(projetsHits),
        commandes: trim(commandesHits),
      },
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
