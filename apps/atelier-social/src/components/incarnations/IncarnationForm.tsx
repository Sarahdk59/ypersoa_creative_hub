/**
 * IncarnationForm — formulaire de création/édition.
 *
 * Réutilisé par /atelier-da/incarnations/new (création) et
 * /atelier-da/incarnations/[code] (édition).
 */
"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, X } from "lucide-react";

import type {
  IncarnationEnriched,
  IncarnationStatut,
  IncarnationTon,
  Motif,
  SpecBroderie,
} from "@/types/incarnations";
import {
  COLLECTIONS_SUGGESTIONS,
  GABARITS_DISPONIBLES,
  STATUT_LABELS,
  STATUT_ORDER,
  SYMBOLES_DISPONIBLES,
  TON_LABELS,
  TON_ORDER,
} from "@/types/incarnations";

export interface IncarnationFormValues {
  code: string;
  nom_commercial: string;
  motif_ypm: string;
  spec_broderie: SpecBroderie;
  gabarits_cibles: string[];
  collections_cibles: string[];
  ton: IncarnationTon | null;
  statut: IncarnationStatut;
  notes: string;
}

interface IncarnationFormProps {
  mode: "create" | "edit";
  motifs: Motif[];
  initial?: IncarnationEnriched;
  onSubmit: (v: IncarnationFormValues) => Promise<void>;
  onCancel?: () => void;
  saving?: boolean;
  error?: string | null;
}

function buildInitial(initial?: IncarnationEnriched): IncarnationFormValues {
  return {
    code: initial?.code ?? "",
    nom_commercial: initial?.nom_commercial ?? "",
    motif_ypm: initial?.motif_ypm ?? "",
    spec_broderie: {
      mot_haut: initial?.spec_broderie.mot_haut ?? "",
      mot_bas: initial?.spec_broderie.mot_bas ?? "",
      symbole: initial?.spec_broderie.symbole ?? "Aucun",
      couleur_fil_defaut: initial?.spec_broderie.couleur_fil_defaut ?? "",
    },
    gabarits_cibles: initial?.gabarits_cibles ?? [],
    collections_cibles: initial?.collections_cibles ?? [],
    ton: initial?.ton ?? null,
    statut: initial?.statut ?? "concept",
    notes: initial?.notes ?? "",
  };
}

