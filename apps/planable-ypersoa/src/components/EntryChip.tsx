"use client";
import { OCCASION_COLOR, OCCASION_LABEL, PLATFORM_COLOR, PLATFORM_LABEL } from "@/lib/brand/tokens";
import type { PlanableCalendarEntryRow } from "@/lib/supabase/types";

const STATUS_BORDER: Record<string, string> = {
  draft: "1px dashed",
  pack_generated: "1px solid",
  scheduled: "1.5px solid",
  published: "1.5px solid",
  failed: "1.5px solid #c53030",
};

const PLATFORM_PREFIX: Record<string, string> = {
  instagram_post: "P",
  instagram_reel: "R",
  instagram_story: "S",
  pinterest_pin: "Pin",
};

export function EntryChip({
  entry,
  onClick,
  selected,
}: {
  entry: PlanableCalendarEntryRow;
  onClick?: () => void;
  selected?: boolean;
}) {
  // Couleur principale = occasion si définie, sinon fallback plateforme
  const color = (entry.occasion_slug && OCCASION_COLOR[entry.occasion_slug])
    || PLATFORM_COLOR[entry.platform]
    || "#1A1614";
  const time = new Date(entry.scheduled_at).toLocaleTimeString("fr-FR", {
    hour: "2-digit", minute: "2-digit",
  });
  const occasionLabel = entry.occasion_slug ? OCCASION_LABEL[entry.occasion_slug] : null;
  const title = [
    occasionLabel,
    PLATFORM_LABEL[entry.platform],
    entry.motif_code,
    time,
  ].filter(Boolean).join(" · ");

  // Fond légèrement teinté = la couleur d'occasion à 18% d'opacité
  const tintedBg = selected ? color : hexWithAlpha(color, 0.18);
  const textColor = selected ? "white" : color;

  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      style={{
        display: "block",
        width: "100%",
        textAlign: "left",
        padding: "3px 6px",
        borderRadius: 6,
        border: STATUS_BORDER[entry.status] ?? "1px solid",
        borderColor: color,
        background: tintedBg,
        color: textColor,
        fontSize: 10,
        fontWeight: 600,
        fontFamily: "var(--font-sans)",
        cursor: "pointer",
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
        opacity: entry.status === "published" ? 1 : 0.95,
      }}
    >
      {time} · {PLATFORM_PREFIX[entry.platform] ?? "?"} · {entry.motif_code}
      {entry.status === "published" && " ✓"}
    </button>
  );
}

/** Convertit un hex (#RRGGBB) en rgba avec alpha donné. */
function hexWithAlpha(hex: string, alpha: number): string {
  const h = hex.replace("#", "");
  if (h.length !== 6) return hex;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
