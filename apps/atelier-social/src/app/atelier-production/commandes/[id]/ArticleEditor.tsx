"use client";

/**
 * Éditeur inline d'un article « à identifier » : produit (YPxxx), motif (YPM),
 * couleur produit (code Akanea) et taille. Si la couleur n'existe pas pour le
 * produit, l'atelier la crée sur place (POST /api/production/catalogue/couleurs).
 */
import { useEffect, useMemo, useState } from "react";
import { Loader2, Plus, Save, X } from "lucide-react";
import type { Article, Commande } from "@/lib/production/commandes-loader";

interface ProduitOpt { ref: string; libelle: string; famille: string; ypersoa: boolean }
interface CouleurRefOpt { code: string; libelle: string; hex: string | null }
interface MotifOpt { id: string; nom: string; typographie: string | null }
export interface FilOpt { id: string; nom: string; hex: string; code_gunold: string }
export interface PaletteOpt { id: string; nom: string; type: string; favori: boolean; fils: FilOpt[] }
export interface CatalogueBase { produits: ProduitOpt[]; couleurs_ref: CouleurRefOpt[]; motifs: MotifOpt[]; fils: FilOpt[]; palettes: PaletteOpt[]; polices: string[] }
interface CouleurOpt { code: string; libelle: string; hex: string | null; origine: "catalogue" | "hub"; nouvelle_famille?: boolean }
interface TailleOpt { code: string; taille: string }
interface ProduitDetail { couleurs: CouleurOpt[]; tailles: TailleOpt[]; coiffe: boolean; zone_tete: string | null }

let baseCache: Promise<CatalogueBase> | null = null;
export function loadBase(): Promise<CatalogueBase> {
  if (!baseCache) {
    baseCache = fetch("/api/production/catalogue", { cache: "no-store" })
      .then((r) => r.json())
      .then((res) => {
        if (!res.ok) throw new Error(res.error);
        return res.data;
      })
      .catch((e) => {
        baseCache = null;
        throw e;
      });
  }
  return baseCache;
}

const field: React.CSSProperties = {
  width: "100%", padding: "6px 8px", borderRadius: 6,
  border: "0.5px solid var(--hub-border)", background: "white",
  fontFamily: "var(--font-sans)", fontSize: 12, color: "var(--hub-foreground)",
};
const lbl: React.CSSProperties = {
  display: "block", fontFamily: "var(--font-sans)", fontSize: 10, fontWeight: 600,
  textTransform: "uppercase", letterSpacing: "0.08em", opacity: 0.6, marginBottom: 4,
};

