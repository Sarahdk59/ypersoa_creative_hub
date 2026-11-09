"use client";

/**
 * Champs opérationnels éditables de la fiche commande :
 *  - LivraisonContactEditor : transporteur, mode (locker / relais / domicile), point relais, suivi, mail, téléphone
 *  - BroderieProdFields     : polices (1 à 3) et fil uni / palette (camaïeu, multicolore) d'une zone
 */
import { useEffect, useState } from "react";
import { Loader2, Plus, X } from "lucide-react";
import type { Commande, ContactClient, Livraison, ModeLivraison, Broderie } from "@/lib/production/commandes-loader";
import { MODE_LIVRAISON_LABEL, TRANSPORTEURS, sansTransporteur } from "@/lib/production/completude";
import { loadBase, type CatalogueBase } from "./ArticleEditor";
import { MAX_POLICES_PAR_ZONE, filsBroderie, policeChamp, policesBroderie } from "@/lib/production/broderie-utils";

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
          <input list="transporteurs" defaultValue={liv.transporteur ?? ""} disabled={disabled || sansTransporteur(liv)} onBlur={(e) => e.target.value !== (liv.transporteur ?? "") && setLiv("transporteur", e.target.value)} placeholder={sansTransporteur(liv) ? "Aucun" : "Mondial Relay"} style={input} />
          <datalist id="transporteurs">{TRANSPORTEURS.map((t) => <option key={t} value={t} />)}</datalist>
        </div>
        <div>
          <label style={lbl}>Mode</label>
          <select value={liv.mode ?? ""} disabled={disabled} onChange={(e) => {
            const mode = (e.target.value || undefined) as ModeLivraison | undefined;
            // Main propre / retrait : on efface transporteur, locker et suivi devenus sans objet.
            patch(sansTransporteur({ mode }) ? { mode } : { ...liv, mode }, contact);
          }} style={input}>
            <option value="">— à compléter —</option>
            {Object.entries(MODE_LIVRAISON_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div>
          <label style={lbl}>{liv.mode === "locker" ? "Locker" : "Point relais"}</label>
          <input defaultValue={liv.point_relais ?? ""} disabled={disabled || liv.mode === "domicile" || sansTransporteur(liv)} onBlur={(e) => e.target.value !== (liv.point_relais ?? "") && setLiv("point_relais", e.target.value)} placeholder="Nom / n° du locker" style={input} />
        </div>
        <div>
          <label style={lbl}>N° de suivi</label>
          <input defaultValue={liv.numero_suivi ?? ""} disabled={disabled || sansTransporteur(liv)} placeholder={sansTransporteur(liv) ? "Sans suivi" : undefined} onBlur={(e) => e.target.value !== (liv.numero_suivi ?? "") && setLiv("numero_suivi", e.target.value)} style={input} />
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
  const polices = policesBroderie(broderie);
  // Nombre de cases police affichées (1 à 3) — on peut en ajouter avant de les remplir.
  const [nbCases, setNbCases] = useState(Math.max(1, polices.length));
  useEffect(() => setNbCases((n) => Math.max(n, polices.length, 1)), [polices.length]);
  useEffect(() => {
    if (!disabled) loadBase().then(setBase).catch(() => setBase(null));
  }, [disabled]);

  type BroderiePatch = {
    polices?: string[];
    champ_police?: { champ: number; police: string };
    fil_id?: string;
    palette_id?: string;
  };
  async function patch(b: BroderiePatch) {
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

  const champsTexte = broderie.champs
    .map((c, i) => ({ c, i }))
    .filter(({ c }) => c.valeur.trim() && !/^symbole/.test(c.type));

  if (disabled) {
    return (
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", fontFamily: "var(--font-sans)", fontSize: 11, opacity: 0.7 }}>
        {polices.length > 0 && <span>Police{polices.length > 1 ? "s" : ""} : {polices.join(" + ")}</span>}
        {broderie.palette_nom && <span>Palette : {broderie.palette_nom}</span>}
      </div>
    );
  }

  const small: React.CSSProperties = { ...input, padding: "3px 6px", fontSize: 11 };
  const tag: React.CSSProperties = { fontFamily: "var(--font-sans)", fontSize: 11, opacity: 0.7 };
  const listId = `polices-${articleId}-${index}`;

  function savePolice(slot: number, value: string) {
    const next = [...polices];
    next[slot] = value;
    const clean = next.map((p) => (p ?? "").trim()).filter(Boolean);
    if (clean.join("|") !== polices.join("|")) patch({ polices: clean });
  }

  const filValue = broderie.palette_id ? `pal:${broderie.palette_id}` : broderie.fil_id ? `fil:${broderie.fil_id}` : "";
  const filsPalette = filsBroderie(broderie);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 4 }}>
      {/* Polices : 1 à 3 typos combinées dans la zone */}
      <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
        <label style={tag}>Police{nbCases > 1 ? "s" : ""}</label>
        {Array.from({ length: nbCases }).map((_, slot) => (
          <span key={slot} style={{ display: "inline-flex", alignItems: "center", gap: 2 }}>
            {slot > 0 && <span style={{ ...tag, opacity: 0.4 }}>+</span>}
            <input
              key={`p-${slot}-${polices[slot] ?? ""}`}
              list={listId}
              defaultValue={polices[slot] ?? ""}
              placeholder={slot === 0 ? "à compléter" : `police ${slot + 1}`}
              onBlur={(e) => savePolice(slot, e.target.value)}
              style={{ ...small, width: 150, borderColor: slot === 0 && !polices.length ? "#C9837A" : undefined }}
            />
            {slot > 0 && (
              <button
                title="Retirer cette police"
                onClick={() => {
                  setNbCases((n) => Math.max(1, n - 1));
                  if (polices[slot]) patch({ polices: polices.filter((_, k) => k !== slot) });
                }}
                style={{ background: "none", border: "none", cursor: "pointer", opacity: 0.5, padding: 0, color: "inherit" }}
              >
                <X size={11} />
              </button>
            )}
          </span>
        ))}
        {nbCases < MAX_POLICES_PAR_ZONE && (
          <button
            onClick={() => setNbCases((n) => n + 1)}
            style={{ ...tag, display: "inline-flex", alignItems: "center", gap: 2, background: "none", border: "0.5px dashed var(--hub-border)", borderRadius: 999, padding: "2px 8px", cursor: "pointer" }}
          >
            <Plus size={10} /> typo
          </button>
        )}
        <datalist id={listId}>{base?.polices.map((p) => <option key={p} value={p} />)}</datalist>
      </div>

      {/* Plusieurs polices : quelle police pour quel texte */}
      {polices.length > 1 && champsTexte.length > 0 && (
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", paddingLeft: 8 }}>
          {champsTexte.map(({ c, i }) => (
            <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
              <span style={tag}>« {c.valeur} » →</span>
              <select
                value={policeChamp(broderie, c) ?? ""}
                onChange={(e) => patch({ champ_police: { champ: i, police: e.target.value } })}
                style={{ ...small, width: 130 }}
              >
                {polices.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </span>
          ))}
        </div>
      )}

      {/* Fil unique ou palette nommée (camaïeu / multicolore) */}
      <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
        <label style={tag}>Fil</label>
        <select
          value={filValue}
          onChange={(e) => {
            const v = e.target.value;
            if (v.startsWith("pal:")) patch({ palette_id: v.slice(4) });
            else if (v.startsWith("fil:")) patch({ fil_id: v.slice(4) });
          }}
          style={{ ...small, width: 260, borderColor: filsPalette.every((f) => f.fil_code_gunold) && filsPalette.length ? undefined : "#C9837A" }}
        >
          <option value="">{broderie.fil_nom ? `${broderie.fil_nom} (non reconnu)` : "— à compléter —"}</option>
          {base?.palettes.length ? (
            <optgroup label="Camaïeux & multicolores">
              {base.palettes.map((p) => (
                <option key={p.id} value={`pal:${p.id}`}>
                  {p.favori ? "★ " : ""}{p.nom} · {p.type} · {p.fils.length} fils
                </option>
              ))}
            </optgroup>
          ) : null}
          <optgroup label="Fil uni">
            {base?.fils.map((f) => (
              <option key={f.id} value={`fil:${f.id}`}>{f.nom} · Gunold {f.code_gunold}</option>
            ))}
          </optgroup>
        </select>
        {broderie.palette_id && (
          <span title={filsPalette.map((f) => `${f.fil_nom} ${f.fil_code_gunold}`).join(" · ")} style={{ display: "inline-flex", height: 10, width: 90, borderRadius: 999, overflow: "hidden", border: "0.5px solid rgba(0,0,0,.15)" }}>
            {filsPalette.map((f) => <span key={f.fil_id} style={{ flex: 1, background: f.fil_hex }} />)}
          </span>
        )}
        {saving && <Loader2 size={11} className="animate-spin" />}
      </div>
    </div>
  );
}

