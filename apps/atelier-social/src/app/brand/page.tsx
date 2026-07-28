/**
 * Aperçu Brand — préversion du Design System v1 2026 pour la comm (Maï).
 *
 * Page de référence lisible (pas un générateur) : elle montre "ce qu'on
 * attend" côté social — palette épine dorsale, typos, un carrousel Instagram
 * type (structure §5.5 du Brand Voice & Design System) et le rythme de grille
 * 3×3. Source de vérité : referentiels/brand voice design system/.
 */
"use client";

import { useState } from "react";

// ── Palette épine dorsale (source : Design System v1 2026 §2.1) ──────────────
const SPINE = [
  { name: "Teal", hex: "#1E6E77", role: "Primaire — boutons, tuiles signature, liens", ink: "#F4EEE2" },
  { name: "Marine", hex: "#16324C", role: "Dominante — fonds profonds, titres sur clair", ink: "#F4EEE2" },
  { name: "Crème", hex: "#F4EEE2", role: "Base — fond par défaut, respiration", ink: "#16324C" },
  { name: "Terracotta", hex: "#A75F59", role: "Accent — signature « couple », CTA chaud (jamais primaire)", ink: "#F4EEE2" },
  { name: "Sauge", hex: "#9CAE92", role: "Secondaire douce — respirations végétales", ink: "#16324C" },
];

// ── Accents saisonniers — couleurs de fils (§2.2), ≤ 40 %, décorent seulement ─
const SEASONS = [
  { key: "signature", label: "Signature", accent: "#A75F59", ink: "#F4EEE2" },
  { key: "valentin", label: "St-Valentin", accent: "#C4496A", ink: "#F4EEE2" },
  { key: "ete", label: "Été", accent: "#C9A227", ink: "#16324C" },
  { key: "noel", label: "Noël", accent: "#7E2F3B", ink: "#F4EEE2" },
] as const;

const THREADS = [
  { name: "Ocre · Ambre", hex: "#D98A3D" },
  { name: "Moutarde", hex: "#C9A227" },
  { name: "Blush · Rose", hex: "#E59CB0" },
  { name: "Bleu paon", hex: "#2E6E8E" },
  { name: "Bordeaux", hex: "#7E2F3B" },
];

const SERIF = 'var(--font-serif, "Newsreader", Georgia, serif)';
const SANS = 'var(--font-sans, "Hanken Grotesk", ui-sans-serif, system-ui, sans-serif)';

