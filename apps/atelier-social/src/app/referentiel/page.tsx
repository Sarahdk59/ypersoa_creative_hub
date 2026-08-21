import { redirect } from "next/navigation";

/** Motifs et Produits ont tous les deux fusionné dans la Bibliothèque le 21/08/2026 ("tout au même endroit"). */
export default function ReferentielIndex() {
  redirect("/bibliotheque/produits");
}
