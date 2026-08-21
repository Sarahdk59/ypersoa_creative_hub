import { redirect } from "next/navigation";

/** Déplacé vers /bibliotheque/motifs le 21/08/2026 (fusion référentiel motifs → Bibliothèque, "tout au même endroit"). */
export default function ReferentielMotifsRedirect() {
  redirect("/bibliotheque/motifs");
}