/**
 * Note pour l'atelier (champ `notes` de la commande) : info client transmise
 * avant la prod (« broder plus petit », « livrer avant samedi »…). Préremplie
 * par les remarques du bon, éditable, imprimée en tête de la packing list.
 */
export function NoteAtelierEditor({
  commande,
  disabled,
  onSaved,
}: {
  commande: Commande;
  disabled?: boolean;
  onSaved: (c: Commande) => void;
}) {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function save(value: string) {
    if (value.trim() === (commande.notes ?? "").trim()) return;
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch(`/api/production/commandes/${commande.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: value.trim() }),
      }).then((r) => r.json());
      if (!res.ok) throw new Error(res.error);
      onSaved(res.data);
      setSaved(true);
    } catch (e) {
      alert("Erreur enregistrement de la note : " + (e instanceof Error ? e.message : String(e)));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{
      padding: 16, borderRadius: 10, marginBottom: 24,
      border: `0.5px solid ${commande.notes ? "#E2C679" : "var(--hub-border)"}`,
      background: commande.notes ? "#FEF6E0" : "transparent",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <div style={{ ...lbl, marginBottom: 0 }}>Note pour l&apos;atelier</div>
        <span style={{ fontFamily: "var(--font-sans)", fontSize: 11, opacity: 0.55 }}>
          — imprimée en tête de la packing list
        </span>
        {saving && <Loader2 size={12} className="animate-spin" />}
        {saved && !saving && <span style={{ fontFamily: "var(--font-sans)", fontSize: 11, color: "#2F7A3E" }}>enregistrée</span>}
      </div>
      <textarea
        key={commande.updated_at}
        defaultValue={commande.notes ?? ""}
        disabled={disabled}
        onBlur={(e) => save(e.target.value)}
        placeholder="Ex. La cliente veut le prénom un peu plus petit · Cadeau : pas de facture dans le colis · À expédier avant samedi"
        rows={3}
        style={{ ...input, resize: "vertical", fontSize: 13, lineHeight: 1.5 }}
      />
    </div>
  );
}
