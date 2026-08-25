/**
 * ReelMediaPickerModal — sélection d'une photo de la médiathèque pour
 * l'attacher à un plan de script Reels. Version simplifiée (single-select,
 * pas de gabarit) forkée de components/incarnations/MediaPickerModal.tsx.
 */
"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Search, X } from "lucide-react";

import type { MediaWithTags } from "@/types/mediatheque";
import { fetchMediaList } from "@/lib/mediatheque/api-client";

interface ReelMediaPickerModalProps {
  onClose: () => void;
  onSelect: (media: MediaWithTags) => void;
}

export function ReelMediaPickerModal({ onClose, onSelect }: ReelMediaPickerModalProps) {
  const [media, setMedia] = useState<MediaWithTags[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await fetchMediaList({ q: q || undefined, per_page: 200 });
      setMedia(r.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setLoading(false);
    }
  }, [q]);

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
              Choisir une photo pour ce plan
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
              Depuis la médiathèque.
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
              Aucune photo ne correspond. Réduis la recherche ou uploade depuis la Médiathèque.
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
                gap: 10,
              }}
            >
              {media.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => {
                    onSelect(m);
                    onClose();
                  }}
                  style={{
                    background: "white",
                    border: "0.5px solid var(--hub-border)",
                    borderRadius: 10,
                    overflow: "hidden",
                    padding: 0,
                    cursor: "pointer",
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  <div
                    style={{
                      aspectRatio: "9/16",
                      background: "var(--hub-bg)",
                      overflow: "hidden",
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={m.public_url}
                      alt={m.filename}
                      loading="lazy"
                      style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                    />
                  </div>
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
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
