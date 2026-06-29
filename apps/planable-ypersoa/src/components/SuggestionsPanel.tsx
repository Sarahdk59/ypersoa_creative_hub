"use client";
import { ChevronDown, ChevronRight, Lightbulb, Loader2, RotateCcw, Sparkles } from "lucide-react";
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
  is_evergreen: boolean;
  featured_this_week: boolean;
}

const URGENCY_DOT: Record<string, string> = {
  critical: "#c53030",
  high: "#B4665F",
  medium: "#d4a017",
  low: "#7A9E7E",
  engagement_only: "#1A1614",
  editorial: "#8C7BB0",
  rolling: "#7A9E7E",
};

export function SuggestionsPanel({
  suggestions,
  loading,
  onExpandCampaign,
  onResetCampaign,
  plannedCountBySlug,
  orientation = "vertical",
}: {
  suggestions: SuggestionPayload[];
  loading: boolean;
  onExpandCampaign: (slug: string) => Promise<void>;
  onResetCampaign: (slug: string) => Promise<void>;
  plannedCountBySlug: Map<string, number>;
  orientation?: "vertical" | "horizontal";
}) {
  const [bankOpen, setBankOpen] = useState(false);

  // Flux principal = tout ce qui est daté/commerce + les 3 evergreen "à la une" de la semaine.
  // Banque = tous les evergreen (la bibliothèque d'angles, repliable).
  const mainFlow = suggestions.filter((s) => !s.is_evergreen || s.featured_this_week);
  const evergreenBank = suggestions.filter((s) => s.is_evergreen && !s.featured_this_week);

  const isHorizontal = orientation === "horizontal";

  if (isHorizontal) {
    return (
      <section style={{
        background: "white", borderBottom: "0.5px solid var(--color-border)",
        padding: "12px 24px", display: "flex", flexDirection: "column", gap: 8,
      }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
          <h2 style={{ fontFamily: "var(--font-serif)", fontSize: 16, fontWeight: 500, margin: 0 }}>
            À planifier
          </h2>
          <span style={{ fontFamily: "var(--font-sans)", fontSize: 11, opacity: 0.55 }}>
            Temps forts des 60 prochains jours · fais défiler horizontalement →
          </span>
        </div>

        {loading && (
          <div style={{ padding: 16, opacity: 0.5 }}>
            <Loader2 size={18} className="animate-spin" />
          </div>
        )}

        {!loading && suggestions.length === 0 && (
          <div style={{
            padding: "12px 16px", opacity: 0.55, fontSize: 12,
            border: "1px dashed var(--color-border)", borderRadius: 10,
          }}>
            Aucune occasion dans les 60 jours. Profite-en pour respirer.
          </div>
        )}

        {!loading && mainFlow.length > 0 && (
          <div style={{
            display: "flex", gap: 10, overflowX: "auto", paddingBottom: 4,
            scrollbarWidth: "thin",
          }}>
            {mainFlow.map((s) => (
              <div key={s.occasion.slug} style={{ flex: "0 0 280px", width: 280 }}>
                <SuggestionCard
                  sugg={s}
                  onExpand={onExpandCampaign}
                  onReset={onResetCampaign}
                  plannedCount={plannedCountBySlug.get(s.occasion.slug) ?? 0}
                />
              </div>
            ))}
          </div>
        )}

        {!loading && evergreenBank.length > 0 && (
          <div>
            <button
              type="button"
              onClick={() => setBankOpen((v) => !v)}
              style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                padding: "6px 12px", borderRadius: 999, cursor: "pointer",
                background: "var(--color-cream)", border: "0.5px solid var(--color-border)",
                fontFamily: "var(--font-sans)", fontSize: 11, fontWeight: 600, color: "var(--color-ink)",
              }}
            >
              <Lightbulb size={13} style={{ color: "#8C7BB0" }} />
              Evergreen — une idée ? <span style={{ opacity: 0.55, fontWeight: 400 }}>· {evergreenBank.length} angles dispo</span>
              {bankOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>

            {bankOpen && (
              <div style={{
                display: "flex", gap: 10, overflowX: "auto", paddingBottom: 4, marginTop: 8,
                scrollbarWidth: "thin",
              }}>
                {evergreenBank.map((s) => (
                  <div key={s.occasion.slug} style={{ flex: "0 0 280px", width: 280 }}>
                    <SuggestionCard
                      sugg={s}
                      onExpand={onExpandCampaign}
                      onReset={onResetCampaign}
                      plannedCount={plannedCountBySlug.get(s.occasion.slug) ?? 0}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </section>
    );
  }

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
          Temps forts des 60 prochains jours · 3 angles evergreen à la une cette semaine
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
        {mainFlow.map((s) => (
          <SuggestionCard
            key={s.occasion.slug}
            sugg={s}
            onExpand={onExpandCampaign}
            onReset={onResetCampaign}
            plannedCount={plannedCountBySlug.get(s.occasion.slug) ?? 0}
          />
        ))}
      </div>

      {!loading && evergreenBank.length > 0 && (
        <section style={{ marginTop: 4 }}>
          <button
            type="button"
            onClick={() => setBankOpen((v) => !v)}
            style={{
              display: "flex", alignItems: "center", gap: 8, width: "100%",
              padding: "10px 12px", borderRadius: 10, cursor: "pointer",
              background: "var(--color-cream)", border: "0.5px solid var(--color-border)",
              fontFamily: "var(--font-sans)", fontSize: 12, fontWeight: 600, color: "var(--color-ink)",
            }}
          >
            <Lightbulb size={14} style={{ color: "#8C7BB0" }} />
            <span style={{ flex: 1, textAlign: "left" }}>
              Evergreen — une idée ? <span style={{ opacity: 0.55, fontWeight: 400 }}>· {evergreenBank.length} angles dispo</span>
            </span>
            {bankOpen ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
          </button>

          {bankOpen && (
            <>
              <p style={{ fontFamily: "var(--font-sans)", fontSize: 10.5, opacity: 0.55, lineHeight: 1.5, margin: "8px 2px 8px" }}>
                Banque d&apos;angles always-on, à dégainer quand le calendrier a un trou. 3 tournent « à la une » chaque semaine (✨ ci-dessus).
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {evergreenBank.map((s) => (
                  <SuggestionCard
                    key={s.occasion.slug}
                    sugg={s}
                    onExpand={onExpandCampaign}
                    onReset={onResetCampaign}
                    plannedCount={plannedCountBySlug.get(s.occasion.slug) ?? 0}
                  />
                ))}
              </div>
            </>
          )}
        </section>
      )}
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
  const isEditorial = sugg.urgency.kind === "editorial";
  const isRolling = sugg.urgency.kind === "rolling";
  const hasPlanned = plannedCount > 0;

  return (
    <article style={{
      background: "var(--color-cream)",
      border: "0.5px solid var(--color-border)",
      borderRadius: 10, padding: 12, display: "flex", flexDirection: "column", gap: 8,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ width: 10, height: 10, borderRadius: 999, background: dot, flexShrink: 0 }} />
        <h3 style={{ fontFamily: "var(--font-serif)", fontSize: 15, fontWeight: 500, margin: 0, flex: 1 }}>
          {sugg.occasion.name_fr}
        </h3>
        {sugg.is_evergreen && sugg.featured_this_week && (
          <span style={{
            display: "inline-flex", alignItems: "center", gap: 3, flexShrink: 0,
            fontFamily: "var(--font-sans)", fontSize: 9, fontWeight: 700, letterSpacing: "0.04em",
            textTransform: "uppercase", color: "#8C7BB0",
            background: "rgba(140,123,176,0.12)", padding: "2px 6px", borderRadius: 999,
          }}>
            ✨ à la une
          </span>
        )}
      </div>

      <div style={{ fontFamily: "var(--font-sans)", fontSize: 11, lineHeight: 1.5, opacity: 0.85 }}>
        {!isRolling && (
          <div>{isEditorial ? "Temps fort" : "Occurrence"} : <strong>{shortFrDate(sugg.occurrence)}</strong></div>
        )}
        {!isEngagementOnly && !isEditorial && !isRolling && (
          <div>
            ⚠ Deadline commande : <strong>{shortFrDate(sugg.buy_by_deadline)}</strong>
            {sugg.urgency.kind !== "low" && "daysToDeadline" in sugg.urgency && (
              <> · J−{sugg.urgency.daysToDeadline}</>
            )}
          </div>
        )}
        {isRolling && (
          <div style={{ color: "#54744f", fontWeight: 600, marginTop: 4 }}>
            🛒 Commande au fil de l'eau · livraison ~J+{"leadDays" in sugg.urgency ? sugg.urgency.leadDays : 10} après commande
          </div>
        )}
        {isEditorial && (
          <div style={{ color: "#8C7BB0", fontWeight: 600, marginTop: 4 }}>
            ✨ Moment éditorial — engagement / reach · pas de deadline commande
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
          title={sugg.has_special_campaign ? "Brief Ypersoa hardcodé (19 entrées spécifiques)" : isEditorial ? "Évergreen / éditorial : empreinte légère = 1 reel + 1 pin, pas de cadence multi-semaines" : "Plan auto : 2 posts/sem + 1 pin/2 sem sur la fenêtre de campagne"}
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
              : isEditorial
                ? "Planifier (évergreen · 1 reel + 1 pin)"
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
