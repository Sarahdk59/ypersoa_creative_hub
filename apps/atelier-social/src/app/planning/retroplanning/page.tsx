"use client";

/**
 * /planning/retroplanning — planning commun créa / prod / comm (onglet "Rétroplanning 2027").
 * 2 vues : Gantt visuel (charge + zones de tension double/triple run) et Liste.
 * Dates + statuts éditables, événements ajoutables/supprimables.
 * API : /api/planning/retroplanning (GET, POST) + /[id] (PATCH, DELETE).
 */
import { useEffect, useMemo, useState } from "react";
import { Loader2, Plus, Trash2, List, BarChart3, X } from "lucide-react";
import type {
  ActionPlanning, DropMeta, Equipe, StatutAction, TypeAction,
} from "@/lib/planning/retroplanning-loader";

const EQUIPE_META: Record<Equipe, { label: string; color: string; bg: string }> = {
  crea: { label: "Créa / DA", color: "#B4665F", bg: "rgba(180,102,95,0.12)" },
  prod: { label: "Production", color: "#1A2E4F", bg: "rgba(26,46,79,0.12)" },
  comm: { label: "Communication", color: "#54744F", bg: "rgba(84,116,79,0.14)" },
};
const STATUT_META: Record<StatutAction, { label: string; bg: string; fg: string }> = {
  a_faire: { label: "À faire", bg: "#EFEBE4", fg: "#6B6256" },
  en_cours: { label: "En cours", bg: "#FFE9D6", fg: "#9A4400" },
  fait: { label: "Fait", bg: "#E5F0E8", fg: "#2F7A3E" },
};
const TYPE_LABEL: Record<TypeAction, string> = {
  // CRÉA
  inspiration: "Inspiration / motif",
  plan_collection: "Plan de collection",
  choix_produits_motifs: "Choix motifs/produits",
  sourcing: "Sourcing",
  reunion: "Réunion collection",
  validation_collection: "Validation collection",
  generation_variantes: "Génération variantes",
  shooting_photo: "Shooting photo",
  fiche_produit: "Fiche produit",
  integration_shopify: "Intégration Shopify",
  liquid_perso: "Liquid perso",
  dev_motifs: "Dév motifs",
  mise_en_ligne: "Mise en ligne site",
  seo: "Amélioration SEO",
  // PROD
  base_dst: "Base DST / PXF",
  tests_motifs: "Test broderie",
  correction_tests: "Correction tests",
  creation_png: "Création PNG",
  production: "Production",
  cutoff: "Cutoff",
  // COMM
  creation_contenu: "Création contenus",
  photos_carrousels: "Photos carrousels",
  videos: "Vidéos",
  validation_contenus: "Validation contenus",
  validation_tags: "Validation tags",
  planning_publi: "Planning publi & tags",
  validation_fiches: "Validation fiches",
  presentation: "Présentation",
  pinterest: "Pinterest",
  insta: "Instagram",
};
const TYPE_ICON: Record<TypeAction, string> = {
  inspiration: "💡", plan_collection: "🗂️", choix_produits_motifs: "✎", sourcing: "📦",
  reunion: "★", validation_collection: "★", generation_variantes: "🎨", shooting_photo: "📷",
  fiche_produit: "📄", integration_shopify: "🛒", liquid_perso: "🧩", dev_motifs: "✎",
  mise_en_ligne: "🌐", seo: "🔎",
  base_dst: "⌗", tests_motifs: "🧵", correction_tests: "🛠️", creation_png: "🖼️", production: "⚙️", cutoff: "⛔",
  creation_contenu: "🎬", photos_carrousels: "🎞️", videos: "🎥", validation_contenus: "✔︎",
  validation_tags: "🏷️", planning_publi: "🗓️", validation_fiches: "✓", presentation: "📣",
  pinterest: "📌", insta: "◎",
};
// Jalons "réunion de collection" → rendus en ÉTOILE pleine hauteur (deadline qui réunit tout le monde),
// hors des lanes. reunion = présentation, validation_collection = validation. 2 par thématique.
const MILESTONE_TYPES = new Set<TypeAction>(["reunion", "validation_collection"]);
// Tâches "préparation" → comptées dans la bande Charge (tension = collections préparées en parallèle).
// On exclut le lancement/diffusion (SEO, mise en ligne, planning publi, pinterest, insta, production, cutoff)
// et les jalons réunion (1 jour, pas une charge de prépa).
const LAUNCH_TYPES = new Set<TypeAction>(["seo", "mise_en_ligne", "planning_publi", "pinterest", "insta", "production", "cutoff"]);
const PREP_TYPES = new Set<TypeAction>((Object.keys(TYPE_LABEL) as TypeAction[]).filter((t) => !LAUNCH_TYPES.has(t) && !MILESTONE_TYPES.has(t)));
const TYPE_OPTIONS = Object.keys(TYPE_LABEL) as TypeAction[];
const STATUT_CYCLE: StatutAction[] = ["a_faire", "en_cours", "fait"];
const PX_PER_DAY = 4;
const LANE_W = 176;
const DAY = 86400000;

