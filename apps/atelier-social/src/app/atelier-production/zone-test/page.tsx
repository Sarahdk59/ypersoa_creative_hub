"use client";

/**
 * Zone de test broderie — dépôt des fichiers DST/PXF + aperçu JPG des tests à faire,
 * attribution (Adriana / Rebecca / Cyrielle) et suivi par phase.
 *
 * Board à 5 colonnes (phases) : En réception → En machine → Modification à prévoir
 * → Modification faite (le ../../..) → Validé. On glisse un test (← →) pour avancer.
 */
import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import {
  ArrowLeft, Loader2, Plus, X, ChevronLeft, ChevronRight, Trash2, Pencil, Save,
  Download, Upload, FileBox, Image as ImageIcon, User,
} from "lucide-react";
import type {
  ZoneTestRef, ZoneTest, ZoneTestPhaseMeta, ZoneTestFileKind,
} from "@/lib/production/zone-test-loader";

const PHASES: ZoneTestPhaseMeta[] = [
  { id: "reception", numero: 1, label: "En réception", couleur: "#B5B0A6" },
  { id: "machine", numero: 2, label: "En machine", couleur: "#176B7A" },
  { id: "modif_a_prevoir", numero: 3, label: "Modification à prévoir", couleur: "#E8B547" },
  { id: "modif_faite", numero: 4, label: "Modification faite", couleur: "#6F8E70" },
  { id: "valide", numero: 5, label: "Validé", couleur: "#2F7A3E" },
];
const ASSIGNEES = ["Adriana", "Rebecca", "Cyrielle"] as const;

const KIND_META: Record<ZoneTestFileKind, { label: string; accept: string; icon: React.ReactNode }> = {
  dst: { label: "DST", accept: ".dst", icon: <FileBox size={11} /> },
  pxf: { label: "PXF", accept: ".pxf", icon: <FileBox size={11} /> },
  jpg: { label: "Aperçu JPG/PNG", accept: "image/png,image/jpeg,.png,.jpg,.jpeg", icon: <ImageIcon size={11} /> },
};

function fmtSize(n: number) {
  if (n < 1024) return `${n} o`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} Ko`;
  return `${(n / 1024 / 1024).toFixed(1)} Mo`;
}

export default function ZoneTestPage() {
  const [data, setData] = useState<ZoneTestRef | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const res = await fetch("/api/production/zone-test", { cache: "no-store" }).then((r) => r.json());
    if (!res.ok) throw new Error(res.error);
    setData(res.data);
  }, []);

  useEffect(() => {
    refresh()
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false));
  }, [refresh]);

  if (loading) {
    return <div style={{ padding: 60, textAlign: "center" }}><Loader2 size={32} className="animate-spin" strokeWidth={1.4} /></div>;
  }
  if (error || !data) {
    return <div style={{ padding: 24, color: "#a13a16" }}>Erreur : {error || "Référentiel non chargé"}</div>;
  }

  const total = data.tests.length;

  return (
    <div style={{ maxWidth: "100%", margin: "0 auto" }}>
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

      <header style={{ marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 16, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontFamily: "var(--font-editorial)", fontSize: 36, fontWeight: 500, margin: 0, marginBottom: 8 }}>
            Zone de test
          </h1>
          <p style={{ fontFamily: "var(--font-sans)", fontSize: 13, color: "var(--hub-foreground)", opacity: 0.65, maxWidth: 760, margin: 0 }}>
            {total} test{total > 1 ? "s" : ""} · Dépose les <strong>DST / PXF</strong> et un <strong>aperçu JPG</strong>, attribue le test à
            Adriana, Rebecca ou Cyrielle, et suis l&apos;avancement de la réception à la validation. Glisse un test (← →) pour changer de phase.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setAdding(true)}
          style={{ ...btnPrimaryStyle, padding: "8px 14px", fontSize: 12 }}
        >
          <Plus size={14} /> Nouveau test
        </button>
      </header>

      {adding && (
        <div style={{ marginBottom: 20, maxWidth: 480 }}>
          <NewTestForm onCancel={() => setAdding(false)} onSaved={async () => { await refresh(); setAdding(false); }} />
        </div>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${PHASES.length}, minmax(230px, 1fr))`,
          gap: 14,
          alignItems: "start",
        }}
      >
        {PHASES.map((phase) => {
          const tests = data.tests.filter((t) => t.phase === phase.id);
          return (
            <PhaseColumn
              key={phase.id}
              phase={phase}
              tests={tests}
              editingId={editingId}
              onEdit={setEditingId}
              onSaved={refresh}
            />
          );
        })}
      </div>
    </div>
  );
}

