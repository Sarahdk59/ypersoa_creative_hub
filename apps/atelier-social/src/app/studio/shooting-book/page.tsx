"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Sparkles, Loader2, AlertCircle, MapPin, Users, Camera as CameraIcon, Calendar, Lightbulb, Heart, Image as ImageIcon, Download, Upload, X, CheckCircle2, Send } from "lucide-react";
import type { ShootingPlanOutput } from "@/lib/atelier-da/shooting-plan-builder";
import { listActiveLookbookAmbiances, type ActiveLookbookAmbiance } from "@/lib/active-ambiances";
import { motifImageSrc } from "@/lib/atelier-da/motif-image";
import type { MotifVariante } from "@/lib/atelier-da/referentiels-loader";
import { AMBIANCES_OFFICIELLES } from "@/lib/ambiances-officielles";
import { PRODUITS_CATALOGUE, PRODUIT_LABEL, sortByCatalogueOrder } from "@/lib/produits-catalogue";

// Fallback synchrone (chargement / API indispo). La liste réelle vient de
// /api/hub/products via `hubProduits` (cf. plus bas) → tous les produits du
// référentiel apparaissent automatiquement, casquette et slims compris.
const PRODUITS_YP = PRODUITS_CATALOGUE;

/** Couleur de support réelle d'un produit (issue de palette_supports_par_produit.json).
 *  Chargée dynamiquement par produit → la couleur sélectionnée a toujours un packshot
 *  correspondant, qui sert de verrou produit côté Gemini. */
interface HubColor {
  id_palette: string;
  nom_ypersoa: string;
  hex_palette_officiel: string;
  packshot_reference?: string;
}
interface HubProduitLite {
  id: string;
  nom_commercial?: string;
  couleurs_detaillees: HubColor[];
}

