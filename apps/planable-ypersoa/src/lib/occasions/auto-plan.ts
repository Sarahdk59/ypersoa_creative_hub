/**
 * Génération auto d'un publication_plan pour les occasions sans SPECIAL_CAMPAIGN hardcodée.
 *
 * Logique :
 *  - Démarre à `max(today, occurrence - campaign_lead_days)`
 *  - Termine à `buy_by_deadline` (sauf saison ouverte = `endDate` plus loin)
 *  - 2 posts par semaine : Lundi 19h Insta post hero + Vendredi 19h Insta reel
 *  - 1 Pinterest pin / 2 semaines (le mercredi 9h)
 *  - Alterne sur les `recommended_motifs` de l'occasion
 */
import { addDays, getDay } from "date-fns";
import type { PlanableMediaFormat, PlanablePlatform, PlanableOccasionRow } from "@/lib/supabase/types";
import { buyByDeadline, nextOccurrence } from "./calculator";

export interface AutoSlot {
  date: string;        // YYYY-MM-DD
  time: string;        // HH:mm
  platform: PlanablePlatform;
  motif_code: string;
  format: PlanableMediaFormat;
  focus: string;
}

const SEASON_END_DAYS = 90; // Pour saisons ouvertes type Mariage

export function generateAutoPlan(
  occasion: PlanableOccasionRow,
  today: Date = new Date()
): { slots: AutoSlot[]; occurrence: Date; deadline: Date } {
  const occurrence = nextOccurrence(occasion.date_strategy, today);
  const deadline = buyByDeadline(occurrence, occasion.lead_days);
  const isSeasonal = occasion.date_strategy.startsWith("season:");

  const startDate = maxDate(today, addDays(occurrence, -occasion.campaign_lead_days));
  const endDate = isSeasonal ? addDays(today, SEASON_END_DAYS) : deadline;

  const motifs = occasion.recommended_motifs.length > 0
    ? occasion.recommended_motifs
    : ["YPM-001"];

  const slots: AutoSlot[] = [];
  let cursor = startDate;
  let weekIndex = 0;
  while (cursor <= endDate) {
    const dow = getDay(cursor); // 0 = dim, 1 = lun, ..., 5 = ven, 6 = sam
    if (dow === 1) {
      // Lundi 19h — Insta post hero
      const motif = motifs[weekIndex % motifs.length];
      slots.push({
        date: toIsoDate(cursor),
        time: "19:00",
        platform: "instagram_post",
        motif_code: motif,
        format: "4:5",
        focus: `Post hero ${occasion.name_fr} — semaine ${weekIndex + 1}.`,
      });
    }
    if (dow === 3 && weekIndex % 2 === 0) {
      // Mercredi 9h, 1 sem / 2 — Pinterest pin
      const motif = motifs[(weekIndex + 1) % motifs.length];
      slots.push({
        date: toIsoDate(cursor),
        time: "09:00",
        platform: "pinterest_pin",
        motif_code: motif,
        format: "2:3",
        focus: `Pin Pinterest ${occasion.name_fr} — A/B test motif ${motif}.`,
      });
    }
    if (dow === 5) {
      // Vendredi 19h — Insta reel
      const motif = motifs[weekIndex % motifs.length];
      slots.push({
        date: toIsoDate(cursor),
        time: "19:00",
        platform: "instagram_reel",
        motif_code: motif,
        format: "9:16",
        focus: `Reel ${occasion.name_fr} — making-of ou détail textile.`,
      });
      weekIndex++;
    }
    cursor = addDays(cursor, 1);
  }

  return { slots, occurrence, deadline };
}

function maxDate(a: Date, b: Date): Date {
  return a.getTime() > b.getTime() ? a : b;
}

function toIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}
