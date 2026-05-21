"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, Check, AlertTriangle, X, Pencil, Star, Archive, ArchiveRestore, Plus, Save, Layers } from "lucide-react";
import type { HubFil, FilsRef, Palette } from "@/lib/atelier-da/referentiels-loader";

const FAVORIS_MAX = 8;
const CANONIQUES_MAX = 10;
const COLOR_FAVORI = "#E8B547"; // jaune doré (étoile B2C)
const COLOR_CANONIQUE = "#1E2D4A"; // navy ink (étoile machine TMEZ)

// Ordre famille pour tri par gamme colorée (neutres → bleus → verts → terre → rouges → roses → violets).
const FAMILLE_ORDER: Record<string, number> = {
  neutres_clairs: 1,
  neutres_chauds: 2,
  neutres_gris: 3,
  neutres_fonces: 4,
  bleus_fonces: 10,
  bleus_vifs: 11,
  bleus_profonds: 12,
  bleus_lumineux: 13,
  bleus_clairs: 14,
  bleus_verts: 15,
  verts_vifs: 20,
  verts: 21,
  verts_pastels: 22,
  jaunes_chauds: 30,
  oranges_terreux: 31,
  bruns_chauds: 32,
  rouges_vifs: 40,
  rouges_fonces: 41,
  roses_vifs: 50,
  roses_chauds: 51,
  roses_doux: 52,
  violets: 60,
  violets_doux: 61,
  violets_profonds: 62,
};
const familleRank = (f: string) => FAMILLE_ORDER[f] ?? 999;

