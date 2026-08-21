"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
  Plus,
  Clapperboard,
  Loader2,
  AlertCircle,
  RefreshCw,
  Filter,
  BookOpen,
} from "lucide-react";
import type { StudioMoodEpisode, StatutEpisode } from "@/lib/studio-mood/types";
import { STATUT_META, SUPPORT_LABELS } from "@/lib/studio-mood/types";

const STATUTS: Array<{ value: StatutEpisode | ""; label: string }> = [
  { value: "", label: "Tous" },
  { value: "brouillon", label: "Brouillons" },
  { value: "ready", label: "Prêts à tourner" },
  { value: "tourne", label: "Tournés" },
  { value: "monte", label: "Montés" },
  { value: "publie", label: "Publiés" },
];

export default function StudioMoodListPage() {
  const [episodes, setEpisodes] = useState<StudioMoodEpisode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [seeding, setSeeding] = useState(false);
  const [filterStatut, setFilterStatut] = useState<StatutEpisode | "">("");

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const url = filterStatut ? `/api/studio-mood?statut=${filterStatut}` : "/api/studio-mood";
      const res = await fetch(url);
      const json = await res.json();
      if (!res.ok) throw new Error(json.message ?? "Erreur serveur");
      setEpisodes(json.data ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterStatut]);

  const handleSeed = async () => {
    if (!confirm("Injecter les 12 épisodes de la banque pré-remplie ?")) return;
    setSeeding(true);
    try {
      const res = await fetch("/api/studio-mood?action=seed", { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message ?? "Erreur seed");
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : String(e));
    } finally {
      setSeeding(false);
    }
  };

  const byStatut = useMemo(() => {
    const groups: Partial<Record<StatutEpisode, StudioMoodEpisode[]>> = {};
    for (const ep of episodes) {
      if (!groups[ep.statut]) groups[ep.statut] = [];
      groups[ep.statut]!.push(ep);
    }
    return groups;
  }, [episodes]);

  const statutOrder: StatutEpisode[] = ["ready", "brouillon", "tourne", "monte", "publie"];

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto" }}>
      <header style={{ marginBottom: 32, display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <div>
          <h1 style={h1Style}>Studio Mood brodé</h1>
          <p style={subtitleStyle}>
            Planifie tes épisodes Reels / TikTok — humeur, mot brodé, hook, légende, storyboard prêt pour Maï.
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Link href="/studio/studio-mood/collage" style={{ ...secondaryBtnStyle, background: "#1E6E77", color: "#fff", borderColor: "#1E6E77" }}>
            🎨 Collage
          </Link>
          <Link href="/studio/studio-mood/kit" style={secondaryBtnStyle}>
            <BookOpen size={14} /> Kit Mood brodé
          </Link>
          <button onClick={handleSeed} disabled={seeding} style={secondaryBtnStyle}>
            {seeding ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
            {seeding ? "Injection…" : "Injecter les 12 épisodes"}
          </button>
          <Link href="/studio/studio-mood/nouveau" style={primaryBtnStyle}>
            <Plus size={15} strokeWidth={2} /> Nouvel épisode
          </Link>
        </div>
      </header>

      {/* Filtres statut */}
      <div style={{ display: "flex", gap: 6, marginBottom: 24, flexWrap: "wrap" }}>
        <Filter size={14} style={{ color: "var(--hub-foreground)", opacity: 0.5, alignSelf: "center" }} />
        {STATUTS.map((s) => (
          <button
            key={s.value}
            onClick={() => setFilterStatut(s.value)}
            style={{
              ...chipStyle,
              background: filterStatut === s.value ? "#1E6E77" : "#F0EDE8",
              color: filterStatut === s.value ? "#fff" : "#5C5248",
              fontWeight: filterStatut === s.value ? 600 : 400,
            }}
          >
            {s.label}
          </button>
        ))}
      </div>

      {loading && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#888", padding: 24 }}>
          <Loader2 size={18} className="animate-spin" /> Chargement…
        </div>
      )}

      {error && (
        <div style={errorBoxStyle}>
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {!loading && !error && episodes.length === 0 && (
        <div style={emptyStyle}>
          <Clapperboard size={32} strokeWidth={1.2} style={{ opacity: 0.35 }} />
          <p style={{ margin: "12px 0 4px", fontFamily: "var(--font-editorial)", fontSize: 18, fontWeight: 500 }}>
            Aucun épisode pour l&apos;instant
          </p>
          <p style={{ fontSize: 13, opacity: 0.6, marginBottom: 16 }}>
            Injecte les 12 épisodes pré-remplis ou crée le premier.
          </p>
          <Link href="/studio/studio-mood/nouveau" style={primaryBtnStyle}>
            <Plus size={14} /> Créer un épisode
          </Link>
        </div>
      )}

      {!loading && !error && episodes.length > 0 && (
        <div>
          {statutOrder
            .filter((s) => byStatut[s]?.length)
            .map((s) => (
              <section key={s} style={{ marginBottom: 36 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                  <span style={{
                    ...badgeStyle,
                    background: STATUT_META[s].bg,
                    color: STATUT_META[s].fg,
                  }}>
                    {STATUT_META[s].label}
                  </span>
                  <span style={{ fontSize: 12, opacity: 0.5 }}>{byStatut[s]!.length} épisode{byStatut[s]!.length > 1 ? "s" : ""}</span>
                </div>
                <div style={gridStyle}>
                  {byStatut[s]!.map((ep) => (
                    <EpisodeCard key={ep.id} ep={ep} />
                  ))}
                </div>
              </section>
            ))}
        </div>
      )}
    </div>
  );
}

function EpisodeCard({ ep }: { ep: StudioMoodEpisode }) {
  const meta = STATUT_META[ep.statut];
  const hasHook = Boolean(ep.hook);
  const hasStoryboard = Boolean(ep.storyboard_md);

  return (
    <Link href={`/studio/studio-mood/${ep.id}`} style={cardStyle}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
        <span style={{ ...badgeStyle, background: meta.bg, color: meta.fg, fontSize: 11 }}>
          {meta.label}
        </span>
        <span style={{ fontSize: 11, opacity: 0.45 }}>
          {SUPPORT_LABELS[ep.support as keyof typeof SUPPORT_LABELS] ?? ep.support}
        </span>
      </div>

      <p style={cardTitleStyle}>{ep.titre}</p>

      <div style={{ display: "flex", gap: 6, marginBottom: 8, flexWrap: "wrap" }}>
        <span style={tagStyle}>{ep.humeur}</span>
        {ep.occasion && <span style={tagStyle}>{ep.occasion}</span>}
      </div>

      <p style={motBrodeStyle}>
        &ldquo;{ep.mot_brode}&rdquo;
        {ep.motif_ypm_nom && (
          <span style={{ fontFamily: "var(--font-sans)", fontSize: 11, fontWeight: 400, opacity: 0.6 }}>
            {" "}· {ep.motif_ypm_nom}
          </span>
        )}
      </p>

      {ep.hook && (
        <p style={hookPreviewStyle}>{ep.hook}</p>
      )}

      <div style={{ display: "flex", gap: 6, marginTop: "auto", paddingTop: 10 }}>
        {hasHook && <span style={pillStyle}>✓ Copy</span>}
        {hasStoryboard && <span style={{ ...pillStyle, background: "#EDF8EF", color: "#1D6130" }}>✓ Storyboard</span>}
      </div>
    </Link>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const h1Style: React.CSSProperties = {
  fontFamily: "var(--font-editorial)",
  fontSize: 36,
  fontWeight: 500,
  letterSpacing: "-0.015em",
  margin: 0,
  marginBottom: 8,
};

const subtitleStyle: React.CSSProperties = {
  fontFamily: "var(--font-sans)",
  fontSize: 14,
  color: "var(--hub-foreground)",
  opacity: 0.65,
  maxWidth: 560,
  lineHeight: 1.6,
};

const primaryBtnStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "9px 16px",
  borderRadius: 8,
  background: "#1E6E77",
  color: "#fff",
  fontSize: 13,
  fontWeight: 600,
  fontFamily: "var(--font-sans)",
  textDecoration: "none",
  cursor: "pointer",
  border: "none",
  whiteSpace: "nowrap",
};

const secondaryBtnStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "9px 14px",
  borderRadius: 8,
  background: "#F0EDE8",
  color: "#5C5248",
  fontSize: 13,
  fontWeight: 500,
  fontFamily: "var(--font-sans)",
  cursor: "pointer",
  border: "none",
  whiteSpace: "nowrap",
};

const chipStyle: React.CSSProperties = {
  padding: "5px 12px",
  borderRadius: 999,
  fontSize: 12,
  fontFamily: "var(--font-sans)",
  cursor: "pointer",
  border: "none",
  transition: "all 0.15s",
};

const gridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
  gap: 14,
};

const cardStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  padding: "16px 18px",
  borderRadius: 12,
  background: "#FFFFFF",
  border: "1px solid #EDE8E1",
  textDecoration: "none",
  color: "var(--hub-foreground)",
  transition: "box-shadow 0.15s, transform 0.15s",
  cursor: "pointer",
  minHeight: 160,
};

const cardTitleStyle: React.CSSProperties = {
  fontFamily: "var(--font-editorial)",
  fontSize: 16,
  fontWeight: 500,
  margin: "0 0 6px",
  lineHeight: 1.3,
};

const motBrodeStyle: React.CSSProperties = {
  fontFamily: "var(--font-editorial)",
  fontSize: 20,
  fontWeight: 600,
  letterSpacing: "-0.01em",
  color: "#1E6E77",
  margin: "4px 0 8px",
  lineHeight: 1.2,
};

const hookPreviewStyle: React.CSSProperties = {
  fontFamily: "var(--font-sans)",
  fontSize: 12,
  color: "var(--hub-foreground)",
  opacity: 0.7,
  lineHeight: 1.5,
  margin: "0 0 4px",
  display: "-webkit-box",
  WebkitLineClamp: 2,
  WebkitBoxOrient: "vertical",
  overflow: "hidden",
};

const tagStyle: React.CSSProperties = {
  padding: "2px 8px",
  borderRadius: 999,
  fontSize: 11,
  fontFamily: "var(--font-sans)",
  background: "#F4EEE2",
  color: "#7A6550",
};

const badgeStyle: React.CSSProperties = {
  padding: "3px 8px",
  borderRadius: 999,
  fontSize: 12,
  fontFamily: "var(--font-sans)",
  fontWeight: 600,
};

const pillStyle: React.CSSProperties = {
  padding: "2px 7px",
  borderRadius: 4,
  fontSize: 11,
  fontFamily: "var(--font-sans)",
  background: "#EAF3FD",
  color: "#1E4D7B",
};

const errorBoxStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  padding: "12px 16px",
  borderRadius: 8,
  background: "#FEF2F2",
  color: "#B91C1C",
  fontSize: 13,
  fontFamily: "var(--font-sans)",
};

const emptyStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  padding: "60px 24px",
  textAlign: "center",
  color: "var(--hub-foreground)",
  fontFamily: "var(--font-sans)",
};
