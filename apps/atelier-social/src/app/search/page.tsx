"use client";

/**
 * /search — recherche transverse Hub Ypersoa.
 *
 * Input synchronisé avec l'URL (`?q=club`) → fetch /api/search → résultats
 * groupés par catégorie (motifs / shoots / lookbooks / règles / packs / projets).
 *
 * Chaque card click → navigue vers la bonne page de l'écosystème
 * (atelier-da/motifs, lookbook, social/kanban, etc.).
 */

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Search as SearchIcon, Loader2, Layers, Camera, BookOpen, AlertTriangle, Image as ImageIcon, Trello, Palette as PaletteIcon, Droplet, ShoppingBag, Archive, RefreshCw, Clock } from "lucide-react";

interface MotifHit {
  id: string;
  nom_commercial: string;
  asset_principal: string;
  tags: string[];
  variantes_matchees: Array<{ label: string; file: string }>;
  matched_in: string[];
}
interface ShootHit {
  id: string;
  image_url: string;
  motif_id: string | null;
  variante_key: string | null;
  product_id: string | null;
  destinataire: string[];
  occasion: string[];
  tags: string[];
}
interface LookbookHit {
  id: string;
  titre: string;
  slug: string;
  cover_url: string | null;
  tags: string[];
  date_archivage: string | null;
}
interface RegleHit {
  id: string;
  label: string;
  icone?: string;
  matched_regles: string[];
  note?: string;
}
interface PackHit {
  id: string;
  title: string | null;
  platform: string;
  image_url: string | null;
  caption_snippet: string | null;
}
interface ProjetHit {
  id: string;
  title: string;
  statut: string;
  motif_id: string | null;
  destinataires: string[];
  occasions: string[];
}

interface FilHit {
  id: string;
  nom: string;
  hex: string;
  code_gunold?: string;
  pantone_tpg?: string;
  famille: string;
  canonique?: boolean;
  favori?: boolean;
}

interface PaletteHit {
  id: string;
  nom: string;
  type: string;
  fils: string[];
  description?: string;
}

interface CommandeHit {
  id: string;
  numero_shopify: string;
  date_commande: string;
  statut: "a_planifier" | "planifiee" | "en_cours" | "terminee" | "expediee" | "archivee";
  nom_client: string;
  ville: string;
  nb_articles: number;
  motifs: string[];
  duree_total_min: number;
  is_rework: boolean;
  archivee_le?: string;
  matched_in: string[];
}

interface SearchResult<T> {
  item: T;
  score: number;
  preview: string;
}

interface SearchData {
  motifs: SearchResult<MotifHit>[];
  fils: SearchResult<FilHit>[];
  palettes: SearchResult<PaletteHit>[];
  shoots: SearchResult<ShootHit>[];
  lookbooks: SearchResult<LookbookHit>[];
  regles: SearchResult<RegleHit>[];
  packs: SearchResult<PackHit>[];
  projets: SearchResult<ProjetHit>[];
  commandes: SearchResult<CommandeHit>[];
}

const STATUT_META: Record<CommandeHit["statut"], { label: string; bg: string; fg: string }> = {
  a_planifier: { label: "À planifier", bg: "#FEF6E0", fg: "#7A5800" },
  planifiee:   { label: "Planifiée",   bg: "#E5EAF5", fg: "#1F3A7A" },
  en_cours:    { label: "En cours",    bg: "#FFE9D6", fg: "#9A4400" },
  terminee:    { label: "Terminée",    bg: "#E5F0E8", fg: "#2F7A3E" },
  expediee:    { label: "Expédiée",    bg: "#D9E8E6", fg: "#0E5550" },
  archivee:    { label: "Archivée",    bg: "#EBE7E0", fg: "#5A5142" },
};

function formatDureeShort(min: number): string {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60); const m = min % 60;
  return m ? `${h}h${String(m).padStart(2, "0")}` : `${h}h`;
}