export function IncarnationForm({
  mode,
  motifs,
  initial,
  onSubmit,
  onCancel,
  saving = false,
  error = null,
}: IncarnationFormProps) {
  const [values, setValues] = useState<IncarnationFormValues>(() => buildInitial(initial));
  const [newCollection, setNewCollection] = useState("");

  useEffect(() => {
    setValues(buildInitial(initial));
  }, [initial]);

  const update = <K extends keyof IncarnationFormValues>(
    key: K,
    value: IncarnationFormValues[K],
  ) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  };

  const updateSpec = <K extends keyof SpecBroderie>(key: K, value: SpecBroderie[K]) => {
    setValues((prev) => ({ ...prev, spec_broderie: { ...prev.spec_broderie, [key]: value } }));
  };

  const toggleGabarit = (code: string) => {
    setValues((prev) => ({
      ...prev,
      gabarits_cibles: prev.gabarits_cibles.includes(code)
        ? prev.gabarits_cibles.filter((g) => g !== code)
        : [...prev.gabarits_cibles, code],
    }));
  };

  const addCollection = (label: string) => {
    const v = label.trim().toLowerCase();
    if (!v) return;
    setValues((prev) =>
      prev.collections_cibles.includes(v)
        ? prev
        : { ...prev, collections_cibles: [...prev.collections_cibles, v] },
    );
    setNewCollection("");
  };

  const removeCollection = (slug: string) => {
    setValues((prev) => ({
      ...prev,
      collections_cibles: prev.collections_cibles.filter((c) => c !== slug),
    }));
  };

  const availableSuggestions = useMemo(
    () => COLLECTIONS_SUGGESTIONS.filter((s) => !values.collections_cibles.includes(s)),
    [values.collections_cibles],
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(values);
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {error && (
        <div
          style={{
            padding: 12,
            border: "1px solid #E2A8A2",
            borderRadius: 8,
            background: "#FAEBE8",
            color: "#7C2A24",
            fontFamily: "var(--font-sans)",
            fontSize: 13,
          }}
        >
          {error}
        </div>
      )}

      {/* Section 1 — Identité */}
      <Section title="Identité">
        <div style={gridTwo}>
          <Field label="Code (laisse vide pour auto-attribution)">
            <input
              type="text"
              value={values.code}
              onChange={(e) => update("code", e.target.value.toUpperCase())}
              placeholder="YPI-014"
              disabled={mode === "edit"}
              style={{ ...inputStyle, opacity: mode === "edit" ? 0.5 : 1 }}
            />
          </Field>
          <Field label="Nom commercial *">
            <input
              type="text"
              value={values.nom_commercial}
              onChange={(e) => update("nom_commercial", e.target.value)}
              placeholder="TONTON CLUB"
              required
              style={inputStyle}
            />
          </Field>
        </div>

        <Field label="Motif YPM *">
          <select
            value={values.motif_ypm}
            onChange={(e) => update("motif_ypm", e.target.value)}
            required
            style={inputStyle}
          >
            <option value="">— Choisir un motif —</option>
            {motifs.map((m) => (
              <option key={m.code} value={m.code}>
                {m.code} · {m.nom}{m.famille ? ` (${m.famille})` : ""}
              </option>
            ))}
          </select>
        </Field>

        <div style={gridTwo}>
          <Field label="Statut">
            <select
              value={values.statut}
              onChange={(e) => update("statut", e.target.value as IncarnationStatut)}
              style={inputStyle}
            >
              {STATUT_ORDER.map((s) => (
                <option key={s} value={s}>
                  {STATUT_LABELS[s]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Ton">
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              <button
                type="button"
                onClick={() => update("ton", null)}
                style={tonChip(values.ton === null)}
              >
                Aucun
              </button>
              {TON_ORDER.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => update("ton", t)}
                  style={tonChip(values.ton === t)}
                >
                  {TON_LABELS[t]}
                </button>
              ))}
            </div>
          </Field>
        </div>
      </Section>

      {/* Section 2 — Spec broderie */}
      <Section title="Spec broderie">
        <div style={gridTwo}>
          <Field label="Mot du haut">
            <input
              type="text"
              value={values.spec_broderie.mot_haut}
              onChange={(e) => updateSpec("mot_haut", e.target.value)}
              placeholder="MAMA"
              style={inputStyle}
            />
          </Field>
          <Field label="Mot du bas">
            <input
              type="text"
              value={values.spec_broderie.mot_bas}
              onChange={(e) => updateSpec("mot_bas", e.target.value)}
              placeholder="CLUB"
              style={inputStyle}
            />
          </Field>
        </div>

        <div style={gridTwo}>
          <Field label="Symbole">
            <select
              value={values.spec_broderie.symbole}
              onChange={(e) => updateSpec("symbole", e.target.value)}
              style={inputStyle}
            >
              {SYMBOLES_DISPONIBLES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Couleur fil par défaut">
            <input
              type="text"
              value={values.spec_broderie.couleur_fil_defaut}
              onChange={(e) => updateSpec("couleur_fil_defaut", e.target.value)}
              placeholder="Vert sapin"
              style={inputStyle}
            />
          </Field>
        </div>
      </Section>

      {/* Section 3 — Ciblage */}
      <Section title="Ciblage éditorial">
        <Field label="Gabarits cibles">
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {GABARITS_DISPONIBLES.map((g) => {
              const isSel = values.gabarits_cibles.includes(g.code);
              return (
                <button
                  key={g.code}
                  type="button"
                  onClick={() => toggleGabarit(g.code)}
                  style={{
                    padding: "6px 12px",
                    borderRadius: 8,
                    border: isSel
                      ? "1px solid var(--hub-foreground)"
                      : "0.5px solid var(--hub-border)",
                    background: isSel ? "var(--hub-foreground)" : "white",
                    color: isSel ? "var(--hub-bg)" : "var(--hub-foreground)",
                    fontFamily: "var(--font-sans)",
                    fontSize: 12,
                    cursor: "pointer",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-start",
                  }}
                >
                  <span style={{ fontWeight: 600 }}>{g.code}</span>
                  <span style={{ fontSize: 10, opacity: 0.7 }}>{g.label}</span>
                </button>
              );
            })}
          </div>
        </Field>

        <Field label="Collections cibles">
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 8 }}>
            {values.collections_cibles.length === 0 && (
              <span
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: 12,
                  color: "var(--hub-foreground)",
                  opacity: 0.5,
                }}
              >
                Aucune collection ciblée.
              </span>
            )}
            {values.collections_cibles.map((c) => (
              <span
                key={c}
                style={{
                  padding: "3px 4px 3px 10px",
                  borderRadius: 999,
                  background: "var(--hub-foreground)",
                  color: "var(--hub-bg)",
                  fontFamily: "var(--font-sans)",
                  fontSize: 11,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                {c}
                <button
                  type="button"
                  onClick={() => removeCollection(c)}
                  aria-label={`Retirer ${c}`}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "var(--hub-bg)",
                    cursor: "pointer",
                    padding: 2,
                    display: "inline-flex",
                    alignItems: "center",
                  }}
                >
                  <X size={12} />
                </button>
              </span>
            ))}
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <input
              type="text"
              value={newCollection}
              onChange={(e) => setNewCollection(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addCollection(newCollection);
                }
              }}
              placeholder="ex: pour-tonton"
              list="collections-suggestions"
              style={{ ...inputStyle, flex: 1 }}
            />
            <button
              type="button"
              onClick={() => addCollection(newCollection)}
              style={{
                background: "var(--hub-foreground)",
                color: "var(--hub-bg)",
                border: "none",
                borderRadius: 8,
                padding: "0 14px",
                fontFamily: "var(--font-sans)",
                fontSize: 12,
                fontWeight: 500,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              <Plus size={12} /> Ajouter
            </button>
            <datalist id="collections-suggestions">
              {availableSuggestions.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
          </div>
        </Field>
      </Section>

      {/* Section 4 — Notes */}
      <Section title="Notes">
        <textarea
          value={values.notes}
          onChange={(e) => update("notes", e.target.value)}
          placeholder="Briefs, contraintes, références, décisions DA…"
          rows={4}
          style={{ ...inputStyle, fontFamily: "var(--font-sans)", resize: "vertical" }}
        />
      </Section>

      {/* Footer */}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            style={{
              background: "transparent",
              border: "0.5px solid var(--hub-border)",
              borderRadius: 9999,
              padding: "10px 20px",
              fontFamily: "var(--font-sans)",
              fontSize: 12,
              color: "var(--hub-foreground)",
              cursor: "pointer",
            }}
          >
            Annuler
          </button>
        )}
        <button
          type="submit"
          disabled={saving}
          style={{
            background: "var(--color-brand-rose, #A76059)",
            color: "white",
            border: "none",
            borderRadius: 9999,
            padding: "10px 24px",
            fontFamily: "var(--font-sans)",
            fontSize: 13,
            fontWeight: 500,
            letterSpacing: "0.04em",
            cursor: saving ? "not-allowed" : "pointer",
            opacity: saving ? 0.6 : 1,
          }}
        >
          {saving ? "Enregistrement…" : mode === "create" ? "Créer l'incarnation" : "Enregistrer"}
        </button>
      </div>
    </form>
  );
}

