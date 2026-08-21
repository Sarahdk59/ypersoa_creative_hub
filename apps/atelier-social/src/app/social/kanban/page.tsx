import { redirect } from "next/navigation";

/** Déplacé vers /planning/semaine le 20/08/2026 (fusion Planning). */
export default function SocialKanbanRedirect() {
  redirect("/planning/semaine");
}
