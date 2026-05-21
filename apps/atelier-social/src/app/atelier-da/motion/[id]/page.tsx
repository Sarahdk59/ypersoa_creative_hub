/**
 * /atelier-da/motion/[id] — fiche détaillée d'un job Motion.
 *
 * Polling auto pendant que le job est en_cours.
 */
"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Trash2 } from "lucide-react";

import type { MotionJob } from "@/types/motion";
import {
  ENGINE_LABELS,
  MODE_LABELS,
  STATUT_COLORS,
  STATUT_LABELS,
} from "@/types/motion";
import { deleteMotionJob, fetchMotionJob } from "@/lib/motion/api-client";
import { ClipPreview } from "@/components/motion/ClipPreview";

export default function MotionJobDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;
  const [job, setJob] = useState<MotionJob | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    try {
      const j = await fetchMotionJob(id);
      setJob(j);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  // Auto-refresh tant que le job tourne
  useEffect(() => {
    if (!job) return;
    if (job.statut === "en_cours" || job.statut === "en_attente") {
      const t = setInterval(load, 3000);
      return () => clearInterval(t);
    }
  }, [job, load]);

  const handleDelete = async () => {
    if (!job) return;
    if (!confirm(`Supprimer le job ${job.code} ?`)) return;
    setDeleting(true);
    try {
      await deleteMotionJob(id);
      router.push("/atelier-da/motion");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
      setDeleting(false);
    }
  };

  if (loading && !job) {
    return (
      <div style={{ padding: 60, textAlign: "center" }}>
        <Loader2 size={22} className="animate-spin" />
      </div>
    );
  }

  if (!job) {
    return (
      <div style={{ maxWidth: 800, margin: "0 auto" }}>
        <Link href="/atelier-da/motion" style={backLinkStyle}>
          <ArrowLeft size={14} strokeWidth={1.6} /> Atelier Motion
        </Link>
        <div
          style={{
            padding: 32,
            border: "1px solid #E2A8A2",
            borderRadius: 12,
            background: "#FAEBE8",
            color: "#7C2A24",
            fontFamily: "var(--font-sans)",
            fontSize: 14,
          }}
        >
          Job introuvable {error ? `(${error})` : ""}.
        </div>
      </div>
    );
  }

  const statutCol = STATUT_COLORS[job.statut];

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto" }}>
      <Link href="/atelier-da/motion" style={backLinkStyle}>
        <ArrowLeft size={14} strokeWidth={1.6} /> Atelier Motion
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
          <span
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 11,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "var(--hub-foreground)",
              opacity: 0.55,
              fontWeight: 600,
            }}
          >
            {job.code} · {MODE_LABELS[job.mode]} · {ENGINE_LABELS[job.engine]}
          </span>
          <h1
            style={{
              fontFamily: "var(--font-editorial)",
              fontSize: 32,
              fontWeight: 500,
              letterSpacing: "-0.015em",
              margin: "6px 0 0 0",
            }}
          >
            {job.source_label}
          </h1>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span
            style={{
              padding: "6px 14px",
              borderRadius: 999,
              background: statutCol.bg,
              color: statutCol.fg,
              fontFamily: "var(--font-sans)",
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
            }}
          >
            {STATUT_LABELS[job.statut]}
            {(job.statut === "en_cours" || job.statut === "en_attente") && (
              <Loader2 size={12} className="animate-spin" style={{ marginLeft: 6, verticalAlign: "middle" }} />
            )}
          </span>
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            style={{
              background: "transparent",
              border: "0.5px solid #E2A8A2",
              color: "#7C2A24",
              borderRadius: 9999,
              padding: "8px 16px",
              fontFamily: "var(--font-sans)",
              fontSize: 12,
              cursor: deleting ? "not-allowed" : "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <Trash2 size={12} /> {deleting ? "Suppression…" : "Supprimer"}
          </button>
        </div>
      </header>

      {/* Métadonnées */}
      <section
        style={{
          background: "white",
          border: "0.5px solid var(--hub-border)",
          borderRadius: 12,
          padding: 16,
          marginBottom: 20,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
          gap: 12,
        }}
      >
        <Meta label="Mode" value={MODE_LABELS[job.mode]} />
        {job.format && <Meta label="Format" value={job.format === "court" ? "Court (~32s)" : "Complet (~56s)"} />}
        <Meta label="Clips générés" value={`${job.clips.filter((c) => c.statut === "genere").length} / ${job.clips.length}`} />
        <Meta label="Durée totale" value={job.duree_totale_sec > 0 ? `${job.duree_totale_sec}s` : "—"} />
        <Meta
          label="Créé le"
          value={new Date(job.created_at).toLocaleString("fr-FR", {
            day: "numeric",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
          })}
        />
        {job.brief && <Meta label="Brief éditorial" value={job.brief} multiline />}
      </section>

      {/* Clips grid */}
      {job.clips.length > 0 && (
        <section style={{ marginBottom: 24 }}>
          <h2
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              margin: "0 0 12px 0",
              color: "var(--hub-foreground)",
              opacity: 0.7,
            }}
          >
            Clips ({job.clips.length})
          </h2>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
              gap: 12,
            }}
          >
            {job.clips.map((c) => (
              <ClipPreview key={c.ordre} clip={c} />
            ))}
          </div>
        </section>
      )}

      {/* À faire manuel */}
      {job.a_faire_manuel.length > 0 && (
        <section
          style={{
            background: "white",
            border: "0.5px solid var(--hub-border)",
            borderRadius: 12,
            padding: 20,
          }}
        >
          <h2
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              margin: "0 0 12px 0",
              color: "var(--hub-foreground)",
              opacity: 0.7,
            }}
          >
            À faire manuel
          </h2>
          <ul
            style={{
              margin: 0,
              paddingLeft: 18,
              fontFamily: "var(--font-sans)",
              fontSize: 13,
              color: "var(--hub-foreground)",
              opacity: 0.85,
              lineHeight: 1.6,
            }}
          >
            {job.a_faire_manuel.map((line, i) => (
              <li key={i} style={{ marginBottom: 4 }}>
                {line}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function Meta({ label, value, multiline }: { label: string; value: string; multiline?: boolean }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <span
        style={{
          fontFamily: "var(--font-sans)",
          fontSize: 10,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color: "var(--hub-foreground)",
          opacity: 0.55,
          fontWeight: 600,
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontFamily: "var(--font-sans)",
          fontSize: 13,
          color: "var(--hub-foreground)",
          whiteSpace: multiline ? "pre-wrap" : "normal",
        }}
      >
        {value}
      </span>
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
