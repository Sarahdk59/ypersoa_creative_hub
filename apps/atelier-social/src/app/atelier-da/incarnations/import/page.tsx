/**
 * /atelier-da/incarnations/import — import XLSX.
 */
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { XlsxImporter } from "@/components/incarnations/XlsxImporter";

export default function ImportIncarnationsPage() {
  const router = useRouter();
  const [doneCount, setDoneCount] = useState(0);

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto" }}>
      <Link href="/atelier-da/incarnations" style={backLinkStyle}>
        <ArrowLeft size={14} strokeWidth={1.6} /> Incarnations
      </Link>

      <header style={{ marginBottom: 24 }}>
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
          Importer depuis XLSX
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
          Importe ou met à jour les incarnations depuis <code style={codeStyle}>04_INCARNATIONS.xlsx</code>.
          Le code (YPI-XXX) détermine création vs mise à jour. Le parser tolère des en-têtes
          variées et gère <code style={codeStyle}>gabarits_cibles</code> et
          <code style={codeStyle}>collections_cibles</code> séparées par virgule, point-virgule
          ou point médian.
        </p>
      </header>

      <XlsxImporter onApplied={(r) => setDoneCount(r.created + r.updated)} />

      {doneCount > 0 && (
        <div style={{ marginTop: 16, display: "flex", justifyContent: "flex-end" }}>
          <button
            type="button"
            onClick={() => router.push("/atelier-da/incarnations")}
            style={{
              background: "var(--hub-foreground)",
              color: "var(--hub-bg)",
              border: "none",
              borderRadius: 9999,
              padding: "10px 20px",
              fontFamily: "var(--font-sans)",
              fontSize: 12,
              cursor: "pointer",
            }}
          >
            Voir les incarnations
          </button>
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

const codeStyle: React.CSSProperties = {
  fontFamily: "ui-monospace, SFMono-Regular, monospace",
  fontSize: 11,
  background: "var(--hub-bg)",
  padding: "1px 6px",
  borderRadius: 4,
  margin: "0 2px",
};
