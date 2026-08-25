"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { VisuelSection } from "./sections/VisuelSection";
import { PlaybookSection } from "./sections/PlaybookSection";
import { MoodSection } from "./sections/MoodSection";

type Tab = "livre" | "visuel" | "playbook" | "mood";

// ── Le Livre v1.1 · 2026 ───────────────────────────────────────────────────────
// Rendu Hub de docs/VOIX_YPERSOA.md — source active pour la voix, le vocabulaire
// brand-safe, les piliers et le Range Bisous. Le contenu est dupliqué ici à
// dessein (page de lecture, pas un fetch du markdown) : en cas de divergence,
// docs/VOIX_YPERSOA.md fait foi, cf. §9 Gouvernance plus bas.

const MARINE = "#16324C";
const TEAL = "#1E6E77";
const CREME = "#F4EEE2";
const ROUGE = "#C23A2D";
const BLUSH = "#F4B4D2";
const AMBRE = "#E0942E";
const SAUGE = "#97A886";

const SERIF = 'var(--font-serif, "Newsreader", Georgia, serif)';
const SANS = 'var(--font-sans, "Hanken Grotesk", ui-sans-serif, system-ui, sans-serif)';

const TERRITOIRES = [
  { nom: "Le mot", question: "Qu'est-ce que tu veux faire exister ?", montre: "prénom, initiale, mot de tribu, choix de fil", phrase: "Un cœur, une initiale. C'est tout. C'est assez.", color: TEAL },
  { nom: "Le geste", question: "Pourquoi cette pièce mérite-t-elle confiance ?", montre: "fil, relief, choix, préparation, atelier", phrase: "Un fil choisi, un mot placé, une pièce faite pour suivre.", color: MARINE },
  { nom: "La présence", question: "Qu'est-ce que ça change pour qui la porte ?", montre: "cadeau ouvert, duo, scène vécue, souvenir", phrase: "Même loin, il y a des mots qui restent près de nous.", color: ROUGE },
];

const TENSION = {
  garder: ["intime, net, vivant", "premium accessible", "coloré avec retenue", "atelier réel et précis", "humour de connivence"],
  fuir: ["mièvre, « mum-beige », surchargé de cœurs", "précieux, distant, luxe codifié", "beige uniforme ou pop sans raison", "folklore du fait-main, jargon industriel", "sarcasme, chasse à la tendance, ton commercial pressant"],
};

const CRANS = [
  { n: 3, nom: "Citron", fait: "Plein mordant, connivence, autodérision de fondatrice", ou: "Communauté, réactif, coulisses drôles, swagger B2B", ex: "« On juge pas les gens qui offrent le même sweat à toute la famille. On appelle ça un thème. »", color: AMBRE },
  { n: 2, nom: "Zeste", fait: "Le défaut : chaleur + un clin d'œil + un détail vrai", ou: "Captions, PDP, cartes, intros de blog, emails", ex: "« Bisou Cœur, Bisous Sœur. Deux mots, une vie de chamailleries. »", color: TEAL },
  { n: 1, nom: "Crème", fait: "Tendre et précis, aucune vanne, jamais mièvre", ou: "Naissance, déclaration, présence", ex: "« Un cœur. Une initiale. Et déjà tant de choses à dire. »", color: BLUSH },
  { n: 0, nom: "Coton", fait: "Tendresse pure, zéro clin d'œil, registre sacré", ou: "Deuil, hommage, mémoire", ex: "« Certains mots ne se remplacent pas. On les brode pour qu'ils restent. »", color: "#C9C2B4" },
];

const VOCAB_OK = [
  ["brodé à la commande / brodé à la demande", "Made in France / fabriqué en France (toutes casses)"],
  ["brodé dans notre atelier de Wattrelos", "brodé en France (risque DGCCRF, même famille)"],
  ["brodé chez nous, dans le Nord", "fait main, brodé à la main, artisanal(e)"],
  ["brodé à ton prénom / ton mot / selon tes envies", "« Tajima TMEZ » ; Etsy, marketplace"],
];

const TAJIMA = [
  { support: "Produit, caption, Mood, réseaux sociaux (défaut partout)", formule: "« brodé à la commande »" },
  { support: "Contenu atelier court", formule: "« brodé dans notre atelier de Wattrelos »" },
  { support: "Article savoir-faire long, vidéo process, fiche backend Hub", formule: "« brodé sur métier Tajima » une fois, puis retour au langage humain" },
];

