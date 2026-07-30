"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Copy, Loader2, Sparkles, AlertTriangle, CheckCircle2, FileJson2, FileText, ScrollText, Wand2 } from "lucide-react";

type ConversionGoal = "club" | "defensif_marque" | "occasion";

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

const pageWrap: React.CSSProperties = { maxWidth: 1320, margin: "0 auto", display: "grid", gap: 24 };
const card: React.CSSProperties = {
  background: "rgba(255,255,255,0.86)",
  border: "0.5px solid var(--hub-border)",
  borderRadius: 20,
  boxShadow: "0 24px 80px rgba(20, 28, 40, 0.06)",
};

const blogFactsDefault = [
  { topic: "atelier", fact: "La broderie est realisee dans notre atelier a Wattrelos, dans les Hauts-de-France." },
  { topic: "production", fact: "Chaque piece est brodee a la commande, apres validation, ce qui evite le surstock." },
  { topic: "technique", fact: "Ypersoa travaille la broderie personnalisee, pensee pour durer dans le temps." },
  { topic: "delais", fact: "Les delais de fabrication annonces sont de 5 a 11 jours ouvres selon le modele." },
  { topic: "fil", fact: "La personnalisation couvre la couleur du vetement et la couleur du fil, avec 9 coloris de fil au choix." },
];

