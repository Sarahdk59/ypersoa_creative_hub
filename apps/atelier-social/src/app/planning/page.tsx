"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { ArrowRight, ChevronDown, Flame } from "lucide-react";

type Team = "crea" | "prod" | "comm";
type Status = "a_faire" | "en_cours" | "fait";
type Week = { dates: string; theme: string; heat: "calm" | "hot" | "peak"; event?: string; posts: number; article: string; note?: string; formats?: string };
type Priority = { id: string; team: Team; title: string; note: string; status: Status; dependsOn?: string };

const DEFAULT_WEEKS: Week[] = [
  { dates: "17 → 23 août", theme: "Mariage / Summer", heat: "calm", posts: 3, article: "jeu. 21", formats: "Réel · le prénom brodé qui fait la différence" },
  { dates: "24 → 30 août", theme: "Anniversaire", heat: "hot", event: "Braderie de Lille", posts: 7, article: "jeu. 28", formats: "Carrousel · cadeaux qui sauvent la mise" },
  { dates: "31 août → 6 sept.", theme: "Bonne Rentrée", heat: "peak", event: "Lancement Club", posts: 14, article: "jeu. 4", formats: "POV · premier lundi de rentrée" },
  { dates: "7 → 13 sept.", theme: "Reprise sport", heat: "calm", posts: 3, article: "jeu. 11", note: "Motivation, sport et nouvelles résolutions — sans prétendre devenir une personne qui court à 6 h.", formats: "Réel · motivation du lundi · Carrousel · nouvelles résolutions" },
];
const INITIAL_PRIORITIES: Priority[] = [
  { id: "crea-1", team: "crea", title: "Finaliser les visuels Anniversaire", note: "La Braderie démarre le 24. Pas de panique, on a aussi rendez-vous avec les moules.", status: "en_cours" },
  { id: "crea-2", team: "crea", title: "Envoyer les tests Noël à la Prod", note: "Les broderies n'attendent pas décembre pour faire leur diva.", status: "a_faire" },
  { id: "prod-1", team: "prod", title: "Tester les broderies Noël", note: "Prévoir deux heures, au calme, avec le café qui tient debout.", status: "a_faire", dependsOn: "crea-2" },
  { id: "prod-2", team: "prod", title: "Préparer la Braderie de Lille", note: "Pas de deadline, pas de cutoff : on est cool, on mange des moules.", status: "en_cours" },
  { id: "comm-1", team: "comm", title: "Préparer les 3 publications Summer", note: "Maï les garde ici : un seul fil, pas un deuxième outil qui prend la poussière.", status: "a_faire" },
  { id: "comm-2", team: "comm", title: "Préparer le tournage des tests Noël", note: "Dès que la Prod a fini, Maï peut filmer sans jouer à Madame Irma.", status: "a_faire", dependsOn: "prod-1" },
];
const TEAM: Record<Team, { label: string; who: string; color: string }> = {
  crea: { label: "Créa", who: "Sarah", color: "#22403A" }, prod: { label: "Prod", who: "Adriana, Cyrielle, Rebecca, Felismina", color: "#2E5B50" }, comm: { label: "Comm", who: "Maï", color: "#C23A2D" },
};

