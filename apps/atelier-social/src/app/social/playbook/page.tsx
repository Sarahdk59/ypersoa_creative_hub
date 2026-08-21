import { redirect } from "next/navigation";

// Fusionné dans Le Livre le 21/08/2026 — une seule destination, plus de
// Playbook séparé. Contenu déplacé vers app/le-livre/sections/PlaybookSection.tsx.
export default function PlaybookPageRedirect() {
  redirect("/le-livre?tab=playbook");
}
