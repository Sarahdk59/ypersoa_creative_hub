/**
 * /planning — le Tempo est le cockpit hebdomadaire. Le fil de l'année garde
 * provisoirement le Gantt historique pendant sa migration vers Supabase.
 */
import { HubTabNav } from "@/components/HubTabNav";

export default function PlanningLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ maxWidth: 1600, margin: "0 auto" }}>
      <HubTabNav
        title="Planning"
        subtitle="Un seul fil pour la créa, la prod et la comm."
        tabs={[
          { href: "/planning", label: "Le tempo" },
          { href: "/planning/annee", label: "Le fil de l'année" },
        ]}
      />
      {children}
    </div>
  );
}
