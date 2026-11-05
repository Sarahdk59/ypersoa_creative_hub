"use client";

/**
 * Texte multicolore d'une zone : couleur de chaque lettre.
 *  - « Calculer » : moteur d'attribution du Hub sur le texte de la commande
 *    + palette de la zone (+ règle figée du motif, ex. YPM-004).
 *  - « Importer » : une attribution sauvegardée dans /atelier-production/attribution.
 * Affiche le texte coloré + le n° d'ordre de broderie sous chaque lettre
 * (même numérotation que l'outil d'attribution et son PDF).
 */
import { useState } from "react";
import { Loader2, Palette, Trash2, Wand2 } from "lucide-react";
import type { Broderie, Commande } from "@/lib/production/commandes-loader";
import { attributionManquante, filDeZone, filsBroderie, lettresParLigne, ordreFilsAttribution } from "@/lib/production/broderie-utils";

interface LibEntry { id: string; name: string; motif_id: string | null; texte_lignes: string[]; couleurs: string; created_at: string; meme_motif: boolean }

const sans: React.CSSProperties = { fontFamily: "var(--font-sans)", fontSize: 11 };
const btn: React.CSSProperties = {
  ...sans, display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 10px", borderRadius: 999,
  border: "0.5px solid var(--hub-border)", background: "white", cursor: "pointer", color: "var(--hub-foreground)",
};