export default function FilsPage() {
  const [data, setData] = useState<FilsRef | null>(null);
  const [palettes, setPalettes] = useState<Palette[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<HubFil | null>(null);
  const [creating, setCreating] = useState(false);

  const refresh = useCallback(async () => {
    const [filsRes, palettesRes] = await Promise.all([
      fetch("/api/da/fils", { cache: "no-store" }).then((r) => r.json()),
      fetch("/api/da/palettes", { cache: "no-store" }).then((r) => r.json()),
    ]);
    if (!filsRes.ok) throw new Error(filsRes.error);
    setData(filsRes.data);
    if (palettesRes.ok) setPalettes(palettesRes.data.palettes);
    if (selected) {
      const updated = filsRes.data.couleurs.find((c: HubFil) => c.id === selected.id);
      if (updated) setSelected(updated);
    }
  }, [selected]);

  useEffect(() => {
    refresh()
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { canoniquesTriees, gammeTriee, archivees } = useMemo(() => {
    if (!data) return { canoniquesTriees: [], gammeTriee: [], archivees: [] };
    const sortByGamme = (a: HubFil, b: HubFil) => {
      const fr = familleRank(a.famille) - familleRank(b.famille);
      if (fr !== 0) return fr;
      return a.rang - b.rang;
    };
    const actifs = data.couleurs.filter((c) => !c.archive);
    return {
      canoniquesTriees: actifs.filter((c) => c.canonique).sort(sortByGamme),
      gammeTriee: actifs.filter((c) => !c.canonique).sort(sortByGamme),
      archivees: data.couleurs.filter((c) => c.archive).sort(sortByGamme),
    };
  }, [data]);

  if (loading) {
    return (
      <div style={{ padding: 60, textAlign: "center" }}>
        <Loader2 size={32} className="animate-spin" strokeWidth={1.4} />
      </div>
    );
  }
  if (error || !data) {
    return <div style={{ padding: 24, color: "#a13a16" }}>Erreur : {error || "Référentiel non chargé"}</div>;
  }

  const validated = data.couleurs.filter(isValidated).length;
  const favoris = data.couleurs.filter((c) => c.favori).length;
  const canoniques = data.couleurs.filter((c) => c.canonique).length;

  return (
    <div style={{ maxWidth: 1400, margin: "0 auto" }}>
      <Link
        href="/atelier-production"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          fontFamily: "var(--font-sans)",
          fontSize: 12,
          color: "var(--hub-foreground)",
          opacity: 0.6,
          textDecoration: "none",
          marginBottom: 24,
        }}
      >
        <ArrowLeft size={14} strokeWidth={1.6} /> Atelier Production
      </Link>

      <header style={{ marginBottom: 32, display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 24, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontFamily: "var(--font-editorial)", fontSize: 36, fontWeight: 500, margin: 0, marginBottom: 8 }}>
            Référentiel fils Gunold
          </h1>
          <p style={{ fontFamily: "var(--font-sans)", fontSize: 13, color: "var(--hub-foreground)", opacity: 0.65, maxWidth: 720, margin: 0 }}>
            {data.couleurs.length} fils Ypersoa Hub · {validated} validés · <span style={{ color: COLOR_FAVORI, fontWeight: 600 }}>★ {favoris}/{FAVORIS_MAX} favoris</span> (exposés B2C ypersoa.fr) · <span style={{ color: COLOR_CANONIQUE, fontWeight: 600 }}>★ {canoniques}{canoniques > CANONIQUES_MAX ? ` (limite ${CANONIQUES_MAX})` : `/${CANONIQUES_MAX}`} canoniques</span> (chargés en permanence sur la TMEZ).
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
          <Plus size={13} /> Nouveau fil
        </button>
      </header>

      {creating && <NewFilForm onCancel={() => setCreating(false)} onSaved={async () => { await refresh(); setCreating(false); }} />}

      <section style={{ marginBottom: 40 }}>
        <h2 style={sectionHeaderStyle}>
          <Star size={14} fill={COLOR_CANONIQUE} stroke={COLOR_CANONIQUE} strokeWidth={1.4} />
          Fils canoniques TMEZ
          <span style={sectionCountStyle}>{canoniquesTriees.length}/{CANONIQUES_MAX} · chargés en permanence sur la machine, couvrent ~70% des commandes</span>
        </h2>
        {canoniquesTriees.length === 0 ? (
          <p style={emptyStyle}>Aucun fil canonique. Marque un fil <em>canonique TMEZ</em> depuis sa fiche.</p>
        ) : (
          <div style={gridStyle}>
            {canoniquesTriees.map((f) => (
              <FilCard key={f.id} fil={f} onClick={() => setSelected(f)} />
            ))}
          </div>
        )}
      </section>

      <section style={{ marginBottom: 40 }}>
        <h2 style={sectionHeaderStyle}>
          Gamme de fils
          <span style={sectionCountStyle}>{gammeTriee.length} fils · catalogue étendu (rotation TMEZ + R&D)</span>
        </h2>
        {gammeTriee.length === 0 ? (
          <p style={emptyStyle}>Tous les fils sont canoniques.</p>
        ) : (
          <div style={gridStyle}>
            {gammeTriee.map((f) => (
              <FilCard key={f.id} fil={f} onClick={() => setSelected(f)} />
            ))}
          </div>
        )}
      </section>

      <section style={{ paddingTop: 24, borderTop: "0.5px solid var(--hub-border)" }}>
        <h2 style={sectionHeaderStyle}>
          <Archive size={18} strokeWidth={1.4} />
          Archives
          <span style={sectionCountStyle}>{archivees.length} fil{archivees.length > 1 ? "s" : ""} testé{archivees.length > 1 ? "s" : ""} non validé{archivees.length > 1 ? "s" : ""}</span>
        </h2>
        {archivees.length === 0 ? (
          <p style={emptyStyle}>Aucun fil archivé. Quand tu testes une couleur et qu&apos;elle n&apos;est pas validée, marque-la <em>archivée</em> dans sa fiche.</p>
        ) : (
          <div style={{ ...gridStyle, opacity: 0.6 }}>
            {archivees.map((f) => (
              <FilCard key={f.id} fil={f} onClick={() => setSelected(f)} />
            ))}
          </div>
        )}
      </section>

      {selected && (
        <FilModal fil={selected} palettes={palettes} fils={data.couleurs} onClose={() => setSelected(null)} onSaved={refresh} />
      )}
    </div>
  );
}

function isValidated(f: HubFil): boolean {
  return (
    !!f.code_gunold &&
    !f.code_gunold.includes("TODO") &&
    !f.code_gunold.includes("TO_VALIDATE") &&
    !f.code_gunold.includes("OR")
  );
}

function FilCard({ fil, onClick }: { fil: HubFil; onClick: () => void }) {
  const validated = isValidated(fil);
  const codeShown = validated ? fil.code_gunold : null;

  return (
    <button
      type="button"
      onClick={onClick}
      className="canonique-card"
      style={{
        background: "white",
        border: "0.5px solid var(--hub-border)",
        borderRadius: 12,
        padding: 0,
        overflow: "hidden",
        cursor: "pointer",
        textAlign: "left",
        transition: "transform 200ms ease, box-shadow 200ms ease",
        display: "flex",
        flexDirection: "column",
        width: "100%",
        boxSizing: "border-box",
        position: "relative",
      }}
    >
      <div
        style={{
          width: "100%",
          aspectRatio: "1 / 1",
          background: fil.hex,
          borderBottom: "0.5px solid rgba(0,0,0,0.05)",
          position: "relative",
        }}
      >
        {fil.favori && (
          <span
            title="Favori — exposé sur ypersoa.fr (B2C)"
            style={{
              position: "absolute",
              top: 8,
              left: 8,
              background: "rgba(255,255,255,0.95)",
              borderRadius: 999,
              padding: "3px 8px 3px 6px",
              fontSize: 10,
              fontFamily: "var(--font-sans)",
              fontWeight: 600,
              color: COLOR_FAVORI,
              display: "inline-flex",
              alignItems: "center",
              gap: 3,
              backdropFilter: "blur(4px)",
              boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
              letterSpacing: "0.04em",
            }}
          >
            <Star size={11} fill={COLOR_FAVORI} stroke={COLOR_FAVORI} strokeWidth={1.4} />
            B2C
          </span>
        )}
        {fil.canonique && (
          <span
            title="Canonique — chargé en permanence sur la TMEZ"
            style={{
              position: "absolute",
              bottom: 8,
              left: 8,
              background: "rgba(255,255,255,0.95)",
              borderRadius: 999,
              padding: "3px 8px 3px 6px",
              fontSize: 10,
              fontFamily: "var(--font-sans)",
              fontWeight: 600,
              color: COLOR_CANONIQUE,
              display: "inline-flex",
              alignItems: "center",
              gap: 3,
              backdropFilter: "blur(4px)",
              boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
              letterSpacing: "0.04em",
            }}
          >
            <Star size={11} fill={COLOR_CANONIQUE} stroke={COLOR_CANONIQUE} strokeWidth={1.4} />
            TMEZ
          </span>
        )}
        {validated ? (
          <span
            style={{
              position: "absolute",
              top: 8,
              right: 8,
              background: "rgba(255,255,255,0.92)",
              borderRadius: 999,
              padding: "2px 8px",
              fontSize: 10,
              fontFamily: "var(--font-mono, monospace)",
              fontWeight: 600,
              color: "var(--hub-foreground)",
              backdropFilter: "blur(4px)",
            }}
          >
            {codeShown}
          </span>
        ) : (
          <span
            title="À saisir"
            style={{
              position: "absolute",
              top: 8,
              right: 8,
              background: "rgba(255,255,255,0.92)",
              borderRadius: 999,
              padding: "2px 6px",
              fontSize: 10,
              fontWeight: 600,
              color: "#c5660d",
              backdropFilter: "blur(4px)",
              display: "inline-flex",
              alignItems: "center",
              gap: 3,
            }}
          >
            <AlertTriangle size={10} /> TODO
          </span>
        )}
      </div>
      <div style={{ padding: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
          <h3 style={{ fontFamily: "var(--font-editorial)", fontSize: 18, fontWeight: 500, margin: 0 }}>
            {fil.nom}
          </h3>
          <span style={{ fontFamily: "var(--font-sans)", fontSize: 10, opacity: 0.5 }}>#{fil.rang}</span>
        </div>
        <p style={{ fontFamily: "var(--font-sans)", fontSize: 11, opacity: 0.6, margin: "4px 0 0 0" }}>
          {fil.famille.replace(/_/g, " ")}
        </p>
      </div>
    </button>
  );
}

function FilModal({
  fil,
  palettes,
  fils,
  onClose,
  onSaved,
}: {
  fil: HubFil;
  palettes: Palette[];
  fils: HubFil[];
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(30,45,74,0.4)",
        zIndex: 100,
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        padding: 32,
        overflow: "auto",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "white",
          borderRadius: 20,
          maxWidth: 720,
          width: "100%",
          padding: 32,
          position: "relative",
          maxHeight: "calc(100vh - 64px)",
          overflow: "auto",
        }}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Fermer"
          style={{
            position: "absolute",
            top: 16,
            right: 16,
            background: "var(--hub-bg)",
            border: "none",
            width: 36,
            height: 36,
            borderRadius: 999,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <X size={16} />
        </button>

        <div style={{ display: "grid", gridTemplateColumns: "200px 1fr", gap: 28, alignItems: "flex-start" }}>
          <div
            style={{
              aspectRatio: "1 / 1",
              background: fil.hex,
              borderRadius: 12,
              border: "0.5px solid rgba(0,0,0,0.08)",
            }}
          />

          <div>
            <h2 style={{ fontFamily: "var(--font-editorial)", fontSize: 32, fontWeight: 500, margin: 0, marginBottom: 4 }}>
              {fil.nom}
            </h2>
            <p style={{ fontFamily: "var(--font-sans)", fontSize: 12, opacity: 0.5, margin: 0, marginBottom: 20 }}>
              <code>{fil.id}</code> · rang {fil.rang} · famille {fil.famille.replace(/_/g, " ")}
            </p>

            {editing ? (
              <FilEditForm fil={fil} onCancel={() => setEditing(false)} onSaved={async () => { await onSaved(); setEditing(false); }} />
            ) : (
              <FilDetails fil={fil} palettes={palettes} fils={fils} onEdit={() => setEditing(true)} onSaved={onSaved} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function FilDetails({ fil, palettes, fils, onEdit, onSaved }: { fil: HubFil; palettes: Palette[]; fils: HubFil[]; onEdit: () => void; onSaved: () => Promise<void> }) {
  const palettesUtilisatrices = palettes.filter((p) => p.fils.includes(fil.id));
  const validated = isValidated(fil);
  const [togglingFlag, setTogglingFlag] = useState<"favori" | "canonique" | "archive" | null>(null);
  const [flagError, setFlagError] = useState<string | null>(null);

  const togglePatch = async (flag: "favori" | "canonique" | "archive") => {
    setTogglingFlag(flag);
    setFlagError(null);
    try {
      const res = await fetch(`/api/da/fils/${encodeURIComponent(fil.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [flag]: !fil[flag] }),
      }).then((r) => r.json());
      if (!res.ok) throw new Error(typeof res.error === "string" ? res.error : "Échec");
      await onSaved();
    } catch (e) {
      setFlagError(e instanceof Error ? e.message : String(e));
    } finally {
      setTogglingFlag(null);
    }
  };

  return (
    <>
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={() => togglePatch("favori")}
          disabled={togglingFlag !== null}
          style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            padding: "6px 14px", borderRadius: 999,
            background: fil.favori ? COLOR_FAVORI : "white",
            border: fil.favori ? "none" : "0.5px solid var(--hub-border)",
            fontFamily: "var(--font-sans)", fontSize: 12, fontWeight: 500,
            cursor: togglingFlag ? "default" : "pointer",
            color: fil.favori ? "white" : "var(--hub-foreground)",
            opacity: togglingFlag === "favori" ? 0.5 : 1,
          }}
        >
          {togglingFlag === "favori" ? <Loader2 size={12} className="animate-spin" /> : <Star size={12} fill={fil.favori ? "white" : "none"} />}
          {fil.favori ? "Favori — exposé B2C" : "Marquer favori"}
        </button>
        <button
          type="button"
          onClick={() => togglePatch("canonique")}
          disabled={togglingFlag !== null}
          style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            padding: "6px 14px", borderRadius: 999,
            background: fil.canonique ? COLOR_CANONIQUE : "white",
            border: fil.canonique ? "none" : "0.5px solid var(--hub-border)",
            fontFamily: "var(--font-sans)", fontSize: 12, fontWeight: 500,
            cursor: togglingFlag ? "default" : "pointer",
            color: fil.canonique ? "white" : "var(--hub-foreground)",
            opacity: togglingFlag === "canonique" ? 0.5 : 1,
          }}
        >
          {togglingFlag === "canonique" ? <Loader2 size={12} className="animate-spin" /> : <Star size={12} fill={fil.canonique ? "white" : "none"} />}
          {fil.canonique ? "Canonique TMEZ" : "Marquer canonique"}
        </button>
        <button
          type="button"
          onClick={() => togglePatch("archive")}
          disabled={togglingFlag !== null}
          style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            padding: "6px 14px", borderRadius: 999,
            background: fil.archive ? "#7a6c5e" : "white",
            border: fil.archive ? "none" : "0.5px solid var(--hub-border)",
            fontFamily: "var(--font-sans)", fontSize: 12, fontWeight: 500,
            cursor: togglingFlag ? "default" : "pointer",
            color: fil.archive ? "white" : "var(--hub-foreground)",
            opacity: togglingFlag === "archive" ? 0.5 : 1,
            marginLeft: "auto",
          }}
          title={fil.archive ? "Sortir des archives" : "Marquer comme archivé (testé non validé)"}
        >
          {togglingFlag === "archive" ? <Loader2 size={12} className="animate-spin" /> : (fil.archive ? <ArchiveRestore size={12} /> : <Archive size={12} />)}
          {fil.archive ? "Archivé — restaurer" : "Archiver"}
        </button>
      </div>
      {flagError && (
        <div style={{ color: "#a13a16", fontSize: 12, fontFamily: "var(--font-sans)", marginBottom: 12 }}>{flagError}</div>
      )}

      <div style={{ marginBottom: 20, padding: 16, background: "var(--hub-bg)", borderRadius: 12, border: "0.5px solid var(--hub-border)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <h4 style={sectionTitle}>Canonique Gunold-Poly</h4>
          <button
            type="button"
            onClick={onEdit}
            style={{
              display: "inline-flex", alignItems: "center", gap: 4,
              padding: "4px 10px", borderRadius: 999,
              background: "white", border: "0.5px solid var(--hub-border)",
              fontFamily: "var(--font-sans)", fontSize: 11, cursor: "pointer",
              color: "var(--hub-foreground)",
            }}
          >
            <Pencil size={11} /> Éditer
          </button>
        </div>
        <dl style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "6px 12px", margin: 0, fontFamily: "var(--font-sans)", fontSize: 12 }}>
          <dt style={dtStyle}>Hex</dt>
          <dd style={{ ...ddStyle, fontFamily: "var(--font-mono, monospace)" }}>{fil.hex}</dd>
          <dt style={dtStyle}>Code Gunold</dt>
          <dd style={{ ...ddStyle, fontFamily: "var(--font-mono, monospace)" }}>
            {validated ? (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                {fil.code_gunold} <Check size={12} color="#2f7a3e" />
              </span>
            ) : (
              <span style={{ color: "#c5660d", fontStyle: "italic" }}>{fil.code_gunold}</span>
            )}
          </dd>
          {fil.pantone_tpg && (<>
            <dt style={dtStyle}>Pantone TPG</dt>
            <dd style={{ ...ddStyle, fontFamily: "var(--font-mono, monospace)" }}>{fil.pantone_tpg}</dd>
          </>)}
        </dl>
      </div>

      <dl style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "6px 12px", margin: 0, fontFamily: "var(--font-sans)", fontSize: 12 }}>
        <dt style={dtStyle}>Usage</dt>
        <dd style={ddStyle}>{fil.usage_recommande ? fil.usage_recommande.replace(/_/g, " ") : "—"}</dd>
        <dt style={dtStyle}>Ambiance</dt>
        <dd style={ddStyle}>{fil.ambiance_editoriale?.length ? fil.ambiance_editoriale.join(", ") : "—"}</dd>
        <dt style={dtStyle}>Supports incompat.</dt>
        <dd style={ddStyle}>{fil.supports_incompatibles?.length ? fil.supports_incompatibles.join(", ") : "—"}</dd>
        {fil.note_prod && (<>
          <dt style={dtStyle}>Note prod</dt>
          <dd style={{ ...ddStyle, whiteSpace: "pre-wrap" }}>{fil.note_prod}</dd>
        </>)}
      </dl>

      {palettesUtilisatrices.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <h4 style={{ ...sectionTitle, marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
            <Layers size={11} strokeWidth={1.5} />
            Présent dans ({palettesUtilisatrices.length} palette{palettesUtilisatrices.length > 1 ? "s" : ""})
          </h4>
          <div style={{ display: "grid", gap: 6 }}>
            {palettesUtilisatrices.map((p) => {
              const swatches = p.fils.map((id) => fils.find((f) => f.id === id)).filter((f): f is HubFil => Boolean(f));
              return (
                <Link
                  key={p.id}
                  href={`/atelier-production/palettes#${encodeURIComponent(p.id)}`}
                  style={{
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "8px 10px",
                    background: "white",
                    border: "0.5px solid var(--hub-border)",
                    borderRadius: 10,
                    textDecoration: "none",
                    color: "var(--hub-foreground)",
                    opacity: p.archive ? 0.55 : 1,
                  }}
                >
                  <div style={{ display: "flex", height: 22, width: 88, borderRadius: 5, overflow: "hidden", border: "0.5px solid rgba(0,0,0,0.06)", flexShrink: 0 }}>
                    {swatches.map((s) => (
                      <div
                        key={s.id}
                        style={{
                          flex: 1, background: s.hex,
                          outline: s.id === fil.id ? "1.5px solid var(--hub-foreground)" : "none",
                          outlineOffset: -1.5,
                        }}
                      />
                    ))}
                  </div>
                  <div style={{ flex: 1, fontFamily: "var(--font-sans)" }}>
                    <div style={{ fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
                      {p.nom}
                      {p.archive && <span style={{ fontSize: 9, opacity: 0.6, fontStyle: "italic", fontWeight: 400 }}>archivée</span>}
                    </div>
                    <div style={{ fontSize: 10, opacity: 0.55 }}>
                      <code>{p.id}</code> · {p.type} · {p.fils.length} fils
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}

function FilEditForm({
  fil,
  onCancel,
  onSaved,
}: {
  fil: HubFil;
  onCancel: () => void;
  onSaved: () => Promise<void>;
}) {
  const [nom, setNom] = useState(fil.nom || "");
  const [famille, setFamille] = useState(fil.famille || "");
  const [code, setCode] = useState(isValidated(fil) ? fil.code_gunold : "");
  const [hex, setHex] = useState(fil.hex || "#000000");
  const [pantone, setPantone] = useState(fil.pantone_tpg || "");
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nom.trim()) { setErr("Nom requis"); return; }
    if (!famille.trim()) { setErr("Famille requise"); return; }
    // Validation hex côté client
    if (hex && !/^#[0-9A-Fa-f]{6}$/.test(hex.trim())) {
      setErr("Hex invalide — format attendu : #RRGGBB");
      return;
    }
    setSubmitting(true);
    setErr(null);
    try {
      const res = await fetch(`/api/da/fils/${encodeURIComponent(fil.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nom: nom.trim(),
          famille: famille.trim(),
          code_gunold: code.trim() || null,
          hex: hex.trim() || null,
          pantone_tpg: pantone.trim() || null,
        }),
      }).then((r) => r.json());
      if (!res.ok) throw new Error(typeof res.error === "string" ? res.error : "Échec");
      await onSaved();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setSubmitting(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "8px 10px",
    border: "0.5px solid var(--hub-border)",
    borderRadius: 8,
    fontFamily: "var(--font-mono, monospace)",
    fontSize: 13,
    background: "white",
    boxSizing: "border-box",
  };
  const labelStyle: React.CSSProperties = {
    fontFamily: "var(--font-sans)", fontSize: 11, fontWeight: 600,
    letterSpacing: "0.05em", textTransform: "uppercase", opacity: 0.6,
    display: "block", marginBottom: 4,
  };

  return (
    <form
      onSubmit={submit}
      style={{ marginBottom: 20, padding: 16, background: "var(--hub-bg)", borderRadius: 12, border: "0.5px solid var(--hub-border)", display: "grid", gap: 12 }}
    >
      <h4 style={sectionTitle}>Canonique Gunold-Poly — éditer</h4>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <div>
          <label style={labelStyle}>Nom</label>
          <input
            type="text" value={nom} onChange={(e) => setNom(e.target.value)}
            placeholder='ex. "Aubergine"' autoFocus
            style={{ ...inputStyle, fontFamily: "var(--font-sans)" }}
          />
        </div>
        <div>
          <label style={labelStyle}>Famille</label>
          <input
            type="text" value={famille} onChange={(e) => setFamille(e.target.value)}
            placeholder='ex. "violets_profonds"'
            list="fil-familles-existantes"
            style={{ ...inputStyle, fontFamily: "var(--font-mono, monospace)", fontSize: 12 }}
          />
          <datalist id="fil-familles-existantes">
            {Object.keys(FAMILLE_ORDER).map((fam) => (
              <option key={fam} value={fam} />
            ))}
            <option value="autre" />
          </datalist>
        </div>
      </div>

      <div>
        <label style={labelStyle}>Code Gunold (ex. 61044)</label>
        <input
          type="text" value={code} onChange={(e) => setCode(e.target.value)}
          placeholder="ex. 61044" style={inputStyle}
        />
      </div>

      <div>
        <label style={labelStyle}>Hex (couleur d'affichage)</label>
        <div style={{ display: "grid", gridTemplateColumns: "44px 1fr", gap: 8, alignItems: "center" }}>
          <input
            type="color"
            value={hex}
            onChange={(e) => setHex(e.target.value.toUpperCase())}
            style={{
              width: 44, height: 36, padding: 0,
              border: "0.5px solid var(--hub-border)",
              borderRadius: 8, cursor: "pointer", background: "white",
            }}
            title="Color picker"
          />
          <input
            type="text"
            value={hex}
            onChange={(e) => setHex(e.target.value.toUpperCase())}
            placeholder="#A6533A"
            style={inputStyle}
          />
        </div>
      </div>

      <div>
        <label style={labelStyle}>Pantone TPG (optionnel)</label>
        <input
          type="text" value={pantone} onChange={(e) => setPantone(e.target.value)}
          placeholder='ex. "18-1340 TPG"' style={inputStyle}
        />
        <p style={{ fontFamily: "var(--font-sans)", fontSize: 10, opacity: 0.55, margin: "6px 0 0 0", fontStyle: "italic" }}>
          Référence Pantone Textile Paper Greys (ex. <code>19-4203 TPG</code>).
        </p>
      </div>

      {err && <div style={{ color: "#a13a16", fontSize: 12, fontFamily: "var(--font-sans)" }}>{err}</div>}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
        <button type="button" onClick={onCancel} disabled={submitting} style={{
          padding: "8px 16px", borderRadius: 999, border: "0.5px solid var(--hub-border)",
          background: "white", fontFamily: "var(--font-sans)", fontSize: 12, cursor: "pointer",
        }}>Annuler</button>
        <button type="submit" disabled={submitting} style={{
          padding: "8px 16px", borderRadius: 999, border: "none",
          background: "var(--hub-foreground)", color: "var(--hub-bg)",
          fontFamily: "var(--font-sans)", fontSize: 12, fontWeight: 500,
          cursor: submitting ? "default" : "pointer", opacity: submitting ? 0.5 : 1,
          display: "inline-flex", alignItems: "center", gap: 6,
        }}>
          {submitting ? <Loader2 size={13} className="animate-spin" /> : null}
          Enregistrer
        </button>
      </div>
    </form>
  );
}

const dtStyle: React.CSSProperties = {
  fontWeight: 600, opacity: 0.55, fontSize: 11, textTransform: "uppercase",
  letterSpacing: "0.05em", margin: 0, alignSelf: "start",
};
const ddStyle: React.CSSProperties = { margin: 0, color: "var(--hub-foreground)" };
const sectionTitle: React.CSSProperties = {
  fontFamily: "var(--font-sans)", fontSize: 11, fontWeight: 600,
  letterSpacing: "0.06em", textTransform: "uppercase", opacity: 0.55, margin: 0,
};

const sectionHeaderStyle: React.CSSProperties = {
  fontFamily: "var(--font-editorial)", fontSize: 22, fontWeight: 500,
  letterSpacing: "-0.01em", color: "var(--hub-foreground)",
  margin: "0 0 16px 0", display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap",
};
const sectionCountStyle: React.CSSProperties = {
  fontFamily: "var(--font-sans)", fontSize: 12, fontWeight: 400,
  color: "var(--hub-foreground)", opacity: 0.55, letterSpacing: 0,
};
const gridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
  gap: 16,
};
const emptyStyle: React.CSSProperties = {
  fontFamily: "var(--font-sans)", fontSize: 12, opacity: 0.55,
  fontStyle: "italic", margin: 0, padding: "12px 0",
};

function NewFilForm({ onCancel, onSaved }: { onCancel: () => void; onSaved: () => Promise<void> }) {
  const [nom, setNom] = useState("");
  const [code, setCode] = useState("");
  const [hex, setHex] = useState("");
  const [pantone, setPantone] = useState("");
  const [famille, setFamille] = useState("");
  const [lookupStatus, setLookupStatus] = useState<"idle" | "loading" | "found" | "notfound">("idle");
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Lookup auto du hex quand le code Gunold change (debounced via blur)
  const doLookup = async (codeVal: string) => {
    const c = codeVal.trim();
    if (!c) { setLookupStatus("idle"); return; }
    setLookupStatus("loading");
    try {
      const res = await fetch(`/api/da/gunold-catalog?code=${encodeURIComponent(c)}`).then((r) => r.json());
      if (res.ok && res.data?.hex) {
        setHex(res.data.hex);
        setLookupStatus("found");
      } else {
        setLookupStatus("notfound");
      }
    } catch {
      setLookupStatus("notfound");
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nom.trim()) { setErr("Nom requis"); return; }
    if (!code.trim()) { setErr("Code Gunold requis"); return; }
    setSubmitting(true);
    setErr(null);
    try {
      const res = await fetch("/api/da/fils", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nom: nom.trim(),
          code_gunold: code.trim(),
          hex: hex.trim() || undefined,
          pantone_tpg: pantone.trim() || undefined,
          famille: famille.trim() || undefined,
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
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{
          width: 44, height: 44, borderRadius: "50%",
          background: /^#[0-9A-F]{6}$/i.test(hex) ? hex : "var(--hub-bg)",
          border: "0.5px solid var(--hub-border)", flexShrink: 0,
          transition: "background 200ms ease",
        }} />
        <h3 style={{ fontFamily: "var(--font-editorial)", fontSize: 22, fontWeight: 500, margin: 0 }}>
          Nouveau fil
        </h3>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
        <div>
          <label style={labelStyle}>Nom</label>
          <input type="text" value={nom} onChange={(e) => setNom(e.target.value)} placeholder='ex. "Blush"' style={inputStyle} autoFocus />
        </div>
        <div>
          <label style={labelStyle}>Code Gunold</label>
          <input
            type="text" value={code}
            onChange={(e) => { setCode(e.target.value); setLookupStatus("idle"); }}
            onBlur={(e) => doLookup(e.target.value)}
            placeholder="ex. 61081"
            style={{ ...inputStyle, fontFamily: "var(--font-mono, monospace)" }}
          />
          <p style={{ fontFamily: "var(--font-sans)", fontSize: 10, opacity: 0.6, margin: "4px 0 0 0", fontStyle: "italic" }}>
            {lookupStatus === "loading" && "Recherche…"}
            {lookupStatus === "found" && <span style={{ color: "#2f7a3e" }}>✓ Hex trouvé dans le catalogue Gunold</span>}
            {lookupStatus === "notfound" && <span style={{ color: "#c5660d" }}>Code inconnu — saisis le hex manuellement</span>}
            {lookupStatus === "idle" && "Auto-lookup au blur · 300 codes connus"}
          </p>
        </div>
        <div>
          <label style={labelStyle}>Famille (libre)</label>
          <input type="text" value={famille} onChange={(e) => setFamille(e.target.value)} placeholder='ex. "roses_doux"' style={inputStyle} />
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <div>
          <label style={labelStyle}>Hex {lookupStatus === "found" && <span style={{ opacity: 0.6, textTransform: "none", letterSpacing: 0, fontWeight: 400 }}>(auto)</span>}</label>
          <div style={{ display: "grid", gridTemplateColumns: "44px 1fr", gap: 8, alignItems: "center" }}>
            <input
              type="color"
              value={/^#[0-9A-F]{6}$/i.test(hex) ? hex : "#000000"}
              onChange={(e) => setHex(e.target.value.toUpperCase())}
              style={{ width: 44, height: 36, padding: 0, border: "0.5px solid var(--hub-border)", borderRadius: 8, cursor: "pointer", background: "white" }}
            />
            <input
              type="text" value={hex}
              onChange={(e) => setHex(e.target.value.toUpperCase())}
              placeholder="#A6533A"
              style={{ ...inputStyle, fontFamily: "var(--font-mono, monospace)" }}
            />
          </div>
        </div>
        <div>
          <label style={labelStyle}>Pantone TPG (optionnel)</label>
          <input type="text" value={pantone} onChange={(e) => setPantone(e.target.value)} placeholder='ex. "18-1340 TPG"' style={inputStyle} />
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
        <button type="submit" disabled={submitting || !nom.trim() || !code.trim()} style={{
          padding: "8px 16px", borderRadius: 999, border: "none",
          background: "var(--hub-foreground)", color: "var(--hub-bg)",
          fontFamily: "var(--font-sans)", fontSize: 12, fontWeight: 500,
          cursor: submitting || !nom.trim() || !code.trim() ? "default" : "pointer",
          opacity: submitting || !nom.trim() || !code.trim() ? 0.5 : 1,
          display: "inline-flex", alignItems: "center", gap: 6,
        }}>
          {submitting ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
          Créer
        </button>
      </div>
    </form>
  );
}
