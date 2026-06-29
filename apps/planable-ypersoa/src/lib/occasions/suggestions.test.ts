import { describe, it, expect } from "vitest";
import { buildSuggestions } from "./suggestions";
import type { PlanableOccasionRow } from "@/lib/supabase/types";

function evergreenOcc(slug: string): PlanableOccasionRow {
  return {
    slug,
    name_fr: slug,
    date_strategy: "season:1-12",
    campaign_lead_days: 30,
    pinterest_lead_days: 45,
    lead_days: 10,
    recommended_motifs: ["YPM-006"],
    recommended_casting: ["MAN-P01"],
    recommended_duos: [],
    hashtags_brand: ["#X"],
    notes: null,
    auto_campaign_disabled_year: null,
    kind: "editorial",
    created_at: null,
  };
}

const SIX = ["a", "b", "c", "d", "e", "f"].map(evergreenOcc);

describe("rotation hebdo des evergreen", () => {
  it("met exactement 3 evergreen à la une", () => {
    const s = buildSuggestions(SIX, new Date(2026, 6, 1));
    expect(s.filter((x) => x.featured_this_week)).toHaveLength(3);
    expect(s.every((x) => x.is_evergreen)).toBe(true);
  });

  it("change le set d'une semaine à l'autre", () => {
    const w1 = buildSuggestions(SIX, new Date(2026, 6, 1));
    const w2 = buildSuggestions(SIX, new Date(2026, 6, 8)); // +7 jours
    const set1 = w1.filter((x) => x.featured_this_week).map((x) => x.occasion.slug).sort();
    const set2 = w2.filter((x) => x.featured_this_week).map((x) => x.occasion.slug).sort();
    expect(set1).not.toEqual(set2);
  });

  it("est déterministe pour une même date", () => {
    const a = buildSuggestions(SIX, new Date(2026, 6, 1)).filter((x) => x.featured_this_week).map((x) => x.occasion.slug);
    const b = buildSuggestions(SIX, new Date(2026, 6, 1)).filter((x) => x.featured_this_week).map((x) => x.occasion.slug);
    expect(a).toEqual(b);
  });

  it("couvre tous les evergreen sur 2 semaines (6 angles, 3/sem)", () => {
    const w1 = buildSuggestions(SIX, new Date(2026, 6, 1)).filter((x) => x.featured_this_week).map((x) => x.occasion.slug);
    const w2 = buildSuggestions(SIX, new Date(2026, 6, 8)).filter((x) => x.featured_this_week).map((x) => x.occasion.slug);
    expect(new Set([...w1, ...w2]).size).toBe(6);
  });
});
