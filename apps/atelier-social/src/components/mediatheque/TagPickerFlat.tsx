/**
 * TagPickerFlat — recherche + liste de chips, multi-sélection.
 *
 * Bloc UI partagé par le tagging batch de la galerie (BatchTagModal). La
 * fiche détail (`[id]/page.tsx`) et l'upload détaillé (`UploadDropzone.tsx`)
 * ont chacun leur propre variante locale, quasi identique — pas migrés ici
 * pour ne pas élargir le risque d'un changement qui n'a été demandé que pour
 * le batch tagging.
 */
"use client";

import { useMemo, useState } from "react";

import type { Tag, TagCategory } from "@/types/mediatheque";
import { TAG_CATEGORY_LABELS, TAG_CATEGORY_ORDER } from "@/types/mediatheque";

interface TagPickerFlatProps {
  tagsByCategory: Record<string, Tag[]>;
  selected: Set<string>;
  onToggle: (tagId: string) => void;
}

export function TagPickerFlat({ tagsByCategory, selected, onToggle }: TagPickerFlatProps) {
  const [filter, setFilter] = useState("");

  const flat = useMemo<Array<{ category: TagCategory; tag: Tag }>>(() => {
    const out: Array<{ category: TagCategory; tag: Tag }> = [];
    for (const cat of TAG_CATEGORY_ORDER) {
      for (const t of tagsByCategory[cat] ?? []) out.push({ category: cat, tag: t });
    }
    return out;
  }, [tagsByCategory]);

  const filtered = useMemo(() => {
    const q = filter.toLowerCase().trim();
    if (!q) return flat;
    return flat.filter(
      ({ tag, category }) =>
        tag.label.toLowerCase().includes(q) ||
        tag.slug.includes(q) ||
        TAG_CATEGORY_LABELS[category].toLowerCase().includes(q),
    );
  }, [flat, filter]);

  return (
    <div>
      <input
        type="search"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        placeholder="Filtrer les tags (motif, gabarit, ypm-005…)"
        style={{
          width: "100%",
          marginBottom: 8,
          background: "var(--hub-bg)",
          border: "0.5px solid var(--hub-border)",
          borderRadius: 8,
          padding: "8px 12px",
          fontFamily: "var(--font-sans)",
          fontSize: 13,
          color: "var(--hub-foreground)",
          outline: "none",
        }}
      />
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 4,
          maxHeight: 260,
          overflowY: "auto",
        }}
      >
        {filtered.map(({ tag, category }) => {
          const isSel = selected.has(tag.id);
          return (
            <button
              key={tag.id}
              type="button"
              onClick={() => onToggle(tag.id)}
              title={`${TAG_CATEGORY_LABELS[category]} · ${tag.slug}`}
              style={{
                padding: "5px 10px",
                borderRadius: 999,
                border: isSel ? "0.5px solid var(--hub-foreground)" : "0.5px solid var(--hub-border)",
                background: isSel ? "var(--hub-foreground)" : "white",
                color: isSel ? "var(--hub-bg)" : "var(--hub-foreground)",
                fontFamily: "var(--font-sans)",
                fontSize: 11,
                cursor: "pointer",
              }}
            >
              {tag.label}
            </button>
          );
        })}
        {filtered.length === 0 && (
          <span style={{ fontFamily: "var(--font-sans)", fontSize: 11, color: "var(--hub-foreground)", opacity: 0.5 }}>
            Aucun tag ne correspond.
          </span>
        )}
      </div>
    </div>
  );
}
