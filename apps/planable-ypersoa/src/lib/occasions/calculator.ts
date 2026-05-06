/**
 * Calculs de dates pour le calendrier éditorial Ypersoa.
 *
 * Stratégies supportées (champ `date_strategy` côté DB) :
 *  - "fixed:MM-DD"            → date calendaire fixe (ex: Saint-Valentin "fixed:02-14")
 *  - "last_sunday_of:M"       → dernier dimanche du mois M (ex: Fête des Mères "last_sunday_of:5")
 *  - "nth_sunday_of:M:N"      → N-ième dimanche du mois M (ex: Fête des Pères "nth_sunday_of:6:3")
 *  - "season:Mstart-Mend"     → fenêtre saisonnière ouverte (ex: Mariage "season:5-9")
 *
 * Formule deadline (validée Sarah) :
 *   buy_by_deadline = occurrence - lead_days
 * lead_days bundle TOUT le délai (prod broderie Tajima + expé + livraison).
 */
import { addDays, getDay, lastDayOfMonth } from "date-fns";

export function nextOccurrence(strategy: string, from: Date = new Date()): Date {
  if (strategy.startsWith("fixed:")) {
    const [m, d] = strategy.slice(6).split("-").map(Number);
    let next = new Date(from.getFullYear(), m - 1, d);
    if (next < startOfDay(from)) {
      next = new Date(from.getFullYear() + 1, m - 1, d);
    }
    return next;
  }

  if (strategy.startsWith("last_sunday_of:")) {
    const month = Number(strategy.slice("last_sunday_of:".length));
    let year = from.getFullYear();
    let candidate = computeLastSundayOf(year, month);
    if (candidate < startOfDay(from)) {
      candidate = computeLastSundayOf(year + 1, month);
    }
    return candidate;
  }

  if (strategy.startsWith("nth_sunday_of:")) {
    const [month, n] = strategy.slice("nth_sunday_of:".length).split(":").map(Number);
    let year = from.getFullYear();
    let candidate = computeNthSundayOf(year, month, n);
    if (candidate < startOfDay(from)) {
      candidate = computeNthSundayOf(year + 1, month, n);
    }
    return candidate;
  }

  if (strategy.startsWith("season:")) {
    const [start] = strategy.slice("season:".length).split("-").map(Number);
    const startDate = new Date(from.getFullYear(), start - 1, 1);
    return startDate >= startOfDay(from) ? startDate : startOfDay(from);
  }

  throw new Error(`Stratégie de date inconnue : ${strategy}`);
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function computeLastSundayOf(year: number, month: number): Date {
  let last = lastDayOfMonth(new Date(year, month - 1, 1));
  while (getDay(last) !== 0) last = addDays(last, -1);
  return last;
}

function computeNthSundayOf(year: number, month: number, n: number): Date {
  let d = new Date(year, month - 1, 1);
  while (getDay(d) !== 0) d = addDays(d, 1);
  return addDays(d, (n - 1) * 7);
}

/**
 * Deadline commande à partir de l'occurrence et du lead time bundlé.
 * Formule : buy_by_deadline = occurrence - lead_days
 */
export function buyByDeadline(occurrence: Date, leadDays: number): Date {
  return addDays(occurrence, -leadDays);
}

/**
 * Statut d'urgence par rapport à aujourd'hui.
 * Pilote la couleur dans SuggestionsPanel et le mode CTA.
 */
export type OccasionUrgency =
  | { kind: "critical"; daysToDeadline: number }
  | { kind: "high"; daysToDeadline: number }
  | { kind: "medium"; daysToDeadline: number }
  | { kind: "low"; daysToDeadline: number }
  | { kind: "engagement_only"; daysToOccurrence: number };

const MS_PER_DAY = 86_400_000;

export function computeUrgency(
  deadline: Date,
  occurrence: Date,
  today: Date = new Date()
): OccasionUrgency {
  const daysToDeadline = Math.ceil((deadline.getTime() - today.getTime()) / MS_PER_DAY);
  const daysToOccurrence = Math.ceil((occurrence.getTime() - today.getTime()) / MS_PER_DAY);

  if (daysToDeadline < 0 && daysToOccurrence >= 0) {
    return { kind: "engagement_only", daysToOccurrence };
  }
  if (daysToDeadline <= 14) return { kind: "critical", daysToDeadline };
  if (daysToDeadline <= 45) return { kind: "high", daysToDeadline };
  if (daysToDeadline <= 60) return { kind: "medium", daysToDeadline };
  return { kind: "low", daysToDeadline };
}

/** Couleur emoji par niveau d'urgence (utilisée par SuggestionsPanel). */
export function urgencyEmoji(u: OccasionUrgency): string {
  switch (u.kind) {
    case "critical": return "🔴";
    case "high": return "🟠";
    case "medium": return "🟡";
    case "low": return "🟢";
    case "engagement_only": return "⚫";
  }
}
