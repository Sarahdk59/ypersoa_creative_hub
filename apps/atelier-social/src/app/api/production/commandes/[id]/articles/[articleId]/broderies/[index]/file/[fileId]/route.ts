/**
 * DELETE /api/production/commandes/[id]/articles/[articleId]/broderies/[index]/file/[fileId]
 *
 * Retire un fichier attaché à une broderie (bucket Storage + tableau `fichiers`).
 */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCommande, writeCommande } from "@/lib/production/commandes-loader";

const BUCKET = "commandes-broderies";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; articleId: string; index: string; fileId: string }> },
) {
  try {
    const { id, articleId, index, fileId } = await params;
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
    const fichier = broderie.fichiers?.find((f) => f.id === fileId);
    if (!fichier) {
      return NextResponse.json({ ok: false, error: "Fichier introuvable" }, { status: 404 });
    }

    const supabase = await createClient();
    const { error: delErr } = await supabase.storage.from(BUCKET).remove([fichier.storage_path]);
    if (delErr) {
      return NextResponse.json({ ok: false, error: `Suppression échouée : ${delErr.message}` }, { status: 500 });
    }

    broderie.fichiers = (broderie.fichiers ?? []).filter((f) => f.id !== fileId);
    writeCommande(commande);

    return NextResponse.json({ ok: true, data: commande });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