function parseDate(s: string): Date { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); }
function iso(d: Date): string { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; }
function daysBetween(a: Date, b: Date): number { return Math.round((b.getTime() - a.getTime()) / DAY); }
function dayLabel(s: string): string { return parseDate(s).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" }); }
function mondayOnOrBefore(d: Date): Date { const x = new Date(d); const dow = (x.getDay() + 6) % 7; x.setDate(x.getDate() - dow); return x; }
function cap(s: string): string { return s.charAt(0).toUpperCase() + s.slice(1); }

export default function PlanningCommunPage() {
  const [actions, setActions] = useState<ActionPlanning[]>([]);
  const [drops, setDrops] = useState<DropMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<"gantt" | "liste">("gantt");
  const [equipeFilter, setEquipeFilter] = useState<Equipe | "all">("all");
  const [statutFilter, setStatutFilter] = useState<StatutAction | "all">("all");
  const [saving, setSaving] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => { reload(); }, []);
  function reload() {
    fetch("/api/planning/retroplanning", { cache: "no-store" })
      .then((r) => r.json())
      .then((res) => { if (!res.ok) throw new Error(res.error); setActions(res.data.actions); setDrops(res.data.drops); })
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false));
  }

  async function patch(id: string, body: Partial<ActionPlanning>) {
    setActions((prev) => prev.map((a) => (a.id === id ? { ...a, ...body } : a)));
    setSaving(id);
    try {
      const res = await fetch(`/api/planning/retroplanning/${id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      }).then((r) => r.json());
      if (!res.ok) throw new Error(res.error);
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    finally { setSaving(null); }
  }
  async function remove(id: string) {
    if (!confirm("Supprimer cet événement ?")) return;
    setActions((prev) => prev.filter((a) => a.id !== id));
    if (selected === id) setSelected(null);
    try {
      const res = await fetch(`/api/planning/retroplanning/${id}`, { method: "DELETE" }).then((r) => r.json());
      if (!res.ok) throw new Error(res.error);
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); reload(); }
  }
  async function create(body: Partial<ActionPlanning>) {
    try {
      const res = await fetch("/api/planning/retroplanning", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      }).then((r) => r.json());
      if (!res.ok) throw new Error(res.error);
      setActions((prev) => [...prev, res.data].sort((a, b) => a.date.localeCompare(b.date)));
      setAdding(false);
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
  }

  const filtered = useMemo(() => actions
    .filter((a) => equipeFilter === "all" || a.equipe === equipeFilter)
    .filter((a) => statutFilter === "all" || a.statut === statutFilter)
    .sort((a, b) => a.date.localeCompare(b.date)), [actions, equipeFilter, statutFilter]);

  const campagnes = useMemo(() => [...new Set(actions.map((a) => a.campagne).filter(Boolean))], [actions]);
  const stats = useMemo(() => {
    const total = actions.length, fait = actions.filter((a) => a.statut === "fait").length;
    return { total, fait, pct: total ? Math.round((fait / total) * 100) : 0 };
  }, [actions]);

  if (loading) return <div style={{ padding: 60, textAlign: "center" }}><Loader2 size={32} className="animate-spin" strokeWidth={1.4} /></div>;

  return (
    <div style={{ maxWidth: 1180, margin: "0 auto" }}>
      <header style={{ margin: "0 0 20px" }}>
        <p style={{ fontFamily: "var(--font-sans)", fontSize: 13.5, color: "var(--hub-foreground)", opacity: 0.7, lineHeight: 1.6, maxWidth: 720, margin: 0 }}>
          Orchestre les 3 équipes (création · production · communication). La bande <strong>Charge</strong> en haut du Gantt
          révèle les zones de tension : <span style={{ color: "#C5660D", fontWeight: 600 }}>double run ×2</span> et <span style={{ color: "#C53030", fontWeight: 600 }}>triple run ×3</span> quand plusieurs collections tournent en parallèle.
        </p>
        {error && <p style={{ fontFamily: "var(--font-sans)", fontSize: 12, color: "#a13a16", marginTop: 8 }}>Erreur : {error}</p>}
      </header>

      {/* Barre d'outils */}
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12, marginBottom: 18 }}>
        <div style={{ display: "flex", gap: 4 }}>
          <ToggleBtn active={view === "gantt"} onClick={() => setView("gantt")} icon={<BarChart3 size={14} />} label="Gantt" />
          <ToggleBtn active={view === "liste"} onClick={() => setView("liste")} icon={<List size={14} />} label="Liste" />
        </div>
        <FilterGroup label="Équipe" value={equipeFilter} onChange={(v) => setEquipeFilter(v as Equipe | "all")}
          options={[{ v: "all", label: "Toutes" }, { v: "crea", label: "Créa" }, { v: "prod", label: "Prod" }, { v: "comm", label: "Comm" }]} />
        <FilterGroup label="Statut" value={statutFilter} onChange={(v) => setStatutFilter(v as StatutAction | "all")}
          options={[{ v: "all", label: "Tous" }, { v: "a_faire", label: "À faire" }, { v: "en_cours", label: "En cours" }, { v: "fait", label: "Fait" }]} />
        <button type="button" onClick={() => setAdding((v) => !v)}
          style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 999, cursor: "pointer", border: "none", background: "var(--hub-foreground)", color: "var(--hub-bg)", fontFamily: "var(--font-sans)", fontSize: 12, fontWeight: 600 }}>
          <Plus size={14} /> Ajouter un événement
        </button>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10, fontFamily: "var(--font-sans)", fontSize: 12, color: "var(--hub-foreground)", opacity: 0.75 }}>
          <span>{stats.fait}/{stats.total} fait</span>
          <div style={{ width: 110, height: 6, borderRadius: 999, background: "var(--hub-border)", overflow: "hidden" }}>
            <div style={{ width: `${stats.pct}%`, height: "100%", background: "#2F7A3E" }} />
          </div>
        </div>
      </div>

      {adding && <AddEventForm campagnes={campagnes} onCancel={() => setAdding(false)} onSubmit={create} />}

      {view === "gantt"
        ? <GanttView actions={filtered} selected={selected} onSelect={setSelected} />
        : <ListView actions={filtered} drops={drops} saving={saving} onCycle={(a) => patch(a.id, { statut: STATUT_CYCLE[(STATUT_CYCLE.indexOf(a.statut) + 1) % 3] })} onDate={(id, date) => patch(id, { date })} onResp={(id, responsable) => patch(id, { responsable })} onDelete={remove} />}

      {/* Détail de l'action sélectionnée (vue Gantt) */}
      {view === "gantt" && selected && (() => {
        const a = actions.find((x) => x.id === selected);
        if (!a) return null;
        return <DetailCard a={a} saving={saving === a.id}
          onCycle={() => patch(a.id, { statut: STATUT_CYCLE[(STATUT_CYCLE.indexOf(a.statut) + 1) % 3] })}
          onDate={(date) => patch(a.id, { date })} onDateFin={(date_fin) => patch(a.id, { date_fin: date_fin || undefined })}
          onResp={(responsable) => patch(a.id, { responsable })} onDelete={() => remove(a.id)} onClose={() => setSelected(null)} />;
      })()}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────── GANTT
const PILL_H = 22, V_GAP = 4, LANE_PAD = 7;
const STAR_ROW_H = 50;
const MS_PRES = { color: "#B4665F", role: "Présentation" };
const MS_VALID = { color: "#2F7A3E", role: "Validation" };

type MilestonePair = { camp: string; pres: ActionPlanning | null; valid: ActionPlanning | null; presX: number | null; valX: number | null; labelX: number };

function MilestoneMarker({ m, selected, onSelect }: { m: MilestonePair; selected: string | null; onSelect: (id: string | null) => void }) {
  const BASE = 30; // ligne de base des étoiles dans la rangée
  return (
    <>
      {/* connecteur présentation ⟶ validation (fenêtre de préparation) */}
      {m.presX != null && m.valX != null && (
        <div style={{ position: "absolute", left: m.presX, width: Math.max(0, m.valX - m.presX), top: BASE + 7, height: 0, borderTop: "1px dotted rgba(26,22,20,0.35)", pointerEvents: "none" }} />
      )}
      {/* nom de la collection, centré entre les 2 réunions */}
      <div style={{ position: "absolute", left: m.labelX, top: 4, transform: "translateX(-50%)", fontFamily: "var(--font-sans)", fontSize: 9.5, fontWeight: 700, color: "var(--hub-foreground)", whiteSpace: "nowrap", letterSpacing: "0.01em", pointerEvents: "none" }}>{m.camp}</div>
      {m.pres && m.presX != null && <Star x={m.presX} top={BASE} a={m.pres} kind={MS_PRES} selected={selected === m.pres.id} onSelect={onSelect} />}
      {m.valid && m.valX != null && <Star x={m.valX} top={BASE} a={m.valid} kind={MS_VALID} selected={selected === m.valid.id} onSelect={onSelect} />}
    </>
  );
}

function Star({ x, top, a, kind, selected, onSelect }: { x: number; top: number; a: ActionPlanning; kind: { color: string; role: string }; selected: boolean; onSelect: (id: string | null) => void }) {
  const done = a.statut === "fait";
  return (
    <button type="button" onClick={() => onSelect(selected ? null : a.id)}
      title={`${kind.role} · ${a.campagne} · ${dayLabel(a.date)} · ${STATUT_META[a.statut].label}${a.responsable ? " · " + a.responsable : ""}`}
      style={{
        position: "absolute", left: x, top, transform: "translateX(-50%)",
        width: 22, height: 22, lineHeight: "22px", textAlign: "center", padding: 0,
        borderRadius: 999, cursor: "pointer", border: "none", background: "transparent",
        color: done ? "rgba(26,22,20,0.35)" : kind.color, fontSize: 18,
        textShadow: selected ? `0 0 0 ${kind.color}` : "none",
        filter: selected ? "drop-shadow(0 0 3px rgba(0,0,0,0.35))" : "none",
        transformOrigin: "center", scale: selected ? "1.25" : "1",
      }}>★</button>
  );
}

function GanttView({ actions, selected, onSelect }: { actions: ActionPlanning[]; selected: string | null; onSelect: (id: string | null) => void }) {
  const model = useMemo(() => {
    if (actions.length === 0) return null;
    const dates = actions.flatMap((a) => [parseDate(a.date), parseDate(a.date_fin || a.date)]);
    const min = new Date(Math.min(...dates.map((d) => d.getTime())));
    const max = new Date(Math.max(...dates.map((d) => d.getTime())));
    const start = mondayOnOrBefore(min);
    const end = new Date(max.getTime() + 5 * DAY);
    const totalDays = daysBetween(start, end) + 1;
    const width = totalDays * PX_PER_DAY;
    const xOf = (s: string) => daysBetween(start, parseDate(s)) * PX_PER_DAY;
    const labelW = (a: ActionPlanning) => TYPE_LABEL[a.type].length * 6.1 + 30; // icône + texte + padding

    // Les jalons "réunion" sortent des lanes → étoiles pleine hauteur.
    const laneActions = actions.filter((a) => !MILESTONE_TYPES.has(a.type));
    const milestoneActions = actions.filter((a) => MILESTONE_TYPES.has(a.type));

    // Lanes par campagne. Tri chronologique : datées par date de fin (deadline) croissante,
    // evergreen (événements de vie) regroupées en bas.
    const laneMap = new Map<string, ActionPlanning[]>();
    for (const a of laneActions) { const k = a.campagne || "—"; if (!laneMap.has(k)) laneMap.set(k, []); laneMap.get(k)!.push(a); }
    const laneArr = [...laneMap.entries()].map(([camp, items]) => {
      const evergreen = items.some((i) => i.drop === "evergreen");
      const maxD = items.reduce((m, i) => (i.date_fin || i.date) > m ? (i.date_fin || i.date) : m, items[0].date);
      const minD = items.reduce((m, i) => i.date < m ? i.date : m, items[0].date);
      // Stacking anti-chevauchement
      const sorted = [...items].sort((a, b) => a.date.localeCompare(b.date));
      const rowEnds: number[] = [];
      const placed = sorted.map((a) => {
        const x = xOf(a.date);
        const w = Math.max(a.date_fin ? (daysBetween(parseDate(a.date), parseDate(a.date_fin)) + 1) * PX_PER_DAY : 0, labelW(a));
        let r = rowEnds.findIndex((e) => e + 6 <= x);
        if (r === -1) { r = rowEnds.length; rowEnds.push(0); }
        rowEnds[r] = x + w;
        return { a, x, w, row: r };
      });
      const height = rowEnds.length * (PILL_H + V_GAP) - V_GAP + 2 * LANE_PAD;
      return { camp, evergreen, maxD, minD, placed, height };
    });
    laneArr.sort((a, b) => (a.evergreen ? 1 : 0) - (b.evergreen ? 1 : 0) || (a.evergreen ? a.minD.localeCompare(b.minD) : a.maxD.localeCompare(b.maxD)));

    // Mois
    const months: { label: string; x: number; w: number }[] = [];
    let cur = new Date(start.getFullYear(), start.getMonth(), 1);
    while (cur <= end) {
      const next = new Date(cur.getFullYear(), cur.getMonth() + 1, 1);
      const segStart = cur < start ? start : cur;
      const segEnd = next > end ? end : next;
      months.push({ label: cap(cur.toLocaleDateString("fr-FR", { month: "short", year: "2-digit" })), x: daysBetween(start, segStart) * PX_PER_DAY, w: daysBetween(segStart, segEnd) * PX_PER_DAY });
      cur = next;
    }

    // Charge hebdo : nb de collections EN PRÉPARATION par semaine (tension réelle)
    const weeks: { x: number; w: number; count: number; camps: string[] }[] = [];
    for (let off = 0; off < totalDays; off += 7) {
      const ws = new Date(start.getTime() + off * DAY);
      const we = new Date(ws.getTime() + 7 * DAY);
      const camps = new Set<string>();
      for (const a of actions) {
        if (!PREP_TYPES.has(a.type)) continue;
        const ad = parseDate(a.date); const af = parseDate(a.date_fin || a.date);
        if (af >= ws && ad < we) camps.add(a.campagne || "—");
      }
      weeks.push({ x: off * PX_PER_DAY, w: 7 * PX_PER_DAY - 1, count: camps.size, camps: [...camps] });
    }

    // Jalons réunion groupés par thématique (présentation = reunion, validation = validation_collection)
    const msMap = new Map<string, ActionPlanning[]>();
    for (const a of milestoneActions) { const k = a.campagne || "—"; if (!msMap.has(k)) msMap.set(k, []); msMap.get(k)!.push(a); }
    const milestones = [...msMap.entries()].map(([camp, items]) => {
      const pres = items.find((i) => i.type === "reunion") || null;
      const valid = items.find((i) => i.type === "validation_collection") || null;
      const presX = pres ? xOf(pres.date) : null;
      const valX = valid ? xOf(valid.date) : null;
      const labelX = presX != null && valX != null ? (presX + valX) / 2 : (presX ?? valX ?? 0);
      return { camp, pres, valid, presX, valX, labelX };
    }).sort((a, b) => a.labelX - b.labelX);

    const today = new Date(); today.setHours(0, 0, 0, 0);
    const todayX = today >= start && today <= end ? daysBetween(start, today) * PX_PER_DAY : null;
    return { width, lanes: laneArr, months, weeks, milestones, todayX };
  }, [actions]);

  if (!model) return <Empty />;
  const { width, lanes, months, weeks, milestones, todayX } = model;
  const loadColor = (n: number) => n >= 3 ? "rgba(197,48,48,0.32)" : n === 2 ? "rgba(214,138,30,0.30)" : n === 1 ? "rgba(122,158,126,0.16)" : "transparent";

  return (
    <div>
      <div style={{ overflowX: "auto", border: "0.5px solid var(--hub-border)", borderRadius: 12, background: "white" }}>
        <div style={{ minWidth: LANE_W + width, position: "relative" }}>
          {/* Mois */}
          <div style={{ display: "flex", height: 26, borderBottom: "0.5px solid var(--hub-border)" }}>
            <div style={stickyLabel(26)} />
            <div style={{ position: "relative", width }}>
              {months.map((m, i) => (
                <div key={i} style={{ position: "absolute", left: m.x, width: m.w, height: 26, borderLeft: "0.5px solid var(--hub-border)", display: "flex", alignItems: "center", paddingLeft: 6, fontFamily: "var(--font-sans)", fontSize: 10.5, fontWeight: 600, color: "var(--hub-foreground)", opacity: 0.6, textTransform: "uppercase", letterSpacing: "0.04em" }}>{m.label}</div>
              ))}
            </div>
          </div>
          {/* Charge */}
          <div style={{ display: "flex", height: 30, borderBottom: "0.5px solid var(--hub-border)", background: "var(--hub-bg)" }}>
            <div style={{ ...stickyLabel(30), fontWeight: 700, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.06em", opacity: 0.55, display: "flex", alignItems: "center", paddingLeft: 12 }}>Charge prép.</div>
            <div style={{ position: "relative", width }}>
              {weeks.map((w, i) => (
                <div key={i} title={w.count ? `${w.count} collection(s) en préparation : ${w.camps.join(", ")}` : "Pas de prépa cette semaine"} style={{ position: "absolute", left: w.x, width: w.w, top: 4, height: 22, borderRadius: 3, background: loadColor(w.count), display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-sans)", fontSize: 9.5, fontWeight: 700, color: w.count >= 3 ? "#C53030" : w.count === 2 ? "#9A4400" : "transparent" }}>
                  {w.count >= 2 ? `×${w.count}` : ""}
                </div>
              ))}
            </div>
          </div>
          {/* Réunions de collection — jalons étoile (présentation ⟶ validation) */}
          <div style={{ display: "flex", height: STAR_ROW_H, borderBottom: "0.5px solid var(--hub-border)", background: "var(--hub-bg)" }}>
            <div style={{ ...stickyLabel(STAR_ROW_H), fontWeight: 700, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.06em", opacity: 0.55, display: "flex", alignItems: "center", paddingLeft: 12 }}>Réunions</div>
            <div style={{ position: "relative", width }}>
              {milestones.map((m) => <MilestoneMarker key={m.camp} m={m} selected={selected} onSelect={onSelect} />)}
            </div>
          </div>
          {/* Lanes */}
          {lanes.map((lane, li) => (
            <div key={lane.camp} style={{ display: "flex", minHeight: lane.height, borderBottom: "0.5px solid rgba(0,0,0,0.05)", background: lane.evergreen ? "rgba(140,123,176,0.04)" : li % 2 ? "rgba(0,0,0,0.012)" : "transparent" }}>
              <div style={{ ...stickyLabel(lane.height), background: lane.evergreen ? "#FBFAFC" : "white", display: "flex", alignItems: "center", paddingLeft: 12, paddingRight: 8, fontFamily: "var(--font-sans)", fontSize: 11.5, fontWeight: 600, color: "var(--hub-foreground)", lineHeight: 1.2 }}>{lane.camp}</div>
              <div style={{ position: "relative", width, height: lane.height }}>
                {lane.placed.map(({ a, x, w, row }) => {
                  const eq = EQUIPE_META[a.equipe];
                  const done = a.statut === "fait"; const enCours = a.statut === "en_cours";
                  return (
                    <button key={a.id} type="button" onClick={() => onSelect(selected === a.id ? null : a.id)}
                      title={`${a.titre} · ${dayLabel(a.date)}${a.date_fin ? " → " + dayLabel(a.date_fin) : ""} · ${eq.label} · ${STATUT_META[a.statut].label}${a.responsable ? " · " + a.responsable : ""}`}
                      style={{
                        position: "absolute", left: x, top: LANE_PAD + row * (PILL_H + V_GAP), height: PILL_H, width: w,
                        background: done ? "white" : eq.color, color: done ? eq.color : "white",
                        border: `${enCours ? "1.5px dashed" : "1.5px solid"} ${eq.color}`,
                        borderRadius: 6, cursor: "pointer", padding: "0 7px",
                        boxShadow: selected === a.id ? `0 0 0 2px ${eq.color}66` : "none",
                        display: "flex", alignItems: "center", gap: 4, overflow: "hidden", whiteSpace: "nowrap",
                        fontFamily: "var(--font-sans)", fontSize: 10, fontWeight: 600,
                      }}>
                      <span style={{ fontSize: 9 }}>{TYPE_ICON[a.type]}</span>
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{TYPE_LABEL[a.type]}{done ? " ✓" : ""}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
          {/* Lignes-guides des réunions (pleine hauteur = la deadline traverse toutes les équipes) */}
          {milestones.flatMap((m) => [
            m.presX != null && <div key={m.camp + "-gp"} style={{ position: "absolute", left: LANE_W + m.presX, top: STAR_ROW_H + 56, bottom: 0, width: 0, borderLeft: `1px dashed ${MS_PRES.color}`, opacity: selected === m.pres?.id ? 0.6 : 0.16, pointerEvents: "none" }} />,
            m.valX != null && <div key={m.camp + "-gv"} style={{ position: "absolute", left: LANE_W + m.valX, top: STAR_ROW_H + 56, bottom: 0, width: 0, borderLeft: `1px dashed ${MS_VALID.color}`, opacity: selected === m.valid?.id ? 0.6 : 0.16, pointerEvents: "none" }} />,
          ])}
          {/* Trait aujourd'hui (overlay pleine hauteur) */}
          {todayX != null && <div style={{ position: "absolute", left: LANE_W + todayX, top: 0, bottom: 0, width: 2, background: "#C53030", opacity: 0.55, pointerEvents: "none" }} />}
        </div>
      </div>
      {/* Légende */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 16, marginTop: 12, fontFamily: "var(--font-sans)", fontSize: 11, color: "var(--hub-foreground)", opacity: 0.85 }}>
        {(Object.keys(EQUIPE_META) as Equipe[]).map((e) => (
          <span key={e} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 14, height: 11, borderRadius: 3, background: EQUIPE_META[e].color }} /> {EQUIPE_META[e].label}
          </span>
        ))}
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><span style={{ width: 14, height: 11, borderRadius: 3, background: "rgba(214,138,30,0.5)" }} /> ×2 double run</span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><span style={{ width: 14, height: 11, borderRadius: 3, background: "rgba(197,48,48,0.5)" }} /> ×3 triple run</span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><span style={{ color: MS_PRES.color, fontSize: 14 }}>★</span> réunion présentation</span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><span style={{ color: MS_VALID.color, fontSize: 14 }}>★</span> réunion validation</span>
        <span style={{ opacity: 0.65 }}>🧵 test broderie · ⚙️ production · 📌 Pinterest · trait rouge = aujourd'hui · clic = détail</span>
      </div>
    </div>
  );
}

function stickyLabel(h: number): React.CSSProperties {
  return { position: "sticky", left: 0, zIndex: 2, width: LANE_W, minWidth: LANE_W, height: h, background: "white", borderRight: "0.5px solid var(--hub-border)" };
}

// ──────────────────────────────────────────────────────────────── LISTE
function ListView({ actions, drops, saving, onCycle, onDate, onResp, onDelete }: {
  actions: ActionPlanning[]; drops: DropMeta[]; saving: string | null;
  onCycle: (a: ActionPlanning) => void; onDate: (id: string, d: string) => void; onResp: (id: string, r: string) => void; onDelete: (id: string) => void;
}) {
  const dropNom = useMemo(() => Object.fromEntries(drops.map((d) => [d.code, d.nom])), [drops]);
  const months = useMemo(() => {
    const m = new Map<string, ActionPlanning[]>();
    for (const a of actions) { const k = a.date.slice(0, 7); if (!m.has(k)) m.set(k, []); m.get(k)!.push(a); }
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [actions]);
  if (actions.length === 0) return <Empty />;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {months.map(([key, items]) => {
        const [y, mo] = key.split("-").map(Number);
        return (
          <section key={key}>
            <h2 style={{ fontFamily: "var(--font-editorial)", fontSize: 18, fontWeight: 500, margin: "0 0 10px" }}>
              {cap(new Date(y, mo - 1, 1).toLocaleDateString("fr-FR", { month: "long", year: "numeric" }))}
              <span style={{ fontFamily: "var(--font-sans)", fontSize: 11, fontWeight: 400, opacity: 0.45, marginLeft: 8 }}>{items.length}</span>
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {items.map((a) => {
                const eq = EQUIPE_META[a.equipe]; const st = STATUT_META[a.statut];
                return (
                  <article key={a.id} style={{ display: "flex", alignItems: "center", gap: 14, background: "white", border: "0.5px solid var(--hub-border)", borderLeft: `3px solid ${eq.color}`, borderRadius: 10, padding: "12px 14px", opacity: a.statut === "fait" ? 0.72 : 1 }}>
                    <div style={{ minWidth: 92 }}>
                      <input type="date" value={a.date} onChange={(e) => onDate(a.id, e.target.value)} style={{ fontFamily: "var(--font-sans)", fontSize: 12, fontWeight: 600, color: "var(--hub-foreground)", border: "none", background: "transparent", padding: 0, cursor: "pointer", width: "100%" }} />
                      {a.date_fin && <span style={{ fontFamily: "var(--font-sans)", fontSize: 10.5, opacity: 0.5 }}>→ {dayLabel(a.date_fin)}</span>}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: "var(--font-sans)", fontSize: 13.5, fontWeight: 500, lineHeight: 1.35 }}>{a.titre}</div>
                      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8, marginTop: 4 }}>
                        <span style={{ fontFamily: "var(--font-sans)", fontSize: 10, fontWeight: 600, color: eq.color, background: eq.bg, padding: "2px 7px", borderRadius: 999 }}>{eq.label}</span>
                        <span style={{ fontFamily: "var(--font-sans)", fontSize: 11, opacity: 0.55 }}>{TYPE_LABEL[a.type]} · {a.campagne || dropNom[a.drop] || a.drop}</span>
                        {a.notes && <span style={{ fontFamily: "var(--font-sans)", fontSize: 11, color: "#9A4400" }}>{a.notes}</span>}
                      </div>
                    </div>
                    <input type="text" defaultValue={a.responsable} placeholder="Responsable" onBlur={(e) => { if (e.target.value.trim() !== a.responsable) onResp(a.id, e.target.value.trim()); }}
                      style={{ width: 104, fontFamily: "var(--font-sans)", fontSize: 11.5, color: "var(--hub-foreground)", textAlign: "right", border: "none", background: "transparent", padding: "2px 0", outline: "none" }} />
                    <button type="button" onClick={() => onCycle(a)} title="Faire avancer le statut"
                      style={{ minWidth: 76, padding: "5px 10px", borderRadius: 999, cursor: "pointer", border: "none", background: st.bg, color: st.fg, fontFamily: "var(--font-sans)", fontSize: 11, fontWeight: 600, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 5 }}>
                      {saving === a.id ? <Loader2 size={11} className="animate-spin" /> : null}{st.label}
                    </button>
                    <button type="button" onClick={() => onDelete(a.id)} aria-label="Supprimer" style={{ border: "none", background: "transparent", cursor: "pointer", color: "#c53030", opacity: 0.5, padding: 4 }}><Trash2 size={14} /></button>
                  </article>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────── DÉTAIL
function DetailCard({ a, saving, onCycle, onDate, onDateFin, onResp, onDelete, onClose }: {
  a: ActionPlanning; saving: boolean; onCycle: () => void; onDate: (d: string) => void; onDateFin: (d: string) => void; onResp: (r: string) => void; onDelete: () => void; onClose: () => void;
}) {
  const eq = EQUIPE_META[a.equipe]; const st = STATUT_META[a.statut];
  return (
    <div style={{ marginTop: 16, background: "white", border: "0.5px solid var(--hub-border)", borderLeft: `3px solid ${eq.color}`, borderRadius: 12, padding: 16, display: "flex", flexWrap: "wrap", alignItems: "center", gap: 16 }}>
      <div style={{ flex: 1, minWidth: 200 }}>
        <div style={{ fontFamily: "var(--font-editorial)", fontSize: 16, fontWeight: 500 }}>{a.titre}</div>
        <div style={{ fontFamily: "var(--font-sans)", fontSize: 11.5, opacity: 0.6, marginTop: 2 }}>{TYPE_LABEL[a.type]} · {a.campagne} · <span style={{ color: eq.color, fontWeight: 600 }}>{eq.label}</span></div>
        {a.notes && <div style={{ fontFamily: "var(--font-sans)", fontSize: 11.5, color: "#9A4400", marginTop: 4 }}>{a.notes}</div>}
      </div>
      <label style={miniLabel}>Début<input type="date" value={a.date} onChange={(e) => onDate(e.target.value)} style={miniInput} /></label>
      <label style={miniLabel}>Fin<input type="date" value={a.date_fin || ""} onChange={(e) => onDateFin(e.target.value)} style={miniInput} /></label>
      <label style={miniLabel}>Responsable<input type="text" defaultValue={a.responsable} onBlur={(e) => onResp(e.target.value.trim())} style={{ ...miniInput, width: 120 }} /></label>
      <button type="button" onClick={onCycle} style={{ minWidth: 80, padding: "7px 12px", borderRadius: 999, cursor: "pointer", border: "none", background: st.bg, color: st.fg, fontFamily: "var(--font-sans)", fontSize: 12, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 6 }}>
        {saving ? <Loader2 size={12} className="animate-spin" /> : null}{st.label}
      </button>
      <button type="button" onClick={onDelete} aria-label="Supprimer" style={{ border: "0.5px solid #c53030", background: "white", color: "#c53030", borderRadius: 999, cursor: "pointer", padding: "7px 10px" }}><Trash2 size={14} /></button>
      <button type="button" onClick={onClose} aria-label="Fermer" style={{ border: "none", background: "transparent", cursor: "pointer", opacity: 0.5, padding: 4 }}><X size={16} /></button>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────── AJOUT
function AddEventForm({ campagnes, onCancel, onSubmit }: { campagnes: string[]; onCancel: () => void; onSubmit: (b: Partial<ActionPlanning>) => void }) {
  const [titre, setTitre] = useState("");
  const [date, setDate] = useState("");
  const [dateFin, setDateFin] = useState("");
  const [equipe, setEquipe] = useState<Equipe>("crea");
  const [type, setType] = useState<TypeAction>("plan_collection");
  const [campagne, setCampagne] = useState("");
  const [responsable, setResponsable] = useState("");
  const valid = titre.trim() && date;
  return (
    <div style={{ marginBottom: 18, background: "white", border: "0.5px solid var(--hub-border)", borderRadius: 12, padding: 16 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12 }}>
        <Field label="Titre *"><input value={titre} onChange={(e) => setTitre(e.target.value)} placeholder="Réunion de collection — …" style={inp} /></Field>
        <Field label="Date début *"><input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={inp} /></Field>
        <Field label="Date fin (option)"><input type="date" value={dateFin} onChange={(e) => setDateFin(e.target.value)} style={inp} /></Field>
        <Field label="Équipe"><select value={equipe} onChange={(e) => setEquipe(e.target.value as Equipe)} style={inp}>{(Object.keys(EQUIPE_META) as Equipe[]).map((e) => <option key={e} value={e}>{EQUIPE_META[e].label}</option>)}</select></Field>
        <Field label="Type"><select value={type} onChange={(e) => setType(e.target.value as TypeAction)} style={inp}>{TYPE_OPTIONS.map((t) => <option key={t} value={t}>{TYPE_LABEL[t]}</option>)}</select></Field>
        <Field label="Collection / campagne"><input list="campagnes-list" value={campagne} onChange={(e) => setCampagne(e.target.value)} placeholder="Noël 2026…" style={inp} /><datalist id="campagnes-list">{campagnes.map((c) => <option key={c} value={c} />)}</datalist></Field>
        <Field label="Responsable"><input value={responsable} onChange={(e) => setResponsable(e.target.value)} placeholder="Sarah…" style={inp} /></Field>
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 14, justifyContent: "flex-end" }}>
        <button type="button" onClick={onCancel} style={{ padding: "8px 16px", borderRadius: 999, border: "0.5px solid var(--hub-border)", background: "white", cursor: "pointer", fontFamily: "var(--font-sans)", fontSize: 12 }}>Annuler</button>
        <button type="button" disabled={!valid} onClick={() => onSubmit({ titre: titre.trim(), date, date_fin: dateFin || undefined, equipe, type, campagne: campagne.trim(), responsable: responsable.trim() })}
          style={{ padding: "8px 18px", borderRadius: 999, border: "none", background: valid ? "var(--hub-foreground)" : "var(--hub-border)", color: "var(--hub-bg)", cursor: valid ? "pointer" : "not-allowed", fontFamily: "var(--font-sans)", fontSize: 12, fontWeight: 600 }}>Ajouter</button>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────── PETITS
function ToggleBtn({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return <button type="button" onClick={onClick} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 999, cursor: "pointer", border: "0.5px solid var(--hub-border)", background: active ? "var(--hub-foreground)" : "white", color: active ? "var(--hub-bg)" : "var(--hub-foreground)", fontFamily: "var(--font-sans)", fontSize: 11.5, fontWeight: 600 }}>{icon}{label}</button>;
}
function FilterGroup({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: { v: string; label: string }[] }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <span style={{ fontFamily: "var(--font-sans)", fontSize: 10.5, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", opacity: 0.5 }}>{label}</span>
      <div style={{ display: "flex", gap: 4 }}>
        {options.map((o) => (
          <button key={o.v} type="button" onClick={() => onChange(o.v)} style={{ padding: "5px 10px", borderRadius: 999, cursor: "pointer", fontFamily: "var(--font-sans)", fontSize: 11.5, fontWeight: 500, border: "0.5px solid var(--hub-border)", background: value === o.v ? "var(--hub-foreground)" : "white", color: value === o.v ? "var(--hub-bg)" : "var(--hub-foreground)" }}>{o.label}</button>
        ))}
      </div>
    </div>
  );
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label style={{ display: "flex", flexDirection: "column", gap: 4, fontFamily: "var(--font-sans)", fontSize: 10.5, fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase", opacity: 0.6 }}>{label}{children}</label>;
}
function Empty() {
  return <p style={{ fontFamily: "var(--font-sans)", fontSize: 13, opacity: 0.55, padding: 24, textAlign: "center", border: "1px dashed var(--hub-border)", borderRadius: 12 }}>Aucune action pour ces filtres.</p>;
}
const inp: React.CSSProperties = { fontFamily: "var(--font-sans)", fontSize: 12.5, padding: "7px 10px", borderRadius: 8, border: "0.5px solid var(--hub-border)", background: "white", color: "var(--hub-foreground)", outline: "none", textTransform: "none", fontWeight: 400, letterSpacing: 0 };
const miniLabel: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 3, fontFamily: "var(--font-sans)", fontSize: 9.5, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", opacity: 0.55 };
const miniInput: React.CSSProperties = { fontFamily: "var(--font-sans)", fontSize: 12, padding: "5px 8px", borderRadius: 7, border: "0.5px solid var(--hub-border)", background: "white", color: "var(--hub-foreground)", outline: "none" };
