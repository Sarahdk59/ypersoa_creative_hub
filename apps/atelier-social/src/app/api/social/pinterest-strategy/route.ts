/**
 * GET /api/social/pinterest-strategy
 * Expose la stratégie Pinterest (fiches, formats, ancres, mapping occasions) au client.
 */

import { NextResponse } from "next/server";
import { loadPinterestStrategy } from "@/lib/pinterest-strategy.server";

export const runtime = "nodejs";

export async function GET() {
  try {
    const strategy = await loadPinterestStrategy();
    return NextResponse.json({ ok: true, data: strategy });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur inconnue";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
