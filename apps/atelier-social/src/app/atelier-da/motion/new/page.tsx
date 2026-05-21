/**
 * /atelier-da/motion/new — création d'un job Motion.
 *
 * Flow : choisir mode → choisir source → (mode reel) choisir lookbook style
 * → brief libre → engine → bouton Générer.
 */
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Sparkles } from "lucide-react";

import type {
  CreateMotionJobInput,
  MotionEngine,
  MotionMode,
  MotionSource,
} from "@/types/motion";
import { ENGINE_LABELS, MODE_LABELS } from "@/types/motion";
import {
  createMotionJob,
  fetchMotionEngineStatus,
  type MotionEngineStatus,
} from "@/lib/motion/api-client";
import { MotionModeSelector } from "@/components/motion/MotionModeSelector";
import { MotionSourceSelector } from "@/components/motion/MotionSourceSelector";

export default function NewMotionJobPage() {
  const router = useRouter();
  const [mode, setMode] = useState<MotionMode | null>(null);
  const [sourceId, setSourceId] = useState<string | null>(null);
  const [, setSource] = useState<MotionSource | null>(null);
  const [lookbookId, setLookbookId] = useState<string | null>(null);
  const [format, setFormat] = useState<"court" | "complet">("court");
  const [brief, setBrief] = useState("");
  const [engine, setEngine] = useState<MotionEngine | "">("");
  const [engineStatus, setEngineStatus] = useState<MotionEngineStatus | null>(null);
  const [lookbookSources, setLookbookSources] = useState<MotionSource[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchMotionEngineStatus()
      .then((s) => {
        setEngineStatus(s);
        setEngine(s.active);
      })
      .catch(() => undefined);
  }, []);

  // Charge les lookbooks pour le mode reel (sélection de l'image style)
  useEffect(() => {
    if (mode !== "reel") {
      setLookbookSources([]);
      setLookbookId(null);
      return;
    }
    fetch("/api/da/motion/sources?mode=ambiance", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setLookbookSources(d.sources ?? []))
      .catch(() => undefined);
  }, [mode]);

  const handleSubmit = async () => {
    if (!mode || !sourceId) return;
    setSubmitting(true);
    setError(null);
    try {
      const payload: CreateMotionJobInput = {
        mode,
        source_id: sourceId,
        engine: engine || undefined,
        format: mode === "reel" ? format : undefined,
        brief: brief.trim() || undefined,
      };
      // lookbook_id n'est pas dans CreateMotionJobInput du type (Sprint 1 simplifié) :
      // on l'envoie via le body directement, l'API le lit en mode reel.
      const job = await createMotionJob({
        ...payload,
        ...(mode === "reel" && lookbookId ? { lookbook_id: lookbookId } as Record<string, unknown> : {}),
      } as CreateMotionJobInput);
      router.push(`/atelier-da/motion/${job.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur création");
      setSubmitting(false);
    }
  };

  const canSubmit = Boolean(mode && sourceId && !submitting);

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto" }}>
      <Link href="/atelier-da/motion" style={backLinkStyle}>
        <ArrowLeft size={14} strokeWidth={1.6} /> Atelier Motion
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
          Nouvelle vidéo
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
          Choisis un mode, une source visuelle, et lance la génération. La
          progression se met à jour automatiquement (polling 5s).
        </p>
      </header>

      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <Section title="1 · Choisir le mode">
          <MotionModeSelector value={mode} onChange={setMode} />
        </Section>

        {mode && (
          <Section title={`2 · Source ${MODE_LABELS[mode].toLowerCase()}`}>
            <MotionSourceSelector
              mode={mode}
              value={sourceId}
              onChange={(id, src) => {
                setSourceId(id);
                setSource(src);
              }}
            />
          </Section>
        )}

        {mode === "reel" && (
          <Section title="3 · Image de style (lookbook)">
            <p
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: 12,
                color: "var(--hub-foreground)",
                opacity: 0.65,
                margin: "0 0 10px 0",
              }}
            >
              Optionnel : verrouille la DA en passant une ambiance comme image
              de style à l&apos;engine vidéo.
            </p>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
                gap: 8,
              }}
            >
              <button
                type="button"
                onClick={() => setLookbookId(null)}
                style={lookbookTileStyle(lookbookId === null)}
              >
                <div
                  style={{
                    aspectRatio: "4/5",
                    background: "var(--hub-bg)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontFamily: "var(--font-sans)",
                    fontSize: 11,
                    color: "var(--hub-foreground)",
                    opacity: 0.5,
                  }}
                >
                  Aucun
                </div>
                <p style={lookbookLabelStyle}>Pas de style imposé</p>
              </button>
              {lookbookSources.map((lb) => {
                if (lb.type !== "lookbook") return null;
                const isSelected = lookbookId === lb.id;
                return (
                  <button
                    key={lb.id}
                    type="button"
                    onClick={() => setLookbookId(lb.id)}
                    style={lookbookTileStyle(isSelected)}
                  >
                    <div
                      style={{
                        aspectRatio: "4/5",
                        background: "var(--hub-bg)",
                        overflow: "hidden",
                      }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={lb.public_url}
                        alt={lb.label}
                        loading="lazy"
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      />
                    </div>
                    <p style={lookbookLabelStyle}>{lb.label}</p>
                  </button>
                );
              })}
            </div>
          </Section>
        )}

        {mode === "reel" && (
          <Section title="4 · Format Reel">
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={() => setFormat("court")}
                style={formatChip(format === "court")}
              >
                Court (~32s · 4 clips)
              </button>
              <button
                type="button"
                onClick={() => setFormat("complet")}
                style={formatChip(format === "complet")}
              >
                Complet (~56s · 7 clips)
              </button>
            </div>
          </Section>
        )}

        {mode && (
          <Section title={`${mode === "reel" ? "5" : "3"} · Brief éditorial (optionnel)`}>
            <textarea
              value={brief}
              onChange={(e) => setBrief(e.target.value)}
              placeholder="Ex : ambiance dimanche matin, lumière dorée qui caresse le tissu, mouvement très lent…"
              rows={3}
              style={{
                background: "var(--hub-bg)",
                border: "0.5px solid var(--hub-border)",
                borderRadius: 8,
                padding: "10px 12px",
                fontFamily: "var(--font-sans)",
                fontSize: 13,
                color: "var(--hub-foreground)",
                outline: "none",
                width: "100%",
                resize: "vertical",
              }}
            />
          </Section>
        )}

        {mode && (
          <Section title={`${mode === "reel" ? "6" : "4"} · Moteur de génération`}>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {(engineStatus?.available ?? []).map((e) => {
                const isSel = engine === e.id;
                return (
                  <button
                    key={e.id}
                    type="button"
                    onClick={() => e.available && setEngine(e.id)}
                    disabled={!e.available}
                    style={{
                      ...engineChip(isSel),
                      opacity: e.available ? 1 : 0.4,
                      cursor: e.available ? "pointer" : "not-allowed",
                    }}
                    title={e.reason}
                  >
                    {ENGINE_LABELS[e.id]}
                    {!e.available && " (indispo)"}
                  </button>
                );
              })}
            </div>
            {engine && engineStatus && (
              <p
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: 11,
                  color: "var(--hub-foreground)",
                  opacity: 0.55,
                  marginTop: 8,
                }}
              >
                {engineStatus.available.find((e) => e.id === engine)?.reason}
              </p>
            )}
          </Section>
        )}
      </div>

      {error && (
        <div
          style={{
            marginTop: 16,
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
      )}

      <div
        style={{
          marginTop: 24,
          display: "flex",
          justifyContent: "flex-end",
          gap: 12,
        }}
      >
        <button
          type="button"
          onClick={() => router.push("/atelier-da/motion")}
          disabled={submitting}
          style={{
            background: "transparent",
            border: "0.5px solid var(--hub-border)",
            borderRadius: 9999,
            padding: "10px 20px",
            fontFamily: "var(--font-sans)",
            fontSize: 12,
            color: "var(--hub-foreground)",
            cursor: "pointer",
          }}
        >
          Annuler
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!canSubmit}
          style={{
            background: "var(--color-brand-rose, #A76059)",
            color: "white",
            border: "none",
            borderRadius: 9999,
            padding: "10px 24px",
            fontFamily: "var(--font-sans)",
            fontSize: 13,
            fontWeight: 500,
            letterSpacing: "0.04em",
            cursor: canSubmit ? "pointer" : "not-allowed",
            opacity: canSubmit ? 1 : 0.5,
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          {submitting ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={14} />}
          {submitting ? "Lancement…" : "Générer la vidéo"}
        </button>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section
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
      <h2
        style={{
          fontFamily: "var(--font-sans)",
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          margin: 0,
          color: "var(--hub-foreground)",
          opacity: 0.7,
        }}
      >
        {title}
      </h2>
      {children}
    </section>
  );
}

function lookbookTileStyle(selected: boolean): React.CSSProperties {
  return {
    background: "white",
    border: selected
      ? "1.5px solid var(--hub-foreground)"
      : "0.5px solid var(--hub-border)",
    borderRadius: 8,
    overflow: "hidden",
    padding: 0,
    cursor: "pointer",
    display: "flex",
    flexDirection: "column",
  };
}

const lookbookLabelStyle: React.CSSProperties = {
  padding: "6px 8px",
  fontFamily: "var(--font-sans)",
  fontSize: 11,
  margin: 0,
  textAlign: "center",
  color: "var(--hub-foreground)",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};

function formatChip(selected: boolean): React.CSSProperties {
  return {
    padding: "8px 14px",
    borderRadius: 9999,
    border: selected
      ? "1px solid var(--hub-foreground)"
      : "0.5px solid var(--hub-border)",
    background: selected ? "var(--hub-foreground)" : "white",
    color: selected ? "var(--hub-bg)" : "var(--hub-foreground)",
    fontFamily: "var(--font-sans)",
    fontSize: 12,
    cursor: "pointer",
  };
}

function engineChip(selected: boolean): React.CSSProperties {
  return {
    padding: "6px 14px",
    borderRadius: 9999,
    border: selected
      ? "1px solid var(--hub-foreground)"
      : "0.5px solid var(--hub-border)",
    background: selected ? "var(--hub-foreground)" : "white",
    color: selected ? "var(--hub-bg)" : "var(--hub-foreground)",
    fontFamily: "var(--font-sans)",
    fontSize: 11,
  };
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
