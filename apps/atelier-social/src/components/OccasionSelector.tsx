"use client";

import { Baby, Heart, Gift, Flower2, CalendarHeart, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * 6 occasions reformulées BRAND-SAFE :
 * - Tutoiement (pas de "vous", "votre")
 * - Aucune mention "artisanal", "fait main", "fil et aiguille"
 * - Ton sobre Émoï-Émoï × Make My Lemonade × Gamin Gamine
 * - Refs piliers éditoriaux Ypersoa
 */
export const OCCASIONS = [
  {
    id: "fete-des-meres",
    label: "Fête des Mères",
    icon: Flower2,
    context:
      "C'est pour la Fête des Mères. Le contenu doit célébrer le lien mère-enfant, le cadeau qui touche en plein cœur, la transmission. Ton complice et chaleureux, pas mièvre. Sous-pilier P2 Émotion : Lien.",
  },
  {
    id: "naissance",
    label: "Naissance",
    icon: Baby,
    context:
      "C'est pour célébrer une naissance. Le contenu doit évoquer l'arrivée du nouveau-né, le cadeau de naissance qui marque le début d'une histoire, la douceur de l'enfance. Ton tendre, sobre, jamais kitsch. Sous-pilier P2 Émotion : Souvenir.",
  },
  {
    id: "mariage",
    label: "Mariage / EVJF",
    icon: Heart,
    context:
      "C'est pour un mariage ou un EVJF. Le contenu doit célébrer l'amour, l'amitié sista, les souvenirs à broder. Ton festif et complice, registre Sista Club. Anti-girlboss caricaturale. Sous-pilier P2 Émotion : Lien.",
  },
  {
    id: "nounou",
    label: "Merci Nounou",
    icon: Gift,
    context:
      "C'est un cadeau pour remercier une nounou ou une maîtresse en fin d'année. Le contenu doit exprimer la gratitude pour le soin apporté aux enfants. Ton sincère, chaleureux, jamais corporate. Le cadeau est personnalisé, pensé, durable.",
  },
  {
    id: "amour",
    label: "Amour / Saint-Valentin",
    icon: CalendarHeart,
    context:
      "C'est un cadeau romantique (Saint-Valentin, anniversaire de couple, première rencontre). Le contenu évoque l'intimité du couple, la preuve d'amour qui dure. Ton intime et pudique, pas démonstratif. Émotion retenue.",
  },
  {
    id: "quotidien",
    label: "Plaisir d'offrir",
    icon: Sparkles,
    context:
      "C'est un cadeau pour le plaisir d'offrir ou pour se faire plaisir à soi-même. Le contenu met en avant le style brodé Ypersoa, la pièce unique et personnalisée, la présence sobre du motif sur le buste gauche. Sous-pilier P3 Produit / Usage.",
  },
];

interface OccasionSelectorProps {
  selectedOccasion: string;
  onSelectOccasion: (occasionId: string) => void;
}

export function OccasionSelector({
  selectedOccasion,
  onSelectOccasion,
}: OccasionSelectorProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {OCCASIONS.map((occasion) => {
        const Icon = occasion.icon;
        const isSelected = selectedOccasion === occasion.id;

        return (
          <button
            key={occasion.id}
            type="button"
            onClick={() => onSelectOccasion(occasion.id)}
            className={cn(
              "flex flex-col items-center justify-center p-4 rounded-2xl border text-center transition-all",
              isSelected
                ? "border-brand-rose bg-brand-rose/5 ring-1 ring-brand-rose text-brand-rose"
                : "border-brand-muted/20 bg-white hover:border-brand-rose/40 hover:bg-brand-rose/5 text-brand-text"
            )}
          >
            <Icon
              className={cn(
                "w-6 h-6 mb-2",
                isSelected ? "text-brand-rose" : "text-brand-muted"
              )}
            />
            <span className="font-medium text-sm leading-tight">{occasion.label}</span>
          </button>
        );
      })}
    </div>
  );
}
