/**
 * Stub temporaire — sera remplacé en étape 5 par soit un iframe vers
 * localhost:3003 (option A), soit le merge des routes lookbook
 * directement dans ce shell (option B). Décision attendue de Sarah.
 */
export default function LookbookStubPage() {
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
          Atelier Lookbook
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
          Intégration en cours — étape 5 de la session shell.
        </p>
      </div>
    </div>
  );
}
