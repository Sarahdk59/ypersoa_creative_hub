/**
 * Garde-fou serveur pour les routes API qui exigent un rôle précis.
 *
 * Le middleware gate déjà les PAGES par section/rôle, mais les routes /api/*
 * (hors /api/da) ne sont pas gardées en V1. Cet helper permet à une route
 * sensible (ex. dépôt PDF bon de préparation) de vérifier explicitement le
 * rôle de l'utilisateur connecté.
 */
import { createClient } from "@/lib/supabase/server";
import type { AppRole } from "@/lib/access";

export interface AuthContext {
  user_id: string;
  email: string | null;
  role: AppRole;
}

/**
 * Retourne le contexte d'auth si l'utilisateur connecté a un rôle parmi
 * `allowed`, sinon null. Aucun rôle / pas de session → null.
 */
export async function requireRole(
  allowed: AppRole[],
): Promise<AuthContext | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const role = (profile?.role as AppRole | undefined) ?? "viewer";
  if (!allowed.includes(role)) return null;

  return { user_id: user.id, email: user.email ?? null, role };
}
