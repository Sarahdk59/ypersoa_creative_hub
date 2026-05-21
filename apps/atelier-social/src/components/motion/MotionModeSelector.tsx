/**
 * MotionModeSelector — 3 cartes : Reel / Ambiance / Packshot.
 */
"use client";

import { Film, Image as ImageIcon, Sparkles } from "lucide-react";

import type { MotionMode } from "@/types/motion";
import { MODE_DESCRIPTIONS, MODE_LABELS } from "@/types/motion";

interface MotionModeSelectorProps {
  value: MotionMode | null;
  onChange: (mode: MotionMode) => void;
}

const ICONS: Record<MotionMode, React.ReactNode> = {
  reel: <Film size={22} strokeWidth={1.4} />,
  ambiance: <Sparkles size={22} strokeWidth={1.4} />,
  packshot: <ImageIcon size={22} strokeWidth={1.4} />,
};

const MODES: MotionMode[] = ["reel", "ambiance", "packshot"];

export function MotionModeSelector({ value, onChange }: MotionModeSelectorProps) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
        gap: 12,
      }}
    >
      {MODES.map((m) => {
        const isSelected = value === m;
        return (
          <button
            key={m}
            type="button"
            onClick={() => onChange(m)}
            style={{
              background: isSelected ? "var(--hub-foreground)" : "white",
              color: isSelected ? "var(--hub-bg)" : "var(--hub-foreground)",
              border: isSelected
                ? "1.5px solid var(--hub-foreground)"
                : "0.5px solid var(--hub-border)",
              borderRadius: 12,
              padding: 16,
              textAlign: "left",
              cursor: "pointer",
              display: "flex",
              flexDirection: "column",
              gap: 8,
              transition: "background 150ms ease, border-color 150ms ease",
            }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: isSelected
                  ? "rgba(250,247,242,0.15)"
                  : "var(--hub-bg)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {ICONS[m]}
            </div>
            <h3
              style={{
                fontFamily: "var(--font-editorial)",
                fontSize: 18,
                fontWeight: 500,
                margin: 0,
                color: "inherit",
                lineHeight: 1.2,
              }}
            >
              {MODE_LABELS[m]}
            </h3>
            <p
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: 12,
                margin: 0,
                color: "inherit",
                opacity: isSelected ? 0.85 : 0.65,
                lineHeight: 1.5,
              }}
            >
              {MODE_DESCRIPTIONS[m]}
            </p>
          </button>
        );
      })}
    </div>
  );
}
