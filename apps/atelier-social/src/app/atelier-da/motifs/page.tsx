"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { ArrowLeft, BookOpen, Loader2, Camera, Pencil, X, Plus, Star, Sparkles, Download, FileBox, LayoutGrid, Table } from "lucide-react";
import type { MotifBible, MotifYpm, MotifProdFile } from "@/lib/atelier-da/referentiels-loader";

interface MotifsBundle {
  motifs: { motifs: MotifYpm[]; _meta: { nb_motifs: number; nb_variantes_total: number } };
}

const SHOOTING_URL = process.env.NEXT_PUBLIC_SHOOTING_URL || "http://localhost:3001";

export default function MotifsPage() {
  const [data, setData] = useState<MotifsBundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<MotifYpm | null>(null);
  const [view, setView] = useState<"grid" | "bibles">("grid");

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

      <header style={{ marginBottom: 32, display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
        <div>
          <h1 style={{ fontFamily: "var(--font-editorial)", fontSize: 36, fontWeight: 500, margin: 0, marginBottom: 8 }}>
            Référentiel motifs YPM
          </h1>
          <p style={{ fontFamily: "var(--font-sans)", fontSize: 13, color: "var(--hub-foreground)", opacity: 0.65, maxWidth: 720 }}>
            {data.motifs._meta.nb_motifs} motifs commerciaux · {data.motifs._meta.nb_variantes_total} variantes (mots brodés alternatifs sur le même design). Click sur un motif pour voir ses variantes et l&apos;utiliser dans Shooting Book.
          </p>
        </div>
        <div style={{ display: "flex", gap: 4, padding: 4, background: "var(--hub-bg)", borderRadius: 999, border: "0.5px solid var(--hub-border)", flexShrink: 0 }}>
          <button
            type="button"
            onClick={() => setView("grid")}
            style={viewToggleStyle(view === "grid")}
            title="Galerie visuelle"
          >
            <LayoutGrid size={13} /> Galerie
          </button>
          <button
            type="button"
            onClick={() => setView("bibles")}
            style={viewToggleStyle(view === "bibles")}
            title="Comparaison des bibles techniques"
          >
            <Table size={13} /> Bibles
          </button>
        </div>
      </header>

      {view === "bibles" ? (
        <BiblesTableView motifs={data.motifs.motifs} onSelect={setSelected} />
      ) : (
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
      )}

      {selected && <MotifModal motif={selected} onClose={() => setSelected(null)} onUploaded={refresh} />}
    </div>
  );
}

function viewToggleStyle(active: boolean): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 5,
    padding: "6px 12px",
    borderRadius: 999,
    background: active ? "var(--hub-foreground)" : "transparent",
    color: active ? "var(--hub-bg)" : "var(--hub-foreground)",
    border: "none",
    fontFamily: "var(--font-sans)",
    fontSize: 11,
    fontWeight: 500,
    cursor: "pointer",
    transition: "background 150ms ease",
  };
}

