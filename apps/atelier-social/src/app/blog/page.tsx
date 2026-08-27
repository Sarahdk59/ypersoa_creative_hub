"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Download, Loader2, RefreshCw, Sparkles, Trash2, Wand2 } from "lucide-react";

type Goal = "club" | "defensif_marque" | "occasion";
interface Article { h1: string; direct_answer: string; sections: { h2: string; body: string }[]; }
interface ShopifyBundle { handle: string; title: string; seo: { title: string; handle: string; meta_title: string; meta_description: string }; article_body_html: string; faq_jsonld: string; liquid_section: string; }
interface RecordArticle { id: string; created_at: string; target_query: string; angle: string; conversion_goal: Goal; sub_queries: string[]; out_of_scope: string[]; article: Article; lint: { wordCount: number }; html: string; shopify?: ShopifyBundle; }
const GOALS: { id: Goal; label: string }[] = [{ id: "club", label: "Rejoindre le Club" }, { id: "defensif_marque", label: "Défendre la marque" }, { id: "occasion", label: "Jouer l'occasion" }];
const DEFAULT_QUESTIONS = ["Les délais sont-ils compatibles avec la rentrée ?", "Comment personnaliser sans faire trop chargé ?", "Pourquoi un vêtement brodé à la commande ?", "Quel type de broderie choisir pour un enfant ?"];
const OUT = ["Les fournitures scolaires", "Les prix et promotions", "Les coulisses de l'atelier"];
const DEFAULT_QUERY = "sweat brodé personnalisé enfant";
const DEFAULT_ANGLE = "Montrer que le sweat brodé à la commande est le cadeau de rentrée qui échappe à la norme et dure dans le temps.";
const countWords = (a?: Article) => a ? [a.h1, a.direct_answer, ...a.sections.flatMap((s) => [s.h2, s.body])].join(" ").trim().split(/\s+/).filter(Boolean).length : 0;
const dateLabel = (d: string) => new Date(d).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "short" });
const shortDate = (d: string) => new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "short" }).toUpperCase();
const slugify = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

