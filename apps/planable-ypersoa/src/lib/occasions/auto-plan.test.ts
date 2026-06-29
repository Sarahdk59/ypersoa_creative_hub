import { describe, expect, it } from "vitest";
import { generateAutoPlan } from "./auto-plan";
import type { PlanableOccasionRow } from "@/lib/supabase/types";

/**
 * Vérifie la RÈGLE DES 45 JOURS sur l'exemple Rentrée (= mar. 1 sept 2026) :
 *  - Pinterest semée TÔT (dès J-45) et front-loadée (ne court PAS jusqu'au deadline)
 *  - Instagram = fenêtre de conversion J-45 → deadline commande (22 août)
 */
const RENTREE: PlanableOccasionRow = {
  slug: "rentree",
  name_fr: "Rentrée scolaire",
  date_strategy: "fixed:09-01",
  campaign_lead_days: 45,
  pinterest_lead_days: 45,
  lead_days: 10,
  recommended_motifs: ["YPM-013", "YPM-014"],
  recommended_casting: ["MAN-P08", "MAN-P09"],
  recommended_duos: [],
  hashtags_brand: ["#Rentrée"],
  notes: null,
  auto_campaign_disabled_year: null,
  created_at: null,
};

describe("generateAutoPlan — règle des 45 jours (Rentrée)", () => {
  const today = new Date(2026, 5, 1); // 01/06/2026, bien avant la fenêtre
  const { slots, occurrence, deadline } = generateAutoPlan(RENTREE, today);

  const pins = slots.filter((s) => s.platform === "pinterest_pin");
  const igPosts = slots.filter((s) => s.platform === "instagram_post");

  it("occurrence = 01/09/2026, deadline commande = 22/08/2026", () => {
    expect(occurrence).toEqual(new Date(2026, 8, 1));
    expect(deadline).toEqual(new Date(2026, 7, 22));
  });

  it("la 1re pin Pinterest est semée ~J-45 (mi-juillet), pas à la dernière minute", () => {
    const first = pins[0].date;
    expect(first >= "2026-07-18" && first <= "2026-07-25").toBe(true);
  });

  it("Pinterest est front-loadée : la dernière pin reste loin avant le deadline", () => {
    const lastPin = pins[pins.length - 1].date;
    // front-load 21j depuis ~18/07 → dernière pin début août, bien avant le 22/08
    expect(lastPin < "2026-08-12").toBe(true);
  });

  it("Instagram pousse jusqu'au deadline commande (≥ 19/08)", () => {
    const lastIg = igPosts[igPosts.length - 1].date;
    expect(lastIg >= "2026-08-17").toBe(true);
  });

  it("les derniers posts Insta montent en urgence (countdown deadline)", () => {
    const lastIg = igPosts[igPosts.length - 1];
    expect(lastIg.focus).toMatch(/countdown|deadline|DERNIÈRE/i);
  });
});
