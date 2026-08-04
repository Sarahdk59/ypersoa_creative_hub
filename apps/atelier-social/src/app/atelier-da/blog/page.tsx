"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Copy,
  Loader2,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  FileJson2,
  FileText,
  ScrollText,
  Wand2,
  ArrowUpRight,
  Shuffle,
  RefreshCw,
} from "lucide-react";

// ── Design tokens — Brand Voice & Design System 2026 ──────────────────────────
const MARINE = "#16324C";
const TEAL   = "#1E6E77";
const CREAM  = "#F4EEE2";
const ROUGE  = "#C23A2D";

// ── Types ─────────────────────────────────────────────────────────────────────
type ConversionGoal = "club" | "defensif_marque" | "occasion";
type MainTab = "suggestions" | "brief" | "sortie" | "bibliotheque";
type OutputTab = "preview" | "article" | "html" | "liquid" | "jsonld";

interface BadgeSpec {
  label: string;
  variant: "green" | "teal" | "amber" | "gray";
}

interface TopicCandidate {
  id: string;
  titre: string;
  requete_cible: string;
  angle_suggere: string;
  score_final: number;
  badges: BadgeSpec[];
}

interface ArticlePayload {
  h1: string;
  slug: string;
  meta_title: string;
  meta_description: string;
  direct_answer: string;
  sections: { h2: string; body: string }[];
  faq: { question: string; answer: string }[];
  cta: { label: string; body: string };
  internal_links: string[];
  coverage_note: string;
}

interface GenerateResponse {
  ok: boolean;
  id?: string;
  stage?: string;
  reasons?: string[];
  error?: string;
  warning?: string | null;
  repaired?: boolean;
  lint?: { passed: boolean; errors: string[]; warnings: string[]; wordCount: number };
  article?: ArticlePayload;
  html?: string;
  articleBodyHtml?: string;
  jsonld?: unknown;
  shopify?: {
    liquid_section: string;
    faq_jsonld: string;
    seo: { handle: string; meta_title: string; meta_description: string };
  };
}

interface SavedArticleRecord {
  id: string;
  created_at: string;
  target_query: string;
  angle: string;
  serp_softness: number;
  conversion_goal: ConversionGoal;
  sub_queries: string[];
  out_of_scope: string[];
  internal_links: { label: string; url: string }[];
  brand_facts: { topic: string; fact: string }[];
  status: "ready_for_review" | "lint_failed";
  repaired: boolean;
  article: ArticlePayload;
  lint: { passed: boolean; errors: string[]; warnings: string[]; wordCount: number };
  html: string;
  article_body_html: string;
  jsonld: unknown;
  shopify: {
    liquid_section: string;
    faq_jsonld: string;
    seo: { handle: string; meta_title: string; meta_description: string };
  };
}

// ── Mock suggestions (scoring engine à brancher en V2) ────────────────────────
const MOCK_SUGGESTIONS: TopicCandidate[] = [
  {
    id: "sug-1",
    titre: "Guide des tailles hoodie enfant : bien choisir sans se tromper",
    requete_cible: "taille hoodie enfant brodé",
    angle_suggere:
      "Aider les parents à trouver la bonne taille sans retour ni déception, avec les repères concrets de l'atelier.",
    score_final: 84,
    badges: [
      { label: "Fort taux de retour produit — friction identifiée", variant: "green" },
      { label: "Complète la page /pages/guide-des-tailles", variant: "teal" },
      { label: "Opportunité SEO — position 9", variant: "teal" },
    ],
  },
  {
    id: "sug-2",
    titre: "Sweat brodé personnalisé : l'idée cadeau de rentrée qui dure",
    requete_cible: "sweat brodé personnalisé enfant",
    angle_suggere:
      "Montrer que le sweat brodé à la commande est le cadeau de rentrée qui échappe à la norme et dure dans le temps.",
    score_final: 81,
    badges: [
      { label: "Opportunité SEO — position 12, 950 impr/mois", variant: "teal" },
      { label: "Best-seller collection Sweat enfant", variant: "green" },
      { label: "Saisonnier — pic août-septembre", variant: "amber" },
    ],
  },
  {
    id: "sug-3",
    titre: "Casquette brodée : comment choisir la bonne taille et le bon réglage",
    requete_cible: "taille casquette brodée",
    angle_suggere:
      "Guide pratique centré sur le réglage et le confort — pas seulement la taille de tête.",
    score_final: 67,
    badges: [
      { label: "Opportunité SEO — position 14", variant: "teal" },
      { label: "Aucun article existant sur ce sujet", variant: "green" },
      { label: "Saisonnier — pic mai-juillet", variant: "amber" },
    ],
  },
  {
    id: "sug-4",
    titre: "Entretenir une broderie sur coton et molleton sans l'abîmer",
    requete_cible: "entretien broderie sweat coton",
    angle_suggere:
      "Donner les gestes précis qui préservent la broderie dans le temps — confiance produit et fidélisation.",
    score_final: 59,
    badges: [
      { label: "Volume estimé modéré, faible concurrence", variant: "teal" },
      { label: "Sert toute la gamme hoodie/sweat — marge élevée", variant: "green" },
    ],
  },
  {
    id: "sug-5",
    titre: "Hoodie brodé duo parent-enfant : une idée cadeau qui rassemble",
    requete_cible: "hoodie brodé parent enfant assorti",
    angle_suggere:
      "L'angle émotionnel du duo assorti comme idée cadeau forte — Noël, anniversaire, fête des mères.",
    score_final: 45,
    badges: [
      { label: "Objectif Club — pousse la mise en avant duo", variant: "teal" },
      { label: "Saisonnier — pic novembre-décembre", variant: "amber" },
      { label: "Faible volume de recherche", variant: "gray" },
    ],
  },
];