function PhaseColumn({
  phase, tests, editingId, onEdit, onSaved,
}: {
  phase: ZoneTestPhaseMeta;
  tests: ZoneTest[];
  editingId: string | null;
  onEdit: (id: string | null) => void;
  onSaved: () => Promise<void>;
}) {
  return (
    <div
      style={{
        background: "var(--hub-bg)",
        border: "0.5px solid var(--hub-border)",
        borderRadius: 12,
        padding: 12,
        minHeight: 200,
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      <header style={{ display: "flex", alignItems: "center", gap: 8, padding: "2px 4px 8px", borderBottom: `1.5px solid ${phase.couleur}` }}>
        <span style={{ fontFamily: "var(--font-sans)", fontSize: 9, fontWeight: 700, color: "white", background: phase.couleur, borderRadius: 999, padding: "2px 6px" }}>
          {phase.numero}
        </span>
        <h3 style={{ fontFamily: "var(--font-sans)", fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--hub-foreground)", margin: 0 }}>
          {phase.label}
        </h3>
        <span style={{ fontFamily: "var(--font-sans)", fontSize: 10, opacity: 0.5, marginLeft: "auto" }}>{tests.length}</span>
      </header>

      {tests.length === 0 && (
        <p style={{ fontFamily: "var(--font-sans)", fontSize: 11, opacity: 0.4, fontStyle: "italic", margin: 0, padding: "8px 4px" }}>
          Aucun test
        </p>
      )}

      {tests.map((test) => (
        <TestCard
          key={test.id}
          test={test}
          editing={editingId === test.id}
          onStartEdit={() => onEdit(test.id)}
          onCancelEdit={() => onEdit(null)}
          onSaved={async () => { await onSaved(); onEdit(null); }}
        />
      ))}
    </div>
  );
}

function TestCard({
  test, editing, onStartEdit, onCancelEdit, onSaved,
}: {
  test: ZoneTest;
  editing: boolean;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSaved: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const phaseIdx = PHASES.findIndex((p) => p.id === test.phase);
  const prevPhase = phaseIdx > 0 ? PHASES[phaseIdx - 1] : null;
  const nextPhase = phaseIdx < PHASES.length - 1 ? PHASES[phaseIdx + 1] : null;

  const patch = async (payload: Partial<ZoneTest>) => {
    setBusy(true);
    try {
      const res = await fetch("/api/production/zone-test", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: test.id, ...payload }),
      }).then((r) => r.json());
      if (!res.ok) throw new Error(res.error);
      await onSaved();
    } catch (e) {
      alert(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!confirm(`Supprimer le test "${test.titre}" et ses fichiers ?`)) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/production/zone-test?id=${encodeURIComponent(test.id)}`, { method: "DELETE" }).then((r) => r.json());
      if (!res.ok) throw new Error(res.error);
      await onSaved();
    } finally {
      setBusy(false);
    }
  };

  if (editing) return <EditTestForm test={test} onCancel={onCancelEdit} onSaved={onSaved} />;

  const jpgFiles = test.files.filter((f) => f.kind === "jpg");
  const otherFiles = test.files.filter((f) => f.kind !== "jpg");

  return (
    <article
      style={{
        background: "white",
        borderRadius: 8,
        padding: 10,
        boxShadow: "0 1px 2px rgba(0,0,0,0.05), 0 0 0 0.5px rgba(0,0,0,0.04)",
        fontFamily: "var(--font-sans)",
        opacity: busy ? 0.5 : 1,
      }}
    >
      {/* attribution */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
        <User size={11} style={{ opacity: 0.5 }} />
        {test.assignee ? (
          <span style={{ fontSize: 10, fontWeight: 600, padding: "1px 8px", background: "var(--hub-foreground)", color: "var(--hub-bg)", borderRadius: 999 }}>
            {test.assignee}
          </span>
        ) : (
          <span style={{ fontSize: 10, opacity: 0.5, fontStyle: "italic" }}>Non attribué</span>
        )}
        {test.motif_ypm && (
          <span style={{ marginLeft: "auto", fontSize: 9, padding: "1px 6px", background: "rgba(0,0,0,0.06)", borderRadius: 999, opacity: 0.75 }}>
            {test.motif_ypm}
          </span>
        )}
      </div>

      <h4 style={{ fontFamily: "var(--font-editorial)", fontSize: 14, fontWeight: 500, color: "var(--hub-foreground)", margin: "0 0 4px 0", lineHeight: 1.3 }}>
        {test.titre}
      </h4>
      {test.description && (
        <p style={{ margin: "4px 0 6px 0", fontSize: 11, lineHeight: 1.4, color: "var(--hub-foreground)", opacity: 0.8, whiteSpace: "pre-wrap" }}>
          {test.description}
        </p>
      )}

      {/* "Modification faite le …" sur la phase 4 */}
      {test.phase === "modif_faite" && (
        <ModifDateRow test={test} onPatch={patch} />
      )}

      {/* aperçus JPG */}
      {jpgFiles.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
          {jpgFiles.map((f) => (
            <div key={f.id} style={{ position: "relative" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/api/production/zone-test/${encodeURIComponent(test.id)}/file/${encodeURIComponent(f.id)}?inline=1&v=${encodeURIComponent(test.updated_at)}`}
                alt={f.original_name}
                style={{ width: "100%", maxHeight: 150, objectFit: "contain", borderRadius: 6, border: "0.5px solid rgba(0,0,0,0.1)", background: "var(--hub-bg)" }}
              />
              <div style={{ display: "flex", gap: 4, marginTop: 3 }}>
                <a href={`/api/production/zone-test/${encodeURIComponent(test.id)}/file/${encodeURIComponent(f.id)}`} style={fileBtnStyle}>
                  <Download size={10} /> {f.original_name.length > 18 ? "Aperçu" : f.original_name}
                </a>
                <RemoveFileBtn testId={test.id} fileId={f.id} onSaved={onSaved} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* fichiers DST / PXF */}
      {otherFiles.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 6 }}>
          {otherFiles.map((f) => (
            <div key={f.id} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <a href={`/api/production/zone-test/${encodeURIComponent(test.id)}/file/${encodeURIComponent(f.id)}`} style={{ ...fileBtnStyle, flex: 1 }}>
                <Download size={10} />
                <span style={{ fontWeight: 600 }}>{f.kind.toUpperCase()}</span>
                <span style={{ opacity: 0.6, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.original_name}</span>
                <span style={{ marginLeft: "auto", opacity: 0.45, fontSize: 9 }}>{fmtSize(f.size)}</span>
              </a>
              <RemoveFileBtn testId={test.id} fileId={f.id} onSaved={onSaved} />
            </div>
          ))}
        </div>
      )}

      {/* upload */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 8 }}>
        {(Object.keys(KIND_META) as ZoneTestFileKind[]).map((kind) => (
          <UploadFileBtn key={kind} testId={test.id} kind={kind} onSaved={onSaved} />
        ))}
      </div>

      {/* pied : date + déplacement phase + actions */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8, fontSize: 10, opacity: 0.55 }}>
        <span>{test.updated_at}</span>
        <div style={{ display: "flex", gap: 2 }}>
          {prevPhase && (
            <button type="button" onClick={() => patch({ phase: prevPhase.id })} disabled={busy} title={`Phase ${prevPhase.numero} · ${prevPhase.label}`} style={iconBtnStyle}>
              <ChevronLeft size={12} />
            </button>
          )}
          {nextPhase && (
            <button type="button" onClick={() => patch({ phase: nextPhase.id })} disabled={busy} title={`Phase ${nextPhase.numero} · ${nextPhase.label}`} style={iconBtnStyle}>
              <ChevronRight size={12} />
            </button>
          )}
          <button type="button" onClick={onStartEdit} disabled={busy} title="Éditer" style={iconBtnStyle}>
            <Pencil size={11} />
          </button>
          <button type="button" onClick={remove} disabled={busy} title="Supprimer" style={iconBtnStyle}>
            <Trash2 size={11} />
          </button>
        </div>
      </div>
    </article>
  );
}

