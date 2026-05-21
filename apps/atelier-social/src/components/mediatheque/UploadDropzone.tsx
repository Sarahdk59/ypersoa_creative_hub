/**
 * UploadDropzone — drag-and-drop multi-fichiers pour la médiathèque.
 *
 * Sprint 1 : pas d'upload réel vers Supabase Storage. Les fichiers sont
 * lus côté client en data URL et POSTés sur /api/da/mediatheque/media en
 * tant que public_url temporaire. Permet à Sarah de tester le flux
 * complet (drag → tag → galerie) sans branchement DB.
 *
 * Sprint 2 : remplacer `readAsDataURL` par un upload vers le bucket
 * `ypersoa-media` + génération de thumbnail.
 */
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useDropzone } from "react-dropzone";
import { ArrowRight, Check, FileImage, Loader2, Trash2, UploadCloud } from "lucide-react";

import type { MediaSource, Tag, TagCategory } from "@/types/mediatheque";
import { SOURCE_LABELS, TAG_CATEGORY_LABELS, TAG_CATEGORY_ORDER } from "@/types/mediatheque";
import { createMedia } from "@/lib/mediatheque/api-client";

interface PendingFile {
  id: string;
  file: File;
  preview: string;
  width?: number;
  height?: number;
  status: "pending" | "uploading" | "done" | "error";
  error?: string;
  mediaId?: string;
}

interface UploadDropzoneProps {
  tagsByCategory: Record<string, Tag[]>;
  onUploaded?: (count: number) => void;
}

const SUGGESTION_PATTERNS: Array<{ category: TagCategory; pattern: RegExp; slug: string }> = [
  { category: "incarnation", pattern: /mama[-_ ]?club/i, slug: "mama-club" },
  { category: "incarnation", pattern: /papa[-_ ]?club/i, slug: "papa-club" },
  { category: "incarnation", pattern: /sista[-_ ]?club/i, slug: "sista-club" },
  { category: "incarnation", pattern: /famille[-_ ]?club/i, slug: "famille-club" },
  { category: "incarnation", pattern: /amour[-_ ]?club/i, slug: "amour-club" },
  { category: "incarnation", pattern: /bride/i, slug: "bride-team" },
  { category: "incarnation", pattern: /dog[-_ ]?dad/i, slug: "dog-dad-gang" },
  { category: "incarnation", pattern: /papi/i, slug: "papi-club" },
  { category: "incarnation", pattern: /mamie/i, slug: "mamie-club" },
  { category: "gabarit", pattern: /hoodie/i, slug: "yp001" },
  { category: "gabarit", pattern: /sweat/i, slug: "yp005" },
  { category: "gabarit", pattern: /t[-_ ]?shirt|tshirt/i, slug: "yp019" },
  { category: "gabarit", pattern: /zoodie/i, slug: "yp021" },
  { category: "couleur_produit", pattern: /creme|crème/i, slug: "creme" },
  { category: "couleur_produit", pattern: /blanc/i, slug: "blanc" },
  { category: "couleur_produit", pattern: /noir/i, slug: "noir" },
  { category: "couleur_produit", pattern: /marine/i, slug: "marine" },
  { category: "couleur_produit", pattern: /sauge/i, slug: "vert-sauge" },
  { category: "couleur_produit", pattern: /rose/i, slug: "rose-pale" },
  { category: "couleur_produit", pattern: /kaki/i, slug: "kaki" },
  { category: "couleur_produit", pattern: /lilas/i, slug: "lilas" },
  { category: "plan", pattern: /hero/i, slug: "hero" },
  { category: "plan", pattern: /buste/i, slug: "buste" },
  { category: "plan", pattern: /lifestyle/i, slug: "lifestyle" },
  { category: "plan", pattern: /detail|macro/i, slug: "detail-broderie" },
  { category: "plan", pattern: /plat|flat/i, slug: "plat" },
];

function suggestTags(filename: string, tagsByCategory: Record<string, Tag[]>): string[] {
  const ids: string[] = [];
  for (const s of SUGGESTION_PATTERNS) {
    if (s.pattern.test(filename)) {
      const t = tagsByCategory[s.category]?.find((x) => x.slug === s.slug);
      if (t) ids.push(t.id);
    }
  }
  return ids;
}

function readFile(file: File): Promise<{ dataUrl: string; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => {
      const dataUrl = String(reader.result);
      const img = new Image();
      img.onload = () => resolve({ dataUrl, width: img.naturalWidth, height: img.naturalHeight });
      img.onerror = () => resolve({ dataUrl, width: 0, height: 0 });
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  });
}

