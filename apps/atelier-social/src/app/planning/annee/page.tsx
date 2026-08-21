"use client";

import { useState, type CSSProperties } from "react";
import { ArrowRight, ChevronDown, Sparkles } from "lucide-react";

type Season = { period: string; title: string; tone: "now" | "next" | "soft"; line: string; challenge: string; steps: string[] };
const SEASONS: Season[] = [
  { period: "Août → septembre 2026", title: "Rentrée, Braderie & Club", tone: "now", line: "On prépare le pic sans se faire manger par lui.", challenge: "Les visuels et les tests sont-ils prêts avant que les 14 publications déboulent ?", steps: ["Braderie de Lille", "Bonne Rentrée", "Lancement du Club"] },
  { period: "Septembre → novembre 2026", title: "Noël se prépare en coulisses", tone: "next", line: "Tests, variantes, shooting. Pas besoin de mettre le sapin le 3 septembre.", challenge: "A-t-on laissé assez de place aux vrais tests, ceux qui évitent les surprises à paillettes ?", steps: ["Motifs & tests", "Shooting", "Mise en lumière"] },
  { period: "Décembre 2026 → février 2027", title: "Cadeaux, puis Saint-Valentin", tone: "soft", line: "On garde ce qui marche, on ne réinvente pas le fil à broder.", challenge: "Quel angle evergreen peut respirer entre les deux temps forts ?", steps: ["Noël", "Le cadeau dernière minute", "Saint-Valentin"] },
  { period: "Mars → juin 2027", title: "Les gens qu'on aime fort", tone: "soft", line: "Grands-mères, Mères, Pères, maîtresses : beaucoup de cœur, une seule équipe.", challenge: "Est-ce que la charge laisse encore du temps pour produire correctement ?", steps: ["Grands-Mères", "Fête des Mères", "Fête des Pères"] },
];

export default function PlanningYearPage() {
  const [open, setOpen] = useState(0);
  return <main style={page}>
    <section style={hero}><div style={stitch} /><p style={eyebrow}>Regarder loin, sans s'y noyer</p><h2 style={title}>Le fil de <em style={{ color: "#C23A2D" }}>l'année</em></h2><p style={intro}>Les temps forts donnent le cap. Le reste reste léger : on regarde ce qui arrive, on se pose une bonne question, puis on retourne faire.</p></section>
    <section style={question}><Sparkles size={19} color="#C23A2D" /><div><b>La question qui compte maintenant</b><p style={{ margin: "3px 0 0" }}>{SEASONS[open].challenge}</p></div></section>
    <div style={sectionHead}><h2 style={{ margin: 0, fontFamily: "var(--font-editorial)", fontWeight: 500 }}>Les rendez-vous qui comptent</h2><span>Un fil, pas un mur de tâches.</span></div>
    <section style={seasons}>{SEASONS.map((season, index) => <article key={season.title} style={{ ...seasonCard, ...(season.tone === "now" ? now : season.tone === "next" ? next : soft), ...(open === index ? selected : {}) }}><button onClick={() => setOpen(index)} style={seasonButton}><span style={period}>{season.period}</span><h3 style={{ margin: 0, fontFamily: "var(--font-editorial)", fontWeight: 500, fontSize: 23 }}>{season.title}</h3><ChevronDown size={16} style={{ marginTop: 5, transform: open === index ? "rotate(180deg)" : undefined }} /><p style={{ gridColumn: "1 / -1", margin: "8px 0 0", color: "#5C554B", fontSize: 12.5, lineHeight: 1.45 }}>{season.line}</p></button>{open === index && <div style={detail}><div style={stepList}>{season.steps.map((item) => <span key={item} style={stepPill}>{item}</span>)}</div><a href="/planning" style={link}>Voir ce qui se prépare cette semaine <ArrowRight size={13} /></a></div>}</article>)}</section>
    <section style={breathing}><div><p style={{ ...eyebrow, color: "#FFB8C8" }}>La respiration</p><h2 style={{ margin: "7px 0", fontFamily: "var(--font-editorial)", fontWeight: 500, fontSize: 25 }}>Entre deux temps forts, l'Evergreen tient la boutique éveillée.</h2><p style={{ maxWidth: 680, margin: 0, color: "#D9E5DD", fontSize: 13, lineHeight: 1.5 }}>Team Brunch, Retour du pull, Dimanche au jardin, Crémaillère : on ne remplit pas les trous. On choisit un angle qui raconte vraiment quelque chose.</p></div><a href="/planning" style={evergreenLink}>Voir les idées Evergreen <ArrowRight size={15} /></a></section>
  </main>;
}

