/**
 * Catalogue produit atelier (serveur) — réf. article Akanea YPxxx-CCCC-TTTT.
 *
 * Socle : referentiels/catalogue_produits.json (import du classeur « base
 * produit », cf. scripts/import_catalogue_produits.py). Ajouts faits depuis le
 * Hub (couleur inconnue pour un produit) : table Supabase
 * `catalogue_couleurs_ajouts` — le disque Railway est éphémère.
 *
 * Volontairement SANS notion de fournisseur : c'est l'outil de l'atelier.
 */
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { supabase } from "@/lib/supabase";
import type { Placement } from "./commandes-loader";

const CATALOGUE_PATH = join(process.cwd(), "..", "..", "referentiels", "catalogue_produits.json");
const TBL_AJOUTS = "catalogue_couleurs_ajouts";

// ──────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────

export interface CatalogueProduit {
  ref: string;
  ref_fabricant: string;
  libelle: string;
  famille: string;
  sous_famille: string;
  genre: string;
  gabarit: string;
  technos: string[];
  statut: string;
  synonymes: string[];
}

export interface CatalogueCouleurRef {
  code: string;
  libelle: string;
  famille: string;
  hex: string | null;
  statut: string;
}

export interface CouleurProduit {
  code: string;
  libelle: string;
  couleur_fabricant?: string;
  hex: string | null;
  /** "catalogue" = classeur Akanea ; "hub" = ajoutée depuis le Hub. */
  origine: "catalogue" | "hub";
  nouvelle_famille?: boolean;
}

export interface CatalogueTaille {
  code: string;
  taille: string;
  libelle: string;
  ordre: number;
}

interface CatalogueFile {
  _meta: Record<string, unknown>;
  produits: Record<string, CatalogueProduit>;
  couleurs_ref: Record<string, CatalogueCouleurRef>;
  couleurs_produit: Record<string, Array<{ code: string; couleur_fabricant: string; libelle: string; hex: string | null }>>;
  tailles: Record<string, CatalogueTaille>;
  tailles_produit: Record<string, string[]>;
  skus: Record<string, string[]>;
}

export interface CouleurAjoutRow {
  ref_produit: string;
  code_couleur: string;
  libelle: string;
  hex: string | null;
  nouvelle_famille: boolean;
  created_by: string | null;
  created_at: string;
}

// ──────────────────────────────────────────────────────────
// Lecture
// ──────────────────────────────────────────────────────────

let _cache: CatalogueFile | null = null;

export function getCatalogue(): CatalogueFile {
  if (!_cache) {
    if (!existsSync(CATALOGUE_PATH)) {
      _cache = { _meta: {}, produits: {}, couleurs_ref: {}, couleurs_produit: {}, tailles: {}, tailles_produit: {}, skus: {} };
    } else {
      _cache = JSON.parse(readFileSync(CATALOGUE_PATH, "utf-8")) as CatalogueFile;
    }
  }
  return _cache;
}

/** Ajouts Hub. Table absente / Supabase non configuré → liste vide (pas d'erreur bloquante). */
export async function getCouleursAjouts(): Promise<CouleurAjoutRow[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.from(TBL_AJOUTS).select("*");
  if (error) {
    console.warn(`[catalogue] lecture ${TBL_AJOUTS} impossible : ${error.message}`);
    return [];
  }
  return (data ?? []) as CouleurAjoutRow[];
}

export async function createCouleurAjout(row: Omit<CouleurAjoutRow, "created_at">): Promise<void> {
  if (!supabase) throw new Error("Supabase non configuré — impossible d'enregistrer la couleur.");
  const { error } = await supabase.from(TBL_AJOUTS).insert(row);
  if (error) {
    if (/does not exist|schema cache/i.test(error.message)) {
      throw new Error("Table catalogue_couleurs_ajouts absente : appliquer la migration 20261104_catalogue_couleurs_ajouts.sql.");
    }
    if (/duplicate|unique/i.test(error.message)) {
      throw new Error(`La couleur ${row.code_couleur} existe déjà pour ${row.ref_produit}.`);
    }
    throw new Error(`Création couleur échouée : ${error.message}`);
  }
}

// ──────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────

export function normalizeKey(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
}

/** Couleurs d'un produit = catalogue + ajouts Hub (dédoublonnées par code). */
export function couleursPourProduit(ref: string, ajouts: CouleurAjoutRow[]): CouleurProduit[] {
  const cat = getCatalogue();
  const out = new Map<string, CouleurProduit>();
  for (const c of cat.couleurs_produit[ref] ?? []) {
    if (!out.has(c.code)) out.set(c.code, { code: c.code, libelle: c.libelle, couleur_fabricant: c.couleur_fabricant, hex: c.hex, origine: "catalogue" });
  }
  for (const a of ajouts) {
    if (a.ref_produit !== ref || out.has(a.code_couleur)) continue;
    out.set(a.code_couleur, { code: a.code_couleur, libelle: a.libelle, hex: a.hex, origine: "hub", nouvelle_famille: a.nouvelle_famille });
  }
  return Array.from(out.values()).sort((x, y) => x.libelle.localeCompare(y.libelle, "fr"));
}