const MOTIFS_YPM_FALLBACK = [
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

// Source unique : lib/ambiances-officielles.ts (6 ambiances alignées cross-app)
const AMBIANCES_PREFAITES = AMBIANCES_OFFICIELLES.map((a) => ({ id: a.id, label: a.label }));

const FORMATS = [
  { value: "post-feed", label: "Post feed (1 angle 4:5)" },
  { value: "instagram", label: "Pack Instagram (5 angles 4:5)" },
  { value: "pinterest", label: "Pinterest (3 angles 2:3)" },
  { value: "lookbook", label: "Lookbook (12-20 visuels)" },
  { value: "shooting", label: "Shooting full pack" },
  { value: "hero-banner", label: "Hero banner cinematic" },
];

function ShootingBookContent() {
  const searchParams = useSearchParams();
  const [briefTexte, setBriefTexte] = useState("");
  const [produitId, setProduitId] = useState<string>("YP019");
  const [motifId, setMotifId] = useState("");
  // Variante précise du motif (ex. "papa"/"maman"/"mariage") — null = image
  // principale du motif (asset_principal). Réinitialisée à chaque changement
  // de motif (cf. fix variantes du 20/08/2026).
  const [varianteFile, setVarianteFile] = useState<string | null>(null);
  useEffect(() => {
    setVarianteFile(null);
  }, [motifId]);
  const [motifsList, setMotifsList] = useState<
    { id: string; nom: string; asset_principal?: string; asset_principal_url?: string; variantes: MotifVariante[] }[]
  >(MOTIFS_YPM_FALLBACK.map((m) => ({ ...m, variantes: [] })));

  // Charge les motifs réels (avec asset_principal + variantes) depuis le référentiel.
  // Shooting Book ne proposait avant que l'asset_principal (1 image/motif) — les
  // variantes (ex. "papa"/"maman"/"mariage" pour un même motif) sont maintenant
  // sélectionnables (cf. recadrage nav du 20/08/2026).
  useEffect(() => {
    fetch("/api/da/referentiels", { cache: "no-store" })
      .then((r) => r.json())
      .then((res) => {
        if (!res.ok) return;
        const motifs = res.data?.motifs?.motifs;
        if (Array.isArray(motifs)) {
          setMotifsList(
            motifs.map(
              (m: {
                id: string;
                nom_commercial: string;
                asset_principal?: string;
                asset_principal_url?: string;
                variantes?: MotifVariante[];
              }) => ({
                id: m.id,
                nom: m.nom_commercial,
                asset_principal: m.asset_principal,
                asset_principal_url: m.asset_principal_url,
                variantes: m.variantes ?? [],
              })
            )
          );
        }
      })
      .catch(() => undefined);
  }, []);

  // Deep-link Planable : pré-remplit motif + brief depuis ?motif=YPM-XXX&brief=...
  // + capte l'entrée Planable cible (planable_entry / planable_url) pour le renvoi d'image.
  const [planableEntryId, setPlanableEntryId] = useState<string | null>(null);
  const [planableUrl, setPlanableUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!searchParams) return;
    const m = searchParams.get("motif");
    const b = searchParams.get("brief");
    if (m) setMotifId(m);
    if (b) setBriefTexte(b);
    const pe = searchParams.get("planable_entry");
    const pu = searchParams.get("planable_url");
    if (pe) setPlanableEntryId(pe);
    setPlanableUrl(pu || process.env.NEXT_PUBLIC_PLANABLE_URL || "http://localhost:3002");
    // Mount only — Sarah peut ensuite éditer librement
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // État du renvoi « Envoyer vers Planable » (clé = identifiant du visuel : "hero" ou shotIndex)
  const [sendingTo, setSendingTo] = useState<string | null>(null);
  const [sentKeys, setSentKeys] = useState<Record<string, boolean>>({});
  const [sendError, setSendError] = useState<string | null>(null);

  const sendToPlanable = async (key: string, dataUrl: string, angle: string) => {
    if (!planableEntryId || !planableUrl || sendingTo) return;
    setSendingTo(key);
    setSendError(null);
    try {
      const res = await fetch(`${planableUrl}/api/calendar/${planableEntryId}/attach-image`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ image_data_url: dataUrl, angle }),
      }).then((r) => r.json());
      if (!res.ok) throw new Error(res.error || "Échec de l'envoi");
      setSentKeys((prev) => ({ ...prev, [key]: true }));
    } catch (e) {
      setSendError(e instanceof Error ? e.message : String(e));
    } finally {
      setSendingTo(null);
    }
  };
  const [ambiances, setAmbiances] = useState<string[]>([]);
  const [lookbookAmbianceIds, setLookbookAmbianceIds] = useState<string[]>([]);
  const [format, setFormat] = useState<string>("post-feed");
  const [generating, setGenerating] = useState(false);
  const [plan, setPlan] = useState<ShootingPlanOutput | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeLookbookAmbiances, setActiveLookbookAmbiances] = useState<ActiveLookbookAmbiance[]>([]);

  // PNG motif optionnel (référence broderie pour Gemini)
  const [motifPngDataUrl, setMotifPngDataUrl] = useState<string | null>(null);
  const [motifPngFilename, setMotifPngFilename] = useState<string | null>(null);
  const [motifPngIsHub, setMotifPngIsHub] = useState(false);
  const [motifSize, setMotifSize] = useState<"petit" | "moyen" | "grand">("moyen");
  const [supportColor, setSupportColor] = useState<string>("blanc");
  // Type de prise de vue : porté sur canonique ou flatlay lifestyle (pinterestable, sans personne)
  const [composition, setComposition] = useState<"worn" | "flatlay">("worn");
  // Quand un PNG est fourni : produit + couleur + taille deviennent facultatifs.
  // productOverride = true si Sarah veut forcer un produit malgré le PNG.
  const [productOverride, setProductOverride] = useState(false);
  // Reset de l'override quand le PNG est effacé
  useEffect(() => { if (!motifPngDataUrl) setProductOverride(false); }, [motifPngDataUrl]);

  // Palettes réelles par produit (verrou couleur + packshot Gemini)
  const [hubProduits, setHubProduits] = useState<HubProduitLite[]>([]);
  useEffect(() => {
    fetch("/api/hub/products", { cache: "no-store" })
      .then((r) => r.json())
      .then((res) => {
        if (res.ok) setHubProduits(res.data.produits as HubProduitLite[]);
      })
      .catch(() => undefined);
  }, []);
  const availableColors: HubColor[] =
    hubProduits.find((p) => p.id === produitId)?.couleurs_detaillees ?? [];
  // Si la couleur courante n'existe pas pour le produit choisi → bascule sur la première dispo
  useEffect(() => {
    if (availableColors.length === 0) return;
    if (!availableColors.some((c) => c.id_palette === supportColor)) {
      setSupportColor(availableColors[0].id_palette);
    }
  }, [produitId, hubProduits, supportColor, availableColors]);

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

  // Planification Planable depuis le shooting-book (crée une nouvelle entrée)
  const [sbSchedDate, setSbSchedDate] = useState("2026-07-30");
  const [sbSchedTime, setSbSchedTime] = useState("09:00");
  const [sbScheduling, setSbScheduling] = useState(false);
  const [sbScheduled, setSbScheduled] = useState(false);
  const [sbSchedError, setSbSchedError] = useState<string | null>(null);

  const handlePlanifyInPlanable = async () => {
    if (sbScheduling) return;
    setSbScheduling(true);
    setSbSchedError(null);
    try {
      const pUrl = planableUrl || process.env.NEXT_PUBLIC_PLANABLE_URL || "http://localhost:3002";
      const scheduledAt = new Date(`${sbSchedDate}T${sbSchedTime}:00+02:00`).toISOString();
      const createRes = await fetch(`${pUrl}/api/calendar`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          scheduled_at: scheduledAt,
          platform: format === "pinterest" ? "pinterest_pin" : "instagram_post",
          motif_code: motifId || "YPM-003",
          variante_file: varianteFile,
          occasion_slug: null,
          format: format === "pinterest" ? "2:3" : "4:5",
          notes: plan ? `Shooting Book : ${briefTexte.slice(0, 200)}` : null,
        }),
      }).then((r) => r.json());

      if (!createRes.ok) {
        const errMsg = typeof createRes.error === "string"
          ? createRes.error
          : Array.isArray(createRes.error)
          ? createRes.error.map((e: { message: string }) => e.message).join(", ")
          : "Erreur création entrée Planable";
        throw new Error(errMsg);
      }

      const entryId: string | undefined = createRes.data?.id;
      // Attache l'image hero si disponible
      const heroImg = renderedImage?.data_url ?? Object.values(shotImages)[0]?.data_url;
      if (entryId && heroImg) {
        await fetch(`${pUrl}/api/calendar/${entryId}/attach-image`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            image_data_url: heroImg,
            angle: plan?.shotlist?.[0]?.angle ?? "Shooting Book — hero shot",
            caption: plan ? `Shooting : ${plan.brief_resume?.slice(0, 300) ?? briefTexte.slice(0, 300)}` : null,
          }),
        });
      }
      setSbScheduled(true);
    } catch (e) {
      setSbSchedError(e instanceof Error ? e.message : String(e));
    } finally {
      setSbScheduling(false);
    }
  };

  useEffect(() => {
    listActiveLookbookAmbiances().then(setActiveLookbookAmbiances).catch(() => undefined);
  }, []);

  const motifSelected = motifsList.find((m) => m.id === motifId);
  const motifNom = motifSelected?.nom;

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
      setMotifPngIsHub(false);
    };
    reader.readAsDataURL(file);
  };

  const clearMotifPng = () => {
    setMotifPngDataUrl(null);
    setMotifPngFilename(null);
    setMotifPngIsHub(false);
  };

  // Auto-injecte le PNG Hub quand un motif YPM (ou une de ses variantes) est
  // sélectionné. Passe par motifImageSrc pour couvrir aussi bien les PNG
  // uploadés (Supabase Storage) que les fichiers historiques (/motifs/<file>).
  useEffect(() => {
    if (!motifId) return;
    const m = motifsList.find((x) => x.id === motifId);
    if (!m) return;
    const variante = varianteFile ? m.variantes.find((v) => v.file === varianteFile) : null;
    const file = variante?.file ?? m.asset_principal;
    const rawUrl = variante?.url ?? m.asset_principal_url;
    if (!file) return;
    const src = motifImageSrc(file, rawUrl);
    let cancelled = false;
    fetch(src)
      .then((r) => r.blob())
      .then(
        (blob) =>
          new Promise<string>((res, rej) => {
            const reader = new FileReader();
            reader.onloadend = () => res(reader.result as string);
            reader.onerror = rej;
            reader.readAsDataURL(blob);
          })
      )
      .then((dataUrl) => {
        if (cancelled) return;
        setMotifPngDataUrl(dataUrl);
        setMotifPngFilename(file);
        setMotifPngIsHub(true);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [motifId, motifsList, varianteFile]);

  const handleGenerate = async () => {
    if (!briefTexte.trim() || generating) return;
    setGenerating(true);
    setError(null);
    setPlan(null);
    setRenderedImage(null);
    setImageError(null);
    // PNG fourni sans override produit → pas de contrainte support dans le brief
    const pngProvided = Boolean(motifPngDataUrl);
    const showProduct = !pngProvided || productOverride;
    try {
      const supportLabel = availableColors.find((c) => c.id_palette === supportColor)?.nom_ypersoa ?? supportColor;
      const briefWithSupport = showProduct
        ? `${briefTexte.trim()}\n\nSupport : t-shirt/sweat ${supportLabel} (couleur Ypersoa officielle).`
        : briefTexte.trim();
      const res = await fetch("/api/da/shooting-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          texte_libre: briefWithSupport,
          produit_yp_id: showProduct ? produitId : undefined,
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
    const pngProvided = Boolean(motifPngDataUrl);
    const showProduct = !pngProvided || productOverride;
    try {
      const res = await fetch("/api/da/shooting-plan/render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan,
          lookbook_ambiance_ids: lookbookAmbianceIds,
          selected_dispositif_id: selectedDispositifId,
          motif_png_data_url: motifPngDataUrl,
          motif_size: pngProvided ? undefined : motifSize,
          produit_yp_id: showProduct ? produitId : undefined,
          selected_garment_color: showProduct ? supportColor : undefined,
          shot_index: 0,
          composition,
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
    const pngProvided = Boolean(motifPngDataUrl);
    const showProduct = !pngProvided || productOverride;
    try {
      const res = await fetch("/api/da/shooting-plan/render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan,
          lookbook_ambiance_ids: lookbookAmbianceIds,
          selected_dispositif_id: selectedDispositifId,
          motif_png_data_url: motifPngDataUrl,
          motif_size: pngProvided ? undefined : motifSize,
          produit_yp_id: showProduct ? produitId : undefined,
          selected_garment_color: showProduct ? supportColor : undefined,
          shot_index: shotIndex,
          composition,
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

  // fetch → blob → objectURL : Safari ignore l'attribut `download` d'une ancre
  // sur les grosses data: URL (l'image s'ouvre au lieu de se télécharger).
  const downloadDataUrl = async (src: string, filename: string) => {
    try {
      const response = await fetch(src);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(objectUrl);
    } catch (err) {
      console.error("Téléchargement échoué", err);
      alert("Le téléchargement a échoué. Réessaie.");
    }
  };

  const handleDownloadImage = () => {
    if (!renderedImage) return;
    const slug = (plan?.brief_resume || "ypersoa-hero").slice(0, 40).replace(/[^a-z0-9]+/gi, "-").toLowerCase();
    void downloadDataUrl(renderedImage.data_url, `ypersoa-shooting-book-${slug}-${Date.now()}.png`);
  };

  const handleDownloadShot = (shotIndex: number) => {
    const img = shotImages[shotIndex];
    if (!img || !plan) return;
    const angle = plan.shotlist[shotIndex]?.angle || `shot-${shotIndex + 1}`;
    const slug = (plan.brief_resume || "ypersoa").slice(0, 30).replace(/[^a-z0-9]+/gi, "-").toLowerCase();
    void downloadDataUrl(img.data_url, `ypersoa-${slug}-${angle.toLowerCase()}-${Date.now()}.png`);
  };

  return (
    <div style={{ maxWidth: 1400, margin: "0 auto" }}>
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

          {/* Produit Ypersoa — facultatif si PNG fourni */}
          {motifPngDataUrl && (
            <div
              style={{
                marginTop: 16,
                padding: "10px 12px",
                borderRadius: 10,
                background: "rgba(30,110,119,0.07)",
                border: "0.5px solid rgba(30,110,119,0.25)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 8,
              }}
            >
              <span style={{ fontFamily: "var(--font-sans)", fontSize: 11, color: "var(--hub-teal)", lineHeight: 1.4 }}>
                PNG fourni — taille et support déduits de l&apos;image
              </span>
              <label style={{ display: "flex", alignItems: "center", gap: 5, cursor: "pointer", flexShrink: 0 }}>
                <input
                  type="checkbox"
                  checked={productOverride}
                  onChange={(e) => setProductOverride(e.target.checked)}
                  style={{ accentColor: "var(--hub-teal)", cursor: "pointer" }}
                />
                <span style={{ fontFamily: "var(--font-sans)", fontSize: 10, color: "var(--hub-teal)", whiteSpace: "nowrap" }}>
                  Forcer un produit
                </span>
              </label>
            </div>
          )}

          {(!motifPngDataUrl || productOverride) && (
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
              display: "block",
              marginTop: 16,
              marginBottom: 8,
            }}
          >
            Produit Ypersoa
          </label>
          <select
            value={produitId}
            onChange={(e) => setProduitId(e.target.value)}
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
            {(hubProduits.length
              ? sortByCatalogueOrder(hubProduits).map((p) => ({
                  id: p.id,
                  label: p.nom_commercial ?? PRODUIT_LABEL[p.id] ?? p.id,
                }))
              : PRODUITS_YP
            ).map((p) => (
              <option key={p.id} value={p.id}>
                {p.id} · {p.label}
              </option>
            ))}
          </select>
            </>
          )}

          {/* Référentiel motifs YPM — galerie visuelle cliquable */}
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
              justifyContent: "space-between",
              marginTop: 16,
              marginBottom: 8,
            }}
          >
            <span>Référentiel motifs YPM</span>
            {motifId && (
              <button
                type="button"
                onClick={() => setMotifId("")}
                style={{
                  border: "none",
                  background: "transparent",
                  fontFamily: "var(--font-sans)",
                  fontSize: 10,
                  color: "var(--hub-foreground)",
                  opacity: 0.5,
                  cursor: "pointer",
                  padding: "2px 6px",
                }}
              >
                Effacer
              </button>
            )}
          </label>
          {/* Grille 3 colonnes scrollable */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 5,
              maxHeight: 220,
              overflowY: "auto",
              border: "0.5px solid var(--hub-border)",
              borderRadius: 10,
              padding: 6,
              background: "var(--hub-bg)",
            }}
          >
            {motifsList.map((m) => {
              const active = motifId === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setMotifId(active ? "" : m.id)}
                  title={`${m.id} · ${m.nom}`}
                  style={{
                    padding: "5px 4px",
                    borderRadius: 7,
                    border: active
                      ? "1.5px solid var(--hub-foreground)"
                      : "0.5px solid transparent",
                    background: active ? "white" : "transparent",
                    cursor: "pointer",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 3,
                    transition: "all 120ms ease",
                  }}
                >
                  <div
                    style={{
                      width: 60,
                      height: 60,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: active ? "var(--hub-bg)" : "white",
                      borderRadius: 5,
                      overflow: "hidden",
                      border: "0.5px solid var(--hub-border)",
                    }}
                  >
                    {m.asset_principal ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={motifImageSrc(m.asset_principal, m.asset_principal_url)}
                        alt={m.nom}
                        style={{ maxWidth: "90%", maxHeight: "90%", objectFit: "contain" }}
                        onError={(e) => ((e.target as HTMLImageElement).style.opacity = "0.15")}
                      />
                    ) : (
                      <span style={{ fontSize: 20, opacity: 0.15 }}>✦</span>
                    )}
                  </div>
                  <span
                    style={{
                      fontFamily: "var(--font-sans)",
                      fontSize: 8,
                      color: "var(--hub-foreground)",
                      opacity: active ? 1 : 0.6,
                      fontWeight: active ? 700 : 400,
                      textAlign: "center",
                      lineHeight: 1.2,
                      width: "100%",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {m.nom}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Variantes du motif sélectionné — ex. "papa"/"maman"/"mariage" pour
              un même motif. motifSelected.variantes vient du référentiel réel,
              vide pour les motifs de secours (offline). */}
          {motifSelected && motifSelected.variantes.length > 0 && (
            <div style={{ marginTop: 10 }}>
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
                Variante — {motifSelected.variantes.length} disponible{motifSelected.variantes.length > 1 ? "s" : ""}
              </label>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                <button
                  type="button"
                  onClick={() => setVarianteFile(null)}
                  style={{
                    padding: "5px 10px",
                    borderRadius: 999,
                    fontFamily: "var(--font-sans)",
                    fontSize: 11,
                    fontWeight: varianteFile === null ? 700 : 400,
                    border: varianteFile === null ? "1.5px solid var(--hub-foreground)" : "0.5px solid var(--hub-border)",
                    background: varianteFile === null ? "white" : "transparent",
                    color: "var(--hub-foreground)",
                    cursor: "pointer",
                  }}
                >
                  Image principale
                </button>
                {motifSelected.variantes.map((v) => {
                  const active = varianteFile === v.file;
                  return (
                    <button
                      key={v.file}
                      type="button"
                      onClick={() => setVarianteFile(active ? null : v.file)}
                      title={v.label}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        padding: "4px 10px 4px 4px",
                        borderRadius: 999,
                        fontFamily: "var(--font-sans)",
                        fontSize: 11,
                        fontWeight: active ? 700 : 400,
                        border: active ? "1.5px solid var(--hub-foreground)" : "0.5px solid var(--hub-border)",
                        background: active ? "white" : "transparent",
                        color: "var(--hub-foreground)",
                        cursor: "pointer",
                      }}
                    >
                      <span
                        style={{
                          width: 22,
                          height: 22,
                          borderRadius: "50%",
                          overflow: "hidden",
                          background: "white",
                          border: "0.5px solid var(--hub-border)",
                          flex: "none",
                        }}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={motifImageSrc(v.file, v.url)}
                          alt=""
                          style={{ width: "100%", height: "100%", objectFit: "contain" }}
                          onError={(e) => ((e.target as HTMLImageElement).style.opacity = "0.15")}
                        />
                      </span>
                      {v.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* PNG motif — auto-injecté depuis Hub ou upload manuel (override) */}
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
            PNG référence Gemini
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
                  {motifPngIsHub ? "PNG Hub (auto-injecté depuis le référentiel)" : "PNG personnalisé · référence Gemini"}
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

          {/* Type de prise de vue : porté vs flatlay */}
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
            Type de prise de vue
          </label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4, padding: 4, background: "var(--hub-bg)", borderRadius: 10, border: "0.5px solid var(--hub-border)" }}>
            {([
              { v: "worn", label: "Porté", sub: "sur canonique" },
              { v: "flatlay", label: "Flatlay", sub: "mise à plat · pinterest" },
            ] as const).map((c) => {
              const active = composition === c.v;
              return (
                <button
                  key={c.v}
                  type="button"
                  onClick={() => setComposition(c.v)}
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
                  <span style={{ fontWeight: 600 }}>{c.label}</span>
                  <span style={{ fontSize: 9, opacity: 0.7 }}>{c.sub}</span>
                </button>
              );
            })}
          </div>
          {composition === "flatlay" && (
            <p style={{ fontFamily: "var(--font-sans)", fontSize: 10, opacity: 0.55, marginTop: 6, lineHeight: 1.4 }}>
              Mise à plat lifestyle sans personne : le casting proposé est ignoré, la scène est composée autour du produit + props chaleureux assortis à l&apos;ambiance.
            </p>
          )}

          {/* Taille du motif brodé — masquée si PNG fourni (Gemini hérite la taille du visuel) */}
          {!motifPngDataUrl ? (
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
            </>
          ) : (
            <p style={{ fontFamily: "var(--font-sans)", fontSize: 10, color: "var(--hub-teal)", marginTop: 6, marginBottom: 0, lineHeight: 1.4 }}>
              Taille héritée du PNG — Gemini respecte les proportions de l&apos;image fournie.
            </p>
          )}

          {(!motifPngDataUrl || productOverride) && (
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
              display: "block",
              marginTop: 16,
              marginBottom: 8,
            }}
          >
            Couleur du support
          </label>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {availableColors.length === 0 && (
              <span style={{ fontFamily: "var(--font-sans)", fontSize: 11, fontStyle: "italic", opacity: 0.5 }}>
                Chargement des couleurs…
              </span>
            )}
            {availableColors.map((c) => {
              const active = supportColor === c.id_palette;
              return (
                <button
                  key={c.id_palette}
                  type="button"
                  onClick={() => setSupportColor(c.id_palette)}
                  title={`${c.nom_ypersoa} · ${c.hex_palette_officiel}`}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "6px 10px",
                    borderRadius: 999,
                    border: active ? "1.5px solid var(--hub-foreground)" : "0.5px solid var(--hub-border)",
                    background: active ? "var(--hub-foreground)" : "white",
                    color: active ? "var(--hub-bg)" : "var(--hub-foreground)",
                    fontFamily: "var(--font-sans)",
                    fontSize: 11,
                    cursor: "pointer",
                  }}
                >
                  <span style={{
                    width: 14, height: 14, borderRadius: 999,
                    background: c.hex_palette_officiel,
                    border: "0.5px solid rgba(0,0,0,0.15)",
                    display: "inline-block",
                  }} />
                  {c.nom_ypersoa}
                </button>
              );
            })}
          </div>
          </>
          )}

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
                <Heart size={11} fill="var(--hub-accent)" stroke="var(--hub-accent)" /> Mes lookbooks (7j)
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
              background: "var(--hub-cta)",
              color: "#FAF7F2",
              fontFamily: "var(--font-sans)",
              fontSize: 13,
              fontWeight: 600,
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
                          background: "var(--hub-teal)",
                          color: "#FAF7F2",
                          fontFamily: "var(--font-sans)",
                          fontSize: 12,
                          fontWeight: 600,
                          letterSpacing: "0.04em",
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
                            border: "1px solid var(--hub-teal)",
                            background: "transparent",
                            color: "var(--hub-teal)",
                            fontFamily: "var(--font-sans)",
                            fontSize: 12,
                            fontWeight: 500,
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
                        {planableEntryId && renderedImage && (
                          <button
                            type="button"
                            onClick={() => sendToPlanable("hero", renderedImage.data_url, "Hero")}
                            disabled={sendingTo === "hero" || sentKeys["hero"]}
                            title="Attacher ce visuel à l'entrée Planable d'origine"
                            style={{
                              padding: "8px 14px", borderRadius: 999, border: "none",
                              background: sentKeys["hero"] ? "#2f7a3e" : "var(--brand-teal, #1E6E77)",
                              color: "white", fontFamily: "var(--font-sans)", fontSize: 12, fontWeight: 500,
                              cursor: sentKeys["hero"] ? "default" : "pointer",
                              display: "flex", alignItems: "center", gap: 6,
                              opacity: sendingTo === "hero" ? 0.6 : 1,
                            }}
                          >
                            {sendingTo === "hero" ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                            {sentKeys["hero"] ? "Envoyé ✓" : "Envoyer vers Planable"}
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {sendError && planableEntryId && (
                  <div style={{
                    padding: 10, borderRadius: 10, background: "#fff3f0",
                    border: "1px solid #ffcfb6", fontFamily: "var(--font-sans)",
                    fontSize: 12, color: "#a13a16",
                  }}>
                    Envoi Planable : {sendError}
                  </div>
                )}

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
                                border: img ? "1px solid var(--hub-teal)" : "none",
                                background: img ? "transparent" : "var(--hub-teal)",
                                color: img ? "var(--hub-teal)" : "#FAF7F2",
                                fontFamily: "var(--font-sans)",
                                fontSize: 11,
                                fontWeight: img ? 500 : 600,
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
                            {img && planableEntryId && (
                              <button
                                type="button"
                                onClick={() => sendToPlanable(`shot-${idx}`, img.data_url, s.angle)}
                                disabled={sendingTo === `shot-${idx}` || sentKeys[`shot-${idx}`]}
                                title="Attacher ce shot à l'entrée Planable d'origine"
                                style={{
                                  padding: "6px 12px", borderRadius: 999, border: "none",
                                  background: sentKeys[`shot-${idx}`] ? "#2f7a3e" : "var(--brand-teal, #1E6E77)",
                                  color: "white", fontFamily: "var(--font-sans)", fontSize: 11, fontWeight: 500,
                                  cursor: sentKeys[`shot-${idx}`] ? "default" : "pointer",
                                  display: "flex", alignItems: "center", gap: 4,
                                  opacity: sendingTo === `shot-${idx}` ? 0.6 : 1,
                                }}
                              >
                                {sendingTo === `shot-${idx}` ? <Loader2 size={11} className="animate-spin" /> : <Send size={11} />}
                                {sentKeys[`shot-${idx}`] ? "Envoyé ✓" : "→ Planable"}
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

              {/* Planifier dans Planable */}
              <section
                style={{
                  background: "color-mix(in srgb, var(--hub-teal) 8%, white)",
                  border: "0.5px solid color-mix(in srgb, var(--hub-teal) 35%, white)",
                  borderRadius: 16,
                  padding: 20,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                  <Calendar size={16} strokeWidth={1.6} color="var(--hub-teal)" />
                  <h3 style={{ fontFamily: "var(--font-editorial)", fontSize: 16, fontWeight: 500, margin: 0, color: "var(--hub-teal)" }}>
                    Planifier dans Planable
                  </h3>
                </div>
                {sbScheduled ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: "var(--font-sans)", fontSize: 13, color: "#3D7A3A" }}>
                    <CheckCircle2 size={16} />
                    Entrée créée dans Planable !
                    {planableUrl && (
                      <a
                        href={planableUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ marginLeft: "auto", color: "var(--hub-teal)", fontSize: 12, textDecoration: "underline" }}
                      >
                        Ouvrir Planable →
                      </a>
                    )}
                  </div>
                ) : (
                  <>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
                      <div>
                        <label style={planLabelStyle}>Date de publication</label>
                        <input
                          type="date"
                          value={sbSchedDate}
                          onChange={(e) => setSbSchedDate(e.target.value)}
                          style={planInputStyle}
                        />
                      </div>
                      <div>
                        <label style={planLabelStyle}>Heure</label>
                        <input
                          type="time"
                          value={sbSchedTime}
                          onChange={(e) => setSbSchedTime(e.target.value)}
                          style={planInputStyle}
                        />
                      </div>
                    </div>
                    {sbSchedError && (
                      <p style={{ fontFamily: "var(--font-sans)", fontSize: 11, color: "#a13a16", marginBottom: 8 }}>
                        ⚠ {sbSchedError}
                      </p>
                    )}
                    <p style={{ fontFamily: "var(--font-sans)", fontSize: 11, opacity: 0.6, margin: "0 0 10px", lineHeight: 1.4 }}>
                      {renderedImage || Object.keys(shotImages).length > 0
                        ? "Crée l'entrée Planable et y attache le visuel hero généré."
                        : "Crée l'entrée Planable (génère un visuel d'abord pour l'attacher)."}
                    </p>
                    <button
                      type="button"
                      onClick={handlePlanifyInPlanable}
                      disabled={sbScheduling}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        padding: "9px 18px",
                        borderRadius: 999,
                        border: "none",
                        background: sbScheduling ? "#aaa" : "var(--hub-teal)",
                        color: "white",
                        fontFamily: "var(--font-sans)",
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: sbScheduling ? "default" : "pointer",
                      }}
                    >
                      <Calendar size={13} />
                      {sbScheduling ? "Programmation…" : `Planifier pour le ${new Date(sbSchedDate + "T12:00:00").toLocaleDateString("fr-FR", { day: "2-digit", month: "long" })}`}
                    </button>
                  </>
                )}
              </section>

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

// ── Styles Planable scheduling ─────────────────────────────────────────────────
const planLabelStyle: React.CSSProperties = {
  fontFamily: "var(--font-sans)",
  fontSize: 9,
  fontWeight: 700,
  letterSpacing: 0.5,
  textTransform: "uppercase",
  color: "var(--hub-teal)",
  opacity: 0.7,
  display: "block",
  marginBottom: 3,
};

const planInputStyle: React.CSSProperties = {
  width: "100%",
  padding: "7px 10px",
  borderRadius: 8,
  border: "0.5px solid color-mix(in srgb, var(--hub-teal) 35%, white)",
  fontFamily: "var(--font-sans)",
  fontSize: 12,
  background: "white",
  color: "var(--hub-foreground)",
  boxSizing: "border-box",
};

export default function ShootingBookPage() {
  return (
    <Suspense fallback={null}>
      <ShootingBookContent />
    </Suspense>
  );
}
