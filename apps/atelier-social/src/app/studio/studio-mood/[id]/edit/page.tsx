"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";
import type { StudioMoodEpisode, EpisodePatch, SupportType, StatutEpisode } from "@/lib/studio-mood/types";
import { HUMEURS_PRESETS, OCCASIONS_PRESETS, STATUT_META } from "@/lib/studio-mood/types";

const YPM_OPTIONS = [
  { id: "YPM-001", nom: "La Brigitte" },
  { id: "YPM-002", nom: "L'Ambiance" },
  { id: "YPM-003", nom: "Le Club" },
  { id: "YPM-004", nom: "Notre Héritage" },
  { id: "YPM-005", nom: "L'Annonce" },
  { id: "YPM-006", nom: "Le Câlin" },
  { id: "YPM-007", nom: "La Broderie" },
  { id: "YPM-008", nom: "La Féline" },
  { id: "YPM-009", nom: "La Palette" },
  { id: "YPM-010", nom: "Le Ronronneur" },
  { id: "YPM-014", nom: "Le Tigre" },
  { id: "YPM-015", nom: "La Déclaration" },
  { id: "YPM-016", nom: "La Signature" },
];

const SUPPORTS: Array<{ value: SupportType; label: string }> = [
  { value: "sweat", label: "Sweat à capuche" },
  { value: "tshirt", label: "T-shirt" },
  { value: "casquette", label: "Casquette" },
  { value: "accessoire", label: "Accessoire" },
];

const STATUTS: StatutEpisode[] = ["brouillon", "ready", "tourne", "monte", "publie"];