/** Tailles d'un produit (ordre Akanea). Sans info : TU pour la coiffe, gamme adulte sinon. */
export function taillesPourProduit(ref: string): CatalogueTaille[] {
  const cat = getCatalogue();
  const byTaille = new Map(Object.values(cat.tailles).map((t) => [t.taille, t]));
  let list = (cat.tailles_produit[ref] ?? []).map((t) => byTaille.get(t)).filter(Boolean) as CatalogueTaille[];
  if (!list.length) {
    list = isHeadwear(ref)
      ? [cat.tailles["0000"]].filter(Boolean)
      : Object.values(cat.tailles).filter((t) => ["0000", "0015", "0001", "0002", "0003", "0004", "0005", "0006", "0007", "0008", "0016"].includes(t.code));
  }
  return list.sort((a, b) => a.ordre - b.ordre);
}

/** Taille saisie ("XS", "Taille unique", "0001") → entrée Akanea. */
export function resolveTaille(input: string | undefined): CatalogueTaille | null {
  if (!input) return null;
  const cat = getCatalogue();
  const raw = input.trim();
  if (/^\d{4}$/.test(raw) && cat.tailles[raw]) return cat.tailles[raw];
  const k = normalizeKey(raw);
  if (/^(tu|taille unique|unique|one size|os)$/.test(k)) return cat.tailles["0000"] ?? null;
  return Object.values(cat.tailles).find((t) => normalizeKey(t.taille) === k || normalizeKey(t.libelle) === k) ?? null;
}

/** Couleur saisie (code "64"/"0064", libellé FR, nom fabricant) → couleur du produit. */
export function resolveCouleurProduit(couleurs: CouleurProduit[], input: string | undefined): CouleurProduit | null {
  if (!input) return null;
  const raw = input.trim();
  if (/^\d{1,4}$/.test(raw)) {
    const code = raw.padStart(4, "0");
    return couleurs.find((c) => c.code === code) ?? null;
  }
  const k = normalizeKey(raw);
  return (
    couleurs.find((c) => normalizeKey(c.libelle) === k) ??
    couleurs.find((c) => c.couleur_fabricant && normalizeKey(c.couleur_fabricant) === k) ??
    null
  );
}

export function buildRefArticle(ref?: string, codeCouleur?: string, codeTaille?: string): string | undefined {
  if (!ref || !codeCouleur || !codeTaille) return undefined;
  return `${ref}-${codeCouleur}-${codeTaille}`;
}

export function produitCatalogue(ref: string): CatalogueProduit | null {
  return getCatalogue().produits[ref] ?? null;
}

/** Casquette ou bonnet → on brode sur la TÊTE, jamais « buste ». */
export function isHeadwear(ref: string | undefined): boolean {
  if (!ref) return false;
  const f = produitCatalogue(ref)?.famille ?? "";
  return /casquette|bonnet/i.test(f);
}

/** Précision du cadre pour une broderie tête. */
export function zoneTete(ref: string | undefined): string {
  const f = (ref && produitCatalogue(ref)?.famille) || "";
  return /bonnet/i.test(f) ? "revers" : "panneau frontal";
}

/** Zone par défaut d'un produit (buste pour le textile, tête pour la coiffe). */
export function placementParDefaut(ref: string | undefined): Placement {
  return isHeadwear(ref) ? "tete" : "buste";
}

/**
 * Défauts Etsy (validés Sarah 04/11/2026) quand le titre d'annonce ne donne
 * pas de code : sweat à capuche → YP001, sweat → YP005, t-shirt → YP019,
 * bonnet → YP009, casquette → YP013. L'ordre compte (capuche avant sweat).
 */
export function produitParDefautEtsy(texte: string | undefined): string | null {
  if (!texte) return null;
  const k = normalizeKey(texte);
  if (/capuche|hoodie|hooded|hoody/.test(k)) return "YP001";
  if (/bonnet|beanie/.test(k)) return "YP009";
  if (/casquette|\bcap\b|baseball|\bhat\b/.test(k)) return "YP013";
  if (/\bt shirt\b|\btshirt\b|\btee shirt\b|\btee\b/.test(k)) return "YP019";
  if (/sweat|crewneck|pull/.test(k)) return "YP005";
  return null;
}

/** "YPM18", "YPM018", "YPM-018", "18" → "YPM-018". */
export function normalizeYpmId(input: string | undefined): string | null {
  if (!input) return null;
  const m = input.trim().toUpperCase().match(/^(?:YPM)?-?(\d{1,3})$/);
  return m ? `YPM-${m[1].padStart(3, "0")}` : null;
}
