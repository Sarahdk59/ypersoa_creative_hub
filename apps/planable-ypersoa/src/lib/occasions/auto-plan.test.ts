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
  kind: "marche",
  temps_fort_date: null,
  created_at: null,
};

/** Éditorial DATÉ — ex. La France Club (14 juillet), temps fort explicite. */
const FRANCE_CLUB: PlanableOccasionRow = {
  slug: "france_club",
  name_fr: "La France Club",
  date_strategy: "fixed:07-14",
  campaign_lead_days: 30,
  pinterest_lead_days: 30,
  lead_days: 10,
  recommended_motifs: ["YPM-003", "YPM-001"],
  recommended_casting: ["MAN-P03"],
  recommended_duos: [],
  hashtags_brand: ["#FranceClub"],
  notes: null,
  auto_campaign_disabled_year: null,
  kind: "editorial",
  temps_fort_date: "2026-07-14",
  created_at: null,
};

/** Éditorial ÉVERGREEN — ex. Team Brunch (always-on). */
const BRUNCH: PlanableOccasionRow = {
  ...FRANCE_CLUB,
  slug: "brunch_club",
  name_fr: "Team Brunch",
  date_strategy: "season:1-12",
  temps_fort_date: null,
};

describe("generateAutoPlan — éditorial daté (runway France Club)", () => {
  const today = new Date(2026, 4, 20); // 20/05/2026, bien avant le 14/07
  const { slots, occurrence } = generateAutoPlan(FRANCE_CLUB, today);

  it("ancre l'occurrence sur la date de temps fort éditée (14/07)", () => {
    expect(occurrence.getMonth()).toBe(6);
    expect(occurrence.getDate()).toBe(14);
  });
  it("a un reel « moment ou jamais » à la deadline commande", () => {
    const reel = slots.find((s) => s.platform === "instagram_reel");
    expect(reel?.focus).toMatch(/MOMENT OU JAMAIS/);
  });
  it("a un post final LE JOUR J en engagement pur (aucun CTA)", () => {
    const jourJ = slots.find((s) => s.date === "2026-07-14" && s.platform === "instagram_post");
    expect(jourJ).toBeTruthy();
    expect(jourJ?.focus).toMatch(/AUCUN CTA/);
  });
  it("ouvre le runway ~J-30 (post d'ouverture le 14/06)", () => {
    const first = slots.filter((s) => s.platform === "instagram_post").sort((a, b) => a.date.localeCompare(b.date))[0];
    expect(first.date).toBe("2026-06-14");
  });
});

describe("generateAutoPlan — éditorial évergreen (léger)", () => {
  it("reste léger : 1 pin + 1 reel, pas de cadence", () => {
    const { slots } = generateAutoPlan(BRUNCH, new Date(2026, 5, 1));
    expect(slots).toHaveLength(2);
    expect(slots.filter((s) => s.platform === "pinterest_pin")).toHaveLength(1);
    expect(slots.filter((s) => s.platform === "instagram_reel")).toHaveLength(1);
  });
});

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
