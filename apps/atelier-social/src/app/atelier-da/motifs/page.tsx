"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, Camera, X, Plus, Star } from "lucide-react";
import type { MotifYpm } from "@/lib/atelier-da/referentiels-loader";

interface MotifsBundle {
  motifs: { motifs: MotifYpm[]; _meta: { nb_motifs: number; nb_variantes_total: number } };
}

export default function MotifsPage() {
  const [data, setData] = useState<MotifsBundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<MotifYpm | null>(null);

  const refresh = useCallback(async () => {
    const res = await fetch("/api/da/referentiels", { cache: "no-store" }).then((r) => r.json());
    if (!res.ok) throw new Error(res.error);
    setData({ motifs: res.data.motifs });
    if (selected) {
      const updated = res.data.motifs.motifs.find((m: MotifYpm) => m.id === selected.id);
      if (updated) setSelected(updated);
    }
  }, [selected]);

  useEffect(() => {
    fetch("/api/da/referentiels", { cache: "no-store" })
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
              width: "100%",
              boxSizing: "border-box",
            }}
            className="canonique-card"
          >
            <div
              style={{
                width: "100%",
                aspectRatio: "1 / 1",
                background: "var(--hub-bg)",
                boxSizing: "border-box",
                padding: 20,
                overflow: "hidden",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/motifs/${encodeURIComponent(m.asset_principal)}`}
                alt={m.nom_commercial}
                style={{
                  display: "block",
                  width: "100%",
                  height: "100%",
                  objectFit: "contain",
                }}
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

      {selected && <MotifModal motif={selected} onClose={() => setSelected(null)} onUploaded={refresh} />}
    </div>
  );
}

function MotifModal({
  motif,
  onClose,
  onUploaded,
}: {
  motif: MotifYpm;
  onClose: () => void;
  onUploaded: () => Promise<void>;
}) {
  const [uploadOpen, setUploadOpen] = useState(false);
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

            <div style={{ display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap" }}>
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
                }}
              >
                <Camera size={13} /> Utiliser dans Shooting Book
              </Link>
              <button
                type="button"
                onClick={() => setUploadOpen((v) => !v)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "10px 18px",
                  borderRadius: 999,
                  background: uploadOpen ? "var(--hub-bg)" : "white",
                  color: "var(--hub-foreground)",
                  border: "0.5px solid var(--hub-border)",
                  fontFamily: "var(--font-sans)",
                  fontSize: 12,
                  fontWeight: 500,
                  cursor: "pointer",
                }}
              >
                <Plus size={13} /> Ajouter un PNG
              </button>
            </div>

            {uploadOpen && (
              <UploadForm
                motifId={motif.id}
                onCancel={() => setUploadOpen(false)}
                onSuccess={async () => {
                  await onUploaded();
                  setUploadOpen(false);
                }}
              />
            )}

            {motif.variantes.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <h4 style={{ fontFamily: "var(--font-sans)", fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--hub-foreground)", opacity: 0.6, margin: "0 0 12px 0" }}>
                  Variantes ({motif.variantes.length})
                </h4>
                <PngGrid items={motif.variantes} motifId={motif.id} onUpdated={onUploaded} />
              </div>
            )}

            {motif.shooting_pngs && motif.shooting_pngs.length > 0 && (
              <div>
                <h4 style={{ fontFamily: "var(--font-sans)", fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--hub-foreground)", opacity: 0.6, margin: "0 0 12px 0" }}>
                  PNGs shooting ({motif.shooting_pngs.length})
                </h4>
                <PngGrid items={motif.shooting_pngs} motifId={motif.id} onUpdated={onUploaded} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function PngGrid({
  items,
  motifId,
  onUpdated,
}: {
  items: { file: string; label: string }[];
  motifId?: string;
  onUpdated?: () => Promise<void>;
}) {
  const [busyFile, setBusyFile] = useState<string | null>(null);

  const setHero = async (file: string) => {
    if (!motifId || !onUpdated) return;
    setBusyFile(file);
    try {
      const res = await fetch(`/api/da/motifs/${encodeURIComponent(motifId)}/set-hero`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ file }),
      }).then((r) => r.json());
      if (!res.ok) throw new Error(res.error || "Échec");
      await onUpdated();
    } catch (e) {
      alert(e instanceof Error ? e.message : String(e));
    } finally {
      setBusyFile(null);
    }
  };

  const canSetHero = !!(motifId && onUpdated);

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
        gap: 10,
      }}
    >
      {items.map((v) => (
        <div
          key={v.file}
          style={{
            background: "var(--hub-bg)",
            border: "0.5px solid var(--hub-border)",
            borderRadius: 10,
            padding: 8,
            textAlign: "center",
            position: "relative",
          }}
        >
          {canSetHero && (
            <button
              type="button"
              onClick={() => setHero(v.file)}
              disabled={busyFile !== null}
              title="Définir comme photo hero du motif"
              aria-label="Définir comme hero"
              style={{
                position: "absolute",
                top: 4,
                right: 4,
                width: 26,
                height: 26,
                borderRadius: 999,
                border: "0.5px solid var(--hub-border)",
                background: "white",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: busyFile ? "default" : "pointer",
                opacity: busyFile && busyFile !== v.file ? 0.4 : 1,
                padding: 0,
              }}
            >
              {busyFile === v.file ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <Star size={12} strokeWidth={1.6} />
              )}
            </button>
          )}
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
  );
}

function UploadForm({
  motifId,
  onCancel,
  onSuccess,
}: {
  motifId: string;
  onCancel: () => void;
  onSuccess: () => Promise<void> | void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [label, setLabel] = useState("");
  const [type, setType] = useState<"variante" | "shooting">("variante");
  const [tags, setTags] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !label.trim()) {
      setErr("Fichier et libellé requis");
      return;
    }
    setSubmitting(true);
    setErr(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("label", label.trim());
      fd.append("type", type);
      if (tags.trim()) fd.append("tags", tags.trim());
      const res = await fetch(`/api/da/motifs/${encodeURIComponent(motifId)}/upload`, {
        method: "POST",
        body: fd,
      }).then((r) => r.json());
      if (!res.ok) throw new Error(res.error || "Échec upload");
      await onSuccess();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setSubmitting(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "8px 10px",
    border: "0.5px solid var(--hub-border)",
    borderRadius: 8,
    fontFamily: "var(--font-sans)",
    fontSize: 13,
    background: "white",
  };
  const labelStyle: React.CSSProperties = {
    fontFamily: "var(--font-sans)",
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: "0.05em",
    textTransform: "uppercase",
    opacity: 0.6,
    display: "block",
    marginBottom: 4,
  };

  return (
    <form
      onSubmit={submit}
      style={{
        background: "var(--hub-bg)",
        border: "0.5px solid var(--hub-border)",
        borderRadius: 12,
        padding: 16,
        marginBottom: 24,
        display: "grid",
        gap: 12,
      }}
    >
      <div>
        <label style={labelStyle}>Fichier PNG</label>
        <input
          type="file"
          accept="image/png"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          style={{ ...inputStyle, padding: "6px" }}
        />
      </div>
      <div>
        <label style={labelStyle}>Libellé</label>
        <input
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder='ex. "1976/1997 — Coline & Hugo"'
          style={inputStyle}
        />
      </div>
      <div>
        <label style={labelStyle}>Type</label>
        <div style={{ display: "flex", gap: 8 }}>
          {(["variante", "shooting"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setType(t)}
              style={{
                padding: "8px 14px",
                borderRadius: 999,
                border: "0.5px solid var(--hub-border)",
                background: type === t ? "var(--hub-foreground)" : "white",
                color: type === t ? "var(--hub-bg)" : "var(--hub-foreground)",
                fontFamily: "var(--font-sans)",
                fontSize: 12,
                cursor: "pointer",
              }}
            >
              {t === "variante" ? "Variante client" : "PNG shooting interne"}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label style={labelStyle}>Tags (optionnel, virgules)</label>
        <input
          type="text"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          placeholder='ex. "couple,annee"'
          style={inputStyle}
        />
      </div>
      {err && (
        <div style={{ fontFamily: "var(--font-sans)", fontSize: 12, color: "#a13a16" }}>{err}</div>
      )}
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <button
          type="button"
          onClick={onCancel}
          disabled={submitting}
          style={{
            padding: "8px 16px",
            borderRadius: 999,
            border: "0.5px solid var(--hub-border)",
            background: "white",
            fontFamily: "var(--font-sans)",
            fontSize: 12,
            cursor: "pointer",
          }}
        >
          Annuler
        </button>
        <button
          type="submit"
          disabled={submitting}
          style={{
            padding: "8px 16px",
            borderRadius: 999,
            border: "none",
            background: "var(--hub-foreground)",
            color: "var(--hub-bg)",
            fontFamily: "var(--font-sans)",
            fontSize: 12,
            fontWeight: 500,
            cursor: submitting ? "default" : "pointer",
            opacity: submitting ? 0.5 : 1,
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          {submitting ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
          {submitting ? "Upload..." : "Ajouter"}
        </button>
      </div>
    </form>
  );
}
