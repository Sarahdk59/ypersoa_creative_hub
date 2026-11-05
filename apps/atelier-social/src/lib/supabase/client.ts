import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

// Singleton — plusieurs appels à createClient() (HubTopbar, AuthProvider, …)
// créaient chacun leur propre GoTrueClient sur la même clé de storage
// ("Multiple GoTrueClient instances detected"), ce qui peut dupliquer/gonfler
// les cookies de session jusqu'à dépasser la limite de taille d'en-têtes HTTP
// de Node — provoquant des échecs réseau intermittents (fetch qui ne part
// jamais, "Failed to fetch"/"Load failed") sur n'importe quelle requête.
let browserClient: SupabaseClient | undefined;

export function createClient(): SupabaseClient {
  if (!browserClient) {
    browserClient = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );
  }
  return browserClient;
}
