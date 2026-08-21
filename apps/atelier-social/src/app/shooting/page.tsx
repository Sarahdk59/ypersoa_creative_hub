import { redirect } from "next/navigation";

/** Déplacé vers /studio/shooting le 20/08/2026 (fusion Studio). */
export default function ShootingRedirect() {
  redirect("/studio/shooting");
}
