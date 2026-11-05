/**
 * ReelMotifMediaPickerModal — sélection multiple (jusqu'à `max` photos) dans
 * la médiathèque, pré-filtrée par tag motif ("motif:ypm-006"), pour nourrir
 * le diaporama "Focus motif" du Réel. Fork multi-select de
 * ReelMediaPickerModal.tsx (lui-même fork de MediaPickerModal.tsx).
 */
"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Search, X } from "lucide-react";

import type { MediaWithTags } from "@/types/mediatheque";
import { fetchMediaList } from "@/lib/mediatheque/api-client";

interface ReelMotifMediaPickerModalProps {
  motifTag?: string;
  max: number;
  initialSelectedIds?: string[];
  onClose: () => void;
  onConfirm: (media: MediaWithTags[]) => void;
}

export function ReelMotifMediaPickerModal({
  motifTag,
  max,
  initialSelectedIds = [],
  onClose,
  onConfirm,
}: ReelMotifMediaPickerModalProps) {
  const [media, setMedia] = useState<MediaWithTags[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<Map<string, MediaWithTags>>(new Map());

  useEffect(() => {
    setSelected(new Map());
  }, [motifTag]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await fetchMediaList({
        tags: motifTag ? [motifTag] : undefined,
        q: q || undefined,
        per_page: 200,
      });
      setMedia(r.data);
      setSelected((prev) => {
        if (prev.size > 0 || initialSelectedIds.length === 0) return prev;
        const next = new Map(prev);
        for (const m of r.data) {
          if (initialSelectedIds.includes(m.id)) next.set(m.id, m);
        }
        return next;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, motifTag]);

  useEffect(() => {
    const t = setTimeout(load, q ? 250 : 0);
    return () => clearTimeout(t);
  }, [load, q]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const toggle = (m: MediaWithTags) => {
    setSelected((prev) => {
      const next = new Map(prev);
      if (next.has(m.id)) {
        next.delete(m.id);
      } else {
        if (next.size >= max) return prev;
        next.set(m.id, m);
      }
      return next;
    });
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(30, 45, 74, 0.55)",
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          background: "var(--hub-bg)",
          borderRadius: 16,
          width: "100%",
          maxWidth: 1000,
          maxHeight: "85vh",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          boxShadow: "0 24px 64px rgba(30, 45, 74, 0.3)",
        }}
      >
        <header
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px 20px",
            background: "white",
            borderBottom: "0.5px solid var(--hub-border)",
            gap: 12,
          }}
        >
          <div>
            <h2
              style={{
                fontFamily: "var(--font-editorial)",
                fontSize: 20,
                fontWeight: 500,
                margin: 0,
                lineHeight: 1.2,
              }}
            >
              Choisir jusqu&rsquo;à {max} photos
            </h2>
            <p
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: 11,
                color: "var(--hub-foreground)",
                opacity: 0.6,
                margin: "2px 0 0 0",
              }}
            >
              {selected.size}/{max} sélectionnée{selected.size > 1 ? "s" : ""}
              {motifTag ? " · filtré sur ce motif" : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            style={{
              background: "transparent",
              border: "none",
              cursor: "pointer",
              padding: 6,
              borderRadius: 8,
              color: "var(--hub-foreground)",
            }}
          >
            <X size={18} />
          </button>
        </header>

        <div
          style={{
            padding: "12px 20px",
            background: "white",
            borderBottom: "0.5px solid var(--hub-border)",
          }}
        >
          <div
            style={{
              position: "relative",
              background: "var(--hub-bg)",
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
              onChange={(e) => setQ(e.target.value)}
              placeholder="Recherche par nom, note, tag…"
              style={{
                flex: 1,
                background: "transparent",
                border: "none",
                outline: "none",
                padding: "8px 12px",
                fontFamily: "var(--font-sans)",
                fontSize: 13,
                color: "var(--hub-foreground)",
              }}
            />
          </div>
        </div>

        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: 20,
            background: "var(--hub-bg)",
          }}
        >
          {error && (
            <div
              style={{
                padding: 12,
                border: "1px solid #E2A8A2",
                borderRadius: 8,
                background: "#FAEBE8",
                color: "#7C2A24",
                fontFamily: "var(--font-sans)",
                fontSize: 13,
                marginBottom: 16,
              }}
            >
              {error}
            </div>
          )}

          {loading ? (
            <div style={{ padding: 40, textAlign: "center" }}>
              <Loader2 size={22} className="animate-spin" />
            </div>
          ) : media.length === 0 ? (
            <div
              style={{
                padding: 40,
                textAlign: "center",
                fontFamily: "var(--font-sans)",
                fontSize: 13,
                color: "var(--hub-foreground)",
                opacity: 0.6,
              }}
            >
              Aucune photo taguée avec ce motif. Réduis la recherche ou tague des photos dans la Médiathèque.
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
                gap: 10,
              }}
            >
              {media.map((m) => {
                const isSel = selected.has(m.id);
                const disabled = !isSel && selected.size >= max;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => toggle(m)}
                    disabled={disabled}
                    style={{
                      background: "white",
                      border: isSel ? "1.5px solid var(--hub-foreground)" : "0.5px solid var(--hub-border)",
                      borderRadius: 10,
                      overflow: "hidden",
                      padding: 0,
                      cursor: disabled ? "not-allowed" : "pointer",
                      opacity: disabled ? 0.4 : 1,
                      position: "relative",
                      display: "flex",
                      flexDirection: "column",
                    }}
                  >
                    <div style={{ aspectRatio: "9/16", background: "var(--hub-bg)", overflow: "hidden" }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={m.public_url}
                        alt={m.filename}
                        loading="lazy"
                        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                      />
                    </div>
                    {isSel && (
                      <span
                        style={{
                          position: "absolute",
                          top: 6,
                          right: 6,
                          width: 22,
                          height: 22,
                          borderRadius: 999,
                          background: "var(--hub-foreground)",
                          color: "var(--hub-bg)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontFamily: "var(--font-sans)",
                          fontSize: 11,
                          fontWeight: 700,
                        }}
                      >
                        {Array.from(selected.keys()).indexOf(m.id) + 1}
                      </span>
                    )}
                    <p
                      style={{
                        padding: "6px 8px",
                        fontFamily: "var(--font-sans)",
                        fontSize: 10,
                        color: "var(--hub-foreground)",
                        opacity: 0.65,
                        margin: 0,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        textAlign: "left",
                      }}
                    >
                      {m.filename}
                    </p>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <footer
          style={{
            padding: "14px 20px",
            background: "white",
            borderTop: "0.5px solid var(--hub-border)",
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <span style={{ fontFamily: "var(--font-sans)", fontSize: 13, color: "var(--hub-foreground)" }}>
            {selected.size}/{max} sélectionnée{selected.size > 1 ? "s" : ""}
          </span>
          <div style={{ flex: 1 }} />
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "transparent",
              border: "0.5px solid var(--hub-border)",
              borderRadius: 9999,
              padding: "8px 18px",
              fontFamily: "var(--font-sans)",
              fontSize: 12,
              color: "var(--hub-foreground)",
              cursor: "pointer",
            }}
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm(Array.from(selected.values()));
              onClose();
            }}
            disabled={selected.size === 0}
            style={{
              background: "var(--color-brand-rose, #A76059)",
              color: "white",
              border: "none",
              borderRadius: 9999,
              padding: "8px 22px",
              fontFamily: "var(--font-sans)",
              fontSize: 12,
              fontWeight: 500,
              letterSpacing: "0.04em",
              cursor: selected.size === 0 ? "not-allowed" : "pointer",
              opacity: selected.size === 0 ? 0.5 : 1,
            }}
          >
            Valider {selected.size} photo{selected.size > 1 ? "s" : ""}
          </button>
        </footer>
      </div>
    </div>
  );
}
