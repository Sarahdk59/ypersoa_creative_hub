import { redirect } from "next/navigation";

/**
 * Fusionné dans l'Atelier Social unifié — cf. src/components/social/workspaces/HistoireWorkspace.tsx
 * (légende/visuel/carrousel) et src/components/social/workspaces/ReelWorkspace.tsx (ex-onglet Reels).
 */
export default function SocialConnexionRedirect() {
  redirect("/social?mode=histoire");
}
