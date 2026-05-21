/**
 * POST /api/calendar/bulk-delete
 * body: { ids: string[] }
 * Supprime en lot — refuse les entrées en statut "published" (silencieusement).
 * Renvoie { deleted: number, skipped_published: number }.
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseServer } from "@/lib/supabase/server";

const bodySchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(500),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: parsed.error.issues }, { status: 400 });
    }
    const { ids } = parsed.data;
    const supabase = getSupabaseServer();

    const { data, error } = await supabase
      .from("planable_calendar_entries")
      .delete()
      .in("id", ids)
      .neq("status", "published")
      .select("id");
    if (error) throw error;

    const deleted = data?.length ?? 0;
    const skipped = ids.length - deleted;

    return NextResponse.json({
      ok: true,
      data: { deleted, skipped_published: skipped },
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
