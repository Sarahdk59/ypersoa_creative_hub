/**
 * Atelier Motion — prompts par mode + par type de shot.
 *
 * Tous les prompts sont en français (Veo et Omni comprennent les deux mais
 * le français rend mieux les nuances éditoriales Ypersoa : "respiration
 * textile", "lumière qui tourne", "ralenti contemplatif").
 *
 * Règles brand absolues qu'on injecte systématiquement à la fin de chaque
 * prompt (cf. CLAUDE.md, section 2) :
 *  - aucun texte/logo/marque/watermark dans l'image
 *  - pas de retouching, peau réaliste si mannequin
 *  - broderie poitrine gauche, jamais centrée
 *  - mouvement premium minimal, jamais frénétique
 */

import type { ShotType } from "@/types/motion";

const BRAND_RULES = [
  "Aucun texte, logo, watermark, marque, ou mot écrit nulle part dans le plan",
  "Mouvement premium minimal, jamais frénétique ni publicitaire criard",
  "Lumière naturelle ou douce diffuse, jamais ringlight ni flash dur",
  "Plan continu, aucune coupe interne",
].join(". ");

/** Mouvement caméra suggéré pour un Reel selon le type de shot. */
export function promptReelClip(shotType: ShotType, brief?: string | null): string {
  const t = shotType.toUpperCase();
  let mouvement: string;

  if (t.includes("MACRO") || t.includes("TEXTURE") || t.includes("BRODERIE")) {
    mouvement =
      "Très léger push-in sur la broderie poitrine gauche. Le fil prend du relief, " +
      "respiration textile à peine perceptible. Profondeur de champ très courte, " +
      "le motif net, le reste flou doux.";
  } else if (t.includes("PORTRAIT")) {
    mouvement =
      "Parallaxe douce, le sujet respire, regard vivant et présent, " +
      "fond en profondeur de champ qui s'anime subtilement. Pas de sourire forcé. " +
      "Pose naturelle, attitude assumée.";
  } else if (t.includes("LIFESTYLE") || t.includes("SCÈNE")) {
    mouvement =
      "Travelling latéral très lent, le mannequin se déplace naturellement dans " +
      "son environnement, lumière qui joue, ambiance vivante mais posée. " +
      "Slow motion 24fps possible.";
  } else if (t.includes("OBJET") || t.includes("PROP")) {
    mouvement =
      "Rotation très lente autour de l'objet, vapeur ou lumière qui bouge en arrière-plan, " +
      "matière mise en valeur, focus sur le grain et la texture du tissu.";
  } else {
    mouvement = "Mouvement premium minimal, plan vivant mais maîtrisé, slow motion contemplatif.";
  }

  return assemble([
    mouvement,
    "Plan continu 8 secondes, format 9:16 vertical portrait.",
    "Respecter strictement le sujet et le style des images de référence fournies.",
    brief ? `Note éditoriale : ${brief}` : null,
    BRAND_RULES,
  ]);
}

/** Mode ambiance lookbook : 1 clip d'ambiance pure, pas de mannequin. */
export function promptAmbiance(brief?: string | null): string {
  return assemble([
    "Vidéo d'ambiance contemplative à partir de l'image lookbook fournie comme image de référence sujet/style.",
    "Pas de mannequin, pas de visage, juste l'atmosphère du lieu et du textile.",
    "Mouvements suggérés (combiner librement) : vent qui caresse le tissu suspendu, " +
      "lumière qui tourne très lentement (golden hour qui bascule), " +
      "rideau qui bouge à peine, poussière qui flotte dans un rai de lumière, " +
      "respiration textile sur un détail brodé posé sur la matière (lin, bois, marbre).",
    "Slow motion 24fps, ralenti contemplatif. Plan continu unique, aucune coupe.",
    "Format 9:16 vertical portrait, 8 secondes.",
    "Palette fidèle à l'image de référence (cream, terracotta, ink, sage selon ambiance).",
    brief ? `Note éditoriale : ${brief}` : null,
    BRAND_RULES,
  ]);
}

/** Mode motion packshot : produit isolé sur fond neutre, sans mannequin. */
export function promptPackshot(
  variation: "rotation" | "swing" | "zoom-broderie" = "rotation",
  brief?: string | null,
): string {
  let mouvement: string;
  if (variation === "swing") {
    mouvement =
      "Le vêtement est suspendu à un cintre invisible et se balance très " +
      "lentement de gauche à droite, comme dans une brise douce. Le tissu " +
      "ondule subtilement, la broderie poitrine gauche reste lisible en permanence.";
  } else if (variation === "zoom-broderie") {
    mouvement =
      "Plan fixe sur le vêtement, puis zoom très lent sur la broderie " +
      "poitrine gauche. Profondeur de champ qui se resserre, le motif " +
      "brodé devient l'élément hero, le tissu autour reste doux et flou.";
  } else {
    mouvement =
      "Rotation très lente du vêtement sur son axe vertical (effet tourne-disque " +
      "premium), 360° complet ou demi-tour selon la durée. Lumière de studio " +
      "douce qui révèle le grain du tissu et la broderie. Aucune main visible.";
  }

  return assemble([
    "Motion packshot premium à partir du packshot fourni comme image de référence.",
    mouvement,
    "Fond neutre uni, idéalement le même que le packshot d'origine (cream / blanc cassé). " +
      "Pas de mannequin, pas de mains, pas d'environnement.",
    "Slow motion 24fps, plan continu unique 6 à 8 secondes, format 9:16 vertical portrait.",
    "Le vêtement et la broderie doivent rester identiques au packshot fourni " +
      "(mêmes lettres, mêmes couleurs de fil, même placement poitrine gauche).",
    brief ? `Note éditoriale : ${brief}` : null,
    BRAND_RULES,
  ]);
}

function assemble(parts: Array<string | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

// ─── Sélection narrative Reel ──────────────────────────────────────────────

/**
 * Pour un Reel "court" (~32s), on retient un shot par type prioritaire dans
 * l'ordre du storytelling. Repris de apps/atelier-motion/motion.ts.
 */
export const PRIORITE_COURT: ShotType[] = [
  "MACRO BRODERIE", // hook : le détail qui arrête le scroll
  "LIFESTYLE MODE", // le produit porté, désirable
  "PORTRAIT ÉDITORIAL", // l'âme de la marque
  "LIFESTYLE EXTÉRIEUR", // clôture lifestyle
];

export function selectShotsForReel<T extends { shot_type: ShotType; ordre: number }>(
  shots: T[],
  format: "court" | "complet",
): T[] {
  if (format === "complet") {
    return [...shots].sort((a, b) => a.ordre - b.ordre);
  }
  const out: T[] = [];
  for (const type of PRIORITE_COURT) {
    const s = shots.find(
      (x) => x.shot_type.toUpperCase().includes(type) && !out.includes(x),
    );
    if (s) out.push(s);
  }
  // Filet de sécurité : compléter par ordre si moins de 3 retenus
  if (out.length < 3) {
    for (const s of [...shots].sort((a, b) => a.ordre - b.ordre)) {
      if (!out.includes(s)) out.push(s);
      if (out.length >= 4) break;
    }
  }
  return out;
}
