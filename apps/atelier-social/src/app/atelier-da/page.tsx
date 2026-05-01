/**
 * Home Atelier-DA — 8 sous-modules accessibles depuis le hub.
 * V0 : seul le sous-module 1 (Shooting Book) est fonctionnel. Les 7 autres
 * sont des stubs accessibles avec note "À venir V1".
 *
 * Cf. _passations/IDEES_FUTURES/SPEC_atelier_DA.md.
 */
import Link from "next/link";
import { Users, Camera, Palette, Sparkles, Settings, Image as ImageIcon, BookOpen, Archive, ArrowRight } from "lucide-react";

interface SubmoduleCard {
  id: number;
  title: string;
  description: string;
  href: string | null;
  icon: React.ReactNode;
  status: "v0" | "v1" | "v2";
}

const SUBMODULES: SubmoduleCard[] = [
  {
    id: 1,
    title: "Casting / Mur des canoniques",
    description: "Moteur narratif intelligent. Recherche par occasion, date, mood. 23 canoniques + 3 lignées familiales.",
    href: null,
    icon: <Users size={22} strokeWidth={1.4} />,
    status: "v1",
  },
  {
    id: 2,
    title: "Shooting Book",
    description: "Brief poétique → plan de shooting structuré (casting + ambiances + shotlist + hooks temporels). Exploitable par atelier-shooting Gemini.",
    href: "/atelier-da/shooting-book",
    icon: <Camera size={22} strokeWidth={1.4} />,
    status: "v0",
  },
  {
    id: 3,
    title: "Référentiel motifs YPM",
    description: "Vue catalogue des 17 motifs Ypersoa (La Brigitte, L'Ambre, Le Club…) avec assets, statuts, shots associés.",
    href: null,
    icon: <Palette size={22} strokeWidth={1.4} />,
    status: "v1",
  },
  {
    id: 4,
    title: "Création motifs YPM & variantes",
    description: "Outil de création nouveaux motifs selon template + variantes des motifs existants.",
    href: null,
    icon: <Sparkles size={22} strokeWidth={1.4} />,
    status: "v2",
  },
  {
    id: 5,
    title: "Règles & contraintes broderies",
    description: "Documentation production Tajima : tailles, couleurs, exclusions par produit, formats DST.",
    href: null,
    icon: <Settings size={22} strokeWidth={1.4} />,
    status: "v2",
  },
  {
    id: 6,
    title: "Référentiel d'ambiances",
    description: "Vue catalogue des ambiances (5 préfaites + lookbooks ❤️ actifs). Drag & drop dans un brief.",
    href: null,
    icon: <ImageIcon size={22} strokeWidth={1.4} />,
    status: "v1",
  },
  {
    id: 7,
    title: "Bible de marque visuelle",
    description: "Palette officielle, typos (Cormorant, DM Sans, Josefin), red lines vocabulaires, références muses (Sézane × A.P.C.).",
    href: null,
    icon: <BookOpen size={22} strokeWidth={1.4} />,
    status: "v2",
  },
  {
    id: 8,
    title: "Décisions DA archivées",
    description: "Trace des grandes décisions DA (29/04 Camille→Clémence, 01/05 refonte 3 lignées). Histoire éditoriale Ypersoa.",
    href: null,
    icon: <Archive size={22} strokeWidth={1.4} />,
    status: "v2",
  },
];

