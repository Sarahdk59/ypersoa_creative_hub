"use client";

/**
 * /social/kanban — kanban des projets sociaux en cours.
 *
 * Lecture/écriture via lib/social-projects.ts. 5 colonnes : Concept / Shooting /
 * À filmer cette semaine / Production / Publié. Drag&drop simple par boutons
 * `←` `→` sur chaque card (pas de vraie DnD lib, suffisant à l'usage Sarah seule).
 *
 * Création rapide via le bouton "+ Nouveau projet" en haut. Édition via click sur
 * une card → modal latérale.
 */

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { ArrowLeft, Plus, ChevronLeft, ChevronRight, Trash2, X, Calendar as CalIcon, Layers } from "lucide-react";
import {
  listSocialProjects,
  createSocialProject,
  updateSocialProject,
  moveProjectToStatut,
  deleteSocialProject,
  STATUT_LABELS,
  STATUT_ORDER,
  type SocialProject,
  type SocialProjectStatut,
} from "@/lib/social-projects";

const DESTINATAIRES = [
  "papa", "maman", "mamie", "papy", "parrain", "marraine", "témoins",
  "frère", "sœur", "tonton", "tata", "amis", "couple", "bébé", "enfant",
  "nounou", "maîtresse",
];

const OCCASIONS = [
  "anniversaire", "mariage", "naissance", "fête des mères", "fête des pères",
  "déclaration", "transmission", "intemporel", "noël", "saint-valentin", "rentrée scolaire",
];

const PRODUITS = ["YP001", "YP005", "YP019", "YP021", "YP004"];

export default function KanbanSocialPage() {
  const [projects, setProjects] = useState<SocialProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openProject, setOpenProject] = useState<SocialProject | null>(null);
  const [creating, setCreating] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      setProjects(await listSocialProjects());
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const byStatut = useMemo(() => {
    const map: Record<SocialProjectStatut, SocialProject[]> = {
      concept: [], shooting: [], a_filmer: [], production: [], publie: [],
    };
    for (const p of projects) map[p.statut].push(p);
    return map;
  }, [projects]);

  const move = async (p: SocialProject, dir: -1 | 1) => {
    const idx = STATUT_ORDER.indexOf(p.statut);
    const next = STATUT_ORDER[idx + dir];
    if (!next) return;
    try {
      await moveProjectToStatut(p.id, next);
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <div style={{ maxWidth: 1600, margin: "0 auto", padding: "0 16px" }}>
      <Link
        href="/social"
        style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          fontFamily: "var(--font-sans)", fontSize: 12,
          color: "var(--hub-foreground)", opacity: 0.6,
          textDecoration: "none", marginBottom: 20,
        }}
      >
        <ArrowLeft size={14} strokeWidth={1.6} /> Atelier Social
      </Link>

      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 28, gap: 16, flexWrap: "wrap" }}>
        <div>
          <p style={{ fontFamily: "var(--font-sans)", fontSize: 11, opacity: 0.5, margin: 0, letterSpacing: 0.5, textTransform: "uppercase" }}>
            Atelier Social
          </p>
          <h1 style={{ fontFamily: "var(--font-editorial)", fontSize: 36, fontWeight: 500, margin: "6px 0 0" }}>
            Projets · Kanban
          </h1>
          <p style={{ fontFamily: "var(--font-sans)", fontSize: 13, opacity: 0.65, marginTop: 6 }}>
            Concept → Shooting → À filmer cette semaine → Production → Publié. {projects.length} projet{projects.length > 1 ? "s" : ""} actif{projects.length > 1 ? "s" : ""}.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCreating(true)}
          style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            padding: "10px 18px", borderRadius: 999, border: "none",
            background: "var(--hub-foreground)", color: "var(--hub-bg)",
            fontFamily: "var(--font-sans)", fontSize: 12, fontWeight: 500,
            cursor: "pointer",
          }}
        >
          <Plus size={14} /> Nouveau projet
        </button>
      </header>

      {error && (
        <div style={{ padding: "10px 14px", background: "#fdecea", color: "#a13a16", borderRadius: 10, marginBottom: 16, fontSize: 12 }}>
          {error}
        </div>
      )}

      {loading ? (
        <p style={{ textAlign: "center", padding: 40, fontFamily: "var(--font-sans)", fontSize: 13, opacity: 0.5 }}>Chargement…</p>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12, alignItems: "start" }}>
          {STATUT_ORDER.map((statut) => (
            <KanbanColumn
              key={statut}
              statut={statut}
              projects={byStatut[statut]}
              onMove={move}
              onOpen={(p) => setOpenProject(p)}
            />
          ))}
        </div>
      )}

      {creating && (
        <ProjectModal
          onClose={() => setCreating(false)}
          onSaved={() => { setCreating(false); load(); }}
        />
      )}
      {openProject && (
        <ProjectModal
          project={openProject}
          onClose={() => setOpenProject(null)}
          onSaved={() => { setOpenProject(null); load(); }}
          onDeleted={() => { setOpenProject(null); load(); }}
        />
      )}
    </div>
  );
}

