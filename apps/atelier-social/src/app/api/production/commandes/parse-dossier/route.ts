/**
 * POST /api/production/commandes/parse-dossier
 *
 * FormData : `files` (plusieurs) + `types` (même ordre : bon_commande | devis |
 * bat | bon_livraison | etiquette | autre).
 *
 * 1. Lit le bon de commande (sinon le devis) → articles, adresses, contact
 * 2. Lit chaque étiquette d'expédition → transporteur, mode, locker, suivi
 * 3. Range toutes les pièces dans le bucket `commandes-pdf`
 * Renvoie une commande draft (non enregistrée) à relire avant création via
 * POST /api/production/commandes. Admin + atelier.
 */
import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth-guard";
import { createClient } from "@/lib/supabase/server";
import { parseDocumentToCommande } from "@/lib/production/pdf-parser";
import {
  appliquerEtiquette,
  checkFichier,
  isTypeDocument,
  lireEtiquette,
  mimeOf,
  uploadDocument,
} from "@/lib/production/dossier";
import type { DocumentCommande, TypeDocument } from "@/lib/production/commandes-loader";

export const maxDuration = 120;

interface Piece {
  file: File;
  type: TypeDocument;
  mime: string;
  buffer: Buffer;
}

export async function POST(req: Request) {
  const auth = await requireRole(["admin", "prod"]);
  if (!auth) return NextResponse.json({ ok: false, error: "Réservé à l'admin et à l'atelier." }, { status: 403 });

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ ok: false, error: "FormData invalide." }, { status: 400 });
  }
  const files = form.getAll("files").filter((f): f is File => f instanceof File);
  const types = form.getAll("types").map(String);
  if (!files.length) return NextResponse.json({ ok: false, error: "Aucun fichier reçu." }, { status: 400 });
  if (types.length !== files.length || !types.every(isTypeDocument)) {
    return NextResponse.json({ ok: false, error: "Chaque fichier doit avoir un type de pièce." }, { status: 400 });
  }
  for (const [i, f] of files.entries()) {
    const err = checkFichier(f, types[i] as TypeDocument);
    if (err) return NextResponse.json({ ok: false, error: err }, { status: 400 });
  }

  const pieces: Piece[] = await Promise.all(
    files.map(async (file, i) => ({
      file,
      type: types[i] as TypeDocument,
      mime: mimeOf(file),
      buffer: Buffer.from(await file.arrayBuffer()),
    })),
  );

  // 1. Pièce source des articles : bon de commande, sinon devis.
  const source = pieces.find((p) => p.type === "bon_commande") ?? pieces.find((p) => p.type === "devis");
  if (!source) {
    return NextResponse.json(
      { ok: false, error: "Il faut au moins un bon de commande ou un devis pour créer la commande." },
      { status: 400 },
    );
  }

  let parsed;
  try {
    parsed = await parseDocumentToCommande(source.buffer, source.mime);
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: `Lecture de « ${source.file.name} » échouée : ${err instanceof Error ? err.message : String(err)}` },
      { status: 500 },
    );
  }
  const commande = parsed.commande;
  const warnings = [...parsed.warnings];
  if (source.type === "devis") {
    warnings.push({ level: "info", message: "Commande construite depuis le devis (aucun bon de commande dans le dossier)." });
  }
  const autresSources = pieces.filter((p) => (p.type === "bon_commande" || p.type === "devis") && p !== source);
  if (autresSources.length) {
    warnings.push({
      level: "info",
      message: `${autresSources.map((p) => `« ${p.file.name} »`).join(", ")} joint(s) sans être relu(s) : seule « ${source.file.name} » sert à construire les articles — compare si besoin.`,
    });
  }

  // 2. Étiquettes → livraison.
  const extractions = new Map<Piece, string>();
  extractions.set(source, `articles : ${commande.articles.length}`);
  for (const p of pieces.filter((x) => x.type === "etiquette")) {
    try {
      const lue = await lireEtiquette(p.buffer, p.mime);
      const { warnings: w, resume } = appliquerEtiquette(commande, lue);
      w.forEach((message) => warnings.push({ level: "warning", message }));
      extractions.set(p, resume);
    } catch (err) {
      warnings.push({
        level: "warning",
        message: `Étiquette « ${p.file.name} » illisible (${err instanceof Error ? err.message : String(err)}) — saisis transporteur et locker à la main.`,
      });
    }
  }

  // 3. Stockage de toutes les pièces.
  const supabase = await createClient();
  const numero = commande.id || `tmp-${Date.now()}`;
  const documents: DocumentCommande[] = [];
  try {
    for (const p of pieces) {
      const doc = await uploadDocument(supabase, {
        buffer: p.buffer,
        filename: p.file.name,
        mime: p.mime,
        type: p.type,
        numero,
        uploadedBy: auth.email,
      });
      const ex = extractions.get(p);
      if (ex) doc.extraction = ex;
      documents.push(doc);
    }
  } catch (err) {
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
  commande.documents = documents;

  // Compat : le bon source reste aussi exposé comme « bon de préparation » s'il est en PDF.
  const docSource = documents[pieces.indexOf(source)];
  if (docSource.mime === "application/pdf") {
    commande.bon_preparation_pdf = {
      storage_path: docSource.storage_path,
      public_url: docSource.public_url,
      filename: docSource.filename,
      uploaded_by: docSource.uploaded_by,
      uploaded_at: docSource.uploaded_at,
      size_bytes: docSource.size_bytes,
    };
  }

  return NextResponse.json({
    ok: true,
    data: { commande, warnings, parse_engine: parsed.parse_engine },
  });
}
