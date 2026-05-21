"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, Plus, X, ChevronLeft, ChevronRight, Trash2, Pencil, Save, HelpCircle, Bug, Sparkles, ScrollText, StickyNote, Gavel, Search, Archive, Users, Upload } from "lucide-react";
import type { ProdKanbanRef, KanbanCard, KanbanColumn } from "@/lib/atelier-da/referentiels-loader";

const STAKEHOLDERS = ["Rebecca", "Cyrielle", "Adriana", "Thierry", "Sarah"] as const;
const ARCHIVE_AFTER_DAYS = 7;

const TYPE_META: Record<string, { label: string; icon: React.ReactNode; bg: string }> = {
  question:     { label: "Question",    icon: <HelpCircle size={11} />,  bg: "#FEF6E0" },
  bug:          { label: "Bug",         icon: <Bug size={11} />,         bg: "#FCE6E5" },
  amelioration: { label: "Amélioration",icon: <Sparkles size={11} />,    bg: "#E5F0E8" },
  decision:     { label: "Décision",    icon: <ScrollText size={11} />,  bg: "#E5EAF5" },
  regle:        { label: "Règle",       icon: <Gavel size={11} />,       bg: "#EFE6F5" },
  autre:        { label: "Autre",       icon: <StickyNote size={11} />,  bg: "#F0EDE8" },
};

function daysSince(dateStr: string | undefined): number {
  if (!dateStr) return 0;
  const d = new Date(dateStr).getTime();
  if (isNaN(d)) return 0;
  return Math.floor((Date.now() - d) / (1000 * 60 * 60 * 24));
}
function isArchived(card: KanbanCard): boolean {
  return card.column_id === "fait" && !!card.done_at && daysSince(card.done_at) >= ARCHIVE_AFTER_DAYS;
}

