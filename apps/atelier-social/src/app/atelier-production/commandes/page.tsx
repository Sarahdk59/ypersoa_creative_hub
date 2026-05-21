"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, ArrowRight, Package, Clock, AlertCircle, Archive } from "lucide-react";
import type { Commande, StatutCommande } from "@/lib/production/commandes-loader";

const STATUT_META: Record<StatutCommande, { label: string; bg: string; fg: string }> = {
  a_planifier: { label: "À planifier", bg: "#FEF6E0", fg: "#7A5800" },
  planifiee:   { label: "Planifiée",   bg: "#E5EAF5", fg: "#1F3A7A" },
  en_cours:    { label: "En cours",    bg: "#FFE9D6", fg: "#9A4400" },
  terminee:    { label: "Terminée",    bg: "#E5F0E8", fg: "#2F7A3E" },
  expediee:    { label: "Expédiée",    bg: "#D9E8E6", fg: "#0E5550" },
  archivee:    { label: "Archivée",    bg: "#EBE7E0", fg: "#5A5142" },
};

function formatDuree(min: number): string {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h}h${String(m).padStart(2, "0")}` : `${h}h`;
}

export default function CommandesListPage() {
  const [commandes, setCommandes] = useState<Commande[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);

  const { active, archived } = useMemo(() => {
    const a: Commande[] = [];
    const ar: Commande[] = [];
    for (const c of commandes) {
      if (c.statut === "archivee") ar.push(c);
      else a.push(c);
    }
    return { active: a, archived: ar };
  }, [commandes]);

  useEffect(() => {
    fetch("/api/production/commandes", { cache: "no-store" })
      .then((r) => r.json())
      .then((res) => {
        if (!res.ok) throw new Error(res.error);
        setCommandes(res.data);
      })
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div style={{ padding: 60, textAlign: "center" }}>
        <Loader2 size={32} className="animate-spin" strokeWidth={1.4} />
      </div>
    );
  }
  if (error) {
    return <div style={{ padding: 24, color: "#a13a16" }}>Erreur : {error}</div>;
  }

  return (
    <div style={{ maxWidth: "100%", margin: "0 auto" }}>
      <Link
        href="/atelier-production"
        style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          fontFamily: "var(--font-sans)", fontSize: 12,
          color: "var(--hub-foreground)", opacity: 0.6,
          textDecoration: "none", marginBottom: 24,
        }}
      >
        <ArrowLeft size={14} strokeWidth={1.6} /> Atelier Production
      </Link>

      <header style={{ marginBottom: 32, display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 24, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontFamily: "var(--font-editorial)", fontSize: 36, fontWeight: 500, margin: 0, marginBottom: 8 }}>
            Commandes Shopify
          </h1>
          <p style={{ fontFamily: "var(--font-sans)", fontSize: 13, color: "var(--hub-foreground)", opacity: 0.65, maxWidth: 720 }}>
            {active.length} active{active.length > 1 ? "s" : ""} · {archived.length} archivée{archived.length > 1 ? "s" : ""}. Chaque commande croise SKU Shopify ↔ motif YPM ↔ fils Gunold et génère un planning auto sur 2 machines TMEZ (6h/jour, 650 pts/min, +5 min DST par motif).
          </p>
        </div>
        {archived.length > 0 && (
          <button
            onClick={() => setShowArchived((v) => !v)}
            style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              padding: "8px 14px", borderRadius: 6,
              border: "0.5px solid var(--hub-border)", background: "var(--hub-bg)",
              color: "var(--hub-foreground)", fontFamily: "var(--font-sans)", fontSize: 12,
              cursor: "pointer",
            }}
          >
            <Archive size={13} strokeWidth={1.6} />
            {showArchived ? "Masquer archivées" : `Voir les ${archived.length} archivée${archived.length > 1 ? "s" : ""}`}
          </button>
        )}
      </header>

      {commandes.length === 0 && (
        <div style={{
          padding: 60, textAlign: "center", border: "1px dashed var(--hub-border)",
          borderRadius: 12, fontFamily: "var(--font-sans)", fontSize: 13, color: "var(--hub-foreground)", opacity: 0.6
        }}>
          Aucune commande importée pour le moment.
        </div>
      )}

      {/* Actives */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))", gap: 16 }}>
        {active.map((c) => <CommandeCard key={c.id} c={c} />)}
      </div>

      {/* Archives */}
      {showArchived && archived.length > 0 && (
        <>
          <h2 style={{
            fontFamily: "var(--font-editorial)", fontSize: 20, fontWeight: 500,
            margin: "40px 0 16px", color: "var(--hub-foreground)", opacity: 0.7,
          }}>
            Archives ({archived.length})
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))", gap: 16, opacity: 0.75 }}>
            {archived.map((c) => <CommandeCard key={c.id} c={c} />)}
          </div>
        </>
      )}
    </div>
  );
}

function CommandeCard({ c }: { c: Commande }) {
  const statut = STATUT_META[c.statut];
  const nbBroderies = c.articles.reduce((s, a) => s + a.broderies.length, 0);
  return (
    <Link href={`/atelier-production/commandes/${c.id}`} style={{ textDecoration: "none", color: "inherit" }}>
      <article style={{
        border: "0.5px solid var(--hub-border)",
        borderRadius: 12, padding: 20, background: "var(--hub-bg)",
        transition: "box-shadow 0.15s, border-color 0.15s",
        display: "flex", flexDirection: "column", gap: 12, minHeight: 200,
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontFamily: "var(--font-editorial)", fontSize: 22, fontWeight: 500 }}>{c.numero_shopify}</span>
          <span style={{
            fontFamily: "var(--font-sans)", fontSize: 10, fontWeight: 600,
            textTransform: "uppercase", letterSpacing: "0.08em",
            padding: "4px 10px", borderRadius: 999,
            background: statut.bg, color: statut.fg,
          }}>
            {statut.label}
          </span>
        </div>

        <div style={{
          fontFamily: "var(--font-sans)", fontSize: 12,
          color: "var(--hub-foreground)", opacity: 0.7, lineHeight: 1.5,
        }}>
          {c.expedition.nom} · {c.expedition.ville}<br />
          Commandé le {c.date_commande}
          {c.journal?.archivee_le && <><br />Archivée le {c.journal.archivee_le}</>}
        </div>

        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginTop: "auto", paddingTop: 12, borderTop: "1px solid var(--hub-border)" }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontFamily: "var(--font-sans)", fontSize: 12 }}>
            <Package size={13} strokeWidth={1.6} />
            {c.articles.length} article{c.articles.length > 1 ? "s" : ""}
          </span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontFamily: "var(--font-sans)", fontSize: 12 }}>
            {nbBroderies} broderie{nbBroderies > 1 ? "s" : ""}
          </span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontFamily: "var(--font-sans)", fontSize: 12 }}>
            <Clock size={13} strokeWidth={1.6} />
            {formatDuree(c.duree_total_min)}
          </span>
          {c.priorite === "urgente" && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontFamily: "var(--font-sans)", fontSize: 11, color: "#9A1818" }}>
              <AlertCircle size={12} strokeWidth={1.8} /> Urgente
            </span>
          )}
        </div>

        <div style={{
          display: "flex", alignItems: "center", gap: 6,
          fontFamily: "var(--font-sans)", fontSize: 11, fontWeight: 500,
          textTransform: "uppercase", letterSpacing: "0.08em",
          marginTop: 4,
        }}>
          Ouvrir <ArrowRight size={13} strokeWidth={1.6} />
        </div>
      </article>
    </Link>
  );
}
