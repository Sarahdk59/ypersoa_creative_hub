/**
 * /bibliotheque/visuels — galerie médiathèque (onglet "Visuels" de Bibliothèque).
 *
 * Layout : sidebar gauche 260px (filtres tags) + zone droite (header sticky
 * + grid masonry). État des filtres synchronisé avec l'URL (shareable).
 */
"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ImageOff, Loader2, Tag as TagIcon, Trash2, X } from "lucide-react";

import type { MediaListResponse, MediaStatut, SortOrder, Tag, TagCategory } from "@/types/mediatheque";
import { addTagToMedia, deleteMedia, fetchMediaList, fetchTags } from "@/lib/mediatheque/api-client";
import { quickUploadFile } from "@/lib/mediatheque/quick-upload";
import { MediaCard } from "@/components/mediatheque/MediaCard";
import { TagFilterSidebar } from "@/components/mediatheque/TagFilterSidebar";
import { GalleryHeader, type QuickView } from "@/components/mediatheque/GalleryHeader";
import { AuditProductionDrawer } from "@/components/mediatheque/AuditProductionDrawer";
import { TagPickerFlat } from "@/components/mediatheque/TagPickerFlat";

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
  const [auditOpen, setAuditOpen] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [deletingSelection, setDeletingSelection] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [quickUpload, setQuickUpload] = useState<{ done: number; total: number } | null>(null);
  const [quickView, setQuickView] = useState<QuickView | null>(null);
  const [focusCategory, setFocusCategory] = useState<TagCategory | null>(null);
  const [batchTagOpen, setBatchTagOpen] = useState(false);
  const [batchTagIds, setBatchTagIds] = useState<Set<string>>(new Set());
  const [batchApplying, setBatchApplying] = useState(false);
  const [batchProgress, setBatchProgress] = useState({ done: 0, total: 0 });

  const selectedTags = useMemo(() => sp.getAll("tags"), [sp]);
  const sort: SortOrder =
    (sp.get("sort") as SortOrder | null) && ["date_desc", "date_asc", "name_asc"].includes(sp.get("sort") ?? "")
      ? (sp.get("sort") as SortOrder)
      : "date_desc";
  const statutFilter = sp.get("statut") as MediaStatut | null;

  // Sync URL helper
  const updateUrl = useCallback(
    (patch: { tags?: string[]; q?: string; sort?: SortOrder; statut?: MediaStatut | null }) => {
      const params = new URLSearchParams();
      const nextTags = patch.tags ?? selectedTags;
      for (const t of nextTags) params.append("tags", t);
      const nextQ = patch.q !== undefined ? patch.q : q;
      if (nextQ) params.set("q", nextQ);
      const nextSort = patch.sort ?? sort;
      if (nextSort !== "date_desc") params.set("sort", nextSort);
      const nextStatut = patch.statut !== undefined ? patch.statut : statutFilter;
      if (nextStatut) params.set("statut", nextStatut);
      router.replace(`/bibliotheque/visuels${params.toString() ? `?${params}` : ""}`);
    },
    [router, selectedTags, q, sort, statutFilter],
  );

  const handleQuickView = useCallback(
    (view: QuickView) => {
      setQuickView(view);
      if (view === "occasion") setFocusCategory("occasion");
      if (view === "motif") setFocusCategory("motif");
      if (view === "ready") updateUrl({ statut: "validee" });
      if (view === "recent") updateUrl({ tags: [], statut: null, sort: "date_desc" });
    },
    [updateUrl],
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
    fetchMediaList({
      tags: selectedTags,
      q: q || undefined,
      sort,
      statut: statutFilter ?? undefined,
      per_page: 100,
    })
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
  }, [selectedTags, q, sort, statutFilter, reloadKey]);

  // Usage counts (par tag id) pour la sidebar
  const usage = useMemo(() => {
    const m = new Map<string, number>();
    if (!response) return m;
    for (const media of response.data) {
      for (const t of media.tags) m.set(t.id, (m.get(t.id) ?? 0) + 1);
    }
    return m;
  }, [response]);

  const total = response?.meta.total ?? 0;
  const media = response?.data ?? [];

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

  const allVisibleSelected = media.length > 0 && media.every((m) => selected.has(m.id));
  const selectAllVisible = () => {
    setSelected(allVisibleSelected ? new Set() : new Set(media.map((m) => m.id)));
  };

  const toggleBatchTag = (tagId: string) => {
    setBatchTagIds((prev) => {
      const next = new Set(prev);
      if (next.has(tagId)) next.delete(tagId);
      else next.add(tagId);
      return next;
    });
  };

  /**
   * Batch tagging : "toutes les YPM-005 en un coup" — filtre/sélectionne
   * d'abord dans la galerie (§ "aucun tag ne dépend d'une saisie manuelle
   * PAR PHOTO", ici on assume par lot). Additif uniquement (addTagToMedia
   * est idempotent, upsert sur media_id+tag_id) — jamais de retrait en masse.
   */
  const applyBatchTags = async () => {
    if (selected.size === 0 || batchTagIds.size === 0 || batchApplying) return;
    setBatchApplying(true);
    setError(null);
    const ids = Array.from(selected);
    setBatchProgress({ done: 0, total: ids.length });
    try {
      for (const mediaId of ids) {
        for (const tagId of batchTagIds) {
          await addTagToMedia(mediaId, tagId);
        }
        setBatchProgress((p) => ({ ...p, done: p.done + 1 }));
      }
      setBatchTagOpen(false);
      setBatchTagIds(new Set());
      setReloadKey((k) => k + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Tagging en masse impossible");
    } finally {
      setBatchApplying(false);
    }
  };

  const deleteSelected = async () => {
    if (selected.size === 0 || deletingSelection) return;
    setDeletingSelection(true);
    setError(null);
    try {
      await Promise.all(Array.from(selected).map((id) => deleteMedia(id)));
      setSelected(new Set());
      setReloadKey((key) => key + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Suppression impossible");
    } finally {
      setDeletingSelection(false);
    }
  };

  // Drag&drop pleine grille : envoi immédiat, tags best-effort (nom de
  // fichier + ratio → canal). Revue détaillée avant envoi = bouton "Uploader"
  // (page /bibliotheque/visuels/upload), inchangé.
  const handleGridDrop = useCallback(
    async (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setDragOver(false);
      const files = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith("image/"));
      if (files.length === 0) return;

      setQuickUpload({ done: 0, total: files.length });
      for (const file of files) {
        try {
          await quickUploadFile(file, tagsByCategory);
        } catch (err) {
          setError(err instanceof Error ? err.message : "Upload impossible");
        }
        setQuickUpload((p) => (p ? { ...p, done: p.done + 1 } : p));
      }
      setQuickUpload(null);
      setReloadKey((k) => k + 1);
    },
    [tagsByCategory],
  );

  // Debounce simple sur la recherche
  useEffect(() => {
    const t = setTimeout(() => {
      if ((sp.get("q") ?? "") !== q) updateUrl({ q });
    }, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);


  return (
    <div style={{ maxWidth: 1500, margin: "0 auto" }}>
      <header style={{ marginBottom: 20 }}>
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
            focusCategory={focusCategory}
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

        <div
          style={{
            flex: 1,
            minWidth: 0,
            position: "relative",
            borderRadius: 12,
            outline: dragOver ? "2px dashed var(--hub-accent-soft)" : "2px dashed transparent",
            outlineOffset: 6,
            transition: "outline-color 150ms ease",
          }}
          onDragOver={(e) => {
            e.preventDefault();
            if (!dragOver) setDragOver(true);
          }}
          onDragLeave={(e) => {
            if (e.currentTarget.contains(e.relatedTarget as Node)) return;
            setDragOver(false);
          }}
          onDrop={handleGridDrop}
        >
          {dragOver && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                zIndex: 10,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "var(--hub-accent-wash)",
                borderRadius: 12,
                pointerEvents: "none",
                fontFamily: "var(--font-sans)",
                fontSize: 14,
                fontWeight: 600,
                color: "var(--hub-foreground)",
              }}
            >
              Dépose tes photos ici — elles arrivent déjà taguées
            </div>
          )}

          {quickUpload && (
            <div
              style={{
                marginBottom: 12,
                padding: "8px 14px",
                borderRadius: 8,
                background: "var(--hub-accent-wash)",
                color: "var(--hub-foreground)",
                fontFamily: "var(--font-sans)",
                fontSize: 12,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <Loader2 size={13} className="animate-spin" />
              Envoi {quickUpload.done + 1}/{quickUpload.total}…
            </div>
          )}

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
            onOpenAudit={() => setAuditOpen(true)}
            activeQuickView={quickView}
            onQuickView={handleQuickView}
            onSelectAll={selectMode ? selectAllVisible : undefined}
            allSelected={allVisibleSelected}
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

      {/* Drawer audit production */}
      <AuditProductionDrawer
        open={auditOpen}
        onClose={() => setAuditOpen(false)}
        onChanged={() => setReloadKey((k) => k + 1)}
      />

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
          <button
            type="button"
            onClick={() => setBatchTagOpen(true)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              background: "var(--hub-bg)",
              color: "var(--hub-foreground)",
              border: "none",
              borderRadius: 9999,
              padding: "6px 12px",
              fontFamily: "var(--font-sans)",
              fontSize: 11,
              cursor: "pointer",
            }}
          >
            <TagIcon size={12} /> Tagger
          </button>
          <button
            type="button"
            onClick={deleteSelected}
            disabled={deletingSelection}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              background: "#A13A16",
              color: "white",
              border: "none",
              borderRadius: 9999,
              padding: "6px 12px",
              fontFamily: "var(--font-sans)",
              fontSize: 11,
              cursor: deletingSelection ? "wait" : "pointer",
              opacity: deletingSelection ? 0.7 : 1,
            }}
          >
            {deletingSelection ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
            Supprimer{selected.size > 1 ? ` (${selected.size})` : ""}
          </button>
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

      {/* Modal tagging batch — filtre/sélectionne d'abord, tague tout le lot en 1 clic */}
      {batchTagOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 200,
            background: "rgba(28,45,54,0.35)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
          onClick={() => !batchApplying && setBatchTagOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "white",
              borderRadius: 16,
              padding: 24,
              width: "100%",
              maxWidth: 480,
              maxHeight: "80vh",
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <h3
                style={{
                  fontFamily: "var(--font-editorial)",
                  fontSize: 18,
                  fontWeight: 500,
                  margin: 0,
                }}
              >
                Tagger {selected.size} photo{selected.size > 1 ? "s" : ""}
              </h3>
              <button
                type="button"
                onClick={() => setBatchTagOpen(false)}
                disabled={batchApplying}
                style={{ background: "transparent", border: "none", cursor: "pointer", padding: 4, opacity: 0.6 }}
              >
                <X size={16} />
              </button>
            </div>
            <p
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: 12,
                color: "var(--hub-foreground)",
                opacity: 0.6,
                margin: 0,
              }}
            >
              Les tags choisis s&apos;ajoutent à ceux déjà posés sur chaque photo — rien n&apos;est retiré.
            </p>

            <TagPickerFlat tagsByCategory={tagsByCategory} selected={batchTagIds} onToggle={toggleBatchTag} />

            <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 8 }}>
              <button
                type="button"
                disabled={batchTagIds.size === 0 || batchApplying}
                onClick={applyBatchTags}
                style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  background: "var(--hub-accent)",
                  color: "white",
                  border: "none",
                  borderRadius: 9999,
                  padding: "10px 16px",
                  fontFamily: "var(--font-sans)",
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: batchTagIds.size === 0 || batchApplying ? "not-allowed" : "pointer",
                  opacity: batchTagIds.size === 0 || batchApplying ? 0.6 : 1,
                }}
              >
                {batchApplying ? (
                  <>
                    <Loader2 size={13} className="animate-spin" />
                    {batchProgress.done}/{batchProgress.total}…
                  </>
                ) : (
                  `Appliquer ${batchTagIds.size} tag${batchTagIds.size > 1 ? "s" : ""} à ${selected.size} photo${selected.size > 1 ? "s" : ""}`
                )}
              </button>
            </div>
          </div>
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
