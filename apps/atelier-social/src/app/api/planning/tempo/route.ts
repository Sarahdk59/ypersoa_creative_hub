import { NextResponse } from "next/server";
import { loadTempo, saveTempo, type TempoFile } from "@/lib/planning/tempo-loader";

export async function GET() {
  return NextResponse.json({ ok: true, data: loadTempo() });
}

export async function PUT(request: Request) {
  try {
    const body = (await request.json()) as TempoFile;
    if (!Array.isArray(body.priorities) || !body.briefs || typeof body.briefs !== "object") {
      return NextResponse.json({ ok: false, error: "Format du tempo invalide" }, { status: 400 });
    }
    if (body.priorities.some((p) => !p.id || !["crea", "prod", "comm"].includes(p.team) || !["a_faire", "en_cours", "fait"].includes(p.status))) {
      return NextResponse.json({ ok: false, error: "Priorité invalide" }, { status: 400 });
    }
    return NextResponse.json({ ok: true, data: saveTempo(body) });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Sauvegarde impossible" }, { status: 500 });
  }
}
