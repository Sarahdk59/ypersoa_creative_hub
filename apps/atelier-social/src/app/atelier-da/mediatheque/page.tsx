import { redirect } from "next/navigation";

/** Déplacé vers /bibliotheque/visuels le 20/08/2026 (fusion Bibliothèque). */
export default function MediathequeRedirect() {
  redirect("/bibliotheque/visuels");
}