function KanbanColumn({
  statut, projects, onMove, onOpen,
}: {
  statut: SocialProjectStatut;
  projects: SocialProject[];
  onMove: (p: SocialProject, dir: -1 | 1) => void;
  onOpen: (p: SocialProject) => void;
}) {
  const colorByStatut: Record<SocialProjectStatut, string> = {
    concept: "#ECE3D5",
    shooting: "#E5E8EE",
    a_filmer: "#FDE7E0",
    production: "#E3E8DC",
    publie: "#D9CFC0",
  };
  return (
    <div style={{ background: "white", border: "0.5px solid var(--hub-border)", borderRadius: 12, overflow: "hidden", minHeight: 200 }}>
      <div style={{ background: colorByStatut[statut], padding: "10px 12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <p style={{ fontFamily: "var(--font-sans)", fontSize: 11, fontWeight: 600, letterSpacing: 0.5, textTransform: "uppercase", margin: 0 }}>
          {STATUT_LABELS[statut]}
        </p>
        <span style={{ fontFamily: "var(--font-sans)", fontSize: 11, opacity: 0.7 }}>{projects.length}</span>
      </div>
      <div style={{ padding: 8, display: "flex", flexDirection: "column", gap: 8 }}>
        {projects.length === 0 && (
          <p style={{ fontFamily: "var(--font-sans)", fontSize: 10.5, opacity: 0.4, fontStyle: "italic", margin: "12px 4px", textAlign: "center" }}>
            Aucun projet
          </p>
        )}
        {projects.map((p) => (
          <ProjectCard key={p.id} project={p} onMove={onMove} onOpen={onOpen} />
        ))}
      </div>
    </div>
  );
}

function ProjectCard({
  project, onMove, onOpen,
}: {
  project: SocialProject;
  onMove: (p: SocialProject, dir: -1 | 1) => void;
  onOpen: (p: SocialProject) => void;
}) {
  const idx = STATUT_ORDER.indexOf(project.statut);
  const canLeft = idx > 0;
  const canRight = idx < STATUT_ORDER.length - 1;
  const overdue = project.deadline && new Date(project.deadline) < new Date() && project.statut !== "publie";
  return (
    <div
      style={{
        background: "white",
        border: "0.5px solid var(--hub-border)",
        borderRadius: 8,
        padding: 10,
        cursor: "pointer",
      }}
      onClick={() => onOpen(project)}
    >
      <p style={{ fontFamily: "var(--font-sans)", fontSize: 12.5, fontWeight: 500, margin: 0, lineHeight: 1.3 }}>
        {project.title}
      </p>
      {(project.motif_id || project.variante_key) && (
        <p style={{ fontFamily: "var(--font-sans)", fontSize: 10, opacity: 0.5, margin: "3px 0 0" }}>
          {project.motif_id}{project.variante_key ? ` · ${project.variante_key}` : ""}
        </p>
      )}
      {(project.destinataires?.length || project.occasions?.length || project.product_ids?.length) ? (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 3, marginTop: 6 }}>
          {(project.destinataires ?? []).map((d) => <span key={`d-${d}`} style={miniPill("#ECE3D5", "#6B4F2A")}>{d}</span>)}
          {(project.occasions ?? []).map((o) => <span key={`o-${o}`} style={miniPill("#E3E8DC", "#3D5A2A")}>{o}</span>)}
          {(project.product_ids ?? []).map((p) => <span key={`p-${p}`} style={miniPill("#E5E8EE", "#324A6E")}>{p}</span>)}
        </div>
      ) : null}
      {project.deadline && (
        <p style={{ fontFamily: "var(--font-sans)", fontSize: 10, marginTop: 6, color: overdue ? "#a13a16" : "var(--hub-foreground)", opacity: overdue ? 1 : 0.6, display: "flex", alignItems: "center", gap: 3, fontWeight: overdue ? 600 : 400 }}>
          <CalIcon size={10} /> {new Date(project.deadline).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })}
          {overdue && " ⚠️"}
        </p>
      )}
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, gap: 4 }} onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          onClick={() => canLeft && onMove(project, -1)}
          disabled={!canLeft}
          style={miniBtnStyle(canLeft)}
          title="Étape précédente"
        >
          <ChevronLeft size={11} />
        </button>
        <button
          type="button"
          onClick={() => canRight && onMove(project, 1)}
          disabled={!canRight}
          style={miniBtnStyle(canRight)}
          title="Étape suivante"
        >
          <ChevronRight size={11} />
        </button>
      </div>
    </div>
  );
}

