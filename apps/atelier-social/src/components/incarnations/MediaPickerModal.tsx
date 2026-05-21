/**
 * MediaPickerModal — modale picker depuis la Médiathèque.
 *
 * Affiche une grille filtrable des médias (par incarnation, motif, gabarit
 * via les tags de la médiathèque), checkbox de sélection multiple,
 * footer avec compteur + bouton "Lier N photos sur YP00X".
 */
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Search, X } from "lucide-react";

import type { MediaWithTags } from "@/types/mediatheque";
import { fetchMediaList } from "@/lib/mediatheque/api-client";
import { GABARITS_DISPONIBLES } from "@/types/incarnations";

interface MediaPickerModalProps {
  /** Tags de pré-filtrage à la médiathèque (format "category:slug"). */
  preselectedTags?: string[];
  /** Gabarit cible par défaut (pré-coché). */
  defaultGabarit: string;
  onClose: () => void;
  onConfirm: (selection: Array<{ media_id: string; gabarit: string }>) => Promise<void>;
}

export function MediaPickerModal({
  preselectedTags = [],
  defaultGabarit,
  onClose,
  onConfirm,
}: MediaPickerModalProps) {
  const [media, setMedia] = useState<MediaWithTags[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [gabarit, setGabarit] = useState(defaultGabarit);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await fetchMediaList({
        tags: preselectedTags,
        q: q || undefined,
        per_page: 200,
      });
      setMedia(r.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, preselectedTags.join("|")]);

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

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleConfirm = async () => {
    if (selected.size === 0) return;
    setSubmitting(true);
    try {
      await onConfirm(
        Array.from(selected).map((id) => ({ media_id: id, gabarit })),
      );
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur liaison");
      setSubmitting(false);
    }
  };

  const filteredMedia = useMemo(() => media, [media]);

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
          maxWidth: 1200,
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          boxShadow: "0 24px 64px rgba(30, 45, 74, 0.3)",
        }}
      >
        {/* Header */}
        <header
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px 20px",
            background: "white",
            borderBottom: "0.5px solid var(--hub-border)",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <div>
            <h2
              style={{
                fontFamily: "var(--font-editorial)",
                fontSize: 22,
                fontWeight: 500,
                margin: 0,
                lineHeight: 1.2,
              }}
            >
              Lier des photos depuis la médiathèque
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
              Sélectionne une ou plusieurs photos puis choisis le gabarit cible.
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

        {/* Search */}
        <div
          style={{
            padding: "12px 20px",
            background: "white",
            borderBottom: "0.5px solid var(--hub-border)",
            display: "flex",
            gap: 10,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <div
            style={{
              flex: "1 1 240px",
              minWidth: 220,
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
          {preselectedTags.length > 0 && (
            <span
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: 11,
                color: "var(--hub-foreground)",
                opacity: 0.65,
              }}
            >
              Filtres : {preselectedTags.join(" + ")}
            </span>
          )}
        </div>

        {/* Body */}
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
          ) : filteredMedia.length === 0 ? (
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
              Aucune photo ne correspond. Réduis les filtres ou uploade depuis la Médiathèque.
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
                gap: 10,
              }}
            >
              {filteredMedia.map((m) => {
                const isSel = selected.has(m.id);
                const incTag = m.tags.find((t) => t.category === "incarnation");
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => toggle(m.id)}
                    style={{
                      background: "white",
                      border: isSel
                        ? "1.5px solid var(--hub-foreground)"
                        : "0.5px solid var(--hub-border)",
                      borderRadius: 10,
                      overflow: "hidden",
                      padding: 0,
                      cursor: "pointer",
                      position: "relative",
                      display: "flex",
                      flexDirection: "column",
                    }}
                  >
                    <div
                      style={{
                        aspectRatio: "4/5",
                        background: "var(--hub-bg)",
                        overflow: "hidden",
                      }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={m.public_url}
                        alt={m.filename}
                        loading="lazy"
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                          display: "block",
                        }}
                      />
                    </div>
                    {incTag && (
                      <span
                        style={{
                          position: "absolute",
                          top: 6,
                          left: 6,
                          padding: "2px 8px",
                          borderRadius: 999,
                          background: incTag.color_hex ?? "#1E2D4A",
                          color: "#FAF7F2",
                          fontFamily: "var(--font-sans)",
                          fontSize: 9,
                          fontWeight: 600,
                          letterSpacing: "0.04em",
                          textTransform: "uppercase",
                        }}
                      >
                        {incTag.label}
                      </span>
                    )}
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
                        ✓
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

        {/* Footer */}
        <footer
          style={{
            padding: "14px 20px",
            background: "white",
            borderTop: "0.5px solid var(--hub-border)",
            display: "flex",
            alignItems: "center",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <span
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 13,
              color: "var(--hub-foreground)",
            }}
          >
            {selected.size} photo{selected.size > 1 ? "s" : ""} sélectionnée
            {selected.size > 1 ? "s" : ""}
          </span>
          <span
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 11,
              color: "var(--hub-foreground)",
              opacity: 0.6,
            }}
          >
            Gabarit cible :
          </span>
          <select
            value={gabarit}
            onChange={(e) => setGabarit(e.target.value)}
            style={{
              background: "var(--hub-bg)",
              border: "0.5px solid var(--hub-border)",
              borderRadius: 9999,
              padding: "8px 14px",
              fontFamily: "var(--font-sans)",
              fontSize: 12,
              color: "var(--hub-foreground)",
              cursor: "pointer",
            }}
          >
            {GABARITS_DISPONIBLES.map((g) => (
              <option key={g.code} value={g.code}>
                {g.code} · {g.label}
              </option>
            ))}
          </select>
          <div style={{ flex: 1 }} />
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
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
            onClick={handleConfirm}
            disabled={submitting || selected.size === 0}
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
              cursor: submitting || selected.size === 0 ? "not-allowed" : "pointer",
              opacity: submitting || selected.size === 0 ? 0.5 : 1,
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            {submitting ? <Loader2 size={12} className="animate-spin" /> : null}
            {submitting
              ? "Liaison…"
              : `Lier ${selected.size} photo${selected.size > 1 ? "s" : ""} sur ${gabarit}`}
          </button>
        </footer>
      </div>
    </div>
  );
}
