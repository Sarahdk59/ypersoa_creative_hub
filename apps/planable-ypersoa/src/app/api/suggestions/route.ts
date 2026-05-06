/**
 * GET /api/suggestions
 * Retourne les occasions à venir dans les 60 prochains jours avec urgence + packs candidats.
 *
 * Permet override du `today` via ?today=YYYY-MM-DD pour QA / mode engagement_only
 * (cf. DoD #15 — stub today à 2026-06-15 pour tester bandeau "RDV manqué FdP").
 */
import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";
import { buildSuggestions } from "@/lib/occasions/suggestions";
import type { PlanableOccasionRow } from "@/lib/supabase/types";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const todayParam = url.searchParams.get("today");
    const today = todayParam ? new Date(todayParam) : new Date();
    if (isNaN(today.getTime())) {
      return NextResponse.json({ ok: false, error: "today invalide (YYYY-MM-DD)" }, { status: 400 });
    }

    const supabase = getSupabaseServer();
    const { data, error } = await supabase.from("planable_occasions").select("*");
    if (error) throw error;

    const suggestions = buildSuggestions((data ?? []) as PlanableOccasionRow[], today);
    return NextResponse.json({
      ok: true,
      today: today.toISOString().slice(0, 10),
      data: suggestions.map((s) => ({
        ...s,
        occurrence: s.occurrence.toISOString(),
        buy_by_deadline: s.buy_by_deadline.toISOString(),
      })),
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
