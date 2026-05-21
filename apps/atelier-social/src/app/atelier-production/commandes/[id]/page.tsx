"use client";

import { useEffect, useState, useCallback, use } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, Calendar, Clock, Truck, FileText, Cpu, Play, RotateCcw, Trash2, Package, Settings, Hash, FileCode, Archive, CheckCircle2, User, ShieldCheck, AlertTriangle, RefreshCw, Zap, Layers } from "lucide-react";
import { useRouter } from "next/navigation";
import type { Commande, Article, Broderie, StatutCommande, PlanningSlot, JournalCommande, EtapeJournal, AlgoPlanning, Placement } from "@/lib/production/commandes-loader";

const STATUT_META: Record<StatutCommande, { label: string; bg: string; fg: string }> = {
  a_planifier: { label: "À planifier", bg: "#FEF6E0", fg: "#7A5800" },
  planifiee:   { label: "Planifiée",   bg: "#E5EAF5", fg: "#1F3A7A" },
  en_cours:    { label: "En cours",    bg: "#FFE9D6", fg: "#9A4400" },
  terminee:    { label: "Terminée",    bg: "#E5F0E8", fg: "#2F7A3E" },
  expediee:    { label: "Expédiée",    bg: "#D9E8E6", fg: "#0E5550" },
  archivee:    { label: "Archivée",    bg: "#EBE7E0", fg: "#5A5142" },
};

const PERSONNES_PROD = ["Adriana", "Felismina", "Rebecca", "Sarah", "Thierry", "Cyrielle"] as const;

const PLACEMENT_LABEL: Record<string, string> = {
  buste: "Buste",
  poignet: "Poignet",
  dos: "Dos",
  nuque: "Nuque",
};

const MACHINE_COLORS: Record<string, { bg: string; fg: string; border: string }> = {
  "TMEZ-1": { bg: "#E5F0E8", fg: "#2F7A3E", border: "#2F7A3E" },
  "TMEZ-2": { bg: "#E5EAF5", fg: "#1F3A7A", border: "#1F3A7A" },
};

