/**
 * ShopifyExportModal — modale de génération du JSON metafield Shopify.
 *
 * Appelle POST /api/da/exports/metafield-incarnations pour un motif donné,
 * affiche le JSON résultant, propose copy + download.
 */
"use client";

import { useEffect, useState } from "react";
import { Check, Copy, Download, Loader2, X } from "lucide-react";

interface ShopifyExportModalProps {
  motifYpm: string;
  motifNom: string;
  onClose: () => void;
}

export function ShopifyExportModal({ motifYpm, motifNom, onClose }: ShopifyExportModalProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [json, setJson] = useState<string>("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch("/api/da/exports/metafield-incarnations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ motif_ypm: motifYpm }),
    })
      .then(async (r) => {
        if (!r.ok) throw new Error(`export ${r.status}`);
        const data = await r.json();
        setJson(JSON.stringify(data, null, 2));
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Erreur"))
      .finally(() => setLoading(false));
  }, [motifYpm]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(json);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* noop */
    }
  };

  const download = () => {
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `metafield-incarnations-${motifYpm}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(30, 45, 74, 0.55)",
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          background: "var(--hub-bg)",
          borderRadius: 16,
          width: "100%",
          maxWidth: 900,
          maxHeight: "85vh",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          boxShadow: "0 24px 64px rgba(30, 45, 74, 0.3)",
        }}
      >
        <header
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px 20px",
            background: "white",
            borderBottom: "0.5px solid var(--hub-border)",
          }}
        >
          <div>
            <h2
              style={{
                fontFamily: "var(--font-editorial)",
                fontSize: 22,
                fontWeight: 500,
                margin: 0,
              }}
            >
              Metafield Shopify — {motifNom}
            </h2>
            <p
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: 11,
                color: "var(--hub-foreground)",
                opacity: 0.65,
                margin: "2px 0 0 0",
              }}
            >
              À coller dans le produit Shopify du motif <code style={codeInline}>{motifYpm}</code> ·
              Namespace <code style={codeInline}>custom</code> · Key{" "}
              <code style={codeInline}>incarnations</code> · Type{" "}
              <code style={codeInline}>json</code>.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            style={{
              background: "transparent",
              border: "none",
              cursor: "pointer",
              padding: 6,
              borderRadius: 8,
              color: "var(--hub-foreground)",
            }}
          >
            <X size={18} />
          </button>
        </header>

        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: 16,
            background: "var(--hub-foreground)",
            color: "#FAF7F2",
          }}
        >
          {loading ? (
            <div style={{ padding: 40, textAlign: "center" }}>
              <Loader2 size={20} className="animate-spin" />
            </div>
          ) : error ? (
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
          ) : (
            <pre
              style={{
                fontFamily: "ui-monospace, SFMono-Regular, monospace",
                fontSize: 12,
                lineHeight: 1.5,
                margin: 0,
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
              }}
            >
              {json}
            </pre>
          )}
        </div>

        <footer
          style={{
            padding: "12px 20px",
            background: "white",
            borderTop: "0.5px solid var(--hub-border)",
            display: "flex",
            gap: 10,
            justifyContent: "flex-end",
          }}
        >
          <button
            type="button"
            onClick={copy}
            disabled={loading || !!error}
            style={ghostButton}
          >
            {copied ? <Check size={12} color="#365D40" /> : <Copy size={12} />}{" "}
            {copied ? "Copié !" : "Copier"}
          </button>
          <button
            type="button"
            onClick={download}
            disabled={loading || !!error}
            style={primaryButton}
          >
            <Download size={12} /> Télécharger
          </button>
        </footer>
      </div>
    </div>
  );
}

const codeInline: React.CSSProperties = {
  fontFamily: "ui-monospace, SFMono-Regular, monospace",
  fontSize: 11,
  background: "var(--hub-bg)",
  padding: "1px 6px",
  borderRadius: 4,
};

const ghostButton: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  background: "white",
  border: "0.5px solid var(--hub-border)",
  borderRadius: 9999,
  padding: "8px 16px",
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
  border: "none",
  borderRadius: 9999,
  padding: "8px 20px",
  fontFamily: "var(--font-sans)",
  fontSize: 12,
  fontWeight: 500,
  letterSpacing: "0.04em",
  cursor: "pointer",
};
