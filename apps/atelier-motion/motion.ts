// apps/atelier-motion/src/engine/motion.ts
// Orchestrateur. Seule responsabilité du module : animer une Collection.
//
// Flux (les deux entrées choisies en Q1) :
//   A. Collection archivée  : hub.getCollection("YP001 — 22:59:25")
//   B. Génération + animation: l'Atelier Shooting produit la Collection puis
//      on l'enchaîne ici (même interface, la Collection est l'unité commune).
//
// Tout le contexte (canonique, lookbook, brand-safety) est LU du hub via
// HubGateway — jamais recalculé (Q2).

import type {
  Collection, ClipPlan, Motion, ShotCollection,
} from "../types";
import type { HubGateway } from "../hub";
import { genererClip, VeoStub, type VeoConfig } from "./veo-client";

export type FormatReel = "court" | "complet";

/**
 * Un Reel performant fait ~15-30s. 7 clips × 8s = 56s : trop long et coûteux
 * (7 générations Veo). On SÉLECTIONNE par type de shot, en gardant toujours
 * une accroche forte en ouverture et une clôture produit.
 *
 * Les types de shot viennent du hub (tags Atelier Shooting vus en Image 15) :
 *   PORTRAIT ÉDITORIAL · MACRO BRODERIE · LIFESTYLE MODE ·
 *   LIFESTYLE EXTÉRIEUR · SCÈNE LARGE · TEXTURE / DÉTAIL · OBJET / PROP
 */
const PRIORITE_COURT = [
  "MACRO BRODERIE",      // hook : le détail qui arrête le scroll
  "LIFESTYLE MODE",      // le produit porté, désirable
  "PORTRAIT ÉDITORIAL",  // l'âme de la marque
  "LIFESTYLE EXTÉRIEUR", // clôture lifestyle
];

/** Mouvement caméra suggéré selon le type de shot (déterministe, pas d'IA). */
function mouvementPour(typeShot: string): string {
  const t = typeShot.toUpperCase();
  if (t.includes("MACRO") || t.includes("TEXTURE")) {
    return "Très léger push-in sur la broderie, le fil prend du relief, " +
      "respiration textile à peine perceptible.";
  }
  if (t.includes("PORTRAIT")) {
    return "Parallaxe douce, le sujet respire, regard vivant, fond en " +
      "profondeur de champ qui s'anime subtilement.";
  }
  if (t.includes("LIFESTYLE") || t.includes("SCÈNE")) {
    return "Travelling latéral lent, le mannequin se déplace naturellement, " +
      "lumière qui joue, ambiance vivante mais posée.";
  }
  if (t.includes("OBJET") || t.includes("PROP")) {
    return "Rotation très lente autour de l'objet, vapeur/lumière qui bouge, " +
      "matière mise en valeur.";
  }
  return "Mouvement premium minimal, plan vivant mais maîtrisé.";
}

function selectionner(
  shots: ShotCollection[],
  format: FormatReel,
): ShotCollection[] {
  if (format === "complet") {
    return [...shots].sort((a, b) => a.ordre - b.ordre);
  }
  // Court : un shot par type prioritaire, dans l'ordre du storytelling.
  const out: ShotCollection[] = [];
  for (const type of PRIORITE_COURT) {
    const s = shots.find(
      (x) =>
        x.typeShot.toUpperCase().includes(type) &&
        !out.includes(x),
    );
    if (s) out.push(s);
  }
  // Filet de sécurité : si moins de 3 retenus, compléter par ordre.
  if (out.length < 3) {
    for (const s of [...shots].sort((a, b) => a.ordre - b.ordre)) {
      if (!out.includes(s)) out.push(s);
      if (out.length >= 4) break;
    }
  }
  return out;
}

export interface MotionOptions {
  format?: FormatReel;
  veo?: VeoConfig;       // absent → VeoStub (pas d'appel API)
  parallele?: boolean;   // défaut séquentiel (quotas Veo)
}

