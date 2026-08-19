"use client";

import { useEffect, useRef, useState, use } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
  Sparkles,
  FileText,
  Download,
  Edit3,
  Check,
  X,
  Trash2,
  ImageIcon,
} from "lucide-react";
import type { StudioMoodEpisode, StatutEpisode, GeneratedCopy, Storyboard } from "@/lib/studio-mood/types";
import { STATUT_META, SUPPORT_LABELS } from "@/lib/studio-mood/types";
import { CANONIQUES } from "@/lib/canoniques";
import {
  FORMATS,
  BG_PRESETS,
  LABEL_COLORS,
  drawCollage,
  loadImageFromSvg,
  recolorLogoSvg,
  pickContrastingBg,
} from "@/lib/studio-mood/collage-render";
import type { MotifYpm } from "@/lib/atelier-da/referentiels-loader";
import type { HubProduit } from "@/lib/hub-products";

const STATUT_ORDER: StatutEpisode[] = ["brouillon", "ready", "tourne", "monte", "publie"];

type AspectRatio = "9:16" | "1:1" | "3:4";
type Composition = "flatlay" | "worn" | "cutout";

// Défauts de collage pilotés par les données de l'épisode — humeur → fond,
// occasion → props. Point de départ raisonnable, pas une vérité figée : le
// résultat reste un PNG normal, régénérable en changeant l'humeur/l'occasion.
const HUMEUR_BG_ID: Record<string, string> = {
  Tendresse: "rose",
  Fierté: "corail",
  Complicité: "lavande",
  "Joyeux bordel": "rouge",
  "Nostalgie douce": "lavande",
  Surprise: "teal",
  "Quotidien magique": "creme",
  Espièglerie: "olive",
  "Amour assumé": "rouge",
  "Retour en forme": "olive",
  "Tendresse senior": "rose",
  "Fête et surprise": "rouge",
};

const OCCASION_PROPS: Record<string, string[]> = {
  "Fête des Mères": ["heart", "flower"],
  "Fête des Pères": ["coffee", "star"],
  "Fête des Grands-mères": ["flower", "heart"],
  Noël: ["star", "sparkle"],
  "Saint-Valentin": ["heart", "sparkle"],
  Naissance: ["heart", "star"],
  Mariage: ["heart", "sparkle"],
  Anniversaire: ["star", "sparkle"],
  Rentrée: ["scissors", "thread"],
  "Été / Vacances": ["lemon", "sparkle"],
  Evergreen: ["sparkle", "star"],
};

function pickCollageDefaults(ep: StudioMoodEpisode, garmentHex?: string | null) {
  const bgId = HUMEUR_BG_ID[ep.humeur] ?? "teal";
  const preferred = BG_PRESETS.find((b) => b.id === bgId) ?? BG_PRESETS[3];
  // Le fond ne doit jamais avoir une couleur trop proche du vêtement porté
  // (silhouette qui se fond dans le fond) — bascule sur la meilleure alternative si besoin,
  // en gardant le choix "humeur" en priorité quand le contraste est déjà correct.
  const candidates = [preferred, ...BG_PRESETS.filter((b) => b.id !== preferred.id)];
  const bg = garmentHex ? pickContrastingBg(garmentHex, candidates, 90) : preferred;
  const selectedProps = ep.occasion ? (OCCASION_PROPS[ep.occasion] ?? ["sparkle", "thread"]) : ["sparkle", "thread"];
  return { bgColor: bg.color, selectedProps };
}

