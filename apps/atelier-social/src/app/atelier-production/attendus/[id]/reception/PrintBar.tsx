"use client";

import Link from "next/link";
import { ArrowLeft, Printer } from "lucide-react";

export default function PrintBar({ attenduId }: { attenduId: string }) {
  return (
    <div className="no-print" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, gap: 12 }}>
      <Link href={`/atelier-production/attendus/${attenduId}`} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: "#1A1614", opacity: 0.7, textDecoration: "none" }}>
        <ArrowLeft size={14} /> Retour à l&apos;attendu
      </Link>
      <div style={{ display: "flex", gap: 8 }}>
        <a href={`/api/production/attendus/${attenduId}/export`} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 6, border: "1px solid #D8D2C8", color: "#1A1614", fontSize: 13, textDecoration: "none" }}>
          Excel
        </a>
        <button onClick={() => window.print()} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 6, border: "none", background: "#1E6E77", color: "white", fontSize: 13, fontWeight: 500, cursor: "pointer" }}>
          <Printer size={14} /> Imprimer
        </button>
      </div>
    </div>
  );
}
