/**
 * Atelier Trends — dashboard (Lot 1, read-only). Nichée dans Atelier DA
 * (Radar) depuis le 21/08/2026.
 *
 * Affiche le dernier run Pinterest. Bouton "Rafraîchir" = POST /api/trends.
 * Google Trends retiré le 21/08/2026 (peu actionnable pour la broderie).
 * Lot 3 ajoutera l'enrichissement IA (motif/occasion/créneau + bouton "Générer ce post").
 */
"use client";

import { useEffect, useState } from "react";
import { TrendingUp, RefreshCw, Loader2, AlertTriangle, ExternalLink, Plus, X, Sparkles, CalendarClock, Palette } from "lucide-react";
import {
  type Trend,
  type TrendsSnapshot,
  type TrendSource,
  type TrendSignal,
  type TrendType,
  type PinterestManualKeyword,
  sortTrends,
  SIGNAL_LABELS,
  TYPE_LABELS,
  SOURCE_LABELS,
  OCCASION_LABELS,
} from "@/lib/trends/trends";

type SourceFilter = "all" | TrendSource;
type SignalFilter = "all" | TrendSignal;
type TypeFilter = "all" | TrendType;

export default function AtelierTrendsPage() {
  const [snapshot, setSnapshot] = useState<TrendsSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<SourceFilter>("all");
  const [signalFilter, setSignalFilter] = useState<SignalFilter>("all");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [manual, setManual] = useState<PinterestManualKeyword[]>([]);
  const [newKw, setNewKw] = useState("");
  const [savingManual, setSavingManual] = useState(false);

  function load() {
    setLoading(true);
    fetch("/api/trends", { cache: "no-store" })
      .then((r) => r.json())
      .then((res) => {
        if (!res.ok) throw new Error(res.error);
        setSnapshot(res.data);
      })
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false));
    fetch("/api/trends/pinterest-manuel", { cache: "no-store" })
      .then((r) => r.json())
      .then((res) => {
        if (res.ok) setManual(res.data);
      })
      .catch(() => {});
  }

  useEffect(load, []);

  function analyze() {
    setAnalyzing(true);
    setError(null);
    fetch("/api/trends/enrich", { method: "POST" })
      .then((r) => r.json())
      .then((res) => {
        if (!res.ok) throw new Error(res.error);
        setSnapshot(res.data);
      })
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setAnalyzing(false));
  }

  function saveManual(next: PinterestManualKeyword[]) {
    setSavingManual(true);
    setError(null);
    setManual(next);
    fetch("/api/trends/pinterest-manuel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ keywords: next }),
    })
      .then((r) => r.json())
      .then((res) => {
        if (!res.ok) throw new Error(res.error);
        setManual(res.data.keywords);
        setSnapshot(res.data.snapshot);
      })
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setSavingManual(false));
  }

  function addKeyword() {
    const terme = newKw.trim();
    if (!terme) return;
    if (manual.some((k) => k.terme.toLowerCase() === terme.toLowerCase())) {
      setNewKw("");
      return;
    }
    saveManual([...manual, { terme, signal: "saisonnier" }]);
    setNewKw("");
  }

  function removeKeyword(terme: string) {
    saveManual(manual.filter((k) => k.terme !== terme));
  }

  function refresh() {
    setRunning(true);
    setError(null);
    fetch("/api/trends", { method: "POST" })
      .then((r) => r.json())
      .then((res) => {
        if (!res.ok) throw new Error(res.error);
        setSnapshot(res.data);
      })
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setRunning(false));
  }

  const allTrends = snapshot ? sortTrends(snapshot.trends) : [];

  // Filtres combinables (Source × Signal × Type). Compteurs croisés : chaque
  // chip compte ce qui resterait si on l'activait, en gardant les autres filtres.
  const matches = (t: Trend, src: SourceFilter, sig: SignalFilter, typ: TypeFilter) =>
    (src === "all" || t.source === src) &&
    (sig === "all" || t.signal === sig) &&
    (typ === "all" || t.type === typ);
  const trends = allTrends.filter((t) => matches(t, filter, signalFilter, typeFilter));
  const countSource = (s: SourceFilter) =>
    allTrends.filter((t) => matches(t, s, signalFilter, typeFilter)).length;
  const countSignal = (s: SignalFilter) =>
    allTrends.filter((t) => matches(t, filter, s, typeFilter)).length;
  const countType = (s: TypeFilter) =>
    allTrends.filter((t) => matches(t, filter, signalFilter, s)).length;

  const enriched = snapshot?.status === "enriched";
  const isActionnable = (t: Trend) =>
    (t.enrichissement?.pertinence_ypersoa ?? 0) >= 5 && t.enrichissement?.brand_safe === true;
  const actionnable = enriched ? trends.filter(isActionnable) : [];
  const ecartees = enriched ? trends.filter((t) => !isActionnable(t)) : [];

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto" }}>
      <header
        style={{
          marginBottom: 32,
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 24,
        }}
      >
        <div>
          <h1
            style={{
              fontFamily: "var(--font-editorial)",
              fontSize: 40,
              fontWeight: 500,
              letterSpacing: "-0.015em",
              color: "var(--hub-foreground)",
              lineHeight: 1.05,
              margin: 0,
              marginBottom: 12,
            }}
          >
            Atelier Trends
          </h1>
          <p
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 14,
              color: "var(--hub-foreground)",
              opacity: 0.65,
              maxWidth: 640,
              lineHeight: 1.6,
            }}
          >
            Veille des recherches qui montent sur Pinterest. « Rafraîchir » récupère
            les tendances brutes ; « Analyser » les passe au crible Ypersoa (score de pertinence broderie,
            motif YPM suggéré, occasion, créneau Planable J-45, angle de caption).
          </p>
        </div>

        <div style={{ display: "flex", gap: 10, flexShrink: 0 }}>
          <button
            onClick={refresh}
            disabled={running || analyzing}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              whiteSpace: "nowrap",
              fontFamily: "var(--font-sans)",
              fontSize: 13,
              fontWeight: 500,
              padding: "10px 16px",
              borderRadius: 10,
              border: "0.5px solid var(--hub-border)",
              background: "white",
              color: "var(--hub-foreground)",
              cursor: running ? "wait" : "pointer",
              opacity: running || analyzing ? 0.6 : 1,
            }}
          >
            {running ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} strokeWidth={1.8} />}
            {running ? "Récupération…" : "Rafraîchir"}
          </button>
          <button
            onClick={analyze}
            disabled={analyzing || running || !snapshot || allTrends.length === 0}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              whiteSpace: "nowrap",
              fontFamily: "var(--font-sans)",
              fontSize: 13,
              fontWeight: 500,
              padding: "10px 16px",
              borderRadius: 10,
              border: "none",
              background: "var(--color-brand-rose, #A76059)",
              color: "#FAF7F2",
              cursor: analyzing ? "wait" : "pointer",
              opacity: analyzing || running || !snapshot || allTrends.length === 0 ? 0.6 : 1,
            }}
          >
            {analyzing ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} strokeWidth={1.8} />}
            {analyzing ? "Analyse IA…" : "Analyser (IA)"}
          </button>
        </div>
      </header>

      {/* Bandeau méta du run */}
      {snapshot && (
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 16,
            alignItems: "center",
            fontFamily: "var(--font-sans)",
            fontSize: 12,
            color: "var(--hub-foreground)",
            opacity: 0.7,
            marginBottom: 20,
          }}
        >
          <span>Dernier run : <strong>{snapshot.date}</strong></span>
          <span>•</span>
          <span>{snapshot.meta.trends_count} tendances</span>
          <span>•</span>
          <span>Sources : {snapshot.sources.map((s) => SOURCE_LABELS[s]).join(", ")}</span>
        </div>
      )}

      {/* Filtres combinables : Source × Signal × Type */}
      {snapshot && allTrends.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
          <FilterRow
            label="Source"
            value={filter}
            onChange={setFilter}
            options={[
              { key: "all", label: "Toutes", count: countSource("all") },
              { key: "pinterest", label: SOURCE_LABELS.pinterest, count: countSource("pinterest") },
            ]}
          />
          <FilterRow
            label="Signal"
            value={signalFilter}
            onChange={setSignalFilter}
            options={[
              { key: "all", label: "Tous", count: countSignal("all") },
              { key: "montant", label: SIGNAL_LABELS.montant, count: countSignal("montant") },
              { key: "saisonnier", label: SIGNAL_LABELS.saisonnier, count: countSignal("saisonnier") },
              { key: "stable", label: SIGNAL_LABELS.stable, count: countSignal("stable") },
            ]}
          />
          <FilterRow
            label="Type"
            value={typeFilter}
            onChange={setTypeFilter}
            options={[
              { key: "all", label: "Tous", count: countType("all") },
              { key: "mot", label: TYPE_LABELS.mot, count: countType("mot") },
              { key: "look", label: "Look / outfit", count: countType("look") },
              { key: "motif", label: "Motif brodé", count: countType("motif") },
            ]}
          />
          {!enriched && (
            <p style={{ margin: 0, fontFamily: "var(--font-sans)", fontSize: 11, color: "var(--hub-foreground)", opacity: 0.5 }}>
              Le type (look / motif) est attribué par « Analyser (IA) » — avant analyse, tout est « mot-clé ».
            </p>
          )}
        </div>
      )}

      {/* Panneau mots-clés Pinterest (saisie manuelle) */}
      <details
        style={{
          marginBottom: 24,
          border: "0.5px solid var(--hub-border)",
          borderRadius: 12,
          background: "white",
          padding: "0 20px",
        }}
      >
        <summary
          style={{
            cursor: "pointer",
            padding: "14px 0",
            fontFamily: "var(--font-sans)",
            fontSize: 13,
            fontWeight: 500,
            color: "var(--hub-foreground)",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          Mots-clés Pinterest (saisie manuelle)
          <span style={{ opacity: 0.5, fontWeight: 400 }}>— {manual.length} mot{manual.length > 1 ? "s" : ""}</span>
          {savingManual && <Loader2 size={13} className="animate-spin" style={{ opacity: 0.6 }} />}
        </summary>
        <div style={{ paddingBottom: 18 }}>
          <p style={{ fontFamily: "var(--font-sans)", fontSize: 12, color: "var(--hub-foreground)", opacity: 0.6, lineHeight: 1.5, marginTop: 0 }}>
            En attendant la validation de l&apos;API Pinterest, cure ici les requêtes Pinterest à suivre
            (ex. « cadeau fête des mères personnalisé »). Elles sont fusionnées au run.
            Pour les figer durablement, édite <code>referentiels/trends/_pinterest_manuel.json</code> et committe.
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
            {manual.map((k) => (
              <span
                key={k.terme}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  fontFamily: "var(--font-sans)",
                  fontSize: 12,
                  padding: "5px 8px 5px 12px",
                  borderRadius: 999,
                  background: "var(--hub-bg)",
                  border: "0.5px solid var(--hub-border)",
                  color: "var(--hub-foreground)",
                }}
              >
                {k.terme}
                <button
                  onClick={() => removeKeyword(k.terme)}
                  disabled={savingManual}
                  aria-label={`Retirer ${k.terme}`}
                  style={{ display: "inline-flex", border: "none", background: "transparent", cursor: "pointer", padding: 0, opacity: 0.5 }}
                >
                  <X size={13} strokeWidth={2} />
                </button>
              </span>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              value={newKw}
              onChange={(e) => setNewKw(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addKeyword()}
              placeholder="Ajouter un mot-clé Pinterest…"
              disabled={savingManual}
              style={{
                flex: 1,
                fontFamily: "var(--font-sans)",
                fontSize: 13,
                padding: "9px 12px",
                borderRadius: 9,
                border: "0.5px solid var(--hub-border)",
                background: "var(--hub-bg)",
                color: "var(--hub-foreground)",
              }}
            />
            <button
              onClick={addKeyword}
              disabled={savingManual || !newKw.trim()}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                fontFamily: "var(--font-sans)",
                fontSize: 13,
                fontWeight: 500,
                padding: "9px 14px",
                borderRadius: 9,
                border: "0.5px solid var(--hub-border)",
                background: "var(--hub-bg)",
                color: "var(--hub-foreground)",
                cursor: savingManual || !newKw.trim() ? "default" : "pointer",
                opacity: savingManual || !newKw.trim() ? 0.5 : 1,
              }}
            >
              <Plus size={14} strokeWidth={1.8} /> Ajouter
            </button>
          </div>
        </div>
      </details>

      {/* Erreurs non bloquantes du run */}
      {snapshot && snapshot.errors.length > 0 && (
        <div
          style={{
            display: "flex",
            gap: 10,
            padding: "12px 16px",
            borderRadius: 10,
            background: "#FCF3E8",
            border: "0.5px solid #E8C9A0",
            marginBottom: 20,
            fontFamily: "var(--font-sans)",
            fontSize: 12,
            color: "#7A4A12",
          }}
        >
          <AlertTriangle size={16} strokeWidth={1.6} style={{ flexShrink: 0, marginTop: 1 }} />
          <div>
            <strong>Avertissements du run</strong>
            <ul style={{ margin: "4px 0 0", paddingLeft: 18 }}>
              {snapshot.errors.map((e, i) => (
                <li key={i}>{e}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Erreur bloquante (fetch / POST) */}
      {error && (
        <div
          style={{
            display: "flex",
            gap: 10,
            padding: "12px 16px",
            borderRadius: 10,
            background: "#FBEAEA",
            border: "0.5px solid #E0A3A3",
            marginBottom: 20,
            fontFamily: "var(--font-sans)",
            fontSize: 13,
            color: "#8A2B2B",
          }}
        >
          <AlertTriangle size={16} strokeWidth={1.6} style={{ flexShrink: 0, marginTop: 1 }} />
          {error}
        </div>
      )}

      {/* États */}
      {loading ? (
        <div style={{ display: "flex", alignItems: "center", gap: 10, opacity: 0.6, fontFamily: "var(--font-sans)", fontSize: 14 }}>
          <Loader2 size={18} className="animate-spin" /> Chargement…
        </div>
      ) : trends.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "60px 20px",
            border: "0.5px dashed var(--hub-border)",
            borderRadius: 12,
            fontFamily: "var(--font-sans)",
            color: "var(--hub-foreground)",
            opacity: 0.6,
          }}
        >
          <TrendingUp size={32} strokeWidth={1.2} style={{ marginBottom: 12, opacity: 0.5 }} />
          <p style={{ margin: 0 }}>Aucune tendance pour l&apos;instant.</p>
          <p style={{ margin: "6px 0 0", fontSize: 13 }}>Clique sur « Rafraîchir » pour lancer un premier run.</p>
        </div>
      ) : !enriched ? (
        <>
          <p style={{ fontFamily: "var(--font-sans)", fontSize: 12, color: "var(--hub-foreground)", opacity: 0.55, marginTop: 0, marginBottom: 16 }}>
            Tendances brutes. Clique sur « Analyser (IA) » pour les noter et les relier aux motifs/occasions Ypersoa.
          </p>
          <TrendGrid trends={trends} />
        </>
      ) : (
        <>
          <SectionTitle>Actionnable ({actionnable.length})</SectionTitle>
          {actionnable.length === 0 ? (
            <p style={{ fontFamily: "var(--font-sans)", fontSize: 13, opacity: 0.6, marginTop: 0 }}>
              Aucune tendance actionnable dans ce run (score ≥ 5 et brand-safe). C&apos;est fréquent : les tendances
              généralistes ne sont pas brodables. Ajoute des mots-clés Pinterest ciblés pour nourrir le moteur.
            </p>
          ) : (
            <TrendGrid trends={actionnable} />
          )}

          {ecartees.length > 0 && (
            <details style={{ marginTop: 28 }}>
              <summary
                style={{
                  cursor: "pointer",
                  fontFamily: "var(--font-sans)",
                  fontSize: 13,
                  fontWeight: 500,
                  color: "var(--hub-foreground)",
                  opacity: 0.7,
                  marginBottom: 16,
                }}
              >
                Écartées ({ecartees.length}) — score faible, hors occasion ou non brand-safe
              </summary>
              <TrendGrid trends={ecartees} dimmed />
            </details>
          )}
        </>
      )}
    </div>
  );
}

function TrendGrid({ trends, dimmed }: { trends: Trend[]; dimmed?: boolean }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
        gap: 16,
        opacity: dimmed ? 0.72 : 1,
      }}
    >
      {trends.map((t, i) => (
        <TrendCard key={`${t.terme}-${i}`} t={t} />
      ))}
    </div>
  );
}

