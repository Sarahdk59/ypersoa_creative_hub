/**
 * Médiathèque — fiche photo (lecture seule Sprint 1).
 *
 * Sprint 1 = preview grand format + métadonnées + tags read-only.
 * Sprint 2 ajoutera : édition tags inline, statut, notes, navigation prev/next.
 */
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Copy, Loader2 } from "lucide-react";

import type { MediaWithTags } from "@/types/mediatheque";
import { SOURCE_LABELS, STATUT_LABELS, TAG_CATEGORY_LABELS, TAG_CATEGORY_ORDER } from "@/types/mediatheque";
import { fetchMediaById } from "@/lib/mediatheque/api-client";

export default function MediathequeDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [media, setMedia] = useState<MediaWithTags | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchMediaById(id)
      .then((m) => {
        if (!cancelled) setMedia(m);
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

  if (loading) {
    return (
      <div style={{ padding: 60, textAlign: "center" }}>
        <Loader2 size={22} className="animate-spin" />
      </div>
    );
  }

  if (error || !media) {
    return (
      <div style={{ maxWidth: 800, margin: "0 auto" }}>
        <Link href="/atelier-da/mediatheque" style={backLinkStyle}>
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

  const tagsByCat = new Map<string, MediaWithTags["tags"]>();
  for (const t of media.tags) {
    if (!tagsByCat.has(t.category)) tagsByCat.set(t.category, []);
    tagsByCat.get(t.category)!.push(t);
  }

  return (
    <div style={{ maxWidth: 1400, margin: "0 auto" }}>
      <Link href="/atelier-da/mediatheque" style={backLinkStyle}>
        <ArrowLeft size={14} strokeWidth={1.6} /> Médiathèque
      </Link>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 3fr) minmax(280px, 2fr)",
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

        {/* Métadonnées */}
        <aside
          style={{
            background: "white",
            border: "0.5px solid var(--hub-border)",
            borderRadius: 12,
            padding: 20,
            display: "flex",
            flexDirection: "column",
            gap: 16,
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

          <div style={fieldGroupStyle}>
            <span style={labelStyle}>Statut</span>
            <span style={pillStyle}>{STATUT_LABELS[media.statut]}</span>
          </div>

          <div style={fieldGroupStyle}>
            <span style={labelStyle}>Source</span>
            <span style={valueStyle}>{SOURCE_LABELS[media.source]}</span>
          </div>

          {media.date_shoot && (
            <div style={fieldGroupStyle}>
              <span style={labelStyle}>Date de shooting</span>
              <span style={valueStyle}>{new Date(media.date_shoot).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}</span>
            </div>
          )}

          {media.photographe && (
            <div style={fieldGroupStyle}>
              <span style={labelStyle}>Photographe</span>
              <span style={valueStyle}>{media.photographe}</span>
            </div>
          )}

          <div style={fieldGroupStyle}>
            <span style={labelStyle}>Uploadée le</span>
            <span style={valueStyle}>
              {new Date(media.uploaded_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}
            </span>
          </div>

          {(media.width || media.height || media.size_bytes) && (
            <div style={fieldGroupStyle}>
              <span style={labelStyle}>Fichier</span>
              <span style={valueStyle}>
                {media.width && media.height ? `${media.width}×${media.height} · ` : ""}
                {media.size_bytes ? `${(media.size_bytes / 1024 / 1024).toFixed(2)} Mo · ` : ""}
                {media.mime_type ?? ""}
              </span>
            </div>
          )}

          {media.notes && (
            <div style={fieldGroupStyle}>
              <span style={labelStyle}>Notes</span>
              <span style={{ ...valueStyle, whiteSpace: "pre-wrap" }}>{media.notes}</span>
            </div>
          )}

          {/* Tags par catégorie */}
          <section style={{ marginTop: 4 }}>
            <span style={{ ...labelStyle, marginBottom: 8, display: "block" }}>
              Tags ({media.tags.length})
            </span>
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
                        {tags.map((t) => (
                          <span
                            key={t.id}
                            style={{
                              padding: "3px 10px",
                              borderRadius: 999,
                              background:
                                cat === "incarnation" ? t.color_hex ?? "#1E2D4A" : "var(--hub-bg)",
                              color: cat === "incarnation" ? "#FAF7F2" : "var(--hub-foreground)",
                              border: cat === "incarnation" ? "none" : "0.5px solid var(--hub-border)",
                              fontFamily: "var(--font-sans)",
                              fontSize: 11,
                              fontWeight: cat === "incarnation" ? 600 : 500,
                              letterSpacing: cat === "incarnation" ? "0.04em" : 0,
                              textTransform: cat === "incarnation" ? "uppercase" : "none",
                            }}
                          >
                            {t.label}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Actions */}
          <div style={{ borderTop: "0.5px solid var(--hub-border)", paddingTop: 12, marginTop: 4 }}>
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
            <p
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: 10,
                color: "var(--hub-foreground)",
                opacity: 0.5,
                margin: "12px 0 0 0",
                lineHeight: 1.5,
              }}
            >
              Édition des tags, statut, notes + navigation prev/next disponibles
              au Sprint 2.
            </p>
          </div>
        </aside>
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
  marginBottom: 16,
};

const labelStyle: React.CSSProperties = {
  fontFamily: "var(--font-sans)",
  fontSize: 10,
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  color: "var(--hub-foreground)",
  opacity: 0.55,
  fontWeight: 600,
};

const valueStyle: React.CSSProperties = {
  fontFamily: "var(--font-sans)",
  fontSize: 13,
  color: "var(--hub-foreground)",
};

const fieldGroupStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 2,
};

const pillStyle: React.CSSProperties = {
  alignSelf: "flex-start",
  padding: "3px 10px",
  borderRadius: 999,
  background: "var(--hub-foreground)",
  color: "var(--hub-bg)",
  fontFamily: "var(--font-sans)",
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: "0.04em",
  textTransform: "uppercase",
};
