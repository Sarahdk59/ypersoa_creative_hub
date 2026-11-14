"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, ArrowRight, Package, Clock, AlertCircle, Archive, UploadCloud, DownloadCloud, CheckCircle2 } from "lucide-react";
import type { Commande, StatutCommande } from "@/lib/production/commandes-loader";
import { BLOCAGE_META, ORDRE_BLOCAGES, type Brodabilite, type CleBlocage } from "@/lib/production/brodabilite";
import { libelleMois } from "@/lib/production/historique";

const STATUT_META: Record<StatutCommande, { label: string; bg: string; fg: string }> = {
  a_planifier: { label: "À planifier", bg: "#FEF6E0", fg: "#7A5800" },
  planifiee:   { label: "Planifiée",   bg: "#E5EAF5", fg: "#1F3A7A" },
  en_cours:    { label: "En cours",    bg: "#FFE9D6", fg: "#9A4400" },
  terminee:    { label: "Terminée",    bg: "#E5F0E8", fg: "#2F7A3E" },
  expediee:    { label: "Expédiée",    bg: "#D9E8E6", fg: "#0E5550" },
  archivee:    { label: "Archivée",    bg: "#EBE7E0", fg: "#5A5142" },
};

type CommandeListe = Commande & { brodabilite?: Brodabilite };
type Filtre = "toutes" | "prete" | CleBlocage | "brodee";

const ETAT_RANG = { prete: 0, bloquee: 1, brodee: 2 } as const;

/** Backlog : prêtes d'abord, puis bloquées, puis déjà brodées ; urgentes puis plus anciennes en tête (OTIF). */
function trierBacklog(a: CommandeListe, b: CommandeListe): number {
  const ea = ETAT_RANG[a.brodabilite?.etat ?? "bloquee"];
  const eb = ETAT_RANG[b.brodabilite?.etat ?? "bloquee"];
  if (ea !== eb) return ea - eb;
  if (a.priorite !== b.priorite) return a.priorite === "urgente" ? -1 : 1;
  return (a.date_commande ?? "").localeCompare(b.date_commande ?? "");
}

function correspondFiltre(c: CommandeListe, f: Filtre): boolean {
  if (f === "toutes") return true;
  const b = c.brodabilite;
  if (!b) return false;
  if (f === "prete" || f === "brodee") return b.etat === f;
  return b.blocages.some((x) => x.cle === f);
}

