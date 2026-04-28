"use client";

import { useState } from "react";
import { ImageUploader } from "@/components/ImageUploader";
import { VibeSelector, VIBES } from "@/components/VibeSelector";
import { OccasionSelector, OCCASIONS } from "@/components/OccasionSelector";
import { ResultPanel } from "@/components/ResultPanel";
import { CanoniqueSelector } from "@/components/CanoniqueSelector";
import { generateImageVariation } from "@/lib/api-client";
import { CANONIQUES } from "@/lib/canoniques";
import { Instagram, Pin, Sparkles, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

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

export default function Home() {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [customPrompt, setCustomPrompt] = useState("");
  const [selectedVibe, setSelectedVibe] = useState<string>(VIBES[0].id);
  const [selectedOccasion, setSelectedOccasion] = useState<string>(OCCASIONS[0].id);
  const [selectedPlatform, setSelectedPlatform] = useState<"instagram" | "pinterest">("instagram");
  const [selectedCanoniqueIds, setSelectedCanoniqueIds] = useState<string[]>([]);

  const [generatedImages, setGeneratedImages] = useState<string[]>([]);
  const [generatedText, setGeneratedText] = useState<string | null>(null);
  const [generatedHooks, setGeneratedHooks] = useState<string[]>([]);
  const [brandSafety, setBrandSafety] = useState<BrandSafety | null>(null);

  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [isGeneratingText, setIsGeneratingText] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleImageSelected = (file: File, base64: string) => {
    setSelectedFile(file);
    setSelectedImage(base64);
    setGeneratedImages([]);
    setGeneratedText(null);
    setGeneratedHooks([]);
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

    const vibePrompt = VIBES.find((v) => v.id === selectedVibe)?.prompt || "";
    const vibeLabel = VIBES.find((v) => v.id === selectedVibe)?.label || "";
    const occasionContext = OCCASIONS.find((o) => o.id === selectedOccasion)?.context || "";
    const mimeType = selectedFile.type;
    const base64Data = selectedImage.split(",")[1];
    const canoniqueContext = buildCanoniqueContext();

    // === 5 ANGLES NARRATIFS - Mix éditorial Émoï-Émoï × Sézane ===
    // Logique : Stop-scroll → Motif brille → Tactile → Storytelling → Art de vivre
    const angles = [
      // 1. PORTRAIT FRONTAL — la slide d'accroche
      "PORTRAIT FRONTAL : Head and shoulders shot, looking directly into the camera lens with a warm, genuine, deeply human smile. Eyes connect with the viewer. Natural three-quarter face composition. The embroidered detail on the garment is visible at the bottom of the frame. This is the stop-scroll image — must communicate immediate emotional warmth.",

      // 2. DEMI-FIGURE 3/4 — le motif brille avec l'humain
      "DEMI-FIGURE 3/4 : Medium shot framed from the top of the head to mid-torso, slight 3/4 angle (slightly turned to one side, not pure front). The embroidered design on the left chest is sharp, well-lit, and clearly visible — this is THE shot where the motif gets its moment. The face remains visible (at least 2/3) with a calm, confident, slightly half-smiling expression. Composition: rule of thirds, embroidery in the lower third.",

      // 3. DÉTAIL INTIMISTE — sensualité tactile
      "DÉTAIL INTIMISTE : Close-up shot focused on the embroidered design, but ALWAYS including a fragment of human presence — a hand gently touching the fabric, fingers grazing the embroidery, a partial chin or cheek visible at the edge of the frame, a glimpse of hair. NEVER a pure flat lay or product shot. The texture of the thread, the depth of the embroidery, the weave of the fabric must be tangible. Macro film grain feel. This conveys 'I want to touch this'.",

      // 4. SCÈNE NARRATIVE — storytelling instant
      "SCÈNE NARRATIVE : Medium shot capturing a candid everyday moment — the person doing something simple and authentic: holding a coffee cup, adjusting their collar with one hand, looking thoughtfully out a window, walking with a slight movement, tying their hair back, reaching for a book. The person is NOT posing for the camera — they are caught in a moment. Cinematic still feel. The garment with embroidery is naturally part of the scene, not the focal point. This conveys 'this is my life, this piece is part of it'.",

      // 5. LIFESTYLE WIDE — respiration et contexte
      "LIFESTYLE WIDE : Wide environmental shot, person in full body or 3/4 length, integrated naturally into a rich context that matches the vibe (interior, exterior, garden, café, atelier — coherent with the chosen ambiance). Architecture, light, materials, plants — the environment breathes around the person. The garment is visible but integrated, not centered. The person looks at ease, at home in this space. This conveys 'I see myself living here, wearing this'. Composition: golden ratio.",
    ];

    try {
      // Lance text generation en parallèle des images
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

      // Génère les 5 images séquentiellement (rate limit Gemini + meilleur character ref consistency)
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
          });
          successfulImages.push(img);
          setGeneratedImages([...successfulImages]);
        } catch (e) {
          console.error("Failed to generate image for angle:", angle.substring(0, 60), e);
        }
      }

      if (successfulImages.length === 0) {
        setError("Impossible de générer les images du carrousel. Réessaie.");
      }

      // Récupère le résultat de la génération texte
      try {
        const textResponse = await textPromise;
        if (!textResponse.ok) {
          const errorData = await textResponse.json().catch(() => ({}));
          throw new Error(errorData.message || "Copy generation failed");
        }

        const data = await textResponse.json();
        setGeneratedText(data.text);
        if (data.brandSafety) {
          setBrandSafety(data.brandSafety);
        }
        if (data.hooks) {
          setGeneratedHooks(data.hooks);
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

  return (
    <div className="min-h-screen bg-brand-bg text-brand-text font-sans selection:bg-brand-rose/20 selection:text-brand-rose">
      <header className="w-full bg-white/80 backdrop-blur-md border-b border-brand-muted/10 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-brand-rose rounded-full flex items-center justify-center text-white">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-serif text-2xl font-semibold tracking-tight text-brand-text leading-none">
                Ypersoa
              </h1>
              <p className="text-xs text-brand-sage uppercase tracking-widest mt-1 font-bold">
                Atelier Social — Hub
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          <div className="flex flex-col gap-8">
            <section>
              <div className="mb-4">
                <h2 className="font-serif text-3xl font-medium mb-2">1. Ta vision</h2>
                <p className="text-brand-muted">
                  Décris le contenu que tu imagines.
                </p>
              </div>
              <textarea
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                placeholder="Je veux un carrousel..."
                className="w-full p-4 rounded-2xl border border-brand-muted/20 bg-white focus:outline-none focus:ring-2 focus:ring-brand-rose/50 resize-none h-32 text-brand-text placeholder:text-brand-muted/50"
              />
            </section>

            <section>
              <div className="mb-4">
                <h2 className="font-serif text-3xl font-medium mb-2">2. Ton produit</h2>
                <p className="text-brand-muted">
                  Importe une photo de ta création brodée.
                </p>
              </div>
              <ImageUploader
                selectedImage={selectedImage}
                onImageSelected={handleImageSelected}
              />
            </section>

            <section>
              <div className="mb-4">
                <h2 className="font-serif text-3xl font-medium mb-2">3. Tes mannequins</h2>
                <p className="text-brand-muted">
                  Choisis 1 à 3 canoniques. Vide = visage aléatoire généré par Gemini.
                </p>
              </div>
              <CanoniqueSelector
                selectedIds={selectedCanoniqueIds}
                onChange={setSelectedCanoniqueIds}
                maxSelection={3}
              />
            </section>

            <section>
              <div className="mb-4">
                <h2 className="font-serif text-3xl font-medium mb-2">4. L&apos;ambiance</h2>
                <p className="text-brand-muted">
                  Aligné sur les 5 ambiances officielles Ypersoa.
                </p>
              </div>
              <VibeSelector selectedVibe={selectedVibe} onSelectVibe={setSelectedVibe} />
            </section>

            <section>
              <div className="mb-4">
                <h2 className="font-serif text-3xl font-medium mb-2">5. L&apos;occasion</h2>
                <p className="text-brand-muted">Quel est le contexte de ta publication ?</p>
              </div>
              <OccasionSelector
                selectedOccasion={selectedOccasion}
                onSelectOccasion={setSelectedOccasion}
              />
            </section>

            <section>
              <div className="mb-4">
                <h2 className="font-serif text-3xl font-medium mb-2">6. La plateforme</h2>
                <p className="text-brand-muted">Pour quel réseau social ?</p>
              </div>
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setSelectedPlatform("instagram")}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl border font-medium transition-all",
                    selectedPlatform === "instagram"
                      ? "border-pink-500 bg-pink-50 text-pink-700 ring-1 ring-pink-500"
                      : "border-brand-muted/20 bg-white hover:border-pink-200 hover:bg-pink-50/50 text-brand-text"
                  )}
                >
                  <Instagram className="w-5 h-5" />
                  Instagram
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedPlatform("pinterest")}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl border font-medium transition-all",
                    selectedPlatform === "pinterest"
                      ? "border-red-500 bg-red-50 text-red-700 ring-1 ring-red-500"
                      : "border-brand-muted/20 bg-white hover:border-red-200 hover:bg-red-50/50 text-brand-text"
                  )}
                >
                  <Pin className="w-5 h-5" />
                  Pinterest
                </button>
              </div>
            </section>

            <div className="pt-4 border-t border-brand-muted/20">
              {error && (
                <div className="mb-4 p-4 bg-red-50 text-red-700 rounded-2xl flex items-start gap-3 text-sm">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <p>{error}</p>
                </div>
              )}

              <button
                type="button"
                onClick={handleGenerate}
                disabled={!selectedImage || isGeneratingImage || isGeneratingText}
                className="w-full primary-button flex items-center justify-center gap-2 text-lg py-4 rounded-2xl shadow-lg shadow-brand-rose/20"
              >
                {isGeneratingImage || isGeneratingText ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Création en cours... (5-7 min)
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    Générer mon carrousel (5 slides)
                  </>
                )}
              </button>
              {isGeneratingImage && generatedImages.length > 0 && (
                <p className="text-xs text-brand-muted mt-2 text-center">
                  {generatedImages.length}/5 images générées...
                </p>
              )}
            </div>
          </div>

          <div className="lg:sticky lg:top-28 h-fit">
            <ResultPanel
              imageUrls={generatedImages}
              text={generatedText}
              hooks={generatedHooks}
              brandSafety={brandSafety}
              platform={selectedPlatform}
              isGeneratingImage={isGeneratingImage}
              isGeneratingText={isGeneratingText}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
