/**
 * GET   /api/clients  → carnet d'adresses (contacts + commandes sans e-mail)
 * PATCH /api/clients  → { email, statut?: StatutMarketing | null, note?: string | null }
 *
 * Données personnelles : réservé admin + créa (jamais prod / viewer).
 * Volontairement HORS de /api/da (CORS public sans auth).
 */
import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth-guard";
import {
  construireCarnet,
  enregistrerMarketing,
  normaliserEmail,
  STATUTS_MARKETING,
  type StatutMarketing,
} from "@/lib/clients/carnet";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireRole(["admin", "crea"]);
  if (!auth) return NextResponse.json({ ok: false, error: "Accès réservé." }, { status: 403 });
  try {
    return NextResponse.json({ ok: true, data: await construireCarnet() });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const auth = await requireRole(["admin", "crea"]);
  if (!auth) return NextResponse.json({ ok: false, error: "Accès réservé." }, { status: 403 });
  try {
    const body = (await req.json()) as { email?: string; statut?: string | null; note?: string | null };
    const email = normaliserEmail(body.email);
    if (!email) return NextResponse.json({ ok: false, error: "E-mail invalide." }, { status: 400 });
    if (body.statut != null && !STATUTS_MARKETING.includes(body.statut as StatutMarketing)) {
      return NextResponse.json({ ok: false, error: "Statut inconnu." }, { status: 400 });
    }
    await enregistrerMarketing(
      email,
      {
        ...(body.statut !== undefined ? { statut: body.statut as StatutMarketing | null } : {}),
        ...(body.note !== undefined ? { note: body.note } : {}),
      },
      auth.email,
    );
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
