// Committed transform for a layer — text/sticker/shape/image overlays are
// plain RN views (see LayerView.tsx), each owning its own live
// useSharedValue-driven animated style; these numbers are the last-committed
// snapshot synced back up on gesture end, used for initial mount and export
// bookkeeping.
export type LayerTransform = {
  x: number;
  y: number;
  scale: number;
  rotation: number; // radians
};

export function makeTransform(x: number, y: number, scale = 1, rotation = 0): LayerTransform {
  return { x, y, scale, rotation };
}

export type FontKey = 'inter' | 'poppins' | 'playfair' | 'bebas' | 'caveat' | 'oswald';

export type TextLayerData = {
  kind: 'text';
  text: string;
  color: string;
  fontSize: number;
  fontFamily: FontKey;
  bold: boolean;
  align: 'left' | 'center' | 'right';
  backgroundColor?: string | null;
};

export type StickerLayerData = {
  kind: 'sticker';
  emoji: string;
};

export type ShapeKind = 'rect' | 'circle' | 'line';

export type ShapeLayerData = {
  kind: 'shape';
  shapeType: ShapeKind;
  color: string;
  width: number;
  height: number;
  cornerRadius?: number;
};

export type ImageLayerData = {
  kind: 'image';
  uri: string;
  width: number;
  height: number;
  /** Server-hosted transparent-background version, once produced */
  processedUri?: string | null;
  removingBackground?: boolean;
};

export type LayerData = TextLayerData | StickerLayerData | ShapeLayerData | ImageLayerData;

export type Layer = {
  id: string;
  data: LayerData;
  transform: LayerTransform;
  opacity: number; // 0..1
  locked: boolean;
  hidden: boolean;
};

export function makeLayer(id: string, data: LayerData, transform: LayerTransform): Layer {
  return { id, data, transform, opacity: 1, locked: false, hidden: false };
}

export type Adjustments = {
  brightness: number; // -1..1
  contrast: number; // -1..1
  saturation: number; // -1..1
};

export const DEFAULT_ADJUSTMENTS: Adjustments = { brightness: 0, contrast: 0, saturation: 0 };

export type CropRect = { x: number; y: number; width: number; height: number };

export type EditorMode = 'photo' | 'poster';

export type AspectRatioId = 'story' | 'post' | 'portrait' | 'landscape';

export type AspectRatioPreset = {
  id: AspectRatioId;
  label: string;
  sublabel: string;
  ratio: number; // width / height
  icon: 'phone-portrait-outline' | 'square-outline' | 'image-outline' | 'tablet-landscape-outline';
};

export const ASPECT_RATIOS: AspectRatioPreset[] = [
  { id: 'story', label: 'Story', sublabel: '9:16', ratio: 9 / 16, icon: 'phone-portrait-outline' },
  { id: 'post', label: 'Post', sublabel: '1:1', ratio: 1, icon: 'square-outline' },
  { id: 'portrait', label: 'Portrait', sublabel: '4:5', ratio: 4 / 5, icon: 'image-outline' },
  { id: 'landscape', label: 'Landscape', sublabel: '16:9', ratio: 16 / 9, icon: 'tablet-landscape-outline' },
];

let idCounter = 0;
export function newLayerId(): string {
  idCounter += 1;
  return `layer_${Date.now()}_${idCounter}`;
}
