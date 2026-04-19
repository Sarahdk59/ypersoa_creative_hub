import React from "react";
import { cn } from "../lib/utils";
import { Sparkles, Sun, Leaf, Coffee, Flower } from "lucide-react";

export const VIBES = [
  {
    id: "cozy",
    label: "L'Aube Intime",
    description: "Lumière matinale, grain de peau, douceur du coton",
    icon: Coffee,
    prompt: "Intimate morning light, soft shadows, warm skin tones, wrinkled white linen, a feeling of slow living and deep comfort, highly emotional.",
  },
  {
    id: "botanical-loft",
    label: "Loft Organique",
    description: "Béton ciré, serre lumineuse, chic et végétal",
    icon: Flower,
    prompt: "Premium chic aesthetic, interior of a modern botanical greenhouse loft, polished concrete floors, abundant bright natural light, lush organic plants, highly luminous, architectural and organic blend, high-end interior design photography, Vogue living editorial.",
  },
  {
    id: "minimal",
    label: "Studio Brut",
    description: "Minimalisme absolu, ombres franches, haute couture",
    icon: Sparkles,
    prompt: "High-end minimalist studio, concrete or pure off-white background, sharp elegant shadows, avant-garde fashion editorial, pure and sophisticated.",
  },
  {
    id: "nature",
    label: "Échappée Sauvage",
    description: "Vent, mouvement, éléments naturels bruts",
    icon: Leaf,
    prompt: "Wild natural setting, wind in the hair/fabric, dappled sunlight, organic textures, feeling of freedom and connection to earth, cinematic outdoor.",
  },
  {
    id: "romantic",
    label: "Lumière Sépia",
    description: "Heure dorée, nostalgie, poésie visuelle",
    icon: Sun,
    prompt: "Golden hour lighting, nostalgic 35mm film look, romantic and poetic atmosphere, warm sunset glow, soft focus, highly emotive and timeless.",
  },
];

interface VibeSelectorProps {
  selectedVibe: string;
  onSelectVibe: (vibeId: string) => void;
}

export function VibeSelector({ selectedVibe, onSelectVibe }: VibeSelectorProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {VIBES.map((vibe) => {
        const Icon = vibe.icon;
        const isSelected = selectedVibe === vibe.id;
        
        return (
          <button
            key={vibe.id}
            onClick={() => onSelectVibe(vibe.id)}
            className={cn(
              "flex flex-col items-start p-4 rounded-2xl border text-left transition-all",
              isSelected
                ? "border-brand-rose bg-brand-rose/5 ring-1 ring-brand-rose"
                : "border-brand-muted/20 bg-white hover:border-brand-rose/40 hover:bg-brand-rose/5"
            )}
          >
            <div className="flex items-center gap-2 mb-2">
              <Icon className={cn("w-4 h-4", isSelected ? "text-brand-rose" : "text-brand-muted")} />
              <span className="font-medium text-sm">{vibe.label}</span>
            </div>
            <span className="text-xs text-brand-muted leading-relaxed">
              {vibe.description}
            </span>
          </button>
        );
      })}
    </div>
  );
}
