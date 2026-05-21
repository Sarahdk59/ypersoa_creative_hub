/**
 * MediaCard — vignette dans la galerie Médiathèque.
 *
 * Card blanche border-rad 12, image masonry, chips incarnation + motif,
 * statut en pastille discrète. Sélection multiple via checkbox top-left.
 */
"use client";

import Link from "next/link";
import { Check } from "lucide-react";

import type { MediaWithTags } from "@/types/mediatheque";
import { STATUT_LABELS } from "@/types/mediatheque";

interface MediaCardProps {
  media: MediaWithTags;
  selectMode: boolean;
  selected: boolean;
  onToggleSelect: (id: string) => void;
}

const STATUT_COLORS: Record<MediaWithTags["statut"], { bg: string; fg: string }> = {
  a_valider: { bg: "#F3E6CF", fg: "#7A5A1E" },
  validee: { bg: "#D7E5DA", fg: "#365D40" },
  publiee_shopify: { bg: "#1E2D4A", fg: "#FAF7F2" },
  archivee: { bg: "#E8E1D6", fg: "#5A5A5A" },
};

export function MediaCard({ media, selectMode, selected, onToggleSelect }: MediaCardProps) {
  const incarnation = media.tags.find((t) => t.category === "incarnation");
  const motif = media.tags.find((t) => t.category === "motif");
  const gabarit = media.tags.find((t) => t.category === "gabarit");
  const statutCol = STATUT_COLORS[media.statut];

  const inner = (
    <article
      style={{
        position: "relative",
        background: "white",
        border: selected
          ? "1.5px solid var(--hub-foreground)"
          : "0.5px solid var(--hub-border)",
        borderRadius: 12,
        overflow: "hidden",
        transition: "transform 200ms ease, box-shadow 200ms ease, border-color 150ms ease",
        cursor: "pointer",
      }}
      className="mediatheque-card"
    >
      {/* Image */}
      <div
        style={{
          width: "100%",
          aspectRatio: media.width && media.height ? `${media.width}/${media.height}` : "4/5",
          background: "var(--hub-bg)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={media.public_url}
          alt={media.filename}
          loading="lazy"
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            display: "block",
          }}
        />

        {/* Statut pill */}
        <span
          style={{
            position: "absolute",
            top: 8,
            right: 8,
            padding: "3px 8px",
            borderRadius: 999,
            fontFamily: "var(--font-sans)",
            fontSize: 9,
            fontWeight: 600,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            background: statutCol.bg,
            color: statutCol.fg,
          }}
        >
          {STATUT_LABELS[media.statut]}
        </span>

        {/* Checkbox sélection */}
        <button
          type="button"
          aria-label={selected ? "Désélectionner" : "Sélectionner"}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onToggleSelect(media.id);
          }}
          style={{
            position: "absolute",
            top: 8,
            left: 8,
            width: 22,
            height: 22,
            borderRadius: 6,
            background: selected ? "var(--hub-foreground)" : "rgba(255,255,255,0.85)",
            border: selected
              ? "1.5px solid var(--hub-foreground)"
              : "1px solid var(--hub-border)",
            display: selectMode || selected ? "flex" : "none",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            padding: 0,
          }}
          className="mediatheque-card-checkbox"
        >
          {selected && <Check size={14} strokeWidth={2.5} color="var(--hub-bg)" />}
        </button>
      </div>

      {/* Métadonnées */}
      <div style={{ padding: 12 }}>
        <div
          style={{
            display: "flex",
            gap: 6,
            flexWrap: "wrap",
            marginBottom: 8,
            minHeight: 22,
          }}
        >
          {incarnation && (
            <span
              style={{
                padding: "2px 8px",
                borderRadius: 999,
                background: incarnation.color_hex ?? "#1E2D4A",
                color: "#FAF7F2",
                fontFamily: "var(--font-sans)",
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: "0.05em",
                textTransform: "uppercase",
              }}
            >
              {incarnation.label}
            </span>
          )}
          {motif && (
            <span
              style={{
                padding: "2px 8px",
                borderRadius: 999,
                background: "var(--hub-bg)",
                color: "var(--hub-foreground)",
                fontFamily: "var(--font-sans)",
                fontSize: 10,
                fontWeight: 500,
                border: "0.5px solid var(--hub-border)",
              }}
            >
              {motif.label}
            </span>
          )}
        </div>

        <p
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 11,
            color: "var(--hub-foreground)",
            opacity: 0.65,
            margin: 0,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
          title={media.filename}
        >
          {media.filename}
        </p>
        {gabarit && (
          <p
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 10,
              color: "var(--hub-foreground)",
              opacity: 0.5,
              margin: "4px 0 0 0",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
            }}
          >
            {gabarit.label}
          </p>
        )}
      </div>
    </article>
  );

  // En mode sélection, le click coche/décoche au lieu d'ouvrir le détail.
  if (selectMode) {
    return (
      <div onClick={() => onToggleSelect(media.id)} role="button" tabIndex={0}>
        {inner}
      </div>
    );
  }

  return (
    <Link
      href={`/atelier-da/mediatheque/${media.id}`}
      style={{ textDecoration: "none", color: "inherit", display: "block" }}
    >
      {inner}
    </Link>
  );
}
