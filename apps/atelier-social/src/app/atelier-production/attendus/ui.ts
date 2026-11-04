/** Libellés partagés des pages Attendus de livraison (client). */
export type StatutAttenduUI = "attendu" | "recu_partiel" | "recu" | "litige";

export const STATUT_ATTENDU: Record<StatutAttenduUI, { label: string; bg: string; fg: string }> = {
  attendu: { label: "Attendu", bg: "#FEF6E0", fg: "#7A5800" },
  recu_partiel: { label: "Reçu partiel", bg: "#FFE9D6", fg: "#9A4400" },
  recu: { label: "Reçu", bg: "#E5F0E8", fg: "#2F7A3E" },
  litige: { label: "Litige", bg: "#FBE3E0", fg: "#A5281C" },
};

export const USAGE_LABEL: Record<string, string> = { prod: "Commande client", stock: "Stock", rnd: "R&D" };

export const dateFr = (iso?: string) =>
  iso ? new Date(`${iso}T12:00:00`).toLocaleDateString("fr-FR", { weekday: "short", day: "2-digit", month: "2-digit" }) : "—";
