/**
 * Système de rôles & accès du Hub.
 *
 * Miroir applicatif du seed `public.role_permissions` (Supabase). Source de
 * vérité pour le gating côté Next (middleware + UI). Si tu changes les accès
 * en base, mets aussi ce fichier à jour (ou, plus tard, on lira la table).
 */

export type AppRole = "admin" | "crea" | "prod" | "viewer";

export type Section =
  | "dashboard"
  | "atelier-da"
  | "atelier-production"
  | "referentiels-prod"
  | "planable"
  | "admin";

export const ROLE_SECTIONS: Record<AppRole, Section[]> = {
  admin: [
    "dashboard",
    "atelier-da",
    "atelier-production",
    "referentiels-prod",
    "planable",
    "admin",
  ],
  // La comm (crea) consulte motifs + palettes d'associations sans avoir le
  // reste de la prod (kanban, commandes, fils, règles…).
  crea: ["dashboard", "atelier-da", "referentiels-prod", "planable"],
  prod: ["dashboard", "atelier-production", "referentiels-prod"],
  viewer: ["dashboard"],
};

/** Déduit la section métier d'un chemin. */
export function sectionForPath(pathname: string): Section {
  // Référentiels production lisibles aussi par la comm (crea) : motifs YPM +
  // palettes d'associations. Doit passer AVANT le préfixe générique prod.
  if (
    pathname.startsWith("/atelier-production/motifs") ||
    pathname.startsWith("/atelier-production/palettes")
  )
    return "referentiels-prod";
  if (pathname.startsWith("/atelier-production")) return "atelier-production";
  // Atelier Trends = veille créative/comm → même périmètre qu'Atelier DA (admin + crea).
  if (pathname.startsWith("/atelier-trends")) return "atelier-da";
  if (pathname.startsWith("/atelier-da")) return "atelier-da";
  if (pathname.startsWith("/lookbook") || pathname.startsWith("/shooting"))
    return "atelier-da";
  if (pathname.startsWith("/admin")) return "admin";
  return "dashboard"; // /, /social, /search…
}

export function canAccess(
  role: AppRole | null | undefined,
  pathname: string,
): boolean {
  if (!role) return false;
  return ROLE_SECTIONS[role]?.includes(sectionForPath(pathname)) ?? false;
}

export const ROLE_LABELS: Record<AppRole, string> = {
  admin: "Admin",
  crea: "Créa",
  prod: "Production",
  viewer: "Lecture",
};
