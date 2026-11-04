"use client";

/**
 * Champs opérationnels éditables de la fiche commande :
 *  - LivraisonContactEditor : transporteur, mode (locker / relais / domicile), point relais, suivi, mail, téléphone
 *  - BroderieProdFields     : police et fil (code Gunold) d'une zone de broderie
 */
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import type { Commande, ContactClient, Livraison, ModeLivraison, Broderie } from "@/lib/production/commandes-loader";
import { MODE_LIVRAISON_LABEL, TRANSPORTEURS } from "@/lib/production/completude";
import { loadBase, type CatalogueBase } from "./ArticleEditor";

const input: React.CSSProperties = {
  width: "100%", padding: "6px 8px", borderRadius: 6,
  border: "0.5px solid var(--hub-border)", background: "white",
  fontFamily: "var(--font-sans)", fontSize: 12, color: "var(--hub-foreground)",
};
const lbl: React.CSSProperties = {
  display: "block", fontFamily: "var(--font-sans)", fontSize: 10, fontWeight: 600,
  textTransform: "uppercase", letterSpacing: "0.08em", opacity: 0.6, marginBottom: 4,
};

export function LivraisonContactEditor({
  commande,
  disabled,
  onSaved,
}: {
  commande: Commande;
  disabled?: boolean;
  onSaved: (c: Commande) => void;
}) {
  const [saving, setSaving] = useState(false);

  async function patch(livraison: Livraison, contact: ContactClient) {
    setSaving(true);
    try {
      const res = await fetch(`/api/production/commandes/${commande.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ livraison, contact }),
      }).then((r) => r.json());
      if (!res.ok) throw new Error(res.error);
      onSaved(res.data);
    } catch (e) {
      alert("Erreur enregistrement : " + (e instanceof Error ? e.message : String(e)));
    } finally {
      setSaving(false);
    }
  }

  const liv = commande.livraison ?? {};
  const contact = commande.contact ?? {};
  const setLiv = (k: keyof Livraison, v: string) => patch({ ...liv, [k]: v || undefined }, contact);
  const setContact = (k: keyof ContactClient, v: string) => patch(liv, { ...contact, [k]: v.trim() || undefined });

  return (
    <div style={{ padding: 16, border: "0.5px solid var(--hub-border)", borderRadius: 10, marginBottom: 32 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <div style={{ ...lbl, marginBottom: 0 }}>Expédition & contact</div>
        {saving && <Loader2 size={12} className="animate-spin" />}
      </div>
      <div key={commande.updated_at} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 12 }}>
        <div>
          <label style={lbl}>Transporteur</label>
          <input list="transporteurs" defaultValue={liv.transporteur ?? ""} disabled={disabled} onBlur={(e) => e.target.value !== (liv.transporteur ?? "") && setLiv("transporteur", e.target.value)} placeholder="Mondial Relay" style={input} />
          <datalist id="transporteurs">{TRANSPORTEURS.map((t) => <option key={t} value={t} />)}</datalist>
        </div>
        <div>
          <label style={lbl}>Mode</label>
          <select value={liv.mode ?? ""} disabled={disabled} onChange={(e) => setLiv("mode", e.target.value as ModeLivraison)} style={input}>
            <option value="">— à compléter —</option>
            {Object.entries(MODE_LIVRAISON_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div>
          <label style={lbl}>{liv.mode === "locker" ? "Locker" : "Point relais"}</label>
          <input defaultValue={liv.point_relais ?? ""} disabled={disabled || liv.mode === "domicile" || liv.mode === "retrait_atelier"} onBlur={(e) => e.target.value !== (liv.point_relais ?? "") && setLiv("point_relais", e.target.value)} placeholder="Nom / n° du locker" style={input} />
        </div>
        <div>
          <label style={lbl}>N° de suivi</label>
          <input defaultValue={liv.numero_suivi ?? ""} disabled={disabled} onBlur={(e) => e.target.value !== (liv.numero_suivi ?? "") && setLiv("numero_suivi", e.target.value)} style={input} />
        </div>
        <div>
          <label style={lbl}>E-mail client</label>
          <input type="email" defaultValue={contact.email ?? ""} disabled={disabled} onBlur={(e) => e.target.value !== (contact.email ?? "") && setContact("email", e.target.value)} style={input} />
        </div>
        <div>
          <label style={lbl}>Téléphone client</label>
          <input type="tel" defaultValue={contact.telephone ?? ""} disabled={disabled} onBlur={(e) => e.target.value !== (contact.telephone ?? "") && setContact("telephone", e.target.value)} style={input} />
        </div>
      </div>
    </div>
  );
}

export function BroderieProdFields({
  commandeId,
  articleId,
  index,
  broderie,
  disabled,
  onSaved,
}: {
  commandeId: string;
  articleId: string;
  index: number;
  broderie: Broderie;
  disabled?: boolean;
  onSaved: (c: Commande) => void;
}) {
  const [base, setBase] = useState<CatalogueBase | null>(null);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (!disabled) loadBase().then(setBase).catch(() => setBase(null));
  }, [disabled]);

  async function patch(b: { police?: string; fil_id?: string }) {
    setSaving(true);
    try {
      const res = await fetch(`/api/production/commandes/${commandeId}/articles/${articleId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ broderie: { index, ...b } }),
      }).then((r) => r.json());
      if (!res.ok) throw new Error(res.error);
      onSaved(res.data);
    } catch (e) {
      alert("Erreur enregistrement : " + (e instanceof Error ? e.message : String(e)));
    } finally {
      setSaving(false);
    }
  }

  if (disabled) {
    return broderie.police ? (
      <span style={{ fontFamily: "var(--font-sans)", fontSize: 11, opacity: 0.7 }}>Police : {broderie.police}</span>
    ) : null;
  }

  const listId = `polices-${articleId}-${index}`;
  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginTop: 4 }}>
      <label style={{ fontFamily: "var(--font-sans)", fontSize: 11, opacity: 0.7 }}>Police</label>
      <input
        key={`p-${broderie.police ?? ""}`}
        list={listId}
        defaultValue={broderie.police ?? ""}
        placeholder="à compléter"
        onBlur={(e) => e.target.value.trim() !== (broderie.police ?? "") && patch({ police: e.target.value })}
        style={{ ...input, width: 170, padding: "3px 6px", fontSize: 11, borderColor: broderie.police ? undefined : "#C9837A" }}
      />
      <datalist id={listId}>{base?.polices.map((p) => <option key={p} value={p} />)}</datalist>
      <label style={{ fontFamily: "var(--font-sans)", fontSize: 11, opacity: 0.7 }}>Fil</label>
      <select
        value={broderie.fil_id || ""}
        onChange={(e) => e.target.value && patch({ fil_id: e.target.value })}
        style={{ ...input, width: 220, padding: "3px 6px", fontSize: 11, borderColor: broderie.fil_code_gunold ? undefined : "#C9837A" }}
      >
        <option value="">{broderie.fil_nom ? `${broderie.fil_nom} (non reconnu)` : "— à compléter —"}</option>
        {base?.fils.map((f) => (
          <option key={f.id} value={f.id}>{f.nom} · Gunold {f.code_gunold}</option>
        ))}
      </select>
      {saving && <Loader2 size={11} className="animate-spin" />}
    </div>
  );
}
