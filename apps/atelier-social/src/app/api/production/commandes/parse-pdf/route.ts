/**
 * POST /api/production/commandes/parse-pdf
 *
 * Réservé aux administrateurs. Reçoit un FormData avec un fichier PDF (bon
 * de préparation Shopify), l'upload dans le bucket Supabase `commandes-pdf`,
 * puis appelle le pipeline pdf-parse + OpenAI gpt-4o pour renvoyer une
 * commande draft (déjà hydratée + durées calculées) prête à valider par
 * l'admin avant écriture finale via POST /api/production/commandes.
 *
 * La réponse contient aussi `bon_preparation_pdf` (URL publique + storage_path)
 * que l'UI doit inclure dans le payload de création pour conserver le lien
 * vers le PDF original sur la fiche commande.
 */
import { NextResponse } from "next/server";

import { requireRole } from "@/lib/auth-guard";
import { createClient } from "@/lib/supabase/server";
import { parsePdfToCommande } from "@/lib/production/pdf-parser";
import type { BonPreparationPdf } from "@/lib/production/commandes-loader";

const BUCKET = "commandes-pdf";
const MAX_BYTES = 20 * 1024 * 1024; // 20 Mo

function sanitizeFilename(name: string): string {
  const dot = name.lastIndexOf(".");
  const ext = (dot >= 0 ? name.slice(dot + 1) : "pdf").toLowerCase();
  const base =
    (dot >= 0 ? name.slice(0, dot) : name)
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "bon";
  return `${base}.${ext}`;
}

export async function POST(req: Request) {
  // 1. Garde admin
  const auth = await requireRole(["admin"]);
  if (!auth) {
    return NextResponse.json(
      { ok: false, error: "Réservé aux administrateurs." },
      { status: 403 },
    );
  }

  // 2. Lecture du FormData
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json(
      { ok: false, error: "FormData invalide (champ `file` requis)." },
      { status: 400 },
    );
  }
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json(
      { ok: false, error: "Champ `file` manquant ou invalide." },
      { status: 400 },
    );
  }
  if (file.type && file.type !== "application/pdf") {
    return NextResponse.json(
      { ok: false, error: `Type de fichier non supporté (${file.type}). PDF attendu.` },
      { status: 400 },
    );
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { ok: false, error: `Fichier trop volumineux (${(file.size / 1024 / 1024).toFixed(1)} Mo, max 20 Mo).` },
      { status: 400 },
    );
  }

  // 3. Buffer + upload Storage en parallèle du parsing
  const buffer = Buffer.from(await file.arrayBuffer());

  let parsed;
  try {
    parsed = await parsePdfToCommande(buffer);
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error:
          err instanceof Error
            ? `Parsing PDF échoué : ${err.message}`
            : "Parsing PDF échoué (erreur inconnue).",
      },
      { status: 500 },
    );
  }

  // 4. Upload du PDF dans le bucket
  const supabase = await createClient();
  const numeroNet = parsed.commande.id || `tmp-${Date.now()}`;
  const yyyymm = new Date().toISOString().slice(0, 7);
  const storage_path = `${yyyymm}/${numeroNet}-${sanitizeFilename(file.name)}`;

  const { error: upErr } = await supabase.storage
    .from(BUCKET)
    .upload(storage_path, buffer, {
      contentType: "application/pdf",
      upsert: true,
    });
  if (upErr) {
    return NextResponse.json(
      { ok: false, error: `Upload PDF échoué : ${upErr.message}` },
      { status: 500 },
    );
  }
  const { data: pubData } = supabase.storage.from(BUCKET).getPublicUrl(storage_path);

  const bon: BonPreparationPdf = {
    storage_path,
    public_url: pubData.publicUrl,
    filename: file.name,
    uploaded_by: auth.email ?? undefined,
    uploaded_at: new Date().toISOString(),
    size_bytes: file.size,
  };

  // 5. Réponse : draft commande + URL PDF + warnings
  return NextResponse.json({
    ok: true,
    data: {
      commande: { ...parsed.commande, bon_preparation_pdf: bon },
      warnings: parsed.warnings,
      pdf_text_preview: parsed.pdf_text_preview,
    },
  });
}