const page: CSSProperties = { maxWidth: 1120, margin: "0 auto", paddingBottom: 52, color: "#2B2620" };
const hero: CSSProperties = { position: "relative", overflow: "hidden", padding: "31px 32px", border: "1px solid #E7DECB", borderRadius: 18, background: "#FFFDF9", boxShadow: "0 10px 30px rgba(34,64,58,.08)" };
const stitch: CSSProperties = { position: "absolute", top: 0, left: 0, right: 0, height: 5, background: "repeating-linear-gradient(90deg,#C23A2D 0 12px,transparent 12px 22px)" };
const eyebrow: CSSProperties = { margin: 0, color: "#C23A2D", fontSize: 10.5, fontWeight: 700, letterSpacing: ".14em", textTransform: "uppercase" };
const title: CSSProperties = { margin: "9px 0 8px", fontFamily: "var(--font-editorial)", fontSize: 42, fontWeight: 500, lineHeight: 1, color: "#22403A" };
const intro: CSSProperties = { maxWidth: 650, margin: 0, color: "#5C554B", fontSize: 14, lineHeight: 1.55 };
const question: CSSProperties = { display: "flex", gap: 11, marginTop: 18, padding: "14px 17px", border: "1px solid #EAB4C4", borderLeft: "4px solid #C23A2D", borderRadius: 14, background: "#FBF0F3", color: "#4A453D", fontSize: 13 };
const sectionHead: CSSProperties = { display: "flex", gap: 12, alignItems: "baseline", flexWrap: "wrap", margin: "28px 2px 13px", color: "#22403A" };
const seasons: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 14 };
const seasonCard: CSSProperties = { border: "1px solid #E7DECB", borderRadius: 15, overflow: "hidden", background: "#FFFDF9" };
const now: CSSProperties = { borderColor: "#C23A2D", background: "linear-gradient(150deg,#FDECE9,#FFFDF9 62%)" };
const next: CSSProperties = { borderColor: "#EAB4C4", background: "linear-gradient(150deg,#FBF0F3,#FFFDF9 62%)" };
const soft: CSSProperties = { background: "#FFFDF9" };
const selected: CSSProperties = { boxShadow: "0 9px 24px rgba(34,64,58,.09)" };
const seasonButton: CSSProperties = { display: "grid", gridTemplateColumns: "1fr auto", width: "100%", padding: 18, border: 0, background: "transparent", color: "#22403A", textAlign: "left", cursor: "pointer", font: "inherit" };
const period: CSSProperties = { gridColumn: "1 / -1", marginBottom: 7, color: "#847A6C", fontSize: 10.5, fontWeight: 700, letterSpacing: ".07em", textTransform: "uppercase" };
const detail: CSSProperties = { padding: "0 18px 17px", borderTop: "1px dashed #E7DECB" };
const stepList: CSSProperties = { display: "flex", flexWrap: "wrap", gap: 6, margin: "13px 0" };
const stepPill: CSSProperties = { padding: "4px 7px", borderRadius: 99, background: "#F6DEE6", color: "#A32E23", fontSize: 10.5, fontWeight: 700 };
const link: CSSProperties = { display: "inline-flex", alignItems: "center", gap: 5, color: "#C23A2D", fontSize: 11.5, fontWeight: 700, textDecoration: "none" };
const breathing: CSSProperties = { display: "flex", justifyContent: "space-between", gap: 24, alignItems: "end", marginTop: 17, padding: "22px", borderRadius: 16, background: "#22403A", color: "#FFF9F0" };
const evergreenLink: CSSProperties = { display: "inline-flex", gap: 6, alignItems: "center", padding: "10px 13px", borderRadius: 99, background: "#FFF9F0", color: "#22403A", textDecoration: "none", fontSize: 12, fontWeight: 700, whiteSpace: "nowrap" };
