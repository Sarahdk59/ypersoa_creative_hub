/**
 * Intégration Atelier Lookbook — option A (iframe).
 *
 * Justification (cf. _passations/SESSION_30-04-shell-hub.md) :
 * toutes les deps lookbook sont déjà dans social, mais merger les 14 fichiers
 * + résoudre les conflits de noms (lib/canoniques.ts, lib/supabase.ts qui
 * divergent légèrement) demande une session dédiée. L'iframe boucle la
 * V1 du shell sans risque ; le merge progressif (option B) reste possible
 * plus tard sur une branche dédiée.
 *
 * Pré-requis : apps/atelier-lookbook doit tourner en parallèle sur le port
 * 3003 (pnpm --filter @ypersoa/atelier-lookbook dev). Si pas lancé,
 * l'iframe affiche son propre fallback navigateur.
 */
const LOOKBOOK_URL = process.env.NEXT_PUBLIC_LOOKBOOK_URL || "http://localhost:3003";

export default function LookbookPage() {
  return (
    <div
      style={{
        margin: "calc(var(--content-padding) * -1)",
        height: "calc(100vh - var(--topbar-height))",
        background: "var(--hub-bg)",
      }}
    >
      <iframe
        src={LOOKBOOK_URL}
        title="Atelier Lookbook"
        style={{
          width: "100%",
          height: "100%",
          border: 0,
          display: "block",
        }}
        loading="eager"
      />
    </div>
  );
}
