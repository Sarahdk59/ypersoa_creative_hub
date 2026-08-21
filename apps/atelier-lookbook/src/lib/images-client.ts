import { supabase } from "./supabase";

const BUCKET = "lookbook-images";

export async function setImageValide(imageId: string, valide: boolean): Promise<void> {
  if (!supabase) throw new Error("Supabase non configuré");
  const { error } = await supabase
    .from("lookbook_images")
    .update({ valide })
    .eq("id", imageId);
  if (error) throw new Error(`Update valide échoué : ${error.message}`);
}

export async function deleteLookbookImage(
  imageId: string,
  storagePath: string | null,
  publicUrl: string | null,
): Promise<void> {
  if (!supabase) throw new Error("Supabase non configuré");
  // La médiathèque ne doit jamais garder une vignette orpheline d'un visuel
  // retiré du lookbook.
  if (publicUrl) {
    const { error: mediaError } = await supabase
      .from("mediatheque_media")
      .delete()
      .eq("public_url", publicUrl);
    if (mediaError) throw new Error(`Suppression médiathèque échouée : ${mediaError.message}`);
  }
  const { error } = await supabase.from("lookbook_images").delete().eq("id", imageId);
  if (error) throw new Error(`Delete image échoué : ${error.message}`);
  if (storagePath) {
    await supabase.storage.from(BUCKET).remove([storagePath]);
  }
}
