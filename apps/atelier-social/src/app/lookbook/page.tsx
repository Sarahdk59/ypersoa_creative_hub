import { redirect } from "next/navigation";

/** Déplacé vers /studio/lookbook le 20/08/2026 (fusion Studio). */
export default function LookbookRedirect() {
  redirect("/studio/lookbook");
}
