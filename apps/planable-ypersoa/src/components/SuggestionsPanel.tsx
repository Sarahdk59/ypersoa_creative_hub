"use client";
import { Loader2, RotateCcw, Sparkles } from "lucide-react";
import { useState } from "react";
import { frDate, shortFrDate } from "@/lib/utils/date";
import type { OccasionUrgency } from "@/lib/occasions/calculator";
import type { PlanableOccasionRow } from "@/lib/supabase/types";

export interface SuggestionPayload {
  occasion: PlanableOccasionRow;
  occurrence: string;
  buy_by_deadline: string;
  urgency: OccasionUrgency;
  has_special_campaign: boolean;
  candidate_packs: { motif_code: string; ambiance_id: number; casting_ids: string[]; rationale: string }[];
  disabled_this_cycle: boolean;
}

const URGENCY_DOT: Record<string, string> = {
  critical: "#c53030",
  high: "#B4665F",
  medium: "#d4a017",
  low: "#7A9E7E",
  engagement_only: "#1A1614",
};

export function SuggestionsPanel({
  suggestions,
  loading,
  onExpandCampaign,
  onResetCampaign,
  plannedCountBySlug,
}: {
  suggestions: SuggestionPayload[];
  loading: boolean;
  onExpandCampaign: (slug: string) => Promise<void>;
  onResetCampaign: (slug: string) => Promise<void>;
  plannedCountBySlug: Map<string, number>;
}) {
  return (
    <aside style={{
      display: "flex", flexDirection: "column", height: "100%",
      background: "white", border: "0.5px solid var(--color-border)",
      borderRadius: 12, padding: 16, gap: 12, overflow: "auto",
    }}>
      <header>
        <h2 style={{ fontFamily: "var(--font-serif)", fontSize: 18, fontWeight: 500, margin: 0 }}>
          À planifier
        </h2>
        <p style={{ fontFamily: "var(--font-sans)", fontSize: 11, opacity: 0.6, margin: "4px 0 0 0" }}>
          Occasions à venir dans les 60 prochains jours · triées par deadline
        </p>
      </header>

      {loading && (
        <div style={{ padding: 32, textAlign: "center", opacity: 0.5 }}>
          <Loader2 size={20} className="animate-spin" />
        </div>
      )}

      {!loading && suggestions.length === 0 && (
        <div style={{
          padding: 24, textAlign: "center", opacity: 0.55, fontSize: 12,
          border: "1px dashed var(--color-border)", borderRadius: 12,
        }}>
          Aucune occasion dans les 60 jours. Profite-en pour respirer.
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {suggestions.map((s) => (
          <SuggestionCard
            key={s.occasion.slug}
            sugg={s}
            onExpand={onExpandCampaign}
            onReset={onResetCampaign}
            plannedCount={plannedCountBySlug.get(s.occasion.slug) ?? 0}
          />
        ))}
      </div>
    </aside>
  );
}

function SuggestionCard({
  sugg,
  onExpand,
  onReset,
  plannedCount,
}: {
  sugg: SuggestionPayload;
  onExpand: (slug: string) => Promise<void>;
  onReset: (slug: string) => Promise<void>;
  plannedCount: number;
}) {
  const [expanding, setExpanding] = useState(false);
  const [resetting, setResetting] = useState(false);
  const dot = URGENCY_DOT[sugg.urgency.kind] ?? "#1A1614";
  const isEngagementOnly = sugg.urgency.kind === "engagement_only";
  const hasPlanned = plannedCount > 0;

  return (
    <article style={{
      background: "var(--color-cream)",
      border: "0.5px solid var(--color-border)",
      borderRadius: 10, padding: 12, display: "flex", flexDirection: "column", gap: 8,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ width: 10, height: 10, borderRadius: 999, background: dot, flexShrink: 0 }} />
        <h3 style={{ fontFamily: "var(--font-serif)", fontSize: 15, fontWeight: 500, margin: 0 }}>
          {sugg.occasion.name_fr}
        </h3>
      </div>

      <div style={{ fontFamily: "var(--font-sans)", fontSize: 11, lineHeight: 1.5, opacity: 0.85 }}>
        <div>Occurrence : <strong>{shortFrDate(sugg.occurrence)}</strong></div>
        {!isEngagementOnly && (
          <div>
            ⚠ Deadline commande : <strong>{shortFrDate(sugg.buy_by_deadline)}</strong>
            {sugg.urgency.kind !== "low" && "daysToDeadline" in sugg.urgency && (
              <> · J−{sugg.urgency.daysToDeadline}</>
            )}
          </div>
        )}
        {isEngagementOnly && (
          <div style={{ color: "#c5660d", fontWeight: 600, marginTop: 4 }}>
            Mode engagement uniquement — RDV manqué côté commande
          </div>
        )}
      </div>

      {sugg.occasion.notes && (
        <p style={{
          fontFamily: "var(--font-sans)", fontSize: 11, opacity: 0.65, lineHeight: 1.5,
          margin: 0, padding: "6px 8px", background: "white", borderRadius: 6,
        }}>
          {sugg.occasion.notes}
        </p>
      )}

      {sugg.candidate_packs.length > 0 && (
        <div>
          <div style={{ fontFamily: "var(--font-sans)", fontSize: 10, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", opacity: 0.55, marginBottom: 4 }}>
            Packs candidats
          </div>
          <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 4 }}>
            {sugg.candidate_packs.map((p, i) => (
              <li key={i} style={{ fontSize: 11, opacity: 0.85, padding: "3px 0" }}>
                · <code style={{ background: "white", padding: "1px 5px", borderRadius: 4 }}>{p.motif_code}</code>
                {" × "}
                {p.casting_ids.join(", ")}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div style={{ display: "flex", gap: 6, flexDirection: "column" }}>
        <button
          type="button"
          onClick={async () => {
            setExpanding(true);
            await onExpand(sugg.occasion.slug);
            setExpanding(false);
          }}
          disabled={expanding || resetting}
          title={sugg.has_special_campaign ? "Brief Ypersoa hardcodé (19 entrées spécifiques)" : "Plan auto : 2 posts/sem + 1 pin/2 sem sur la fenêtre de campagne"}
          style={{
            display: "inline-flex", alignItems: "center", gap: 6, justifyContent: "center",
            padding: "8px 12px", borderRadius: 999,
            background: "var(--color-ink)", color: "var(--color-cream)",
            border: "none", fontFamily: "var(--font-sans)", fontSize: 11, fontWeight: 500,
            cursor: expanding ? "default" : "pointer", opacity: expanding ? 0.6 : 1,
          }}
        >
          {expanding ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
          {expanding
            ? "Création…"
            : sugg.has_special_campaign
              ? "Planifier la campagne complète"
              : "Planifier (auto · 2/sem)"}
        </button>

        {hasPlanned && (
          <button
            type="button"
            onClick={async () => {
              setResetting(true);
              await onReset(sugg.occasion.slug);
              setResetting(false);
            }}
            disabled={resetting || expanding}
            title={`Effacer les ${plannedCount} entrée(s) déjà planifiées pour cette occasion (les déjà publiées sont conservées)`}
            style={{
              display: "inline-flex", alignItems: "center", gap: 6, justifyContent: "center",
              padding: "6px 12px", borderRadius: 999,
              background: "white", color: "#c53030",
              border: "0.5px solid #c53030",
              fontFamily: "var(--font-sans)", fontSize: 10, fontWeight: 500,
              cursor: resetting ? "default" : "pointer", opacity: resetting ? 0.6 : 1,
            }}
          >
            {resetting ? <Loader2 size={11} className="animate-spin" /> : <RotateCcw size={11} />}
            {resetting ? "Effacement…" : `Effacer la planification (${plannedCount})`}
          </button>
        )}
      </div>
    </article>
  );
}