export default function TempoPage() {
  const [selectedWeek, setSelectedWeek] = useState(0);
  const [weeks, setWeeks] = useState<Week[]>(DEFAULT_WEEKS);
  const [priorities, setPriorities] = useState(INITIAL_PRIORITIES);
  const [briefs, setBriefs] = useState<Record<string, string>>({ "Mariage / Summer": "Cette semaine, on raconte les petits détails qui rendent un cadeau de mariage vraiment à quelqu'un." });
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [showAll, setShowAll] = useState(false);
  const [evergreenIndex, setEvergreenIndex] = useState(0);
  useEffect(() => { void fetch("/api/planning/tempo").then((r) => r.json()).then((json) => { if (json.ok) { setPriorities(json.data.priorities); setBriefs(json.data.briefs); if (json.data.weeks?.length) setWeeks(json.data.weeks); } }).catch(() => undefined); }, []);
  const done = priorities.filter((p) => p.status === "fait").length;
  const held = done >= 3;
  const save = async (nextPriorities: Priority[], nextBriefs: Record<string, string>, nextWeeks = weeks) => { setSaveState("saving"); try { const response = await fetch("/api/planning/tempo", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ priorities: nextPriorities, briefs: nextBriefs, weeks: nextWeeks }) }); if (!response.ok) throw new Error(); setSaveState("saved"); window.setTimeout(() => setSaveState("idle"), 1400); } catch { setSaveState("error"); } };
  const update = (id: string, patch: Partial<Priority>) => { const next = priorities.map((p) => p.id === id ? { ...p, ...patch } : p); setPriorities(next); void save(next, briefs); };
  const remove = (id: string) => { const next = priorities.filter((p) => p.id !== id); setPriorities(next); void save(next, briefs); };
  const add = (team: Team) => { if (priorities.filter((p) => p.team === team).length >= 3) return; const next = [...priorities, { id: `manuel-${Date.now()}`, team, title: "Nouvelle priorité", note: "Écris ce qui compte vraiment cette semaine.", status: "a_faire" as Status }]; setPriorities(next); void save(next, briefs); };
  const updateWeek = (patch: Partial<Week>) => { const next = weeks.map((week, index) => index === selectedWeek ? { ...week, ...patch } : week); setWeeks(next); void save(priorities, briefs, next); };
  const isBlocked = (p: Priority) => !!p.dependsOn && priorities.find((x) => x.id === p.dependsOn)?.status !== "fait";
  const visibleWeeks = showAll ? [...weeks, { dates: "14 → 20 sept.", theme: "Automne & naissance", heat: "calm" as const, posts: 3, article: "jeu. 18" }] : weeks;
  const selected = weeks[selectedWeek] ?? DEFAULT_WEEKS[0];
  return <main style={page}>
    <section style={hero}><div style={stitch} /><div style={heroGrid}><div><p style={eyebrow}>Où on en est, cette semaine</p><h2 style={heroTitle}>Le <em style={{ color: "#C23A2D" }}>tempo</em></h2><p style={whisper}>🌙 On est jeudi 20 août — {selected.theme}, {selected.posts} publis. La rentrée arrive avec ses gros sabots : on prépare maintenant, on panique jamais.</p></div><div style={metrics}><Metric title="Semaines tenues" value={held ? "1" : "—"} sub={held ? "3 priorités bouclées" : `${done}/3 priorités cette semaine`} dots /><Metric title="Abonnés Insta" value="—" sub="le premier relevé arrive bientôt" /></div></div></section>
    <SectionTitle title="Le fil des semaines" hint="Coquelicot : ça chauffe. Blush : on respire. Clique une semaine pour voir ce qui compte." />
    <section style={ribbon}><div style={thread} /><div style={weekGrid}>{visibleWeeks.map((week, index) => <button key={week.dates} onClick={() => setSelectedWeek(Math.min(index, weeks.length - 1))} style={{ ...weekCard, ...(week.heat === "calm" ? calm : hot), ...(index === selectedWeek ? active : {}) }}>{index === 0 && <span style={nowTag}>Cette semaine</span>}{week.heat === "peak" && <span style={peakTag}>⚡ pic de la saison</span>}<span style={dates}>{week.dates}</span><strong style={weekTheme}>{week.theme}</strong>{(week.event || week.heat === "calm") && <span style={{ ...heatPill, ...(week.heat === "calm" ? calmPill : hotPill) }}>{week.heat === "calm" ? "◐ On respire" : week.event}</span>}<span style={weekMeta}>✏️ Article · {week.article}</span><span style={weekMeta}>◎ {week.posts} publication{week.posts > 1 ? "s" : ""}</span>{week.formats && <span style={formatMeta}>{week.formats}</span>}</button>)}</div><button onClick={() => setShowAll((v) => !v)} style={allWeeks}>{showAll ? "Refermer" : "+ 7 semaines calées jusqu'au 25 oct — tout voir"} <ChevronDown size={14} /></button></section>
    <section style={weekEditor}><div><p style={eyebrow}>Ajuster la semaine</p><h3 style={{ margin: "5px 0 0", fontFamily: "var(--font-editorial)", fontSize: 21, fontWeight: 500, color: "#22403A" }}>{selected.dates}</h3></div><label style={editorField}>Thème<input value={selected.theme} onChange={(e) => updateWeek({ theme: e.target.value })} style={editorInput} /></label><label style={editorField}>Temps fort <small>Vide = on le supprime.</small><input value={selected.event ?? ""} onChange={(e) => updateWeek({ event: e.target.value || undefined })} placeholder="ex. Braderie de Lille" style={editorInput} /></label><label style={editorField}>Article<input value={selected.article} onChange={(e) => updateWeek({ article: e.target.value })} style={editorInput} /></label><label style={editorField}>Publications<input type="number" min="0" value={selected.posts} onChange={(e) => updateWeek({ posts: Number(e.target.value) || 0 })} style={editorInput} /></label><label style={{ ...editorField, gridColumn: "span 2" }}>Angle de semaine<textarea value={selected.note ?? ""} onChange={(e) => updateWeek({ note: e.target.value })} placeholder="ex. Motivation, sport et nouvelles résolutions…" style={editorTextarea} /></label><label style={{ ...editorField, gridColumn: "span 2" }}>Formats / détail à garder en tête<textarea value={selected.formats ?? ""} onChange={(e) => updateWeek({ formats: e.target.value })} placeholder="Réel · …  /  Carrousel · …  /  POV · …" style={editorTextarea} /></label></section>
    <section style={alert}><Flame size={21} color="#C23A2D" /><p><b>Ton pic arrive dans 10 jours.</b><br />Braderie puis Bonne Rentrée : jusqu'à 14 publications. Cette semaine est calme : c'est le moment de préparer les visuels, les tests et les petits coups de génie.</p></section>
    <SectionTitle title="Cette semaine en détail" hint={`${selected.theme} · un seul fil, trois métiers.`} />
    <section style={detailGrid}><article style={panel}><h3 style={panelTitle}>Le fil de Maï</h3><p style={sub}>Ce qu'on raconte. L'Insta réchauffe, il ne vend pas à coups de mégaphone.</p><div style={thursday}><div style={day}><b>21</b><span>jeudi</span></div><div><b style={{ color: "#22403A" }}>L'article du jeudi — Top 10 des cadeaux à broder</b><p style={small}>Brief prêt mercredi 19h. Tu relis, tu pousses jeudi matin. Bisous Coeur.</p></div></div><Publication label="Connexion" title="Pourquoi un prénom brodé sur une tenue de mariage" date="mar. 19" /><Publication label="Preuve" title="L'atelier finit une commande mariage" date="ven. 22" /><label style={briefLabel}>Le brief de Maï · {selected.theme}</label><textarea value={briefs[selected.theme] ?? ""} onChange={(e) => setBriefs((all) => ({ ...all, [selected.theme]: e.target.value }))} onBlur={() => void save(priorities, briefs)} placeholder="Maï pose ici l'angle, l'humeur, ce qu'on veut montrer…" style={briefInput} /><p style={sourceNote}>Les idées, les dates et les choix vivent ici. {saveState === "saving" ? "Sauvegarde…" : saveState === "saved" ? "Sauvegardé ✓" : saveState === "error" ? "Erreur de sauvegarde." : ""}</p></article><article style={panel}><h3 style={panelTitle}>Les 3 ateliers</h3><p style={sub}>Trois priorités max. Le reste attend poliment.</p><div style={teamGrid}>{(["crea", "prod", "comm"] as Team[]).map((team) => <div key={team} style={{ ...teamColumn, borderTopColor: TEAM[team].color }}><div style={teamHead}><span style={{ ...teamChip, background: TEAM[team].color }}>{TEAM[team].label}</span><span>{TEAM[team].who}</span></div>{priorities.filter((p) => p.team === team).map((p) => <PriorityCard key={p.id} priority={p} blocked={isBlocked(p)} onUpdate={update} onRemove={remove} />)}<button type="button" onClick={() => add(team)} disabled={priorities.filter((p) => p.team === team).length >= 3} style={addPriority}>+ Ajouter</button></div>)}</div></article></section>
    <section style={calendarBoard}><div style={calendarIntro}><p style={eyebrow}>Après la semaine</p><h2 style={{ margin: "7px 0 4px", fontFamily: "var(--font-editorial)", fontSize: 24, fontWeight: 500, color: "#22403A" }}>Les temps forts, et ce qui vit entre deux</h2><p style={{ margin: 0, fontSize: 12.5, color: "#847A6C" }}>Les temps forts donnent le cap. L'evergreen garde la boutique vivante — avec des angles déjà prêts, pas une boîte à citations Pinterest.</p></div><div style={seasonGrid}><div><div style={trackHead}><b>Temps forts à préparer</b><a href="/planning/annee" style={yearLink}>Voir l'année <ArrowRight size={14} /></a></div><div style={milestoneList}><Milestone date="24 août" title="Braderie de Lille" detail="7 publications · visuels prêts avant dimanche" /><Milestone date="31 août" title="Bonne Rentrée & Club" detail="14 publications · le pic, pas un sprint surprise" hot /><Milestone date="sept. → nov." title="Noël arrive en coulisses" detail="Tests → variantes → shooting → lancement" /></div></div><div style={evergreenBox}><div style={trackHead}><b>💡 Evergreen — une idée ? <span style={{ color: "#847A6C", fontWeight: 400 }}>· {EVERGREEN_IDEAS.length} angles dispo</span></b><button onClick={() => setEvergreenIndex((i) => (i + 1) % EVERGREEN_IDEAS.length)} style={ideaButton}>Voir l'angle suivant ↻</button></div><p style={evergreenLabel}>Moment éditorial · engagement / reach · pas de deadline commande</p><h3 style={evergreenTitle}>{EVERGREEN_IDEAS[evergreenIndex].title}</h3><p style={evergreenText}>{EVERGREEN_IDEAS[evergreenIndex].text}</p><p style={readOnlyNote}>Inspiration seulement : aucun pack, mannequin ou contenu n'est ajouté quand tu fais défiler les angles.</p></div></div></section>
  </main>;
}

