"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, TrendingUp, Package, Hash, Receipt } from "lucide-react";

interface BilanProduit {
  produit_id: string;
  nom: string;
  quantite: number;
}

interface BilanMotif {
  ypm_id: string;
  nom: string;
  quantite: number;
}

interface BilanMois {
  mois: number;
  nb_commandes: number;
  ca: number;
}

interface BilanData {
  annee: number;
  nb_commandes: number;
  nb_commandes_avec_montant: number;
  ca_total_connu: number;
  panier_moyen_connu: number | null;
  par_produit: BilanProduit[];
  par_motif: BilanMotif[];
  par_source: { shopify: number; etsy: number; manuel: number };
  par_mois: BilanMois[];
}

const MOIS_LABEL = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Août", "Sep", "Oct", "Nov", "Déc"];

function formatEur(v: number): string {
  return v.toLocaleString("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
}

export default function BilanVentesPage() {
  const anneeActuelle = new Date().getFullYear();
  const [annee, setAnnee] = useState(anneeActuelle);
  const [data, setData] = useState<BilanData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hoverMois, setHoverMois] = useState<number | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/production/bilan?annee=${annee}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((res) => {
        if (!res.ok) throw new Error(res.error);
        setData(res.data);
        setError(null);
      })
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false));
  }, [annee]);

  const maxCa = useMemo(() => {
    if (!data) return 0;
    return Math.max(1, ...data.par_mois.map((m) => m.ca));
  }, [data]);

  const couverture = data && data.nb_commandes > 0 ? data.nb_commandes_avec_montant / data.nb_commandes : 0;

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto" }}>
      <Link href="/atelier-production" style={{
        display: "inline-flex", alignItems: "center", gap: 6,
        fontFamily: "var(--font-sans)", fontSize: 12,
        color: "var(--hub-foreground)", opacity: 0.6,
        textDecoration: "none", marginBottom: 24,
      }}>
        <ArrowLeft size={14} strokeWidth={1.6} /> Atelier Production
      </Link>

      <header style={{ marginBottom: 28, display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 16 }}>
        <div>
          <h1 style={{ fontFamily: "var(--font-editorial)", fontSize: 36, fontWeight: 500, margin: 0, marginBottom: 6 }}>
            Bilan de ventes
          </h1>
          <p style={{ fontFamily: "var(--font-sans)", fontSize: 13, color: "var(--hub-foreground)", opacity: 0.65, margin: 0 }}>
            Agrégation des commandes enregistrées dans le Hub — Shopify, Etsy, saisie manuelle.
          </p>
        </div>
        <select
          value={annee}
          onChange={(e) => setAnnee(Number(e.target.value))}
          style={{
            fontFamily: "var(--font-sans)", fontSize: 14, fontWeight: 500,
            padding: "8px 14px", borderRadius: 8,
            border: "0.5px solid var(--hub-border)", background: "white",
            color: "var(--hub-foreground)",
          }}
        >
          {[anneeActuelle, anneeActuelle - 1, anneeActuelle - 2].map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </header>

      {error && (
        <div style={{ background: "#FCEDE9", border: "0.5px solid #E8A99B", color: "#7A1F12", padding: "10px 16px", borderRadius: 8, marginBottom: 16, fontFamily: "var(--font-sans)", fontSize: 13 }}>
          {error}
        </div>
      )}

      {loading ? (
        <div style={{ padding: 60, textAlign: "center" }}><Loader2 size={28} className="animate-spin" strokeWidth={1.4} /></div>
      ) : data ? (
        <>
          {/* STAT TILES */}
          <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginBottom: 28 }}>
            <StatTile icon={<TrendingUp size={16} strokeWidth={1.6} />} label="CA connu" value={formatEur(data.ca_total_connu)} />
            <StatTile icon={<Hash size={16} strokeWidth={1.6} />} label="Commandes" value={String(data.nb_commandes)} />
            <StatTile icon={<Receipt size={16} strokeWidth={1.6} />} label="Panier moyen connu" value={data.panier_moyen_connu != null ? formatEur(data.panier_moyen_connu) : "—"} />
            <StatTile icon={<Package size={16} strokeWidth={1.6} />} label="Couverture montant" value={`${Math.round(couverture * 100)} %`} sub={`${data.nb_commandes_avec_montant} / ${data.nb_commandes} commandes`} />
          </section>

          {couverture < 1 && (
            <p style={{ fontFamily: "var(--font-sans)", fontSize: 12, color: "var(--hub-foreground)", opacity: 0.6, marginTop: -16, marginBottom: 24 }}>
              Le CA connu ne porte que sur {data.nb_commandes_avec_montant} commande{data.nb_commandes_avec_montant > 1 ? "s" : ""} sur {data.nb_commandes} — les bons de préparation Shopify n&apos;indiquent généralement pas de montant ; complète-le sur la fiche commande si besoin.
            </p>
          )}

          {/* GRAPHIQUE MENSUEL */}
          <section style={{ marginBottom: 32 }}>
            <h2 style={{ fontFamily: "var(--font-sans)", fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--hub-foreground)", opacity: 0.6, marginBottom: 14 }}>
              CA connu par mois — {data.annee}
            </h2>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 160, padding: "0 2px", borderBottom: "1px solid var(--hub-border)" }}>
              {data.par_mois.map((m) => {
                const h = m.ca > 0 ? Math.max(4, (m.ca / maxCa) * 150) : 0;
                return (
                  <div
                    key={m.mois}
                    onMouseEnter={() => setHoverMois(m.mois)}
                    onMouseLeave={() => setHoverMois(null)}
                    style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", height: "100%", position: "relative", cursor: "default" }}
                  >
                    {hoverMois === m.mois && (
                      <div style={{
                        position: "absolute", bottom: h + 8, whiteSpace: "nowrap",
                        background: "var(--hub-foreground)", color: "white",
                        fontFamily: "var(--font-sans)", fontSize: 11,
                        padding: "4px 8px", borderRadius: 6, zIndex: 1,
                      }}>
                        {MOIS_LABEL[m.mois - 1]} · {formatEur(m.ca)} · {m.nb_commandes} cmd{m.nb_commandes > 1 ? "s" : ""}
                      </div>
                    )}
                    <div style={{
                      width: "100%", maxWidth: 24, height: h,
                      background: "var(--brand-teal, #1E6E77)",
                      borderRadius: "4px 4px 0 0",
                      opacity: hoverMois === null || hoverMois === m.mois ? 1 : 0.55,
                      transition: "opacity 120ms",
                    }} />
                  </div>
                );
              })}
            </div>
            <div style={{ display: "flex", gap: 2, padding: "0 2px", marginTop: 6 }}>
              {MOIS_LABEL.map((l) => (
                <div key={l} style={{ flex: 1, textAlign: "center", fontFamily: "var(--font-sans)", fontSize: 10, color: "var(--hub-foreground)", opacity: 0.55 }}>{l}</div>
              ))}
            </div>
          </section>

          {/* RÉPARTITIONS */}
          <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 20 }}>
            <BreakdownTable title="Par produit" rows={data.par_produit.map((p) => ({ label: p.nom || p.produit_id, value: p.quantite }))} />
            <BreakdownTable title="Par motif" rows={data.par_motif.map((m) => ({ label: m.nom || m.ypm_id, value: m.quantite }))} />
            <BreakdownTable
              title="Par canal"
              rows={[
                { label: "Shopify", value: data.par_source.shopify },
                { label: "Etsy", value: data.par_source.etsy },
                { label: "Manuel", value: data.par_source.manuel },
              ]}
            />
          </section>
        </>
      ) : null}
    </div>
  );
}

