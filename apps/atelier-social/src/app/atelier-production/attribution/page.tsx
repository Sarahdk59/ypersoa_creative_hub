"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, Sparkles, AlertTriangle, Check, Download, Save, FolderOpen, Trash2, Pencil, FileImage } from "lucide-react";
import type { HubFil, Palette, MotifYpm } from "@/lib/atelier-da/referentiels-loader";

interface AttributionLibEntry {
  id: string;
  name: string;
  motif_id?: string;
  mode: "mono" | "palette";
  couleur_id?: string;
  palette_id?: string;
  coeur_couleur_id?: string | null;
  texte_lignes: string[];
  typo_id: TypoId;
  bg_fond?: string;
  result: {
    attribution: Record<number, string>;
    positions: Array<{ ligne: number; indice: number; x_relatif: number; caractere: string }>;
    score: number;
    seed: number;
    distribution: Array<{ couleur_id: string; count: number }>;
  };
  created_at: string;
}

type TypoId = "russ_times" | "arial_rounded" | "looney" | "diana" | "museo" | "script_new";

const TYPOS: Array<{ id: TypoId; label: string; google: string; fontFamily: string }> = [
  {
    id: "russ_times",
    label: "Russ Times",
    google: "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@900&display=swap",
    fontFamily: '"Playfair Display", "Times New Roman", serif',
  },
  {
    id: "arial_rounded",
    label: "Arial Rounded",
    google: "https://fonts.googleapis.com/css2?family=Nunito:wght@900&display=swap",
    fontFamily: '"Arial Rounded MT Bold", "Helvetica Rounded", "Nunito", sans-serif',
  },
  {
    id: "looney",
    label: "Looney",
    google: "https://fonts.googleapis.com/css2?family=Fredoka:wght@600;700&family=Lilita+One&display=swap",
    fontFamily: '"Fredoka", "Lilita One", system-ui, sans-serif',
  },
  {
    id: "diana",
    label: "Diana",
    google: "https://fonts.googleapis.com/css2?family=Cinzel:wght@700;900&display=swap",
    fontFamily: '"Cinzel", "Trajan Pro", "Cormorant Garamond", serif',
  },
  {
    id: "museo",
    label: "Museo",
    google: "https://fonts.googleapis.com/css2?family=Josefin+Sans:wght@600;700&display=swap",
    fontFamily: '"Josefin Sans", "Quattrocento Sans", sans-serif',
  },
  {
    id: "script_new",
    label: "Script New",
    google: "https://fonts.googleapis.com/css2?family=Allura&family=Great+Vibes&display=swap",
    fontFamily: '"Allura", "Great Vibes", "Dancing Script", cursive',
  },
];

const LETTER_SPACING_BY_TYPO: Record<TypoId, string> = {
  russ_times: "0.06em",
  arial_rounded: "0.02em",
  looney: "0.08em",
  diana: "0.04em",       // chiffres romains avec points, espacement aéré
  museo: "0.03em",       // sans-serif géométrique
  script_new: "0em",     // cursive italique, lettres connectées
};

interface AttributionResultUI {
  texte_lignes: string[];
  palette_id: string;
  attribution: Record<number, string>;
  positions: Array<{ ligne: number; indice: number; x_relatif: number; caractere: string }>;
  score: number;
  violations_dures: string[];
  seed: number;
  coeur_couleur_id: string | null;
  palette_effective: string[];
  distribution: Array<{ couleur_id: string; count: number }>;
}

