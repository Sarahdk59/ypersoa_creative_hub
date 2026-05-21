/**
 * MotionSourceSelector — grille de sources selon le mode actif.
 *  - reel     : collections Atelier Shooting (stub Sprint 1)
 *  - ambiance : lookbooks actifs + 5 ambiances officielles (stubs)
 *  - packshot : packshots de la médiathèque (source = "packshot")
 */
"use client";

import { useEffect, useState } from "react";
import { Check, ImageOff, Loader2 } from "lucide-react";

import type { MotionMode, MotionSource } from "@/types/motion";
import { fetchMotionSources } from "@/lib/motion/api-client";

interface MotionSourceSelectorProps {
  mode: MotionMode;
  value: string | null;
  onChange: (sourceId: string, source: MotionSource) => void;
}

export function MotionSourceSelector({ mode, value, onChange }: MotionSourceSelectorProps) {
  const [sources, setSources] = useState<MotionSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchMotionSources(mode)
      .then((r) => {
        if (!cancelled) setSources(r);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Erreur");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [mode]);

  if (loading) {
    return (
      <div style={{ padding: 32, textAlign: "center" }}>
        <Loader2 size={20} className="animate-spin" />
      </div>
    );
  }
  if (error) {
    return (
      <div
        style={{
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
    );
  }
  if (sources.length === 0) {
    return (
      <div
        style={{
          padding: 32,
          border: "1px dashed var(--hub-border)",
          borderRadius: 12,
          background: "white",
          textAlign: "center",
          fontFamily: "var(--font-sans)",
          fontSize: 13,
          color: "var(--hub-foreground)",
          opacity: 0.6,
        }}
      >
        <ImageOff size={20} style={{ display: "block", margin: "0 auto 8px", opacity: 0.5 }} />
        Aucune source disponible pour ce mode.
        {mode === "packshot" && " Upload un packshot depuis la médiathèque (source = packshot)."}
      </div>
    );
  }

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
        gap: 10,
      }}
    >
      {sources.map((s) => {
        const isSelected = value === s.id;
        const cover = s.type === "collection" ? s.shots[0]?.public_url : s.public_url;
        return (
          <button
            key={s.id}
            type="button"
            onClick={() => onChange(s.id, s)}
            style={{
              background: "white",
              border: isSelected
                ? "1.5px solid var(--hub-foreground)"
                : "0.5px solid var(--hub-border)",
              borderRadius: 10,
              overflow: "hidden",
              padding: 0,
              cursor: "pointer",
              display: "flex",
              flexDirection: "column",
              position: "relative",
              textAlign: "left",
            }}
          >
            <div
              style={{
                aspectRatio: "4/5",
                background: "var(--hub-bg)",
                overflow: "hidden",
              }}
            >
              {cover && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={cover}
                  alt={s.label}
                  loading="lazy"
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    display: "block",
                  }}
                />
              )}
            </div>
            <div style={{ padding: 8 }}>
              <p
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: 11,
                  fontWeight: 600,
                  margin: 0,
                  color: "var(--hub-foreground)",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
                title={s.label}
              >
                {s.label}
              </p>
              {s.type === "collection" && (
                <p
                  style={{
                    fontFamily: "var(--font-sans)",
                    fontSize: 9,
                    color: "var(--hub-foreground)",
                    opacity: 0.55,
                    margin: "2px 0 0 0",
                  }}
                >
                  {s.shots.length} shot{s.shots.length > 1 ? "s" : ""}
                </p>
              )}
            </div>
            {isSelected && (
              <span
                style={{
                  position: "absolute",
                  top: 6,
                  right: 6,
                  width: 22,
                  height: 22,
                  borderRadius: 999,
                  background: "var(--hub-foreground)",
                  color: "var(--hub-bg)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Check size={12} strokeWidth={2.4} />
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
