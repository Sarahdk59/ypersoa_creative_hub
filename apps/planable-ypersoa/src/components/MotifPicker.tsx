"use client";
import { Loader2, Search, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { PlanableMotif } from "@/app/api/motifs/route";

const ATELIER_SOCIAL_URL = process.env.NEXT_PUBLIC_ATELIER_SOCIAL_URL ?? "http://localhost:3000";

export function MotifPicker({
  selected,
  selectedVariante,
  onSelect,
  onSelectVariante,
}: {
  selected: string;
  selectedVariante?: string | null;
  onSelect: (id: string) => void;
  onSelectVariante?: (file: string | null) => void;
}) {
  const [motifs, setMotifs] = useState<PlanableMotif[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [activeTag, setActiveTag] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/motifs")
      .then((r) => r.json())
      .then((res) => {
        if (!res.ok) throw new Error(res.error);
        setMotifs(res.data);
      })
      .catch((e) => setErr(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false));
  }, []);

  const allTags = useMemo(() => {
    const counts = new Map<string, number>();
    for (const m of motifs) for (const t of m.tags) counts.set(t, (counts.get(t) ?? 0) + 1);
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  }, [motifs]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return motifs.filter((m) => {
      if (activeTag && !m.tags.includes(activeTag)) return false;
      if (!q) return true;
      return (
        m.id.toLowerCase().includes(q) ||
        m.nom_commercial.toLowerCase().includes(q) ||
        m.tags.some((t) => t.toLowerCase().includes(q))
      );
    });
  }, [motifs, query, activeTag]);

  if (loading) {
    return (
      <div style={{ padding: 24, display: "flex", justifyContent: "center" }}>
        <Loader2 size={18} className="animate-spin" />
      </div>
    );
  }

  if (err) {
    return <div style={{ color: "#c53030", fontSize: 12 }}>Erreur référentiel motifs : {err}</div>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {/* Recherche */}
      <div style={{ position: "relative" }}>
        <Search size={13} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", opacity: 0.5 }} />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Recherche motif ou tag…"
          style={{
            width: "100%", padding: "8px 12px 8px 30px",
            borderRadius: 8, border: "0.5px solid var(--color-border)",
            fontFamily: "var(--font-sans)", fontSize: 12, background: "white",
          }}
        />
        {query && (
          <button type="button" onClick={() => setQuery("")} style={{
            position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)",
            background: "none", border: "none", cursor: "pointer", padding: 4,
          }}>
            <X size={12} />
          </button>
        )}
      </div>

      {/* Tags */}
      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
        <TagPill label="Tous" active={!activeTag} onClick={() => setActiveTag(null)} />
        {allTags.slice(0, 12).map(([tag, count]) => (
          <TagPill
            key={tag}
            label={`${tag} (${count})`}
            active={activeTag === tag}
            onClick={() => setActiveTag(activeTag === tag ? null : tag)}
          />
        ))}
      </div>

      {/* Grille */}
      <div style={{
        display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))",
        gap: 8, maxHeight: 320, overflow: "auto", padding: 4,
      }}>
        {filtered.map((m) => {
          const active = m.id === selected;
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => onSelect(m.id)}
              title={m.nom_commercial + (m.tags.length ? ` · ${m.tags.join(", ")}` : "")}
              style={{
                padding: 6, borderRadius: 10,
                border: active ? "2px solid var(--color-terracotta)" : "0.5px solid var(--color-border)",
                background: active ? "rgba(180,102,95,0.08)" : "white",
                cursor: "pointer", display: "flex", flexDirection: "column", gap: 4,
                textAlign: "left",
              }}
            >
              <div style={{ aspectRatio: "1/1", background: "var(--color-cream)", borderRadius: 6, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", padding: 6 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`${ATELIER_SOCIAL_URL}/motifs/${encodeURIComponent(m.asset_principal)}`}
                  alt={m.nom_commercial}
                  style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
                  onError={(e) => ((e.target as HTMLImageElement).style.opacity = "0.2")}
                />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                <span style={{ fontSize: 10, fontWeight: 600, fontFamily: "var(--font-serif)" }}>{m.nom_commercial}</span>
                <span style={{ fontSize: 9, opacity: 0.5, fontFamily: "var(--font-sans)" }}>
                  <code>{m.id}</code>
                  {m.nb_variantes > 0 && ` · +${m.nb_variantes}v`}
                </span>
              </div>
            </button>
          );
        })}
        {filtered.length === 0 && (
          <div style={{ gridColumn: "1 / -1", padding: 24, textAlign: "center", opacity: 0.5, fontSize: 12 }}>
            Aucun motif ne matche.
          </div>
        )}
      </div>

      {/* Variantes du motif sélectionné */}
      <VariantesGrid
        motif={motifs.find((m) => m.id === selected) ?? null}
        selectedVariante={selectedVariante ?? null}
        onSelectVariante={onSelectVariante}
      />
    </div>
  );
}