export default function AtelierDaHome() {
  return (
    <div style={{ maxWidth: 1200, margin: "0 auto" }}>
      {/* Header de l'app DA */}
      <header style={{ marginBottom: 48 }}>
        <h1
          style={{
            fontFamily: "var(--font-editorial)",
            fontSize: 40,
            fontWeight: 500,
            letterSpacing: "-0.015em",
            color: "var(--hub-foreground)",
            lineHeight: 1.05,
            margin: 0,
            marginBottom: 12,
          }}
        >
          Atelier DA
        </h1>
        <p
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 14,
            color: "var(--hub-foreground)",
            opacity: 0.65,
            maxWidth: 640,
            lineHeight: 1.6,
          }}
        >
          L&apos;espace de travail du Directeur Artistique. 8 sous-modules pour penser, décider et orienter
          la direction artistique d&apos;Ypersoa, depuis la mémoire vivante du casting jusqu&apos;au plan de shooting.
        </p>
      </header>

      {/* Grille des 8 sous-modules */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
          gap: 16,
        }}
      >
        {SUBMODULES.map((m) => {
          const card = (
            <article
              style={{
                position: "relative",
                background: "white",
                border: "0.5px solid var(--hub-border)",
                borderRadius: 12,
                padding: 24,
                height: "100%",
                display: "flex",
                flexDirection: "column",
                transition: "transform 200ms ease, border-color 200ms ease, box-shadow 200ms ease",
                cursor: m.href ? "pointer" : "default",
                opacity: m.href ? 1 : 0.65,
              }}
              className={m.href ? "atelier-da-card-active" : "atelier-da-card-stub"}
            >
              {/* Numéro discret */}
              <span
                style={{
                  position: "absolute",
                  top: 16,
                  right: 16,
                  fontFamily: "var(--font-sans)",
                  fontSize: 11,
                  letterSpacing: "0.1em",
                  color: "var(--hub-foreground)",
                  opacity: 0.35,
                  textTransform: "uppercase",
                }}
              >
                {String(m.id).padStart(2, "0")}
              </span>

              {/* Status */}
              <span
                style={{
                  position: "absolute",
                  top: 16,
                  left: 16,
                  fontFamily: "var(--font-sans)",
                  fontSize: 9,
                  fontWeight: 600,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  padding: "3px 8px",
                  borderRadius: 999,
                  background: m.status === "v0" ? "#1E2D4A" : "transparent",
                  color: m.status === "v0" ? "#FAF7F2" : "var(--hub-foreground)",
                  border: m.status !== "v0" ? "0.5px solid var(--hub-border)" : "none",
                  opacity: m.status === "v0" ? 1 : 0.6,
                }}
              >
                {m.status === "v0" ? "Disponible" : m.status === "v1" ? "À venir V1" : "À venir V2"}
              </span>

              {/* Icon */}
              <div
                style={{
                  marginTop: 24,
                  marginBottom: 16,
                  width: 44,
                  height: 44,
                  borderRadius: 10,
                  background: m.status === "v0" ? "var(--hub-foreground)" : "var(--hub-bg)",
                  border: m.status !== "v0" ? "0.5px solid var(--hub-border)" : "none",
                  color: m.status === "v0" ? "var(--hub-bg)" : "var(--hub-foreground)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {m.icon}
              </div>

              <h2
                style={{
                  fontFamily: "var(--font-editorial)",
                  fontSize: 20,
                  fontWeight: 500,
                  letterSpacing: "-0.01em",
                  color: "var(--hub-foreground)",
                  marginBottom: 8,
                  margin: 0,
                  lineHeight: 1.2,
                }}
              >
                {m.title}
              </h2>
              <p
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: 13,
                  color: "var(--hub-foreground)",
                  opacity: 0.7,
                  lineHeight: 1.5,
                  marginTop: 8,
                  marginBottom: 16,
                  flex: 1,
                }}
              >
                {m.description}
              </p>

              {m.href && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    fontFamily: "var(--font-sans)",
                    fontSize: 12,
                    fontWeight: 500,
                    color: "var(--hub-foreground)",
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                  }}
                >
                  Ouvrir <ArrowRight size={14} strokeWidth={1.6} />
                </div>
              )}
            </article>
          );
          return m.href ? (
            <Link key={m.id} href={m.href} style={{ textDecoration: "none", color: "inherit" }}>
              {card}
            </Link>
          ) : (
            <div key={m.id}>{card}</div>
          );
        })}
      </div>

      {/* Footer info */}
      <p
        style={{
          marginTop: 48,
          fontFamily: "var(--font-sans)",
          fontSize: 11,
          color: "var(--hub-foreground)",
          opacity: 0.5,
          textAlign: "center",
        }}
      >
        Atelier DA • V0 — Shooting Book opérationnel • 7 sous-modules à venir.
      </p>
    </div>
  );
}