export default function EpisodeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [ep, setEp] = useState<StudioMoodEpisode | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Copy
  const [generatingCopy, setGeneratingCopy] = useState(false);
  const [copyResult, setCopyResult] = useState<GeneratedCopy | null>(null);

  // Storyboard
  const [generatingStoryboard, setGeneratingStoryboard] = useState(false);
  const [storyboard, setStoryboard] = useState<Storyboard | null>(null);

  // Visual
  const [visualComposition, setVisualComposition] = useState<Composition>("flatlay");
  const [visualAspectRatio, setVisualAspectRatio] = useState<AspectRatio>("9:16");
  const [visualCanoniqueId, setVisualCanoniqueId] = useState<string>("");
  const [generatingVisual, setGeneratingVisual] = useState(false);
  const [visualImage, setVisualImage] = useState<string | null>(null);
  const [visualNote, setVisualNote] = useState<string | null>(null);
  const collageCanvasRef = useRef<HTMLCanvasElement>(null);
  const [logoImg, setLogoImg] = useState<HTMLImageElement | null>(null);

  // Bibliothèque motifs + produits — pour surcharger le motif/produit de
  // l'épisode au moment de générer le visuel (cf. sélecteur "Motif" / "Produit").
  const [motifsLib, setMotifsLib] = useState<MotifYpm[]>([]);
  const [produitsLib, setProduitsLib] = useState<HubProduit[]>([]);
  const [visualMotifId, setVisualMotifId] = useState<string>("");
  const [visualVarianteFile, setVisualVarianteFile] = useState<string>("");
  const [visualProduitId, setVisualProduitId] = useState<string>("");
  const [visualCouleurId, setVisualCouleurId] = useState<string>("");

  // UI
  const [editingStatut, setEditingStatut] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/studio-mood/${id}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.message ?? "Épisode introuvable");
      setEp(json.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]);

  // Logo Ypersoa réel (assets/motifs-fonds-svg/logo.svg), recoloré blanc + pré-chargé une fois.
  useEffect(() => {
    fetch("/api/social/motifs-fonds")
      .then((r) => r.json())
      .then(async (json) => {
        if (!json.ok) return;
        const logo = (json.data as { filename: string; content: string }[]).find((f) => f.filename === "logo.svg");
        if (!logo) return;
        const img = await loadImageFromSvg(recolorLogoSvg(logo.content, "#FFFFFF"));
        setLogoImg(img);
      })
      .catch(() => {});
  }, []);

  // Bibliothèque motifs + produits (sélecteurs "Motif" / "Produit" du visuel hook).
  useEffect(() => {
    fetch("/api/da/referentiels", { cache: "no-store" })
      .then((r) => r.json())
      .then((json) => { if (json.ok) setMotifsLib(json.data.motifs.motifs); })
      .catch(() => {});
    fetch("/api/hub/products")
      .then((r) => r.json())
      .then((json) => { if (json.ok) setProduitsLib(json.data.produits); })
      .catch(() => {});
  }, []);

  const selectedMotif = motifsLib.find((m) => m.id === visualMotifId) ?? null;
  const selectedProduit = produitsLib.find((p) => p.id === visualProduitId) ?? null;
  const selectedCouleur = selectedProduit?.couleurs_detaillees.find((c) => c.id_palette === visualCouleurId) ?? null;

  const handleGenerateCopy = async () => {
    if (!ep) return;
    setGeneratingCopy(true);
    setCopyResult(null);
    try {
      const res = await fetch(`/api/studio-mood/${id}/generate-copy`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message ?? "Erreur génération");
      setCopyResult(json.data.copy);
      setEp(json.data.episode);
    } catch (e) {
      alert(e instanceof Error ? e.message : String(e));
    } finally {
      setGeneratingCopy(false);
    }
  };

  const handleGenerateStoryboard = async () => {
    if (!ep) return;
    setGeneratingStoryboard(true);
    try {
      const res = await fetch(`/api/studio-mood/${id}/storyboard`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.message ?? "Erreur storyboard");
      setStoryboard(json.data);
      setEp((prev) => prev ? { ...prev, storyboard_md: json.markdown, storyboard_exported_at: new Date().toISOString() } : prev);
    } catch (e) {
      alert(e instanceof Error ? e.message : String(e));
    } finally {
      setGeneratingStoryboard(false);
    }
  };

  const handleGenerateVisual = async () => {
    if (!ep) return;
    setGeneratingVisual(true);
    setVisualImage(null);
    setVisualNote(null);
    try {
      const res = await fetch(`/api/studio-mood/${id}/generate-visual`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          composition: visualComposition,
          aspectRatio: visualAspectRatio,
          canoniqueId:
            (visualComposition === "worn" || visualComposition === "cutout") && visualCanoniqueId
              ? visualCanoniqueId
              : undefined,
          motifOverride: visualMotifId
            ? { motifId: visualMotifId, varianteFile: visualVarianteFile || undefined }
            : undefined,
          produitOverride: visualProduitId
            ? { produitId: visualProduitId, couleurId: visualCouleurId || undefined }
            : undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message ?? "Erreur génération visuel");
      setVisualImage(json.imageDataUrl);
      if (json.note) setVisualNote(json.note);
    } catch (e) {
      alert(e instanceof Error ? e.message : String(e));
    } finally {
      setGeneratingVisual(false);
    }
  };

  // Mode "cutout" : le serveur renvoie déjà un PNG détouré (canal alpha réel).
  // On le compose automatiquement en collage-sticker — fond + label mot brodé +
  // props, pilotés par l'humeur/l'occasion de l'épisode (cf. pickCollageDefaults).
  useEffect(() => {
    if (visualComposition !== "cutout" || !visualImage || !ep) return;
    const canvas = collageCanvasRef.current;
    if (!canvas) return;
    const img = new Image();
    img.onload = () => {
      const { w, h } = FORMATS[visualAspectRatio];
      const scale = (h * 0.92) / img.naturalHeight;
      // Contraste fond/vêtement : si un produit+couleur a été sélectionné pour la
      // génération, on évite un fond trop proche de sa couleur réelle.
      const garmentHex = selectedCouleur?.hex_palette_officiel ?? null;
      const defaults = pickCollageDefaults(ep, garmentHex);
      const lc = LABEL_COLORS.find((c) => c.id === "cream") ?? LABEL_COLORS[0];
      drawCollage(canvas, {
        format: visualAspectRatio,
        bgColor: defaults.bgColor,
        bgPatternImage: null,
        photo: img,
        photoBlendMode: "normal", // vrai canal alpha (détourage serveur), pas le hack multiply
        photoScale: scale,
        photoX: Math.round((w - img.naturalWidth * scale) / 2),
        photoY: Math.round(h * 0.04),
        labelText: ep.mot_brode,
        labelShape: "postit",
        labelBg: lc.bg,
        labelFg: lc.text,
        labelSize: Math.round(w * 0.065),
        labelX: Math.round(w * 0.08),
        labelY: Math.round(h * 0.78),
        selectedProps: defaults.selectedProps,
        showLogo: true,
        logoImage: logoImg,
      });
    };
    img.src = visualImage;
  }, [visualComposition, visualImage, visualAspectRatio, ep, logoImg, selectedCouleur]);

  const handleDownloadVisual = () => {
    if (!visualImage) return;
    if (visualComposition === "cutout") {
      const canvas = collageCanvasRef.current;
      if (!canvas) return;
      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `sticker-${ep?.titre?.replace(/\s+/g, "-").toLowerCase() ?? id}.png`;
        a.click();
        URL.revokeObjectURL(url);
      }, "image/png");
      return;
    }
    const a = document.createElement("a");
    a.href = visualImage;
    const ext = visualImage.startsWith("data:image/png") ? "png" : "jpg";
    a.download = `hook-${ep?.titre?.replace(/\s+/g, "-").toLowerCase() ?? id}.${ext}`;
    a.click();
  };

  const handleDownloadStoryboard = async () => {
    const res = await fetch(`/api/studio-mood/${id}/storyboard?format=md`);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `storyboard-${ep?.titre?.replace(/\s+/g, "-").toLowerCase() ?? id}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleStatutChange = async (s: StatutEpisode) => {
    setEditingStatut(false);
    if (!ep || ep.statut === s) return;
    try {
      const res = await fetch(`/api/studio-mood/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ statut: s }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message);
      setEp(json.data);
    } catch (e) {
      alert(e instanceof Error ? e.message : String(e));
    }
  };

  const handleDelete = async () => {
    if (!confirm("Supprimer cet épisode définitivement ?")) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/studio-mood/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Suppression échouée");
      window.location.href = "/atelier-da/studio-mood";
    } catch (e) {
      alert(e instanceof Error ? e.message : String(e));
      setDeleting(false);
    }
  };

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: 32, color: "#888" }}>
      <Loader2 size={18} className="animate-spin" /> Chargement…
    </div>
  );

  if (error || !ep) return (
    <div style={{ padding: 32 }}>
      <Link href="/atelier-da/studio-mood" style={backLinkStyle}><ArrowLeft size={14} /> Studio Mood</Link>
      <div style={errorBoxStyle}><AlertCircle size={16} />{error ?? "Épisode introuvable"}</div>
    </div>
  );

  const meta = STATUT_META[ep.statut];

  // Aspect ratio CSS mapping for image display
  const aspectPaddingTop: Record<AspectRatio, string> = {
    "9:16": "177.78%",
    "1:1": "100%",
    "3:4": "133.33%",
  };

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto" }}>
      <Link href="/atelier-da/studio-mood" style={backLinkStyle}>
        <ArrowLeft size={14} strokeWidth={1.6} /> Studio Mood
      </Link>

      {/* Header */}
      <header style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8, flexWrap: "wrap" }}>
          <div style={{ position: "relative" }}>
            <button
              onClick={() => setEditingStatut(!editingStatut)}
              style={{ ...badgeStyle, background: meta.bg, color: meta.fg, cursor: "pointer", border: "none" }}
            >
              {meta.label} ▾
            </button>
            {editingStatut && (
              <div style={dropdownStyle}>
                {STATUT_ORDER.map((s) => (
                  <button key={s} onClick={() => handleStatutChange(s)} style={dropdownItemStyle}>
                    <span style={{ ...badgeStyle, background: STATUT_META[s].bg, color: STATUT_META[s].fg, fontSize: 11 }}>
                      {STATUT_META[s].label}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <span style={{ fontSize: 13, opacity: 0.5, fontFamily: "var(--font-sans)" }}>
            {SUPPORT_LABELS[ep.support as keyof typeof SUPPORT_LABELS] ?? ep.support}
            {ep.couleur_produit && ` · ${ep.couleur_produit}`}
          </span>
          {ep.occasion && <span style={tagStyle}>{ep.occasion}</span>}
          {ep.ampli_saisonnier && <span style={{ ...tagStyle, background: "#EDF8EF", color: "#1D6130" }}>{ep.ampli_saisonnier}</span>}
        </div>

        <h1 style={h1Style}>{ep.titre}</h1>

        <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
          <button onClick={handleGenerateCopy} disabled={generatingCopy} style={primaryBtnStyle}>
            {generatingCopy ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
            {generatingCopy ? "Génération…" : "Générer hook + légende"}
          </button>
          <button onClick={handleGenerateStoryboard} disabled={generatingStoryboard} style={secondaryBtnStyle}>
            {generatingStoryboard ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />}
            {generatingStoryboard ? "Calcul…" : "Générer storyboard"}
          </button>
          {ep.storyboard_md && (
            <button onClick={handleDownloadStoryboard} style={secondaryBtnStyle}>
              <Download size={14} /> .md
            </button>
          )}
          <Link href={`/atelier-da/studio-mood/${id}/edit`} style={secondaryBtnStyle}>
            <Edit3 size={14} /> Modifier
          </Link>
          <button onClick={handleDelete} disabled={deleting} style={dangerBtnStyle}>
            {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
          </button>
        </div>
      </header>

      {/* Layout 3 colonnes : infos+copy | visuel | storyboard */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 280px 1fr", gap: 16 }}>

        {/* Colonne 1 — Infos + Copy */}
        <div>
          <section style={sectionStyle}>
            <h2 style={sectionTitleStyle}>Épisode</h2>
            <InfoRow label="Humeur" value={ep.humeur} />
            <InfoRow label="Mot brodé" value={`"${ep.mot_brode}"`} large />
            {ep.motif_ypm_nom && <InfoRow label="Motif YPM" value={`${ep.motif_ypm_id} — ${ep.motif_ypm_nom}`} />}
            {ep.decor && <InfoRow label="Décor" value={ep.decor} />}
          </section>

          {(ep.hook || ep.legende_question || copyResult) && (
            <section style={sectionStyle}>
              <h2 style={sectionTitleStyle}>
                Copy
                {copyResult && (
                  <span style={{ fontSize: 11, fontFamily: "var(--font-sans)", fontWeight: 400, marginLeft: 8, opacity: 0.6 }}>
                    via {copyResult.source}
                    {copyResult.brand_safe
                      ? <span style={{ color: "#1D6130", marginLeft: 4 }}><Check size={11} style={{ display: "inline" }} /> brand-safe</span>
                      : <span style={{ color: "#B91C1C", marginLeft: 4 }}><X size={11} style={{ display: "inline" }} /> violations</span>
                    }
                  </span>
                )}
              </h2>

              {ep.hook && (
                <div style={copyBlockStyle}>
                  <p style={copyLabelStyle}>Hook stop-scroll</p>
                  <p style={copyTextStyle}>{ep.hook}</p>
                </div>
              )}

              {ep.legende_question && (
                <div style={copyBlockStyle}>
                  <p style={copyLabelStyle}>Légende + question</p>
                  <p style={{ ...copyTextStyle, whiteSpace: "pre-line" }}>{ep.legende_question}</p>
                </div>
              )}

              {ep.hashtags?.length > 0 && (
                <div style={copyBlockStyle}>
                  <p style={copyLabelStyle}>Hashtags ({ep.hashtags.length})</p>
                  <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                    {ep.hashtags.map((h, i) => (
                      <span key={i} style={hashtagPillStyle}>#{h.replace(/^#/, "")}</span>
                    ))}
                  </div>
                </div>
              )}

              {copyResult?.violations && copyResult.violations.length > 0 && (
                <div style={violationBoxStyle}>
                  <AlertCircle size={13} />
                  Termes interdits : {copyResult.violations.join(", ")}
                </div>
              )}
            </section>
          )}
        </div>

        {/* Colonne 2 — Visuel hook */}
        <div>
          <section style={{ ...sectionStyle, padding: "14px" }}>
            <h2 style={{ ...sectionTitleStyle, marginBottom: 10 }}>
              <ImageIcon size={14} style={{ display: "inline", marginRight: 4 }} />
              Visuel hook
            </h2>

            {/* Contrôles composition */}
            <div style={{ display: "flex", gap: 4, marginBottom: 8 }}>
              {(["flatlay", "worn", "cutout"] as Composition[]).map((c) => (
                <button
                  key={c}
                  onClick={() => setVisualComposition(c)}
                  style={{
                    flex: 1, padding: "5px 0", borderRadius: 6,
                    border: "none", cursor: "pointer", fontSize: 11,
                    fontFamily: "var(--font-sans)", fontWeight: 600,
                    background: visualComposition === c ? "#1E6E77" : "#F0EDE8",
                    color: visualComposition === c ? "#fff" : "#5C5248",
                  }}
                >
                  {c === "flatlay" ? "Flatlay" : c === "worn" ? "Porté" : "Sticker"}
                </button>
              ))}
            </div>
            {visualComposition === "cutout" && (
              <p style={{ fontSize: 10.5, opacity: 0.55, fontFamily: "var(--font-sans)", margin: "-4px 0 8px", lineHeight: 1.4 }}>
                Fond neutre + détourage automatique + collage (mot brodé en label, props selon l&apos;occasion).
              </p>
            )}

            {/* Contrôles format */}
            <div style={{ display: "flex", gap: 4, marginBottom: 8 }}>
              {(["9:16", "1:1", "3:4"] as AspectRatio[]).map((ar) => (
                <button
                  key={ar}
                  onClick={() => setVisualAspectRatio(ar)}
                  style={{
                    flex: 1, padding: "4px 0", borderRadius: 6,
                    border: "none", cursor: "pointer", fontSize: 11,
                    fontFamily: "var(--font-sans)", fontWeight: 500,
                    background: visualAspectRatio === ar ? "#16324C" : "#F0EDE8",
                    color: visualAspectRatio === ar ? "#fff" : "#5C5248",
                  }}
                >
                  {ar}
                </button>
              ))}
            </div>

            {/* Sélecteur canonique (composition worn / cutout) */}
            {(visualComposition === "worn" || visualComposition === "cutout") && (
              <select
                value={visualCanoniqueId}
                onChange={(e) => setVisualCanoniqueId(e.target.value)}
                style={{ ...selectStyle, marginBottom: 8 }}
              >
                <option value="">— Canonique (optionnel) —</option>
                {CANONIQUES.filter((c) => c.type === "principal").map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.prenom}{c.favorite ? " ⭐" : ""}
                  </option>
                ))}
              </select>
            )}

            {/* Sélecteur motif (bibliothèque de variantes) — override le motif de l'épisode */}
            <div style={{ marginBottom: 8 }}>
              <select
                value={visualMotifId}
                onChange={(e) => { setVisualMotifId(e.target.value); setVisualVarianteFile(""); }}
                style={{ ...selectStyle, marginBottom: visualMotifId ? 4 : 0 }}
              >
                <option value="">— Motif de l&apos;épisode —</option>
                {motifsLib.map((m) => (
                  <option key={m.id} value={m.id}>{m.id} — {m.nom_commercial}</option>
                ))}
              </select>
              {selectedMotif && selectedMotif.variantes.length > 0 && (
                <select
                  value={visualVarianteFile}
                  onChange={(e) => setVisualVarianteFile(e.target.value)}
                  style={selectStyle}
                >
                  <option value="">— Variante (auto selon occasion) —</option>
                  {selectedMotif.variantes.map((v) => (
                    <option key={v.file} value={v.file}>{v.label}</option>
                  ))}
                </select>
              )}
            </div>

            {/* Sélecteur produit + couleur (catalogue Hub) — override le produit de l'épisode */}
            <div style={{ marginBottom: 8 }}>
              <select
                value={visualProduitId}
                onChange={(e) => { setVisualProduitId(e.target.value); setVisualCouleurId(""); }}
                style={{ ...selectStyle, marginBottom: visualProduitId ? 4 : 0 }}
              >
                <option value="">— Produit de l&apos;épisode —</option>
                {produitsLib.map((p) => (
                  <option key={p.id} value={p.id}>{p.id} — {p.nom_commercial}</option>
                ))}
              </select>
              {selectedProduit && selectedProduit.couleurs_detaillees.length > 0 && (
                <select
                  value={visualCouleurId}
                  onChange={(e) => setVisualCouleurId(e.target.value)}
                  style={selectStyle}
                >
                  <option value="">— Couleur (défaut catalogue) —</option>
                  {selectedProduit.couleurs_detaillees.map((c) => (
                    <option key={c.id_palette} value={c.id_palette}>{c.nom_ypersoa}</option>
                  ))}
                </select>
              )}
            </div>

            {/* Bouton générer */}
            <button
              onClick={handleGenerateVisual}
              disabled={generatingVisual}
              style={{ ...primaryBtnStyle, width: "100%", justifyContent: "center", marginBottom: 10 }}
            >
              {generatingVisual
                ? <><Loader2 size={13} className="animate-spin" /> Génération Gemini…</>
                : <><ImageIcon size={13} /> Générer</>
              }
            </button>

            {/* Résultat image */}
            {visualImage && (
              <>
                {visualNote && (
                  <div style={{ display: "flex", gap: 8, alignItems: "flex-start", background: "#FEF3C7", border: "1px solid #E0942E", borderRadius: 8, padding: "8px 10px", marginBottom: 8 }}>
                    <span style={{ fontSize: 14, lineHeight: 1 }}>⚠️</span>
                    <p style={{ fontSize: 12, fontWeight: 600, color: "#92400E", fontFamily: "var(--font-sans)", margin: 0 }}>
                      {visualNote}
                    </p>
                  </div>
                )}
                <div style={{ position: "relative", width: "100%", paddingTop: aspectPaddingTop[visualAspectRatio], borderRadius: 8, overflow: "hidden", background: "#F0EDE8", marginBottom: 8 }}>
                  {visualComposition === "cutout" ? (
                    <canvas
                      ref={collageCanvasRef}
                      style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
                    />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={visualImage}
                      alt="Visuel hook généré"
                      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
                    />
                  )}
                </div>
                <button onClick={handleDownloadVisual} style={{ ...secondaryBtnStyle, width: "100%", justifyContent: "center" }}>
                  <Download size={13} /> Télécharger
                </button>
              </>
            )}

            {!visualImage && !generatingVisual && (
              <div style={{ textAlign: "center", padding: "16px 0", opacity: 0.4 }}>
                <ImageIcon size={24} strokeWidth={1.2} />
                <p style={{ fontSize: 11, fontFamily: "var(--font-sans)", margin: "6px 0 0" }}>
                  Flatlay, porté ou sticker détouré · 9:16 Reels
                </p>
              </div>
            )}
          </section>
        </div>

        {/* Colonne 3 — Storyboard */}
        <div>
          {(storyboard || ep.storyboard_md) ? (
            <section style={sectionStyle}>
              <h2 style={sectionTitleStyle}>
                Storyboard
                {ep.storyboard_exported_at && (
                  <span style={{ fontSize: 11, fontFamily: "var(--font-sans)", fontWeight: 400, marginLeft: 8, opacity: 0.6 }}>
                    {new Date(ep.storyboard_exported_at).toLocaleDateString("fr-FR")}
                  </span>
                )}
              </h2>
              {storyboard ? (
                storyboard.frames.map((f) => (
                  <div key={f.index} style={frameStyle}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                      <span style={frameIndexStyle}>{f.index}</span>
                      <span style={frameLabelStyle}>{f.label}</span>
                      <span style={frameDureeStyle}>{f.duree_s}</span>
                    </div>
                    <p style={{ fontSize: 12, lineHeight: 1.6, whiteSpace: "pre-line", margin: "0 0 6px" }}>
                      {f.description}
                    </p>
                    <p style={frameMontageStyle}>📋 {f.note_montage}</p>
                  </div>
                ))
              ) : ep.storyboard_md ? (
                <pre style={{ fontSize: 11, lineHeight: 1.7, whiteSpace: "pre-wrap", fontFamily: "var(--font-sans)", opacity: 0.85 }}>
                  {ep.storyboard_md.slice(0, 1200)}…
                </pre>
              ) : null}
            </section>
          ) : (
            <section style={{ ...sectionStyle, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 180, opacity: 0.5, gap: 8 }}>
              <FileText size={24} strokeWidth={1.2} />
              <p style={{ fontSize: 12, fontFamily: "var(--font-sans)", textAlign: "center" }}>
                Clique sur<br />&ldquo;Générer storyboard&rdquo;
              </p>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value, large }: { label: string; value: string; large?: boolean }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <p style={{ fontSize: 11, fontFamily: "var(--font-sans)", opacity: 0.5, margin: "0 0 2px", textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</p>
      <p style={{ fontSize: large ? 20 : 14, fontFamily: large ? "var(--font-editorial)" : "var(--font-sans)", fontWeight: large ? 600 : 400, margin: 0, color: large ? "#1E6E77" : "inherit" }}>
        {value}
      </p>
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const backLinkStyle: React.CSSProperties = { display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--hub-foreground)", opacity: 0.6, textDecoration: "none", marginBottom: 20, fontFamily: "var(--font-sans)" };
const h1Style: React.CSSProperties = { fontFamily: "var(--font-editorial)", fontSize: 28, fontWeight: 500, letterSpacing: "-0.015em", margin: 0, lineHeight: 1.2 };
const primaryBtnStyle: React.CSSProperties = { display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 8, background: "#1E6E77", color: "#fff", fontSize: 13, fontWeight: 600, fontFamily: "var(--font-sans)", cursor: "pointer", border: "none" };
const secondaryBtnStyle: React.CSSProperties = { display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 12px", borderRadius: 8, background: "#F0EDE8", color: "#5C5248", fontSize: 13, fontWeight: 500, fontFamily: "var(--font-sans)", cursor: "pointer", border: "none", textDecoration: "none" };
const dangerBtnStyle: React.CSSProperties = { display: "inline-flex", alignItems: "center", padding: "8px 10px", borderRadius: 8, background: "#FEF2F2", color: "#B91C1C", fontSize: 13, fontFamily: "var(--font-sans)", cursor: "pointer", border: "none" };
const sectionStyle: React.CSSProperties = { background: "#fff", border: "1px solid #EDE8E1", borderRadius: 12, padding: "18px 20px", marginBottom: 16 };
const sectionTitleStyle: React.CSSProperties = { fontFamily: "var(--font-editorial)", fontSize: 16, fontWeight: 500, margin: "0 0 14px" };
const badgeStyle: React.CSSProperties = { padding: "3px 9px", borderRadius: 999, fontSize: 12, fontFamily: "var(--font-sans)", fontWeight: 600 };
const tagStyle: React.CSSProperties = { padding: "2px 8px", borderRadius: 999, fontSize: 11, fontFamily: "var(--font-sans)", background: "#F4EEE2", color: "#7A6550" };
const copyBlockStyle: React.CSSProperties = { marginBottom: 16 };
const copyLabelStyle: React.CSSProperties = { fontSize: 11, fontFamily: "var(--font-sans)", opacity: 0.5, margin: "0 0 4px", textTransform: "uppercase", letterSpacing: "0.05em" };
const copyTextStyle: React.CSSProperties = { fontSize: 14, fontFamily: "var(--font-sans)", lineHeight: 1.6, margin: 0 };
const hashtagPillStyle: React.CSSProperties = { padding: "2px 8px", borderRadius: 4, fontSize: 12, fontFamily: "var(--font-sans)", background: "#EAF3FD", color: "#1E4D7B" };
const violationBoxStyle: React.CSSProperties = { display: "flex", alignItems: "center", gap: 6, padding: "8px 12px", borderRadius: 6, background: "#FEF2F2", color: "#B91C1C", fontSize: 12, fontFamily: "var(--font-sans)" };
const frameStyle: React.CSSProperties = { borderLeft: "3px solid #1E6E77", paddingLeft: 12, marginBottom: 18 };
const frameIndexStyle: React.CSSProperties = { width: 20, height: 20, borderRadius: "50%", background: "#1E6E77", color: "#fff", fontSize: 10, fontFamily: "var(--font-sans)", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 };
const frameLabelStyle: React.CSSProperties = { fontFamily: "var(--font-sans)", fontSize: 12, fontWeight: 600 };
const frameDureeStyle: React.CSSProperties = { fontFamily: "var(--font-sans)", fontSize: 10, opacity: 0.5, marginLeft: "auto" };
const frameMontageStyle: React.CSSProperties = { fontSize: 11, fontFamily: "var(--font-sans)", lineHeight: 1.5, background: "#F4EEE2", borderRadius: 6, padding: "5px 8px", margin: 0, color: "#7A6550" };
const dropdownStyle: React.CSSProperties = { position: "absolute", top: "calc(100% + 4px)", left: 0, zIndex: 50, background: "#fff", border: "1px solid #EDE8E1", borderRadius: 8, boxShadow: "0 4px 16px rgba(0,0,0,0.08)", padding: 4, minWidth: 160 };
const dropdownItemStyle: React.CSSProperties = { display: "block", width: "100%", padding: "6px 8px", background: "none", border: "none", cursor: "pointer", borderRadius: 4, textAlign: "left" };
const errorBoxStyle: React.CSSProperties = { display: "flex", alignItems: "center", gap: 8, padding: "12px 16px", borderRadius: 8, background: "#FEF2F2", color: "#B91C1C", fontSize: 13, fontFamily: "var(--font-sans)", marginTop: 16 };
const selectStyle: React.CSSProperties = { width: "100%", padding: "6px 10px", borderRadius: 6, border: "1px solid #DDD9D3", fontSize: 12, fontFamily: "var(--font-sans)", background: "#fff", color: "var(--hub-foreground)", outline: "none" };
