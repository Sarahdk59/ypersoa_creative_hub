/**
 * Base de connaissances de l'Assistant Hub.
 *
 * Assemble en UN seul bloc texte tout ce que l'assistant doit connaître :
 *   - la carte du Hub (routes + à quoi sert chaque atelier) → pour aider à
 *     « se retrouver partout » et renvoyer des liens cliquables ;
 *   - le guide d'utilisation (lib/guide-content.ts) → le mode d'emploi ;
 *   - le brand book (referentiels/charte_editoriale.json) + les règles brand
 *     (lib/brand-rules.ts) → pour aider à créer du contenu juste.
 *
 * Le corpus tient largement dans le contexte du modèle (~60 Ko), donc PAS de
 * vector DB / embeddings : on injecte tout dans le system prompt. Cache mémoire
 * après la première lecture (pattern aligné sur pinterest-strategy.server.ts).
 */

import { readFile } from "fs/promises";
import { join } from "path";
import { GUIDE_INTRO, GUIDE_SECTIONS } from "@/lib/guide-content";
import {
  BRAND_FORBIDDEN_TERMS,
  BRAND_PHRASES,
  BRAND_REFERENCES,
  EDITORIAL_PILLARS,
} from "@/lib/brand-rules";

/** Une entrée de la carte du Hub : route réelle + ce qu'on y fait. */
export interface HubRoute {
  href: string;
  atelier: string;
  pitch: string;
}

/**
 * Carte des routes du Hub. Sert à l'assistant pour orienter l'équipe et
 * renvoyer des liens cliquables. À tenir à jour si une route bouge.
 */
export const HUB_MAP: HubRoute[] = [
  {
    href: "/social",
    atelier: "Atelier Social",
    pitch:
      "Générer les visuels + textes pour les réseaux : carrousels Instagram (5 slides) et shootings Pinterest (formats Hero flatlay / Désir porté). Captions, hooks, overlay texte sur l'image, et bibliothèque des packs sauvegardés.",
  },
  {
    href: "/shooting",
    atelier: "Atelier Shooting",
    pitch:
      "Préparer un shooting : choisir un produit + un motif + une canonique (mannequin), verrouiller le packshot et la broderie, et envoyer le résultat vers le planning (Planable).",
  },
  {
    href: "/lookbook",
    atelier: "Atelier Lookbook",
    pitch:
      "La médiathèque du Hub : retrouver, taguer et organiser les visuels (lookbook / lifestyle) par motif et par produit.",
  },
  {
    href: "/atelier-da",
    atelier: "Atelier DA",
    pitch:
      "La direction artistique : casting des canoniques, motifs YPM, palettes, et le planning commun créa / prod / comm.",
  },
  {
    href: "/atelier-da/motifs",
    atelier: "Atelier DA · Motifs",
    pitch: "Le catalogue créatif des motifs YPM (noms commerciaux, déclinaisons, templates de poignets).",
  },
  {
    href: "/atelier-da/studio-mood",
    atelier: "Atelier DA · Studio Mood brodé",
    pitch:
      "Préparer et piloter des épisodes vidéo (Reels, Stories) autour des motifs brodés : brief, storyboard scène par scène, copy brand-safe, visuel de test. Statuts : Brouillon → Prêt à tourner → Tourné → Monté → Publié.",
  },
  {
    href: "/atelier-da/blog",
    atelier: "Atelier DA · Blog",
    pitch:
      "Le générateur d'articles GEO pour Shopify : brief longue traîne, angle éditorial, lint qualité, export HTML Shopify, bloc Liquid et FAQ JSON-LD.",
  },
  {
    href: "/atelier-da/planning",
    atelier: "Atelier DA · Planning",
    pitch: "Le rétroplanning commun de l'année : drops de collection, marronniers, beats de comm (J-45 Pinterest…).",
  },
  {
    href: "/atelier-trends",
    atelier: "Atelier Trends",
    pitch: "La veille tendances (Pinterest + Google Trends) pour transformer une tendance en action broderie.",
  },
  {
    href: "/atelier-production",
    atelier: "Atelier Production",
    pitch: "Le pôle atelier : commandes Shopify, planning des 2 machines à broder, motifs (vue technique) et palettes de fils.",
  },
  {
    href: "/atelier-production/commandes",
    atelier: "Atelier Production · Commandes",
    pitch:
      "Importer un bon de préparation Shopify, suivre une commande (journal DST → Broderie → CQ → Expédition), planifier sur les machines, rebroder un article.",
  },
  {
    href: "/atelier-production/motifs",
    atelier: "Atelier Production · Motifs",
    pitch: "La vue technique des motifs : fiches techniques, nombre de points, fils.",
  },
  {
    href: "/atelier-production/palettes",
    atelier: "Atelier Production · Palettes",
    pitch: "Les palettes de fils de broderie (couleurs, codes Gunold).",
  },
  {
    href: "/search",
    atelier: "Recherche globale",
    pitch: "Tout chercher d'un coup : motif, commande (même archivée), couleur, ville, équipe. Raccourci Cmd+K.",
  },
  {
    href: "/guide",
    atelier: "Guide d'utilisation",
    pitch: "Le mode d'emploi complet du Hub, atelier par atelier.",
  },
];

