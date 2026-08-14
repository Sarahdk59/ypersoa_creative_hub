import Link from "next/link";

/**
 * Home Hub : écran d'accueil.
 */
export default function HubHomePage() {
  return (
    <div
      style={{
        minHeight: "calc(100vh - var(--topbar-height))",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "var(--space-6)",
        textAlign: "center",
        padding: "var(--space-8)",
        background: "var(--brand-bg)",
        color: "var(--brand-ink)",
      }}
    >
      <p
        style={{
          fontFamily: "var(--font-serif)",
          fontSize: "clamp(2rem, 5vw, 3.5rem)",
          fontWeight: 500,
          maxWidth: "20ch",
          lineHeight: 1.15,
        }}
      >
        Keyvan, c&apos;est vraiment trop le meilleur !
      </p>
      <Link
        href="/social"
        style={{
          fontFamily: "var(--font-sans)",
          fontWeight: 600,
          fontSize: "0.95rem",
          color: "#fff",
          background: "var(--brand-terracotta)",
          borderRadius: "999px",
          padding: "12px 28px",
          textDecoration: "none",
        }}
      >
        Entrer dans le Hub
      </Link>
    </div>
  );
}
