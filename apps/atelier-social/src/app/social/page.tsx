"use client";

import { useState, useEffect } from "react";
import { ImageUploader } from "@/components/ImageUploader";
import { ImportedShotsPanel } from "@/components/ImportedShotsPanel";
import { MotifPickerPanel } from "@/components/MotifPickerPanel";
import { ProductColorPicker } from "@/components/ProductColorPicker";
import { SavePackDialog } from "@/components/SavePackDialog";
import { LibraryDrawer } from "@/components/LibraryDrawer";
import { isSupabaseConfigured } from "@/lib/supabase";
import { Heart, FolderOpen, X, Calendar, Layers, Trello, Newspaper, ChevronDown, MessageSquareQuote } from "lucide-react";
import { PostCard } from "@/components/PostCard";
import Link from "next/link";
import { VibeSelector, VIBES } from "@/components/VibeSelector";
import {
  ActiveLookbookAmbiance,
  buildVibePromptFromLookbook,
  listActiveLookbookAmbiances,
  LOOKBOOK_VIBE_PREFIX,
} from "@/lib/active-ambiances";
import { OccasionSelector, OCCASIONS } from "@/components/OccasionSelector";
import { CanoniqueSelector } from "@/components/CanoniqueSelector";
import { OverlayPanel } from "@/components/OverlayPanel";
import { generateImageVariation } from "@/lib/api-client";
import { CANONIQUES } from "@/lib/canoniques";
import {
  type PinterestStrategy,
  type PinterestFiche,
  type PinterestTagCategories,
  buildPinterestKeywords,
  defaultFicheForOccasion,
  suggestFichesForOccasion,
  getFiche,
  productNounFor,
} from "@/lib/pinterest-strategy";
import { type InstagramHashtagSlots } from "@/lib/instagram-hashtags";
import {
  Instagram,
  Pin,
  Sparkles,
  AlertCircle,
  Type,
  ImageIcon,
  Palette,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Markdown from "react-markdown";
import {
  Copy,
  Check,
  Download,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  ShieldCheck,
  Quote,
  Hash,
  FileText,
} from "lucide-react";

interface BrandViolation {
  term: string;
  position: number;
  severity: "critical" | "warning";
}

interface BrandSafety {
  safe: boolean;
  criticalViolations: BrandViolation[];
  warnings: BrandViolation[];
}

const HOOK_LABELS = ["Émotion", "Question", "POV", "Humour", "Affirmation"];

// Angles utilisés selon le nombre d'images souhaitées
const ALL_ANGLES = [
  "PORTRAIT FRONTAL : Head and shoulders shot, looking directly into the camera lens with a warm, genuine, deeply human smile. Eyes connect with the viewer. Natural three-quarter face composition. The embroidered detail on the garment is visible at the bottom of the frame. This is the stop-scroll image — must communicate immediate emotional warmth.",
  "DEMI-FIGURE 3/4 : Medium shot framed from the top of the head to mid-torso, slight 3/4 angle (slightly turned to one side, not pure front). The embroidered design on the left chest is sharp, well-lit, and clearly visible — this is THE shot where the motif gets its moment. The face remains visible (at least 2/3) with a calm, confident, slightly half-smiling expression. Composition: rule of thirds, embroidery in the lower third.",
  "DÉTAIL INTIMISTE : Close-up shot focused on the embroidered design, but ALWAYS including a fragment of human presence — a hand gently touching the fabric, fingers grazing the embroidery, a partial chin or cheek visible at the edge of the frame, a glimpse of hair. NEVER a pure flat lay or product shot. The texture of the thread, the depth of the embroidery, the weave of the fabric must be tangible. Macro film grain feel. This conveys 'I want to touch this'.",
  "SCÈNE NARRATIVE : Medium shot capturing a candid everyday moment — the person doing something simple and authentic: holding a coffee cup, adjusting their collar with one hand, looking thoughtfully out a window, walking with a slight movement, tying their hair back, reaching for a book. The person is NOT posing for the camera — they are caught in a moment. Cinematic still feel. The garment with embroidery is naturally part of the scene, not the focal point. This conveys 'this is my life, this piece is part of it'.",
  "LIFESTYLE WIDE : Wide environmental shot, person in full body or 3/4 length, integrated naturally into a rich context that matches the vibe (interior, exterior, garden, café, atelier — coherent with the chosen ambiance). Architecture, light, materials, plants — the environment breathes around the person. The garment is visible but integrated, not centered. The person looks at ease, at home in this space. This conveys 'I see myself living here, wearing this'. Composition: golden ratio.",
];

// Pour Pinterest : 3 angles best-performers (DEMI-FIGURE, SCÈNE NARRATIVE, LIFESTYLE WIDE)
// Format vertical 2:3 → on privilégie les compositions full body
const PINTEREST_ANGLES = [
  "DEMI-FIGURE 3/4 VERTICAL : Vertical 2:3 composition. Person framed from the top of the head to lower torso/hip level. Slight 3/4 angle. The embroidered design on the left chest is sharp, well-lit, clearly visible. Face visible with a calm, confident, slightly half-smiling expression. Composition optimized for Pinterest vertical format.",
  "SCÈNE NARRATIVE VERTICAL : Vertical 2:3 composition. Person in a candid everyday moment, half-body or 3/4 length view. Cinematic still feel. The embroidered garment is naturally part of the scene. Pinterest aspirational mood-board aesthetic.",
  "LIFESTYLE WIDE VERTICAL : Vertical 2:3 composition. Person in full body, integrated naturally into a rich environment. The environment breathes around the person. Vertical format perfect for Pinterest pin. Aspirational lifestyle composition.",
];

// Mode "J'ai déjà mon visuel" : types de contenu proposés (contexte pour l'IA).
const CONTENT_TYPES = [
  { id: "post-photo", label: "Post photo" },
  { id: "carrousel", label: "Carrousel" },
  { id: "story-reel", label: "Story / Reel" },
  { id: "flatlay", label: "Flatlay / packshot produit" },
  { id: "lifestyle", label: "Lifestyle / scène de vie" },
  { id: "citation", label: "Citation / texte sur visuel" },
];

export default function Home() {
  // Mode de la page : "full" = générer visuels + texte (historique),
  // "copyOnly" = visuel déjà fait, on génère seulement description + tags.
  const [mode, setMode] = useState<"full" | "copyOnly">("full");
  const [contentType, setContentType] = useState<string>(CONTENT_TYPES[0].id);
  const [postDate, setPostDate] = useState<string>("");

  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [customPrompt, setCustomPrompt] = useState("");
  const [selectedVibe, setSelectedVibe] = useState<string>(VIBES[0].id);
  const [activeAmbiances, setActiveAmbiances] = useState<ActiveLookbookAmbiance[]>([]);
  useEffect(() => {
    listActiveLookbookAmbiances().then(setActiveAmbiances).catch(() => undefined);
  }, []);
  const [selectedOccasion, setSelectedOccasion] = useState<string>(OCCASIONS[0].id);
  const [selectedPlatform, setSelectedPlatform] = useState<"instagram" | "pinterest">("instagram");
  const [selectedCanoniqueIds, setSelectedCanoniqueIds] = useState<string[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<string>("YP001");
  const [selectedGarmentColor, setSelectedGarmentColor] = useState<string>("beige");
  const [withOverlay, setWithOverlay] = useState(false);

  // Stratégie Pinterest (fiches motifs, formats, ancres, mapping occasions)
  const [pinterestStrategy, setPinterestStrategy] = useState<PinterestStrategy | null>(null);
  const [selectedFicheId, setSelectedFicheId] = useState<string>("");
  useEffect(() => {
    fetch("/api/social/pinterest-strategy", { cache: "no-store" })
      .then((r) => r.json())
      .then((res) => {
        if (res.ok) setPinterestStrategy(res.data as PinterestStrategy);
      })
      .catch(() => undefined);
  }, []);

  // Auto-suggestion : quand l'occasion change (ou au chargement), propose la fiche
  // recommandée pour cette occasion. Ne touche pas à un choix manuel encore valide.
  useEffect(() => {
    if (!pinterestStrategy || selectedPlatform !== "pinterest") return;
    const suggestions = suggestFichesForOccasion(pinterestStrategy, selectedOccasion);
    const stillValid = selectedFicheId && suggestions.some((f) => f.id === selectedFicheId);
    if (!stillValid) {
      const def = defaultFicheForOccasion(pinterestStrategy, selectedOccasion);
      if (def) setSelectedFicheId(def.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pinterestStrategy, selectedPlatform, selectedOccasion]);

  const [generatedImages, setGeneratedImages] = useState<string[]>([]);
  const [generatedText, setGeneratedText] = useState<string | null>(null);
  const [generatedHooks, setGeneratedHooks] = useState<string[]>([]);
  const [instagramHashtags, setInstagramHashtags] = useState<string[]>([]);
  const [instagramHashtagSlots, setInstagramHashtagSlots] =
    useState<InstagramHashtagSlots | null>(null);
  // Pinterest spécifique
  const [pinterestTitle, setPinterestTitle] = useState<string>("");
  const [pinterestDescription, setPinterestDescription] = useState<string>("");
  const [pinterestTags, setPinterestTags] = useState<string[]>([]);
  const [pinterestTagCategories, setPinterestTagCategories] =
    useState<PinterestTagCategories | null>(null);
  const [brandSafety, setBrandSafety] = useState<BrandSafety | null>(null);
  const [currentSlide, setCurrentSlide] = useState(0);

  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [isGeneratingText, setIsGeneratingText] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copyNotice, setCopyNotice] = useState<string | null>(null);

  const [rightPanelTab, setRightPanelTab] = useState<"text" | "overlay">("text");
  const [ficheOpen, setFicheOpen] = useState(false);

  // Hub : Sauvegarde des packs RS dans Supabase + bibliothèque collections.
  const supabaseOn = isSupabaseConfigured();
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [librarySaveBump, setLibrarySaveBump] = useState(0);
  const [savedPackId, setSavedPackId] = useState<string | null>(null);
  // Best slides marquées dans le carrousel courant — persisté en notes au save.
  const [bestSlideIndices, setBestSlideIndices] = useState<Set<number>>(new Set());
  const [contextDropdownOpen, setContextDropdownOpen] = useState(false);

  const handleToggleBestSlide = (idx: number) => {
    setBestSlideIndices((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const handleRemoveSlide = (idx: number) => {
    setGeneratedImages((prev) => prev.filter((_, i) => i !== idx));
    setBestSlideIndices((prev) => {
      const next = new Set<number>();
      prev.forEach((b) => {
        if (b < idx) next.add(b);
        else if (b > idx) next.add(b - 1);
      });
      return next;
    });
    setCurrentSlide((cur) => {
      if (cur >= generatedImages.length - 1) return Math.max(0, generatedImages.length - 2);
      return cur > idx ? cur - 1 : cur;
    });
  };

  const canSavePack =
    supabaseOn &&
    generatedImages.length > 0 &&
    !isGeneratingImage &&
    !isGeneratingText;

  const buildSavePayload = () => {
    const captionHooks = HOOK_LABELS.reduce<Record<string, string>>((acc, lbl, i) => {
      if (generatedHooks[i]) acc[lbl.toLowerCase()] = generatedHooks[i];
      return acc;
    }, {});
    const dateLabel = new Date().toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
    const platformLabel = selectedPlatform === "instagram" ? "Insta" : "Pinterest";
    return {
      platform: selectedPlatform,
      imageDataUrls: generatedImages,
      captionText: generatedText,
      captionHooks: Object.keys(captionHooks).length > 0 ? captionHooks : null,
      pinterestTitle: pinterestTitle || null,
      pinterestDescription: pinterestDescription || null,
      pinterestTags,
      brandSafety,
      vibeId: selectedVibe,
      occasionId: selectedOccasion,
      canoniqueIds: selectedCanoniqueIds,
      customPrompt: customPrompt || null,
      withOverlay,
      sourceShotId: null,
      suggestedTitle: `${platformLabel} — ${dateLabel}`,
    };
  };

  const handleImageSelected = (file: File, base64: string) => {
    setSelectedFile(file);
    setSelectedImage(base64);
    setGeneratedImages([]);
    setGeneratedText(null);
    setGeneratedHooks([]);
    setInstagramHashtags([]);
    setInstagramHashtagSlots(null);
    setPinterestTitle("");
    setPinterestDescription("");
    setPinterestTags([]);
    setPinterestTagCategories(null);
    setBrandSafety(null);
    setError(null);
  };

  const buildCanoniqueContext = (): string => {
    if (selectedCanoniqueIds.length === 0) return "";
    const canoniques = selectedCanoniqueIds
      .map((id) => CANONIQUES.find((c) => c.id === id))
      .filter((c): c is NonNullable<typeof c> => Boolean(c));
    return `Personnages canoniques utilisés dans les visuels : ${canoniques
      .map((c) => `${c.prenom} (${c.age} ans, ${c.description})`)
      .join(" | ")}.`;
  };

  const handleGenerate = async () => {
    if (!selectedImage || !selectedFile) return;
    setError(null);
    setCopyNotice(null);
    setIsGeneratingImage(true);
    setIsGeneratingText(true);
    setBrandSafety(null);
    setGeneratedHooks([]);
    setInstagramHashtags([]);
    setInstagramHashtagSlots(null);
    setPinterestTitle("");
    setPinterestDescription("");
    setPinterestTags([]);
    setPinterestTagCategories(null);
    setCurrentSlide(0);
    setBestSlideIndices(new Set());
    setSavedPackId(null);

    let vibePrompt = VIBES.find((v) => v.id === selectedVibe)?.prompt || "";
    let vibeLabel = VIBES.find((v) => v.id === selectedVibe)?.label || "";
    if (selectedVibe.startsWith(LOOKBOOK_VIBE_PREFIX)) {
      const lbId = selectedVibe.slice(LOOKBOOK_VIBE_PREFIX.length);
      const lb = activeAmbiances.find((a) => a.id === lbId);
      if (lb) {
        vibePrompt = buildVibePromptFromLookbook(lb);
        vibeLabel = `Lookbook : ${lb.titre}`;
      }
    }
    const occasionContext = OCCASIONS.find((o) => o.id === selectedOccasion)?.context || "";
    const mimeType = selectedFile.type;
    const base64Data = selectedImage.split(",")[1];
    const canoniqueContext = buildCanoniqueContext();

    // Logique format & angles
    const isPinterest = selectedPlatform === "pinterest";
    let aspectRatio: "1:1" | "4:5" | "2:3";
    // Chaque "job" image porte son propre cadrage + composition (flatlay / porté) + format Pinterest.
    type PinFormat = "hero" | "desir" | "association" | "lifestyle";
    type ImageJob = {
      angle: string;
      composition: "flatlay" | "worn";
      canoniqueIds: string[];
      pinterestFormat?: PinFormat;
    };
    let imageJobs: ImageJob[];

    if (isPinterest) {
      aspectRatio = "2:3"; // 2:3 vertical systématique (1000×1500)
      const fiche =
        pinterestStrategy && selectedFicheId
          ? getFiche(pinterestStrategy, selectedFicheId)
          : undefined;
      const fmts = pinterestStrategy?.formats;
      const motifHint = fiche ? ` Motif intention: ${fiche.intention}.` : "";
      const heroHint = fiche ? `${motifHint} Styling hint: ${fiche.format_hero_hint}.` : "";
      // 4 formats clients : Hero détail (flatlay) · Désir porté serré · Association
      // (flatlay groupé multi-couleurs) · Lifestyle scène.
      imageJobs = [
        {
          angle: (fmts?.hero.prompt ?? PINTEREST_ANGLES[0]) + heroHint,
          composition: "flatlay",
          canoniqueIds: [],
          pinterestFormat: "hero",
        },
        {
          angle: (fmts?.desir.prompt ?? PINTEREST_ANGLES[1]) + motifHint,
          composition: "worn",
          canoniqueIds: selectedCanoniqueIds,
          pinterestFormat: "desir",
        },
        {
          angle: (fmts?.association.prompt ?? PINTEREST_ANGLES[0]) + motifHint,
          composition: "flatlay",
          canoniqueIds: [],
          pinterestFormat: "association",
        },
        {
          angle: (fmts?.lifestyle.prompt ?? PINTEREST_ANGLES[2]) + motifHint,
          composition: "worn",
          canoniqueIds: selectedCanoniqueIds,
          pinterestFormat: "lifestyle",
        },
      ];
    } else if (withOverlay) {
      aspectRatio = "4:5"; // Insta + overlay
      imageJobs = ALL_ANGLES.map((a) => ({
        angle: a,
        composition: "worn" as const,
        canoniqueIds: selectedCanoniqueIds,
      }));
    } else {
      aspectRatio = "1:1"; // Insta classique
      imageJobs = ALL_ANGLES.map((a) => ({
        angle: a,
        composition: "worn" as const,
        canoniqueIds: selectedCanoniqueIds,
      }));
    }

    console.log(
      `[FRONT] Mode: ${isPinterest ? "Pinterest" : "Instagram"} | aspectRatio: ${aspectRatio} | jobs: ${imageJobs.length}`
    );

    try {
      const textPromise = fetch("/api/generate-copy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          base64Image: base64Data,
          mimeType,
          platform: selectedPlatform,
          vibeLabel,
          occasionContext,
          customPrompt,
          canoniqueContext,
          pinterestFicheId: isPinterest ? selectedFicheId : undefined,
          occasionId: selectedOccasion,
          productId: selectedProduct,
        }),
      });

      const successfulImages: string[] = [];
      for (const job of imageJobs) {
        try {
          const img = await generateImageVariation({
            base64Image: base64Data,
            mimeType,
            vibePrompt,
            angle: job.angle,
            customPrompt,
            canoniqueIds: job.canoniqueIds,
            aspectRatio,
            composition: job.composition,
            selectedProduct,
            selectedGarmentColor,
            pinterestFormat: job.pinterestFormat,
          });
          successfulImages.push(img);
          setGeneratedImages([...successfulImages]);
        } catch (e) {
          console.error("Failed to generate image for job:", job.angle.substring(0, 60), e);
        }
      }

      if (successfulImages.length === 0) {
        setError("Impossible de générer les images. Réessaie.");
      }

      try {
        const textResponse = await textPromise;
        if (!textResponse.ok) {
          const errorData = await textResponse.json().catch(() => ({}));
          throw new Error(errorData.message || "Copy generation failed");
        }
        const data = await textResponse.json();

        if (data.platform === "pinterest") {
          setPinterestTitle(data.title || "");
          setPinterestDescription(data.description || "");
          setPinterestTags(data.tags || []);
          setPinterestTagCategories(data.tagCategories || null);
          setGeneratedText(data.text); // Combined version pour fallback
        } else {
          setGeneratedText(data.text);
          setInstagramHashtags(data.hashtags || []);
          setInstagramHashtagSlots(data.hashtagSlots || null);
        }

        if (data.brandSafety) setBrandSafety(data.brandSafety);
        if (data.notice) setCopyNotice(data.notice);
        if (data.hooks) {
          setGeneratedHooks(data.hooks);
          if (withOverlay) {
            setTimeout(() => setRightPanelTab("overlay"), 500);
          }
        }
      } catch (e) {
        console.error("Text generation failed:", e);
        setError((prev) =>
          prev ? prev + " Impossible de générer le texte." : "Impossible de générer le texte."
        );
      }
    } catch (err) {
      console.error(err);
      setError("Une erreur inattendue s'est produite.");
    } finally {
      setIsGeneratingImage(false);
      setIsGeneratingText(false);
    }
  };

  // Mode "J'ai déjà mon visuel" : on saute toute la génération d'image et on
  // ne lance QUE la copy (description + tags) sur le visuel déposé tel quel.
  const handleGenerateCopyOnly = async () => {
    if (!selectedImage || !selectedFile) return;
    setError(null);
    setCopyNotice(null);
    setIsGeneratingText(true);
    setBrandSafety(null);
    setGeneratedHooks([]);
    setInstagramHashtags([]);
    setInstagramHashtagSlots(null);
    setPinterestTitle("");
    setPinterestDescription("");
    setPinterestTags([]);
    setPinterestTagCategories(null);
    setSavedPackId(null);
    // Le visuel déposé devient l'unique "slide" (aperçu gauche + sauvegarde).
    setGeneratedImages([selectedImage]);
    setCurrentSlide(0);
    setBestSlideIndices(new Set());
    setRightPanelTab("text");

    const occasionContext = OCCASIONS.find((o) => o.id === selectedOccasion)?.context || "";
    const mimeType = selectedFile.type;
    const base64Data = selectedImage.split(",")[1];
    const isPinterest = selectedPlatform === "pinterest";

    const contentTypeLabel = CONTENT_TYPES.find((c) => c.id === contentType)?.label || "";
    const dateLabel = postDate
      ? new Date(postDate).toLocaleDateString("fr-FR", {
          day: "2-digit",
          month: "long",
          year: "numeric",
        })
      : "";
    // On enrichit la vision avec le briefing du mode copy-only : c'est un contenu
    // DÉJÀ créé (à décrire fidèlement), son type, et sa période de publication.
    const augmentedPrompt = [
      "Le visuel fourni est un contenu DÉJÀ CRÉÉ par l'équipe Ypersoa : décris fidèlement ce que tu vois (motif brodé, support, couleurs, scène), ne l'imagine pas et n'invente pas un autre produit.",
      contentTypeLabel ? `Type de contenu : ${contentTypeLabel}.` : "",
      dateLabel ? `Publication prévue le ${dateLabel} — adapte la saisonnalité et les mots-clés en conséquence.` : "",
      customPrompt ? `Contexte ajouté : ${customPrompt}` : "",
    ]
      .filter(Boolean)
      .join(" ");

    try {
      const res = await fetch("/api/generate-copy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          base64Image: base64Data,
          mimeType,
          platform: selectedPlatform,
          vibeLabel: contentTypeLabel || "Contenu déjà créé",
          occasionContext,
          customPrompt: augmentedPrompt,
          pinterestFicheId: isPinterest ? selectedFicheId : undefined,
          occasionId: selectedOccasion,
          // Pas de productId : on laisse l'IA décrire le vêtement réellement visible.
        }),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || "Copy generation failed");
      }
      const data = await res.json();
      if (data.platform === "pinterest") {
        setPinterestTitle(data.title || "");
        setPinterestDescription(data.description || "");
        setPinterestTags(data.tags || []);
        setPinterestTagCategories(data.tagCategories || null);
        setGeneratedText(data.text);
      } else {
        setGeneratedText(data.text);
        setInstagramHashtags(data.hashtags || []);
        setInstagramHashtagSlots(data.hashtagSlots || null);
      }
      if (data.brandSafety) setBrandSafety(data.brandSafety);
      if (data.notice) setCopyNotice(data.notice);
      if (data.hooks) setGeneratedHooks(data.hooks);
    } catch (e) {
      console.error("Copy-only generation failed:", e);
      setError("Impossible de générer le texte. Réessaie.");
    } finally {
      setIsGeneratingText(false);
    }
  };

  // Bascule de mode : on repart propre (résultats + onglet texte).
  const switchMode = (m: "full" | "copyOnly") => {
    if (m === mode) return;
    setMode(m);
    setRightPanelTab("text");
    setGeneratedImages([]);
    setGeneratedText(null);
    setGeneratedHooks([]);
    setInstagramHashtags([]);
    setInstagramHashtagSlots(null);
    setPinterestTitle("");
    setPinterestDescription("");
    setPinterestTags([]);
    setPinterestTagCategories(null);
    setBrandSafety(null);
    setError(null);
    setCopyNotice(null);
    setSavedPackId(null);
    if (m === "copyOnly") setWithOverlay(false);
  };

  const expectedImages = mode === "copyOnly" ? 1 : selectedPlatform === "pinterest" ? 4 : 5;

  // Labels affichés dans le dropdown Contexte du header
  const currentVibeLabel = (() => {
    if (selectedVibe.startsWith(LOOKBOOK_VIBE_PREFIX)) {
      const lbId = selectedVibe.slice(LOOKBOOK_VIBE_PREFIX.length);
      const lb = activeAmbiances.find((a) => a.id === lbId);
      return lb ? lb.titre : "Lookbook";
    }
    return VIBES.find((v) => v.id === selectedVibe)?.label || selectedVibe;
  })();
  const currentOccasionLabel = selectedOccasion
    .replace(/-/g, " ")
    .replace(/\b\w/g, (l) => l.toUpperCase());

  // Dérivés Pinterest : fiche sélectionnée, mots-clés, texte de surimpression
  const selectedFiche: PinterestFiche | undefined =
    pinterestStrategy && selectedFicheId ? getFiche(pinterestStrategy, selectedFicheId) : undefined;
  const pinterestKeywords =
    pinterestStrategy && selectedFiche
      ? buildPinterestKeywords(
          pinterestStrategy,
          selectedFiche.id,
          selectedOccasion,
          productNounFor(selectedProduct)
        )
      : null;
  // Surimpression adaptée au produit réel (ex. « Ta casquette… » → « Ton sweat… » si hoodie).
  const surimpressionText = pinterestKeywords?.surimpression ?? selectedFiche?.texte_surimpression ?? "";
  const suggestedFiches = pinterestStrategy
    ? suggestFichesForOccasion(pinterestStrategy, selectedOccasion)
    : [];
  const otherFiches = pinterestStrategy
    ? pinterestStrategy.fiches.filter((f) => !suggestedFiches.some((s) => s.id === f.id))
    : [];

  return (
    <div className="h-screen flex flex-col bg-brand-bg text-brand-text font-sans selection:bg-brand-rose/20 selection:text-brand-rose overflow-hidden">
      <header className="h-14 w-full bg-white/80 backdrop-blur-md border-b border-brand-muted/10 shrink-0">
        <div className="max-w-[1920px] mx-auto px-6 h-full flex items-center justify-between">
          <div className="flex items-center gap-5">
            <h1
              style={{
                fontFamily: "var(--font-editorial)",
                fontSize: 24,
                fontWeight: 500,
                letterSpacing: "-0.01em",
                color: "var(--hub-foreground)",
                lineHeight: 1,
                margin: 0,
              }}
            >
              Atelier Social
            </h1>

            {/* Toggle de mode : générer un visuel vs. visuel déjà créé */}
            <div className="flex items-center bg-brand-muted/10 rounded-full p-0.5 border border-brand-muted/15">
              <button
                type="button"
                onClick={() => switchMode("full")}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all",
                  mode === "full"
                    ? "bg-white text-brand-rose shadow-sm"
                    : "text-brand-muted hover:text-brand-text"
                )}
                title="Générer les visuels + la description + les tags"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Générer un visuel
              </button>
              <button
                type="button"
                onClick={() => switchMode("copyOnly")}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all",
                  mode === "copyOnly"
                    ? "bg-white text-brand-rose shadow-sm"
                    : "text-brand-muted hover:text-brand-text"
                )}
                title="J'ai déjà mon visuel — génère juste la description + les tags"
              >
                <FileText className="w-3.5 h-3.5" />
                J&apos;ai déjà mon visuel
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Dropdown Contexte — accès rapide Ambiance + Occasion */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setContextDropdownOpen((o) => !o)}
                className="flex items-center gap-1.5 text-xs font-medium text-brand-text hover:bg-brand-muted/10 px-3 py-1.5 rounded-full border border-brand-muted/20 transition-all"
                title="Changer l'ambiance et l'occasion"
              >
                <span className="text-brand-muted text-[11px] shrink-0">Contexte</span>
                <span className="font-semibold truncate max-w-[180px]">
                  {currentVibeLabel} · {currentOccasionLabel}
                </span>
                <ChevronDown
                  className={cn(
                    "w-3 h-3 text-brand-muted transition-transform shrink-0",
                    contextDropdownOpen && "rotate-180"
                  )}
                />
              </button>
              {contextDropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setContextDropdownOpen(false)}
                  />
                  <div className="absolute right-0 top-full mt-2 z-50 bg-white rounded-2xl shadow-xl border border-brand-muted/10 p-4 w-72 space-y-3">
                    <div>
                      <label className="text-[10px] font-semibold uppercase tracking-wider text-brand-muted block mb-1.5">
                        Ambiance
                      </label>
                      <select
                        value={selectedVibe}
                        onChange={(e) => setSelectedVibe(e.target.value)}
                        className="w-full p-2 rounded-lg border border-brand-muted/20 bg-white text-xs focus:outline-none focus:ring-1 focus:ring-brand-rose/50"
                      >
                        {VIBES.map((v) => (
                          <option key={v.id} value={v.id}>
                            {v.label}
                          </option>
                        ))}
                        {activeAmbiances.length > 0 && (
                          <>
                            <option disabled>──────</option>
                            {activeAmbiances.map((a) => (
                              <option
                                key={a.id}
                                value={`${LOOKBOOK_VIBE_PREFIX}${a.id}`}
                              >
                                ❤️ {a.titre}
                              </option>
                            ))}
                          </>
                        )}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold uppercase tracking-wider text-brand-muted block mb-1.5">
                        Occasion
                      </label>
                      <select
                        value={selectedOccasion}
                        onChange={(e) => setSelectedOccasion(e.target.value)}
                        className="w-full p-2 rounded-lg border border-brand-muted/20 bg-white text-xs focus:outline-none focus:ring-1 focus:ring-brand-rose/50"
                      >
                        {OCCASIONS.map((o) => (
                          <option key={o.id} value={o.id}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </>
              )}
            </div>

            {(isGeneratingImage || isGeneratingText) && (
              <div className="flex items-center gap-2 text-xs text-brand-muted">
                <div className="w-3 h-3 border-2 border-brand-rose/30 border-t-brand-rose rounded-full animate-spin" />
                <span>
                  {isGeneratingImage && generatedImages.length > 0
                    ? `${generatedImages.length}/${expectedImages} images...`
                    : "Création en cours..."}
                </span>
              </div>
            )}
            <Link
              href="/social/kanban"
              className="flex items-center gap-1.5 text-xs font-semibold text-brand-text hover:bg-brand-muted/10 px-3 py-1.5 rounded-full border border-brand-muted/20 transition-all"
              title="Kanban projets sociaux — Concept / Shooting / À filmer / Production / Publié"
            >
              <Trello className="w-3.5 h-3.5" />
              Projets
            </Link>
            <Link
              href="/atelier-da/motifs"
              className="flex items-center gap-1.5 text-xs font-semibold text-brand-text hover:bg-brand-muted/10 px-3 py-1.5 rounded-full border border-brand-muted/20 transition-all"
              title="Catalogue motifs YPM filtrable par destinataire / occasion / produit"
            >
              <Layers className="w-3.5 h-3.5" />
              Catalogue motifs
            </Link>
            <Link
              href="/social/fonds"
              className="flex items-center gap-1.5 text-xs font-semibold text-brand-text hover:bg-brand-muted/10 px-3 py-1.5 rounded-full border border-brand-muted/20 transition-all"
              title="Générateur de fonds de posts + recoloration de motifs SVG sur ta palette"
            >
              <Palette className="w-3.5 h-3.5" />
              Fonds
            </Link>
            <Link
              href="/social/avis"
              className="flex items-center gap-1.5 text-xs font-semibold text-brand-text hover:bg-brand-muted/10 px-3 py-1.5 rounded-full border border-brand-muted/20 transition-all"
              title="Générateur de légende Instagram à partir d'un avis client"
            >
              <MessageSquareQuote className="w-3.5 h-3.5" />
              Avis
            </Link>
            <Link
              href="/social/connexion"
              className="flex items-center gap-1.5 text-xs font-semibold text-brand-text hover:bg-brand-muted/10 px-3 py-1.5 rounded-full border border-brand-muted/20 transition-all"
              title="Générateur de posts « Pourquoi Ypersoa » — pilier connexion"
            >
              <Heart className="w-3.5 h-3.5" />
              Connexion
            </Link>
            <a
              href={process.env.NEXT_PUBLIC_PLANABLE_URL ?? "http://localhost:3002"}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 text-xs font-semibold text-brand-text hover:bg-brand-muted/10 px-3 py-1.5 rounded-full border border-brand-muted/20 transition-all"
              title="Planable — calendrier éditorial Insta/Pinterest"
            >
              <Calendar className="w-3.5 h-3.5" />
              Planable
            </a>
            {supabaseOn && (
              <button
                onClick={() => setLibraryOpen(true)}
                className="flex items-center gap-1.5 text-xs font-semibold text-brand-rose hover:bg-brand-rose/10 px-3 py-1.5 rounded-full border border-brand-rose/20 transition-all"
                title="Bibliothèque des publications sauvegardées"
              >
                <FolderOpen className="w-3.5 h-3.5" />
                Bibliothèque
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-[1920px] w-full mx-auto px-4 py-3 min-h-0 overflow-hidden">
        <div className="grid grid-cols-12 gap-4 h-full">
          {/* COLONNE 1 — CONFIG */}
          <div className="col-span-12 lg:col-span-4 flex flex-col h-full min-h-0 bg-white/30 rounded-2xl">
            <div className="flex-1 min-h-0 overflow-y-auto visible-scrollbar p-3 space-y-3">
              {/* MODE "J'AI DÉJÀ MON VISUEL" — dépose + type de contenu + période */}
              {mode === "copyOnly" && (
                <>
                  <section>
                    <h2 className="font-serif text-sm font-medium mb-1">1. Ton visuel</h2>
                    <p className="text-[11px] text-brand-muted mb-1.5">
                      Dépose le post que tu as déjà créé. L&apos;IA l&apos;analyse pour écrire la
                      description et les tags.
                    </p>
                    <div className="h-40 max-h-40 overflow-hidden rounded-xl">
                      <ImageUploader
                        selectedImage={selectedImage}
                        onImageSelected={handleImageSelected}
                      />
                    </div>
                  </section>

                  <section>
                    <h2 className="font-serif text-sm font-medium mb-1">2. Type de contenu</h2>
                    <select
                      value={contentType}
                      onChange={(e) => setContentType(e.target.value)}
                      className="w-full p-2 rounded-lg border border-brand-muted/20 bg-white text-xs focus:outline-none focus:ring-1 focus:ring-brand-rose/50"
                    >
                      {CONTENT_TYPES.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </section>

                  <section>
                    <h2 className="font-serif text-sm font-medium mb-1 flex items-center gap-1.5">
                      3. Période de publication
                      <span className="text-[10px] font-normal text-brand-muted italic">— optionnel</span>
                    </h2>
                    <input
                      type="date"
                      value={postDate}
                      onChange={(e) => setPostDate(e.target.value)}
                      className="w-full p-2 rounded-lg border border-brand-muted/20 bg-white text-xs text-brand-text focus:outline-none focus:ring-1 focus:ring-brand-rose/50"
                    />
                    <p className="text-[10px] text-brand-muted mt-1 italic">
                      Aide l&apos;IA à coller à la saison / au marronnier.
                    </p>
                  </section>

                  <section>
                    <h2 className="font-serif text-sm font-medium mb-1 flex items-center gap-1.5">
                      4. Contexte
                      <span className="text-[10px] font-normal text-brand-muted italic">— optionnel</span>
                    </h2>
                    <textarea
                      value={customPrompt}
                      onChange={(e) => setCustomPrompt(e.target.value)}
                      placeholder="Précise le message, l'angle, le destinataire… (facultatif)"
                      className="w-full p-2 rounded-lg border border-brand-muted/20 bg-white focus:outline-none focus:ring-1 focus:ring-brand-rose/50 resize-none h-14 text-xs text-brand-text placeholder:text-brand-muted/50"
                    />
                  </section>
                </>
              )}

              <section className={cn(mode !== "full" && "hidden")}>
                <h2 className="font-serif text-sm font-medium mb-1 text-brand-text flex items-center gap-1.5">
                  1. Ta vision
                  <span className="text-[10px] font-normal text-brand-muted italic">— optionnel</span>
                </h2>
                <textarea
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  placeholder="Décris le contenu que tu imagines… (laisser vide pour génération libre)"
                  className="w-full p-2 rounded-lg border border-brand-muted/20 bg-white focus:outline-none focus:ring-1 focus:ring-brand-rose/50 resize-none h-14 text-xs text-brand-text placeholder:text-brand-muted/50"
                />
              </section>

              <section className={cn(mode !== "full" && "hidden")}>
                <h2 className="font-serif text-sm font-medium mb-1">2. Ton produit</h2>
                <ImportedShotsPanel onImport={handleImageSelected} />
                <MotifPickerPanel onImport={handleImageSelected} />
                <div className="h-28 max-h-28 overflow-hidden rounded-xl">
                  <ImageUploader
                    selectedImage={selectedImage}
                    onImageSelected={handleImageSelected}
                  />
                </div>
                <div className="mt-3">
                  <ProductColorPicker
                    productId={selectedProduct}
                    garmentColorId={selectedGarmentColor}
                    onChange={(p, g) => {
                      setSelectedProduct(p);
                      setSelectedGarmentColor(g);
                    }}
                  />
                </div>
              </section>

              <section className={cn(mode !== "full" && "hidden")}>
                <h2 className="font-serif text-sm font-medium mb-1">3. Tes mannequins</h2>
                <CanoniqueSelector
                  selectedIds={selectedCanoniqueIds}
                  onChange={setSelectedCanoniqueIds}
                  maxSelection={3}
                />
              </section>

              <section className={cn(mode !== "full" && "hidden")}>
                <h2 className="font-serif text-sm font-medium mb-1">4. L&apos;ambiance</h2>
                <VibeSelector selectedVibe={selectedVibe} onSelectVibe={setSelectedVibe} />
              </section>

              <section>
                <h2 className="font-serif text-sm font-medium mb-1">5. L&apos;occasion</h2>
                <OccasionSelector
                  selectedOccasion={selectedOccasion}
                  onSelectOccasion={setSelectedOccasion}
                />
              </section>

              {selectedPlatform === "pinterest" && pinterestStrategy && (
                <section>
                  <h2 className="font-serif text-sm font-medium mb-1 flex items-center gap-1.5">
                    <Pin className="w-3.5 h-3.5 text-red-600" />
                    Fiche Pinterest
                    <span className="text-[10px] font-normal text-brand-muted italic">
                      — motif &amp; mots-clés
                    </span>
                  </h2>
                  <select
                    value={selectedFicheId}
                    onChange={(e) => setSelectedFicheId(e.target.value)}
                    className="w-full p-2 rounded-lg border border-brand-muted/20 bg-white text-xs focus:outline-none focus:ring-1 focus:ring-red-300"
                  >
                    {suggestedFiches.length > 0 && (
                      <optgroup label="Recommandées pour cette occasion">
                        {suggestedFiches.map((f) => (
                          <option key={f.id} value={f.id}>
                            {f.nom} · {f.intention}
                          </option>
                        ))}
                      </optgroup>
                    )}
                    {otherFiches.length > 0 && (
                      <optgroup label="Tous les motifs">
                        {otherFiches.map((f) => (
                          <option key={f.id} value={f.id}>
                            {f.nom} · {f.intention}
                          </option>
                        ))}
                      </optgroup>
                    )}
                  </select>
                  {selectedFiche && (
                    <div className="mt-2 rounded-lg bg-red-50/60 border border-red-100 p-2 space-y-1">
                      <p className="text-[11px] text-brand-text">
                        <span className="font-semibold">Surimpression :</span> «&nbsp;{surimpressionText}&nbsp;»
                      </p>
                      {pinterestKeywords && (
                        <p className="text-[11px] text-brand-text">
                          <span className="font-semibold">Mot-clé principal :</span>{" "}
                          {pinterestKeywords.principal}
                        </p>
                      )}
                      <p className="text-[10px] text-brand-muted leading-snug">
                        4 visuels : Hero (flatlay détail) · Désir (porté serré) · Association
                        (déclinaisons couleurs) · Lifestyle (scène). Broderie plate naturelle.
                      </p>
                    </div>
                  )}
                </section>
              )}

              <section className={cn(mode !== "full" && "hidden")}>
                <h2 className="font-serif text-sm font-medium mb-1">6. Style</h2>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setWithOverlay(false)}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border font-medium text-xs transition-all",
                      !withOverlay
                        ? "border-brand-rose bg-brand-rose/10 text-brand-rose ring-1 ring-brand-rose"
                        : "border-brand-muted/20 bg-white hover:border-brand-rose/40 text-brand-text"
                    )}
                  >
                    <ImageIcon className="w-3.5 h-3.5" />
                    Photo pure
                  </button>
                  <button
                    type="button"
                    onClick={() => setWithOverlay(true)}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border font-medium text-xs transition-all",
                      withOverlay
                        ? "border-brand-rose bg-brand-rose/10 text-brand-rose ring-1 ring-brand-rose"
                        : "border-brand-muted/20 bg-white hover:border-brand-rose/40 text-brand-text"
                    )}
                  >
                    <Type className="w-3.5 h-3.5" />
                    Avec texte
                  </button>
                </div>
                {selectedPlatform === "pinterest" ? (
                  <p className="text-[10px] text-brand-muted mt-1.5 italic">
                    Format 2:3 vertical (1000×1500). « Avec texte » = surimpression de l&apos;occasion
                    dans l&apos;onglet Overlay (recommandé Pinterest).
                  </p>
                ) : withOverlay ? (
                  <p className="text-[10px] text-brand-muted mt-1.5 italic">
                    Format 4:5 (Insta), template sélectionnable après génération
                  </p>
                ) : null}
              </section>
            </div>

            {/* FOOTER FIXE */}
            <div className="shrink-0 border-t border-brand-muted/20 bg-white/50 p-3 rounded-b-2xl">
              <div className="flex gap-2 mb-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedPlatform("instagram");
                    // Garde withOverlay tel quel
                  }}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border font-medium text-xs transition-all",
                    selectedPlatform === "instagram"
                      ? "border-pink-500 bg-pink-50 text-pink-700 ring-1 ring-pink-500"
                      : "border-brand-muted/20 bg-white hover:border-pink-200 text-brand-text"
                  )}
                >
                  <Instagram className="w-3.5 h-3.5" />
                  Instagram
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedPlatform("pinterest");
                    setWithOverlay(false); // Pinterest = pas d'overlay V1
                    setRightPanelTab("text");
                  }}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border font-medium text-xs transition-all",
                    selectedPlatform === "pinterest"
                      ? "border-red-500 bg-red-50 text-red-700 ring-1 ring-red-500"
                      : "border-brand-muted/20 bg-white hover:border-red-200 text-brand-text"
                  )}
                >
                  <Pin className="w-3.5 h-3.5" />
                  Pinterest
                </button>
              </div>

              {error && (
                <div className="mb-2 p-2 bg-red-50 text-red-700 rounded-lg flex items-start gap-2 text-xs">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <p>{error}</p>
                </div>
              )}

              {copyNotice && (
                <div className="mb-2 p-2 bg-amber-50 text-amber-800 border border-amber-200 rounded-lg flex items-start gap-2 text-xs">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <p>{copyNotice}</p>
                </div>
              )}

              <button
                type="button"
                onClick={mode === "copyOnly" ? handleGenerateCopyOnly : handleGenerate}
                disabled={!selectedImage || isGeneratingImage || isGeneratingText}
                className="w-full primary-button flex items-center justify-center gap-2 text-sm py-3 rounded-xl shadow-md shadow-brand-rose/20"
              >
                {isGeneratingImage || isGeneratingText ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    {mode === "copyOnly"
                      ? "Rédaction... (~20 s)"
                      : `Création... (${selectedPlatform === "pinterest" ? "4-6" : "5-7"} min)`}
                  </>
                ) : mode === "copyOnly" ? (
                  <>
                    <FileText className="w-4 h-4" />
                    Générer la description + les tags
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    {selectedPlatform === "pinterest"
                      ? "Générer mon shooting Pinterest (4 visuels)"
                      : "Générer mon carrousel (5 slides)"}
                  </>
                )}
              </button>

              {canSavePack && (
                <div className="flex gap-2 mt-2">
                  <button
                    type="button"
                    onClick={() => setSaveDialogOpen(true)}
                    className="flex-1 flex items-center justify-center gap-2 text-xs py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 font-semibold transition-all"
                  >
                    <Heart className="w-3.5 h-3.5" />
                    {savedPackId ? "Sauvegarder à nouveau" : "Sauvegarder"}
                  </button>
                  {selectedPlatform === "instagram" && (
                    <button
                      type="button"
                      onClick={() => setFicheOpen(true)}
                      className="flex-1 flex items-center justify-center gap-2 text-xs py-2.5 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-700 border border-teal-200 font-semibold transition-all"
                      title="Voir la fiche éditoriale + programmer dans Planable"
                    >
                      <Newspaper className="w-3.5 h-3.5" />
                      Fiche + Planable
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* COLONNES 2 + 3 — RÉSULTATS */}
          <div className="col-span-12 lg:col-span-8 grid grid-cols-1 xl:grid-cols-2 gap-4 h-full min-h-0">
            <div className="flex flex-col min-h-0 overflow-hidden">
              <ResultPanelImagesOnly
                imageUrls={generatedImages}
                isGeneratingImage={isGeneratingImage}
                currentSlide={currentSlide}
                setCurrentSlide={setCurrentSlide}
                expectedCount={expectedImages}
                bestIndices={bestSlideIndices}
                onToggleBest={handleToggleBestSlide}
                onRemove={handleRemoveSlide}
                aspectClass={
                  selectedPlatform === "pinterest"
                    ? "aspect-[2/3]"
                    : withOverlay
                    ? "aspect-[4/5]"
                    : "aspect-square"
                }
              />
            </div>

            <div className="flex flex-col min-h-0 overflow-hidden">
              {/* Tabs : texte (caption Insta / pin SEO Pinterest) + overlay */}
              <div className="flex gap-1 mb-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setRightPanelTab("text")}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all",
                    rightPanelTab === "text"
                      ? "bg-brand-rose text-white"
                      : "bg-white/60 text-brand-muted hover:bg-white"
                  )}
                >
                  {selectedPlatform === "pinterest" ? (
                    <>
                      <Pin className="w-3.5 h-3.5" />
                      Pin SEO
                    </>
                  ) : (
                    <>
                      <Quote className="w-3.5 h-3.5" />
                      Caption + Hooks
                    </>
                  )}
                </button>
                {mode === "full" && (
                  <button
                    type="button"
                    onClick={() => setRightPanelTab("overlay")}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all relative",
                      rightPanelTab === "overlay"
                        ? "bg-brand-rose text-white"
                        : "bg-white/60 text-brand-muted hover:bg-white"
                    )}
                  >
                    <Type className="w-3.5 h-3.5" />
                    {selectedPlatform === "pinterest" ? "Surimpression" : "Overlay"}
                    {generatedImages.length > 0 && rightPanelTab !== "overlay" && (
                      <span className="absolute -top-1 -right-1 w-2 h-2 bg-brand-rose rounded-full animate-pulse" />
                    )}
                  </button>
                )}
              </div>

              <div className="flex-1 min-h-0 overflow-y-auto visible-scrollbar pr-2">
                {rightPanelTab === "overlay" ? (
                  <OverlayPanel
                    imageUrls={generatedImages}
                    hooks={generatedHooks}
                    caption={generatedText}
                    currentSlideIndex={currentSlide}
                    width={selectedPlatform === "pinterest" ? 1000 : 1080}
                    height={selectedPlatform === "pinterest" ? 1500 : 1350}
                    aspectClass={selectedPlatform === "pinterest" ? "aspect-[2/3]" : "aspect-[4/5]"}
                    defaultText={selectedPlatform === "pinterest" ? surimpressionText : undefined}
                  />
                ) : selectedPlatform === "pinterest" ? (
                  <ResultPanelPinterest
                    title={pinterestTitle}
                    description={pinterestDescription}
                    tags={pinterestTags}
                    tagCategories={pinterestTagCategories}
                    hooks={generatedHooks}
                    brandSafety={brandSafety}
                    isGeneratingText={isGeneratingText}
                  />
                ) : (
                  <ResultPanelTextOnly
                    text={generatedText}
                    hooks={generatedHooks}
                    hashtags={instagramHashtags}
                    hashtagSlots={instagramHashtagSlots}
                    brandSafety={brandSafety}
                    platform={selectedPlatform}
                    imageUrl={generatedImages[currentSlide] ?? null}
                    occasion={selectedOccasion}
                    customPrompt={customPrompt}
                    isGeneratingText={isGeneratingText}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      {ficheOpen && (
        <PostCard
          image={generatedImages[currentSlide] ?? null}
          caption={generatedText}
          hooks={generatedHooks}
          hashtags={instagramHashtags}
          brandSafety={brandSafety}
          platform={selectedPlatform}
          occasion={selectedOccasion}
          customPrompt={customPrompt}
          onClose={() => setFicheOpen(false)}
        />
      )}

      {supabaseOn && saveDialogOpen && (
        <SavePackDialog
          open={saveDialogOpen}
          onClose={() => setSaveDialogOpen(false)}
          payload={buildSavePayload()}
          onSaved={(packId) => {
            setSavedPackId(packId);
            setLibrarySaveBump((v) => v + 1);
          }}
        />
      )}

      {supabaseOn && (
        <LibraryDrawer
          open={libraryOpen}
          onClose={() => setLibraryOpen(false)}
          refreshKey={librarySaveBump}
        />
      )}

      <style jsx global>{`
        .visible-scrollbar::-webkit-scrollbar {
          width: 10px;
        }
        .visible-scrollbar::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.04);
          border-radius: 5px;
        }
        .visible-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(180, 130, 130, 0.4);
          border-radius: 5px;
          border: 2px solid transparent;
          background-clip: padding-box;
        }
        .visible-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(180, 130, 130, 0.6);
          background-clip: padding-box;
        }
      `}</style>
    </div>
  );
}