export default function ArticleEditor({
  commandeId,
  article,
  onSaved,
  onClose,
}: {
  commandeId: string;
  article: Article;
  onSaved: (c: Commande) => void;
  onClose: () => void;
}) {
  const [base, setBase] = useState<CatalogueBase | null>(null);
  const [detail, setDetail] = useState<ProduitDetail | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [produit, setProduit] = useState(/^YP\d{3}$/.test(article.produit_id) ? article.produit_id : "");
  const [ypm, setYpm] = useState(article.ypm_id || "");
  const [couleur, setCouleur] = useState(article.code_couleur || "");
  const [taille, setTaille] = useState(article.code_taille || "");

  const [creating, setCreating] = useState(false);
  const [newCode, setNewCode] = useState("");
  const [newLibelle, setNewLibelle] = useState(article.couleur_support || "");
  const [newHex, setNewHex] = useState("#CCCCCC");

  useEffect(() => {
    loadBase().then(setBase).catch((e) => setErr(e instanceof Error ? e.message : String(e)));
  }, []);

  useEffect(() => {
    if (!produit) { setDetail(null); return; }
    let alive = true;
    fetch(`/api/production/catalogue?ref=${encodeURIComponent(produit)}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((res) => {
        if (!alive) return;
        if (!res.ok) throw new Error(res.error);
        const d = res.data as ProduitDetail;
        setDetail(d);
        // Couleur saisie inconnue pour ce produit → on vide ; taille unique → présélection.
        setCouleur((c) => (d.couleurs.some((x) => x.code === c) ? c : ""));
        setTaille((t) => (d.tailles.some((x) => x.code === t) ? t : d.tailles.length === 1 ? d.tailles[0].code : ""));
      })
      .catch((e) => alive && setErr(e instanceof Error ? e.message : String(e)));
    return () => { alive = false; };
  }, [produit]);

  const familleSelectionnee = useMemo(
    () => base?.couleurs_ref.find((c) => c.code === newCode.padStart(4, "0")) ?? null,
    [base, newCode],
  );

  async function creerCouleur() {
    setErr(null);
    try {
      const res = await fetch("/api/production/catalogue/couleurs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ref_produit: produit,
          code_couleur: newCode,
          libelle: familleSelectionnee ? undefined : newLibelle,
          hex: familleSelectionnee?.hex ? undefined : newHex,
        }),
      }).then((r) => r.json());
      if (!res.ok) throw new Error(res.error);
      setDetail((d) => (d ? { ...d, couleurs: res.data.couleurs } : d));
      setCouleur(newCode.padStart(4, "0"));
      setCreating(false);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    }
  }

  async function save() {
    setSaving(true);
    setErr(null);
    try {
      const body: Record<string, string> = {};
      if (produit && produit !== article.produit_id) body.produit_id = produit;
      if (ypm && ypm !== article.ypm_id) body.ypm_id = ypm;
      if (couleur && couleur !== article.code_couleur) body.code_couleur = couleur;
      if (taille && taille !== article.code_taille) body.code_taille = taille;
      if (!Object.keys(body).length) { onClose(); return; }
      const res = await fetch(`/api/production/commandes/${commandeId}/articles/${article.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }).then((r) => r.json());
      if (!res.ok) throw new Error(res.error);
      onSaved(res.data);
      onClose();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  const refPreview = produit && couleur && taille ? `${produit}-${couleur}-${taille}` : null;

  return (
    <div style={{
      marginTop: 12, padding: 14, borderRadius: 10,
      border: "0.5px solid #1E6E77", background: "#F3F8F8",
    }}>
      {!base ? (
        <div style={{ fontFamily: "var(--font-sans)", fontSize: 12 }}>
          {err ? <span style={{ color: "#9A1818" }}>{err}</span> : <Loader2 size={14} className="animate-spin" />}
        </div>
      ) : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
            <div>
              <label style={lbl}>Produit</label>
              <select value={produit} onChange={(e) => setProduit(e.target.value)} style={field}>
                <option value="">— à identifier —</option>
                <optgroup label="Produits Ypersoa">
                  {base.produits.filter((p) => p.ypersoa).map((p) => (
                    <option key={p.ref} value={p.ref}>{p.ref} · {p.libelle}</option>
                  ))}
                </optgroup>
                <optgroup label="Autres produits du catalogue">
                  {base.produits.filter((p) => !p.ypersoa).map((p) => (
                    <option key={p.ref} value={p.ref}>{p.ref} · {p.libelle}</option>
                  ))}
                </optgroup>
              </select>
              {detail?.coiffe && (
                <div style={{ fontFamily: "var(--font-sans)", fontSize: 10, marginTop: 4, color: "#1E6E77" }}>
                  Coiffe : broderie « tête » ({detail.zone_tete}), jamais buste.
                </div>
              )}
            </div>
            <div>
              <label style={lbl}>Motif</label>
              <select value={ypm} onChange={(e) => setYpm(e.target.value)} style={field}>
                <option value="">— à identifier —</option>
                {base.motifs.map((m) => (
                  <option key={m.id} value={m.id}>{m.id} · {m.nom}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={lbl}>Couleur produit</label>
              <select
                value={couleur}
                onChange={(e) => (e.target.value === "__new__" ? setCreating(true) : setCouleur(e.target.value))}
                disabled={!detail}
                style={field}
              >
                <option value="">{detail ? `— à identifier (${article.couleur_support || "vide"}) —` : "Choisis d'abord le produit"}</option>
                {detail?.couleurs.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.code} · {c.libelle}{c.origine === "hub" ? " (ajoutée Hub)" : ""}
                  </option>
                ))}
                {detail && <option value="__new__">＋ Créer une couleur pour {produit}…</option>}
              </select>
            </div>
            <div>
              <label style={lbl}>Taille</label>
              <select value={taille} onChange={(e) => setTaille(e.target.value)} disabled={!detail} style={field}>
                <option value="">— à identifier ({article.taille || "vide"}) —</option>
                {detail?.tailles.map((t) => (
                  <option key={t.code} value={t.code}>{t.taille} ({t.code})</option>
                ))}
              </select>
            </div>
          </div>

          {creating && (
            <div style={{ marginTop: 12, padding: 12, borderRadius: 8, background: "white", border: "0.5px dashed var(--hub-border)" }}>
              <div style={{ fontFamily: "var(--font-sans)", fontSize: 12, fontWeight: 600, marginBottom: 8 }}>
                Nouvelle couleur pour {produit}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "140px 1fr 90px", gap: 8, alignItems: "end" }}>
                <div>
                  <label style={lbl}>Code Akanea</label>
                  <input
                    list="familles-couleur"
                    value={newCode}
                    onChange={(e) => setNewCode(e.target.value.replace(/\D/g, "").slice(0, 4))}
                    placeholder="0064"
                    style={field}
                  />
                  <datalist id="familles-couleur">
                    {base.couleurs_ref.map((c) => <option key={c.code} value={c.code}>{c.libelle}</option>)}
                  </datalist>
                </div>
                <div>
                  <label style={lbl}>Libellé</label>
                  {familleSelectionnee ? (
                    <div style={{ ...field, background: "#F0EDE8" }}>{familleSelectionnee.libelle} (famille existante)</div>
                  ) : (
                    <input value={newLibelle} onChange={(e) => setNewLibelle(e.target.value)} placeholder="Vintage Bleu" style={field} />
                  )}
                </div>
                <div>
                  <label style={lbl}>Teinte</label>
                  <input
                    type="color"
                    value={familleSelectionnee?.hex ?? newHex}
                    disabled={!!familleSelectionnee?.hex}
                    onChange={(e) => setNewHex(e.target.value)}
                    style={{ ...field, padding: 2, height: 30 }}
                  />
                </div>
              </div>
              {newCode.length >= 2 && !familleSelectionnee && (
                <div style={{ fontFamily: "var(--font-sans)", fontSize: 11, marginTop: 6, color: "#9A4400" }}>
                  Code {newCode.padStart(4, "0")} absent des familles Akanea : pense à le créer aussi dans Akanea.
                </div>
              )}
              <div style={{ display: "flex", gap: 8, marginTop: 10, justifyContent: "flex-end" }}>
                <button onClick={() => setCreating(false)} style={btnGhost}><X size={12} /> Annuler</button>
                <button onClick={creerCouleur} disabled={!newCode} style={btnPrimary}><Plus size={12} /> Créer la couleur</button>
              </div>
            </div>
          )}

          <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 12, flexWrap: "wrap" }}>
            <div style={{ fontFamily: "var(--font-sans)", fontSize: 12, flex: 1 }}>
              Réf. article :{" "}
              <code style={{ fontFamily: "ui-monospace, monospace", fontWeight: 600 }}>{refPreview ?? "incomplète"}</code>
            </div>
            {err && <span style={{ fontFamily: "var(--font-sans)", fontSize: 12, color: "#9A1818" }}>{err}</span>}
            <button onClick={onClose} style={btnGhost}><X size={12} /> Fermer</button>
            <button onClick={save} disabled={saving} style={btnPrimary}>
              {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />} Enregistrer
            </button>
          </div>
        </>
      )}
    </div>
  );
}

const btnPrimary: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 6,
  border: "none", background: "#1E6E77", color: "white",
  fontFamily: "var(--font-sans)", fontSize: 12, fontWeight: 500, cursor: "pointer",
};
const btnGhost: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 6,
  border: "0.5px solid var(--hub-border)", background: "white", color: "var(--hub-foreground)",
  fontFamily: "var(--font-sans)", fontSize: 12, cursor: "pointer",
};