export async function animerCollection(
  collectionId: string,
  hub: HubGateway,
  opts: MotionOptions = {},
): Promise<Motion> {
  const format = opts.format ?? "court";

  // 1. L'unité d'entrée : une Collection (archivée OU fraîche — même chemin).
  const collection: Collection = await hub.getCollection(collectionId);

  // 2. Brand-safety : on RELAIE le verdict d'atelier-social, on ne recode pas.
  const brandSafety = await hub.verifierBrandSafety(collection);
  if (!brandSafety.conforme) {
    // Le hub a déjà tranché : si non conforme, on s'arrête net. Motion
    // n'outrepasse jamais la brand-safety du hub.
    return {
      collection,
      brandSafety,
      clips: [],
      ordreMontage: [],
      dureeTotaleSec: 0,
      aFaireManuel: [
        "⚠ Collection rejetée par la brand-safety du hub (atelier-social). " +
          "Corriger en amont dans l'Atelier Shooting/Social avant d'animer.",
      ],
      genereLe: new Date().toISOString(),
    };
  }

  // 3. Image de STYLE = lookbook actif du hub (lu, pas inventé).
  const lookbook = await hub.getLookbookActif(collection.ambianceId);

  // 4. Sélection narrative + construction des plans.
  //    Image SUJET = la photo Shooting elle-même (déjà cohérente).
  const retenus = selectionner(collection.shots, format);
  const plans: ClipPlan[] = retenus.map((shot, i) => ({
    ordre: i + 1,
    shot,
    assetSujet: shot.imageRef,           // photo Shooting = sujet
    assetStyle: lookbook.imageStyle,     // lookbook actif = style
    promptMouvement: mouvementPour(shot.typeShot),
    dureeSec: 8 as const,
    clipPath: null,
    statut: "en_attente" as const,
  }));

  // 5. Génération Veo (réelle si cfg, sinon stub).
  const moteur = opts.veo
    ? { genererClip: (p: ClipPlan) => genererClip(p, opts.veo!) }
    : new VeoStub();

  let clips: ClipPlan[];
  if (opts.parallele) {
    clips = await Promise.all(plans.map((p) => moteur.genererClip(p)));
  } else {
    clips = [];
    for (const p of plans) clips.push(await moteur.genererClip(p));
  }

  const ok = clips.filter((c) => c.statut === "genere");

  return {
    collection,
    brandSafety,
    clips,
    ordreMontage: ok.map((c) => c.ordre),
    dureeTotaleSec: ok.length * 8,
    aFaireManuel: etapesManuelles(clips),
    genereLe: new Date().toISOString(),
  };
}

/** Honnêteté : ce que Veo NE fait pas. Pas de "Reel prêt en un clic". */
function etapesManuelles(clips: ClipPlan[]): string[] {
  const e = [
    "Assembler les clips dans l'ordre (montage A/V) — Veo sort des clips " +
      "isolés de 8s, pas un Reel monté.",
    "Choisir et caler le son tendance Instagram — Veo génère un audio natif " +
      "mais ne connaît pas les sons viraux du moment (choix éditorial humain, " +
      "et aucune API ne fournit légalement les audios Instagram).",
    "Incruster hook + sous-titres animés — la copy vient de l'Atelier Social " +
      "du hub ; l'animation typo Josefin Sans se fait au montage.",
    "Contrôle qualité final : cohérence mannequin entre clips, rendu " +
      "terracotta, relief broderie (l'œil de l'atelier valide).",
    "Publier / pousser dans apps/planable-ypersoa à la date prévue.",
  ];
  const ko = clips.filter((c) => c.statut === "echec");
  if (ko.length) {
    e.unshift(
      `⚠ Re-générer ${ko.length} clip(s) en échec : ` +
        ko.map((c) => `clip ${c.ordre} (${c.erreur ?? "?"})`).join(", "),
    );
  }
  return e;
}
