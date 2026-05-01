"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Sparkles, Loader2, AlertCircle, MapPin, Users, Camera as CameraIcon, Calendar, Lightbulb } from "lucide-react";
import type { ShootingPlanOutput } from "@/lib/atelier-da/shooting-plan-builder";

const MOTIFS_YPM = [
  { id: "YPM-001", nom: "La Brigitte" },
  { id: "YPM-002", nom: "L'Ambre" },
  { id: "YPM-003", nom: "Le Club" },
  { id: "YPM-004", nom: "Notre Héritage" },
  { id: "YPM-005", nom: "L'Annonce" },
  { id: "YPM-006", nom: "Le Câlin" },
  { id: "YPM-007", nom: "Le Chouchou" },
  { id: "YPM-008", nom: "La Féline" },
  { id: "YPM-009", nom: "La Palette" },
  { id: "YPM-010", nom: "La Ronde" },
  { id: "YPM-011", nom: "La Confidence" },
  { id: "YPM-012", nom: "La Meute" },
  { id: "YPM-013", nom: "Le Depuis" },
  { id: "YPM-014", nom: "La Tigresse" },
  { id: "YPM-015", nom: "La Déclaration" },
  { id: "YPM-016", nom: "La Signature" },
  { id: "YPM-017", nom: "La Florale" },
];

const AMBIANCES_PREFAITES = [
  { id: "studio_brut", label: "Studio Brut" },
  { id: "loft_organique", label: "Loft Organique" },
  { id: "aube_intime", label: "L'Aube Intime" },
  { id: "echappee_sauvage", label: "Échappée Sauvage" },
  { id: "lumiere_sepia", label: "Lumière Sépia" },
];

const FORMATS = [
  { value: "instagram", label: "Instagram (5 angles 4:5)" },
  { value: "pinterest", label: "Pinterest (3 angles 2:3)" },
  { value: "lookbook", label: "Lookbook (12-20 visuels)" },
  { value: "shooting", label: "Shooting full pack" },
  { value: "hero-banner", label: "Hero banner cinematic" },
];

