/**
 * Hub Products — accès aux palettes Hub (produits + supports vêtement).
 * Lecture serveur via fs, exposée par /api/hub/products côté client.
 */
import { readFileSync, existsSync } from "fs";
import { join } from "path";

const REFS_DIR = join(process.cwd(), "..", "..", "referentiels");
const ASSETS_PRODUITS_DIR = join(process.cwd(), "..", "..", "assets_produits");

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
  /** Référence chez le fournisseur réel (ex. "JH001" chez Awdis) — absente pour les produits sans fournisseur (YP022/YP023). */
  reference_fournisseur?: string;
  /** Chemin public (`/produits/{id}/{fichier}`, symlink vers assets_produits/) du packshot par défaut, si connu. */
  thumbnail_url?: string;
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

interface ProduitFicheJson {
  fournisseur?: { reference_fournisseur?: string };
  assets?: { photo_reference_par_defaut?: string };
}

/**
 * Fiche produit enrichie (référence fournisseur réel, packshot par défaut) —
 * vit dans `assets_produits/{id}/{id}_fiche_produit.json`, séparément du
 * référentiel `palette_supports_par_produit.json` qui ne connaît que la
 * marque ("Awdis") et les couleurs. Pas tous les produits n'en ont une
 * (ex. YP022/YP023, sans fournisseur) — absence silencieuse.
 */
function readProduitFiche(id: string): { reference_fournisseur?: string; thumbnail_url?: string } {
  const fichePath = join(ASSETS_PRODUITS_DIR, id, `${id}_fiche_produit.json`);
  if (!existsSync(fichePath)) return {};
  try {
    const fiche = JSON.parse(readFileSync(fichePath, "utf-8")) as ProduitFicheJson;
    const photoFile = fiche.assets?.photo_reference_par_defaut;
    return {
      reference_fournisseur: fiche.fournisseur?.reference_fournisseur,
      thumbnail_url: photoFile ? `/produits/${id}/${photoFile}` : undefined,
    };
  } catch {
    return {};
  }
}

let _cache: { produits?: HubProduit[]; garments?: HubGarment[] } = {};

export function getProduits(): HubProduit[] {
  if (!_cache.produits) {
    const raw = readFileSync(join(REFS_DIR, "palette_supports_par_produit.json"), "utf-8");
    const data = JSON.parse(raw) as ProduitsRef;
    _cache.produits = Object.entries(data.produits).map(([id, def]) => {
      const fiche = readProduitFiche(id);
      const firstPackshot = def.couleurs_detaillees?.[0]?.packshot_reference;
      return {
        id,
        ...def,
        reference_fournisseur: fiche.reference_fournisseur,
        thumbnail_url: fiche.thumbnail_url ?? (firstPackshot ? `/produits/${id}/${firstPackshot}` : undefined),
      };
    });
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
