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
  | "planable"
  | "admin";

export const ROLE_SECTIONS: Record<AppRole, Section[]> = {
  admin: ["dashboard", "atelier-da", "atelier-production", "planable", "admin"],
  crea: ["dashboard", "atelier-da", "planable"],
  prod: ["dashboard", "atelier-production"],
  viewer: ["dashboard"],
};

/** Déduit la section métier d'un chemin. */
export function sectionForPath(pathname: string): Section {
  if (pathname.startsWith("/atelier-production")) return "atelier-production";
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
