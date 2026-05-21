/**
 * /atelier-da/incarnations/audit — matrice motif × incarnation × gabarit.
 *
 * Vue dense, lecture seule, avec KPI en header et bouton export CSV.
 */
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Download, Loader2 } from "lucide-react";

interface MatrixCell {
  statut: "shootee_hero" | "shootee_no_hero" | "manquant" | "non_cible";
  photos_count: number;
}

interface IncarnationRow {
  code: string;
  nom_commercial: string;
  statut: string;
  ton: string | null;
  cells: Record<string, MatrixCell>;
}

interface MotifBlock {
  motif_ypm: string;
  motif_nom: string;
  motif_famille: string | null;
  incarnations_count: number;
  actives_count: number;
  a_shooter_count: number;
  concepts_count: number;
  incarnations: IncarnationRow[];
}

interface AuditResponse {
  gabarits: Array<{ code: string; label: string }>;
  blocks: MotifBlock[];
  kpi: {
    total_incarnations: number;
    actives: number;
    a_shooter: number;
    concepts: number;
    total_cibles: number;
    total_shootes: number;
    total_manquants: number;
  };
}

export default function AuditPage() {
  const [data, setData] = useState<AuditResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/da/incarnations/audit", { cache: "no-store" })
      .then((r) => {
        if (!r.ok) throw new Error(`audit ${r.status}`);
        return r.json();
      })
      .then((r: AuditResponse) => {
        if (!cancelled) setData(r);
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
  }, []);

  return (
    <div style={{ maxWidth: 1500, margin: "0 auto" }}>
      <Link href="/atelier-da/incarnations" style={backLinkStyle}>
        <ArrowLeft size={14} strokeWidth={1.6} /> Incarnations
      </Link>

      <header
        style={{
          marginBottom: 24,
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          gap: 16,
          flexWrap: "wrap",
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
            Audit de production
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
            Matrice motif × incarnation × gabarit. Indique pour chaque cellule si
            la photo est shootée (avec ou sans hero) ou manquante. Pilotage des
            shootings Maï / Adriana.
          </p>
        </div>
        <a
          href="/api/da/exports/audit-csv"
          download="audit-incarnations.csv"
          style={primaryButton}
        >
          <Download size={14} strokeWidth={1.8} /> Exporter CSV
        </a>
      </header>

      {/* KPI */}
      {data && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
            gap: 12,
            marginBottom: 24,
          }}
        >
          <KpiCard label="Incarnations totales" value={data.kpi.total_incarnations} />
          <KpiCard label="Actives" value={data.kpi.actives} color="#365D40" />
          <KpiCard label="À shooter" value={data.kpi.a_shooter} color="#8A5A1E" />
          <KpiCard label="Concepts" value={data.kpi.concepts} color="#7A5A1E" />
          <KpiCard
            label="Photos shootées"
            value={`${data.kpi.total_shootes} / ${data.kpi.total_cibles}`}
            color="#2E4D6E"
          />
          <KpiCard
            label="Cellules manquantes"
            value={data.kpi.total_manquants}
            color="#7C2A24"
          />
        </div>
      )}

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

      {loading ? (
        <div style={{ padding: 60, textAlign: "center" }}>
          <Loader2 size={22} className="animate-spin" />
        </div>
      ) : !data || data.blocks.length === 0 ? (
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
          Aucune incarnation à auditer. Importe un XLSX ou crée des incarnations.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {data.blocks.map((b) => (
            <MotifBlockTable key={b.motif_ypm} block={b} gabarits={data.gabarits} />
          ))}
        </div>
      )}

      <Legend />
    </div>
  );
}

function KpiCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number | string;
  color?: string;
}) {
  return (
    <div
      style={{
        background: "white",
        border: "0.5px solid var(--hub-border)",
        borderRadius: 12,
        padding: 12,
        display: "flex",
        flexDirection: "column",
        gap: 2,
      }}
    >
      <span
        style={{
          fontFamily: "var(--font-sans)",
          fontSize: 10,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color: "var(--hub-foreground)",
          opacity: 0.6,
          fontWeight: 600,
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontFamily: "var(--font-editorial)",
          fontSize: 24,
          fontWeight: 500,
          color: color ?? "var(--hub-foreground)",
        }}
      >
        {value}
      </span>
    </div>
  );
}

