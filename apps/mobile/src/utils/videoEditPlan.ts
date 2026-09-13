import { Layer } from '../screens/editor/types';

// Shared types + constants for the video editor (VideoEditorScreen) and its
// surrounding screens (MultiClipCaptureScreen, TemplatesScreen). This is the
// client's half of the "client plans, server renders" architecture — see
// video-render.service.ts on the API for the ffmpeg pipeline that turns
// this into a real file.
//
// Overlays reuse the PHOTO editor's own `Layer` model (screens/editor/types.ts)
// verbatim — same freeform drag/pinch/rotate via LayerView.tsx, same
// TextEditorModal/StickerPanel/fonts, instead of a separate, thinner
// video-specific overlay system. A `VideoOverlayLayer` is just a `Layer`
// plus when-it-shows-on-this-clip's-own-timeline bounds.

export type TransitionType = 'cut' | 'fade' | 'slide';

export interface VideoOverlayLayer extends Layer {
  startMs: number;
  endMs: number | null;
}

export interface EditPlanClip {
  id: string;
  sourceUrl: string;
  sourceType: 'RECORDED' | 'LIBRARY';
  trimStartMs: number;
  trimEndMs: number | null;
  /** Continuous, not a fixed multiplier chip — real CapCut-style range. */
  speed: number;
  durationMs: number; // client-only convenience (full source duration), not sent to the API
  overlays: VideoOverlayLayer[];
  /** Transition INTO the next clip; meaningless/ignored on the last clip. */
  transitionOut: TransitionType;
  /** Local filmstrip thumbnail URIs — client-only, never sent to the API. */
  thumbnails: string[];
}

export const MIN_CLIP_MS = 500;
export const MIN_SPEED = 0.3;
export const MAX_SPEED = 3;

export const TRANSITIONS: { key: TransitionType; label: string; icon: string }[] = [
  { key: 'cut', label: 'Cut', icon: 'cut-outline' },
  { key: 'fade', label: 'Fade', icon: 'contrast-outline' },
  { key: 'slide', label: 'Slide', icon: 'swap-horizontal-outline' },
];

// Mirrors apps/mobile/src/screens/editor/filters.ts's FILTER_PRESETS keys —
// same named look means the same thing whether it's touching a photo or a
// video, and now it's the SAME Skia ColorMatrix applied live in both places
// (see EditorVideoCanvas.tsx), not a separate swatch-only approximation.
export const VIDEO_FILTER_PRESETS: { key: string; label: string; swatch: string }[] = [
  { key: 'original', label: 'Original', swatch: '#9CA3AF' },
  { key: 'vivid', label: 'Vivid', swatch: '#F97316' },
  { key: 'bw', label: 'B&W', swatch: '#4B5563' },
  { key: 'warm', label: 'Warm', swatch: '#F59E0B' },
  { key: 'cool', label: 'Cool', swatch: '#38BDF8' },
  { key: 'fade', label: 'Fade', swatch: '#D4B8A8' },
];

export const VOICE_EFFECTS: { key: string; label: string; icon: string }[] = [
  { key: 'chipmunk', label: 'Chipmunk', icon: 'happy-outline' },
  { key: 'deep', label: 'Deep', icon: 'skull-outline' },
  { key: 'robot', label: 'Robot', icon: 'hardware-chip-outline' },
  { key: 'echo', label: 'Echo', icon: 'radio-outline' },
];

let clipIdCounter = 0;
export function newClipId(): string {
  clipIdCounter += 1;
  return `clip_${Date.now()}_${clipIdCounter}`;
}