function formatDuree(min: number): string {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h}h${String(m).padStart(2, "0")}` : `${h}h`;
}

export default function CommandesListPage() {
  const [commandes, setCommandes] = useState<CommandeListe[]>([]);
  const [filtre, setFiltre] = useState<Filtre>("toutes");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [role, setRole] = useState<string | null>(null);

  const { active, archived } = useMemo(() => {
    const a: CommandeListe[] = [];
    const ar: CommandeListe[] = [];
    for (const c of commandes) {
      if (c.statut === "archivee") ar.push(c);
      else a.push(c);
    }
    a.sort(trierBacklog);
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

    fetch("/api/me", { cache: "no-store" })
      .then((r) => r.json())
      .then((res) => setRole(res?.data?.role ?? null))
      .catch(() => setRole(null));
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
            Commandes
          </h1>
          <p style={{ fontFamily: "var(--font-sans)", fontSize: 13, color: "var(--hub-foreground)", opacity: 0.65, maxWidth: 720 }}>
            {active.length} active{active.length > 1 ? "s" : ""} · {archived.length} archivée{archived.length > 1 ? "s" : ""}. Chaque commande (Shopify ou Etsy) croise SKU ↔ motif YPM ↔ fils Gunold et génère un planning auto sur 2 machines TMEZ (6h/jour, 800 pts/min, +5 min DST par motif).
          </p>
        </div>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          {(role === "admin" || role === "prod") && (
            <Link
              href="/atelier-production/commandes/upload"
              style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                padding: "8px 14px", borderRadius: 6,
                border: "none", background: "var(--color-brand-rose, #A76059)",
                color: "white", fontFamily: "var(--font-sans)", fontSize: 12,
                fontWeight: 500, cursor: "pointer", textDecoration: "none",
              }}
            >
              <UploadCloud size={13} strokeWidth={1.6} />
              Nouveau dossier de commande
            </Link>
          )}
          {(role === "admin" || role === "prod") && (
            <Link
              href="/atelier-production/commandes/historique"
              title="Plusieurs bons d'un mois passé, archivés directement sans journal"
              style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                padding: "8px 14px", borderRadius: 6,
                border: "0.5px solid var(--hub-border)", background: "white",
                color: "var(--hub-foreground)", fontFamily: "var(--font-sans)", fontSize: 12,
                fontWeight: 500, textDecoration: "none",
              }}
            >
              <Archive size={13} strokeWidth={1.6} />
              Rattraper l&apos;historique
            </Link>
          )}
          {role === "admin" && (
            <a
              href="/api/production/commandes/export"
              download
              title="Télécharge un JSON de toutes les commandes (actives + archivées) — à committer périodiquement comme filet de secours"
              style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                padding: "8px 14px", borderRadius: 6,
                border: "0.5px solid var(--hub-border)", background: "var(--hub-bg)",
                color: "var(--hub-foreground)", fontFamily: "var(--font-sans)", fontSize: 12,
                cursor: "pointer", textDecoration: "none",
              }}
            >
              <DownloadCloud size={13} strokeWidth={1.6} />
              Exporter backup
            </a>
          )}
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
        </div>
      </header>

      {commandes.length === 0 && (
        <div style={{
          padding: 60, textAlign: "center", border: "1px dashed var(--hub-border)",
          borderRadius: 12, fontFamily: "var(--font-sans)", fontSize: 13, color: "var(--hub-foreground)",
        }}>
          <p style={{ opacity: 0.6, margin: 0 }}>Aucune commande importée pour le moment.</p>
          {(role === "admin" || role === "prod") && (
            <Link
              href="/atelier-production/commandes/upload"
              style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                marginTop: 16, padding: "10px 20px", borderRadius: 9999,
                background: "var(--color-brand-rose, #A76059)", color: "white",
                fontSize: 13, fontWeight: 500, textDecoration: "none",
              }}
            >
              <UploadCloud size={14} strokeWidth={1.6} /> Nouveau dossier de commande
            </Link>
          )}
        </div>
      )}

      {active.length > 0 && <BacklogBar commandes={active} filtre={filtre} onFiltre={setFiltre} />}

      {/* Actives */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))", gap: 16 }}>
        {active.filter((c) => correspondFiltre(c, filtre)).map((c) => <CommandeCard key={c.id} c={c} />)}
      </div>
      {active.length > 0 && !active.some((c) => correspondFiltre(c, filtre)) && (
        <p style={{ fontFamily: "var(--font-sans)", fontSize: 13, opacity: 0.6 }}>Aucune commande dans ce filtre.</p>
      )}

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

function BacklogBar({ commandes, filtre, onFiltre }: { commandes: CommandeListe[]; filtre: Filtre; onFiltre: (f: Filtre) => void }) {
  const aBroder = commandes.filter((c) => c.brodabilite && c.brodabilite.etat !== "brodee");
  const nb = (f: Filtre) => commandes.filter((c) => correspondFiltre(c, f)).length;
  const tuiles: Array<{ f: Filtre; label: string; aide: string; bg: string; fg: string }> = [
    { f: "prete", label: "Prêtes à broder", aide: "Rien ne bloque : à planifier en machine", bg: "#E5F0E8", fg: "#2F7A3E" },
    ...ORDRE_BLOCAGES.map((k) => ({
      f: k as Filtre,
      label: BLOCAGE_META[k].label,
      aide:
        k === "fournisseur"
          ? "Pièces pas encore reçues (attendu de livraison)"
          : k === "dst"
            ? "Préparation DST pas signée au journal"
            : "Info de prod manquante sur un article",
      bg: BLOCAGE_META[k].bg,
      fg: BLOCAGE_META[k].fg,
    })),
    { f: "brodee", label: "Brodées", aide: "CQ / expédition / archivage", bg: "#EBE7E0", fg: "#5A5142" },
  ];
  return (
    <section style={{ marginBottom: 24 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 10 }}>
        <h2 style={{ fontFamily: "var(--font-editorial)", fontSize: 20, fontWeight: 500, margin: 0 }}>
          Backlog broderie · {aBroder.length} commande{aBroder.length > 1 ? "s" : ""}
        </h2>
        {filtre !== "toutes" && (
          <button
            onClick={() => onFiltre("toutes")}
            style={{ border: "none", background: "none", padding: 0, cursor: "pointer", fontFamily: "var(--font-sans)", fontSize: 12, textDecoration: "underline", color: "var(--hub-foreground)" }}
          >
            Tout afficher
          </button>
        )}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 10 }}>
        {tuiles.map((t) => {
          const n = nb(t.f);
          const actif = filtre === t.f;
          return (
            <button
              key={t.f}
              onClick={() => onFiltre(actif ? "toutes" : t.f)}
              title={t.aide}
              style={{
                textAlign: "left", cursor: "pointer", padding: "12px 14px", borderRadius: 10,
                border: actif ? `1.5px solid ${t.fg}` : "0.5px solid var(--hub-border)",
                background: n ? t.bg : "var(--hub-bg)", color: n ? t.fg : "var(--hub-foreground)",
                opacity: n ? 1 : 0.55, fontFamily: "var(--font-sans)",
              }}
            >
              <div style={{ fontSize: 26, fontWeight: 600, lineHeight: 1 }}>{n}</div>
              <div style={{ fontSize: 12, fontWeight: 600, marginTop: 6 }}>{t.label}</div>
              <div style={{ fontSize: 11, opacity: 0.8, marginTop: 2 }}>{t.aide}</div>
            </button>
          );
        })}
      </div>
      <p style={{ fontFamily: "var(--font-sans)", fontSize: 11, opacity: 0.6, margin: "8px 0 0" }}>
        Une commande peut cumuler plusieurs blocages. Elle passe en « Prête à broder » toute seule dès que l&apos;attendu est réceptionné, la DST signée au journal et la fiche complète.
      </p>
    </section>
  );
}

function BrodabiliteBloc({ b }: { b: Brodabilite }) {
  if (b.etat === "brodee") return null;
  if (b.etat === "prete") {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 10px", borderRadius: 8, background: "#E5F0E8", color: "#2F7A3E", fontFamily: "var(--font-sans)", fontSize: 12, fontWeight: 600 }}>
        <CheckCircle2 size={14} strokeWidth={1.8} /> Prête à broder
      </div>
    );
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {b.blocages.map((x) => (
        <div key={x.cle} style={{ padding: "6px 10px", borderRadius: 8, background: BLOCAGE_META[x.cle].bg, color: BLOCAGE_META[x.cle].fg, fontFamily: "var(--font-sans)", fontSize: 12, lineHeight: 1.35 }}>
          <strong>{BLOCAGE_META[x.cle].label}</strong> · {x.detail}
        </div>
      ))}
    </div>
  );
}

function CommandeCard({ c }: { c: CommandeListe }) {
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
          {c.journal?.historique ? (
            <><br />Archivée en {libelleMois(c.journal.historique.mois)} (historique)</>
          ) : c.journal?.archivee_le && <><br />Archivée le {c.journal.archivee_le}</>}
        </div>

        {c.brodabilite && c.statut !== "archivee" && <BrodabiliteBloc b={c.brodabilite} />}

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
          {c.notes?.trim() && (
            <span title={c.notes} style={{ fontFamily: "var(--font-sans)", fontSize: 11, padding: "1px 8px", borderRadius: 999, background: "#FEF6E0", color: "#7A5800" }}>
              Note atelier
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
