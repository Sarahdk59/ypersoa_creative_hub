/**
 * Guide d'utilisation du Hub — page de documentation auto-suffisante.
 *
 * Contenu 100% séparé de la mise en page : tout le texte vit dans
 * `lib/guide-content.ts` (GUIDE_INTRO + GUIDE_SECTIONS). Cette page ne fait
 * que la mise en forme + la navigation (sommaire sticky + scroll-spy).
 *
 * Pour ajouter/modifier une fiche : éditer UNIQUEMENT lib/guide-content.ts.
 * Le layout (ci-dessous) n'a pas à être touché.
 */
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Target,
  Clock,
  ListChecks,
  Lightbulb,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Compass,
} from "lucide-react";
import {
  GUIDE_INTRO,
  GUIDE_SECTIONS,
  type FeatureDoc,
} from "@/lib/guide-content";

const INK = "var(--hub-foreground)";
const BORDER = "var(--hub-border)";

/** Ligne de template (un des 6 blocs obligatoires d'une fiche). */
function TemplateRow({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ display: "flex", gap: 12, marginBottom: 14 }}>
      <div
        style={{
          flexShrink: 0,
          width: 26,
          height: 26,
          borderRadius: 7,
          background: "var(--hub-bg)",
          border: `0.5px solid ${BORDER}`,
          color: INK,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 10.5,
            fontWeight: 600,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: INK,
            opacity: 0.55,
            marginBottom: 4,
          }}
        >
          {label}
        </div>
        <div
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 13.5,
            lineHeight: 1.6,
            color: INK,
            opacity: 0.92,
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

function FeatureBlock({ feature }: { feature: FeatureDoc }) {
  return (
    <article
      id={feature.id}
      style={{
        scrollMarginTop: 80,
        background: "white",
        border: `0.5px solid ${BORDER}`,
        borderRadius: 12,
        padding: 24,
        marginBottom: 16,
      }}
    >
      <h3
        style={{
          fontFamily: "var(--font-editorial)",
          fontSize: 22,
          fontWeight: 500,
          letterSpacing: "-0.01em",
          color: INK,
          margin: 0,
          marginBottom: 16,
          lineHeight: 1.15,
        }}
      >
        {feature.name}
      </h3>

      <TemplateRow icon={<Target size={14} strokeWidth={1.7} />} label="À quoi ça sert">
        {feature.aQuoiCaSert}
      </TemplateRow>

      <TemplateRow icon={<Clock size={14} strokeWidth={1.7} />} label="Quand l'utiliser">
        {feature.quandUtiliser}
      </TemplateRow>

      <TemplateRow icon={<ListChecks size={14} strokeWidth={1.7} />} label="Comment faire">
        <ol style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 4 }}>
          {feature.commentFaire.map((step, i) => (
            <li key={i}>{step}</li>
          ))}
        </ol>
      </TemplateRow>

      <TemplateRow icon={<Lightbulb size={14} strokeWidth={1.7} />} label="Exemple concret">
        <div
          style={{
            background: "var(--hub-bg)",
            border: `0.5px solid ${BORDER}`,
            borderRadius: 8,
            padding: "10px 12px",
            fontStyle: "italic",
          }}
        >
          {feature.exemple}
        </div>
      </TemplateRow>

      <TemplateRow icon={<CheckCircle2 size={14} strokeWidth={1.7} />} label="Résultat attendu">
        {feature.resultat}
      </TemplateRow>

      <TemplateRow icon={<AlertTriangle size={14} strokeWidth={1.7} />} label="Limites & pièges">
        <ul style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 4 }}>
          {feature.limites.map((lim, i) => (
            <li key={i}>{lim}</li>
          ))}
        </ul>
      </TemplateRow>
    </article>
  );
}

