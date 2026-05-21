"use client";
import { Check, Trash2 } from "lucide-react";
import { useState } from "react";
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
  onDelete,
  selected,
  selectionMode,
  checked,
}: {
  entry: PlanableCalendarEntryRow;
  onClick?: () => void;
  onDelete?: () => void;
  selected?: boolean;
  selectionMode?: boolean;
  checked?: boolean;
}) {
  const [hover, setHover] = useState(false);
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

  const isPublished = entry.status === "published";
  const visualSelected = selectionMode ? checked : selected;
  const tintedBg = visualSelected ? color : hexWithAlpha(color, 0.18);
  const textColor = visualSelected ? "white" : color;
  const showTrash = hover && !selectionMode && !isPublished && onDelete;

  return (
    <div
      style={{ position: "relative" }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <button
        type="button"
        onClick={(ev) => { ev.stopPropagation(); onClick?.(); }}
        title={selectionMode ? `${title} · clic pour ${checked ? "désélectionner" : "sélectionner"}` : title}
        style={{
          display: "block",
          width: "100%",
          textAlign: "left",
          padding: "3px 6px",
          paddingRight: showTrash ? 22 : (selectionMode ? 22 : 6),
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
          opacity: isPublished ? 1 : 0.95,
        }}
      >
        {time} · {PLATFORM_PREFIX[entry.platform] ?? "?"} · {entry.motif_code}
        {isPublished && " ✓"}
      </button>

      {showTrash && (
        <button
          type="button"
          onClick={(ev) => {
            ev.stopPropagation();
            if (!confirm(`Supprimer "${title}" ?`)) return;
            onDelete?.();
          }}
          aria-label="Supprimer cette entrée"
          title="Supprimer cette entrée"
          style={{
            position: "absolute",
            right: 3,
            top: "50%",
            transform: "translateY(-50%)",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 16,
            height: 16,
            padding: 0,
            borderRadius: 999,
            background: "white",
            border: "0.5px solid #c53030",
            color: "#c53030",
            cursor: "pointer",
          }}
        >
          <Trash2 size={9} />
        </button>
      )}

      {selectionMode && (
        <span
          aria-hidden
          style={{
            position: "absolute",
            right: 4,
            top: "50%",
            transform: "translateY(-50%)",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 14,
            height: 14,
            borderRadius: 3,
            background: checked ? "white" : "rgba(255,255,255,0.85)",
            border: `1px solid ${checked ? color : "rgba(0,0,0,0.3)"}`,
            color,
            pointerEvents: "none",
          }}
        >
          {checked && <Check size={10} strokeWidth={3} />}
        </span>
      )}
    </div>
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
