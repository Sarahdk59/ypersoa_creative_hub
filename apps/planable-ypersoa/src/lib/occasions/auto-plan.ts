/**
 * Génération auto d'un publication_plan pour les occasions sans SPECIAL_CAMPAIGN hardcodée.
 *
 * RÈGLE DES 45 JOURS (validée Sarah, juin 2026) — deux canaux, deux temporalités :
 *
 *  • PINTEREST = semé TÔT (slow-burn / moteur de recherche). Une pin a besoin de
 *    plusieurs semaines pour remonter dans les résultats : on la publie en avance,
 *    concentrée en DÉBUT de runway, pas jusqu'à l'événement.
 *      → fenêtre = [occurrence − pinterest_lead_days ; +PINTEREST_FRONTLOAD_DAYS]
 *      → pinterest_lead_days ≥ campaign_lead_days (Noël = 75 : trafic Pinterest dès octobre)
 *      → 1 pin / semaine (A/B test motifs) pendant le front-load
 *
 *  • INSTAGRAM = fenêtre de CONVERSION. On pousse le désir puis l'achat depuis J-45
 *    jusqu'à la date limite de commande (buy_by_deadline), avec montée d'urgence.
 *      → fenêtre = [occurrence − campaign_lead_days ; buy_by_deadline]
 *      → Lundi 19h post hero + Vendredi 19h reel
 *
 * Exemple (Rentrée = mar. 1 sept) : campaign_lead_days=45, pinterest_lead_days=45, lead_days=10.
 *   - Pinterest semée à partir du ~18 juillet (J-45), 3 pins jusqu'au ~8 août.
 *   - Instagram du ~18 juillet (J-45) jusqu'au 22 août (deadline commande), countdown final.
 *
 * Au-delà du deadline → fenêtre "engagement only" (émotion sans CTA), gérée côté urgence.
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

/** Parse 'YYYY-MM-DD' en date LOCALE minuit (cohérent avec suggestions.ts). */
function parseLocalDate(d: string): Date {
  const [y, m, day] = d.slice(0, 10).split("-").map(Number);
  return new Date(y, m - 1, day);
}

const SEASON_END_DAYS = 90;           // Pour saisons ouvertes type Mariage / thèmes (été, automne…)
const PINTEREST_FRONTLOAD_DAYS = 21;  // Pinterest = semé tôt : on ne pin plus passé ce front-load
const MS_PER_DAY = 86_400_000;

