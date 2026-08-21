import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import type { AmbianceExtraite, ImageFamille } from "@/lib/types";

const LOOKBOOK_BUCKET = "lookbook-images";

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

interface DraftImage {
  id: string;
  position: number;
  famille: ImageFamille;
  canonique_injecte: string | null;
  prompt_en: string;
  image_url: string;
  image_storage_path: string;
}

interface SaveBody {
  brief: string;
  titre: string;
  slug: string;
  tags: string[];
  ambiance_extraite: AmbianceExtraite | null;
  canoniques_inclus: string[];
  llm_model_used: string;
  images: DraftImage[];
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as SaveBody;
    if (!body.brief || !body.titre || !body.slug || !Array.isArray(body.images) || body.images.length === 0) {
      return NextResponse.json({ ok: false, message: "Lookbook ou sélection invalide." }, { status: 400 });
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !anon) return NextResponse.json({ ok: false, message: "Supabase non configuré." }, { status: 500 });
    const supabase = createClient(url, anon);
    const lookbookId = crypto.randomUUID();
    const slug = `${body.slug}-${lookbookId.slice(0, 4)}`;

    const { error: lookbookError } = await supabase.from("lookbooks").insert({
      id: lookbookId,
      brief_original: body.brief,
      titre: body.titre,
      slug,
      tags: body.tags,
      canoniques_inclus: body.canoniques_inclus,
      ambiance_extraite: body.ambiance_extraite,
      llm_model_used: body.llm_model_used,
    });
    if (lookbookError) throw new Error(`Sauvegarde lookbook échouée : ${lookbookError.message}`);

    try {
      const saved = await Promise.all(body.images.map(async (image, index) => {
        if (!image.image_url || !image.image_storage_path) throw new Error(`Image ${index + 1} invalide.`);
        const { data, error } = await supabase.from("lookbook_images").insert({
          lookbook_id: lookbookId,
          position: image.position,
          famille: image.famille,
          canonique_injecte: image.canonique_injecte,
          prompt_en: image.prompt_en,
          image_url: image.image_url,
          image_storage_path: image.image_storage_path,
          valide: true,
        }).select("id").single();
        if (error) throw new Error(`Sauvegarde image ${index + 1} échouée : ${error.message}`);
        return { id: data.id as string, path: image.image_storage_path, publicUrl: image.image_url, image };
      }));

      const { data: media, error: mediaError } = await supabase.from("mediatheque_media").insert(saved.map(({ path, publicUrl, image }) => ({
        filename: `${body.titre} — ${image.famille} ${image.position}.jpg`,
        storage_path: path,
        public_url: publicUrl,
        source: "shooting_lifestyle",
        statut: "a_valider",
        notes: `Lookbook — ${body.titre} · ${body.tags.join(", ")}`,
      }))).select("id");
      if (mediaError) throw new Error(`Ajout médiathèque échoué : ${mediaError.message}`);

      // Les mots du brief (Noël, mariage, été…) alimentent immédiatement les
      // portes d'entrée de la Bibliothèque, en particulier Occasion.
      const context = normalize([body.titre, body.brief, ...body.tags].join(" "));
      const { data: tags, error: tagsError } = await supabase
        .from("mediatheque_tags")
        .select("id,slug,category")
        .in("category", ["occasion", "saison", "ambiance"]);
      if (tagsError) throw new Error(`Lecture tags médiathèque échouée : ${tagsError.message}`);
      const tagIds = (tags ?? [])
        .filter((tag) => context.includes(normalize(tag.slug)))
        .map((tag) => tag.id as string);
      if (tagIds.length > 0 && (media ?? []).length > 0) {
        const { error: linkError } = await supabase.from("mediatheque_media_tags").insert(
          (media ?? []).flatMap((item) => tagIds.map((tag_id) => ({ media_id: item.id as string, tag_id }))),
        );
        if (linkError) throw new Error(`Attribution tags médiathèque échouée : ${linkError.message}`);
      }

      return NextResponse.json({ ok: true, data: { lookbook_id: lookbookId, saved: saved.length } }, { status: 201 });
    } catch (error) {
      await supabase.from("lookbooks").delete().eq("id", lookbookId);
      throw error;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
