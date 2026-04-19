import React from "react";
import { cn } from "../lib/utils";
import { Baby, Heart, Gift, Flower2, CalendarHeart, Sparkles } from "lucide-react";

export const OCCASIONS = [
  {
    id: "fete-des-meres",
    label: "Fête des Mères",
    icon: Flower2,
    context: "Nous préparons la Fête des Mères. Le message doit être centré sur l'amour maternel, le cadeau unique qui touche en plein cœur, le lien indéfectible.",
  },
  {
    id: "naissance",
    label: "Naissance",
    icon: Baby,
    context: "C'est pour célébrer une naissance. Le message doit être doux, centré sur l'arrivée d'un nouveau-né, le cadeau de naissance mémorable et la douceur de l'enfance.",
  },
  {
    id: "mariage",
    label: "Mariage / EVJF",
    icon: Heart,
    context: "C'est pour un mariage ou un EVJF (Enterrement de Vie de Jeune Fille). Le message doit être festif, centré sur l'amour, l'amitié, et les souvenirs inoubliables à broder.",
  },
  {
    id: "nounou",
    label: "Merci Nounou",
    icon: Gift,
    context: "C'est un cadeau de fin d'année pour remercier une nounou ou une maîtresse. Le message doit exprimer la gratitude, la reconnaissance pour le soin apporté aux enfants et le côté souvenir personnalisé.",
  },
  {
    id: "amour",
    label: "Amour / Saint-Valentin",
    icon: CalendarHeart,
    context: "C'est un cadeau romantique (Saint-Valentin, anniversaire de couple). Le message doit être passionné, intime, soulignant que la broderie est une preuve d'amour éternelle.",
  },
  {
    id: "quotidien",
    label: "Plaisir d'offrir",
    icon: Sparkles,
    context: "C'est un cadeau pour le plaisir d'offrir ou pour se faire plaisir à soi-même. Le message doit mettre en avant l'artisanat, le style, et le fait de s'offrir une pièce unique Ypersoa.",
  },
];

interface OccasionSelectorProps {
  selectedOccasion: string;
  onSelectOccasion: (occasionId: string) => void;
}

export function OccasionSelector({ selectedOccasion, onSelectOccasion }: OccasionSelectorProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {OCCASIONS.map((occasion) => {
        const Icon = occasion.icon;
        const isSelected = selectedOccasion === occasion.id;
        
        return (
          <button
            key={occasion.id}
            onClick={() => onSelectOccasion(occasion.id)}
            className={cn(
              "flex flex-col items-center justify-center p-4 rounded-2xl border text-center transition-all",
              isSelected
                ? "border-brand-rose bg-brand-rose/5 ring-1 ring-brand-rose text-brand-rose"
                : "border-brand-muted/20 bg-white hover:border-brand-rose/40 hover:bg-brand-rose/5 text-brand-text"
            )}
          >
            <Icon className={cn("w-6 h-6 mb-2", isSelected ? "text-brand-rose" : "text-brand-muted")} />
            <span className="font-medium text-sm leading-tight">{occasion.label}</span>
          </button>
        );
      })}
    </div>
  );
}