export default function AtelierBlogPage() {
  const [targetQuery, setTargetQuery] = useState("cadeau de naissance brode");
  const [angle, setAngle] = useState("Aider quelqu'un qui cherche un vrai cadeau utile et durable pour une naissance, sans tomber dans l'objet gadget.");
  const [subQueries, setSubQueries] = useState([
    "Pourquoi un cadeau brode marque plus qu'un cadeau standard ?",
    "Quel vetement brode offrir a un bebe sans se tromper ?",
    "Qu'est-ce qui fait qu'un cadeau de naissance dure dans le temps ?",
    "Comment personnaliser sans faire trop charge ?",
  ]);
  const [outOfScope, setOutOfScope] = useState([
    "Les doudous et accessoires non textiles",
    "Les prix et promotions",
    "Le detail interne des etapes de production",
  ]);
  const [internalLinks, setInternalLinks] = useState([
    { label: "Le Club Ypersoa", url: "/pages/cercle" },
    { label: "Guide des tailles", url: "/pages/guide-des-tailles" },
  ]);
  const [serpSoftness, setSerpSoftness] = useState(4);
  const [conversionGoal, setConversionGoal] = useState<ConversionGoal>("club");
  const [brandFacts, setBrandFacts] = useState(blogFactsDefault);
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<GenerateResponse | null>(null);
  const [history, setHistory] = useState<SavedArticleRecord[]>([]);
  const [copied, setCopied] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"article" | "html" | "liquid" | "jsonld">("article");

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
      const res = await fetch("/api/blog/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = (await res.json()) as GenerateResponse;
      if (!res.ok || !json.ok) {
        throw new Error(json.error || json.reasons?.join(" ") || "Generation impossible.");
      }
      setData(json);
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
      const res = await fetch("/api/blog/articles", { cache: "no-store" });
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
      const res = await fetch(`/api/blog/articles/${id}`, { cache: "no-store" });
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
        ok: true,
        id: item.id,
        repaired: item.repaired,
        lint: item.lint,
        article: item.article,
        html: item.html,
        articleBodyHtml: item.article_body_html,
        jsonld: item.jsonld,
        shopify: item.shopify,
      });
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

  return (
    <div style={pageWrap}>
      <section
        style={{
          ...card,
          padding: 28,
          background:
            "linear-gradient(135deg, rgba(24,40,69,0.98) 0%, rgba(24,40,69,0.96) 66%, rgba(167,96,89,0.88) 100%)",
          color: "#FAF7F2",
          overflow: "hidden",
          position: "relative",
        }}
      >
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(circle at top right, rgba(255,255,255,0.12), transparent 30%)" }} />
        <div style={{ position: "relative", display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 24 }}>
          <div>
            <Link href="/atelier-da" style={{ color: "rgba(250,247,242,0.76)", textDecoration: "none", fontSize: 12 }}>
              ← Retour Atelier DA
            </Link>
            <h1 style={{ margin: "14px 0 12px", fontFamily: "var(--font-editorial)", fontSize: 48, fontWeight: 500, lineHeight: 0.94 }}>
              Atelier Blog
            </h1>
            <p style={{ maxWidth: 720, fontSize: 15, lineHeight: 1.7, color: "rgba(250,247,242,0.82)", margin: 0 }}>
              Generateur d&apos;articles GEO pour le journal Ypersoa. Le brief reste utile et SEO, mais l&apos;ecriture garde
              une tenue editoriale inspiree des blogs de marque qui melangent clarte, desirabilite et ancrage atelier.
            </p>
          </div>
          <div
            style={{
              border: "1px solid rgba(250,247,242,0.16)",
              borderRadius: 18,
              padding: 18,
              background: "rgba(250,247,242,0.08)",
              backdropFilter: "blur(10px)",
            }}
          >
            <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.14em", color: "rgba(250,247,242,0.62)", marginBottom: 10 }}>
              Direction editoriale
            </div>
            <ul style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 8, fontSize: 13, lineHeight: 1.6, color: "rgba(250,247,242,0.84)" }}>
              <li>Ypersoa : utile, concret, cadeau, taille, entretien, atelier.</li>
              <li>Breizh Club : un peu plus magazine, chaleureux, ancre dans la fabrication.</li>
              <li>Sortie prete pour Shopify : HTML simple, body enrichi, bloc Liquid et FAQ JSON-LD.</li>
            </ul>
          </div>
        </div>
      </section>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(320px, 420px) minmax(0, 1fr) minmax(280px, 340px)", gap: 24, alignItems: "start" }}>
        <section style={{ ...card, padding: 22, position: "sticky", top: 24 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
            <div>
              <h2 style={{ margin: 0, fontFamily: "var(--font-editorial)", fontSize: 28, fontWeight: 500 }}>Brief</h2>
              <p style={{ margin: "6px 0 0", fontSize: 13, lineHeight: 1.6, color: "rgba(26,22,20,0.62)" }}>
                On cadre l&apos;angle, la SERP et l&apos;objectif avant la generation.
              </p>
            </div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 12, color: "rgba(26,22,20,0.6)" }}>
              <Wand2 size={15} />
              GEO + Shopify
            </div>
          </div>

          <FormField label="Requete cible">
            <input value={targetQuery} onChange={(e) => setTargetQuery(e.target.value)} style={inputStyle} />
          </FormField>

          <FormField label="Angle unique">
            <textarea value={angle} onChange={(e) => setAngle(e.target.value)} style={{ ...inputStyle, minHeight: 92, resize: "vertical" }} />
          </FormField>

          <FormField label="Objectif de conversion">
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {[
                ["club", "Club"],
                ["defensif_marque", "Defensif marque"],
                ["occasion", "Occasion"],
              ].map(([value, label]) => (
                <button
                  key={value}
                  onClick={() => setConversionGoal(value as ConversionGoal)}
                  style={{
                    ...chipStyle,
                    background: conversionGoal === value ? "#1E2D4A" : "white",
                    color: conversionGoal === value ? "#FAF7F2" : "#1A1614",
                    borderColor: conversionGoal === value ? "#1E2D4A" : "rgba(26,22,20,0.12)",
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </FormField>

          <FormField label={`Molesse SERP : ${serpSoftness}/5`}>
            <input type="range" min={1} max={5} value={serpSoftness} onChange={(e) => setSerpSoftness(Number(e.target.value))} style={{ width: "100%" }} />
          </FormField>

          <ListEditor title="Sous-questions" values={subQueries} onChange={setSubQueries} updateList={updateList} />
          <ListEditor title="Hors perimetre" values={outOfScope} onChange={setOutOfScope} updateList={updateList} />

          <FormField label="Liens internes">
            <div style={{ display: "grid", gap: 10 }}>
              {internalLinks.map((link, i) => (
                <div key={`${link.label}-${i}`} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <input
                    value={link.label}
                    onChange={(e) => {
                      const next = [...internalLinks];
                      next[i] = { ...next[i], label: e.target.value };
                      setInternalLinks(next);
                    }}
                    style={inputStyle}
                    placeholder="Label"
                  />
                  <input
                    value={link.url}
                    onChange={(e) => {
                      const next = [...internalLinks];
                      next[i] = { ...next[i], url: e.target.value };
                      setInternalLinks(next);
                    }}
                    style={inputStyle}
                    placeholder="/pages/..."
                  />
                </div>
              ))}
            </div>
          </FormField>

          <div style={{ display: "flex", gap: 10, marginTop: 22 }}>
            <button onClick={onGenerate} disabled={loading} style={primaryButton}>
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
              {loading ? "Generation..." : "Generer l'article"}
            </button>
          </div>

          {error && (
            <div style={{ marginTop: 16, ...noticeStyle("#A76059", "rgba(167,96,89,0.08)") }}>
              <AlertTriangle size={16} />
              <span>{error}</span>
            </div>
          )}
        </section>

        <section style={{ display: "grid", gap: 18 }}>
          <div style={{ ...card, padding: 20 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, marginBottom: 14 }}>
              <div>
                <h2 style={{ margin: 0, fontFamily: "var(--font-editorial)", fontSize: 30, fontWeight: 500 }}>Sortie</h2>
                <p style={{ margin: "6px 0 0", fontSize: 13, lineHeight: 1.6, color: "rgba(26,22,20,0.62)" }}>
                  Article JSON, export Shopify, Liquid et JSON-LD au meme endroit.
                </p>
              </div>

              {data?.lint && (
                <div style={{ textAlign: "right", fontSize: 12, color: "rgba(26,22,20,0.64)" }}>
                  <div style={{ display: "inline-flex", alignItems: "center", gap: 6, color: data.lint.passed ? "#2D6A4F" : "#A76059" }}>
                    {data.lint.passed ? <CheckCircle2 size={15} /> : <AlertTriangle size={15} />}
                    {data.lint.passed ? "Lint passe" : "Lint a relire"}
                  </div>
                  <div style={{ marginTop: 4 }}>{data.lint.wordCount} mots</div>
                </div>
              )}
            </div>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
              <TabButton icon={<FileText size={14} />} active={activeTab === "article"} onClick={() => setActiveTab("article")}>Article</TabButton>
              <TabButton icon={<ScrollText size={14} />} active={activeTab === "html"} onClick={() => setActiveTab("html")}>Shopify HTML</TabButton>
              <TabButton icon={<Wand2 size={14} />} active={activeTab === "liquid"} onClick={() => setActiveTab("liquid")}>Liquid</TabButton>
              <TabButton icon={<FileJson2 size={14} />} active={activeTab === "jsonld"} onClick={() => setActiveTab("jsonld")}>FAQ JSON-LD</TabButton>
            </div>

            {!data && !loading && (
              <div style={{ ...emptyStateStyle }}>
                <Sparkles size={18} />
                <span>Le generateur est pret. Lance un brief a gauche pour remplir cette zone.</span>
              </div>
            )}

            {loading && (
              <div style={{ ...emptyStateStyle }}>
                <Loader2 size={18} className="animate-spin" />
                <span>Generation en cours...</span>
              </div>
            )}

            {data && (
              <>
                {data.repaired && (
                  <div style={{ marginBottom: 12, ...noticeStyle("#7A4A14", "rgba(122,74,20,0.08)") }}>
                    <AlertTriangle size={16} />
                    <span>Une passe de reparation automatique a ete appliquee apres le premier lint.</span>
                  </div>
                )}

                {data.lint && data.lint.errors.length > 0 && (
                  <div style={{ marginBottom: 12, ...noticeStyle("#A76059", "rgba(167,96,89,0.08)") }}>
                    <AlertTriangle size={16} />
                    <span>{data.lint.errors.join(" ")}</span>
                  </div>
                )}

                {data.lint && data.lint.warnings.length > 0 && (
                  <div style={{ marginBottom: 12, ...noticeStyle("#7A4A14", "rgba(122,74,20,0.08)") }}>
                    <AlertTriangle size={16} />
                    <span>{data.lint.warnings.join(" ")}</span>
                  </div>
                )}

                {activeTab === "article" && data.article && (
                  <OutputPanel
                    label="JSON article"
                    copied={copied === "article"}
                    onCopy={() => copyText("article", JSON.stringify(data.article, null, 2))}
                    content={JSON.stringify(data.article, null, 2)}
                  />
                )}

                {activeTab === "html" && data.articleBodyHtml && (
                  <OutputPanel
                    label="Body HTML Shopify"
                    copied={copied === "html"}
                    onCopy={() => copyText("html", data.articleBodyHtml || "")}
                    content={data.articleBodyHtml}
                  />
                )}

                {activeTab === "liquid" && data.shopify?.liquid_section && (
                  <OutputPanel
                    label="Bloc Liquid"
                    copied={copied === "liquid"}
                    onCopy={() => copyText("liquid", data.shopify?.liquid_section || "")}
                    content={data.shopify.liquid_section}
                  />
                )}

                {activeTab === "jsonld" && data.shopify?.faq_jsonld && (
                  <OutputPanel
                    label="FAQ JSON-LD"
                    copied={copied === "jsonld"}
                    onCopy={() => copyText("jsonld", data.shopify?.faq_jsonld || "")}
                    content={data.shopify.faq_jsonld}
                  />
                )}
              </>
            )}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 18 }}>
            <MiniCard
              title="Ce qu'on reprend du blog Ypersoa"
              body="Cartes claires, sujets tres concrets, ancrage cadeau / atelier / entretien, ton simple et premium."
            />
            <MiniCard
              title="Ce qu'on reprend de Breizh Club"
              body="Une touche plus editoriale et magazine, sans perdre l'utilite SEO. Plus de desirabilite, moins de robot."
            />
            <MiniCard
              title="Ce qu'on evite"
              body="Les guides fourre-tout, le jargon machine, les phrases marketing creuses et les CTA trop agressifs."
            />
          </div>
        </section>

        <aside style={{ ...card, padding: 18, position: "sticky", top: 24, display: "grid", gap: 14 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
            <div>
              <h2 style={{ margin: 0, fontFamily: "var(--font-editorial)", fontSize: 26, fontWeight: 500 }}>Bibliotheque</h2>
              <p style={{ margin: "6px 0 0", fontSize: 13, color: "rgba(26,22,20,0.62)", lineHeight: 1.5 }}>
                Les derniers articles generes dans le hub.
              </p>
            </div>
            <button onClick={() => void loadHistory()} style={secondaryButton}>
              {historyLoading ? <Loader2 size={14} className="animate-spin" /> : <ScrollText size={14} />}
              Rafraichir
            </button>
          </div>

          {history.length === 0 && !historyLoading && (
            <div style={emptyStateStyle}>
              <span>Aucun article sauvegarde pour l&apos;instant.</span>
            </div>
          )}

          <div style={{ display: "grid", gap: 10 }}>
            {history.map((item) => (
              <button
                key={item.id}
                onClick={() => void loadArticle(item.id)}
                style={{
                  textAlign: "left",
                  border: "1px solid rgba(26,22,20,0.1)",
                  borderRadius: 16,
                  background: "white",
                  padding: 14,
                  cursor: "pointer",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 8 }}>
                  <span style={{ fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: item.status === "ready_for_review" ? "#2D6A4F" : "#A76059", fontWeight: 700 }}>
                    {item.status === "ready_for_review" ? "Pret a relire" : "Lint failed"}
                  </span>
                  <span style={{ fontSize: 11, color: "rgba(26,22,20,0.46)" }}>
                    {new Date(item.created_at).toLocaleDateString("fr-FR")}
                  </span>
                </div>
                <div style={{ fontSize: 15, lineHeight: 1.35, fontWeight: 600, color: "#1A1614" }}>{item.target_query}</div>
                <div style={{ fontSize: 12, color: "rgba(26,22,20,0.62)", marginTop: 6, lineHeight: 1.5 }}>
                  {item.angle}
                </div>
              </button>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "grid", gap: 8, marginBottom: 16 }}>
      <span style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase", color: "rgba(26,22,20,0.64)" }}>
        {label}
      </span>
      {children}
    </label>
  );
}

function ListEditor({
  title,
  values,
  onChange,
  updateList,
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

function OutputPanel({
  label,
  copied,
  onCopy,
  content,
}: {
  label: string;
  copied: boolean;
  onCopy: () => void;
  content: string;
}) {
  return (
    <div style={{ display: "grid", gap: 10 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <strong style={{ fontSize: 13 }}>{label}</strong>
        <button onClick={onCopy} style={secondaryButton}>
          <Copy size={14} />
          {copied ? "Copie" : "Copier"}
        </button>
      </div>
      <pre
        style={{
          margin: 0,
          whiteSpace: "pre-wrap",
          overflowX: "auto",
          padding: 16,
          borderRadius: 16,
          background: "#182845",
          color: "#FAF7F2",
          fontSize: 12.5,
          lineHeight: 1.7,
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)",
        }}
      >
        {content}
      </pre>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "10px 14px",
        borderRadius: 999,
        border: active ? "1px solid #1E2D4A" : "1px solid rgba(26,22,20,0.12)",
        background: active ? "#1E2D4A" : "white",
        color: active ? "#FAF7F2" : "#1A1614",
        fontSize: 12,
        fontWeight: 600,
      }}
    >
      {icon}
      {children}
    </button>
  );
}

function MiniCard({ title, body }: { title: string; body: string }) {
  return (
    <article style={{ ...card, padding: 18 }}>
      <h3 style={{ margin: 0, fontSize: 15, fontFamily: "var(--font-editorial)", fontWeight: 600 }}>{title}</h3>
      <p style={{ margin: "8px 0 0", fontSize: 13, lineHeight: 1.65, color: "rgba(26,22,20,0.68)" }}>{body}</p>
    </article>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  borderRadius: 14,
  border: "1px solid rgba(26,22,20,0.12)",
  background: "rgba(255,255,255,0.92)",
  padding: "13px 14px",
  fontSize: 14,
  outline: "none",
};

const primaryButton: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  borderRadius: 999,
  border: "none",
  background: "linear-gradient(135deg, #1E2D4A 0%, #A76059 100%)",
  color: "#FAF7F2",
  padding: "12px 18px",
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
};

const secondaryButton: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  borderRadius: 999,
  border: "1px solid rgba(26,22,20,0.12)",
  background: "white",
  color: "#1A1614",
  padding: "8px 12px",
  fontSize: 12,
  fontWeight: 600,
  cursor: "pointer",
};

const chipStyle: React.CSSProperties = {
  borderRadius: 999,
  border: "1px solid rgba(26,22,20,0.12)",
  background: "white",
  padding: "9px 12px",
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
    borderRadius: 14,
    background: bg,
    color,
    fontSize: 13,
    lineHeight: 1.55,
  };
}

const emptyStateStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: "16px 14px",
  borderRadius: 14,
  border: "1px dashed rgba(26,22,20,0.16)",
  color: "rgba(26,22,20,0.62)",
  fontSize: 13,
};
