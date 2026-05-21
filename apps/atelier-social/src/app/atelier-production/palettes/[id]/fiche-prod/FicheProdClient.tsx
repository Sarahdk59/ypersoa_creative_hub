"use client";

import { Printer } from "lucide-react";
import type { Palette, HubFil } from "@/lib/atelier-da/referentiels-loader";

const TYPE_LABEL: Record<Palette["type"], string> = {
  camaieu: "Camaïeu",
  multicolore: "Multicolore",
  duo: "Duo",
  trio: "Trio",
};

export function FicheProdClient({
  palette,
  fils,
  generatedAt,
}: {
  palette: Palette;
  fils: HubFil[];
  generatedAt: string;
}) {
  return (
    <>
      <style>{`
        /* Bypass HubShell : la fiche prod doit être une page autonome (zéro chrome Hub). */
        body > div > header,
        body > div > div > nav {
          display: none !important;
        }
        body > div > div > main {
          padding: 0 !important;
        }
        body > div {
          background: white !important;
        }

        /* Force le rendu des couleurs en impression / PDF (sinon Chrome/Safari blanchissent les fonds). */
        .swatch-color {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
          color-adjust: exact !important;
        }
        @media print {
          .no-print { display: none !important; }
          @page { size: A4; margin: 14mm; }
          body, body > div { background: white !important; }
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
        }
        @page { size: A4; }
      `}</style>
      <div style={{ minHeight: "100vh", background: "#FAF7F2", color: "#1A1614", fontFamily: "var(--font-sans, system-ui)" }}>
        <div style={{ maxWidth: 780, margin: "0 auto", padding: "32px 40px 64px" }}>
          {/* Toolbar non imprimée */}
          <div className="no-print" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
            <a href={`/atelier-production/palettes`} style={{ fontSize: 12, color: "#1A1614", opacity: 0.6, textDecoration: "none" }}>
              ← Retour aux palettes
            </a>
            <button
              type="button"
              onClick={() => window.print()}
              style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                padding: "8px 16px", borderRadius: 999,
                background: "#1A1614", color: "#FAF7F2",
                border: "none", cursor: "pointer",
                fontFamily: "inherit", fontSize: 12, fontWeight: 500,
              }}
            >
              <Printer size={13} /> Imprimer / Enregistrer en PDF
            </button>
          </div>

          {/* Header fiche */}
          <header style={{ marginBottom: 24, paddingBottom: 16, borderBottom: "1px solid #1A1614" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 16 }}>
              <span style={{ fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase", fontWeight: 600, opacity: 0.7 }}>
                Fiche prod · palette
              </span>
              <span style={{ fontFamily: "var(--font-serif, Georgia, serif)", fontSize: 12, letterSpacing: "0.06em", fontWeight: 500 }}>
                YPERSOA · WATTRELOS
              </span>
            </div>
            <h1 style={{ fontFamily: "var(--font-editorial, Georgia, serif)", fontSize: 32, fontWeight: 500, margin: "10px 0 4px 0", letterSpacing: "-0.01em" }}>
              {palette.nom}
            </h1>
            <p style={{ fontSize: 12, margin: 0, opacity: 0.65 }}>
              <code style={{ fontFamily: "Menlo, monospace" }}>{palette.id}</code> · {TYPE_LABEL[palette.type]} · {fils.length} fils
            </p>
          </header>

          {/* Swatch large */}
          <div style={{ display: "flex", height: 64, borderRadius: 6, overflow: "hidden", marginBottom: 20, border: "0.5px solid rgba(0,0,0,0.08)" }}>
            {fils.map((f) => (
              <div key={f.id} className="swatch-color" style={{ flex: 1, background: f.hex }} />
            ))}
          </div>

          {/* Description */}
          {palette.description && (
            <p style={{ fontSize: 13, lineHeight: 1.55, marginBottom: 24, fontStyle: "italic", opacity: 0.85 }}>
              {palette.description}
            </p>
          )}

          {/* Table fils */}
          <h2 style={{ fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase", fontWeight: 600, opacity: 0.55, margin: "0 0 10px 0" }}>
            Composition fils Gunold-Poly
          </h2>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(0,0,0,0.15)" }}>
                <th style={thStyle}></th>
                <th style={thStyle}>Nom</th>
                <th style={thStyle}>Code Gunold</th>
                <th style={thStyle}>Pantone TPG</th>
                <th style={thStyle}>Hex</th>
              </tr>
            </thead>
            <tbody>
              {fils.map((f) => (
                <tr key={f.id} style={{ borderBottom: "0.5px solid rgba(0,0,0,0.08)" }}>
                  <td style={{ ...tdStyle, width: 36 }}>
                    <span
                      className="swatch-color"
                      style={{
                        display: "inline-block", width: 22, height: 22,
                        borderRadius: "50%", background: f.hex,
                        border: "0.5px solid rgba(0,0,0,0.18)",
                        verticalAlign: "middle",
                      }}
                    />
                  </td>
                  <td style={{ ...tdStyle, fontWeight: 600 }}>
                    {f.canonique && (
                      <span
                        title="Canonique TMEZ (chargé en permanence sur la machine)"
                        style={{ marginRight: 6, color: "#1E2D4A", fontSize: 13, verticalAlign: "middle" }}
                      >★</span>
                    )}
                    {f.nom}
                  </td>
                  <td style={tdMono}>{f.code_gunold || "—"}</td>
                  <td style={tdMono}>{f.pantone_tpg || "—"}</td>
                  <td style={tdMono}>{f.hex}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Légende ★ */}
          {fils.some((f) => f.canonique) && (
            <p style={{ marginTop: 14, fontSize: 10, opacity: 0.55, fontStyle: "italic" }}>
              <span style={{ color: "#1E2D4A", fontStyle: "normal" }}>★</span> Fil canonique TMEZ — chargé en permanence sur la machine, aucun changement de bobine requis.
            </p>
          )}

          {/* Footer */}
          <footer style={{ marginTop: 56, paddingTop: 12, borderTop: "0.5px solid rgba(0,0,0,0.15)", fontSize: 10, opacity: 0.55, display: "flex", justifyContent: "space-between" }}>
            <span>Document généré le {generatedAt}</span>
            <span>ypersoa.fr · Atelier Wattrelos</span>
          </footer>
        </div>
      </div>
    </>
  );
}

const thStyle: React.CSSProperties = {
  textAlign: "left",
  padding: "8px 6px",
  fontSize: 10,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  fontWeight: 600,
  opacity: 0.6,
};
const tdStyle: React.CSSProperties = {
  padding: "8px 6px",
  verticalAlign: "middle",
};
const tdMono: React.CSSProperties = {
  ...tdStyle,
  fontFamily: "Menlo, monospace",
  fontSize: 11,
};
