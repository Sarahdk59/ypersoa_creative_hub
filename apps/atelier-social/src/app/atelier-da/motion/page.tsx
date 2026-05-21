/**
 * /atelier-da/motion — liste des jobs Motion.
 */
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Film, Loader2, Plus } from "lucide-react";

import type { MotionEngineStatus } from "@/lib/motion/api-client";
import type { MotionJobListResponse } from "@/types/motion";
import { ENGINE_LABELS } from "@/types/motion";
import { fetchMotionEngineStatus, fetchMotionJobs } from "@/lib/motion/api-client";
import { MotionJobCard } from "@/components/motion/MotionJobCard";

export default function MotionListPage() {
  const [response, setResponse] = useState<MotionJobListResponse | null>(null);
  const [engineStatus, setEngineStatus] = useState<MotionEngineStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      const [jobs, status] = await Promise.all([
        fetchMotionJobs(),
        fetchMotionEngineStatus(),
      ]);
      setResponse(jobs);
      setEngineStatus(status);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // Auto-refresh toutes les 5s pour suivre la progression des jobs en cours
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, []);

  const jobs = response?.data ?? [];

  return (
    <div style={{ maxWidth: 1400, margin: "0 auto" }}>
      <Link href="/atelier-da" style={backLinkStyle}>
        <ArrowLeft size={14} strokeWidth={1.6} /> Atelier DA
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
            Atelier Motion
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
            Génération vidéo IA via Gemini Omni Flash / Veo 3.1. Trois modes :
            Reels Insta narratifs, ambiance lookbook, motion packshot. Le seul
            maillon manquant du Hub : image → vidéo.
          </p>
        </div>
        <Link href="/atelier-da/motion/new" style={primaryButton}>
          <Plus size={14} strokeWidth={1.8} /> Nouvelle vidéo
        </Link>
      </header>

      {/* Engine status banner */}
      {engineStatus && (
        <div
          style={{
            padding: "10px 16px",
            background: engineStatus.active === "stub" ? "#F3E0C5" : "var(--hub-bg)",
            border: "0.5px solid var(--hub-border)",
            borderRadius: 8,
            marginBottom: 20,
            fontFamily: "var(--font-sans)",
            fontSize: 12,
            color: engineStatus.active === "stub" ? "#8A5A1E" : "var(--hub-foreground)",
            display: "flex",
            gap: 10,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <strong>Moteur actif</strong> : {ENGINE_LABELS[engineStatus.active]}
          {engineStatus.active === "stub" && (
            <span style={{ opacity: 0.8 }}>
              ·{" "}
              Configure <code style={codeInline}>GEMINI_API_KEY</code> et{" "}
              <code style={codeInline}>ATELIER_MOTION_ENGINE=veo-3.1</code> dans{" "}
              <code style={codeInline}>apps/atelier-social/.env.local</code> pour
              activer la génération réelle.
            </span>
          )}
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

      {loading && jobs.length === 0 ? (
        <div style={{ padding: 60, textAlign: "center" }}>
          <Loader2 size={22} className="animate-spin" />
        </div>
      ) : jobs.length === 0 ? (
        <div
          style={{
            padding: 60,
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
          <Film
            size={28}
            strokeWidth={1.4}
            style={{ display: "block", margin: "0 auto 12px", opacity: 0.4 }}
          />
          Aucune vidéo générée pour l&apos;instant. Lance ta première via{" "}
          <Link
            href="/atelier-da/motion/new"
            style={{ color: "var(--color-brand-rose, #A76059)" }}
          >
            Nouvelle vidéo
          </Link>
          .
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
            gap: 12,
          }}
        >
          {jobs.map((j) => (
            <MotionJobCard key={j.id} job={j} />
          ))}
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

const codeInline: React.CSSProperties = {
  fontFamily: "ui-monospace, SFMono-Regular, monospace",
  fontSize: 11,
  background: "white",
  padding: "1px 6px",
  borderRadius: 4,
  margin: "0 2px",
};
