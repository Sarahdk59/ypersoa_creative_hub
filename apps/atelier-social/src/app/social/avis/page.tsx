import { redirect } from "next/navigation";

/** Fusionné dans l'Atelier Social unifié (mode "Avis") — cf. src/components/social/workspaces/AvisWorkspace.tsx. */
export default function SocialAvisRedirect() {
  redirect("/social?mode=avis");
}
