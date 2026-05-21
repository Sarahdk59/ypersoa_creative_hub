/**
 * Home Atelier-Production — modules opérationnels de la prod broderie.
 * Séparé d'Atelier DA (qui reste sur la vision/direction artistique).
 *
 * V1 : moteur d'attribution (Streamlit external), motifs, fils, palettes.
 * V2 : règles & contraintes broderie, plans techniques DST/PXF.
 */
import Link from "next/link";
import { Palette, Droplet, Droplets, Cpu, Settings, FileBox, ArrowRight, ExternalLink, StickyNote, ShoppingBag } from "lucide-react";

interface SubmoduleCard {
  id: number;
  title: string;
  description: string;
  href: string | null;
  external?: boolean;
  icon: React.ReactNode;
  status: "v0" | "v1" | "v2";
}

const SUBMODULES: SubmoduleCard[] = [
  {
    id: 1,
    title: "Moteur d'attribution",
    description: "Attribution automatique couleur → lettre pour commandes multicolores. POC visuel (Sprint A) : validation des 3 polices Tajima (Russ Times, Arial Rounded, Looney) avec effet broderie simulé. Algo backtracking arrive au Sprint B.",
    href: "/atelier-production/attribution",
    icon: <Cpu size={22} strokeWidth={1.4} />,
    status: "v0",
  },
  {
    id: 2,
    title: "Référentiel motifs YPM",
    description: "Catalogue des 17 motifs commerciaux Ypersoa + 80 variantes. Bibles techniques (composition, dimensions, règles, palettes associées). Fichiers prod PXF/DST/FT.",
    href: "/atelier-production/motifs",
    icon: <Palette size={22} strokeWidth={1.4} />,
    status: "v0",
  },
  {
    id: 3,
    title: "Référentiel fils Gunold",
    description: "33 couleurs officielles de fils Gunold-Poly. Codes Gunold canoniques, hex, famille, favoris B2C (max 8 exposés sur ypersoa.fr). Click sur un fil → détail + édition.",
    href: "/atelier-production/fils",
    icon: <Droplet size={22} strokeWidth={1.4} />,
    status: "v0",
  },
  {
    id: 4,
    title: "Palettes d'associations",
    description: "13 palettes canoniques (camaïeus + multicolores) — Camaïeu bleu, Trends 2026, Jardin cévénole, Printemps basque, etc. Référençables par motif dans bible.palettes_associees.",
    href: "/atelier-production/palettes",
    icon: <Droplets size={22} strokeWidth={1.4} />,
    status: "v0",
  },
  {
    id: 5,
    title: "Règles & contraintes broderie",
    description: "Règles officielles par type de placement (poignet, buste, centre) — dimensions max, défaut, ajustement 2XL/3XL. Source de vérité pour Adriana et les générations IA.",
    href: "/atelier-production/regles",
    icon: <Settings size={22} strokeWidth={1.4} />,
    status: "v0",
  },
  {
    id: 6,
    title: "Kanban prod",
    description: "Board des questions / améliorations / décisions à trancher pour la prod. Adriana et Sarah posent leurs post-its et avancent les cards (Backlog → Prochain → En cours → Testé → Fait).",
    href: "/atelier-production/kanban",
    icon: <StickyNote size={22} strokeWidth={1.4} />,
    status: "v0",
  },
  {
    id: 7,
    title: "Commandes Shopify",
    description: "Import des bons de préparation Shopify. Chaque article est croisé avec le motif YPM, les fils Gunold (hex + code fournisseur) et les durées de broderie. Génération auto d'un planning 3 jours réparti sur les 2 machines TMEZ (LPT, 6h/jour).",
    href: "/atelier-production/commandes",
    icon: <ShoppingBag size={22} strokeWidth={1.4} />,
    status: "v0",
  },
  {
    id: 8,
    title: "Plans techniques DST/PXF",
    description: "Générateur de fiches techniques Tajima Pulse + visualisation plan d'aiguille. Export PDF prêt atelier.",
    href: null,
    icon: <FileBox size={22} strokeWidth={1.4} />,
    status: "v2",
  },
];

export default function AtelierProductionHome() {
  return (
    <div style={{ maxWidth: 1200, margin: "0 auto" }}>
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
          Atelier Production
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
          L&apos;espace de travail technique de la production broderie. Moteur d&apos;attribution
          couleur → lettre, référentiels motifs/fils/palettes, règles qualité Tajima.
        </p>
      </header>

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
                  Ouvrir {m.external ? <ExternalLink size={14} strokeWidth={1.6} /> : <ArrowRight size={14} strokeWidth={1.6} />}
                </div>
              )}
            </article>
          );
          if (!m.href) return <div key={m.id}>{card}</div>;
          if (m.external) {
            return (
              <a key={m.id} href={m.href} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none", color: "inherit" }}>
                {card}
              </a>
            );
          }
          return (
            <Link key={m.id} href={m.href} style={{ textDecoration: "none", color: "inherit" }}>
              {card}
            </Link>
          );
        })}
      </div>

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
        Atelier Production • V1 — 7 modules opérationnels (Moteur d&apos;attribution, Motifs, Fils, Palettes, Règles broderie, Kanban prod, Commandes Shopify) • 1 module à venir V2. Moteur d&apos;attribution lance Streamlit sur localhost:8501 (port React en V2).
      </p>
    </div>
  );
}
