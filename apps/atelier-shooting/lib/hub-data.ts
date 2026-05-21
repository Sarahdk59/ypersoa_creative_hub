/**
 * Hub Data — accès aux référentiels du monorepo Ypersoa
 *
 * Charge les 3 palettes officielles depuis `referentiels/` via l'alias Vite `@hub`
 * et expose des helpers typés pour les apps :
 *  - HUB_FILS : 20 fils de broderie
 *  - HUB_GARMENTS : 21 couleurs de support vêtement
 *  - HUB_PRODUITS : 5 produits YPxxx avec leurs sous-catalogues couleurs
 *  - getColorsForProduct(YPxxx) : couleurs réellement disponibles pour un produit
 *
 * Mise à jour : pas de duplication. Si Sarah modifie le JSON Hub, l'app picks up
 * au prochain restart Vite (les imports JSON sont bundlés au build dev).
 */

// Bascule v1 → v2 le 18/05/2026 : v2 est la source canonique partagée
// avec atelier-production (codes Gunold + Pantone TPG + flags favori/canonique).
import filsRaw from '@hub/referentiels/palette_fils_broderie_v2.json';
import garmentsRaw from '@hub/referentiels/palette_supports_vetements.json';
import produitsRaw from '@hub/referentiels/palette_supports_par_produit.json';
import palettesRaw from '@hub/referentiels/palettes_fils_associations.json';

// ============================================================================
// Types
// ============================================================================

export interface HubFil {
  id: string;            // 'fil_framboise'
  rang: number;
  nom: string;           // 'Framboise'
  hex: string;           // '#C4294E'
  famille: string;
  // Champs optionnels depuis v2 (certains fils ne les ont pas tous)
  usage_recommande?: string;
  supports_incompatibles?: string[];
  ambiance_editoriale?: string[];
  code_gunold?: string;
  pantone_tpg?: string;
  favori?: boolean;
  canonique?: boolean;
}

export interface HubGarment {
  id: string;            // 'beige', 'marine', etc.
  nom: string;           // 'Beige'
  hex: string;
  famille: string;
  saison_signature: string;
  ambiance_editoriale: string[];
  aliases_liquid?: string[];
  note?: string;
}

export interface HubCouleurDetailleeProduit {
  id_palette: string;
  nom_ypersoa: string;
  hex_palette_officiel: string;
  nom_fournisseur: string;
  packshot_reference: string;
  hex_packshot_reel?: string;
  ecart_visuel?: string;
  note?: string;
}

export interface HubProduit {
  id: string;            // 'YP005'
  nom_commercial: string; // 'Sweat Adulte'
  type_produit: string;  // 'sweat_col_rond'
  public_cible: string;
  fournisseur: string;
  nb_couleurs_disponibles: number;
  ids_couleurs_dispo_quick_check: string[];
  particularite_couleurs: string;
  couleurs_detaillees: HubCouleurDetailleeProduit[];
}

// ============================================================================
// Données (chargées depuis les JSON Hub)
// ============================================================================

export const HUB_FILS: HubFil[] = (filsRaw as { couleurs: HubFil[] }).couleurs;
export const HUB_GARMENTS: HubGarment[] = (garmentsRaw as { couleurs: HubGarment[] }).couleurs;

export interface HubPalette {
  id: string;
  nom: string;
  type: 'camaieu' | 'multicolore' | 'duo' | 'trio';
  fils: string[];
  description?: string;
  archive?: boolean;
}
export const HUB_PALETTES: HubPalette[] = (palettesRaw as { palettes: HubPalette[] }).palettes
  .filter((p) => !p.archive);

const produitsByCode = (produitsRaw as { produits: Record<string, Omit<HubProduit, 'id'>> }).produits;
export const HUB_PRODUITS: HubProduit[] = Object.entries(produitsByCode).map(([id, def]) => ({
  id,
  ...def
}));

// ============================================================================
// Helpers
// ============================================================================

/**
 * Retourne la liste des couleurs vêtement réellement disponibles pour un produit donné.
 * Croise palette_supports_par_produit (catalogue par produit) avec palette_supports_vetements
 * (palette officielle 21 couleurs) pour avoir les hex et metadata complets.
 */
export function getColorsForProduct(productId: string): HubGarment[] {
  const produit = HUB_PRODUITS.find(p => p.id === productId);
  if (!produit) return [];
  return produit.ids_couleurs_dispo_quick_check
    .map(id => HUB_GARMENTS.find(g => g.id === id))
    .filter((g): g is HubGarment => Boolean(g));
}

/**
 * Retourne le fil correspondant à un id (ex: 'fil_framboise').
 */
export function getFilById(id: string): HubFil | undefined {
  return HUB_FILS.find(f => f.id === id);
}

/**
 * Retourne la couleur vêtement correspondant à un id (ex: 'beige').
 */
export function getGarmentById(id: string): HubGarment | undefined {
  return HUB_GARMENTS.find(g => g.id === id);
}

/**
 * Retourne le produit correspondant à un id (ex: 'YP005').
 */
export function getProduitById(id: string): HubProduit | undefined {
  return HUB_PRODUITS.find(p => p.id === id);
}

/**
 * Pour un fil donné + une couleur de support, retourne true si combinaison incompatible
 * (ex: fil_blanc sur support blanc = invisible).
 */
export function isFilGarmentIncompatible(filId: string, garmentId: string): boolean {
  const fil = getFilById(filId);
  if (!fil) return false;
  return fil.supports_incompatibles?.includes(garmentId) ?? false;
}
