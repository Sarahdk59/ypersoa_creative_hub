/**
 * GET /api/clients/export?motif=...&depuis=YYYY-MM-DD
 *
 * CSV des SEULS contacts contactables (statut "client" ou "inscrit") — à
 * importer dans Shopify Email / Brevo pour une campagne (ex. Black Friday).
 * Les désinscrits et exclus (Etsy par défaut) ne sortent jamais.
 */
import { requireRole } from "@/lib/auth-guard";
import { construireCarnet, contactsEnCsv } from "@/lib/clients/carnet";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const auth = await requireRole(["admin", "crea"]);
  if (!auth) return new Response("Accès réservé.", { status: 403 });

  const url = new URL(req.url);
  const motif = url.searchParams.get("motif")?.trim();
  const depuis = url.searchParams.get("depuis")?.trim();

  const { contacts } = await construireCarnet();
  const selection = contacts.filter(
    (c) =>
      c.contactable &&
      (!motif || c.motifs.includes(motif)) &&
      (!depuis || c.derniere_commande >= depuis),
  );

  const date = new Date().toISOString().slice(0, 10);
  return new Response(contactsEnCsv(selection), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="ypersoa-clients-contactables-${date}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