export function generateAutoPlan(
  occasion: PlanableOccasionRow,
  today: Date = new Date()
): { slots: AutoSlot[]; occurrence: Date; deadline: Date } {
  // Temps fort : date explicite éditée par Sarah si présente, sinon calculée.
  const occurrence = occasion.temps_fort_date
    ? parseLocalDate(occasion.temps_fort_date)
    : nextOccurrence(occasion.date_strategy, today);
  const deadline = buyByDeadline(occurrence, occasion.lead_days);
  const isSeasonal = occasion.date_strategy.startsWith("season:");
  // Moment éditorial = engagement / reach, pas de deadline commande : on publie
  // jusqu'au temps fort (date fixe) ou sur toute la saison, sans countdown CTA.
  const isEditorial = occasion.kind === "editorial";

  // --- Fenêtre Instagram : J-{campaign_lead_days} → deadline commande (conversion) ---
  const igStart = maxDate(today, addDays(occurrence, -occasion.campaign_lead_days));
  const igEnd = isSeasonal ? addDays(today, SEASON_END_DAYS) : isEditorial ? occurrence : deadline;

  // --- Fenêtre Pinterest : semée tôt, concentrée en début de runway ---
  const pinLead = occasion.pinterest_lead_days ?? occasion.campaign_lead_days;
  const pinStart = maxDate(today, addDays(occurrence, -pinLead));
  const pinEnd = isSeasonal
    ? igEnd
    : minDate(addDays(pinStart, PINTEREST_FRONTLOAD_DAYS), isEditorial ? occurrence : deadline);

  const motifs = occasion.recommended_motifs.length > 0
    ? occasion.recommended_motifs
    : ["YPM-001"];

  if (isEditorial) {
    const isEvergreen = occasion.date_strategy === "season:1-12";

    // ÉVERGREEN (always-on, sans date) → empreinte légère : 1 reel + 1 pin, pas de cadence.
    // (Sarah 30/06 : « pour les evergreen, ex. tennis_club, uniquement 1-2 reels ».)
    if (isEvergreen) {
      const base = maxDate(today, igStart);
      const pinDate = nextDow(base, 3); // mercredi
      const reelDate = nextDow(base, 5); // vendredi
      return {
        slots: [
          {
            date: toIsoDate(pinDate), time: "09:00", platform: "pinterest_pin",
            motif_code: motifs[0], format: "2:3",
            focus: `Pin évergreen ${occasion.name_fr} — découverte SEO long terme (1 seule pin, pas de cadence).`,
          },
          {
            date: toIsoDate(reelDate), time: "19:00", platform: "instagram_reel",
            motif_code: motifs[motifs.length > 1 ? 1 : 0], format: "9:16",
            focus: `Reel évergreen ${occasion.name_fr} — making-of broderie ou détail textile, ton de marque (1 seul reel).`,
          },
        ],
        occurrence,
        deadline,
      };
    }

    // ÉDITORIAL DATÉ (temps fort réel, ex. 14 juillet) → RUNWAY complet (Sarah 30/06) :
    //  • post d'ouverture à J-campaign_lead (désir),
    //  • posts hebdo de montée,
    //  • reel « moment ou jamais » à la deadline commande (= dernière broderie possible à temps),
    //  • post final LE JOUR J = engagement pur, AUCUN CTA (trop tard pour broder pour le jour même).
    const start = maxDate(today, addDays(occurrence, -occasion.campaign_lead_days));
    const lastOrder = deadline; // occurrence - lead_days
    const m0 = motifs[0];
    const m1 = motifs[motifs.length > 1 ? 1 : 0];
    const fr = (d: Date) => `${d.getDate()}/${d.getMonth() + 1}`;
    const datedSlots: AutoSlot[] = [];

    // Pinterest semée tôt (mercredi proche du début)
    const pinDate = nextDow(start, 3);
    if (pinDate <= occurrence) {
      datedSlots.push({
        date: toIsoDate(pinDate), time: "09:00", platform: "pinterest_pin",
        motif_code: m0, format: "2:3",
        focus: `Pin ${occasion.name_fr} — semée tôt, découverte SEO long terme.`,
      });
    }
    // Post d'ouverture (désir) au début du runway
    datedSlots.push({
      date: toIsoDate(start), time: "19:00", platform: "instagram_post",
      motif_code: m0, format: "4:5",
      focus: `Ouverture ${occasion.name_fr} — désir / storytelling, ton de marque (drôle, complice). Commande ouverte jusqu'au ${fr(lastOrder)}.`,
    });
    // Posts hebdo de montée entre l'ouverture et la deadline commande
    for (let c = addDays(start, 7); c < lastOrder; c = addDays(c, 7)) {
      datedSlots.push({
        date: toIsoDate(c), time: "19:00", platform: "instagram_post",
        motif_code: m1, format: "4:5",
        focus: `${occasion.name_fr} — montée du désir, CTA doux : commande avant le ${fr(lastOrder)} pour broder à temps.`,
      });
    }
    // Reel « moment ou jamais » à la deadline commande
    if (lastOrder > today && lastOrder < occurrence) {
      datedSlots.push({
        date: toIsoDate(lastOrder), time: "19:00", platform: "instagram_reel",
        motif_code: m0, format: "9:16",
        focus: `${occasion.name_fr} — C'EST LE MOMENT OU JAMAIS : dernière commande aujourd'hui pour broder à temps. Après, trop tard.`,
      });
    }
    // Post final LE JOUR J = engagement pur, aucun CTA commande
    datedSlots.push({
      date: toIsoDate(occurrence), time: "11:00", platform: "instagram_post",
      motif_code: m0, format: "4:5",
      focus: `${occasion.name_fr} — JOUR J : post engagement pur, célébration. AUCUN CTA commande (trop tard pour broder pour aujourd'hui).`,
    });

    // Dédupe (date + plateforme)
    const seen = new Set<string>();
    const slots = datedSlots.filter((s) => {
      const k = `${s.date}|${s.platform}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
    return { slots, occurrence, deadline };
  }

  const slots: AutoSlot[] = [];
  let cursor = minDate(igStart, pinStart);
  const end = maxDate(igEnd, pinEnd);
  let week = 0;
  while (cursor <= end) {
    const dow = getDay(cursor); // 0 = dim, 1 = lun, ..., 5 = ven, 6 = sam
    const inIg = cursor >= igStart && cursor <= igEnd;
    const inPin = cursor >= pinStart && cursor <= pinEnd;
    const daysToDeadline = Math.round((deadline.getTime() - cursor.getTime()) / MS_PER_DAY);
    const daysToOccurrence = Math.round((occurrence.getTime() - cursor.getTime()) / MS_PER_DAY);

    if (inPin && dow === 3) {
      // Mercredi 9h — Pinterest semée tôt (1 pin / semaine pendant le front-load)
      const motif = motifs[(week + 1) % motifs.length];
      slots.push({
        date: toIsoDate(cursor),
        time: "09:00",
        platform: "pinterest_pin",
        motif_code: motif,
        format: "2:3",
        focus: `Pin Pinterest ${occasion.name_fr} — semée tôt (J-${daysToOccurrence}), trafic long terme. A/B test motif ${motif}.`,
      });
    }
    if (inIg && dow === 1) {
      // Lundi 19h — Insta post hero
      const motif = motifs[week % motifs.length];
      slots.push({
        date: toIsoDate(cursor),
        time: "19:00",
        platform: "instagram_post",
        motif_code: motif,
        format: "4:5",
        focus: igFocus(occasion, week, daysToDeadline, isSeasonal, isEditorial),
      });
    }
    if (inIg && dow === 5) {
      // Vendredi 19h — Insta reel
      const motif = motifs[week % motifs.length];
      slots.push({
        date: toIsoDate(cursor),
        time: "19:00",
        platform: "instagram_reel",
        motif_code: motif,
        format: "9:16",
        focus: `Reel ${occasion.name_fr} — making-of broderie ou détail textile (semaine ${week + 1}).`,
      });
    }
    if (dow === 5) week++; // rotation motif déterministe (incrémentée chaque vendredi)
    cursor = addDays(cursor, 1);
  }

  return { slots, occurrence, deadline };
}

/** Note éditoriale du post hero Insta, montée d'urgence vers le deadline. */
function igFocus(
  occasion: PlanableOccasionRow,
  week: number,
  daysToDeadline: number,
  isSeasonal: boolean,
  isEditorial: boolean
): string {
  if (isEditorial) {
    return `Post éditorial ${occasion.name_fr} — engagement / reach, ton de marque (drôle, complice), hook QUESTION ou POV, AUCUN CTA deadline (semaine ${week + 1}).`;
  }
  if (isSeasonal) {
    return `Post de saison ${occasion.name_fr} — contenu d'ambiance, hook ÉMOTION (semaine ${week + 1}).`;
  }
  if (daysToDeadline <= 7) {
    return `Post hero ${occasion.name_fr} — DERNIÈRE LIGNE, countdown J-${daysToDeadline} avant clôture commande, CTA très clair.`;
  }
  if (daysToDeadline <= 21) {
    return `Post hero ${occasion.name_fr} — conversion, CTA achat affirmé + rappel deadline (J-${daysToDeadline}).`;
  }
  return `Post hero ${occasion.name_fr} — désir / storytelling, hook ÉMOTION, CTA discret (semaine ${week + 1}).`;
}

/** Prochaine date (incluse) tombant sur le jour de semaine `dow` (0=dim … 5=ven). */
function nextDow(from: Date, dow: number): Date {
  const diff = (dow - getDay(from) + 7) % 7;
  return addDays(from, diff);
}

function maxDate(a: Date, b: Date): Date {
  return a.getTime() > b.getTime() ? a : b;
}

function minDate(a: Date, b: Date): Date {
  return a.getTime() < b.getTime() ? a : b;
}

function toIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}
