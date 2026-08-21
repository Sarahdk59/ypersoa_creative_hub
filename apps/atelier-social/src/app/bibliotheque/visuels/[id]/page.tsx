/**
 * Médiathèque — fiche photo éditable.
 *
 * - Statut : validation en 1 clic (rangée de boutons).
 * - Shooting : source / date / photographe / notes éditables (sauvegarde auto).
 * - Tags : ajout + retrait inline.
 */
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Copy, Loader2, Plus, X } from "lucide-react";

import type { MediaSource, MediaStatut, MediaWithTags, Tag, TagCategory } from "@/types/mediatheque";
import {
  SOURCE_LABELS,
  STATUT_LABELS,
  TAG_CATEGORY_LABELS,
  TAG_CATEGORY_ORDER,
} from "@/types/mediatheque";
import {
  addTagToMedia,
  fetchMediaById,
  fetchTags,
  removeTagFromMedia,
  updateMedia,
} from "@/lib/mediatheque/api-client";

const STATUT_ORDER: MediaStatut[] = ["a_valider", "validee", "publiee_shopify", "archivee"];

const STATUT_COLORS: Record<MediaStatut, { bg: string; fg: string }> = {
  a_valider: { bg: "#F3E6CF", fg: "#7A5A1E" },
  validee: { bg: "#D7E5DA", fg: "#365D40" },
  publiee_shopify: { bg: "#1E2D4A", fg: "#FAF7F2" },
  archivee: { bg: "#E8E1D6", fg: "#5A5A5A" },
};