export default function AttributionZone({
  commandeId, articleId, index, broderie, disabled, onSaved,
}: {
  commandeId: string;
  articleId: string;
  index: number;
  broderie: Broderie;
  disabled?: boolean;
  onSaved: (c: Commande) => void;
}) {
  const url = `/api/production/commandes/${commandeId}/articles/${articleId}/broderies/${index}/attribution`;
  const [busy, setBusy] = useState(false);
  const [lib, setLib] = useState<LibEntry[] | null>(null);
  const [warn, setWarn] = useState<string | null>(null);
  const att = broderie.attribution_couleurs;
  const multi = filsBroderie(broderie).length > 1 || Boolean(broderie.palette_id);
  const [lignes, setLignes] = useState(
    (att?.texte_lignes ?? broderie.champs.map((c) => c.valeur)).filter((l) => l.trim()).join("\n"),
  );

  async function call(method: "POST" | "DELETE", body?: unknown) {
    setBusy(true);
    setWarn(null);
    try {
      const res = await fetch(url, {
        method,
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      }).then((r) => r.json());
      if (!res.ok) throw new Error(res.error);
      if (res.avertissement) setWarn(res.avertissement);
      onSaved(res.data);
    } catch (e) {
      alert("Attribution : " + (e instanceof Error ? e.message : String(e)));
    } finally {
      setBusy(false);
    }
  }

  async function ouvrirBibliotheque() {
    if (lib) return setLib(null);
    const res = await fetch(url, { cache: "no-store" }).then((r) => r.json()).catch(() => null);
    setLib(res?.ok ? res.data : []);
  }

  if (!att && (!multi || disabled)) return null;

  const ordre = att ? ordreFilsAttribution(att) : [];
  return (
    <div style={{
      marginTop: 6, padding: "8px 10px", borderRadius: 8, background: "white",
      border: `0.5px solid ${attributionManquante(broderie) ? "#C9837A" : "var(--hub-border)"}`,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <span style={{ ...sans, fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", opacity: 0.6 }}>
          Couleur par lettre
        </span>
        {att && (
          <span style={{ ...sans, opacity: 0.55 }}>
            {att.source === "bibliotheque" ? `importée · ${att.library_name ?? att.library_id}` : att.mode === "pattern" ? "règle du motif" : "moteur Hub"}
          </span>
        )}
        {!att && <span style={{ ...sans, color: "#A0473C" }}>à faire — zone multicolore</span>}
        {busy && <Loader2 size={11} className="animate-spin" />}
      </div>

      {att && (
        <div style={{ display: "grid", gap: 4, margin: "8px 0" }}>
          {lettresParLigne(att).map((ls, k) => (
            <div key={k} style={{ display: "flex", gap: 3, alignItems: "flex-end", flexWrap: "wrap" }}>
              {ls.map((l) => {
                const f = filDeZone(broderie, l.fil_id);
                return (
                  <span key={`${l.ligne}-${l.indice}`} title={f ? `${f.fil_nom} · Gunold ${f.fil_code_gunold}` : l.fil_id}
                    style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", minWidth: 16 }}>
                    <span style={{ fontFamily: "Georgia, serif", fontWeight: 700, fontSize: 20, lineHeight: 1, color: f?.fil_hex ?? "#1A1614" }}>{l.caractere}</span>
                    <span style={{ fontFamily: "ui-monospace, monospace", fontSize: 9, opacity: 0.55 }}>{ordre.indexOf(l.fil_id) + 1}</span>
                  </span>
                );
              })}
            </div>
          ))}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 2 }}>
            {ordre.map((id, k) => {
              const f = filDeZone(broderie, id);
              const n = att.lettres.filter((l) => l.fil_id === id).length;
              return (
                <span key={id} style={{ ...sans, fontSize: 10, display: "inline-flex", alignItems: "center", gap: 4 }}>
                  <strong style={{ fontFamily: "ui-monospace, monospace" }}>{k + 1}</strong>
                  <span style={{ width: 9, height: 9, borderRadius: "50%", background: f?.fil_hex ?? "#888" }} />
                  {f?.fil_nom ?? id} <span style={{ opacity: 0.5 }}>{f?.fil_code_gunold} × {n}</span>
                </span>
              );
            })}
          </div>
        </div>
      )}

      {warn && <div style={{ ...sans, color: "#7A5800", background: "#FEF6E0", padding: "4px 8px", borderRadius: 6, margin: "6px 0" }}>{warn}</div>}

      {!disabled && (
        <div style={{ display: "flex", gap: 6, alignItems: "flex-start", flexWrap: "wrap", marginTop: 6 }}>
          <textarea
            value={lignes}
            onChange={(e) => setLignes(e.target.value)}
            rows={Math.min(4, Math.max(2, lignes.split("\n").length))}
            placeholder={"1996\nEdition limitée"}
            title="Une ligne brodée par ligne (4 max)"
            style={{ ...sans, width: 170, padding: "4px 6px", borderRadius: 6, border: "0.5px solid var(--hub-border)", resize: "vertical" }}
          />
          <button disabled={busy} onClick={() => call("POST", { source: "moteur", texte_lignes: lignes.split("\n") })} style={btn}>
            <Wand2 size={11} /> {att ? "Recalculer" : "Calculer"}
          </button>
          <button disabled={busy} onClick={ouvrirBibliotheque} style={btn}>
            <Palette size={11} /> Importer du Hub
          </button>
          {att && (
            <button disabled={busy} onClick={() => confirm("Retirer l'attribution des couleurs ?") && call("DELETE")} style={{ ...btn, opacity: 0.7 }}>
              <Trash2 size={11} /> Retirer
            </button>
          )}
        </div>
      )}

      {lib && (
        <div style={{ marginTop: 6, maxHeight: 180, overflowY: "auto", border: "0.5px solid var(--hub-border)", borderRadius: 6 }}>
          {lib.length === 0 && <div style={{ ...sans, padding: 8, opacity: 0.6 }}>Aucune attribution sauvegardée dans le Hub.</div>}
          {lib.map((e) => (
            <button key={e.id} disabled={busy}
              onClick={() => { setLib(null); call("POST", { source: "bibliotheque", library_id: e.id }); }}
              style={{ ...sans, display: "block", width: "100%", textAlign: "left", padding: "6px 8px", border: "none", borderBottom: "0.5px solid var(--hub-border)", background: e.meme_motif ? "#FAF7F2" : "white", cursor: "pointer" }}>
              <strong>{e.name}</strong> <span style={{ opacity: 0.6 }}>· {e.texte_lignes.join(" / ")} · {e.couleurs} · {e.created_at}</span>
              {e.meme_motif && <span style={{ marginLeft: 6, fontSize: 9, color: "#2F7A3E" }}>même motif</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
