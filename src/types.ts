export interface ComicPanel {
  id: number;
  prompt: string;
  imageData: string | null; // Base64 string
  status: 'pending' | 'loading' | 'completed' | 'error';
}

export interface GeneratedCopy {
  title: string;
  content: string;
  tags: string[];
}

export interface GenerationState {
  isGenerating: boolean;
  step: 'idle' | 'scripting' | 'drawing' | 'copywriting' | 'done';
  error: string | null;
}

export const AspectRatio = {
  SQUARE: "1:1",
  PORTRAIT: "3:4",
  LANDSCAPE: "4:3"
} as const;

export type AspectRatioType = typeof AspectRatio[keyof typeof AspectRatio];
