
export type ProductType = 
  | 'JH001 Hoodie cordons ronds sans embout' 
  | 'Zoodie JH050 cordons ronds sans embout' 
  | 'JH030' 
  | 'T-shirt Epais'
  | 'JH01J Hoodie Junior sans cordon';

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
}

export interface GeneratedImagePack {
  id: string;
  urls: string[];
  labels?: string[];
  timestamp: number;
  settings: GenerationSettings;
}