function TrendCard({ t }: { t: Trend }) {
  const e = t.enrichissement;
  return (
    <article
      style={{
        background: "white",
        border: "0.5px solid var(--hub-border)",
        borderRadius: 12,
        padding: 20,
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
        <Badge>{SOURCE_LABELS[t.source]}</Badge>
        <Badge>{TYPE_LABELS[t.type]}</Badge>
        <Badge accent>{SIGNAL_LABELS[t.signal]}</Badge>
        {t.trafic_estime && <Badge>{t.trafic_estime}</Badge>}
        {e && <ScorePill score={e.pertinence_ypersoa} />}
      </div>

      <h2
        style={{
          fontFamily: "var(--font-editorial)",
          fontSize: 18,
          fontWeight: 500,
          letterSpacing: "-0.01em",
          color: "var(--hub-foreground)",
          margin: 0,
          lineHeight: 1.25,
        }}
      >
        {t.terme}
      </h2>

      {/* Enrichissement IA */}
      {e && (e.motif_ypm_suggere || e.occasion_liee || e.angle_caption || e.raison_pertinence) && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {(e.motif_ypm_suggere || e.occasion_liee) && (
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {e.occasion_liee && (
                <span style={metaChip}>
                  <CalendarClock size={12} strokeWidth={1.6} />
                  {OCCASION_LABELS[e.occasion_liee] ?? e.occasion_liee}
                </span>
              )}
              {e.motif_ypm_suggere && (
                <span style={metaChip}>
                  <Palette size={12} strokeWidth={1.6} />
                  {e.motif_ypm_suggere}
                </span>
              )}
            </div>
          )}
          {e.creneau_planable && (
            <p style={{ margin: 0, fontFamily: "var(--font-sans)", fontSize: 11.5, color: "var(--color-brand-rose, #A76059)", fontWeight: 500 }}>
              {e.creneau_planable}
            </p>
          )}
          {e.angle_caption && (
            <p style={{ margin: 0, fontFamily: "var(--font-sans)", fontSize: 13, color: "var(--hub-foreground)", lineHeight: 1.45, fontStyle: "italic" }}>
              « {e.angle_caption} »
            </p>
          )}
          {e.raison_pertinence && (
            <p style={{ margin: 0, fontFamily: "var(--font-sans)", fontSize: 11.5, color: "var(--hub-foreground)", opacity: 0.55, lineHeight: 1.45 }}>
              {e.raison_pertinence}
            </p>
          )}
          {!e.brand_safe && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontFamily: "var(--font-sans)", fontSize: 11, color: "#8A2B2B" }}>
              <AlertTriangle size={12} strokeWidth={1.7} /> à revoir (brand-safety)
            </span>
          )}
        </div>
      )}

      {/* Contexte (source brute) — surtout utile avant analyse */}
      {!e && t.contexte.length > 0 && (
        <ul style={{ margin: 0, paddingLeft: 16, fontFamily: "var(--font-sans)", fontSize: 12, color: "var(--hub-foreground)", opacity: 0.65, lineHeight: 1.5 }}>
          {t.contexte.map((c, j) => (
            <li key={j}>{c}</li>
          ))}
        </ul>
      )}

      <div style={{ marginTop: "auto", display: "flex", alignItems: "center", gap: 12 }}>
        {t.url && (
          <a
            href={t.url}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              fontFamily: "var(--font-sans)",
              fontSize: 11,
              fontWeight: 500,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              color: "var(--hub-foreground)",
              opacity: 0.6,
              textDecoration: "none",
            }}
          >
            Voir <ExternalLink size={12} strokeWidth={1.6} />
          </a>
        )}
      </div>
    </article>
  );
}

