

// Guidelines: Aspect ratio can be '1:1', '3:4', '4:3', '9:16', and '16:9'.
export type AspectRatio = '1:1' | '16:9' | '9:16' | '4:3' | '3:4';
export type ImageSize = '1K' | '2K' | '4K';

export interface GenerationConfig {
  aspectRatio: AspectRatio;
  imageSize: ImageSize;
  prompt: string;
  negativePrompt: string;
  seed?: number;
}

export interface HistoryItem {
  id: string;
  imageUrl: string;
  prompt: string;
  config: GenerationConfig;
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