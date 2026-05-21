/**
 * MotionSourceSelector — grille de sources groupées par origine.
 *
 * Modes pris en charge :
 *  - reel     : collections Atelier Shooting (multi-shots)
 *  - ambiance : lookbooks + likes ❤ + canoniques + médiathèque
 *  - packshot : packshots + likes ❤ + canoniques + médiathèque
 *
 * UX : onglets par origine en haut, grille en dessous. Onglet par défaut =
 * le plus pertinent pour le mode courant.
 */
"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Heart, ImageOff, Loader2, Star } from "lucide-react";

import type { MotionMode, MotionSource, SourceOrigin } from "@/types/motion";
import { SOURCE_ORIGIN_LABELS } from "@/types/motion";
import { fetchMotionSources } from "@/lib/motion/api-client";

interface MotionSourceSelectorProps {
  mode: MotionMode;
  value: string | null;
  onChange: (sourceId: string, source: MotionSource) => void;
}

const DEFAULT_TAB_BY_MODE: Record<MotionMode, SourceOrigin> = {
  reel: "collection",
  ambiance: "lookbook",
  packshot: "packshot",
};

function sourceOrigin(s: MotionSource): SourceOrigin {
  if (s.type === "collection") return "collection";
  if (s.type === "lookbook") return "lookbook";
  if (s.type === "packshot") return "packshot";
  if (s.type === "liked-shot") return "liked-shot";
  if (s.type === "canonique") return "canonique";
  return "media";
}

