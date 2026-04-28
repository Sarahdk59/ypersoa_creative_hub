"use client";

import { useState, useEffect } from "react";
import {
  OVERLAY_TEMPLATES,
  composeOverlay,
  type OverlayTemplateId,
  type ColorMode,
} from "@/lib/overlay-templates";
import { Type, Download, RefreshCw, Check, Palette } from "lucide-react";
import { cn } from "@/lib/utils";

const HOOK_LABELS = ["Émotion", "Question", "POV", "Humour", "Affirmation"];

interface OverlayPanelProps {
  imageUrls: string[];
  hooks: string[];
  caption: string | null;
  currentSlideIndex: number;
}

export function OverlayPanel({
  imageUrls,
  hooks,
  caption,
  currentSlideIndex,
}: OverlayPanelProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<OverlayTemplateId>("title-bottom");
  const [selectedHookIndex, setSelectedHookIndex] = useState<number>(0);
  const [customText, setCustomText] = useState("");
  const [useCustomText, setUseCustomText] = useState(false);
  const [colorMode, setColorMode] = useState<ColorMode>("auto");
  const [composedImage, setComposedImage] = useState<string | null>(null);
  const [isComposing, setIsComposing] = useState(false);

  const currentImage = imageUrls[currentSlideIndex];
  const textToUse = useCustomText
    ? customText
    : hooks[selectedHookIndex] || "Pour celle qui...";

  // Auto-compose quand params changent
  useEffect(() => {
    if (!currentImage || !textToUse.trim()) {
      setComposedImage(null);
      return;
    }

    setIsComposing(true);
    composeOverlay({
      imageDataUrl: currentImage,
      text: textToUse,
      templateId: selectedTemplate,
      colorMode,
      width: 1080,
      height: 1350,
    })
      .then((result) => {
        setComposedImage(result);
        setIsComposing(false);
      })
      .catch((err) => {
        console.error("Compose failed:", err);
        setIsComposing(false);
      });
  }, [currentImage, textToUse, selectedTemplate, colorMode]);

  const handleDownload = () => {
    if (!composedImage) return;
    const a = document.createElement("a");
    a.href = composedImage;
    a.download = `ypersoa-overlay-${selectedTemplate}-${colorMode}-${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  if (!currentImage) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center p-6 border-2 border-dashed border-brand-muted/20 rounded-2xl">
        <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center mb-3 shadow-sm">
          <Type className="w-5 h-5 text-brand-muted" />
        </div>
        <h3 className="font-serif text-base font-medium mb-1 text-brand-muted">
          Overlay à venir
        </h3>
        <p className="text-xs text-brand-muted/70">
          Génère d&apos;abord un carrousel
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 h-full overflow-y-auto pr-2">
      {/* Preview composée */}
      <div className="bg-white rounded-2xl p-3 shadow-sm border border-brand-muted/10">
        <div className="flex items-center justify-between mb-2 pb-2 border-b border-brand-muted/10">
          <div className="flex items-center gap-2">
            <Type className="w-4 h-4 text-brand-rose" />
            <h4 className="font-medium text-sm">Aperçu overlay</h4>
            <span className="text-[10px] text-brand-muted">
              (4:5 — 1080×1350)
            </span>
          </div>
          {composedImage && (
            <button
              type="button"
              onClick={handleDownload}
              className="flex items-center gap-1 text-xs font-medium text-brand-rose hover:underline"
            >
              <Download className="w-3 h-3" />
              Télécharger
            </button>
          )}
        </div>

        <div className="relative aspect-[4/5] rounded-xl overflow-hidden bg-brand-bg">
          {isComposing && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/60 z-10">
              <RefreshCw className="w-6 h-6 text-brand-rose animate-spin" />
            </div>
          )}
          {composedImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={composedImage}
              alt="Overlay preview"
              className="w-full h-full object-contain"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-xs text-brand-muted">
              Composition...
            </div>
          )}
        </div>
      </div>

      {/* Toggle couleur — NOUVEAU */}
      <div className="bg-white rounded-2xl p-3 shadow-sm border border-brand-muted/10">
        <h5 className="text-xs font-semibold uppercase tracking-wider text-brand-muted mb-2 flex items-center gap-1.5">
          <Palette className="w-3.5 h-3.5" />
          Couleur du texte
        </h5>
        <div className="grid grid-cols-3 gap-1.5">
          <button
            type="button"
            onClick={() => setColorMode("auto")}
            className={cn(
              "py-2 rounded-lg text-xs font-medium transition-all",
              colorMode === "auto"
                ? "bg-brand-rose text-white"
                : "bg-brand-bg text-brand-muted hover:bg-brand-rose/10"
            )}
          >
            Auto
          </button>
          <button
            type="button"
            onClick={() => setColorMode("white")}
            className={cn(
              "py-2 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1.5",
              colorMode === "white"
                ? "bg-brand-rose text-white"
                : "bg-brand-bg text-brand-muted hover:bg-brand-rose/10"
            )}
          >
            <span className="w-3 h-3 rounded-full bg-[#FAF7F2] border border-brand-muted/30" />
            Blanc
          </button>
          <button
            type="button"
            onClick={() => setColorMode("marine")}
            className={cn(
              "py-2 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1.5",
              colorMode === "marine"
                ? "bg-brand-rose text-white"
                : "bg-brand-bg text-brand-muted hover:bg-brand-rose/10"
            )}
          >
            <span className="w-3 h-3 rounded-full bg-[#1A2E4F]" />
            Marine
          </button>
        </div>
        {colorMode === "auto" && (
          <p className="text-[10px] text-brand-muted mt-1.5 italic">
            Détection automatique selon la dominante de l&apos;image
          </p>
        )}
      </div>

      {/* Sélecteur template */}
      <div className="bg-white rounded-2xl p-3 shadow-sm border border-brand-muted/10">
        <h5 className="text-xs font-semibold uppercase tracking-wider text-brand-muted mb-2">
          Template
        </h5>
        <div className="grid grid-cols-1 gap-1.5">
          {OVERLAY_TEMPLATES.map((tpl) => (
            <button
              key={tpl.id}
              type="button"
              onClick={() => setSelectedTemplate(tpl.id)}
              className={cn(
                "flex items-center gap-2 p-2 rounded-lg text-left transition-all text-xs",
                selectedTemplate === tpl.id
                  ? "bg-brand-rose/10 border border-brand-rose"
                  : "bg-brand-bg/60 hover:bg-brand-rose/5 border border-transparent"
              )}
            >
              <span className="text-base">{tpl.preview}</span>
              <div className="flex-1 min-w-0">
                <div className="font-medium">{tpl.label}</div>
                <div className="text-[10px] text-brand-muted truncate">
                  {tpl.description}
                </div>
              </div>
              {selectedTemplate === tpl.id && (
                <Check className="w-3.5 h-3.5 text-brand-rose shrink-0" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Sélecteur de texte */}
      <div className="bg-white rounded-2xl p-3 shadow-sm border border-brand-muted/10">
        <h5 className="text-xs font-semibold uppercase tracking-wider text-brand-muted mb-2">
          Texte
        </h5>

        <div className="flex gap-1 mb-2">
          <button
            type="button"
            onClick={() => setUseCustomText(false)}
            className={cn(
              "flex-1 py-1.5 rounded-lg text-xs font-medium transition-all",
              !useCustomText
                ? "bg-brand-rose text-white"
                : "bg-brand-bg text-brand-muted hover:bg-brand-rose/10"
            )}
          >
            Hooks générés
          </button>
          <button
            type="button"
            onClick={() => setUseCustomText(true)}
            className={cn(
              "flex-1 py-1.5 rounded-lg text-xs font-medium transition-all",
              useCustomText
                ? "bg-brand-rose text-white"
                : "bg-brand-bg text-brand-muted hover:bg-brand-rose/10"
            )}
          >
            Texte libre
          </button>
        </div>

        {!useCustomText ? (
          hooks.length > 0 ? (
            <div className="space-y-1">
              {hooks.map((hook, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setSelectedHookIndex(idx)}
                  className={cn(
                    "w-full flex items-start gap-2 p-2 rounded-lg text-left transition-all",
                    selectedHookIndex === idx
                      ? "bg-brand-rose/10 border border-brand-rose"
                      : "bg-brand-bg/60 hover:bg-brand-rose/5 border border-transparent"
                  )}
                >
                  <span className="text-[9px] font-semibold uppercase tracking-wider text-brand-rose mt-0.5 shrink-0 w-14">
                    {HOOK_LABELS[idx] || `#${idx + 1}`}
                  </span>
                  <p className="text-[11px] flex-1 line-clamp-2">{hook}</p>
                </button>
              ))}
            </div>
          ) : (
            <p className="text-xs text-brand-muted text-center py-2">
              Aucun hook disponible. Génère d&apos;abord un pack.
            </p>
          )
        ) : (
          <textarea
            value={customText}
            onChange={(e) => setCustomText(e.target.value)}
            placeholder="Écris ton texte (court : 3-10 mots idéal)..."
            className="w-full p-2 rounded-lg border border-brand-muted/20 bg-white focus:outline-none focus:ring-1 focus:ring-brand-rose/50 resize-none h-16 text-xs"
          />
        )}
      </div>
    </div>
  );
}