export default function AtelierBlogPage() {
  const [history, setHistory] = useState<RecordArticle[]>([]);
  const [current, setCurrent] = useState<RecordArticle | null>(null);
  const [query, setQuery] = useState(DEFAULT_QUERY);
  const [angle, setAngle] = useState(DEFAULT_ANGLE);
  const [goal, setGoal] = useState<Goal>("occasion");
  const [questions, setQuestions] = useState<string[]>(DEFAULT_QUESTIONS);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const didInitRef = useRef(false);
  const selectArticle = (a: RecordArticle) => {
    setCurrent(a);
    setQuery(a.target_query);
    setAngle(a.angle);
    setGoal(a.conversion_goal);
    setQuestions(a.sub_queries.length ? a.sub_queries : DEFAULT_QUESTIONS);
  };
  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/blog/articles", { cache: "no-store" });
      const json = await res.json() as { ok: boolean; items?: RecordArticle[]; error?: string };
      if (!res.ok || !json.ok) throw new Error(json.error ?? "Historique indisponible");
      const items = json.items ?? [];
      setHistory(items);
      if (!didInitRef.current) {
        didInitRef.current = true;
        if (items[0]) selectArticle(items[0]);
      }
    } catch (e) { setError(e instanceof Error ? e.message : "Historique indisponible"); } finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);
  const downloadArticle = (a: RecordArticle) => {
    const payload = {
      sujet: a.target_query,
      objectif_editorial: a.angle,
      objectif_conversion: a.conversion_goal,
      questions_couvertes: a.sub_queries,
      seo: a.shopify?.seo ?? { title: a.article.h1 },
      code_a_coller_dans_shopify: a.shopify?.article_body_html ?? a.html,
      faq_jsonld: a.shopify?.faq_jsonld ? JSON.parse(a.shopify.faq_jsonld) : null,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${slugify(a.article.h1) || a.id}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };
  const deleteArticle = async (id: string) => {
    if (!window.confirm("Supprimer définitivement cet article ?")) return;
    try {
      const res = await fetch(`/api/blog/articles/${id}`, { method: "DELETE" });
      const json = await res.json() as { ok: boolean; error?: string };
      if (!res.ok || !json.ok) throw new Error(json.error ?? "Suppression impossible");
      const next = history.filter((x) => x.id !== id);
      setHistory(next);
      if (current?.id === id) { if (next[0]) selectArticle(next[0]); else setCurrent(null); }
    } catch (e) { setError(e instanceof Error ? e.message : "Suppression impossible"); }
  };
  const generate = async (expand = false) => {
    setGenerating(true); setError(null);
    const effectiveAngle = angle.trim() || `Parler de ${query} avec la voix Ypersoa, sans argumentaire commercial appuyé.`;
    const effectiveQuestions = questions.map((q) => q.trim()).filter(Boolean);
    try {
      const res = await fetch("/api/blog/generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ targetQuery: query, angle: expand ? `${effectiveAngle} Développe davantage les réponses pratiques et la partie entretien.` : effectiveAngle, subQueries: effectiveQuestions, outOfScope: OUT, serpSoftness: 4, conversionGoal: goal }) });
      const json = await res.json() as { ok: boolean; id?: string; article?: Article; lint?: { wordCount: number }; html?: string; error?: string; reasons?: string[] };
      if (!res.ok || !json.ok || !json.article) throw new Error(json.error ?? json.reasons?.join(" ") ?? "Génération impossible");
      didInitRef.current = true;
      setCurrent({ id: json.id ?? `draft-${Date.now()}`, created_at: new Date().toISOString(), target_query: query, angle: effectiveAngle, conversion_goal: goal, sub_queries: effectiveQuestions, out_of_scope: OUT, article: json.article, lint: json.lint ?? { wordCount: countWords(json.article) }, html: json.html ?? "" });
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : "Génération impossible"); } finally { setGenerating(false); }
  };
  const wordCount = current?.lint.wordCount ?? countWords(current?.article);
  const ready = wordCount >= 700 && wordCount <= 1100;
  const published = useMemo(() => history.filter((a) => a.id !== current?.id).slice(0, 5), [history, current]);
  const push = async () => { if (!current?.html) return; await navigator.clipboard.writeText(current.html); setCopied(true); window.setTimeout(() => setCopied(false), 1800); };
  return <main style={page}>
    <section style={hero}><div style={dash} /><div style={{ position: "relative" }}><p style={eyebrow}>Bonjour Sarah</p><h1 style={heroTitle}>On raconte quoi cette <em style={{ color: "#FFB8C8", fontWeight: 400 }}>semaine</em> ?</h1><p style={heroText}>☀️ {current ? "Ton brouillon est prêt à être relu mercredi soir, oklm." : "Donne-moi le thème : je prépare le brouillon, tu gardes le dernier mot."}</p><div style={meta}><span><i style={{ background: ready ? "#95D6B6" : "#FFB8C8" }} /> État <b>{ready ? "Prêt à pousser" : current ? "À enrichir" : "À écrire"}</b></span><span>Semaine du <b>{dateLabel(new Date().toISOString())}</b></span><span>Série <b>{history.length} jeudi{history.length > 1 ? "s" : ""}</b></span></div></div><div style={pill}>Mercredi soir <b>Jeudi matin</b></div></section>
    {error && <div style={errorStyle}>{error}</div>}
    <section style={columns}>
      <article style={panel}><header style={articleHeader}><div><h2 style={heading}>Le brouillon de la semaine</h2><p style={subtle}>Relis, ajuste si besoin, puis pousse-le sur Shopify.</p></div><span style={{ ...eyebrow, color: "#1E7A76", marginTop: 7 }}>{current ? "GÉNÉRÉ" : "À GÉNÉRER"}</span></header><div style={{ padding: 26 }}>{loading ? <Loader2 size={22} className="animate-spin" /> : current ? <><p style={{ ...eyebrow, color: "#D64739" }}>Broderie · Hauts-de-France</p><h3 style={articleTitle}>{current.article.h1}</h3><p style={readMeta}>2 min de lecture &nbsp;·&nbsp; Atelier en France &nbsp;·&nbsp; {wordCount} mots</p><p style={answer}>{current.article.direct_answer}</p></> : <div style={empty}>Le premier sujet attend son brouillon.</div>}</div><footer style={articleFooter}><div style={{ ...wordNotice, ...(ready ? wordReady : {}) }}>{current ? ready ? `✓ ${wordCount} mots : dans la cible 700–1100.` : <>Un peu court : <b>{wordCount} mots</b> pour l&apos;instant. On vise 700 à 1100.</> : "Génère le premier article à partir du cadrage."}</div><div style={actions}><button onClick={push} disabled={!current?.html} style={primary}>{copied ? <Check size={15} /> : <Sparkles size={15} />}{copied ? "HTML copié ✓" : "Copier pour Shopify"}</button><button onClick={() => void generate(true)} disabled={generating} style={secondary}>{generating ? <Loader2 size={15} className="animate-spin" /> : <Wand2 size={15} />}Étoffer le brouillon</button><button onClick={() => void generate()} disabled={generating} style={secondary}><RefreshCw size={15} />Régénérer</button></div></footer></article>
      <aside style={{ ...panel, padding: 22 }}>
        <h2 style={heading}>Cette semaine</h2><p style={subtle}>Le cadrage qui sert au brouillon.</p>
        <label style={label}>Le sujet</label>
        <input value={query} onChange={(e) => setQuery(e.target.value)} style={input}/>
        <label style={label}>L&apos;objectif éditorial <span style={optional}>(optionnel)</span></label>
        <textarea value={angle} onChange={(e) => setAngle(e.target.value)} placeholder="Ex : montrer que le sweat brodé à la commande est un cadeau qui dure. Laisse vide si tu veux que je propose l'angle." style={{ ...input, minHeight: 72, resize: "vertical" }}/>
        <label style={label}>Ce que l&apos;article doit faire</label>
        <div style={tags}>{GOALS.map((g) => <Tag key={g.id} active={goal === g.id} onClick={() => setGoal(g.id)}>{g.label}</Tag>)}</div>
        <label style={label}>Les questions qu&apos;on couvre</label>
        <div style={{ display: "grid", gap: 7 }}>
          {questions.map((q, i) => <div key={i} style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <input value={q} onChange={(e) => setQuestions((qs) => qs.map((x, idx) => idx === i ? e.target.value : x))} style={{ ...input, padding: "8px 9px", fontSize: 12, flex: 1 }}/>
            <button onClick={() => setQuestions((qs) => qs.filter((_, idx) => idx !== i))} style={removeBtn} aria-label="Retirer la question" type="button">×</button>
          </div>)}
          <button onClick={() => setQuestions((qs) => [...qs, ""])} style={addBtn} type="button">+ Ajouter une question</button>
        </div>
        <label style={{ ...label, marginTop: 20 }}>Ce qu&apos;on laisse de côté</label>{OUT.map((v) => <p key={v} style={out}>× &nbsp;{v}</p>)}
        <button onClick={() => void generate()} disabled={generating} style={{ ...secondary, marginTop: 18, color: "#19766F", borderColor: "#B7D4CE" }}>{generating ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}Lancer le brouillon</button>
      </aside>
    </section>
    <section style={{ marginTop: 28 }}><div style={calendarHead}><h2 style={heading}>Les jeudis tenus</h2><span style={subtle}>Calendrier éditorial · {history.length} article{history.length > 1 ? "s" : ""}</span></div><div style={calendar}>{published.map((a) => <div key={a.id} style={calendarCard}>
      <div onClick={() => selectArticle(a)} role="button" tabIndex={0} style={{ cursor: "pointer", display: "flex", flexDirection: "column", gap: 8, width: "100%" }}>
        <span style={calDate}>{shortDate(a.created_at)}</span><b>{a.article.h1}</b><small>{a.lint.wordCount} mots <em>En ligne</em></small>
      </div>
      <div style={{ display: "flex", gap: 6, marginTop: "auto" }}>
        <button onClick={() => downloadArticle(a)} style={cardIconBtn} title="Télécharger le code prêt à coller dans Shopify (JSON)" type="button"><Download size={13} /></button>
        <button onClick={() => void deleteArticle(a.id)} style={{ ...cardIconBtn, color: "#B4443A", borderColor: "#EEC9C2" }} title="Supprimer" type="button"><Trash2 size={13} /></button>
      </div>
    </div>)}<div style={{ ...calendarCard, borderStyle: "dashed", color: "#9C8E83", justifyContent: "center", textAlign: "center" }}>Jeudi prochain<br/>t&apos;attend</div></div></section>
    <footer style={ritual}>✺ &nbsp; Le brouillon s&apos;écrit le mercredi soir à partir du sujet repéré. Le jeudi matin, tu relis, étoffes si besoin, puis pousses. &nbsp; <strong>Bisous Coeur.</strong></footer>
  </main>;
}
function Tag({ children, active = false, onClick }: { children: React.ReactNode; active?: boolean; onClick?: () => void }) { return <button type="button" onClick={onClick} style={{ padding: "7px 11px", borderRadius: 999, border: "none", background: active ? "#D64739" : "#EFE7D7", color: active ? "white" : "#62574E", fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}>{children}</button>; }
// Le blog est un espace de relecture : il profite du format paysage du Hub
// plutôt que de rester dans une colonne éditoriale étroite.
const page: React.CSSProperties = { width: "100%", maxWidth: 1640, margin: "0 auto", padding: "4px 24px 44px", color: "#193B38", boxSizing: "border-box" };
const hero: React.CSSProperties = { position: "relative", overflow: "hidden", minHeight: 188, padding: "48px 34px 25px", borderRadius: 26, background: "linear-gradient(130deg,#194D47,#133936)", boxShadow: "0 18px 36px rgba(28,57,51,.16)" };
const dash: React.CSSProperties = { position: "absolute", inset: "26px 34px auto", borderTop: "2px dashed #EAA9BB", opacity: .75 };
const eyebrow: React.CSSProperties = { margin: 0, fontSize: 10, fontWeight: 700, letterSpacing: ".22em", textTransform: "uppercase", color: "#FFBAC9" };
const heroTitle: React.CSSProperties = { margin: "12px 0 4px", fontFamily: "var(--font-editorial)", color: "#FFF9F0", fontSize: 44, lineHeight: .95, fontWeight: 500 };
const heroText: React.CSSProperties = { margin: 0, color: "#F8E9DE", fontSize: 14 };
const meta: React.CSSProperties = { display: "flex", flexWrap: "wrap", gap: 24, marginTop: 28, color: "#D1E0D7", fontSize: 12 };
const pill: React.CSSProperties = { position: "absolute", right: 36, top: 50, padding: "10px 14px", borderRadius: 999, background: "rgba(255,255,255,.15)", color: "#DCE8DD", fontSize: 11 };
const panel: React.CSSProperties = { background: "rgba(255,253,249,.94)", border: "1px solid #E2D7C5", borderRadius: 18, boxShadow: "0 15px 30px rgba(62,47,35,.06)" };
const columns: React.CSSProperties = { display: "grid", gridTemplateColumns: "minmax(0,1.7fr) minmax(360px,.9fr)", gap: 24, marginTop: 20, alignItems: "start" };
const heading: React.CSSProperties = { margin: 0, fontFamily: "var(--font-editorial)", fontWeight: 500, color: "#3A302B", fontSize: 23 };
const subtle: React.CSSProperties = { margin: "5px 0 16px", color: "#8A7D73", fontSize: 12 };
const articleHeader: React.CSSProperties = { display: "flex", justifyContent: "space-between", gap: 12, padding: "22px 26px 16px", borderBottom: "1px solid #E5D9C7" };
const articleTitle: React.CSSProperties = { margin: "10px 0", fontFamily: "var(--font-editorial)", fontWeight: 500, color: "#3A302B", fontSize: 33, lineHeight: 1.08 };
const readMeta: React.CSSProperties = { color: "#8A7D73", fontSize: 12, margin: "0 0 18px" };
const answer: React.CSSProperties = { margin: 0, color: "#50443D", fontFamily: "var(--font-editorial)", fontSize: 17, lineHeight: 1.6 };
const empty: React.CSSProperties = { padding: "36px 0", textAlign: "center", color: "#8A7D73" };
const articleFooter: React.CSSProperties = { padding: "16px 24px 20px", borderTop: "1px solid #F0E8DD" };
const wordNotice: React.CSSProperties = { background: "#F9E3E8", color: "#A43E4A", border: "1px solid #F0C6D0", borderRadius: 12, padding: "11px 14px", fontSize: 12, marginBottom: 16 };
const wordReady: React.CSSProperties = { background: "#E2F2E8", color: "#246A52", borderColor: "#B7DBC2" };
const actions: React.CSSProperties = { display: "flex", gap: 9, flexWrap: "wrap" };
const primary: React.CSSProperties = { display: "inline-flex", alignItems: "center", gap: 7, border: "none", borderRadius: 10, padding: "10px 14px", background: "#24857F", color: "white", cursor: "pointer", fontWeight: 700, fontSize: 12 };
const secondary: React.CSSProperties = { display: "inline-flex", alignItems: "center", gap: 7, border: "1px solid #DED1BD", borderRadius: 10, padding: "9px 12px", background: "#FFFCF7", color: "#3A4A45", cursor: "pointer", fontWeight: 600, fontSize: 12 };
const label: React.CSSProperties = { display: "block", margin: "16px 0 7px", color: "#7A6E64", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".13em" };
const input: React.CSSProperties = { boxSizing: "border-box", width: "100%", padding: "10px 11px", border: "1px solid #E0D4C1", borderRadius: 9, background: "#FFFCF7", color: "#3A302B", font: "inherit", fontSize: 13, outlineColor: "#1E7A76" };
const tags: React.CSSProperties = { display: "flex", gap: 7, flexWrap: "wrap", marginBottom: 18 };
const optional: React.CSSProperties = { textTransform: "none", fontWeight: 400, letterSpacing: 0, color: "#B0A497" };
const removeBtn: React.CSSProperties = { border: "1px solid #E4D8C5", borderRadius: 8, background: "#F8F3E9", color: "#8A7D73", width: 30, height: 34, cursor: "pointer", fontSize: 15, lineHeight: 1, flexShrink: 0 };
const addBtn: React.CSSProperties = { border: "1px dashed #DED1BD", borderRadius: 9, background: "transparent", color: "#7A6E64", padding: "8px 10px", cursor: "pointer", fontSize: 12, textAlign: "left" };
const out: React.CSSProperties = { margin: "0 0 7px", fontSize: 12, color: "#8A7D73" };
const calendarHead: React.CSSProperties = { display: "flex", alignItems: "baseline", justifyContent: "space-between", borderBottom: "2px dashed #F0B4C1", paddingBottom: 11 };
const calendar: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 14, marginTop: 16 };
const calendarCard: React.CSSProperties = { minHeight: 116, display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 8, padding: 15, border: "1px solid #E1D5C3", borderRadius: 14, background: "#FFFCF7", color: "#24433F", fontFamily: "inherit", fontSize: 14, textAlign: "left" };
const cardIconBtn: React.CSSProperties = { display: "inline-flex", alignItems: "center", justifyContent: "center", width: 26, height: 26, border: "1px solid #E4D8C5", borderRadius: 8, background: "#F8F3E9", color: "#7A6E64", cursor: "pointer" };
const calDate: React.CSSProperties = { color: "#D64739", fontSize: 10, fontWeight: 700 };
const ritual: React.CSSProperties = { marginTop: 26, padding: "15px 18px", borderRadius: 12, background: "#F0E7D4", color: "#665C52", fontSize: 12 };
const errorStyle: React.CSSProperties = { margin: "16px 0", padding: 12, borderRadius: 10, background: "#FBE4E8", color: "#9C3026", fontSize: 13 };