export default function BrandPreviewPage() {
  const [seasonKey, setSeasonKey] = useState<(typeof SEASONS)[number]["key"]>("signature");
  const season = SEASONS.find((s) => s.key === seasonKey)!;

  return (
    <div style={{ maxWidth: 1080, margin: "0 auto", color: "#16324C", fontFamily: SANS }}>
      {/* ── En-tête ── */}
      <header style={{ marginBottom: 40 }}>
        <p style={{ fontSize: 12, letterSpacing: 2.5, textTransform: "uppercase", color: "#1E6E77", fontWeight: 600, margin: "0 0 8px" }}>
          Design System v1 · 2026
        </p>
        <h1 style={{ fontFamily: SERIF, fontWeight: 500, fontSize: 44, lineHeight: 1.05, margin: "0 0 12px" }}>
          Aperçu Brand — <em style={{ color: "#1E6E77" }}>ce qu&apos;on attend côté social</em>
        </h1>
        <p style={{ maxWidth: 640, fontSize: 15, lineHeight: 1.55, color: "#4a5a68", margin: 0 }}>
          Préversion de référence pour la comm. L&apos;épine dorsale (teal · marine · crème · terracotta)
          se reconnaît au premier coup d&apos;œil. Les accents saisonniers <b>décorent</b> — ils ne
          remplacent jamais la base. Typos : <b>Newsreader</b> (accroches, émotion) + <b>Hanken Grotesk</b> (texte, CTA).
        </p>
      </header>

      {/* ── Sélecteur de saison (pilote l'accent du carrousel + tuile grille) ── */}
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 32 }}>
        <span style={{ fontSize: 11, letterSpacing: 1.5, textTransform: "uppercase", color: "#7a8894", fontWeight: 600, marginRight: 4 }}>
          Saison
        </span>
        {SEASONS.map((s) => {
          const active = s.key === seasonKey;
          return (
            <button
              key={s.key}
              onClick={() => setSeasonKey(s.key)}
              style={{
                fontFamily: SANS, fontSize: 13, fontWeight: 600, cursor: "pointer",
                padding: "8px 14px", borderRadius: 999,
                border: active ? "1px solid transparent" : "1px solid rgba(22,50,76,.14)",
                background: active ? s.accent : "#fff",
                color: active ? s.ink : "#16324C",
                transition: "all .15s ease",
              }}
            >
              {s.label}
            </button>
          );
        })}
      </div>

      {/* ── Section 1 : Palette ── */}
      <Section title="1 · La palette" sub="L'épine dorsale d'abord. Nommer les couleurs, pas les subir.">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px,1fr))", gap: 12 }}>
          {SPINE.map((c) => (
            <div key={c.hex} style={{ border: "1px solid rgba(22,50,76,.12)", borderRadius: 14, overflow: "hidden", background: "#fff" }}>
              <div style={{ background: c.hex, height: 84, display: "flex", alignItems: "flex-end", padding: 10 }}>
                <span style={{ color: c.ink, fontFamily: "monospace", fontSize: 12, fontWeight: 600 }}>{c.hex}</span>
              </div>
              <div style={{ padding: "10px 12px 14px" }}>
                <div style={{ fontFamily: SERIF, fontWeight: 600, fontSize: 16 }}>{c.name}</div>
                <p style={{ margin: "4px 0 0", fontSize: 12.5, lineHeight: 1.4, color: "#56636e" }}>{c.role}</p>
              </div>
            </div>
          ))}
        </div>

        <p style={{ fontSize: 12.5, letterSpacing: 1.5, textTransform: "uppercase", color: "#7a8894", fontWeight: 600, margin: "24px 0 10px" }}>
          Accents saisonniers · fils de broderie · ≤ 40 %
        </p>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {THREADS.map((t) => (
            <div key={t.hex} style={{ display: "flex", alignItems: "center", gap: 8, border: "1px solid rgba(22,50,76,.12)", borderRadius: 999, padding: "6px 12px 6px 6px", background: "#fff" }}>
              <span style={{ width: 22, height: 22, borderRadius: 999, background: t.hex, display: "inline-block" }} />
              <span style={{ fontSize: 13 }}>{t.name}</span>
              <span style={{ fontFamily: "monospace", fontSize: 11, color: "#8a8f96" }}>{t.hex}</span>
            </div>
          ))}
        </div>
      </Section>

      {/* ── Section 2 : Typo ── */}
      <Section title="2 · Les typos" sub="Newsreader porte l'émotion ; Hanken Grotesk porte l'information.">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div style={{ border: "1px solid rgba(22,50,76,.12)", borderRadius: 14, padding: 24, background: "#fff" }}>
            <p style={{ fontSize: 11, letterSpacing: 1.5, textTransform: "uppercase", color: "#1E6E77", fontWeight: 600, margin: "0 0 12px" }}>Display · Newsreader</p>
            <p style={{ fontFamily: SERIF, fontSize: 30, lineHeight: 1.1, margin: "0 0 8px" }}>Ça s&apos;écrit comment, ton prénom&nbsp;?</p>
            <p style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 18, color: "#56636e", margin: 0 }}>La voix intime, en italique.</p>
          </div>
          <div style={{ border: "1px solid rgba(22,50,76,.12)", borderRadius: 14, padding: 24, background: "#fff" }}>
            <p style={{ fontSize: 11, letterSpacing: 1.5, textTransform: "uppercase", color: "#1E6E77", fontWeight: 600, margin: "0 0 12px" }}>Texte · Hanken Grotesk</p>
            <p style={{ fontFamily: SANS, fontWeight: 700, fontSize: 20, margin: "0 0 6px" }}>Brodé à ton image, à la commande.</p>
            <p style={{ fontFamily: SANS, fontWeight: 400, fontSize: 14, lineHeight: 1.55, color: "#56636e", margin: 0 }}>
              Régulier 400 · Medium 500 · Bold 700. Lisible du CTA à la légende. Reçu en 15 j · dès 22 €.
            </p>
          </div>
        </div>
      </Section>

      {/* ── Section 3 : Carrousel type ── */}
      <Section title="3 · Le carrousel type" sub="Structure §5.5 — Hook → Le choix → Le geste → CTA. Format 4:5, fond de l'épine dorsale.">
        <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 12 }}>
          <Slide index="01" tag="HOOK" bg="#16324C" ink="#F4EEE2">
            <span style={{ fontFamily: SERIF, fontSize: 30, lineHeight: 1.12, fontWeight: 500 }}>
              Ça s&apos;écrit comment, <em style={{ color: "#9CAE92" }}>ton prénom&nbsp;?</em>
            </span>
          </Slide>

          <Slide index="02" tag="LE CHOIX" bg="#1E6E77" ink="#F4EEE2">
            <span style={{ fontFamily: SERIF, fontSize: 26, lineHeight: 1.15, fontWeight: 500 }}>Ton mot, ton motif, ta couleur de fil.</span>
            <span style={{ fontFamily: SANS, fontSize: 13, opacity: 0.9, marginTop: 12 }}>10 couleurs · poitrine ou poignet</span>
          </Slide>

          <Slide index="03" tag="LE GESTE" bg="#F4EEE2" ink="#16324C" photo>
            <span style={{ fontFamily: SANS, fontSize: 12.5, color: "#8a7d69", lineHeight: 1.4 }}>
              <span style={{ fontFamily: SERIF, fontSize: 20, display: "block", color: "#16324C", marginBottom: 4 }}>Macro broderie</span>
              le fil, le relief — jamais la machine
            </span>
          </Slide>

          <Slide index="04" tag="CTA" bg={season.accent} ink={season.ink}>
            <span style={{ fontFamily: SERIF, fontSize: 26, lineHeight: 1.15, fontWeight: 500 }}>Choisis le motif qui te ressemble.</span>
            <span style={{ fontFamily: SANS, fontSize: 14, fontWeight: 700, marginTop: 14, borderBottom: `2px solid ${season.ink}`, paddingBottom: 2 }}>
              Je commande →
            </span>
          </Slide>
        </div>
      </Section>

      {/* ── Section 4 : Rythme de grille 3×3 ── */}
      <Section title="4 · Le rythme de grille 3×3" sub="1 carte hyper-partageable pour 1 carte produit. La tribu grossit, la vente suit.">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6, maxWidth: 540 }}>
          {[
            { kind: "typo", bg: "#1E6E77", ink: "#fff", label: "POV", text: "POV : tu offres ton mot brodé." },
            { kind: "photo", label: "Pièce portée" },
            { kind: "typo", bg: season.accent, ink: season.ink, label: "Citation", text: "« Un point à la fois. »" },
            { kind: "photo", label: "Macro fil" },
            { kind: "typo", bg: "#16324C", ink: "#fff", label: "Produit", text: "Le Club — sweat brodé" },
            { kind: "photo", label: "Flat-lay crème" },
            { kind: "photo", label: "Moment cadeau" },
            { kind: "typo", bg: "#9CAE92", ink: "#16324C", label: "Question", text: "Ça s'écrit comment ?" },
            { kind: "photo", label: "Détail initiale" },
          ].map((t, i) =>
            t.kind === "photo" ? (
              <div key={i} style={{ aspectRatio: "1/1", borderRadius: 4, background: "#e7ddcd", border: "1.5px dashed rgba(22,50,76,.24)", display: "flex", alignItems: "center", justifyContent: "center", padding: 8, textAlign: "center" }}>
                <span style={{ fontSize: 11, color: "#8a7d69", lineHeight: 1.3 }}>{t.label}</span>
              </div>
            ) : (
              <div key={i} style={{ aspectRatio: "1/1", borderRadius: 4, background: t.bg, color: t.ink, display: "flex", flexDirection: "column", justifyContent: "center", padding: 14, textAlign: "center" }}>
                <span style={{ fontSize: 9, letterSpacing: 1, textTransform: "uppercase", fontWeight: 700, opacity: 0.75, marginBottom: 8 }}>{t.label}</span>
                <span style={{ fontFamily: SERIF, fontSize: 15, lineHeight: 1.2 }}>{t.text}</span>
              </div>
            ),
          )}
        </div>
      </Section>

      {/* ── Section 5 : Garde-fous ── */}
      <Section title="5 · Les garde-fous" sub="Non négociables du discours public.">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <GuardCard tone="no" items={[
            "Terracotta en couleur primaire",
            "« fait main » · « artisanal » · #DIY",
            "La machine à broder en public",
            "Cormorant · DM Sans (dépréciées)",
            "Deux tuiles typo côte à côte",
            "Liens externes autres que ypersoa.fr",
          ]} />
          <GuardCard tone="yes" items={[
            "« brodé pour toi · à la commande »",
            "Épine dorsale reconnaissable d'un coup d'œil",
            "Newsreader + Hanken Grotesk uniquement",
            "Le geste, le fil, le relief en macro",
            "Fond crème pour respirer",
            "1 carte partageable / 1 carte produit",
          ]} />
        </div>
      </Section>

      <p style={{ fontSize: 12, color: "#8a8f96", marginTop: 40, lineHeight: 1.5 }}>
        Source de vérité : <code>referentiels/brand voice design system/</code>. Ce document fait foi
        pour l&apos;identité visuelle et le discours public tant que les tokens n&apos;ont pas été alignés partout.
      </p>
    </div>
  );
}

