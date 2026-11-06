"use client";

/**
 * Dossier de la commande : pièces jointes typées (bon, devis, BAT, fiche
 * technique PDF, fichier Hatch .emb, BL, étiquette…). L'atelier peut AJOUTER une pièce (une étiquette ajoutée est lue
 * et met à jour la livraison) ; seule l'admin peut en retirer.
 */
import { useEffect, useState } from "react";
import { Download, FileCode2, FileText, Image as ImageIcon, Loader2, Plus, Trash2 } from "lucide-react";
import type { Commande, DocumentCommande } from "@/lib/production/commandes-loader";
import { TYPE_DOCUMENT_LABEL } from "@/lib/production/completude";

const ORDRE = ["bon_commande", "devis", "bat", "fiche_technique", "fichier_emb", "etiquette", "bon_livraison", "autre"];
const estEmb = (name: string) => name.toLowerCase().endsWith(".emb");

export default function DossierDocuments({
  commande,
  disabled,
  onSaved,
}: {
  commande: Commande;
  disabled?: boolean;
  onSaved: (c: Commande) => void;
}) {
  const [role, setRole] = useState<string | null>(null);
  const [type, setType] = useState("etiquette");
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState<string[]>([]);

  useEffect(() => {
    fetch("/api/me", { cache: "no-store" })
      .then((r) => r.json())
      .then((res) => setRole(res?.data?.role ?? null))
      .catch(() => setRole(null));
  }, []);

  // Commandes antérieures au dossier : seul le bon PDF existe.
  const docs: DocumentCommande[] =
    commande.documents ??
    (commande.bon_preparation_pdf
      ? [{
          id: "legacy-bon",
          type: "bon_commande",
          storage_path: commande.bon_preparation_pdf.storage_path,
          public_url: commande.bon_preparation_pdf.public_url,
          filename: commande.bon_preparation_pdf.filename,
          mime: "application/pdf",
          uploaded_by: commande.bon_preparation_pdf.uploaded_by,
          uploaded_at: commande.bon_preparation_pdf.uploaded_at,
        }]
      : []);
  const tries = [...docs].sort((a, b) => ORDRE.indexOf(a.type) - ORDRE.indexOf(b.type));

  async function ajouter(file: File) {
    setBusy(true);
    setMessages([]);
    try {
      const fd = new FormData();
      fd.append("file", file);
      // Un .emb va toujours dans « Fichier EMB », quel que soit le type sélectionné.
      fd.append("type", estEmb(file.name) ? "fichier_emb" : type);
      const res = await fetch(`/api/production/commandes/${commande.id}/documents`, { method: "POST", body: fd }).then((r) => r.json());
      if (!res.ok) throw new Error(res.error);
      onSaved(res.data);
      setMessages(res.warnings ?? []);
    } catch (e) {
      setMessages([e instanceof Error ? e.message : String(e)]);
    } finally {
      setBusy(false);
    }
  }

  async function retirer(d: DocumentCommande) {
    if (!confirm(`Retirer « ${d.filename} » du dossier ? Le fichier sera supprimé.`)) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/production/commandes/${commande.id}/documents/${d.id}`, { method: "DELETE" }).then((r) => r.json());
      if (!res.ok) throw new Error(res.error);
      onSaved(res.data);
    } catch (e) {
      setMessages([e instanceof Error ? e.message : String(e)]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section style={{ padding: 16, border: "0.5px solid var(--hub-border)", borderRadius: 10, marginBottom: 24 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 10 }}>
        <div style={{ fontFamily: "var(--font-sans)", fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", opacity: 0.6 }}>
          Dossier de commande ({docs.length} pièce{docs.length > 1 ? "s" : ""})
        </div>
        {!disabled && (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              style={{ padding: "5px 8px", borderRadius: 6, border: "0.5px solid var(--hub-border)", fontFamily: "var(--font-sans)", fontSize: 12, background: "white" }}
            >
              {Object.entries(TYPE_DOCUMENT_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <label style={{
              display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 6,
              background: "#1E6E77", color: "white", fontFamily: "var(--font-sans)", fontSize: 12, fontWeight: 500,
              cursor: busy ? "wait" : "pointer",
            }}>
              {busy ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />} Ajouter une pièce
              <input
                type="file"
                accept={type === "fichier_emb" ? ".emb" : "application/pdf,image/png,image/jpeg,image/webp,.emb"}
                disabled={busy}
                onChange={(e) => { const f = e.target.files?.[0]; if (f) ajouter(f); e.target.value = ""; }}
                style={{ display: "none" }}
              />
            </label>
          </div>
        )}
      </div>

      {messages.length > 0 && (
        <ul style={{ margin: "0 0 10px", padding: "8px 12px 8px 28px", background: "#FEF6E0", borderRadius: 6, fontFamily: "var(--font-sans)", fontSize: 12, color: "#5C4500" }}>
          {messages.map((m, i) => <li key={i}>{m}</li>)}
        </ul>
      )}

      {tries.length === 0 ? (
        <div style={{ fontFamily: "var(--font-sans)", fontSize: 12, opacity: 0.55 }}>Aucune pièce jointe.</div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 8 }}>
          {tries.map((d) => (
            <div key={d.id} style={{
              display: "flex", alignItems: "flex-start", gap: 8, padding: "8px 10px",
              border: "0.5px solid var(--hub-border)", borderRadius: 8, background: "white",
            }}>
              {d.mime.startsWith("image/") ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={d.public_url} alt="" style={{ width: 40, height: 40, objectFit: "cover", borderRadius: 4, flexShrink: 0 }} />
              ) : d.type === "fichier_emb" ? (
                <FileCode2 size={18} strokeWidth={1.6} style={{ opacity: 0.6, flexShrink: 0, marginTop: 2 }} />
              ) : (
                <FileText size={18} strokeWidth={1.6} style={{ opacity: 0.6, flexShrink: 0, marginTop: 2 }} />
              )}
              <div style={{ flex: 1, minWidth: 0, fontFamily: "var(--font-sans)", fontSize: 12, lineHeight: 1.35 }}>
                <div style={{ fontWeight: 600 }}>{TYPE_DOCUMENT_LABEL[d.type] ?? d.type}</div>
                <a
                  href={d.type === "fichier_emb" ? `${d.public_url}?download=${encodeURIComponent(d.filename)}` : d.public_url}
                  target={d.type === "fichier_emb" ? undefined : "_blank"}
                  rel="noreferrer"
                  title={d.type === "fichier_emb" ? "Télécharger pour ouvrir dans Hatch" : undefined}
                  style={{ color: "var(--hub-foreground)", opacity: 0.75, wordBreak: "break-all" }}
                >
                  {d.mime.startsWith("image/") && <ImageIcon size={10} style={{ display: "inline", marginRight: 3, verticalAlign: "-1px" }} />}
                  {d.type === "fichier_emb" && <Download size={10} style={{ display: "inline", marginRight: 3, verticalAlign: "-1px" }} />}
                  {d.filename}
                </a>
                {d.extraction && <div style={{ fontSize: 11, opacity: 0.6, marginTop: 2 }}>Lu : {d.extraction}</div>}
              </div>
              {role === "admin" && !disabled && d.id !== "legacy-bon" && (
                <button onClick={() => retirer(d)} title="Retirer (admin)" style={{ background: "none", border: "none", cursor: "pointer", opacity: 0.45, padding: 2 }}>
                  <Trash2 size={12} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
