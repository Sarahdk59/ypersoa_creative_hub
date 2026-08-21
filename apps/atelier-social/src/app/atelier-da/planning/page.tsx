import { redirect } from "next/navigation";

/** Déplacé vers /planning/retroplanning le 20/08/2026 (fusion Planning). */
export default function AtelierDaPlanningRedirect() {
  redirect("/planning/retroplanning");
}
