/**
 * Home Atelier-DA — casting, ambiances, motifs, incarnations : le référentiel
 * créatif de la marque.
 *
 * Shooting Book et Studio Mood ont rejoint Atelier Studio, Médiathèque a
 * rejoint Bibliothèque, Planning commun a rejoint Planning, et Atelier Blog
 * est passé atelier de premier niveau — cf. refonte nav du 20/08/2026
 * (_passations/DESIGN_SYSTEM_hub.md v2).
 *
 * Référentiels motifs / fils / palettes sont passés sur Atelier Production
 * depuis le 15/05/2026 (séparation production ↔ DA) — les cartes pointeurs
 * "Motifs — fiches techniques" et "Palettes d'associations" ont été retirées
 * le 21/08/2026 : elles vivent UNIQUEMENT dans Atelier Production désormais.
 * Radar (veille tendances, ex atelier de premier niveau) a rejoint Atelier DA
 * le 21/08/2026, débarrassé de Google Trends (Pinterest seul en V1).
 *
 * Cf. _passations/IDEES_FUTURES/SPEC_atelier_DA.md.
 */
import Link from "next/link";
import { Users, Image as ImageIcon, BookOpen, ArrowRight, Shapes, Film, TrendingUp } from "lucide-react";

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
    id: 3,
    title: "Référentiel d'ambiances",
    description: "Catalogue des 6 ambiances officielles + lookbooks ❤️ actifs. Sources visuelles unifiées entre les 3 ateliers.",
    href: "/atelier-da/ambiances",
    icon: <ImageIcon size={22} strokeWidth={1.4} />,
    status: "v0",
  },
  {
    id: 6,
    title: "Incarnations",
    description: "Référentiel des déclinaisons éditoriales (MAMA CLUB, PAPA CLUB, DOG DAD GANG…). Pilote les chips configurateur Shopify et les photos contextuelles par collection. Import XLSX + édition spec broderie + ciblage.",
    href: "/atelier-da/incarnations",
    icon: <Shapes size={22} strokeWidth={1.4} />,
    status: "v0",
  },
  {
    id: 7,
    title: "Atelier Motion",
    description: "Génération vidéo IA via Gemini Omni Flash / Veo 3.1. Trois modes : Reels Insta narratifs depuis collection Shooting, ambiance vidéo lookbook, motion packshot. Le maillon image → vidéo du Hub.",
    href: "/atelier-da/motion",
    icon: <Film size={22} strokeWidth={1.4} />,
    status: "v0",
  },
  {
    id: 8,
    title: "Radar",
    description: "Veille des tendances Pinterest qui montent. Une IA note chaque tendance et la relie à un motif et une occasion Ypersoa, pour transformer un signal en idée de broderie.",
    href: "/atelier-trends",
    icon: <TrendingUp size={22} strokeWidth={1.4} />,
    status: "v0",
  },
  {
    id: 10,
    title: "Le Livre",
    description: "Source unique v1.1 · 2026 : marque, voix (thermostat citron), vocabulaire brand-safe, Range Bisous, playbook et kit Mood — fusionnés en une seule page.",
    href: "/le-livre",
    icon: <BookOpen size={22} strokeWidth={1.4} />,
    status: "v0",
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
          L&apos;espace de travail du Directeur Artistique. Le référentiel créatif d&apos;Ypersoa : casting,
          ambiances, motifs et incarnations éditoriales.
        </p>
        <div style={{ marginTop: 18, display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link
            href="/le-livre"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 14px",
              borderRadius: 999,
              background: "var(--brand-rouge)",
              color: "var(--hub-bg)",
              textDecoration: "none",
              fontFamily: "var(--font-sans)",
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            <BookOpen size={15} strokeWidth={1.8} />
            Le Livre
          </Link>
        </div>
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
                  background: m.status === "v0" ? "color-mix(in srgb, var(--hub-teal) 15%, white)" : "transparent",
                  color: m.status === "v0" ? "var(--hub-teal)" : "var(--hub-foreground)",
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
                  background: m.status === "v0" ? "var(--hub-accent-wash)" : "var(--hub-bg)",
                  border: m.status !== "v0" ? "0.5px solid var(--hub-border)" : "none",
                  color: m.status === "v0" ? "var(--hub-teal)" : "var(--hub-foreground)",
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
                  className="atelier-da-card-cta"
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
                    transition: "color 200ms ease",
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
        Atelier DA • Brand Book activé (v1.0 · 2026) • 1 sous-module à venir V2.
      </p>
    </div>
  );
}
