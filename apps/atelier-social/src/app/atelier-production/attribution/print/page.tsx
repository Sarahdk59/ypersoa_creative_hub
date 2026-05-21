"use client";

import { useEffect, useState } from "react";
import { Printer, ArrowLeft } from "lucide-react";

/**
 * Page imprimable d'une attribution. Lit les données depuis localStorage
 * (clé "ypersoa_attribution_print"). Cmd+P pour export PDF.
 */

type TypoId = "russ_times" | "arial_rounded" | "looney" | "diana" | "museo" | "script_new";

interface PrintPayload {
  texte_lignes: string[];
  typo_id: TypoId;
  bg_fond: string;
  fils: Array<{ id: string; nom: string; hex: string; code_gunold?: string; pantone_tpg?: string; canonique?: boolean }>;
  result: {
    attribution: Record<number, string>;
    positions: Array<{ ligne: number; indice: number; x_relatif: number; caractere: string }>;
    score: number;
    seed: number;
    distribution: Array<{ couleur_id: string; count: number }>;
  };
  meta: {
    name?: string;
    motif_id?: string;
    motif_nom?: string;
    mode: "mono" | "palette" | "pattern";
    palette_label?: string;   // label palette ou nom fil ou "Pattern YPM-XXX"
  };
}

const TYPOS: Record<TypoId, { label: string; fontFamily: string; google: string; letterSpacing: string }> = {
  russ_times:    { label: "Russ Times",    fontFamily: '"Playfair Display", serif',  google: "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@900&display=swap", letterSpacing: "0.06em" },
  arial_rounded: { label: "Arial Rounded", fontFamily: '"Arial Rounded MT Bold","Nunito",sans-serif', google: "https://fonts.googleapis.com/css2?family=Nunito:wght@900&display=swap", letterSpacing: "0.02em" },
  looney:        { label: "Looney",        fontFamily: '"Fredoka","Lilita One",system-ui,sans-serif', google: "https://fonts.googleapis.com/css2?family=Fredoka:wght@600;700&family=Lilita+One&display=swap", letterSpacing: "0.08em" },
  diana:         { label: "Diana",         fontFamily: '"Cinzel","Cormorant Garamond",serif', google: "https://fonts.googleapis.com/css2?family=Cinzel:wght@700;900&display=swap", letterSpacing: "0.04em" },
  museo:         { label: "Museo",         fontFamily: '"Josefin Sans","Quattrocento Sans",sans-serif', google: "https://fonts.googleapis.com/css2?family=Josefin+Sans:wght@600;700&display=swap", letterSpacing: "0.03em" },
  script_new:    { label: "Script New",    fontFamily: '"Allura","Great Vibes",cursive', google: "https://fonts.googleapis.com/css2?family=Allura&family=Great+Vibes&display=swap", letterSpacing: "0em" },
};

