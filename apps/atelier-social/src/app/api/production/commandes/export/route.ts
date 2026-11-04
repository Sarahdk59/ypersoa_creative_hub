/**
 * GET /api/production/commandes/export
 *
 * Export complet (actives + archivées) de la table Supabase `commandes` en un
 * seul JSON téléchargeable — filet de secours indépendant de Supabase, à
 * committer périodiquement dans le repo (même logique que les autres
 * référentiels versionnés git). Réservé admin : contient les montants TTC.
 */
import { NextResponse } from "next/server";
import { listCommandes } from "@/lib/production/commandes-loader";
import { requireRole } from "@/lib/auth-guard";

export async function GET() {
  const auth = await requireRole(["admin"]);
  if (!auth) {
    return NextResponse.json({ ok: false, error: "Réservé aux administrateurs." }, { status: 403 });
  }

  const commandes = await listCommandes();
  const exportedAt = new Date().toISOString();
  const filename = `commandes_backup_${exportedAt.slice(0, 10)}.json`;

  const body = JSON.stringify({ exported_at: exportedAt, nb_commandes: commandes.length, commandes }, null, 2);

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
