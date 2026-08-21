import { redirect } from "next/navigation";

// Fusionné dans Le Livre le 21/08/2026 — une seule destination, plus de kit
// Mood séparé. Contenu déplacé vers app/le-livre/sections/MoodSection.tsx.
export default function MoodKitPageRedirect() {
  redirect("/le-livre?tab=mood");
}
