/**
 * /atelier-da/incarnations — liste des incarnations avec filtres.
 */
"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, BarChart3, FileSpreadsheet, Loader2, Plus, Search, X } from "lucide-react";

import type {
  IncarnationEnriched,
  IncarnationFilters,
  IncarnationStatut,
  IncarnationTon,
  Motif,
} from "@/types/incarnations";
import {
  STATUT_LABELS,
  STATUT_ORDER,
  TON_LABELS,
  TON_ORDER,
} from "@/types/incarnations";
import { fetchIncarnations, fetchMotifs } from "@/lib/incarnations/api-client";
import { IncarnationCard } from "@/components/incarnations/IncarnationCard";

function IncarnationsPageInner() {
  const router = useRouter();
  const sp = useSearchParams();

  const motif = sp.get("motif_ypm") ?? "";
  const statut = (sp.get("statut") as IncarnationStatut | null) ?? "";
  const ton = (sp.get("ton") as IncarnationTon | null) ?? "";
  const sortRaw = sp.get("sort");
  const sort: NonNullable<IncarnationFilters["sort"]> =
    sortRaw && ["code_asc", "nom_asc", "statut", "updated_desc"].includes(sortRaw)
      ? (sortRaw as NonNullable<IncarnationFilters["sort"]>)
      : "code_asc";

  const [q, setQ] = useState(sp.get("q") ?? "");
  const [motifs, setMotifs] = useState<Motif[]>([]);
  const [data, setData] = useState<IncarnationEnriched[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const updateUrl = useCallback(
    (patch: Partial<{ motif_ypm: string; statut: string; ton: string; q: string; sort: string }>) => {
      const params = new URLSearchParams(sp.toString());
      const apply = (key: string, value: string | undefined) => {
        if (value) params.set(key, value);
        else params.delete(key);
      };
      if ("motif_ypm" in patch) apply("motif_ypm", patch.motif_ypm);
      if ("statut" in patch) apply("statut", patch.statut);
      if ("ton" in patch) apply("ton", patch.ton);
      if ("q" in patch) apply("q", patch.q);
      if ("sort" in patch && patch.sort && patch.sort !== "code_asc") {
        params.set("sort", patch.sort);
      } else if ("sort" in patch) {
        params.delete("sort");
      }
      const qs = params.toString();
      router.replace(`/atelier-da/incarnations${qs ? `?${qs}` : ""}`);
    },
    [router, sp],
  );

  useEffect(() => {
    fetchMotifs().then(setMotifs).catch(() => undefined);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchIncarnations({
      motif_ypm: motif || undefined,
      statut: (statut as IncarnationStatut) || undefined,
      ton: (ton as IncarnationTon) || undefined,
      q: q || undefined,
      sort,
    })
      .then((r) => {
        if (cancelled) return;
        setData(r.data);
        setTotal(r.meta.total);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Erreur");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [motif, statut, ton, q, sort]);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => {
      if ((sp.get("q") ?? "") !== q) updateUrl({ q });
    }, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const hasFilters = Boolean(motif || statut || ton || q);

  const motifGroups = useMemo(() => {
    const map = new Map<string, IncarnationEnriched[]>();
    for (const i of data) {
      const key = i.motif_ypm;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(i);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [data]);

  return (
    <div style={{ maxWidth: 1500, margin: "0 auto" }}>
      <Link href="/atelier-da" style={backLinkStyle}>
        <ArrowLeft size={14} strokeWidth={1.6} /> Atelier DA
      </Link>

      <header
        style={{
          marginBottom: 24,
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 16,
        }}
      >
        <div>
          <h1
            style={{
              fontFamily: "var(--font-editorial)",
              fontSize: 36,
              fontWeight: 500,
              letterSpacing: "-0.015em",
              margin: 0,
              marginBottom: 8,
            }}
          >
            Incarnations
          </h1>
          <p
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 13,
              color: "var(--hub-foreground)",
              opacity: 0.65,
              maxWidth: 720,
              margin: 0,
            }}
          >
            Déclinaisons éditoriales des motifs YPM. Pilote le ciblage Shopify (chips
            configurateur + photos contextuelles par collection) et l&apos;audit de
            production (digitalisation, shooting, publication).
          </p>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link href="/atelier-da/incarnations/audit" style={ghostButton}>
            <BarChart3 size={14} strokeWidth={1.6} /> Audit production
          </Link>
          <Link
            href="/atelier-da/incarnations/import"
            style={ghostButton}
          >
            <FileSpreadsheet size={14} strokeWidth={1.6} /> Importer XLSX
          </Link>
          <Link
            href="/atelier-da/incarnations/new"
            style={primaryButton}
          >
            <Plus size={14} strokeWidth={1.8} /> Nouvelle incarnation
          </Link>
        </div>
      </header>

      {/* Filtres */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 10,
          alignItems: "center",
          marginBottom: 16,
        }}
      >
        <div
          style={{
            flex: "1 1 240px",
            minWidth: 220,
            position: "relative",
            background: "white",
            border: "0.5px solid var(--hub-border)",
            borderRadius: 9999,
            display: "flex",
            alignItems: "center",
            paddingLeft: 14,
          }}
        >
          <Search size={14} strokeWidth={1.6} style={{ opacity: 0.45 }} />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Recherche par nom, code, mots…"
            style={{
              flex: 1,
              background: "transparent",
              border: "none",
              outline: "none",
              padding: "10px 12px",
              fontFamily: "var(--font-sans)",
              fontSize: 13,
              color: "var(--hub-foreground)",
            }}
          />
        </div>

        <select
          value={motif}
          onChange={(e) => updateUrl({ motif_ypm: e.target.value })}
          style={selectStyle}
        >
          <option value="">Tous motifs</option>
          {motifs.map((m) => (
            <option key={m.code} value={m.code}>
              {m.code} · {m.nom}
            </option>
          ))}
        </select>

        <select
          value={statut}
          onChange={(e) => updateUrl({ statut: e.target.value })}
          style={selectStyle}
        >
          <option value="">Tous statuts</option>
          {STATUT_ORDER.map((s) => (
            <option key={s} value={s}>
              {STATUT_LABELS[s]}
            </option>
          ))}
        </select>

        <select
          value={ton}
          onChange={(e) => updateUrl({ ton: e.target.value })}
          style={selectStyle}
        >
          <option value="">Tous tons</option>
          {TON_ORDER.map((t) => (
            <option key={t} value={t}>
              {TON_LABELS[t]}
            </option>
          ))}
        </select>

        <select
          value={sort}
          onChange={(e) => updateUrl({ sort: e.target.value })}
          style={selectStyle}
        >
          <option value="code_asc">Tri : code</option>
          <option value="nom_asc">Tri : nom A-Z</option>
          <option value="statut">Tri : statut</option>
          <option value="updated_desc">Tri : récemment modifiées</option>
        </select>

        {hasFilters && (
          <button
            type="button"
            onClick={() => {
              setQ("");
              router.replace("/atelier-da/incarnations");
            }}
            style={{ ...ghostButton, padding: "8px 14px" }}
          >
            <X size={12} /> Effacer
          </button>
        )}

        <span
          style={{
            marginLeft: "auto",
            fontFamily: "var(--font-sans)",
            fontSize: 12,
            color: "var(--hub-foreground)",
            opacity: 0.55,
          }}
        >
          {loading ? "…" : `${total} incarnation${total > 1 ? "s" : ""}`}
        </span>
      </div>

      {error && (
        <div
          style={{
            padding: 16,
            border: "1px solid #E2A8A2",
            borderRadius: 12,
            background: "#FAEBE8",
            color: "#7C2A24",
            fontFamily: "var(--font-sans)",
            fontSize: 13,
            marginBottom: 16,
          }}
        >
          {error}
        </div>
      )}

      {loading && data.length === 0 ? (
        <div style={{ padding: 60, textAlign: "center" }}>
          <Loader2 size={22} className="animate-spin" />
        </div>
      ) : data.length === 0 ? (
        <div
          style={{
            padding: 48,
            border: "1px dashed var(--hub-border)",
            borderRadius: 12,
            background: "white",
            textAlign: "center",
            fontFamily: "var(--font-sans)",
            fontSize: 13,
            color: "var(--hub-foreground)",
            opacity: 0.65,
          }}
        >
          Aucune incarnation ne correspond. Essaie d&apos;effacer les filtres ou crée-en une nouvelle.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {motifGroups.map(([code, list]) => {
            const motifMeta = motifs.find((m) => m.code === code);
            return (
              <section key={code}>
                <h2
                  style={{
                    fontFamily: "var(--font-editorial)",
                    fontSize: 18,
                    fontWeight: 500,
                    margin: 0,
                    marginBottom: 10,
                    color: "var(--hub-foreground)",
                    display: "flex",
                    alignItems: "baseline",
                    gap: 8,
                  }}
                >
                  {motifMeta?.nom ?? code}
                  <span
                    style={{
                      fontFamily: "var(--font-sans)",
                      fontSize: 10,
                      letterSpacing: "0.12em",
                      textTransform: "uppercase",
                      color: "var(--hub-foreground)",
                      opacity: 0.55,
                      fontWeight: 600,
                    }}
                  >
                    {code} · {list.length} incarnation{list.length > 1 ? "s" : ""}
                  </span>
                </h2>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                    gap: 12,
                  }}
                >
                  {list.map((i) => (
                    <IncarnationCard key={i.id} incarnation={i} />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

const backLinkStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  fontFamily: "var(--font-sans)",
  fontSize: 12,
  color: "var(--hub-foreground)",
  opacity: 0.6,
  textDecoration: "none",
  marginBottom: 16,
};

const selectStyle: React.CSSProperties = {
  background: "white",
  border: "0.5px solid var(--hub-border)",
  borderRadius: 9999,
  padding: "10px 14px",
  fontFamily: "var(--font-sans)",
  fontSize: 12,
  color: "var(--hub-foreground)",
  cursor: "pointer",
};

const primaryButton: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  background: "var(--color-brand-rose, #A76059)",
  color: "white",
  textDecoration: "none",
  borderRadius: 9999,
  padding: "10px 18px",
  fontFamily: "var(--font-sans)",
  fontSize: 12,
  fontWeight: 500,
  letterSpacing: "0.04em",
};

const ghostButton: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  background: "white",
  color: "var(--hub-foreground)",
  textDecoration: "none",
  border: "0.5px solid var(--hub-border)",
  borderRadius: 9999,
  padding: "10px 16px",
  fontFamily: "var(--font-sans)",
  fontSize: 12,
  fontWeight: 500,
  cursor: "pointer",
};

export default function IncarnationsPage() {
  return (
    <Suspense
      fallback={
        <div style={{ padding: 60, textAlign: "center" }}>
          <Loader2 size={22} className="animate-spin" />
        </div>
      }
    >
      <IncarnationsPageInner />
    </Suspense>
  );
}
