/**
 * Atelier Trends — dashboard (Lot 1, read-only).
 *
 * Affiche le dernier run Google Trends FR. Bouton "Rafraîchir" = POST /api/trends.
 * Lot 3 ajoutera l'enrichissement IA (motif/occasion/créneau + bouton "Générer ce post").
 */
"use client";

import { useEffect, useState } from "react";
import { TrendingUp, RefreshCw, Loader2, AlertTriangle, ExternalLink } from "lucide-react";
import {
  type TrendsSnapshot,
  sortTrends,
  SIGNAL_LABELS,
  TYPE_LABELS,
  SOURCE_LABELS,
} from "@/lib/trends/trends";

export default function AtelierTrendsPage() {
  const [snapshot, setSnapshot] = useState<TrendsSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function load() {
    setLoading(true);
    fetch("/api/trends", { cache: "no-store" })
      .then((r) => r.json())
      .then((res) => {
        if (!res.ok) throw new Error(res.error);
        setSnapshot(res.data);
      })
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  function refresh() {
    setRunning(true);
    setError(null);
    fetch("/api/trends", { method: "POST" })
      .then((r) => r.json())
      .then((res) => {
        if (!res.ok) throw new Error(res.error);
        setSnapshot(res.data);
      })
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setRunning(false));
  }

  const trends = snapshot ? sortTrends(snapshot.trends) : [];

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto" }}>
      <header
        style={{
          marginBottom: 32,
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 24,
        }}
      >
        <div>
          <h1
            style={{
              fontFamily: "var(--font-editorial)",
              fontSize: 40,
              fontWeight: 500,
              letterSpacing: "-0.015em",
              color: "var(--hub-foreground)",
              lineHeight: 1.05,
              margin: 0,
              marginBottom: 12,
            }}
          >
            Atelier Trends
          </h1>
          <p
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 14,
              color: "var(--hub-foreground)",
              opacity: 0.65,
              maxWidth: 640,
              lineHeight: 1.6,
            }}
          >
            Veille des recherches qui montent en France (Google Trends). Lot 1 — tendances brutes.
            L&apos;enrichissement IA (motif YPM suggéré, occasion, créneau Planable J-45,
            bouton « Générer ce post ») arrive au Lot 3.
          </p>
        </div>

        <button
          onClick={refresh}
          disabled={running}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            whiteSpace: "nowrap",
            fontFamily: "var(--font-sans)",
            fontSize: 13,
            fontWeight: 500,
            padding: "10px 16px",
            borderRadius: 10,
            border: "none",
            background: "var(--color-brand-rose, #A76059)",
            color: "#FAF7F2",
            cursor: running ? "wait" : "pointer",
            opacity: running ? 0.7 : 1,
          }}
        >
          {running ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} strokeWidth={1.8} />}
          {running ? "Récupération…" : "Rafraîchir"}
        </button>
      </header>

      {/* Bandeau méta du run */}
      {snapshot && (
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 16,
            alignItems: "center",
            fontFamily: "var(--font-sans)",
            fontSize: 12,
            color: "var(--hub-foreground)",
            opacity: 0.7,
            marginBottom: 20,
          }}
        >
          <span>Dernier run : <strong>{snapshot.date}</strong></span>
          <span>•</span>
          <span>{snapshot.meta.trends_count} tendances</span>
          <span>•</span>
          <span>Sources : {snapshot.sources.map((s) => SOURCE_LABELS[s]).join(", ")}</span>
        </div>
      )}

      {/* Erreurs non bloquantes du run */}
      {snapshot && snapshot.errors.length > 0 && (
        <div
          style={{
            display: "flex",
            gap: 10,
            padding: "12px 16px",
            borderRadius: 10,
            background: "#FCF3E8",
            border: "0.5px solid #E8C9A0",
            marginBottom: 20,
            fontFamily: "var(--font-sans)",
            fontSize: 12,
            color: "#7A4A12",
          }}
        >
          <AlertTriangle size={16} strokeWidth={1.6} style={{ flexShrink: 0, marginTop: 1 }} />
          <div>
            <strong>Avertissements du run</strong>
            <ul style={{ margin: "4px 0 0", paddingLeft: 18 }}>
              {snapshot.errors.map((e, i) => (
                <li key={i}>{e}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Erreur bloquante (fetch / POST) */}
      {error && (
        <div
          style={{
            display: "flex",
            gap: 10,
            padding: "12px 16px",
            borderRadius: 10,
            background: "#FBEAEA",
            border: "0.5px solid #E0A3A3",
            marginBottom: 20,
            fontFamily: "var(--font-sans)",
            fontSize: 13,
            color: "#8A2B2B",
          }}
        >
          <AlertTriangle size={16} strokeWidth={1.6} style={{ flexShrink: 0, marginTop: 1 }} />
          {error}
        </div>
      )}

      {/* États */}
      {loading ? (
        <div style={{ display: "flex", alignItems: "center", gap: 10, opacity: 0.6, fontFamily: "var(--font-sans)", fontSize: 14 }}>
          <Loader2 size={18} className="animate-spin" /> Chargement…
        </div>
      ) : trends.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "60px 20px",
            border: "0.5px dashed var(--hub-border)",
            borderRadius: 12,
            fontFamily: "var(--font-sans)",
            color: "var(--hub-foreground)",
            opacity: 0.6,
          }}
        >
          <TrendingUp size={32} strokeWidth={1.2} style={{ marginBottom: 12, opacity: 0.5 }} />
          <p style={{ margin: 0 }}>Aucune tendance pour l&apos;instant.</p>
          <p style={{ margin: "6px 0 0", fontSize: 13 }}>Clique sur « Rafraîchir » pour lancer un premier run.</p>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
            gap: 16,
          }}
        >
          {trends.map((t, i) => (
            <article
              key={`${t.terme}-${i}`}
              style={{
                background: "white",
                border: "0.5px solid var(--hub-border)",
                borderRadius: 12,
                padding: 20,
                display: "flex",
                flexDirection: "column",
                gap: 12,
              }}
            >
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                <Badge>{TYPE_LABELS[t.type]}</Badge>
                <Badge accent>{SIGNAL_LABELS[t.signal]}</Badge>
                {t.trafic_estime && <Badge>{t.trafic_estime}</Badge>}
              </div>

              <h2
                style={{
                  fontFamily: "var(--font-editorial)",
                  fontSize: 18,
                  fontWeight: 500,
                  letterSpacing: "-0.01em",
                  color: "var(--hub-foreground)",
                  margin: 0,
                  lineHeight: 1.25,
                }}
              >
                {t.terme}
              </h2>

              {t.contexte.length > 0 && (
                <ul
                  style={{
                    margin: 0,
                    paddingLeft: 16,
                    fontFamily: "var(--font-sans)",
                    fontSize: 12,
                    color: "var(--hub-foreground)",
                    opacity: 0.65,
                    lineHeight: 1.5,
                  }}
                >
                  {t.contexte.map((c, j) => (
                    <li key={j}>{c}</li>
                  ))}
                </ul>
              )}

              <div style={{ marginTop: "auto", display: "flex", alignItems: "center", gap: 12 }}>
                {t.url && (
                  <a
                    href={t.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 5,
                      fontFamily: "var(--font-sans)",
                      fontSize: 11,
                      fontWeight: 500,
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                      color: "var(--hub-foreground)",
                      opacity: 0.6,
                      textDecoration: "none",
                    }}
                  >
                    Voir <ExternalLink size={12} strokeWidth={1.6} />
                  </a>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

function Badge({ children, accent }: { children: React.ReactNode; accent?: boolean }) {
  return (
    <span
      style={{
        fontFamily: "var(--font-sans)",
        fontSize: 10,
        fontWeight: 600,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        padding: "3px 8px",
        borderRadius: 999,
        background: accent ? "#1E2D4A" : "var(--hub-bg)",
        color: accent ? "#FAF7F2" : "var(--hub-foreground)",
        border: accent ? "none" : "0.5px solid var(--hub-border)",
        opacity: accent ? 1 : 0.7,
      }}
    >
      {children}
    </span>
  );
}
