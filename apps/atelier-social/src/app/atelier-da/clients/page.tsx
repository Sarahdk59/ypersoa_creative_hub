"use client";

/**
 * Carnet d'adresses clients — Atelier DA.
 * Une adresse e-mail = un contact, construit depuis les commandes.
 * Statut marketing + note éditables ; export CSV des contactables
 * (Shopify Email / Brevo) pour les campagnes type Black Friday.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, Download, Search, Users, Mail, MailX, AlertTriangle, ChevronRight } from "lucide-react";

type Source = "shopify" | "etsy" | "b2b" | "manuel";
type Statut = "client" | "inscrit" | "desinscrit" | "exclu";

interface CommandeRef { id: string; numero: string; date: string; source: Source; montant_ttc: number | null }
interface Contact {
  email: string; nom: string; telephone: string | null; ville: string | null; code_postal: string | null;
  nb_commandes: number; nb_articles: number; ca_connu: number;
  premiere_commande: string; derniere_commande: string;
  sources: Source[]; motifs: string[]; produits: string[]; commandes: CommandeRef[];
  statut: Statut; statut_auto: boolean; contactable: boolean; note: string | null;
}
interface SansEmail { id: string; numero: string; date: string; source: Source; client: string | null }

const STATUT_LABEL: Record<Statut, string> = {
  client: "Client · contactable",
  inscrit: "Inscrit newsletter",
  desinscrit: "Désinscrit",
  exclu: "Exclu",
};
const STATUT_COULEUR: Record<Statut, string> = {
  client: "#1E6E77",
  inscrit: "#2F7A3E",
  desinscrit: "#9A1818",
  exclu: "#7A6F66",
};
const SOURCE_LABEL: Record<Source, string> = { shopify: "Shopify", etsy: "Etsy", b2b: "B2B", manuel: "Manuel" };

type FiltreStatut = "tous" | "contactables" | "desinscrit" | "exclu";

const fmtDate = (d: string) => d.split("-").reverse().join("/");
const fmtEur = (v: number) => v.toLocaleString("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });

const inputStyle: React.CSSProperties = {
  fontFamily: "var(--font-sans)", fontSize: 13, padding: "8px 12px", borderRadius: 8,
  border: "0.5px solid var(--hub-border)", background: "white", color: "var(--hub-foreground)",
};

export default function CarnetClientsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [sansEmail, setSansEmail] = useState<SansEmail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [filtre, setFiltre] = useState<FiltreStatut>("tous");
  const [motif, setMotif] = useState("");
  const [depuis, setDepuis] = useState("");
  const [ouvert, setOuvert] = useState<string | null>(null);
  const [voirSansEmail, setVoirSansEmail] = useState(false);

  const charger = useCallback(() => {
    return fetch("/api/clients", { cache: "no-store" })
      .then((r) => r.json())
      .then((res) => {
        if (!res.ok) throw new Error(res.error);
        setContacts(res.data.contacts);
        setSansEmail(res.data.sans_email);
        setError(null);
      })
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { charger(); }, [charger]);

  const enregistrer = async (email: string, patch: { statut?: Statut | null; note?: string | null }) => {
    const res = await fetch("/api/clients", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, ...patch }),
    }).then((r) => r.json());
    if (!res.ok) { setError(res.error); return; }
    await charger();
  };

  const motifs = useMemo(
    () => Array.from(new Set(contacts.flatMap((c) => c.motifs))).sort((a, b) => a.localeCompare(b, "fr")),
    [contacts],
  );

  const visibles = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return contacts.filter((c) => {
      if (filtre === "contactables" && !c.contactable) return false;
      if (filtre === "desinscrit" && c.statut !== "desinscrit") return false;
      if (filtre === "exclu" && c.statut !== "exclu") return false;
      if (motif && !c.motifs.includes(motif)) return false;
      if (depuis && c.derniere_commande < depuis) return false;
      if (needle && ![c.email, c.nom, c.ville ?? "", c.code_postal ?? ""].some((v) => v.toLowerCase().includes(needle))) return false;
      return true;
    });
  }, [contacts, q, filtre, motif, depuis]);

  const nbContactables = contacts.filter((c) => c.contactable).length;
  const nbExport = contacts.filter((c) => c.contactable && (!motif || c.motifs.includes(motif)) && (!depuis || c.derniere_commande >= depuis)).length;
  const exportHref = `/api/clients/export?${new URLSearchParams({ ...(motif ? { motif } : {}), ...(depuis ? { depuis } : {}) })}`;

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto" }}>
      <Link href="/atelier-da" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontFamily: "var(--font-sans)", fontSize: 12, color: "var(--hub-foreground)", opacity: 0.6, textDecoration: "none", marginBottom: 24 }}>
        <ArrowLeft size={14} strokeWidth={1.6} /> Atelier DA
      </Link>

      <header style={{ marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 16 }}>
        <div>
          <h1 style={{ fontFamily: "var(--font-editorial)", fontSize: 36, fontWeight: 500, margin: 0, marginBottom: 6 }}>Carnet clients</h1>
          <p style={{ fontFamily: "var(--font-sans)", fontSize: 13, color: "var(--hub-foreground)", opacity: 0.65, margin: 0, maxWidth: 620, lineHeight: 1.5 }}>
            Une adresse e-mail = un contact, construit automatiquement depuis les commandes. Exporte les contacts autorisés pour ta prochaine campagne (Black Friday, Noël…).
          </p>
        </div>
        <a
          href={nbExport > 0 ? exportHref : undefined}
          aria-disabled={nbExport === 0}
          style={{
            display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 16px", borderRadius: 999,
            background: nbExport > 0 ? "var(--brand-teal, #1E6E77)" : "var(--hub-border)", color: "white",
            fontFamily: "var(--font-sans)", fontSize: 13, fontWeight: 600, textDecoration: "none",
            cursor: nbExport > 0 ? "pointer" : "not-allowed",
          }}
        >
          <Download size={15} strokeWidth={1.8} /> Exporter {nbExport} contact{nbExport > 1 ? "s" : ""} (CSV)
        </a>
      </header>

      {error && (
        <div style={{ background: "#FCEDE9", border: "0.5px solid #E8A99B", color: "#7A1F12", padding: "10px 16px", borderRadius: 8, marginBottom: 16, fontFamily: "var(--font-sans)", fontSize: 13 }}>{error}</div>
      )}

      {loading ? (
        <div style={{ padding: 60, textAlign: "center" }}><Loader2 size={28} className="animate-spin" strokeWidth={1.4} /></div>
      ) : (
        <>
          <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginBottom: 20 }}>
            <Tile icon={<Users size={16} strokeWidth={1.6} />} label="Contacts" value={contacts.length} />
            <Tile icon={<Mail size={16} strokeWidth={1.6} />} label="Contactables" value={nbContactables} />
            <Tile icon={<MailX size={16} strokeWidth={1.6} />} label="Désinscrits / exclus" value={contacts.length - nbContactables} />
            <Tile icon={<AlertTriangle size={16} strokeWidth={1.6} />} label="Commandes sans e-mail" value={sansEmail.length} onClick={sansEmail.length ? () => setVoirSansEmail((v) => !v) : undefined} />
          </section>

          {voirSansEmail && sansEmail.length > 0 && (
            <section style={{ padding: 16, border: "0.5px solid var(--hub-border)", borderRadius: 10, background: "white", marginBottom: 20 }}>
              <p style={{ fontFamily: "var(--font-sans)", fontSize: 12, opacity: 0.7, margin: "0 0 10px" }}>
                Ces commandes n&apos;ont pas d&apos;e-mail : ajoute-le sur la fiche commande (champ contact) pour que le client entre dans le carnet.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {sansEmail.map((c) => (
                  <Link key={c.id} href={`/atelier-production/commandes/${encodeURIComponent(c.id)}`} style={{ display: "flex", gap: 10, fontFamily: "var(--font-sans)", fontSize: 12, color: "var(--hub-foreground)", textDecoration: "none" }}>
                    <span style={{ fontWeight: 600, color: "var(--brand-teal, #1E6E77)", minWidth: 90 }}>#{c.numero.replace(/^#/, "")}</span>
                    <span style={{ flex: 1, opacity: 0.75 }}>{c.client ?? "—"}</span>
                    <span style={{ opacity: 0.55 }}>{SOURCE_LABEL[c.source]} · {fmtDate(c.date)}</span>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* FILTRES */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 14 }}>
            <div style={{ position: "relative", flex: "1 1 220px" }}>
              <Search size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", opacity: 0.45 }} />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nom, e-mail, ville…" style={{ ...inputStyle, width: "100%", paddingLeft: 30, boxSizing: "border-box" }} />
            </div>
            <select value={filtre} onChange={(e) => setFiltre(e.target.value as FiltreStatut)} style={inputStyle}>
              <option value="tous">Tous les statuts</option>
              <option value="contactables">Contactables</option>
              <option value="desinscrit">Désinscrits</option>
              <option value="exclu">Exclus</option>
            </select>
            <select value={motif} onChange={(e) => setMotif(e.target.value)} style={inputStyle}>
              <option value="">Tous les motifs</option>
              {motifs.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontFamily: "var(--font-sans)", fontSize: 12, opacity: 0.8 }}>
              Dernière commande depuis
              <input type="date" value={depuis} onChange={(e) => setDepuis(e.target.value)} style={inputStyle} />
            </label>
          </div>

          {/* LISTE */}
          <div style={{ border: "0.5px solid var(--hub-border)", borderRadius: 10, background: "white", overflow: "hidden" }}>
            {visibles.length === 0 ? (
              <div style={{ padding: 32, textAlign: "center", fontFamily: "var(--font-sans)", fontSize: 13, opacity: 0.55 }}>
                {contacts.length === 0 ? "Aucune commande avec e-mail pour l'instant." : "Aucun contact ne correspond aux filtres."}
              </div>
            ) : visibles.map((c, i) => (
              <ContactLigne
                key={c.email}
                contact={c}
                premier={i === 0}
                ouvert={ouvert === c.email}
                onToggle={() => setOuvert(ouvert === c.email ? null : c.email)}
                onSave={(patch) => enregistrer(c.email, patch)}
              />
            ))}
          </div>

          <p style={{ fontFamily: "var(--font-sans)", fontSize: 11, lineHeight: 1.6, opacity: 0.6, marginTop: 16, maxWidth: 760 }}>
            Règles d&apos;envoi : un client qui a déjà acheté peut recevoir une promo sur des produits similaires, à condition que chaque e-mail contienne un lien de désinscription (Shopify Email et Brevo l&apos;ajoutent tout seuls).
            Quand quelqu&apos;un se désinscrit, passe-le en « Désinscrit » ici : il ne sortira plus jamais dans l&apos;export.
            Les clients venus uniquement d&apos;Etsy sont exclus par défaut : les conditions d&apos;Etsy interdisent d&apos;utiliser leur e-mail pour du marketing sans leur accord.
          </p>
        </>
      )}
    </div>
  );
}

