import { NextRequest, NextResponse } from "next/server";

import { listSources } from "@/lib/motion/hub-gateway";
import type { MotionMode } from "@/types/motion";

const VALID_MODES = new Set<MotionMode>(["reel", "ambiance", "packshot"]);

export async function GET(req: NextRequest) {
  const mode = req.nextUrl.searchParams.get("mode");
  if (!mode || !VALID_MODES.has(mode as MotionMode)) {
    return NextResponse.json({ error: "mode required" }, { status: 400 });
  }
  const sources = await listSources(mode as MotionMode);
  return NextResponse.json({ sources });
}
