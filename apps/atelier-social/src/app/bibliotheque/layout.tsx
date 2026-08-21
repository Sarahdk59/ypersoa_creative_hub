/**
 * /bibliotheque — fusion Médiathèque + bibliothèque des packs sociaux +
 * articles de blog (cf. refonte nav du 20/08/2026,
 * _passations/DESIGN_SYSTEM_hub.md v2). Deux onglets ajoutés le 21/08/2026 :
 * Motifs et Produits (ex-/referentiel/motifs et /referentiel/produits),
 * fusionnés ici à la demande explicite de Sarah ("tout au même endroit") —
 * /referentiel n'existe plus comme section séparée.
 */
import { HubTabNav } from "@/components/HubTabNav";

export default function BibliothequeLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ maxWidth: 1500, margin: "0 auto" }}>
      <HubTabNav
        title="Bibliothèque"
        subtitle="Tout ce que l'atelier a déjà produit."
        tabs={[
          { href: "/bibliotheque/visuels", label: "Visuels" },
          { href: "/bibliotheque/motifs", label: "Motifs" },
          { href: "/bibliotheque/produits", label: "Produits" },
          { href: "/bibliotheque/packs", label: "Packs sociaux" },
          { href: "/bibliotheque/articles", label: "Articles" },
        ]}
      />
      {children}
    </div>
  );
}
