/**
 * Client Supabase server-side.
 *
 * V1.0 : utilise SERVICE_ROLE_KEY si disponible, sinon fallback ANON_KEY.
 * Le fallback marche car la RLS V1 est permissive (`using (true)`).
 * À durcir en V2 quand on aura un vrai multi-user + RLS scoped → service_role obligatoire.
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;

if (!url) {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL manquant — vérifier .env.local");
}

export function getSupabaseServer() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const key = serviceKey || anonKey;
  if (!key) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY ou NEXT_PUBLIC_SUPABASE_ANON_KEY manquant — vérifier .env.local"
    );
  }
  return createClient(url!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
