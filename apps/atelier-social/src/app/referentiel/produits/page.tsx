import { redirect } from "next/navigation";

/** Déplacé vers /bibliotheque/produits le 21/08/2026 (fusion référentiel produits → Bibliothèque). */
export default function ReferentielProduitsRedirect() {
  redirect("/bibliotheque/produits");
}
