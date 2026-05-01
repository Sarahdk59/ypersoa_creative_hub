"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Sparkles, Loader2, AlertCircle, MapPin, Users, Camera as CameraIcon, Calendar, Lightbulb, Heart, Image as ImageIcon, Download, Upload, X, CheckCircle2 } from "lucide-react";
import type { ShootingPlanOutput } from "@/lib/atelier-da/shooting-plan-builder";
import { listActiveLookbookAmbiances, type ActiveLookbookAmbiance } from "@/lib/active-ambiances";

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
  const [lookbookAmbianceIds, setLookbookAmbianceIds] = useState<string[]>([]);
  const [format, setFormat] = useState<string>("instagram");
  const [generating, setGenerating] = useState(false);
  const [plan, setPlan] = useState<ShootingPlanOutput | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeLookbookAmbiances, setActiveLookbookAmbiances] = useState<ActiveLookbookAmbiance[]>([]);

  // PNG motif optionnel (référence broderie pour Gemini)
  const [motifPngDataUrl, setMotifPngDataUrl] = useState<string | null>(null);
  const [motifPngFilename, setMotifPngFilename] = useState<string | null>(null);
  const [motifSize, setMotifSize] = useState<"petit" | "moyen" | "grand">("moyen");

  // Sélection manuelle d'un dispositif casting (radio-like, default top 1)
  const [selectedDispositifId, setSelectedDispositifId] = useState<string | null>(null);

  // Image hero (legacy — premier shot)
  const [renderedImage, setRenderedImage] = useState<{ data_url: string; aspect_ratio: string } | null>(null);
  const [renderingImage, setRenderingImage] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);

  // Images par shot (shotlist) — index → image
  const [shotImages, setShotImages] = useState<Record<number, { data_url: string; aspect_ratio: string }>>({});
  const [renderingShotIndex, setRenderingShotIndex] = useState<number | null>(null);
  const [shotErrors, setShotErrors] = useState<Record<number, string>>({});

  useEffect(() => {
    listActiveLookbookAmbiances().then(setActiveLookbookAmbiances).catch(() => undefined);
  }, []);

  const motifNom = MOTIFS_YPM.find((m) => m.id === motifId)?.nom;

  const toggleAmbiance = (id: string) => {
    setAmbiances((prev) => (prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]));
  };

  const toggleLookbookAmbiance = (id: string) => {
    setLookbookAmbianceIds((prev) => (prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]));
  };

  const handleMotifPngUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError("Image trop lourde (max 5 Mo)");
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      setMotifPngDataUrl(reader.result as string);
      setMotifPngFilename(file.name);
    };
    reader.readAsDataURL(file);
  };

  const clearMotifPng = () => {
    setMotifPngDataUrl(null);
    setMotifPngFilename(null);
  };

  const handleGenerate = async () => {
    if (!briefTexte.trim() || generating) return;
    setGenerating(true);
    setError(null);
    setPlan(null);
    setRenderedImage(null);
    setImageError(null);
    try {
      const res = await fetch("/api/da/shooting-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          texte_libre: briefTexte.trim(),
          motif_ypm_id: motifId || undefined,
          motif_ypm_nom: motifNom,
          ambiances_preferees: ambiances,
          ambiances_lookbook_ids: lookbookAmbianceIds,
          format_attendu: format,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Génération du plan échouée");
      const newPlan = data.plan as ShootingPlanOutput;
      setPlan(newPlan);
      // Reset les images shot et hero (nouveau plan)
      setShotImages({});
      setShotErrors({});
      // Auto-sélection du top 1 dispositif (Sarah peut écraser ensuite)
      setSelectedDispositifId(newPlan.casting_propose[0]?.id || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setGenerating(false);
    }
  };

  const handleRenderImage = async () => {
    if (!plan || renderingImage) return;
    setRenderingImage(true);
    setImageError(null);
    setRenderedImage(null);
    try {
      const res = await fetch("/api/da/shooting-plan/render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan,
          lookbook_ambiance_ids: lookbookAmbianceIds,
          selected_dispositif_id: selectedDispositifId,
          motif_png_data_url: motifPngDataUrl,
          motif_size: motifSize,
          shot_index: 0,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Génération d'image échouée");
      setRenderedImage(data.image);
    } catch (err) {
      setImageError(err instanceof Error ? err.message : String(err));
    } finally {
      setRenderingImage(false);
    }
  };

  const handleRenderShot = async (shotIndex: number) => {
    if (!plan || renderingShotIndex !== null) return;
    setRenderingShotIndex(shotIndex);
    setShotErrors((prev) => {
      const next = { ...prev };
      delete next[shotIndex];
      return next;
    });
    try {
      const res = await fetch("/api/da/shooting-plan/render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan,
          lookbook_ambiance_ids: lookbookAmbianceIds,
          selected_dispositif_id: selectedDispositifId,
          motif_png_data_url: motifPngDataUrl,
          motif_size: motifSize,
          shot_index: shotIndex,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Génération échouée");
      setShotImages((prev) => ({ ...prev, [shotIndex]: data.image }));
    } catch (err) {
      setShotErrors((prev) => ({ ...prev, [shotIndex]: err instanceof Error ? err.message : String(err) }));
    } finally {
      setRenderingShotIndex(null);
    }
  };

  const handleDownloadImage = () => {
    if (!renderedImage) return;
    const slug = (plan?.brief_resume || "ypersoa-hero").slice(0, 40).replace(/[^a-z0-9]+/gi, "-").toLowerCase();
    const a = document.createElement("a");
    a.href = renderedImage.data_url;
    a.download = `ypersoa-shooting-book-${slug}-${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleDownloadShot = (shotIndex: number) => {
    const img = shotImages[shotIndex];
    if (!img || !plan) return;
    const angle = plan.shotlist[shotIndex]?.angle || `shot-${shotIndex + 1}`;
    const slug = (plan.brief_resume || "ypersoa").slice(0, 30).replace(/[^a-z0-9]+/gi, "-").toLowerCase();
    const a = document.createElement("a");
    a.href = img.data_url;
    a.download = `ypersoa-${slug}-${angle.toLowerCase()}-${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
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

          {/* Upload PNG du motif (référence broderie pour Gemini) */}
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
              marginTop: 12,
              marginBottom: 8,
            }}
          >
            PNG du motif (optionnel)
          </label>
          {!motifPngDataUrl ? (
            <label
              htmlFor="motif-png-upload"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                padding: "14px 12px",
                borderRadius: 10,
                border: "1px dashed var(--hub-border)",
                background: "var(--hub-bg)",
                fontFamily: "var(--font-sans)",
                fontSize: 12,
                color: "var(--hub-foreground)",
                opacity: 0.7,
                cursor: "pointer",
              }}
            >
              <Upload size={14} strokeWidth={1.5} />
              Glisser ou cliquer (PNG/JPG max 5 Mo)
              <input
                id="motif-png-upload"
                type="file"
                accept="image/png,image/jpeg"
                onChange={handleMotifPngUpload}
                style={{ display: "none" }}
              />
            </label>
          ) : (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: 8,
                borderRadius: 10,
                border: "0.5px solid var(--hub-border)",
                background: "white",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={motifPngDataUrl}
                alt="Motif"
                style={{ width: 56, height: 56, objectFit: "contain", borderRadius: 6, background: "var(--hub-bg)", padding: 4 }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontFamily: "var(--font-sans)",
                    fontSize: 12,
                    fontWeight: 500,
                    color: "var(--hub-foreground)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {motifPngFilename || "motif.png"}
                </div>
                <div style={{ fontFamily: "var(--font-sans)", fontSize: 10, color: "var(--hub-foreground)", opacity: 0.6 }}>
                  Référence broderie injectée Gemini
                </div>
              </div>
              <button
                type="button"
                onClick={clearMotifPng}
                style={{
                  width: 28,
                  height: 28,
                  border: "none",
                  background: "transparent",
                  borderRadius: 999,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--hub-foreground)",
                  opacity: 0.5,
                }}
                aria-label="Retirer le motif"
              >
                <X size={14} />
              </button>
            </div>
          )}

          {/* Taille du motif */}
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
            Taille du motif brodé
          </label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 4, padding: 4, background: "var(--hub-bg)", borderRadius: 10, border: "0.5px solid var(--hub-border)" }}>
            {([
              { v: "petit", label: "Petit", sub: "2-4cm" },
              { v: "moyen", label: "Moyen", sub: "6-8cm" },
              { v: "grand", label: "Grand", sub: "12-20cm" },
            ] as const).map((s) => {
              const active = motifSize === s.v;
              return (
                <button
                  key={s.v}
                  type="button"
                  onClick={() => setMotifSize(s.v)}
                  style={{
                    padding: "8px 6px",
                    border: "none",
                    background: active ? "var(--hub-foreground)" : "transparent",
                    color: active ? "var(--hub-bg)" : "var(--hub-foreground)",
                    borderRadius: 6,
                    fontFamily: "var(--font-sans)",
                    fontSize: 11,
                    fontWeight: 500,
                    cursor: "pointer",
                    transition: "all 150ms ease",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 2,
                  }}
                >
                  <span style={{ fontWeight: 600 }}>{s.label}</span>
                  <span style={{ fontSize: 9, opacity: 0.7 }}>{s.sub}</span>
                </button>
              );
            })}
          </div>

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

          {/* Mes lookbooks ❤️ actifs */}
          {activeLookbookAmbiances.length > 0 && (
            <>
              <label
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: "var(--hub-foreground)",
                  opacity: 0.6,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  marginTop: 16,
                  marginBottom: 8,
                }}
              >
                <Heart size={11} fill="#E2627C" stroke="#E2627C" /> Mes lookbooks (7j)
              </label>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {activeLookbookAmbiances.map((lb) => {
                  const sel = lookbookAmbianceIds.includes(lb.id);
                  const expires = lb.date_archivage
                    ? new Date(lb.date_archivage).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })
                    : null;
                  return (
                    <button
                      key={lb.id}
                      type="button"
                      onClick={() => toggleLookbookAmbiance(lb.id)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        padding: 6,
                        borderRadius: 10,
                        border: sel ? "0.5px solid var(--hub-foreground)" : "0.5px solid var(--hub-border)",
                        background: sel ? "var(--hub-bg)" : "white",
                        cursor: "pointer",
                        textAlign: "left",
                      }}
                    >
                      {lb.cover_image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={lb.cover_image_url}
                          alt={lb.titre}
                          style={{ width: 36, height: 42, objectFit: "cover", borderRadius: 6, flexShrink: 0 }}
                        />
                      ) : (
                        <div style={{ width: 36, height: 42, background: "var(--hub-bg)", borderRadius: 6, flexShrink: 0 }} />
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontFamily: "var(--font-editorial)",
                            fontSize: 13,
                            fontWeight: 500,
                            color: "var(--hub-foreground)",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {lb.titre}
                        </div>
                        <div
                          style={{
                            fontFamily: "var(--font-sans)",
                            fontSize: 10,
                            color: "var(--hub-foreground)",
                            opacity: 0.5,
                          }}
                        >
                          {expires ? `actif jusqu'au ${expires}` : "actif"}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </>
          )}

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
              {/* Image hero rendue */}
              <section
                style={{
                  background: "white",
                  border: "0.5px solid var(--hub-border)",
                  borderRadius: 16,
                  padding: 24,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, gap: 12, flexWrap: "wrap" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <ImageIcon size={18} strokeWidth={1.6} />
                    <h3 style={{ fontFamily: "var(--font-editorial)", fontSize: 18, fontWeight: 500, margin: 0 }}>
                      Image hero du plan
                    </h3>
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {!renderedImage && (
                      <button
                        type="button"
                        onClick={handleRenderImage}
                        disabled={renderingImage}
                        style={{
                          padding: "8px 14px",
                          borderRadius: 999,
                          border: "none",
                          background: "var(--hub-foreground)",
                          color: "var(--hub-bg)",
                          fontFamily: "var(--font-sans)",
                          fontSize: 12,
                          fontWeight: 500,
                          letterSpacing: "0.05em",
                          cursor: renderingImage ? "wait" : "pointer",
                          opacity: renderingImage ? 0.5 : 1,
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                        }}
                      >
                        {renderingImage ? (
                          <>
                            <Loader2 size={12} className="animate-spin" /> Génération…
                          </>
                        ) : (
                          <>
                            <Sparkles size={12} /> Générer l&apos;image hero
                          </>
                        )}
                      </button>
                    )}
                    {renderedImage && (
                      <>
                        <button
                          type="button"
                          onClick={handleRenderImage}
                          disabled={renderingImage}
                          style={{
                            padding: "8px 14px",
                            borderRadius: 999,
                            border: "0.5px solid var(--hub-border)",
                            background: "white",
                            color: "var(--hub-foreground)",
                            fontFamily: "var(--font-sans)",
                            fontSize: 12,
                            cursor: renderingImage ? "wait" : "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                          }}
                        >
                          {renderingImage ? (
                            <>
                              <Loader2 size={12} className="animate-spin" /> Régénérer…
                            </>
                          ) : (
                            <>
                              <Sparkles size={12} /> Régénérer
                            </>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={handleDownloadImage}
                          style={{
                            padding: "8px 14px",
                            borderRadius: 999,
                            border: "none",
                            background: "var(--hub-foreground)",
                            color: "var(--hub-bg)",
                            fontFamily: "var(--font-sans)",
                            fontSize: 12,
                            fontWeight: 500,
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                          }}
                        >
                          <Download size={12} /> Télécharger PNG
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {imageError && (
                  <div
                    style={{
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
                    <span>{imageError}</span>
                  </div>
                )}

                {!renderedImage && !renderingImage && !imageError && (
                  <div
                    style={{
                      padding: 40,
                      textAlign: "center",
                      background: "var(--hub-bg)",
                      borderRadius: 12,
                      border: "1px dashed var(--hub-border)",
                      fontFamily: "var(--font-sans)",
                      fontSize: 12,
                      color: "var(--hub-foreground)",
                      opacity: 0.55,
                    }}
                  >
                    Clique sur <strong>Générer l&apos;image hero</strong> pour produire un visuel Gemini 2K basé sur le top dispositif casting + l&apos;ambiance + le motif YPM.
                    <br />
                    <span style={{ fontSize: 11 }}>~30-60 sec selon la charge Gemini.</span>
                  </div>
                )}

                {renderingImage && !renderedImage && (
                  <div
                    style={{
                      padding: 40,
                      textAlign: "center",
                      fontFamily: "var(--font-sans)",
                      fontSize: 12,
                      color: "var(--hub-foreground)",
                      opacity: 0.65,
                    }}
                  >
                    <Loader2 size={28} className="animate-spin" strokeWidth={1.4} style={{ marginBottom: 12 }} />
                    <p style={{ margin: 0 }}>Gemini génère l&apos;image…</p>
                  </div>
                )}

                {renderedImage && (
                  <div style={{ display: "flex", justifyContent: "center" }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={renderedImage.data_url}
                      alt="Hero shot du plan"
                      style={{
                        maxWidth: "100%",
                        maxHeight: 720,
                        borderRadius: 12,
                        boxShadow: "0 8px 24px rgba(30,45,74,0.08)",
                      }}
                    />
                  </div>
                )}
              </section>

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
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <Users size={18} strokeWidth={1.6} />
                  <h3 style={{ fontFamily: "var(--font-editorial)", fontSize: 18, fontWeight: 500, margin: 0 }}>
                    Casting proposé ({plan.casting_propose.length})
                  </h3>
                </div>
                <p style={{ fontFamily: "var(--font-sans)", fontSize: 11, color: "var(--hub-foreground)", opacity: 0.55, margin: "0 0 16px 0" }}>
                  Clique sur un dispositif pour le sélectionner — le rendu image hero utilisera le casting choisi.
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {plan.casting_propose.map((c) => {
                    const isSelected = selectedDispositifId === c.id;
                    return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setSelectedDispositifId(c.id)}
                      style={{
                        textAlign: "left",
                        padding: 14,
                        borderRadius: 10,
                        background: isSelected ? "white" : "var(--hub-bg)",
                        border: isSelected ? "1.5px solid var(--hub-foreground)" : "0.5px solid var(--hub-border)",
                        boxShadow: isSelected ? "0 2px 8px rgba(30,45,74,0.08)" : "none",
                        cursor: "pointer",
                        transition: "all 150ms ease",
                        position: "relative",
                      }}
                    >
                      {isSelected && (
                        <CheckCircle2
                          size={16}
                          fill="var(--hub-foreground)"
                          stroke="var(--hub-bg)"
                          style={{ position: "absolute", top: 12, right: 12 }}
                        />
                      )}
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
                            background: isSelected ? "var(--hub-bg)" : "white",
                            border: "0.5px solid var(--hub-border)",
                            borderRadius: 999,
                            flexShrink: 0,
                            marginRight: isSelected ? 24 : 0,
                          }}
                        >
                          {c.score} pts
                        </span>
                      </div>
                    </button>
                  );
                  })}
                </div>
              </section>

              {/* Shotlist enrichie : chaque shot a son bouton de génération + image individuelle */}
              <section
                style={{
                  background: "white",
                  border: "0.5px solid var(--hub-border)",
                  borderRadius: 16,
                  padding: 24,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <CameraIcon size={18} strokeWidth={1.6} />
                  <h3 style={{ fontFamily: "var(--font-editorial)", fontSize: 18, fontWeight: 500, margin: 0 }}>
                    Shotlist ({plan.shotlist.length} angles)
                  </h3>
                </div>
                <p style={{ fontFamily: "var(--font-sans)", fontSize: 11, color: "var(--hub-foreground)", opacity: 0.55, margin: "0 0 16px 0" }}>
                  Génère chaque angle individuellement. Le casting et l&apos;ambiance sélectionnés s&apos;appliquent à toute la shotlist.
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  {plan.shotlist.map((s, idx) => {
                    const img = shotImages[idx];
                    const err = shotErrors[idx];
                    const isRendering = renderingShotIndex === idx;
                    const someoneElseRendering = renderingShotIndex !== null && renderingShotIndex !== idx;
                    return (
                      <div
                        key={s.ordre}
                        style={{
                          padding: 16,
                          borderRadius: 12,
                          background: "var(--hub-bg)",
                          border: "0.5px solid var(--hub-border)",
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 8 }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4 }}>
                              <span
                                style={{
                                  fontFamily: "var(--font-sans)",
                                  fontSize: 11,
                                  fontWeight: 600,
                                  padding: "2px 8px",
                                  background: "var(--hub-foreground)",
                                  color: "var(--hub-bg)",
                                  borderRadius: 999,
                                  letterSpacing: "0.1em",
                                }}
                              >
                                #{s.ordre}
                              </span>
                              <strong style={{ fontFamily: "var(--font-editorial)", fontSize: 16, fontWeight: 500 }}>
                                {s.angle}
                              </strong>
                            </div>
                            <p style={{ fontFamily: "var(--font-sans)", fontSize: 12, opacity: 0.75, margin: "4px 0", lineHeight: 1.5 }}>
                              {s.description}
                            </p>
                            <div style={{ fontFamily: "var(--font-sans)", fontSize: 11, opacity: 0.5, fontStyle: "italic" }}>
                              {s.cadrage_type}
                            </div>
                          </div>
                          <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                            <button
                              type="button"
                              onClick={() => handleRenderShot(idx)}
                              disabled={isRendering || someoneElseRendering}
                              style={{
                                padding: "6px 12px",
                                borderRadius: 999,
                                border: img ? "0.5px solid var(--hub-border)" : "none",
                                background: img ? "white" : "var(--hub-foreground)",
                                color: img ? "var(--hub-foreground)" : "var(--hub-bg)",
                                fontFamily: "var(--font-sans)",
                                fontSize: 11,
                                fontWeight: 500,
                                cursor: isRendering || someoneElseRendering ? "wait" : "pointer",
                                opacity: someoneElseRendering ? 0.4 : 1,
                                display: "flex",
                                alignItems: "center",
                                gap: 4,
                                whiteSpace: "nowrap",
                              }}
                            >
                              {isRendering ? (
                                <>
                                  <Loader2 size={11} className="animate-spin" /> Gen…
                                </>
                              ) : img ? (
                                <>
                                  <Sparkles size={11} /> Régénérer
                                </>
                              ) : (
                                <>
                                  <Sparkles size={11} /> Générer
                                </>
                              )}
                            </button>
                            {img && (
                              <button
                                type="button"
                                onClick={() => handleDownloadShot(idx)}
                                style={{
                                  padding: "6px 12px",
                                  borderRadius: 999,
                                  border: "none",
                                  background: "var(--hub-foreground)",
                                  color: "var(--hub-bg)",
                                  fontFamily: "var(--font-sans)",
                                  fontSize: 11,
                                  fontWeight: 500,
                                  cursor: "pointer",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 4,
                                }}
                              >
                                <Download size={11} /> PNG
                              </button>
                            )}
                          </div>
                        </div>

                        {err && (
                          <div
                            style={{
                              marginTop: 8,
                              padding: 8,
                              borderRadius: 8,
                              background: "#fff3f0",
                              border: "1px solid #ffcfb6",
                              fontFamily: "var(--font-sans)",
                              fontSize: 11,
                              color: "#a13a16",
                              display: "flex",
                              gap: 6,
                              alignItems: "flex-start",
                            }}
                          >
                            <AlertCircle size={11} style={{ marginTop: 1, flexShrink: 0 }} /> {err}
                          </div>
                        )}

                        {isRendering && !img && (
                          <div
                            style={{
                              marginTop: 12,
                              padding: 24,
                              textAlign: "center",
                              fontFamily: "var(--font-sans)",
                              fontSize: 11,
                              color: "var(--hub-foreground)",
                              opacity: 0.55,
                              borderRadius: 8,
                              background: "white",
                            }}
                          >
                            <Loader2 size={20} className="animate-spin" strokeWidth={1.4} />
                          </div>
                        )}

                        {img && (
                          <div style={{ marginTop: 12, display: "flex", justifyContent: "center" }}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={img.data_url}
                              alt={s.angle}
                              style={{
                                maxWidth: "100%",
                                maxHeight: 480,
                                borderRadius: 10,
                                boxShadow: "0 4px 16px rgba(30,45,74,0.08)",
                              }}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
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
