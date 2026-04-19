
export interface VideoGenerationStatus {
  isGenerating: boolean;
  progressMessage: string;
  error?: string;
  videoUrl?: string;
}

export interface AudioGenerationStatus {
  isGenerating: boolean;
  audioUrl?: string;
}

export enum AspectRatio {
  LANDSCAPE = '16:9',
  PORTRAIT = '9:16'
}

export enum Resolution {
  HD = '720p',
  FHD = '1080p'
}
