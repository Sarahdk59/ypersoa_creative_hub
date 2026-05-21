/**
 * Médiathèque — galerie principale.
 *
 * Layout : sidebar gauche 260px (filtres tags) + zone droite (header sticky
 * + grid masonry). État des filtres synchronisé avec l'URL (shareable).
 */
"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, ImageOff, Loader2 } from "lucide-react";

import type { MediaListResponse, SortOrder, Tag, TagCategory } from "@/types/mediatheque";
import { fetchMediaList, fetchTags } from "@/lib/mediatheque/api-client";
import { MediaCard } from "@/components/mediatheque/MediaCard";
import { TagFilterSidebar } from "@/components/mediatheque/TagFilterSidebar";
import { GalleryHeader } from "@/components/mediatheque/GalleryHeader";

function MediathequePageInner() {
  const router = useRouter();
  const sp = useSearchParams();

  // État local hydraté depuis l'URL
  const [tagsByCategory, setTagsByCategory] = useState<Record<string, Tag[]>>({});
  const [tagsLoaded, setTagsLoaded] = useState(false);
  const [response, setResponse] = useState<MediaListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState(sp.get("q") ?? "");
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const selectedTags = useMemo(() => sp.getAll("tags"), [sp]);
  const sort: SortOrder =
    (sp.get("sort") as SortOrder | null) && ["date_desc", "date_asc", "name_asc"].includes(sp.get("sort") ?? "")
      ? (sp.get("sort") as SortOrder)
      : "date_desc";

  // Sync URL helper
  const updateUrl = useCallback(
    (patch: { tags?: string[]; q?: string; sort?: SortOrder }) => {
      const params = new URLSearchParams();
      const nextTags = patch.tags ?? selectedTags;
      for (const t of nextTags) params.append("tags", t);
      const nextQ = patch.q !== undefined ? patch.q : q;
      if (nextQ) params.set("q", nextQ);
      const nextSort = patch.sort ?? sort;
      if (nextSort !== "date_desc") params.set("sort", nextSort);
      router.replace(`/atelier-da/mediatheque${params.toString() ? `?${params}` : ""}`);
    },
    [router, selectedTags, q, sort],
  );

  // Charge la liste des tags une fois
  useEffect(() => {
    fetchTags()
      .then((r) => {
        setTagsByCategory(r.by_category);
        setTagsLoaded(true);
      })
      .catch(() => setTagsLoaded(true));
  }, []);

  // Charge les médias quand filtres changent
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchMediaList({ tags: selectedTags, q: q || undefined, sort, per_page: 100 })
      .then((r) => {
        if (!cancelled) setResponse(r);
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
  }, [selectedTags, q, sort]);

  // Usage counts (par tag id) pour la sidebar
  const usage = useMemo(() => {
    const m = new Map<string, number>();
    if (!response) return m;
    for (const media of response.data) {
      for (const t of media.tags) m.set(t.id, (m.get(t.id) ?? 0) + 1);
    }
    return m;
  }, [response]);

  const handleToggleSelect = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleSelectMode = () => {
    setSelectMode((prev) => {
      if (prev) setSelected(new Set());
      return !prev;
    });
  };

  // Debounce simple sur la recherche
  useEffect(() => {
    const t = setTimeout(() => {
      if ((sp.get("q") ?? "") !== q) updateUrl({ q });
    }, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const total = response?.meta.total ?? 0;
  const media = response?.data ?? [];

  return (
    <div style={{ maxWidth: 1500, margin: "0 auto" }}>
      <Link
        href="/atelier-da"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          fontFamily: "var(--font-sans)",
          fontSize: 12,
          color: "var(--hub-foreground)",
          opacity: 0.6,
          textDecoration: "none",
          marginBottom: 16,
        }}
      >
        <ArrowLeft size={14} strokeWidth={1.6} /> Atelier DA
      </Link>

      <header style={{ marginBottom: 24 }}>
        <h1
          style={{
            fontFamily: "var(--font-editorial)",
            fontSize: 36,
            fontWeight: 500,
            letterSpacing: "-0.015em",
            margin: 0,
            marginBottom: 8,
          }}
        >
          Médiathèque
        </h1>
        <p
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 13,
            color: "var(--hub-foreground)",
            opacity: 0.65,
            maxWidth: 720,
            margin: 0,
          }}
        >
          Centralise toutes les photos shooting / lifestyle / IA / packshot. Filtre par incarnation,
          motif, gabarit, ambiance pour piloter tes campagnes (Fête des Pères, Noël, naissance).
        </p>
      </header>

      <div style={{ display: "flex", gap: 24, alignItems: "flex-start" }}>
        {tagsLoaded ? (
          <TagFilterSidebar
            tagsByCategory={tagsByCategory}
            usage={usage}
            selected={selectedTags}
            onChange={(next) => updateUrl({ tags: next })}
          />
        ) : (
          <div
            style={{
              width: 260,
              padding: 16,
              border: "0.5px solid var(--hub-border)",
              borderRadius: 12,
              background: "white",
            }}
          >
            <Loader2 size={14} className="animate-spin" />
          </div>
        )}

        <div style={{ flex: 1, minWidth: 0 }}>
          <GalleryHeader
            q={q}
            onQChange={setQ}
            sort={sort}
            onSortChange={(s) => updateUrl({ sort: s })}
            total={total}
            loading={loading}
            selectMode={selectMode}
            onToggleSelectMode={toggleSelectMode}
            selectedCount={selected.size}
          />

          {error && (
            <div
              style={{
                padding: 16,
                border: "1px solid #E2A8A2",
                borderRadius: 12,
                background: "#FAEBE8",
                color: "#7C2A24",
                fontFamily: "var(--font-sans)",
                fontSize: 13,
                marginBottom: 16,
              }}
            >
              Erreur de chargement : {error}
            </div>
          )}

          {loading && !response && (
            <div
              style={{
                padding: 60,
                textAlign: "center",
                fontFamily: "var(--font-sans)",
                color: "var(--hub-foreground)",
                opacity: 0.6,
              }}
            >
              <Loader2 size={22} className="animate-spin" />
            </div>
          )}

          {!loading && media.length === 0 && (
            <div
              style={{
                padding: 48,
                border: "1px dashed var(--hub-border)",
                borderRadius: 12,
                background: "white",
                textAlign: "center",
                fontFamily: "var(--font-sans)",
                fontSize: 13,
                color: "var(--hub-foreground)",
                opacity: 0.65,
              }}
            >
              <ImageOff
                size={28}
                strokeWidth={1.4}
                style={{ display: "block", margin: "0 auto 8px", opacity: 0.5 }}
              />
              Aucune photo ne correspond à ces filtres.
              {selectedTags.length > 0 && (
                <div style={{ marginTop: 8 }}>
                  <button
                    type="button"
                    onClick={() => updateUrl({ tags: [] })}
                    style={{
                      background: "transparent",
                      border: "0.5px solid var(--hub-border)",
                      borderRadius: 9999,
                      padding: "6px 14px",
                      fontFamily: "var(--font-sans)",
                      fontSize: 12,
                      cursor: "pointer",
                    }}
                  >
                    Effacer les filtres
                  </button>
                </div>
              )}
            </div>
          )}

          {media.length > 0 && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
                gap: 12,
              }}
            >
              {media.map((m) => (
                <MediaCard
                  key={m.id}
                  media={m}
                  selectMode={selectMode}
                  selected={selected.has(m.id)}
                  onToggleSelect={handleToggleSelect}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Barre flottante sélection multiple */}
      {selected.size > 0 && (
        <div
          style={{
            position: "fixed",
            bottom: 20,
            left: "50%",
            transform: "translateX(-50%)",
            background: "var(--hub-foreground)",
            color: "var(--hub-bg)",
            padding: "12px 20px",
            borderRadius: 9999,
            display: "flex",
            alignItems: "center",
            gap: 16,
            boxShadow: "0 12px 32px rgba(30,45,74,0.25)",
            zIndex: 100,
            fontFamily: "var(--font-sans)",
            fontSize: 13,
          }}
        >
          <span>
            {selected.size} photo{selected.size > 1 ? "s" : ""} sélectionnée{selected.size > 1 ? "s" : ""}
          </span>
          <span style={{ opacity: 0.6, fontSize: 11 }}>
            Actions batch en Sprint 2 : tagger / archiver / exporter
          </span>
          <button
            type="button"
            onClick={() => setSelected(new Set())}
            style={{
              background: "transparent",
              border: "1px solid var(--hub-bg)",
              color: "var(--hub-bg)",
              borderRadius: 9999,
              padding: "4px 10px",
              fontFamily: "var(--font-sans)",
              fontSize: 11,
              cursor: "pointer",
            }}
          >
            Tout désélectionner
          </button>
        </div>
      )}
    </div>
  );
}

export default function MediathequePage() {
  return (
    <Suspense
      fallback={
        <div style={{ padding: 48, textAlign: "center" }}>
          <Loader2 size={22} className="animate-spin" />
        </div>
      }
    >
      <MediathequePageInner />
    </Suspense>
  );
}
