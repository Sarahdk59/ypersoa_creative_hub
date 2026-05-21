/**
 * XlsxImporter — drop XLSX + aperçu + apply.
 */
"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Check, FileSpreadsheet, Loader2, UploadCloud } from "lucide-react";

import { applyImportXlsx, previewXlsx } from "@/lib/incarnations/api-client";
import type { ImportApplyResult, ImportRow } from "@/lib/incarnations/store";
import { STATUT_LABELS } from "@/types/incarnations";

interface PreviewState {
  rows: ImportRow[];
  errors: string[];
  sheetUsed: string | null;
  totalRows: number;
}

interface XlsxImporterProps {
  onApplied?: (result: ImportApplyResult) => void;
}

export function XlsxImporter({ onApplied }: XlsxImporterProps) {
  const [filename, setFilename] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<PreviewState | null>(null);
  const [excluded, setExcluded] = useState<Set<number>>(new Set());
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState<ImportApplyResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback(async (files: File[]) => {
    const file = files[0];
    if (!file) return;
    setFilename(file.name);
    setLoading(true);
    setError(null);
    setApplied(null);
    setPreview(null);
    setExcluded(new Set());
    try {
      const result = await previewXlsx(file);
      setPreview(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur de lecture du fichier");
    } finally {
      setLoading(false);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
      "application/vnd.ms-excel": [".xls"],
    },
    multiple: false,
  });

  const toggleExcluded = (idx: number) => {
    setExcluded((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const submit = async () => {
    if (!preview) return;
    const rows = preview.rows.filter((_, i) => !excluded.has(i));
    setApplying(true);
    setError(null);
    try {
      const result = await applyImportXlsx(rows);
      setApplied(result);
      onApplied?.(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur d'import");
    } finally {
      setApplying(false);
    }
  };

  const counts = preview
    ? {
        total: preview.rows.length,
        create: preview.rows.filter((r) => r.action === "create").length,
        update: preview.rows.filter((r) => r.action === "update").length,
        skip: preview.rows.filter((r) => r.action === "skip").length,
      }
    : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Dropzone */}
      <div
        {...getRootProps()}
        style={{
          border: `2px dashed ${isDragActive ? "var(--color-brand-rose, #A76059)" : "var(--hub-border)"}`,
          borderRadius: 16,
          padding: 40,
          textAlign: "center",
          background: isDragActive ? "rgba(167,96,89,0.06)" : "white",
          cursor: "pointer",
        }}
      >
        <input {...getInputProps()} />
        <UploadCloud
          size={32}
          strokeWidth={1.4}
          style={{ color: "var(--hub-foreground)", opacity: 0.6, marginBottom: 8 }}
        />
        <p style={{ fontFamily: "var(--font-editorial)", fontSize: 20, margin: 0 }}>
          {filename ? filename : "Glisse ton fichier XLSX ici"}
        </p>
        <p
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 12,
            color: "var(--hub-foreground)",
            opacity: 0.6,
            marginTop: 4,
          }}
        >
          Feuille INCARNATIONS lue · colonnes : code, nom_commercial, motif_ypm, mot_haut, mot_bas,
          symbole, couleur_fil_defaut, gabarits_cibles, collections_cibles, ton, statut
        </p>
      </div>

      {loading && (
        <div style={{ padding: 20, textAlign: "center" }}>
          <Loader2 size={20} className="animate-spin" />
        </div>
      )}

      {error && (
        <div
          style={{
            padding: 12,
            border: "1px solid #E2A8A2",
            borderRadius: 8,
            background: "#FAEBE8",
            color: "#7C2A24",
            fontFamily: "var(--font-sans)",
            fontSize: 13,
          }}
        >
          {error}
        </div>
      )}

      {applied && (
        <div
          style={{
            padding: 16,
            border: "0.5px solid var(--hub-border)",
            borderLeft: "3px solid #365D40",
            borderRadius: 8,
            background: "white",
            fontFamily: "var(--font-sans)",
            fontSize: 13,
            display: "flex",
            flexDirection: "column",
            gap: 6,
          }}
        >
          <span style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 600 }}>
            <Check size={14} color="#365D40" /> Import terminé
          </span>
          <span>
            {applied.created} créée{applied.created > 1 ? "s" : ""} · {applied.updated} mise
            {applied.updated > 1 ? "s" : ""} à jour · {applied.skipped} ignorée
            {applied.skipped > 1 ? "s" : ""}
          </span>
          {applied.errors.length > 0 && (
            <ul style={{ margin: 0, paddingLeft: 16, color: "#7C2A24" }}>
              {applied.errors.map((e, i) => (
                <li key={i}>
                  {e.code} — {e.message}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {preview && counts && !applied && (
        <>
          <div
            style={{
              padding: 12,
              background: "white",
              border: "0.5px solid var(--hub-border)",
              borderRadius: 8,
              fontFamily: "var(--font-sans)",
              fontSize: 12,
              display: "flex",
              flexWrap: "wrap",
              gap: 12,
              alignItems: "center",
            }}
          >
            <FileSpreadsheet size={14} strokeWidth={1.6} />
            <span>
              Feuille lue : <strong>{preview.sheetUsed ?? "—"}</strong> ({preview.totalRows} ligne
              {preview.totalRows > 1 ? "s" : ""})
            </span>
            <span style={pillCount("create")}>+{counts.create} nouvelles</span>
            <span style={pillCount("update")}>{counts.update} à mettre à jour</span>
            <span style={pillCount("skip")}>{counts.skip} ignorées</span>
          </div>

          {preview.errors.length > 0 && (
            <div
              style={{
                padding: 10,
                background: "#FAEBE8",
                borderRadius: 8,
                fontFamily: "var(--font-sans)",
                fontSize: 12,
                color: "#7C2A24",
              }}
            >
              {preview.errors.map((e, i) => (
                <div key={i}>{e}</div>
              ))}
            </div>
          )}

          {/* Tableau des lignes */}
          <div style={{ overflow: "auto", border: "0.5px solid var(--hub-border)", borderRadius: 8 }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontFamily: "var(--font-sans)",
                fontSize: 12,
                background: "white",
              }}
            >
              <thead>
                <tr style={{ background: "var(--hub-bg)" }}>
                  <th style={thStyle}>Inclure</th>
                  <th style={thStyle}>Action</th>
                  <th style={thStyle}>Code</th>
                  <th style={thStyle}>Nom commercial</th>
                  <th style={thStyle}>Motif</th>
                  <th style={thStyle}>Mots</th>
                  <th style={thStyle}>Gabarits</th>
                  <th style={thStyle}>Statut</th>
                  <th style={thStyle}>Erreurs</th>
                </tr>
              </thead>
              <tbody>
                {preview.rows.map((r, i) => {
                  const isExcluded = excluded.has(i);
                  return (
                    <tr
                      key={`${r.code}-${i}`}
                      style={{
                        borderTop: "0.5px solid var(--hub-border)",
                        opacity: isExcluded ? 0.45 : 1,
                      }}
                    >
                      <td style={tdStyle}>
                        <input
                          type="checkbox"
                          checked={!isExcluded}
                          onChange={() => toggleExcluded(i)}
                        />
                      </td>
                      <td style={tdStyle}>
                        <span style={pillAction(r.action)}>{actionLabel(r.action)}</span>
                      </td>
                      <td style={tdStyle}>{r.code || "—"}</td>
                      <td style={tdStyle}>{r.nom_commercial || "—"}</td>
                      <td style={tdStyle}>{r.motif_ypm || "—"}</td>
                      <td style={tdStyle}>
                        {r.spec_broderie.mot_haut} / {r.spec_broderie.mot_bas}
                      </td>
                      <td style={tdStyle}>{r.gabarits_cibles.join(", ") || "—"}</td>
                      <td style={tdStyle}>{STATUT_LABELS[r.statut]}</td>
                      <td style={{ ...tdStyle, color: "#7C2A24" }}>
                        {r.errors?.join(", ") ?? ""}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
            <button
              type="button"
              onClick={submit}
              disabled={applying || preview.rows.length === 0}
              style={{
                background: "var(--color-brand-rose, #A76059)",
                color: "white",
                border: "none",
                borderRadius: 9999,
                padding: "10px 24px",
                fontFamily: "var(--font-sans)",
                fontSize: 13,
                fontWeight: 500,
                letterSpacing: "0.04em",
                cursor: applying ? "not-allowed" : "pointer",
                opacity: applying ? 0.6 : 1,
              }}
            >
              {applying
                ? "Import en cours…"
                : `Importer ${preview.rows.length - excluded.size} ligne${preview.rows.length - excluded.size > 1 ? "s" : ""}`}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

const thStyle: React.CSSProperties = {
  padding: "8px 10px",
  textAlign: "left",
  fontFamily: "var(--font-sans)",
  fontSize: 10,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "var(--hub-foreground)",
  opacity: 0.7,
  fontWeight: 600,
};

const tdStyle: React.CSSProperties = {
  padding: "8px 10px",
  fontFamily: "var(--font-sans)",
  fontSize: 12,
  color: "var(--hub-foreground)",
};

function pillCount(kind: "create" | "update" | "skip"): React.CSSProperties {
  const map = {
    create: { bg: "#D7E5DA", fg: "#365D40" },
    update: { bg: "#D7E5F0", fg: "#2E4D6E" },
    skip: { bg: "#E8E1D6", fg: "#5A5A5A" },
  } as const;
  const c = map[kind];
  return {
    padding: "3px 10px",
    borderRadius: 999,
    background: c.bg,
    color: c.fg,
    fontWeight: 600,
    fontSize: 11,
    letterSpacing: "0.04em",
  };
}

function pillAction(action: "create" | "update" | "skip"): React.CSSProperties {
  return { ...pillCount(action), fontSize: 10 };
}

function actionLabel(action: "create" | "update" | "skip") {
  if (action === "create") return "Nouvelle";
  if (action === "update") return "MAJ";
  return "Ignorée";
}
