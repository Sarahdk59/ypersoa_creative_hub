"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, Pencil, Plus, Trash2, Save, X, Watch, Shirt, AlignCenter, Settings, FileText, Hash, Tag, BookOpen, ScrollText, Ruler, Palette } from "lucide-react";
import type { ReglesBroderieRef, ReglePlacement } from "@/lib/atelier-da/referentiels-loader";

const ICONS: Record<string, React.ReactNode> = {
  Watch: <Watch size={20} strokeWidth={1.5} />,
  Shirt: <Shirt size={20} strokeWidth={1.5} />,
  AlignCenter: <AlignCenter size={20} strokeWidth={1.5} />,
  Settings: <Settings size={20} strokeWidth={1.5} />,
  FileText: <FileText size={20} strokeWidth={1.5} />,
  Hash: <Hash size={20} strokeWidth={1.5} />,
  Tag: <Tag size={20} strokeWidth={1.5} />,
  BookOpen: <BookOpen size={20} strokeWidth={1.5} />,
  ScrollText: <ScrollText size={20} strokeWidth={1.5} />,
  Ruler: <Ruler size={20} strokeWidth={1.5} />,
  Palette: <Palette size={20} strokeWidth={1.5} />,
};
const ICON_OPTIONS = Object.keys(ICONS);

export default function ReglesBroderiePage() {
  const [data, setData] = useState<ReglesBroderieRef | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const refresh = useCallback(async () => {
    const res = await fetch("/api/da/regles-broderie", { cache: "no-store" }).then((r) => r.json());
    if (!res.ok) throw new Error(res.error);
    setData(res.data);
  }, []);

  useEffect(() => {
    refresh()
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false));
  }, [refresh]);

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

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto" }}>
      <Link
        href="/atelier-production"
        style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          fontFamily: "var(--font-sans)", fontSize: 12,
          color: "var(--hub-foreground)", opacity: 0.6,
          textDecoration: "none", marginBottom: 24,
        }}
      >
        <ArrowLeft size={14} strokeWidth={1.6} /> Atelier Production
      </Link>

      <header style={{ marginBottom: 32, display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 24, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontFamily: "var(--font-editorial)", fontSize: 36, fontWeight: 500, margin: 0, marginBottom: 8 }}>
            Règles &amp; contraintes broderie
          </h1>
          <p style={{ fontFamily: "var(--font-sans)", fontSize: 13, color: "var(--hub-foreground)", opacity: 0.65, maxWidth: 720, margin: 0 }}>
            {data.placements.length} règles officielles Ypersoa. Source de vérité pour la prod Adriana et pour les générations IA (atelier-shooting, shooting-book). Last update : {data._meta.last_updated || "—"}.
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
          }}
        >
          <Plus size={13} /> Ajouter une règle
        </button>
      </header>

      {creating && (
        <NewPlacementForm
          onCancel={() => setCreating(false)}
          onSaved={async () => { await refresh(); setCreating(false); }}
        />
      )}

      <div style={{ display: "grid", gap: 20 }}>
        {data.placements.map((p) => (
          <PlacementCard key={p.id} placement={p} onSaved={refresh} />
        ))}
      </div>
    </div>
  );
}