/* ============================================================
   COMPOSANT IMAGES (avec aspect ratio dynamique)
   ============================================================ */

interface ResultPanelImagesOnlyProps {
  imageUrls: string[];
  isGeneratingImage: boolean;
  currentSlide: number;
  setCurrentSlide: (s: number) => void;
  expectedCount: number;
  aspectClass: string;
  bestIndices?: Set<number>;
  onToggleBest?: (idx: number) => void;
  onRemove?: (idx: number) => void;
}

function ResultPanelImagesOnly({
  imageUrls,
  isGeneratingImage,
  currentSlide,
  setCurrentSlide,
  expectedCount,
  aspectClass,
  bestIndices,
  onToggleBest,
  onRemove,
}: ResultPanelImagesOnlyProps) {
  const handleDownload = async (url: string, index: number) => {
    // fetch → blob → objectURL : seule méthode fiable pour FORCER un vrai
    // téléchargement sur le disque. L'attribut `download` d'une ancre est
    // ignoré par Safari sur les grosses data: URL (l'image s'ouvre au lieu de
    // se télécharger) et par tous les navigateurs sur une URL cross-origin
    // (Supabase Storage). On passe donc systématiquement par un Blob local.
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const blob = await response.blob();
      const ext = (blob.type.split("/")[1] || "png").replace("jpeg", "jpg");
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = `ypersoa-slide-${index + 1}-${Date.now()}.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(objectUrl);
    } catch (err) {
      console.error("Téléchargement échoué", err);
      alert("Le téléchargement a échoué. Réessaie, ou télécharge depuis la bibliothèque.");
    }
  };

  const handleDownloadAll = async () => {
    // Séquentiel : Safari bloque les téléchargements programmatiques en rafale.
    for (let i = 0; i < imageUrls.length; i++) {
      await handleDownload(imageUrls[i], i);
      await new Promise((r) => setTimeout(r, 300));
    }
  };

  const handlePrev = () => setCurrentSlide(Math.max(currentSlide - 1, 0));
  const handleNext = () => setCurrentSlide(Math.min(currentSlide + 1, imageUrls.length - 1));

  if (imageUrls.length === 0 && !isGeneratingImage) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center p-6 border-2 border-dashed border-brand-muted/20 rounded-2xl">
        <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center mb-3 shadow-sm">
          <Sparkles className="w-5 h-5 text-brand-muted" />
        </div>
        <h3 className="font-serif text-base font-medium mb-1 text-brand-muted">
          {expectedCount < 5 ? "Épingles à venir" : "Carrousel à venir"}
        </h3>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 flex-1 min-h-0">
      <div className="relative w-full flex-1 min-h-0 rounded-2xl overflow-hidden bg-white shadow-sm border border-brand-muted/10 group">
        {isGeneratingImage && imageUrls.length === 0 ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-brand-bg/50 backdrop-blur-sm">
            <div className="w-8 h-8 border-4 border-brand-rose/20 border-t-brand-rose rounded-full animate-spin mb-3" />
            <p className="font-serif text-sm animate-pulse text-center px-4 text-brand-muted">
              Création des images...
            </p>
          </div>
        ) : imageUrls.length > 0 ? (
          <>
            <div className={cn("flex h-full w-full items-center justify-center bg-[#f6f1e7]", aspectClass)}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageUrls[currentSlide]}
                alt={`Slide ${currentSlide + 1}`}
                className="max-h-full max-w-full object-contain transition-opacity duration-300"
              />
            </div>

            {imageUrls.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={handlePrev}
                  disabled={currentSlide === 0}
                  className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 backdrop-blur text-brand-text p-1.5 rounded-full shadow-md disabled:opacity-0 opacity-0 group-hover:opacity-100 transition-opacity hover:scale-105"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  disabled={currentSlide === imageUrls.length - 1}
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 backdrop-blur text-brand-text p-1.5 rounded-full shadow-md disabled:opacity-0 opacity-0 group-hover:opacity-100 transition-opacity hover:scale-105"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>

                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5 bg-black/20 backdrop-blur-md px-2 py-1.5 rounded-full">
                  {imageUrls.map((_, i) => (
                    <div
                      key={i}
                      className={cn(
                        "w-1.5 h-1.5 rounded-full transition-all",
                        i === currentSlide ? "bg-white scale-110" : "bg-white/50"
                      )}
                    />
                  ))}
                </div>
              </>
            )}

            <div className="absolute top-3 right-3 flex flex-col gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                type="button"
                onClick={() => handleDownload(imageUrls[currentSlide], currentSlide)}
                className="bg-white/90 backdrop-blur text-brand-text p-2 rounded-full shadow-lg hover:scale-105 transition-transform"
                title="Télécharger cette image"
              >
                <Download className="w-4 h-4" />
              </button>
              {onToggleBest && (
                <button
                  type="button"
                  onClick={() => onToggleBest(currentSlide)}
                  className={`p-2 rounded-full shadow-lg hover:scale-105 transition-transform ${
                    bestIndices?.has(currentSlide)
                      ? "bg-rose-500 text-white"
                      : "bg-white/90 backdrop-blur text-rose-500"
                  }`}
                  title={bestIndices?.has(currentSlide) ? "Retirer des best" : "Marquer comme best"}
                >
                  <Heart className={`w-4 h-4 ${bestIndices?.has(currentSlide) ? "fill-white" : ""}`} />
                </button>
              )}
              {onRemove && (
                <button
                  type="button"
                  onClick={() => {
                    if (confirm("Supprimer cette image du carrousel ?")) onRemove(currentSlide);
                  }}
                  className="bg-white/90 backdrop-blur text-slate-600 hover:bg-red-500 hover:text-white p-2 rounded-full shadow-lg hover:scale-105 transition-all"
                  title="Supprimer cette image du carrousel"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            {bestIndices?.has(currentSlide) && (
              <div className="absolute top-3 left-3 bg-rose-500 text-white text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full flex items-center gap-1 shadow-md">
                <Heart className="w-3 h-3 fill-white" /> Best
              </div>
            )}
          </>
        ) : null}
      </div>

      {imageUrls.length > 0 && (
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex gap-1.5 flex-1 overflow-x-auto pb-1">
            {imageUrls.map((url, i) => (
              <button
                type="button"
                key={i}
                onClick={() => setCurrentSlide(i)}
                className={cn(
                  "shrink-0 w-12 h-12 rounded-lg overflow-hidden border-2 transition-all",
                  currentSlide === i
                    ? "border-brand-rose scale-105"
                    : "border-transparent opacity-60 hover:opacity-100"
                )}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt={`Slide ${i + 1}`} className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={handleDownloadAll}
            className="shrink-0 flex items-center gap-1 bg-brand-rose/10 hover:bg-brand-rose/20 text-brand-rose font-medium text-xs px-3 py-2 rounded-lg transition-colors"
            title="Télécharger toutes les images"
          >
            <Download className="w-3.5 h-3.5" />
            Tout
          </button>
        </div>
      )}
    </div>
  );
}

/* ============================================================
   COMPOSANT TEXTE INSTAGRAM (existant)
   ============================================================ */

interface ResultPanelTextOnlyProps {
  text: string | null;
  hooks: string[];
  hashtags?: string[];
  hashtagSlots?: InstagramHashtagSlots | null;
  brandSafety: BrandSafety | null;
  platform: "instagram" | "pinterest";
  imageUrl?: string | null;
  occasion?: string;
  customPrompt?: string;
  isGeneratingText: boolean;
}

const HASHTAG_SLOT_META: { key: keyof InstagramHashtagSlots; label: string }[] = [
  { key: "socle", label: "Marque" },
  { key: "produit", label: "Produit" },
  { key: "occasion", label: "Occasion" },
  { key: "niche", label: "Niche / style" },
  { key: "communaute", label: "Communauté" },
];

const BRAND_HASHTAG_SLUGS = new Set([
  "ypersoa",
  "leclubypersoa",
  "brode",
  "broderie",
  "broderiepersonnalisee",
  "brodesurcommande",
  "hautsdefrance",
  "atelierhdf",
  "cadeaupersonnalise",
  "atelier",
  "iconeclub",
  "teeblanc",
  "brodepersonnalise",
]);

function isBrandHashtag(tag: string) {
  const slug = tag
    .replace(/^#/, "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]/g, "");
  return BRAND_HASHTAG_SLUGS.has(slug);
}

function ResultPanelTextOnly({
  text,
  hooks,
  hashtags = [],
  hashtagSlots = null,
  brandSafety,
  platform,
  imageUrl = null,
  occasion = "",
  customPrompt = "",
  isGeneratingText,
}: ResultPanelTextOnlyProps) {
  const [copiedCaption, setCopiedCaption] = useState(false);
  const [copiedHookIdx, setCopiedHookIdx] = useState<number | null>(null);
  const [copiedHashtags, setCopiedHashtags] = useState(false);
  const [copiedVariant, setCopiedVariant] = useState<"a" | "b" | null>(null);

  const variantA = hooks[4] || hooks[0] || "";
  const variantB = hooks[1] || hooks[2] || "";
  const editorialTitle = variantA || "Comme si on y etait.";
  const teaser = customPrompt?.trim()
    ? customPrompt.trim()
    : "Un post feed lifestyle, ecrit au present, au tutoiement. Une intention, un CTA.";
  const ctaLabel = "ypersoa.fr";
  const occasionLabel = occasion
    ? occasion.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())
    : "Occasion libre";
  const brandHashtags = hashtags.filter(isBrandHashtag);
  const discoveryHashtags = hashtags.filter((tag) => !isBrandHashtag(tag));
  const hashtagSections = hashtagSlots
    ? HASHTAG_SLOT_META.map(({ key, label }) => ({ label, tags: hashtagSlots[key] ?? [] })).filter(
        (section) => section.tags.length > 0
      )
    : [];
  const captionBody = text
    ? text
        .replace(/\r/g, "")
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
    : [];
  const captionPreviewLines = captionBody.slice(0, 4);

  const handleCopyHashtags = () => {
    if (hashtags.length === 0) return;
    navigator.clipboard.writeText(hashtags.join(" "));
    setCopiedHashtags(true);
    setTimeout(() => setCopiedHashtags(false), 2000);
  };

  const handleCopyCaption = () => {
    if (text) {
      navigator.clipboard.writeText(text);
      setCopiedCaption(true);
      setTimeout(() => setCopiedCaption(false), 2000);
    }
  };

  const handleCopyHook = (hook: string, idx: number) => {
    navigator.clipboard.writeText(hook);
    setCopiedHookIdx(idx);
    setTimeout(() => setCopiedHookIdx(null), 2000);
  };

  const handleCopyVariant = (value: string, key: "a" | "b") => {
    if (!value) return;
    navigator.clipboard.writeText(value);
    setCopiedVariant(key);
    setTimeout(() => setCopiedVariant(null), 2000);
  };

  if (!text && !isGeneratingText && hooks.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center p-6 border-2 border-dashed border-brand-muted/20 rounded-2xl">
        <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center mb-3 shadow-sm">
          <Quote className="w-5 h-5 text-brand-muted" />
        </div>
        <h3 className="font-serif text-base font-medium mb-1 text-brand-muted">
          Caption + hooks à venir
        </h3>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {brandSafety && !isGeneratingText && text && (
        <div
          className={cn(
            "rounded-xl p-3 flex items-start gap-2 text-xs",
            brandSafety.safe
              ? "bg-green-50 text-green-800 border border-green-200"
              : "bg-red-50 text-red-800 border border-red-200"
          )}
        >
          {brandSafety.safe ? (
            <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          )}
          <div className="flex-1">
            <p className="font-medium">
              {brandSafety.safe
                ? "Brand-safe ✓"
                : `${brandSafety.criticalViolations.length} violation(s)`}
            </p>
            {brandSafety.warnings.length > 0 && (
              <p className="text-[11px] text-amber-700">
                {brandSafety.warnings.length} avertissement(s) — à vérifier.
              </p>
            )}
          </div>
        </div>
      )}

      <div className="rounded-[28px] border border-[#d5c8ba] bg-[#f4eee2] p-5 shadow-sm">
        <p className="text-[11px] font-medium uppercase tracking-[0.35em] text-[#b46f65]">
          Ypersoa · contenu de post
        </p>
        <h3 className="mt-2 font-serif text-[28px] leading-tight text-[#16324c]">
          {editorialTitle}
        </h3>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#4b6278]">
          {teaser}
        </p>

        <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,0.88fr)_minmax(0,1.12fr)]">
          <div className="rounded-[24px] border border-slate-200 bg-white p-3 shadow-[0_18px_40px_rgba(26,22,20,0.08)]">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#b46f65] text-sm font-semibold text-white">
                y
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-[#16324c]">ypersoa</p>
                <p className="text-xs text-slate-500">Wattrelos · Hauts-de-France</p>
              </div>
            </div>

            <div className="mt-3 aspect-[4/5] overflow-hidden rounded-[20px] bg-[#ece3d5]">
              {imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={imageUrl}
                  alt="Preview du post"
                  className="h-full w-full object-contain bg-[#ece3d5]"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-xs text-brand-muted">
                  Preview du post
                </div>
              )}
            </div>

            <div className="mt-3 flex items-center justify-between text-[#16324c]">
              <div className="flex items-center gap-3 text-lg">
                <span>♥</span>
                <span>◌</span>
                <span>✈</span>
              </div>
              <span className="text-base opacity-60">⌑</span>
            </div>

            <p className="mt-3 text-sm font-semibold text-[#16324c]">
              Aimé par leclubypersoa et 312 autres personnes
            </p>
            <div className="mt-2 space-y-2 text-sm leading-relaxed text-[#16324c]">
              {captionPreviewLines.length > 0 ? (
                <>
                  <p>
                    <span className="font-semibold">ypersoa </span>
                    {captionPreviewLines[0]}
                  </p>
                  {captionPreviewLines.slice(1).map((line, idx) => (
                    <p key={idx}>{line}</p>
                  ))}
                </>
              ) : (
                <p className="text-slate-500">La légende apparaitra ici.</p>
              )}
            </div>

            {hashtags.length > 0 && (
              <p className="mt-4 text-sm leading-relaxed text-[#1e6e77]">
                {hashtags.join(" ")}
              </p>
            )}
          </div>

          <div className="space-y-4">
            <div className="rounded-[22px] border border-[#cbbcaf] bg-[#f7f1e6]">
              <div className="grid grid-cols-[150px_1fr] border-b border-[#d9ccbf] text-sm">
                <div className="px-4 py-3 font-mono uppercase tracking-[0.15em] text-[#b46f65]">
                  Plateforme
                </div>
                <div className="px-4 py-3 font-semibold text-[#16324c]">
                  {platform === "instagram" ? "Post feed · lifestyle (4:5)" : "Pin · vertical (2:3)"}
                </div>
              </div>
              <div className="grid grid-cols-[150px_1fr] border-b border-[#d9ccbf] text-sm">
                <div className="px-4 py-3 font-mono uppercase tracking-[0.15em] text-[#b46f65]">
                  Occasion
                </div>
                <div className="px-4 py-3 font-semibold text-[#16324c]">{occasionLabel}</div>
              </div>
              <div className="grid grid-cols-[150px_1fr] border-b border-[#d9ccbf] text-sm">
                <div className="px-4 py-3 font-mono uppercase tracking-[0.15em] text-[#b46f65]">
                  Angle
                </div>
                <div className="px-4 py-3 font-semibold text-[#16324c]">
                  {hooks[0] || "Feed lifestyle, present, tutoiement"}
                </div>
              </div>
              <div className="grid grid-cols-[150px_1fr] text-sm">
                <div className="px-4 py-3 font-mono uppercase tracking-[0.15em] text-[#b46f65]">
                  CTA unique
                </div>
                <div className="px-4 py-3">
                  <span className="inline-flex rounded-full bg-[#1e6e77] px-3 py-1 text-sm font-semibold text-white shadow-sm">
                    {ctaLabel}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-[11px] font-medium uppercase tracking-[0.35em] text-[#1e6e77]">
                Variantes de légende
              </p>

              <div className="rounded-[20px] border border-slate-200 bg-white p-4 shadow-sm">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <p className="text-sm uppercase tracking-[0.25em] text-[#b46f65]">
                    A · courte, punchy
                  </p>
                  {variantA && (
                    <button
                      type="button"
                      onClick={() => handleCopyVariant(variantA, "a")}
                      className="flex items-center gap-1 text-[11px] font-medium text-brand-muted hover:text-brand-text transition-colors"
                    >
                      {copiedVariant === "a" ? (
                        <Check className="w-3 h-3 text-green-600" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                      {copiedVariant === "a" ? "Copie" : "Copier"}
                    </button>
                  )}
                </div>
                <p className="text-base leading-relaxed text-[#16324c]">
                  {variantA || "La variante courte apparaitra ici."}
                </p>
              </div>

              <div className="rounded-[20px] border border-slate-200 bg-white p-4 shadow-sm">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <p className="text-sm uppercase tracking-[0.25em] text-[#b46f65]">
                    B · engagement / commentaires
                  </p>
                  {variantB && (
                    <button
                      type="button"
                      onClick={() => handleCopyVariant(variantB, "b")}
                      className="flex items-center gap-1 text-[11px] font-medium text-brand-muted hover:text-brand-text transition-colors"
                    >
                      {copiedVariant === "b" ? (
                        <Check className="w-3 h-3 text-green-600" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                      {copiedVariant === "b" ? "Copie" : "Copier"}
                    </button>
                  )}
                </div>
                <p className="text-base leading-relaxed text-[#16324c]">
                  {variantB || "La variante engagement apparaitra ici."}
                </p>
              </div>
            </div>

            {hashtags.length > 0 && !isGeneratingText && (
              <div className="rounded-[20px] border border-[#d6d0c5] bg-[#f7f1e6] p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <p className="text-[11px] font-medium uppercase tracking-[0.35em] text-[#1e6e77]">
                    Jeu de hashtags · {hashtags.length}
                  </p>
                  <button
                    type="button"
                    onClick={handleCopyHashtags}
                    className="flex items-center gap-1 text-[11px] font-medium text-brand-muted hover:text-brand-text transition-colors"
                  >
                    {copiedHashtags ? (
                      <Check className="w-3 h-3 text-green-600" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                    {copiedHashtags ? "Copie" : "Copier"}
                  </button>
                </div>

                {hashtagSections.length > 0 && (
                  <div className="mb-3 space-y-2">
                    {hashtagSections.map((section) => (
                      <div key={section.label} className="flex flex-wrap items-center gap-2">
                        <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#b46f65]">
                          {section.label}
                        </span>
                        {section.tags.map((tag) => (
                          <span
                            key={`${section.label}-${tag}`}
                            className="rounded-full bg-white px-3 py-1 text-sm text-[#16324c] shadow-sm"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    ))}
                  </div>
                )}

                {brandHashtags.length > 0 && (
                  <div className="mb-3 flex flex-wrap gap-2">
                    {brandHashtags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-[#1e6e77] px-3 py-1 text-sm font-medium text-white"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                {discoveryHashtags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {discoveryHashtags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-[#e7e1d4] px-3 py-1 text-sm text-[#16324c]"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-4 shadow-sm border border-brand-muted/10">
        <div className="flex items-center justify-between mb-2 pb-2 border-b border-brand-muted/10">
          <div className="flex items-center gap-2">
            <Instagram className="w-4 h-4 text-pink-600" />
            <h4 className="font-medium text-sm">Légende complète</h4>
          </div>
          {text && !isGeneratingText && (
            <button
              type="button"
              onClick={handleCopyCaption}
              className="flex items-center gap-1 text-[11px] font-medium text-brand-muted hover:text-brand-text transition-colors"
            >
              {copiedCaption ? (
                <Check className="w-3 h-3 text-green-600" />
              ) : (
                <Copy className="w-3 h-3" />
              )}
              {copiedCaption ? "Copie" : "Copier"}
            </button>
          )}
        </div>

        <div>
          {isGeneratingText ? (
            <div className="flex flex-col items-center justify-center py-4">
              <div className="flex gap-1 mb-2">
                <div className="w-1.5 h-1.5 bg-brand-rose rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <div className="w-1.5 h-1.5 bg-brand-rose rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <div className="w-1.5 h-1.5 bg-brand-rose rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
              <p className="text-xs text-brand-muted animate-pulse">Rédaction...</p>
            </div>
          ) : text ? (
            <div className="prose prose-xs max-w-none prose-p:leading-relaxed text-sm text-brand-text whitespace-pre-wrap">
              <Markdown>{text}</Markdown>
            </div>
          ) : null}
        </div>
      </div>

      {hooks && hooks.length > 0 && (
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-brand-muted/10">
          <div className="flex items-center gap-2 mb-2 pb-2 border-b border-brand-muted/10">
            <Quote className="w-4 h-4 text-brand-rose" />
            <h4 className="font-medium text-sm">5 hooks éditoriaux</h4>
          </div>

          <div className="space-y-1.5">
            {hooks.map((hook, idx) => (
              <div
                key={idx}
                className="flex items-start gap-2 p-2 rounded-lg bg-brand-bg/60 hover:bg-brand-rose/5 transition-colors group"
              >
                <span className="text-[10px] font-semibold uppercase tracking-wider text-brand-rose mt-0.5 shrink-0 w-16">
                  {HOOK_LABELS[idx] || `#${idx + 1}`}
                </span>
                <p className="text-xs flex-1">{hook}</p>
                <button
                  type="button"
                  onClick={() => handleCopyHook(hook, idx)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-brand-muted hover:text-brand-text shrink-0"
                  title="Copier"
                >
                  {copiedHookIdx === idx ? (
                    <Check className="w-3 h-3 text-green-600" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ============================================================
   NOUVEAU COMPOSANT — PANNEAU PINTEREST DÉDIÉ
   ============================================================ */

interface ResultPanelPinterestProps {
  title: string;
  description: string;
  tags: string[];
  tagCategories: PinterestTagCategories | null;
  hooks: string[];
  brandSafety: BrandSafety | null;
  isGeneratingText: boolean;
}

function ResultPanelPinterest({
  title,
  description,
  tags,
  tagCategories,
  hooks,
  brandSafety,
  isGeneratingText,
}: ResultPanelPinterestProps) {
  const [copied, setCopied] = useState<string | null>(null);

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  };

  if (!title && !isGeneratingText) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center p-6 border-2 border-dashed border-brand-muted/20 rounded-2xl">
        <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center mb-3 shadow-sm">
          <Pin className="w-5 h-5 text-brand-muted" />
        </div>
        <h3 className="font-serif text-base font-medium mb-1 text-brand-muted">
          Épingle Pinterest à venir
        </h3>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {brandSafety && !isGeneratingText && (
        <div
          className={cn(
            "rounded-xl p-3 flex items-start gap-2 text-xs",
            brandSafety.safe
              ? "bg-green-50 text-green-800 border border-green-200"
              : "bg-red-50 text-red-800 border border-red-200"
          )}
        >
          {brandSafety.safe ? (
            <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          )}
          <p className="font-medium">
            {brandSafety.safe ? "Brand-safe ✓" : `${brandSafety.criticalViolations.length} violation(s)`}
          </p>
        </div>
      )}

      {/* TITRE PINTEREST */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-brand-muted/10">
        <div className="flex items-center justify-between mb-2 pb-2 border-b border-brand-muted/10">
          <div className="flex items-center gap-2">
            <Pin className="w-4 h-4 text-red-600" />
            <h4 className="font-medium text-sm">Titre Pinterest</h4>
            <span
              className={cn(
                "text-[10px] font-medium px-1.5 py-0.5 rounded",
                title.length > 100
                  ? "bg-red-100 text-red-700"
                  : title.length > 80
                  ? "bg-amber-100 text-amber-700"
                  : "bg-green-100 text-green-700"
              )}
            >
              {title.length}/100
            </span>
          </div>
          {title && !isGeneratingText && (
            <button
              type="button"
              onClick={() => handleCopy(title, "title")}
              className="flex items-center gap-1 text-[11px] font-medium text-brand-muted hover:text-brand-text transition-colors"
            >
              {copied === "title" ? (
                <Check className="w-3 h-3 text-green-600" />
              ) : (
                <Copy className="w-3 h-3" />
              )}
              {copied === "title" ? "Copié" : "Copier"}
            </button>
          )}
        </div>

        {isGeneratingText ? (
          <div className="flex items-center gap-2 py-2 text-xs text-brand-muted animate-pulse">
            <div className="w-2 h-2 bg-brand-rose rounded-full animate-bounce" />
            Rédaction du titre...
          </div>
        ) : (
          <p className="text-sm font-medium text-brand-text">{title}</p>
        )}
      </div>

      {/* DESCRIPTION SEO */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-brand-muted/10">
        <div className="flex items-center justify-between mb-2 pb-2 border-b border-brand-muted/10">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-red-600" />
            <h4 className="font-medium text-sm">Description SEO</h4>
            <span
              className={cn(
                "text-[10px] font-medium px-1.5 py-0.5 rounded",
                description.length > 500
                  ? "bg-red-100 text-red-700"
                  : description.length > 400
                  ? "bg-amber-100 text-amber-700"
                  : "bg-green-100 text-green-700"
              )}
            >
              {description.length}/500
            </span>
          </div>
          {description && !isGeneratingText && (
            <button
              type="button"
              onClick={() => handleCopy(description, "desc")}
              className="flex items-center gap-1 text-[11px] font-medium text-brand-muted hover:text-brand-text transition-colors"
            >
              {copied === "desc" ? (
                <Check className="w-3 h-3 text-green-600" />
              ) : (
                <Copy className="w-3 h-3" />
              )}
              {copied === "desc" ? "Copié" : "Copier"}
            </button>
          )}
        </div>

        {isGeneratingText ? (
          <div className="flex items-center gap-2 py-2 text-xs text-brand-muted animate-pulse">
            <div className="w-2 h-2 bg-brand-rose rounded-full animate-bounce" />
            Rédaction de la description...
          </div>
        ) : (
          <p className="text-xs text-brand-text leading-relaxed">{description}</p>
        )}
      </div>

      {/* TAGS */}
      {tags.length > 0 && !isGeneratingText && (
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-brand-muted/10">
          <div className="flex items-center justify-between mb-2 pb-2 border-b border-brand-muted/10">
            <div className="flex items-center gap-2">
              <Hash className="w-4 h-4 text-red-600" />
              <h4 className="font-medium text-sm">Tags</h4>
              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-green-100 text-green-700">
                {tags.length} tags
              </span>
            </div>
            <button
              type="button"
              onClick={() => handleCopy(tags.join(", "), "tags")}
              className="flex items-center gap-1 text-[11px] font-medium text-brand-muted hover:text-brand-text transition-colors"
            >
              {copied === "tags" ? (
                <Check className="w-3 h-3 text-green-600" />
              ) : (
                <Copy className="w-3 h-3" />
              )}
              {copied === "tags" ? "Copié" : "Copier"}
            </button>
          </div>

          {tagCategories ? (
            <div className="space-y-2.5">
              {[
                { key: "saisonnier", label: "Saisonnier", chip: "bg-amber-50 text-amber-800 border border-amber-200", dot: "bg-amber-400" },
                { key: "produit", label: "Produit", chip: "bg-rose-50 text-rose-800 border border-rose-200", dot: "bg-rose-400" },
                { key: "evergreen", label: "Evergreen", chip: "bg-emerald-50 text-emerald-800 border border-emerald-200", dot: "bg-emerald-400" },
                { key: "permanent", label: "Permanent", chip: "bg-sky-50 text-sky-800 border border-sky-200", dot: "bg-sky-400" },
              ].map((cat) => {
                const items = tagCategories[cat.key as keyof PinterestTagCategories];
                if (!items || items.length === 0) return null;
                return (
                  <div key={cat.key}>
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className={`w-1.5 h-1.5 rounded-full ${cat.dot}`} />
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-brand-muted">
                        {cat.label}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {items.map((tag, i) => (
                        <span
                          key={i}
                          className={`text-[11px] px-2 py-1 rounded-md ${cat.chip}`}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {tags.map((tag, i) => (
                <span
                  key={i}
                  className="text-[11px] px-2 py-1 bg-brand-bg rounded-md text-brand-text"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* HOOKS éditoriaux (mêmes que Insta) */}
      {hooks && hooks.length > 0 && (
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-brand-muted/10">
          <div className="flex items-center gap-2 mb-2 pb-2 border-b border-brand-muted/10">
            <Quote className="w-4 h-4 text-brand-rose" />
            <h4 className="font-medium text-sm">5 hooks éditoriaux</h4>
            <span className="text-[10px] text-brand-muted italic">(pour épingles supplémentaires)</span>
          </div>

          <div className="space-y-1.5">
            {hooks.map((hook, idx) => {
              const isCopied = copied === `hook-${idx}`;
              return (
                <div
                  key={idx}
                  className="flex items-start gap-2 p-2 rounded-lg bg-brand-bg/60 hover:bg-brand-rose/5 transition-colors group"
                >
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-brand-rose mt-0.5 shrink-0 w-16">
                    {HOOK_LABELS[idx] || `#${idx + 1}`}
                  </span>
                  <p className="text-xs flex-1">{hook}</p>
                  <button
                    type="button"
                    onClick={() => handleCopy(hook, `hook-${idx}`)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-brand-muted hover:text-brand-text shrink-0"
                  >
                    {isCopied ? (
                      <Check className="w-3 h-3 text-green-600" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
