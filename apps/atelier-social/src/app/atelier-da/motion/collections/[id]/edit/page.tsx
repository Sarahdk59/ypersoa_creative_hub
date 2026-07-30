"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import { CollectionBuilder, type CollectionBuilderInitialData } from "@/components/motion/CollectionBuilder";

export default function EditCollectionPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;

  const [data, setData] = useState<CollectionBuilderInitialData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/da/motion/collections/${id}`, { cache: "no-store" })
      .then((r) => {
        if (!r.ok) throw new Error(`Collection ${id} introuvable`);
        return r.json();
      })
      .then((d) => setData(d as CollectionBuilderInitialData))
      .catch((err) => setError(err instanceof Error ? err.message : "Erreur"))
      .finally(() => setLoading(false));
  }, [id]);

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto" }}>
      <Link href="/atelier-da/motion/collections" style={backStyle}>
        <ArrowLeft size={14} strokeWidth={1.6} /> Mes Collections
      </Link>

      <header style={{ marginBottom: 24 }}>
        <h1
          style={{
            fontFamily: "var(--font-editorial)",
            fontSize: 34,
            fontWeight: 500,
            letterSpacing: "-0.015em",
            margin: 0,
          }}
        >
          {data ? `Éditer — ${data.label}` : "Éditer la collection"}
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
          Modifie les photos, leur ordre et leur type de plan, puis enregistre.
        </p>
      </header>

      {loading && (
        <div style={{ textAlign: "center", padding: 60 }}>
          <Loader2 size={22} className="animate-spin" style={{ opacity: 0.35 }} />
        </div>
      )}
      {error && (
        <div
          style={{
            padding: 14,
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
      )}
      {!loading && !error && data && (
        <CollectionBuilder initial={data} />
      )}
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
