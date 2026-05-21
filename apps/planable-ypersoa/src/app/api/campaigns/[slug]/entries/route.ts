/**
 * DELETE /api/campaigns/[slug]/entries
 * Supprime toutes les entrées calendrier liées à un slug d'occasion (reset campagne).
 * Refuse les entrées en statut "published" (silencieusement).
 * Renvoie { deleted: number, skipped_published: number }.
 */
import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";

export async function DELETE(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const supabase = getSupabaseServer();

    const { count: totalCount, error: countErr } = await supabase
      .from("planable_calendar_entries")
      .select("id", { count: "exact", head: true })
      .eq("occasion_slug", slug);
    if (countErr) throw countErr;

    const { data, error } = await supabase
      .from("planable_calendar_entries")
      .delete()
      .eq("occasion_slug", slug)
      .neq("status", "published")
      .select("id");
    if (error) throw error;

    const deleted = data?.length ?? 0;
    const skipped = Math.max(0, (totalCount ?? 0) - deleted);

    return NextResponse.json({
      ok: true,
      data: { deleted, skipped_published: skipped, slug },
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
