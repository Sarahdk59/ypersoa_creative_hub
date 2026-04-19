import React, { useState, useEffect } from "react";
import { ImageUploader } from "./components/ImageUploader";
import { VibeSelector, VIBES } from "./components/VibeSelector";
import { OccasionSelector, OCCASIONS } from "./components/OccasionSelector";
import { ResultPanel } from "./components/ResultPanel";
import { generateImageVariation, generateSocialCopy } from "./lib/gemini";
import { Instagram, Pin, Sparkles, AlertCircle, Key } from "lucide-react";
import { cn } from "./lib/utils";

declare global {
  interface Window {
    aistudio?: {
      hasSelectedApiKey: () => Promise<boolean>;
      openSelectKey: () => Promise<void>;
    };
  }
}

export default function App() {
  const [hasApiKey, setHasApiKey] = useState(false);
  const [isCheckingKey, setIsCheckingKey] = useState(true);

  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [customPrompt, setCustomPrompt] = useState("");
  const [selectedVibe, setSelectedVibe] = useState<string>(VIBES[0].id);
  const [selectedOccasion, setSelectedOccasion] = useState<string>(OCCASIONS[0].id);
  const [selectedPlatform, setSelectedPlatform] = useState<"instagram" | "pinterest">("instagram");
  
  const [generatedImages, setGeneratedImages] = useState<string[]>([]);
  const [generatedText, setGeneratedText] = useState<string | null>(null);
  
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [isGeneratingText, setIsGeneratingText] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkKey = async () => {
      try {
        if (window.aistudio) {
          const hasKey = await window.aistudio.hasSelectedApiKey();
          setHasApiKey(!!hasKey);
        } else {
          // If not in AI Studio environment, assume key is provided via env
          setHasApiKey(!!process.env.GEMINI_API_KEY);
        }
      } catch (e) {
        console.error("Error checking API key:", e);
      } finally {
        setIsCheckingKey(false);
      }
    };
    checkKey();
  }, []);

  const handleSelectKey = async () => {
    try {
      if (window.aistudio) {
        await window.aistudio.openSelectKey();
        setHasApiKey(true);
      }
    } catch (e) {
      console.error("Error selecting API key:", e);
    }
  };

  const handleImageSelected = (file: File, base64: string) => {
    setSelectedFile(file);
    setSelectedImage(base64);
    setGeneratedImages([]);
    setGeneratedText(null);
    setError(null);
  };

  const handleGenerate = async () => {
    if (!selectedImage || !selectedFile) return;

    setError(null);
    setIsGeneratingImage(true);
    setIsGeneratingText(true);

    const vibePrompt = VIBES.find((v) => v.id === selectedVibe)?.prompt || "";
    const vibeLabel = VIBES.find((v) => v.id === selectedVibe)?.label || "";
    const occasionContext = OCCASIONS.find((o) => o.id === selectedOccasion)?.context || "";
    const mimeType = selectedFile.type;
    
    // Extract base64 data without the data:image/... prefix
    const base64Data = selectedImage.split(",")[1];

    // Define 3 different angles for the carousel - Art Direction: Emotional, Worn, Minimalist, Realistic
    const angles = [
      "L'ÉMOTION (Porté) : Portrait shot. The embroidered item is WORN by an everyday person (around 30 to 40 years old) with natural features (real skin texture, expression lines, laugh lines). They are looking directly at the camera, laughing or smiling warmly. The emotion is palpable, authentic, and deeply human. Natural movement, highly aesthetic.",
      "LE SAVOIR-FAIRE (Détail) : Intimate close-up on the embroidery while the item is being worn. Focus on the tactile quality of the fabric and a subtle human element (like a hand with natural skin texture or a collarbone). Sensual, refined, and cinematic.",
      "L'ART DE VIVRE (Lifestyle) : Wider lifestyle angle. The everyday person is wearing the garment in their natural environment, looking directly at the camera with a genuine, radiant smile or laugh. Lived-in, authentic, telling a story of joy. Minimalist composition, highly inspiring."
    ];

    try {
      // Generate text first
      const textPromise = generateSocialCopy(base64Data, mimeType, selectedPlatform, vibeLabel, occasionContext, customPrompt);
      
      // Generate images sequentially to avoid rate limits
      const successfulImages: string[] = [];
      for (const angle of angles) {
        try {
          const img = await generateImageVariation(base64Data, mimeType, vibePrompt, angle, customPrompt);
          successfulImages.push(img);
          // Update the UI progressively
          setGeneratedImages([...successfulImages]);
        } catch (e) {
          console.error("Failed to generate image for angle:", angle, e);
        }
      }

      if (successfulImages.length === 0) {
        setError("Impossible de générer les images du carrousel. Veuillez réessayer.");
      }

      try {
        const textResult = await textPromise;
        setGeneratedText(textResult);
      } catch (e) {
        console.error("Text generation failed:", e);
        setError((prev) => prev ? prev + " Impossible de générer le texte." : "Impossible de générer le texte.");
      }

    } catch (err) {
      console.error(err);
      setError("Une erreur inattendue s'est produite.");
    } finally {
      setIsGeneratingImage(false);
      setIsGeneratingText(false);
    }
  };

  if (isCheckingKey) return null;

  if (!hasApiKey) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-bg p-6">
        <div className="bg-white p-10 rounded-[2rem] shadow-xl shadow-brand-rose/5 max-w-md text-center border border-brand-muted/10">
          <div className="w-16 h-16 bg-brand-rose/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <Key className="w-8 h-8 text-brand-rose" />
          </div>
          <h2 className="font-serif text-3xl font-medium mb-4">Clé API requise</h2>
          <p className="text-brand-muted mb-8 leading-relaxed">
            Pour générer des carrousels ultra-réalistes en haute définition (2K), vous devez utiliser votre propre clé API Google Cloud avec la facturation activée.
          </p>
          <button onClick={handleSelectKey} className="primary-button w-full text-lg">
            Configurer ma clé API
          </button>
          <p className="text-sm text-brand-muted mt-6">
            <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noreferrer" className="underline hover:text-brand-text transition-colors">
              En savoir plus sur la facturation
            </a>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-bg text-brand-text font-sans selection:bg-brand-rose/20 selection:text-brand-rose">
      {/* Header */}
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
                Studio Créatif
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          
          {/* Left Column: Controls */}
          <div className="flex flex-col gap-8">
            <section>
              <div className="mb-4">
                <h2 className="font-serif text-3xl font-medium mb-2">1. Votre vision</h2>
                <p className="text-brand-muted">
                  Décrivez le contenu que vous imaginez (ex: "un carrousel émotionnel de préparatif EVJF, photo de soirée entre filles avec le t-shirt brodé").
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
                <h2 className="font-serif text-3xl font-medium mb-2">2. Votre produit</h2>
                <p className="text-brand-muted">
                  Importez une photo de votre création brodée. Nous la mettrons en scène.
                </p>
              </div>
              <ImageUploader
                selectedImage={selectedImage}
                onImageSelected={handleImageSelected}
              />
            </section>

            <section>
              <div className="mb-4">
                <h2 className="font-serif text-3xl font-medium mb-2">3. L'ambiance</h2>
                <p className="text-brand-muted">
                  Choisissez le décor dans lequel votre produit sera mis en valeur.
                </p>
              </div>
              <VibeSelector
                selectedVibe={selectedVibe}
                onSelectVibe={setSelectedVibe}
              />
            </section>

            <section>
              <div className="mb-4">
                <h2 className="font-serif text-3xl font-medium mb-2">4. L'occasion</h2>
                <p className="text-brand-muted">
                  Quel est le contexte de votre publication ?
                </p>
              </div>
              <OccasionSelector
                selectedOccasion={selectedOccasion}
                onSelectOccasion={setSelectedOccasion}
              />
            </section>

            <section>
              <div className="mb-4">
                <h2 className="font-serif text-3xl font-medium mb-2">5. La plateforme</h2>
                <p className="text-brand-muted">
                  Pour quel réseau social souhaitez-vous créer ce contenu ?
                </p>
              </div>
              <div className="flex gap-4">
                <button
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
                onClick={handleGenerate}
                disabled={!selectedImage || isGeneratingImage || isGeneratingText}
                className="w-full primary-button flex items-center justify-center gap-2 text-lg py-4 rounded-2xl shadow-lg shadow-brand-rose/20"
              >
                {isGeneratingImage || isGeneratingText ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Création du carrousel...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    Générer mon carrousel
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Right Column: Results */}
          <div className="lg:sticky lg:top-28 h-fit">
            <ResultPanel
              imageUrls={generatedImages}
              text={generatedText}
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
