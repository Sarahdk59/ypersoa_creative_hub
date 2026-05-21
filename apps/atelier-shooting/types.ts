
// Codes produits Ypersoa (YPxxx). Mapping fournisseur Awdis/B&C dans referentiels/_mapping_legacy.json.
// YP001 = Hoodie Adulte, YP004 = Hoodie Enfant, YP005 = Sweat Adulte, YP019 = T-shirt Adulte, YP021 = Zoodie Adulte
export type ProductType = 'YP001' | 'YP004' | 'YP005' | 'YP019' | 'YP021';

export type EmbroiderySize = 2 | 4 | 8 | 24;

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
  /**
   * Broderie secondaire poignet (optionnel). Si fournie, Gemini ajoute une 2e
   * broderie sur le poignet droit du vêtement, max 5 cm de large. Utilisée
   * uniquement pour les shots où le bras est visible — sur macro buste / ghost
   * de face le service ignore wristImage pour ne pas saturer Gemini.
   */
  wristEmbroideryImage?: string | null;
  wristSize?: number; // cm, défaut 4, max 5
  mode: ShotMode;
  familyConfig: FamilyConfig;
  aspectRatio: AspectRatio;
  diversity: ModelDiversity;
  threadColor: string;
  // Si fourni et non vide : broderie MULTICOLORE — chaque lettre/forme du motif
  // utilise un fil parmi cette liste (ids HUB_FILS). Le mapping reste identique
  // entre tous les shots du pack. Si vide/undefined, on retombe sur threadColor mono.
  threadPaletteIds?: string[];
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
