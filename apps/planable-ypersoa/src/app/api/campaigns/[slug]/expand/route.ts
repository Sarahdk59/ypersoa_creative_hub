/**
 * POST /api/campaigns/[slug]/expand
 * Expand le publication_plan d'un brief special-campaign en N entrées draft d'un coup.
 *
 * Utilisé par SuggestionsPanel quand Sarah clique "Planifier la campagne complète".
 * Ne touche PAS aux entrées existantes — uniquement insert (Sarah peut supprimer
 * via le calendrier si elle veut nettoyer).
 */
import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";
import { SPECIAL_CAMPAIGNS } from "@/lib/occasions/special-campaigns";
import { generateAutoPlan } from "@/lib/occasions/auto-plan";
import type { PlanableOccasionRow } from "@/lib/supabase/types";

function localIsoFromDateTime(date: string, time: string): string {
  const [y, m, d] = date.split("-").map(Number);
  const [h, mn] = time.split(":").map(Number);
  return new Date(y, m - 1, d, h, mn).toISOString();
}

export async function POST(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const supabase = getSupabaseServer();

    let plan: { date: string; time: string; platform: string; motif_code: string; format: string; focus: string }[];
    let deadline: string;
    let occurrence: string;
    let mode: "hardcoded" | "auto";

    const brief = SPECIAL_CAMPAIGNS[slug];
    if (brief) {
      plan = brief.publication_plan;
      deadline = brief.buy_by_deadline;
      occurrence = brief.occurrence;
      mode = "hardcoded";
    } else {
      // Auto-plan : on charge l'occasion depuis la DB
      const { data: occRow, error: occErr } = await supabase
        .from("planable_occasions")
        .select("*")
        .eq("slug", slug)
        .maybeSingle();
      if (occErr) throw occErr;
      if (!occRow) {
        return NextResponse.json(
          { ok: false, error: `Occasion ${slug} introuvable` },
          { status: 404 }
        );
      }
      const auto = generateAutoPlan(occRow as PlanableOccasionRow, new Date());
      plan = auto.slots;
      deadline = auto.deadline.toISOString();
      occurrence = auto.occurrence.toISOString();
      mode = "auto";
    }

    if (plan.length === 0) {
      return NextResponse.json(
        { ok: false, error: `Plan vide pour ${slug} — pas de fenêtre disponible` },
        { status: 400 }
      );
    }

    const rows = plan.map((slot) => ({
      scheduled_at: localIsoFromDateTime(slot.date, slot.time),
      platform: slot.platform as PlanableOccasionRow["recommended_motifs"][number] extends string ? string : never,
      motif_code: slot.motif_code,
      occasion_slug: slug,
      format: slot.format,
      notes: slot.focus,
    }));

    const { data, error } = await supabase
      .from("planable_calendar_entries")
      .insert(rows)
      .select();
    if (error) throw error;

    return NextResponse.json({
      ok: true,
      data: { slug, mode, inserted: data?.length ?? 0, deadline, occurrence },
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