// ── Sous-composants ──────────────────────────────────────────────────────────
function Section({ title, sub, children }: { title: string; sub: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 56 }}>
      <h2 style={{ fontFamily: SERIF, fontWeight: 600, fontSize: 24, margin: "0 0 4px" }}>{title}</h2>
      <p style={{ fontSize: 13.5, color: "#56636e", margin: "0 0 20px", maxWidth: 620, lineHeight: 1.5 }}>{sub}</p>
      {children}
    </section>
  );
}

function Slide({ index, tag, bg, ink, photo, children }: { index: string; tag: string; bg: string; ink: string; photo?: boolean; children: React.ReactNode }) {
  return (
    <div
      style={{
        flex: "0 0 auto", width: 264, aspectRatio: "4 / 5", borderRadius: 10, background: bg, color: ink,
        position: "relative", display: "flex", flexDirection: "column", justifyContent: "center",
        padding: 28, textAlign: "left",
        border: photo ? "1.5px dashed rgba(22,50,76,.24)" : "1px solid transparent",
      }}
    >
      <span style={{ position: "absolute", top: 14, left: 16, fontFamily: "monospace", fontSize: 12, fontWeight: 700, opacity: 0.6 }}>{index}</span>
      <span style={{ position: "absolute", top: 14, right: 16, fontSize: 9, letterSpacing: 1.2, textTransform: "uppercase", fontWeight: 700, opacity: 0.7 }}>{tag}</span>
      <div style={{ display: "flex", flexDirection: "column" }}>{children}</div>
    </div>
  );
}

function GuardCard({ tone, items }: { tone: "no" | "yes"; items: string[] }) {
  const isNo = tone === "no";
  return (
    <div style={{ border: `1px solid ${isNo ? "rgba(167,95,89,.3)" : "rgba(28,110,119,.3)"}`, borderRadius: 14, padding: "18px 20px", background: "#fff" }}>
      <p style={{ fontSize: 12, letterSpacing: 1.5, textTransform: "uppercase", fontWeight: 700, color: isNo ? "#A75F59" : "#1E6E77", margin: "0 0 12px" }}>
        {isNo ? "✕ Jamais" : "✓ Toujours"}
      </p>
      <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13.5, lineHeight: 1.7, color: "#41505c" }}>
        {items.map((it) => <li key={it}>{it}</li>)}
      </ul>
    </div>
  );
}
