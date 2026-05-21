/**
 * GET    /api/calendar/[id]
 * PATCH  /api/calendar/[id]   body partiel
 * DELETE /api/calendar/[id]
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseServer } from "@/lib/supabase/server";

const patchSchema = z.object({
  scheduled_at: z.string().datetime({ offset: true }).optional(),
  platform: z.enum(["instagram_post", "instagram_reel", "instagram_story", "pinterest_pin"]).optional(),
  motif_code: z.string().min(1).optional(),
  variante_file: z.string().nullable().optional(),
  occasion_slug: z.string().nullable().optional(),
  format: z.enum(["1:1", "4:5", "9:16", "2:3"]).optional(),
  status: z.enum(["draft", "pack_generated", "scheduled", "published", "failed"]).optional(),
  pack_id: z.string().uuid().nullable().optional(),
  meta_media_id: z.string().nullable().optional(),
  meta_permalink: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = getSupabaseServer();
    const { data, error } = await supabase
      .from("planable_calendar_entries")
      .select("*, planable_packs(*)")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    if (!data) return NextResponse.json({ ok: false, error: "Introuvable" }, { status: 404 });
    return NextResponse.json({ ok: true, data });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: parsed.error.issues }, { status: 400 });
    }
    const supabase = getSupabaseServer();
    const { data, error } = await supabase
      .from("planable_calendar_entries")
      .update(parsed.data)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return NextResponse.json({ ok: true, data });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = getSupabaseServer();
    const { data, error } = await supabase
      .from("planable_calendar_entries")
      .delete()
      .eq("id", id)
      .neq("status", "published")
      .select();
    if (error) throw error;
    if (!data || data.length === 0) {
      return NextResponse.json(
        { ok: false, error: "Entrée introuvable ou déjà publiée (suppression interdite)" },
        { status: 409 }
      );
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