const RANGE_BISOUS = [
  { nom: "Bisou Cœur", qui: "signature-mère", cran: "2 · Zeste", occasion: "universel" },
  { nom: "Bisous Sœur", qui: "la sœur / la frangine", cran: "2 → 3", occasion: "anniversaire, « juste parce que »" },
  { nom: "Bisous Fleur", qui: "la douce, la nouvelle vie", cran: "1 · Crème", occasion: "naissance, merci tendre" },
  { nom: "Bisous Bonheur", qui: "celui/celle qu'on félicite", cran: "2 · Zeste", occasion: "mariage, emménagement" },
  { nom: "Bisous Vainqueur", qui: "celui/celle qui l'a eu", cran: "2 · Zeste", occasion: "diplôme, réussite, promo" },
  { nom: "Bisous Meilleur(e)", qui: "le/la BFF", cran: "2 · Zeste", occasion: "amitié" },
  { nom: "Bisous Voyageur", qui: "celui qui part", cran: "1 → 2", occasion: "départ, expat" },
  { nom: "Bisous Rêveur", qui: "l'enfant, l'idéaliste", cran: "1 · Crème", occasion: "naissance, encouragement" },
  { nom: "Bisous Grand Cœur", qui: "le/la généreux·se", cran: "1 · Crème", occasion: "merci profond, marraine/parrain" },
  { nom: "Bisous Râleur", qui: "celui qui ronchonne (et qu'on adore)", cran: "3 · Citron", occasion: "couple, famille, fête des pères" },
  { nom: "Bisous Ronfleur", qui: "l'amoureux·se qui scie du bois", cran: "3 · Citron", occasion: "St-Valentin décalée, couple" },
  { nom: "Bisous Farceur", qui: "le boute-en-train", cran: "3 · Citron", occasion: "anniversaire pote" },
  { nom: "Bisous Velotafeur", qui: "celui qui pédale malgré tout", cran: "3 · Citron", occasion: "tribu vélo" },
  { nom: "Bisous Brodeur", qui: "carte-méta, voix atelier", cran: "2 · Zeste", occasion: "universel, seule carte à question d'intention" },
];

const JOBS = [
  { job: "Portée", verbe: "tag / identifie", rapporte: "des abonnés (nouvelle personne amenée)", cran: "Citron / Zeste uniquement" },
  { job: "Chaleur", verbe: "dis-nous / raconte", rapporte: "de l'UGC, de la profondeur", cran: "Zeste / Crème" },
  { job: "Intention", verbe: "pour qui / tu broderais", rapporte: "signal d'envie, sans vendre", cran: "Réservé à Bisous Brodeur" },
];

const PILIERS = [
  { pilier: "Connexion", angle: "manifeste, lien, souvenir", formats: "POV, citation, note d'atelier", cran: "1–2", outil: "/social/connexion" },
  { pilier: "Réassurance", angle: "avis, soin, délais validés", formats: "avis, déballage, FAQ Story", cran: "2", outil: "/social/avis" },
  { pilier: "Qualification", angle: "motif, support, couleur", formats: "produit, pick-one, macro", cran: "2", outil: "/social" },
  { pilier: "Preuve", angle: "atelier, commande, geste", formats: "coulisses, process, reveal", cran: "2→3", outil: "/social/connexion (Preuve)" },
  { pilier: "Occasions", angle: "moment précis, cadeau", formats: "carrousel occasion, scène", cran: "1–2", outil: "pinterest_strategy.json" },
  { pilier: "Communauté", angle: "Club, prénoms, UGC", formats: "prénom du mois, repost, question", cran: "3", outil: "/social/connexion (Communauté)" },
];

const CRAN_HUMEUR = [
  { humeurs: "Tendresse, Nostalgie douce, Amour assumé", cran: "1 · Crème" },
  { humeurs: "Fierté, Complicité, Quotidien magique, Retour en forme", cran: "2 · Zeste" },
  { humeurs: "Joyeux bordel, Espièglerie, Surprise", cran: "3 · Citron" },
];

