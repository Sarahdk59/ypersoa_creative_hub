
// Codes produits Ypersoa (YPxxx). Mapping fournisseur Awdis/B&C dans referentiels/_mapping_legacy.json.
// YP001 = Hoodie Adulte, YP004 = Hoodie Enfant, YP005 = Sweat Adulte, YP019 = T-shirt Adulte, YP021 = Zoodie Adulte
export type ProductType = 'YP001' | 'YP004' | 'YP005' | 'YP019' | 'YP021';

export type EmbroiderySize = 2 | 4 | 6 | 8 | 12 | 20;

export type ShotMode = 'mannequin' | 'packshot' | 'family' | 'full';

export type CoupleType = 'random' | 'maman-papa' | 'papa-papa' | 'maman-maman' | 'maman-mamie' | 'papi-papa' | 'papa-mamie';

export interface FamilyConfig {
  coupleType: CoupleType;
  childrenCount: number;
}

// 4:5 = standard PDP Shopify (default Hub) ; 1:1 carrousel/feed ; 16:9 hero/banner ; 9:16 stories/reels ; 3:4 legacy
export type AspectRatio = '4:5' | '1:1' | '16:9' | '9:16' | '3:4';

export type Ethnicity = 'diverse' | 'black' | 'white' | 'asian' | 'hispanic' | 'middle-eastern' | 'south-asian';
export type AgeRange = 'diverse' | 'young' | 'middle-aged' | 'senior' | 'child';
export type BodyType = 'diverse' | 'slim' | 'athletic' | 'curvy' | 'plus-size';
export type DisabilityType = 'none' | 'wheelchair' | 'prosthetic' | 'hearing-aid' | 'visible-disability';

export interface ModelDiversity {
  ethnicity: Ethnicity;
  age: AgeRange;
  bodyType: BodyType;
  disability: DisabilityType;
}

// 7 décors disponibles. Sélecteur visible en mode 'mannequin' et 'full'.
// En mode 'family' le décor est imposé par le couple choisi (DUO_*/TRIO_* du référentiel).
// En mode 'packshot' pas de décor (fond blanc studio).
// 'lookbook' = ambiance custom issue d'un lookbook ❤️ actif (cf. customLookbookId).
export type DecorStyle = 'minimalist' | 'parisien' | 'loft' | 'serre' | 'aube' | 'sauvage' | 'sepia' | 'lookbook';

// Métadonnées d'un lookbook activé comme ambiance de référence (apps/atelier-lookbook).
// Utilisé pour reconstituer un decor.short/full depuis ambiance_extraite (palette, lieux, lumière, grain, postures, références).
export interface LookbookAmbianceExtraite {
  palette: string[];
  lieux: string[];
  props: string[];
  lumiere: string;
  grain: string;
  postures: string;
  references_implicites: string[];
}

export interface ActiveLookbookAmbiance {
  id: string;
  titre: string;
  slug: string;
  date_archivage: string | null;
  ambiance_extraite: LookbookAmbianceExtraite | null;
  cover_image_url: string | null;
}

// Hook 1 (29-30/04/2026) : casting peut être 'diversity' (random visages) ou 'canonique' (mannequins persistants Hub).
// Quand castingMode = 'canonique', canoniqueIds[] contient les IDs (ex: ['MAN-P02']) à utiliser
// comme character reference Gemini (parts[]).
export type CastingMode = 'diversity' | 'canonique';

export interface GenerationSettings {
  product: ProductType;
  size: EmbroiderySize;
  embroideryImage: string | null;
  mode: ShotMode;
  familyConfig: FamilyConfig;
  aspectRatio: AspectRatio;
  diversity: ModelDiversity;
  threadColor: string;
  garmentColor: string;
  decorStyle: DecorStyle;
  // Si decorStyle === 'lookbook' on stocke l'ambiance résolue côté client (pas
  // de re-fetch dans le service Gemini). Sinon undefined.
  customLookbookAmbiance?: ActiveLookbookAmbiance;
  // Hook 1 — Casting Hub
  castingMode: CastingMode;
  canoniqueIds: string[];
}

export interface GeneratedImagePack {
  id: string;
  urls: string[];
  labels?: string[];
  timestamp: number;
  settings: GenerationSettings;
}
