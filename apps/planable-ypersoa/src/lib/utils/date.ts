/**
 * Helpers date FR pour le calendrier éditorial.
 * Toutes les dates affichées en Europe/Paris.
 */
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, addMonths, isSameMonth, isSameDay } from "date-fns";
import { fr } from "date-fns/locale";

export function frDate(d: Date | string, fmt: string = "PPP"): string {
  const dd = typeof d === "string" ? new Date(d) : d;
  return format(dd, fmt, { locale: fr });
}

export function shortFrDate(d: Date | string): string {
  const dd = typeof d === "string" ? new Date(d) : d;
  return format(dd, "EEE d MMM", { locale: fr });
}

/** Grille 6×7 = 42 cases pour la vue mois (semaines complètes Lundi → Dimanche). */
export function monthGridDays(monthAnchor: Date): Date[] {
  const start = startOfWeek(startOfMonth(monthAnchor), { weekStartsOn: 1 });
  const end = endOfWeek(endOfMonth(monthAnchor), { weekStartsOn: 1 });
  return eachDayOfInterval({ start, end });
}

export function nextMonth(d: Date): Date { return addMonths(d, 1); }
export function prevMonth(d: Date): Date { return addMonths(d, -1); }

export { isSameMonth, isSameDay };

export const WEEKDAY_LABELS_FR = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

/** Tri d'entrées sur même jour par heure puis plateforme. */
export function compareEntriesByDate<T extends { scheduled_at: string }>(a: T, b: T): number {
  return new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime();
}
