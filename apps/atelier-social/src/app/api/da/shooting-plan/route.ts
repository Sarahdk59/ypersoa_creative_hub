/**
 * POST /api/da/shooting-plan
 * Body: ShootingBriefInput
 * Retourne: ShootingPlanOutput
 *
 * V0 builder déterministe (pas de LLM) — cf. shooting-plan-builder.ts
 */
import { NextRequest, NextResponse } from "next/server";
import { buildShootingPlan, type ShootingBriefInput } from "@/lib/atelier-da/shooting-plan-builder";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as ShootingBriefInput;
    if (!body?.texte_libre || body.texte_libre.trim().length < 3) {
      return NextResponse.json(
        { ok: false, error: "Brief vide ou trop court (min 3 caractères)." },
        { status: 400 }
      );
    }
    const plan = await buildShootingPlan(body);
    return NextResponse.json({ ok: true, plan });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
