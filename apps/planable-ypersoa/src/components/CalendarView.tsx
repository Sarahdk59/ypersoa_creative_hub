"use client";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo } from "react";
import { compareEntriesByDate, frDate, isSameDay, isSameMonth, monthGridDays, nextMonth, prevMonth, WEEKDAY_LABELS_FR } from "@/lib/utils/date";
import { OCCASION_COLOR, OCCASION_LABEL } from "@/lib/brand/tokens";
import type { PlanableCalendarEntryRow } from "@/lib/supabase/types";
import { EntryChip } from "./EntryChip";

const MAX_CHIPS_PER_DAY = 3;

export function CalendarView({
  monthAnchor,
  setMonthAnchor,
  entries,
  selectedEntryId,
  onSelectEntry,
  onDeleteEntry,
  onClickDay,
  selectionMode,
  selectedIds,
  onToggleSelection,
}: {
  monthAnchor: Date;
  setMonthAnchor: (d: Date) => void;
  entries: PlanableCalendarEntryRow[];
  selectedEntryId: string | null;
  onSelectEntry: (e: PlanableCalendarEntryRow) => void;
  onDeleteEntry: (e: PlanableCalendarEntryRow) => Promise<void>;
  onClickDay: (d: Date) => void;
  selectionMode: boolean;
  selectedIds: Set<string>;
  onToggleSelection: (id: string) => void;
}) {
  const days = useMemo(() => monthGridDays(monthAnchor), [monthAnchor]);

  const entriesByDay = useMemo(() => {
    const map = new Map<string, PlanableCalendarEntryRow[]>();
    for (const e of entries) {
      const k = new Date(e.scheduled_at).toDateString();
      const arr = map.get(k) ?? [];
      arr.push(e);
      map.set(k, arr);
    }
    for (const arr of map.values()) arr.sort(compareEntriesByDate);
    return map;
  }, [entries]);

  const today = new Date();

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", gap: 12 }}>
      {/* Header navigation */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <h2 style={{ fontFamily: "var(--font-serif)", fontSize: 24, fontWeight: 500, margin: 0, textTransform: "capitalize" }}>
          {frDate(monthAnchor, "MMMM yyyy")}
        </h2>
        <div style={{ display: "flex", gap: 6 }}>
          <button type="button" onClick={() => setMonthAnchor(prevMonth(monthAnchor))} style={navBtn}>
            <ChevronLeft size={14} />
          </button>
          <button type="button" onClick={() => setMonthAnchor(new Date())} style={{ ...navBtn, padding: "6px 12px", fontSize: 12 }}>
            Aujourd'hui
          </button>
          <button type="button" onClick={() => setMonthAnchor(nextMonth(monthAnchor))} style={navBtn}>
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      {/* Week labels */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
        {WEEKDAY_LABELS_FR.map((w) => (
          <div key={w} style={{
            fontFamily: "var(--font-sans)", fontSize: 10, fontWeight: 600, letterSpacing: "0.08em",
            textTransform: "uppercase", opacity: 0.5, padding: "4px 8px",
          }}>{w}</div>
        ))}
      </div>

      {/* Grille jours */}
      <div style={{
        display: "grid", gridTemplateColumns: "repeat(7, 1fr)",
        gridAutoRows: "1fr", gap: 4, flex: 1, minHeight: 0,
      }}>
        {days.map((day) => {
          const inMonth = isSameMonth(day, monthAnchor);
          const isToday = isSameDay(day, today);
          const dayEntries = entriesByDay.get(day.toDateString()) ?? [];
          const overflow = dayEntries.length - MAX_CHIPS_PER_DAY;
          return (
            <div
              key={day.toISOString()}
              onClick={() => onClickDay(day)}
              style={{
                background: inMonth ? "white" : "rgba(255,255,255,0.5)",
                border: "0.5px solid var(--color-border)",
                borderRadius: 8,
                padding: 6,
                opacity: inMonth ? 1 : 0.45,
                cursor: "pointer",
                display: "flex", flexDirection: "column", gap: 4,
                position: "relative", overflow: "hidden",
                minHeight: 80,
              }}
            >
              <div style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                fontFamily: "var(--font-sans)", fontSize: 11, fontWeight: isToday ? 700 : 500,
                color: isToday ? "var(--color-terracotta)" : "var(--color-ink)",
              }}>
                <span>{day.getDate()}</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 3, overflow: "hidden" }}>
                {dayEntries.slice(0, MAX_CHIPS_PER_DAY).map((e) => (
                  <EntryChip
                    key={e.id}
                    entry={e}
                    selected={e.id === selectedEntryId}
                    selectionMode={selectionMode}
                    checked={selectedIds.has(e.id)}
                    onClick={() => {
                      if (selectionMode) onToggleSelection(e.id);
                      else onSelectEntry(e);
                    }}
                    onDelete={async () => { await onDeleteEntry(e); }}
                  />
                ))}
                {overflow > 0 && (
                  <div style={{ fontSize: 10, opacity: 0.55, paddingLeft: 4 }}>+{overflow}</div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Légende couleurs occasions */}
      <div style={{
        display: "flex", flexWrap: "wrap", gap: "6px 14px",
        paddingTop: 4, fontFamily: "var(--font-sans)", fontSize: 10,
        color: "var(--color-ink)", opacity: 0.7,
      }}>
        {Object.entries(OCCASION_LABEL).map(([slug, label]) => (
          <span key={slug} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
            <span style={{
              width: 9, height: 9, borderRadius: 999,
              background: OCCASION_COLOR[slug] ?? "#1A1614",
              display: "inline-block",
            }} />
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}

const navBtn: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", justifyContent: "center",
  width: 30, height: 30, borderRadius: 999,
  border: "0.5px solid var(--color-border)", background: "white",
  cursor: "pointer", fontFamily: "var(--font-sans)", fontSize: 12,
  color: "var(--color-ink)",
};
