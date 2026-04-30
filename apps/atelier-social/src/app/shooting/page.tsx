/**
 * Intégration Atelier Shooting — option A (iframe), même pattern que lookbook.
 *
 * Atelier-shooting est un projet Vite standalone (port 3001). Le shell le
 * consomme via iframe. Le merge dans la stack Next.js sera fait en session
 * dédiée plus tard si besoin de partage d'état.
 *
 * Pré-requis runtime : `pnpm --filter @ypersoa/atelier-shooting dev` doit
 * tourner en parallèle sur le port 3001.
 */
const SHOOTING_URL = process.env.NEXT_PUBLIC_SHOOTING_URL || "http://localhost:3001";

export default function ShootingPage() {
  return (
    <div
      style={{
        margin: "calc(var(--content-padding) * -1)",
        height: "calc(100vh - var(--topbar-height))",
        background: "var(--hub-bg)",
      }}
    >
      <iframe
        src={SHOOTING_URL}
        title="Atelier Shooting"
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
