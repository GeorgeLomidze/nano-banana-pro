

// Guidelines: Aspect ratio can be '1:1', '3:4', '4:3', '9:16', '16:9', '3:2', and '2:3'.
export type AspectRatio = '1:1' | '16:9' | '9:16' | '4:3' | '3:4' | '3:2' | '2:3';
export type ImageSize = '1K' | '2K' | '4K';
export type VideoAspectRatio = '16:9' | '9:16';
export type VideoResolution = '720p' | '1080p';
export type VideoGenerationSpeed = 'fast' | 'normal';
export type GenerationMode = 'image' | 'video';

export interface GenerationConfig {
  aspectRatio: AspectRatio;
  imageSize: ImageSize;
  prompt: string;
  negativePrompt: string;
  seed?: number;
}

export interface VideoGenerationConfig {
  aspectRatio: VideoAspectRatio;
  resolution: VideoResolution;
  generationSpeed: VideoGenerationSpeed;
  prompt: string;
  negativePrompt: string;
}

export interface HistoryItem {
  id: string;
  imageUrl: string;
  prompt: string;
  config: GenerationConfig;
  timestamp: number;
}

export interface VideoHistoryItem {
  id: string;
  videoUrl: string;
  prompt: string;
  config: VideoGenerationConfig;
  timestamp: number;
}

export interface EditorState {
  originalImage: string | null;
  maskImage: string | null;
  brushSize: number;
}

declare global {
  /**
   * AIStudio interface as required by the environment.
   */
  interface AIStudio {
    hasSelectedApiKey(): Promise<boolean>;
    openSelectKey(): Promise<void>;
  }

  interface Window {
    readonly aistudio: AIStudio;
  }
}

export {};