"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
  Sparkles,
  FileText,
  Download,
  Edit3,
  Check,
  X,
  Trash2,
} from "lucide-react";
import type { StudioMoodEpisode, StatutEpisode, GeneratedCopy, Storyboard } from "@/lib/studio-mood/types";
import { STATUT_META, SUPPORT_LABELS } from "@/lib/studio-mood/types";

const STATUT_ORDER: StatutEpisode[] = ["brouillon", "ready", "tourne", "monte", "publie"];

export default function EpisodeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [ep, setEp] = useState<StudioMoodEpisode | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generatingCopy, setGeneratingCopy] = useState(false);
  const [copyResult, setCopyResult] = useState<GeneratedCopy | null>(null);
  const [generatingStoryboard, setGeneratingStoryboard] = useState(false);
  const [storyboard, setStoryboard] = useState<Storyboard | null>(null);
  const [editingStatut, setEditingStatut] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/studio-mood/${id}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.message ?? "Épisode introuvable");
      setEp(json.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]);

  const handleGenerateCopy = async () => {
    if (!ep) return;
    setGeneratingCopy(true);
    setCopyResult(null);
    try {
      const res = await fetch(`/api/studio-mood/${id}/generate-copy`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message ?? "Erreur génération");
      setCopyResult(json.data.copy);
      setEp(json.data.episode);
    } catch (e) {
      alert(e instanceof Error ? e.message : String(e));
    } finally {
      setGeneratingCopy(false);
    }
  };

  const handleGenerateStoryboard = async () => {
    if (!ep) return;
    setGeneratingStoryboard(true);
    try {
      const res = await fetch(`/api/studio-mood/${id}/storyboard`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.message ?? "Erreur storyboard");
      setStoryboard(json.data);
      setEp((prev) => prev ? { ...prev, storyboard_md: json.markdown, storyboard_exported_at: new Date().toISOString() } : prev);
    } catch (e) {
      alert(e instanceof Error ? e.message : String(e));
    } finally {
      setGeneratingStoryboard(false);
    }
  };

  const handleDownloadStoryboard = async () => {
    const res = await fetch(`/api/studio-mood/${id}/storyboard?format=md`);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `storyboard-${ep?.titre?.replace(/\s+/g, "-").toLowerCase() ?? id}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleStatutChange = async (s: StatutEpisode) => {
    setEditingStatut(false);
    if (!ep || ep.statut === s) return;
    try {
      const res = await fetch(`/api/studio-mood/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ statut: s }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message);
      setEp(json.data);
    } catch (e) {
      alert(e instanceof Error ? e.message : String(e));
    }
  };

  const handleDelete = async () => {
    if (!confirm("Supprimer cet épisode définitivement ?")) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/studio-mood/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Suppression échouée");
      window.location.href = "/atelier-da/studio-mood";
    } catch (e) {
      alert(e instanceof Error ? e.message : String(e));
      setDeleting(false);
    }
  };

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: 32, color: "#888" }}>
      <Loader2 size={18} className="animate-spin" /> Chargement…
    </div>
  );

  if (error || !ep) return (
    <div style={{ padding: 32 }}>
      <Link href="/atelier-da/studio-mood" style={backLinkStyle}><ArrowLeft size={14} /> Studio Mood</Link>
      <div style={errorBoxStyle}><AlertCircle size={16} />{error ?? "Épisode introuvable"}</div>
    </div>
  );

  const meta = STATUT_META[ep.statut];

  return (
    <div style={{ maxWidth: 960, margin: "0 auto" }}>
      <Link href="/atelier-da/studio-mood" style={backLinkStyle}>
        <ArrowLeft size={14} strokeWidth={1.6} /> Studio Mood
      </Link>

      {/* Header */}
      <header style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8, flexWrap: "wrap" }}>
          {/* Statut éditable */}
          <div style={{ position: "relative" }}>
            <button
              onClick={() => setEditingStatut(!editingStatut)}
              style={{ ...badgeStyle, background: meta.bg, color: meta.fg, cursor: "pointer", border: "none" }}
            >
              {meta.label} ▾
            </button>
            {editingStatut && (
              <div style={dropdownStyle}>
                {STATUT_ORDER.map((s) => (
                  <button key={s} onClick={() => handleStatutChange(s)} style={dropdownItemStyle}>
                    <span style={{ ...badgeStyle, background: STATUT_META[s].bg, color: STATUT_META[s].fg, fontSize: 11 }}>
                      {STATUT_META[s].label}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <span style={{ fontSize: 13, opacity: 0.5, fontFamily: "var(--font-sans)" }}>
            {SUPPORT_LABELS[ep.support as keyof typeof SUPPORT_LABELS] ?? ep.support}
            {ep.couleur_produit && ` · ${ep.couleur_produit}`}
          </span>
          {ep.occasion && <span style={tagStyle}>{ep.occasion}</span>}
          {ep.ampli_saisonnier && <span style={{ ...tagStyle, background: "#EDF8EF", color: "#1D6130" }}>{ep.ampli_saisonnier}</span>}
        </div>

        <h1 style={h1Style}>{ep.titre}</h1>

        <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
          <button onClick={handleGenerateCopy} disabled={generatingCopy} style={primaryBtnStyle}>
            {generatingCopy ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
            {generatingCopy ? "Génération…" : "Générer hook + légende"}
          </button>
          <button onClick={handleGenerateStoryboard} disabled={generatingStoryboard} style={secondaryBtnStyle}>
            {generatingStoryboard ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />}
            {generatingStoryboard ? "Calcul…" : "Générer storyboard"}
          </button>
          {ep.storyboard_md && (
            <button onClick={handleDownloadStoryboard} style={secondaryBtnStyle}>
              <Download size={14} /> Télécharger .md
            </button>
          )}
          <Link href={`/atelier-da/studio-mood/${id}/edit`} style={secondaryBtnStyle}>
            <Edit3 size={14} /> Modifier
          </Link>
          <button onClick={handleDelete} disabled={deleting} style={dangerBtnStyle}>
            {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
          </button>
        </div>
      </header>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        {/* Colonne gauche — informations + copy */}
        <div>
          {/* Carte épisode */}
          <section style={sectionStyle}>
            <h2 style={sectionTitleStyle}>Épisode</h2>
            <InfoRow label="Humeur" value={ep.humeur} />
            <InfoRow label="Mot brodé" value={`"${ep.mot_brode}"`} large />
            {ep.motif_ypm_nom && <InfoRow label="Motif YPM" value={`${ep.motif_ypm_id} — ${ep.motif_ypm_nom}`} />}
            {ep.decor && <InfoRow label="Décor / mise en scène" value={ep.decor} />}
          </section>

          {/* Copy générée */}
          {(ep.hook || ep.legende_question || copyResult) && (
            <section style={sectionStyle}>
              <h2 style={sectionTitleStyle}>
                Copy
                {copyResult && (
                  <span style={{ fontSize: 11, fontFamily: "var(--font-sans)", fontWeight: 400, marginLeft: 8, opacity: 0.6 }}>
                    via {copyResult.source}
                    {copyResult.brand_safe ? (
                      <span style={{ color: "#1D6130", marginLeft: 4 }}><Check size={11} style={{ display: "inline" }} /> brand-safe</span>
                    ) : (
                      <span style={{ color: "#B91C1C", marginLeft: 4 }}><X size={11} style={{ display: "inline" }} /> violations détectées</span>
                    )}
                  </span>
                )}
              </h2>

              {ep.hook && (
                <div style={copyBlockStyle}>
                  <p style={copyLabelStyle}>Hook stop-scroll</p>
                  <p style={copyTextStyle}>{ep.hook}</p>
                </div>
              )}

              {ep.legende_question && (
                <div style={copyBlockStyle}>
                  <p style={copyLabelStyle}>Légende + question</p>
                  <p style={{ ...copyTextStyle, whiteSpace: "pre-line" }}>{ep.legende_question}</p>
                </div>
              )}

              {ep.hashtags?.length > 0 && (
                <div style={copyBlockStyle}>
                  <p style={copyLabelStyle}>Hashtags ({ep.hashtags.length})</p>
                  <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                    {ep.hashtags.map((h, i) => (
                      <span key={i} style={hashtagPillStyle}>#{h.replace(/^#/, "")}</span>
                    ))}
                  </div>
                </div>
              )}

              {copyResult?.violations && copyResult.violations.length > 0 && (
                <div style={violationBoxStyle}>
                  <AlertCircle size={13} />
                  Termes interdits détectés : {copyResult.violations.join(", ")}
                </div>
              )}
            </section>
          )}
        </div>

        {/* Colonne droite — storyboard */}
        <div>
          {(storyboard || ep.storyboard_md) ? (
            <section style={sectionStyle}>
              <h2 style={sectionTitleStyle}>
                Storyboard
                {ep.storyboard_exported_at && (
                  <span style={{ fontSize: 11, fontFamily: "var(--font-sans)", fontWeight: 400, marginLeft: 8, opacity: 0.6 }}>
                    généré le {new Date(ep.storyboard_exported_at).toLocaleDateString("fr-FR")}
                  </span>
                )}
              </h2>
              {storyboard ? (
                <div>
                  {storyboard.frames.map((f) => (
                    <div key={f.index} style={frameStyle}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                        <span style={frameIndexStyle}>{f.index}</span>
                        <span style={frameLabelStyle}>{f.label}</span>
                        <span style={frameDureeStyle}>{f.duree_s}</span>
                      </div>
                      <p style={{ fontSize: 13, lineHeight: 1.6, whiteSpace: "pre-line", margin: "0 0 8px", color: "var(--hub-foreground)" }}>
                        {f.description}
                      </p>
                      <p style={frameMontageStyle}>📋 {f.note_montage}</p>
                    </div>
                  ))}
                </div>
              ) : ep.storyboard_md ? (
                <pre style={{ fontSize: 12, lineHeight: 1.7, whiteSpace: "pre-wrap", fontFamily: "var(--font-sans)", color: "var(--hub-foreground)", opacity: 0.85 }}>
                  {ep.storyboard_md.slice(0, 1200)}…
                </pre>
              ) : null}
            </section>
          ) : (
            <section style={{ ...sectionStyle, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 200, opacity: 0.6, gap: 10 }}>
              <FileText size={28} strokeWidth={1.2} />
              <p style={{ fontSize: 13, fontFamily: "var(--font-sans)", textAlign: "center" }}>
                Clique sur &ldquo;Générer storyboard&rdquo; pour obtenir<br />le brief de montage 4 frames.
              </p>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value, large }: { label: string; value: string; large?: boolean }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <p style={{ fontSize: 11, fontFamily: "var(--font-sans)", opacity: 0.5, margin: "0 0 2px", textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</p>
      <p style={{ fontSize: large ? 20 : 14, fontFamily: large ? "var(--font-editorial)" : "var(--font-sans)", fontWeight: large ? 600 : 400, margin: 0, color: large ? "#1E6E77" : "inherit" }}>
        {value}
      </p>
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const backLinkStyle: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 6,
  fontSize: 13, color: "var(--hub-foreground)", opacity: 0.6,
  textDecoration: "none", marginBottom: 20, fontFamily: "var(--font-sans)",
};

const h1Style: React.CSSProperties = {
  fontFamily: "var(--font-editorial)", fontSize: 30, fontWeight: 500,
  letterSpacing: "-0.015em", margin: 0, lineHeight: 1.2,
};

const primaryBtnStyle: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 6,
  padding: "8px 14px", borderRadius: 8, background: "#1E6E77",
  color: "#fff", fontSize: 13, fontWeight: 600,
  fontFamily: "var(--font-sans)", cursor: "pointer", border: "none",
};

const secondaryBtnStyle: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 6,
  padding: "8px 12px", borderRadius: 8, background: "#F0EDE8",
  color: "#5C5248", fontSize: 13, fontWeight: 500,
  fontFamily: "var(--font-sans)", cursor: "pointer", border: "none",
  textDecoration: "none",
};

const dangerBtnStyle: React.CSSProperties = {
  display: "inline-flex", alignItems: "center",
  padding: "8px 10px", borderRadius: 8,
  background: "#FEF2F2", color: "#B91C1C",
  fontSize: 13, fontFamily: "var(--font-sans)",
  cursor: "pointer", border: "none",
};

const sectionStyle: React.CSSProperties = {
  background: "#fff", border: "1px solid #EDE8E1", borderRadius: 12,
  padding: "18px 20px", marginBottom: 16,
};

const sectionTitleStyle: React.CSSProperties = {
  fontFamily: "var(--font-editorial)", fontSize: 16, fontWeight: 500,
  margin: "0 0 14px",
};

const badgeStyle: React.CSSProperties = {
  padding: "3px 9px", borderRadius: 999, fontSize: 12,
  fontFamily: "var(--font-sans)", fontWeight: 600,
};

const tagStyle: React.CSSProperties = {
  padding: "2px 8px", borderRadius: 999, fontSize: 11,
  fontFamily: "var(--font-sans)", background: "#F4EEE2", color: "#7A6550",
};

const copyBlockStyle: React.CSSProperties = { marginBottom: 16 };

const copyLabelStyle: React.CSSProperties = {
  fontSize: 11, fontFamily: "var(--font-sans)", opacity: 0.5,
  margin: "0 0 4px", textTransform: "uppercase", letterSpacing: "0.05em",
};

const copyTextStyle: React.CSSProperties = {
  fontSize: 14, fontFamily: "var(--font-sans)", lineHeight: 1.6, margin: 0,
};

const hashtagPillStyle: React.CSSProperties = {
  padding: "2px 8px", borderRadius: 4, fontSize: 12,
  fontFamily: "var(--font-sans)", background: "#EAF3FD", color: "#1E4D7B",
};

const violationBoxStyle: React.CSSProperties = {
  display: "flex", alignItems: "center", gap: 6,
  padding: "8px 12px", borderRadius: 6,
  background: "#FEF2F2", color: "#B91C1C",
  fontSize: 12, fontFamily: "var(--font-sans)",
};

const frameStyle: React.CSSProperties = {
  borderLeft: "3px solid #1E6E77", paddingLeft: 12, marginBottom: 20,
};

const frameIndexStyle: React.CSSProperties = {
  width: 22, height: 22, borderRadius: "50%",
  background: "#1E6E77", color: "#fff",
  fontSize: 11, fontFamily: "var(--font-sans)", fontWeight: 700,
  display: "flex", alignItems: "center", justifyContent: "center",
  flexShrink: 0,
};

const frameLabelStyle: React.CSSProperties = {
  fontFamily: "var(--font-sans)", fontSize: 13, fontWeight: 600,
};

const frameDureeStyle: React.CSSProperties = {
  fontFamily: "var(--font-sans)", fontSize: 11, opacity: 0.5,
  marginLeft: "auto",
};

const frameMontageStyle: React.CSSProperties = {
  fontSize: 12, fontFamily: "var(--font-sans)", lineHeight: 1.5,
  background: "#F4EEE2", borderRadius: 6, padding: "6px 10px", margin: 0,
  color: "#7A6550",
};

const dropdownStyle: React.CSSProperties = {
  position: "absolute", top: "calc(100% + 4px)", left: 0, zIndex: 50,
  background: "#fff", border: "1px solid #EDE8E1", borderRadius: 8,
  boxShadow: "0 4px 16px rgba(0,0,0,0.08)", padding: 4, minWidth: 160,
};

const dropdownItemStyle: React.CSSProperties = {
  display: "block", width: "100%", padding: "6px 8px",
  background: "none", border: "none", cursor: "pointer",
  borderRadius: 4, textAlign: "left",
};

const errorBoxStyle: React.CSSProperties = {
  display: "flex", alignItems: "center", gap: 8,
  padding: "12px 16px", borderRadius: 8,
  background: "#FEF2F2", color: "#B91C1C",
  fontSize: 13, fontFamily: "var(--font-sans)", marginTop: 16,
};
