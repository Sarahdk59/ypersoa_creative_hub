/**
 * POST /api/production/commandes/[id]/documents
 *   FormData : `file` + `type` (bon_commande | devis | bat | bon_livraison | etiquette | autre)
 *
 * Ajoute une pièce au dossier d'une commande existante (l'étiquette arrive
 * souvent après la commande). Une étiquette est lue et met à jour la
 * livraison (transporteur, mode, locker, suivi). Admin + atelier : on AJOUTE.
 */
import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth-guard";
import { createClient } from "@/lib/supabase/server";
import { getCommande, writeCommande } from "@/lib/production/commandes-loader";
import {
  appliquerEtiquette,
  checkFichier,
  isTypeDocument,
  lireEtiquette,
  mimeOf,
  uploadDocument,
} from "@/lib/production/dossier";

export const maxDuration = 60;

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole(["admin", "prod"]);
  if (!auth) return NextResponse.json({ ok: false, error: "Réservé à l'admin et à l'atelier." }, { status: 403 });

  try {
    const { id } = await params;
    const commande = await getCommande(id);
    if (!commande) return NextResponse.json({ ok: false, error: "Commande introuvable" }, { status: 404 });

    const form = await req.formData();
    const file = form.get("file");
    const type = form.get("type");
    if (!(file instanceof File)) return NextResponse.json({ ok: false, error: "Fichier manquant." }, { status: 400 });
    if (!isTypeDocument(type)) return NextResponse.json({ ok: false, error: "Type de pièce invalide." }, { status: 400 });
    const err = checkFichier(file);
    if (err) return NextResponse.json({ ok: false, error: err }, { status: 400 });

    const mime = mimeOf(file);
    const buffer = Buffer.from(await file.arrayBuffer());
    const warnings: string[] = [];
    let extraction: string | undefined;

    if (type === "etiquette") {
      try {
        const res = appliquerEtiquette(commande, await lireEtiquette(buffer, mime));
        warnings.push(...res.warnings);
        extraction = res.resume;
      } catch (e) {
        warnings.push(`Étiquette illisible (${e instanceof Error ? e.message : String(e)}) — saisis la livraison à la main.`);
      }
    }

    const doc = await uploadDocument(await createClient(), {
      buffer,
      filename: file.name,
      mime,
      type,
      numero: commande.id,
      uploadedBy: auth.email,
    });
    if (extraction) doc.extraction = extraction;
    commande.documents = [...(commande.documents ?? []), doc];

    await writeCommande(commande);
    return NextResponse.json({ ok: true, data: commande, warnings });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
