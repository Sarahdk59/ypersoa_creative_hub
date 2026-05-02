"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, Camera, X, Sparkles } from "lucide-react";
import type { MotifYpm } from "@/lib/atelier-da/referentiels-loader";

interface MotifsBundle {
  motifs: { motifs: MotifYpm[]; _meta: { nb_motifs: number; nb_variantes_total: number } };
}

export default function MotifsPage() {
  const [data, setData] = useState<MotifsBundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<MotifYpm | null>(null);

  useEffect(() => {
    fetch("/api/da/referentiels")
      .then((r) => r.json())
      .then((res) => {
        if (!res.ok) throw new Error(res.error);
        setData({ motifs: res.data.motifs });
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div style={{ padding: 60, textAlign: "center" }}>
        <Loader2 size={32} className="animate-spin" strokeWidth={1.4} />
        <p style={{ fontFamily: "var(--font-sans)", marginTop: 16, opacity: 0.6 }}>Chargement des motifs…</p>
      </div>
    );
  }
  if (error || !data) {
    return <div style={{ padding: 24, color: "#a13a16" }}>Erreur : {error || "Référentiel non chargé"}</div>;
  }

  return (
    <div style={{ maxWidth: 1400, margin: "0 auto" }}>
      <Link
        href="/atelier-da"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          fontFamily: "var(--font-sans)",
          fontSize: 12,
          color: "var(--hub-foreground)",
          opacity: 0.6,
          textDecoration: "none",
          marginBottom: 24,
        }}
      >
        <ArrowLeft size={14} strokeWidth={1.6} /> Atelier DA
      </Link>

      <header style={{ marginBottom: 32 }}>
        <h1 style={{ fontFamily: "var(--font-editorial)", fontSize: 36, fontWeight: 500, margin: 0, marginBottom: 8 }}>
          Référentiel motifs YPM
        </h1>
        <p style={{ fontFamily: "var(--font-sans)", fontSize: 13, color: "var(--hub-foreground)", opacity: 0.65, maxWidth: 720 }}>
          {data.motifs._meta.nb_motifs} motifs commerciaux · {data.motifs._meta.nb_variantes_total} variantes (mots brodés alternatifs sur le même design). Click sur un motif pour voir ses variantes et l&apos;utiliser dans Shooting Book.
        </p>
      </header>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
          gap: 16,
        }}
      >
        {data.motifs.motifs.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => setSelected(m)}
            style={{
              background: "white",
              border: "0.5px solid var(--hub-border)",
              borderRadius: 12,
              padding: 0,
              overflow: "hidden",
              cursor: "pointer",
              textAlign: "left",
              transition: "transform 200ms ease, box-shadow 200ms ease",
              display: "flex",
              flexDirection: "column",
            }}
            className="canonique-card"
          >
            <div
              style={{
                aspectRatio: "1/1",
                background: "var(--hub-bg)",
                padding: 24,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/motifs/${encodeURIComponent(m.asset_principal)}`}
                alt={m.nom_commercial}
                style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
                onError={(e) => ((e.target as HTMLImageElement).style.opacity = "0.2")}
              />
            </div>
            <div style={{ padding: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
                <h3 style={{ fontFamily: "var(--font-editorial)", fontSize: 18, fontWeight: 500, margin: 0 }}>
                  {m.nom_commercial}
                </h3>
                <span style={{ fontFamily: "var(--font-sans)", fontSize: 10, opacity: 0.5 }}>
                  <code>{m.id}</code>
                </span>
              </div>
              {m.nb_variantes > 0 && (
                <p style={{ fontFamily: "var(--font-sans)", fontSize: 11, opacity: 0.6, margin: "6px 0 0 0" }}>
                  + {m.nb_variantes} variante{m.nb_variantes > 1 ? "s" : ""}
                </p>
              )}
            </div>
          </button>
        ))}
      </div>

      {selected && <MotifModal motif={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

function MotifModal({ motif, onClose }: { motif: MotifYpm; onClose: () => void }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(30,45,74,0.4)",
        zIndex: 100,
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        padding: 32,
        overflow: "auto",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "white",
          borderRadius: 20,
          maxWidth: 980,
          width: "100%",
          padding: 32,
          position: "relative",
          maxHeight: "calc(100vh - 64px)",
          overflow: "auto",
        }}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Fermer"
          style={{
            position: "absolute",
            top: 16,
            right: 16,
            background: "var(--hub-bg)",
            border: "none",
            width: 36,
            height: 36,
            borderRadius: 999,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <X size={16} />
        </button>

        <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: 32, alignItems: "flex-start" }}>
          <div style={{ aspectRatio: "1/1", background: "var(--hub-bg)", borderRadius: 12, padding: 24, display: "flex", alignItems: "center", justifyContent: "center" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/motifs/${encodeURIComponent(motif.asset_principal)}`}
              alt={motif.nom_commercial}
              style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
              onError={(e) => ((e.target as HTMLImageElement).style.opacity = "0.2")}
            />
          </div>

          <div>
            <h2 style={{ fontFamily: "var(--font-editorial)", fontSize: 32, fontWeight: 500, margin: 0, marginBottom: 4 }}>
              {motif.nom_commercial}
            </h2>
            <p style={{ fontFamily: "var(--font-sans)", fontSize: 12, opacity: 0.5, margin: 0, marginBottom: 16 }}>
              <code>{motif.id}</code> · {motif.nb_variantes} variantes
            </p>

            <Link
              href={{ pathname: "/atelier-da/shooting-book", query: { motif: motif.id } }}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "10px 18px",
                borderRadius: 999,
                background: "var(--hub-foreground)",
                color: "var(--hub-bg)",
                fontFamily: "var(--font-sans)",
                fontSize: 12,
                fontWeight: 500,
                textDecoration: "none",
                marginBottom: 24,
              }}
            >
              <Camera size={13} /> Utiliser dans Shooting Book
            </Link>

            {motif.variantes.length > 0 && (
              <div>
                <h4 style={{ fontFamily: "var(--font-sans)", fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--hub-foreground)", opacity: 0.6, margin: "0 0 12px 0" }}>
                  Variantes ({motif.variantes.length})
                </h4>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
                    gap: 10,
                  }}
                >
                  {motif.variantes.map((v) => (
                    <div
                      key={v.file}
                      style={{
                        background: "var(--hub-bg)",
                        border: "0.5px solid var(--hub-border)",
                        borderRadius: 10,
                        padding: 8,
                        textAlign: "center",
                      }}
                    >
                      <div style={{ aspectRatio: "1/1", background: "white", borderRadius: 6, padding: 8, marginBottom: 6, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={`/motifs/${encodeURIComponent(v.file)}`}
                          alt={v.label}
                          style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
                          onError={(e) => ((e.target as HTMLImageElement).style.opacity = "0.2")}
                        />
                      </div>
                      <p style={{ fontFamily: "var(--font-sans)", fontSize: 10, opacity: 0.7, margin: 0, lineHeight: 1.3 }}>
                        {v.label}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
