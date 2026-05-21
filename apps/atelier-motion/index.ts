// apps/atelier-motion/src/hub/index.ts
// Pont vers le hub Ypersoa. RÈGLE ABSOLUE : on LIT, on ne recalcule jamais.
// Casting, fils, ambiances, brand-safety sont des sources de vérité uniques
// qui vivent dans le hub. Dupliquer = créer une dérive (le piège que le hub
// évite partout). Ces fonctions sont des ADAPTATEURS : en intégration
// monorepo, elles tapent les vrais modules ; ici, interfaces + stubs.

import type {
  Collection, CanoniqueHub, LookbookHub, BrandSafetyVerdict,
} from "../types";

/**
 * Contrat de lecture du hub. À l'intégration, brancher sur :
 *  - Casting / Mur des canoniques   → getCanonique
 *  - Atelier Lookbook (actifs 7j)   → getLookbookActif
 *  - Atelier Shooting (collections) → getCollection / listCollections
 *  - atelier-social.checkBrandSafety → verifierBrandSafety
 */
export interface HubGateway {
  getCanonique(mannequinId: string): Promise<CanoniqueHub>;
  getLookbookActif(ambianceId: string): Promise<LookbookHub>;
  getCollection(collectionId: string): Promise<Collection>;
  listCollections(): Promise<{ id: string; produit: string; creeLe: string }[]>;
  /** Délègue à atelier-social. Motion NE recode PAS la brand-safety. */
  verifierBrandSafety(c: Collection): Promise<BrandSafetyVerdict>;
}

/**
 * Implémentation réelle (à compléter au branchement monorepo).
 * Chaque méthode = un appel au module hub correspondant. Volontairement
 * non implémenté ici : ce fichier documente le contrat, il ne réinvente pas
 * le hub.
 */
export class HubMonorepo implements HubGateway {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async getCanonique(_id: string): Promise<CanoniqueHub> {
    throw new Error(
      "HubMonorepo.getCanonique : brancher sur Casting/Mur des canoniques.",
    );
  }
  async getLookbookActif(_a: string): Promise<LookbookHub> {
    throw new Error(
      "HubMonorepo.getLookbookActif : brancher sur Atelier Lookbook (actifs 7j).",
    );
  }
  async getCollection(_c: string): Promise<Collection> {
    throw new Error(
      "HubMonorepo.getCollection : brancher sur Atelier Shooting (collections).",
    );
  }
  async listCollections(): Promise<
    { id: string; produit: string; creeLe: string }[]
  > {
    throw new Error(
      "HubMonorepo.listCollections : brancher sur l'archive Atelier Shooting.",
    );
  }
  async verifierBrandSafety(_c: Collection): Promise<BrandSafetyVerdict> {
    throw new Error(
      "HubMonorepo.verifierBrandSafety : importer checkBrandSafety d'atelier-social.",
    );
  }
}

/**
 * Stub déterministe pour dev/test hors hub. Reproduit la FORME des données
 * vues dans les captures (collection YP001 Nicolas, lookbook Porto actif).
 */
export class HubStub implements HubGateway {
  constructor(private collection: Collection) {}

  async getCanonique(id: string): Promise<CanoniqueHub> {
    return { id, prenom: "Nicolas", refVisage: `[hub]/casting/${id}.png` };
  }
  async getLookbookActif(ambianceId: string): Promise<LookbookHub> {
    return {
      id: ambianceId,
      nom: "Week-end à Porto",
      imageStyle: `[hub]/lookbook/${ambianceId}.png`,
    };
  }
  async getCollection(): Promise<Collection> {
    return this.collection;
  }
  async listCollections() {
    return [
      {
        id: this.collection.id,
        produit: this.collection.produit,
        creeLe: this.collection.creeLe,
      },
    ];
  }
  async verifierBrandSafety(): Promise<BrandSafetyVerdict> {
    // Le hub (atelier-social) a déjà statué "Brand-safe ✓" à la génération
    // des images. Motion ne refait pas le travail : il relaie le verdict.
    return { conforme: true, violations: [] };
  }
}