/** Rend la carte du Hub en texte compact. */
function renderHubMap(): string {
  return HUB_MAP.map((r) => `- ${r.atelier} → ${r.href}\n  ${r.pitch}`).join("\n");
}

/** Rend le guide d'utilisation en texte (fidèle au contenu des fiches). */
function renderGuide(): string {
  const intro = [
    `# ${GUIDE_INTRO.titre}`,
    GUIDE_INTRO.pitch,
    `Pour qui : ${GUIDE_INTRO.pourQui}`,
    `Démarrage rapide : ${GUIDE_INTRO.demarrageRapide.map((q) => q.label).join(" · ")}`,
  ].join("\n");

  const sections = GUIDE_SECTIONS.map((s) => {
    const features = s.features
      .map((f) => {
        const steps = f.commentFaire.map((st, i) => `   ${i + 1}. ${st}`).join("\n");
        const limites = f.limites.map((l) => `   - ${l}`).join("\n");
        return [
          `### ${f.name}`,
          `À quoi ça sert : ${f.aQuoiCaSert}`,
          `Quand : ${f.quandUtiliser}`,
          `Comment :\n${steps}`,
          `Exemple : ${f.exemple}`,
          `Résultat : ${f.resultat}`,
          `Limites & pièges :\n${limites}`,
        ].join("\n");
      })
      .join("\n\n");
    return [`## ${s.num}. ${s.title}${s.atelier ? ` (${s.atelier})` : ""}`, s.pitch, features].join(
      "\n",
    );
  }).join("\n\n");

  return `${intro}\n\n${sections}`;
}

/** Rend les règles brand absolues en texte. */
function renderBrandRules(): string {
  return [
    "RÈGLES BRAND ABSOLUES (à respecter dans tout contenu proposé) :",
    `- Tutoiement TOUJOURS (tu / ton / ta). Jamais de vouvoiement, jamais "Bonjour/Bonsoir" formel.`,
    `- Termes INTERDITS : ${BRAND_FORBIDDEN_TERMS.join(", ")}.`,
    `- Pour parler de la fabrication côté client, utiliser : ${BRAND_PHRASES.embroidery_default.join(" / ")}.`,
    `- Tournures cadeau validées : ${BRAND_PHRASES.gift_phrases.join(" / ")}.`,
    `- Références de TON (jamais citées dans le copy client) : ${BRAND_REFERENCES.hero_brands.join(", ")} ; premium parisien : ${BRAND_REFERENCES.premium_parisien.join(", ")}.`,
    `- 4 piliers éditoriaux : ${Object.values(EDITORIAL_PILLARS).join(" · ")}.`,
  ].join("\n");
}

let cached: string | null = null;

/** Assemble (et met en cache) toute la base de connaissances de l'assistant. */
export async function loadAssistantKnowledge(): Promise<string> {
  const isDev = process.env.NODE_ENV !== "production";
  if (!isDev && cached) return cached;

  let charteText = "";
  try {
    const repoRoot = join(process.cwd(), "..", "..");
    const raw = await readFile(
      join(repoRoot, "referentiels", "charte_editoriale.json"),
      "utf-8",
    );
    // On garde le JSON brut : c'est le brand book de référence.
    charteText = JSON.stringify(JSON.parse(raw), null, 1);
  } catch {
    charteText = "(charte éditoriale indisponible)";
  }

  const assembled = [
    "===== CARTE DU HUB (routes réelles) =====",
    renderHubMap(),
    "",
    "===== GUIDE D'UTILISATION DU HUB =====",
    renderGuide(),
    "",
    "===== RÈGLES BRAND =====",
    renderBrandRules(),
    "",
    "===== BRAND BOOK (charte éditoriale, source de vérité) =====",
    charteText,
  ].join("\n");

  if (!isDev) cached = assembled;
  return assembled;
}
