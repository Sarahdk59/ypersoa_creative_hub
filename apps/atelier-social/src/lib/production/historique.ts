/**
 * Rattrapage d'historique des commandes (helpers purs, client + serveur).
 * Une commande « historique » est archivée sur un mois, sans journal détaillé.
 */

/** "2026-03" → "mars 2026". */
export function libelleMois(mois: string): string {
  const [y, m] = mois.split("-").map(Number);
  if (!y || !m) return mois;
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("fr-FR", { month: "long", year: "numeric", timeZone: "UTC" });
}

/** Mois "YYYY-MM" valide, pas dans le futur. */
export function moisHistoriqueValide(mois: unknown): mois is string {
  if (typeof mois !== "string" || !/^\d{4}-(0[1-9]|1[0-2])$/.test(mois)) return false;
  return mois <= new Date().toISOString().slice(0, 7);
}

/** Date d'archivage d'un mois historique = dernier jour du mois (YYYY-MM-DD). */
export function finDeMois(mois: string): string {
  const [y, m] = mois.split("-").map(Number);
  return new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
}
