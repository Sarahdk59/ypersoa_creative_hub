"use client";

/**
 * Attendus de livraison — ce que l'atelier doit recevoir des fournisseurs.
 *
 * Dépôt d'une facture / d'un bon de livraison (PDF ou photo) → lignes extraites
 * et rattachées aux réf. Ypersoa YPxxx-CCCC-TTTT → fiche de réception.
 */
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Upload, Plus, FileSpreadsheet, Truck, AlertTriangle, Loader2 } from "lucide-react";
import { STATUT_ATTENDU, dateFr } from "./ui";

interface AttenduListe {
  id: string;
  fournisseur: string;
  numero_facture?: string;
  numero_commande_fournisseur?: string;
  date_commande?: string;
  date_facture?: string;
  date_livraison_prevue?: string;
  statut: "attendu" | "recu_partiel" | "recu" | "litige";
  total_ht?: number | null;
  recu_le?: string;
  resume: { pieces: number; recues: number; aCreer: number; rnd: number; nbLignes: number };
}


const today = () => new Date().toISOString().slice(0, 10);

const btn = (primary = false): React.CSSProperties => ({
  display: "inline-flex", alignItems: "center", gap: 6, padding: "9px 16px", borderRadius: 8,
  border: primary ? "none" : "0.5px solid var(--hub-border)", background: primary ? "var(--hub-teal)" : "white",
  color: primary ? "white" : "var(--hub-foreground)", fontFamily: "var(--font-sans)", fontSize: 13, fontWeight: 500,
  cursor: "pointer", textDecoration: "none",
});

