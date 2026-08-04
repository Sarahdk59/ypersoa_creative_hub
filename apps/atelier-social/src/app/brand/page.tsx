"use client";

import { useState } from "react";

// ── Brandbook v1.0 · 2026 ─────────────────────────────────────────────────────
// Source de vérité : §9 JSON du Brandbook global (Ypersoa).
// Ce fichier EST le brandbook côté Hub. Il pilote tous les ateliers.

const SPINE = [
  { name: "Marine", hex: "#16324C", role: "Dominante — fonds profonds, texte, cartes signature", ink: "#F4EEE2" },
  { name: "Teal · canard", hex: "#1E6E77", role: "Accent marque — boutons, labels, liens, titres de rubrique", ink: "#F4EEE2" },
  { name: "Crème", hex: "#F4EEE2", role: "Base — fond par défaut, respiration, cartes avis", ink: "#16324C" },
];

const POP = [
  { name: "Rouge coquelicot", hex: "#C23A2D", role: "Pop signature — CTA, carte héros, touche forte. 1 pour 6–9 cases.", ink: "#F4EEE2" },
  { name: "Blush", hex: "#EAB4C4", role: "Compagnon doux — fonds citation, filets newsletter, tags, verso carte", ink: "#16324C" },
];

const SECONDARY = [
  { name: "Ambre", hex: "#E0942E", role: "Étoiles d'avis, micro-touches seulement. Il se tait.", ink: "#16324C" },
  { name: "Sauge", hex: "#97A886", role: "Transitions, respirations végétales", ink: "#16324C" },
];

const SEASONS = [
  { key: "valentin", label: "St-Valentin", colors: ["#D33A34", "#E86A97", "#F3C9D6"], accent: "#D33A34", ink: "#F4EEE2" },
  { key: "ete", label: "Été", colors: ["#EC1E79", "#F2B933", "#56C8A4", "#2483B8"], accent: "#EC1E79", ink: "#F4EEE2" },
  { key: "noel", label: "Noël", colors: ["#6E1D24", "#21503A", "#C6982F"], accent: "#6E1D24", ink: "#F4EEE2" },
] as const;

const FUNNEL: {
  surface: string;
  role: string;
  bg: string;
  steps: { label: string; desc: string }[];
}[] = [
  {
    surface: "Instagram",
    role: "Acquisition → Engagement → Conversion",
    bg: "#16324C",
    steps: [
      { label: "Reels + hooks", desc: "Acquérir : POV, citation, macro fil. 1re seconde = accroche." },
      { label: "Stories + rituels", desc: "Engager : sondages prénoms, repartages avis, coulisses." },
      { label: "Carrousel 4:5", desc: "Convertir : Hook → Le choix → Le geste → CTA." },
    ],
  },
  {
    surface: "Pinterest",
    role: "Acquisition evergreen · intention d'achat",
    bg: "#C23A2D",
    steps: [
      { label: "Épingles verticales", desc: "Intention : « cadeau personnalisé prénom », « brodé France »." },
      { label: "Tableaux par occasion", desc: "Anniversaire, St-Valentin, Noël, naissance, fête des mères." },
      { label: "Rich pins → ypersoa.fr", desc: "Chaque épingle pointe vers la fiche produit correspondante." },
    ],
  },
  {
    surface: "Newsletter · le Club",
    role: "Canal owned — fidélisation + conversion",
    bg: "#1E6E77",
    steps: [
      { label: "Welcome + lead magnet", desc: "Guide d'entretien livré à l'inscription + 1re histoire de marque." },
      { label: "Rituels récurrents", desc: "Prénoms du mois, avis clientes, coulisses atelier, POV." },
      { label: "Drops + perks Club", desc: "CTA rouge coquelicot. 1 seul pop par email." },
    ],
  },
  {
    surface: "Cartes de remerciement",
    role: "Fidélisation + UGC + passerelle print → digital",
    bg: "#EAB4C4",
    steps: [
      { label: "Recto : mémorable", desc: "Fond rouge coquelicot, cœur blush, « merci » manuscrit, quatrefoil." },
      { label: "Verso : invitation", desc: "QR → le Club + place pour le prénom + hashtag de marque." },
      { label: "Effet acquisition", desc: "1er contact physique photographiable = gratuit en acquisition." },
    ],
  },
];