function ModifDateRow({ test, onPatch }: { test: ZoneTest; onPatch: (p: Partial<ZoneTest>) => Promise<void> }) {
  const [editing, setEditing] = useState(false);
  const [date, setDate] = useState(test.modif_faite_le || new Date().toISOString().slice(0, 10));
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6, fontSize: 11, color: "#3F6B45" }}>
      {editing ? (
        <>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={{ ...inputStyle, padding: "3px 6px", width: "auto", fontSize: 11 }} />
          <button type="button" onClick={async () => { await onPatch({ modif_faite_le: date }); setEditing(false); }} style={iconBtnStyle} title="Enregistrer la date">
            <Save size={12} />
          </button>
        </>
      ) : (
        <>
          <span style={{ fontWeight: 600 }}>✓ Modification faite le</span>
          <span>{test.modif_faite_le ? new Date(test.modif_faite_le).toLocaleDateString("fr-FR") : "—"}</span>
          <button type="button" onClick={() => setEditing(true)} style={iconBtnStyle} title="Modifier la date">
            <Pencil size={10} />
          </button>
        </>
      )}
    </div>
  );
}

function UploadFileBtn({ testId, kind, onSaved }: { testId: string; kind: ZoneTestFileKind; onSaved: () => Promise<void> }) {
  const [uploading, setUploading] = useState(false);
  const ref = useRef<HTMLInputElement>(null);
  const meta = KIND_META[kind];

  const upload = async (file: File) => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("kind", kind);
      const res = await fetch(`/api/production/zone-test/${encodeURIComponent(testId)}/file`, { method: "POST", body: fd }).then((r) => r.json());
      if (!res.ok) throw new Error(res.error);
      await onSaved();
    } catch (e) {
      alert(e instanceof Error ? e.message : String(e));
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
      <input
        ref={ref}
        type="file"
        accept={meta.accept}
        style={{ display: "none" }}
        onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ""; }}
      />
      <button
        type="button"
        onClick={() => ref.current?.click()}
        disabled={uploading}
        style={{
          display: "inline-flex", alignItems: "center", gap: 4,
          padding: "4px 9px", borderRadius: 999, border: "0.5px dashed rgba(0,0,0,0.25)",
          background: "transparent", fontFamily: "var(--font-sans)", fontSize: 10, cursor: "pointer",
          color: "var(--hub-foreground)", opacity: 0.75,
        }}
      >
        {uploading ? <Loader2 size={11} className="animate-spin" /> : <Upload size={11} />} {meta.label}
      </button>
    </>
  );
}