export default function AttendusPage() {
  const router = useRouter();
  const [attendus, setAttendus] = useState<AttenduListe[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [voirRecus, setVoirRecus] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/production/attendus", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => (j.ok ? setAttendus(j.data) : setError(j.error)))
      .catch((e) => setError(String(e)));
  }, []);

  async function deposer(file: File) {
    setBusy(`Lecture de ${file.name}…`);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/production/attendus/parse", { method: "POST", body: fd });
      const j = await res.json();
      if (!j.ok) throw new Error(j.error);
      const w = (j.data.warnings as string[]).join("\n");
      router.push(`/atelier-production/attendus/${j.data.id}${w ? `?w=${encodeURIComponent(w)}` : ""}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setBusy(null);
    }
  }

  async function nouveauManuel() {
    setBusy("Création…");
    const res = await fetch("/api/production/attendus", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
    const j = await res.json();
    if (j.ok) router.push(`/atelier-production/attendus/${j.data.id}`);
    else { setError(j.error); setBusy(null); }
  }

  const actifs = (attendus ?? []).filter((a) => a.statut !== "recu").sort((a, b) => (a.date_livraison_prevue ?? "9").localeCompare(b.date_livraison_prevue ?? "9"));
  const recus = (attendus ?? []).filter((a) => a.statut === "recu");

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto" }}>
      <Link href="/atelier-production" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontFamily: "var(--font-sans)", fontSize: 12, color: "var(--hub-foreground)", opacity: 0.6, textDecoration: "none", marginBottom: 24 }}>
        <ArrowLeft size={14} strokeWidth={1.6} /> Atelier Production
      </Link>

      <header style={{ marginBottom: 32, display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 24, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontFamily: "var(--font-editorial)", fontSize: 40, fontWeight: 500, letterSpacing: "-0.015em", color: "var(--hub-foreground)", lineHeight: 1.05, margin: 0, marginBottom: 12 }}>
            Attendus de livraison
          </h1>
          <p style={{ fontFamily: "var(--font-sans)", fontSize: 14, color: "var(--hub-foreground)", opacity: 0.65, maxWidth: 640, lineHeight: 1.6, margin: 0 }}>
            Ce qu&apos;on attend des fournisseurs sous 24/48h. Dépose la facture ou le bon de livraison : chaque ligne est
            rattachée à sa réf. Ypersoa (YP001-0001-0001…) ou signalée « à créer ».
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <a href="/api/production/catalogue/export" style={btn()}><FileSpreadsheet size={14} /> Exporter la base produit</a>
          <button onClick={nouveauManuel} style={btn()} disabled={!!busy}><Plus size={14} /> Saisie manuelle</button>
          <button onClick={() => fileRef.current?.click()} style={btn(true)} disabled={!!busy}>
            {busy ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />} {busy ?? "Déposer une facture"}
          </button>
          <input ref={fileRef} type="file" accept=".pdf,.png,.jpg,.jpeg,.webp" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) deposer(f); e.target.value = ""; }} />
        </div>
      </header>

      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) deposer(f); }}
        style={{ border: "1px dashed var(--hub-border)", borderRadius: 12, padding: 18, textAlign: "center", fontFamily: "var(--font-sans)", fontSize: 13, opacity: 0.7, marginBottom: 28 }}
      >
        Glisse ici une facture ou un bon de livraison fournisseur (PDF, photo)
      </div>

      {error && (
        <div style={{ background: "#FBE3E0", color: "#A5281C", borderRadius: 8, padding: "10px 14px", fontFamily: "var(--font-sans)", fontSize: 13, marginBottom: 20, whiteSpace: "pre-wrap" }}>
          {error}
        </div>
      )}

      {attendus === null && !error && <p style={{ fontFamily: "var(--font-sans)", fontSize: 13, opacity: 0.6 }}>Chargement…</p>}

      {attendus && (
        <>
          <h2 style={{ fontFamily: "var(--font-sans)", fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", opacity: 0.55, margin: "0 0 12px" }}>
            À réceptionner · {actifs.length}
          </h2>
          {actifs.length === 0 && <p style={{ fontFamily: "var(--font-sans)", fontSize: 13, opacity: 0.6 }}>Rien en attente.</p>}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 12, marginBottom: 32 }}>
            {actifs.map((a) => <Carte key={a.id} a={a} />)}
          </div>

          {recus.length > 0 && (
            <>
              <button onClick={() => setVoirRecus((v) => !v)} style={{ ...btn(), marginBottom: 12 }}>
                {voirRecus ? "Masquer" : "Voir"} les {recus.length} livraison{recus.length > 1 ? "s" : ""} reçue{recus.length > 1 ? "s" : ""}
              </button>
              {voirRecus && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 12 }}>
                  {recus.map((a) => <Carte key={a.id} a={a} />)}
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}

function Carte({ a }: { a: AttenduListe }) {
  const s = STATUT_ATTENDU[a.statut];
  const enRetard = a.statut !== "recu" && a.date_livraison_prevue && a.date_livraison_prevue < today();
  const aujourdhui = a.date_livraison_prevue === today();
  return (
    <Link href={`/atelier-production/attendus/${a.id}`} style={{ textDecoration: "none", color: "inherit" }}>
      <article style={{ background: "white", border: `0.5px solid ${enRetard ? "#C23A2D" : "var(--hub-border)"}`, borderRadius: 12, padding: 18, fontFamily: "var(--font-sans)", height: "100%" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontWeight: 600, fontSize: 14 }}>
            <Truck size={15} strokeWidth={1.6} /> {a.fournisseur || "Fournisseur ?"}
          </span>
          <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", padding: "3px 8px", borderRadius: 999, background: s.bg, color: s.fg }}>{s.label}</span>
        </div>
        <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 10 }}>
          Facture <strong>{a.numero_facture || "—"}</strong> · Cde <strong>{a.numero_commande_fournisseur || "—"}</strong>
        </div>
        <div style={{ fontSize: 13, marginBottom: 6, color: enRetard ? "#C23A2D" : undefined, fontWeight: enRetard || aujourdhui ? 600 : 400 }}>
          {a.statut === "recu" ? `Reçu le ${dateFr(a.recu_le)}` : enRetard ? `En retard — prévu ${dateFr(a.date_livraison_prevue)}` : aujourdhui ? "Arrive aujourd'hui" : `Prévu ${dateFr(a.date_livraison_prevue)}`}
        </div>
        <div style={{ fontSize: 12, opacity: 0.75, display: "flex", gap: 12, flexWrap: "wrap" }}>
          <span>{a.resume.pieces} pièce{a.resume.pieces > 1 ? "s" : ""} · {a.resume.nbLignes} ligne{a.resume.nbLignes > 1 ? "s" : ""}</span>
          {a.statut === "recu_partiel" && <span>{a.resume.recues}/{a.resume.pieces} reçues</span>}
          {a.total_ht ? <span>{a.total_ht.toFixed(2)} € HT</span> : null}
        </div>
        {(a.resume.aCreer > 0 || a.resume.rnd > 0) && (
          <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap", fontSize: 11 }}>
            {a.resume.aCreer > 0 && (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "#9A4400", background: "#FFE9D6", padding: "2px 8px", borderRadius: 999 }}>
                <AlertTriangle size={11} /> {a.resume.aCreer} réf. à créer
              </span>
            )}
            {a.resume.rnd > 0 && <span style={{ color: "#5B3E8C", background: "#EEE7F7", padding: "2px 8px", borderRadius: 999 }}>{a.resume.rnd} R&amp;D</span>}
          </div>
        )}
      </article>
    </Link>
  );
}