function VariantesGrid({
  motif,
  selectedVariante,
  onSelectVariante,
}: {
  motif: PlanableMotif | null;
  selectedVariante: string | null;
  onSelectVariante?: (file: string | null) => void;
}) {
  if (!motif || !onSelectVariante) return null;
  if (motif.variantes.length === 0) return null;

  return (
    <div style={{
      borderTop: "0.5px solid var(--color-border)", paddingTop: 10,
      display: "flex", flexDirection: "column", gap: 6,
    }}>
      <div style={{
        fontFamily: "var(--font-sans)", fontSize: 10, fontWeight: 600,
        letterSpacing: "0.06em", textTransform: "uppercase", opacity: 0.55,
      }}>
        Variantes de <code>{motif.id}</code> ({motif.variantes.length})
      </div>
      <div style={{
        display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(90px, 1fr))",
        gap: 6, maxHeight: 220, overflow: "auto",
      }}>
        {/* Choix par défaut : asset_principal (= "motif source", pas une variante spécifique) */}
        <VarianteTile
          imgUrl={`${ATELIER_SOCIAL_URL}/motifs/${encodeURIComponent(motif.asset_principal)}`}
          label="Source"
          subLabel="(défaut)"
          active={!selectedVariante}
          onClick={() => onSelectVariante(null)}
        />
        {motif.variantes.map((v) => (
          <VarianteTile
            key={v.file}
            imgUrl={`${ATELIER_SOCIAL_URL}/motifs/${encodeURIComponent(v.file)}`}
            label={v.label}
            subLabel={v.tags?.length ? v.tags.slice(0, 2).join(" · ") : undefined}
            active={selectedVariante === v.file}
            onClick={() => onSelectVariante(v.file)}
          />
        ))}
      </div>
    </div>
  );
}

function VarianteTile({
  imgUrl,
  label,
  subLabel,
  active,
  onClick,
}: {
  imgUrl: string;
  label: string;
  subLabel?: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label + (subLabel ? ` · ${subLabel}` : "")}
      style={{
        padding: 5, borderRadius: 8,
        border: active ? "2px solid var(--color-terracotta)" : "0.5px solid var(--color-border)",
        background: active ? "rgba(180,102,95,0.08)" : "white",
        cursor: "pointer", display: "flex", flexDirection: "column", gap: 3,
        textAlign: "left",
      }}
    >
      <div style={{ aspectRatio: "1/1", background: "var(--color-cream)", borderRadius: 5, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", padding: 4 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imgUrl}
          alt={label}
          style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
          onError={(e) => ((e.target as HTMLImageElement).style.opacity = "0.2")}
        />
      </div>
      <span style={{ fontSize: 9, fontWeight: 600, fontFamily: "var(--font-sans)", lineHeight: 1.2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {label}
      </span>
      {subLabel && (
        <span style={{ fontSize: 8, opacity: 0.55, fontFamily: "var(--font-sans)" }}>{subLabel}</span>
      )}
    </button>
  );
}

function TagPill({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: "3px 9px", borderRadius: 999,
        border: "0.5px solid var(--color-border)",
        background: active ? "var(--color-ink)" : "white",
        color: active ? "var(--color-cream)" : "var(--color-ink)",
        fontFamily: "var(--font-sans)", fontSize: 10, fontWeight: 500, cursor: "pointer",
      }}
    >
      {label}
    </button>
  );
}
