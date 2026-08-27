/**
 * POST /api/production/commandes/[id]/articles/[articleId]/broderies/[index]/file
 *
 * Attache un fichier à une broderie précise : visuel attendu (png/jpg),
 * fichier machine (pxf/dst), ou PDF (sortie du moteur d'attribution, ou
 * capture d'une demande client). FormData : { file, kind }.
 * kind ∈ "visuel" | "pxf" | "dst" | "pdf" — l'extension du fichier doit
 * correspondre (visuel accepte png/jpg/jpeg).
 *
 * Repère la broderie par index dans `article.broderies` plutôt que par un id
 * dédié : les commandes existantes n'ont pas d'id de broderie, et l'ordre
 * n'est jamais modifié par l'UI.
 */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCommande, writeCommande, type BroderieFileKind } from "@/lib/production/commandes-loader";

const BUCKET = "commandes-broderies";
const MAX_BYTES = 20 * 1024 * 1024; // 20 Mo

const KIND_EXT: Record<BroderieFileKind, string[]> = {
  visuel: ["png", "jpg", "jpeg"],
  pxf: ["pxf"],
  dst: ["dst"],
  pdf: ["pdf"],
};

function sanitizeFilename(name: string): string {
  const dot = name.lastIndexOf(".");
  const ext = (dot >= 0 ? name.slice(dot + 1) : "").toLowerCase();
  const base =
    (dot >= 0 ? name.slice(0, dot) : name)
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "fichier";
  return ext ? `${base}.${ext}` : base;
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string; articleId: string; index: string }> },
) {
  try {
    const { id, articleId, index } = await params;
    const idx = Number(index);
    const commande = getCommande(id);
    if (!commande) {
      return NextResponse.json({ ok: false, error: "Commande introuvable" }, { status: 404 });
    }
    const article = commande.articles.find((a) => a.id === articleId);
    if (!article) {
      return NextResponse.json({ ok: false, error: "Article introuvable" }, { status: 404 });
    }
    const broderie = article.broderies[idx];
    if (!broderie) {
      return NextResponse.json({ ok: false, error: "Broderie introuvable" }, { status: 404 });
    }

    let form: FormData;
    try {
      form = await req.formData();
    } catch {
      return NextResponse.json({ ok: false, error: "FormData invalide" }, { status: 400 });
    }
    const file = form.get("file");
    const kind = form.get("kind");
    if (!(file instanceof File)) {
      return NextResponse.json({ ok: false, error: "Champ `file` manquant ou invalide" }, { status: 400 });
    }
    if (typeof kind !== "string" || !(kind in KIND_EXT)) {
      return NextResponse.json({ ok: false, error: "`kind` doit être visuel, pxf, dst ou pdf" }, { status: 400 });
    }
    const filenameLower = file.name.toLowerCase();
    const validExt = KIND_EXT[kind as BroderieFileKind].some((ext) => filenameLower.endsWith(`.${ext}`));
    if (!validExt) {
      return NextResponse.json(
        { ok: false, error: `Extension invalide pour "${kind}" — attendu : ${KIND_EXT[kind as BroderieFileKind].join(", ")}` },
        { status: 400 },
      );
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { ok: false, error: `Fichier trop volumineux (${(file.size / 1024 / 1024).toFixed(1)} Mo, max 20 Mo)` },
        { status: 400 },
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const fileId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const storage_path = `${commande.id}/${articleId}-${idx}-${kind}-${fileId}-${sanitizeFilename(file.name)}`;

    const supabase = await createClient();
    const { error: upErr } = await supabase.storage
      .from(BUCKET)
      .upload(storage_path, buffer, { contentType: file.type || undefined, upsert: true });
    if (upErr) {
      return NextResponse.json({ ok: false, error: `Upload échoué : ${upErr.message}` }, { status: 500 });
    }
    const { data: pubData } = supabase.storage.from(BUCKET).getPublicUrl(storage_path);

    broderie.fichiers = [
      ...(broderie.fichiers ?? []),
      {
        id: fileId,
        kind: kind as BroderieFileKind,
        storage_path,
        public_url: pubData.publicUrl,
        filename: file.name,
        uploaded_at: new Date().toISOString(),
      },
    ];
    writeCommande(commande);

    return NextResponse.json({ ok: true, data: commande });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
