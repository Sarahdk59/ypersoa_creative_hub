"use client";
import { CheckSquare, Loader2, Plus, Square, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarView } from "@/components/CalendarView";
import { EntryDetailPanel } from "@/components/EntryDetailPanel";
import { EntryDialog } from "@/components/EntryDialog";
import { SuggestionsPanel, type SuggestionPayload } from "@/components/SuggestionsPanel";
import type { PlanableCalendarEntryRow, PlanablePackRow } from "@/lib/supabase/types";

interface DetailEntry extends PlanableCalendarEntryRow {
  planable_packs?: PlanablePackRow | null;
}

export default function PlanablePage() {
  const [monthAnchor, setMonthAnchor] = useState<Date>(new Date());
  const [entries, setEntries] = useState<PlanableCalendarEntryRow[]>([]);
  const [suggestions, setSuggestions] = useState<SuggestionPayload[]>([]);
  const [loadingEntries, setLoadingEntries] = useState(true);
  const [loadingSugg, setLoadingSugg] = useState(true);
  const [selectedDetail, setSelectedDetail] = useState<DetailEntry | null>(null);
  const [dialogDate, setDialogDate] = useState<Date | null>(null);
  const [editingEntry, setEditingEntry] = useState<DetailEntry | null>(null);
  const [todayOverride, setTodayOverride] = useState<string>("");
  const [globalErr, setGlobalErr] = useState<string | null>(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const fetchEntries = useCallback(async () => {
    setLoadingEntries(true);
    setGlobalErr(null);
    try {
      const from = new Date(monthAnchor.getFullYear(), monthAnchor.getMonth() - 1, 1).toISOString();
      const to = new Date(monthAnchor.getFullYear(), monthAnchor.getMonth() + 2, 0).toISOString();
      const res = await fetch(`/api/calendar?from=${from}&to=${to}`).then((r) => r.json());
      if (!res.ok) throw new Error(typeof res.error === "string" ? res.error : "Échec fetch");
      setEntries(res.data);
    } catch (e) {
      setGlobalErr(e instanceof Error ? e.message : String(e));
    } finally {
      setLoadingEntries(false);
    }
  }, [monthAnchor]);

  const fetchSuggestions = useCallback(async () => {
    setLoadingSugg(true);
    try {
      const url = todayOverride ? `/api/suggestions?today=${todayOverride}` : "/api/suggestions";
      const res = await fetch(url).then((r) => r.json());
      if (!res.ok) throw new Error(typeof res.error === "string" ? res.error : "Échec suggestions");
      setSuggestions(res.data);
    } catch (e) {
      setGlobalErr(e instanceof Error ? e.message : String(e));
    } finally {
      setLoadingSugg(false);
    }
  }, [todayOverride]);

  const fetchEntryDetail = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/calendar/${id}`).then((r) => r.json());
      if (!res.ok) throw new Error(typeof res.error === "string" ? res.error : "Détail introuvable");
      setSelectedDetail(res.data);
    } catch (e) {
      setGlobalErr(e instanceof Error ? e.message : String(e));
    }
  }, []);

  useEffect(() => { void fetchEntries(); }, [fetchEntries]);
  useEffect(() => { void fetchSuggestions(); }, [fetchSuggestions]);

  const occasionOptions = useMemo(
    () => suggestions.map((s) => ({ slug: s.occasion.slug, name_fr: s.occasion.name_fr })),
    [suggestions]
  );

  // Compte des entrées plannifiables (= non publiées) par slug d'occasion
  // pour afficher "X entrées planifiées · Effacer" sur les cartes de suggestion.
  const plannedCountBySlug = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of entries) {
      if (!e.occasion_slug || e.status === "published") continue;
      map.set(e.occasion_slug, (map.get(e.occasion_slug) ?? 0) + 1);
    }
    return map;
  }, [entries]);

  const toggleSelection = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const exitSelectionMode = useCallback(() => {
    setSelectionMode(false);
    setSelectedIds(new Set());
  }, []);

  const bulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Supprimer ${selectedIds.size} entrée(s) sélectionnée(s) ? (les déjà publiées seront ignorées)`)) return;
    setBulkDeleting(true);
    try {
      const res = await fetch("/api/calendar/bulk-delete", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selectedIds) }),
      }).then((r) => r.json());
      if (!res.ok) {
        alert(typeof res.error === "string" ? res.error : "Échec suppression");
        return;
      }
      const { deleted, skipped_published } = res.data as { deleted: number; skipped_published: number };
      if (skipped_published > 0) {
        alert(`${deleted} supprimée(s) · ${skipped_published} ignorée(s) car déjà publiée(s)`);
      }
      exitSelectionMode();
      await fetchEntries();
      if (selectedDetail && selectedIds.has(selectedDetail.id)) setSelectedDetail(null);
    } finally {
      setBulkDeleting(false);
    }
  };

  const deleteSingleEntry = async (entry: PlanableCalendarEntryRow) => {
    const res = await fetch(`/api/calendar/${entry.id}`, { method: "DELETE" }).then((r) => r.json());
    if (!res.ok) {
      alert(typeof res.error === "string" ? res.error : "Échec suppression");
      return;
    }
    if (selectedDetail?.id === entry.id) setSelectedDetail(null);
    await fetchEntries();
  };

  const resetCampaign = async (slug: string) => {
    const planned = plannedCountBySlug.get(slug) ?? 0;
    if (planned === 0) return;
    if (!confirm(`Effacer la planification de cette occasion (${planned} entrée(s)) ? Les déjà publiées seront conservées.`)) return;
    const res = await fetch(`/api/campaigns/${slug}/entries`, { method: "DELETE" }).then((r) => r.json());
    if (!res.ok) {
      alert(typeof res.error === "string" ? res.error : "Échec reset");
      return;
    }
    const { deleted, skipped_published } = res.data as { deleted: number; skipped_published: number };
    if (skipped_published > 0) {
      alert(`${deleted} supprimée(s) · ${skipped_published} conservée(s) car déjà publiée(s)`);
    }
    if (selectedDetail?.occasion_slug === slug) setSelectedDetail(null);
    await fetchEntries();
  };

  const generatePack = async () => {
    if (!selectedDetail) return;
    const res = await fetch(`/api/calendar/${selectedDetail.id}/generate-pack`, { method: "POST" }).then((r) => r.json());
    if (!res.ok) {
      alert(res.error);
      return;
    }
    await Promise.all([fetchEntries(), fetchEntryDetail(selectedDetail.id)]);
  };

  const deleteEntry = async () => {
    if (!selectedDetail) return;
    const res = await fetch(`/api/calendar/${selectedDetail.id}`, { method: "DELETE" }).then((r) => r.json());
    if (!res.ok) {
      alert(res.error);
      return;
    }
    setSelectedDetail(null);
    await fetchEntries();
  };

  const expandCampaign = async (slug: string) => {
    const res = await fetch(`/api/campaigns/${slug}/expand`, { method: "POST" }).then((r) => r.json());
    if (!res.ok) {
      alert(typeof res.error === "string" ? res.error : "Échec expansion");
      return;
    }
    await fetchEntries();
  };

  const engagementOnlyBanner = suggestions.find((s) => s.urgency.kind === "engagement_only");

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <header style={headerStyle}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
          <h1 style={{ fontFamily: "var(--font-serif)", fontSize: 22, fontWeight: 500, margin: 0 }}>
            Planable Ypersoa
          </h1>
          <span style={{ fontFamily: "var(--font-sans)", fontSize: 11, opacity: 0.55 }}>
            Calendrier éditorial · V1.0
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <label style={{ fontFamily: "var(--font-sans)", fontSize: 11, opacity: 0.6 }}>QA today :</label>
          <input
            type="date"
            value={todayOverride}
            onChange={(e) => setTodayOverride(e.target.value)}
            style={{
              padding: "4px 8px", borderRadius: 6, border: "0.5px solid var(--color-border)",
              fontSize: 12, fontFamily: "var(--font-sans)",
            }}
          />
          {todayOverride && (
            <button type="button" onClick={() => setTodayOverride("")} style={{
              fontSize: 11, padding: "4px 10px", borderRadius: 999,
              border: "0.5px solid var(--color-border)", background: "white", cursor: "pointer",
            }}>Clear</button>
          )}

          <button
            type="button"
            onClick={() => {
              if (selectionMode) exitSelectionMode();
              else { setSelectionMode(true); setSelectedDetail(null); }
            }}
            title={selectionMode ? "Quitter le mode sélection" : "Sélectionner plusieurs entrées pour suppression en lot"}
            style={{
              display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 12px",
              borderRadius: 999, background: selectionMode ? "var(--color-ink)" : "white",
              color: selectionMode ? "var(--color-cream)" : "var(--color-ink)",
              border: "0.5px solid var(--color-border)",
              fontFamily: "var(--font-sans)", fontSize: 11, cursor: "pointer",
            }}
          >
            {selectionMode ? <CheckSquare size={12} /> : <Square size={12} />}
            {selectionMode ? "Sélection active" : "Sélectionner"}
          </button>

          <button
            type="button"
            onClick={() => setDialogDate(new Date())}
            style={{
              display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 14px",
              borderRadius: 999, background: "var(--color-ink)", color: "var(--color-cream)",
              border: "none", fontFamily: "var(--font-sans)", fontSize: 12, cursor: "pointer",
            }}
          >
            <Plus size={13} /> Nouvelle entrée
          </button>
        </div>
      </header>

      {selectionMode && (
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          background: "var(--color-cream)", borderBottom: "0.5px solid var(--color-border)",
          padding: "8px 24px", fontSize: 12, fontFamily: "var(--font-sans)",
        }}>
          <span>
            <strong>{selectedIds.size}</strong> sélectionnée(s) ·
            <span style={{ opacity: 0.65, marginLeft: 4 }}>
              clique sur des chips pour cocher/décocher
            </span>
          </span>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              onClick={exitSelectionMode}
              style={{
                display: "inline-flex", alignItems: "center", gap: 4,
                padding: "6px 12px", borderRadius: 999, background: "white",
                border: "0.5px solid var(--color-border)", cursor: "pointer", fontSize: 11,
              }}
            >
              <X size={12} /> Annuler
            </button>
            <button
              type="button"
              onClick={bulkDelete}
              disabled={selectedIds.size === 0 || bulkDeleting}
              style={{
                display: "inline-flex", alignItems: "center", gap: 4,
                padding: "6px 14px", borderRadius: 999,
                background: selectedIds.size === 0 ? "rgba(197,48,48,0.4)" : "#c53030",
                color: "white", border: "none", fontSize: 11, fontWeight: 500,
                cursor: selectedIds.size === 0 || bulkDeleting ? "not-allowed" : "pointer",
              }}
            >
              {bulkDeleting ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
              Supprimer la sélection
            </button>
          </div>
        </div>
      )}

      {engagementOnlyBanner && (
        <div style={{
          background: "#fef3e6", borderBottom: "0.5px solid #c5660d",
          padding: "8px 24px", fontSize: 12, color: "#7a3e07",
          fontFamily: "var(--font-sans)",
        }}>
          ⚫ <strong>{engagementOnlyBanner.occasion.name_fr}</strong> · RDV manqué côté commande
          (deadline dépassée). Mode engagement uniquement — packs candidats sans CTA achat.
        </div>
      )}

      {globalErr && (
        <div style={{
          background: "#fde8e8", borderBottom: "0.5px solid #c53030",
          padding: "8px 24px", fontSize: 12, color: "#a01e1e",
          fontFamily: "var(--font-sans)",
        }}>
          {globalErr}
        </div>
      )}

      <main style={{
        flex: 1, display: "grid", gridTemplateColumns: "300px 1fr 340px",
        gap: 12, padding: 16, minHeight: 0, overflow: "hidden",
      }}>
        <SuggestionsPanel
          suggestions={suggestions}
          loading={loadingSugg}
          onExpandCampaign={expandCampaign}
          onResetCampaign={resetCampaign}
          plannedCountBySlug={plannedCountBySlug}
        />

        <div style={{ minHeight: 0, overflow: "hidden" }}>
          {loadingEntries && entries.length === 0 ? (
            <div style={{ padding: 60, textAlign: "center", opacity: 0.5 }}>Chargement…</div>
          ) : (
            <CalendarView
              monthAnchor={monthAnchor}
              setMonthAnchor={setMonthAnchor}
              entries={entries}
              selectedEntryId={selectedDetail?.id ?? null}
              onSelectEntry={(e) => fetchEntryDetail(e.id)}
              onDeleteEntry={deleteSingleEntry}
              onClickDay={(d) => { if (!selectionMode) setDialogDate(d); }}
              selectionMode={selectionMode}
              selectedIds={selectedIds}
              onToggleSelection={toggleSelection}
            />
          )}
        </div>

        <div>
          {selectedDetail ? (
            <EntryDetailPanel
              entry={selectedDetail}
              onClose={() => setSelectedDetail(null)}
              onGeneratePack={generatePack}
              onDelete={deleteEntry}
              onEdit={() => setEditingEntry(selectedDetail)}
            />
          ) : (
            <aside style={{
              height: "100%", background: "white",
              border: "0.5px dashed var(--color-border)", borderRadius: 12,
              padding: 24, display: "flex", alignItems: "center", justifyContent: "center",
              textAlign: "center", fontSize: 12, opacity: 0.55,
              fontFamily: "var(--font-sans)",
            }}>
              Clique sur une entrée du calendrier pour voir son détail
            </aside>
          )}
        </div>
      </main>

      {(dialogDate || editingEntry) && (
        <EntryDialog
          initialDate={editingEntry ? new Date(editingEntry.scheduled_at) : (dialogDate as Date)}
          editing={editingEntry ?? undefined}
          occasionsSlugs={occasionOptions}
          onClose={() => {
            setDialogDate(null);
            setEditingEntry(null);
          }}
          onCreated={async () => {
            const wasEditing = editingEntry?.id;
            setDialogDate(null);
            setEditingEntry(null);
            await fetchEntries();
            if (wasEditing) await fetchEntryDetail(wasEditing);
          }}
        />
      )}
    </div>
  );
}

const headerStyle: React.CSSProperties = {
  display: "flex", alignItems: "center", justifyContent: "space-between",
  padding: "14px 24px", background: "white",
  borderBottom: "0.5px solid var(--color-border)",
};
