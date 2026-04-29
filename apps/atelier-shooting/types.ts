
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

export type AspectRatio = '1:1' | '3:4' | '4:3' | '9:16' | '16:9';

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