function BiblesTableView({
  motifs,
  onSelect,
}: {
  motifs: MotifYpm[];
  onSelect: (m: MotifYpm) => void;
}) {
  return (
    <div style={{ overflowX: "auto", border: "0.5px solid var(--hub-border)", borderRadius: 12, background: "white" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "var(--font-sans)", fontSize: 12 }}>
        <thead>
          <tr style={{ background: "var(--hub-bg)", textAlign: "left" }}>
            <th style={thStyle}>Motif</th>
            <th style={thStyle}>Composition</th>
            <th style={thStyle}>Dim. (cm)</th>
            <th style={{ ...thStyle, textAlign: "center" }}>Coul.</th>
            <th style={thStyle}>Règles</th>
            <th style={thStyle}>Notes prod</th>
            <th style={{ ...thStyle, textAlign: "center" }}>Var.</th>
            <th style={{ ...thStyle, textAlign: "center" }}>Prod</th>
            <th style={{ ...thStyle, textAlign: "right" }}></th>
          </tr>
        </thead>
        <tbody>
          {motifs.map((m, i) => {
            const b = m.bible ?? {};
            const dims = b.dimensions_cm ? `${b.dimensions_cm.largeur} × ${b.dimensions_cm.hauteur}` : "—";
            const prodCount = (m.prod_files ?? []).length;
            return (
              <tr key={m.id} style={{ borderTop: i === 0 ? "none" : "0.5px solid var(--hub-border)" }}>
                <td style={tdStyle}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`/motifs/${encodeURIComponent(m.asset_principal)}`}
                      alt={m.nom_commercial}
                      style={{ width: 36, height: 36, objectFit: "contain", background: "var(--hub-bg)", borderRadius: 6, padding: 3, flexShrink: 0 }}
                      onError={(e) => ((e.target as HTMLImageElement).style.opacity = "0.2")}
                    />
                    <div>
                      <div style={{ fontFamily: "var(--font-editorial)", fontSize: 14, fontWeight: 500 }}>{m.nom_commercial}</div>
                      <div style={{ fontSize: 10, opacity: 0.55 }}><code>{m.id}</code></div>
                    </div>
                  </div>
                </td>
                <td style={tdStyle}>{b.composition || <em style={mutedStyle}>—</em>}</td>
                <td style={tdStyle}>{dims}</td>
                <td style={{ ...tdStyle, textAlign: "center" }}>{b.nb_couleurs_max ?? <em style={mutedStyle}>—</em>}</td>
                <td style={{ ...tdStyle, whiteSpace: "pre-wrap", maxWidth: 280 }}>
                  {b.regles_validation || <em style={mutedStyle}>—</em>}
                </td>
                <td style={{ ...tdStyle, whiteSpace: "pre-wrap", maxWidth: 220 }}>
                  {b.notes_prod || <em style={mutedStyle}>—</em>}
                </td>
                <td style={{ ...tdStyle, textAlign: "center", opacity: 0.7 }}>{m.nb_variantes}</td>
                <td style={{ ...tdStyle, textAlign: "center", opacity: 0.7 }}>{prodCount}</td>
                <td style={{ ...tdStyle, textAlign: "right" }}>
                  <button
                    type="button"
                    onClick={() => onSelect(m)}
                    style={{
                      display: "inline-flex", alignItems: "center", gap: 4,
                      padding: "5px 10px", borderRadius: 999,
                      background: "white", border: "0.5px solid var(--hub-border)",
                      fontFamily: "var(--font-sans)", fontSize: 11, cursor: "pointer",
                      color: "var(--hub-foreground)",
                    }}
                  >
                    <Pencil size={11} /> Éditer
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

const thStyle: React.CSSProperties = {
  padding: "10px 12px",
  fontSize: 10,
  fontWeight: 600,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  opacity: 0.6,
};
const tdStyle: React.CSSProperties = {
  padding: "12px",
  verticalAlign: "top",
  lineHeight: 1.45,
};
const mutedStyle: React.CSSProperties = {
  opacity: 0.4,
  fontStyle: "italic",
};

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
              <a
                href={`${SHOOTING_URL}/?motif=${encodeURIComponent(motif.id)}&png=${encodeURIComponent(motif.asset_principal)}`}
                target="_blank"
                rel="noopener noreferrer"
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
                <Sparkles size={13} /> Utiliser dans Atelier Shooting
              </a>
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

            <BibleSection motif={motif} onUpdated={onUploaded} />

            {motif.variantes.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <h4 style={{ fontFamily: "var(--font-sans)", fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--hub-foreground)", opacity: 0.6, margin: "0 0 12px 0" }}>
                  Variantes ({motif.variantes.length})
                </h4>
                <PngGrid items={motif.variantes} motifId={motif.id} onUpdated={onUploaded} />
              </div>
            )}

            {motif.shooting_pngs && motif.shooting_pngs.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <h4 style={{ fontFamily: "var(--font-sans)", fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--hub-foreground)", opacity: 0.6, margin: "0 0 12px 0" }}>
                  PNGs shooting ({motif.shooting_pngs.length})
                </h4>
                <PngGrid items={motif.shooting_pngs} motifId={motif.id} onUpdated={onUploaded} />
              </div>
            )}

            <ProdFilesSection motif={motif} onUpdated={onUploaded} />
          </div>
        </div>
      </div>
    </div>
  );
}

function ProdFilesSection({ motif, onUpdated }: { motif: MotifYpm; onUpdated: () => Promise<void> }) {
  const files = motif.prod_files ?? [];
  const total = files.length;
  const complete = files.filter((f) => f.pxf && f.dst).length;

  return (
    <div>
      <h4 style={{ fontFamily: "var(--font-sans)", fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--hub-foreground)", opacity: 0.6, margin: "0 0 12px 0", display: "flex", alignItems: "center", gap: 6 }}>
        <FileBox size={12} /> Fichiers prod ({total})
        {total > 0 && (
          <span style={{ fontSize: 10, opacity: 0.7, fontWeight: 400, letterSpacing: 0, textTransform: "none" }}>
            · {complete} complet{complete > 1 ? "s" : ""} (PXF + DST)
          </span>
        )}
      </h4>

      {total === 0 ? (
        <p style={{ fontFamily: "var(--font-sans)", fontSize: 12, opacity: 0.55, fontStyle: "italic", margin: 0, padding: "12px 0" }}>
          Aucun fichier PXF/DST. Glisse-dépose tes fichiers dans <code style={{ fontSize: 11 }}>assets/motifs pxf/</code> et <code style={{ fontSize: 11 }}>assets/motifs dst/</code> avec la convention <code style={{ fontSize: 11 }}>{motif.id}-&lt;key&gt;.PXF</code>.
        </p>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(5, 1fr)",
            gap: 10,
          }}
        >
          {files.map((f) => (
            <ProdFileCard key={f.key} motifId={motif.id} file={f} onUpdated={onUpdated} />
          ))}
        </div>
      )}
    </div>
  );
}

function ProdFileCard({
  motifId,
  file,
  onUpdated,
}: {
  motifId: string;
  file: MotifProdFile;
  onUpdated: () => Promise<void>;
}) {
  const [promoting, setPromoting] = useState(false);
  const isComplete = !!(file.pxf && file.dst);
  const downloadUrl = (type: "pxf" | "dst") =>
    `/api/da/motifs/${encodeURIComponent(motifId)}/prod-file?type=${type}&key=${encodeURIComponent(file.key)}`;
  const previewUrl = file.png
    ? `/api/da/motifs/${encodeURIComponent(motifId)}/preview?key=${encodeURIComponent(file.key)}`
    : null;

  const promote = async () => {
    if (!file.png || promoting) return;
    setPromoting(true);
    try {
      const res = await fetch(`/api/da/motifs/${encodeURIComponent(motifId)}/promote-prod-png`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: file.key }),
      }).then((r) => r.json());
      if (!res.ok) throw new Error(res.error || "Échec");
      await onUpdated();
    } catch (e) {
      alert(e instanceof Error ? e.message : String(e));
    } finally {
      setPromoting(false);
    }
  };

  const isShortKey = /^[A-Za-z0-9]$/.test(file.key);

  return (
    <div
      className="prod-card"
      style={{
        background: "var(--hub-bg)",
        border: "0.5px solid var(--hub-border)",
        borderRadius: 10,
        padding: 6,
        display: "flex",
        flexDirection: "column",
        gap: 6,
        position: "relative",
      }}
    >
      <div
        style={{
          position: "relative",
          aspectRatio: "1/1",
          background: "white",
          borderRadius: 6,
          overflow: "hidden",
        }}
      >
        {previewUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={previewUrl}
            alt={`${motifId} ${file.key}`}
            style={{ width: "100%", height: "100%", objectFit: "contain", padding: 6, boxSizing: "border-box" }}
            onError={(e) => ((e.target as HTMLImageElement).style.opacity = "0.2")}
          />
        ) : (
          <div
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: "var(--font-editorial)",
              fontSize: isShortKey ? 28 : 13,
              fontWeight: 500,
              color: "var(--hub-foreground)",
              opacity: 0.55,
              textAlign: "center",
              padding: 6,
              lineHeight: 1.2,
              boxSizing: "border-box",
            }}
          >
            {file.key}
          </div>
        )}

        {file.png && (
          <button
            type="button"
            onClick={promote}
            disabled={promoting}
            title="Mettre en variante hero du motif"
            aria-label="Définir comme hero"
            style={{
              position: "absolute",
              top: 4,
              right: 4,
              width: 22,
              height: 22,
              borderRadius: 999,
              border: "0.5px solid var(--hub-border)",
              background: "rgba(255,255,255,0.92)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: promoting ? "default" : "pointer",
              padding: 0,
              backdropFilter: "blur(4px)",
            }}
          >
            {promoting ? <Loader2 size={10} className="animate-spin" /> : <Star size={10} strokeWidth={1.6} />}
          </button>
        )}

        {file.png && (
          <div
            className="prod-card-actions"
            style={{
              position: "absolute",
              bottom: 4,
              left: 4,
              right: 4,
              display: "flex",
              gap: 4,
              justifyContent: "center",
              opacity: 0,
              transition: "opacity 150ms ease",
              pointerEvents: "none",
            }}
          >
            <Link
              href={{ pathname: "/atelier-da/shooting-book", query: { motif: motifId, prodKey: file.key } }}
              title="Utiliser dans Shooting Book"
              aria-label="Shooting Book"
              style={prodIconBtnStyle}
            >
              <Camera size={11} />
            </Link>
            <a
              href={`${SHOOTING_URL}/?motif=${encodeURIComponent(motifId)}&prodKey=${encodeURIComponent(file.key)}&png=${encodeURIComponent(file.png)}`}
              target="_blank"
              rel="noopener noreferrer"
              title="Utiliser dans Atelier Shooting"
              aria-label="Atelier Shooting"
              style={prodIconBtnStyle}
            >
              <Sparkles size={11} />
            </a>
          </div>
        )}
      </div>

      {!isShortKey && (
        <div
          title={file.key}
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 10,
            fontWeight: 600,
            opacity: 0.7,
            letterSpacing: "0.03em",
            textAlign: "center",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            padding: "0 4px",
          }}
        >
          {file.key}
        </div>
      )}

      <div style={{ display: "flex", gap: 3 }}>
        <ProdFileButton
          label="PXF"
          present={!!file.pxf}
          href={file.pxf ? downloadUrl("pxf") : null}
          downloadName={file.pxf ?? undefined}
        />
        <ProdFileButton
          label="DST"
          present={!!file.dst}
          href={file.dst ? downloadUrl("dst") : null}
          downloadName={file.dst ?? undefined}
        />
      </div>
    </div>
  );
}

const prodIconBtnStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: 24,
  height: 24,
  borderRadius: 999,
  background: "rgba(255,255,255,0.95)",
  border: "0.5px solid var(--hub-border)",
  color: "var(--hub-foreground)",
  textDecoration: "none",
  cursor: "pointer",
  pointerEvents: "auto",
  backdropFilter: "blur(4px)",
};

function ProdFileButton({
  label,
  present,
  href,
  downloadName,
}: {
  label: string;
  present: boolean;
  href: string | null;
  downloadName?: string;
}) {
  if (!present || !href) {
    return (
      <span
        title={`${label} manquant`}
        style={{
          flex: 1,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 3,
          padding: "4px 6px",
          borderRadius: 6,
          background: "transparent",
          border: "0.5px dashed #d4a574",
          fontFamily: "var(--font-sans)",
          fontSize: 9.5,
          fontWeight: 600,
          color: "#a8784e",
          letterSpacing: "0.05em",
          opacity: 0.75,
        }}
      >
        {label}
      </span>
    );
  }
  return (
    <a
      href={href}
      download={downloadName}
      style={{
        flex: 1,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 3,
        padding: "4px 6px",
        borderRadius: 6,
        background: "white",
        border: "0.5px solid var(--hub-border)",
        fontFamily: "var(--font-sans)",
        fontSize: 9.5,
        fontWeight: 600,
        color: "var(--hub-foreground)",
        textDecoration: "none",
        letterSpacing: "0.05em",
      }}
    >
      <Download size={10} /> {label}
    </a>
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
        gridTemplateColumns: "repeat(5, 1fr)",
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

function BibleSection({ motif, onUpdated }: { motif: MotifYpm; onUpdated: () => Promise<void> }) {
  const [editing, setEditing] = useState(false);
  const bible = motif.bible ?? {};
  const isEmpty = !bible.composition && !bible.dimensions_cm && !bible.nb_couleurs_max
    && !bible.regles_validation && !bible.notes_prod;

  if (editing) {
    return <BibleForm motif={motif} onCancel={() => setEditing(false)} onSaved={async () => { await onUpdated(); setEditing(false); }} />;
  }

  return (
    <div style={{ marginBottom: 20, padding: 16, background: "var(--hub-bg)", borderRadius: 12, border: "0.5px solid var(--hub-border)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <h4 style={{ fontFamily: "var(--font-sans)", fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--hub-foreground)", opacity: 0.7, margin: 0, display: "flex", alignItems: "center", gap: 6 }}>
          <BookOpen size={12} /> Bible technique
        </h4>
        <button
          type="button"
          onClick={() => setEditing(true)}
          style={{
            display: "inline-flex", alignItems: "center", gap: 4,
            padding: "4px 10px", borderRadius: 999,
            background: "white", border: "0.5px solid var(--hub-border)",
            fontFamily: "var(--font-sans)", fontSize: 11, cursor: "pointer",
            color: "var(--hub-foreground)",
          }}
        >
          <Pencil size={11} /> Éditer
        </button>
      </div>

      {isEmpty ? (
        <p style={{ fontFamily: "var(--font-sans)", fontSize: 12, opacity: 0.55, fontStyle: "italic", margin: 0 }}>
          Aucune règle de validation. Click <em>Éditer</em> pour cadrer le motif.
        </p>
      ) : (
        <dl style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "6px 12px", margin: 0, fontFamily: "var(--font-sans)", fontSize: 12 }}>
          {bible.composition && (<>
            <dt style={dtStyle}>Composition</dt>
            <dd style={ddStyle}>{bible.composition}</dd>
          </>)}
          {bible.dimensions_cm && (<>
            <dt style={dtStyle}>Dimensions</dt>
            <dd style={ddStyle}>{bible.dimensions_cm.largeur} cm × {bible.dimensions_cm.hauteur} cm</dd>
          </>)}
          {bible.nb_couleurs_max !== undefined && (<>
            <dt style={dtStyle}>Couleurs max</dt>
            <dd style={ddStyle}>{bible.nb_couleurs_max}</dd>
          </>)}
          {bible.regles_validation && (<>
            <dt style={dtStyle}>Règles</dt>
            <dd style={{ ...ddStyle, whiteSpace: "pre-wrap" }}>{bible.regles_validation}</dd>
          </>)}
          {bible.notes_prod && (<>
            <dt style={dtStyle}>Notes prod</dt>
            <dd style={{ ...ddStyle, whiteSpace: "pre-wrap" }}>{bible.notes_prod}</dd>
          </>)}
        </dl>
      )}
    </div>
  );
}