function Tile({ icon, label, value, onClick }: { icon: React.ReactNode; label: string; value: number; onClick?: () => void }) {
  return (
    <div onClick={onClick} style={{ padding: "14px 16px", border: "0.5px solid var(--hub-border)", borderRadius: 10, background: "white", cursor: onClick ? "pointer" : "default" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, opacity: 0.6, marginBottom: 6 }}>
        {icon}
        <span style={{ fontFamily: "var(--font-sans)", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</span>
      </div>
      <div style={{ fontFamily: "var(--font-sans)", fontSize: 24, fontWeight: 600 }}>{value}</div>
      {onClick && <div style={{ fontFamily: "var(--font-sans)", fontSize: 11, opacity: 0.55, marginTop: 2 }}>Cliquer pour voir</div>}
    </div>
  );
}

function ContactLigne({ contact: c, premier, ouvert, onToggle, onSave }: {
  contact: Contact; premier: boolean; ouvert: boolean; onToggle: () => void;
  onSave: (patch: { statut?: Statut | null; note?: string | null }) => Promise<void>;
}) {
  const [note, setNote] = useState(c.note ?? "");
  const [saving, setSaving] = useState(false);
  useEffect(() => { setNote(c.note ?? ""); }, [c.note]);

  const save = async (patch: { statut?: Statut | null; note?: string | null }) => {
    setSaving(true);
    try { await onSave(patch); } finally { setSaving(false); }
  };

  return (
    <div style={{ borderTop: premier ? "none" : "0.5px solid var(--hub-border)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", flexWrap: "wrap", fontFamily: "var(--font-sans)" }}>
        <button type="button" onClick={onToggle} style={{ display: "flex", alignItems: "center", gap: 8, flex: "1 1 260px", minWidth: 0, background: "none", border: "none", padding: 0, textAlign: "left", cursor: "pointer", color: "var(--hub-foreground)" }}>
          <ChevronRight size={13} strokeWidth={1.8} style={{ flexShrink: 0, opacity: 0.5, transform: ouvert ? "rotate(90deg)" : "none", transition: "transform 120ms" }} />
          <span style={{ minWidth: 0 }}>
            <span style={{ display: "block", fontSize: 14, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.nom || c.email}</span>
            <span style={{ display: "block", fontSize: 12, opacity: 0.6, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.email}{c.ville ? ` · ${c.ville}` : ""}</span>
          </span>
        </button>
        <div style={{ fontSize: 12, opacity: 0.75, minWidth: 150 }}>
          {c.nb_commandes} commande{c.nb_commandes > 1 ? "s" : ""} · dernière le {fmtDate(c.derniere_commande)}
          <div style={{ opacity: 0.7 }}>{c.sources.map((s) => SOURCE_LABEL[s]).join(" + ")}</div>
        </div>
        <select
          value={c.statut_auto ? "" : c.statut}
          disabled={saving}
          onChange={(e) => save({ statut: (e.target.value || null) as Statut | null })}
          style={{ ...inputStyle, fontSize: 12, padding: "6px 10px", color: STATUT_COULEUR[c.statut], fontWeight: 600 }}
        >
          <option value="">Auto · {STATUT_LABEL[c.statut]}</option>
          {(Object.keys(STATUT_LABEL) as Statut[]).map((s) => <option key={s} value={s}>{STATUT_LABEL[s]}</option>)}
        </select>
      </div>

      {ouvert && (
        <div style={{ padding: "0 16px 16px 37px", fontFamily: "var(--font-sans)", fontSize: 12, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16 }}>
          <div>
            <Label>Achats</Label>
            {c.motifs.length > 0 && <div style={{ marginBottom: 4 }}>Motifs : {c.motifs.join(", ")}</div>}
            {c.produits.length > 0 && <div style={{ marginBottom: 4, opacity: 0.75 }}>Produits : {c.produits.join(", ")}</div>}
            <div style={{ opacity: 0.75 }}>{c.nb_articles} article{c.nb_articles > 1 ? "s" : ""}{c.ca_connu > 0 ? ` · ${fmtEur(c.ca_connu)} connus` : ""} · client depuis le {fmtDate(c.premiere_commande)}</div>
            {c.telephone && <div style={{ opacity: 0.75, marginTop: 4 }}>Tél. {c.telephone}</div>}
            <div style={{ display: "flex", flexDirection: "column", gap: 2, marginTop: 8 }}>
              {c.commandes.map((cmd) => (
                <Link key={cmd.id} href={`/atelier-production/commandes/${encodeURIComponent(cmd.id)}`} style={{ color: "var(--hub-foreground)", textDecoration: "none" }}>
                  <span style={{ fontWeight: 600, color: "var(--brand-teal, #1E6E77)" }}>#{cmd.numero.replace(/^#/, "")}</span>
                  <span style={{ opacity: 0.6 }}> · {SOURCE_LABEL[cmd.source]} · {fmtDate(cmd.date)}{cmd.montant_ttc ? ` · ${fmtEur(cmd.montant_ttc)}` : ""}</span>
                </Link>
              ))}
            </div>
          </div>
          <div>
            <Label>Note</Label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder="Ex. a adoré Le Câlin, offre souvent pour sa mère…"
              style={{ ...inputStyle, width: "100%", boxSizing: "border-box", resize: "vertical", fontSize: 12 }}
            />
            {note !== (c.note ?? "") && (
              <button type="button" disabled={saving} onClick={() => save({ note })} style={{ marginTop: 6, padding: "6px 12px", borderRadius: 999, border: "none", background: "var(--brand-teal, #1E6E77)", color: "white", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                {saving ? "Enregistrement…" : "Enregistrer la note"}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", opacity: 0.55, marginBottom: 6 }}>{children}</div>;
}