const RUBRIQUES = [
  { emoji: "👁", label: "POV", format: "Reels / Stories / Typo slide", freq: "1–2×/sem", ex: "POV : tu ouvres le colis. Ton prénom est là.", tone: "Intime, voix unique" },
  { emoji: "❓", label: "Question", format: "Stories poll / Diapo grille", freq: "1×/sem", ex: "Ça s'écrit comment, ton prénom ?", tone: "Engageant, direct" },
  { emoji: "⭐", label: "Avis cliente", format: "Typo slide crème + blush", freq: "1–2×/sem", ex: "« C'est exactement ce que je voulais. »", tone: "Preuve sociale, chaleur" },
  { emoji: "✂️", label: "Coulisses atelier", format: "Reel / Carrousel 4:5", freq: "1×/sem", ex: "Macro du fil qui rentre dans l'aiguille.", tone: "Artisanal, réel" },
  { emoji: "🎁", label: "Moment cadeau", format: "Photo portée / Flat-lay", freq: "1–2×/sem", ex: "Pour la fête des mères. Brodé à ta commande.", tone: "Narratif, émotionnel" },
  { emoji: "🔡", label: "Prénom du mois", format: "Typo marine ou teal", freq: "1×/mois", ex: "Ce mois-ci : EMMA · THOMAS · ZOEY.", tone: "Rituélique, communauté" },
  { emoji: "🧵", label: "Macro fil / relief", format: "Reel court / Photo carré", freq: "2×/sem", ex: "Le relief du brodé. Jamais la machine.", tone: "Sensoriel, qualitatif" },
  { emoji: "🌟", label: "Produit", format: "Pièce portée / Flat-lay crème", freq: "1–2×/sem", ex: "Le Club — sweat brodé. Ton mot, ton motif.", tone: "Direct, clair" },
];

const VOCAB_OK = [
  "brodé à la commande",
  "brodé en France",
  "cousu pour durer",
  "personnalisé",
  "vêtements à ton image",
  "Hauts-de-France",
  "à ta commande",
  "brodé pour toi",
];

const VOCAB_NON = [
  "brodé à la main / fait main",
  "métier à broder Tajima",
  "machine industrielle",
  "artisanal · #DIY · #HandMade",
  "Etsy · Amazon · marketplace",
  "Cormorant · DM Sans (dépréciées)",
  "Aucune référence à des concurrents",
];

const SERIF = 'var(--font-serif, "Newsreader", Georgia, serif)';
const SANS = 'var(--font-sans, "Hanken Grotesk", ui-sans-serif, system-ui, sans-serif)';