function BibleForm({ motif, onCancel, onSaved }: { motif: MotifYpm; onCancel: () => void; onSaved: () => Promise<void> }) {
  const b = motif.bible ?? {};
  const [composition, setComposition] = useState(b.composition ?? "");
  const [largeur, setLargeur] = useState<string>(b.dimensions_cm?.largeur != null ? String(b.dimensions_cm.largeur) : "");
  const [hauteur, setHauteur] = useState<string>(b.dimensions_cm?.hauteur != null ? String(b.dimensions_cm.hauteur) : "");
  const [nbCouleurs, setNbCouleurs] = useState<string>(b.nb_couleurs_max != null ? String(b.nb_couleurs_max) : "");
  const [regles, setRegles] = useState(b.regles_validation ?? "");
  const [notes, setNotes] = useState(b.notes_prod ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErr(null);
    try {
      const dims = (largeur && hauteur)
        ? { largeur: parseFloat(largeur), hauteur: parseFloat(hauteur) }
        : null;
      const body: Record<string, unknown> = {
        composition: composition.trim() || null,
        dimensions_cm: dims,
        nb_couleurs_max: nbCouleurs ? parseInt(nbCouleurs, 10) : null,
        regles_validation: regles.trim() || null,
        notes_prod: notes.trim() || null,
      };
      const res = await fetch(`/api/da/motifs/${encodeURIComponent(motif.id)}/bible`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }).then((r) => r.json());
      if (!res.ok) throw new Error(typeof res.error === "string" ? res.error : "Échec");
      await onSaved();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setSubmitting(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "8px 10px",
    border: "0.5px solid var(--hub-border)", borderRadius: 8,
    fontFamily: "var(--font-sans)", fontSize: 13, background: "white",
  };
  const labelStyle: React.CSSProperties = {
    fontFamily: "var(--font-sans)", fontSize: 11, fontWeight: 600,
    letterSpacing: "0.05em", textTransform: "uppercase", opacity: 0.6,
    display: "block", marginBottom: 4,
  };

  return (
    <form
      onSubmit={submit}
      style={{ marginBottom: 20, padding: 16, background: "var(--hub-bg)", borderRadius: 12, border: "0.5px solid var(--hub-border)", display: "grid", gap: 12 }}
    >
      <h4 style={{ fontFamily: "var(--font-sans)", fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--hub-foreground)", opacity: 0.7, margin: 0 }}>
        Bible technique — éditer
      </h4>
      <div>
        <label style={labelStyle}>Composition</label>
        <input type="text" value={composition} onChange={(e) => setComposition(e.target.value)} placeholder='ex. "Cœur + une initiale"' style={inputStyle} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
        <div>
          <label style={labelStyle}>Largeur (cm)</label>
          <input type="number" step="0.1" value={largeur} onChange={(e) => setLargeur(e.target.value)} placeholder="2.0" style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Hauteur (cm)</label>
          <input type="number" step="0.1" value={hauteur} onChange={(e) => setHauteur(e.target.value)} placeholder="4.5" style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Couleurs max</label>
          <input type="number" min="1" max="30" value={nbCouleurs} onChange={(e) => setNbCouleurs(e.target.value)} placeholder="1" style={inputStyle} />
        </div>
      </div>
      <div>
        <label style={labelStyle}>Règles de validation</label>
        <textarea value={regles} onChange={(e) => setRegles(e.target.value)} rows={3} style={{ ...inputStyle, resize: "vertical" }} placeholder="ex. 1 seule couleur de fil. Initiale en majuscule. Cœur centré." />
      </div>
      <div>
        <label style={labelStyle}>Notes prod (optionnel)</label>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} style={{ ...inputStyle, resize: "vertical" }} placeholder="ex. Vitesse machine standard. Support compatible : t-shirt, sweat." />
      </div>
      {err && <div style={{ color: "#a13a16", fontSize: 12, fontFamily: "var(--font-sans)" }}>{err}</div>}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
        <button type="button" onClick={onCancel} disabled={submitting} style={{
          padding: "8px 16px", borderRadius: 999, border: "0.5px solid var(--hub-border)",
          background: "white", fontFamily: "var(--font-sans)", fontSize: 12, cursor: "pointer",
        }}>Annuler</button>
        <button type="submit" disabled={submitting} style={{
          padding: "8px 16px", borderRadius: 999, border: "none",
          background: "var(--hub-foreground)", color: "var(--hub-bg)",
          fontFamily: "var(--font-sans)", fontSize: 12, fontWeight: 500,
          cursor: submitting ? "default" : "pointer", opacity: submitting ? 0.5 : 1,
          display: "inline-flex", alignItems: "center", gap: 6,
        }}>
          {submitting ? <Loader2 size={13} className="animate-spin" /> : null}
          Enregistrer
        </button>
      </div>
    </form>
  );
}

const dtStyle: React.CSSProperties = { fontWeight: 600, opacity: 0.55, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em", margin: 0, alignSelf: "start" };
const ddStyle: React.CSSProperties = { margin: 0, color: "var(--hub-foreground)" };
