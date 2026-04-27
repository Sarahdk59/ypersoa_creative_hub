"use client";

import { useState, useEffect } from "react";
import Markdown from "react-markdown";
import {
  Copy,
  Check,
  Download,
  Instagram,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  ShieldCheck,
  Hash,
  Quote,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface BrandViolation {
  term: string;
  position: number;
  severity: "critical" | "warning";
}

interface ResultPanelProps {
  imageUrls: string[];
  text: string | null;
  hooks: string[];
  brandSafety: {
    safe: boolean;
    criticalViolations: BrandViolation[];
    warnings: BrandViolation[];
  } | null;
  platform: "instagram" | "pinterest";
  isGeneratingImage: boolean;
  isGeneratingText: boolean;
}

const HOOK_LABELS = ["Émotion", "Question", "POV", "Humour", "Affirmation"];

export function ResultPanel({
  imageUrls,
  text,
  hooks,
  brandSafety,
  platform,
  isGeneratingImage,
  isGeneratingText,
}: ResultPanelProps) {
  const [copiedCaption, setCopiedCaption] = useState(false);
  const [copiedHookIdx, setCopiedHookIdx] = useState<number | null>(null);
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    setCurrentSlide(0);
  }, [imageUrls]);

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

  const handleDownload = (url: string, index: number) => {
    const a = document.createElement("a");
    a.href = url;
    a.download = `ypersoa-slide-${index + 1}-${Date.now()}.png`;
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
          <Instagram className="w-6 h-6 text-brand-muted" />
        </div>
        <h3 className="font-serif text-2xl font-medium mb-2 text-brand-muted">
          Ton contenu apparaîtra ici
        </h3>
        <p className="text-sm text-brand-muted/70 max-w-[280px]">
          Sélectionne une image, des canoniques, une ambiance et une plateforme.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 h-full">
      {/* Image carousel */}
      <div className="relative w-full aspect-square sm:aspect-[4/5] rounded-3xl overflow-hidden bg-white shadow-sm border border-brand-muted/10 group">
        {isGeneratingImage ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-brand-bg/50 backdrop-blur-sm">
            <div className="w-10 h-10 border-4 border-brand-rose/20 border-t-brand-rose rounded-full animate-spin mb-4" />
            <p className="font-serif text-lg animate-pulse text-center px-4">
              Création du carrousel...
              <br />
              <span className="text-sm text-brand-muted">(Cela peut prendre une minute)</span>
            </p>
          </div>
        ) : imageUrls.length > 0 ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageUrls[currentSlide]}
              alt={`Slide ${currentSlide + 1}`}
              className="w-full h-full object-cover transition-opacity duration-300"
            />

            {imageUrls.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={handlePrev}
                  disabled={currentSlide === 0}
                  className="absolute left-3 top-1/2 -translate-y-1/2 bg-white/80 backdrop-blur text-brand-text p-2 rounded-full shadow-md disabled:opacity-0 opacity-0 group-hover:opacity-100 transition-opacity hover:scale-105"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  disabled={currentSlide === imageUrls.length - 1}
                  className="absolute right-3 top-1/2 -translate-y-1/2 bg-white/80 backdrop-blur text-brand-text p-2 rounded-full shadow-md disabled:opacity-0 opacity-0 group-hover:opacity-100 transition-opacity hover:scale-105"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>

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
              type="button"
              onClick={() => handleDownload(imageUrls[currentSlide], currentSlide)}
              className="absolute top-4 right-4 bg-white/90 backdrop-blur text-brand-text p-3 rounded-full shadow-lg hover:scale-105 transition-transform opacity-0 group-hover:opacity-100"
              title="Télécharger cette image"
            >
              <Download className="w-5 h-5" />
            </button>
          </>
        ) : null}
      </div>

      {/* Brand-safety badge */}
      {brandSafety && !isGeneratingText && text && (
        <div
          className={cn(
            "rounded-2xl p-4 flex items-start gap-3 text-sm",
            brandSafety.safe
              ? "bg-green-50 text-green-800 border border-green-200"
              : "bg-red-50 text-red-800 border border-red-200"
          )}
        >
          {brandSafety.safe ? (
            <ShieldCheck className="w-5 h-5 shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
          )}
          <div className="flex-1">
            <p className="font-medium">
              {brandSafety.safe
                ? "Brand-safe ✓ Aucun terme interdit détecté"
                : `⚠️ ${brandSafety.criticalViolations.length} violation(s) brand`}
            </p>
            {brandSafety.criticalViolations.length > 0 && (
              <ul className="mt-2 text-xs space-y-1">
                {brandSafety.criticalViolations.slice(0, 5).map((v, i) => (
                  <li key={i}>
                    Terme interdit : <strong>&ldquo;{v.term}&rdquo;</strong>
                  </li>
                ))}
              </ul>
            )}
            {brandSafety.warnings.length > 0 && (
              <p className="mt-1 text-xs text-amber-700">
                {brandSafety.warnings.length} avertissement(s) (vouvoiement) — à vérifier.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Caption Instagram */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-brand-muted/10 relative">
        <div className="flex items-center justify-between mb-4 pb-4 border-b border-brand-muted/10">
          <div className="flex items-center gap-2">
            <Instagram className="w-5 h-5 text-pink-600" />
            <h4 className="font-medium">
              Légende {platform === "instagram" ? "Instagram" : "Pinterest"}
            </h4>
          </div>
          {text && !isGeneratingText && (
            <button
              type="button"
              onClick={handleCopyCaption}
              className="flex items-center gap-1.5 text-xs font-medium text-brand-muted hover:text-brand-text transition-colors"
            >
              {copiedCaption ? (
                <Check className="w-4 h-4 text-green-600" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
              {copiedCaption ? "Copié !" : "Copier"}
            </button>
          )}
        </div>

        <div className="overflow-y-auto pr-2 max-h-80">
          {isGeneratingText ? (
            <div className="flex flex-col items-center justify-center py-8">
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

      {/* Hooks éditoriaux */}
      {hooks && hooks.length > 0 && (
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-brand-muted/10">
          <div className="flex items-center gap-2 mb-4 pb-4 border-b border-brand-muted/10">
            <Quote className="w-5 h-5 text-brand-rose" />
            <h4 className="font-medium">5 hooks éditoriaux</h4>
            <span className="text-xs text-brand-muted">(par registre)</span>
          </div>

          <div className="space-y-2">
            {hooks.map((hook, idx) => (
              <div
                key={idx}
                className="flex items-start gap-3 p-3 rounded-xl bg-brand-bg/60 hover:bg-brand-rose/5 transition-colors group"
              >
                <span className="text-xs font-semibold uppercase tracking-wider text-brand-rose mt-1 shrink-0 w-20">
                  {HOOK_LABELS[idx] || `#${idx + 1}`}
                </span>
                <p className="text-sm flex-1">{hook}</p>
                <button
                  type="button"
                  onClick={() => handleCopyHook(hook, idx)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-brand-muted hover:text-brand-text shrink-0"
                  title="Copier ce hook"
                >
                  {copiedHookIdx === idx ? (
                    <Check className="w-4 h-4 text-green-600" />
                  ) : (
                    <Copy className="w-4 h-4" />
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
