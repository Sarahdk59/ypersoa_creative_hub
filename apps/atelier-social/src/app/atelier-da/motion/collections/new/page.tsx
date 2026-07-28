"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { CollectionBuilder } from "@/components/motion/CollectionBuilder";

export default function NewCollectionPage() {
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
          Nouvelle collection
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
          Sélectionne tes photos, assigne un type de plan à chacune, et enregistre ta collection.
        </p>
      </header>

      <CollectionBuilder initial={null} />
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