function PlacementCard({ placement, onSaved }: { placement: ReglePlacement; onSaved: () => Promise<void> }) {
  const [editing, setEditing] = useState(false);

  return (
    <article
      style={{
        background: "white",
        border: "0.5px solid var(--hub-border)",
        borderRadius: 14,
        padding: 24,
      }}
    >
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 40, height: 40, borderRadius: 10,
              background: "var(--hub-foreground)", color: "var(--hub-bg)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            {ICONS[placement.icone || "Settings"] || ICONS.Settings}
          </div>
          <div>
            <h2 style={{ fontFamily: "var(--font-editorial)", fontSize: 22, fontWeight: 500, margin: 0, lineHeight: 1.1 }}>
              {placement.label}
            </h2>
            <p style={{ fontFamily: "var(--font-sans)", fontSize: 11, opacity: 0.5, margin: "2px 0 0 0" }}>
              <code>{placement.id}</code>
              {placement.dimension_axe && <> · axe {placement.dimension_axe}</>}
            </p>
          </div>
        </div>
        {!editing && (
          <div style={{ display: "flex", gap: 6 }}>
            <button
              type="button"
              onClick={() => setEditing(true)}
              style={{
                display: "inline-flex", alignItems: "center", gap: 4,
                padding: "6px 12px", borderRadius: 999,
                background: "white", border: "0.5px solid var(--hub-border)",
                fontFamily: "var(--font-sans)", fontSize: 12, cursor: "pointer",
                color: "var(--hub-foreground)",
              }}
            >
              <Pencil size={11} /> Éditer
            </button>
            <button
              type="button"
              onClick={async () => {
                if (!confirm(`Supprimer la règle "${placement.label}" ?`)) return;
                const res = await fetch(`/api/da/regles-broderie?id=${encodeURIComponent(placement.id)}`, { method: "DELETE" }).then((r) => r.json());
                if (!res.ok) { alert(res.error); return; }
                await onSaved();
              }}
              title="Supprimer cette règle"
              style={{
                display: "inline-flex", alignItems: "center",
                padding: "6px 10px", borderRadius: 999,
                background: "white", border: "0.5px solid var(--hub-border)",
                cursor: "pointer", color: "var(--hub-foreground)", opacity: 0.6,
              }}
            >
              <Trash2 size={11} />
            </button>
          </div>
        )}
      </header>

      {editing ? (
        <PlacementEditForm
          placement={placement}
          onCancel={() => setEditing(false)}
          onSaved={async () => { await onSaved(); setEditing(false); }}
        />
      ) : (
        <PlacementDisplay placement={placement} />
      )}
    </article>
  );
}

