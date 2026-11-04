/**
 * POST /api/production/attendus/parse
 *
 * FormData `file` (facture ou bon de livraison fournisseur : PDF, PNG, JPG, WebP).
 * Extrait réf. fournisseur, désignation, coloris, taille, qté, PU HT, total HT,
 * n° de facture, n° de commande, dates, totaux ; rattache chaque ligne à une
 * réf. YPxxx-CCCC-TTTT ; range le document dans le bucket `attendus-pdf` et
 * enregistre directement l'attendu (statut « attendu »). L'atelier corrige
 * ensuite sur la fiche.
 */
import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth-guard";
import { createClient } from "@/lib/supabase/server";
import { parseFacture } from "@/lib/production/facture-parser";
import { writeAttendu } from "@/lib/production/attendus";

const BUCKET = "attendus-pdf";
const MAX_BYTES = 20 * 1024 * 1024;
const MIMES = ["application/pdf", "image/png", "image/jpeg", "image/webp"];

function sanitize(name: string): string {
  const dot = name.lastIndexOf(".");
  const ext = (dot >= 0 ? name.slice(dot + 1) : "pdf").toLowerCase();
  const base = (dot >= 0 ? name.slice(0, dot) : name)
    .toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "facture";
  return `${base}.${ext}`;
}

export async function POST(req: Request) {
  const auth = await requireRole(["admin", "prod"]);
  if (!auth) return NextResponse.json({ ok: false, error: "Accès réservé à l'atelier." }, { status: 403 });

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return NextResponse.json({ ok: false, error: "Champ `file` manquant." }, { status: 400 });
  const mime = file.type || "application/pdf";
  if (!MIMES.includes(mime)) return NextResponse.json({ ok: false, error: `Type non supporté (${mime}). PDF ou image attendu.` }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ ok: false, error: "Fichier trop volumineux (max 20 Mo)." }, { status: 400 });

  const buffer = Buffer.from(await file.arrayBuffer());
  let parsed;
  try {
    parsed = await parseFacture(buffer, mime);
  } catch (e) {
    return NextResponse.json({ ok: false, error: `Lecture du document échouée : ${e instanceof Error ? e.message : e}` }, { status: 500 });
  }
  const { attendu, warnings, engine } = parsed;
  attendu.created_by = auth.email ?? undefined;

  // Document original → bucket (un échec d'upload n'empêche pas l'attendu).
  try {
    const supabase = await createClient();
    const storage_path = `${attendu.id.slice(3, 9)}/${attendu.id}-${sanitize(file.name)}`;
    const { error } = await supabase.storage.from(BUCKET).upload(storage_path, buffer, { contentType: mime, upsert: true });
    if (error) throw error;
    const { data } = supabase.storage.from(BUCKET).getPublicUrl(storage_path);
    attendu.documents = [{ storage_path, public_url: data.publicUrl, filename: file.name, uploaded_at: new Date().toISOString() }];
  } catch (e) {
    warnings.push(`Document non archivé (bucket ${BUCKET}) : ${e instanceof Error ? e.message : String(e)}`);
  }

  try {
    await writeAttendu(attendu);
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
  return NextResponse.json({ ok: true, data: { id: attendu.id, warnings, engine, nb_lignes: attendu.lignes.length } });
}
