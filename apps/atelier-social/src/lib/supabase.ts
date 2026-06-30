import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// `cache: "no-store"` sur le fetch global : les lectures Supabase sont des GET
// que le navigateur met en cache → un clic "Rafraîchir" pouvait renvoyer une
// réponse périmée (ex. shots likés depuis Atelier Shooting non remontés).
// On force toujours une réponse fraîche.
const noStoreFetch: typeof fetch = (input, init) =>
  fetch(input, { ...init, cache: "no-store" });

export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey, {
      global: { fetch: noStoreFetch },
    })
  : null;

export const isSupabaseConfigured = () => Boolean(supabase);