const CARTE_RECIT = `### Carte récit — [motif / occasion]
- Territoire principal : mot / geste / présence
- Vérité humaine : ce que la personne veut réellement dire ou ressentir
- Preuve concrète : pièce, fil, geste atelier, avis ou scène réelle
- Motif + support + couleur :
- Pilier stratégique :
- Cran de ton : 3 Citron / 2 Zeste / 1 Crème / 0 Coton
- Phrase noyau (≤ 14 mots) :
- Social : format + question de fin (job : portée / chaleur / intention)
- Blog : requête + réponse utile (famille choisir / garder / comprendre)
- Mood : humeur + décor + mot
- « Bisous ___ » associé :
- Formulations interdites à éviter :`;

const GOUVERNANCE = [
  { rang: "1", nom: "docs/VOIX_YPERSOA.md — « Le Livre »", role: "Direction, expression, système de contenu. Actif." },
  { rang: "2", nom: "lib/brand-rules.ts", role: "Vocabulaire, allégations, tutoiement, crans, contextes Tajima. Verrou technique." },
  { rang: "3", nom: "referentiels/charte_editoriale.json", role: "Catalogue produit, délais, détail du pilier Connexion. Sections graphique/ton/piliers = historiques." },
  { rang: "4", nom: "CLAUDE.md", role: "Journal de sessions et décisions architecturales. Référence historique." },
  { rang: "5", nom: "Les Cartes récit", role: "Décisions de campagne et de contenu." },
  { rang: "6", nom: "Référentiels de production", role: "Motifs, fils, saisonnalité, casting — appliquent, ne redéfinissent pas." },
];

const CHECKLIST = [
  "Un mot, un geste ou une présence identifiable ?",
  "Au moins une preuve réelle (fil, pièce, commande, usage, avis, scène) ?",
  "Palette et typo actives — pas les anciennes ?",
  "Cran cohérent, un seul par souffle ? Le coup tape dans le bon sens ?",
  "Origine / fabrication / délai compatibles avec le brand-safe ?",
  "Le CTA de fin est-il du bon job et compatible avec le cran ?",
  "Reliable à une Carte récit, un motif, un pilier stratégique ?",
];

const TABS: { id: Tab; label: string }[] = [
  { id: "livre", label: "Le Livre" },
  { id: "visuel", label: "Le Visuel" },
  { id: "playbook", label: "Le Playbook" },
  { id: "mood", label: "Le Studio Mood" },
];

const VALID_TABS: Tab[] = ["livre", "visuel", "playbook", "mood"];

const TAB_INTRO: Record<Tab, React.ReactNode> = {
  livre: (
    <>
      Une seule destination : cette page absorbe le Brand Book, le Playbook et le kit Mood, qui n&apos;existent
      plus comme pages séparées — ainsi que les sections concurrentes de <code>charte_editoriale.json</code> et
      de <code>CLAUDE.md</code> §2/§5. Ces sources restent lisibles comme historique, elles ne font plus foi.
    </>
  ),
  visuel: <>Les tokens exacts du système visuel : palette, typographie, funnel par surface et rubriques de contenu.</>,
  playbook: <>Les fiches-recettes du calendrier Instagram : hooks, gabarits, mécanisme pick-one, rythme de semaine.</>,
  mood: <>Le guide de production illustré du kit Mood brodé, à l&apos;usage de Maï — planche par planche.</>,
};

export default function LeLivrePage() {
  return (
    <Suspense fallback={null}>
      <LeLivrePageInner />
    </Suspense>
  );
}

function LeLivrePageInner() {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const initialTab = (VALID_TABS as string[]).includes(tabParam ?? "") ? (tabParam as Tab) : "livre";
  const [tab, setTab] = useState<Tab>(initialTab);

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", color: MARINE, fontFamily: SANS }}>
      {/* ── En-tête ── */}
      <header style={{ marginBottom: 32 }}>
        <p style={{ fontSize: 11, letterSpacing: 2.5, textTransform: "uppercase", color: TEAL, fontWeight: 700, margin: "0 0 10px" }}>
          Le Livre · v1.1 · 2026 · source active
        </p>
        <h1 style={{ fontFamily: SERIF, fontWeight: 500, fontSize: 48, lineHeight: 1.0, margin: "0 0 14px", letterSpacing: "-0.01em" }}>
          Un mot qui compte. <em style={{ color: ROUGE }}>Une pièce à porter.</em>
        </h1>
        <p style={{ maxWidth: 700, fontSize: 15, lineHeight: 1.6, color: "#4a5a68", margin: "0 0 20px" }}>
          {TAB_INTRO[tab]}
        </p>
      </header>

      {/* ── Onglets ── */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 48, borderBottom: "1px solid rgba(22,50,76,.1)", paddingBottom: 14 }}>
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            style={{
              fontFamily: SANS,
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
              padding: "8px 16px",
              borderRadius: 999,
              border: "none",
              background: tab === t.id ? MARINE : CREME,
              color: tab === t.id ? CREME : MARINE,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "visuel" && <VisuelSection />}
      {tab === "playbook" && <PlaybookSection />}
      {tab === "mood" && <MoodSection />}
      {tab === "livre" && <LivreNarrative onNavigate={setTab} />}
    </div>
  );
}

