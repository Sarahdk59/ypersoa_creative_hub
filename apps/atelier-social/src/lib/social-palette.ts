/**
 * Types + helpers purs (isomorphes, pas de fs) pour la palette du module
 * Fonds — Atelier Social. Cf. lib/social-palette.server.ts pour le loader fs
 * et referentiels/social_palette.json pour la donnée.
 */

export interface PaletteColor {
  id: string;
  nom: string;
  hex: string;
  role?: string;
}

export interface Amplificateur {
  id: string;
  nom: string;
  hex: string;
  occasion?: string;
  created_at: string;
}

export interface SocialPaletteRef {
  _meta: {
    schema_version: number;
    referentiel: string;
    description: string;
    source_socle?: string;
    last_updated?: string;
  };
  socle: PaletteColor[];
  saisonnier_officiel: PaletteColor[];
  amplificateurs: Amplificateur[];
}

export type SwatchGroup = "socle" | "saisonnier" | "amplificateur";

export interface Swatch {
  id: string;
  nom: string;
  hex: string;
  group: SwatchGroup;
  occasion?: string;
}

/** Aplatit la palette en une seule liste de swatches, groupée pour l'affichage. */
export function allSwatches(ref: SocialPaletteRef): Swatch[] {
  return [
    ...ref.socle.map((c) => ({ id: c.id, nom: c.nom, hex: c.hex, group: "socle" as const })),
    ...ref.saisonnier_officiel.map((c) => ({
      id: c.id,
      nom: c.nom,
      hex: c.hex,
      group: "saisonnier" as const,
    })),
    ...ref.amplificateurs.map((a) => ({
      id: a.id,
      nom: a.nom,
      hex: a.hex,
      group: "amplificateur" as const,
      occasion: a.occasion,
    })),
  ];
}

export function isValidHex(v: string): boolean {
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(v.trim());
}

export function normalizeHex(v: string): string {
  let h = v.trim().toLowerCase();
  if (/^#[0-9a-f]{3}$/.test(h)) {
    h = "#" + h.slice(1).split("").map((c) => c + c).join("");
  }
  return h;
}