export default function AttributionPrintPage() {
  const [payload, setPayload] = useState<PrintPayload | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("ypersoa_attribution_print");
      if (!raw) {
        setErr("Aucune attribution à imprimer. Reviens à /atelier-production/attribution et clique « Télécharger PDF ».");
        return;
      }
      const data = JSON.parse(raw) as PrintPayload;
      setPayload(data);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    }
  }, []);

  if (err) {
    return <div style={{ padding: 40, fontFamily: "system-ui", color: "#a13a16" }}>{err}</div>;
  }
  if (!payload) {
    return <div style={{ padding: 40, fontFamily: "system-ui" }}>Chargement…</div>;
  }

  const typo = TYPOS[payload.typo_id];
  const filsById = new Map(payload.fils.map((f) => [f.id, f]));

  const title = payload.meta.name || `${payload.meta.motif_id || ""} ${payload.meta.palette_label || ""}`.trim();
  const today = new Date().toISOString().slice(0, 10);

  // Numéro d'aiguille = ordre d'apparition du fil dans le texte (1-5)
  const aiguilleByFil = new Map<string, number>();
  for (let idx = 0; idx < payload.result.positions.length; idx++) {
    const cid = payload.result.attribution[idx];
    if (!aiguilleByFil.has(cid)) aiguilleByFil.set(cid, aiguilleByFil.size + 1);
  }

  return (
    <>
      <link rel="stylesheet" href={typo.google} />
      <style>{`
        /* Bypass HubShell — page autonome */
        body > div > header, body > div > div > nav { display: none !important; }
        body > div > div > main { padding: 0 !important; }
        body > div { background: white !important; }

        .swatch-color, .preview-char {
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

      <div style={{ minHeight: "100vh", background: "#FAF7F2", color: "#1A1614", fontFamily: "system-ui, -apple-system, sans-serif" }}>
        <div style={{ maxWidth: 780, margin: "0 auto", padding: "32px 40px 64px" }}>
          {/* Toolbar non imprimée */}
          <div className="no-print" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
            <a href="/atelier-production/attribution" style={{ fontSize: 12, color: "#1A1614", opacity: 0.6, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6 }}>
              <ArrowLeft size={13} /> Retour
            </a>
            <button
              type="button"
              onClick={() => window.print()}
              style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                padding: "8px 16px", borderRadius: 999,
                background: "#1A1614", color: "#FAF7F2",
                border: "none", cursor: "pointer",
                fontSize: 12, fontWeight: 500,
              }}
            >
              <Printer size={13} /> Imprimer / Enregistrer en PDF
            </button>
          </div>

          {/* Header fiche */}
          <header style={{ marginBottom: 24, paddingBottom: 16, borderBottom: "1px solid #1A1614" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 16 }}>
              <span style={{ fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase", fontWeight: 600, opacity: 0.7 }}>
                Fiche prod · attribution
              </span>
              <span style={{ fontFamily: "Georgia, serif", fontSize: 12, letterSpacing: "0.06em", fontWeight: 500 }}>
                YPERSOA · WATTRELOS
              </span>
            </div>
            <h1 style={{ fontFamily: "Georgia, serif", fontSize: 28, fontWeight: 500, margin: "10px 0 4px 0" }}>
              {title || "Attribution"}
            </h1>
            <p style={{ fontSize: 12, margin: 0, opacity: 0.7 }}>
              {payload.meta.motif_id && (
                <>
                  <strong>Motif :</strong> {payload.meta.motif_id}
                  {payload.meta.motif_nom && <> · {payload.meta.motif_nom}</>}
                  {" · "}
                </>
              )}
              {payload.meta.palette_label && (
                <><strong>Gamme :</strong> {payload.meta.palette_label}{" · "}</>
              )}
              <strong>Typo :</strong> {typo.label}
            </p>
            <p style={{ fontSize: 10, margin: "4px 0 0 0", opacity: 0.5, fontFamily: "Menlo, monospace" }}>
              score {Number.isFinite(payload.result?.score) ? payload.result.score.toFixed(3) : "—"} · seed {payload.result.seed}
            </p>
          </header>

          {/* Preview principale — chaque lettre en grand dans sa couleur + code Gunold dessous */}
          {(() => {
            const colorByLineIndice = new Map<string, string>();
            for (let idx = 0; idx < payload.result.positions.length; idx++) {
              const p = payload.result.positions[idx];
              colorByLineIndice.set(`${p.ligne}:${p.indice}`, payload.result.attribution[idx]);
            }
            return (
              <div style={{
                background: payload.bg_fond, padding: "32px 16px",
                borderRadius: 8, border: "0.5px solid rgba(0,0,0,0.06)",
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 28,
                minHeight: 320, marginBottom: 24,
              }}>
                {payload.texte_lignes.map((ligne, lineIdx) => {
                  let indice = 0;
                  return (
                    <div key={lineIdx} style={{ display: "flex", gap: 12, alignItems: "flex-end", justifyContent: "center", flexWrap: "wrap" }}>
                      {[...ligne].map((char, ci) => {
                        if (char === " ") {
                          return <span key={`${lineIdx}-sp-${ci}`} style={{ width: 18 }} />;
                        }
                        const cid = colorByLineIndice.get(`${lineIdx}:${indice}`);
                        indice++;
                        const fil = cid ? filsById.get(cid) : null;
                        const color = fil?.hex || "#888";
                        const aiguille = cid ? aiguilleByFil.get(cid) : null;
                        return (
                          <div key={`${lineIdx}-${ci}`} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                            <span className="preview-char" style={{
                              color,
                              fontFamily: typo.fontFamily,
                              fontSize: 56,
                              fontWeight: 900,
                              lineHeight: 1,
                              letterSpacing: 0,
                            }}>{char}</span>
                            <span style={{
                              fontFamily: "Menlo, monospace",
                              fontSize: 11, fontWeight: 700,
                              color: "#1A1614", opacity: 0.7,
                            }}>{aiguille ?? "—"}</span>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            );
          })()}

          {/* Légende compacte : numéro aiguille + swatch + nom + code (count) */}
          <h2 style={{ fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase", fontWeight: 600, opacity: 0.55, margin: "0 0 12px 0" }}>
            Plan d&apos;aiguille · {aiguilleByFil.size} fil{aiguilleByFil.size > 1 ? "s" : ""}
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 8 }}>
            {[...aiguilleByFil.entries()]
              .sort((a, b) => a[1] - b[1])
              .map(([couleur_id, num]) => {
                const fil = filsById.get(couleur_id);
                const count = payload.result.distribution.find((d) => d.couleur_id === couleur_id)?.count ?? 0;
                return (
                  <div key={couleur_id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 8px", borderRadius: 4 }}>
                    <span style={{
                      display: "inline-flex", alignItems: "center", justifyContent: "center",
                      width: 22, height: 22, borderRadius: "50%",
                      background: "#1A1614", color: "#FAF7F2",
                      fontFamily: "Menlo, monospace", fontSize: 11, fontWeight: 700,
                      flexShrink: 0,
                    }}>{num}</span>
                    <span
                      className="swatch-color"
                      style={{ display: "inline-block", width: 28, height: 28, background: fil?.hex, border: "0.5px solid rgba(0,0,0,0.15)", flexShrink: 0, borderRadius: 2 }}
                    />
                    <div style={{ flex: 1, minWidth: 0, fontSize: 12, lineHeight: 1.3 }}>
                      <div style={{ fontWeight: 600 }}>
                        {fil?.canonique && <span title="Canonique TMEZ" style={{ marginRight: 4, color: "#1E2D4A" }}>★</span>}
                        {fil?.nom || couleur_id}
                      </div>
                      <div style={{ fontFamily: "Menlo, monospace", fontSize: 10, opacity: 0.6 }}>
                        {formatCode(fil?.code_gunold || "—")} <span style={{ opacity: 0.7 }}>({count})</span>
                        {fil?.pantone_tpg && <span style={{ marginLeft: 6, opacity: 0.55 }}>· {fil.pantone_tpg}</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>

          {payload.result.distribution.some((d) => filsById.get(d.couleur_id)?.canonique) && (
            <p style={{ marginTop: 14, fontSize: 10, opacity: 0.55, fontStyle: "italic" }}>
              <span style={{ color: "#1E2D4A", fontStyle: "normal" }}>★</span> Fil canonique TMEZ — chargé en permanence sur la machine.
            </p>
          )}

          {/* Footer */}
          <footer style={{ marginTop: 40, paddingTop: 12, borderTop: "0.5px solid rgba(0,0,0,0.15)", fontSize: 10, opacity: 0.55, display: "flex", justifyContent: "space-between" }}>
            <span>Document généré le {today}</span>
            <span>ypersoa.fr · Atelier Wattrelos</span>
          </footer>
        </div>
      </div>
    </>
  );
}

function formatCode(code: string): string {
  // 61446 → "61 446" pour matcher le rendu Python
  if (/^\d{5}$/.test(code)) return `${code.slice(0, 2)} ${code.slice(2)}`;
  return code;
}

function adjustColor(hex: string, amount: number): string {
  if (!hex.startsWith("#")) return hex;
  const num = parseInt(hex.slice(1), 16);
  let r = (num >> 16) + amount;
  let g = ((num >> 8) & 0x00FF) + amount;
  let b = (num & 0x0000FF) + amount;
  r = Math.max(0, Math.min(255, r));
  g = Math.max(0, Math.min(255, g));
  b = Math.max(0, Math.min(255, b));
  return `rgb(${r},${g},${b})`;
}

const thStyle: React.CSSProperties = {
  textAlign: "left", padding: "8px 6px", fontSize: 10,
  letterSpacing: "0.06em", textTransform: "uppercase",
  fontWeight: 600, opacity: 0.6,
};
const tdStyle: React.CSSProperties = { padding: "8px 6px", verticalAlign: "middle" };
const tdMono: React.CSSProperties = { ...tdStyle, fontFamily: "Menlo, monospace", fontSize: 11 };