export default function BrandPage() {
  const [activeSeason, setActiveSeason] = useState<(typeof SEASONS)[number]["key"]>("valentin");
  const season = SEASONS.find((s) => s.key === activeSeason)!;

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", color: "#16324C", fontFamily: SANS }}>
      {/* ── En-tête ── */}
      <header style={{ marginBottom: 48 }}>
        <p style={{ fontSize: 11, letterSpacing: 2.5, textTransform: "uppercase", color: "#1E6E77", fontWeight: 700, margin: "0 0 10px" }}>
          Brand Book v1.0 · 2026 · source de vérité unique
        </p>
        <h1 style={{ fontFamily: SERIF, fontWeight: 500, fontSize: 48, lineHeight: 1.0, margin: "0 0 14px", letterSpacing: "-0.01em" }}>
          Brand Book —{" "}
          <em style={{ color: "#C23A2D" }}>trame sûre pour créer.</em>
        </h1>
        <p style={{ maxWidth: 680, fontSize: 15, lineHeight: 1.6, color: "#4a5a68", margin: "0 0 20px" }}>
          Périmètre : Instagram · Pinterest · Newsletter · Cartes de remerciement.
          Ce document pilote chaque génération de contenu dans le Hub.
          Les blocs <strong>verrouillés</strong> ne se rediscutent pas par output — on les change ici, nulle part ailleurs.
        </p>
        <div style={{ display: "inline-flex", gap: 8, background: "#F4EEE2", borderRadius: 12, padding: "10px 16px", fontSize: 13, color: "#56636e" }}>
          <strong style={{ color: "#16324C" }}>Règle d'or acquisition :</strong>{" "}
          40 % de réel (atelier, portée, clientes) + image éditoriale + carrousels.
          1 carte hyper-partageable pour 1 carte produit.
        </div>
      </header>

      {/* ── §1 : Palette ── */}
      <Section title="1 · Système couleur" sub="Trois étages. On fait tourner par-dessus, on ne remplace jamais la base.">
        <p style={{ fontSize: 12, letterSpacing: 1.5, textTransform: "uppercase", color: "#7a8894", fontWeight: 700, margin: "0 0 10px" }}>L'épine dorsale — fixe</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 20 }}>
          {SPINE.map((c) => (
            <ColorCard key={c.hex} {...c} />
          ))}
        </div>

        <p style={{ fontSize: 12, letterSpacing: 1.5, textTransform: "uppercase", color: "#C23A2D", fontWeight: 700, margin: "0 0 10px" }}>Le pop signature — fixe · 1 pour 6–9 cases</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10, marginBottom: 20 }}>
          {POP.map((c) => (
            <ColorCard key={c.hex} {...c} />
          ))}
        </div>
        <div style={{ background: "#FFF5F5", border: "1px solid rgba(194,58,45,.15)", borderRadius: 10, padding: "12px 16px", fontSize: 13, color: "#C23A2D", marginBottom: 20 }}>
          ⚠️ Rouge + teal en grands aplats côte à côte = interdit (ça vibre). Le blush et le crème sont les tampons.
        </div>

        <p style={{ fontSize: 12, letterSpacing: 1.5, textTransform: "uppercase", color: "#7a8894", fontWeight: 700, margin: "0 0 10px" }}>Seconds rôles — dosés</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10, marginBottom: 24 }}>
          {SECONDARY.map((c) => (
            <ColorCard key={c.hex} {...c} />
          ))}
        </div>

        <p style={{ fontSize: 12, letterSpacing: 1.5, textTransform: "uppercase", color: "#7a8894", fontWeight: 700, margin: "0 0 12px" }}>
          Amplificateurs saisonniers · ≤ 40 % · par-dessus l'épine
        </p>
        <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
          {SEASONS.map((s) => (
            <button
              key={s.key}
              onClick={() => setActiveSeason(s.key)}
              style={{
                fontFamily: SANS, fontSize: 13, fontWeight: 600, cursor: "pointer",
                padding: "7px 14px", borderRadius: 999,
                border: activeSeason === s.key ? "1px solid transparent" : "1px solid rgba(22,50,76,.14)",
                background: activeSeason === s.key ? s.accent : "#fff",
                color: activeSeason === s.key ? s.ink : "#16324C",
              }}
            >
              {s.label}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {season.colors.map((hex) => (
            <div key={hex} style={{ display: "flex", alignItems: "center", gap: 8, border: "1px solid rgba(22,50,76,.12)", borderRadius: 999, padding: "6px 12px 6px 6px", background: "#fff" }}>
              <span style={{ width: 20, height: 20, borderRadius: 999, background: hex, display: "inline-block", border: "0.5px solid rgba(22,50,76,.1)" }} />
              <span style={{ fontFamily: "monospace", fontSize: 12, color: "#56636e" }}>{hex}</span>
            </div>
          ))}
        </div>
      </Section>

      {/* ── §2 : Typo ── */}
      <Section title="2 · Typographie" sub="Newsreader porte l'émotion — l'italique est la voix intime. Hanken Grotesk porte l'information.">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <div style={{ border: "1px solid rgba(22,50,76,.12)", borderRadius: 14, padding: 24, background: "#fff" }}>
            <p style={{ fontSize: 11, letterSpacing: 1.5, textTransform: "uppercase", color: "#1E6E77", fontWeight: 700, margin: "0 0 12px" }}>Display · Newsreader</p>
            <p style={{ fontFamily: SERIF, fontSize: 32, lineHeight: 1.1, margin: "0 0 8px", fontWeight: 500 }}>Ça s&apos;écrit comment,</p>
            <p style={{ fontFamily: SERIF, fontSize: 32, lineHeight: 1.1, margin: "0 0 12px", fontStyle: "italic", color: "#C23A2D" }}>ton prénom&nbsp;?</p>
            <p style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 16, color: "#56636e", margin: 0 }}>La voix intime, en italique.</p>
          </div>
          <div style={{ border: "1px solid rgba(22,50,76,.12)", borderRadius: 14, padding: 24, background: "#fff" }}>
            <p style={{ fontSize: 11, letterSpacing: 1.5, textTransform: "uppercase", color: "#1E6E77", fontWeight: 700, margin: "0 0 12px" }}>Texte · Hanken Grotesk</p>
            <p style={{ fontFamily: SANS, fontWeight: 700, fontSize: 20, margin: "0 0 6px" }}>Brodé à ton image, à la commande.</p>
            <p style={{ fontFamily: SANS, fontWeight: 400, fontSize: 14, lineHeight: 1.6, color: "#56636e", margin: "0 0 12px" }}>
              400 Regular · 500 Medium · 700 Bold. Du CTA à la légende.
            </p>
            <div style={{ display: "inline-flex", background: "#C23A2D", color: "#F4EEE2", borderRadius: 999, padding: "8px 18px", fontFamily: SANS, fontWeight: 700, fontSize: 13 }}>
              Je commande →
            </div>
            <p style={{ fontFamily: SANS, fontSize: 11.5, color: "#9aa3aa", marginTop: 8, margin: "8px 0 0" }}>Manuscrit : réservé print/ludique uniquement (cartes, stickers)</p>
          </div>
        </div>
      </Section>

      {/* ── §3 : Funnel ── */}
      <Section title="3 · Le funnel en un coup d'œil" sub="4 surfaces, 3 étapes chacune. Convertir la base Etsy existante en membres du Club avant la portée froide.">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
          {FUNNEL.map((f) => (
            <div key={f.surface} style={{ borderRadius: 14, overflow: "hidden", border: "1px solid rgba(22,50,76,.1)" }}>
              <div style={{ background: f.surface === "Cartes de remerciement" ? "#EAB4C4" : f.bg, color: f.surface === "Cartes de remerciement" ? "#16324C" : "#F4EEE2", padding: "14px 18px" }}>
                <p style={{ fontFamily: SANS, fontWeight: 700, fontSize: 14, margin: 0 }}>{f.surface}</p>
                <p style={{ fontFamily: SANS, fontSize: 11, opacity: 0.8, margin: "3px 0 0" }}>{f.role}</p>
              </div>
              <div style={{ background: "#fff", padding: "14px 18px" }}>
                {f.steps.map((step, i) => (
                  <div key={i} style={{ display: "flex", gap: 10, marginBottom: i < f.steps.length - 1 ? 10 : 0 }}>
                    <span style={{ background: f.surface === "Cartes de remerciement" ? "#EAB4C4" : f.bg, color: f.surface === "Cartes de remerciement" ? "#16324C" : "#F4EEE2", borderRadius: 999, width: 20, height: 20, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, flexShrink: 0, marginTop: 1 }}>
                      {i + 1}
                    </span>
                    <div>
                      <p style={{ fontFamily: SANS, fontWeight: 600, fontSize: 13, margin: 0 }}>{step.label}</p>
                      <p style={{ fontFamily: SANS, fontSize: 12, color: "#56636e", margin: "2px 0 0", lineHeight: 1.4 }}>{step.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* ── §4 : Rubriques de contenu ── */}
      <Section title="4 · Les rubriques — trame de contenu" sub="8 rubriques. La trame stable pour créer sans se poser la question de quoi publier.">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 10 }}>
          {RUBRIQUES.map((r) => (
            <div key={r.label} style={{ border: "1px solid rgba(22,50,76,.1)", borderRadius: 12, padding: "14px 16px", background: "#fff" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <span style={{ fontSize: 20 }}>{r.emoji}</span>
                <div>
                  <p style={{ fontFamily: SANS, fontWeight: 700, fontSize: 13.5, margin: 0 }}>{r.label}</p>
                  <p style={{ fontFamily: SANS, fontSize: 11, color: "#1E6E77", margin: 0, fontWeight: 600 }}>{r.freq}</p>
                </div>
              </div>
              <p style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 14, color: "#16324C", lineHeight: 1.4, margin: "0 0 6px" }}>&ldquo;{r.ex}&rdquo;</p>
              <p style={{ fontFamily: SANS, fontSize: 11.5, color: "#7a8894", margin: 0 }}>{r.format} · {r.tone}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* ── §5 : Exemples posts digitaux ── */}
      <Section title="5 · Exemples de posts — format digital sur l'épine" sub="Ce à quoi ressemble un post Ypersoa. Marine dominant, chip rubrique, Newsreader, CTA rouge.">
        <div style={{ display: "flex", gap: 16, overflowX: "auto", paddingBottom: 16 }}>
          <SocialCard
            formatLabel="Post feed · lifestyle (4:5)"
            chip="le Club Ypersoa"
            chipBg="#EAB4C4"
            chipInk="#16324C"
            headline="Ça s'écrit comment,"
            headlineAccent="ton prénom ?"
            accentColor="#EAB4C4"
            cta="Je crée le mien →"
          />
          <SocialCard
            formatLabel="Post feed · Fête des Mères"
            chip="Fête des Mères"
            chipBg="#C23A2D"
            chipInk="#F4EEE2"
            headline="Un mot brodé,"
            headlineAccent="juste pour elle."
            accentColor="#EAB4C4"
            cta="Je commande →"
          />
          <SocialCard
            formatLabel="Post feed · POV"
            chip="POV"
            chipBg="#1E6E77"
            chipInk="#F4EEE2"
            headline="POV : tu ouvres"
            headlineAccent="le colis."
            accentColor="#97A886"
            cta="Personnalise le tien →"
          />
          <SocialCard
            formatLabel="Post feed · Affirmation"
            chip="Produit"
            chipBg="#16324C"
            chipInk="#EAB4C4"
            headline="Ton mot."
            headlineAccent="Ta couleur de fil."
            accentColor="#EAB4C4"
            cta="Voir les motifs →"
          />
        </div>
        <p style={{ fontSize: 12.5, color: "#7a8894", marginTop: 4, lineHeight: 1.5 }}>
          Fond marine fixe · chip varie selon la rubrique · CTA toujours en rouge coquelicot.
        </p>
      </Section>

      {/* ── §6 : Carrousel type ── */}
      <Section title="6 · La structure du carrousel" sub="Hook → Le choix → Le geste → CTA. Format 4:5, fond de l'épine dorsale.">
        <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 12 }}>
          <Slide index="01" tag="HOOK" bg="#16324C" ink="#F4EEE2">
            <span style={{ fontFamily: SERIF, fontSize: 30, lineHeight: 1.1, fontWeight: 500 }}>
              Ça s&apos;écrit comment,{" "}
              <em style={{ color: "#97A886" }}>ton prénom&nbsp;?</em>
            </span>
          </Slide>
          <Slide index="02" tag="LE CHOIX" bg="#1E6E77" ink="#F4EEE2">
            <span style={{ fontFamily: SERIF, fontSize: 26, lineHeight: 1.15, fontWeight: 500 }}>Ton mot, ton motif, ta couleur de fil.</span>
            <span style={{ fontFamily: SANS, fontSize: 13, opacity: 0.85, marginTop: 12 }}>10 couleurs · poitrine ou poignet</span>
          </Slide>
          <Slide index="03" tag="LE GESTE" bg="#F4EEE2" ink="#16324C" photo>
            <span style={{ fontFamily: SANS, fontSize: 12, color: "#8a7d69", lineHeight: 1.4 }}>
              <span style={{ fontFamily: SERIF, fontSize: 20, display: "block", color: "#16324C", marginBottom: 4 }}>Macro broderie</span>
              le fil, le relief — jamais la machine
            </span>
          </Slide>
          <Slide index="04" tag="CTA" bg="#C23A2D" ink="#F4EEE2">
            <span style={{ fontFamily: SERIF, fontSize: 26, lineHeight: 1.15, fontWeight: 500 }}>Choisis le motif qui te ressemble.</span>
            <span style={{ fontFamily: SANS, fontSize: 14, fontWeight: 700, marginTop: 14, borderBottom: "2px solid #F4EEE2", paddingBottom: 2, display: "inline-block" }}>
              Je commande →
            </span>
          </Slide>
        </div>
        <p style={{ fontSize: 12.5, color: "#7a8894", marginTop: 10, lineHeight: 1.5 }}>
          Le CTA (diapo 04) est toujours <strong style={{ color: "#C23A2D" }}>rouge coquelicot</strong> — c&apos;est le seul moment de pop fort dans le carrousel.
          Pas de saison sur le CTA, le rouge est le rouge.
        </p>
      </Section>

      {/* ── §7 : Grille 3×3 ── */}
      <Section title="7 · La grille 3×3" sub="1 carte hyper-partageable pour 1 carte produit. Le pop est une ponctuation, la photo est la phrase.">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6, maxWidth: 480, marginBottom: 16 }}>
          {[
            { kind: "typo", bg: "#1E6E77", ink: "#F4EEE2", label: "POV", text: "POV : tu offres ton mot brodé." },
            { kind: "photo", label: "Pièce portée" },
            { kind: "typo", bg: "#C23A2D", ink: "#F4EEE2", label: "Citation", text: "« Un point à la fois. »" },
            { kind: "photo", label: "Macro fil" },
            { kind: "typo", bg: "#16324C", ink: "#F4EEE2", label: "Produit", text: "Le Club — brodé pour toi." },
            { kind: "photo", label: "Flat-lay crème" },
            { kind: "photo", label: "Moment cadeau" },
            { kind: "typo", bg: "#EAB4C4", ink: "#16324C", label: "Question", text: "Ça s'écrit comment ?" },
            { kind: "photo", label: "Détail initiale" },
          ].map((t, i) =>
            t.kind === "photo" ? (
              <div key={i} style={{ aspectRatio: "1/1", borderRadius: 4, background: "#e7ddcd", border: "1.5px dashed rgba(22,50,76,.2)", display: "flex", alignItems: "center", justifyContent: "center", padding: 8, textAlign: "center" }}>
                <span style={{ fontSize: 11, color: "#8a7d69", lineHeight: 1.3 }}>{t.label}</span>
              </div>
            ) : (
              <div key={i} style={{ aspectRatio: "1/1", borderRadius: 4, background: t.bg, color: t.ink, display: "flex", flexDirection: "column", justifyContent: "center", padding: 12, textAlign: "center" }}>
                <span style={{ fontSize: 9, letterSpacing: 1, textTransform: "uppercase", fontWeight: 700, opacity: 0.75, marginBottom: 6 }}>{t.label}</span>
                <span style={{ fontFamily: SERIF, fontSize: 14, lineHeight: 1.25 }}>{t.text}</span>
              </div>
            ),
          )}
        </div>
        <p style={{ fontSize: 12.5, color: "#7a8894", lineHeight: 1.5, maxWidth: 480 }}>
          5 cases photo (réel) · 4 cases typo (teal · rouge · marine · blush).
          Le rouge n&apos;apparaît <strong>qu&apos;une fois sur 9</strong>.
        </p>
      </Section>

      {/* ── §8 : Vocabulaire ── */}
      <Section title="8 · Le vocabulaire" sub="Ce qu'on dit, ce qu'on ne dit jamais. Le produit n'est jamais « fait main » ni lié à la machine.">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <div style={{ border: "1px solid rgba(30,110,119,.25)", borderRadius: 14, padding: "18px 20px", background: "#fff" }}>
            <p style={{ fontSize: 11, letterSpacing: 1.5, textTransform: "uppercase", fontWeight: 700, color: "#1E6E77", margin: "0 0 12px" }}>✓ Autorisé public</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {VOCAB_OK.map((v) => (
                <span key={v} style={{ background: "#F0F7F8", color: "#1E6E77", borderRadius: 999, padding: "5px 12px", fontSize: 13, fontWeight: 500 }}>{v}</span>
              ))}
            </div>
          </div>
          <div style={{ border: "1px solid rgba(194,58,45,.2)", borderRadius: 14, padding: "18px 20px", background: "#fff" }}>
            <p style={{ fontSize: 11, letterSpacing: 1.5, textTransform: "uppercase", fontWeight: 700, color: "#C23A2D", margin: "0 0 12px" }}>✕ Interdit public</p>
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, lineHeight: 1.8, color: "#41505c" }}>
              {VOCAB_NON.map((v) => <li key={v}>{v}</li>)}
            </ul>
          </div>
        </div>
      </Section>

      {/* ── §9 : Garde-fous ── */}
      <Section title="9 · Les garde-fous" sub="Verrouillés. En cas de doute entre « joli » et « conforme » : les garde-fous gagnent.">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <GuardCard tone="no" items={[
            "Rouge + teal en grands aplats côte à côte",
            "Terracotta en couleur primaire ou CTA",
            "« fait main » · « artisanal » · #DIY · #HandMade",
            "Toute mention de machine (Tajima, etc.) en public",
            "Cormorant · DM Sans (dépréciées)",
            "Deux tuiles typo côte à côte dans la grille",
            "Liens externes autres que ypersoa.fr",
            "Références concurrents (Ralph Lauren, Etsy…)",
          ]} />
          <GuardCard tone="yes" items={[
            "« brodé pour toi · à la commande »",
            "Épine dorsale reconnaissable d'un coup d'œil",
            "Newsreader + Hanken Grotesk uniquement",
            "Le geste, le fil, le relief en macro",
            "Fond crème pour respirer",
            "1 carte partageable / 1 carte produit",
            "Rouge coquelicot sur le CTA, nulle part ailleurs",
            "Le blush comme tampon entre les couleurs fortes",
          ]} />
        </div>
      </Section>

      {/* ── Tokens JSON ── */}
      <Section title="10 · Tokens — câbler dans le Hub" sub="Variables à aligner en CSS / thème Tailwind. Source : §9 du Brand Book.">
        <pre style={{ fontFamily: "monospace", fontSize: 12, lineHeight: 1.6, background: "#F4EEE2", borderRadius: 12, padding: 20, overflowX: "auto", color: "#16324C" }}>
{`{
  "colors": {
    "spine": { "marine": "#16324C", "teal": "#1E6E77", "creme": "#F4EEE2" },
    "pop":   { "rouge": "#C23A2D", "blush": "#EAB4C4" },
    "secondary": { "ambre": "#E0942E", "sauge": "#97A886" }
  },
  "typography": { "display": "Newsreader", "text": "Hanken Grotesk",
    "peps": "manuscrit — print & ludique uniquement",
    "banned": ["Cormorant", "DM Sans"] },
  "rules": {
    "pop_ratio": "1 pour 6 à 9 cases",
    "red_teal_adjacent": false,
    "cta_color": "#C23A2D",
    "carousel": "Hook → Le choix → Le geste → CTA · 4:5",
    "grid": "1 partageable pour 1 produit",
    "external_links": "ypersoa.fr uniquement"
  }
}`}
        </pre>
      </Section>

      <p style={{ fontSize: 12, color: "#8a8f96", marginTop: 8, lineHeight: 1.5, marginBottom: 48 }}>
        Source de vérité : <code>referentiels/brand voice design system/</code> · Brand Book global v1.0 · 2026.
        Ce document fait foi pour l&apos;identité visuelle et le discours public.
      </p>
    </div>
  );
}

