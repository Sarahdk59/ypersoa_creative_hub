import { redirect } from "next/navigation";

// Fusionné dans Le Livre le 21/08/2026 — une seule destination, plus de
// Brand Book séparé. Contenu déplacé vers app/le-livre/sections/VisuelSection.tsx.
export default function BrandPageRedirect() {
  redirect("/le-livre?tab=visuel");
}