function MotifBlockTable({
  block,
  gabarits,
}: {
  block: MotifBlock;
  gabarits: Array<{ code: string; label: string }>;
}) {
  return (
    <section
      style={{
        background: "white",
        border: "0.5px solid var(--hub-border)",
        borderRadius: 12,
        overflow: "hidden",
      }}
    >
      <header
        style={{
          padding: "12px 16px",
          borderBottom: "0.5px solid var(--hub-border)",
          background: "var(--hub-bg)",
          display: "flex",
          alignItems: "baseline",
          gap: 10,
          flexWrap: "wrap",
        }}
      >
        <h3
          style={{
            fontFamily: "var(--font-editorial)",
            fontSize: 18,
            fontWeight: 500,
            margin: 0,
          }}
        >
          {block.motif_nom}
        </h3>
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
          {block.motif_ypm}
          {block.motif_famille ? ` · ${block.motif_famille}` : ""}
        </span>
        <span style={{ flex: 1 }} />
        <span
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 11,
            color: "var(--hub-foreground)",
            opacity: 0.65,
          }}
        >
          {block.actives_count} actives · {block.a_shooter_count} à shooter ·{" "}
          {block.concepts_count} concepts
        </span>
      </header>
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          fontFamily: "var(--font-sans)",
          fontSize: 12,
        }}
      >
        <thead>
          <tr style={{ background: "white" }}>
            <th style={thLabel}>Incarnation</th>
            {gabarits.map((g) => (
              <th key={g.code} style={thGabarit} title={g.label}>
                {g.code}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {block.incarnations.map((r) => (
            <tr key={r.code} style={{ borderTop: "0.5px solid var(--hub-border)" }}>
              <td style={tdLabel}>
                <Link
                  href={`/atelier-da/incarnations/${encodeURIComponent(r.code)}`}
                  style={{
                    color: "var(--hub-foreground)",
                    textDecoration: "none",
                    display: "flex",
                    flexDirection: "column",
                    gap: 2,
                  }}
                >
                  <span style={{ fontWeight: 600 }}>{r.nom_commercial}</span>
                  <span style={{ fontSize: 10, opacity: 0.55 }}>
                    {r.code} · {r.statut}
                    {r.ton ? ` · ${r.ton}` : ""}
                  </span>
                </Link>
              </td>
              {gabarits.map((g) => (
                <td key={g.code} style={tdCell}>
                  <Cell cell={r.cells[g.code]} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function Cell({ cell }: { cell: MatrixCell | undefined }) {
  if (!cell || cell.statut === "non_cible") {
    return <span style={{ color: "var(--hub-border)" }}>—</span>;
  }
  if (cell.statut === "shootee_hero") {
    return (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
          padding: "3px 8px",
          borderRadius: 999,
          background: "#D7E5DA",
          color: "#365D40",
          fontFamily: "var(--font-sans)",
          fontSize: 11,
          fontWeight: 600,
        }}
        title="Shootée avec photo hero définie"
      >
        ✓ {cell.photos_count}
      </span>
    );
  }
  if (cell.statut === "shootee_no_hero") {
    return (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
          padding: "3px 8px",
          borderRadius: 999,
          background: "#F3E0C5",
          color: "#8A5A1E",
          fontFamily: "var(--font-sans)",
          fontSize: 11,
          fontWeight: 600,
        }}
        title="Shootée mais pas de hero défini"
      >
        ⚠ {cell.photos_count}
      </span>
    );
  }
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "3px 8px",
        borderRadius: 999,
        background: "#FAEBE8",
        color: "#7C2A24",
        fontFamily: "var(--font-sans)",
        fontSize: 11,
        fontWeight: 600,
      }}
      title="Cible mais aucune photo liée"
    >
      Manquant
    </span>
  );
}

function Legend() {
  return (
    <p
      style={{
        marginTop: 24,
        fontFamily: "var(--font-sans)",
        fontSize: 11,
        color: "var(--hub-foreground)",
        opacity: 0.55,
        lineHeight: 1.6,
      }}
    >
      Légende : <strong style={{ color: "#365D40" }}>✓</strong> shootée avec hero ·{" "}
      <strong style={{ color: "#8A5A1E" }}>⚠</strong> shootée sans hero · <strong style={{ color: "#7C2A24" }}>Manquant</strong>{" "}
      cible non couverte · <strong>—</strong> gabarit non ciblé.
    </p>
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

const thLabel: React.CSSProperties = {
  padding: "10px 12px",
  textAlign: "left",
  fontFamily: "var(--font-sans)",
  fontSize: 10,
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  color: "var(--hub-foreground)",
  opacity: 0.6,
  fontWeight: 600,
  width: "30%",
};

const thGabarit: React.CSSProperties = {
  padding: "10px 8px",
  textAlign: "center",
  fontFamily: "var(--font-sans)",
  fontSize: 10,
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  color: "var(--hub-foreground)",
  opacity: 0.6,
  fontWeight: 600,
};

const tdLabel: React.CSSProperties = {
  padding: "10px 12px",
  verticalAlign: "middle",
};

const tdCell: React.CSSProperties = {
  padding: "8px",
  textAlign: "center",
  verticalAlign: "middle",
};