const inputStyle: React.CSSProperties = {
  background: "var(--hub-bg)",
  border: "0.5px solid var(--hub-border)",
  borderRadius: 8,
  padding: "8px 12px",
  fontFamily: "var(--font-sans)",
  fontSize: 13,
  color: "var(--hub-foreground)",
  outline: "none",
  width: "100%",
};

const gridTwo: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 12,
};

function tonChip(selected: boolean): React.CSSProperties {
  return {
    padding: "5px 12px",
    borderRadius: 999,
    border: selected ? "1px solid var(--hub-foreground)" : "0.5px solid var(--hub-border)",
    background: selected ? "var(--hub-foreground)" : "white",
    color: selected ? "var(--hub-bg)" : "var(--hub-foreground)",
    fontFamily: "var(--font-sans)",
    fontSize: 11,
    cursor: "pointer",
  };
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section
      style={{
        background: "white",
        border: "0.5px solid var(--hub-border)",
        borderRadius: 12,
        padding: 20,
        display: "flex",
        flexDirection: "column",
        gap: 14,
      }}
    >
      <h3
        style={{
          fontFamily: "var(--font-sans)",
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          margin: 0,
          color: "var(--hub-foreground)",
          opacity: 0.7,
        }}
      >
        {title}
      </h3>
      {children}
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <span
        style={{
          fontFamily: "var(--font-sans)",
          fontSize: 10,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "var(--hub-foreground)",
          opacity: 0.6,
          fontWeight: 600,
        }}
      >
        {label}
      </span>
      {children}
    </label>
  );
}