function formatDuree(min: number): string {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h}h${String(m).padStart(2, "0")}` : `${h}h`;
}

function formatJour(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "short" });
}

export default function CommandeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [commande, setCommande] = useState<Commande | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [planLoading, setPlanLoading] = useState(false);
  const [algo, setAlgo] = useState<AlgoPlanning>("otif");
  const [rebroderModal, setRebroderModal] = useState<{ article: Article } | null>(null);
  const [dateDebut, setDateDebut] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  });

  const refresh = useCallback(async () => {
    const res = await fetch(`/api/production/commandes/${id}`, { cache: "no-store" }).then((r) => r.json());
    if (!res.ok) throw new Error(res.error);
    setCommande(res.data);
  }, [id]);

  useEffect(() => {
    refresh()
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false));
  }, [refresh]);

  async function genererPlanning() {
    setPlanLoading(true);
    try {
      const res = await fetch(`/api/production/commandes/${id}/planning`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date_debut: dateDebut, horizon_jours: 3, algo }),
      }).then((r) => r.json());
      if (!res.ok) throw new Error(res.error);
      await refresh();
    } catch (e) {
      alert("Erreur génération planning : " + (e instanceof Error ? e.message : String(e)));
    } finally {
      setPlanLoading(false);
    }
  }

  async function rebroderArticle(article: Article, motif: string, zones: Placement[]) {
    setPlanLoading(true);
    try {
      const res = await fetch(`/api/production/commandes/${id}/rebroder`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ article_id: article.id, motif, zones_a_rebroder: zones }),
      }).then((r) => r.json());
      if (!res.ok) throw new Error(res.error);
      setRebroderModal(null);
      router.push(`/atelier-production/commandes/${res.data.id}`);
    } catch (e) {
      alert("Erreur rebroder : " + (e instanceof Error ? e.message : String(e)));
    } finally {
      setPlanLoading(false);
    }
  }

  async function patchJournal(journal: JournalCommande) {
    const res = await fetch(`/api/production/commandes/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ journal }),
    }).then((r) => r.json());
    if (!res.ok) throw new Error(res.error);
    setCommande(res.data);
  }

  async function desarchiverEtRestaurer(nouveauStatut: StatutCommande) {
    if (!commande) return;
    if (!confirm(`Désarchiver cette commande et la remettre en "${nouveauStatut}" ?`)) return;
    const nextJournal = { ...(commande.journal ?? {}) };
    delete nextJournal.archivee_le;
    const res = await fetch(`/api/production/commandes/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ journal: nextJournal, statut: nouveauStatut }),
    }).then((r) => r.json());
    if (!res.ok) throw new Error(res.error);
    setCommande(res.data);
  }

  async function resetPlanning() {
    if (!confirm("Réinitialiser le planning de cette commande ?")) return;
    setPlanLoading(true);
    try {
      const res = await fetch(`/api/production/commandes/${id}/planning`, { method: "DELETE" }).then((r) => r.json());
      if (!res.ok) throw new Error(res.error);
      await refresh();
    } finally {
      setPlanLoading(false);
    }
  }

  if (loading) {
    return <div style={{ padding: 60, textAlign: "center" }}><Loader2 size={32} className="animate-spin" strokeWidth={1.4} /></div>;
  }
  if (error || !commande) {
    return <div style={{ padding: 24, color: "#a13a16" }}>Erreur : {error || "Commande introuvable"}</div>;
  }

  const statut = STATUT_META[commande.statut];
  const articleById = new Map(commande.articles.map((a) => [a.id, a]));

  return (
    <div style={{ maxWidth: "100%", margin: "0 auto" }}>
      <Link href="/atelier-production/commandes" style={{
        display: "inline-flex", alignItems: "center", gap: 6,
        fontFamily: "var(--font-sans)", fontSize: 12,
        color: "var(--hub-foreground)", opacity: 0.6,
        textDecoration: "none", marginBottom: 24,
      }}>
        <ArrowLeft size={14} strokeWidth={1.6} /> Commandes
      </Link>

      {commande.rework_de && (
        <div style={{
          padding: "12px 16px", borderRadius: 8, marginBottom: 20,
          background: "#FDF3E5", border: "0.5px solid #C18B4F",
          display: "flex", alignItems: "center", gap: 10,
          fontFamily: "var(--font-sans)", fontSize: 13, color: "#7A4A14",
        }}>
          <RefreshCw size={16} strokeWidth={1.8} />
          <div>
            <strong>Commande rework</strong> de la{" "}
            <Link href={`/atelier-production/commandes/${commande.rework_de.commande_id}`} style={{ color: "#7A4A14", textDecoration: "underline" }}>
              commande origine #{commande.rework_de.commande_id}
            </Link>{" "}— défaut : <em>{commande.rework_de.motif}</em>
            {commande.rework_de.zones_a_rebroder?.length ? (
              <> · zone(s) : {commande.rework_de.zones_a_rebroder.join(", ")}</>
            ) : null}
          </div>
        </div>
      )}

      {/* HEADER */}
      <header style={{ marginBottom: 32, display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 24, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontFamily: "var(--font-editorial)", fontSize: 42, fontWeight: 500, margin: 0, marginBottom: 12 }}>
            Commande {commande.numero_shopify}
          </h1>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap", fontFamily: "var(--font-sans)", fontSize: 13, color: "var(--hub-foreground)", opacity: 0.7 }}>
            <span><Calendar size={13} strokeWidth={1.6} style={{ display: "inline", marginRight: 4, verticalAlign: "-2px" }} /> Commandé le {commande.date_commande}</span>
            <span><Truck size={13} strokeWidth={1.6} style={{ display: "inline", marginRight: 4, verticalAlign: "-2px" }} /> {commande.expedition.nom} · {commande.expedition.ville}</span>
            <span><Clock size={13} strokeWidth={1.6} style={{ display: "inline", marginRight: 4, verticalAlign: "-2px" }} /> {formatDuree(commande.duree_total_min)} de production</span>
          </div>
        </div>
        <span style={{
          fontFamily: "var(--font-sans)", fontSize: 11, fontWeight: 600,
          textTransform: "uppercase", letterSpacing: "0.08em",
          padding: "6px 14px", borderRadius: 999,
          background: statut.bg, color: statut.fg,
        }}>
          {statut.label}
        </span>
      </header>

      {/* SECTION ADRESSES */}
      <section style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 32 }}>
        <div style={{ padding: 16, border: "0.5px solid var(--hub-border)", borderRadius: 10 }}>
          <div style={{ fontFamily: "var(--font-sans)", fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--hub-foreground)", opacity: 0.6, marginBottom: 8 }}>Expédier à</div>
          <div style={{ fontFamily: "var(--font-sans)", fontSize: 13, lineHeight: 1.6 }}>
            {commande.expedition.nom}<br />
            {commande.expedition.adresse_ligne1}<br />
            {commande.expedition.code_postal} {commande.expedition.ville}<br />
            {commande.expedition.pays}
          </div>
        </div>
        <div style={{ padding: 16, border: "0.5px solid var(--hub-border)", borderRadius: 10 }}>
          <div style={{ fontFamily: "var(--font-sans)", fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--hub-foreground)", opacity: 0.6, marginBottom: 8 }}>Facturer à</div>
          <div style={{ fontFamily: "var(--font-sans)", fontSize: 13, lineHeight: 1.6 }}>
            {commande.facturation.nom}<br />
            {commande.facturation.adresse_ligne1}<br />
            {commande.facturation.code_postal} {commande.facturation.ville}<br />
            {commande.facturation.pays}
          </div>
        </div>
      </section>

      {/* SECTION ARTICLES */}
      <section style={{ marginBottom: 40 }}>
        <h2 style={{ fontFamily: "var(--font-editorial)", fontSize: 24, fontWeight: 500, marginBottom: 16 }}>
          Articles à broder ({commande.articles.length})
        </h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {commande.articles.map((art) => (
            <ArticleCard
              key={art.id}
              article={art}
              onRebroder={commande.statut !== "archivee" ? () => setRebroderModal({ article: art }) : undefined}
            />
          ))}
        </div>
      </section>

      {rebroderModal && (
        <RebroderModal
          article={rebroderModal.article}
          onCancel={() => setRebroderModal(null)}
          onConfirm={(motif, zones) => rebroderArticle(rebroderModal.article, motif, zones)}
          loading={planLoading}
        />
      )}

      {/* SECTION JOURNAL DE PROD */}
      <section style={{ marginBottom: 40 }}>
        <h2 style={{ fontFamily: "var(--font-editorial)", fontSize: 24, fontWeight: 500, marginBottom: 16 }}>
          Journal de production
        </h2>
        <JournalProd
          journal={commande.journal}
          onChange={(j) => patchJournal(j).catch((e) => alert("Erreur journal : " + (e instanceof Error ? e.message : String(e))))}
          onDesarchiver={(s) => desarchiverEtRestaurer(s).catch((e) => alert("Erreur désarchivage : " + (e instanceof Error ? e.message : String(e))))}
          isArchivee={commande.statut === "archivee"}
          hasPlanning={!!commande.planning}
        />
      </section>

      {/* SECTION PLANNING */}
      <section style={{ marginBottom: 40 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, gap: 12, flexWrap: "wrap" }}>
          <h2 style={{ fontFamily: "var(--font-editorial)", fontSize: 24, fontWeight: 500, margin: 0 }}>
            Planning production
          </h2>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ display: "inline-flex", border: "0.5px solid var(--hub-border)", borderRadius: 6, overflow: "hidden" }}>
              {(["otif", "lpt"] as AlgoPlanning[]).map((a) => (
                <button
                  key={a}
                  onClick={() => setAlgo(a)}
                  title={a === "otif" ? "OTIF : FIFO date_commande + regroupement fils inter-articles (optim changements bobine)" : "LPT : articles longs en premier, équilibrage charge pur (makespan minimal)"}
                  style={{
                    padding: "6px 12px", border: "none",
                    background: algo === a ? "var(--hub-foreground)" : "transparent",
                    color: algo === a ? "var(--hub-bg)" : "var(--hub-foreground)",
                    fontFamily: "var(--font-sans)", fontSize: 11, fontWeight: 500, cursor: "pointer",
                    display: "inline-flex", alignItems: "center", gap: 4,
                  }}
                >
                  {a === "otif" ? <Layers size={12} /> : <Cpu size={12} />}
                  {a.toUpperCase()}
                </button>
              ))}
            </div>
            <label style={{ fontFamily: "var(--font-sans)", fontSize: 12, color: "var(--hub-foreground)", opacity: 0.7 }}>Date début</label>
            <input
              type="date"
              value={dateDebut}
              onChange={(e) => setDateDebut(e.target.value)}
              style={{
                padding: "6px 10px", border: "0.5px solid var(--hub-border)", borderRadius: 6,
                fontFamily: "var(--font-sans)", fontSize: 12, background: "var(--hub-bg)", color: "var(--hub-foreground)",
              }}
            />
            <button
              onClick={genererPlanning}
              disabled={planLoading}
              style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                padding: "8px 14px", borderRadius: 6, border: "none",
                background: "#B4665F", color: "white",
                fontFamily: "var(--font-sans)", fontSize: 12, fontWeight: 500,
                cursor: planLoading ? "wait" : "pointer", opacity: planLoading ? 0.6 : 1,
              }}
            >
              {planLoading ? <Loader2 size={13} className="animate-spin" /> : commande.planning ? <RotateCcw size={13} /> : <Play size={13} />}
              {commande.planning ? "Régénérer" : "Générer auto"}
            </button>
            {commande.planning && (
              <button
                onClick={resetPlanning}
                disabled={planLoading}
                title="Effacer le planning"
                style={{
                  display: "inline-flex", alignItems: "center", padding: 8, borderRadius: 6,
                  border: "0.5px solid var(--hub-border)", background: "var(--hub-bg)",
                  color: "var(--hub-foreground)", cursor: "pointer",
                }}
              >
                <Trash2 size={13} />
              </button>
            )}
          </div>
        </div>

        {!commande.planning ? (
          <div style={{
            padding: 40, textAlign: "center", border: "1px dashed var(--hub-border)",
            borderRadius: 10, fontFamily: "var(--font-sans)", fontSize: 13, color: "var(--hub-foreground)", opacity: 0.6,
          }}>
            Aucun planning généré. Clique sur <strong>Générer auto</strong> pour allouer les articles sur 2 machines TMEZ.
          </div>
        ) : (
          <PlanningGantt planning={commande.planning} articleById={articleById} />
        )}
      </section>
    </div>
  );
}

// ──────────────────────────────────────────────────────────
// ArticleCard
// ──────────────────────────────────────────────────────────

function ArticleCard({ article, onRebroder }: { article: Article; onRebroder?: () => void }) {
  return (
    <article style={{
      border: "0.5px solid var(--hub-border)", borderRadius: 12, padding: 20,
      background: "var(--hub-bg)",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16, gap: 16, flexWrap: "wrap" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
            <Package size={16} strokeWidth={1.6} />
            <h3 style={{ fontFamily: "var(--font-editorial)", fontSize: 20, fontWeight: 500, margin: 0 }}>
              {article.produit_nom} — {article.ypm_nom}
            </h3>
          </div>
          <div style={{ fontFamily: "var(--font-sans)", fontSize: 12, color: "var(--hub-foreground)", opacity: 0.7 }}>
            {article.couleur_support} / {article.taille} · SKU <code style={{ fontFamily: "ui-monospace, monospace", fontSize: 11, background: "#F0EDE8", padding: "1px 6px", borderRadius: 3 }}>{article.sku}</code>
          </div>
          <div style={{ fontFamily: "var(--font-sans)", fontSize: 11, color: "var(--hub-foreground)", opacity: 0.55, marginTop: 4 }}>
            <Hash size={10} strokeWidth={1.8} style={{ display: "inline", verticalAlign: "-1px", marginRight: 2 }} />
            Produit {article.produit_id} · Motif <Link href={`/atelier-production/motifs`} style={{ color: "inherit", textDecoration: "underline dotted" }}>{article.ypm_id}</Link>
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontFamily: "var(--font-editorial)", fontSize: 28, fontWeight: 500, lineHeight: 1 }}>
            {formatDuree(article.duree_total_article_min)}
          </div>
          <div style={{ fontFamily: "var(--font-sans)", fontSize: 10, color: "var(--hub-foreground)", opacity: 0.55, marginTop: 4, textTransform: "uppercase", letterSpacing: "0.08em" }}>
            ×{article.quantite} · prod totale
          </div>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {article.broderies.map((b, i) => (
          <BroderieRow key={i} broderie={b} />
        ))}
      </div>

      <div style={{
        marginTop: 12, paddingTop: 10, borderTop: "1px solid var(--hub-border)",
        display: "flex", gap: 16, fontFamily: "var(--font-sans)", fontSize: 11,
        color: "var(--hub-foreground)", opacity: 0.55, flexWrap: "wrap",
      }}>
        {article.duree_preparation_dst_min > 0 ? (
          <span><FileCode size={11} style={{ display: "inline", verticalAlign: "-1px", marginRight: 2 }} /> Prep DST {article.duree_preparation_dst_min} min</span>
        ) : (
          <span style={{ fontStyle: "italic" }}><FileCode size={11} style={{ display: "inline", verticalAlign: "-1px", marginRight: 2 }} /> Prep DST mutualisée (même motif)</span>
        )}
        <span><Settings size={11} style={{ display: "inline", verticalAlign: "-1px", marginRight: 2 }} /> Setup {article.duree_setup_min} min</span>
        <span>CQ + pliage {article.duree_cq_min} min</span>
      </div>
      {article.notes && (
        <div style={{ marginTop: 8, fontFamily: "var(--font-sans)", fontSize: 11, fontStyle: "italic", color: "var(--hub-foreground)", opacity: 0.55 }}>
          {article.notes}
        </div>
      )}
      {onRebroder && (
        <div style={{ marginTop: 12, display: "flex", justifyContent: "flex-end" }}>
          <button
            onClick={onRebroder}
            style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              padding: "6px 12px", borderRadius: 6,
              border: "0.5px solid #C18B4F", background: "#FDF3E5",
              color: "#7A4A14", fontFamily: "var(--font-sans)", fontSize: 11, fontWeight: 500, cursor: "pointer",
            }}
          >
            <RefreshCw size={12} strokeWidth={1.8} /> Rebroder cet article
          </button>
        </div>
      )}
    </article>
  );
}

// ──────────────────────────────────────────────────────────
// JournalProd
// ──────────────────────────────────────────────────────────

const ETAPES: { key: EtapeJournal; label: string; icon: React.ReactNode }[] = [
  { key: "dst",        label: "Préparation DST",   icon: <FileCode size={14} strokeWidth={1.6} /> },
  { key: "broderie",   label: "Broderie",          icon: <Cpu size={14} strokeWidth={1.6} /> },
  { key: "cq",         label: "Contrôle qualité",  icon: <ShieldCheck size={14} strokeWidth={1.6} /> },
  { key: "expedition", label: "Expédition",        icon: <Truck size={14} strokeWidth={1.6} /> },
];

function JournalProd({
  journal,
  onChange,
  onDesarchiver,
  isArchivee,
  hasPlanning,
}: {
  journal: JournalCommande | undefined;
  onChange: (j: JournalCommande) => void;
  onDesarchiver: (nouveauStatut: StatutCommande) => void;
  isArchivee: boolean;
  hasPlanning: boolean;
}) {
  const j: JournalCommande = journal ?? {};
  const allDone = !!(j.dst && j.broderie && j.cq && j.expedition);
  const today = new Date().toISOString().slice(0, 10);

  function updateEtape(key: EtapeJournal, field: "par" | "le", value: string) {
    const next: JournalCommande = { ...j };
    const entree = { ...(next[key] ?? { par: "", le: "" }) };
    entree[field] = value;
    // si on tape un nom mais pas de date, mettre aujourd'hui
    if (field === "par" && value && !entree.le) entree.le = today;
    next[key] = entree;
    onChange(next);
  }

  function clearEtape(key: EtapeJournal) {
    const next: JournalCommande = { ...j };
    delete next[key];
    onChange(next);
  }

  function archiver() {
    if (!confirm("Archiver cette commande ? Elle ne disparaîtra pas mais sera marquée comme archivée.")) return;
    onChange({ ...j, archivee_le: today });
  }

  function desarchiverRemettreEnProd() {
    // Désarchive ET remet la commande dans le flow prod avec un statut cohérent :
    //   expédition faite → "expediee"
    //   CQ ou broderie faite → "terminee" (prête à réexpédier)
    //   broderie en cours / planifiée → "planifiee" si planning, sinon "a_planifier"
    let nouveauStatut: StatutCommande = "a_planifier";
    if (j.expedition) nouveauStatut = "expediee";
    else if (j.cq || j.broderie) nouveauStatut = "terminee";
    else if (hasPlanning) nouveauStatut = "planifiee";
    onDesarchiver(nouveauStatut);
  }

  return (
    <div style={{
      border: "0.5px solid var(--hub-border)", borderRadius: 12, padding: 20,
      background: "var(--hub-bg)",
    }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16 }}>
        {ETAPES.map(({ key, label, icon }) => {
          const entree = j[key];
          const done = !!entree?.par && !!entree?.le;
          return (
            <div key={key} style={{
              padding: 14, borderRadius: 8,
              background: done ? "#E5F0E8" : "#FAF7F2",
              border: `0.5px solid ${done ? "#2F7A3E" : "var(--hub-border)"}`,
              opacity: isArchivee ? 0.8 : 1,
            }}>
              <div style={{
                display: "flex", alignItems: "center", gap: 6, marginBottom: 10,
                fontFamily: "var(--font-sans)", fontSize: 11, fontWeight: 600,
                textTransform: "uppercase", letterSpacing: "0.08em",
                color: done ? "#2F7A3E" : "var(--hub-foreground)",
              }}>
                {done ? <CheckCircle2 size={14} strokeWidth={1.8} /> : icon}
                {label}
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <User size={12} strokeWidth={1.6} style={{ opacity: 0.5 }} />
                  <input
                    list={`pers-${key}`}
                    type="text"
                    placeholder="Qui ?"
                    value={entree?.par ?? ""}
                    onChange={(e) => updateEtape(key, "par", e.target.value)}
                    disabled={isArchivee}
                    style={{
                      flex: 1, padding: "4px 8px", border: "0.5px solid var(--hub-border)", borderRadius: 4,
                      fontFamily: "var(--font-sans)", fontSize: 12, background: "white", color: "var(--hub-foreground)",
                    }}
                  />
                  <datalist id={`pers-${key}`}>
                    {PERSONNES_PROD.map((p) => <option key={p} value={p} />)}
                  </datalist>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <Calendar size={12} strokeWidth={1.6} style={{ opacity: 0.5 }} />
                  <input
                    type="date"
                    value={entree?.le ?? ""}
                    onChange={(e) => updateEtape(key, "le", e.target.value)}
                    disabled={isArchivee}
                    style={{
                      flex: 1, padding: "4px 8px", border: "0.5px solid var(--hub-border)", borderRadius: 4,
                      fontFamily: "var(--font-sans)", fontSize: 12, background: "white", color: "var(--hub-foreground)",
                    }}
                  />
                  {entree && !isArchivee && (
                    <button
                      onClick={() => clearEtape(key)}
                      title="Effacer cette étape"
                      style={{ background: "none", border: "none", color: "var(--hub-foreground)", opacity: 0.5, cursor: "pointer", padding: 2 }}
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer : archivage */}
      <div style={{
        marginTop: 16, paddingTop: 14, borderTop: "0.5px solid var(--hub-border)",
        display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap",
      }}>
        {j.archivee_le ? (
          <div style={{ fontFamily: "var(--font-sans)", fontSize: 12, color: "var(--hub-foreground)", opacity: 0.7 }}>
            <Archive size={13} strokeWidth={1.6} style={{ display: "inline", verticalAlign: "-2px", marginRight: 4 }} />
            Archivée le <strong>{j.archivee_le}</strong>
          </div>
        ) : (
          <div style={{ fontFamily: "var(--font-sans)", fontSize: 12, color: "var(--hub-foreground)", opacity: 0.6 }}>
            {allDone ? "Toutes les étapes sont validées — la commande peut être archivée." : "Renseigne au minimum les 3 étapes pour pouvoir archiver."}
          </div>
        )}
        <div style={{ display: "flex", gap: 8 }}>
          {j.archivee_le ? (
            <button
              onClick={desarchiverRemettreEnProd}
              title="Retire de l'archive et remet la commande dans le flow de production avec le bon statut"
              style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                padding: "8px 14px", borderRadius: 6, border: "none",
                background: "#B4665F", color: "white",
                fontFamily: "var(--font-sans)", fontSize: 12, fontWeight: 500,
                cursor: "pointer",
              }}
            >
              <Zap size={13} /> Désarchiver et remettre en prod
            </button>
          ) : (
            <button
              onClick={archiver}
              disabled={!allDone}
              style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                padding: "8px 14px", borderRadius: 6, border: "none",
                background: allDone ? "#5A5142" : "#D1CABF",
                color: "white", fontFamily: "var(--font-sans)", fontSize: 12, fontWeight: 500,
                cursor: allDone ? "pointer" : "not-allowed",
              }}
            >
              <Archive size={13} /> Archiver la commande
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────
// BroderieRow
// ──────────────────────────────────────────────────────────

function BroderieRow({ broderie }: { broderie: Broderie }) {
  return (
    <div style={{
      display: "grid", gridTemplateColumns: "100px 1fr auto",
      gap: 12, padding: "10px 12px",
      background: "#FAF7F2", borderLeft: `3px solid ${broderie.fil_hex}`,
      borderRadius: "0 6px 6px 0", alignItems: "center",
    }}>
      <div style={{
        fontFamily: "var(--font-sans)", fontSize: 10, fontWeight: 600,
        textTransform: "uppercase", letterSpacing: "0.08em",
        color: "var(--hub-foreground)", opacity: 0.7,
      }}>
        {PLACEMENT_LABEL[broderie.placement] ?? broderie.placement}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {broderie.champs.map((c, i) => (
          <div key={i} style={{ fontFamily: "var(--font-sans)", fontSize: 13 }}>
            <span style={{ color: "var(--hub-foreground)", opacity: 0.6 }}>{c.label} : </span>
            <strong>{c.valeur}</strong>
            <span style={{ marginLeft: 8, color: "var(--hub-foreground)", opacity: 0.4, fontSize: 11 }}>
              {c.type} · {c.duree_min} min
            </span>
          </div>
        ))}
        <div style={{ display: "flex", gap: 8, marginTop: 4, alignItems: "center", flexWrap: "wrap" }}>
          <ThreadChip name={broderie.fil_nom} hex={broderie.fil_hex} code={broderie.fil_code_gunold} />
          {broderie.fil_nom_secondaire && broderie.fil_hex_secondaire && (
            <ThreadChip name={broderie.fil_nom_secondaire} hex={broderie.fil_hex_secondaire} code={broderie.fil_code_gunold_secondaire ?? ""} />
          )}
          {broderie.note_atelier && (
            <span style={{ fontFamily: "var(--font-sans)", fontSize: 10, fontStyle: "italic", color: "var(--hub-foreground)", opacity: 0.5 }}>
              {broderie.note_atelier}
            </span>
          )}
        </div>
      </div>
      <div style={{ textAlign: "right", fontFamily: "var(--font-sans)", fontSize: 12, color: "var(--hub-foreground)", opacity: 0.8 }}>
        <div style={{ fontWeight: 600 }}>{formatDuree(broderie.duree_total_min)}</div>
        <div style={{ fontSize: 10, opacity: 0.6 }}>
          brod {broderie.duree_broderie_min} + cadre {broderie.duree_cadrage_min}
          {broderie.duree_changement_fil_min ? ` + fil ${broderie.duree_changement_fil_min}` : ""}
        </div>
      </div>
    </div>
  );
}

function ThreadChip({ name, hex, code }: { name: string; hex: string; code: string }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      padding: "2px 8px 2px 4px", borderRadius: 999,
      border: "0.5px solid var(--hub-border)", background: "white",
      fontFamily: "var(--font-sans)", fontSize: 11,
    }}>
      <span style={{ width: 14, height: 14, borderRadius: "50%", background: hex, border: "1px solid rgba(0,0,0,0.1)" }} />
      {name} <span style={{ opacity: 0.5, fontFamily: "ui-monospace, monospace", fontSize: 10 }}>{code}</span>
    </span>
  );
}

// ──────────────────────────────────────────────────────────
// PlanningGantt
// ──────────────────────────────────────────────────────────

function PlanningGantt({
  planning,
  articleById,
}: {
  planning: NonNullable<Commande["planning"]>;
  articleById: Map<string, Article>;
}) {
  // Group slots by day
  const slotsByDay = new Map<string, PlanningSlot[]>();
  for (const slot of planning.slots) {
    if (!slotsByDay.has(slot.jour)) slotsByDay.set(slot.jour, []);
    slotsByDay.get(slot.jour)!.push(slot);
  }
  const days = Array.from(slotsByDay.keys()).sort();

  const machines = ["TMEZ-1", "TMEZ-2"] as const;
  // 9h - 16h = 7h horloge, mais 6h effectives (pause déj). On affiche 9-16.
  const heureMin = 9 * 60;
  const heureMax = 16 * 60;
  const pxParMin = 4; // 4px / minute → 7h = 1680px

  const machineMins = (m: string) => planning.slots.filter((s) => s.machine === m).reduce((sum, s) => sum + s.duree_min, 0);

  return (
    <div>
      {/* Résumé charge */}
      <div style={{ display: "flex", gap: 12, marginBottom: 16, fontFamily: "var(--font-sans)", fontSize: 12 }}>
        {machines.map((m) => {
          const total = machineMins(m);
          const col = MACHINE_COLORS[m];
          return (
            <div key={m} style={{ padding: "8px 14px", background: col.bg, color: col.fg, borderRadius: 6, fontWeight: 500 }}>
              <Cpu size={12} strokeWidth={1.8} style={{ display: "inline", verticalAlign: "-1px", marginRight: 4 }} />
              {m} : {formatDuree(total)} planifié{total > 1 ? "s" : ""}
            </div>
          );
        })}
        <div style={{ padding: "8px 14px", background: "#F0EDE8", borderRadius: 6, color: "var(--hub-foreground)", opacity: 0.7 }}>
          {planning.slots.length} slot{planning.slots.length > 1 ? "s" : ""} · {days.length} jour{days.length > 1 ? "s" : ""} · capacité 6h/machine
        </div>
      </div>

      {/* Gantt par jour */}
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {days.map((day) => (
          <div key={day}>
            <div style={{
              fontFamily: "var(--font-sans)", fontSize: 11, fontWeight: 600,
              textTransform: "uppercase", letterSpacing: "0.08em",
              color: "var(--hub-foreground)", opacity: 0.7, marginBottom: 8,
            }}>
              {formatJour(day)}
            </div>
            <div style={{ overflowX: "auto", border: "0.5px solid var(--hub-border)", borderRadius: 8, background: "#FCFAF7" }}>
              <div style={{ minWidth: (heureMax - heureMin) * pxParMin + 80, position: "relative" }}>
                {/* Échelle horaire */}
                <div style={{ display: "flex", borderBottom: "0.5px solid var(--hub-border)", paddingLeft: 80, height: 24 }}>
                  {Array.from({ length: (heureMax - heureMin) / 60 + 1 }).map((_, i) => {
                    const minute = heureMin + i * 60;
                    const isLunch = minute === 12 * 60 || minute === 13 * 60;
                    return (
                      <div key={i} style={{
                        width: 60 * pxParMin, fontFamily: "var(--font-sans)", fontSize: 10,
                        color: "var(--hub-foreground)", opacity: 0.5, textAlign: "left", paddingLeft: 2,
                      }}>
                        {String(Math.floor(minute / 60)).padStart(2, "0")}h{isLunch ? "" : ""}
                      </div>
                    );
                  })}
                </div>

                {/* Pause déjeuner overlay */}
                <div style={{
                  position: "absolute", top: 24, bottom: 0,
                  left: 80 + (12 * 60 - heureMin) * pxParMin,
                  width: 60 * pxParMin,
                  background: "repeating-linear-gradient(45deg, transparent 0, transparent 6px, rgba(0,0,0,0.04) 6px, rgba(0,0,0,0.04) 12px)",
                  pointerEvents: "none",
                }} />

                {/* Lignes machines */}
                {machines.map((m) => {
                  const slotsM = slotsByDay.get(day)!.filter((s) => s.machine === m);
                  const col = MACHINE_COLORS[m];
                  return (
                    <div key={m} style={{ display: "flex", height: 56, alignItems: "center", borderBottom: "0.5px dashed var(--hub-border)" }}>
                      <div style={{
                        width: 80, padding: "0 12px", fontFamily: "var(--font-sans)", fontSize: 11,
                        fontWeight: 600, color: col.fg, flexShrink: 0,
                      }}>
                        {m}
                      </div>
                      <div style={{ flex: 1, position: "relative", height: "100%" }}>
                        {slotsM.map((slot) => {
                          const art = articleById.get(slot.article_id);
                          const startMin = parseInt(slot.heure_debut.split(":")[0]) * 60 + parseInt(slot.heure_debut.split(":")[1]);
                          const left = (startMin - heureMin) * pxParMin;
                          const width = slot.duree_min * pxParMin;
                          return (
                            <div
                              key={slot.id}
                              title={`${art?.produit_nom} — ${art?.ypm_nom} · ${slot.heure_debut} → ${slot.heure_fin}`}
                              style={{
                                position: "absolute", top: 6, left, width, height: 44,
                                background: col.bg, border: `1px solid ${col.border}`,
                                borderRadius: 6, padding: "4px 8px",
                                fontFamily: "var(--font-sans)", fontSize: 11, color: col.fg,
                                overflow: "hidden", display: "flex", flexDirection: "column", justifyContent: "center",
                                lineHeight: 1.3,
                              }}
                            >
                              <strong style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                {art?.ypm_nom ?? slot.article_id}
                              </strong>
                              <span style={{ fontSize: 10, opacity: 0.8 }}>
                                {slot.heure_debut}–{slot.heure_fin} · {formatDuree(slot.duree_min)}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ))}
      </div>

      <p style={{
        marginTop: 16, fontFamily: "var(--font-sans)", fontSize: 11,
        color: "var(--hub-foreground)", opacity: 0.5,
      }}>
        <FileText size={11} strokeWidth={1.8} style={{ display: "inline", verticalAlign: "-1px", marginRight: 4 }} />
        Algo <strong>{(planning.algo ?? "lpt").toUpperCase()}</strong> — {planning.algo === "otif" ? "FIFO ordre commande + regroupement fils inter-articles (optim changements bobine)" : "Longest Processing Time first (équilibrage charge pur)"}. Zone hachurée = pause déjeuner (12h–13h). Mode <strong>{planning.mode}</strong> · généré le {planning.genere_le?.slice(0, 10)}.
      </p>
    </div>
  );
}

// ──────────────────────────────────────────────────────────
// RebroderModal
// ──────────────────────────────────────────────────────────

function RebroderModal({
  article,
  onCancel,
  onConfirm,
  loading,
}: {
  article: Article;
  onCancel: () => void;
  onConfirm: (motif: string, zones: Placement[]) => void;
  loading: boolean;
}) {
  const placements = Array.from(new Set(article.broderies.map((b) => b.placement)));
  const [motif, setMotif] = useState("");
  const [zonesSelected, setZonesSelected] = useState<Set<Placement>>(new Set(placements));

  function toggleZone(p: Placement) {
    const next = new Set(zonesSelected);
    if (next.has(p)) next.delete(p);
    else next.add(p);
    setZonesSelected(next);
  }

  const canSubmit = motif.trim().length >= 3 && zonesSelected.size > 0 && !loading;

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(26,22,20,0.5)", zIndex: 50,
      display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
    }}>
      <div style={{
        background: "var(--hub-bg)", borderRadius: 14, padding: 24, maxWidth: 500, width: "100%",
        border: "0.5px solid var(--hub-border)", boxShadow: "0 16px 48px rgba(0,0,0,0.18)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8, background: "#FDF3E5",
            display: "flex", alignItems: "center", justifyContent: "center", color: "#7A4A14",
          }}>
            <AlertTriangle size={18} strokeWidth={1.8} />
          </div>
          <div>
            <h3 style={{ fontFamily: "var(--font-editorial)", fontSize: 22, margin: 0, fontWeight: 500 }}>Rebroder cet article</h3>
            <div style={{ fontFamily: "var(--font-sans)", fontSize: 12, color: "var(--hub-foreground)", opacity: 0.6 }}>
              {article.produit_nom} — {article.ypm_nom} ({article.taille})
            </div>
          </div>
        </div>

        <p style={{ fontFamily: "var(--font-sans)", fontSize: 12, color: "var(--hub-foreground)", opacity: 0.7, marginBottom: 14 }}>
          Une nouvelle commande <strong>rework</strong> sera créée (priorité urgente, statut à planifier). L&apos;article original reste tracé dans son historique.
        </p>

        <div style={{ marginBottom: 14 }}>
          <label style={{ display: "block", fontFamily: "var(--font-sans)", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--hub-foreground)", opacity: 0.6, marginBottom: 6 }}>
            Zones à rebroder
          </label>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {placements.map((p) => (
              <button
                key={p}
                onClick={() => toggleZone(p)}
                style={{
                  padding: "6px 12px", borderRadius: 999, border: "0.5px solid var(--hub-border)",
                  background: zonesSelected.has(p) ? "var(--hub-foreground)" : "var(--hub-bg)",
                  color: zonesSelected.has(p) ? "var(--hub-bg)" : "var(--hub-foreground)",
                  fontFamily: "var(--font-sans)", fontSize: 12, cursor: "pointer", textTransform: "capitalize",
                }}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 18 }}>
          <label style={{ display: "block", fontFamily: "var(--font-sans)", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--hub-foreground)", opacity: 0.6, marginBottom: 6 }}>
            Motif du défaut
          </label>
          <textarea
            value={motif}
            onChange={(e) => setMotif(e.target.value)}
            placeholder="Ex : fil mal coupé sur le poignet, lettre déformée…"
            rows={3}
            style={{
              width: "100%", padding: "8px 10px", borderRadius: 6, border: "0.5px solid var(--hub-border)",
              fontFamily: "var(--font-sans)", fontSize: 13, background: "white", color: "var(--hub-foreground)",
              resize: "vertical",
            }}
          />
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button
            onClick={onCancel}
            disabled={loading}
            style={{
              padding: "8px 14px", borderRadius: 6, border: "0.5px solid var(--hub-border)",
              background: "var(--hub-bg)", color: "var(--hub-foreground)",
              fontFamily: "var(--font-sans)", fontSize: 12, cursor: loading ? "wait" : "pointer",
            }}
          >
            Annuler
          </button>
          <button
            onClick={() => onConfirm(motif, Array.from(zonesSelected))}
            disabled={!canSubmit}
            style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              padding: "8px 14px", borderRadius: 6, border: "none",
              background: canSubmit ? "#B4665F" : "#D1CABF", color: "white",
              fontFamily: "var(--font-sans)", fontSize: 12, fontWeight: 500,
              cursor: canSubmit ? "pointer" : "not-allowed",
            }}
          >
            {loading ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
            Créer la commande rework
          </button>
        </div>
      </div>
    </div>
  );
}
