"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Film, Loader2, Plus, Trash2 } from "lucide-react";
import type { MotionCollectionListItem } from "@/lib/motion/collections-store";

export default function MotionCollectionsPage() {
  const [collections, setCollections] = useState<MotionCollectionListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    fetch("/api/da/motion/collections", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setCollections(d.data ?? []))
      .catch(() => setCollections([]))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleDelete = async (id: string, label: string) => {
    if (!confirm(`Supprimer la collection « ${label} » ?`)) return;
    setDeleting(id);
    try {
      await fetch(`/api/da/motion/collections/${id}`, { method: "DELETE" });
      setCollections((prev) => prev.filter((c) => c.id !== id));
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto" }}>
      <Link href="/atelier-da/motion" style={backStyle}>
        <ArrowLeft size={14} strokeWidth={1.6} /> Atelier Motion
      </Link>

      <header
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          marginBottom: 28,
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <div>
          <h1
            style={{
              fontFamily: "var(--font-editorial)",
              fontSize: 34,
              fontWeight: 500,
              letterSpacing: "-0.015em",
              margin: 0,
            }}
          >
            Mes Collections
          </h1>
          <p
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 13,
              color: "var(--hub-foreground)",
              opacity: 0.6,
              margin: "6px 0 0 0",
            }}
          >
            Séquences de photos pour le mode Reel Insta animé.
          </p>
        </div>
        <Link href="/atelier-da/motion/collections/new" style={btnPrimaryStyle}>
          <Plus size={14} strokeWidth={2} />
          Nouvelle collection
        </Link>
      </header>

      {loading ? (
        <div style={{ textAlign: "center", padding: 60 }}>
          <Loader2 size={22} className="animate-spin" style={{ opacity: 0.4 }} />
        </div>
      ) : collections.length === 0 ? (
        <EmptyState />
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: 16,
          }}
        >
          {collections.map((col) => (
            <CollectionCard
              key={col.id}
              col={col}
              deleting={deleting === col.id}
              onDelete={() => handleDelete(col.id, col.label)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function CollectionCard({
  col,
  deleting,
  onDelete,
}: {
  col: MotionCollectionListItem;
  deleting: boolean;
  onDelete: () => void;
}) {
  return (
    <div
      style={{
        background: "white",
        border: "0.5px solid var(--hub-border)",
        borderRadius: 12,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Cover */}
      <div
        style={{
          aspectRatio: "4/5",
          background: "var(--hub-bg)",
          overflow: "hidden",
          position: "relative",
        }}
      >
        {col.cover_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={col.cover_url}
            alt={col.label}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          <div
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Film size={32} style={{ opacity: 0.2 }} />
          </div>
        )}
        <div
          style={{
            position: "absolute",
            bottom: 8,
            right: 8,
            background: "rgba(26,22,20,0.72)",
            color: "white",
            fontFamily: "var(--font-sans)",
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: "0.08em",
            padding: "3px 7px",
            borderRadius: 999,
          }}
        >
          {col.shot_count} clip{col.shot_count !== 1 ? "s" : ""}
        </div>
      </div>

      {/* Info + actions */}
      <div style={{ padding: "12px 14px", flex: 1, display: "flex", flexDirection: "column", gap: 10 }}>
        <div>
          <p
            style={{
              fontFamily: "var(--font-editorial)",
              fontSize: 16,
              fontWeight: 500,
              margin: 0,
              color: "var(--hub-foreground)",
            }}
          >
            {col.label}
          </p>
          {col.description && (
            <p
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: 11,
                color: "var(--hub-foreground)",
                opacity: 0.55,
                margin: "4px 0 0 0",
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }}
            >
              {col.description}
            </p>
          )}
          <p
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 10,
              color: "var(--hub-foreground)",
              opacity: 0.4,
              margin: "6px 0 0 0",
            }}
          >
            {new Date(col.created_at).toLocaleDateString("fr-FR", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: "auto" }}>
          <Link
            href={`/atelier-da/motion/collections/${col.id}/edit`}
            style={btnSecondaryStyle}
          >
            Éditer
          </Link>
          <button
            type="button"
            onClick={onDelete}
            disabled={deleting}
            style={{
              background: "transparent",
              border: "0.5px solid #E2A8A2",
              borderRadius: 8,
              padding: "7px 10px",
              cursor: "pointer",
              color: "#9B3A34",
              display: "flex",
              alignItems: "center",
            }}
          >
            {deleting ? (
              <Loader2 size={13} className="animate-spin" />
            ) : (
              <Trash2 size={13} strokeWidth={1.6} />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div
      style={{
        border: "1px dashed var(--hub-border)",
        borderRadius: 16,
        padding: 56,
        textAlign: "center",
        background: "white",
      }}
    >
      <Film size={36} style={{ opacity: 0.15, display: "block", margin: "0 auto 14px" }} />
      <p
        style={{
          fontFamily: "var(--font-editorial)",
          fontSize: 20,
          fontWeight: 500,
          margin: "0 0 8px 0",
          color: "var(--hub-foreground)",
        }}
      >
        Aucune collection
      </p>
      <p
        style={{
          fontFamily: "var(--font-sans)",
          fontSize: 13,
          color: "var(--hub-foreground)",
          opacity: 0.55,
          margin: "0 0 20px 0",
          maxWidth: 420,
          marginInline: "auto",
        }}
      >
        Crée ta première collection en sélectionnant des photos de ta médiathèque
        et en assignant un type de shot à chacune.
      </p>
      <Link href="/atelier-da/motion/collections/new" style={btnPrimaryStyle}>
        <Plus size={13} strokeWidth={2} />
        Créer ma première collection
      </Link>
    </div>
  );
}

const backStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  fontFamily: "var(--font-sans)",
  fontSize: 12,
  color: "var(--hub-foreground)",
  opacity: 0.6,
  textDecoration: "none",
  marginBottom: 18,
};

const btnPrimaryStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  background: "var(--color-brand-rose, #A76059)",
  color: "white",
  fontFamily: "var(--font-sans)",
  fontSize: 12,
  fontWeight: 500,
  padding: "9px 18px",
  borderRadius: 9999,
  textDecoration: "none",
  letterSpacing: "0.04em",
};

const btnSecondaryStyle: React.CSSProperties = {
  flex: 1,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  background: "var(--hub-bg)",
  border: "0.5px solid var(--hub-border)",
  borderRadius: 8,
  padding: "7px 14px",
  fontFamily: "var(--font-sans)",
  fontSize: 12,
  color: "var(--hub-foreground)",
  textDecoration: "none",
  cursor: "pointer",
};