export default function EditEpisodePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [ep, setEp] = useState<StudioMoodEpisode | null>(null);
  const [form, setForm] = useState<EpisodePatch>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/studio-mood/${id}`)
      .then((r) => r.json())
      .then((json) => {
        if (!json.data) throw new Error(json.message ?? "Épisode introuvable");
        setEp(json.data);
        setForm({
          titre: json.data.titre,
          humeur: json.data.humeur,
          mot_brode: json.data.mot_brode,
          motif_ypm_id: json.data.motif_ypm_id,
          motif_ypm_nom: json.data.motif_ypm_nom,
          support: json.data.support,
          couleur_produit: json.data.couleur_produit,
          decor: json.data.decor,
          occasion: json.data.occasion,
          ampli_saisonnier: json.data.ampli_saisonnier,
          hook: json.data.hook,
          legende_question: json.data.legende_question,
          hashtags: json.data.hashtags,
          statut: json.data.statut,
        });
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  const set = (field: keyof EpisodePatch, value: unknown) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleMotifChange = (ypmId: string) => {
    const found = YPM_OPTIONS.find((m) => m.id === ypmId);
    set("motif_ypm_id", ypmId || null);
    set("motif_ypm_nom", found?.nom ?? null);
  };

  const handleHashtagsChange = (raw: string) => {
    const tags = raw.split(",").map((t) => t.trim().replace(/^#/, "")).filter(Boolean);
    set("hashtags", tags);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`/api/studio-mood/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message ?? "Erreur sauvegarde");
      router.push(`/studio/studio-mood/${id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setSaving(false);
    }
  };

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: 32, color: "#888" }}>
      <Loader2 size={18} className="animate-spin" /> Chargement…
    </div>
  );

  if (error || !ep) return (
    <div style={{ padding: 32 }}>
      <Link href={`/studio/studio-mood/${id}`} style={backLinkStyle}><ArrowLeft size={14} /> Retour</Link>
      <p style={{ color: "#B91C1C" }}>{error ?? "Épisode introuvable"}</p>
    </div>
  );

  return (
    <div style={{ maxWidth: 680, margin: "0 auto" }}>
      <Link href={`/studio/studio-mood/${id}`} style={backLinkStyle}>
        <ArrowLeft size={14} strokeWidth={1.6} /> {ep.titre}
      </Link>
      <h1 style={h1Style}>Modifier l&apos;épisode</h1>

      <form onSubmit={handleSubmit} style={{ marginTop: 20 }}>
        {error && <div style={errorBoxStyle}>{error}</div>}

        <FieldGroup label="Titre *">
          <input type="text" value={String(form.titre ?? "")} onChange={(e) => set("titre", e.target.value)} style={inputStyle} />
        </FieldGroup>

        <FieldGroup label="Statut">
          <select value={form.statut ?? ep.statut} onChange={(e) => set("statut", e.target.value as StatutEpisode)} style={inputStyle}>
            {STATUTS.map((s) => (
              <option key={s} value={s}>{STATUT_META[s].label}</option>
            ))}
          </select>
        </FieldGroup>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <FieldGroup label="Humeur *">
            <input type="text" list="humeurs-list" value={String(form.humeur ?? "")} onChange={(e) => set("humeur", e.target.value)} style={inputStyle} />
            <datalist id="humeurs-list">{HUMEURS_PRESETS.map((h) => <option key={h} value={h} />)}</datalist>
          </FieldGroup>
          <FieldGroup label="Mot brodé *">
            <input type="text" value={String(form.mot_brode ?? "")} onChange={(e) => set("mot_brode", e.target.value.toUpperCase())} style={{ ...inputStyle, fontFamily: "var(--font-editorial)", fontWeight: 600, fontSize: 16, letterSpacing: "0.05em" }} />
          </FieldGroup>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <FieldGroup label="Motif YPM">
            <select value={form.motif_ypm_id ?? ""} onChange={(e) => handleMotifChange(e.target.value)} style={inputStyle}>
              <option value="">— aucun —</option>
              {YPM_OPTIONS.map((m) => <option key={m.id} value={m.id}>{m.id} — {m.nom}</option>)}
            </select>
          </FieldGroup>
          <FieldGroup label="Support">
            <select value={form.support ?? ep.support} onChange={(e) => set("support", e.target.value as SupportType)} style={inputStyle}>
              {SUPPORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </FieldGroup>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <FieldGroup label="Couleur produit">
            <input type="text" value={String(form.couleur_produit ?? "")} onChange={(e) => set("couleur_produit", e.target.value || null)} style={inputStyle} />
          </FieldGroup>
          <FieldGroup label="Occasion">
            <input type="text" list="occasions-list" value={String(form.occasion ?? "")} onChange={(e) => set("occasion", e.target.value || null)} style={inputStyle} />
            <datalist id="occasions-list">{OCCASIONS_PRESETS.map((o) => <option key={o} value={o} />)}</datalist>
          </FieldGroup>
        </div>

        <FieldGroup label="Décor / mise en scène">
          <input type="text" value={String(form.decor ?? "")} onChange={(e) => set("decor", e.target.value || null)} style={inputStyle} />
        </FieldGroup>

        <FieldGroup label="Ampli saisonnier">
          <input type="text" value={String(form.ampli_saisonnier ?? "")} onChange={(e) => set("ampli_saisonnier", e.target.value || null)} style={inputStyle} />
        </FieldGroup>

        <FieldGroup label="Hook stop-scroll">
          <textarea
            value={String(form.hook ?? "")}
            onChange={(e) => set("hook", e.target.value || null)}
            rows={2}
            style={{ ...inputStyle, resize: "vertical" }}
          />
        </FieldGroup>

        <FieldGroup label="Légende + question">
          <textarea
            value={String(form.legende_question ?? "")}
            onChange={(e) => set("legende_question", e.target.value || null)}
            rows={4}
            style={{ ...inputStyle, resize: "vertical" }}
          />
        </FieldGroup>

        <FieldGroup label="Hashtags (séparés par virgule, sans #)">
          <input
            type="text"
            value={(form.hashtags ?? ep.hashtags).join(", ")}
            onChange={(e) => handleHashtagsChange(e.target.value)}
            style={inputStyle}
            placeholder="YPERSOA, broderie personnalisée, brodé à la commande…"
          />
        </FieldGroup>

        <div style={{ marginTop: 28, display: "flex", gap: 10 }}>
          <button type="submit" disabled={saving} style={primaryBtnStyle}>
            {saving ? <Loader2 size={14} className="animate-spin" /> : null}
            {saving ? "Enregistrement…" : "Enregistrer"}
          </button>
          <Link href={`/studio/studio-mood/${id}`} style={cancelStyle}>Annuler</Link>
        </div>
      </form>
    </div>
  );
}

function FieldGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={labelStyle}>{label}</label>
      {children}
    </div>
  );
}

const backLinkStyle: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 6,
  fontSize: 13, color: "var(--hub-foreground)", opacity: 0.6,
  textDecoration: "none", marginBottom: 20, fontFamily: "var(--font-sans)",
};
const h1Style: React.CSSProperties = {
  fontFamily: "var(--font-editorial)", fontSize: 28, fontWeight: 500,
  letterSpacing: "-0.015em", margin: 0,
};
const labelStyle: React.CSSProperties = {
  display: "block", fontSize: 12, fontFamily: "var(--font-sans)",
  fontWeight: 600, marginBottom: 5, opacity: 0.7,
  textTransform: "uppercase", letterSpacing: "0.04em",
};
const inputStyle: React.CSSProperties = {
  width: "100%", padding: "9px 12px", borderRadius: 8,
  border: "1px solid #DDD9D3", fontSize: 14,
  fontFamily: "var(--font-sans)", background: "#fff",
  color: "var(--hub-foreground)", outline: "none", boxSizing: "border-box",
};
const primaryBtnStyle: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 6,
  padding: "10px 20px", borderRadius: 8, background: "#1E6E77",
  color: "#fff", fontSize: 14, fontWeight: 600,
  fontFamily: "var(--font-sans)", cursor: "pointer", border: "none",
};
const cancelStyle: React.CSSProperties = {
  display: "inline-flex", alignItems: "center",
  padding: "10px 16px", borderRadius: 8,
  background: "transparent", color: "var(--hub-foreground)",
  fontSize: 14, fontFamily: "var(--font-sans)", opacity: 0.6,
  textDecoration: "none",
};
const errorBoxStyle: React.CSSProperties = {
  padding: "12px 16px", borderRadius: 8,
  background: "#FEF2F2", color: "#B91C1C",
  fontSize: 13, fontFamily: "var(--font-sans)", marginBottom: 20,
};