function PlacementDisplay({ placement }: { placement: ReglePlacement }) {
  const dims: Array<[string, string]> = [];
  if (placement.dimension_max_cm) dims.push(["Max", `${placement.dimension_max_cm} cm`]);
  if (placement.dimension_par_defaut_cm) dims.push(["Défaut", `${placement.dimension_par_defaut_cm} cm`]);
  if (placement.dimension_xxl_cm) dims.push(["2XL/3XL", `${placement.dimension_xxl_cm} cm`]);

  return (
    <div>
      {dims.length > 0 && (
        <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
          {dims.map(([label, val]) => (
            <span
              key={label}
              style={{
                display: "inline-flex", alignItems: "baseline", gap: 6,
                padding: "5px 12px", borderRadius: 8,
                background: "var(--hub-bg)", border: "0.5px solid var(--hub-border)",
                fontFamily: "var(--font-sans)", fontSize: 12,
              }}
            >
              <span style={{ opacity: 0.55, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</span>
              <strong style={{ fontWeight: 600 }}>{val}</strong>
            </span>
          ))}
        </div>
      )}

      <ul style={{ margin: 0, padding: "0 0 0 18px", fontFamily: "var(--font-sans)", fontSize: 13, lineHeight: 1.6, color: "var(--hub-foreground)" }}>
        {placement.regles.map((r, i) => (
          <li key={i}>{r}</li>
        ))}
      </ul>
      {placement.note && (
        <p style={{ marginTop: 14, padding: "10px 12px", background: "var(--hub-bg)", borderRadius: 8, fontFamily: "var(--font-sans)", fontSize: 12, opacity: 0.75, whiteSpace: "pre-wrap" }}>
          {placement.note}
        </p>
      )}
    </div>
  );
}

function PlacementEditForm({
  placement,
  onCancel,
  onSaved,
}: {
  placement: ReglePlacement;
  onCancel: () => void;
  onSaved: () => Promise<void>;
}) {
  const [regles, setRegles] = useState<string[]>(placement.regles.length ? placement.regles : [""]);
  const [note, setNote] = useState(placement.note ?? "");
  const [dimMax, setDimMax] = useState<string>(placement.dimension_max_cm != null ? String(placement.dimension_max_cm) : "");
  const [dimDefaut, setDimDefaut] = useState<string>(placement.dimension_par_defaut_cm != null ? String(placement.dimension_par_defaut_cm) : "");
  const [dimXxl, setDimXxl] = useState<string>(placement.dimension_xxl_cm != null ? String(placement.dimension_xxl_cm) : "");
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErr(null);
    try {
      const body: Record<string, unknown> = {
        placement_id: placement.id,
        regles: regles.map((r) => r.trim()).filter(Boolean),
        note: note.trim() || null,
        dimension_max_cm: dimMax ? parseFloat(dimMax) : null,
        dimension_par_defaut_cm: dimDefaut ? parseFloat(dimDefaut) : null,
        dimension_xxl_cm: dimXxl ? parseFloat(dimXxl) : null,
      };
      const res = await fetch("/api/da/regles-broderie", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
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
    padding: "8px 10px", border: "0.5px solid var(--hub-border)", borderRadius: 8,
    fontFamily: "var(--font-sans)", fontSize: 13, background: "white", width: "100%",
  };
  const labelStyle: React.CSSProperties = {
    fontFamily: "var(--font-sans)", fontSize: 11, fontWeight: 600,
    letterSpacing: "0.05em", textTransform: "uppercase", opacity: 0.6,
    display: "block", marginBottom: 4,
  };

  return (
    <form onSubmit={submit} style={{ display: "grid", gap: 14 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
        <div>
          <label style={labelStyle}>Max (cm)</label>
          <input type="number" step="0.1" value={dimMax} onChange={(e) => setDimMax(e.target.value)} placeholder="5.5" style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Défaut (cm)</label>
          <input type="number" step="0.1" value={dimDefaut} onChange={(e) => setDimDefaut(e.target.value)} placeholder="8" style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>2XL/3XL (cm)</label>
          <input type="number" step="0.1" value={dimXxl} onChange={(e) => setDimXxl(e.target.value)} placeholder="10" style={inputStyle} />
        </div>
      </div>

      <div>
        <label style={labelStyle}>Règles</label>
        <div style={{ display: "grid", gap: 6 }}>
          {regles.map((r, i) => (
            <div key={i} style={{ display: "flex", gap: 6 }}>
              <input
                type="text"
                value={r}
                onChange={(e) => {
                  const next = [...regles];
                  next[i] = e.target.value;
                  setRegles(next);
                }}
                placeholder="ex. Largeur max : 5,5 cm"
                style={inputStyle}
              />
              <button
                type="button"
                onClick={() => setRegles(regles.filter((_, j) => j !== i))}
                disabled={regles.length <= 1}
                style={{
                  padding: "0 10px", borderRadius: 8,
                  background: "white", border: "0.5px solid var(--hub-border)",
                  cursor: regles.length <= 1 ? "default" : "pointer",
                  opacity: regles.length <= 1 ? 0.4 : 1,
                }}
                title="Supprimer la règle"
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => setRegles([...regles, ""])}
            style={{
              padding: "6px 12px", borderRadius: 999,
              background: "white", border: "0.5px solid var(--hub-border)",
              fontFamily: "var(--font-sans)", fontSize: 12, cursor: "pointer",
              display: "inline-flex", alignItems: "center", gap: 4,
              justifySelf: "start", color: "var(--hub-foreground)",
            }}
          >
            <Plus size={11} /> Ajouter une règle
          </button>
        </div>
      </div>

      <div>
        <label style={labelStyle}>Note (optionnel)</label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          style={{ ...inputStyle, resize: "vertical" }}
          placeholder="ex. À valider avec Adriana sur tailles enfant."
        />
      </div>

      {err && <div style={{ color: "#a13a16", fontSize: 12, fontFamily: "var(--font-sans)" }}>{err}</div>}

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
        <button
          type="button"
          onClick={onCancel}
          disabled={submitting}
          style={{
            padding: "8px 16px", borderRadius: 999, border: "0.5px solid var(--hub-border)",
            background: "white", fontFamily: "var(--font-sans)", fontSize: 12, cursor: "pointer",
            display: "inline-flex", alignItems: "center", gap: 6,
          }}
        >
          <X size={12} /> Annuler
        </button>
        <button
          type="submit"
          disabled={submitting}
          style={{
            padding: "8px 16px", borderRadius: 999, border: "none",
            background: "var(--hub-foreground)", color: "var(--hub-bg)",
            fontFamily: "var(--font-sans)", fontSize: 12, fontWeight: 500,
            cursor: submitting ? "default" : "pointer", opacity: submitting ? 0.5 : 1,
            display: "inline-flex", alignItems: "center", gap: 6,
          }}
        >
          {submitting ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
          Enregistrer
        </button>
      </div>
    </form>
  );
}

function NewPlacementForm({ onCancel, onSaved }: { onCancel: () => void; onSaved: () => Promise<void> }) {
  const [label, setLabel] = useState("");
  const [id, setId] = useState("");
  const [icone, setIcone] = useState("Settings");
  const [firstRule, setFirstRule] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // auto-slug le id depuis le label
  const onLabelChange = (val: string) => {
    setLabel(val);
    const auto = val
      .normalize("NFD").replace(/[̀-ͯ]/g, "")
      .toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
    if (!id || id === slug(label)) setId(auto);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!label.trim() || !id.trim()) { setErr("Label et id requis"); return; }
    setSubmitting(true);
    setErr(null);
    try {
      const res = await fetch("/api/da/regles-broderie", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: id.trim(),
          label: label.trim(),
          icone,
          regles: firstRule.trim() ? [firstRule.trim()] : [],
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
    fontFamily: "var(--font-sans)", fontSize: 13, background: "white", width: "100%",
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
        padding: 24, marginBottom: 20, display: "grid", gap: 12,
      }}
    >
      <h3 style={{ fontFamily: "var(--font-editorial)", fontSize: 18, fontWeight: 500, margin: 0 }}>
        Nouvelle règle
      </h3>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 160px", gap: 10 }}>
        <div>
          <label style={labelStyle}>Label</label>
          <input type="text" value={label} onChange={(e) => onLabelChange(e.target.value)} placeholder='ex. "Tailles textiles"' style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>id (slug)</label>
          <input type="text" value={id} onChange={(e) => setId(e.target.value)} placeholder="tailles_textiles" style={{ ...inputStyle, fontFamily: "var(--font-mono, monospace)", fontSize: 12 }} />
        </div>
        <div>
          <label style={labelStyle}>Icône</label>
          <select value={icone} onChange={(e) => setIcone(e.target.value)} style={inputStyle}>
            {ICON_OPTIONS.map((i) => (<option key={i} value={i}>{i}</option>))}
          </select>
        </div>
      </div>
      <div>
        <label style={labelStyle}>Première règle (optionnel)</label>
        <input type="text" value={firstRule} onChange={(e) => setFirstRule(e.target.value)} placeholder='ex. "Tailles XS à 3XL"' style={inputStyle} />
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
        <button type="submit" disabled={submitting || !label.trim()} style={{
          padding: "8px 16px", borderRadius: 999, border: "none",
          background: "var(--hub-foreground)", color: "var(--hub-bg)",
          fontFamily: "var(--font-sans)", fontSize: 12, fontWeight: 500,
          cursor: submitting || !label.trim() ? "default" : "pointer",
          opacity: submitting || !label.trim() ? 0.5 : 1,
          display: "inline-flex", alignItems: "center", gap: 6,
        }}>
          {submitting ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
          Créer
        </button>
      </div>
    </form>
  );
}

function slug(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}
