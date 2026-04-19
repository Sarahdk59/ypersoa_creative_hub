import React, { useState, useEffect } from "react";
import Markdown from "react-markdown";
import { Copy, Check, Download, Instagram, Pin, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "../lib/utils";

interface ResultPanelProps {
  imageUrls: string[];
  text: string | null;
  platform: "instagram" | "pinterest";
  isGeneratingImage: boolean;
  isGeneratingText: boolean;
}

export function ResultPanel({
  imageUrls,
  text,
  platform,
  isGeneratingImage,
  isGeneratingText,
}: ResultPanelProps) {
  const [copied, setCopied] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);

  // Reset slide when new images arrive
  useEffect(() => {
    setCurrentSlide(0);
  }, [imageUrls]);

  const handleCopy = () => {
    if (text) {
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownload = (url: string, index: number) => {
    const a = document.createElement("a");
    a.href = url;
    a.download = `atelier-social-slide-${index + 1}-${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handlePrev = () => setCurrentSlide((s) => Math.max(s - 1, 0));
  const handleNext = () => setCurrentSlide((s) => Math.min(s + 1, imageUrls.length - 1));

  if (imageUrls.length === 0 && !text && !isGeneratingImage && !isGeneratingText) {
    return (
      <div className="h-full min-h-[500px] flex flex-col items-center justify-center text-center p-8 border-2 border-dashed border-brand-muted/20 rounded-3xl">
        <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center mb-4 shadow-sm">
          <SparklesIcon className="w-6 h-6 text-brand-muted" />
        </div>
        <h3 className="font-serif text-2xl font-medium mb-2 text-brand-muted">
          Votre contenu apparaîtra ici
        </h3>
        <p className="text-sm text-brand-muted/70 max-w-[280px]">
          Sélectionnez une image, une ambiance et une plateforme pour générer votre carrousel.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 h-full">
      {/* Image Result (Carousel) */}
      <div className="relative w-full aspect-square sm:aspect-[4/5] rounded-3xl overflow-hidden bg-white shadow-sm border border-brand-muted/10 group">
        {isGeneratingImage ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-brand-bg/50 backdrop-blur-sm">
            <div className="w-10 h-10 border-4 border-brand-rose/20 border-t-brand-rose rounded-full animate-spin mb-4" />
            <p className="font-serif text-lg animate-pulse text-center px-4">Création du carrousel ultra-réaliste...<br/><span className="text-sm text-brand-muted">(Cela peut prendre une minute)</span></p>
          </div>
        ) : imageUrls.length > 0 ? (
          <>
            <img 
              src={imageUrls[currentSlide]} 
              alt={`Slide ${currentSlide + 1}`} 
              className="w-full h-full object-cover transition-opacity duration-300" 
            />
            
            {/* Carousel Navigation */}
            {imageUrls.length > 1 && (
              <>
                <button 
                  onClick={handlePrev} 
                  disabled={currentSlide === 0} 
                  className="absolute left-3 top-1/2 -translate-y-1/2 bg-white/80 backdrop-blur text-brand-text p-2 rounded-full shadow-md disabled:opacity-0 opacity-0 group-hover:opacity-100 transition-opacity hover:scale-105"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button 
                  onClick={handleNext} 
                  disabled={currentSlide === imageUrls.length - 1} 
                  className="absolute right-3 top-1/2 -translate-y-1/2 bg-white/80 backdrop-blur text-brand-text p-2 rounded-full shadow-md disabled:opacity-0 opacity-0 group-hover:opacity-100 transition-opacity hover:scale-105"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
                
                {/* Dots indicator */}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 bg-black/20 backdrop-blur-md px-3 py-2 rounded-full">
                  {imageUrls.map((_, i) => (
                    <div 
                      key={i} 
                      className={cn(
                        "w-2 h-2 rounded-full transition-all", 
                        i === currentSlide ? "bg-white scale-110" : "bg-white/50"
                      )} 
                    />
                  ))}
                </div>
              </>
            )}

            <button
              onClick={() => handleDownload(imageUrls[currentSlide], currentSlide)}
              className="absolute top-4 right-4 bg-white/90 backdrop-blur text-brand-text p-3 rounded-full shadow-lg hover:scale-105 transition-transform opacity-0 group-hover:opacity-100"
              title="Télécharger cette image"
            >
              <Download className="w-5 h-5" />
            </button>
          </>
        ) : null}
      </div>

      {/* Text Result */}
      <div className="flex-1 bg-white rounded-3xl p-6 shadow-sm border border-brand-muted/10 relative flex flex-col">
        <div className="flex items-center justify-between mb-4 pb-4 border-b border-brand-muted/10">
          <div className="flex items-center gap-2">
            {platform === "instagram" ? (
              <Instagram className="w-5 h-5 text-pink-600" />
            ) : (
              <Pin className="w-5 h-5 text-red-600" />
            )}
            <h4 className="font-medium">
              Légende {platform === "instagram" ? "Instagram" : "Pinterest"}
            </h4>
          </div>
          {text && !isGeneratingText && (
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 text-xs font-medium text-brand-muted hover:text-brand-text transition-colors"
            >
              {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
              {copied ? "Copié !" : "Copier"}
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto pr-2">
          {isGeneratingText ? (
            <div className="flex flex-col items-center justify-center h-full py-8">
              <div className="flex gap-1 mb-3">
                <div className="w-2 h-2 bg-brand-rose rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <div className="w-2 h-2 bg-brand-rose rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <div className="w-2 h-2 bg-brand-rose rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
              <p className="text-sm text-brand-muted animate-pulse">Rédaction en cours...</p>
            </div>
          ) : text ? (
            <div className="prose prose-sm max-w-none prose-p:leading-relaxed text-brand-text whitespace-pre-wrap">
              <Markdown>{text}</Markdown>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function SparklesIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
      <path d="M5 3v4" />
      <path d="M19 17v4" />
      <path d="M3 5h4" />
      <path d="M17 19h4" />
    </svg>
  );
}
