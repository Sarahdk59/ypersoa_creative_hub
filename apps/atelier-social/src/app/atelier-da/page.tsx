/**
 * Home Atelier-DA — vision et direction artistique.
 * 8 sous-modules : 6 disponibles V1, 2 à venir V2.
 *
 * Référentiels motifs / fils / palettes sont passés sur Atelier Production
 * depuis le 15/05/2026 (séparation production ↔ DA).
 *
 * Cf. _passations/IDEES_FUTURES/SPEC_atelier_DA.md.
 */
import Link from "next/link";
import { Users, Camera, Sparkles, Image as ImageIcon, BookOpen, Archive, ArrowRight, Compass, Library } from "lucide-react";

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
    description: "23 canoniques + 3 lignées familiales. Mur filtrable (famille, genre, lieu) + vue Lignées avec arbres généalogiques. Click → fiche complète + dispositifs liés.",
    href: "/atelier-da/casting",
    icon: <Users size={22} strokeWidth={1.4} />,
    status: "v0",
  },
  {
    id: 2,
    title: "Shooting Book",
    description: "Brief poétique → plan de shooting structuré (casting + ambiances + shotlist + hooks temporels). Génère 1 image hero ou les 5 angles individuellement.",
    href: "/atelier-da/shooting-book",
    icon: <Camera size={22} strokeWidth={1.4} />,
    status: "v0",
  },
  {
    id: 3,
    title: "Référentiel d'ambiances",
    description: "Catalogue des 6 ambiances officielles + lookbooks ❤️ actifs. Sources visuelles unifiées entre les 3 ateliers.",
    href: "/atelier-da/ambiances",
    icon: <ImageIcon size={22} strokeWidth={1.4} />,
    status: "v0",
  },
  {
    id: 4,
    title: "Motifs (catalogue)",
    description: "Vue site-web des motifs YPM, filtrable par destinataire (papa, maman, parrain, témoins…) et occasion (mariage, naissance, fête des mères…). Click → utiliser dans Shooting.",
    href: "/atelier-da/motifs",
    icon: <Sparkles size={22} strokeWidth={1.4} />,
    status: "v0",
  },
  {
    id: 5,
    title: "Médiathèque",
    description: "Toutes tes photos shooting / lifestyle / IA / packshot centralisées. Filtres par incarnation, motif, gabarit. Upload batch drag-and-drop avec auto-tagging depuis le nom de fichier.",
    href: "/atelier-da/mediatheque",
    icon: <Library size={22} strokeWidth={1.4} />,
    status: "v0",
  },
  {
    id: 6,
    title: "Atelier Production",
    description: "Fiche technique des motifs, fils, palettes + moteur d'attribution. Lien raccourci quand la DA a besoin de la vue prod.",
    href: "/atelier-production",
    icon: <Compass size={22} strokeWidth={1.4} />,
    status: "v0",
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
          la direction artistique d&apos;Ypersoa, depuis la mémoire vivante du casting jusqu&apos;à la médiathèque centrale.
        </p>
      </header>

      {/* Grille des 7 sous-modules */}
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
        Atelier DA • V1 — 5 sous-modules opérationnels (Casting, Shooting Book, Ambiances, Motifs, Atelier Production) • 3 sous-modules à venir V2.
      </p>
    </div>
  );
}