export default function AttributionPage() {
  const [fils, setFils] = useState<HubFil[]>([]);
  const [palettes, setPalettes] = useState<Palette[]>([]);
  const [motifs, setMotifs] = useState<MotifYpm[]>([]);
  const [loading, setLoading] = useState(true);

  // Inputs
  const [motifId, setMotifId] = useState<string>("");
  const [mode, setMode] = useState<"mono" | "palette">("mono");
  const [couleurId, setCouleurId] = useState<string>("");
  const [paletteId, setPaletteId] = useState<string>("");
  const [coeurCouleurId, setCoeurCouleurId] = useState<string>("");
  // Override fils : initialisé sur la palette sélectionnée, modifiable à la volée
  const [filsOverride, setFilsOverride] = useState<string[]>([]);
  const [swapForIdx, setSwapForIdx] = useState<number | null>(null);
  const [ligne1, setLigne1] = useState("MAMAN");
  const [ligne2, setLigne2] = useState("DE");
  const [ligne3, setLigne3] = useState("GABIN");
  const [ligne4, setLigne4] = useState("");
  const [typoId, setTypoId] = useState<TypoId>("looney");
  const [bgFond, setBgFond] = useState("#EFE9D8");

  // Run state
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<AttributionResultUI | null>(null);
  const [err, setErr] = useState<string | null>(null);

  // Library
  const [library, setLibrary] = useState<AttributionLibEntry[]>([]);
  const [savingLib, setSavingLib] = useState(false);

  const loadLibrary = useCallback(async () => {
    try {
      const r = await fetch("/api/da/attribution-library", { cache: "no-store" }).then((r) => r.json());
      if (r.ok) setLibrary(r.data.attributions);
    } catch {}
  }, []);
  useEffect(() => { loadLibrary(); }, [loadLibrary]);

  const saveToLibrary = async () => {
    if (!result) return;
    setSavingLib(true);
    try {
      const res = await fetch("/api/da/attribution-library", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          motif_id: motifId || undefined,
          mode,
          couleur_id: mode === "mono" ? couleurId : undefined,
          palette_id: mode === "palette" ? paletteId : undefined,
          coeur_couleur_id: coeurCouleurId || null,
          texte_lignes: result.texte_lignes,
          typo_id: typoId,
          bg_fond: bgFond,
          result: {
            attribution: result.attribution,
            positions: result.positions,
            score: result.score,
            seed: result.seed,
            distribution: result.distribution,
          },
        }),
      }).then((r) => r.json());
      if (!res.ok) throw new Error(res.error);
      await loadLibrary();
      alert(`✓ Sauvegardé : "${res.data.name}"`);
    } catch (e) {
      alert(e instanceof Error ? e.message : String(e));
    } finally {
      setSavingLib(false);
    }
  };

  const restoreFromLibrary = (entry: AttributionLibEntry) => {
    setMode(entry.mode);
    if (entry.couleur_id) setCouleurId(entry.couleur_id);
    if (entry.palette_id) setPaletteId(entry.palette_id);
    setCoeurCouleurId(entry.coeur_couleur_id || "");
    setMotifId(entry.motif_id || "");
    setTypoId(entry.typo_id);
    setBgFond(entry.bg_fond || "#EFE9D8");
    setLigne1(entry.texte_lignes[0] || "");
    setLigne2(entry.texte_lignes[1] || "");
    setLigne3(entry.texte_lignes[2] || "");
    setLigne4(entry.texte_lignes[3] || "");
    setResult({
      texte_lignes: entry.texte_lignes,
      palette_id: entry.palette_id || `mono_${entry.couleur_id || ""}`,
      attribution: entry.result.attribution,
      positions: entry.result.positions,
      score: entry.result.score,
      violations_dures: [],
      seed: entry.result.seed,
      coeur_couleur_id: entry.coeur_couleur_id || null,
      palette_effective: [],
      distribution: entry.result.distribution,
    });
  };

  const deleteFromLibrary = async (id: string, name: string) => {
    if (!confirm(`Supprimer "${name}" de la bibliothèque ?`)) return;
    await fetch(`/api/da/attribution-library?id=${encodeURIComponent(id)}`, { method: "DELETE" }).then((r) => r.json());
    await loadLibrary();
  };

  // Charge fils + palettes + motifs au boot
  useEffect(() => {
    fetch("/api/da/referentiels", { cache: "no-store" })
      .then((r) => r.json())
      .then((res) => {
        if (!res.ok) throw new Error(res.error);
        setFils(res.data.fils.couleurs);
        setPalettes(res.data.palettes.palettes);
        setMotifs(res.data.motifs.motifs);
      })
      .catch((e) => setErr(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false));
  }, []);

  const filsById = useMemo(() => new Map(fils.map((f) => [f.id, f])), [fils]);
  const palettesActives = useMemo(() => palettes.filter((p) => !p.archive), [palettes]);
  const filsB2C = useMemo(() => fils.filter((f) => f.favori && !f.archive), [fils]);

  // Default sélections quand les datas arrivent
  useEffect(() => {
    if (filsB2C.length > 0 && !couleurId) setCouleurId(filsB2C[0].id);
    if (palettesActives.length > 0 && !paletteId) setPaletteId(palettesActives[0].id);
    if (motifs.length > 0 && !motifId) {
      // Default = YPM-009 (La Palette) si présent, sinon premier motif
      const ypm009 = motifs.find((m) => m.id === "YPM-009");
      setMotifId(ypm009?.id || motifs[0].id);
    }
  }, [filsB2C, palettesActives, motifs, couleurId, paletteId, motifId]);

  // Réinitialise filsOverride dès que la palette change
  useEffect(() => {
    const p = palettesActives.find((x) => x.id === paletteId);
    if (p) setFilsOverride([...p.fils]);
    setSwapForIdx(null);
  }, [paletteId, palettesActives]);

  // Détecte si la gamme a été modifiée vs la palette source
  const paletteCourante = palettesActives.find((x) => x.id === paletteId);
  const gammeModifiee = useMemo(() => {
    if (!paletteCourante) return false;
    if (paletteCourante.fils.length !== filsOverride.length) return true;
    return paletteCourante.fils.some((f, i) => f !== filsOverride[i]);
  }, [paletteCourante, filsOverride]);

  // Tri des motifs pour le dropdown : YPM-009 puis YPM-004 en tête, puis le reste par id croissant
  const motifsOrdered = useMemo(() => {
    const PRIORITY = ["YPM-009", "YPM-004"];
    const priorityMotifs = PRIORITY
      .map((id) => motifs.find((m) => m.id === id))
      .filter((m): m is MotifYpm => Boolean(m));
    const rest = motifs
      .filter((m) => !PRIORITY.includes(m.id))
      .sort((a, b) => a.id.localeCompare(b.id));
    return [...priorityMotifs, ...rest];
  }, [motifs]);

  const launch = useCallback(async () => {
    setRunning(true);
    setErr(null);
    setResult(null);
    try {
      const texteLignes = [ligne1, ligne2, ligne3, ligne4].map((l) => l.trim()).filter(Boolean);
      const body: Record<string, unknown> = {
        texte_lignes: texteLignes,
        motif_id: motifId || undefined,           // ← détecte distribution_pattern figé (ex. YPM-004)
        mode,
        couleur_id: mode === "mono" ? couleurId : undefined,
        palette_id: mode === "palette" ? paletteId : undefined,
        fils: mode === "palette" && gammeModifiee ? filsOverride : undefined,  // override à la volée
        coeur_couleur_id: mode === "palette" && coeurCouleurId ? coeurCouleurId : undefined,
        n_candidats: 100,
      };
      const res = await fetch("/api/da/attribution", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }).then((r) => r.json());
      if (!res.ok) throw new Error(res.error);
      setResult(res.data);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setRunning(false);
    }
  }, [ligne1, ligne2, ligne3, ligne4, mode, couleurId, paletteId, coeurCouleurId, motifId, filsOverride, gammeModifiee]);

  if (loading) {
    return <div style={{ padding: 60, textAlign: "center" }}><Loader2 size={32} className="animate-spin" strokeWidth={1.4} /></div>;
  }

  const typo = TYPOS.find((t) => t.id === typoId)!;

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto" }}>
      {TYPOS.map((t) => (<link key={t.id} rel="stylesheet" href={t.google} />))}

      <Link href="/atelier-production" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontFamily: "var(--font-sans)", fontSize: 12, color: "var(--hub-foreground)", opacity: 0.6, textDecoration: "none", marginBottom: 24 }}>
        <ArrowLeft size={14} strokeWidth={1.6} /> Atelier Production
      </Link>

      <header style={{ marginBottom: 32 }}>
        <h1 style={{ fontFamily: "var(--font-editorial)", fontSize: 36, fontWeight: 500, margin: 0, marginBottom: 8 }}>
          Moteur d&apos;attribution
        </h1>
        <p style={{ fontFamily: "var(--font-sans)", fontSize: 13, opacity: 0.65, maxWidth: 720, margin: 0 }}>
          Backtracking déterministe + scoring multi-règles. 1-4 lignes de texte client, mode monochrome (1 fil) ou multicolore (palette imposée). Génère l&apos;attribution couleur→lettre la plus harmonieuse possible.
        </p>
      </header>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1.5fr)", gap: 24, alignItems: "start" }}>
        {/* ============ COLONNE GAUCHE — Inputs ============ */}
        <div style={{ display: "grid", gap: 16 }}>
          <Card title="1. Motif">
            <select value={motifId} onChange={(e) => setMotifId(e.target.value)} style={inputStyle}>
              <option value="">— Sélectionner —</option>
              {motifsOrdered.map((m) => (
                <option key={m.id} value={m.id}>{m.id} · {m.nom_commercial}</option>
              ))}
            </select>
            <p style={miniStyle}>Si le motif a un <em>distribution_pattern</em> dans sa bible (ex. YPM-004), l&apos;algo utilise le pattern figé. Sinon backtracking standard.</p>
          </Card>

          <Card title="2. Mode couleur">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 10 }}>
              <button type="button" onClick={() => setMode("mono")} style={modeBtn(mode === "mono")}>Monochrome</button>
              <button type="button" onClick={() => setMode("palette")} style={modeBtn(mode === "palette")}>Multicolore</button>
            </div>
            {mode === "mono" ? (
              <FilSelect
                label="Couleur fil"
                value={couleurId}
                onChange={setCouleurId}
                fils={filsB2C.length > 0 ? filsB2C : fils.filter((f) => !f.archive)}
                filsById={filsById}
              />
            ) : (
              <>
                <PaletteSelect
                  label="Gamme imposée"
                  value={paletteId}
                  onChange={setPaletteId}
                  palettes={palettesActives}
                  fils={fils}
                />
                {/* Bar fils éditable : clic sur un fil → ouvre le picker swap */}
                {filsOverride.length > 0 && (
                  <div style={{ marginTop: 10 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                      <label style={labelStyle}>Gamme effective {gammeModifiee && <span style={{ color: "#c5660d", textTransform: "none", letterSpacing: 0, fontWeight: 400, fontStyle: "italic", fontSize: 9 }}>· modifiée</span>}</label>
                      {gammeModifiee && (
                        <button
                          type="button"
                          onClick={() => {
                            if (paletteCourante) setFilsOverride([...paletteCourante.fils]);
                            setSwapForIdx(null);
                          }}
                          style={{
                            fontFamily: "var(--font-sans)", fontSize: 9, opacity: 0.6,
                            background: "transparent", border: "none", cursor: "pointer",
                            textDecoration: "underline", color: "var(--hub-foreground)",
                            padding: 0,
                          }}
                          title="Restaurer la palette d'origine"
                        >
                          ↺ Reset
                        </button>
                      )}
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: `repeat(${filsOverride.length}, 1fr)`, gap: 4 }}>
                      {filsOverride.map((fid, idx) => {
                        const fil = filsById.get(fid);
                        return (
                          <button
                            key={`${fid}-${idx}`}
                            type="button"
                            onClick={() => setSwapForIdx(swapForIdx === idx ? null : idx)}
                            title={`${fil?.nom || fid} — click pour remplacer`}
                            style={{
                              padding: 3, borderRadius: 6,
                              background: "white",
                              border: swapForIdx === idx ? "1.5px solid var(--hub-foreground)" : "0.5px solid var(--hub-border)",
                              cursor: "pointer", display: "flex", flexDirection: "column",
                              alignItems: "center", gap: 3,
                            }}
                          >
                            <span style={{
                              width: "100%", height: 28, borderRadius: 4,
                              background: fil?.hex || "#ccc",
                              border: "0.5px solid rgba(0,0,0,0.08)",
                            }} />
                            <span style={{ fontFamily: "var(--font-sans)", fontSize: 9, fontWeight: 600, textAlign: "center", lineHeight: 1.1 }}>
                              {fil?.nom?.split(" ")[0] || "—"}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                    {swapForIdx !== null && (
                      <SwapFilInline
                        currentFilId={filsOverride[swapForIdx]}
                        fils={fils.filter((f) => !f.archive)}
                        onPick={(toId) => {
                          const next = [...filsOverride];
                          next[swapForIdx] = toId;
                          setFilsOverride(next);
                          setSwapForIdx(null);
                        }}
                        onCancel={() => setSwapForIdx(null)}
                      />
                    )}
                  </div>
                )}
                <div style={{ marginTop: 10 }}>
                  <FilSelect
                    label="Couleur cœur (optionnel)"
                    value={coeurCouleurId}
                    onChange={setCoeurCouleurId}
                    fils={fils.filter((f) => !f.archive)}
                    filsById={filsById}
                    allowEmpty="— Aucun cœur —"
                  />
                </div>
              </>
            )}
          </Card>

          <Card title="3. Texte client">
            <div style={{ display: "grid", gap: 6 }}>
              <input type="text" value={ligne1} onChange={(e) => setLigne1(e.target.value)} placeholder="Ligne 1 (obligatoire)" maxLength={12} style={inputStyle} />
              <input type="text" value={ligne2} onChange={(e) => setLigne2(e.target.value)} placeholder="Ligne 2" maxLength={12} style={inputStyle} />
              <input type="text" value={ligne3} onChange={(e) => setLigne3(e.target.value)} placeholder="Ligne 3" maxLength={12} style={inputStyle} />
              <input type="text" value={ligne4} onChange={(e) => setLigne4(e.target.value)} placeholder="Ligne 4" maxLength={12} style={inputStyle} />
            </div>
            <p style={miniStyle}>Max 4 lignes · 10-12 char par ligne · espaces non comptés en geom.</p>
          </Card>

          <Card title="4. Police">
            <select value={typoId} onChange={(e) => setTypoId(e.target.value as TypoId)} style={inputStyle}>
              {TYPOS.map((t) => (<option key={t.id} value={t.id}>{t.label}</option>))}
            </select>
            <p style={miniStyle}>Influence uniquement le rendu visuel — pas l&apos;algo d&apos;attribution.</p>
          </Card>

          <button
            type="button"
            onClick={launch}
            disabled={running || !ligne1.trim() || (mode === "mono" ? !couleurId : !paletteId)}
            style={{
              padding: "14px 20px", borderRadius: 12, border: "none",
              background: "var(--hub-foreground)", color: "var(--hub-bg)",
              fontFamily: "var(--font-sans)", fontSize: 13, fontWeight: 600,
              letterSpacing: "0.05em", textTransform: "uppercase",
              cursor: running || !ligne1.trim() ? "default" : "pointer",
              opacity: running || !ligne1.trim() || (mode === "mono" ? !couleurId : !paletteId) ? 0.5 : 1,
              display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
            }}
          >
            {running ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
            {running ? "Calcul…" : "Lancer l'attribution"}
          </button>

          {err && <div style={errBox}><AlertTriangle size={14} /> {err}</div>}
        </div>

        {/* ============ COLONNE DROITE — Résultat ============ */}
        <div style={{ position: "sticky", top: 16 }}>
          {!result && !running && (
            <div style={{ padding: 60, textAlign: "center", background: "var(--hub-bg)", border: "1px dashed var(--hub-border)", borderRadius: 14 }}>
              <Sparkles size={32} strokeWidth={1.2} style={{ opacity: 0.3, marginBottom: 12 }} />
              <p style={{ fontFamily: "var(--font-sans)", fontSize: 13, opacity: 0.6, margin: 0 }}>
                Configure les inputs à gauche puis lance l&apos;attribution.
              </p>
            </div>
          )}

          {result && (
            <ResultPanel
              result={result}
              fils={filsById}
              typo={typo}
              bgFond={bgFond}
              setBgFond={setBgFond}
              mode={mode}
              onSaveLib={saveToLibrary}
              savingLib={savingLib}
              onDownloadPdf={() => {
                if (!result) return;
                let paletteLabel: string | undefined;
                if (mode === "palette") {
                  const p = palettes.find((x) => x.id === paletteId);
                  if (p) paletteLabel = `Palette ${p.nom}`;
                } else if (mode === "mono") {
                  const f = fils.find((x) => x.id === couleurId);
                  if (f) paletteLabel = `Monochrome · ${f.nom}`;
                }
                const motif = motifs.find((m) => m.id === motifId);
                const usedFils = result.distribution
                  .map((d) => filsById.get(d.couleur_id))
                  .filter((f): f is HubFil => Boolean(f));
                const payload = {
                  texte_lignes: result.texte_lignes,
                  typo_id: typoId,
                  bg_fond: bgFond,
                  fils: usedFils.map((f) => ({
                    id: f.id, nom: f.nom, hex: f.hex,
                    code_gunold: f.code_gunold,
                    pantone_tpg: f.pantone_tpg,
                    canonique: f.canonique,
                  })),
                  result: {
                    attribution: result.attribution,
                    positions: result.positions,
                    score: result.score,
                    seed: result.seed,
                    distribution: result.distribution,
                  },
                  meta: {
                    mode,
                    motif_id: motifId || undefined,
                    motif_nom: motif?.nom_commercial,
                    palette_label: paletteLabel,
                  },
                };
                try {
                  localStorage.setItem("ypersoa_attribution_print", JSON.stringify(payload));
                  window.open("/atelier-production/attribution/print", "_blank", "noopener,noreferrer");
                } catch (e) {
                  alert(e instanceof Error ? e.message : String(e));
                }
              }}
            />
          )}
        </div>
      </div>

      <LibrarySection
        library={library}
        fils={filsById}
        onRestore={restoreFromLibrary}
        onDelete={deleteFromLibrary}
        onRename={async (id, name) => {
          await fetch(`/api/da/attribution-library?id=${encodeURIComponent(id)}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name }),
          });
          await loadLibrary();
        }}
      />
    </div>
  );
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function buildSvg(
  result: AttributionResultUI,
  fils: Map<string, HubFil>,
  typo: { id: TypoId; label: string; fontFamily: string },
  bgFond: string,
): string {
  const charsByLine = new Map<number, Array<{ caractere: string; couleurId: string; indice: number }>>();
  for (let idx = 0; idx < result.positions.length; idx++) {
    const p = result.positions[idx];
    const arr = charsByLine.get(p.ligne) || [];
    arr.push({ caractere: p.caractere, couleurId: result.attribution[idx], indice: p.indice });
    charsByLine.set(p.ligne, arr);
  }
  for (const arr of charsByLine.values()) arr.sort((a, b) => a.indice - b.indice);

  const lines = Array.from(charsByLine.entries()).sort((a, b) => a[0] - b[0]);
  const fontSize = 84;
  const lineHeight = fontSize * 1.18;
  const padding = 48;
  // Largeur : prend la ligne max, approx ~ 0.65 * fontSize par char
  const maxChars = Math.max(...lines.map(([, arr]) => arr.length));
  const w = Math.max(560, maxChars * fontSize * 0.7 + padding * 2);
  const h = lines.length * lineHeight + padding * 2;

  // Pour chaque ligne, on construit un <text> avec des <tspan> coloré par char
  const yStart = padding + fontSize * 0.85;
  const safeFamily = typo.fontFamily.replace(/"/g, "'");
  const lineSpacing = LETTER_SPACING_BY_TYPO[typo.id] ?? "0.02em";

  const textSvg = lines.map(([, arr], li) => {
    const y = yStart + li * lineHeight;
    const tspans = arr.map(({ caractere, couleurId }) => {
      const fil = fils.get(couleurId);
      const color = fil?.hex || "#888";
      const stroke = adjustColorHex(color, -30);
      return `<tspan fill="${color}" stroke="${stroke}" stroke-width="0.6">${escapeXml(caractere)}</tspan>`;
    }).join("");
    return `<text x="${w / 2}" y="${y}" text-anchor="middle" font-family="${safeFamily}" font-size="${fontSize}" font-weight="900" letter-spacing="${lineSpacing}">${tspans}</text>`;
  }).join("\n");

  // Font import pour fidélité (Google Fonts CSS inline)
  const GOOGLE_IMPORTS: Record<TypoId, string> = {
    russ_times:    `@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@900&display=swap');`,
    arial_rounded: `@import url('https://fonts.googleapis.com/css2?family=Nunito:wght@900&display=swap');`,
    looney:        `@import url('https://fonts.googleapis.com/css2?family=Fredoka:wght@600;700&display=swap');`,
    diana:         `@import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@700;900&display=swap');`,
    museo:         `@import url('https://fonts.googleapis.com/css2?family=Josefin+Sans:wght@600;700&display=swap');`,
    script_new:    `@import url('https://fonts.googleapis.com/css2?family=Allura&family=Great+Vibes&display=swap');`,
  };
  const googleImport = GOOGLE_IMPORTS[typo.id];

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs><style>${googleImport}</style></defs>
  <rect width="${w}" height="${h}" fill="${bgFond}"/>
  ${textSvg}
</svg>`;
}

function escapeXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

function adjustColorHex(hex: string, amount: number): string {
  const num = parseInt(hex.replace("#", ""), 16);
  let r = (num >> 16) + amount;
  let g = ((num >> 8) & 0x00FF) + amount;
  let b = (num & 0x0000FF) + amount;
  r = Math.max(0, Math.min(255, r));
  g = Math.max(0, Math.min(255, g));
  b = Math.max(0, Math.min(255, b));
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

async function svgToPng(svg: string, scale = 2): Promise<Blob> {
  const blobSvg = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blobSvg);
  try {
    const img = new Image();
    await new Promise<void>((res, rej) => {
      img.onload = () => res();
      img.onerror = () => rej(new Error("Failed to load SVG as image"));
      img.src = url;
    });
    const canvas = document.createElement("canvas");
    canvas.width = img.width * scale;
    canvas.height = img.height * scale;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D context unavailable");
    ctx.scale(scale, scale);
    ctx.drawImage(img, 0, 0);
    return await new Promise<Blob>((res, rej) => {
      canvas.toBlob((b) => b ? res(b) : rej(new Error("PNG export failed")), "image/png");
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

function ResultPanel({
  result, fils, typo, bgFond, setBgFond, mode, onSaveLib, savingLib, onDownloadPdf,
}: {
  result: AttributionResultUI;
  fils: Map<string, HubFil>;
  typo: { id: TypoId; label: string; fontFamily: string };
  bgFond: string;
  setBgFond: (s: string) => void;
  mode: "mono" | "palette";
  onSaveLib: () => Promise<void>;
  savingLib: boolean;
  onDownloadPdf: () => void;
}) {
  const hasViolations = result.violations_dures.length > 0;
  // Itère le TEXTE ORIGINAL (espaces inclus) et map chaque caractère non-espace à sa couleur
  // via les positions/attribution. Permet d'afficher les espaces dans la preview.
  const renderableLines = useMemo(() => {
    // Construit un index : pour chaque (ligne, indice_dans_chars_filtrés), la couleur
    const colorByLineAndIndice = new Map<string, string>();
    for (let idx = 0; idx < result.positions.length; idx++) {
      const p = result.positions[idx];
      colorByLineAndIndice.set(`${p.ligne}:${p.indice}`, result.attribution[idx]);
    }
    return result.texte_lignes.map((ligne, lineIdx) => {
      let indice = 0;
      return {
        lineIdx,
        chars: [...ligne].map((c, charPos) => {
          if (c === " ") return { char: c, color: null as string | null, key: `${lineIdx}-sp-${charPos}` };
          const color = colorByLineAndIndice.get(`${lineIdx}:${indice}`) || null;
          indice++;
          return { char: c, color, key: `${lineIdx}-${charPos}` };
        }),
      };
    });
  }, [result]);

  // Conservation de positionsByLine pour le plan d'aiguille (qui n'a pas besoin des espaces)
  const positionsByLine = useMemo(() => {
    const m = new Map<number, Array<{ idx: number; caractere: string; couleurId: string; indice: number }>>();
    for (let idx = 0; idx < result.positions.length; idx++) {
      const p = result.positions[idx];
      const cid = result.attribution[idx];
      const arr = m.get(p.ligne) || [];
      arr.push({ idx, caractere: p.caractere, couleurId: cid, indice: p.indice });
      m.set(p.ligne, arr);
    }
    for (const arr of m.values()) arr.sort((a, b) => a.indice - b.indice);
    return m;
  }, [result]);

  return (
    <div style={{ display: "grid", gap: 16 }}>
      {/* Bandeau score */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 16px", background: hasViolations ? "#FCE6E5" : "#E5F0E8", border: `0.5px solid ${hasViolations ? "#a13a16" : "#2f7a3e"}`, borderRadius: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: "var(--font-sans)", fontSize: 13, fontWeight: 500, color: hasViolations ? "#a13a16" : "#2f7a3e" }}>
          {hasViolations ? <AlertTriangle size={14} /> : <Check size={14} />}
          {hasViolations ? "Violations dures détectées" : "Attribution valide — 0 violation"}
        </div>
        <div style={{ fontFamily: "var(--font-mono, monospace)", fontSize: 12, opacity: 0.8 }}>
          Score : <strong>{result.score == null || result.score === -Infinity || !Number.isFinite(result.score) ? "−∞" : result.score.toFixed(3)}</strong>
          <span style={{ opacity: 0.5, marginLeft: 8 }}>seed {result.seed}</span>
        </div>
      </div>

      {hasViolations && (
        <ul style={{ margin: 0, padding: "8px 16px 8px 32px", fontFamily: "var(--font-sans)", fontSize: 11, color: "#a13a16", background: "#FCE6E5", borderRadius: 10 }}>
          {result.violations_dures.map((v, i) => (<li key={i}>{v}</li>))}
        </ul>
      )}

      {/* Actions sauvegarde + télécharger */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button
          type="button" onClick={onSaveLib} disabled={savingLib || hasViolations}
          title={hasViolations ? "Résultat invalide, corrige avant de sauvegarder" : "Ajoute à la bibliothèque"}
          style={ctaBtnStyle(savingLib || hasViolations)}
        >
          {savingLib ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />} Sauvegarder
        </button>
        <button
          type="button"
          onClick={() => {
            const svg = buildSvg(result, fils, typo, bgFond);
            const slug = result.texte_lignes.join("-").replace(/\s+/g, "_").replace(/[^a-zA-Z0-9_-]/g, "");
            downloadBlob(new Blob([svg], { type: "image/svg+xml" }), `attribution-${slug}-${typo.id}.svg`);
          }}
          style={ctaBtnStyle(false, "secondary")}
        >
          <Download size={13} /> SVG
        </button>
        <button
          type="button"
          onClick={onDownloadPdf}
          style={ctaBtnStyle(false, "secondary")}
        >
          <FileImage size={13} /> PDF
        </button>
      </div>

      {/* Preview broderie */}
      <article style={{ border: "0.5px solid var(--hub-border)", borderRadius: 14, overflow: "hidden", background: "white" }}>
        <header style={{ padding: "10px 18px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "0.5px solid var(--hub-border)" }}>
          <span style={{ fontFamily: "var(--font-sans)", fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", opacity: 0.55 }}>
            Preview · {typo.label}
          </span>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <span style={{ fontFamily: "var(--font-sans)", fontSize: 10, opacity: 0.55 }}>Fond :</span>
            <input type="color" value={bgFond} onChange={(e) => setBgFond(e.target.value)} style={{ width: 28, height: 22, padding: 0, border: "0.5px solid var(--hub-border)", borderRadius: 4, cursor: "pointer" }} />
          </div>
        </header>
        <div style={{
          background: bgFond, padding: "48px 24px",
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8,
          minHeight: 280,
          backgroundImage: "linear-gradient(rgba(0,0,0,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.025) 1px, transparent 1px)",
          backgroundSize: "3px 3px",
        }}>
          {renderableLines.map(({ lineIdx, chars }) => (
            <div key={lineIdx} style={{
              display: "flex", justifyContent: "center",
              fontFamily: typo.fontFamily, fontWeight: 900,
              fontSize: 64, lineHeight: 1,
              letterSpacing: LETTER_SPACING_BY_TYPO[typo.id],
              whiteSpace: "pre",
            }}>
              {chars.map(({ char, color, key }) => {
                if (char === " ") {
                  // Rendu en-place de l'espace (largeur preservée par le letter-spacing)
                  return <span key={key} style={{ display: "inline-block", width: "0.4em" }}>&nbsp;</span>;
                }
                const c = color ? fils.get(color)?.hex || "#888" : "#888";
                return (
                  <span key={key} style={broderieStyle(c)}>
                    {char}
                  </span>
                );
              })}
            </div>
          ))}
        </div>

        {/* === LÉGENDE COMPACTE : Distribution + Ordre de broderie === */}
        <CompactLegend result={result} fils={fils} />
      </article>

      {mode === "palette" && (
        <p style={{ fontFamily: "var(--font-sans)", fontSize: 10, opacity: 0.5, textAlign: "center", margin: 0 }}>
          Le code Gunold est masqué côté client B2C. Visible ici en vue prod uniquement.
        </p>
      )}
    </div>
  );
}

function SwapFilInline({
  currentFilId, fils, onPick, onCancel,
}: {
  currentFilId: string;
  fils: HubFil[];
  onPick: (filId: string) => void;
  onCancel: () => void;
}) {
  const [query, setQuery] = useState("");
  const candidates = useMemo(() => {
    const q = query.trim().toLowerCase();
    return fils
      .filter((f) => f.id !== currentFilId)
      .filter((f) => !q || f.nom.toLowerCase().includes(q) || (f.code_gunold || "").toLowerCase().includes(q))
      .sort((a, b) => {
        // 1) canoniques TMEZ en tête, 2) puis alphabétique
        if (!!a.canonique !== !!b.canonique) return a.canonique ? -1 : 1;
        return a.nom.localeCompare(b.nom);
      });
  }, [fils, currentFilId, query]);

  const firstNonCanonIdx = useMemo(
    () => candidates.findIndex((f) => !f.canonique),
    [candidates]
  );

  return (
    <div style={{
      marginTop: 8, padding: 10,
      background: "white", border: "1px dashed var(--hub-border)", borderRadius: 8,
      display: "grid", gap: 6,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontFamily: "var(--font-sans)", fontSize: 9, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", opacity: 0.55 }}>
          Remplacer le fil
        </span>
        <button type="button" onClick={onCancel} style={{
          background: "transparent", border: "none", cursor: "pointer",
          fontSize: 11, color: "var(--hub-foreground)", opacity: 0.6, padding: 0,
        }}>✕</button>
      </div>
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Filtrer par nom ou code Gunold…"
        autoFocus
        style={{
          padding: "5px 8px", border: "0.5px solid var(--hub-border)", borderRadius: 5,
          fontFamily: "var(--font-sans)", fontSize: 11, background: "var(--hub-bg)",
        }}
      />
      <div style={{ display: "grid", gap: 4, maxHeight: 240, overflow: "auto" }}>
        {candidates.length > 0 && candidates[0].canonique && (
          <div style={groupHeaderStyle}>★ Canoniques TMEZ — {candidates.filter((f) => f.canonique).length}</div>
        )}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: 4 }}>
          {candidates.filter((f) => f.canonique).map((f) => (
            <SwapFilButton key={f.id} fil={f} onPick={onPick} canon />
          ))}
        </div>
        {firstNonCanonIdx > 0 && firstNonCanonIdx < candidates.length && (
          <div style={groupHeaderStyle}>Gamme étendue — {candidates.filter((f) => !f.canonique).length}</div>
        )}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: 4 }}>
          {candidates.filter((f) => !f.canonique).map((f) => (
            <SwapFilButton key={f.id} fil={f} onPick={onPick} />
          ))}
        </div>
        {candidates.length === 0 && (
          <p style={{ fontSize: 10, opacity: 0.5, fontStyle: "italic", margin: 0 }}>
            Aucun fil trouvé.
          </p>
        )}
      </div>
    </div>
  );
}

function SwapFilButton({ fil, onPick, canon }: { fil: HubFil; onPick: (id: string) => void; canon?: boolean }) {
  return (
    <button
      type="button"
      onClick={() => onPick(fil.id)}
      style={{
        display: "flex", alignItems: "center", gap: 5,
        padding: "4px 6px", borderRadius: 5,
        background: "var(--hub-bg)",
        border: canon ? "0.5px solid #1E2D4A" : "0.5px solid var(--hub-border)",
        cursor: "pointer", textAlign: "left",
        fontFamily: "var(--font-sans)",
      }}
      title={`${fil.nom} · ${fil.code_gunold || ""}${canon ? " · canonique TMEZ" : ""}`}
    >
      {canon && <span style={{ color: "#1E2D4A", fontSize: 9, fontWeight: 700 }}>★</span>}
      <span style={{
        width: 16, height: 16, borderRadius: "50%", background: fil.hex,
        border: "0.5px solid rgba(0,0,0,0.08)", flexShrink: 0,
      }} />
      <span style={{ flex: 1, minWidth: 0, fontSize: 10, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {fil.nom}
      </span>
    </button>
  );
}

const groupHeaderStyle: React.CSSProperties = {
  fontFamily: "var(--font-sans)", fontSize: 9, fontWeight: 600,
  letterSpacing: "0.08em", textTransform: "uppercase", opacity: 0.5,
  marginTop: 4, marginBottom: 2,
};

function CompactLegend({
  result, fils,
}: {
  result: AttributionResultUI;
  fils: Map<string, HubFil>;
}) {
  // Numéro d'aiguille par fil (ordre d'apparition dans le texte)
  const aiguilleByFil = useMemo(() => {
    const m = new Map<string, number>();
    for (let idx = 0; idx < result.positions.length; idx++) {
      const cid = result.attribution[idx];
      if (!m.has(cid)) m.set(cid, m.size + 1);
    }
    return m;
  }, [result]);

  // Lignes (positions groupées par ligne, sans espaces)
  const positionsByLine = useMemo(() => {
    const m = new Map<number, Array<{ idx: number; caractere: string; couleurId: string; indice: number }>>();
    for (let idx = 0; idx < result.positions.length; idx++) {
      const p = result.positions[idx];
      const cid = result.attribution[idx];
      const arr = m.get(p.ligne) || [];
      arr.push({ idx, caractere: p.caractere, couleurId: cid, indice: p.indice });
      m.set(p.ligne, arr);
    }
    for (const arr of m.values()) arr.sort((a, b) => a.indice - b.indice);
    return m;
  }, [result]);

  const totalChars = result.distribution.reduce((s, d) => s + d.count, 0);

  return (
    <footer style={{
      padding: "12px 16px", borderTop: "0.5px solid var(--hub-border)",
      display: "grid", gap: 10, background: "#FCFAF7",
    }}>
      {/* Distribution compacte */}
      <div>
        <div style={legendTitleStyle}>
          Distribution · {result.distribution.length} fil{result.distribution.length > 1 ? "s" : ""}
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {result.distribution.map(({ couleur_id, count }) => {
            const fil = fils.get(couleur_id);
            const num = aiguilleByFil.get(couleur_id);
            const pct = Math.round((count / totalChars) * 100);
            return (
              <div key={couleur_id} style={{
                display: "inline-flex", alignItems: "center", gap: 5,
                padding: "3px 8px 3px 6px", borderRadius: 999,
                background: "white", border: "0.5px solid var(--hub-border)",
                fontFamily: "var(--font-sans)", fontSize: 10,
              }}>
                <span style={{ fontFamily: "var(--font-mono, monospace)", fontWeight: 700, opacity: 0.5, fontSize: 9 }}>{num}</span>
                <span style={{ width: 10, height: 10, borderRadius: "50%", background: fil?.hex || "#888", border: "0.5px solid rgba(0,0,0,0.1)", flexShrink: 0 }} />
                <span style={{ fontWeight: 500 }}>{fil?.nom || couleur_id}</span>
                <span style={{ opacity: 0.5, fontFamily: "var(--font-mono, monospace)", fontSize: 9 }}>× {count}</span>
                <span style={{ opacity: 0.4, fontSize: 9 }}>({pct}%)</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Ordre de broderie compact (lettre + n° aiguille) par ligne */}
      <div>
        <div style={legendTitleStyle}>Ordre de broderie</div>
        <div style={{ display: "grid", gap: 4 }}>
          {Array.from(positionsByLine.entries()).sort((a, b) => a[0] - b[0]).map(([lineIdx, chars]) => (
            <div key={lineIdx} style={{ display: "flex", gap: 3, alignItems: "flex-start" }}>
              <span style={{ fontFamily: "var(--font-mono, monospace)", fontSize: 8, opacity: 0.4, letterSpacing: "0.06em", textTransform: "uppercase", marginRight: 4, alignSelf: "center", minWidth: 14 }}>
                L{lineIdx + 1}
              </span>
              {chars.map(({ idx, caractere, couleurId }) => {
                const num = aiguilleByFil.get(couleurId);
                const fil = fils.get(couleurId);
                return (
                  <div key={idx} style={{
                    display: "flex", flexDirection: "column", alignItems: "center",
                    padding: "2px 4px", borderRadius: 3, background: "white",
                    border: "0.5px solid rgba(0,0,0,0.06)", minWidth: 16,
                  }}>
                    <span style={{
                      fontSize: 11, fontWeight: 700, fontFamily: "Georgia, serif",
                      color: fil?.hex || "#1A1614", lineHeight: 1,
                    }}>{caractere}</span>
                    <span style={{
                      fontFamily: "var(--font-mono, monospace)", fontSize: 8, fontWeight: 600,
                      opacity: 0.6, marginTop: 1,
                    }}>{num}</span>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </footer>
  );
}

const legendTitleStyle: React.CSSProperties = {
  fontFamily: "var(--font-sans)", fontSize: 9, fontWeight: 600,
  letterSpacing: "0.08em", textTransform: "uppercase", opacity: 0.5,
  marginBottom: 6,
};

function FilSelect({
  label, value, onChange, fils, filsById, allowEmpty,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  fils: HubFil[];
  filsById: Map<string, HubFil>;
  allowEmpty?: string;
}) {
  const selectedFil = value ? filsById.get(value) : null;
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      <div style={{ display: "grid", gridTemplateColumns: "32px 1fr", gap: 6, alignItems: "center" }}>
        <span style={{
          width: 32, height: 32, borderRadius: "50%",
          background: selectedFil?.hex || "var(--hub-bg)",
          border: "0.5px solid var(--hub-border)",
        }} />
        <select value={value} onChange={(e) => onChange(e.target.value)} style={inputStyle}>
          {allowEmpty && <option value="">{allowEmpty}</option>}
          {fils.map((f) => (
            <option key={f.id} value={f.id}>{f.nom}</option>
          ))}
        </select>
      </div>
    </div>
  );
}

function PaletteSelect({
  label, value, onChange, palettes, fils,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  palettes: Palette[];
  fils: HubFil[];
}) {
  const selected = palettes.find((p) => p.id === value);
  const filsObjs = selected
    ? selected.fils.map((id) => fils.find((f) => f.id === id)).filter((f): f is HubFil => Boolean(f))
    : [];
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)} style={inputStyle}>
        {palettes.map((p) => (
          <option key={p.id} value={p.id}>{p.nom} ({p.fils.length} fils)</option>
        ))}
      </select>
      {filsObjs.length > 0 && (
        <div style={{ display: "flex", height: 28, borderRadius: 6, overflow: "hidden", marginTop: 6, border: "0.5px solid var(--hub-border)" }}>
          {filsObjs.map((f) => (
            <div key={f.id} title={f.nom} style={{ flex: 1, background: f.hex }} />
          ))}
        </div>
      )}
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <article style={{ background: "white", border: "0.5px solid var(--hub-border)", borderRadius: 12, padding: 16 }}>
      <h3 style={{ fontFamily: "var(--font-sans)", fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", opacity: 0.55, margin: "0 0 10px 0" }}>{title}</h3>
      {children}
    </article>
  );
}

function broderieStyle(color: string): React.CSSProperties {
  return {
    color,
    textShadow: [
      `-0.5px -0.5px 0 ${adjustColor(color, 35)}`,
      `0.5px 0.5px 0 ${adjustColor(color, -25)}`,
      `0 1.5px 2px rgba(0,0,0,0.18)`,
    ].join(", "),
    WebkitTextStroke: `0.3px ${adjustColor(color, -30)}`,
  };
}

function adjustColor(hex: string, amount: number): string {
  const num = parseInt(hex.replace("#", ""), 16);
  let r = (num >> 16) + amount;
  let g = ((num >> 8) & 0x00FF) + amount;
  let b = (num & 0x0000FF) + amount;
  r = Math.max(0, Math.min(255, r));
  g = Math.max(0, Math.min(255, g));
  b = Math.max(0, Math.min(255, b));
  return `rgb(${r},${g},${b})`;
}

const inputStyle: React.CSSProperties = {
  padding: "8px 10px",
  border: "0.5px solid var(--hub-border)",
  borderRadius: 8,
  fontFamily: "var(--font-sans)",
  fontSize: 13,
  background: "white",
  width: "100%",
  boxSizing: "border-box",
};
const labelStyle: React.CSSProperties = {
  fontFamily: "var(--font-sans)", fontSize: 10, fontWeight: 600,
  letterSpacing: "0.06em", textTransform: "uppercase", opacity: 0.6,
  display: "block", marginBottom: 4,
};
const miniStyle: React.CSSProperties = {
  fontFamily: "var(--font-sans)", fontSize: 10, opacity: 0.5, fontStyle: "italic",
  margin: "6px 0 0 0",
};
const errBox: React.CSSProperties = {
  display: "flex", alignItems: "center", gap: 8,
  padding: "10px 14px", borderRadius: 10,
  background: "#FCE6E5", color: "#a13a16",
  fontFamily: "var(--font-sans)", fontSize: 12,
};

function modeBtn(active: boolean): React.CSSProperties {
  return {
    padding: "7px 10px", borderRadius: 8,
    background: active ? "var(--hub-foreground)" : "white",
    color: active ? "var(--hub-bg)" : "var(--hub-foreground)",
    border: "0.5px solid var(--hub-border)",
    fontFamily: "var(--font-sans)", fontSize: 11, fontWeight: 500,
    cursor: "pointer",
  };
}

function ctaBtnStyle(disabled: boolean, variant: "primary" | "secondary" = "primary"): React.CSSProperties {
  return {
    display: "inline-flex", alignItems: "center", gap: 6,
    padding: "8px 14px", borderRadius: 999,
    background: variant === "primary" ? "var(--hub-foreground)" : "white",
    color: variant === "primary" ? "var(--hub-bg)" : "var(--hub-foreground)",
    border: variant === "primary" ? "none" : "0.5px solid var(--hub-border)",
    fontFamily: "var(--font-sans)", fontSize: 12, fontWeight: 500,
    cursor: disabled ? "default" : "pointer",
    opacity: disabled ? 0.5 : 1,
  };
}

function LibrarySection({
  library, fils, onRestore, onDelete, onRename,
}: {
  library: AttributionLibEntry[];
  fils: Map<string, HubFil>;
  onRestore: (entry: AttributionLibEntry) => void;
  onDelete: (id: string, name: string) => Promise<void>;
  onRename: (id: string, name: string) => Promise<void>;
}) {
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  return (
    <section style={{ marginTop: 56, paddingTop: 24, borderTop: "0.5px solid var(--hub-border)" }}>
      <h2 style={{ fontFamily: "var(--font-editorial)", fontSize: 22, fontWeight: 500, margin: "0 0 16px 0", display: "inline-flex", alignItems: "center", gap: 10 }}>
        <FolderOpen size={18} strokeWidth={1.4} /> Bibliothèque
        <span style={{ fontFamily: "var(--font-sans)", fontSize: 12, fontWeight: 400, opacity: 0.55 }}>
          {library.length} attribution{library.length > 1 ? "s" : ""} sauvegardée{library.length > 1 ? "s" : ""}
        </span>
      </h2>
      {library.length === 0 ? (
        <p style={{ fontFamily: "var(--font-sans)", fontSize: 12, opacity: 0.55, fontStyle: "italic", margin: 0, padding: "16px 0" }}>
          Aucune attribution sauvegardée. Lance une attribution puis click <em>Sauvegarder</em>.
        </p>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
          {library.map((entry) => {
            const filsObjs = entry.result.distribution
              .map((d) => fils.get(d.couleur_id))
              .filter((f): f is HubFil => Boolean(f));
            return (
              <article key={entry.id} style={{ background: "white", border: "0.5px solid var(--hub-border)", borderRadius: 12, overflow: "hidden" }}>
                <div style={{ display: "flex", height: 42 }}>
                  {filsObjs.map((f, i) => (
                    <div key={i} style={{ flex: 1, background: f.hex }} />
                  ))}
                </div>
                <div style={{ padding: 12 }}>
                  {renamingId === entry.id ? (
                    <form onSubmit={async (e) => {
                      e.preventDefault();
                      await onRename(entry.id, renameValue);
                      setRenamingId(null);
                    }}>
                      <input
                        autoFocus
                        type="text"
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onBlur={() => setRenamingId(null)}
                        style={{ width: "100%", padding: "4px 6px", border: "0.5px solid var(--hub-border)", borderRadius: 6, fontFamily: "var(--font-sans)", fontSize: 13, fontWeight: 600, boxSizing: "border-box" }}
                      />
                    </form>
                  ) : (
                    <h4 style={{ fontFamily: "var(--font-editorial)", fontSize: 15, fontWeight: 500, margin: "0 0 4px 0", lineHeight: 1.2 }}>
                      {entry.name}
                    </h4>
                  )}
                  <p style={{ fontFamily: "var(--font-sans)", fontSize: 11, opacity: 0.55, margin: 0 }}>
                    {entry.texte_lignes.join(" / ")} · {entry.mode === "mono" ? "mono" : "multi"} · score {Number.isFinite(entry.result?.score) ? entry.result.score.toFixed(2) : "—"} · {entry.created_at}
                  </p>
                  <div style={{ display: "flex", gap: 4, marginTop: 8 }}>
                    <button
                      type="button"
                      onClick={() => onRestore(entry)}
                      style={{ flex: 1, padding: "5px 10px", borderRadius: 999, background: "var(--hub-foreground)", color: "var(--hub-bg)", border: "none", fontFamily: "var(--font-sans)", fontSize: 11, fontWeight: 500, cursor: "pointer" }}
                    >
                      Restaurer
                    </button>
                    <button
                      type="button"
                      onClick={() => { setRenamingId(entry.id); setRenameValue(entry.name); }}
                      title="Renommer"
                      style={{ padding: "5px 8px", borderRadius: 999, background: "white", color: "var(--hub-foreground)", border: "0.5px solid var(--hub-border)", cursor: "pointer" }}
                    >
                      <Pencil size={11} />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(entry.id, entry.name)}
                      title="Supprimer"
                      style={{ padding: "5px 8px", borderRadius: 999, background: "white", color: "var(--hub-foreground)", border: "0.5px solid var(--hub-border)", cursor: "pointer", opacity: 0.6 }}
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