function StatTile({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub?: string }) {
  return (
    <div style={{ padding: "14px 16px", border: "0.5px solid var(--hub-border)", borderRadius: 10, background: "white" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--hub-foreground)", opacity: 0.6, marginBottom: 6 }}>
        {icon}
        <span style={{ fontFamily: "var(--font-sans)", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</span>
      </div>
      <div style={{ fontFamily: "var(--font-sans)", fontSize: 24, fontWeight: 600, color: "var(--hub-foreground)" }}>{value}</div>
      {sub && <div style={{ fontFamily: "var(--font-sans)", fontSize: 11, color: "var(--hub-foreground)", opacity: 0.55, marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function BreakdownTable({ title, rows }: { title: string; rows: Array<{ label: string; value: number }> }) {
  const total = rows.reduce((s, r) => s + r.value, 0) || 1;
  return (
    <div style={{ padding: 16, border: "0.5px solid var(--hub-border)", borderRadius: 10, background: "white" }}>
      <h3 style={{ fontFamily: "var(--font-sans)", fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--hub-foreground)", opacity: 0.6, margin: 0, marginBottom: 12 }}>
        {title}
      </h3>
      {rows.length === 0 ? (
        <div style={{ fontFamily: "var(--font-sans)", fontSize: 13, color: "var(--hub-foreground)", opacity: 0.5 }}>Aucune donnée</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {rows.map((r) => (
            <div key={r.label} style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ flex: 1, fontFamily: "var(--font-sans)", fontSize: 13, color: "var(--hub-foreground)" }}>{r.label}</div>
              <div style={{ width: 80, height: 6, background: "var(--hub-bg-alt, #EFE8D8)", borderRadius: 999, overflow: "hidden" }}>
                <div style={{ width: `${(r.value / total) * 100}%`, height: "100%", background: "var(--brand-teal, #1E6E77)" }} />
              </div>
              <div style={{ width: 28, textAlign: "right", fontFamily: "var(--font-sans)", fontSize: 13, fontWeight: 600, color: "var(--hub-foreground)", fontVariantNumeric: "tabular-nums" }}>
                {r.value}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
