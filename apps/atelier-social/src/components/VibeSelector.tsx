"use client";

import { useEffect, useState } from "react";
import { Sparkles, Sun, Leaf, Coffee, Flower, Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  ActiveLookbookAmbiance,
  listActiveLookbookAmbiances,
  LOOKBOOK_VIBE_PREFIX,
} from "@/lib/active-ambiances";

/**
 * 5 vibes alignés sur les 5 ambiances officielles CLAUDE.md v1.1
 * (referentiels/ambiances_shooting.json) + lookbooks ❤️ actifs (Hub partagé)
 * exposés comme "ambiances de référence" pendant 7 jours.
 */
export const VIBES = [
  {
    id: "aube_intime",
    label: "L'Aube Intime",
    description: "Lumière matinale, grain de peau, slow living",
    icon: Coffee,
    prompt:
      "Intimate morning light, soft natural shadows, warm skin tones, wrinkled white linen, slow living atmosphere, deeply emotional and tender",
  },
  {
    id: "loft_organique",
    label: "Loft Organique",
    description: "Béton ciré, serre lumineuse, chic végétal",
    icon: Flower,
    prompt:
      "Premium chic aesthetic, modern botanical greenhouse loft interior, polished concrete floors, abundant bright natural light, lush organic plants, Vogue Living editorial style, architectural and organic blend",
  },
  {
    id: "studio_brut",
    label: "Studio Brut",
    description: "Minimalisme absolu, ombres franches, sobre",
    icon: Sparkles,
    prompt:
      "High-end minimalist studio setting, concrete or pure off-white background, sharp elegant shadows, sober editorial, Sézane × A.P.C. campaign aesthetic, French quiet luxury",
  },
  {
    id: "echappee_sauvage",
    label: "Échappée Sauvage",
    description: "Vent, mouvement, éléments naturels bruts",
    icon: Leaf,
    prompt:
      "Wild natural setting, wind in the hair and fabric, dappled sunlight through trees, organic textures, feeling of freedom and connection to earth, cinematic outdoor photography",
  },
  {
    id: "lumiere_sepia",
    label: "Lumière Sépia",
    description: "Heure dorée, nostalgie 35mm, poésie visuelle",
    icon: Sun,
    prompt:
      "Golden hour lighting, nostalgic 35mm film look, romantic and poetic atmosphere, warm sunset glow, soft focus, timeless emotive feel",
  },
];

interface VibeSelectorProps {
  selectedVibe: string;
  onSelectVibe: (vibeId: string) => void;
}

export function VibeSelector({ selectedVibe, onSelectVibe }: VibeSelectorProps) {
  const [activeAmbiances, setActiveAmbiances] = useState<ActiveLookbookAmbiance[]>([]);

  useEffect(() => {
    listActiveLookbookAmbiances().then(setActiveAmbiances).catch(() => undefined);
  }, []);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {VIBES.map((vibe) => {
          const Icon = vibe.icon;
          const isSelected = selectedVibe === vibe.id;

          return (
            <button
              key={vibe.id}
              type="button"
              onClick={() => onSelectVibe(vibe.id)}
              className={cn(
                "flex flex-col items-start p-4 rounded-2xl border text-left transition-all",
                isSelected
                  ? "border-brand-rose bg-brand-rose/5 ring-1 ring-brand-rose"
                  : "border-brand-muted/20 bg-white hover:border-brand-rose/40 hover:bg-brand-rose/5"
              )}
            >
              <div className="flex items-center gap-2 mb-2">
                <Icon
                  className={cn(
                    "w-4 h-4",
                    isSelected ? "text-brand-rose" : "text-brand-muted"
                  )}
                />
                <span className="font-medium text-sm">{vibe.label}</span>
              </div>
              <span className="text-xs text-brand-muted leading-relaxed">
                {vibe.description}
              </span>
            </button>
          );
        })}
      </div>

      {activeAmbiances.length > 0 && (
        <div className="pt-3 border-t border-brand-muted/15">
          <div className="flex items-center gap-2 mb-2">
            <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
            <span className="text-[10px] font-bold text-brand-text uppercase tracking-wider">
              Mes ambiances de référence
            </span>
            <span className="text-[10px] text-brand-muted italic">7j</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {activeAmbiances.map((lb) => {
              const id = `${LOOKBOOK_VIBE_PREFIX}${lb.id}`;
              const isSelected = selectedVibe === id;
              const expires = lb.date_archivage
                ? new Date(lb.date_archivage).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })
                : null;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => onSelectVibe(id)}
                  className={cn(
                    "flex items-center gap-3 p-2 rounded-2xl border text-left transition-all",
                    isSelected
                      ? "border-brand-rose bg-brand-rose/5 ring-1 ring-brand-rose"
                      : "border-brand-muted/20 bg-white hover:border-brand-rose/40 hover:bg-brand-rose/5"
                  )}
                  title={`Active jusqu'au ${expires || "—"}`}
                >
                  {lb.cover_image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={lb.cover_image_url}
                      alt={lb.titre}
                      className="w-12 h-14 rounded-md object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-12 h-14 rounded-md bg-brand-bg flex items-center justify-center flex-shrink-0">
                      <Heart className="w-4 h-4 text-brand-muted" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className={cn("font-medium text-xs truncate", isSelected ? "text-brand-rose" : "text-brand-text")}>
                      {lb.titre}
                    </div>
                    <div className="text-[10px] text-brand-muted truncate">
                      {expires ? `jusqu'au ${expires}` : "actif"}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