const metaChip: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 5,
  fontFamily: "var(--font-sans)",
  fontSize: 11.5,
  fontWeight: 500,
  padding: "4px 9px",
  borderRadius: 999,
  background: "var(--hub-bg)",
  border: "0.5px solid var(--hub-border)",
  color: "var(--hub-foreground)",
};

function ScorePill({ score }: { score: number }) {
  const bg = score >= 7 ? "#1F7A4D" : score >= 5 ? "#A76059" : "#9A9A9A";
  return (
    <span
      style={{
        marginLeft: "auto",
        fontFamily: "var(--font-sans)",
        fontSize: 12,
        fontWeight: 700,
        padding: "3px 9px",
        borderRadius: 999,
        background: bg,
        color: "#FAF7F2",
      }}
      title="Pertinence Ypersoa (0-10)"
    >
      {score}/10
    </span>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2
      style={{
        fontFamily: "var(--font-editorial)",
        fontSize: 22,
        fontWeight: 500,
        letterSpacing: "-0.01em",
        color: "var(--hub-foreground)",
        margin: "0 0 16px",
      }}
    >
      {children}
    </h2>
  );
}

function FilterRow<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { key: T; label: string; count: number }[];
  onChange: (v: T) => void;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
      <span
        style={{
          fontFamily: "var(--font-sans)",
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "var(--hub-foreground)",
          opacity: 0.45,
          minWidth: 54,
        }}
      >
        {label}
      </span>
      {options.map((o) =>
        o.count === 0 && o.key !== "all" ? null : (
          <FilterChip key={o.key} active={value === o.key} onClick={() => onChange(o.key)}>
            {o.label} ({o.count})
          </FilterChip>
        ),
      )}
    </div>
  );
}

function FilterChip({
  children,
  active,
  onClick,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        fontFamily: "var(--font-sans)",
        fontSize: 12,
        fontWeight: 500,
        padding: "6px 14px",
        borderRadius: 999,
        cursor: "pointer",
        background: active ? "var(--hub-foreground)" : "white",
        color: active ? "var(--hub-bg)" : "var(--hub-foreground)",
        border: "0.5px solid var(--hub-border)",
        opacity: active ? 1 : 0.7,
      }}
    >
      {children}
    </button>
  );
}

function Badge({ children, accent }: { children: React.ReactNode; accent?: boolean }) {
  return (
    <span
      style={{
        fontFamily: "var(--font-sans)",
        fontSize: 10,
        fontWeight: 600,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        padding: "3px 8px",
        borderRadius: 999,
        background: accent ? "#1E2D4A" : "var(--hub-bg)",
        color: accent ? "#FAF7F2" : "var(--hub-foreground)",
        border: accent ? "none" : "0.5px solid var(--hub-border)",
        opacity: accent ? 1 : 0.7,
      }}
    >
      {children}
    </span>
  );
}
