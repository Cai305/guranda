import React, { forwardRef, useImperativeHandle } from 'react';
import { StyleSheet, View } from 'react-native';
import { Canvas, ColorMatrix, Group, Image as SkiaImage, useVideo } from '@shopify/react-native-skia';
import { useFrameCallback, useSharedValue, runOnJS } from 'react-native-reanimated';
import { ColorMatrix as Matrix, IDENTITY_MATRIX } from './filters';
import { Layer, LayerTransform } from './types';
import LayerView from './LayerView';

export type EditorVideoCanvasHandle = {
  seekTo: (ms: number) => void;
};

type Props = {
  sourceUrl: string;
  width: number;
  height: number;
  filterMatrix: Matrix;
  /** Continuous multiplier (0.3–3) — driven entirely by our own frame pump, not a native rate, so the live preview genuinely shows the sped-up/slowed-down result (see comment below). */
  speed: number;
  trimStartMs: number;
  trimEndMs: number;
  playing: boolean;
  overlays: Layer[];
  /** Overlays outside [startMs, endMs) on THIS clip's local (post-trim) timeline are hidden — real timing, not "always visible while editing." */
  currentClipMs: number;
  selectedOverlayId: string | null;
  onSelectOverlay: (id: string | null) => void;
  onChangeOverlayTransform: (id: string, t: LayerTransform) => void;
  onTimeUpdate: (clipLocalMs: number) => void;
};

// The video editor's live preview — the direct video analogue of
// EditorCanvas.tsx (the photo editor's Skia canvas). Same
// `<Canvas><Image><ColorMatrix/></Image></Canvas>` shape, same LayerView
// overlay system reused verbatim; the only real difference is the image
// source: `useVideo()` (Skia's reanimated-driven video-texture hook) hands
// back `currentFrame`, a SharedValue<SkImage> refreshed via `.nextImage()`
// every time we move `seek` — Skia components accept a SharedValue directly
// as a prop and re-render on the UI thread when it changes, so passing
// `currentFrame` straight into `<SkiaImage image={currentFrame}>` gives a
// genuinely live, frame-accurate preview with the SAME color-matrix filter
// the photo editor applies, not a translucent tint approximation.
//
// Skia's `useVideo` has no playback-rate control (see its type — only
// paused/seek/volume/looping), so speed is implemented ourselves: a
// Reanimated `useFrameCallback` advances a virtual clock by
// `deltaTime * speed` every frame and writes it straight to `seek` — this
// is more correct than a native rate property anyway, since it's the exact
// same "advance the timeline, then seek" model the server's ffmpeg
// `setpts` step uses to change speed, so the live preview and the final
// render agree.
const EditorVideoCanvas = forwardRef<EditorVideoCanvasHandle, Props>(function EditorVideoCanvas(
  {
    sourceUrl, width, height, filterMatrix, speed, trimStartMs, trimEndMs, playing,
    overlays, currentClipMs, selectedOverlayId, onSelectOverlay, onChangeOverlayTransform, onTimeUpdate,
  },
  ref,
) {
  const seek = useSharedValue<number | null>(trimStartMs / 1000);
  const virtualTimeSec = useSharedValue(trimStartMs / 1000);
  const lastReportedDecisecond = useSharedValue(-1);

  const { currentFrame } = useVideo(sourceUrl, { paused: true, seek, looping: false, volume: 0 });

  useImperativeHandle(ref, () => ({
    seekTo: (ms: number) => {
      virtualTimeSec.value = ms / 1000;
      seek.value = ms / 1000;
    },
  }));

  useFrameCallback((frameInfo) => {
    'worklet';
    const deltaSec = (frameInfo.timeSincePreviousFrame ?? 16.7) / 1000;
    const startSec = trimStartMs / 1000;
    const endSec = trimEndMs / 1000;
    let next = virtualTimeSec.value + deltaSec * speed;
    if (next >= endSec) next = startSec; // loop within the trimmed range
    virtualTimeSec.value = next;
    seek.value = next;

    const localMs = Math.round((next - startSec) * 1000);
    const decisecond = Math.floor(localMs / 100);
    if (decisecond !== lastReportedDecisecond.value) {
      lastReportedDecisecond.value = decisecond;
      runOnJS(onTimeUpdate)(localMs);
    }
  }, playing);

  const visibleOverlays = overlays.filter(
    (l) => !l.hidden && currentClipMs >= (l as any).startMs && ((l as any).endMs == null || currentClipMs <= (l as any).endMs),
  );

  return (
    <View style={[styles.container, { width, height }]}>
      <Canvas style={StyleSheet.absoluteFill}>
        <Group>
          <SkiaImage image={currentFrame} x={0} y={0} width={width} height={height} fit="cover">
            <ColorMatrix matrix={filterMatrix.length ? filterMatrix : IDENTITY_MATRIX} />
          </SkiaImage>
        </Group>
      </Canvas>

      {visibleOverlays.map((layer) => (
        <LayerView
          key={layer.id}
          layer={layer}
          selected={layer.id === selectedOverlayId}
          canvasWidth={width}
          canvasHeight={height}
          onSelect={onSelectOverlay}
          onChange={onChangeOverlayTransform}
        />
      ))}
    </View>
  );
});

export default EditorVideoCanvas;

const styles = StyleSheet.create({
  container: { overflow: 'hidden', borderRadius: 16, backgroundColor: '#000' },
});