const SCORE_WEIGHTS = [
  { label: "SEO",            pct: "30%" },
  { label: "Business",       pct: "25%" },
  { label: "Saisonnalité",   pct: "20%" },
  { label: "Trou de contenu", pct: "15%" },
  { label: "Marque",         pct: "10%" },
];

const blogFactsDefault = [
  { topic: "atelier",    fact: "La broderie est réalisée dans notre atelier à Wattrelos, dans les Hauts-de-France." },
  { topic: "production", fact: "Chaque pièce est brodée à la commande, après validation, ce qui évite le surstock." },
  { topic: "technique",  fact: "La broderie personnalisée est pensée pour durer dans le temps." },
  { topic: "delais",     fact: "Les délais de fabrication annoncés sont de 5 à 11 jours ouvrés selon le modèle." },
  { topic: "fil",        fact: "La personnalisation couvre la couleur du vêtement et la couleur du fil, avec 9 coloris de fil au choix." },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
function scoreColor(s: number) {
  if (s >= 70) return "#2D6A4F";
  if (s >= 40) return "#B07D00";
  return "rgba(26,22,20,0.38)";
}

const BADGE_MAP: Record<BadgeSpec["variant"], { background: string; color: string }> = {
  green: { background: "rgba(45,106,79,0.1)",   color: "#2D6A4F" },
  teal:  { background: "rgba(30,110,119,0.12)", color: TEAL },
  amber: { background: "rgba(176,125,0,0.1)",   color: "#7A4A14" },
  gray:  { background: "rgba(26,22,20,0.06)",   color: "rgba(26,22,20,0.5)" },
};

// ── Layout constants ──────────────────────────────────────────────────────────
const pageWrap: React.CSSProperties = { maxWidth: 1320, margin: "0 auto", display: "grid", gap: 20 };

const card: React.CSSProperties = {
  background: "rgba(255,255,255,0.9)",
  border: `0.5px solid rgba(22,50,76,0.1)`,
  borderRadius: 20,
  boxShadow: "0 24px 80px rgba(20,28,40,0.06)",
};

// ── Main page ─────────────────────────────────────────────────────────────────
export default function AtelierBlogPage() {
  const [mainTab, setMainTab] = useState<MainTab>("suggestions");

  // Brief form state
  const [targetQuery, setTargetQuery]   = useState("sweat brodé personnalisé rentrée enfant");
  const [angle, setAngle]               = useState("Montrer que le sweat brodé à la commande est le cadeau de rentrée qui échappe à la norme et dure dans le temps.");
  const [subQueries, setSubQueries]     = useState([
    "Pourquoi un vêtement brodé à la commande marque plus qu'un cadeau standard ?",
    "Quel type de broderie choisir pour un enfant ?",
    "Comment personnaliser sans faire trop chargé ?",
    "Les délais sont-ils compatibles avec la rentrée scolaire ?",
  ]);
  const [outOfScope, setOutOfScope]     = useState([
    "Les fournitures scolaires et accessoires non textiles",
    "Les prix et promotions",
    "Le détail interne des étapes de production",
  ]);
  const [internalLinks, setInternalLinks] = useState([
    { label: "Le Club",          url: "/pages/cercle" },
    { label: "Guide des tailles", url: "/pages/guide-des-tailles" },
  ]);
  const [serpSoftness, setSerpSoftness]   = useState(4);
  const [conversionGoal, setConversionGoal] = useState<ConversionGoal>("club");
  const [brandFacts, setBrandFacts]       = useState(blogFactsDefault);

  // Async state
  const [loading, setLoading]             = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [sugRefreshing, setSugRefreshing] = useState(false);
  const [error, setError]                 = useState<string | null>(null);
  const [data, setData]                   = useState<GenerateResponse | null>(null);
  const [history, setHistory]             = useState<SavedArticleRecord[]>([]);
  const [copied, setCopied]               = useState<string | null>(null);
  const [activeOutputTab, setActiveOutputTab] = useState<OutputTab>("preview");

  const payload = useMemo(
    () => ({
      targetQuery,
      angle,
      subQueries: subQueries.filter(Boolean),
      outOfScope: outOfScope.filter(Boolean),
      serpSoftness,
      conversionGoal,
      internalLinks: internalLinks.filter((l) => l.label && l.url),
      brandFacts: brandFacts.filter((f) => f.topic && f.fact),
    }),
    [angle, brandFacts, conversionGoal, internalLinks, outOfScope, serpSoftness, subQueries, targetQuery]
  );

  async function onGenerate() {
    setLoading(true);
    setError(null);
    setData(null);
    try {
      const res  = await fetch("/api/blog/generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const json = (await res.json()) as GenerateResponse;
      if (!res.ok || !json.ok) throw new Error(json.error || json.reasons?.join(" ") || "Génération impossible.");
      setData(json);
      if (json.warning) setError(json.warning);
      void loadHistory();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  async function loadHistory() {
    setHistoryLoading(true);
    try {
      const res  = await fetch("/api/blog/articles", { cache: "no-store" });
      const json = (await res.json()) as { ok: boolean; items?: SavedArticleRecord[]; error?: string };
      if (!res.ok || !json.ok) throw new Error(json.error || "Historique indisponible.");
      setHistory(json.items ?? []);
    } catch (e) {
      setError((prev) => prev ?? (e instanceof Error ? e.message : String(e)));
    } finally {
      setHistoryLoading(false);
    }
  }

  async function loadArticle(id: string) {
    setHistoryLoading(true);
    try {
      const res  = await fetch(`/api/blog/articles/${id}`, { cache: "no-store" });
      const json = (await res.json()) as { ok: boolean; item?: SavedArticleRecord; error?: string };
      if (!res.ok || !json.ok || !json.item) throw new Error(json.error || "Article introuvable.");
      const item = json.item;
      setTargetQuery(item.target_query);
      setAngle(item.angle);
      setSubQueries(item.sub_queries);
      setOutOfScope(item.out_of_scope);
      setInternalLinks(item.internal_links);
      setBrandFacts(item.brand_facts);
      setSerpSoftness(item.serp_softness);
      setConversionGoal(item.conversion_goal);
      setData({
        ok: true, id: item.id, repaired: item.repaired, lint: item.lint,
        article: item.article, html: item.html, articleBodyHtml: item.article_body_html,
        jsonld: item.jsonld, shopify: item.shopify,
      });
      setMainTab("sortie");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setHistoryLoading(false);
    }
  }

  async function copyText(label: string, text: string) {
    await navigator.clipboard.writeText(text);
    setCopied(label);
    window.setTimeout(() => setCopied((v) => (v === label ? null : v)), 1800);
  }

  function updateList(setter: (next: string[]) => void, values: string[], index: number, nextValue: string) {
    const next = [...values];
    next[index] = nextValue;
    setter(next);
  }

  function shuffleSubQueries() {
    setSubQueries((prev) => {
      const next = [...prev];
      for (let i = next.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [next[i], next[j]] = [next[j], next[i]];
      }
      return next;
    });
  }

  function preFillFromSuggestion(c: TopicCandidate) {
    setTargetQuery(c.requete_cible);
    setAngle(c.angle_suggere);
    setMainTab("brief");
  }

  async function refreshSuggestions() {
    setSugRefreshing(true);
    await new Promise((r) => setTimeout(r, 800));
    setSugRefreshing(false);
  }

  const isWorkspace = mainTab !== "suggestions";

  return (
    <div style={pageWrap}>

      {/* ── Hero header ─────────────────────────────────────────────────────── */}
      <section
        style={{
          ...card,
          padding: "28px 32px",
          background: `linear-gradient(135deg, ${MARINE} 0%, ${MARINE} 58%, #2C1210 100%)`,
          color: CREAM,
          overflow: "hidden",
          position: "relative",
        }}
      >
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(circle at 75% 0%, rgba(255,255,255,0.08), transparent 45%)" }} />
        <div style={{ position: "relative", display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 28 }}>
          <div>
            <Link href="/atelier-da" style={{ color: `${CREAM}99`, textDecoration: "none", fontSize: 12, letterSpacing: "0.04em" }}>
              ← Retour Atelier DA
            </Link>
            <h1 style={{ margin: "14px 0 14px", fontFamily: "var(--font-editorial)", fontSize: 50, fontWeight: 500, lineHeight: 0.92, letterSpacing: "-0.02em" }}>
              Atelier Blog
            </h1>
            <p style={{ maxWidth: 520, fontSize: 15, lineHeight: 1.75, color: `${CREAM}CC`, margin: 0 }}>
              Générateur d&apos;articles GEO pour le journal Ypersoa.{" "}
              Nouveau : l&apos;onglet Suggestions repère et classe les sujets à fort potentiel avant même d&apos;ouvrir un Brief.
            </p>
          </div>
          <div
            style={{
              border: `1px solid ${CREAM}22`,
              borderRadius: 16,
              padding: "18px 20px",
              background: `${CREAM}0A`,
              backdropFilter: "blur(12px)",
            }}
          >
            <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.16em", color: `${CREAM}80`, marginBottom: 12 }}>
              Direction éditoriale
            </div>
            <p style={{ margin: "0 0 10px", fontSize: 14, lineHeight: 1.7, color: `${CREAM}CC` }}>
              Ypersoa : utile, concret, cadeau, taille, entretien, atelier.
            </p>
            <p style={{ margin: 0, fontSize: 13, lineHeight: 1.65, color: `${CREAM}99` }}>
              Sortie prête pour Shopify : HTML simple, body enrichi, bloc Liquid et FAQ JSON-LD.
            </p>
          </div>
        </div>
      </section>

      {/* ── Tab navigation ──────────────────────────────────────────────────── */}
      <div style={{ display: "flex", gap: 8 }}>
        {([
          ["suggestions", "+ Suggestions"],
          ["brief",       "Brief"],
          ["sortie",      "Sortie"],
          ["bibliotheque","Bibliothèque"],
        ] as const).map(([id, label]) => {
          const active = mainTab === id;
          return (
            <button
              key={id}
              onClick={() => setMainTab(id)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                padding: "10px 18px",
                borderRadius: 999,
                border: `1.5px solid ${active ? MARINE : "rgba(22,50,76,0.15)"}`,
                background: active ? MARINE : "white",
                color: active ? CREAM : "rgba(26,22,20,0.58)",
                fontSize: 13,
                fontWeight: active ? 700 : 500,
                cursor: "pointer",
                transition: "all 0.15s",
                letterSpacing: active ? "0.01em" : "normal",
              }}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* ── Suggestions view ────────────────────────────────────────────────── */}
      {mainTab === "suggestions" && (
        <div style={{ ...card, padding: 28 }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 20 }}>
            <div>
              <h2 style={{ margin: "0 0 8px", fontFamily: "var(--font-editorial)", fontSize: 32, fontWeight: 500, color: MARINE }}>
                Sujets recommandés
              </h2>
              <p style={{ margin: 0, fontSize: 14, lineHeight: 1.65, color: "rgba(26,22,20,0.6)", maxWidth: 560 }}>
                Classés par score de pertinence, calculé à partir du SEO, des ventes Shopify, de la saisonnalité et de ce qui existe déjà dans la Bibliothèque.
              </p>
            </div>
            <button
              onClick={() => void refreshSuggestions()}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 7,
                padding: "10px 16px",
                borderRadius: 999,
                border: `1px solid rgba(22,50,76,0.14)`,
                background: "white",
                color: "rgba(26,22,20,0.62)",
                fontSize: 13,
                fontWeight: 500,
                cursor: "pointer",
                flexShrink: 0,
              }}
            >
              {sugRefreshing ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
              Actualiser les suggestions
            </button>
          </div>

          {/* Score weight pills */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 24 }}>
            {SCORE_WEIGHTS.map(({ label, pct }) => (
              <span
                key={label}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                  padding: "6px 12px",
                  borderRadius: 999,
                  background: MARINE,
                  color: CREAM,
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                {label}
                <span style={{ opacity: 0.65, fontWeight: 400 }}>{pct}</span>
              </span>
            ))}
          </div>

          {/* Topic cards */}
          <div style={{ display: "grid", gap: 12 }}>
            {MOCK_SUGGESTIONS.map((c, i) => {
              const sc = scoreColor(c.score_final);
              return (
                <div
                  key={c.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "48px 1fr auto",
                    gap: 18,
                    alignItems: "center",
                    padding: "18px 20px",
                    borderRadius: 16,
                    border: "1px solid rgba(22,50,76,0.09)",
                    background: "white",
                  }}
                >
                  {/* Rank + score */}
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                    <span style={{ fontSize: 12, color: "rgba(26,22,20,0.36)", fontWeight: 600 }}>{i + 1}</span>
                    <div
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: "50%",
                        background: sc,
                        color: "white",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 15,
                        fontWeight: 700,
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {c.score_final}
                    </div>
                  </div>

                  {/* Title + query + badges */}
                  <div>
                    <div style={{ fontSize: 17, fontWeight: 600, color: MARINE, marginBottom: 4, lineHeight: 1.3 }}>
                      {c.titre}
                    </div>
                    <div style={{ fontSize: 12, color: TEAL, marginBottom: 10, fontStyle: "italic" }}>
                      Requête cible : {c.requete_cible}
                    </div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {c.badges.map((b) => {
                        const s = BADGE_MAP[b.variant];
                        return (
                          <span
                            key={b.label}
                            style={{
                              padding: "4px 10px",
                              borderRadius: 999,
                              fontSize: 12,
                              fontWeight: 500,
                              ...s,
                            }}
                          >
                            {b.label}
                          </span>
                        );
                      })}
                    </div>
                  </div>

                  {/* CTA */}
                  <button
                    onClick={() => preFillFromSuggestion(c)}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "11px 18px",
                      borderRadius: 999,
                      border: "none",
                      background: MARINE,
                      color: CREAM,
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                    }}
                  >
                    Pré-remplir le Brief
                    <ArrowUpRight size={14} />
                  </button>
                </div>
              );
            })}
          </div>

          <p style={{ marginTop: 20, textAlign: "center", fontSize: 12, color: "rgba(26,22,20,0.4)", lineHeight: 1.6 }}>
            Aucune génération automatique — chaque suggestion s&apos;arrête au Brief, la décision de générer reste humaine.
          </p>
        </div>
      )}

      {/* ── Workspace (Brief / Sortie / Bibliothèque) ────────────────────────── */}
      {isWorkspace && (
        <div style={{ display: "grid", gridTemplateColumns: "minmax(320px, 420px) minmax(0, 1fr) minmax(280px, 340px)", gap: 20, alignItems: "start" }}>

          {/* Left — Brief */}
          <section style={{ ...card, padding: 24, position: "sticky", top: 24 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <div>
                <h2 style={{ margin: 0, fontFamily: "var(--font-editorial)", fontSize: 28, fontWeight: 500, color: MARINE }}>Brief</h2>
                <p style={{ margin: "6px 0 0", fontSize: 13, lineHeight: 1.6, color: "rgba(26,22,20,0.56)" }}>
                  Cadrer l&apos;angle, la SERP et l&apos;objectif avant de générer.
                </p>
              </div>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: TEAL, fontWeight: 600 }}>
                <Wand2 size={14} />
                GEO + Shopify
              </div>
            </div>

            <FormField label="Requête cible">
              <input value={targetQuery} onChange={(e) => setTargetQuery(e.target.value)} style={inputStyle} />
            </FormField>

            <FormField label="Angle unique">
              <textarea value={angle} onChange={(e) => setAngle(e.target.value)} style={{ ...inputStyle, minHeight: 92, resize: "vertical" }} />
            </FormField>

            <FormField label="Objectif de conversion">
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {([["club", "Club"], ["defensif_marque", "Défensif marque"], ["occasion", "Occasion"]] as const).map(([value, label]) => (
                  <button
                    key={value}
                    onClick={() => setConversionGoal(value)}
                    style={{
                      ...chipStyle,
                      background: conversionGoal === value ? MARINE : "white",
                      color: conversionGoal === value ? CREAM : "#1A1614",
                      borderColor: conversionGoal === value ? MARINE : "rgba(26,22,20,0.12)",
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </FormField>

            <FormField label={`Molesse SERP : ${serpSoftness}/5`}>
              <input
                type="range" min={1} max={5} value={serpSoftness}
                onChange={(e) => setSerpSoftness(Number(e.target.value))}
                style={{ width: "100%", accentColor: TEAL }}
              />
            </FormField>

            <ListEditor title="Sous-questions" values={subQueries} onChange={setSubQueries} updateList={updateList} />
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: -6, marginBottom: 16 }}>
              <button onClick={shuffleSubQueries} style={secondaryButton}>
                <Shuffle size={13} />
                Mélanger
              </button>
            </div>
            <ListEditor title="Hors périmètre" values={outOfScope} onChange={setOutOfScope} updateList={updateList} />

            <FormField label="Liens internes">
              <div style={{ display: "grid", gap: 10 }}>
                {internalLinks.map((link, i) => (
                  <div key={`${link.label}-${i}`} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    <input
                      value={link.label}
                      onChange={(e) => { const n = [...internalLinks]; n[i] = { ...n[i], label: e.target.value }; setInternalLinks(n); }}
                      style={inputStyle} placeholder="Label"
                    />
                    <input
                      value={link.url}
                      onChange={(e) => { const n = [...internalLinks]; n[i] = { ...n[i], url: e.target.value }; setInternalLinks(n); }}
                      style={inputStyle} placeholder="/pages/..."
                    />
                  </div>
                ))}
              </div>
            </FormField>

            <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
              <button onClick={onGenerate} disabled={loading} style={primaryButton}>
                {loading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                {loading ? "Génération..." : "Générer l'article"}
              </button>
            </div>

            {error && (
              <div style={{ marginTop: 14, ...noticeStyle(ROUGE, "rgba(194,58,45,0.07)") }}>
                <AlertTriangle size={15} />
                <span>{error}</span>
              </div>
            )}
          </section>

          {/* Centre — Sortie */}
          <section style={{ display: "grid", gap: 18 }}>
            <div style={{ ...card, padding: 22 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, marginBottom: 16 }}>
                <div>
                  <h2 style={{ margin: 0, fontFamily: "var(--font-editorial)", fontSize: 30, fontWeight: 500, color: MARINE }}>Sortie</h2>
                  <p style={{ margin: "6px 0 0", fontSize: 13, lineHeight: 1.6, color: "rgba(26,22,20,0.56)" }}>
                    Aperçu éditorial, export Shopify, Liquid et JSON-LD.
                  </p>
                </div>
                {data?.lint && (
                  <div style={{ textAlign: "right", fontSize: 12, color: "rgba(26,22,20,0.6)" }}>
                    <div style={{ display: "inline-flex", alignItems: "center", gap: 6, color: data.lint.passed ? "#2D6A4F" : ROUGE }}>
                      {data.lint.passed ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
                      {data.lint.passed ? "Lint passé" : "Lint à relire"}
                    </div>
                    <div style={{ marginTop: 4 }}>{data.lint.wordCount} mots</div>
                  </div>
                )}
              </div>

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
                <OutputTabBtn icon={<Sparkles size={13} />} active={activeOutputTab === "preview"}  onClick={() => setActiveOutputTab("preview")}>Aperçu</OutputTabBtn>
                <OutputTabBtn icon={<FileText size={13} />} active={activeOutputTab === "article"}  onClick={() => setActiveOutputTab("article")}>Article</OutputTabBtn>
                <OutputTabBtn icon={<ScrollText size={13} />} active={activeOutputTab === "html"}   onClick={() => setActiveOutputTab("html")}>Shopify HTML</OutputTabBtn>
                <OutputTabBtn icon={<Wand2 size={13} />}     active={activeOutputTab === "liquid"}  onClick={() => setActiveOutputTab("liquid")}>Liquid</OutputTabBtn>
                <OutputTabBtn icon={<FileJson2 size={13} />} active={activeOutputTab === "jsonld"}  onClick={() => setActiveOutputTab("jsonld")}>FAQ JSON-LD</OutputTabBtn>
              </div>

              {!data && !loading && (
                <div style={emptyState}>
                  <Sparkles size={16} />
                  <span>Le générateur est prêt. Lance un brief à gauche pour remplir cette zone.</span>
                </div>
              )}
              {loading && (
                <div style={emptyState}>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Génération en cours…</span>
                </div>
              )}

              {data && (
                <>
                  {data.repaired && (
                    <div style={{ marginBottom: 12, ...noticeStyle("#7A4A14", "rgba(122,74,20,0.07)") }}>
                      <AlertTriangle size={15} />
                      <span>Une passe de réparation automatique a été appliquée après le premier lint.</span>
                    </div>
                  )}
                  {data.warning && (
                    <div style={{ marginBottom: 12, ...noticeStyle("#7A4A14", "rgba(122,74,20,0.07)") }}>
                      <AlertTriangle size={15} />
                      <span>{data.warning}</span>
                    </div>
                  )}
                  {data.lint && data.lint.errors.length > 0 && (
                    <div style={{ marginBottom: 12, ...noticeStyle(ROUGE, "rgba(194,58,45,0.07)") }}>
                      <AlertTriangle size={15} />
                      <span>{data.lint.errors.join(" ")}</span>
                    </div>
                  )}
                  {data.lint && data.lint.warnings.length > 0 && (
                    <div style={{ marginBottom: 12, ...noticeStyle("#7A4A14", "rgba(122,74,20,0.07)") }}>
                      <AlertTriangle size={15} />
                      <span>{data.lint.warnings.join(" ")}</span>
                    </div>
                  )}

                  {activeOutputTab === "preview"  && data.article && <ArticlePreview article={data.article} />}
                  {activeOutputTab === "article"  && data.article && <OutputPanel label="JSON article"     copied={copied === "article"} onCopy={() => copyText("article", JSON.stringify(data.article, null, 2))} content={JSON.stringify(data.article, null, 2)} />}
                  {activeOutputTab === "html"     && data.articleBodyHtml && <OutputPanel label="Body HTML Shopify" copied={copied === "html"}    onCopy={() => copyText("html",    data.articleBodyHtml || "")}         content={data.articleBodyHtml} />}
                  {activeOutputTab === "liquid"   && data.shopify?.liquid_section && <OutputPanel label="Bloc Liquid"         copied={copied === "liquid"}  onCopy={() => copyText("liquid",  data.shopify?.liquid_section || "")}  content={data.shopify.liquid_section} />}
                  {activeOutputTab === "jsonld"   && data.shopify?.faq_jsonld && <OutputPanel label="FAQ JSON-LD"             copied={copied === "jsonld"}  onCopy={() => copyText("jsonld",  data.shopify?.faq_jsonld || "")}       content={data.shopify.faq_jsonld} />}
                </>
              )}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 16 }}>
              <MiniCard title="Ce qu'on vise"        body="Un angle net, une progression lisible, des phrases extractibles — la sensation d'un journal premium." />
              <MiniCard title="Ce qu'on ajoute"      body="Plus d'éditorial, plus de désirabilité, moins de robot — sans sacrifier l'utilité SEO." />
              <MiniCard title="Ce qu'on évite"       body="Les guides fourre-tout, les plans mécaniques, le jargon machine, les CTA trop agressifs." />
            </div>
          </section>

          {/* Right — Bibliothèque */}
          <aside style={{ ...card, padding: 20, position: "sticky", top: 24, display: "grid", gap: 14 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
              <div>
                <h2 style={{ margin: 0, fontFamily: "var(--font-editorial)", fontSize: 26, fontWeight: 500, color: MARINE }}>Bibliothèque</h2>
                <p style={{ margin: "6px 0 0", fontSize: 13, color: "rgba(26,22,20,0.56)", lineHeight: 1.5 }}>
                  Les articles générés dans le Hub.
                </p>
              </div>
              <button onClick={() => void loadHistory()} style={secondaryButton}>
                {historyLoading ? <Loader2 size={13} className="animate-spin" /> : <ScrollText size={13} />}
                Rafraîchir
              </button>
            </div>

            {history.length === 0 && !historyLoading && (
              <div style={emptyState}>
                <span>Aucun article sauvegardé pour l&apos;instant.</span>
              </div>
            )}

            <div style={{ display: "grid", gap: 10 }}>
              {history.map((item) => (
                <button
                  key={item.id}
                  onClick={() => void loadArticle(item.id)}
                  style={{
                    textAlign: "left",
                    border: "1px solid rgba(22,50,76,0.1)",
                    borderRadius: 14,
                    background: "white",
                    padding: "14px 16px",
                    cursor: "pointer",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 8 }}>
                    <span style={{ fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: item.status === "ready_for_review" ? "#2D6A4F" : ROUGE, fontWeight: 700 }}>
                      {item.status === "ready_for_review" ? "Prêt à relire" : "Lint failed"}
                    </span>
                    <span style={{ fontSize: 11, color: "rgba(26,22,20,0.42)" }}>
                      {new Date(item.created_at).toLocaleDateString("fr-FR")}
                    </span>
                  </div>
                  <div style={{ fontSize: 14, lineHeight: 1.35, fontWeight: 600, color: MARINE }}>{item.target_query}</div>
                  <div style={{ fontSize: 12, color: "rgba(26,22,20,0.58)", marginTop: 5, lineHeight: 1.5 }}>{item.angle}</div>
                </button>
              ))}
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}

// ── Article preview ───────────────────────────────────────────────────────────
function ArticlePreview({ article }: { article: ArticlePayload }) {
  return (
    <div
      style={{
        background: CREAM,
        border: "1px solid rgba(22,50,76,0.08)",
        borderRadius: 22,
        overflow: "hidden",
      }}
    >
      <div style={{ padding: "22px 28px 12px", color: MARINE }}>
        <div style={{ fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase", color: TEAL, marginBottom: 14 }}>
          Broderie · Hauts-de-France
        </div>
        <h3
          style={{
            margin: 0,
            fontFamily: "var(--font-editorial)",
            fontSize: 50,
            fontWeight: 500,
            lineHeight: 0.96,
            letterSpacing: "-0.03em",
            color: MARINE,
          }}
        >
          {article.h1}
        </h3>
        <div style={{ marginTop: 16, fontSize: 13, color: "rgba(26,22,20,0.5)", display: "flex", gap: 12 }}>
          <span>2 min de lecture</span>
          <span>·</span>
          <span>Atelier en France</span>
        </div>
      </div>

      <div style={{ padding: "0 28px 28px", display: "grid", gridTemplateColumns: "minmax(0,1fr) 300px", gap: 24, alignItems: "start" }}>
        <div>
          <div
            style={{
              height: 240,
              borderRadius: 18,
              background: `linear-gradient(135deg, #EDE6D8 0%, #DDD4C2 100%)`,
              border: "1px solid rgba(22,50,76,0.06)",
              marginBottom: 26,
              position: "relative",
              overflow: "hidden",
            }}
          >
            <div style={{ position: "absolute", inset: "0 0 auto auto", width: 160, height: 160, background: `radial-gradient(circle, ${TEAL}18, transparent 65%)` }} />
            <div style={{ position: "absolute", right: 40, bottom: 22, color: ROUGE, fontFamily: "var(--font-editorial)", fontSize: 60, opacity: 0.7 }}>Y</div>
          </div>

          <p style={{ margin: 0, fontSize: 17, lineHeight: 1.85, color: "#2A2C33" }}>
            <span style={{ float: "left", fontSize: 68, lineHeight: 0.82, paddingRight: 10, color: TEAL, fontFamily: "var(--font-editorial)" }}>
              {article.direct_answer.charAt(0)}
            </span>
            {article.direct_answer.slice(1)}
          </p>

          <div style={{ display: "grid", gap: 26, marginTop: 32 }}>
            {article.sections.map((s) => (
              <section key={s.h2}>
                <h4 style={{ margin: "0 0 12px", fontFamily: "var(--font-editorial)", fontSize: 32, fontWeight: 500, color: TEAL, lineHeight: 1.04 }}>
                  {s.h2}
                </h4>
                <p style={{ margin: 0, fontSize: 16, lineHeight: 1.85, color: "#2A2C33", whiteSpace: "pre-wrap" }}>{s.body}</p>
              </section>
            ))}
          </div>
        </div>

        <div style={{ display: "grid", gap: 16, position: "sticky", top: 18 }}>
          <aside style={{ background: TEAL, color: CREAM, borderRadius: 16, padding: 20 }}>
            <div style={{ fontSize: 11, letterSpacing: "0.16em", textTransform: "uppercase", color: `${CREAM}80`, marginBottom: 14 }}>
              Atelier · France
            </div>
            <div style={{ fontSize: 18, lineHeight: 1.3, marginBottom: 12, fontWeight: 600 }}>Prêt à personnaliser ta pièce ?</div>
            <p style={{ margin: "0 0 18px", fontSize: 13, lineHeight: 1.65, color: `${CREAM}CC` }}>{article.cta.body}</p>
            <button
              style={{
                width: "100%",
                border: "none",
                borderRadius: 10,
                background: ROUGE,
                color: "white",
                padding: "13px 16px",
                fontSize: 14,
                fontWeight: 700,
                display: "inline-flex",
                justifyContent: "center",
                alignItems: "center",
                gap: 8,
                cursor: "pointer",
              }}
            >
              {article.cta.label}
              <ArrowUpRight size={15} />
            </button>
            <div style={{ marginTop: 16, paddingTop: 16, borderTop: `1px solid ${CREAM}20`, fontSize: 12, color: `${CREAM}70` }}>
              Expédié sous 5 à 11 jours ouvrés
            </div>
          </aside>

          <aside style={{ border: "1px solid rgba(22,50,76,0.1)", borderRadius: 16, padding: 18, background: "rgba(255,255,255,0.6)" }}>
            <div style={{ fontSize: 11, letterSpacing: "0.16em", textTransform: "uppercase", color: TEAL, marginBottom: 12 }}>
              Liens internes
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {article.internal_links.map((link) => (
                <span
                  key={link}
                  style={{
                    borderRadius: 999,
                    border: `1px solid ${TEAL}30`,
                    padding: "8px 12px",
                    fontSize: 12,
                    color: TEAL,
                    background: `${TEAL}08`,
                  }}
                >
                  {link}
                </span>
              ))}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────
function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "grid", gap: 8, marginBottom: 16 }}>
      <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "rgba(22,50,76,0.5)" }}>
        {label}
      </span>
      {children}
    </label>
  );
}

function ListEditor({
  title, values, onChange, updateList,
}: {
  title: string;
  values: string[];
  onChange: (next: string[]) => void;
  updateList: (setter: (next: string[]) => void, values: string[], index: number, nextValue: string) => void;
}) {
  return (
    <FormField label={title}>
      <div style={{ display: "grid", gap: 8 }}>
        {values.map((value, index) => (
          <input
            key={`${title}-${index}`}
            value={value}
            onChange={(e) => updateList(onChange, values, index, e.target.value)}
            style={inputStyle}
          />
        ))}
      </div>
    </FormField>
  );
}

function OutputPanel({ label, copied, onCopy, content }: { label: string; copied: boolean; onCopy: () => void; content: string }) {
  return (
    <div style={{ display: "grid", gap: 10 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <strong style={{ fontSize: 13, color: MARINE }}>{label}</strong>
        <button onClick={onCopy} style={secondaryButton}>
          <Copy size={13} />
          {copied ? "Copié" : "Copier"}
        </button>
      </div>
      <pre
        style={{
          margin: 0,
          whiteSpace: "pre-wrap",
          overflowX: "auto",
          padding: 16,
          borderRadius: 14,
          background: MARINE,
          color: CREAM,
          fontSize: 12.5,
          lineHeight: 1.7,
        }}
      >
        {content}
      </pre>
    </div>
  );
}

function OutputTabBtn({ active, onClick, icon, children }: { active: boolean; onClick: () => void; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 7,
        padding: "9px 14px",
        borderRadius: 999,
        border: `1.5px solid ${active ? TEAL : "rgba(22,50,76,0.12)"}`,
        background: active ? TEAL : "white",
        color: active ? "white" : "rgba(26,22,20,0.6)",
        fontSize: 12,
        fontWeight: active ? 700 : 500,
        cursor: "pointer",
      }}
    >
      {icon}
      {children}
    </button>
  );
}

function MiniCard({ title, body }: { title: string; body: string }) {
  return (
    <article
      style={{
        background: "rgba(255,255,255,0.9)",
        border: `0.5px solid rgba(22,50,76,0.1)`,
        borderRadius: 16,
        boxShadow: "0 8px 32px rgba(20,28,40,0.05)",
        padding: 18,
      }}
    >
      <h3 style={{ margin: 0, fontSize: 14, fontFamily: "var(--font-editorial)", fontWeight: 600, color: MARINE }}>{title}</h3>
      <p style={{ margin: "8px 0 0", fontSize: 13, lineHeight: 1.65, color: "rgba(26,22,20,0.62)" }}>{body}</p>
    </article>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const inputStyle: React.CSSProperties = {
  width: "100%",
  borderRadius: 12,
  border: "1px solid rgba(22,50,76,0.12)",
  background: "rgba(255,255,255,0.95)",
  padding: "12px 14px",
  fontSize: 14,
  outline: "none",
  color: "#1A1614",
  boxSizing: "border-box",
};

const primaryButton: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  borderRadius: 999,
  border: "none",
  background: ROUGE,
  color: "white",
  padding: "13px 22px",
  fontSize: 14,
  fontWeight: 700,
  cursor: "pointer",
  letterSpacing: "0.01em",
};

const secondaryButton: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 7,
  borderRadius: 999,
  border: "1px solid rgba(22,50,76,0.14)",
  background: "white",
  color: "rgba(26,22,20,0.62)",
  padding: "8px 13px",
  fontSize: 12,
  fontWeight: 600,
  cursor: "pointer",
};

const chipStyle: React.CSSProperties = {
  borderRadius: 999,
  border: "1.5px solid rgba(22,50,76,0.12)",
  background: "white",
  padding: "8px 13px",
  fontSize: 12,
  fontWeight: 600,
  cursor: "pointer",
};

function noticeStyle(color: string, bg: string): React.CSSProperties {
  return {
    display: "flex",
    alignItems: "flex-start",
    gap: 10,
    padding: "12px 14px",
    borderRadius: 12,
    background: bg,
    color,
    fontSize: 13,
    lineHeight: 1.55,
    border: `1px solid ${color}22`,
  };
}

const emptyState: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: "16px 14px",
  borderRadius: 12,
  border: "1.5px dashed rgba(22,50,76,0.14)",
  color: "rgba(26,22,20,0.5)",
  fontSize: 13,
};
