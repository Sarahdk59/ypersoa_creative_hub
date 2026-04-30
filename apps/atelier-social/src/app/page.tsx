"use client";

import { useState, useEffect } from "react";
import { ImageUploader } from "@/components/ImageUploader";
import { ImportedShotsPanel } from "@/components/ImportedShotsPanel";
import { SavePackDialog } from "@/components/SavePackDialog";
import { LibraryDrawer } from "@/components/LibraryDrawer";
import { isSupabaseConfigured } from "@/lib/supabase";
import { Heart, FolderOpen } from "lucide-react";
import { VibeSelector, VIBES } from "@/components/VibeSelector";
import { OccasionSelector, OCCASIONS } from "@/components/OccasionSelector";
import { CanoniqueSelector } from "@/components/CanoniqueSelector";
import { OverlayPanel } from "@/components/OverlayPanel";
import { generateImageVariation } from "@/lib/api-client";
import { CANONIQUES } from "@/lib/canoniques";
import {
  Instagram,
  Pin,
  Sparkles,
  AlertCircle,
  Type,
  ImageIcon,
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

export default function Home() {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [customPrompt, setCustomPrompt] = useState("");
  const [selectedVibe, setSelectedVibe] = useState<string>(VIBES[0].id);
  const [selectedOccasion, setSelectedOccasion] = useState<string>(OCCASIONS[0].id);
  const [selectedPlatform, setSelectedPlatform] = useState<"instagram" | "pinterest">("instagram");
  const [selectedCanoniqueIds, setSelectedCanoniqueIds] = useState<string[]>([]);
  const [withOverlay, setWithOverlay] = useState(false);

  const [generatedImages, setGeneratedImages] = useState<string[]>([]);
  const [generatedText, setGeneratedText] = useState<string | null>(null);
  const [generatedHooks, setGeneratedHooks] = useState<string[]>([]);
  // Pinterest spécifique
  const [pinterestTitle, setPinterestTitle] = useState<string>("");
  const [pinterestDescription, setPinterestDescription] = useState<string>("");
  const [pinterestTags, setPinterestTags] = useState<string[]>([]);
  const [brandSafety, setBrandSafety] = useState<BrandSafety | null>(null);
  const [currentSlide, setCurrentSlide] = useState(0);

  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [isGeneratingText, setIsGeneratingText] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [rightPanelTab, setRightPanelTab] = useState<"text" | "overlay">("text");

  // Hub : Sauvegarde des packs RS dans Supabase + bibliothèque collections.
  const supabaseOn = isSupabaseConfigured();
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [librarySaveBump, setLibrarySaveBump] = useState(0);
  const [savedPackId, setSavedPackId] = useState<string | null>(null);

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
    setPinterestTitle("");
    setPinterestDescription("");
    setPinterestTags([]);
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
    setIsGeneratingImage(true);
    setIsGeneratingText(true);
    setBrandSafety(null);
    setGeneratedHooks([]);
    setPinterestTitle("");
    setPinterestDescription("");
    setPinterestTags([]);
    setCurrentSlide(0);

    const vibePrompt = VIBES.find((v) => v.id === selectedVibe)?.prompt || "";
    const vibeLabel = VIBES.find((v) => v.id === selectedVibe)?.label || "";
    const occasionContext = OCCASIONS.find((o) => o.id === selectedOccasion)?.context || "";
    const mimeType = selectedFile.type;
    const base64Data = selectedImage.split(",")[1];
    const canoniqueContext = buildCanoniqueContext();

    // Logique format & angles
    const isPinterest = selectedPlatform === "pinterest";
    let aspectRatio: "1:1" | "4:5" | "2:3";
    let angles: string[];

    if (isPinterest) {
      aspectRatio = "2:3"; // Standard Pinterest
      angles = PINTEREST_ANGLES; // 3 angles
    } else if (withOverlay) {
      aspectRatio = "4:5"; // Insta + Pinterest si overlay
      angles = ALL_ANGLES; // 5 angles
    } else {
      aspectRatio = "1:1"; // Insta classique
      angles = ALL_ANGLES; // 5 angles
    }

    console.log(
      `[FRONT] Mode: ${isPinterest ? "Pinterest" : "Instagram"} | aspectRatio: ${aspectRatio} | angles: ${angles.length}`
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
        }),
      });

      const successfulImages: string[] = [];
      for (const angle of angles) {
        try {
          const img = await generateImageVariation({
            base64Image: base64Data,
            mimeType,
            vibePrompt,
            angle,
            customPrompt,
            canoniqueIds: selectedCanoniqueIds,
            aspectRatio,
          });
          successfulImages.push(img);
          setGeneratedImages([...successfulImages]);
        } catch (e) {
          console.error("Failed to generate image for angle:", angle.substring(0, 60), e);
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
          setGeneratedText(data.text); // Combined version pour fallback
        } else {
          setGeneratedText(data.text);
        }

        if (data.brandSafety) setBrandSafety(data.brandSafety);
        if (data.hooks) {
          setGeneratedHooks(data.hooks);
          if (withOverlay && !isPinterest) {
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

  const expectedImages = selectedPlatform === "pinterest" ? 3 : 5;

  return (
    <div className="h-screen flex flex-col bg-brand-bg text-brand-text font-sans selection:bg-brand-rose/20 selection:text-brand-rose overflow-hidden">
      <header className="h-14 w-full bg-white/80 backdrop-blur-md border-b border-brand-muted/10 shrink-0">
        <div className="max-w-[1920px] mx-auto px-6 h-full flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-brand-rose rounded-full flex items-center justify-center text-white">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h1 className="font-serif text-lg font-semibold tracking-tight text-brand-text leading-none">
                Ypersoa
              </h1>
              <p className="text-[10px] text-brand-sage uppercase tracking-widest mt-0.5 font-bold">
                Atelier Social — Hub
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
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
              <section>
                <h2 className="font-serif text-sm font-medium mb-1 text-brand-text">
                  1. Ta vision
                </h2>
                <textarea
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  placeholder="Décris le contenu que tu imagines..."
                  className="w-full p-2 rounded-lg border border-brand-muted/20 bg-white focus:outline-none focus:ring-1 focus:ring-brand-rose/50 resize-none h-14 text-xs text-brand-text placeholder:text-brand-muted/50"
                />
              </section>

              <section>
                <h2 className="font-serif text-sm font-medium mb-1">2. Ton produit</h2>
                <ImportedShotsPanel onImport={handleImageSelected} />
                <div className="h-28 max-h-28 overflow-hidden rounded-xl">
                  <ImageUploader
                    selectedImage={selectedImage}
                    onImageSelected={handleImageSelected}
                  />
                </div>
              </section>

              <section>
                <h2 className="font-serif text-sm font-medium mb-1">3. Tes mannequins</h2>
                <CanoniqueSelector
                  selectedIds={selectedCanoniqueIds}
                  onChange={setSelectedCanoniqueIds}
                  maxSelection={3}
                />
              </section>

              <section>
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

              <section>
                <h2 className="font-serif text-sm font-medium mb-1">6. Style</h2>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setWithOverlay(false)}
                    disabled={selectedPlatform === "pinterest"}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border font-medium text-xs transition-all",
                      !withOverlay
                        ? "border-brand-rose bg-brand-rose/10 text-brand-rose ring-1 ring-brand-rose"
                        : "border-brand-muted/20 bg-white hover:border-brand-rose/40 text-brand-text",
                      selectedPlatform === "pinterest" && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    <ImageIcon className="w-3.5 h-3.5" />
                    Photo pure
                  </button>
                  <button
                    type="button"
                    onClick={() => setWithOverlay(true)}
                    disabled={selectedPlatform === "pinterest"}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border font-medium text-xs transition-all",
                      withOverlay
                        ? "border-brand-rose bg-brand-rose/10 text-brand-rose ring-1 ring-brand-rose"
                        : "border-brand-muted/20 bg-white hover:border-brand-rose/40 text-brand-text",
                      selectedPlatform === "pinterest" && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    <Type className="w-3.5 h-3.5" />
                    Avec texte
                  </button>
                </div>
                {selectedPlatform === "pinterest" ? (
                  <p className="text-[10px] text-brand-muted mt-1.5 italic">
                    Mode Pinterest — overlay non disponible (V1). Format 2:3 vertical natif.
                  </p>
                ) : withOverlay ? (
                  <p className="text-[10px] text-brand-muted mt-1.5 italic">
                    Format 4:5 (Insta + Pinterest), template sélectionnable après génération
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

              <button
                type="button"
                onClick={handleGenerate}
                disabled={!selectedImage || isGeneratingImage || isGeneratingText}
                className="w-full primary-button flex items-center justify-center gap-2 text-sm py-3 rounded-xl shadow-md shadow-brand-rose/20"
              >
                {isGeneratingImage || isGeneratingText ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Création... ({selectedPlatform === "pinterest" ? "3-5" : "5-7"} min)
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    {selectedPlatform === "pinterest"
                      ? "Générer mes 3 épingles"
                      : "Générer mon carrousel (5 slides)"}
                  </>
                )}
              </button>

              {canSavePack && (
                <button
                  type="button"
                  onClick={() => setSaveDialogOpen(true)}
                  className="w-full mt-2 flex items-center justify-center gap-2 text-xs py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 font-semibold transition-all"
                >
                  <Heart className="w-3.5 h-3.5" />
                  {savedPackId ? "Sauvegarder à nouveau" : "Sauvegarder dans le hub"}
                </button>
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
              {/* Tabs uniquement si Insta (Pinterest = pas d'overlay V1) */}
              {selectedPlatform === "instagram" && (
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
                    <Quote className="w-3.5 h-3.5" />
                    Caption + Hooks
                  </button>
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
                    Overlay
                    {generatedHooks.length > 0 && rightPanelTab !== "overlay" && (
                      <span className="absolute -top-1 -right-1 w-2 h-2 bg-brand-rose rounded-full animate-pulse" />
                    )}
                  </button>
                </div>
              )}

              <div className="flex-1 min-h-0 overflow-y-auto visible-scrollbar pr-2">
                {selectedPlatform === "pinterest" ? (
                  <ResultPanelPinterest
                    title={pinterestTitle}
                    description={pinterestDescription}
                    tags={pinterestTags}
                    hooks={generatedHooks}
                    brandSafety={brandSafety}
                    isGeneratingText={isGeneratingText}
                  />
                ) : rightPanelTab === "text" ? (
                  <ResultPanelTextOnly
                    text={generatedText}
                    hooks={generatedHooks}
                    brandSafety={brandSafety}
                    platform={selectedPlatform}
                    isGeneratingText={isGeneratingText}
                  />
                ) : (
                  <OverlayPanel
                    imageUrls={generatedImages}
                    hooks={generatedHooks}
                    caption={generatedText}
                    currentSlideIndex={currentSlide}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

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
}

function ResultPanelImagesOnly({
  imageUrls,
  isGeneratingImage,
  currentSlide,
  setCurrentSlide,
  expectedCount,
  aspectClass,
}: ResultPanelImagesOnlyProps) {
  const handleDownload = (url: string, index: number) => {
    const a = document.createElement("a");
    a.href = url;
    a.download = `ypersoa-slide-${index + 1}-${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleDownloadAll = () => {
    imageUrls.forEach((url, i) => {
      setTimeout(() => handleDownload(url, i), i * 300);
    });
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
          {expectedCount === 3 ? "3 épingles à venir" : "Carrousel à venir"}
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
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageUrls[currentSlide]}
              alt={`Slide ${currentSlide + 1}`}
              className="w-full h-full object-contain transition-opacity duration-300"
            />

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

            <button
              type="button"
              onClick={() => handleDownload(imageUrls[currentSlide], currentSlide)}
              className="absolute top-3 right-3 bg-white/90 backdrop-blur text-brand-text p-2 rounded-full shadow-lg hover:scale-105 transition-transform opacity-0 group-hover:opacity-100"
              title="Télécharger cette image"
            >
              <Download className="w-4 h-4" />
            </button>
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
  brandSafety: BrandSafety | null;
  platform: "instagram" | "pinterest";
  isGeneratingText: boolean;
}

function ResultPanelTextOnly({
  text,
  hooks,
  brandSafety,
  platform,
  isGeneratingText,
}: ResultPanelTextOnlyProps) {
  const [copiedCaption, setCopiedCaption] = useState(false);
  const [copiedHookIdx, setCopiedHookIdx] = useState<number | null>(null);

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

      <div className="bg-white rounded-2xl p-4 shadow-sm border border-brand-muted/10">
        <div className="flex items-center justify-between mb-2 pb-2 border-b border-brand-muted/10">
          <div className="flex items-center gap-2">
            <Instagram className="w-4 h-4 text-pink-600" />
            <h4 className="font-medium text-sm">Légende Instagram</h4>
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
              {copiedCaption ? "Copié" : "Copier"}
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
  hooks: string[];
  brandSafety: BrandSafety | null;
  isGeneratingText: boolean;
}

function ResultPanelPinterest({
  title,
  description,
  tags,
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
                {tags.length}/10
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