export function MotionSourceSelector({ mode, value, onChange }: MotionSourceSelectorProps) {
  const [sources, setSources] = useState<MotionSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<SourceOrigin>(DEFAULT_TAB_BY_MODE[mode]);

  useEffect(() => {
    setActiveTab(DEFAULT_TAB_BY_MODE[mode]);
  }, [mode]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchMotionSources(mode)
      .then((r) => {
        if (!cancelled) setSources(r);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Erreur");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [mode]);

  const grouped = useMemo(() => {
    const map = new Map<SourceOrigin, MotionSource[]>();
    for (const s of sources) {
      const o = sourceOrigin(s);
      if (!map.has(o)) map.set(o, []);
      map.get(o)!.push(s);
    }
    return map;
  }, [sources]);

  // Toujours afficher tous les onglets dispo pour le mode, pas seulement ceux
  // qui ont des entrées (compteur à 0 = explicite "rien à montrer").
  const availableTabs: SourceOrigin[] = useMemo(() => {
    if (mode === "reel") return ["collection"];
    return ["lookbook", "packshot", "liked-shot", "canonique", "media"];
  }, [mode]);

  if (loading) {
    return (
      <div style={{ padding: 32, textAlign: "center" }}>
        <Loader2 size={20} className="animate-spin" />
      </div>
    );
  }
  if (error) {
    return (
      <div
        style={{
          padding: 12,
          border: "1px solid #E2A8A2",
          borderRadius: 8,
          background: "#FAEBE8",
          color: "#7C2A24",
          fontFamily: "var(--font-sans)",
          fontSize: 13,
        }}
      >
        {error}
      </div>
    );
  }

  const tabSources = grouped.get(activeTab) ?? [];

  // Si le tab actif n'est pas dans la liste pour ce mode, on bascule sur le premier
  if (!availableTabs.includes(activeTab)) {
    return null;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* Onglets */}
      <div
        style={{
          display: "flex",
          gap: 6,
          borderBottom: "0.5px solid var(--hub-border)",
          paddingBottom: 8,
          overflowX: "auto",
        }}
      >
        {availableTabs.map((tab) => {
          const count = grouped.get(tab)?.length ?? 0;
          const isActive = activeTab === tab;
          const icon = ICONS_BY_ORIGIN[tab];
          return (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              style={{
                padding: "6px 12px",
                borderRadius: 9999,
                border: isActive
                  ? "1px solid var(--hub-foreground)"
                  : "0.5px solid var(--hub-border)",
                background: isActive ? "var(--hub-foreground)" : "white",
                color: isActive ? "var(--hub-bg)" : "var(--hub-foreground)",
                fontFamily: "var(--font-sans)",
                fontSize: 11,
                fontWeight: 500,
                cursor: "pointer",
                whiteSpace: "nowrap",
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                opacity: count === 0 ? 0.45 : 1,
              }}
            >
              {icon}
              {SOURCE_ORIGIN_LABELS[tab]}
              <span
                style={{
                  marginLeft: 2,
                  fontSize: 10,
                  fontWeight: 600,
                  opacity: 0.65,
                }}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Grille des sources de l'onglet actif */}
      {tabSources.length === 0 ? (
        <div
          style={{
            padding: 28,
            border: "1px dashed var(--hub-border)",
            borderRadius: 12,
            background: "white",
            textAlign: "center",
            fontFamily: "var(--font-sans)",
            fontSize: 12,
            color: "var(--hub-foreground)",
            opacity: 0.6,
          }}
        >
          <ImageOff
            size={18}
            style={{ display: "block", margin: "0 auto 6px", opacity: 0.5 }}
          />
          Aucune source dans <strong>{SOURCE_ORIGIN_LABELS[activeTab]}</strong>{" "}
          pour ce mode.
          {activeTab === "liked-shot" &&
            " Like des shots dans atelier-shooting ou atelier-social pour les voir ici."}
          {activeTab === "packshot" &&
            " Upload un packshot depuis la médiathèque (source = packshot)."}
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
            gap: 10,
          }}
        >
          {tabSources.map((s) => {
            const isSelected = value === s.id;
            const cover = s.type === "collection" ? s.shots[0]?.public_url : s.public_url;
            const isFavorite = s.type === "canonique" && s.favorite;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => onChange(s.id, s)}
                style={{
                  background: "white",
                  border: isSelected
                    ? "1.5px solid var(--hub-foreground)"
                    : "0.5px solid var(--hub-border)",
                  borderRadius: 10,
                  overflow: "hidden",
                  padding: 0,
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  position: "relative",
                  textAlign: "left",
                }}
              >
                <div
                  style={{
                    aspectRatio: "4/5",
                    background: "var(--hub-bg)",
                    overflow: "hidden",
                  }}
                >
                  {cover && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={cover}
                      alt={s.label}
                      loading="lazy"
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        display: "block",
                      }}
                    />
                  )}
                </div>
                <div style={{ padding: 8 }}>
                  <p
                    style={{
                      fontFamily: "var(--font-sans)",
                      fontSize: 11,
                      fontWeight: 600,
                      margin: 0,
                      color: "var(--hub-foreground)",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                    title={s.label}
                  >
                    {isFavorite && (
                      <Star
                        size={10}
                        fill="#C49B5C"
                        stroke="#C49B5C"
                        style={{ flexShrink: 0 }}
                      />
                    )}
                    {s.label}
                  </p>
                  {s.type === "collection" && (
                    <p
                      style={{
                        fontFamily: "var(--font-sans)",
                        fontSize: 9,
                        color: "var(--hub-foreground)",
                        opacity: 0.55,
                        margin: "2px 0 0 0",
                      }}
                    >
                      {s.shots.length} shot{s.shots.length > 1 ? "s" : ""}
                    </p>
                  )}
                  {s.type === "canonique" && (
                    <p
                      style={{
                        fontFamily: "var(--font-sans)",
                        fontSize: 9,
                        color: "var(--hub-foreground)",
                        opacity: 0.55,
                        margin: "2px 0 0 0",
                        letterSpacing: "0.06em",
                        textTransform: "uppercase",
                      }}
                    >
                      {s.id}
                    </p>
                  )}
                </div>
                {isSelected && (
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
                    }}
                  >
                    <Check size={12} strokeWidth={2.4} />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

const ICONS_BY_ORIGIN: Record<SourceOrigin, React.ReactNode> = {
  collection: null,
  lookbook: null,
  packshot: null,
  "liked-shot": <Heart size={11} fill="#E2627C" stroke="#E2627C" />,
  canonique: <Star size={11} strokeWidth={1.6} />,
  media: null,
};
