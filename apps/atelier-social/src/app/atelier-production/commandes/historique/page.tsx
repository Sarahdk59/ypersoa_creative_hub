"use client";

/**
 * Rattrapage d'historique — /atelier-production/commandes/historique
 *
 * Plusieurs bons de commande (1 fichier = 1 commande) déposés d'un coup,
 * archivés directement sur un mois : pas de DST / broderie / CQ / expédition
 * à renseigner. Les fichiers sont lus un par un (une commande déjà en base
 * n'est jamais écrasée).
 */
import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, Archive, ArrowLeft, Check, FileText, Loader2, UploadCloud, X } from "lucide-react";
import { libelleMois } from "@/lib/production/historique";

type Etat =
  | { kind: "attente" }
  | { kind: "lecture" }
  | { kind: "creee"; id: string; numero: string; client: string; nb_articles: number; warnings: string[] }
  | { kind: "existante"; id: string; numero: string; client: string }
  | { kind: "erreur"; message: string };

interface Ligne {
  key: string;
  file: File;
  etat: Etat;
}

const ACCEPT = "application/pdf,image/png,image/jpeg,image/webp";
const moisCourant = () => new Date().toISOString().slice(0, 7);

export default function HistoriquePage() {
  const [role, setRole] = useState<string | null | undefined>(undefined);
  const [mois, setMois] = useState("");
  const [lignes, setLignes] = useState<Ligne[]>([]);
  const [busy, setBusy] = useState(false);
  const [drag, setDrag] = useState(false);

  useEffect(() => {
    fetch("/api/me", { cache: "no-store" })
      .then((r) => r.json())
      .then((res) => setRole(res?.data?.role ?? null))
      .catch(() => setRole(null));
  }, []);

  function ajouter(files: FileList | File[]) {
    const ok = Array.from(files).filter((f) => !f.type || ACCEPT.includes(f.type));
    setLignes((prev) => {
      const deja = new Set(prev.map((l) => `${l.file.name}|${l.file.size}`));
      const nouvelles = ok
        .filter((f) => !deja.has(`${f.name}|${f.size}`))
        .map((file) => ({ key: `${file.name}|${file.size}|${Math.random()}`, file, etat: { kind: "attente" } as Etat }));
      return [...prev, ...nouvelles];
    });
  }

  const setEtat = (key: string, etat: Etat) => setLignes((prev) => prev.map((l) => (l.key === key ? { ...l, etat } : l)));

  async function lancer() {
    if (!mois) return;
    setBusy(true);
    const aTraiter = lignes.filter((l) => l.etat.kind === "attente" || l.etat.kind === "erreur");
    for (const l of aTraiter) {
      setEtat(l.key, { kind: "lecture" });
      try {
        const fd = new FormData();
        fd.append("file", l.file);
        fd.append("mois", mois);
        const res = await fetch("/api/production/commandes/import-historique", { method: "POST", body: fd }).then((r) => r.json());
        if (!res.ok) throw new Error(res.error);
        const d = res.data;
        setEtat(
          l.key,
          d.statut === "existante"
            ? { kind: "existante", id: d.id, numero: d.numero, client: d.client }
            : { kind: "creee", id: d.id, numero: d.numero, client: d.client, nb_articles: d.nb_articles, warnings: d.warnings ?? [] },
        );
      } catch (e) {
        setEtat(l.key, { kind: "erreur", message: e instanceof Error ? e.message : String(e) });
      }
    }
    setBusy(false);
  }

  const nbATraiter = lignes.filter((l) => l.etat.kind === "attente" || l.etat.kind === "erreur").length;
  const nbCreees = lignes.filter((l) => l.etat.kind === "creee").length;
  const nbExistantes = lignes.filter((l) => l.etat.kind === "existante").length;
  const nbErreurs = lignes.filter((l) => l.etat.kind === "erreur").length;
  const fini = lignes.length > 0 && !busy && lignes.every((l) => l.etat.kind !== "attente" && l.etat.kind !== "lecture");

  const font = { fontFamily: "var(--font-sans)" } as const;

  if (role === undefined) {
    return <div style={{ padding: 60, textAlign: "center" }}><Loader2 size={28} className="animate-spin" /></div>;
  }
  if (role !== "admin" && role !== "prod") {
    return <div style={{ padding: 24, ...font }}>Réservé à l&apos;admin et à l&apos;atelier.</div>;
  }

  return (
    <div style={{ maxWidth: 900, margin: "0 auto" }}>
      <Link
        href="/atelier-production/commandes"
        style={{ display: "inline-flex", alignItems: "center", gap: 6, ...font, fontSize: 12, color: "var(--hub-foreground)", opacity: 0.6, textDecoration: "none", marginBottom: 24 }}
      >
        <ArrowLeft size={14} strokeWidth={1.6} /> Commandes
      </Link>

      <h1 style={{ fontFamily: "var(--font-editorial)", fontWeight: 500, fontSize: 30, margin: "0 0 8px" }}>Rattraper l&apos;historique</h1>
      <p style={{ ...font, fontSize: 13, opacity: 0.65, margin: "0 0 24px", maxWidth: 680 }}>
        Dépose les bons de commande d&apos;un mois passé (un fichier = une commande). Chaque commande est lue, créée et archivée
        directement sur ce mois, sans DST, broderie, CQ ni expédition à renseigner. Une commande déjà dans le Hub n&apos;est jamais écrasée.
      </p>

      <div style={{ display: "flex", alignItems: "flex-end", gap: 16, flexWrap: "wrap", marginBottom: 16 }}>
        <label style={{ ...font, fontSize: 12 }}>
          <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", opacity: 0.6, marginBottom: 4 }}>
            Mois d&apos;archivage
          </div>
          <input
            type="month"
            value={mois}
            max={moisCourant()}
            disabled={busy}
            onChange={(e) => setMois(e.target.value)}
            style={{ padding: "7px 10px", borderRadius: 6, border: "0.5px solid var(--hub-border)", ...font, fontSize: 13, background: "white" }}
          />
        </label>
        {mois && <div style={{ ...font, fontSize: 13, opacity: 0.7, paddingBottom: 8 }}>→ archivées en <strong>{libelleMois(mois)}</strong></div>}
      </div>

      <label
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); if (!busy) ajouter(e.dataTransfer.files); }}
        style={{
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8,
          padding: 32, borderRadius: 12, cursor: busy ? "wait" : "pointer",
          border: `1.5px dashed ${drag ? "#1E6E77" : "var(--hub-border)"}`, background: drag ? "#EAF3F3" : "white",
          ...font, fontSize: 13, marginBottom: 16,
        }}
      >
        <UploadCloud size={26} strokeWidth={1.4} style={{ opacity: 0.6 }} />
        <span><strong>Glisse tes bons ici</strong> ou clique pour en choisir plusieurs</span>
        <span style={{ fontSize: 11, opacity: 0.55 }}>PDF, PNG, JPG ou WebP · 20 Mo max par fichier</span>
        <input type="file" multiple accept={ACCEPT} disabled={busy} style={{ display: "none" }}
          onChange={(e) => { if (e.target.files) ajouter(e.target.files); e.target.value = ""; }} />
      </label>

      {lignes.length > 0 && (
        <div style={{ border: "0.5px solid var(--hub-border)", borderRadius: 10, overflow: "hidden", marginBottom: 16, background: "white" }}>
          {lignes.map((l) => (
            <div key={l.key} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 14px", borderBottom: "0.5px solid var(--hub-border)", ...font, fontSize: 12 }}>
              <FileText size={15} strokeWidth={1.6} style={{ opacity: 0.55, marginTop: 1, flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 500, wordBreak: "break-all" }}>{l.file.name}</div>
                <EtatLigne etat={l.etat} />
              </div>
              {l.etat.kind === "attente" && !busy && (
                <button onClick={() => setLignes((p) => p.filter((x) => x.key !== l.key))} title="Retirer"
                  style={{ background: "none", border: "none", cursor: "pointer", opacity: 0.45, padding: 2 }}>
                  <X size={13} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <button
          onClick={lancer}
          disabled={busy || !mois || nbATraiter === 0}
          style={{
            display: "inline-flex", alignItems: "center", gap: 6, padding: "9px 16px", borderRadius: 6, border: "none",
            background: busy || !mois || nbATraiter === 0 ? "#D1CABF" : "#5A5142", color: "white",
            ...font, fontSize: 13, fontWeight: 500, cursor: busy || !mois || nbATraiter === 0 ? "not-allowed" : "pointer",
          }}
        >
          {busy ? <Loader2 size={14} className="animate-spin" /> : <Archive size={14} />}
          {busy ? "Lecture en cours…" : `Importer et archiver ${nbATraiter || ""} commande${nbATraiter > 1 ? "s" : ""}`}
        </button>
        {!mois && lignes.length > 0 && <span style={{ ...font, fontSize: 12, opacity: 0.6 }}>Choisis d&apos;abord le mois.</span>}
        {fini && (
          <span style={{ ...font, fontSize: 12, opacity: 0.75 }}>
            {nbCreees} archivée{nbCreees > 1 ? "s" : ""}
            {nbExistantes ? ` · ${nbExistantes} déjà dans le Hub` : ""}
            {nbErreurs ? ` · ${nbErreurs} en erreur (relance pour réessayer)` : ""}
          </span>
        )}
      </div>
    </div>
  );
}

function EtatLigne({ etat }: { etat: Etat }) {
  const s = { marginTop: 2, display: "flex", alignItems: "center", gap: 5 } as const;
  switch (etat.kind) {
    case "attente":
      return <div style={{ ...s, opacity: 0.5 }}>En attente</div>;
    case "lecture":
      return <div style={{ ...s, opacity: 0.7 }}><Loader2 size={11} className="animate-spin" /> Lecture du bon…</div>;
    case "creee":
      return (
        <div>
          <div style={{ ...s, color: "#2F7A3E" }}>
            <Check size={12} /> Archivée —{" "}
            <Link href={`/atelier-production/commandes/${etat.id}`} style={{ color: "inherit", fontWeight: 600 }}>{etat.numero}</Link>
            {etat.client && ` · ${etat.client}`} · {etat.nb_articles} article{etat.nb_articles > 1 ? "s" : ""}
          </div>
          {etat.warnings.map((w, i) => (
            <div key={i} style={{ ...s, color: "#7A5800" }}><AlertTriangle size={11} /> {w}</div>
          ))}
        </div>
      );
    case "existante":
      return (
        <div style={{ ...s, color: "#7A5800" }}>
          <AlertTriangle size={12} /> Déjà dans le Hub —{" "}
          <Link href={`/atelier-production/commandes/${etat.id}`} style={{ color: "inherit", fontWeight: 600 }}>{etat.numero}</Link>
          {etat.client && ` · ${etat.client}`} (non modifiée)
        </div>
      );
    case "erreur":
      return <div style={{ ...s, color: "#a13a16" }}><X size={12} /> {etat.message}</div>;
  }
}