export function UploadDropzone({ tagsByCategory, onUploaded }: UploadDropzoneProps) {
  const [files, setFiles] = useState<PendingFile[]>([]);
  const [source, setSource] = useState<MediaSource>("shooting_studio");
  const [photographe, setPhotographe] = useState("");
  const [dateShoot, setDateShoot] = useState("");
  const [globalTagIds, setGlobalTagIds] = useState<Set<string>>(new Set());
  const [perFileTags, setPerFileTags] = useState<Record<string, Set<string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });

  useEffect(() => {
    return () => {
      // libère les blob URLs (préview)
      files.forEach((f) => {
        if (f.preview.startsWith("blob:")) URL.revokeObjectURL(f.preview);
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onDrop = useCallback(
    async (accepted: File[]) => {
      const next: PendingFile[] = [];
      for (const file of accepted) {
        const preview = URL.createObjectURL(file);
        const id = `pending-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        const suggested = suggestTags(file.name, tagsByCategory);
        next.push({ id, file, preview, status: "pending" });
        setPerFileTags((prev) => ({ ...prev, [id]: new Set(suggested) }));
      }
      setFiles((prev) => [...prev, ...next]);
    },
    [tagsByCategory],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [] },
    multiple: true,
  });

  const removeFile = (id: string) => {
    setFiles((prev) => {
      const target = prev.find((f) => f.id === id);
      if (target?.preview.startsWith("blob:")) URL.revokeObjectURL(target.preview);
      return prev.filter((f) => f.id !== id);
    });
    setPerFileTags((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const toggleGlobalTag = (tagId: string) => {
    setGlobalTagIds((prev) => {
      const next = new Set(prev);
      if (next.has(tagId)) next.delete(tagId);
      else next.add(tagId);
      return next;
    });
  };

  const togglePerFileTag = (fileId: string, tagId: string) => {
    setPerFileTags((prev) => {
      const cur = new Set(prev[fileId] ?? []);
      if (cur.has(tagId)) cur.delete(tagId);
      else cur.add(tagId);
      return { ...prev, [fileId]: cur };
    });
  };

  const applyGlobalToAll = () => {
    setPerFileTags((prev) => {
      const next: Record<string, Set<string>> = {};
      for (const f of files) {
        const cur = new Set(prev[f.id] ?? []);
        for (const tid of globalTagIds) cur.add(tid);
        next[f.id] = cur;
      }
      return next;
    });
  };

  const submit = async () => {
    if (files.length === 0) return;
    setSubmitting(true);
    setProgress({ done: 0, total: files.length });

    for (const pending of files) {
      if (pending.status === "done") {
        setProgress((p) => ({ ...p, done: p.done + 1 }));
        continue;
      }
      setFiles((prev) =>
        prev.map((f) => (f.id === pending.id ? { ...f, status: "uploading" } : f)),
      );
      try {
        const { dataUrl, width, height } = await readFile(pending.file);
        const allTagIds = new Set<string>([
          ...globalTagIds,
          ...(perFileTags[pending.id] ?? []),
        ]);
        const created = await createMedia({
          filename: pending.file.name,
          public_url: dataUrl,
          width: width || undefined,
          height: height || undefined,
          size_bytes: pending.file.size,
          mime_type: pending.file.type || "image/jpeg",
          source,
          photographe: photographe || undefined,
          date_shoot: dateShoot || undefined,
          tag_ids: Array.from(allTagIds),
        });
        setFiles((prev) =>
          prev.map((f) =>
            f.id === pending.id
              ? { ...f, status: "done", mediaId: created.id, width, height }
              : f,
          ),
        );
      } catch (err) {
        setFiles((prev) =>
          prev.map((f) =>
            f.id === pending.id
              ? {
                  ...f,
                  status: "error",
                  error: err instanceof Error ? err.message : "Erreur upload",
                }
              : f,
          ),
        );
      }
      setProgress((p) => ({ ...p, done: p.done + 1 }));
    }

    setSubmitting(false);
    const okCount = files.filter((f) => f.status !== "error").length;
    onUploaded?.(okCount);
  };

  const flatTags = useMemo<Array<{ category: TagCategory; tag: Tag }>>(() => {
    const out: Array<{ category: TagCategory; tag: Tag }> = [];
    for (const cat of TAG_CATEGORY_ORDER) {
      for (const t of tagsByCategory[cat] ?? []) out.push({ category: cat, tag: t });
    }
    return out;
  }, [tagsByCategory]);

  const allDone =
    files.length > 0 && files.every((f) => f.status === "done" || f.status === "error");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Dropzone */}
      <div
        {...getRootProps()}
        style={{
          border: `2px dashed ${isDragActive ? "var(--color-brand-rose, #A76059)" : "var(--hub-border)"}`,
          borderRadius: 16,
          padding: 48,
          textAlign: "center",
          background: isDragActive ? "rgba(167,96,89,0.06)" : "white",
          cursor: "pointer",
          transition: "background 150ms ease, border-color 150ms ease",
        }}
      >
        <input {...getInputProps()} />
        <UploadCloud
          size={36}
          strokeWidth={1.4}
          style={{ color: "var(--hub-foreground)", opacity: 0.6, marginBottom: 12 }}
        />
        <p
          style={{
            fontFamily: "var(--font-editorial)",
            fontSize: 20,
            margin: 0,
            color: "var(--hub-foreground)",
          }}
        >
          {isDragActive ? "Dépose ici" : "Glisse tes photos ici"}
        </p>
        <p
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 13,
            color: "var(--hub-foreground)",
            opacity: 0.6,
            margin: "6px 0 0 0",
          }}
        >
          ou clique pour parcourir — JPG, PNG, WebP, multi-sélection acceptée
        </p>
      </div>

      {/* Métadonnées globales */}
      <section
        style={{
          background: "white",
          border: "0.5px solid var(--hub-border)",
          borderRadius: 12,
          padding: 20,
        }}
      >
        <h3
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            margin: 0,
            marginBottom: 12,
            color: "var(--hub-foreground)",
            opacity: 0.7,
          }}
        >
          Métadonnées globales
        </h3>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 12,
          }}
        >
          <label style={fieldStyle}>
            <span style={labelStyle}>Source</span>
            <select
              value={source}
              onChange={(e) => setSource(e.target.value as MediaSource)}
              style={inputStyle}
            >
              {Object.entries(SOURCE_LABELS).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </label>
          <label style={fieldStyle}>
            <span style={labelStyle}>Date de shooting</span>
            <input
              type="date"
              value={dateShoot}
              onChange={(e) => setDateShoot(e.target.value)}
              style={inputStyle}
            />
          </label>
          <label style={fieldStyle}>
            <span style={labelStyle}>Photographe</span>
            <input
              type="text"
              value={photographe}
              onChange={(e) => setPhotographe(e.target.value)}
              placeholder="Maï, IA nano-banana…"
              style={inputStyle}
            />
          </label>
        </div>
      </section>

      {/* Tags batch */}
      <section
        style={{
          background: "white",
          border: "0.5px solid var(--hub-border)",
          borderRadius: 12,
          padding: 20,
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
          <h3 style={{ ...labelStyle, margin: 0 }}>
            Tags à appliquer ({globalTagIds.size} sélectionné{globalTagIds.size > 1 ? "s" : ""})
          </h3>
          <button
            type="button"
            disabled={globalTagIds.size === 0 || files.length === 0}
            onClick={applyGlobalToAll}
            style={{
              ...buttonGhost,
              opacity: globalTagIds.size === 0 || files.length === 0 ? 0.4 : 1,
            }}
          >
            <ArrowRight size={12} /> Appliquer à tous les fichiers
          </button>
        </div>
        <TagPickerInline
          flatTags={flatTags}
          selected={globalTagIds}
          onToggle={toggleGlobalTag}
        />
      </section>

      {/* Liste fichiers */}
      {files.length > 0 && (
        <section
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          <h3 style={labelStyle}>
            {files.length} fichier{files.length > 1 ? "s" : ""} en attente
          </h3>
          {files.map((f) => {
            const fileTagIds = perFileTags[f.id] ?? new Set();
            return (
              <article
                key={f.id}
                style={{
                  background: "white",
                  border: "0.5px solid var(--hub-border)",
                  borderRadius: 12,
                  padding: 12,
                  display: "grid",
                  gridTemplateColumns: "80px 1fr auto",
                  gap: 16,
                  alignItems: "center",
                }}
              >
                <div
                  style={{
                    width: 80,
                    height: 100,
                    borderRadius: 8,
                    background: "var(--hub-bg)",
                    overflow: "hidden",
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={f.preview}
                    alt={f.file.name}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                </div>
                <div style={{ minWidth: 0 }}>
                  <p
                    style={{
                      fontFamily: "var(--font-sans)",
                      fontSize: 13,
                      color: "var(--hub-foreground)",
                      margin: 0,
                      marginBottom: 4,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    <FileImage
                      size={12}
                      strokeWidth={1.6}
                      style={{ verticalAlign: "middle", marginRight: 4 }}
                    />
                    {f.file.name}
                  </p>
                  <p
                    style={{
                      fontFamily: "var(--font-sans)",
                      fontSize: 11,
                      color: "var(--hub-foreground)",
                      opacity: 0.55,
                      margin: 0,
                      marginBottom: 8,
                    }}
                  >
                    {(f.file.size / 1024 / 1024).toFixed(2)} Mo · {fileTagIds.size} tag
                    {fileTagIds.size > 1 ? "s" : ""}
                  </p>
                  <TagPickerInline
                    flatTags={flatTags}
                    selected={fileTagIds}
                    onToggle={(tid) => togglePerFileTag(f.id, tid)}
                    compact
                  />
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  {f.status === "uploading" && (
                    <Loader2 size={16} className="animate-spin" />
                  )}
                  {f.status === "done" && (
                    <Check size={16} color="#365D40" strokeWidth={2} />
                  )}
                  {f.status === "error" && (
                    <span
                      style={{
                        fontSize: 11,
                        color: "#A0312A",
                        fontFamily: "var(--font-sans)",
                      }}
                    >
                      {f.error}
                    </span>
                  )}
                  {f.status !== "uploading" && (
                    <button
                      type="button"
                      onClick={() => removeFile(f.id)}
                      aria-label="Retirer"
                      style={{
                        background: "transparent",
                        border: "none",
                        cursor: "pointer",
                        padding: 4,
                        opacity: 0.5,
                      }}
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </section>
      )}

      {/* Footer actions */}
      {files.length > 0 && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            justifyContent: "flex-end",
          }}
        >
          {submitting && (
            <span
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: 12,
                color: "var(--hub-foreground)",
                opacity: 0.65,
              }}
            >
              {progress.done} / {progress.total}…
            </span>
          )}
          {allDone && (
            <span
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: 12,
                color: "#365D40",
              }}
            >
              <Check size={14} style={{ verticalAlign: "middle" }} /> Tous traités
            </span>
          )}
          <button
            type="button"
            disabled={submitting || files.length === 0}
            onClick={submit}
            style={{
              background: "var(--color-brand-rose, #A76059)",
              color: "white",
              border: "none",
              borderRadius: 9999,
              padding: "12px 24px",
              fontFamily: "var(--font-sans)",
              fontSize: 13,
              fontWeight: 500,
              letterSpacing: "0.04em",
              cursor: submitting ? "not-allowed" : "pointer",
              opacity: submitting ? 0.6 : 1,
            }}
          >
            {submitting ? "Envoi…" : `Uploader ${files.length} photo${files.length > 1 ? "s" : ""}`}
          </button>
        </div>
      )}
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  fontFamily: "var(--font-sans)",
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: "var(--hub-foreground)",
  opacity: 0.7,
  marginBottom: 6,
  display: "block",
};

const fieldStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 4,
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
};

const buttonGhost: React.CSSProperties = {
  background: "transparent",
  border: "0.5px solid var(--hub-border)",
  borderRadius: 9999,
  padding: "6px 12px",
  fontFamily: "var(--font-sans)",
  fontSize: 11,
  color: "var(--hub-foreground)",
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
};

interface TagPickerInlineProps {
  flatTags: Array<{ category: TagCategory; tag: Tag }>;
  selected: Set<string>;
  onToggle: (tagId: string) => void;
  compact?: boolean;
}

function TagPickerInline({ flatTags, selected, onToggle, compact }: TagPickerInlineProps) {
  const [filter, setFilter] = useState("");
  const filtered = useMemo(() => {
    const q = filter.toLowerCase().trim();
    if (!q) return flatTags;
    return flatTags.filter(
      ({ tag, category }) =>
        tag.label.toLowerCase().includes(q) ||
        tag.slug.includes(q) ||
        TAG_CATEGORY_LABELS[category].toLowerCase().includes(q),
    );
  }, [flatTags, filter]);

  return (
    <div>
      {!compact && (
        <input
          type="search"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filtrer les tags…"
          style={{ ...inputStyle, width: "100%", marginBottom: 8 }}
        />
      )}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 4,
          maxHeight: compact ? 80 : 200,
          overflowY: "auto",
        }}
      >
        {filtered.map(({ tag, category }) => {
          const isSel = selected.has(tag.id);
          return (
            <button
              key={tag.id}
              type="button"
              onClick={() => onToggle(tag.id)}
              style={{
                padding: compact ? "3px 8px" : "5px 10px",
                borderRadius: 999,
                border: isSel
                  ? "0.5px solid var(--hub-foreground)"
                  : "0.5px solid var(--hub-border)",
                background: isSel ? "var(--hub-foreground)" : "white",
                color: isSel ? "var(--hub-bg)" : "var(--hub-foreground)",
                fontFamily: "var(--font-sans)",
                fontSize: compact ? 10 : 11,
                cursor: "pointer",
              }}
              title={`${TAG_CATEGORY_LABELS[category]} · ${tag.slug}`}
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