function LivreNarrative({ onNavigate }: { onNavigate: (t: Tab) => void }) {
  return (
    <>
      {/* ── §0 Ambition ── */}
      <Section title="0 · L'ambition" sub="Un sweat, c'est anonyme. Puis quelqu'un y met un mot, et ce vêtement cesse d'être un vêtement.">
        <blockquote style={{ borderLeft: `3px solid ${ROUGE}`, margin: "0 0 18px", padding: "2px 0 2px 20px" }}>
          <p style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 24, lineHeight: 1.35, color: MARINE, margin: 0 }}>
            On ne vend pas de la broderie. On rend visible et portable un mot qui compte.
          </p>
        </blockquote>
        <p style={{ fontSize: 14.5, lineHeight: 1.65, color: "#4a5a68", maxWidth: 720, margin: "0 0 14px" }}>
          L&apos;ambition tient en une phrase : devenir <em>la marque des mots qu&apos;on garde</em>. Pas la plus grosse.
          La plus difficile à jeter. Celle qui prouve, depuis un atelier du Nord, qu&apos;un objet fait à la commande
          peut porter plus de vie qu&apos;un objet de luxe.
        </p>
        <div style={{ background: CREME, borderRadius: 12, padding: "14px 18px", fontSize: 13.5, color: "#56636e", maxWidth: 720 }}>
          <strong style={{ color: MARINE }}>Le filtre :</strong> si un post, un article, une carte ou un visuel ne fait exister
          ni le mot, ni le geste, ni la présence — il parle d&apos;une autre marque.
        </div>
      </Section>

      {/* ── §1 Territoires + tension ── */}
      <Section title="1 · La marque, verrouillée" sub="Chaque contenu choisit un territoire principal et en fait sentir un second.">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12, marginBottom: 24 }}>
          {TERRITOIRES.map((t) => (
            <div key={t.nom} style={{ border: "1px solid rgba(22,50,76,.1)", borderRadius: 14, overflow: "hidden", background: "#fff" }}>
              <div style={{ background: t.color, color: CREME, padding: "12px 16px" }}>
                <p style={{ fontFamily: SERIF, fontWeight: 600, fontSize: 18, margin: 0 }}>{t.nom}</p>
              </div>
              <div style={{ padding: "14px 16px" }}>
                <p style={{ fontSize: 12.5, fontWeight: 600, color: "#56636e", margin: "0 0 8px" }}>{t.question}</p>
                <p style={{ fontSize: 12, color: "#7a8894", margin: "0 0 10px" }}>{t.montre}</p>
                <p style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 14, color: MARINE, margin: 0 }}>« {t.phrase} »</p>
              </div>
            </div>
          ))}
        </div>

        <p style={{ fontSize: 12, letterSpacing: 1.5, textTransform: "uppercase", color: "#7a8894", fontWeight: 700, margin: "0 0 10px" }}>
          La tension à préserver
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <GuardList tone="yes" title="À conserver" items={TENSION.garder} />
          <GuardList tone="no" title="À fuir" items={TENSION.fuir} />
        </div>
      </Section>

      {/* ── §2 Voix / thermostat ── */}
      <Section title="2 · La voix — le thermostat citron" sub="On parle comme la copine qui te charrie parce qu'elle t'aime. Le jeu, c'est le dosage.">
        <div style={{ background: "#FFF5F5", border: `1px solid rgba(194,58,45,.15)`, borderRadius: 10, padding: "12px 16px", fontSize: 13, color: ROUGE, marginBottom: 20, maxWidth: 720 }}>
          <strong>La direction du coup :</strong> on tape toujours <em>avec</em> la cliente, contre le monde — jamais contre elle,
          jamais contre qui reçoit le cadeau.
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
          {CRANS.map((c) => (
            <div key={c.n} style={{ display: "grid", gridTemplateColumns: "56px 1fr", border: "1px solid rgba(22,50,76,.1)", borderRadius: 12, overflow: "hidden", background: "#fff" }}>
              <div style={{ background: c.color, display: "flex", alignItems: "center", justifyContent: "center", color: c.n <= 1 ? MARINE : CREME, fontFamily: SERIF, fontSize: 26, fontWeight: 600 }}>
                {c.n}
              </div>
              <div style={{ padding: "12px 16px" }}>
                <p style={{ margin: "0 0 3px", fontFamily: SANS, fontWeight: 700, fontSize: 14 }}>
                  {c.nom} {c.n === 2 && <span style={{ fontSize: 10.5, color: TEAL, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>défaut</span>}
                </p>
                <p style={{ margin: "0 0 6px", fontSize: 12.5, color: "#56636e" }}>{c.fait} · <span style={{ color: "#9aa3aa" }}>{c.ou}</span></p>
                <p style={{ margin: 0, fontFamily: SERIF, fontStyle: "italic", fontSize: 13.5, color: MARINE }}>{c.ex}</p>
              </div>
            </div>
          ))}
        </div>

        <div style={{ background: CREME, borderRadius: 12, padding: "14px 18px", fontSize: 13.5, color: "#56636e", maxWidth: 720 }}>
          <strong style={{ color: MARINE }}>La règle du dial :</strong> le défaut est Zeste. On monte à Citron seulement entre nous,
          jamais sur une pièce. On descend à Crème/Coton dès que l&apos;émotion de quelqu&apos;un est en jeu.
          Un souffle = un cran. <strong style={{ color: MARINE }}>Le Coton n&apos;est pas une faiblesse, c&apos;est la caution</strong> —
          le silence sur un deuil achète le mordant ailleurs.
        </div>
      </Section>

      {/* ── §3 Système visuel (résumé) ── */}
      <Section title="3 · Le système visuel" sub="Une décision, pas une addition. Détail complet et hex exacts sur le Brand Book.">
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
          {[
            { name: "Marine", hex: MARINE },
            { name: "Teal", hex: TEAL },
            { name: "Crème", hex: CREME },
            { name: "Rouge coquelicot", hex: ROUGE },
            { name: "Blush", hex: BLUSH },
          ].map((c) => (
            <div key={c.hex} style={{ display: "flex", alignItems: "center", gap: 8, border: "1px solid rgba(22,50,76,.12)", borderRadius: 999, padding: "6px 12px 6px 6px", background: "#fff" }}>
              <span style={{ width: 20, height: 20, borderRadius: 999, background: c.hex, display: "inline-block", border: "0.5px solid rgba(22,50,76,.1)" }} />
              <span style={{ fontSize: 12.5, color: "#56636e" }}>{c.name}</span>
            </div>
          ))}
        </div>
        <p style={{ fontSize: 13.5, lineHeight: 1.6, color: "#56636e", maxWidth: 720, margin: 0 }}>
          Typo identité : <strong>Newsreader</strong> (serif, l&apos;âme — l&apos;italique est la voix intime) +{" "}
          <strong>Hanken Grotesk</strong> (sans, le clair). Le device signature : le <strong>cœur-de-mots</strong> (contour fait
          des occasions du Range Bisous, §5) et le <strong>nœud entrelacé</strong> (carte deuil, seul, silencieux).{" "}
          <TabInlineLink onClick={() => onNavigate("visuel")} label="Tokens complets, funnel, rubriques ↗" />
        </p>
      </Section>

      {/* ── §4 Vocabulaire ── */}
      <Section title="4 · Le vocabulaire brand-safe" sub="Lu par les générateurs (brand-rules.ts → checkBrandSafety), visible par les humains. Non négociable.">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0, border: "1px solid rgba(22,50,76,.1)", borderRadius: 12, overflow: "hidden", marginBottom: 18 }}>
          <div style={{ background: TEAL, color: CREME, padding: "10px 16px", fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase" }}>On dit</div>
          <div style={{ background: ROUGE, color: CREME, padding: "10px 16px", fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase" }}>On ne dit jamais</div>
          {VOCAB_OK.map((row, i) => (
            <>
              <div key={`ok-${i}`} style={{ padding: "10px 16px", fontSize: 13, background: "#fff", borderTop: "1px solid rgba(22,50,76,.06)" }}>{row[0]}</div>
              <div key={`non-${i}`} style={{ padding: "10px 16px", fontSize: 13, background: "#fff", borderTop: "1px solid rgba(22,50,76,.06)", color: "#8a4a44" }}>{row[1]}</div>
            </>
          ))}
        </div>

        <p style={{ fontSize: 12, letterSpacing: 1.5, textTransform: "uppercase", color: "#7a8894", fontWeight: 700, margin: "0 0 10px" }}>
          Tajima — la preuve technique se dose
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {TAJIMA.map((t) => (
            <div key={t.support} style={{ display: "grid", gridTemplateColumns: "1fr 1.2fr", gap: 12, fontSize: 13, border: "1px solid rgba(22,50,76,.08)", borderRadius: 10, padding: "10px 14px", background: "#fff" }}>
              <span style={{ color: "#56636e" }}>{t.support}</span>
              <span style={{ color: MARINE, fontWeight: 600 }}>{t.formule}</span>
            </div>
          ))}
        </div>
      </Section>

      {/* ── §5 Range Bisous ── */}
      <Section title="5 · La signature — le Range Bisous" sub="« Bisou Cœur » n'est pas une signature, c'est un moteur.">
        <p style={{ fontSize: 14, lineHeight: 1.6, color: "#4a5a68", maxWidth: 720, margin: "0 0 14px" }}>
          Forme : <code>Bisous [X]</code>, où X rime en <strong>-eur / -œur</strong>. La mère au singulier
          (<em>Bisou Cœur</em>), les déclinaisons au pluriel.
        </p>
        <div style={{ background: CREME, borderRadius: 12, padding: "14px 18px", fontSize: 13.5, color: "#56636e", marginBottom: 20, maxWidth: 720 }}>
          <strong style={{ color: MARINE }}>Le filtre :</strong> un « Bisous ___ » n&apos;existe que s&apos;il nomme quelqu&apos;un,
          une tribu ou un moment vrai. La rime est le véhicule, jamais le contenu. <em>Velotafeur</em> = une vraie personne.{" "}
          <em>Aspirateur</em> = une rime creuse. Bloqués par le filtre : Aspirateur, Radiateur, Ordinateur, Congélateur.
        </div>

        <div style={{ overflowX: "auto", marginBottom: 20 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: MARINE, color: CREME }}>
                {["« Bisous ___ »", "Qui il nomme", "Cran défaut", "Occasion"].map((h) => (
                  <th key={h} style={{ textAlign: "left", padding: "8px 12px", fontWeight: 600, fontSize: 11.5, letterSpacing: 0.4 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {RANGE_BISOUS.map((r, i) => (
                <tr key={r.nom} style={{ background: i % 2 === 0 ? "#fff" : "#FBF9F5" }}>
                  <td style={{ padding: "8px 12px", fontWeight: 700, color: MARINE }}>{r.nom}</td>
                  <td style={{ padding: "8px 12px", color: "#56636e" }}>{r.qui}</td>
                  <td style={{ padding: "8px 12px", color: TEAL, fontWeight: 600 }}>{r.cran}</td>
                  <td style={{ padding: "8px 12px", color: "#7a8894" }}>{r.occasion}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ background: "#FFF5F5", border: `1px solid rgba(194,58,45,.15)`, borderRadius: 10, padding: "12px 16px", fontSize: 13, color: ROUGE, marginBottom: 20, maxWidth: 720 }}>
          <strong>Le plancher, c&apos;est le deuil.</strong> On n&apos;envoie jamais de « Bisous [X] » à quelqu&apos;un qui vient de
          perdre un proche. Sur une carte de deuil, la signature se tait : le nœud entrelacé + « Ypersoa · Wattrelos », rien d&apos;autre.
        </div>

        <p style={{ fontSize: 12, letterSpacing: 1.5, textTransform: "uppercase", color: "#7a8894", fontWeight: 700, margin: "0 0 10px" }}>
          Le moteur d&apos;activation — la question de fin
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 10 }}>
          {JOBS.map((j) => (
            <div key={j.job} style={{ border: "1px solid rgba(22,50,76,.1)", borderRadius: 12, padding: "12px 16px", background: "#fff" }}>
              <p style={{ margin: "0 0 4px", fontFamily: SANS, fontWeight: 700, fontSize: 13.5, color: MARINE }}>{j.job} <span style={{ color: "#9aa3aa", fontWeight: 400 }}>· {j.verbe}</span></p>
              <p style={{ margin: "0 0 4px", fontSize: 12, color: "#56636e" }}>{j.rapporte}</p>
              <p style={{ margin: 0, fontSize: 11.5, color: TEAL, fontWeight: 600 }}>{j.cran}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* ── §6 Playbook ── */}
      <Section title="6 · Le Playbook — le rythme" sub="Le job d'Instagram : réchauffer, pas vendre. Une seule carte de navigation : les 6 piliers.">
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: TEAL, color: CREME }}>
                {["Pilier", "Angle / preuve", "Formats sociaux", "Cran", "Outil"].map((h) => (
                  <th key={h} style={{ textAlign: "left", padding: "8px 12px", fontWeight: 600, fontSize: 11.5, letterSpacing: 0.4 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PILIERS.map((p, i) => (
                <tr key={p.pilier} style={{ background: i % 2 === 0 ? "#fff" : "#FBF9F5" }}>
                  <td style={{ padding: "8px 12px", fontWeight: 700, color: MARINE }}>{p.pilier}</td>
                  <td style={{ padding: "8px 12px", color: "#56636e" }}>{p.angle}</td>
                  <td style={{ padding: "8px 12px", color: "#56636e" }}>{p.formats}</td>
                  <td style={{ padding: "8px 12px", color: TEAL, fontWeight: 600 }}>{p.cran}</td>
                  <td style={{ padding: "8px 12px", color: "#9aa3aa", fontFamily: "monospace", fontSize: 11.5 }}>{p.outil}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p style={{ fontSize: 13, color: "#56636e", marginTop: 12 }}>
          Détail des formats, rubriques et funnel : <TabInlineLink onClick={() => onNavigate("playbook")} label="Playbook ↗" />
        </p>
      </Section>

      {/* ── §7 Studio Mood ── */}
      <Section title="7 · Le Studio Mood — le rituel récurrent" sub="Un épisode relie humeur + mot + support + occasion + décor + question de fin.">
        <p style={{ fontSize: 14, lineHeight: 1.6, color: "#4a5a68", maxWidth: 720, margin: "0 0 16px" }}>
          Il finit toujours par une vraie passerelle vers la pièce ou la communauté. La question de fin est le point
          d&apos;activation : c&apos;est là que le Range Bisous (§5) branche son moteur.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 14 }}>
          {CRAN_HUMEUR.map((c) => (
            <div key={c.cran} style={{ display: "grid", gridTemplateColumns: "1fr 120px", fontSize: 13, border: "1px solid rgba(22,50,76,.08)", borderRadius: 10, padding: "10px 14px", background: "#fff" }}>
              <span style={{ color: "#56636e" }}>{c.humeurs}</span>
              <span style={{ color: TEAL, fontWeight: 700 }}>{c.cran}</span>
            </div>
          ))}
        </div>
        <p style={{ fontSize: 13, color: "#56636e" }}>
          Ratio 1 élément illustré de connivence / 1 preuve matière ou pièce réelle. Guide complet : <TabInlineLink onClick={() => onNavigate("mood")} label="Kit Mood ↗" />
        </p>
      </Section>

      {/* ── §8 Carte récit ── */}
      <Section title="8 · La Carte récit — le brief qui relie tout" sub="Un sujet = une carte. Elle empêche un format de partir seul.">
        <pre style={{ fontFamily: "monospace", fontSize: 12.5, lineHeight: 1.7, background: CREME, borderRadius: 12, padding: 20, overflowX: "auto", color: MARINE, whiteSpace: "pre-wrap" }}>
          {CARTE_RECIT}
        </pre>
      </Section>

      {/* ── §9 Gouvernance ── */}
      <Section title="9 · La gouvernance — une seule vérité" sub="Les divergences n'étaient pas des nuances créatives : c'étaient des consignes concurrentes. On ferme la porte.">
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 24 }}>
          {GOUVERNANCE.map((g) => (
            <div key={g.rang} style={{ display: "flex", gap: 14, alignItems: "flex-start", border: "1px solid rgba(22,50,76,.08)", borderRadius: 10, padding: "10px 14px", background: "#fff" }}>
              <span style={{ fontFamily: SERIF, fontWeight: 600, fontSize: 18, color: ROUGE, width: 22, flexShrink: 0 }}>{g.rang}</span>
              <div>
                <p style={{ margin: "0 0 2px", fontFamily: "monospace", fontSize: 12.5, fontWeight: 700, color: MARINE }}>{g.nom}</p>
                <p style={{ margin: 0, fontSize: 12.5, color: "#56636e" }}>{g.role}</p>
              </div>
            </div>
          ))}
        </div>

        <p style={{ fontSize: 12, letterSpacing: 1.5, textTransform: "uppercase", color: "#7a8894", fontWeight: 700, margin: "0 0 10px" }}>
          Checklist avant publication
        </p>
        <ul style={{ margin: 0, paddingLeft: 20, fontSize: 13.5, lineHeight: 1.9, color: "#41505c" }}>
          {CHECKLIST.map((c) => <li key={c}>{c}</li>)}
        </ul>
      </Section>

      {/* ── §10 Suite ── */}
      <Section title="10 · L'ambition, la suite" sub="Le socle est là. La prochaine étape n'est pas une grande idée neuve.">
        <blockquote style={{ borderLeft: `3px solid ${SAUGE}`, margin: "0 0 18px", padding: "2px 0 2px 20px", maxWidth: 720 }}>
          <p style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 18, lineHeight: 1.5, color: MARINE, margin: 0 }}>
            En croisant un Reel, un article, un pin, un épisode Mood et une carte — sent-on qu&apos;ils parlent tous
            de la même marque ? Pas parce qu&apos;ils ont la même couleur. Parce qu&apos;ils rendent tous un mot important
            assez réel pour être porté — et assez vrai pour faire sourire.
          </p>
        </blockquote>
      </Section>

      <p style={{ fontSize: 12, color: "#8a8f96", marginTop: 8, lineHeight: 1.5, marginBottom: 48 }}>
        Source versionnée : <code>docs/VOIX_YPERSOA.md</code> · Répond à{" "}
        <code>docs/AUDIT_NARRATIF_BRAND_PLAYBOOK_BLOG_MOOD.md</code> (21/08/2026).
        <br />
        Ypersoa · brodé à la commande, dans notre atelier de Wattrelos · Hauts-de-France
      </p>
    </>
  );
}

// ── Sous-composants ─────────────────────────────────────────────────────────

function Section({ title, sub, children }: { title: string; sub: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 60 }}>
      <h2 style={{ fontFamily: SERIF, fontWeight: 600, fontSize: 26, margin: "0 0 4px", letterSpacing: "-0.01em" }}>{title}</h2>
      <p style={{ fontSize: 13.5, color: "#56636e", margin: "0 0 20px", maxWidth: 680, lineHeight: 1.5 }}>{sub}</p>
      {children}
    </section>
  );
}

function TabInlineLink({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: "inline",
        fontFamily: "inherit",
        fontSize: "inherit",
        fontWeight: 600,
        color: TEAL,
        background: "none",
        border: "none",
        padding: 0,
        cursor: "pointer",
        textDecoration: "underline",
      }}
    >
      {label}
    </button>
  );
}

function GuardList({ tone, title, items }: { tone: "no" | "yes"; title: string; items: string[] }) {
  const isNo = tone === "no";
  return (
    <div style={{ border: `1px solid ${isNo ? "rgba(194,58,45,.25)" : "rgba(30,110,119,.25)"}`, borderRadius: 14, padding: "18px 20px", background: "#fff" }}>
      <p style={{ fontSize: 11, letterSpacing: 1.5, textTransform: "uppercase", fontWeight: 700, color: isNo ? ROUGE : TEAL, margin: "0 0 12px" }}>
        {title}
      </p>
      <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, lineHeight: 1.8, color: "#41505c" }}>
        {items.map((it) => <li key={it}>{it}</li>)}
      </ul>
    </div>
  );
}
