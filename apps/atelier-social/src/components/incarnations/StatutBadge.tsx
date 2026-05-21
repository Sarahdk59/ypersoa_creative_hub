/**
 * StatutBadge — pastille colorée pour les 6 statuts workflow.
 */
"use client";

import type { IncarnationStatut } from "@/types/incarnations";
import { STATUT_COLORS, STATUT_LABELS } from "@/types/incarnations";

interface StatutBadgeProps {
  statut: IncarnationStatut;
  size?: "sm" | "md";
}

export function StatutBadge({ statut, size = "sm" }: StatutBadgeProps) {
  const col = STATUT_COLORS[statut];
  return (
    <span
      style={{
        padding: size === "sm" ? "3px 8px" : "4px 12px",
        borderRadius: 999,
        background: col.bg,
        color: col.fg,
        fontFamily: "var(--font-sans)",
        fontSize: size === "sm" ? 10 : 11,
        fontWeight: 600,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        display: "inline-block",
        whiteSpace: "nowrap",
      }}
    >
      {STATUT_LABELS[statut]}
    </span>
  );
}
