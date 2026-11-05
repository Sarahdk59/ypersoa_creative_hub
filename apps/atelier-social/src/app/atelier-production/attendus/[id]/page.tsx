"use client";

/**
 * Fiche attendu de livraison : en-tête facture, lignes rattachées aux réf.
 * Ypersoa, destination (commande client / stock / R&D), saisie de la réception,
 * création de référence (produit R&D, couleur, taille) en 1 fenêtre.
 */
import { use, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Printer, FileSpreadsheet, CheckCheck, RefreshCw, Trash2, Link2, Plus, X, FileText, AlertTriangle, Split } from "lucide-react";
import { STATUT_ATTENDU, USAGE_LABEL, type StatutAttenduUI } from "../ui";

interface Ligne {
  id: string;
  ref_fournisseur: string;
  ref_modele?: string;
  designation: string;
  coloris: string;
  taille: string;
  quantite: number;
  pu_ht: number | null;
  total_ht: number | null;
  ref_produit?: string;
  code_couleur?: string;
  code_taille?: string;
  ref_article?: string;
  libelle_article?: string;
  etat: "reference" | "a_creer" | "produit_inconnu";
  manque?: string[];
  rattachement_manuel?: boolean;
  produit_rnd?: boolean;
  usage: "prod" | "stock" | "rnd";
  commande_client?: string;
  quantite_recue?: number;
  note?: string;
}

interface Attendu {
  id: string;
  fournisseur: string;
  numero_facture?: string;
  numero_commande_fournisseur?: string;
  date_commande?: string;
  date_facture?: string;
  date_livraison_prevue?: string;
  statut: StatutAttenduUI;
  total_ht?: number | null;
  total_ttc?: number | null;
  lignes: Ligne[];
  documents: Array<{ public_url: string; filename: string }>;
  notes?: string;
  recu_par?: string;
  recu_le?: string;
}

