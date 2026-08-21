"use client";

import { Baby, Heart, Gift, Flower2, CalendarHeart, Sparkles, Users, Backpack, Sun, Snowflake } from "lucide-react";

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
    id: "fete-des-peres",
    label: "Fête des Pères",
    icon: Gift,
    context:
      "C'est pour la Fête des Pères. Le contenu doit célébrer le lien au papa, la fierté, la transmission, sans cliché viril. Ton tendre et complice. Le cadeau personnalisé qui dit ce qu'on n'ose pas toujours dire. Sous-pilier P2 Émotion : Lien.",
  },
  {
    id: "fete-grands-meres",
    label: "Fête des Grands-Mères",
    icon: Users,
    context:
      "C'est pour la Fête des grands-mères. Le contenu doit célébrer la transmission entre générations, la douceur de la mamie, le souvenir qui se garde. Ton tendre et chaleureux, jamais kitsch. Sous-pilier P2 Émotion : Souvenir.",
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
    id: "rentree",
    label: "Rentrée",
    icon: Backpack,
    context:
      "C'est pour la rentrée. Le contenu évoque le renouveau, l'esprit varsity/college, le cadeau ado ou étudiant, la pièce personnalisée qu'on porte fièrement. Ton énergique et jeune, jamais scolaire. Sous-pilier P3 Produit / Usage.",
  },
  {
    id: "ete",
    label: "Été / Vacances",
    icon: Sun,
    context:
      "C'est pour l'été et les vacances. Le contenu évoque la légèreté, le soleil, les accessoires de saison (casquette), les couleurs. Ton solaire et décontracté. Sous-pilier P3 Produit / Usage.",
  },
  {
    id: "noel",
    label: "Noël",
    icon: Snowflake,
    context:
      "C'est pour Noël. Le contenu évoque le cadeau qui compte, le rituel familial, la chaleur de l'hiver, le sapin. Ton chaleureux et généreux, jamais commercial criard. Sous-pilier P2 Émotion : Lien.",
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
  const selected = OCCASIONS.find((occasion) => occasion.id === selectedOccasion);
  return (
    <div className="rounded-xl border border-brand-muted/15 bg-white p-3 shadow-sm">
      <label className="block text-[10px] font-bold uppercase tracking-[0.14em] text-brand-muted mb-2">Occasion / histoire</label>
      <select
        value={selectedOccasion}
        onChange={(event) => onSelectOccasion(event.target.value)}
        className="w-full rounded-lg border border-brand-muted/20 bg-brand-bg/40 px-3 py-2.5 text-sm text-brand-text outline-none transition focus:border-brand-rose focus:ring-2 focus:ring-brand-rose/10"
      >
        {OCCASIONS.map((occasion) => <option key={occasion.id} value={occasion.id}>{occasion.label}</option>)}
      </select>
      {selected && <p className="mt-2 text-xs leading-relaxed text-brand-muted">{selected.context}</p>}
    </div>
  );
}
