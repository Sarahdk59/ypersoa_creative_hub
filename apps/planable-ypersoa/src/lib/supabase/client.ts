/**
 * Client Supabase browser-side (anon key).
 * Single-instance pour éviter de multiplier les WebSocket subs.
 */
"use client";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

let _client: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (_client) return _client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL/ANON_KEY manquants — vérifier .env.local");
  }
  _client = createClient(url, anon);
  return _client;
}
