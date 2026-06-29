/**
 * Catalogue produits Ypersoa — liste cliente partagée (id + label court).
 *
 * Source de vérité serveur = referentiels/palette_supports_par_produit.json
 * (servie par /api/hub/products). Ce fichier est la version cliente *synchrone*
 * utilisée par les sélecteurs qui ne font pas de fetch (catalogue motifs) et
 * comme fallback des sélecteurs dynamiques (shooting-book) pendant le chargement.
 *
 * ⚠️ Quand tu ajoutes un produit : mets à jour CE fichier ET le JSON référentiel
 *    palette_supports_par_produit.json (sinon il manquera dans l'un des deux).
 */
export interface ProduitCatalogue {
  id: string;
  label: string;
}

export const PRODUITS_CATALOGUE: ProduitCatalogue[] = [
  { id: "YP019", label: "T-shirt adulte" },
  { id: "YP023", label: "T-shirt slim adulte" },
  { id: "YP005", label: "Sweat adulte (col rond)" },
  { id: "YP001", label: "Hoodie adulte (capuche)" },
  { id: "YP022", label: "Hoodie slim adulte" },
  { id: "YP021", label: "Zoodie (sweat zippé)" },
  { id: "YP004", label: "Hoodie enfant" },
  { id: "YP013", label: "Casquette vintage" },
];

/** Ordre d'affichage canonique des produits. */
export const PRODUITS_ORDER: string[] = PRODUITS_CATALOGUE.map((p) => p.id);

/** id → label, pour retrouver un libellé à partir d'un product_id. */
export const PRODUIT_LABEL: Record<string, string> = Object.fromEntries(
  PRODUITS_CATALOGUE.map((p) => [p.id, p.label])
);

/** Trie une liste de produits ({id}) selon l'ordre canonique (inconnus en fin). */
export function sortByCatalogueOrder<T extends { id: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const ia = PRODUITS_ORDER.indexOf(a.id);
    const ib = PRODUITS_ORDER.indexOf(b.id);
    return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
  });
}