export default function ShootingBookPage() {
  const [briefTexte, setBriefTexte] = useState("");
  const [motifId, setMotifId] = useState("");
  const [ambiances, setAmbiances] = useState<string[]>([]);
  const [format, setFormat] = useState<string>("instagram");
  const [generating, setGenerating] = useState(false);
  const [plan, setPlan] = useState<ShootingPlanOutput | null>(null);
  const [error, setError] = useState<string | null>(null);

  const motifNom = MOTIFS_YPM.find((m) => m.id === motifId)?.nom;

  const toggleAmbiance = (id: string) => {
    setAmbiances((prev) => (prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]));
  };

  const handleGenerate = async () => {
    if (!briefTexte.trim() || generating) return;
    setGenerating(true);
    setError(null);
    setPlan(null);
    try {
      const res = await fetch("/api/da/shooting-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          texte_libre: briefTexte.trim(),
          motif_ypm_id: motifId || undefined,
          motif_ypm_nom: motifNom,
          ambiances_preferees: ambiances,
          format_attendu: format,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Génération du plan échouée");
      setPlan(data.plan as ShootingPlanOutput);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div style={{ maxWidth: 1400, margin: "0 auto" }}>
      {/* Breadcrumb retour */}
      <Link
        href="/atelier-da"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          fontFamily: "var(--font-sans)",
          fontSize: 12,
          color: "var(--hub-foreground)",
          opacity: 0.6,
          textDecoration: "none",
          marginBottom: 24,
        }}
      >
        <ArrowLeft size={14} strokeWidth={1.6} /> Atelier DA
      </Link>

      <header style={{ marginBottom: 32 }}>
        <h1
          style={{
            fontFamily: "var(--font-editorial)",
            fontSize: 36,
            fontWeight: 500,
            letterSpacing: "-0.015em",
            color: "var(--hub-foreground)",
            lineHeight: 1.1,
            margin: 0,
            marginBottom: 8,
          }}
        >
          Shooting Book
        </h1>
        <p style={{ fontFamily: "var(--font-sans)", fontSize: 13, color: "var(--hub-foreground)", opacity: 0.65, maxWidth: 720 }}>
          Pose un brief poétique. Le système assemble casting, ambiances, shotlist et hooks temporels alignés
          sur les 23 canoniques + 19 dispositifs narratifs Ypersoa. Plan exploitable par atelier-shooting Gemini.
        </p>
      </header>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(380px, 420px) 1fr", gap: 32 }}>
        {/* COLONNE GAUCHE — Formulaire brief */}
        <aside
          style={{
            background: "white",
            border: "0.5px solid var(--hub-border)",
            borderRadius: 16,
            padding: 24,
            position: "sticky",
            top: 16,
            height: "fit-content",
          }}
        >
          <label
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "var(--hub-foreground)",
              opacity: 0.6,
              display: "block",
              marginBottom: 8,
            }}
          >
            Brief poétique
          </label>
          <textarea
            value={briefTexte}
            onChange={(e) => setBriefTexte(e.target.value)}
            placeholder="ex : Campagne Fête des Mères 2026, transmission grand-mère/petite-fille, ambiance L'Aube Intime, vacances en Bretagne"
            rows={4}
            maxLength={400}
            style={{
              width: "100%",
              padding: 12,
              borderRadius: 10,
              border: "1px solid var(--hub-border)",
              fontFamily: "var(--font-sans)",
              fontSize: 13,
              resize: "vertical",
              outline: "none",
              color: "var(--hub-foreground)",
              background: "var(--hub-bg)",
            }}
          />
          <div style={{ fontFamily: "var(--font-sans)", fontSize: 10, color: "var(--hub-foreground)", opacity: 0.5, textAlign: "right", marginTop: 4 }}>
            {briefTexte.length}/400
          </div>

          {/* Motif YPM */}
          <label
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "var(--hub-foreground)",
              opacity: 0.6,
              display: "block",
              marginTop: 16,
              marginBottom: 8,
            }}
          >
            Motif YPM (optionnel)
          </label>
          <select
            value={motifId}
            onChange={(e) => setMotifId(e.target.value)}
            style={{
              width: "100%",
              padding: 10,
              borderRadius: 10,
              border: "1px solid var(--hub-border)",
              fontFamily: "var(--font-sans)",
              fontSize: 13,
              outline: "none",
              background: "var(--hub-bg)",
              color: "var(--hub-foreground)",
            }}
          >
            <option value="">— Pas de motif spécifique —</option>
            {MOTIFS_YPM.map((m) => (
              <option key={m.id} value={m.id}>
                {m.id} · {m.nom}
              </option>
            ))}
          </select>

          {/* Ambiances préférées (multi-select chips) */}
          <label
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "var(--hub-foreground)",
              opacity: 0.6,
              display: "block",
              marginTop: 16,
              marginBottom: 8,
            }}
          >
            Ambiances préférées
          </label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {AMBIANCES_PREFAITES.map((a) => {
              const sel = ambiances.includes(a.id);
              return (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => toggleAmbiance(a.id)}
                  style={{
                    padding: "6px 10px",
                    borderRadius: 999,
                    border: sel ? "0.5px solid var(--hub-foreground)" : "0.5px solid var(--hub-border)",
                    background: sel ? "var(--hub-foreground)" : "white",
                    color: sel ? "var(--hub-bg)" : "var(--hub-foreground)",
                    fontFamily: "var(--font-sans)",
                    fontSize: 11,
                    cursor: "pointer",
                    transition: "all 150ms ease",
                  }}
                >
                  {a.label}
                </button>
              );
            })}
          </div>

          {/* Format attendu */}
          <label
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "var(--hub-foreground)",
              opacity: 0.6,
              display: "block",
              marginTop: 16,
              marginBottom: 8,
            }}
          >
            Format attendu
          </label>
          <select
            value={format}
            onChange={(e) => setFormat(e.target.value)}
            style={{
              width: "100%",
              padding: 10,
              borderRadius: 10,
              border: "1px solid var(--hub-border)",
              fontFamily: "var(--font-sans)",
              fontSize: 13,
              outline: "none",
              background: "var(--hub-bg)",
              color: "var(--hub-foreground)",
            }}
          >
            {FORMATS.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>

          {error && (
            <div
              style={{
                marginTop: 12,
                padding: 12,
                borderRadius: 10,
                background: "#fff3f0",
                border: "1px solid #ffcfb6",
                fontFamily: "var(--font-sans)",
                fontSize: 12,
                color: "#a13a16",
                display: "flex",
                gap: 8,
                alignItems: "flex-start",
              }}
            >
              <AlertCircle size={14} style={{ marginTop: 2, flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          <button
            type="button"
            onClick={handleGenerate}
            disabled={!briefTexte.trim() || generating}
            style={{
              width: "100%",
              marginTop: 20,
              padding: "12px 16px",
              borderRadius: 999,
              border: "none",
              background: "var(--hub-foreground)",
              color: "var(--hub-bg)",
              fontFamily: "var(--font-sans)",
              fontSize: 13,
              fontWeight: 500,
              letterSpacing: "0.05em",
              cursor: briefTexte.trim() && !generating ? "pointer" : "not-allowed",
              opacity: briefTexte.trim() && !generating ? 1 : 0.4,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
            }}
          >
            {generating ? (
              <>
                <Loader2 size={14} className="animate-spin" /> Construction du plan…
              </>
            ) : (
              <>
                <Sparkles size={14} /> Générer le plan
              </>
            )}
          </button>
        </aside>

        {/* COLONNE DROITE — Résultat plan */}
        <main>
          {!plan && !generating && (
            <div
              style={{
                background: "var(--hub-bg)",
                border: "1px dashed var(--hub-border)",
                borderRadius: 16,
                padding: 60,
                textAlign: "center",
                fontFamily: "var(--font-sans)",
                fontSize: 13,
                color: "var(--hub-foreground)",
                opacity: 0.5,
              }}
            >
              <Sparkles size={32} strokeWidth={1.2} style={{ opacity: 0.4, marginBottom: 16 }} />
              <p style={{ margin: 0 }}>
                Pose un brief à gauche puis génère le plan.<br />
                Le système matchera ton brief contre les <strong>19 dispositifs narratifs</strong> et <strong>23 canoniques</strong> Ypersoa.
              </p>
            </div>
          )}

          {generating && (
            <div
              style={{
                padding: 60,
                textAlign: "center",
                fontFamily: "var(--font-sans)",
                fontSize: 13,
                color: "var(--hub-foreground)",
                opacity: 0.6,
              }}
            >
              <Loader2 size={32} className="animate-spin" strokeWidth={1.4} style={{ marginBottom: 16 }} />
              <p style={{ margin: 0 }}>Construction du plan…</p>
            </div>
          )}

          {plan && (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              {/* Résumé */}
              <section
                style={{
                  background: "white",
                  border: "0.5px solid var(--hub-border)",
                  borderRadius: 16,
                  padding: 24,
                }}
              >
                <h2
                  style={{
                    fontFamily: "var(--font-editorial)",
                    fontSize: 24,
                    fontWeight: 500,
                    margin: 0,
                    marginBottom: 8,
                    color: "var(--hub-foreground)",
                  }}
                >
                  Résumé du plan
                </h2>
                <p style={{ fontFamily: "var(--font-sans)", fontSize: 13, color: "var(--hub-foreground)", opacity: 0.75, lineHeight: 1.5, margin: 0 }}>
                  {plan.brief_resume}
                </p>
                <div style={{ display: "flex", gap: 16, marginTop: 16, flexWrap: "wrap" }}>
                  {plan.occasion_detectee && (
                    <span
                      style={{
                        fontFamily: "var(--font-sans)",
                        fontSize: 11,
                        padding: "4px 10px",
                        background: "var(--hub-foreground)",
                        color: "var(--hub-bg)",
                        borderRadius: 999,
                        textTransform: "uppercase",
                        letterSpacing: "0.08em",
                      }}
                    >
                      {plan.occasion_detectee}
                    </span>
                  )}
                  {plan.motif_ypm?.id && (
                    <span
                      style={{
                        fontFamily: "var(--font-sans)",
                        fontSize: 11,
                        padding: "4px 10px",
                        background: "var(--hub-bg)",
                        color: "var(--hub-foreground)",
                        border: "0.5px solid var(--hub-border)",
                        borderRadius: 999,
                      }}
                    >
                      {plan.motif_ypm.id} · {plan.motif_ypm.nom}
                    </span>
                  )}
                </div>
              </section>

              {/* Casting proposé */}
              <section
                style={{
                  background: "white",
                  border: "0.5px solid var(--hub-border)",
                  borderRadius: 16,
                  padding: 24,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                  <Users size={18} strokeWidth={1.6} />
                  <h3 style={{ fontFamily: "var(--font-editorial)", fontSize: 18, fontWeight: 500, margin: 0 }}>
                    Casting proposé ({plan.casting_propose.length})
                  </h3>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {plan.casting_propose.map((c) => (
                    <div
                      key={c.id}
                      style={{
                        padding: 14,
                        borderRadius: 10,
                        background: "var(--hub-bg)",
                        border: "0.5px solid var(--hub-border)",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
                            <span style={{ fontFamily: "var(--font-editorial)", fontSize: 16, fontWeight: 500 }}>
                              {c.prenoms.join(" + ")}
                            </span>
                            <span
                              style={{
                                fontFamily: "var(--font-sans)",
                                fontSize: 9,
                                padding: "2px 8px",
                                background: "var(--hub-foreground)",
                                color: "var(--hub-bg)",
                                borderRadius: 999,
                                textTransform: "uppercase",
                                letterSpacing: "0.1em",
                              }}
                            >
                              {c.type}
                            </span>
                          </div>
                          <div style={{ fontFamily: "var(--font-sans)", fontSize: 11, opacity: 0.6, marginBottom: 4 }}>
                            <code>{c.id}</code>
                          </div>
                          <p style={{ fontFamily: "var(--font-sans)", fontSize: 12, opacity: 0.75, margin: 0, lineHeight: 1.5 }}>
                            {c.raison}
                          </p>
                          {c.lieu && (
                            <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 6, fontFamily: "var(--font-sans)", fontSize: 11, opacity: 0.6 }}>
                              <MapPin size={11} /> {c.lieu}
                            </div>
                          )}
                        </div>
                        <span
                          style={{
                            fontFamily: "var(--font-sans)",
                            fontSize: 11,
                            fontWeight: 600,
                            padding: "4px 10px",
                            background: "white",
                            border: "0.5px solid var(--hub-border)",
                            borderRadius: 999,
                            flexShrink: 0,
                          }}
                        >
                          {c.score} pts
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* Shotlist */}
              <section
                style={{
                  background: "white",
                  border: "0.5px solid var(--hub-border)",
                  borderRadius: 16,
                  padding: 24,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                  <CameraIcon size={18} strokeWidth={1.6} />
                  <h3 style={{ fontFamily: "var(--font-editorial)", fontSize: 18, fontWeight: 500, margin: 0 }}>
                    Shotlist ({plan.shotlist.length} angles)
                  </h3>
                </div>
                <ol style={{ paddingLeft: 24, margin: 0, display: "flex", flexDirection: "column", gap: 12 }}>
                  {plan.shotlist.map((s) => (
                    <li key={s.ordre} style={{ fontFamily: "var(--font-sans)", fontSize: 13, lineHeight: 1.5 }}>
                      <strong style={{ fontFamily: "var(--font-editorial)", fontSize: 14 }}>{s.angle}</strong>
                      <p style={{ margin: "4px 0", opacity: 0.75 }}>{s.description}</p>
                      <div style={{ fontSize: 11, opacity: 0.5, fontStyle: "italic" }}>{s.cadrage_type}</div>
                    </li>
                  ))}
                </ol>
              </section>

              {/* Ambiances + planning */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <section
                  style={{
                    background: "white",
                    border: "0.5px solid var(--hub-border)",
                    borderRadius: 16,
                    padding: 20,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                    <Lightbulb size={16} strokeWidth={1.6} />
                    <h3 style={{ fontFamily: "var(--font-editorial)", fontSize: 16, fontWeight: 500, margin: 0 }}>
                      Ambiances recommandées
                    </h3>
                  </div>
                  {plan.ambiances_recommandees.length > 0 ? (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {plan.ambiances_recommandees.map((a) => (
                        <span
                          key={a}
                          style={{
                            fontFamily: "var(--font-sans)",
                            fontSize: 11,
                            padding: "4px 10px",
                            background: "var(--hub-bg)",
                            border: "0.5px solid var(--hub-border)",
                            borderRadius: 999,
                          }}
                        >
                          {a}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p style={{ fontFamily: "var(--font-sans)", fontSize: 12, opacity: 0.6, margin: 0 }}>
                      Aucune préférence forte détectée
                    </p>
                  )}
                </section>

                <section
                  style={{
                    background: "white",
                    border: "0.5px solid var(--hub-border)",
                    borderRadius: 16,
                    padding: 20,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                    <Calendar size={16} strokeWidth={1.6} />
                    <h3 style={{ fontFamily: "var(--font-editorial)", fontSize: 16, fontWeight: 500, margin: 0 }}>
                      Planning estimé
                    </h3>
                  </div>
                  <p style={{ fontFamily: "var(--font-sans)", fontSize: 13, opacity: 0.75, margin: 0, lineHeight: 1.5 }}>
                    {plan.planning_estime}
                  </p>
                </section>
              </div>

              {/* Hooks temporels */}
              {plan.hooks_temporels.length > 0 && (
                <section
                  style={{
                    background: "white",
                    border: "0.5px solid var(--hub-border)",
                    borderRadius: 16,
                    padding: 24,
                  }}
                >
                  <h3 style={{ fontFamily: "var(--font-editorial)", fontSize: 18, fontWeight: 500, margin: 0, marginBottom: 12 }}>
                    Hooks temporels ({plan.hooks_temporels.length})
                  </h3>
                  <ul style={{ paddingLeft: 20, margin: 0, fontFamily: "var(--font-sans)", fontSize: 13, opacity: 0.75 }}>
                    {plan.hooks_temporels.slice(0, 8).map((h, i) => (
                      <li key={i} style={{ marginBottom: 4 }}>
                        <code style={{ fontSize: 11, marginRight: 8 }}>{h.date_iso}</code> {h.evenement}
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {/* Warnings */}
              {plan.warnings.length > 0 && (
                <section
                  style={{
                    background: "#fff8f0",
                    border: "0.5px solid #f0c896",
                    borderRadius: 16,
                    padding: 20,
                  }}
                >
                  <h3 style={{ fontFamily: "var(--font-editorial)", fontSize: 16, fontWeight: 500, margin: 0, marginBottom: 8, color: "#7a5210" }}>
                    Warnings
                  </h3>
                  <ul style={{ paddingLeft: 20, margin: 0, fontFamily: "var(--font-sans)", fontSize: 12, color: "#7a5210" }}>
                    {plan.warnings.map((w, i) => (
                      <li key={i} style={{ marginBottom: 4 }}>
                        <strong>[{w.type}]</strong> {w.message}
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {/* Meta technique */}
              <p style={{ fontFamily: "var(--font-sans)", fontSize: 10, opacity: 0.4, textAlign: "right" }}>
                Plan généré en {plan.meta.duration_ms}ms · {plan.meta.nb_dispositifs_examines} dispositifs · {plan.meta.nb_canoniques_examines} canoniques
              </p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
