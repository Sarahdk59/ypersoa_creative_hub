/**
 * ClipPreview — affichage d'un ClipPlan (video player ou état).
 */
"use client";

import { AlertTriangle, Film, Loader2 } from "lucide-react";

import type { ClipPlan } from "@/types/motion";

interface ClipPreviewProps {
  clip: ClipPlan;
}

export function ClipPreview({ clip }: ClipPreviewProps) {
  const isStub = clip.clip_url?.startsWith("data:video/mp4;base64,STUB");

  return (
    <article
      style={{
        background: "white",
        border: "0.5px solid var(--hub-border)",
        borderRadius: 10,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
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
        {clip.statut === "genere" && clip.clip_url && !isStub ? (
          // eslint-disable-next-line jsx-a11y/media-has-caption
          <video
            src={clip.clip_url}
            controls
            muted
            loop
            playsInline
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          <ClipPlaceholder clip={clip} isStub={isStub} />
        )}
        <span
          style={{
            position: "absolute",
            top: 6,
            left: 6,
            padding: "2px 8px",
            borderRadius: 999,
            background: "var(--hub-foreground)",
            color: "var(--hub-bg)",
            fontFamily: "var(--font-sans)",
            fontSize: 9,
            fontWeight: 600,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          Clip {String(clip.ordre).padStart(2, "0")}
        </span>
      </div>
      <div style={{ padding: 10 }}>
        <p
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 10,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "var(--hub-foreground)",
            opacity: 0.55,
            margin: 0,
            fontWeight: 600,
          }}
        >
          {clip.shot_type}
        </p>
        {clip.erreur && (
          <p
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 11,
              color: "#7C2A24",
              margin: "4px 0 0 0",
              display: "flex",
              alignItems: "flex-start",
              gap: 4,
            }}
          >
            <AlertTriangle size={11} style={{ marginTop: 2, flexShrink: 0 }} />
            {clip.erreur}
          </p>
        )}
      </div>
    </article>
  );
}

function ClipPlaceholder({ clip, isStub }: { clip: ClipPlan; isStub: boolean | undefined }) {
  if (clip.statut === "en_cours") {
    return (
      <div style={placeholderStyle("#2E4D6E")}>
        <Loader2 size={28} className="animate-spin" />
        <span>Génération…</span>
      </div>
    );
  }
  if (clip.statut === "echec") {
    return (
      <div style={placeholderStyle("#7C2A24")}>
        <AlertTriangle size={28} strokeWidth={1.6} />
        <span>Échec</span>
      </div>
    );
  }
  if (clip.statut === "genere" && isStub) {
    return (
      <div style={placeholderStyle("var(--hub-foreground)")}>
        <Film size={28} strokeWidth={1.4} />
        <span style={{ fontSize: 10, letterSpacing: "0.08em" }}>
          STUB · pas d&apos;API
        </span>
      </div>
    );
  }
  return (
    <div style={placeholderStyle("var(--hub-foreground)")}>
      <Film size={28} strokeWidth={1.4} />
      <span>En attente</span>
    </div>
  );
}

function placeholderStyle(color: string): React.CSSProperties {
  return {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 8,
    color,
    opacity: 0.6,
    fontFamily: "var(--font-sans)",
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: "0.06em",
  };
}
