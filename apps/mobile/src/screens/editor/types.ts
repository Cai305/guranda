// Committed transform for a layer — text/sticker overlays are plain RN views
// (see LayerView.tsx), each owning its own live useSharedValue-driven
// animated style; these numbers are the last-committed snapshot synced back
// up on gesture end, used for initial mount and for export bookkeeping.
export type LayerTransform = {
  x: number;
  y: number;
  scale: number;
  rotation: number; // radians
};

export function makeTransform(x: number, y: number, scale = 1, rotation = 0): LayerTransform {
  return { x, y, scale, rotation };
}

export type TextLayerData = {
  kind: 'text';
  text: string;
  color: string;
  fontSize: number;
  fontFamily: 'sans' | 'serif' | 'mono' | 'bold';
  align: 'left' | 'center' | 'right';
};

export type StickerLayerData = {
  kind: 'sticker';
  emoji: string;
};

export type LayerData = TextLayerData | StickerLayerData;

export type Layer = {
  id: string;
  data: LayerData;
  transform: LayerTransform;
};

export type Adjustments = {
  brightness: number; // -1..1
  contrast: number; // -1..1
  saturation: number; // -1..1
};

export const DEFAULT_ADJUSTMENTS: Adjustments = { brightness: 0, contrast: 0, saturation: 0 };

export type CropRect = { x: number; y: number; width: number; height: number };

export type EditorMode = 'photo' | 'poster';

let idCounter = 0;
export function newLayerId(): string {
  idCounter += 1;
  return `layer_${Date.now()}_${idCounter}`;
}
