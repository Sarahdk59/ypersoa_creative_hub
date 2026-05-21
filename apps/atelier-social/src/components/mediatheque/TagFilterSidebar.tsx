/**
 * TagFilterSidebar — sidebar gauche de la galerie Médiathèque.
 *
 * Affiche les catégories pliables (par défaut : Incarnation, Motif, Gabarit
 * ouvertes ; le reste replié). Compteur d'usage par tag. Clic = toggle.
 *
 * État externalisé : passe `selected` (array de "category:slug") et
 * `onChange` au parent. Logique AND-OR gérée côté store/API.
 */
"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight, X } from "lucide-react";

import type { Tag, TagCategory } from "@/types/mediatheque";
import { TAG_CATEGORY_LABELS, TAG_CATEGORY_ORDER } from "@/types/mediatheque";

const DEFAULT_OPEN: TagCategory[] = ["incarnation", "motif", "gabarit"];

interface TagFilterSidebarProps {
  tagsByCategory: Record<string, Tag[]>;
  usage: Map<string, number>;
  selected: string[];
  onChange: (next: string[]) => void;
}

export function TagFilterSidebar({
  tagsByCategory,
  usage,
  selected,
  onChange,
}: TagFilterSidebarProps) {
  const [open, setOpen] = useState<Set<TagCategory>>(new Set(DEFAULT_OPEN));

  const selectedSet = useMemo(() => new Set(selected), [selected]);

  const toggleCat = (cat: TagCategory) => {
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  const toggleTag = (cat: TagCategory, slug: string) => {
    const ref = `${cat}:${slug}`;
    if (selectedSet.has(ref)) {
      onChange(selected.filter((r) => r !== ref));
    } else {
      onChange([...selected, ref]);
    }
  };

  const hasFilters = selected.length > 0;

  return (
    <aside
      style={{
        width: 260,
        flexShrink: 0,
        background: "white",
        border: "0.5px solid var(--hub-border)",
        borderRadius: 12,
        padding: 16,
        height: "fit-content",
        position: "sticky",
        top: 16,
        maxHeight: "calc(100vh - 120px)",
        overflowY: "auto",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 12,
        }}
      >
        <h3
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "var(--hub-foreground)",
            opacity: 0.7,
            margin: 0,
          }}
        >
          Filtres ({selected.length})
        </h3>
        {hasFilters && (
          <button
            type="button"
            onClick={() => onChange([])}
            style={{
              background: "transparent",
              border: "none",
              fontFamily: "var(--font-sans)",
              fontSize: 11,
              color: "var(--hub-foreground)",
              opacity: 0.6,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 3,
              padding: 0,
            }}
          >
            <X size={12} /> Effacer
          </button>
        )}
      </div>

      {TAG_CATEGORY_ORDER.map((cat) => {
        const tags = tagsByCategory[cat] ?? [];
        if (tags.length === 0) return null;
        const isOpen = open.has(cat);
        const selectedCount = tags.filter((t) =>
          selectedSet.has(`${cat}:${t.slug}`),
        ).length;

        return (
          <section key={cat} style={{ marginBottom: 12 }}>
            <button
              type="button"
              onClick={() => toggleCat(cat)}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                background: "transparent",
                border: "none",
                padding: "6px 0",
                cursor: "pointer",
                fontFamily: "var(--font-sans)",
                fontSize: 12,
                fontWeight: 600,
                color: "var(--hub-foreground)",
              }}
            >
              <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                {isOpen ? (
                  <ChevronDown size={14} strokeWidth={1.6} />
                ) : (
                  <ChevronRight size={14} strokeWidth={1.6} />
                )}
                {TAG_CATEGORY_LABELS[cat]}
              </span>
              {selectedCount > 0 && (
                <span
                  style={{
                    fontSize: 10,
                    background: "var(--hub-foreground)",
                    color: "var(--hub-bg)",
                    padding: "1px 6px",
                    borderRadius: 999,
                    fontWeight: 600,
                  }}
                >
                  {selectedCount}
                </span>
              )}
            </button>

            {isOpen && (
              <ul
                style={{
                  listStyle: "none",
                  padding: 0,
                  margin: "4px 0 0 18px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 2,
                }}
              >
                {tags.map((t) => {
                  const ref = `${cat}:${t.slug}`;
                  const isSelected = selectedSet.has(ref);
                  const count = usage.get(t.id) ?? 0;
                  return (
                    <li key={t.id}>
                      <button
                        type="button"
                        onClick={() => toggleTag(cat, t.slug)}
                        style={{
                          width: "100%",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "4px 8px",
                          borderRadius: 6,
                          border: "none",
                          background: isSelected
                            ? "var(--hub-foreground)"
                            : "transparent",
                          color: isSelected
                            ? "var(--hub-bg)"
                            : "var(--hub-foreground)",
                          fontFamily: "var(--font-sans)",
                          fontSize: 12,
                          textAlign: "left",
                          cursor: "pointer",
                          opacity: count === 0 && !isSelected ? 0.4 : 1,
                        }}
                      >
                        <span
                          style={{
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {t.label}
                        </span>
                        <span
                          style={{
                            fontSize: 10,
                            opacity: 0.7,
                            marginLeft: 6,
                          }}
                        >
                          {count}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        );
      })}
    </aside>
  );
}
