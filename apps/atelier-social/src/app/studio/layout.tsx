/**
 * /studio — fusion Atelier Shooting + Atelier Lookbook + Shooting Book +
 * Studio Mood (cf. refonte nav du 20/08/2026, _passations/DESIGN_SYSTEM_hub.md
 * v2). Toute la génération visuelle de l'atelier, réunie sous un seul atelier
 * à onglets. Pas de wrapper maxWidth ici : Shooting/Lookbook (iframes) veulent
 * la pleine largeur/hauteur.
 */
import { HubTabNav } from "@/components/HubTabNav";

export default function StudioLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        height: "calc(100vh - var(--topbar-height))",
        margin: "calc(var(--content-padding) * -1)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <div style={{ flex: "0 0 auto" }}>
        <HubTabNav
          title="Studio"
          compact
          tabs={[
            {
              href: "/studio/shooting",
              label: "Shooting",
              description: "Exécuter le packshot — génération produit fiable, verrouillage packshot et broderie.",
            },
            {
              href: "/studio/lookbook",
              label: "Lookbook",
              description: "Explorer une ambiance — brief poétique court → 12-20 visuels de moodboard.",
            },
            {
              href: "/studio/shooting-book",
              label: "Shooting Book",
              description: "Planifier & raconter — brief poétique → plan de shooting, angles narratifs, storyboard.",
            },
            {
              href: "/studio/studio-mood",
              label: "Studio Mood",
              description: "Préparer un épisode Reels/TikTok — humeur, mot brodé, storyboard, copy brand-safe.",
            },
          ]}
        />
      </div>
      {/* overflowY: auto — Shooting Book et Studio Mood sont des pages
          normales plus hautes que le viewport, pas des iframes exact-fit :
          sans ça leur bas (dont le bouton Générer) reste inaccessible. */}
      <div style={{ flex: 1, minHeight: 0, overflowY: "auto" }}>{children}</div>
    </div>
  );
}