// ── Sous-composants ───────────────────────────────────────────────────────────

function Section({ title, sub, children }: { title: string; sub: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 60 }}>
      <h2 style={{ fontFamily: SERIF, fontWeight: 600, fontSize: 26, margin: "0 0 4px", letterSpacing: "-0.01em" }}>{title}</h2>
      <p style={{ fontSize: 13.5, color: "#56636e", margin: "0 0 20px", maxWidth: 640, lineHeight: 1.5 }}>{sub}</p>
      {children}
    </section>
  );
}

function ColorCard({ name, hex, role, ink }: { name: string; hex: string; role: string; ink: string }) {
  return (
    <div style={{ border: "1px solid rgba(22,50,76,.1)", borderRadius: 12, overflow: "hidden", background: "#fff" }}>
      <div style={{ background: hex, height: 72, display: "flex", alignItems: "flex-end", padding: "8px 12px" }}>
        <span style={{ color: ink, fontFamily: "monospace", fontSize: 12, fontWeight: 700 }}>{hex}</span>
      </div>
      <div style={{ padding: "10px 12px 14px" }}>
        <div style={{ fontFamily: SERIF, fontWeight: 600, fontSize: 15 }}>{name}</div>
        <p style={{ margin: "3px 0 0", fontSize: 12, lineHeight: 1.4, color: "#56636e" }}>{role}</p>
      </div>
    </div>
  );
}

