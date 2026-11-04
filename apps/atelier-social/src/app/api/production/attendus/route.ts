/**
 * GET  /api/production/attendus  → liste des attendus de livraison (+ résumé)
 * POST /api/production/attendus  → crée un attendu vide (saisie manuelle)
 *
 * Admin + atelier (prod).
 */
import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth-guard";
import {
  listAttendus,
  nouvelIdAttendu,
  plusJoursOuvres,
  resumeAttendu,
  writeAttendu,
  type Attendu,
} from "@/lib/production/attendus";

export async function GET() {
  const auth = await requireRole(["admin", "prod"]);
  if (!auth) return NextResponse.json({ ok: false, error: "Accès réservé à l'atelier." }, { status: 403 });
  try {
    const attendus = await listAttendus();
    return NextResponse.json({ ok: true, data: attendus.map((a) => ({ ...a, resume: resumeAttendu(a) })) });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const auth = await requireRole(["admin", "prod"]);
  if (!auth) return NextResponse.json({ ok: false, error: "Accès réservé à l'atelier." }, { status: 403 });
  try {
    const body = (await req.json().catch(() => ({}))) as Partial<Attendu>;
    const now = new Date().toISOString();
    const dateCommande = body.date_commande || now.slice(0, 10);
    const a: Attendu = {
      id: nouvelIdAttendu(),
      fournisseur: (body.fournisseur ?? "").trim().toUpperCase(),
      numero_facture: body.numero_facture,
      numero_commande_fournisseur: body.numero_commande_fournisseur,
      date_commande: dateCommande,
      date_livraison_prevue: body.date_livraison_prevue || plusJoursOuvres(dateCommande, 2),
      statut: "attendu",
      devise: "EUR",
      lignes: [],
      documents: [],
      created_by: auth.email ?? undefined,
      created_at: now,
      updated_at: now,
    };
    await writeAttendu(a);
    return NextResponse.json({ ok: true, data: a });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
