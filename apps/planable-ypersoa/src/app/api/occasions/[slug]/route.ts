/**
 * PATCH /api/occasions/[slug]
 * Modifie la date de temps fort d'un planifiable (éditée par Sarah dans le panneau).
 * body { temps_fort_date: "YYYY-MM-DD" | null }
 */
import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";

export async function PATCH(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const body = await req.json().catch(() => ({}));
    const raw = (body as { temps_fort_date?: string | null }).temps_fort_date;

    let temps_fort_date: string | null = null;
    if (raw != null && raw !== "") {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
        return NextResponse.json({ ok: false, error: "temps_fort_date attendu au format YYYY-MM-DD" }, { status: 400 });
      }
      temps_fort_date = raw;
    }

    const supabase = getSupabaseServer();
    const { data, error } = await supabase
      .from("planable_occasions")
      .update({ temps_fort_date })
      .eq("slug", slug)
      .select("slug, temps_fort_date")
      .maybeSingle();
    if (error) throw error;
    if (!data) return NextResponse.json({ ok: false, error: "Occasion introuvable" }, { status: 404 });

    return NextResponse.json({ ok: true, data });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