function Slide({ index, tag, bg, ink, photo, children }: { index: string; tag: string; bg: string; ink: string; photo?: boolean; children: React.ReactNode }) {
  return (
    <div style={{
      flex: "0 0 auto", width: 256, aspectRatio: "4 / 5", borderRadius: 12, background: bg, color: ink,
      position: "relative", display: "flex", flexDirection: "column", justifyContent: "center",
      padding: 26, textAlign: "left",
      border: photo ? "1.5px dashed rgba(22,50,76,.2)" : "1px solid transparent",
    }}>
      <span style={{ position: "absolute", top: 13, left: 15, fontFamily: "monospace", fontSize: 11, fontWeight: 700, opacity: 0.55 }}>{index}</span>
      <span style={{ position: "absolute", top: 13, right: 15, fontSize: 9, letterSpacing: 1.2, textTransform: "uppercase", fontWeight: 700, opacity: 0.65 }}>{tag}</span>
      <div style={{ display: "flex", flexDirection: "column" }}>{children}</div>
    </div>
  );
}

function SocialCard({
  formatLabel,
  chip,
  chipBg,
  chipInk,
  headline,
  headlineAccent,
  accentColor,
  cta,
}: {
  formatLabel: string;
  chip: string;
  chipBg: string;
  chipInk: string;
  headline: string;
  headlineAccent: string;
  accentColor: string;
  cta: string;
}) {
  return (
    <div style={{ flex: "0 0 auto", width: 220 }}>
      <p style={{ fontFamily: SANS, fontSize: 11, color: "#7a8894", margin: "0 0 8px", letterSpacing: 0.3 }}>
        {formatLabel}
      </p>
      <div
        style={{
          width: 220,
          aspectRatio: "4 / 5",
          background: "#16324C",
          borderRadius: 16,
          padding: "20px 18px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Chip rubrique */}
        <div>
          <span
            style={{
              display: "inline-block",
              background: chipBg,
              color: chipInk,
              borderRadius: 999,
              padding: "4px 12px",
              fontFamily: SANS,
              fontSize: 11,
              fontWeight: 600,
            }}
          >
            {chip}
          </span>
        </div>

        {/* Headline */}
        <div>
          <p
            style={{
              fontFamily: SERIF,
              fontSize: 26,
              lineHeight: 1.15,
              color: "#F4EEE2",
              margin: "0 0 4px",
              fontWeight: 500,
            }}
          >
            {headline}
          </p>
          <p
            style={{
              fontFamily: SERIF,
              fontSize: 26,
              lineHeight: 1.15,
              fontStyle: "italic",
              color: accentColor,
              margin: 0,
              fontWeight: 500,
            }}
          >
            {headlineAccent}
          </p>
        </div>

        {/* CTA */}
        <div>
          <button
            type="button"
            style={{
              background: "#C23A2D",
              color: "#F4EEE2",
              border: "none",
              borderRadius: 999,
              padding: "10px 18px",
              fontFamily: SANS,
              fontSize: 12,
              fontWeight: 700,
              cursor: "default",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            {cta}
          </button>
        </div>
      </div>
    </div>
  );
}

function GuardCard({ tone, items }: { tone: "no" | "yes"; items: string[] }) {
  const isNo = tone === "no";
  return (
    <div style={{ border: `1px solid ${isNo ? "rgba(194,58,45,.25)" : "rgba(30,110,119,.25)"}`, borderRadius: 14, padding: "18px 20px", background: "#fff" }}>
      <p style={{ fontSize: 11, letterSpacing: 1.5, textTransform: "uppercase", fontWeight: 700, color: isNo ? "#C23A2D" : "#1E6E77", margin: "0 0 12px" }}>
        {isNo ? "✕ Jamais" : "✓ Toujours"}
      </p>
      <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13.5, lineHeight: 1.75, color: "#41505c" }}>
        {items.map((it) => <li key={it}>{it}</li>)}
      </ul>
    </div>
  );
}