function RemoveFileBtn({ testId, fileId, onSaved }: { testId: string; fileId: string; onSaved: () => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  const remove = async () => {
    if (!confirm("Retirer ce fichier ?")) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/production/zone-test/${encodeURIComponent(testId)}/file/${encodeURIComponent(fileId)}`, { method: "DELETE" }).then((r) => r.json());
      if (!res.ok) throw new Error(res.error);
      await onSaved();
    } catch (e) {
      alert(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <button type="button" onClick={remove} disabled={busy} title="Retirer le fichier" style={iconBtnStyle}>
      {busy ? <Loader2 size={11} className="animate-spin" /> : <Trash2 size={11} />}
    </button>
  );
}

function AssigneePicker({ value, onChange }: { value: string | undefined; onChange: (v: string | undefined) => void }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
      {ASSIGNEES.map((a) => {
        const on = value === a;
        return (
          <button
            key={a}
            type="button"
            onClick={() => onChange(on ? undefined : a)}
            style={{
              padding: "3px 10px", borderRadius: 999,
              border: on ? "none" : "0.5px solid var(--hub-border)",
              background: on ? "var(--hub-foreground)" : "white",
              color: on ? "var(--hub-bg)" : "var(--hub-foreground)",
              fontFamily: "var(--font-sans)", fontSize: 11, fontWeight: 500, cursor: "pointer",
            }}
          >
            {a}
          </button>
        );
      })}
    </div>
  );
}

function NewTestForm({ onCancel, onSaved }: { onCancel: () => void; onSaved: () => Promise<void> }) {
  const [titre, setTitre] = useState("");
  const [description, setDescription] = useState("");
  const [assignee, setAssignee] = useState<string | undefined>(undefined);
  const [motif, setMotif] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titre.trim()) { setErr("Titre requis"); return; }
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/production/zone-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ titre: titre.trim(), description: description.trim(), assignee, motif_ypm: motif.trim() }),
      }).then((r) => r.json());
      if (!res.ok) throw new Error(res.error);
      await onSaved();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} style={{ background: "white", border: "0.5px solid var(--hub-border)", borderRadius: 10, padding: 14, display: "grid", gap: 8 }}>
      <input autoFocus type="text" value={titre} onChange={(e) => setTitre(e.target.value)} placeholder="Titre du test (ex. Câlin sur sweat beige — densité à revoir)" style={inputStyle} />
      <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Détails (optionnel)" rows={2} style={{ ...inputStyle, resize: "vertical" }} />
      <input type="text" value={motif} onChange={(e) => setMotif(e.target.value)} placeholder="Motif YPM (optionnel, ex. YPM-006)" style={inputStyle} />
      <div>
        <div style={fieldLabelStyle}>Attribuer à</div>
        <AssigneePicker value={assignee} onChange={setAssignee} />
      </div>
      <p style={{ fontFamily: "var(--font-sans)", fontSize: 10, opacity: 0.55, margin: 0 }}>
        Tu pourras déposer les fichiers DST / PXF / aperçu une fois le test créé.
      </p>
      {err && <div style={{ color: "#a13a16", fontSize: 11 }}>{err}</div>}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 6 }}>
        <button type="button" onClick={onCancel} disabled={busy} style={btnGhostStyle}><X size={12} /> Annuler</button>
        <button type="submit" disabled={busy || !titre.trim()} style={{ ...btnPrimaryStyle, opacity: busy || !titre.trim() ? 0.5 : 1 }}>
          {busy ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />} Créer le test
        </button>
      </div>
    </form>
  );
}

function EditTestForm({ test, onCancel, onSaved }: { test: ZoneTest; onCancel: () => void; onSaved: () => Promise<void> }) {
  const [titre, setTitre] = useState(test.titre);
  const [description, setDescription] = useState(test.description || "");
  const [assignee, setAssignee] = useState<string | undefined>(test.assignee);
  const [motif, setMotif] = useState(test.motif_ypm || "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titre.trim()) { setErr("Titre requis"); return; }
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/production/zone-test", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: test.id, titre: titre.trim(), description: description.trim(), assignee: assignee ?? null, motif_ypm: motif.trim() }),
      }).then((r) => r.json());
      if (!res.ok) throw new Error(res.error);
      await onSaved();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} style={{ background: "white", border: "0.5px solid var(--hub-border)", borderRadius: 8, padding: 10, display: "grid", gap: 6 }}>
      <input autoFocus type="text" value={titre} onChange={(e) => setTitre(e.target.value)} style={inputStyle} />
      <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} style={{ ...inputStyle, resize: "vertical" }} />
      <input type="text" value={motif} onChange={(e) => setMotif(e.target.value)} placeholder="Motif YPM (ex. YPM-006)" style={inputStyle} />
      <div>
        <div style={fieldLabelStyle}>Attribuer à</div>
        <AssigneePicker value={assignee} onChange={setAssignee} />
      </div>
      {err && <div style={{ color: "#a13a16", fontSize: 11 }}>{err}</div>}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 4 }}>
        <button type="button" onClick={onCancel} disabled={busy} style={btnGhostStyle}><X size={11} /> Annuler</button>
        <button type="submit" disabled={busy} style={{ ...btnPrimaryStyle, opacity: busy ? 0.5 : 1 }}>
          {busy ? <Loader2 size={11} className="animate-spin" /> : <Save size={11} />} Enregistrer
        </button>
      </div>
    </form>
  );
}

const inputStyle: React.CSSProperties = {
  padding: "6px 8px",
  border: "0.5px solid var(--hub-border)",
  borderRadius: 6,
  fontFamily: "var(--font-sans)",
  fontSize: 12,
  background: "white",
  width: "100%",
  boxSizing: "border-box",
};
const fieldLabelStyle: React.CSSProperties = {
  fontFamily: "var(--font-sans)", fontSize: 9, fontWeight: 600,
  letterSpacing: "0.05em", textTransform: "uppercase", opacity: 0.5, marginBottom: 4,
};
const fileBtnStyle: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 5,
  padding: "3px 9px", borderRadius: 6, border: "0.5px solid rgba(0,0,0,0.15)",
  background: "var(--hub-bg)", fontFamily: "var(--font-sans)", fontSize: 10, cursor: "pointer",
  color: "var(--hub-foreground)", textDecoration: "none", maxWidth: "100%", overflow: "hidden",
};
const iconBtnStyle: React.CSSProperties = {
  background: "transparent", border: "none", cursor: "pointer",
  color: "var(--hub-foreground)", opacity: 0.6, padding: 2,
  display: "inline-flex", alignItems: "center",
};
const btnGhostStyle: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 4,
  padding: "5px 10px", borderRadius: 999,
  background: "white", border: "0.5px solid var(--hub-border)",
  fontFamily: "var(--font-sans)", fontSize: 11, cursor: "pointer",
  color: "var(--hub-foreground)",
};
const btnPrimaryStyle: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 4,
  padding: "5px 10px", borderRadius: 999, border: "none",
  background: "var(--hub-foreground)", color: "var(--hub-bg)",
  fontFamily: "var(--font-sans)", fontSize: 11, fontWeight: 500, cursor: "pointer",
};
