import { NextRequest, NextResponse } from "next/server";

import { startMotionJob } from "@/lib/motion/orchestrator";
import type { CreateMotionJobInput, MotionEngine, MotionMode } from "@/types/motion";

const VALID_MODES = new Set<MotionMode>(["reel", "ambiance", "packshot"]);
const VALID_ENGINES = new Set<MotionEngine>(["omni-flash", "veo-3.1", "stub"]);

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Body required" }, { status: 400 });
  }
  const input = body as Record<string, unknown>;

  if (typeof input.mode !== "string" || !VALID_MODES.has(input.mode as MotionMode)) {
    return NextResponse.json({ error: "mode invalid" }, { status: 400 });
  }
  if (typeof input.source_id !== "string" || !input.source_id) {
    return NextResponse.json({ error: "source_id required" }, { status: 400 });
  }

  const payload: CreateMotionJobInput & { lookbook_id?: string | null } = {
    mode: input.mode as MotionMode,
    source_id: input.source_id,
    engine:
      typeof input.engine === "string" && VALID_ENGINES.has(input.engine as MotionEngine)
        ? (input.engine as MotionEngine)
        : undefined,
    format:
      input.format === "court" || input.format === "complet"
        ? input.format
        : undefined,
    lookbook_id:
      typeof input.lookbook_id === "string" ? input.lookbook_id : undefined,
    brief: typeof input.brief === "string" ? input.brief : undefined,
  };

  try {
    const job = await startMotionJob(payload);
    return NextResponse.json(job, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erreur orchestrateur" },
      { status: 500 },
    );
  }
}