export default function GuidePage() {
  const [activeId, setActiveId] = useState<string>("introduction");
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Tous les ancrages (sections + fiches) dans l'ordre du document.
  const anchorIds = useMemo(() => {
    const ids: string[] = ["introduction", "demarrage-rapide", "vue-ensemble"];
    for (const s of GUIDE_SECTIONS) {
      ids.push(s.id);
      for (const f of s.features) ids.push(f.id);
    }
    return ids;
  }, []);

  // Scroll-spy : surligne l'ancre la plus haute actuellement visible.
  useEffect(() => {
    const visible = new Map<string, number>();
    observerRef.current = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) visible.set(e.target.id, e.boundingClientRect.top);
          else visible.delete(e.target.id);
        }
        if (visible.size > 0) {
          // l'élément visible le plus proche du haut gagne
          const top = [...visible.entries()].sort((a, b) => a[1] - b[1])[0][0];
          setActiveId(top);
        }
      },
      { rootMargin: "-72px 0px -65% 0px", threshold: 0 },
    );
    for (const id of anchorIds) {
      const el = document.getElementById(id);
      if (el) observerRef.current.observe(el);
    }
    return () => observerRef.current?.disconnect();
  }, [anchorIds]);

  // Section active (pour ouvrir le bon groupe dans le sommaire).
  const activeSectionId = useMemo(() => {
    for (const s of GUIDE_SECTIONS) {
      if (s.id === activeId) return s.id;
      if (s.features.some((f) => f.id === activeId)) return s.id;
    }
    return null;
  }, [activeId]);

  const tocLink = (id: string, label: string, opts?: { sub?: boolean; section?: boolean }) => {
    const isActive = activeId === id;
    return (
      <a
        key={id}
        href={`#${id}`}
        style={{
          display: "block",
          textDecoration: "none",
          fontFamily: "var(--font-sans)",
          fontSize: opts?.sub ? 12 : 12.5,
          fontWeight: opts?.section ? 600 : 400,
          color: INK,
          opacity: isActive ? 1 : opts?.section ? 0.85 : 0.6,
          padding: opts?.sub ? "3px 10px 3px 22px" : "5px 10px",
          marginTop: opts?.section && !opts?.sub ? 10 : 0,
          borderLeft: isActive ? `2px solid ${INK}` : "2px solid transparent",
          background: isActive ? "var(--hub-bg)" : "transparent",
          borderRadius: isActive ? "0 6px 6px 0" : 0,
          lineHeight: 1.35,
        }}
      >
        {label}
      </a>
    );
  };

  return (
    <div
      style={{
        display: "flex",
        gap: 40,
        maxWidth: 1180,
        margin: "0 auto",
        alignItems: "flex-start",
      }}
    >
      {/* Sommaire sticky (scroll-spy) */}
      <nav
        aria-label="Sommaire du guide"
        style={{
          position: "sticky",
          top: 16,
          flexShrink: 0,
          width: 248,
          maxHeight: "calc(100vh - var(--topbar-height) - 48px)",
          overflowY: "auto",
          paddingRight: 8,
        }}
        className="guide-toc"
      >
        {tocLink("introduction", "Introduction", { section: true })}
        {tocLink("demarrage-rapide", "Démarrage rapide", { sub: true })}
        {tocLink("vue-ensemble", "Vue d'ensemble", { sub: true })}

        {GUIDE_SECTIONS.map((s) => (
          <div key={s.id}>
            {tocLink(s.id, `${s.num}. ${s.title}`, { section: true })}
            {activeSectionId === s.id &&
              s.features.map((f) => tocLink(f.id, f.name, { sub: true }))}
          </div>
        ))}
      </nav>

      {/* Contenu */}
      <div style={{ flex: 1, minWidth: 0, maxWidth: 800 }}>
        {/* ── Introduction ── */}
        <header id="introduction" style={{ scrollMarginTop: 80, marginBottom: 40 }}>
          <div
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: INK,
              opacity: 0.5,
              marginBottom: 12,
            }}
          >
            Guide d'utilisation
          </div>
          <h1
            style={{
              fontFamily: "var(--font-editorial)",
              fontSize: 44,
              fontWeight: 500,
              letterSpacing: "-0.015em",
              color: INK,
              lineHeight: 1.05,
              margin: 0,
              marginBottom: 16,
            }}
          >
            {GUIDE_INTRO.titre}
          </h1>
          <p
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 15,
              lineHeight: 1.65,
              color: INK,
              opacity: 0.8,
              margin: 0,
              marginBottom: 10,
            }}
          >
            {GUIDE_INTRO.pitch}
          </p>
          <p
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 13.5,
              lineHeight: 1.6,
              color: INK,
              opacity: 0.6,
              margin: 0,
            }}
          >
            {GUIDE_INTRO.pourQui}
          </p>
        </header>

        {/* ── Démarrage rapide ── */}
        <section id="demarrage-rapide" style={{ scrollMarginTop: 80, marginBottom: 40 }}>
          <h2 style={sectionTitleStyle}>Démarrage rapide</h2>
          <p style={sectionLeadStyle}>
            Les actions que tu feras 80 % du temps. Clique pour aller droit au mode d'emploi.
          </p>
          <div style={{ display: "grid", gap: 10 }}>
            {GUIDE_INTRO.demarrageRapide.map((q, i) => (
              <a
                key={q.href}
                href={`#${q.href}`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  textDecoration: "none",
                  background: "white",
                  border: `0.5px solid ${BORDER}`,
                  borderRadius: 10,
                  padding: "14px 16px",
                  color: INK,
                }}
                className="atelier-da-card-active"
              >
                <span
                  style={{
                    flexShrink: 0,
                    width: 26,
                    height: 26,
                    borderRadius: 999,
                    background: INK,
                    color: "var(--hub-bg)",
                    fontFamily: "var(--font-sans)",
                    fontSize: 12,
                    fontWeight: 600,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {i + 1}
                </span>
                <span style={{ flex: 1, fontFamily: "var(--font-sans)", fontSize: 14 }}>
                  {q.label}
                </span>
                <ArrowRight size={15} strokeWidth={1.6} style={{ opacity: 0.5 }} />
              </a>
            ))}
          </div>
        </section>

        {/* ── Vue d'ensemble (auto depuis le contenu) ── */}
        <section id="vue-ensemble" style={{ scrollMarginTop: 80, marginBottom: 48 }}>
          <h2 style={sectionTitleStyle}>Vue d'ensemble</h2>
          <p style={sectionLeadStyle}>
            Tout ce que le Hub sait faire, rangé par objectif. Chaque ligne est cliquable.
          </p>
          <div style={{ display: "grid", gap: 16 }}>
            {GUIDE_SECTIONS.map((s) => (
              <div
                key={s.id}
                style={{
                  background: "white",
                  border: `0.5px solid ${BORDER}`,
                  borderRadius: 10,
                  padding: 16,
                }}
              >
                <a
                  href={`#${s.id}`}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    textDecoration: "none",
                    color: INK,
                    fontFamily: "var(--font-editorial)",
                    fontSize: 17,
                    fontWeight: 500,
                    marginBottom: 4,
                  }}
                >
                  <Compass size={15} strokeWidth={1.5} style={{ opacity: 0.5 }} />
                  {s.num}. {s.title}
                  {s.atelier && (
                    <span
                      style={{
                        fontFamily: "var(--font-sans)",
                        fontSize: 10.5,
                        fontWeight: 600,
                        letterSpacing: "0.06em",
                        textTransform: "uppercase",
                        opacity: 0.45,
                        marginLeft: 4,
                      }}
                    >
                      · {s.atelier}
                    </span>
                  )}
                </a>
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 6,
                    marginTop: 8,
                  }}
                >
                  {s.features.map((f) => (
                    <a
                      key={f.id}
                      href={`#${f.id}`}
                      style={{
                        textDecoration: "none",
                        fontFamily: "var(--font-sans)",
                        fontSize: 12,
                        color: INK,
                        opacity: 0.75,
                        background: "var(--hub-bg)",
                        border: `0.5px solid ${BORDER}`,
                        borderRadius: 999,
                        padding: "3px 10px",
                      }}
                    >
                      {f.name}
                    </a>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Sections détaillées ── */}
        {GUIDE_SECTIONS.map((s) => (
          <section key={s.id} style={{ marginBottom: 48 }}>
            <div
              id={s.id}
              style={{
                scrollMarginTop: 80,
                paddingBottom: 12,
                marginBottom: 20,
                borderBottom: `0.5px solid ${BORDER}`,
              }}
            >
              <div
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: INK,
                  opacity: 0.45,
                  marginBottom: 8,
                }}
              >
                Objectif {s.num}
                {s.atelier ? ` · ${s.atelier}` : ""}
              </div>
              <h2
                style={{
                  fontFamily: "var(--font-editorial)",
                  fontSize: 32,
                  fontWeight: 500,
                  letterSpacing: "-0.015em",
                  color: INK,
                  margin: 0,
                  marginBottom: 8,
                  lineHeight: 1.1,
                }}
              >
                {s.title}
              </h2>
              <p
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: 14,
                  lineHeight: 1.6,
                  color: INK,
                  opacity: 0.7,
                  margin: 0,
                }}
              >
                {s.pitch}
              </p>
            </div>
            {s.features.map((f) => (
              <FeatureBlock key={f.id} feature={f} />
            ))}
          </section>
        ))}

        <footer
          style={{
            marginTop: 24,
            paddingTop: 20,
            borderTop: `0.5px solid ${BORDER}`,
            fontFamily: "var(--font-sans)",
            fontSize: 11.5,
            color: INK,
            opacity: 0.5,
            textAlign: "center",
          }}
        >
          {GUIDE_INTRO.piedDePage}
        </footer>
      </div>
    </div>
  );
}

const sectionTitleStyle: React.CSSProperties = {
  fontFamily: "var(--font-editorial)",
  fontSize: 28,
  fontWeight: 500,
  letterSpacing: "-0.015em",
  color: INK,
  margin: 0,
  marginBottom: 6,
  lineHeight: 1.1,
};

const sectionLeadStyle: React.CSSProperties = {
  fontFamily: "var(--font-sans)",
  fontSize: 13.5,
  lineHeight: 1.6,
  color: INK,
  opacity: 0.65,
  margin: 0,
  marginBottom: 18,
};
