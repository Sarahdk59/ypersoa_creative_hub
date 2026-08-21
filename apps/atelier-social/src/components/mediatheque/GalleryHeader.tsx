/**
 * GalleryHeader — barre sticky en haut de /bibliotheque/visuels.
 *
 * Recherche + tri + bouton "+ Upload" + compteur résultats.
 */
"use client";

import Link from "next/link";
import { Search, Upload, CheckSquare, Square, LayoutGrid } from "lucide-react";

import type { SortOrder } from "@/types/mediatheque";

export type QuickView = "occasion" | "motif" | "ready" | "recent";

const QUICK_VIEWS: { id: QuickView; label: string }[] = [
  { id: "occasion", label: "Par occasion" },
  { id: "motif", label: "Par motif" },
  { id: "ready", label: "Prêt à publier" },
  { id: "recent", label: "Récents" },
];

interface GalleryHeaderProps {
  q: string;
  onQChange: (v: string) => void;
  sort: SortOrder;
  onSortChange: (v: SortOrder) => void;
  total: number;
  loading: boolean;
  selectMode: boolean;
  onToggleSelectMode: () => void;
  selectedCount: number;
  onOpenAudit?: () => void;
  activeQuickView?: QuickView | null;
  onQuickView?: (view: QuickView) => void;
  onSelectAll?: () => void;
  allSelected?: boolean;
}

export function GalleryHeader({
  q,
  onQChange,
  sort,
  onSortChange,
  total,
  loading,
  selectMode,
  onToggleSelectMode,
  selectedCount,
  onOpenAudit,
  activeQuickView,
  onQuickView,
  onSelectAll,
  allSelected,
}: GalleryHeaderProps) {
  return (
    <div
      style={{
        position: "sticky",
        top: 0,
        zIndex: 10,
        background: "var(--hub-bg)",
        paddingBottom: 16,
        marginBottom: 16,
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      {onQuickView && (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {QUICK_VIEWS.map((v) => {
            const active = activeQuickView === v.id;
            return (
              <button
                key={v.id}
                type="button"
                onClick={() => onQuickView(v.id)}
                style={{
                  background: active ? "var(--hub-foreground)" : "var(--hub-accent-wash)",
                  color: active ? "var(--hub-bg)" : "var(--hub-foreground)",
                  border: "none",
                  borderRadius: 9999,
                  padding: "6px 14px",
                  fontFamily: "var(--font-sans)",
                  fontSize: 12,
                  fontWeight: 500,
                  cursor: "pointer",
                }}
              >
                {v.label}
              </button>
            );
          })}
        </div>
      )}

      <div
        style={{
          display: "flex",
          gap: 12,
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
      {/* Recherche */}
      <div
        style={{
          flex: "1 1 280px",
          minWidth: 240,
          position: "relative",
          background: "white",
          border: "0.5px solid var(--hub-border)",
          borderRadius: 9999,
          display: "flex",
          alignItems: "center",
          paddingLeft: 14,
        }}
      >
        <Search size={14} strokeWidth={1.6} style={{ opacity: 0.45 }} />
        <input
          type="search"
          value={q}
          onChange={(e) => onQChange(e.target.value)}
          placeholder="Recherche par nom, note, tag…"
          style={{
            flex: 1,
            background: "transparent",
            border: "none",
            outline: "none",
            padding: "10px 12px",
            fontFamily: "var(--font-sans)",
            fontSize: 13,
            color: "var(--hub-foreground)",
          }}
        />
      </div>

      {/* Tri */}
      <select
        value={sort}
        onChange={(e) => onSortChange(e.target.value as SortOrder)}
        style={{
          background: "white",
          border: "0.5px solid var(--hub-border)",
          borderRadius: 9999,
          padding: "10px 14px",
          fontFamily: "var(--font-sans)",
          fontSize: 12,
          color: "var(--hub-foreground)",
          cursor: "pointer",
        }}
      >
        <option value="date_desc">Plus récent d&apos;abord</option>
        <option value="date_asc">Plus ancien d&apos;abord</option>
        <option value="name_asc">Nom A → Z</option>
      </select>

      {/* Mode sélection */}
      <button
        type="button"
        onClick={onToggleSelectMode}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          background: selectMode ? "var(--hub-foreground)" : "white",
          color: selectMode ? "var(--hub-bg)" : "var(--hub-foreground)",
          border: "0.5px solid var(--hub-border)",
          borderRadius: 9999,
          padding: "10px 14px",
          fontFamily: "var(--font-sans)",
          fontSize: 12,
          fontWeight: 500,
          cursor: "pointer",
        }}
      >
        {selectMode ? <CheckSquare size={14} /> : <Square size={14} />}
        {selectMode ? `Sélection (${selectedCount})` : "Sélection"}
      </button>

      {selectMode && onSelectAll && (
        <button
          type="button"
          onClick={onSelectAll}
          style={{
            background: "transparent",
            border: "0.5px solid var(--hub-border)",
            borderRadius: 9999,
            padding: "10px 14px",
            fontFamily: "var(--font-sans)",
            fontSize: 12,
            color: "var(--hub-foreground)",
            cursor: "pointer",
          }}
        >
          {allSelected ? "Tout désélectionner" : "Tout sélectionner"}
        </button>
      )}

      {/* Total */}
      <span
        style={{
          fontFamily: "var(--font-sans)",
          fontSize: 12,
          color: "var(--hub-foreground)",
          opacity: 0.55,
          marginLeft: 4,
        }}
      >
        {loading ? "…" : `${total} photo${total > 1 ? "s" : ""}`}
      </span>

      {/* Bouton Audit production */}
      {onOpenAudit && (
        <button
          type="button"
          onClick={onOpenAudit}
          style={{
            marginLeft: "auto",
            display: "flex",
            alignItems: "center",
            gap: 6,
            background: "white",
            color: "var(--hub-foreground)",
            border: "0.5px solid var(--hub-border)",
            borderRadius: 9999,
            padding: "10px 16px",
            fontFamily: "var(--font-sans)",
            fontSize: 12,
            fontWeight: 500,
            letterSpacing: "0.04em",
            cursor: "pointer",
          }}
          title="Voir la couverture motifs × produits et combler les trous en 2 clics"
        >
          <LayoutGrid size={14} strokeWidth={1.8} /> Audit production
        </button>
      )}

      {/* Bouton Upload — action primaire de l'écran = coquelicot plein (DESIGN_SYSTEM_hub.md v2) */}
      <Link
        href="/bibliotheque/visuels/upload"
        style={{
          marginLeft: onOpenAudit ? 0 : "auto",
          display: "flex",
          alignItems: "center",
          gap: 6,
          background: "var(--hub-accent)",
          color: "white",
          textDecoration: "none",
          borderRadius: 9999,
          padding: "10px 18px",
          fontFamily: "var(--font-sans)",
          fontSize: 12,
          fontWeight: 500,
          letterSpacing: "0.04em",
        }}
      >
        <Upload size={14} strokeWidth={1.8} /> Uploader
      </Link>
      </div>
    </div>
  );
}
