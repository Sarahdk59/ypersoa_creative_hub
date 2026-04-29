
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

export type FullPackStyle = 'minimalist' | 'parisien' | 'loft';

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
  fullPackStyle: FullPackStyle;
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
