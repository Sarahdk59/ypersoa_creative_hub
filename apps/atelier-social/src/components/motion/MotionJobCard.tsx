/**
 * MotionJobCard — tuile pour un job dans la liste /atelier-da/motion.
 */
"use client";

import Link from "next/link";
import { Film } from "lucide-react";

import type { MotionJobListResponse } from "@/types/motion";
import { ENGINE_LABELS, MODE_LABELS, STATUT_COLORS, STATUT_LABELS } from "@/types/motion";

interface MotionJobCardProps {
  job: MotionJobListResponse["data"][number];
}

export function MotionJobCard({ job }: MotionJobCardProps) {
  const okClips = job.clips.filter((c) => c.statut === "genere");
  const statutCol = STATUT_COLORS[job.statut];

  return (
    <Link
      href={`/atelier-da/motion/${job.id}`}
      style={{ textDecoration: "none", color: "inherit", display: "block" }}
    >
      <article
        style={{
          background: "white",
          border: "0.5px solid var(--hub-border)",
          borderRadius: 12,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          transition: "transform 200ms ease, border-color 150ms ease",
          cursor: "pointer",
        }}
      >
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
      </article>
    </Link>
  );
}