export default function MediathequeDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [media, setMedia] = useState<MediaWithTags | null>(null);
  const [tagsByCategory, setTagsByCategory] = useState<Record<string, Tag[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [tagPickerOpen, setTagPickerOpen] = useState(false);

  // Champs shooting (état local, synchronisé au chargement)
  const [photographe, setPhotographe] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([fetchMediaById(id), fetchTags()])
      .then(([m, t]) => {
        if (cancelled) return;
        setMedia(m);
        setPhotographe(m.photographe ?? "");
        setNotes(m.notes ?? "");
        setTagsByCategory(t.by_category);
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
  }, [id]);

  const patch = async (p: Parameters<typeof updateMedia>[1]) => {
    if (!media) return;
    setSaving(true);
    try {
      const updated = await updateMedia(media.id, p);
      setMedia(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur de sauvegarde");
    } finally {
      setSaving(false);
    }
  };

  const handleAddTag = async (tagId: string) => {
    if (!media) return;
    setSaving(true);
    try {
      const updated = await addTagToMedia(media.id, tagId);
      setMedia(updated);
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveTag = async (tagId: string) => {
    if (!media) return;
    setSaving(true);
    try {
      const updated = await removeTagFromMedia(media.id, tagId);
      setMedia(updated);
    } finally {
      setSaving(false);
    }
  };

  const copyUrl = async () => {
    if (!media) return;
    try {
      await navigator.clipboard.writeText(media.public_url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* noop */
    }
  };

  const currentTagIds = useMemo(
    () => new Set((media?.tags ?? []).map((t) => t.id)),
    [media],
  );

  if (loading) {
    return (
      <div style={{ padding: 60, textAlign: "center" }}>
        <Loader2 size={22} className="animate-spin" />
      </div>
    );
  }

  if (error && !media) {
    return (
      <div style={{ maxWidth: 800, margin: "0 auto" }}>
        <Link href="/bibliotheque/visuels" style={backLinkStyle}>
          <ArrowLeft size={14} strokeWidth={1.6} /> Médiathèque
        </Link>
        <div
          style={{
            padding: 32,
            border: "1px solid #E2A8A2",
            borderRadius: 12,
            background: "#FAEBE8",
            color: "#7C2A24",
            fontFamily: "var(--font-sans)",
            fontSize: 14,
          }}
        >
          Photo introuvable {error ? `(${error})` : ""}.
        </div>
      </div>
    );
  }

  if (!media) return null;

  const tagsByCat = new Map<string, MediaWithTags["tags"]>();
  for (const t of media.tags) {
    if (!tagsByCat.has(t.category)) tagsByCat.set(t.category, []);
    tagsByCat.get(t.category)!.push(t);
  }

  // Bandeau famille : motif de ce média + toutes ses incarnations sœurs
  // (parcours Adriana — sauter d'une variante à l'autre sans repartir des filtres).
  const motifTag = tagsByCat.get("motif")?.[0];
  const currentIncarnationId = tagsByCat.get("incarnation")?.[0]?.id;
  const siblingIncarnations = motifTag
    ? (tagsByCategory["incarnation"] ?? []).filter((t) => t.parent_id === motifTag.id)
    : [];

  return (
    <div style={{ maxWidth: 1400, margin: "0 auto" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 16,
        }}
      >
        <Link href="/bibliotheque/visuels" style={backLinkStyle}>
          <ArrowLeft size={14} strokeWidth={1.6} /> Médiathèque
        </Link>
        {saving && (
          <span
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 11,
              color: "var(--hub-foreground)",
              opacity: 0.55,
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
            }}
          >
            <Loader2 size={12} className="animate-spin" /> Sauvegarde…
          </span>
        )}
      </div>

      {motifTag && siblingIncarnations.length > 0 && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 8,
            padding: "10px 14px",
            marginBottom: 16,
            borderRadius: 10,
            background: "var(--hub-accent-wash)",
          }}
        >
          <span
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 11,
              fontWeight: 600,
              color: "var(--hub-foreground)",
              opacity: 0.7,
            }}
          >
            Famille : {motifTag.label}
          </span>
          {siblingIncarnations.map((s) => (
            <Link
              key={s.id}
              href={`/bibliotheque/visuels?tags=${encodeURIComponent(`incarnation:${s.slug}`)}`}
              style={{
                padding: "3px 10px",
                borderRadius: 999,
                fontFamily: "var(--font-sans)",
                fontSize: 11,
                fontWeight: s.id === currentIncarnationId ? 700 : 500,
                textDecoration: "none",
                background: s.id === currentIncarnationId ? "var(--hub-foreground)" : "white",
                color: s.id === currentIncarnationId ? "var(--hub-bg)" : "var(--hub-foreground)",
                border: "0.5px solid var(--hub-border)",
              }}
            >
              {s.label}
            </Link>
          ))}
        </div>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 3fr) minmax(300px, 2fr)",
          gap: 32,
          alignItems: "start",
        }}
      >
        {/* Preview */}
        <div
          style={{
            background: "white",
            border: "0.5px solid var(--hub-border)",
            borderRadius: 12,
            overflow: "hidden",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={media.public_url}
            alt={media.filename}
            style={{
              width: "100%",
              height: "auto",
              display: "block",
              maxHeight: "80vh",
              objectFit: "contain",
              background: "var(--hub-bg)",
            }}
          />
        </div>

        {/* Métadonnées éditables */}
        <aside
          style={{
            background: "white",
            border: "0.5px solid var(--hub-border)",
            borderRadius: 12,
            padding: 20,
            display: "flex",
            flexDirection: "column",
            gap: 18,
          }}
        >
          <h1
            style={{
              fontFamily: "var(--font-editorial)",
              fontSize: 22,
              fontWeight: 500,
              margin: 0,
              wordBreak: "break-word",
            }}
          >
            {media.filename}
          </h1>

          {/* Statut — validation 1 clic */}
          <div style={fieldGroupStyle}>
            <span style={labelStyle}>Statut</span>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {STATUT_ORDER.map((st) => {
                const active = media.statut === st;
                const col = STATUT_COLORS[st];
                return (
                  <button
                    key={st}
                    type="button"
                    onClick={() => !active && patch({ statut: st })}
                    style={{
                      padding: "5px 12px",
                      borderRadius: 999,
                      border: active ? "none" : "0.5px solid var(--hub-border)",
                      background: active ? col.bg : "white",
                      color: active ? col.fg : "var(--hub-foreground)",
                      fontFamily: "var(--font-sans)",
                      fontSize: 11,
                      fontWeight: active ? 600 : 500,
                      letterSpacing: "0.04em",
                      textTransform: "uppercase",
                      cursor: active ? "default" : "pointer",
                      opacity: active ? 1 : 0.7,
                    }}
                  >
                    {STATUT_LABELS[st]}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Shooting */}
          <div style={fieldGroupStyle}>
            <span style={labelStyle}>Source</span>
            <select
              value={media.source}
              onChange={(e) => patch({ source: e.target.value as MediaSource })}
              style={inputStyle}
            >
              {Object.entries(SOURCE_LABELS).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </div>

          <div style={fieldGroupStyle}>
            <span style={labelStyle}>Date de shooting</span>
            <input
              type="date"
              value={media.date_shoot ? media.date_shoot.slice(0, 10) : ""}
              onChange={(e) => patch({ date_shoot: e.target.value || null })}
              style={inputStyle}
            />
          </div>

          <div style={fieldGroupStyle}>
            <span style={labelStyle}>Photographe</span>
            <input
              type="text"
              value={photographe}
              onChange={(e) => setPhotographe(e.target.value)}
              onBlur={() => {
                if ((media.photographe ?? "") !== photographe) {
                  patch({ photographe: photographe || null });
                }
              }}
              placeholder="Maï, IA nano-banana…"
              style={inputStyle}
            />
          </div>

          {/* Tags éditables */}
          <section>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 8,
              }}
            >
              <span style={labelStyle}>Tags ({media.tags.length})</span>
              <button
                type="button"
                onClick={() => setTagPickerOpen((v) => !v)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  background: tagPickerOpen ? "var(--hub-foreground)" : "white",
                  color: tagPickerOpen ? "var(--hub-bg)" : "var(--hub-foreground)",
                  border: "0.5px solid var(--hub-border)",
                  borderRadius: 999,
                  padding: "4px 10px",
                  fontFamily: "var(--font-sans)",
                  fontSize: 11,
                  cursor: "pointer",
                }}
              >
                <Plus size={12} /> Ajouter
              </button>
            </div>

            {tagPickerOpen && (
              <div style={{ marginBottom: 12 }}>
                <TagPicker
                  tagsByCategory={tagsByCategory}
                  selectedIds={currentTagIds}
                  onAdd={handleAddTag}
                  onRemove={handleRemoveTag}
                />
              </div>
            )}

            {media.tags.length === 0 ? (
              <p style={{ ...valueStyle, opacity: 0.5, margin: 0 }}>Aucun tag.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {TAG_CATEGORY_ORDER.map((cat) => {
                  const tags = tagsByCat.get(cat);
                  if (!tags || tags.length === 0) return null;
                  return (
                    <div key={cat}>
                      <span
                        style={{
                          fontFamily: "var(--font-sans)",
                          fontSize: 10,
                          letterSpacing: "0.08em",
                          textTransform: "uppercase",
                          color: "var(--hub-foreground)",
                          opacity: 0.55,
                          marginBottom: 4,
                          display: "block",
                        }}
                      >
                        {TAG_CATEGORY_LABELS[cat]}
                      </span>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                        {tags.map((t) => {
                          const isIncarnation = cat === "incarnation";
                          return (
                            <span
                              key={t.id}
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 4,
                                padding: "3px 6px 3px 10px",
                                borderRadius: 999,
                                background: isIncarnation
                                  ? t.color_hex ?? "#1E2D4A"
                                  : "var(--hub-bg)",
                                color: isIncarnation ? "#FAF7F2" : "var(--hub-foreground)",
                                border: isIncarnation ? "none" : "0.5px solid var(--hub-border)",
                                fontFamily: "var(--font-sans)",
                                fontSize: 11,
                                fontWeight: isIncarnation ? 600 : 500,
                                letterSpacing: isIncarnation ? "0.04em" : 0,
                                textTransform: isIncarnation ? "uppercase" : "none",
                              }}
                            >
                              {t.label}
                              <button
                                type="button"
                                onClick={() => handleRemoveTag(t.id)}
                                aria-label={`Retirer ${t.label}`}
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  background: "transparent",
                                  border: "none",
                                  cursor: "pointer",
                                  padding: 0,
                                  color: "inherit",
                                  opacity: 0.65,
                                }}
                              >
                                <X size={11} strokeWidth={2.4} />
                              </button>
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Notes */}
          <div style={fieldGroupStyle}>
            <span style={labelStyle}>Notes</span>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              onBlur={() => {
                if ((media.notes ?? "") !== notes) patch({ notes: notes || null });
              }}
              rows={3}
              placeholder="Ambiance, retouche à prévoir, sélection…"
              style={{ ...inputStyle, resize: "vertical", lineHeight: 1.5 }}
            />
          </div>

          {/* Infos fichier (lecture seule) */}
          <div style={fieldGroupStyle}>
            <span style={labelStyle}>Fichier</span>
            <span style={valueStyle}>
              {media.width && media.height ? `${media.width}×${media.height} · ` : ""}
              {media.size_bytes ? `${(media.size_bytes / 1024 / 1024).toFixed(2)} Mo · ` : ""}
              {media.mime_type ?? ""}
            </span>
            <span style={{ ...valueStyle, opacity: 0.5, fontSize: 11 }}>
              Uploadée le{" "}
              {new Date(media.uploaded_at).toLocaleDateString("fr-FR", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </span>
          </div>

          {/* Actions */}
          <div style={{ borderTop: "0.5px solid var(--hub-border)", paddingTop: 12 }}>
            <button
              type="button"
              onClick={copyUrl}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                padding: "8px 12px",
                background: "var(--hub-bg)",
                border: "0.5px solid var(--hub-border)",
                borderRadius: 8,
                fontFamily: "var(--font-sans)",
                fontSize: 12,
                color: "var(--hub-foreground)",
                cursor: "pointer",
              }}
            >
              <Copy size={12} /> {copied ? "URL copiée !" : "Copier l'URL publique"}
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}

// ─── Tag picker (ajout inline) ──────────────────────────────────────────────

interface TagPickerProps {
  tagsByCategory: Record<string, Tag[]>;
  selectedIds: Set<string>;
  onAdd: (tagId: string) => void;
  onRemove: (tagId: string) => void;
}

function TagPicker({ tagsByCategory, selectedIds, onAdd, onRemove }: TagPickerProps) {
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
    <div
      style={{
        border: "0.5px solid var(--hub-border)",
        borderRadius: 10,
        padding: 10,
        background: "var(--hub-bg)",
      }}
    >
      <input
        type="search"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        placeholder="Filtrer les tags…"
        style={{ ...inputStyle, width: "100%", marginBottom: 8, background: "white" }}
      />
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 4,
          maxHeight: 200,
          overflowY: "auto",
        }}
      >
        {filtered.map(({ tag, category }) => {
          const isSel = selectedIds.has(tag.id);
          return (
            <button
              key={tag.id}
              type="button"
              onClick={() => (isSel ? onRemove(tag.id) : onAdd(tag.id))}
              title={`${TAG_CATEGORY_LABELS[category]} · ${tag.slug}`}
              style={{
                padding: "4px 10px",
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
          <span
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 11,
              color: "var(--hub-foreground)",
              opacity: 0.5,
            }}
          >
            Aucun tag ne correspond.
          </span>
        )}
      </div>
    </div>
  );
}

const backLinkStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  fontFamily: "var(--font-sans)",
  fontSize: 12,
  color: "var(--hub-foreground)",
  opacity: 0.6,
  textDecoration: "none",
};

const labelStyle: React.CSSProperties = {
  fontFamily: "var(--font-sans)",
  fontSize: 10,
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  color: "var(--hub-foreground)",
  opacity: 0.55,
  fontWeight: 600,
  display: "block",
  marginBottom: 6,
};

const valueStyle: React.CSSProperties = {
  fontFamily: "var(--font-sans)",
  fontSize: 13,
  color: "var(--hub-foreground)",
};

const fieldGroupStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
};

const inputStyle: React.CSSProperties = {
  background: "var(--hub-bg)",
  border: "0.5px solid var(--hub-border)",
  borderRadius: 8,
  padding: "8px 12px",
  fontFamily: "var(--font-sans)",
  fontSize: 13,
  color: "var(--hub-foreground)",
  outline: "none",
  width: "100%",
};
