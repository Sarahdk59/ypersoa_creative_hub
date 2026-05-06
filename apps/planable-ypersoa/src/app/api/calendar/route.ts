/**
 * GET  /api/calendar?from=ISO&to=ISO&platform=&status=
 * POST /api/calendar  body { scheduled_at, platform, motif_code, occasion_slug?, format, notes? }
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseServer } from "@/lib/supabase/server";
import type { PlanablePlatform, PlanableMediaFormat, PlanableEntryStatus } from "@/lib/supabase/types";

const platformEnum: [PlanablePlatform, ...PlanablePlatform[]] = [
  "instagram_post", "instagram_reel", "instagram_story", "pinterest_pin",
];
const formatEnum: [PlanableMediaFormat, ...PlanableMediaFormat[]] = ["1:1", "4:5", "9:16", "2:3"];
const statusEnum: [PlanableEntryStatus, ...PlanableEntryStatus[]] = [
  "draft", "pack_generated", "scheduled", "published", "failed",
];

const createSchema = z.object({
  scheduled_at: z.string().datetime({ offset: true }),
  platform: z.enum(platformEnum),
  motif_code: z.string().min(1),
  variante_file: z.string().nullable().optional(),
  occasion_slug: z.string().optional().nullable(),
  format: z.enum(formatEnum),
  notes: z.string().optional().nullable(),
});

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");
    const platform = url.searchParams.get("platform") as PlanablePlatform | null;
    const status = url.searchParams.get("status") as PlanableEntryStatus | null;

    const supabase = getSupabaseServer();
    let q = supabase
      .from("planable_calendar_entries")
      .select("*")
      .order("scheduled_at", { ascending: true });

    if (from) q = q.gte("scheduled_at", from);
    if (to) q = q.lte("scheduled_at", to);
    if (platform && platformEnum.includes(platform)) q = q.eq("platform", platform);
    if (status && statusEnum.includes(status)) q = q.eq("status", status);

    const { data, error } = await q;
    if (error) throw error;
    return NextResponse.json({ ok: true, data });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: parsed.error.issues }, { status: 400 });
    }
    const supabase = getSupabaseServer();
    const { data, error } = await supabase
      .from("planable_calendar_entries")
      .insert(parsed.data)
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
