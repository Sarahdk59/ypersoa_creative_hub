/**
 * PhotosSection — section "Bibliothèque visuelle" sur la fiche incarnation.
 *
 * - Photos groupées par gabarit cible
 * - Toggle hero (étoile) — exclusif par gabarit
 * - Bouton "Délier"
 * - Drag-and-drop natif HTML5 pour réordonner dans un gabarit
 * - Bouton "+ Lier depuis la médiathèque" qui ouvre MediaPickerModal
 */
"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Plus, Star, Trash2 } from "lucide-react";

import type { IncarnationPhoto } from "@/types/incarnations";
import { GABARITS_DISPONIBLES } from "@/types/incarnations";
import {
  fetchIncarnationPhotos,
  linkPhotoToIncarnation,
  reorderPhotos,
  unlinkPhoto,
  updatePhotoLink,
} from "@/lib/incarnations/api-client";
import { MediaPickerModal } from "./MediaPickerModal";

interface PhotosSectionProps {
  incarnationCode: string;
  incarnationSlug: string; // ex. "mama-club" pour le tag médiathèque
  motifYpm: string;
  gabaritsCibles: string[];
}

export function PhotosSection({
  incarnationCode,
  incarnationSlug,
  motifYpm,
  gabaritsCibles,
}: PhotosSectionProps) {
  const [photos, setPhotos] = useState<IncarnationPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pickerGabarit, setPickerGabarit] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await fetchIncarnationPhotos(incarnationCode);
      setPhotos(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  }, [incarnationCode]);

  useEffect(() => {
    load();
  }, [load]);

  const toggleHero = async (photoId: string, current: boolean) => {
    try {
      await updatePhotoLink(incarnationCode, photoId, { is_hero: !current });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur hero");
    }
  };

  const unlink = async (photoId: string) => {
    if (!confirm("Délier cette photo de l'incarnation ?")) return;
    try {
      await unlinkPhoto(incarnationCode, photoId);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur déliaison");
    }
  };

  const handlePickerConfirm = async (
    selection: Array<{ media_id: string; gabarit: string }>,
  ) => {
    for (const item of selection) {
      try {
        await linkPhotoToIncarnation(incarnationCode, {
          media_id: item.media_id,
          gabarit: item.gabarit,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erreur liaison");
      }
    }
    await load();
  };

  const handleReorder = async (gabarit: string, photoIds: string[]) => {
    try {
      const next = await reorderPhotos(incarnationCode, gabarit, photoIds);
      setPhotos(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur réordonnancement");
    }
  };

  // Listes par gabarit cible + groupe "autres" (photos sur des gabarits hors cibles)
  const byGabarit = new Map<string, IncarnationPhoto[]>();
  for (const g of gabaritsCibles) byGabarit.set(g, []);
  for (const p of photos) {
    if (!byGabarit.has(p.gabarit)) byGabarit.set(p.gabarit, []);
    byGabarit.get(p.gabarit)!.push(p);
  }

  // Tag médiathèque suggéré pour pré-filtrer le picker
  const preselectedTags = [
    `incarnation:${incarnationSlug}`,
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {error && (
        <div
          style={{
            padding: 10,
            border: "1px solid #E2A8A2",
            borderRadius: 8,
            background: "#FAEBE8",
            color: "#7C2A24",
            fontFamily: "var(--font-sans)",
            fontSize: 12,
          }}
        >
          {error}
        </div>
      )}

      {loading ? (
        <div style={{ padding: 24, textAlign: "center" }}>
          <Loader2 size={18} className="animate-spin" />
        </div>
      ) : (
        Array.from(byGabarit.entries()).map(([gabarit, list]) => (
          <GabaritGroup
            key={gabarit}
            gabarit={gabarit}
            photos={list}
            onAdd={() => setPickerGabarit(gabarit)}
            onToggleHero={toggleHero}
            onUnlink={unlink}
            onReorder={(ids) => handleReorder(gabarit, ids)}
          />
        ))
      )}

      {pickerGabarit && (
        <MediaPickerModal
          preselectedTags={preselectedTags}
          defaultGabarit={pickerGabarit}
          onClose={() => setPickerGabarit(null)}
          onConfirm={handlePickerConfirm}
        />
      )}

      <p
        style={{
          fontFamily: "var(--font-sans)",
          fontSize: 10,
          color: "var(--hub-foreground)",
          opacity: 0.5,
          margin: 0,
          lineHeight: 1.5,
        }}
      >
        Le motif <code style={codeStyle}>{motifYpm}</code> · pré-filtre médiathèque appliqué sur le
        tag <code style={codeStyle}>incarnation:{incarnationSlug}</code>.
      </p>
    </div>
  );
}

interface GabaritGroupProps {
  gabarit: string;
  photos: IncarnationPhoto[];
  onAdd: () => void;
  onToggleHero: (id: string, current: boolean) => void;
  onUnlink: (id: string) => void;
  onReorder: (ids: string[]) => void;
}

function GabaritGroup({
  gabarit,
  photos,
  onAdd,
  onToggleHero,
  onUnlink,
  onReorder,
}: GabaritGroupProps) {
  const meta = GABARITS_DISPONIBLES.find((g) => g.code === gabarit);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  const onDragStart = (e: React.DragEvent, id: string) => {
    setDraggingId(id);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", id);
  };
  const onDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    setOverId(id);
  };
  const onDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    const sourceId = e.dataTransfer.getData("text/plain");
    if (!sourceId || sourceId === targetId) {
      setDraggingId(null);
      setOverId(null);
      return;
    }
    const ids = photos.map((p) => p.id);
    const from = ids.indexOf(sourceId);
    const to = ids.indexOf(targetId);
    if (from < 0 || to < 0) {
      setDraggingId(null);
      setOverId(null);
      return;
    }
    const next = [...ids];
    next.splice(from, 1);
    next.splice(to, 0, sourceId);
    onReorder(next);
    setDraggingId(null);
    setOverId(null);
  };
  const onDragEnd = () => {
    setDraggingId(null);
    setOverId(null);
  };

  return (
    <section
      style={{
        background: "white",
        border: "0.5px solid var(--hub-border)",
        borderRadius: 12,
        padding: 16,
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
        }}
      >
        <h4
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 12,
            fontWeight: 600,
            margin: 0,
            color: "var(--hub-foreground)",
            display: "flex",
            alignItems: "baseline",
            gap: 8,
          }}
        >
          {meta?.label ?? "Gabarit"}{" "}
          <span style={{ fontSize: 10, opacity: 0.55, fontWeight: 500 }}>
            {gabarit} · {photos.length} photo{photos.length > 1 ? "s" : ""}
          </span>
        </h4>
        <button
          type="button"
          onClick={onAdd}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            background: "transparent",
            border: "0.5px solid var(--hub-border)",
            borderRadius: 9999,
            padding: "5px 12px",
            fontFamily: "var(--font-sans)",
            fontSize: 11,
            color: "var(--hub-foreground)",
            cursor: "pointer",
          }}
        >
          <Plus size={11} /> Lier depuis médiathèque
        </button>
      </header>

      {photos.length === 0 ? (
        <div
          style={{
            padding: 16,
            border: "1px dashed var(--hub-border)",
            borderRadius: 8,
            background: "var(--hub-bg)",
            textAlign: "center",
            fontFamily: "var(--font-sans)",
            fontSize: 11,
            color: "var(--hub-foreground)",
            opacity: 0.55,
          }}
        >
          Aucune photo pour ce gabarit.
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
            gap: 8,
          }}
        >
          {photos.map((p) => (
            <article
              key={p.id}
              draggable
              onDragStart={(e) => onDragStart(e, p.id)}
              onDragOver={(e) => onDragOver(e, p.id)}
              onDrop={(e) => onDrop(e, p.id)}
              onDragEnd={onDragEnd}
              style={{
                background: "var(--hub-bg)",
                border:
                  overId === p.id && draggingId !== p.id
                    ? "1.5px solid var(--hub-foreground)"
                    : "0.5px solid var(--hub-border)",
                borderRadius: 8,
                overflow: "hidden",
                position: "relative",
                opacity: draggingId === p.id ? 0.4 : 1,
                cursor: "grab",
              }}
            >
              <div style={{ aspectRatio: "4/5", overflow: "hidden" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={p.public_url}
                  alt={p.filename}
                  loading="lazy"
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    display: "block",
                    pointerEvents: "none",
                  }}
                />
              </div>
              {/* Hero toggle */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleHero(p.id, p.is_hero);
                }}
                aria-label={p.is_hero ? "Retirer hero" : "Marquer comme hero"}
                style={{
                  position: "absolute",
                  top: 6,
                  left: 6,
                  background: p.is_hero ? "#F4C95D" : "rgba(255,255,255,0.85)",
                  border: "none",
                  borderRadius: 999,
                  width: 26,
                  height: 26,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  color: p.is_hero ? "#5A3F12" : "var(--hub-foreground)",
                }}
              >
                <Star
                  size={14}
                  strokeWidth={1.8}
                  fill={p.is_hero ? "#5A3F12" : "transparent"}
                />
              </button>
              {/* Unlink */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onUnlink(p.id);
                }}
                aria-label="Délier"
                style={{
                  position: "absolute",
                  top: 6,
                  right: 6,
                  background: "rgba(255,255,255,0.85)",
                  border: "none",
                  borderRadius: 999,
                  width: 26,
                  height: 26,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  color: "#7C2A24",
                }}
              >
                <Trash2 size={13} strokeWidth={1.8} />
              </button>
              <p
                style={{
                  padding: "4px 6px",
                  fontFamily: "var(--font-sans)",
                  fontSize: 9,
                  color: "var(--hub-foreground)",
                  opacity: 0.6,
                  margin: 0,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  background: "white",
                }}
                title={p.filename}
              >
                {p.filename}
              </p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

const codeStyle: React.CSSProperties = {
  fontFamily: "ui-monospace, SFMono-Regular, monospace",
  fontSize: 10,
  background: "var(--hub-bg)",
  padding: "1px 4px",
  borderRadius: 3,
};
