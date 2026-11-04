"use client";

import Link from "next/link";
import { ArrowLeft, Printer } from "lucide-react";

export default function PrintBar({ commandeId, incomplete }: { commandeId: string; incomplete: boolean }) {
  return (
    <div className="no-print" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, gap: 12 }}>
      <Link
        href={`/atelier-production/commandes/${commandeId}`}
        style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: "#1A1614", opacity: 0.7, textDecoration: "none" }}
      >
        <ArrowLeft size={14} /> Retour à la commande
      </Link>
      <button
        onClick={() => window.print()}
        style={{
          display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 6,
          border: "none", background: incomplete ? "#9A4400" : "#1E6E77", color: "white",
          fontSize: 13, fontWeight: 500, cursor: "pointer",
        }}
      >
        <Printer size={14} /> {incomplete ? "Imprimer quand même (incomplète)" : "Imprimer"}
      </button>
    </div>
  );
}
