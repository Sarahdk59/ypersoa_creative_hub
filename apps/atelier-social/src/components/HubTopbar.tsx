/**
 * HubTopbar — chrome supérieure invariable du Hub.
 *
 * Ne porte AUCUNE couleur d'app (cf. _passations/DESIGN_SYSTEM_hub.md).
 * Hauteur 56px, fond cream, bordure bottom 0.5px ink.
 */
"use client";

export function HubTopbar() {
  return (
    <header
      className="flex items-center justify-between px-6"
      style={{
        height: "var(--topbar-height)",
        background: "var(--hub-bg)",
        borderBottom: "0.5px solid var(--hub-border)",
        color: "var(--hub-foreground)",
      }}
    >
      {/* Logo Y rond + wordmark */}
      <div className="flex items-center gap-3">
        <div
          className="flex items-center justify-center rounded-full"
          style={{
            width: 28,
            height: 28,
            background: "var(--hub-foreground)",
            color: "var(--hub-bg)",
            fontFamily: "var(--font-serif)",
            fontSize: 13,
            fontWeight: 500,
            letterSpacing: "0.04em",
          }}
        >
          Y
        </div>
        <span
          style={{
            fontFamily: "var(--font-serif)",
            fontSize: 13,
            fontWeight: 500,
            letterSpacing: "0.08em",
          }}
        >
          YPERSOA HUB
        </span>
      </div>

      {/* Section droite : placeholders search + profile */}
      <div
        className="flex items-center gap-4"
        style={{
          fontFamily: "var(--font-sans)",
          fontSize: 12,
          opacity: 0.5,
        }}
      >
        <span>search</span>
        <span>profile</span>
      </div>
    </header>
  );
}
