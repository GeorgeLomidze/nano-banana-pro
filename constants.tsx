
import { AspectRatio, ImageSize } from './types';

export const ASPECT_RATIOS: { label: string; value: AspectRatio; icon: string }[] = [
  { label: 'Square', value: '1:1', icon: 'fa-square' },
  { label: 'Landscape', value: '16:9', icon: 'fa-rectangle-ad' },
  { label: 'Portrait', value: '9:16', icon: 'fa-mobile-screen-button' },
  { label: 'Classic', value: '4:3', icon: 'fa-desktop' },
  { label: 'Standard', value: '3:4', icon: 'fa-file' },
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
