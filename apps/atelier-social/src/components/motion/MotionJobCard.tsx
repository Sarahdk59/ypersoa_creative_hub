/**
 * MotionJobCard — tuile pour un job dans la liste /atelier-da/motion.
 */
"use client";

import Link from "next/link";
import { useState } from "react";
import { Download, Film, Plus, Trash2 } from "lucide-react";

import type { MotionJobListResponse } from "@/types/motion";
import { ENGINE_LABELS, MODE_LABELS, STATUT_COLORS, STATUT_LABELS } from "@/types/motion";

interface MotionJobCardProps {
  job: MotionJobListResponse["data"][number];
  onDeleted?: () => void;
}

export function MotionJobCard({ job, onDeleted }: MotionJobCardProps) {
  const okClips = job.clips.filter((c) => c.statut === "genere");
  const statutCol = STATUT_COLORS[job.statut];
  const [deleting, setDeleting] = useState(false);
  const downloadable = okClips.find((clip) => !clip.clip_url?.startsWith("data:"));

  const remove = async () => {
    if (!confirm(`Supprimer ${job.code} ? Cette action retire la vidéo de la liste.`)) return;
    setDeleting(true);
    try {
      const response = await fetch(`/api/da/motion/jobs/${job.id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Suppression impossible");
      onDeleted?.();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Suppression impossible");
      setDeleting(false);
    }
  };

  return (
    <article
        style={{
          background: "white",
          border: "0.5px solid var(--hub-border)",
          borderRadius: 12,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          transition: "transform 200ms ease, border-color 150ms ease",
        }}
      >
        <Link href={`/atelier-da/motion/${job.id}`} style={{ textDecoration: "none", color: "inherit", display: "block" }}>
          <div
          style={{
            aspectRatio: "9/16",
            background: "var(--hub-bg)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            position: "relative",
          }}
        >
          {okClips[0]?.clip_url && !okClips[0].clip_url.startsWith("data:video/mp4;base64,STUB") ? (
            // eslint-disable-next-line jsx-a11y/media-has-caption
            <video
              src={okClips[0].clip_url}
              muted
              loop
              autoPlay
              playsInline
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
              }}
            />
          ) : (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 8,
                color: "var(--hub-foreground)",
                opacity: 0.4,
              }}
            >
              <Film size={28} strokeWidth={1.4} />
              <span style={{ fontFamily: "var(--font-sans)", fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                {job.clips.length === 0 ? "Pas encore généré" : `${okClips.length}/${job.clips.length} clips`}
              </span>
            </div>
          )}
          <span
            style={{
              position: "absolute",
              top: 8,
              right: 8,
              padding: "3px 8px",
              borderRadius: 999,
              background: statutCol.bg,
              color: statutCol.fg,
              fontFamily: "var(--font-sans)",
              fontSize: 9,
              fontWeight: 600,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            {STATUT_LABELS[job.statut]}
          </span>
          </div>
          <div
          style={{
            padding: 12,
            display: "flex",
            flexDirection: "column",
            gap: 4,
          }}
        >
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
            {job.code} · {MODE_LABELS[job.mode]}
          </span>
          <h3
            style={{
              fontFamily: "var(--font-editorial)",
              fontSize: 16,
              fontWeight: 500,
              margin: 0,
              color: "var(--hub-foreground)",
              lineHeight: 1.2,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
            title={job.source_label}
          >
            {job.source_label}
          </h3>
          <p
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 10,
              color: "var(--hub-foreground)",
              opacity: 0.55,
              margin: 0,
            }}
          >
            {ENGINE_LABELS[job.engine]}
            {job.duree_totale_sec > 0 && ` · ${job.duree_totale_sec}s total`}
          </p>
          </div>
        </Link>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", borderTop: "0.5px solid var(--hub-border)" }}>
          <Link href="/atelier-da/motion/new" aria-label="Nouvelle vidéo" title="Nouvelle vidéo" style={actionStyle}>
            <Plus size={15} strokeWidth={1.7} />
          </Link>
          {downloadable ? (
            <a href={`/api/da/motion/jobs/${job.id}/clips/${downloadable.ordre}/download`} aria-label="Télécharger la vidéo" title="Télécharger la vidéo" style={actionStyle}>
              <Download size={14} strokeWidth={1.7} />
            </a>
          ) : (
            <span aria-label="Téléchargement indisponible" title="Téléchargement disponible après génération" style={{ ...actionStyle, opacity: 0.32, cursor: "not-allowed" }}>
              <Download size={14} strokeWidth={1.7} />
            </span>
          )}
          <button type="button" onClick={remove} disabled={deleting} aria-label="Supprimer la vidéo" title="Supprimer la vidéo" style={{ ...actionStyle, border: "none", borderLeft: "0.5px solid var(--hub-border)", color: "#9B3C35", cursor: deleting ? "not-allowed" : "pointer" }}>
            <Trash2 size={14} strokeWidth={1.7} />
          </button>
        </div>
      </article>
  );
}

const actionStyle: React.CSSProperties = {
  minHeight: 38,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  color: "var(--hub-foreground)",
  background: "white",
  textDecoration: "none",
  borderRight: "0.5px solid var(--hub-border)",
};
