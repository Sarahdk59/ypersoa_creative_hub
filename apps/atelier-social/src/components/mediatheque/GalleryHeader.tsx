/**
 * GalleryHeader — barre sticky en haut de /atelier-da/mediatheque.
 *
 * Recherche + tri + bouton "+ Upload" + compteur résultats.
 */
"use client";

import Link from "next/link";
import { Search, Upload, CheckSquare, Square, LayoutGrid } from "lucide-react";

import type { SortOrder } from "@/types/mediatheque";

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

      {/* Bouton Upload */}
      <Link
        href="/atelier-da/mediatheque/upload"
        style={{
          marginLeft: onOpenAudit ? 0 : "auto",
          display: "flex",
          alignItems: "center",
          gap: 6,
          background: "var(--color-brand-rose, #A76059)",
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
  );
}
