/**
 * Helpers purs (sans fs) autour d'une zone de broderie — utilisables côté
 * client ET serveur.
 *
 *  - Polices : une zone peut combiner 1 à 3 typos (ex. motif « Russ Times +
 *    Diana Star »). `polices[]` fait foi ; l'ancien champ `police` reste
 *    lu pour les commandes antérieures.
 *  - Fils : une zone peut être brodée dans une palette nommée (camaïeu ou
 *    multicolore : Orage, Printemps basque…) → `fils_palette[]`. Sinon fil
 *    principal (+ secondaire éventuel).
 */
import type { AttributionCouleurs, Broderie, ChampBroderie, LettreAttribuee } from "./commandes-loader";

export const MAX_POLICES_PAR_ZONE = 3;

/** Polices de la zone, dans l'ordre (compat ancien champ `police`). */
export function policesBroderie(b: Pick<Broderie, "police" | "polices">): string[] {
  if (b.polices?.length) return b.polices;
  return b.police ? [b.police] : [];
}

/** Police d'un champ : sa police dédiée si elle fait partie de la zone, sinon la 1re de la zone. */
export function policeChamp(b: Pick<Broderie, "police" | "polices">, champ: Pick<ChampBroderie, "police">): string | undefined {
  const ps = policesBroderie(b);
  if (champ.police && ps.includes(champ.police)) return champ.police;
  return ps[0];
}

/**
 * Découpe une typographie de bible motif combinée en polices distinctes :
 * « Russ Times + Diana Star », « Russ / Diane », « Russ & Looney ».
 */
export function splitTypos(typo?: string | null): string[] {
  if (!typo) return [];
  return Array.from(
    new Set(
      typo
        .split(/\s*(?:\+|&|\/|,|;|\set\s)\s*/i)
        .map((s) => s.trim())
        .filter(Boolean),
    ),
  ).slice(0, MAX_POLICES_PAR_ZONE);
}

/** Normalise une liste saisie : trim, dédoublonne, max 3. */
export function normaliserPolices(list: string[]): string[] {
  return Array.from(new Set(list.map((s) => s.trim()).filter(Boolean))).slice(0, MAX_POLICES_PAR_ZONE);
}

export interface FilZone {
  fil_id: string;
  fil_nom: string;
  fil_hex: string;
  fil_code_gunold: string;
}

/** Tous les fils d'une zone, dans l'ordre de broderie. */
export function filsBroderie(b: Broderie): FilZone[] {
  if (b.fils_palette?.length) return b.fils_palette;
  const out: FilZone[] = [];
  if (b.fil_id || b.fil_nom) {
    out.push({ fil_id: b.fil_id, fil_nom: b.fil_nom, fil_hex: b.fil_hex, fil_code_gunold: b.fil_code_gunold });
  }
  if (b.fil_id_secondaire || b.fil_nom_secondaire) {
    out.push({
      fil_id: b.fil_id_secondaire ?? "",
      fil_nom: b.fil_nom_secondaire ?? "",
      fil_hex: b.fil_hex_secondaire ?? "#000000",
      fil_code_gunold: b.fil_code_gunold_secondaire ?? "",
    });
  }
  return out;
}

/** Fond CSS d'une zone : couleur unie, ou dégradé des fils de la palette. */
export function fondFils(b: Broderie): string {
  const fils = filsBroderie(b);
  if (fils.length <= 1) return fils[0]?.fil_hex || b.fil_hex || "#1A1614";
  return `linear-gradient(90deg, ${fils.map((f) => f.fil_hex).join(", ")})`;
}

// ──────────────────────────────────────────────────────────
// Attribution couleur → lettre (texte multicolore)
// ──────────────────────────────────────────────────────────

/**
 * Fils de l'attribution dans l'ordre de broderie = ordre de 1re apparition
 * (même numérotation que l'outil /atelier-production/attribution et son PDF).
 */
export function ordreFilsAttribution(att: AttributionCouleurs): string[] {
  const out: string[] = [];
  for (const l of att.lettres) if (!out.includes(l.fil_id)) out.push(l.fil_id);
  return out;
}

/** Lettres regroupées par ligne, dans l'ordre. */
export function lettresParLigne(att: AttributionCouleurs): LettreAttribuee[][] {
  const map = new Map<number, LettreAttribuee[]>();
  for (const l of att.lettres) {
    if (!map.has(l.ligne)) map.set(l.ligne, []);
    map.get(l.ligne)!.push(l);
  }
  return Array.from(map.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([, ls]) => ls.sort((a, b) => a.indice - b.indice));
}

/** Infos d'un fil de la zone (palette ou fil principal), à partir de son id. */
export function filDeZone(b: Broderie, filId: string): FilZone | undefined {
  return filsBroderie(b).find((f) => f.fil_id === filId);
}

/** Zone multicolore (plusieurs fils) avec du texte mais sans attribution lettre → fil. */
export function attributionManquante(b: Broderie): boolean {
  const aDuTexte = b.champs.some((c) => c.valeur.trim() && !/^symbole/.test(c.type));
  return aDuTexte && filsBroderie(b).length > 1 && !b.attribution_couleurs?.lettres.length;
}
