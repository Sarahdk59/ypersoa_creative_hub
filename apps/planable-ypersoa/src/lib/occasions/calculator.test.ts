import { describe, expect, it } from "vitest";
import { buyByDeadline, computeUrgency, nextOccurrence } from "./calculator";

describe("nextOccurrence", () => {
  it("fixed:02-14 depuis 04/05/2026 → 14/02/2027", () => {
    expect(nextOccurrence("fixed:02-14", new Date(2026, 4, 4))).toEqual(new Date(2027, 1, 14));
  });

  it("fixed:12-25 depuis 04/05/2026 → 25/12/2026", () => {
    expect(nextOccurrence("fixed:12-25", new Date(2026, 4, 4))).toEqual(new Date(2026, 11, 25));
  });

  it("fixed:09-01 depuis 04/05/2026 → 01/09/2026", () => {
    expect(nextOccurrence("fixed:09-01", new Date(2026, 4, 4))).toEqual(new Date(2026, 8, 1));
  });

  it("last_sunday_of:5 depuis 04/05/2026 → 31/05/2026 (dernier dim mai 2026)", () => {
    expect(nextOccurrence("last_sunday_of:5", new Date(2026, 4, 4))).toEqual(new Date(2026, 4, 31));
  });

  it("last_sunday_of:5 depuis 01/06/2026 → 30/05/2027 (dernier dim mai 2027)", () => {
    expect(nextOccurrence("last_sunday_of:5", new Date(2026, 5, 1))).toEqual(new Date(2027, 4, 30));
  });

  it("nth_sunday_of:6:3 depuis 04/05/2026 → 21/06/2026 (3e dim juin 2026)", () => {
    expect(nextOccurrence("nth_sunday_of:6:3", new Date(2026, 4, 4))).toEqual(new Date(2026, 5, 21));
  });

  it("nth_sunday_of:6:3 depuis 01/07/2026 → 20/06/2027 (3e dim juin 2027)", () => {
    expect(nextOccurrence("nth_sunday_of:6:3", new Date(2026, 6, 1))).toEqual(new Date(2027, 5, 20));
  });

  it("season:5-9 dans la fenêtre → today (saison ouverte)", () => {
    const today = new Date(2026, 4, 4);
    expect(nextOccurrence("season:5-9", today).toDateString()).toEqual(
      new Date(2026, 4, 4).toDateString()
    );
  });

  it("season:5-9 hors fenêtre → 1er mai année suivante (futur)", () => {
    expect(nextOccurrence("season:5-9", new Date(2026, 0, 15))).toEqual(new Date(2026, 4, 1));
  });

  it("strategy inconnue → throw", () => {
    expect(() => nextOccurrence("foo:bar")).toThrow();
  });
});

describe("buyByDeadline", () => {
  it("Fête des Pères 2026 (21/06) − 10j → 11/06/2026", () => {
    expect(buyByDeadline(new Date(2026, 5, 21), 10)).toEqual(new Date(2026, 5, 11));
  });

  it("Noël 2026 (25/12) − 15j → 10/12/2026", () => {
    expect(buyByDeadline(new Date(2026, 11, 25), 15)).toEqual(new Date(2026, 11, 10));
  });
});

describe("computeUrgency depuis 04/05/2026", () => {
  const today = new Date(2026, 4, 4);

  it("Fête des Pères deadline 11/06 → high (38j)", () => {
    const u = computeUrgency(new Date(2026, 5, 11), new Date(2026, 5, 21), today);
    expect(u.kind).toBe("high");
    if (u.kind === "high") expect(u.daysToDeadline).toBe(38);
  });

  it("deadline dans 10j → critical", () => {
    const u = computeUrgency(new Date(2026, 4, 14), new Date(2026, 4, 24), today);
    expect(u.kind).toBe("critical");
  });

  it("deadline dans 50j → medium", () => {
    const u = computeUrgency(new Date(2026, 5, 23), new Date(2026, 6, 3), today);
    expect(u.kind).toBe("medium");
  });

  it("deadline dans 80j → low", () => {
    const u = computeUrgency(new Date(2026, 6, 23), new Date(2026, 7, 2), today);
    expect(u.kind).toBe("low");
  });

  it("deadline dépassée mais occurrence à venir → engagement_only", () => {
    // today simulée = 15/06/2026 (entre deadline 11/06 et occurrence 21/06)
    const simToday = new Date(2026, 5, 15);
    const u = computeUrgency(new Date(2026, 5, 11), new Date(2026, 5, 21), simToday);
    expect(u.kind).toBe("engagement_only");
    if (u.kind === "engagement_only") expect(u.daysToOccurrence).toBe(6);
  });
});