const card: React.CSSProperties = { background: "white", border: "0.5px solid var(--hub-border)", borderRadius: 12, padding: 20, marginBottom: 20 };
const lbl: React.CSSProperties = { display: "block", fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", opacity: 0.55, marginBottom: 4 };
const inp: React.CSSProperties = { width: "100%", padding: "7px 9px", border: "0.5px solid var(--hub-border)", borderRadius: 6, fontFamily: "var(--font-sans)", fontSize: 13, background: "white", boxSizing: "border-box" };
const btn = (kind: "primary" | "ghost" | "danger" = "ghost"): React.CSSProperties => ({
  display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 8, cursor: "pointer", textDecoration: "none",
  fontFamily: "var(--font-sans)", fontSize: 13, fontWeight: 500,
  border: kind === "ghost" ? "0.5px solid var(--hub-border)" : "none",
  background: kind === "primary" ? "var(--hub-teal)" : kind === "danger" ? "#A5281C" : "white",
  color: kind === "ghost" ? "var(--hub-foreground)" : "white",
});

const ETAT_BADGE: Record<Ligne["etat"], { label: string; bg: string; fg: string }> = {
  reference: { label: "Réf. OK", bg: "#E5F0E8", fg: "#2F7A3E" },
  a_creer: { label: "À créer", bg: "#FFE9D6", fg: "#9A4400" },
  produit_inconnu: { label: "Produit à créer", bg: "#FBE3E0", fg: "#A5281C" },
};

export default function AttenduPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [a, setA] = useState<Attendu | null>(null);
  const [role, setRole] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [modalLigne, setModalLigne] = useState<Ligne | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);

  // Avertissements de lecture passés par la page liste (?w=…).
  useEffect(() => {
    const w = new URLSearchParams(window.location.search).get("w");
    if (w) setWarnings(w.split("\n"));
  }, []);

  useEffect(() => {
    fetch(`/api/production/attendus/${id}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => { if (j.ok) { setA(j.data); setRole(j.role); } else setError(j.error); })
      .catch((e) => setError(String(e)));
  }, [id]);

  const patch = useCallback(async (body: Record<string, unknown>) => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/production/attendus/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const j = await res.json();
      if (!j.ok) throw new Error(j.error);
      setA(j.data);
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      return false;
    } finally {
      setSaving(false);
    }
  }, [id]);

  const majLigne = (ligneId: string, champs: Partial<Ligne>) => patch({ lignes: [{ id: ligneId, ...champs }] });

  if (error && !a) return <p style={{ fontFamily: "var(--font-sans)", color: "#A5281C" }}>{error}</p>;
  if (!a) return <p style={{ fontFamily: "var(--font-sans)", opacity: 0.6 }}>Chargement…</p>;

  const s = STATUT_ATTENDU[a.statut];
  const pieces = a.lignes.reduce((x, l) => x + l.quantite, 0);
  const recues = a.lignes.reduce((x, l) => x + Math.min(l.quantite_recue ?? 0, l.quantite), 0);
  const aCreer = a.lignes.filter((l) => l.etat !== "reference").length;
  const sommeHt = a.lignes.reduce((x, l) => x + (l.total_ht ?? 0), 0);

  const champ = (k: keyof Attendu, label: string, type = "text") => (
    <label style={{ fontFamily: "var(--font-sans)" }}>
      <span style={lbl}>{label}</span>
      <input
        key={`${k}-${String(a[k] ?? "")}`}
        type={type}
        defaultValue={(a[k] as string | number | undefined) ?? ""}
        step={type === "number" ? "0.01" : undefined}
        style={inp}
        onBlur={(e) => { const v = e.target.value; if (v !== String(a[k] ?? "")) patch({ [k]: v }); }}
      />
    </label>
  );

  return (
    <div style={{ maxWidth: 1280, margin: "0 auto", fontFamily: "var(--font-sans)", color: "var(--hub-foreground)" }}>
      <Link href="/atelier-production/attendus" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, opacity: 0.6, textDecoration: "none", color: "inherit", marginBottom: 20 }}>
        <ArrowLeft size={14} strokeWidth={1.6} /> Attendus de livraison
      </Link>

      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 16, flexWrap: "wrap", marginBottom: 20 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <h1 style={{ fontFamily: "var(--font-editorial)", fontSize: 34, fontWeight: 500, margin: 0 }}>{a.fournisseur || "Fournisseur ?"} · {a.numero_facture || a.numero_commande_fournisseur || a.id}</h1>
            <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", padding: "4px 10px", borderRadius: 999, background: s.bg, color: s.fg }}>{s.label}</span>
          </div>
          <div style={{ fontSize: 13, opacity: 0.65, marginTop: 6 }}>
            {pieces} pièce{pieces > 1 ? "s" : ""} · {recues} reçue{recues > 1 ? "s" : ""}
            {aCreer ? <> · <strong style={{ color: "#9A4400" }}>{aCreer} réf. à créer</strong></> : null}
            {saving ? " · enregistrement…" : ""}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Link href={`/atelier-production/attendus/${a.id}/reception`} style={btn()}><Printer size={14} /> Fiche réception</Link>
          <a href={`/api/production/attendus/${a.id}/export`} style={btn()}><FileSpreadsheet size={14} /> Excel</a>
          <button style={btn()} onClick={() => patch({ action: "rapprocher" })} title="Recalcule les rattachements automatiques (les choix manuels sont conservés)"><RefreshCw size={14} /> Rattacher auto</button>
          {a.statut !== "recu" && <button style={btn("primary")} onClick={() => patch({ action: "tout_recu" })}><CheckCheck size={14} /> Tout reçu</button>}
        </div>
      </header>

      {warnings.length > 0 && (
        <div style={{ background: "#FEF6E0", color: "#7A5800", borderRadius: 8, padding: "10px 14px", fontSize: 13, marginBottom: 16, display: "flex", justifyContent: "space-between", gap: 12 }}>
          <div>{warnings.map((w, i) => <div key={i}>• {w}</div>)}</div>
          <button onClick={() => { setWarnings([]); router.replace(`/atelier-production/attendus/${a.id}`); }} style={{ background: "none", border: "none", cursor: "pointer", color: "inherit" }}><X size={14} /></button>
        </div>
      )}
      {error && <div style={{ background: "#FBE3E0", color: "#A5281C", borderRadius: 8, padding: "10px 14px", fontSize: 13, marginBottom: 16 }}>{error}</div>}

      {/* En-tête facture */}
      <section style={card}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))", gap: 14 }}>
          {champ("fournisseur", "Fournisseur")}
          {champ("numero_facture", "N° de facture / BL")}
          {champ("numero_commande_fournisseur", "N° commande fournisseur")}
          {champ("date_commande", "Date de commande", "date")}
          {champ("date_facture", "Date de facture", "date")}
          {champ("date_livraison_prevue", "Livraison prévue", "date")}
          {champ("total_ht", "Total HT (€)", "number")}
          {champ("total_ttc", "Total TTC / dû (€)", "number")}
          {champ("recu_le", "Reçu le", "date")}
          {champ("recu_par", "Reçu par")}
          <label>
            <span style={lbl}>Statut</span>
            <select value={a.statut === "litige" ? "litige" : "auto"} style={inp} onChange={(e) => patch({ statut: e.target.value === "litige" ? "litige" : "attendu" })}>
              <option value="auto">Auto (selon réception) — {STATUT_ATTENDU[a.statut === "litige" ? "attendu" : a.statut].label}</option>
              <option value="litige">Litige</option>
            </select>
          </label>
        </div>
        {a.total_ht ? Math.abs(sommeHt - a.total_ht) > 0.05 * a.total_ht && (
          <p style={{ fontSize: 12, color: "#9A4400", margin: "12px 0 0", display: "flex", alignItems: "center", gap: 6 }}>
            <AlertTriangle size={13} /> Somme des lignes {sommeHt.toFixed(2)} € ≠ total HT {a.total_ht.toFixed(2)} € (frais de port, ligne manquée ?)
          </p>
        ) : null}
        <label style={{ display: "block", marginTop: 14 }}>
          <span style={lbl}>Notes</span>
          <textarea key={`notes-${a.notes ?? ""}`} defaultValue={a.notes ?? ""} rows={2} style={{ ...inp, resize: "vertical" }} onBlur={(e) => { if (e.target.value !== (a.notes ?? "")) patch({ notes: e.target.value }); }} />
        </label>
        {a.documents.length > 0 && (
          <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap", fontSize: 12 }}>
            {a.documents.map((d) => (
              <a key={d.public_url} href={d.public_url} target="_blank" rel="noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 5, color: "var(--hub-teal)" }}>
                <FileText size={13} /> {d.filename}
              </a>
            ))}
          </div>
        )}
      </section>

      {/* Lignes */}
      <section style={{ ...card, padding: 0, overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
          <thead>
            <tr style={{ textAlign: "left", background: "var(--hub-bg)" }}>
              {["Fournisseur", "Coloris", "Taille", "Qté", "PU HT", "Total HT", "Réf. Ypersoa", "Destination", "Reçu", ""].map((h) => (
                <th key={h} style={{ padding: "10px 10px", fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", opacity: 0.6, fontWeight: 600, whiteSpace: "nowrap" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {a.lignes.map((l) => {
              const b = l.etat === "a_creer" && l.produit_rnd ? { label: "R&D à compléter", bg: "#EEE7F7", fg: "#5B3E8C" } : ETAT_BADGE[l.etat];
              const complet = (l.quantite_recue ?? 0) >= l.quantite;
              return (
                <tr key={l.id} style={{ borderTop: "0.5px solid var(--hub-border)", verticalAlign: "top" }}>
                  <td style={{ padding: 10, minWidth: 220 }}>
                    <div style={{ fontFamily: "ui-monospace, Menlo, monospace", fontWeight: 600 }}>{l.ref_fournisseur || "—"}</div>
                    <div style={{ opacity: 0.65, fontSize: 11.5 }}>{l.designation}</div>
                  </td>
                  <td style={{ padding: 10 }}>{l.coloris}</td>
                  <td style={{ padding: 10 }}>{l.taille}</td>
                  <td style={{ padding: 10, fontWeight: 600 }}>
                    {l.quantite}
                    {l.quantite > 1 && (
                      <button
                        title="Répartir sur 2 destinations (ex. 2 en stock + 1 pour une commande client)"
                        onClick={() => {
                          const v = prompt(`Combien de pièces (sur ${l.quantite}) vont vers une autre destination ?`, "1");
                          const n = Number(v);
                          if (v === null) return;
                          if (!Number.isInteger(n) || n < 1 || n >= l.quantite) return alert(`Indique un nombre entre 1 et ${l.quantite - 1}.`);
                          patch({ scinder_ligne: { id: l.id, quantite: n } });
                        }}
                        style={{ display: "flex", alignItems: "center", gap: 3, marginTop: 6, background: "none", border: "none", padding: 0, cursor: "pointer", color: "var(--hub-teal)", fontSize: 11, fontWeight: 400, whiteSpace: "nowrap" }}
                      >
                        <Split size={11} /> Répartir
                      </button>
                    )}
                  </td>
                  <td style={{ padding: 10, whiteSpace: "nowrap" }}>{l.pu_ht != null ? `${l.pu_ht.toFixed(2)} €` : "—"}</td>
                  <td style={{ padding: 10, whiteSpace: "nowrap" }}>{l.total_ht != null ? `${l.total_ht.toFixed(2)} €` : "—"}</td>
                  <td style={{ padding: 10, minWidth: 210 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 999, background: b.bg, color: b.fg }}>{b.label}</span>
                      {l.ref_article && <span style={{ fontFamily: "ui-monospace, Menlo, monospace", fontWeight: l.etat === "reference" ? 700 : 400, opacity: l.etat === "reference" ? 1 : 0.6 }}>{l.ref_article}</span>}
                      {!l.ref_article && l.ref_produit && <span style={{ fontFamily: "ui-monospace, Menlo, monospace", opacity: 0.6 }}>{l.ref_produit}</span>}
                    </div>
                    {l.etat === "reference" ? (
                      <div style={{ fontSize: 11.5, opacity: 0.7, marginTop: 3 }}>{l.libelle_article}</div>
                    ) : (
                      <div style={{ fontSize: 11, color: "#9A4400", marginTop: 3 }}>Manque : {(l.manque ?? []).join(", ") || "—"}</div>
                    )}
                    <button onClick={() => setModalLigne(l)} style={{ marginTop: 6, background: "none", border: "none", padding: 0, cursor: "pointer", color: "var(--hub-teal)", fontSize: 12, display: "inline-flex", alignItems: "center", gap: 4 }}>
                      <Link2 size={12} /> {l.etat === "reference" ? "Changer" : "Rattacher / créer la réf."}
                    </button>
                  </td>
                  <td style={{ padding: 10, minWidth: 150 }}>
                    <select value={l.usage} style={inp} onChange={(e) => majLigne(l.id, { usage: e.target.value as Ligne["usage"] })}>
                      {Object.entries(USAGE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                    {l.usage === "prod" && (
                      <input key={`cc-${l.id}-${l.commande_client ?? ""}`} placeholder="N° commande client" defaultValue={l.commande_client ?? ""} style={{ ...inp, marginTop: 6 }}
                        onBlur={(e) => { if (e.target.value !== (l.commande_client ?? "")) majLigne(l.id, { commande_client: e.target.value }); }} />
                    )}
                  </td>
                  <td style={{ padding: 10, width: 90 }}>
                    <input key={`qr-${l.id}-${l.quantite_recue ?? ""}`} type="number" min={0} defaultValue={l.quantite_recue ?? ""} placeholder="0"
                      style={{ ...inp, width: 64, background: complet ? "#E5F0E8" : "white" }}
                      onBlur={(e) => { if (e.target.value !== String(l.quantite_recue ?? "")) majLigne(l.id, { quantite_recue: Number(e.target.value || 0) }); }} />
                  </td>
                  <td style={{ padding: 10 }}>
                    <button title="Supprimer la ligne" onClick={() => { if (confirm("Supprimer cette ligne ?")) patch({ supprimer_ligne: l.id }); }} style={{ background: "none", border: "none", cursor: "pointer", opacity: 0.45 }}>
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <AjoutLigne onAdd={(l) => patch({ ajouter_ligne: l })} />
      </section>

      {role === "admin" && (
        <div style={{ textAlign: "right", marginBottom: 40 }}>
          <button style={btn("danger")} onClick={async () => {
            if (!confirm(`Supprimer définitivement l'attendu ${a.id} ?`)) return;
            const r = await fetch(`/api/production/attendus/${a.id}`, { method: "DELETE" }).then((x) => x.json());
            if (r.ok) router.push("/atelier-production/attendus"); else setError(r.error);
          }}><Trash2 size={14} /> Supprimer l&apos;attendu</button>
        </div>
      )}

      {modalLigne && (
        <ModalReference
          ligne={modalLigne}
          origine={`attendu ${a.id}${a.numero_facture ? ` · facture ${a.numero_facture}` : ""}`}
          onClose={() => setModalLigne(null)}
          onDone={async (refArticle) => {
            const ok = await patch({ lignes: [{ id: modalLigne.id, ref_article: refArticle }], action: "rapprocher" });
            if (ok) setModalLigne(null);
            return ok;
          }}
        />
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────
// Ajout manuel d'une ligne
// ──────────────────────────────────────────────────────────

function AjoutLigne({ onAdd }: { onAdd: (l: Partial<Ligne>) => void }) {
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ ref_fournisseur: "", designation: "", coloris: "", taille: "", quantite: "1", pu_ht: "" });
  if (!open) {
    return (
      <div style={{ padding: 12, borderTop: "0.5px solid var(--hub-border)" }}>
        <button onClick={() => setOpen(true)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--hub-teal)", fontSize: 13, display: "inline-flex", alignItems: "center", gap: 5 }}>
          <Plus size={14} /> Ajouter une ligne
        </button>
      </div>
    );
  }
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });
  return (
    <div style={{ padding: 12, borderTop: "0.5px solid var(--hub-border)", display: "grid", gridTemplateColumns: "1.2fr 2fr 1fr .6fr .5fr .6fr auto", gap: 8, alignItems: "end" }}>
      <label><span style={lbl}>Réf. fournisseur</span><input style={inp} value={f.ref_fournisseur} onChange={set("ref_fournisseur")} placeholder="JH001" /></label>
      <label><span style={lbl}>Désignation</span><input style={inp} value={f.designation} onChange={set("designation")} /></label>
      <label><span style={lbl}>Coloris</span><input style={inp} value={f.coloris} onChange={set("coloris")} /></label>
      <label><span style={lbl}>Taille</span><input style={inp} value={f.taille} onChange={set("taille")} /></label>
      <label><span style={lbl}>Qté</span><input style={inp} type="number" min={1} value={f.quantite} onChange={set("quantite")} /></label>
      <label><span style={lbl}>PU HT</span><input style={inp} type="number" step="0.01" value={f.pu_ht} onChange={set("pu_ht")} /></label>
      <div style={{ display: "flex", gap: 6 }}>
        <button style={btn("primary")} onClick={() => {
          const q = Number(f.quantite) || 1;
          const pu = f.pu_ht ? Number(f.pu_ht) : null;
          onAdd({ ...f, quantite: q, pu_ht: pu, total_ht: pu != null ? Math.round(pu * q * 100) / 100 : null });
          setF({ ref_fournisseur: "", designation: "", coloris: "", taille: "", quantite: "1", pu_ht: "" });
          setOpen(false);
        }}>Ajouter</button>
        <button style={btn()} onClick={() => setOpen(false)}><X size={14} /></button>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────
// Fenêtre : rattacher à une réf. existante ou la créer
// ──────────────────────────────────────────────────────────

interface RefData {
  produits: Array<{ ref: string; libelle: string; ref_fabricant: string; famille: string; statut: string; origine: string }>;
  couleurs_ref: Array<{ code: string; libelle: string; hex: string | null }>;
  tailles: Array<{ code: string; taille: string; libelle: string }>;
  familles: string[];
  prochaine_ref: string;
}
interface ProduitData {
  couleurs: Array<{ code: string; libelle: string; couleur_fabricant?: string; hex: string | null; origine: string }>;
  tailles: Array<{ code: string; taille: string }>;
}

const NOUVEAU = "__nouveau__";

function ModalReference({ ligne, origine, onClose, onDone }: {
  ligne: Ligne;
  origine: string;
  onClose: () => void;
  onDone: (refArticle: string) => Promise<boolean>;
}) {
  const [ref, setRef] = useState<RefData | null>(null);
  const [prod, setProd] = useState<ProduitData | null>(null);
  const [produit, setProduit] = useState<string>(ligne.ref_produit ?? (ligne.etat === "produit_inconnu" ? NOUVEAU : ""));
  const [np, setNp] = useState({ ref: "", ref_fabricant: ligne.ref_modele ?? "", libelle: "", famille: "", genre: "", fournisseur: "" });
  const [couleur, setCouleur] = useState<string>(ligne.code_couleur ?? "");
  const [nouvelleCouleur, setNouvelleCouleur] = useState({ code: "", libelle: ligne.coloris, hex: "" });
  const [taille, setTaille] = useState<string>(ligne.code_taille ?? "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/production/catalogue/references", { cache: "no-store" }).then((r) => r.json()).then((j) => {
      if (!j.ok) return setErr(j.error);
      setRef(j.data);
      setNp((x) => ({ ...x, ref: j.data.prochaine_ref, libelle: x.libelle || ligne.designation.replace(/^\S+\s+/, "") }));
    });
  }, [ligne.designation]);

  useEffect(() => {
    setProd(null);
    if (!produit || produit === NOUVEAU) return;
    fetch(`/api/production/catalogue/references?ref=${produit}`, { cache: "no-store" }).then((r) => r.json()).then((j) => j.ok && setProd(j.data));
  }, [produit]);

  // Couleurs proposées : celles du produit, puis toutes les familles Akanea, puis « nouvelle famille ».
  const couleursOptions = useMemo(() => {
    const duProduit = prod?.couleurs ?? [];
    const codes = new Set(duProduit.map((c) => c.code));
    const autres = (ref?.couleurs_ref ?? []).filter((c) => !codes.has(c.code));
    return { duProduit, autres };
  }, [prod, ref]);
  const taillesProduit = new Set((prod?.tailles ?? []).map((t) => t.code));

  const refArticle = produit && produit !== NOUVEAU && couleur && couleur !== NOUVEAU && taille ? `${produit}-${couleur}-${taille}` : null;
  const couleurConnue = couleursOptions.duProduit.some((c) => c.code === couleur);
  const tailleConnue = taillesProduit.has(taille);

  async function valider() {
    setBusy(true);
    setErr(null);
    try {
      const codeCouleur = couleur === NOUVEAU ? nouvelleCouleur.code.padStart(4, "0") : couleur;
      const libelleCouleur = couleur === NOUVEAU
        ? nouvelleCouleur.libelle
        : couleursOptions.autres.find((c) => c.code === couleur)?.libelle;
      const body = {
        ...(produit === NOUVEAU ? { nouveau_produit: np } : { ref_produit: produit }),
        code_couleur: codeCouleur,
        libelle_couleur: libelleCouleur,
        hex: couleur === NOUVEAU ? nouvelleCouleur.hex || null : undefined,
        code_taille: taille,
        origine,
      };
      const res = await fetch("/api/production/catalogue/references", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const j = await res.json();
      if (!j.ok) throw new Error(j.error);
      await onDone(j.data.ref_article);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  const aCreer = [
    produit === NOUVEAU && `le produit ${np.ref || "?"}`,
    couleur && (couleur === NOUVEAU || !couleurConnue) && produit && "la couleur pour ce produit",
    taille && !tailleConnue && produit && "la taille pour ce produit",
  ].filter(Boolean) as string[];
  const pret = produit && taille && couleur && (couleur !== NOUVEAU || /^\d{1,4}$/.test(nouvelleCouleur.code) && nouvelleCouleur.libelle) && (produit !== NOUVEAU || np.libelle);

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(26,22,20,.35)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 16 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "white", borderRadius: 14, padding: 24, width: "min(640px, 100%)", maxHeight: "90vh", overflowY: "auto", fontFamily: "var(--font-sans)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
          <h2 style={{ fontFamily: "var(--font-editorial)", fontWeight: 500, fontSize: 22, margin: 0 }}>Réf. Ypersoa</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer" }}><X size={16} /></button>
        </div>
        <p style={{ fontSize: 12.5, opacity: 0.7, margin: "0 0 18px" }}>
          <strong style={{ fontFamily: "ui-monospace, Menlo, monospace" }}>{ligne.ref_fournisseur}</strong> — {ligne.designation} · {ligne.coloris} · {ligne.taille} · ×{ligne.quantite}
        </p>

        {!ref ? <p style={{ opacity: 0.6, fontSize: 13 }}>Chargement du catalogue…</p> : (
          <div style={{ display: "grid", gap: 14 }}>
            <label>
              <span style={lbl}>Produit</span>
              <select value={produit} onChange={(e) => { setProduit(e.target.value); setCouleur(""); }} style={inp}>
                <option value="">— Choisir —</option>
                <option value={NOUVEAU}>+ Nouveau produit (R&amp;D, jamais commandé)</option>
                {ref.produits.map((p) => (
                  <option key={p.ref} value={p.ref}>{p.ref} · {p.libelle}{p.ref_fabricant ? ` (${p.ref_fabricant})` : ""}{p.origine === "hub" ? " · R&D Hub" : /compl/i.test(p.statut) ? " · R&D à compléter" : ""}</option>
                ))}
              </select>
            </label>

            {produit === NOUVEAU && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, background: "var(--hub-bg)", padding: 12, borderRadius: 8 }}>
                <label><span style={lbl}>Réf. Ypersoa</span><input style={inp} value={np.ref} onChange={(e) => setNp({ ...np, ref: e.target.value.toUpperCase() })} placeholder={ref.prochaine_ref} /></label>
                <label><span style={lbl}>Réf. fabricant</span><input style={inp} value={np.ref_fabricant} onChange={(e) => setNp({ ...np, ref_fabricant: e.target.value.toUpperCase() })} /></label>
                <label style={{ gridColumn: "1 / -1" }}><span style={lbl}>Libellé</span><input style={inp} value={np.libelle} onChange={(e) => setNp({ ...np, libelle: e.target.value })} /></label>
                <label>
                  <span style={lbl}>Famille</span>
                  <input style={inp} list="familles-produit" value={np.famille} onChange={(e) => setNp({ ...np, famille: e.target.value })} placeholder="Hoodie, T-shirt, Casquette…" />
                  <datalist id="familles-produit">{ref.familles.map((f) => <option key={f} value={f} />)}</datalist>
                </label>
                <label>
                  <span style={lbl}>Genre</span>
                  <select style={inp} value={np.genre} onChange={(e) => setNp({ ...np, genre: e.target.value })}>
                    <option value="">—</option><option>Unisexe</option><option>Femme</option><option>Homme</option><option>Enfant</option><option>Bébé</option>
                  </select>
                </label>
                <label style={{ gridColumn: "1 / -1" }}><span style={lbl}>Fournisseur</span><input style={inp} value={np.fournisseur} onChange={(e) => setNp({ ...np, fournisseur: e.target.value })} placeholder="RALAWISE" /></label>
              </div>
            )}

            {produit && (
              <label>
                <span style={lbl}>Couleur</span>
                <select value={couleur} onChange={(e) => setCouleur(e.target.value)} style={inp}>
                  <option value="">— Choisir —</option>
                  {couleursOptions.duProduit.length > 0 && (
                    <optgroup label="Couleurs du produit">
                      {couleursOptions.duProduit.map((c) => <option key={c.code} value={c.code}>{c.code} · {c.libelle}{c.couleur_fabricant && c.couleur_fabricant !== c.libelle ? ` (${c.couleur_fabricant})` : ""}</option>)}
                    </optgroup>
                  )}
                  <optgroup label="Ajouter une famille couleur Akanea au produit">
                    {couleursOptions.autres.map((c) => <option key={c.code} value={c.code}>{c.code} · {c.libelle}</option>)}
                  </optgroup>
                  <option value={NOUVEAU}>+ Nouvelle famille couleur (code à créer dans Akanea)</option>
                </select>
              </label>
            )}
            {couleur === NOUVEAU && (
              <div style={{ display: "grid", gridTemplateColumns: ".6fr 1.4fr .8fr", gap: 10 }}>
                <label><span style={lbl}>Code</span><input style={inp} value={nouvelleCouleur.code} onChange={(e) => setNouvelleCouleur({ ...nouvelleCouleur, code: e.target.value.replace(/\D/g, "").slice(0, 4) })} placeholder="0150" /></label>
                <label><span style={lbl}>Libellé</span><input style={inp} value={nouvelleCouleur.libelle} onChange={(e) => setNouvelleCouleur({ ...nouvelleCouleur, libelle: e.target.value })} /></label>
                <label><span style={lbl}>Hex</span><input style={inp} value={nouvelleCouleur.hex} onChange={(e) => setNouvelleCouleur({ ...nouvelleCouleur, hex: e.target.value })} placeholder="#1A2E4F" /></label>
              </div>
            )}

            {produit && (
              <label>
                <span style={lbl}>Taille</span>
                <select value={taille} onChange={(e) => setTaille(e.target.value)} style={inp}>
                  <option value="">— Choisir —</option>
                  {(prod?.tailles ?? []).length > 0 && (
                    <optgroup label="Tailles du produit">
                      {prod!.tailles.map((t) => <option key={t.code} value={t.code}>{t.taille} ({t.code})</option>)}
                    </optgroup>
                  )}
                  <optgroup label="Ajouter une taille au produit">
                    {ref.tailles.filter((t) => !taillesProduit.has(t.code)).map((t) => <option key={t.code} value={t.code}>{t.taille} ({t.code})</option>)}
                  </optgroup>
                </select>
              </label>
            )}

            <div style={{ background: "var(--hub-bg)", borderRadius: 8, padding: 12, fontSize: 13 }}>
              Réf. article :{" "}
              <strong style={{ fontFamily: "ui-monospace, Menlo, monospace", fontSize: 15 }}>
                {produit === NOUVEAU ? (np.ref || ref.prochaine_ref) : produit || "YP???"}-{couleur === NOUVEAU ? (nouvelleCouleur.code.padStart(4, "0") || "????") : couleur || "????"}-{taille || "????"}
              </strong>
              {aCreer.length > 0 && <div style={{ fontSize: 12, color: "#9A4400", marginTop: 4 }}>Sera créé : {aCreer.join(", ")}.</div>}
              {refArticle && !aCreer.length && <div style={{ fontSize: 12, opacity: 0.65, marginTop: 4 }}>Produit, couleur et taille déjà connus : la réf. sera ajoutée si besoin, puis rattachée.</div>}
            </div>

            {err && <div style={{ background: "#FBE3E0", color: "#A5281C", borderRadius: 8, padding: "8px 12px", fontSize: 12.5 }}>{err}</div>}

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button style={btn()} onClick={onClose}>Annuler</button>
              <button style={{ ...btn("primary"), opacity: pret && !busy ? 1 : 0.5 }} disabled={!pret || busy} onClick={valider}>
                {busy ? "Enregistrement…" : aCreer.length ? "Créer et rattacher" : "Rattacher"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
