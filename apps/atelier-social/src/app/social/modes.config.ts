import { Image as ImageIcon, MessageSquareQuote, Heart, Film, type LucideIcon } from "lucide-react";

export type ModeKey = "visuel" | "avis" | "histoire" | "reel";

export interface ModeMeta {
  key: ModeKey;
  label: string;
  detail: string;
  icon: LucideIcon;
  /** Nom de la variable CSS d'accent (hub-tokens.css) — pas de couleur hors palette. */
  colorVar: "--hub-accent" | "--hub-ocre" | "--hub-teal" | "--hub-bordeaux";
  pillar: string;
  eyebrow: string;
  hero: { title: string; lead: string; sub: string };
}

/**
 * Métadonnées d'affichage des 4 modes de l'Atelier Social — purement descriptif
 * (bandeau rituel + sélecteur de mode). Chaque mode garde son propre moteur de
 * génération existant (Gemini/Pinterest pour Visuel, /api/avis/generate pour
 * Avis, /api/connexion/generate pour Histoire/Réel) — rien ici ne génère de contenu.
 */
export const MODES: Record<ModeKey, ModeMeta> = {
  visuel: {
    key: "visuel",
    label: "Visuel produit",
    detail: "Une photo lifestyle à faire parler.",
    icon: ImageIcon,
    colorVar: "--hub-accent",
    pillar: "Montre-moi le vrai",
    eyebrow: "Rituel · Montre-moi le vrai",
    hero: {
      title: "Qu'est-ce qu'on montre aujourd'hui ?",
      lead: "Pars d'une photo. On la fait parler.",
      sub: "Le produit, le vrai — porté, tenu, offert. On raconte ce que l'image ne dit pas toute seule.",
    },
  },
  avis: {
    key: "avis",
    label: "Avis client",
    detail: "Un vrai retour, mis en preuve.",
    icon: MessageSquareQuote,
    colorVar: "--hub-ocre",
    pillar: "Fais-moi réagir",
    eyebrow: "Rituel · Fais-moi réagir",
    hero: {
      title: "Quel retour on met en avant ?",
      lead: "Un vrai avis vaut dix arguments.",
      sub: "On prend les mots d'une cliente, on les met en preuve. Elle parle, nous on brode.",
    },
  },
  histoire: {
    key: "histoire",
    label: "Histoire de marque",
    detail: "Une histoire, cinq voix.",
    icon: Heart,
    colorVar: "--hub-teal",
    pillar: "Raconte-moi quelqu'un",
    eyebrow: "Rituel · Raconte-moi quelqu'un",
    hero: {
      title: "L'histoire de la semaine",
      lead: "Une vraie histoire cliente — je te la décline en 5 voix.",
      sub: "Deux lignes suffisent, promis. C'est ce qui empêche le post de sonner robot.",
    },
  },
  reel: {
    key: "reel",
    label: "Réel",
    detail: "Le script, plan par plan.",
    icon: Film,
    colorVar: "--hub-bordeaux",
    pillar: "Attrape-moi au bon moment",
    eyebrow: "Rituel · Attrape-moi au bon moment",
    hero: {
      title: "On prépare quel réel ?",
      lead: "Le hook écran, les plans, la légende.",
      sub: "On cale les trois secondes qui arrêtent le scroll, puis le texte qui reste.",
    },
  },
};

export const MODE_ORDER: ModeKey[] = ["visuel", "avis", "histoire", "reel"];
