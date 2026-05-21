"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, X, Layers, Archive, ArchiveRestore, Replace, Check, Download, Plus, Save, Trash2, Pencil, Heart } from "lucide-react";
import type { HubFil, Palette, MotifYpm } from "@/lib/atelier-da/referentiels-loader";

const TYPE_LABEL: Record<Palette["type"], string> = {
  camaieu: "Camaïeu",
  multicolore: "Multicolore",
  duo: "Duo",
  trio: "Trio",
};

export default function PalettesPage() {
  const [palettes, setPalettes] = useState<Palette[]>([]);
  const [fils, setFils] = useState<HubFil[]>([]);
  const [motifs, setMotifs] = useState<MotifYpm[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Palette | null>(null);
  const [creating, setCreating] = useState(false);

  const refresh = useCallback(async () => {
    const res = await fetch("/api/da/referentiels", { cache: "no-store" }).then((r) => r.json());
    if (!res.ok) throw new Error(res.error);
    setPalettes(res.data.palettes.palettes);
    setFils(res.data.fils.couleurs);
    setMotifs(res.data.motifs.motifs);
    if (selected) {
      const updated = res.data.palettes.palettes.find((p: Palette) => p.id === selected.id);
      if (updated) setSelected(updated);
    }
  }, [selected]);

  useEffect(() => {
    refresh()
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Favoris d'abord, ensuite ordre original (palettes_fils_associations.json)
  const actives = palettes
    .filter((p) => !p.archive)
    .slice()
    .sort((a, b) => Number(Boolean(b.favori)) - Number(Boolean(a.favori)));
  const archivees = palettes.filter((p) => p.archive);
  const nbFavoris = actives.filter((p) => p.favori).length;

  const toggleFavori = async (palette: Palette) => {
    try {
      const res = await fetch(`/api/da/palettes/${encodeURIComponent(palette.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ favori: !palette.favori }),
      }).then((r) => r.json());
      if (!res.ok) throw new Error(res.error);
      await refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : String(e));
    }
  };

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
    <div style={{ maxWidth: 1400, margin: "0 auto" }}>
      <Link href="/atelier-production" style={backLink}>
        <ArrowLeft size={14} strokeWidth={1.6} /> Atelier Production
      </Link>

      <header style={{ marginBottom: 32, display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 24, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontFamily: "var(--font-editorial)", fontSize: 36, fontWeight: 500, margin: 0, marginBottom: 8 }}>
            Palettes mix &amp; match
          </h1>
          <p style={{ fontFamily: "var(--font-sans)", fontSize: 13, color: "var(--hub-foreground)", opacity: 0.65, maxWidth: 720, margin: 0 }}>
            {actives.length} palettes actives{nbFavoris > 0 && ` · ${nbFavoris} favorite${nbFavoris > 1 ? "s" : ""}`}{archivees.length > 0 && ` · ${archivees.length} archivée${archivees.length > 1 ? "s" : ""}`} — chaque palette = ensemble de fils Gunold-Poly canonique référençable depuis la bible technique d&apos;un motif. Click pour voir le détail, archiver, remplacer un fil. Cœur pour épingler en tête de liste.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCreating(true)}
          style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            padding: "8px 16px", borderRadius: 999,
            background: "var(--hub-foreground)", color: "var(--hub-bg)",
            border: "none", cursor: "pointer",
            fontFamily: "var(--font-sans)", fontSize: 12, fontWeight: 500,
            whiteSpace: "nowrap",
          }}
        >
          <Plus size={13} /> Nouvelle palette
        </button>
      </header>

      {creating && <NewPaletteForm fils={fils} onCancel={() => setCreating(false)} onSaved={async () => { await refresh(); setCreating(false); }} />}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
          gap: 16,
        }}
      >
        {actives.map((p) => (
          <PaletteCard key={p.id} palette={p} fils={fils} onClick={() => setSelected(p)} onToggleFavori={() => toggleFavori(p)} />
        ))}
      </div>

      {archivees.length > 0 && (
        <section style={{ marginTop: 56, paddingTop: 24, borderTop: "0.5px solid var(--hub-border)" }}>
          <h2 style={{ fontFamily: "var(--font-editorial)", fontSize: 22, fontWeight: 500, margin: "0 0 16px 0", display: "inline-flex", alignItems: "center", gap: 10 }}>
            <Archive size={18} strokeWidth={1.4} /> Archives
            <span style={{ fontFamily: "var(--font-sans)", fontSize: 12, fontWeight: 400, opacity: 0.55 }}>{archivees.length} palette{archivees.length > 1 ? "s" : ""} testée{archivees.length > 1 ? "s" : ""} non validée{archivees.length > 1 ? "s" : ""}</span>
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16, opacity: 0.65 }}>
            {archivees.map((p) => (
              <PaletteCard key={p.id} palette={p} fils={fils} onClick={() => setSelected(p)} onToggleFavori={() => toggleFavori(p)} />
            ))}
          </div>
        </section>
      )}

      {selected && (
        <PaletteModal palette={selected} fils={fils} motifs={motifs} onClose={() => setSelected(null)} onSaved={refresh} />
      )}
    </div>
  );
}

function PaletteCard({ palette, fils, onClick, onToggleFavori }: { palette: Palette; fils: HubFil[]; onClick: () => void; onToggleFavori: () => void }) {
  const filsObjs = palette.fils.map((id) => fils.find((f) => f.id === id)).filter((f): f is HubFil => Boolean(f));

  return (
    <div
      className="canonique-card"
      style={{
        position: "relative",
        background: "white",
        border: palette.favori ? "0.5px solid #B4665F" : "0.5px solid var(--hub-border)",
        borderRadius: 12,
        overflow: "hidden",
        transition: "transform 200ms ease, box-shadow 200ms ease",
        display: "flex",
        flexDirection: "column",
        width: "100%",
        boxSizing: "border-box",
      }}
    >
      <button
        type="button"
        onClick={onClick}
        style={{
          all: "unset",
          cursor: "pointer",
          display: "block",
          width: "100%",
        }}
      >
        <div style={{ display: "flex", height: 110 }}>
          {filsObjs.map((f) => (
            <div
              key={f.id}
              title={`${f.nom} (${f.code_gunold})`}
              style={{ flex: 1, background: f.hex }}
            />
          ))}
        </div>
        <div style={{ padding: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
            <h3 style={{ fontFamily: "var(--font-editorial)", fontSize: 18, fontWeight: 500, margin: 0 }}>
              {palette.nom}
            </h3>
            <span style={{ fontFamily: "var(--font-sans)", fontSize: 9, opacity: 0.55, padding: "2px 8px", background: "var(--hub-bg)", borderRadius: 999 }}>
              {TYPE_LABEL[palette.type]}
            </span>
          </div>
          <p style={{ fontFamily: "var(--font-sans)", fontSize: 11, opacity: 0.6, margin: "4px 0 0 0" }}>
            {palette.fils.length} fils
          </p>
        </div>
      </button>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onToggleFavori(); }}
        aria-label={palette.favori ? "Retirer des favoris" : "Ajouter aux favoris"}
        title={palette.favori ? "Retirer des favoris" : "Ajouter aux favoris"}
        style={{
          position: "absolute",
          top: 8,
          right: 8,
          width: 32,
          height: 32,
          borderRadius: 999,
          border: "none",
          background: palette.favori ? "#B4665F" : "rgba(255,255,255,0.92)",
          color: palette.favori ? "white" : "#1A1614",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          boxShadow: "0 1px 4px rgba(0,0,0,0.15)",
        }}
      >
        <Heart size={15} strokeWidth={1.8} fill={palette.favori ? "white" : "none"} />
      </button>
    </div>
  );
}

function PaletteModal({ palette, fils, motifs, onClose, onSaved }: { palette: Palette; fils: HubFil[]; motifs: MotifYpm[]; onClose: () => void; onSaved: () => Promise<void> }) {
  const filsObjs = palette.fils.map((id) => fils.find((f) => f.id === id)).filter((f): f is HubFil => Boolean(f));
  const motifsUtilisateurs = useMemo(
    () => motifs.filter((m) => m.bible?.palettes_associees?.includes(palette.id)),
    [motifs, palette.id]
  );
  const [busy, setBusy] = useState(false);
  const [swapFor, setSwapFor] = useState<string | null>(null); // id du fil qu'on veut remplacer
  const [addingFil, setAddingFil] = useState(false); // ouvre le picker "+ nouveau fil"
  const [editingMeta, setEditingMeta] = useState(false); // édite nom + description + type
  const [editNom, setEditNom] = useState(palette.nom);
  const [editType, setEditType] = useState<Palette["type"]>(palette.type);
  const [editDesc, setEditDesc] = useState(palette.description || "");

  const saveMeta = async () => {
    if (!editNom.trim()) { alert("Nom requis"); return; }
    setBusy(true);
    try {
      const res = await fetch(`/api/da/palettes/${encodeURIComponent(palette.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nom: editNom.trim(),
          description: editDesc.trim() || null,
        }),
      }).then((r) => r.json());
      if (!res.ok) throw new Error(res.error);
      setEditingMeta(false);
      await onSaved();
    } catch (e) {
      alert(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };
  const cancelMeta = () => {
    setEditNom(palette.nom);
    setEditType(palette.type);
    setEditDesc(palette.description || "");
    setEditingMeta(false);
  };

  const toggleArchive = async () => {
    setBusy(true);
    try {
      const res = await fetch(`/api/da/palettes/${encodeURIComponent(palette.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ archive: !palette.archive }),
      }).then((r) => r.json());
      if (!res.ok) throw new Error(res.error);
      await onSaved();
    } catch (e) {
      alert(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const toggleFavori = async () => {
    setBusy(true);
    try {
      const res = await fetch(`/api/da/palettes/${encodeURIComponent(palette.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ favori: !palette.favori }),
      }).then((r) => r.json());
      if (!res.ok) throw new Error(res.error);
      await onSaved();
    } catch (e) {
      alert(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const addFil = async (filId: string) => {
    if (palette.fils.includes(filId)) {
      setAddingFil(false);
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/da/palettes/${encodeURIComponent(palette.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fils: [...palette.fils, filId] }),
      }).then((r) => r.json());
      if (!res.ok) throw new Error(res.error);
      setAddingFil(false);
      await onSaved();
    } catch (e) {
      alert(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const removeFil = async (filId: string) => {
    if (palette.fils.length <= 2) {
      alert("Une palette doit contenir au moins 2 fils.");
      return;
    }
    if (!confirm("Retirer ce fil de la palette ?")) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/da/palettes/${encodeURIComponent(palette.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fils: palette.fils.filter((f) => f !== filId) }),
      }).then((r) => r.json());
      if (!res.ok) throw new Error(res.error);
      await onSaved();
    } catch (e) {
      alert(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const swap = async (fromId: string, toId: string) => {
    setBusy(true);
    try {
      const res = await fetch(`/api/da/palettes/${encodeURIComponent(palette.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ swap: { from: fromId, to: toId } }),
      }).then((r) => r.json());
      if (!res.ok) throw new Error(res.error);
      setSwapFor(null);
      await onSaved();
    } catch (e) {
      alert(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, background: "rgba(30,45,74,0.4)", zIndex: 100,
        display: "flex", alignItems: "flex-start", justifyContent: "center",
        padding: 32, overflow: "auto",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "white", borderRadius: 20, maxWidth: 720, width: "100%",
          padding: 32, position: "relative",
          maxHeight: "calc(100vh - 64px)", overflow: "auto",
        }}
      >
        <button type="button" onClick={onClose} aria-label="Fermer" style={closeBtn}>
          <X size={16} />
        </button>

        <header style={{ marginBottom: 20 }}>
          {editingMeta ? (
            <div style={{ display: "grid", gap: 10, marginBottom: 8 }}>
              <input
                type="text"
                value={editNom}
                onChange={(e) => setEditNom(e.target.value)}
                placeholder="Nom de la palette"
                autoFocus
                style={{
                  padding: "10px 12px", border: "0.5px solid var(--hub-border)", borderRadius: 8,
                  fontFamily: "var(--font-editorial)", fontSize: 24, fontWeight: 500,
                  background: "white", width: "100%", boxSizing: "border-box",
                }}
              />
              <textarea
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
                placeholder="Description (optionnel)"
                rows={2}
                style={{
                  padding: "8px 10px", border: "0.5px solid var(--hub-border)", borderRadius: 8,
                  fontFamily: "var(--font-sans)", fontSize: 13, background: "white",
                  width: "100%", boxSizing: "border-box", resize: "vertical",
                }}
              />
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 6 }}>
                <button type="button" onClick={cancelMeta} disabled={busy} style={{
                  padding: "5px 12px", borderRadius: 999, border: "0.5px solid var(--hub-border)",
                  background: "white", fontFamily: "var(--font-sans)", fontSize: 11, cursor: "pointer",
                  display: "inline-flex", alignItems: "center", gap: 4,
                }}>
                  <X size={11} /> Annuler
                </button>
                <button type="button" onClick={saveMeta} disabled={busy || !editNom.trim()} style={{
                  padding: "5px 12px", borderRadius: 999, border: "none",
                  background: "var(--hub-foreground)", color: "var(--hub-bg)",
                  fontFamily: "var(--font-sans)", fontSize: 11, fontWeight: 500,
                  cursor: busy || !editNom.trim() ? "default" : "pointer",
                  opacity: busy || !editNom.trim() ? 0.5 : 1,
                  display: "inline-flex", alignItems: "center", gap: 4,
                }}>
                  {busy ? <Loader2 size={11} className="animate-spin" /> : <Save size={11} />}
                  Enregistrer
                </button>
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 4, flexWrap: "wrap" }}>
              <h2 style={{ fontFamily: "var(--font-editorial)", fontSize: 28, fontWeight: 500, margin: 0 }}>
                {palette.nom}
              </h2>
              <span style={{ fontFamily: "var(--font-sans)", fontSize: 10, opacity: 0.6, padding: "2px 10px", background: "var(--hub-bg)", borderRadius: 999 }}>
                {TYPE_LABEL[palette.type]}
              </span>
              {palette.favori && (
                <span style={{ fontFamily: "var(--font-sans)", fontSize: 10, padding: "2px 10px", background: "#B4665F", color: "white", borderRadius: 999, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 4 }}>
                  <Heart size={10} strokeWidth={2} fill="white" /> Favorite
                </span>
              )}
              {palette.archive && (
                <span style={{ fontFamily: "var(--font-sans)", fontSize: 10, opacity: 0.85, padding: "2px 10px", background: "#7a6c5e", color: "white", borderRadius: 999, fontWeight: 600 }}>
                  Archivée
                </span>
              )}
              <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
                <button
                  type="button"
                  onClick={toggleFavori}
                  disabled={busy}
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 4,
                    padding: "5px 12px", borderRadius: 999,
                    background: palette.favori ? "#B4665F" : "white",
                    color: palette.favori ? "white" : "var(--hub-foreground)",
                    border: palette.favori ? "none" : "0.5px solid var(--hub-border)",
                    fontFamily: "var(--font-sans)", fontSize: 11, cursor: busy ? "default" : "pointer",
                    opacity: busy ? 0.5 : 1,
                  }}
                  title={palette.favori ? "Retirer des favoris" : "Ajouter aux favoris"}
                >
                  <Heart size={11} strokeWidth={1.8} fill={palette.favori ? "white" : "none"} />
                  {palette.favori ? "Favorite" : "Liker"}
                </button>
                <button
                  type="button"
                  onClick={() => setEditingMeta(true)}
                  disabled={busy}
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 4,
                    padding: "5px 12px", borderRadius: 999,
                    background: "white", color: "var(--hub-foreground)",
                    border: "0.5px solid var(--hub-border)",
                    fontFamily: "var(--font-sans)", fontSize: 11, cursor: busy ? "default" : "pointer",
                    opacity: busy ? 0.5 : 1,
                  }}
                  title="Renommer la palette / éditer la description"
                >
                  <Pencil size={11} /> Éditer
                </button>
                <Link
                  href={`/atelier-production/palettes/${encodeURIComponent(palette.id)}/fiche-prod`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 4,
                    padding: "5px 12px", borderRadius: 999,
                    background: "var(--hub-foreground)", color: "var(--hub-bg)",
                    border: "none", textDecoration: "none",
                    fontFamily: "var(--font-sans)", fontSize: 11, fontWeight: 500,
                  }}
                  title="Ouvre la fiche prod imprimable (Cmd+P pour PDF)"
                >
                  <Download size={11} /> Fiche prod
                </Link>
                <button
                  type="button"
                  onClick={toggleArchive}
                  disabled={busy}
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 4,
                    padding: "5px 12px", borderRadius: 999,
                    background: palette.archive ? "white" : "#7a6c5e",
                    color: palette.archive ? "var(--hub-foreground)" : "white",
                    border: palette.archive ? "0.5px solid var(--hub-border)" : "none",
                    fontFamily: "var(--font-sans)", fontSize: 11, cursor: busy ? "default" : "pointer",
                    opacity: busy ? 0.5 : 1,
                  }}
                >
                  {palette.archive ? <ArchiveRestore size={11} /> : <Archive size={11} />}
                  {palette.archive ? "Restaurer" : "Archiver"}
                </button>
              </div>
            </div>
          )}
          <p style={{ fontFamily: "var(--font-sans)", fontSize: 11, opacity: 0.55, margin: 0 }}>
            <code>{palette.id}</code> · {palette.fils.length} fils
          </p>
        </header>

        <div style={{ display: "flex", height: 80, borderRadius: 10, overflow: "hidden", marginBottom: 20 }}>
          {filsObjs.map((f) => (
            <div key={f.id} style={{ flex: 1, background: f.hex }} />
          ))}
        </div>

        {!editingMeta && palette.description && (
          <p style={{ fontFamily: "var(--font-sans)", fontSize: 13, lineHeight: 1.5, opacity: 0.8, marginBottom: 20 }}>
            {palette.description}
          </p>
        )}

        <h4 style={sectionTitle}>Fils ({filsObjs.length})</h4>
        <div style={{ display: "grid", gap: 8 }}>
          {filsObjs.map((f) => (
            <div key={f.id} style={{ display: "grid", gap: 6 }}>
              <div
                style={{
                  display: "flex", alignItems: "center", gap: 12,
                  padding: "10px 12px",
                  background: "var(--hub-bg)",
                  borderRadius: 10,
                  border: "0.5px solid var(--hub-border)",
                }}
              >
                <span
                  style={{
                    width: 32, height: 32, borderRadius: "50%", background: f.hex,
                    border: "0.5px solid rgba(0,0,0,0.08)", flexShrink: 0,
                  }}
                />
                <div style={{ flex: 1, fontFamily: "var(--font-sans)" }}>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{f.nom}</div>
                  <div style={{ fontSize: 10, opacity: 0.55 }}>
                    <code>{f.id}</code>
                    {f.archive && <span style={{ marginLeft: 6, color: "#7a6c5e", fontStyle: "italic" }}>archivé</span>}
                  </div>
                </div>
                <code style={{ fontFamily: "var(--font-mono, monospace)", fontSize: 12, fontWeight: 600, color: "var(--hub-foreground)", padding: "4px 10px", background: "white", borderRadius: 6 }}>
                  {f.code_gunold}
                </code>
                <button
                  type="button"
                  onClick={() => setSwapFor(swapFor === f.id ? null : f.id)}
                  disabled={busy}
                  title="Remplacer ce fil par un autre"
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 4,
                    padding: "4px 8px", borderRadius: 999,
                    background: swapFor === f.id ? "var(--hub-foreground)" : "white",
                    color: swapFor === f.id ? "var(--hub-bg)" : "var(--hub-foreground)",
                    border: "0.5px solid var(--hub-border)",
                    fontFamily: "var(--font-sans)", fontSize: 10, cursor: "pointer",
                    opacity: busy ? 0.5 : 1,
                  }}
                >
                  <Replace size={10} />
                  {swapFor === f.id ? "Annuler" : "Remplacer"}
                </button>
                <button
                  type="button"
                  onClick={() => removeFil(f.id)}
                  disabled={busy || palette.fils.length <= 2}
                  title={palette.fils.length <= 2 ? "Min. 2 fils par palette" : "Retirer ce fil de la palette"}
                  style={{
                    display: "inline-flex", alignItems: "center",
                    padding: "4px 8px", borderRadius: 999,
                    background: "white",
                    color: "var(--hub-foreground)",
                    border: "0.5px solid var(--hub-border)",
                    cursor: busy || palette.fils.length <= 2 ? "default" : "pointer",
                    opacity: busy || palette.fils.length <= 2 ? 0.4 : 0.7,
                  }}
                >
                  <Trash2 size={10} />
                </button>
              </div>
              {swapFor === f.id && (
                <FilSwapPicker
                  fils={fils}
                  currentFil={f}
                  alreadyIn={palette.fils}
                  busy={busy}
                  onPick={(toId) => swap(f.id, toId)}
                />
              )}
            </div>
          ))}

          {/* CTA : ajouter un nouveau fil à la palette */}
          {!addingFil ? (
            <button
              type="button"
              onClick={() => setAddingFil(true)}
              disabled={busy}
              style={{
                display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6,
                padding: "10px 12px", borderRadius: 10,
                background: "white", border: "1px dashed var(--hub-border)",
                fontFamily: "var(--font-sans)", fontSize: 12, fontWeight: 500,
                color: "var(--hub-foreground)", opacity: busy ? 0.5 : 0.85,
                cursor: busy ? "default" : "pointer",
              }}
            >
              <Plus size={13} /> Nouveau fil
            </button>
          ) : (
            <FilAddPicker
              fils={fils}
              alreadyIn={palette.fils}
              busy={busy}
              onCancel={() => setAddingFil(false)}
              onPick={addFil}
            />
          )}
        </div>

        {motifsUtilisateurs.length > 0 && (
          <>
            <h4 style={{ ...sectionTitle, marginTop: 24 }}>Utilisée par ({motifsUtilisateurs.length})</h4>
            <div style={{ display: "grid", gap: 8 }}>
              {motifsUtilisateurs.map((m) => (
                <Link
                  key={m.id}
                  href={`/atelier-production/motifs?focus=${encodeURIComponent(m.id)}`}
                  style={{
                    display: "flex", alignItems: "center", gap: 12,
                    padding: "10px 12px",
                    background: "white",
                    border: "0.5px solid var(--hub-border)",
                    borderRadius: 10,
                    textDecoration: "none",
                    color: "var(--hub-foreground)",
                  }}
                >
                  <Layers size={16} strokeWidth={1.5} style={{ opacity: 0.55 }} />
                  <div style={{ flex: 1, fontFamily: "var(--font-sans)" }}>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{m.nom_commercial}</div>
                    <div style={{ fontSize: 10, opacity: 0.55 }}>
                      <code>{m.id}</code> · {m.nb_variantes} variantes
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const backLink: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 6,
  fontFamily: "var(--font-sans)", fontSize: 12,
  color: "var(--hub-foreground)", opacity: 0.6,
  textDecoration: "none", marginBottom: 24,
};
const closeBtn: React.CSSProperties = {
  position: "absolute", top: 16, right: 16,
  background: "var(--hub-bg)", border: "none",
  width: 36, height: 36, borderRadius: 999,
  cursor: "pointer", display: "flex",
  alignItems: "center", justifyContent: "center",
};
const sectionTitle: React.CSSProperties = {
  fontFamily: "var(--font-sans)", fontSize: 11, fontWeight: 600,
  letterSpacing: "0.06em", textTransform: "uppercase", opacity: 0.55,
  margin: "0 0 10px 0",
};

function FilSwapPicker({
  fils, currentFil, alreadyIn, busy, onPick,
}: {
  fils: HubFil[];
  currentFil: HubFil;
  alreadyIn: string[];
  busy: boolean;
  onPick: (toId: string) => void;
}) {
  const [query, setQuery] = useState("");
  const candidates = useMemo(() => {
    const q = query.trim().toLowerCase();
    return fils
      .filter((f) => f.id !== currentFil.id)
      .filter((f) => !q || f.nom.toLowerCase().includes(q) || f.id.toLowerCase().includes(q) || (f.code_gunold || "").toLowerCase().includes(q))
      .sort((a, b) => a.nom.localeCompare(b.nom));
  }, [fils, currentFil.id, query]);

  return (
    <div style={{ padding: "10px 12px", background: "white", border: "1px dashed var(--hub-border)", borderRadius: 10, display: "grid", gap: 8 }}>
      <div style={{ fontFamily: "var(--font-sans)", fontSize: 11, opacity: 0.7 }}>
        Remplacer <strong>{currentFil.nom}</strong> ({currentFil.code_gunold}) par…
      </div>
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Filtrer par nom, id, code Gunold…"
        style={{
          width: "100%", padding: "6px 10px", border: "0.5px solid var(--hub-border)",
          borderRadius: 8, fontFamily: "var(--font-sans)", fontSize: 12, background: "var(--hub-bg)",
          boxSizing: "border-box",
        }}
      />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))", gap: 6, maxHeight: 220, overflow: "auto" }}>
        {candidates.map((f) => {
          const inPalette = alreadyIn.includes(f.id);
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => onPick(f.id)}
              disabled={busy}
              title={inPalette ? "Déjà dans la palette — un swap dédupliquera" : `Remplacer ${currentFil.nom} par ${f.nom}`}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "6px 8px", borderRadius: 8,
                background: "white", border: "0.5px solid var(--hub-border)",
                cursor: busy ? "default" : "pointer", textAlign: "left",
                opacity: busy ? 0.5 : 1,
                fontFamily: "var(--font-sans)",
              }}
            >
              <span style={{
                width: 22, height: 22, borderRadius: "50%", background: f.hex,
                border: "0.5px solid rgba(0,0,0,0.08)", flexShrink: 0,
              }} />
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ fontSize: 12, fontWeight: 500, display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {f.nom} {inPalette && <Check size={10} style={{ display: "inline", verticalAlign: "middle", opacity: 0.5 }} />}
                </span>
                <span style={{ fontSize: 9, opacity: 0.5, fontFamily: "var(--font-mono, monospace)" }}>{f.code_gunold}</span>
              </span>
            </button>
          );
        })}
        {candidates.length === 0 && (
          <p style={{ gridColumn: "1 / -1", fontSize: 11, opacity: 0.55, fontStyle: "italic", margin: 0 }}>Aucun fil trouvé pour <em>{query}</em>.</p>
        )}
      </div>
    </div>
  );
}

function NewPaletteForm({ fils, onCancel, onSaved }: { fils: HubFil[]; onCancel: () => void; onSaved: () => Promise<void> }) {
  const [nom, setNom] = useState("");
  const [type, setType] = useState<Palette["type"]>("camaieu");
  const [description, setDescription] = useState("");
  const [filsIds, setFilsIds] = useState<string[]>(["", "", "", "", ""]); // 5 slots par défaut
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Tri des fils dispo : actifs (non archivés) par nom alphabétique
  const filsDispo = useMemo(
    () => [...fils.filter((f) => !f.archive)].sort((a, b) => a.nom.localeCompare(b.nom)),
    [fils]
  );
  const filsById = useMemo(() => new Map(fils.map((f) => [f.id, f])), [fils]);

  const filsRetenus = filsIds.filter(Boolean);

  const updateFil = (idx: number, value: string) => {
    setFilsIds(filsIds.map((v, i) => (i === idx ? value : v)));
  };
  const addSlot = () => setFilsIds([...filsIds, ""]);
  const removeSlot = (idx: number) => {
    if (filsIds.length <= 2) return;
    setFilsIds(filsIds.filter((_, i) => i !== idx));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nom.trim()) { setErr("Nom requis"); return; }
    if (filsRetenus.length < 2) { setErr("Au moins 2 fils requis"); return; }
    setSubmitting(true);
    setErr(null);
    try {
      const res = await fetch("/api/da/palettes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nom: nom.trim(),
          type,
          fils: filsRetenus,
          description: description.trim() || undefined,
        }),
      }).then((r) => r.json());
      if (!res.ok) throw new Error(res.error);
      await onSaved();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setSubmitting(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    padding: "8px 10px", border: "0.5px solid var(--hub-border)", borderRadius: 8,
    fontFamily: "var(--font-sans)", fontSize: 13, background: "white", width: "100%", boxSizing: "border-box",
  };
  const labelStyle: React.CSSProperties = {
    fontFamily: "var(--font-sans)", fontSize: 11, fontWeight: 600,
    letterSpacing: "0.05em", textTransform: "uppercase", opacity: 0.6,
    display: "block", marginBottom: 4,
  };

  return (
    <form
      onSubmit={submit}
      style={{
        background: "white", border: "1px dashed var(--hub-border)", borderRadius: 14,
        padding: 24, marginBottom: 28, display: "grid", gap: 14,
      }}
    >
      <h3 style={{ fontFamily: "var(--font-editorial)", fontSize: 22, fontWeight: 500, margin: 0 }}>
        Nouvelle palette
      </h3>

      {/* Aperçu live du bandeau swatch */}
      {filsRetenus.length > 0 && (
        <div style={{ display: "flex", height: 56, borderRadius: 8, overflow: "hidden", border: "0.5px solid var(--hub-border)" }}>
          {filsRetenus.map((id) => {
            const f = filsById.get(id);
            return <div key={id} style={{ flex: 1, background: f?.hex || "var(--hub-bg)" }} />;
          })}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 10 }}>
        <div>
          <label style={labelStyle}>Nom de la palette</label>
          <input type="text" value={nom} onChange={(e) => setNom(e.target.value)} placeholder='ex. "Camaïeu cuivré"' autoFocus style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Type</label>
          <select value={type} onChange={(e) => setType(e.target.value as Palette["type"])} style={inputStyle}>
            <option value="camaieu">Camaïeu</option>
            <option value="multicolore">Multicolore</option>
            <option value="duo">Duo</option>
            <option value="trio">Trio</option>
          </select>
        </div>
      </div>

      <div>
        <label style={labelStyle}>Description (optionnel)</label>
        <textarea
          value={description} onChange={(e) => setDescription(e.target.value)}
          placeholder="ex. Tons cuivrés posés sur le sable — registre automnal chaleureux"
          rows={2}
          style={{ ...inputStyle, resize: "vertical", fontFamily: "var(--font-sans)" }}
        />
      </div>

      <div>
        <label style={labelStyle}>Fils ({filsRetenus.length} / {filsIds.length} slots)</label>
        <div style={{ display: "grid", gap: 6 }}>
          {filsIds.map((id, idx) => {
            const f = id ? filsById.get(id) : undefined;
            return (
              <div key={idx} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <div
                  style={{
                    width: 32, height: 32, borderRadius: 8,
                    background: f?.hex || "var(--hub-bg)",
                    border: "0.5px solid var(--hub-border)", flexShrink: 0,
                  }}
                />
                <select
                  value={id}
                  onChange={(e) => updateFil(idx, e.target.value)}
                  style={{ ...inputStyle, flex: 1 }}
                >
                  <option value="">— Choisir un fil —</option>
                  {filsDispo.map((fil) => (
                    <option key={fil.id} value={fil.id}>
                      {fil.nom} {fil.code_gunold ? `· ${fil.code_gunold}` : ""}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => removeSlot(idx)}
                  disabled={filsIds.length <= 2}
                  title={filsIds.length <= 2 ? "Min. 2 slots" : "Retirer ce slot"}
                  style={{
                    padding: "0 10px", height: 36, borderRadius: 8,
                    background: "white", border: "0.5px solid var(--hub-border)",
                    cursor: filsIds.length <= 2 ? "default" : "pointer",
                    opacity: filsIds.length <= 2 ? 0.4 : 1,
                  }}
                >
                  <Trash2 size={13} />
                </button>
              </div>
            );
          })}
          <button
            type="button"
            onClick={addSlot}
            style={{
              padding: "6px 12px", borderRadius: 999,
              background: "white", border: "0.5px solid var(--hub-border)",
              fontFamily: "var(--font-sans)", fontSize: 11, cursor: "pointer",
              display: "inline-flex", alignItems: "center", gap: 4,
              justifySelf: "start", color: "var(--hub-foreground)",
            }}
          >
            <Plus size={11} /> Ajouter un slot
          </button>
        </div>
      </div>

      {err && <div style={{ color: "#a13a16", fontSize: 12 }}>{err}</div>}

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
        <button type="button" onClick={onCancel} disabled={submitting} style={{
          padding: "8px 16px", borderRadius: 999, border: "0.5px solid var(--hub-border)",
          background: "white", fontFamily: "var(--font-sans)", fontSize: 12, cursor: "pointer",
          display: "inline-flex", alignItems: "center", gap: 6,
        }}>
          <X size={12} /> Annuler
        </button>
        <button type="submit" disabled={submitting || !nom.trim() || filsRetenus.length < 2} style={{
          padding: "8px 16px", borderRadius: 999, border: "none",
          background: "var(--hub-foreground)", color: "var(--hub-bg)",
          fontFamily: "var(--font-sans)", fontSize: 12, fontWeight: 500,
          cursor: submitting || !nom.trim() || filsRetenus.length < 2 ? "default" : "pointer",
          opacity: submitting || !nom.trim() || filsRetenus.length < 2 ? 0.5 : 1,
          display: "inline-flex", alignItems: "center", gap: 6,
        }}>
          {submitting ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
          Créer la palette
        </button>
      </div>
    </form>
  );
}

function FilAddPicker({
  fils, alreadyIn, busy, onCancel, onPick,
}: {
  fils: HubFil[];
  alreadyIn: string[];
  busy: boolean;
  onCancel: () => void;
  onPick: (toId: string) => void;
}) {
  const [query, setQuery] = useState("");
  const candidates = useMemo(() => {
    const q = query.trim().toLowerCase();
    return fils
      .filter((f) => !alreadyIn.includes(f.id))
      .filter((f) => !f.archive)
      .filter((f) => !q || f.nom.toLowerCase().includes(q) || f.id.toLowerCase().includes(q) || (f.code_gunold || "").toLowerCase().includes(q))
      .sort((a, b) => a.nom.localeCompare(b.nom));
  }, [fils, alreadyIn, query]);

  return (
    <div style={{ padding: "12px", background: "white", border: "1px dashed var(--hub-border)", borderRadius: 10, display: "grid", gap: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
        <span style={{ fontFamily: "var(--font-sans)", fontSize: 11, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", opacity: 0.6 }}>
          Ajouter un fil à la palette
        </span>
        <button type="button" onClick={onCancel} disabled={busy} style={{
          padding: "3px 10px", borderRadius: 999, border: "0.5px solid var(--hub-border)",
          background: "white", fontFamily: "var(--font-sans)", fontSize: 10, cursor: "pointer",
          display: "inline-flex", alignItems: "center", gap: 4, color: "var(--hub-foreground)",
        }}>
          <X size={10} /> Annuler
        </button>
      </div>
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Filtrer par nom, id, code Gunold…"
        autoFocus
        style={{
          width: "100%", padding: "6px 10px", border: "0.5px solid var(--hub-border)",
          borderRadius: 8, fontFamily: "var(--font-sans)", fontSize: 12, background: "var(--hub-bg)",
          boxSizing: "border-box",
        }}
      />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))", gap: 6, maxHeight: 260, overflow: "auto" }}>
        {candidates.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => onPick(f.id)}
            disabled={busy}
            title={`Ajouter ${f.nom} à la palette`}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "6px 8px", borderRadius: 8,
              background: "white", border: "0.5px solid var(--hub-border)",
              cursor: busy ? "default" : "pointer", textAlign: "left",
              opacity: busy ? 0.5 : 1,
              fontFamily: "var(--font-sans)",
            }}
          >
            <span style={{
              width: 22, height: 22, borderRadius: "50%", background: f.hex,
              border: "0.5px solid rgba(0,0,0,0.08)", flexShrink: 0,
            }} />
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ fontSize: 12, fontWeight: 500, display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {f.nom}
              </span>
              <span style={{ fontSize: 9, opacity: 0.5, fontFamily: "var(--font-mono, monospace)" }}>{f.code_gunold}</span>
            </span>
          </button>
        ))}
        {candidates.length === 0 && (
          <p style={{ gridColumn: "1 / -1", fontSize: 11, opacity: 0.55, fontStyle: "italic", margin: 0 }}>
            {query ? <>Aucun fil trouvé pour <em>{query}</em>.</> : "Tous les fils actifs sont déjà dans cette palette."}
          </p>
        )}
      </div>
    </div>
  );
}
