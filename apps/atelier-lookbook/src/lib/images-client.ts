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
  storagePath: string | null
): Promise<void> {
  if (!supabase) throw new Error("Supabase non configuré");
  const { error } = await supabase.from("lookbook_images").delete().eq("id", imageId);
  if (error) throw new Error(`Delete image échoué : ${error.message}`);
  if (storagePath) {
    await supabase.storage.from(BUCKET).remove([storagePath]);
  }
}
