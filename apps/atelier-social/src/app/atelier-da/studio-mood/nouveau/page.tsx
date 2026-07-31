"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";
import type { EpisodeInsert, SupportType } from "@/lib/studio-mood/types";
import { HUMEURS_PRESETS, OCCASIONS_PRESETS } from "@/lib/studio-mood/types";

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

const INITIAL: EpisodeInsert = {
  titre: "",
  humeur: "",
  mot_brode: "",
  motif_ypm_id: null,
  motif_ypm_nom: null,
  support: "sweat",
  couleur_produit: null,
  decor: null,
  occasion: null,
  ampli_saisonnier: null,
  hook: null,
  legende_question: null,
  hashtags: [],
  statut: "brouillon",
  assets_avatar: null,
  assets_variante_vetement: null,
  assets_autres: [],
};

export default function NouvelEpisodePage() {
  const router = useRouter();
  const [form, setForm] = useState<EpisodeInsert>(INITIAL);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const set = (field: keyof EpisodeInsert, value: unknown) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleMotifChange = (ypmId: string) => {
    const found = YPM_OPTIONS.find((m) => m.id === ypmId);
    set("motif_ypm_id", ypmId || null);
    set("motif_ypm_nom", found?.nom ?? null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: string[] = [];
    if (!form.titre.trim()) errs.push("Titre obligatoire");
    if (!form.humeur.trim()) errs.push("Humeur obligatoire");
    if (!form.mot_brode.trim()) errs.push("Mot brodé obligatoire");
    if (errs.length) { setErrors(errs); return; }

    setSaving(true);
    try {
      const res = await fetch("/api/studio-mood", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message ?? "Erreur création");
      router.push(`/atelier-da/studio-mood/${json.data.id}`);
    } catch (e) {
      setErrors([e instanceof Error ? e.message : String(e)]);
      setSaving(false);
    }
  };

  return (
    <div style={{ maxWidth: 680, margin: "0 auto" }}>
      <Link href="/atelier-da/studio-mood" style={backLinkStyle}>
        <ArrowLeft size={14} strokeWidth={1.6} /> Studio Mood
      </Link>

      <h1 style={h1Style}>Nouvel épisode</h1>
      <p style={subtitleStyle}>
        Définis l&apos;humeur, le mot brodé et le contexte — le hook et le storyboard se génèrent ensuite.
      </p>

      <form onSubmit={handleSubmit} style={{ marginTop: 24 }}>
        {errors.length > 0 && (
          <div style={errorBoxStyle}>
            {errors.map((e, i) => <p key={i} style={{ margin: "2px 0" }}>{e}</p>)}
          </div>
        )}

        <FieldGroup label="Titre de l'épisode *">
          <input
            type="text"
            placeholder="ex : Le Câlin × Fête des Mères"
            value={form.titre}
            onChange={(e) => set("titre", e.target.value)}
            style={inputStyle}
          />
        </FieldGroup>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <FieldGroup label="Humeur *">
            <input
              type="text"
              list="humeurs-list"
              placeholder="Tendresse, Fierté…"
              value={form.humeur}
              onChange={(e) => set("humeur", e.target.value)}
              style={inputStyle}
            />
            <datalist id="humeurs-list">
              {HUMEURS_PRESETS.map((h) => <option key={h} value={h} />)}
            </datalist>
          </FieldGroup>

          <FieldGroup label="Mot brodé *">
            <input
              type="text"
              placeholder="MAMAN, FOREVER, 40…"
              value={form.mot_brode}
              onChange={(e) => set("mot_brode", e.target.value.toUpperCase())}
              style={{ ...inputStyle, fontFamily: "var(--font-editorial)", fontWeight: 600, fontSize: 16, letterSpacing: "0.05em" }}
            />
          </FieldGroup>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <FieldGroup label="Motif YPM">
            <select
              value={form.motif_ypm_id ?? ""}
              onChange={(e) => handleMotifChange(e.target.value)}
              style={inputStyle}
            >
              <option value="">— aucun —</option>
              {YPM_OPTIONS.map((m) => (
                <option key={m.id} value={m.id}>{m.id} — {m.nom}</option>
              ))}
            </select>
          </FieldGroup>

          <FieldGroup label="Support">
            <select
              value={form.support}
              onChange={(e) => set("support", e.target.value as SupportType)}
              style={inputStyle}
            >
              {SUPPORTS.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </FieldGroup>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <FieldGroup label="Couleur produit">
            <input
              type="text"
              placeholder="blush rosé, marine, blanc cassé…"
              value={form.couleur_produit ?? ""}
              onChange={(e) => set("couleur_produit", e.target.value || null)}
              style={inputStyle}
            />
          </FieldGroup>

          <FieldGroup label="Occasion">
            <input
              type="text"
              list="occasions-list"
              placeholder="Fête des Mères, Noël…"
              value={form.occasion ?? ""}
              onChange={(e) => set("occasion", e.target.value || null)}
              style={inputStyle}
            />
            <datalist id="occasions-list">
              {OCCASIONS_PRESETS.map((o) => <option key={o} value={o} />)}
            </datalist>
          </FieldGroup>
        </div>

        <FieldGroup label="Décor / mise en scène">
          <input
            type="text"
            placeholder="ex : Salon cosy, canapé en lin beige, lumière matinale"
            value={form.decor ?? ""}
            onChange={(e) => set("decor", e.target.value || null)}
            style={inputStyle}
          />
        </FieldGroup>

        <FieldGroup label="Ampli saisonnier">
          <input
            type="text"
            placeholder="ex : Mai — J-14 à J-2"
            value={form.ampli_saisonnier ?? ""}
            onChange={(e) => set("ampli_saisonnier", e.target.value || null)}
            style={inputStyle}
          />
        </FieldGroup>

        <div style={{ marginTop: 28, display: "flex", gap: 10 }}>
          <button type="submit" disabled={saving} style={primaryBtnStyle}>
            {saving ? <Loader2 size={14} className="animate-spin" /> : null}
            {saving ? "Création…" : "Créer l'épisode"}
          </button>
          <Link href="/atelier-da/studio-mood" style={cancelStyle}>
            Annuler
          </Link>
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

// ─── Styles ───────────────────────────────────────────────────────────────────

const backLinkStyle: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 6,
  fontSize: 13, color: "var(--hub-foreground)", opacity: 0.6,
  textDecoration: "none", marginBottom: 20, fontFamily: "var(--font-sans)",
};

const h1Style: React.CSSProperties = {
  fontFamily: "var(--font-editorial)", fontSize: 30, fontWeight: 500,
  letterSpacing: "-0.015em", margin: 0, marginBottom: 6,
};

const subtitleStyle: React.CSSProperties = {
  fontFamily: "var(--font-sans)", fontSize: 14,
  color: "var(--hub-foreground)", opacity: 0.65, lineHeight: 1.6,
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
