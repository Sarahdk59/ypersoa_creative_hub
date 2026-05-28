/**
 * GET /api/me
 *
 * Retourne l'utilisateur connecté + son rôle (depuis `profiles`). Sert au gating
 * côté UI (afficher/masquer un bouton selon le rôle). Le middleware bloque déjà
 * les pages non autorisées, mais cette route permet aux composants client de
 * connaître le rôle sans dupliquer l'appel Supabase.
 */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { AppRole } from "@/lib/access";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "non authentifié" }, { status: 401 });
  }
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  const role = (profile?.role as AppRole | undefined) ?? "viewer";
  return NextResponse.json({
    ok: true,
    data: { id: user.id, email: user.email ?? null, role },
  });
}
