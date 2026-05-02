/**
 * 6 ambiances officielles Ypersoa — source de vérité unifiée 2026-05-02.
 *
 * Mirror client-side de referentiels/shooting/ambiances_shooting.json (v1.1).
 * Utilisé par : VibeSelector (atelier-social) + Shooting Book form (atelier-DA).
 *
 * Atelier-shooting (Vite) a sa propre liste DECOR_STYLES dans constants.tsx — à aligner
 * en V1 si besoin. Pour l'instant les 6 IDs ici sont les mêmes que ceux du référentiel.
 *
 * Ces 6 ambiances sont les UNIQUES vibes/décors visuels officiels Ypersoa.
 * Toute évolution passe par mise à jour du référentiel JSON + bump de schema_version.
 */
import { Coffee, Flower, Sparkles, Leaf, Sun, Flower2, type LucideIcon } from "lucide-react";

export interface AmbianceOfficielle {
  id: string;
  label: string;
  description: string;
  icon: LucideIcon;
  prompt: string;
  /** Path relatif servi par /referentiel_ambiance/<id>.jpg — Sarah uploade dans assets/referentiel_ambiance/. Fallback graceful si absent. */
  image_path: string;
}

export const AMBIANCES_OFFICIELLES: AmbianceOfficielle[] = [
  {
    id: "studio_brut",
    label: "Studio Brut",
    description: "Minimalisme absolu, ombres franches, sobre",
    icon: Sparkles,
    prompt:
      "High-end minimalist studio setting, concrete or pure off-white background, sharp elegant shadows, sober editorial, Sézane × A.P.C. campaign aesthetic, French quiet luxury",
    image_path: "/referentiel_ambiance/studio_brut.jpg",
  },
  {
    id: "loft_organique",
    label: "Loft Organique",
    description: "Béton ciré, serre lumineuse, chic végétal",
    icon: Flower,
    prompt:
      "Premium chic aesthetic, modern botanical greenhouse loft interior, polished concrete floors, abundant bright natural light, lush organic plants, Vogue Living editorial style, architectural and organic blend",
    image_path: "/referentiel_ambiance/loft_organique.jpg",
  },
  {
    id: "salon_hiver",
    label: "Salon d'Hiver",
    description: "Verrière + plantes en pots, atelier rempotage chic",
    icon: Flower2,
    prompt:
      "Winter conservatory or potting room, glass roof and large windows, soft filtered natural light, terracotta pots and lush indoor plants on wooden shelves, vintage wooden potting table, William Morris × Soeur × La Trésorerie aesthetic, cozy domestic gardening atmosphere, slow Sunday morning, autumn-winter coherence",
    image_path: "/referentiel_ambiance/salon_hiver.jpg",
  },
  {
    id: "aube_intime",
    label: "L'Aube Intime",
    description: "Lumière matinale, grain de peau, slow living",
    icon: Coffee,
    prompt:
      "Intimate morning light, soft natural shadows, warm skin tones, wrinkled white linen, slow living atmosphere, deeply emotional and tender",
    image_path: "/referentiel_ambiance/aube_intime.jpg",
  },
  {
    id: "echappee_sauvage",
    label: "Échappée Sauvage",
    description: "Vent, mouvement, éléments naturels bruts",
    icon: Leaf,
    prompt:
      "Wild natural setting, wind in the hair and fabric, dappled sunlight through trees, organic textures, feeling of freedom and connection to earth, cinematic outdoor photography",
    image_path: "/referentiel_ambiance/echappee_sauvage.jpg",
  },
  {
    id: "lumiere_sepia",
    label: "Lumière Sépia",
    description: "Heure dorée, nostalgie 35mm, poésie visuelle",
    icon: Sun,
    prompt:
      "Golden hour lighting, nostalgic 35mm film look, romantic and poetic atmosphere, warm sunset glow, soft focus, timeless emotive feel",
    image_path: "/referentiel_ambiance/lumiere_sepia.jpg",
  },
];

/** Lookup helper. */
export function getAmbianceById(id: string): AmbianceOfficielle | undefined {
  return AMBIANCES_OFFICIELLES.find((a) => a.id === id);
}
