import { redirect } from "next/navigation";

/** Déplacé vers /blog le 20/08/2026 — Blog est passé atelier de premier niveau. */
export default function AtelierDaBlogRedirect() {
  redirect("/blog");
}