function miniPill(bg: string, fg: string): React.CSSProperties {
  return {
    fontFamily: "var(--font-sans)",
    fontSize: 9, padding: "1.5px 6px", borderRadius: 999,
    background: bg, color: fg, textTransform: "capitalize", letterSpacing: 0.2,
  };
}

function miniBtnStyle(active: boolean): React.CSSProperties {
  return {
    flex: 1, display: "inline-flex", alignItems: "center", justifyContent: "center",
    height: 22, borderRadius: 6, border: "0.5px solid var(--hub-border)",
    background: active ? "white" : "var(--hub-bg)",
    color: active ? "var(--hub-foreground)" : "var(--hub-foreground)",
    opacity: active ? 1 : 0.3,
    cursor: active ? "pointer" : "default",
  };
}

function ProjectModal({
  project, onClose, onSaved, onDeleted,
}: {
  project?: SocialProject;
  onClose: () => void;
  onSaved: () => void;
  onDeleted?: () => void;
}) {
  const isEdit = !!project;
  const [title, setTitle] = useState(project?.title ?? "");
  const [statut, setStatut] = useState<SocialProjectStatut>(project?.statut ?? "concept");
  const [motifId, setMotifId] = useState(project?.motif_id ?? "");
  const [varianteKey, setVarianteKey] = useState(project?.variante_key ?? "");
  const [destinataires, setDestinataires] = useState<Set<string>>(new Set(project?.destinataires ?? []));
  const [occasions, setOccasions] = useState<Set<string>>(new Set(project?.occasions ?? []));
  const [productIds, setProductIds] = useState<Set<string>>(new Set(project?.product_ids ?? []));
  const [deadline, setDeadline] = useState(project?.deadline ?? "");
  const [notes, setNotes] = useState(project?.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const toggle = (set: Set<string>, setter: (s: Set<string>) => void, v: string) => {
    const next = new Set(set);
    if (next.has(v)) next.delete(v); else next.add(v);
    setter(next);
  };

  const save = async () => {
    if (!title.trim()) {
      setErr("Le titre est obligatoire.");
      return;
    }
    setSaving(true);
    setErr(null);
    try {
      const payload = {
        title: title.trim(),
        statut,
        motifId: motifId.trim() || null,
        varianteKey: varianteKey.trim() || null,
        destinataires: [...destinataires],
        occasions: [...occasions],
        productIds: [...productIds],
        deadline: deadline || null,
        notes: notes.trim() || null,
      };
      if (isEdit && project) {
        await updateSocialProject(project.id, {
          title: payload.title,
          statut: payload.statut,
          motif_id: payload.motifId,
          variante_key: payload.varianteKey,
          destinataires: payload.destinataires.length ? payload.destinataires : null,
          occasions: payload.occasions.length ? payload.occasions : null,
          product_ids: payload.productIds.length ? payload.productIds : null,
          deadline: payload.deadline,
          notes: payload.notes,
        });
      } else {
        await createSocialProject(payload);
      }
      onSaved();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!project) return;
    if (!confirm("Supprimer ce projet ?")) return;
    try {
      await deleteSocialProject(project.id);
      onDeleted?.();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: "white", borderRadius: 16, maxWidth: 600, width: "100%", maxHeight: "90vh", overflow: "auto", padding: 24, position: "relative" }}
      >
        <button onClick={onClose} style={{ position: "absolute", top: 12, right: 12, background: "none", border: "none", cursor: "pointer", opacity: 0.5 }}>
          <X size={18} />
        </button>
        <h2 style={{ fontFamily: "var(--font-editorial)", fontSize: 22, fontWeight: 500, margin: "0 0 16px" }}>
          {isEdit ? "Modifier projet" : "Nouveau projet social"}
        </h2>

        <label style={labelStyle}>Titre *</label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Ex: Pack Fête des Pères — Mathieu & Gabin"
          style={inputStyle}
        />

        <label style={labelStyle}>Statut</label>
        <select value={statut} onChange={(e) => setStatut(e.target.value as SocialProjectStatut)} style={inputStyle}>
          {STATUT_ORDER.map((s) => <option key={s} value={s}>{STATUT_LABELS[s]}</option>)}
        </select>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div>
            <label style={labelStyle}>Motif (YPM-XXX)</label>
            <input value={motifId} onChange={(e) => setMotifId(e.target.value)} placeholder="YPM-008" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Variante</label>
            <input value={varianteKey} onChange={(e) => setVarianteKey(e.target.value)} placeholder="CHOUCHOU-mamie" style={inputStyle} />
          </div>
        </div>

        <label style={labelStyle}>Pour qui ?</label>
        <ChipRow values={DESTINATAIRES} selected={destinataires} onToggle={(v) => toggle(destinataires, setDestinataires, v)} kind="dest" />

        <label style={labelStyle}>Occasion(s)</label>
        <ChipRow values={OCCASIONS} selected={occasions} onToggle={(v) => toggle(occasions, setOccasions, v)} kind="occ" />

        <label style={labelStyle}>Produit(s)</label>
        <ChipRow values={PRODUITS} selected={productIds} onToggle={(v) => toggle(productIds, setProductIds, v)} kind="prod" />

        <label style={labelStyle}>Deadline (optionnel)</label>
        <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} style={inputStyle} />

        <label style={labelStyle}>Notes</label>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} style={{ ...inputStyle, resize: "vertical", fontFamily: "var(--font-sans)" }} />

        {err && <p style={{ color: "#a13a16", fontSize: 11, fontFamily: "var(--font-sans)", marginTop: 10 }}>{err}</p>}

        <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginTop: 16 }}>
          {isEdit ? (
            <button type="button" onClick={remove} style={{ background: "none", border: "none", color: "#a13a16", fontFamily: "var(--font-sans)", fontSize: 12, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4 }}>
              <Trash2 size={12} /> Supprimer
            </button>
          ) : <span />}
          <button
            type="button"
            onClick={save}
            disabled={saving || !title.trim()}
            style={{
              padding: "10px 18px", borderRadius: 999, border: "none",
              background: "var(--hub-foreground)", color: "var(--hub-bg)",
              fontFamily: "var(--font-sans)", fontSize: 12, fontWeight: 500,
              cursor: saving || !title.trim() ? "default" : "pointer",
              opacity: saving || !title.trim() ? 0.5 : 1,
            }}
          >
            {saving ? "Enregistrement…" : isEdit ? "Mettre à jour" : "Créer le projet"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ChipRow({ values, selected, onToggle, kind }: { values: string[]; selected: Set<string>; onToggle: (v: string) => void; kind: "dest" | "occ" | "prod" }) {
  const palette = { dest: { bg: "#ECE3D5", fg: "#6B4F2A" }, occ: { bg: "#E3E8DC", fg: "#3D5A2A" }, prod: { bg: "#E5E8EE", fg: "#324A6E" } }[kind];
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 10 }}>
      {values.map((v) => {
        const active = selected.has(v);
        return (
          <button
            key={v}
            type="button"
            onClick={() => onToggle(v)}
            style={{
              fontFamily: "var(--font-sans)", fontSize: 11, padding: "4px 10px", borderRadius: 999,
              border: active ? `0.5px solid ${palette.fg}` : "0.5px solid var(--hub-border)",
              background: active ? palette.bg : "white",
              color: active ? palette.fg : "var(--hub-foreground)",
              cursor: "pointer", textTransform: kind === "prod" ? "none" : "capitalize",
            }}
          >
            {v}
          </button>
        );
      })}
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: "block",
  fontFamily: "var(--font-sans)",
  fontSize: 10,
  fontWeight: 600,
  letterSpacing: 0.5,
  textTransform: "uppercase",
  opacity: 0.55,
  marginTop: 12,
  marginBottom: 4,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 12px",
  borderRadius: 8,
  border: "0.5px solid var(--hub-border)",
  background: "white",
  fontFamily: "var(--font-sans)",
  fontSize: 13,
  marginBottom: 4,
};
