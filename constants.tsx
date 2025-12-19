
import { AspectRatio, ImageSize, VideoAspectRatio, VideoResolution, VideoGenerationSpeed } from './types';

export const ASPECT_RATIOS: { label: string; value: AspectRatio; icon: string }[] = [
  { label: 'Square', value: '1:1', icon: 'fa-square' },
  { label: 'Landscape', value: '16:9', icon: 'fa-rectangle-ad' },
  { label: 'Portrait', value: '9:16', icon: 'fa-mobile-screen-button' },
  { label: 'Classic', value: '4:3', icon: 'fa-desktop' },
  { label: 'Standard', value: '3:4', icon: 'fa-file' },
  { label: 'Photo', value: '3:2', icon: 'fa-image' },
  { label: 'Portrait Photo', value: '2:3', icon: 'fa-portrait' },
];

export const VIDEO_ASPECT_RATIOS: { label: string; value: VideoAspectRatio }[] = [
  { label: 'Landscape', value: '16:9' },
  { label: 'Portrait', value: '9:16' },
];

export const VIDEO_RESOLUTIONS: VideoResolution[] = ['720p', '1080p'];

export const VIDEO_GENERATION_SPEEDS: { label: string; value: VideoGenerationSpeed }[] = [
  { label: 'VEO 3.1 - FAST', value: 'fast' },
  { label: 'VEO 3.1', value: 'normal' },
];

export const IMAGE_SIZES: ImageSize[] = ['1K', '2K', '4K'];

export const STORAGE_KEY = 'banana_pro_history';

export const LOADING_MESSAGES = [
  "Manifesting your imagination...",
  "Synthesizing pixels from pure thoughts...",
  "Calibrating the Banana Pro engines...",
  "Refining artistic details...",
  "Almost there, giving it some polish...",
];

export const VIDEO_LOADING_MESSAGES = [
  "Rendering frames of creativity...",
  "Composing your cinematic vision...",
  "Animating the pixels...",
  "Bringing motion to life...",
  "Finalizing your video masterpiece...",
];
