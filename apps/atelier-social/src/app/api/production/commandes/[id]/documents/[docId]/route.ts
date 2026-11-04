/**
 * DELETE /api/production/commandes/[id]/documents/[docId]
 *
 * Retire une pièce du dossier (et le fichier du bucket). ADMIN SEULEMENT :
 * matrice de droits du 22/05 — l'atelier dépose, il ne supprime pas.
 */
import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth-guard";
import { createClient } from "@/lib/supabase/server";
import { getCommande, writeCommande } from "@/lib/production/commandes-loader";
import { BUCKET_DOCUMENTS } from "@/lib/production/dossier";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string; docId: string }> }) {
  const auth = await requireRole(["admin"]);
  if (!auth) return NextResponse.json({ ok: false, error: "Seule l'admin peut retirer une pièce." }, { status: 403 });

  try {
    const { id, docId } = await params;
    const commande = await getCommande(id);
    if (!commande) return NextResponse.json({ ok: false, error: "Commande introuvable" }, { status: 404 });
    const doc = commande.documents?.find((d) => d.id === docId);
    if (!doc) return NextResponse.json({ ok: false, error: "Pièce introuvable" }, { status: 404 });

    const supabase = await createClient();
    const { error } = await supabase.storage.from(BUCKET_DOCUMENTS).remove([doc.storage_path]);
    if (error) console.warn(`[documents] suppression fichier ${doc.storage_path} : ${error.message}`);

    commande.documents = commande.documents!.filter((d) => d.id !== docId);
    if (commande.bon_preparation_pdf?.storage_path === doc.storage_path) commande.bon_preparation_pdf = undefined;
    await writeCommande(commande);
    return NextResponse.json({ ok: true, data: commande });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
