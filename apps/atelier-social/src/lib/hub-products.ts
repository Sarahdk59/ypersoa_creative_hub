/**
 * Hub Products — accès aux palettes Hub (produits + supports vêtement).
 * Lecture serveur via fs, exposée par /api/hub/products côté client.
 */
import { readFileSync } from "fs";
import { join } from "path";

const REFS_DIR = join(process.cwd(), "..", "..", "referentiels");

export interface HubProduitCouleur {
  id_palette: string;
  nom_ypersoa: string;
  hex_palette_officiel: string;
  nom_fournisseur?: string;
  packshot_reference?: string;
}

export interface HubProduit {
  id: string;
  nom_commercial: string;
  type_produit: string;
  public_cible: string;
  fournisseur: string;
  nb_couleurs_disponibles: number;
  ids_couleurs_dispo_quick_check: string[];
  particularite_couleurs: string;
  couleurs_detaillees: HubProduitCouleur[];
}

export interface HubGarment {
  id: string;
  nom: string;
  hex: string;
  famille: string;
  saison_signature: string;
  ambiance_editoriale: string[];
}

interface ProduitsRef {
  produits: Record<string, Omit<HubProduit, "id">>;
}

interface GarmentsRef {
  couleurs: HubGarment[];
}

let _cache: { produits?: HubProduit[]; garments?: HubGarment[] } = {};

export function getProduits(): HubProduit[] {
  if (!_cache.produits) {
    const raw = readFileSync(join(REFS_DIR, "palette_supports_par_produit.json"), "utf-8");
    const data = JSON.parse(raw) as ProduitsRef;
    _cache.produits = Object.entries(data.produits).map(([id, def]) => ({ id, ...def }));
  }
  return _cache.produits;
}

export function getGarments(): HubGarment[] {
  if (!_cache.garments) {
    const raw = readFileSync(join(REFS_DIR, "palette_supports_vetements.json"), "utf-8");
    const data = JSON.parse(raw) as GarmentsRef;
    _cache.garments = data.couleurs;
  }
  return _cache.garments;
}
