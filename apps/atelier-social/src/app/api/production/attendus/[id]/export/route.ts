/**
 * GET /api/production/attendus/[id]/export
 *
 * Fiche de réception Excel : n° de facture / n° de commande fournisseur en
 * tête, puis 1 ligne par article attendu avec sa réf. Ypersoa (ou « À CRÉER »),
 * la destination (commande client / stock / R&D) et une colonne « Reçu » à
 * cocher. Pour prévenir la prod de ce qui arrive.
 */
import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { requireRole } from "@/lib/auth-guard";
import { getAttendu } from "@/lib/production/attendus";

const USAGE: Record<string, string> = { prod: "Commande client", stock: "Stock", rnd: "R&D" };
const fr = (iso?: string) => (iso ? iso.split("-").reverse().join("/") : "");

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole(["admin", "prod"]);
  if (!auth) return NextResponse.json({ ok: false, error: "Accès réservé à l'atelier." }, { status: 403 });
  const { id } = await params;
  const a = await getAttendu(id);
  if (!a) return NextResponse.json({ ok: false, error: `Attendu ${id} introuvable.` }, { status: 404 });

  const entete = [
    ["ATTENDU DE LIVRAISON", a.id],
    ["Fournisseur", a.fournisseur],
    ["N° de facture", a.numero_facture ?? ""],
    ["N° de commande fournisseur", a.numero_commande_fournisseur ?? ""],
    ["Date de commande", fr(a.date_commande)],
    ["Livraison prévue", fr(a.date_livraison_prevue)],
    ["Total HT", a.total_ht ?? ""],
    ["Total TTC", a.total_ttc ?? ""],
    [],
  ];
  const header = [
    "Réf. Ypersoa", "Article Ypersoa", "État réf.", "Réf. fournisseur", "Désignation", "Coloris", "Taille",
    "Qté", "PU HT", "Total HT", "Destination", "Commande client", "Qté reçue", "Note",
  ];
  const lignes = a.lignes.map((l) => [
    l.ref_article && l.etat === "reference" ? l.ref_article : `À CRÉER${l.ref_article ? ` (${l.ref_article})` : l.ref_produit ? ` (${l.ref_produit})` : ""}`,
    l.libelle_article ?? "",
    l.etat === "reference" ? "OK" : l.etat === "a_creer" ? `À créer : ${(l.manque ?? []).join(", ")}` : "Produit à créer (R&D)",
    l.ref_fournisseur, l.designation, l.coloris, l.taille,
    l.quantite, l.pu_ht ?? "", l.total_ht ?? "",
    USAGE[l.usage] ?? l.usage, l.commande_client ?? "", l.quantite_recue ?? "", l.note ?? "",
  ]);
  const ws = XLSX.utils.aoa_to_sheet([...entete, header, ...lignes]);
  ws["!cols"] = [18, 30, 22, 16, 40, 18, 7, 6, 8, 9, 16, 16, 10, 24].map((wch) => ({ wch }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Réception");
  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;

  const nom = `attendu_${(a.fournisseur || "fournisseur").toLowerCase()}_${(a.numero_facture || a.numero_commande_fournisseur || a.id).replace(/[^A-Za-z0-9-]+/g, "-")}.xlsx`;
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${nom}"`,
    },
  });
}