export default function SearchPage() {
  const router = useRouter();
  const params = useSearchParams();
  const initialQ = params.get("q") ?? "";
  const [query, setQuery] = useState(initialQ);
  const [data, setData] = useState<SearchData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Debounce + sync URL
  useEffect(() => {
    const handle = setTimeout(() => {
      const url = new URL(window.location.href);
      if (query.trim()) url.searchParams.set("q", query.trim());
      else url.searchParams.delete("q");
      router.replace(`${url.pathname}${url.search}`);
    }, 200);
    return () => clearTimeout(handle);
  }, [query, router]);

  useEffect(() => {
    const q = query.trim();
    if (!q) { setData(null); return; }
    setLoading(true);
    setError(null);
    fetch(`/api/search?q=${encodeURIComponent(q)}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((res) => {
        if (!res.ok) throw new Error(res.error);
        setData(res.data);
      })
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false));
  }, [query]);

  const totalHits = useMemo(() => {
    if (!data) return 0;
    return data.motifs.length + data.fils.length + data.palettes.length + data.shoots.length + data.lookbooks.length + data.regles.length + data.packs.length + data.projets.length + (data.commandes?.length ?? 0);
  }, [data]);

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto" }}>
      <header style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: "var(--font-editorial)", fontSize: 36, fontWeight: 500, margin: 0, marginBottom: 8 }}>
          Recherche
        </h1>
        <p style={{ fontFamily: "var(--font-sans)", fontSize: 13, color: "var(--hub-foreground)", opacity: 0.65, margin: 0 }}>
          Cherche dans tout le Hub : commandes Shopify (archives comprises), motifs, shoots du catalogue, lookbooks, règles broderie, packs sociaux, projets.
        </p>
      </header>

      <div style={{ position: "relative", marginBottom: 32 }}>
        <SearchIcon size={18} style={{ position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)", opacity: 0.4 }} />
        <input
          autoFocus
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Tape une recherche… (club, mariage, papa, YPM-007, intemporel…)"
          style={{
            width: "100%",
            padding: "14px 16px 14px 48px",
            borderRadius: 999,
            border: "0.5px solid var(--hub-border)",
            background: "white",
            fontFamily: "var(--font-sans)",
            fontSize: 15,
            outline: "none",
          }}
        />
        {loading && (
          <Loader2 size={16} className="animate-spin" style={{ position: "absolute", right: 18, top: "50%", transform: "translateY(-50%)", opacity: 0.5 }} />
        )}
      </div>

      {error && (
        <div style={{ padding: 14, background: "#fdecea", color: "#a13a16", borderRadius: 10, marginBottom: 16, fontSize: 12 }}>
          Erreur : {error}
        </div>
      )}

      {!query.trim() && !data && (
        <div style={{ padding: 60, textAlign: "center", opacity: 0.5, fontFamily: "var(--font-sans)", fontSize: 13 }}>
          Tape quelque chose pour commencer.
        </div>
      )}

      {data && query.trim() && totalHits === 0 && !loading && (
        <div style={{ padding: 60, textAlign: "center", opacity: 0.5, fontFamily: "var(--font-sans)", fontSize: 13 }}>
          Aucun résultat pour <strong>«&nbsp;{query}&nbsp;»</strong>.
        </div>
      )}

      {data && totalHits > 0 && (
        <p style={{ fontFamily: "var(--font-sans)", fontSize: 11, opacity: 0.5, marginBottom: 18 }}>
          {totalHits} résultat{totalHits > 1 ? "s" : ""} dans {[
            (data.commandes?.length ?? 0) > 0 && "commandes",
            data.motifs.length > 0 && "motifs",
            data.shoots.length > 0 && "shoots",
            data.lookbooks.length > 0 && "lookbooks",
            data.regles.length > 0 && "règles",
            data.packs.length > 0 && "packs sociaux",
            data.projets.length > 0 && "projets",
          ].filter(Boolean).join(" · ")}
        </p>
      )}

      {data && (
        <div style={{ display: "flex", flexDirection: "column", gap: 36 }}>
          {(data.commandes?.length ?? 0) > 0 && (
            <Section title="Commandes Shopify" icon={<ShoppingBag size={14} />} count={data.commandes.length}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 10 }}>
                {data.commandes.map((h) => {
                  const s = STATUT_META[h.item.statut];
                  return (
                    <Link key={h.item.id} href={`/atelier-production/commandes/${h.item.id}`} style={{ ...cardStyle, padding: 14, display: "flex", flexDirection: "column", gap: 8 }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                          <span style={{ fontFamily: "var(--font-editorial)", fontSize: 18, fontWeight: 500 }}>{h.item.numero_shopify}</span>
                          {h.item.is_rework && (
                            <span title="Commande rework" style={{ color: "#7A4A14" }}>
                              <RefreshCw size={12} strokeWidth={1.8} />
                            </span>
                          )}
                        </div>
                        <span style={{
                          fontFamily: "var(--font-sans)", fontSize: 9, fontWeight: 600,
                          textTransform: "uppercase", letterSpacing: "0.08em",
                          padding: "3px 8px", borderRadius: 999,
                          background: s.bg, color: s.fg, flexShrink: 0,
                        }}>{s.label}</span>
                      </div>
                      <div style={{ fontFamily: "var(--font-sans)", fontSize: 12, color: "var(--hub-foreground)", opacity: 0.75, lineHeight: 1.4 }}>
                        {h.item.nom_client}{h.item.ville ? ` · ${h.item.ville}` : ""}<br />
                        {h.item.motifs.slice(0, 3).join(", ")}{h.item.motifs.length > 3 ? "…" : ""}
                      </div>
                      <div style={{
                        display: "flex", gap: 10, fontFamily: "var(--font-sans)", fontSize: 11,
                        color: "var(--hub-foreground)", opacity: 0.55, flexWrap: "wrap",
                      }}>
                        <span><Clock size={11} strokeWidth={1.8} style={{ display: "inline", verticalAlign: "-1px", marginRight: 2 }} />{formatDureeShort(h.item.duree_total_min)}</span>
                        <span>{h.item.nb_articles} art.</span>
                        <span>{h.item.date_commande}</span>
                        {h.item.archivee_le && (
                          <span style={{ color: "#5A5142" }}>
                            <Archive size={11} strokeWidth={1.8} style={{ display: "inline", verticalAlign: "-1px", marginRight: 2 }} />
                            {h.item.archivee_le}
                          </span>
                        )}
                      </div>
                      {h.item.matched_in.length > 0 && (
                        <div style={{ fontFamily: "var(--font-sans)", fontSize: 10, opacity: 0.5, fontStyle: "italic" }}>
                          match : {h.item.matched_in.join(", ")}
                        </div>
                      )}
                    </Link>
                  );
                })}
              </div>
            </Section>
          )}

          {data.fils.length > 0 && (
            <Section title="Couleurs de fil" icon={<Droplet size={14} />} count={data.fils.length}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 10 }}>
                {data.fils.map((h) => (
                  <Link key={h.item.id} href="/atelier-production/fils" style={{ ...cardStyle, padding: 12, display: "flex", alignItems: "center", gap: 10 }}>
                    <span
                      style={{
                        width: 36, height: 36, borderRadius: 999, flexShrink: 0,
                        background: h.item.hex, border: "0.5px solid var(--hub-border)",
                        position: "relative",
                      }}
                    >
                      {h.item.canonique && (
                        <span style={{
                          position: "absolute", top: -3, right: -3,
                          background: "#1E2D4A", color: "white",
                          fontSize: 8, width: 14, height: 14, borderRadius: 999,
                          display: "flex", alignItems: "center", justifyContent: "center",
                        }}>★</span>
                      )}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontFamily: "var(--font-sans)", fontSize: 12.5, fontWeight: 600, margin: 0 }}>
                        {h.item.nom}
                      </p>
                      <p style={{ fontFamily: "var(--font-sans)", fontSize: 10, opacity: 0.6, margin: "2px 0 0", letterSpacing: 0.2 }}>
                        {h.item.code_gunold && <>Gunold {h.item.code_gunold} · </>}
                        <code style={{ fontSize: 9.5 }}>{h.item.hex}</code>
                      </p>
                      {h.item.pantone_tpg && (
                        <p style={{ fontFamily: "var(--font-sans)", fontSize: 9.5, opacity: 0.5, margin: "1px 0 0" }}>
                          Pantone {h.item.pantone_tpg}
                        </p>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            </Section>
          )}

          {data.palettes.length > 0 && (
            <Section title="Palettes" icon={<PaletteIcon size={14} />} count={data.palettes.length}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12 }}>
                {data.palettes.map((h) => (
                  <Link key={h.item.id} href="/atelier-production/palettes" style={{ ...cardStyle, padding: 14 }}>
                    <p style={{ fontFamily: "var(--font-editorial)", fontSize: 15, fontWeight: 500, margin: 0 }}>
                      {h.item.nom}
                    </p>
                    <p style={{ fontFamily: "var(--font-sans)", fontSize: 10, opacity: 0.5, margin: "3px 0 0", textTransform: "capitalize" }}>
                      {h.item.type} · {h.item.fils.length} fil{h.item.fils.length > 1 ? "s" : ""}
                    </p>
                    {h.item.description && (
                      <p style={{ fontFamily: "var(--font-sans)", fontSize: 10.5, opacity: 0.65, margin: "6px 0 0", fontStyle: "italic", lineHeight: 1.35 }}>
                        {h.item.description}
                      </p>
                    )}
                  </Link>
                ))}
              </div>
            </Section>
          )}

          {data.motifs.length > 0 && (
            <Section title="Motifs YPM" icon={<Layers size={14} />} count={data.motifs.length}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 14 }}>
                {data.motifs.map((h) => (
                  <Link
                    key={h.item.id}
                    href={`/atelier-da/motifs?open=${h.item.id}`}
                    style={cardStyle}
                  >
                    <div style={{ width: "100%", aspectRatio: "1 / 1", background: "var(--hub-bg)", padding: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={`/motifs/${encodeURIComponent(h.item.asset_principal)}`}
                        alt={h.item.nom_commercial}
                        style={{ width: "100%", height: "100%", objectFit: "contain" }}
                        onError={(e) => ((e.target as HTMLImageElement).style.opacity = "0.2")}
                      />
                    </div>
                    <div style={{ padding: 12 }}>
                      <p style={{ fontFamily: "var(--font-editorial)", fontSize: 15, fontWeight: 500, margin: 0 }}>
                        {h.item.nom_commercial}
                      </p>
                      <p style={{ fontFamily: "var(--font-sans)", fontSize: 10, opacity: 0.5, margin: "3px 0 0" }}>
                        {h.item.id}
                        {h.item.variantes_matchees.length > 0 && ` · ${h.item.variantes_matchees.length} variante${h.item.variantes_matchees.length > 1 ? "s" : ""} match${h.item.variantes_matchees.length > 1 ? "ent" : "e"}`}
                      </p>
                      {h.item.matched_in.length > 0 && (
                        <p style={{ fontFamily: "var(--font-sans)", fontSize: 9.5, opacity: 0.6, margin: "4px 0 0", fontStyle: "italic" }}>
                          dans : {h.item.matched_in.join(", ")}
                        </p>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            </Section>
          )}

          {data.shoots.length > 0 && (
            <Section title="Shoots du catalogue" icon={<Camera size={14} />} count={data.shoots.length}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 10 }}>
                {data.shoots.map((h) => (
                  <Link
                    key={h.item.id}
                    href={`/atelier-da/motifs`}
                    style={{ ...cardStyle, padding: 0 }}
                  >
                    <div style={{ position: "relative", aspectRatio: "1 / 1", background: "var(--hub-bg)" }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={h.item.image_url}
                        alt="shot"
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                        onError={(e) => ((e.target as HTMLImageElement).style.opacity = "0.2")}
                      />
                      {h.item.product_id && (
                        <span style={{
                          position: "absolute", top: 5, left: 5, fontSize: 9, fontFamily: "var(--font-sans)",
                          fontWeight: 700, background: "rgba(255,255,255,0.9)", color: "#324A6E",
                          padding: "1px 6px", borderRadius: 999,
                        }}>{h.item.product_id}</span>
                      )}
                    </div>
                    <div style={{ padding: 8 }}>
                      <p style={{ fontFamily: "var(--font-sans)", fontSize: 10, opacity: 0.6, margin: 0 }}>
                        {[h.item.motif_id, h.item.variante_key].filter(Boolean).join(" · ") || "shot"}
                      </p>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 2, marginTop: 4 }}>
                        {[...h.item.destinataire, ...h.item.occasion, ...h.item.tags].slice(0, 3).map((t, i) => (
                          <span key={`${t}-${i}`} style={pillStyle}>{t}</span>
                        ))}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </Section>
          )}

          {data.lookbooks.length > 0 && (
            <Section title="Lookbooks" icon={<ImageIcon size={14} />} count={data.lookbooks.length}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 14 }}>
                {data.lookbooks.map((h) => (
                  <a
                    key={h.item.id}
                    href={`${process.env.NEXT_PUBLIC_LOOKBOOK_URL ?? "http://localhost:3003"}?id=${h.item.id}`}
                    target="_blank"
                    rel="noreferrer"
                    style={cardStyle}
                  >
                    {h.item.cover_url && (
                      <div style={{ aspectRatio: "4 / 5", background: "var(--hub-bg)", overflow: "hidden" }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={h.item.cover_url} alt={h.item.titre} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      </div>
                    )}
                    <div style={{ padding: 12 }}>
                      <p style={{ fontFamily: "var(--font-editorial)", fontSize: 15, fontWeight: 500, margin: 0 }}>
                        {h.item.titre}
                      </p>
                      <p style={{ fontFamily: "var(--font-sans)", fontSize: 10, opacity: 0.5, margin: "3px 0 0" }}>
                        {h.item.slug} {h.item.date_archivage && `· archivé ${h.item.date_archivage}`}
                      </p>
                      {h.item.tags.length > 0 && (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 3, marginTop: 6 }}>
                          {h.item.tags.slice(0, 4).map((t) => <span key={t} style={pillStyle}>{t}</span>)}
                        </div>
                      )}
                    </div>
                  </a>
                ))}
              </div>
            </Section>
          )}

          {data.regles.length > 0 && (
            <Section title="Règles & contraintes broderie" icon={<AlertTriangle size={14} />} count={data.regles.length}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 12 }}>
                {data.regles.map((h) => (
                  <Link key={h.item.id} href="/atelier-production/regles" style={{ ...cardStyle, padding: 14 }}>
                    <p style={{ fontFamily: "var(--font-editorial)", fontSize: 14, fontWeight: 500, margin: 0 }}>
                      {h.item.icone && <span style={{ marginRight: 6 }}>{h.item.icone}</span>}
                      {h.item.label}
                    </p>
                    <ul style={{ fontFamily: "var(--font-sans)", fontSize: 12, opacity: 0.75, margin: "8px 0 0", paddingLeft: 18 }}>
                      {h.item.matched_regles.slice(0, 3).map((r, i) => (
                        <li key={i} style={{ marginBottom: 3 }}>{r}</li>
                      ))}
                    </ul>
                    {h.item.note && (
                      <p style={{ fontFamily: "var(--font-sans)", fontSize: 11, opacity: 0.55, marginTop: 8, fontStyle: "italic" }}>
                        {h.item.note}
                      </p>
                    )}
                  </Link>
                ))}
              </div>
            </Section>
          )}

          {data.packs.length > 0 && (
            <Section title="Packs sociaux" icon={<BookOpen size={14} />} count={data.packs.length}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12 }}>
                {data.packs.map((h) => (
                  <Link key={h.item.id} href="/social" style={cardStyle}>
                    {h.item.image_url && (
                      <div style={{ aspectRatio: "1 / 1", background: "var(--hub-bg)", overflow: "hidden" }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={h.item.image_url} alt={h.item.title ?? ""} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      </div>
                    )}
                    <div style={{ padding: 12 }}>
                      <p style={{ fontFamily: "var(--font-sans)", fontSize: 12, fontWeight: 600, margin: 0 }}>
                        {h.item.title ?? "Sans titre"}
                      </p>
                      <p style={{ fontFamily: "var(--font-sans)", fontSize: 10, opacity: 0.5, margin: "3px 0 0", textTransform: "capitalize" }}>
                        {h.item.platform}
                      </p>
                      {h.item.caption_snippet && (
                        <p style={{ fontFamily: "var(--font-sans)", fontSize: 10.5, opacity: 0.65, marginTop: 6, lineHeight: 1.35 }}>
                          {h.item.caption_snippet}
                        </p>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            </Section>
          )}

          {data.projets.length > 0 && (
            <Section title="Projets sociaux" icon={<Trello size={14} />} count={data.projets.length}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 12 }}>
                {data.projets.map((h) => (
                  <Link key={h.item.id} href="/social/kanban" style={{ ...cardStyle, padding: 14 }}>
                    <p style={{ fontFamily: "var(--font-sans)", fontSize: 12.5, fontWeight: 500, margin: 0 }}>
                      {h.item.title}
                    </p>
                    <p style={{ fontFamily: "var(--font-sans)", fontSize: 10, opacity: 0.5, margin: "3px 0 0" }}>
                      {h.item.statut} {h.item.motif_id && `· ${h.item.motif_id}`}
                    </p>
                    {(h.item.destinataires.length || h.item.occasions.length) > 0 && (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 3, marginTop: 6 }}>
                        {[...h.item.destinataires, ...h.item.occasions].slice(0, 4).map((t, i) => (
                          <span key={`${t}-${i}`} style={pillStyle}>{t}</span>
                        ))}
                      </div>
                    )}
                  </Link>
                ))}
              </div>
            </Section>
          )}
        </div>
      )}
    </div>
  );
}

function Section({ title, icon, count, children }: { title: string; icon: React.ReactNode; count: number; children: React.ReactNode }) {
  return (
    <section>
      <h2 style={{
        fontFamily: "var(--font-sans)", fontSize: 11, fontWeight: 600,
        letterSpacing: 0.6, textTransform: "uppercase", opacity: 0.6,
        margin: "0 0 12px", display: "inline-flex", alignItems: "center", gap: 6,
      }}>
        {icon} {title} <span style={{ opacity: 0.5, fontWeight: 400 }}>({count})</span>
      </h2>
      {children}
    </section>
  );
}

const cardStyle: React.CSSProperties = {
  display: "block",
  background: "white",
  border: "0.5px solid var(--hub-border)",
  borderRadius: 12,
  overflow: "hidden",
  textDecoration: "none",
  color: "inherit",
  transition: "transform 200ms ease, box-shadow 200ms ease",
};

const pillStyle: React.CSSProperties = {
  fontFamily: "var(--font-sans)",
  fontSize: 9,
  padding: "1.5px 6px",
  borderRadius: 999,
  background: "#ECE3D5",
  color: "#6B4F2A",
  textTransform: "capitalize",
  letterSpacing: 0.2,
};
