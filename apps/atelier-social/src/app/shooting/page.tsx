/**
 * Placeholder Atelier Shooting — l'app vit pour l'instant en standalone
 * (apps/atelier-shooting, Vite). L'intégration shell est prévue prochaine
 * session. Tooltip sur la sidebar : "À venir, prochaine session".
 */
export default function ShootingPlaceholderPage() {
  return (
    <div
      className="flex items-center justify-center"
      style={{ minHeight: "calc(100vh - var(--topbar-height) - var(--content-padding) * 2)" }}
    >
      <div className="text-center" style={{ maxWidth: 480 }}>
        <h1
          style={{
            fontFamily: "var(--font-editorial)",
            fontSize: 32,
            fontWeight: 500,
            letterSpacing: "-0.01em",
            color: "var(--hub-foreground)",
            marginBottom: 12,
          }}
        >
          Atelier Shooting
        </h1>
        <p
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 14,
            color: "var(--hub-foreground)",
            opacity: 0.6,
            lineHeight: 1.6,
          }}
        >
          Disponible prochainement.
        </p>
      </div>
    </div>
  );
}