function Metric({ title, value, sub, dots }: { title: string; value: string; sub: string; dots?: boolean }) { return <div style={metric}><span style={metricLabel}>{title}</span><b style={metricValue}>{value}</b><small style={{ color: "#C23A2D" }}>{sub}</small>{dots && <div style={dotRow}>{[0, 1, 2, 3].map((x) => <i key={x} style={{ ...dot, background: x < 3 ? "#C23A2D" : "transparent", borderStyle: x < 3 ? "solid" : "dashed" }} />)}</div>}</div>; }
function SectionTitle({ title, hint }: { title: string; hint: string }) { return <div style={sectionTitle}><h2 style={{ margin: 0, fontFamily: "var(--font-editorial)", fontWeight: 500, fontSize: 23 }}>{title}</h2><span>{hint}</span></div>; }
function Publication({ label, title, date }: { label: string; title: string; date: string }) { return <div style={publication}><span style={intention}>{label}</span><span>{title}</span><small>{date}</small></div>; }
function PriorityCard({ priority, blocked, onUpdate, onRemove }: { priority: Priority; blocked: boolean; onUpdate: (id: string, patch: Partial<Priority>) => void; onRemove: (id: string) => void }) { return <div style={{ ...priorityCard, opacity: blocked ? .62 : 1 }}><input aria-label="Titre de la priorité" defaultValue={priority.title} onBlur={(e) => onUpdate(priority.id, { title: e.target.value || "Nouvelle priorité" })} style={priorityTitleInput} /><textarea aria-label="Note de la priorité" defaultValue={priority.note} onBlur={(e) => onUpdate(priority.id, { note: e.target.value })} style={priorityNoteInput} />{blocked && <p style={{ margin: "3px 0", color: "#847A6C" }}>↳ attend l'étape juste avant</p>}<div style={{ display: "flex", gap: 5, marginTop: 7 }}><select aria-label={`État : ${priority.title}`} value={priority.status} onChange={(e) => onUpdate(priority.id, { status: e.target.value as Status })} style={statusSelect}><option value="a_faire">À faire</option><option value="en_cours">En cours</option><option value="fait">Fait ✓</option></select><button type="button" onClick={() => onRemove(priority.id)} style={deletePriority} aria-label={`Supprimer ${priority.title}`}>×</button></div></div>; }
function Milestone({ date, title, detail, hot = false }: { date: string; title: string; detail: string; hot?: boolean }) { return <div style={milestone}><span style={{ ...milestoneDate, ...(hot ? { background: "#C23A2D", color: "white" } : {}) }}>{date}</span><div><b>{title}</b><p>{detail}</p></div></div>; }

const EVERGREEN_IDEAS = [
  { title: "Le Cadeau de Dernière Minute", text: "Pour le retardataire chronique : « T'as oublié. On le sait. On brode quand même. » À dégainer juste avant chaque pic — Noël, fêtes des mères/pères. Motif rapide : initiale ou prénom.", packs: ["YPM-016 × MAN-P01", "YPM-013 × MAN-P01"] },
  { title: "Il a Déjà Tout", text: "La personne impossible à gâter : « Il a tout ? Pas ton prénom brodé, non. » Initiale homme, fond sobre. Anniv ou Noël.", packs: ["YPM-016 × MAN-P06", "YPM-016 × MAN-S19", "YPM-016 × MAN-P06"] },
  { title: "Le Pot de Départ", text: "Remplace la carte qui circule au bureau : « On a tous signé. On a brodé en plus. » Cadeau collectif de départ / retraite. Le Club prénoms d'équipe.", packs: ["YPM-003 × MAN-P03", "YPM-011 × MAN-P06"] },
  { title: "Le Cadeau Réconciliation", text: "Après la dispute : « Plus efficace qu'un bouquet. Et ça tient plus longtemps. » Le geste qui répare, brodé. Le Câlin / La Confidence.", packs: ["YPM-006 × MAN-P01", "YPM-011 × MAN-P03", "YPM-006 × MAN-P01"] },
  { title: "Automne", text: "Loft Organique, lumière sépia. Retour du sweat, palette chaude, premiers feux. Cocooning assumé.", packs: ["YPM-007 × MAN-P01", "YPM-012 × MAN-P10", "YPM-007 × MAN-P01"] },
  { title: "La Rentrée ? Non, j'irai pas", text: "Le sweat anti-réveil. Mood « encore cinq minutes », café qui refroidit, valise pas défaite. On brode l'humeur, pas l'emploi du temps.", packs: ["YPM-013 × MAN-S20", "YPM-016 × MAN-S21", "YPM-013 × MAN-S20"] },
  { title: "Dimanche au Jardin", text: "Le sweat du dimanche, le café qui traîne, le sécateur jamais loin. Slow living assumé. L'Aube Intime, lumière matinale, grain de peau.", packs: ["YPM-007 × MAN-P10", "YPM-010 × MAN-P01", "YPM-007 × MAN-P10"] },
  { title: "Le Retour du Pull", text: "Première laine de la saison, premier feu, premières mains rentrées dans les manches. Le grand sweat brodé qu'on ne quitte plus jusqu'en mars.", packs: ["YPM-012 × MAN-P01", "YPM-001 × MAN-P10", "YPM-012 × MAN-P01"] },
  { title: "Team Brunch (jamais avant midi)", text: "Evergreen : œufs, pain perdu, ragots. Le Club brodé des dimanches qui commencent à 13 h. Toujours dispo quand le calendrier a un trou.", packs: ["YPM-003 × MAN-P03", "YPM-007 × MAN-P01", "YPM-003 × MAN-P03"] },
  { title: "La Crémaillère", text: "Nouveau chez-soi : « Nouveau canapé, nouveau plaid à ton nom. » Le textile maison brodé pour pendaison de crémaillère. Loft Organique.", packs: ["YPM-010 × MAN-S20", "YPM-007 × MAN-S21", "YPM-010 × MAN-S20"] },
];

const page: CSSProperties = { maxWidth: 1120, margin: "0 auto", paddingBottom: 52, color: "#2B2620" };
const hero: CSSProperties = { position: "relative", overflow: "hidden", padding: "31px 32px", border: "1px solid #E7DECB", borderRadius: 18, background: "#FFFDF9", boxShadow: "0 10px 30px rgba(34,64,58,.08)" };
const stitch: CSSProperties = { position: "absolute", top: 0, left: 0, right: 0, height: 5, background: "repeating-linear-gradient(90deg,#C23A2D 0 12px,transparent 12px 22px)" };
const heroGrid: CSSProperties = { display: "flex", justifyContent: "space-between", gap: 22, alignItems: "end", flexWrap: "wrap" };
const eyebrow: CSSProperties = { margin: 0, fontSize: 11, letterSpacing: ".14em", textTransform: "uppercase", color: "#C23A2D", fontWeight: 700 };
const heroTitle: CSSProperties = { margin: "8px 0", fontFamily: "var(--font-editorial)", fontWeight: 500, fontSize: 42, lineHeight: 1, color: "#22403A" };
const whisper: CSSProperties = { margin: 0, maxWidth: 570, fontSize: 14, color: "#5C554B", lineHeight: 1.55 };
const metrics: CSSProperties = { display: "flex", gap: 10, flexWrap: "wrap" };
const metric: CSSProperties = { minWidth: 148, padding: "11px 14px", border: "1px solid #E7DECB", borderRadius: 13, background: "#FBF6EC" };
const metricLabel: CSSProperties = { display: "block", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em", color: "#847A6C" };
const metricValue: CSSProperties = { display: "block", marginTop: 2, fontFamily: "var(--font-editorial)", fontSize: 25, color: "#22403A" };
const dotRow: CSSProperties = { display: "flex", gap: 4, marginTop: 7 };
const dot: CSSProperties = { width: 10, height: 10, border: "1.5px solid #C23A2D", borderRadius: 99 };
const sectionTitle: CSSProperties = { display: "flex", gap: 12, alignItems: "baseline", flexWrap: "wrap", margin: "30px 2px 14px", color: "#22403A" };
const ribbon: CSSProperties = { position: "relative", paddingTop: 24 };
const thread: CSSProperties = { position: "absolute", top: 10, left: 0, right: 0, borderTop: "2px dashed rgba(34,64,58,.55)" };
const weekGrid: CSSProperties = { position: "relative", display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 13 };
const weekCard: CSSProperties = { position: "relative", minHeight: 170, padding: "16px", border: "1px solid #E7DECB", borderRadius: 15, textAlign: "left", cursor: "pointer", fontFamily: "inherit", color: "#2B2620" };
const calm: CSSProperties = { background: "linear-gradient(180deg,#FBF0F3,#FFFDF9 53%)", borderColor: "#EAB4C4" };
const hot: CSSProperties = { background: "linear-gradient(180deg,#FDF0ED,#FFFDF9 53%)", borderColor: "#E4B7B0" };
const active: CSSProperties = { outline: "2px solid rgba(194,58,45,.23)", borderColor: "#C23A2D" };
const nowTag: CSSProperties = { position: "absolute", top: -11, right: 12, padding: "3px 8px", background: "#C23A2D", color: "white", borderRadius: 99, fontSize: 10, textTransform: "uppercase", fontWeight: 700 };
const peakTag: CSSProperties = { position: "absolute", top: -11, right: 10, padding: "3px 7px", background: "#A32E23", color: "white", borderRadius: 99, fontSize: 9, fontWeight: 700 };
const dates: CSSProperties = { display: "block", fontSize: 10, fontWeight: 700, color: "#847A6C", letterSpacing: ".06em", textTransform: "uppercase" };
const weekTheme: CSSProperties = { display: "block", minHeight: 42, margin: "7px 0 10px", fontFamily: "var(--font-editorial)", fontWeight: 500, fontSize: 18, lineHeight: 1.12, color: "#22403A" };
const heatPill: CSSProperties = { display: "inline-block", padding: "3px 8px", borderRadius: 99, fontSize: 10, fontWeight: 700 };
const calmPill: CSSProperties = { background: "#F6DEE6", color: "#A32E23" };
const hotPill: CSSProperties = { background: "#C23A2D", color: "white" };
const weekMeta: CSSProperties = { display: "block", marginTop: 9, paddingTop: 8, borderTop: "1px dashed #E7DECB", fontSize: 11.5, color: "#5C554B" };
const formatMeta: CSSProperties = { display: "block", marginTop: 7, color: "#847A6C", fontSize: 10.5, lineHeight: 1.3 };
const allWeeks: CSSProperties = { display: "flex", alignItems: "center", gap: 5, margin: "15px auto 0", border: 0, background: "transparent", color: "#C23A2D", cursor: "pointer", font: "inherit", fontSize: 12, fontWeight: 700 };
const weekEditor: CSSProperties = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, alignItems: "end", marginTop: 18, padding: 18, border: "1px solid #E7DECB", borderRadius: 15, background: "#FFFDF9" };
const editorField: CSSProperties = { display: "grid", gap: 5, color: "#5C554B", fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".07em" };
const editorInput: CSSProperties = { boxSizing: "border-box", width: "100%", padding: "8px 9px", border: "1px solid #E0D4C1", borderRadius: 8, background: "#FBF6EC", color: "#22403A", font: "inherit", fontSize: 12.5, fontWeight: 500, textTransform: "none", letterSpacing: 0 };
const editorTextarea: CSSProperties = { boxSizing: "border-box", width: "100%", minHeight: 54, padding: "8px 9px", resize: "vertical", border: "1px solid #E0D4C1", borderRadius: 8, background: "#FBF6EC", color: "#22403A", font: "inherit", fontSize: 12.5, fontWeight: 400, lineHeight: 1.4, textTransform: "none", letterSpacing: 0 };
const alert: CSSProperties = { display: "flex", gap: 12, marginTop: 26, padding: "14px 18px", border: "1px solid #EAB4C4", borderLeft: "4px solid #C23A2D", borderRadius: 14, background: "linear-gradient(90deg,#FDECE9,#FBF0F3)", fontSize: 13, lineHeight: 1.5, color: "#4A453D" };
const detailGrid: CSSProperties = { display: "grid", gridTemplateColumns: "1.05fr 1.2fr", gap: 16 };
const panel: CSSProperties = { padding: 21, border: "1px solid #E7DECB", borderRadius: 16, background: "#FFFDF9", boxShadow: "0 2px 10px rgba(34,64,58,.06)" };
const panelTitle: CSSProperties = { margin: 0, fontFamily: "var(--font-editorial)", fontWeight: 500, fontSize: 22, color: "#22403A" };
const sub: CSSProperties = { margin: "3px 0 16px", fontSize: 12, color: "#847A6C" };
const thursday: CSSProperties = { display: "flex", gap: 13, padding: "13px 14px", border: "1px solid #E7DECB", borderLeft: "4px solid #C23A2D", borderRadius: 12, background: "#FBF6EC", fontSize: 13 };
const day: CSSProperties = { display: "grid", alignContent: "center", minWidth: 36, color: "#C23A2D", fontFamily: "var(--font-editorial)", textAlign: "center" };
const small: CSSProperties = { margin: "3px 0 0", fontSize: 11.5, color: "#5C554B" };
const publication: CSSProperties = { display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 8, alignItems: "center", marginTop: 10, fontSize: 12.5 };
const intention: CSSProperties = { padding: "3px 7px", borderRadius: 99, background: "#FBF0F3", color: "#A32E23", fontSize: 10, fontWeight: 700 };
const sourceNote: CSSProperties = { margin: "16px 0 0", fontSize: 11, color: "#847A6C" };
const briefLabel: CSSProperties = { display: "block", marginTop: 16, color: "#A32E23", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".1em" };
const briefInput: CSSProperties = { boxSizing: "border-box", width: "100%", minHeight: 74, marginTop: 6, padding: 10, resize: "vertical", border: "1px solid #E7DECB", borderRadius: 10, background: "#FBF6EC", color: "#22403A", font: "inherit", fontSize: 12.5, lineHeight: 1.45 };
const teamGrid: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 9 };
const teamColumn: CSSProperties = { borderTop: "3px solid", paddingTop: 8 };
const teamHead: CSSProperties = { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 5, fontSize: 10, color: "#847A6C", marginBottom: 8 };
const teamChip: CSSProperties = { padding: "4px 7px", borderRadius: 7, color: "white", fontSize: 10, fontWeight: 700, textTransform: "uppercase" };
const priorityCard: CSSProperties = { marginBottom: 8, padding: 9, border: "1px solid #E7DECB", borderRadius: 10, background: "#FBF6EC", fontSize: 11.5, color: "#22403A" };
const priorityTitleInput: CSSProperties = { boxSizing: "border-box", width: "100%", padding: 0, border: 0, outline: "none", background: "transparent", color: "#22403A", font: "inherit", fontSize: 11.5, fontWeight: 700, lineHeight: 1.35 };
const priorityNoteInput: CSSProperties = { boxSizing: "border-box", width: "100%", minHeight: 48, marginTop: 4, padding: 0, resize: "vertical", border: 0, outline: "none", background: "transparent", color: "#22403A", font: "inherit", fontSize: 11.5, lineHeight: 1.45 };
const statusSelect: CSSProperties = { flex: 1, padding: "5px", border: "1px solid #DCCFBB", borderRadius: 7, background: "#FFFDF9", color: "#22403A", fontSize: 10.5 };
const deletePriority: CSSProperties = { width: 28, border: "1px solid #EAB4C4", borderRadius: 7, background: "#FFFDF9", color: "#C23A2D", cursor: "pointer", fontSize: 17, lineHeight: 1 };
const addPriority: CSSProperties = { width: "100%", padding: "7px 4px", border: "1px dashed #CBBFAA", borderRadius: 8, background: "transparent", color: "#5C554B", cursor: "pointer", font: "inherit", fontSize: 10.5, fontWeight: 700 };
const calendarBoard: CSSProperties = { marginTop: 18, padding: 21, border: "1px solid #E7DECB", borderRadius: 16, background: "#FFFDF9", boxShadow: "0 2px 10px rgba(34,64,58,.06)" };
const calendarIntro: CSSProperties = { maxWidth: 670, marginBottom: 18 };
const seasonGrid: CSSProperties = { display: "grid", gridTemplateColumns: "1.3fr .9fr", gap: 14 };
const trackHead: CSSProperties = { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, color: "#22403A", fontSize: 13 };
const milestoneList: CSSProperties = { display: "grid", gap: 8, marginTop: 10 };
const milestone: CSSProperties = { display: "grid", gridTemplateColumns: "72px 1fr", gap: 10, alignItems: "center", padding: "10px", border: "1px solid #E7DECB", borderRadius: 11, background: "#FBF6EC", fontSize: 12.5, color: "#22403A" };
const milestoneDate: CSSProperties = { padding: "5px 6px", borderRadius: 7, background: "#F6DEE6", color: "#A32E23", textAlign: "center", fontSize: 10.5, fontWeight: 700 };
const evergreenBox: CSSProperties = { padding: 14, border: "1px solid #EAB4C4", borderRadius: 13, background: "linear-gradient(135deg,#FBF0F3,#FFFDF9)" };
const evergreenLabel: CSSProperties = { margin: "13px 0 4px", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".09em", color: "#A32E23" };
const evergreenTitle: CSSProperties = { margin: 0, fontFamily: "var(--font-editorial)", fontWeight: 500, fontSize: 23, color: "#22403A" };
const evergreenText: CSSProperties = { margin: "7px 0 10px", fontSize: 12.5, lineHeight: 1.5, color: "#5C554B" };
const evergreenTags: CSSProperties = { display: "flex", flexWrap: "wrap", gap: 5 };
const ideaButton: CSSProperties = { padding: "5px 8px", border: "1px solid #EAB4C4", borderRadius: 99, background: "#FFFDF9", color: "#A32E23", font: "inherit", fontSize: 10.5, fontWeight: 700, cursor: "pointer" };
const packsLabel: CSSProperties = { margin: "12px 0 6px", color: "#847A6C", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".1em" };
const readOnlyNote: CSSProperties = { margin: "11px 0 0", fontSize: 10.5, lineHeight: 1.4, color: "#847A6C" };
const yearLink: CSSProperties = { display: "inline-flex", gap: 5, alignItems: "center", color: "#C23A2D", fontSize: 12, fontWeight: 700, textDecoration: "none" };
