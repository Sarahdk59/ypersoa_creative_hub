"use client";
import { Loader2, X } from "lucide-react";
import { useState } from "react";
import { MotifPicker } from "./MotifPicker";
import type { PlanableCalendarEntryRow, PlanablePlatform, PlanableMediaFormat } from "@/lib/supabase/types";

const PLATFORMS: { value: PlanablePlatform; label: string; defaultFormat: PlanableMediaFormat }[] = [
  { value: "instagram_post", label: "Insta post", defaultFormat: "4:5" },
  { value: "instagram_reel", label: "Insta reel", defaultFormat: "9:16" },
  { value: "instagram_story", label: "Insta story", defaultFormat: "9:16" },
  { value: "pinterest_pin", label: "Pinterest pin", defaultFormat: "2:3" },
];

export function EntryDialog({
  initialDate,
  editing,
  occasionsSlugs,
  onClose,
  onCreated,
}: {
  initialDate: Date;
  editing?: PlanableCalendarEntryRow | null;
  occasionsSlugs: { slug: string; name_fr: string }[];
  onClose: () => void;
  onCreated: () => Promise<void>;
}) {
  const isEdit = !!editing;
  const initial = editing ? new Date(editing.scheduled_at) : initialDate;
  // Format local (pas UTC) pour éviter le décalage d'un jour en heure d'été
  const pad = (n: number) => String(n).padStart(2, "0");
  const [date, setDate] = useState(
    `${initial.getFullYear()}-${pad(initial.getMonth() + 1)}-${pad(initial.getDate())}`
  );
  const [time, setTime] = useState(
    editing ? `${pad(initial.getHours())}:${pad(initial.getMinutes())}` : "19:00"
  );
  const [platform, setPlatform] = useState<PlanablePlatform>(editing?.platform ?? "instagram_post");
  const [format, setFormat] = useState<PlanableMediaFormat>(editing?.format ?? "4:5");
  const [motif, setMotif] = useState<string>(editing?.motif_code ?? "YPM-001");
  const [varianteFile, setVarianteFile] = useState<string | null>(editing?.variante_file ?? null);
  const [occasion, setOccasion] = useState<string>(editing?.occasion_slug ?? "");
  const [notes, setNotes] = useState<string>(editing?.notes ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const handlePlatformChange = (p: PlanablePlatform) => {
    setPlatform(p);
    const fmt = PLATFORMS.find((x) => x.value === p)?.defaultFormat;
    if (fmt) setFormat(fmt);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErr(null);
    try {
      // Construit la date en LOCAL (browser TZ = Paris pour Sarah), puis convertit en UTC
      const [yy, mm, dd] = date.split("-").map(Number);
      const [hh, mn] = time.split(":").map(Number);
      const scheduled_at = new Date(yy, mm - 1, dd, hh, mn).toISOString();
      const body = {
        scheduled_at, platform, motif_code: motif, format,
        variante_file: varianteFile,
        occasion_slug: occasion || null,
        notes: notes || null,
      };
      const url = isEdit ? `/api/calendar/${editing!.id}` : "/api/calendar";
      const method = isEdit ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }).then((r) => r.json());
      if (!res.ok) throw new Error(typeof res.error === "string" ? res.error : "Échec");
      await onCreated();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, background: "rgba(26,46,79,0.4)", zIndex: 100,
      display: "flex", alignItems: "center", justifyContent: "center", padding: 32,
    }}>
      <form onClick={(e) => e.stopPropagation()} onSubmit={submit} style={{
        background: "white", borderRadius: 16, padding: 24, width: "100%", maxWidth: 640,
        maxHeight: "calc(100vh - 64px)", overflow: "auto",
        display: "flex", flexDirection: "column", gap: 14, position: "relative",
      }}>
        <button type="button" onClick={onClose} aria-label="Fermer" style={{
          position: "absolute", top: 12, right: 12, width: 32, height: 32, borderRadius: 999,
          background: "var(--color-cream)", border: "none", cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <X size={14} />
        </button>

        <h2 style={{ fontFamily: "var(--font-serif)", fontSize: 20, fontWeight: 500, margin: 0 }}>
          {isEdit ? "Modifier l'entrée" : "Nouvelle entrée"}
        </h2>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <Field label="Date">
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required style={inputStyle} />
          </Field>
          <Field label="Heure">
            <input type="time" value={time} onChange={(e) => setTime(e.target.value)} required style={inputStyle} />
          </Field>
        </div>

        <Field label="Plateforme">
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {PLATFORMS.map((p) => (
              <button key={p.value} type="button" onClick={() => handlePlatformChange(p.value)} style={{
                ...pillBtn,
                background: platform === p.value ? "var(--color-ink)" : "white",
                color: platform === p.value ? "var(--color-cream)" : "var(--color-ink)",
              }}>{p.label}</button>
            ))}
          </div>
        </Field>

        <Field label={`Motif · sélectionné : ${motif}${varianteFile ? ` · variante` : ""}`}>
          <MotifPicker
            selected={motif}
            selectedVariante={varianteFile}
            onSelect={(id) => {
              setMotif(id);
              setVarianteFile(null);  // reset la variante quand on change de motif source
            }}
            onSelectVariante={setVarianteFile}
          />
        </Field>

        <Field label="Format">
          <select value={format} onChange={(e) => setFormat(e.target.value as PlanableMediaFormat)} required style={inputStyle}>
            {(["1:1","4:5","9:16","2:3"] as const).map((f) => <option key={f} value={f}>{f}</option>)}
          </select>
        </Field>

        <Field label="Occasion (optionnel)">
          <select value={occasion} onChange={(e) => setOccasion(e.target.value)} style={inputStyle}>
            <option value="">— Aucune —</option>
            {occasionsSlugs.map((o) => <option key={o.slug} value={o.slug}>{o.name_fr}</option>)}
          </select>
        </Field>

        <Field label="Notes (optionnel)">
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} style={{ ...inputStyle, resize: "vertical" }} />
        </Field>

        {err && <div style={{ color: "#c53030", fontSize: 12, fontFamily: "var(--font-sans)" }}>{err}</div>}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button type="button" onClick={onClose} disabled={submitting} style={pillBtn}>Annuler</button>
          <button type="submit" disabled={submitting} style={{
            ...pillBtn, background: "var(--color-ink)", color: "var(--color-cream)", border: "none",
          }}>
            {submitting ? <Loader2 size={13} className="animate-spin" style={{ marginRight: 4 }} /> : null}
            {isEdit ? "Enregistrer" : "Créer"}
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <span style={{
        fontFamily: "var(--font-sans)", fontSize: 10, fontWeight: 600,
        letterSpacing: "0.06em", textTransform: "uppercase", opacity: 0.55,
      }}>{label}</span>
      {children}
    </label>
  );
}

const inputStyle: React.CSSProperties = {
  padding: "8px 10px", borderRadius: 8, border: "0.5px solid var(--color-border)",
  fontFamily: "var(--font-sans)", fontSize: 13, background: "white", width: "100%",
};
const pillBtn: React.CSSProperties = {
  padding: "8px 14px", borderRadius: 999, border: "0.5px solid var(--color-border)",
  background: "white", color: "var(--color-ink)",
  fontFamily: "var(--font-sans)", fontSize: 12, cursor: "pointer",
  display: "inline-flex", alignItems: "center",
};
