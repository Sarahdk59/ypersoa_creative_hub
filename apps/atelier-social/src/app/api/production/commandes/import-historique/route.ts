/**
 * POST /api/production/commandes/import-historique
 *   FormData : `file` (bon de commande PDF / image) + `mois` (YYYY-MM)
 *
 * Rattrapage d'historique : lit UN bon de commande, crée la commande et
 * l'archive directement sur le mois indiqué — sans DST / broderie / CQ /
 * expédition, sans planning. Le client envoie les fichiers un par un.
 *
 * Une commande déjà en base n'est jamais écrasée (réponse `statut: "existante"`).
 * Admin + atelier.
 */
import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth-guard";
import { createClient } from "@/lib/supabase/server";
import { parseDocumentToCommande } from "@/lib/production/pdf-parser";
import { checkFichier, mimeOf, uploadDocument } from "@/lib/production/dossier";
import {
  getCommande,
  getDureesRef,
  getFichesTechniques,
  recalculerDureesCommande,
  writeCommande,
} from "@/lib/production/commandes-loader";
import { finDeMois, moisHistoriqueValide } from "@/lib/production/historique";

export const maxDuration = 120;

export async function POST(req: Request) {
  const auth = await requireRole(["admin", "prod"]);
  if (!auth) return NextResponse.json({ ok: false, error: "Réservé à l'admin et à l'atelier." }, { status: 403 });

  try {
    const form = await req.formData();
    const file = form.get("file");
    const mois = form.get("mois");
    if (!(file instanceof File)) return NextResponse.json({ ok: false, error: "Fichier manquant." }, { status: 400 });
    if (!moisHistoriqueValide(mois)) {
      return NextResponse.json({ ok: false, error: "Mois invalide (AAAA-MM, pas dans le futur)." }, { status: 400 });
    }
    const err = checkFichier(file, "bon_commande");
    if (err) return NextResponse.json({ ok: false, error: err }, { status: 400 });

    const mime = mimeOf(file);
    const buffer = Buffer.from(await file.arrayBuffer());
    const parsed = await parseDocumentToCommande(buffer, mime);
    const commande = parsed.commande;
    if (!commande.id) {
      return NextResponse.json({ ok: false, error: "Numéro de commande illisible sur ce bon." }, { status: 422 });
    }

    const existante = await getCommande(commande.id);
    if (existante) {
      return NextResponse.json({
        ok: true,
        data: { statut: "existante", id: existante.id, numero: existante.numero_shopify, client: existante.expedition?.nom ?? "" },
      });
    }

    const doc = await uploadDocument(await createClient(), {
      buffer,
      filename: file.name,
      mime,
      type: "bon_commande",
      numero: commande.id,
      uploadedBy: auth.email,
    });
    doc.extraction = `articles : ${commande.articles.length}`;
    commande.documents = [doc];
    if (mime === "application/pdf") {
      commande.bon_preparation_pdf = {
        storage_path: doc.storage_path,
        public_url: doc.public_url,
        filename: doc.filename,
        uploaded_by: doc.uploaded_by,
        uploaded_at: doc.uploaded_at,
        size_bytes: doc.size_bytes,
      };
    }

    // Date de commande hors du mois choisi : on la garde (elle vient du bon), on signale juste.
    const warnings = parsed.warnings.filter((w) => w.level !== "info").map((w) => w.message);
    if (commande.date_commande && !commande.date_commande.startsWith(mois)) {
      warnings.push(`Bon daté du ${commande.date_commande}, archivé sur ${mois}.`);
    }

    commande.statut = "archivee";
    commande.planning = null;
    commande.journal = {
      archivee_le: finDeMois(mois),
      historique: { mois, par: auth.email ?? undefined, le: new Date().toISOString() },
    };

    recalculerDureesCommande(commande, getDureesRef(), getFichesTechniques());
    await writeCommande(commande);

    return NextResponse.json({
      ok: true,
      data: {
        statut: "creee",
        id: commande.id,
        numero: commande.numero_shopify,
        client: commande.expedition?.nom ?? "",
        nb_articles: commande.articles.length,
        warnings,
      },
    });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