export default function KanbanPage() {
  const [data, setData] = useState<ProdKanbanRef | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addingColumnId, setAddingColumnId] = useState<string | null>(null);
  const [editingCardId, setEditingCardId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const res = await fetch("/api/da/prod-kanban", { cache: "no-store" }).then((r) => r.json());
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

  const columnsSorted = [...data.columns].sort((a, b) => a.ordre - b.ordre);
  const liveCards = data.cards.filter((c) => !isArchived(c));
  const archivedCards = data.cards.filter(isArchived);

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

      <header style={{ marginBottom: 32 }}>
        <h1 style={{ fontFamily: "var(--font-editorial)", fontSize: 36, fontWeight: 500, margin: 0, marginBottom: 8 }}>
          Kanban prod
        </h1>
        <p style={{ fontFamily: "var(--font-sans)", fontSize: 13, color: "var(--hub-foreground)", opacity: 0.65, maxWidth: 720 }}>
          {liveCards.length} card{liveCards.length > 1 ? "s" : ""} actives · {archivedCards.length} archivée{archivedCards.length > 1 ? "s" : ""} · Adriana, Sarah, Rebecca, Cyrielle, Thierry posent leurs questions, améliorations, décisions, règles. Glisse une card (← →) pour suivre l&apos;avancement. Les <strong>Fait</strong> &gt; {ARCHIVE_AFTER_DAYS} jours basculent automatiquement dans Archives.
        </p>
      </header>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${columnsSorted.length}, minmax(220px, 1fr))`,
          gap: 14,
          alignItems: "start",
        }}
      >
        {columnsSorted.map((col) => {
          const cards = liveCards.filter((c) => c.column_id === col.id);
          return (
            <Column
              key={col.id}
              column={col}
              cards={cards}
              columns={columnsSorted}
              addingThisColumn={addingColumnId === col.id}
              onOpenAdd={() => setAddingColumnId(col.id)}
              onCloseAdd={() => setAddingColumnId(null)}
              editingCardId={editingCardId}
              onEditCard={setEditingCardId}
              onSaved={refresh}
            />
          );
        })}
      </div>

      <ArchivesSection cards={archivedCards} columns={columnsSorted} onSaved={refresh} />
    </div>
  );
}

function ArchivesSection({ cards, columns, onSaved }: { cards: KanbanCard[]; columns: KanbanColumn[]; onSaved: () => Promise<void> }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return cards;
    return cards.filter((c) => {
      const hay = [
        c.title,
        c.body || "",
        (c.tags || []).join(" "),
        (c.stakeholders || []).join(" "),
        c.type || "",
      ].join(" ").toLowerCase();
      return hay.includes(q);
    });
  }, [cards, query]);

  return (
    <section style={{ marginTop: 56, paddingTop: 32, borderTop: "0.5px solid var(--hub-border)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, gap: 16, flexWrap: "wrap" }}>
        <h2 style={{ fontFamily: "var(--font-editorial)", fontSize: 22, fontWeight: 500, margin: 0, display: "inline-flex", alignItems: "center", gap: 10 }}>
          <Archive size={18} strokeWidth={1.4} /> Archives
          <span style={{ fontFamily: "var(--font-sans)", fontSize: 12, fontWeight: 400, opacity: 0.55 }}>{cards.length} card{cards.length > 1 ? "s" : ""}</span>
        </h2>
        <div style={{ position: "relative", maxWidth: 420, flex: 1 }}>
          <Search size={13} strokeWidth={1.5} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", opacity: 0.45 }} />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher par mot-clé (titre, body, tag, partie prenante…)"
            style={{
              width: "100%",
              padding: "8px 12px 8px 32px",
              border: "0.5px solid var(--hub-border)",
              borderRadius: 999,
              fontFamily: "var(--font-sans)",
              fontSize: 12,
              background: "white",
              boxSizing: "border-box",
            }}
          />
        </div>
      </div>

      {cards.length === 0 && (
        <p style={{ fontFamily: "var(--font-sans)", fontSize: 12, opacity: 0.55, fontStyle: "italic", margin: 0, padding: "16px 0" }}>
          Aucune archive pour l&apos;instant. Les cards passées en <strong>Fait</strong> et inactives depuis {ARCHIVE_AFTER_DAYS} jours apparaîtront ici.
        </p>
      )}

      {cards.length > 0 && filtered.length === 0 && (
        <p style={{ fontFamily: "var(--font-sans)", fontSize: 12, opacity: 0.55, fontStyle: "italic", margin: 0 }}>
          Aucun résultat pour <em>&quot;{query}&quot;</em>.
        </p>
      )}

      {filtered.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
          {filtered
            .sort((a, b) => (b.done_at || "").localeCompare(a.done_at || ""))
            .map((card) => (
              <ArchiveCard key={card.id} card={card} columns={columns} onSaved={onSaved} />
            ))}
        </div>
      )}
    </section>
  );
}

function ArchiveCard({ card, columns, onSaved }: { card: KanbanCard; columns: KanbanColumn[]; onSaved: () => Promise<void> }) {
  const meta = TYPE_META[card.type || "question"] || TYPE_META.question;
  const [busy, setBusy] = useState(false);

  const restore = async () => {
    setBusy(true);
    try {
      // Restaure dans "Fait" mais avec done_at = today (réamorce le délai d'archive)
      const today = new Date().toISOString().slice(0, 10);
      const res = await fetch("/api/da/prod-kanban", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: card.id, column_id: columns[Math.max(0, columns.findIndex((c) => c.id === "fait") - 1)]?.id || "fait" }),
      }).then((r) => r.json());
      if (!res.ok) throw new Error(res.error);
      await onSaved();
    } finally {
      setBusy(false);
    }
  };

  return (
    <article style={{ background: meta.bg, borderRadius: 8, padding: 12, fontFamily: "var(--font-sans)", opacity: busy ? 0.5 : 1 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 6, fontSize: 9, fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--hub-foreground)", opacity: 0.7 }}>
        {meta.icon}
        {meta.label}
        <span style={{ marginLeft: "auto", textTransform: "none", letterSpacing: 0, fontWeight: 400, fontSize: 10 }}>{card.done_at || card.updated_at}</span>
      </div>
      <h4 style={{ fontFamily: "var(--font-editorial)", fontSize: 14, fontWeight: 500, color: "var(--hub-foreground)", margin: "0 0 6px 0", lineHeight: 1.3 }}>
        {card.title}
      </h4>
      {card.body && (
        <p style={{ margin: "4px 0 6px 0", fontSize: 11, lineHeight: 1.4, color: "var(--hub-foreground)", opacity: 0.8, whiteSpace: "pre-wrap" }}>
          {card.body}
        </p>
      )}
      {card.stakeholders && card.stakeholders.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 6 }}>
          <Users size={10} style={{ opacity: 0.5, marginRight: 2, alignSelf: "center" }} />
          {card.stakeholders.map((s) => (
            <span key={s} style={{ fontSize: 9, padding: "1px 6px", background: "rgba(0,0,0,0.08)", borderRadius: 999, color: "var(--hub-foreground)" }}>
              {s}
            </span>
          ))}
        </div>
      )}
      {card.tags && card.tags.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
          {card.tags.map((t) => (
            <span key={t} style={{ fontSize: 9, padding: "1px 6px", background: "rgba(0,0,0,0.06)", borderRadius: 999, color: "var(--hub-foreground)", opacity: 0.7 }}>
              {t}
            </span>
          ))}
        </div>
      )}
      <button type="button" onClick={restore} disabled={busy} style={{
        marginTop: 8, padding: "4px 10px", borderRadius: 999, border: "0.5px solid rgba(0,0,0,0.15)",
        background: "white", fontFamily: "var(--font-sans)", fontSize: 10, cursor: "pointer",
        display: "inline-flex", alignItems: "center", gap: 4, color: "var(--hub-foreground)",
      }}>
        <ChevronLeft size={10} /> Restaurer
      </button>
    </article>
  );
}

function Column({
  column, cards, columns,
  addingThisColumn, onOpenAdd, onCloseAdd,
  editingCardId, onEditCard, onSaved,
}: {
  column: KanbanColumn;
  cards: KanbanCard[];
  columns: KanbanColumn[];
  addingThisColumn: boolean;
  onOpenAdd: () => void;
  onCloseAdd: () => void;
  editingCardId: string | null;
  onEditCard: (id: string | null) => void;
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
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "2px 4px 8px", borderBottom: `1.5px solid ${column.couleur || "var(--hub-border)"}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ width: 8, height: 8, borderRadius: 999, background: column.couleur || "#999" }} />
          <h3 style={{ fontFamily: "var(--font-sans)", fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--hub-foreground)", margin: 0 }}>
            {column.label}
          </h3>
          <span style={{ fontFamily: "var(--font-sans)", fontSize: 10, opacity: 0.5 }}>{cards.length}</span>
        </div>
        <button
          type="button"
          onClick={onOpenAdd}
          aria-label="Ajouter une card"
          style={{
            width: 22, height: 22, borderRadius: 999,
            background: "white", border: "0.5px solid var(--hub-border)",
            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          <Plus size={12} />
        </button>
      </header>

      {addingThisColumn && (
        <NewCardForm columnId={column.id} onCancel={onCloseAdd} onSaved={async () => { await onSaved(); onCloseAdd(); }} />
      )}

      {cards.length === 0 && !addingThisColumn && (
        <p style={{ fontFamily: "var(--font-sans)", fontSize: 11, opacity: 0.45, fontStyle: "italic", margin: 0, padding: "8px 4px" }}>
          Aucune card
        </p>
      )}

      {cards.map((card) => (
        <CardItem
          key={card.id}
          card={card}
          columns={columns}
          editing={editingCardId === card.id}
          onStartEdit={() => onEditCard(card.id)}
          onCancelEdit={() => onEditCard(null)}
          onSaved={async () => { await onSaved(); onEditCard(null); }}
        />
      ))}
    </div>
  );
}

function CardItem({
  card, columns, editing, onStartEdit, onCancelEdit, onSaved,
}: {
  card: KanbanCard;
  columns: KanbanColumn[];
  editing: boolean;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSaved: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const meta = TYPE_META[card.type || "question"] || TYPE_META.question;
  const colIdx = columns.findIndex((c) => c.id === card.column_id);
  const prevCol = colIdx > 0 ? columns[colIdx - 1] : null;
  const nextCol = colIdx < columns.length - 1 ? columns[colIdx + 1] : null;

  const move = async (newColumnId: string) => {
    setBusy(true);
    try {
      const res = await fetch("/api/da/prod-kanban", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: card.id, column_id: newColumnId }),
      }).then((r) => r.json());
      if (!res.ok) throw new Error(res.error);
      await onSaved();
    } catch (e) {
      console.error(e);
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!confirm(`Supprimer "${card.title}" ?`)) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/da/prod-kanban?id=${encodeURIComponent(card.id)}`, { method: "DELETE" }).then((r) => r.json());
      if (!res.ok) throw new Error(res.error);
      await onSaved();
    } finally {
      setBusy(false);
    }
  };

  const promote = async () => {
    if (!confirm(`Promouvoir "${card.title}" en règle ?\n\nElle sera ajoutée dans Règles & contraintes broderie.`)) return;
    setBusy(true);
    try {
      const res = await fetch("/api/da/prod-kanban/promote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ card_id: card.id }),
      }).then((r) => r.json());
      if (!res.ok) throw new Error(res.error);
      await onSaved();
      alert(`✓ Règle "${res.data.placement.label}" créée dans Règles & contraintes broderie.`);
    } catch (e) {
      alert(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };
  const alreadyPromu = (card.tags || []).includes("promu_en_regle");

  if (editing) {
    return <EditCardForm card={card} onCancel={onCancelEdit} onSaved={onSaved} />;
  }

  return (
    <article
      style={{
        background: meta.bg,
        borderRadius: 8,
        padding: 10,
        boxShadow: "0 1px 2px rgba(0,0,0,0.05), 0 0 0 0.5px rgba(0,0,0,0.04)",
        fontFamily: "var(--font-sans)",
        position: "relative",
        opacity: busy ? 0.5 : 1,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 6, fontSize: 9, fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--hub-foreground)", opacity: 0.7 }}>
        {meta.icon}
        {meta.label}
        {card.auteur && <span style={{ opacity: 0.7, marginLeft: "auto", textTransform: "none", letterSpacing: 0, fontWeight: 400, fontSize: 10 }}>{card.auteur}</span>}
      </div>
      <h4 style={{ fontFamily: "var(--font-editorial)", fontSize: 14, fontWeight: 500, color: "var(--hub-foreground)", margin: "0 0 4px 0", lineHeight: 1.3 }}>
        {card.title}
      </h4>
      {card.body && (
        <p style={{ margin: "4px 0 6px 0", fontSize: 11, lineHeight: 1.4, color: "var(--hub-foreground)", opacity: 0.8, whiteSpace: "pre-wrap" }}>
          {card.body}
        </p>
      )}
      {card.stakeholders && card.stakeholders.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 6 }}>
          <Users size={10} style={{ opacity: 0.5, marginRight: 2, alignSelf: "center" }} />
          {card.stakeholders.map((s) => (
            <span key={s} style={{ fontSize: 9, padding: "1px 6px", background: "rgba(0,0,0,0.08)", borderRadius: 999, color: "var(--hub-foreground)" }}>
              {s}
            </span>
          ))}
        </div>
      )}
      {card.tags && card.tags.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 6 }}>
          {card.tags.map((t) => (
            <span key={t} style={{ fontSize: 9, padding: "1px 6px", background: "rgba(0,0,0,0.06)", borderRadius: 999, color: "var(--hub-foreground)", opacity: 0.7 }}>
              {t}
            </span>
          ))}
        </div>
      )}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 6, fontSize: 10, opacity: 0.55 }}>
        <span>{card.updated_at}</span>
        <div style={{ display: "flex", gap: 2 }}>
          {prevCol && (
            <button
              type="button" onClick={() => move(prevCol.id)} disabled={busy}
              title={`Déplacer vers ${prevCol.label}`}
              style={iconBtnStyle}
            >
              <ChevronLeft size={12} />
            </button>
          )}
          {nextCol && (
            <button
              type="button" onClick={() => move(nextCol.id)} disabled={busy}
              title={`Déplacer vers ${nextCol.label}`}
              style={iconBtnStyle}
            >
              <ChevronRight size={12} />
            </button>
          )}
          <button type="button" onClick={onStartEdit} disabled={busy} title="Éditer" style={iconBtnStyle}>
            <Pencil size={11} />
          </button>
          {!alreadyPromu && (
            <button type="button" onClick={promote} disabled={busy} title="Promouvoir en règle (ajoute dans Règles & contraintes broderie)" style={iconBtnStyle}>
              <Upload size={11} />
            </button>
          )}
          <button type="button" onClick={remove} disabled={busy} title="Supprimer" style={iconBtnStyle}>
            <Trash2 size={11} />
          </button>
        </div>
      </div>
    </article>
  );
}

function StakeholdersPicker({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const toggle = (s: string) => {
    if (value.includes(s)) onChange(value.filter((x) => x !== s));
    else onChange([...value, s]);
  };
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
      {STAKEHOLDERS.map((s) => {
        const on = value.includes(s);
        return (
          <button
            key={s}
            type="button"
            onClick={() => toggle(s)}
            style={{
              padding: "3px 9px", borderRadius: 999,
              border: on ? "none" : "0.5px solid var(--hub-border)",
              background: on ? "var(--hub-foreground)" : "white",
              color: on ? "var(--hub-bg)" : "var(--hub-foreground)",
              fontFamily: "var(--font-sans)", fontSize: 10, fontWeight: 500,
              cursor: "pointer",
            }}
          >
            {s}
          </button>
        );
      })}
    </div>
  );
}

function NewCardForm({
  columnId, onCancel, onSaved,
}: { columnId: string; onCancel: () => void; onSaved: () => Promise<void> }) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [type, setType] = useState<KanbanCard["type"]>("question");
  const [stakeholders, setStakeholders] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) { setErr("Titre requis"); return; }
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/da/prod-kanban", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), body: body.trim(), type, column_id: columnId, stakeholders }),
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
      <select value={type} onChange={(e) => setType(e.target.value as KanbanCard["type"])} style={inputStyle}>
        {Object.entries(TYPE_META).map(([k, m]) => (
          <option key={k} value={k}>{m.label}</option>
        ))}
      </select>
      <input
        autoFocus
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Titre de la card…"
        style={inputStyle}
      />
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Détails (optionnel)"
        rows={2}
        style={{ ...inputStyle, resize: "vertical" }}
      />
      <div>
        <div style={{ fontFamily: "var(--font-sans)", fontSize: 9, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", opacity: 0.5, marginBottom: 4 }}>
          Parties prenantes
        </div>
        <StakeholdersPicker value={stakeholders} onChange={setStakeholders} />
      </div>
      {err && <div style={{ color: "#a13a16", fontSize: 11 }}>{err}</div>}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 4 }}>
        <button type="button" onClick={onCancel} disabled={busy} style={{ ...btnGhostStyle }}><X size={11} /> Annuler</button>
        <button type="submit" disabled={busy || !title.trim()} style={{ ...btnPrimaryStyle, opacity: busy || !title.trim() ? 0.5 : 1 }}>
          {busy ? <Loader2 size={11} className="animate-spin" /> : <Save size={11} />} Créer
        </button>
      </div>
    </form>
  );
}

function EditCardForm({
  card, onCancel, onSaved,
}: { card: KanbanCard; onCancel: () => void; onSaved: () => Promise<void> }) {
  const [title, setTitle] = useState(card.title);
  const [body, setBody] = useState(card.body || "");
  const [type, setType] = useState<KanbanCard["type"]>(card.type || "question");
  const [stakeholders, setStakeholders] = useState<string[]>(card.stakeholders ? [...card.stakeholders] : []);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) { setErr("Titre requis"); return; }
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/da/prod-kanban", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: card.id, title: title.trim(), body: body.trim(), type, stakeholders }),
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
      <select value={type} onChange={(e) => setType(e.target.value as KanbanCard["type"])} style={inputStyle}>
        {Object.entries(TYPE_META).map(([k, m]) => (
          <option key={k} value={k}>{m.label}</option>
        ))}
      </select>
      <input autoFocus type="text" value={title} onChange={(e) => setTitle(e.target.value)} style={inputStyle} />
      <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={2} style={{ ...inputStyle, resize: "vertical" }} />
      <div>
        <div style={{ fontFamily: "var(--font-sans)", fontSize: 9, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", opacity: 0.5, marginBottom: 4 }}>
          Parties prenantes
        </div>
        <StakeholdersPicker value={stakeholders} onChange={setStakeholders} />
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
const iconBtnStyle: React.CSSProperties = {
  background: "transparent",
  border: "none",
  cursor: "pointer",
  color: "var(--hub-foreground)",
  opacity: 0.6,
  padding: 2,
  display: "inline-flex",
  alignItems: "center",
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
