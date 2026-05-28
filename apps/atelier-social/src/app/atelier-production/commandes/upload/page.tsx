/**
 * /atelier-production/commandes/upload
 *
 * Dépôt admin d'un bon de préparation Shopify (PDF) → parsing IA →
 * revue/édition du draft → création de la commande.
 *
 * Le rôle est vérifié serveur-side par /api/production/commandes/parse-pdf
 * (renvoie 403 si non admin). On vérifie côté UI en plus pour afficher un
 * message clair plutôt qu'une page d'erreur.
 */
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, FileText, Loader2, UploadCloud, AlertTriangle, Check } from "lucide-react";

import type { Commande } from "@/lib/production/commandes-loader";

interface Warning {
  level: "warning" | "info";
  message: string;
}

interface ParseResponse {
  ok: boolean;
  error?: string;
  data?: {
    commande: Commande;
    warnings: Warning[];
    pdf_text_preview: string;
  };
}

type Phase = "idle" | "uploading" | "reviewing" | "saving";

export default function UploadCommandePage() {
  const router = useRouter();
  const [role, setRole] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [file, setFile] = useState<File | null>(null);
  const [draft, setDraft] = useState<Commande | null>(null);
  const [warnings, setWarnings] = useState<Warning[]>([]);
  const [jsonText, setJsonText] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  // Charge le rôle pour gating UI (le serveur gate aussi, c'est cosmétique ici)
  useEffect(() => {
    fetch("/api/me", { cache: "no-store" })
      .then((r) => r.json())
      .then((res) => setRole(res?.data?.role ?? null))
      .catch(() => setRole(null));
  }, []);

  const isAdmin = role === "admin";

  async function handleUpload(f: File) {
    setError(null);
    setPhase("uploading");
    setFile(f);
    try {
      const fd = new FormData();
      fd.append("file", f);
      const res = await fetch("/api/production/commandes/parse-pdf", {
        method: "POST",
        body: fd,
      });
      const json = (await res.json()) as ParseResponse;
      if (!json.ok || !json.data) {
        throw new Error(json.error || "Parsing échoué");
      }
      setDraft(json.data.commande);
      setWarnings(json.data.warnings ?? []);
      setJsonText(JSON.stringify(json.data.commande, null, 2));
      setPhase("reviewing");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setPhase("idle");
    }
  }

  async function handleCreate() {
    setError(null);
    let payload: Commande;
    try {
      payload = JSON.parse(jsonText) as Commande;
    } catch {
      setError("Le JSON est invalide — corrige-le avant de créer la commande.");
      return;
    }
    if (!payload.id || !payload.articles?.length) {
      setError("La commande doit avoir un id et au moins un article.");
      return;
    }
    setPhase("saving");
    try {
      const res = await fetch("/api/production/commandes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "Création échouée");
      router.push(`/atelier-production/commandes/${payload.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setPhase("reviewing");
    }
  }

  const articleSummary = useMemo(() => {
    if (!draft) return null;
    return draft.articles.map((a) => ({
      id: a.id,
      sku: a.sku,
      produit: a.produit_nom,
      motif: a.ypm_nom,
      qte: a.quantite,
      taille: a.taille,
      couleur: a.couleur_support,
      broderies: a.broderies.map((b) => ({
        placement: b.placement,
        fil: b.fil_nom || "(fil ?)",
        champs: b.champs.map((c) => `${c.label}: « ${c.valeur} »`).join(" + "),
      })),
    }));
  }, [draft]);

  if (role === null) {
    return (
      <div style={{ padding: 60, textAlign: "center" }}>
        <Loader2 size={28} className="animate-spin" strokeWidth={1.4} />
      </div>
    );
  }
  if (!isAdmin) {
    return (
      <div style={{ maxWidth: 720, margin: "60px auto", padding: 32, textAlign: "center" }}>
        <AlertTriangle size={32} strokeWidth={1.4} style={{ color: "#9A1818", marginBottom: 12 }} />
        <h1 style={{ fontFamily: "var(--font-editorial)", fontSize: 24, fontWeight: 500, marginBottom: 12 }}>
          Réservé aux administrateurs
        </h1>
        <p style={{ fontFamily: "var(--font-sans)", fontSize: 14, color: "var(--hub-foreground)", opacity: 0.7 }}>
          Seuls les comptes admin peuvent déposer un bon de préparation Shopify.
        </p>
        <Link
          href="/atelier-production/commandes"
          style={{ display: "inline-block", marginTop: 16, fontFamily: "var(--font-sans)", fontSize: 13, color: "var(--hub-foreground)" }}
        >
          ← Retour aux commandes
        </Link>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto" }}>
      <Link
        href="/atelier-production/commandes"
        style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          fontFamily: "var(--font-sans)", fontSize: 12,
          color: "var(--hub-foreground)", opacity: 0.6,
          textDecoration: "none", marginBottom: 24,
        }}
      >
        <ArrowLeft size={14} strokeWidth={1.6} /> Commandes Shopify
      </Link>

      <header style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: "var(--font-editorial)", fontSize: 32, fontWeight: 500, margin: 0, marginBottom: 8 }}>
          Déposer un bon de préparation
        </h1>
        <p style={{ fontFamily: "var(--font-sans)", fontSize: 13, color: "var(--hub-foreground)", opacity: 0.65, maxWidth: 760, lineHeight: 1.5 }}>
          Charge le PDF Shopify : il est parsé par OpenAI gpt-4o, les SKU sont
          croisés avec les référentiels (produits, motifs YPM, fils Gunold), les
          durées sont calculées (800 pts/min, 5 min DST mutualisé par motif). Tu
          relis et corriges avant création — le PDF reste joint à la commande.
        </p>
      </header>

      {error && (
        <div style={{
          background: "#FCEDE9", border: "0.5px solid #E8A99B", color: "#7A1F12",
          padding: "10px 16px", borderRadius: 8, marginBottom: 16,
          fontFamily: "var(--font-sans)", fontSize: 13,
        }}>
          {error}
        </div>
      )}

      {phase === "idle" && (
        <Dropzone onFile={handleUpload} />
      )}

      {phase === "uploading" && (
        <div style={{
          padding: 60, textAlign: "center",
          border: "1px dashed var(--hub-border)", borderRadius: 12,
          background: "var(--hub-bg)",
        }}>
          <Loader2 size={28} className="animate-spin" strokeWidth={1.4} />
          <p style={{ marginTop: 12, fontFamily: "var(--font-sans)", fontSize: 13, color: "var(--hub-foreground)", opacity: 0.7 }}>
            Parsing du PDF en cours via OpenAI…
            <br />
            <span style={{ fontSize: 11 }}>({file?.name})</span>
          </p>
        </div>
      )}

      {phase === "reviewing" || phase === "saving" ? (
        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 20 }}>
          {/* Warnings */}
          {warnings.length > 0 && (
            <section style={{
              background: "#FEF6E0", border: "0.5px solid #E2C679", borderRadius: 10,
              padding: 14, fontFamily: "var(--font-sans)", fontSize: 13,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, color: "#7A5800", fontWeight: 600 }}>
                <AlertTriangle size={15} strokeWidth={1.8} />
                {warnings.length} point{warnings.length > 1 ? "s" : ""} à vérifier
              </div>
              <ul style={{ margin: 0, paddingLeft: 20, color: "#5C4500" }}>
                {warnings.map((w, i) => (<li key={i}>{w.message}</li>))}
              </ul>
            </section>
          )}

          {/* Récap visuel */}
          {draft && (
            <section style={{
              background: "var(--hub-bg)", border: "0.5px solid var(--hub-border)",
              borderRadius: 10, padding: 18,
            }}>
              <h2 style={{ fontFamily: "var(--font-editorial)", fontSize: 18, fontWeight: 500, margin: 0, marginBottom: 12 }}>
                {draft.numero_shopify} — récap
              </h2>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12, fontFamily: "var(--font-sans)", fontSize: 13 }}>
                <KV label="Date" value={draft.date_commande} />
                <KV label="Priorité" value={draft.priorite} />
                <KV label="Articles" value={`${draft.articles.length}`} />
                <KV label="Durée totale" value={`${draft.duree_total_min} min`} />
              </div>
              <div style={{ marginTop: 12, fontFamily: "var(--font-sans)", fontSize: 13, color: "var(--hub-foreground)", opacity: 0.85, lineHeight: 1.5 }}>
                <strong>Livraison :</strong> {draft.expedition.nom} — {draft.expedition.adresse_ligne1}
                {draft.expedition.adresse_ligne2 ? `, ${draft.expedition.adresse_ligne2}` : ""}, {draft.expedition.code_postal} {draft.expedition.ville}, {draft.expedition.pays}
              </div>
              <ul style={{ marginTop: 14, paddingLeft: 18, fontFamily: "var(--font-sans)", fontSize: 13, lineHeight: 1.6 }}>
                {articleSummary?.map((a) => (
                  <li key={a.id} style={{ marginBottom: 8 }}>
                    <strong>{a.sku}</strong> — {a.produit} · motif <em>{a.motif}</em> · {a.couleur} · {a.taille} · ×{a.qte}
                    {a.broderies.length > 0 && (
                      <ul style={{ paddingLeft: 18, opacity: 0.8, margin: "4px 0 0" }}>
                        {a.broderies.map((b, i) => (
                          <li key={i}>{b.placement} · fil <em>{b.fil}</em> · {b.champs || "(pas de champ)"}</li>
                        ))}
                      </ul>
                    )}
                  </li>
                ))}
              </ul>

              {draft.bon_preparation_pdf && (
                <a
                  href={draft.bon_preparation_pdf.public_url}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 6,
                    marginTop: 6,
                    fontFamily: "var(--font-sans)", fontSize: 12,
                    color: "var(--hub-foreground)",
                  }}
                >
                  <FileText size={14} strokeWidth={1.6} /> Voir le bon PDF déposé
                </a>
              )}
            </section>
          )}

          {/* JSON éditable (source de vérité) */}
          <section>
            <label style={{
              display: "block", fontFamily: "var(--font-sans)", fontSize: 11,
              fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase",
              color: "var(--hub-foreground)", opacity: 0.7, marginBottom: 6,
            }}>
              JSON commande (édite si besoin — c&apos;est ce qui sera enregistré)
            </label>
            <textarea
              value={jsonText}
              onChange={(e) => setJsonText(e.target.value)}
              spellCheck={false}
              style={{
                width: "100%", minHeight: 320,
                fontFamily: "ui-monospace, SFMono-Regular, monospace",
                fontSize: 12, lineHeight: 1.5,
                background: "white", border: "0.5px solid var(--hub-border)",
                borderRadius: 8, padding: 12,
                color: "var(--hub-foreground)", resize: "vertical",
              }}
            />
          </section>

          {/* Actions */}
          <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", alignItems: "center" }}>
            <button
              type="button"
              onClick={() => {
                setDraft(null);
                setWarnings([]);
                setJsonText("");
                setFile(null);
                setPhase("idle");
              }}
              disabled={phase === "saving"}
              style={ghostBtn}
            >
              Annuler / changer de PDF
            </button>
            <button
              type="button"
              onClick={handleCreate}
              disabled={phase === "saving"}
              style={primaryBtn}
            >
              {phase === "saving" ? (
                <><Loader2 size={14} className="animate-spin" strokeWidth={1.6} /> Création…</>
              ) : (
                <><Check size={14} strokeWidth={1.8} /> Créer la commande</>
              )}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function KV({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--hub-foreground)", opacity: 0.55 }}>{label}</div>
      <div style={{ marginTop: 2 }}>{value}</div>
    </div>
  );
}

function Dropzone({ onFile }: { onFile: (f: File) => void }) {
  const [hover, setHover] = useState(false);
  return (
    <label
      onDragOver={(e) => { e.preventDefault(); setHover(true); }}
      onDragLeave={() => setHover(false)}
      onDrop={(e) => {
        e.preventDefault();
        setHover(false);
        const f = e.dataTransfer.files?.[0];
        if (f && f.type === "application/pdf") onFile(f);
      }}
      style={{
        display: "block", padding: 60, textAlign: "center", cursor: "pointer",
        border: `2px dashed ${hover ? "var(--color-brand-rose, #A76059)" : "var(--hub-border)"}`,
        background: hover ? "rgba(167,96,89,0.06)" : "white",
        borderRadius: 16, transition: "background 150ms, border-color 150ms",
      }}
    >
      <input
        type="file"
        accept="application/pdf"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
        }}
        style={{ display: "none" }}
      />
      <UploadCloud size={36} strokeWidth={1.4} style={{ color: "var(--hub-foreground)", opacity: 0.6, marginBottom: 12 }} />
      <p style={{ fontFamily: "var(--font-editorial)", fontSize: 20, margin: 0, color: "var(--hub-foreground)" }}>
        Dépose le bon de préparation Shopify
      </p>
      <p style={{ fontFamily: "var(--font-sans)", fontSize: 13, color: "var(--hub-foreground)", opacity: 0.6, margin: "6px 0 0 0" }}>
        Fichier PDF, 20 Mo max. Parsing IA + croisement référentiels automatiques.
      </p>
    </label>
  );
}

const primaryBtn: React.CSSProperties = {
  background: "var(--color-brand-rose, #A76059)", color: "white",
  border: "none", borderRadius: 9999, padding: "10px 22px",
  fontFamily: "var(--font-sans)", fontSize: 13, fontWeight: 500,
  letterSpacing: "0.04em", cursor: "pointer",
  display: "inline-flex", alignItems: "center", gap: 6,
};

const ghostBtn: React.CSSProperties = {
  background: "transparent", color: "var(--hub-foreground)",
  border: "0.5px solid var(--hub-border)", borderRadius: 9999,
  padding: "10px 18px",
  fontFamily: "var(--font-sans)", fontSize: 13,
  cursor: "pointer",
};
