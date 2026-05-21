/**
 * VarianteSelector — section "Variante du motif" sur la fiche incarnation.
 *
 * Affiche les variantes existantes du motif lié + permet :
 *  - sélectionner une variante existante (devient `variante_file` de l'incarnation)
 *  - uploader une nouvelle variante PNG (passe par
 *    POST /api/da/motifs/[id]/upload type=variante puis re-fetch)
 *
 * Variante actuellement sélectionnée mise en évidence avec bordure foncée.
 */
"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Loader2, Upload, X } from "lucide-react";

import {
  fetchMotifVariantes,
  uploadMotifVariante,
  type MotifVariantesResponse,
} from "@/lib/incarnations/api-client";

interface VarianteSelectorProps {
  motifId: string;
  motifNom: string;
  /** Le `variante_file` actuellement sélectionné sur l'incarnation. */
  currentFile: string | null;
  /** Label par défaut suggéré pour un upload (typiquement le nom de l'incarnation). */
  suggestedLabel: string;
  onSelect: (file: string | null) => Promise<void>;
  disabled?: boolean;
}

const PUBLIC_MOTIFS_BASE = "/motifs";

export function VarianteSelector({
  motifId,
  motifNom,
  currentFile,
  suggestedLabel,
  onSelect,
  disabled = false,
}: VarianteSelectorProps) {
  const [data, setData] = useState<MotifVariantesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadLabel, setUploadLabel] = useState(suggestedLabel);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [selecting, setSelecting] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await fetchMotifVariantes(motifId);
      setData(r);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setUploadLabel(suggestedLabel);
  }, [suggestedLabel]);

  useEffect(() => {
    if (!motifId) {
      setData(null);
      setLoading(false);
      return;
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [motifId]);

  const handleSelect = async (file: string | null) => {
    if (selecting) return;
    setSelecting(file ?? "__clear__");
    try {
      await onSelect(file);
    } finally {
      setSelecting(null);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile || !uploadLabel.trim()) return;
    setUploading(true);
    setError(null);
    try {
      const result = await uploadMotifVariante(motifId, {
        file: uploadFile,
        label: uploadLabel.trim(),
      });
      if (!result.ok || !result.data) {
        throw new Error(result.error ?? "Échec upload");
      }
      // Lie automatiquement la variante uploadée à l'incarnation
      await onSelect(result.data.file);
      setUploadFile(null);
      setUploadOpen(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur upload");
    } finally {
      setUploading(false);
    }
  };

  if (!motifId) {
    return (
      <p
        style={{
          fontFamily: "var(--font-sans)",
          fontSize: 12,
          color: "var(--hub-foreground)",
          opacity: 0.55,
          margin: 0,
        }}
      >
        Sélectionne d&apos;abord un motif pour pouvoir lui associer une variante.
      </p>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <p
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 12,
            color: "var(--hub-foreground)",
            opacity: 0.65,
            margin: 0,
          }}
        >
          Variantes existantes de <strong>{motifNom}</strong>
          {data ? ` (${data.variantes.length})` : ""}
          {currentFile && (
            <span style={{ color: "#365D40", marginLeft: 6 }}>
              · liée : <code style={codeInline}>{currentFile}</code>
            </span>
          )}
        </p>
        <div style={{ display: "flex", gap: 8 }}>
          {currentFile && (
            <button
              type="button"
              onClick={() => handleSelect(null)}
              disabled={disabled || selecting !== null}
              style={ghostButton}
            >
              <X size={12} /> Délier
            </button>
          )}
          <button
            type="button"
            onClick={() => setUploadOpen((v) => !v)}
            disabled={disabled}
            style={uploadOpen ? primaryButton : ghostButton}
          >
            <Upload size={12} /> {uploadOpen ? "Annuler" : "Uploader une variante"}
          </button>
        </div>
      </div>

      {error && (
        <div
          style={{
            padding: 10,
            border: "1px solid #E2A8A2",
            borderRadius: 8,
            background: "#FAEBE8",
            color: "#7C2A24",
            fontFamily: "var(--font-sans)",
            fontSize: 12,
          }}
        >
          {error}
        </div>
      )}

      {uploadOpen && (
        <form
          onSubmit={handleUpload}
          style={{
            background: "var(--hub-bg)",
            border: "1px dashed var(--hub-border)",
            borderRadius: 10,
            padding: 16,
            display: "grid",
            gridTemplateColumns: "1fr 1fr auto",
            gap: 12,
            alignItems: "end",
          }}
        >
          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={labelStyle}>Libellé de la variante</span>
            <input
              type="text"
              value={uploadLabel}
              onChange={(e) => setUploadLabel(e.target.value)}
              placeholder={suggestedLabel || "CONNASSE CLUB"}
              required
              style={inputStyle}
            />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={labelStyle}>Fichier PNG (max 5 Mo)</span>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png"
              onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
              required
              style={{
                ...inputStyle,
                padding: "6px 10px",
                cursor: "pointer",
              }}
            />
          </label>
          <button
            type="submit"
            disabled={uploading || !uploadFile || !uploadLabel.trim()}
            style={{
              ...primaryButton,
              padding: "10px 18px",
              opacity: uploading || !uploadFile || !uploadLabel.trim() ? 0.5 : 1,
              cursor: uploading ? "not-allowed" : "pointer",
            }}
          >
            {uploading ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
            {uploading ? "Upload…" : "Uploader + lier"}
          </button>
        </form>
      )}

      {loading ? (
        <div style={{ padding: 24, textAlign: "center" }}>
          <Loader2 size={18} className="animate-spin" />
        </div>
      ) : !data || data.variantes.length === 0 ? (
        <div
          style={{
            padding: 24,
            border: "1px dashed var(--hub-border)",
            borderRadius: 10,
            textAlign: "center",
            fontFamily: "var(--font-sans)",
            fontSize: 12,
            color: "var(--hub-foreground)",
            opacity: 0.6,
          }}
        >
          Aucune variante encore pour {motifNom}. Uploade la première via le bouton ci-dessus.
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
            gap: 10,
          }}
        >
          {data.variantes.map((v) => {
            const isSelected = currentFile === v.file;
            const isBusy = selecting === v.file;
            return (
              <button
                key={v.file}
                type="button"
                onClick={() => handleSelect(v.file)}
                disabled={disabled || selecting !== null}
                style={{
                  background: "white",
                  border: isSelected
                    ? "1.5px solid var(--hub-foreground)"
                    : "0.5px solid var(--hub-border)",
                  borderRadius: 10,
                  padding: 8,
                  cursor: disabled ? "not-allowed" : "pointer",
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                  position: "relative",
                  textAlign: "left",
                  opacity: isBusy ? 0.6 : 1,
                  transition: "border-color 150ms ease, transform 150ms ease",
                }}
                className="variante-tile"
              >
                <div
                  style={{
                    aspectRatio: "1 / 1",
                    background: "var(--hub-bg)",
                    borderRadius: 6,
                    overflow: "hidden",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`${PUBLIC_MOTIFS_BASE}/${encodeURIComponent(v.file)}`}
                    alt={v.label}
                    loading="lazy"
                    style={{
                      maxWidth: "100%",
                      maxHeight: "100%",
                      objectFit: "contain",
                    }}
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.opacity = "0.2";
                    }}
                  />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <span
                    style={{
                      fontFamily: "var(--font-sans)",
                      fontSize: 11,
                      fontWeight: 600,
                      color: "var(--hub-foreground)",
                      lineHeight: 1.2,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                    title={v.label}
                  >
                    {v.label}
                  </span>
                  <span
                    style={{
                      fontFamily: "var(--font-sans)",
                      fontSize: 9,
                      color: "var(--hub-foreground)",
                      opacity: 0.5,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {v.file}
                  </span>
                </div>
                {isSelected && (
                  <span
                    style={{
                      position: "absolute",
                      top: 6,
                      right: 6,
                      width: 22,
                      height: 22,
                      borderRadius: 999,
                      background: "var(--hub-foreground)",
                      color: "var(--hub-bg)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Check size={12} strokeWidth={2.4} />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  fontFamily: "var(--font-sans)",
  fontSize: 10,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "var(--hub-foreground)",
  opacity: 0.6,
  fontWeight: 600,
};

const inputStyle: React.CSSProperties = {
  background: "white",
  border: "0.5px solid var(--hub-border)",
  borderRadius: 8,
  padding: "8px 12px",
  fontFamily: "var(--font-sans)",
  fontSize: 13,
  color: "var(--hub-foreground)",
  outline: "none",
};

const ghostButton: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  background: "white",
  border: "0.5px solid var(--hub-border)",
  borderRadius: 9999,
  padding: "6px 12px",
  fontFamily: "var(--font-sans)",
  fontSize: 11,
  color: "var(--hub-foreground)",
  cursor: "pointer",
};

const primaryButton: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  background: "var(--color-brand-rose, #A76059)",
  color: "white",
  border: "none",
  borderRadius: 9999,
  padding: "6px 14px",
  fontFamily: "var(--font-sans)",
  fontSize: 11,
  fontWeight: 500,
  cursor: "pointer",
};

const codeInline: React.CSSProperties = {
  fontFamily: "ui-monospace, SFMono-Regular, monospace",
  fontSize: 11,
  background: "var(--hub-bg)",
  padding: "1px 6px",
  borderRadius: 4,
};
