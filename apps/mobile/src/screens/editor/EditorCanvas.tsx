import React, { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Canvas, ColorMatrix, Group, Image, useImage } from '@shopify/react-native-skia';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useDerivedValue, useSharedValue, runOnJS } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { ColorMatrix as Matrix, IDENTITY_MATRIX } from './filters';
import { Layer, LayerTransform } from './types';
import LayerView from './LayerView';

export type EditorCanvasHandle = {
  getBackgroundTransform: () => { x: number; y: number; scale: number };
  resetBackgroundTransform: () => void;
};

type Props = {
  imageUri?: string | null;
  backgroundGradient?: readonly [string, string] | null;
  transparentBackground?: boolean;
  width: number;
  height: number;
  filterMatrix: Matrix;
  cropEnabled: boolean;
  layers: Layer[];
  selectedLayerId: string | null;
  onSelectLayer: (id: string | null) => void;
  onChangeLayerTransform: (id: string, t: LayerTransform) => void;
};

const EditorCanvas = forwardRef<EditorCanvasHandle, Props>(function EditorCanvas(
  {
    imageUri,
    backgroundGradient,
    transparentBackground,
    width,
    height,
    filterMatrix,
    cropEnabled,
    layers,
    selectedLayerId,
    onSelectLayer,
    onChangeLayerTransform,
  },
  ref,
) {
  const image = useImage(imageUri ?? undefined);
  const [snap, setSnap] = useState({ x: false, y: false });

  const bgX = useSharedValue(0);
  const bgY = useSharedValue(0);
  const bgScale = useSharedValue(1);
  const startBgX = useSharedValue(0);
  const startBgY = useSharedValue(0);
  const startBgScale = useSharedValue(1);

  useImperativeHandle(ref, () => ({
    getBackgroundTransform: () => ({ x: bgX.value, y: bgY.value, scale: bgScale.value }),
    resetBackgroundTransform: () => {
      bgX.value = 0;
      bgY.value = 0;
      bgScale.value = 1;
    },
  }));

  const pan = Gesture.Pan()
    .enabled(cropEnabled)
    .onStart(() => {
      startBgX.value = bgX.value;
      startBgY.value = bgY.value;
    })
    .onUpdate((e) => {
      bgX.value = startBgX.value + e.translationX;
      bgY.value = startBgY.value + e.translationY;
    });

  const pinch = Gesture.Pinch()
    .enabled(cropEnabled)
    .onStart(() => {
      startBgScale.value = bgScale.value;
    })
    .onUpdate((e) => {
      bgScale.value = Math.max(1, Math.min(4, startBgScale.value * e.scale));
    });

  const bgGesture = Gesture.Simultaneous(pan, pinch);

  const transform = useDerivedValue(() => [
    { translateX: width / 2 + bgX.value },
    { translateY: height / 2 + bgY.value },
    { scale: bgScale.value },
    { translateX: -width / 2 },
    { translateY: -height / 2 },
  ]);

  const deselectRef = useRef(() => onSelectLayer(null));
  deselectRef.current = () => onSelectLayer(null);
  const tapBackground = Gesture.Tap().onEnd(() => {
    runOnJS(deselectRef.current)();
  });

  const handleSnapChange = (x: boolean, y: boolean) => setSnap((prev) => (prev.x === x && prev.y === y ? prev : { x, y }));

  return (
    <View style={[styles.container, { width, height }]}>
      <GestureDetector gesture={Gesture.Race(bgGesture, tapBackground)}>
        <View style={StyleSheet.absoluteFill}>
          {image ? (
            <Canvas style={StyleSheet.absoluteFill}>
              <Group transform={transform}>
                <Image image={image} x={0} y={0} width={width} height={height} fit="cover">
                  <ColorMatrix matrix={filterMatrix.length ? filterMatrix : IDENTITY_MATRIX} />
                </Image>
              </Group>
            </Canvas>
          ) : backgroundGradient ? (
            <LinearGradient colors={backgroundGradient} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
          ) : !transparentBackground ? (
            <View style={[StyleSheet.absoluteFill, styles.emptyBg]} />
          ) : null}
        </View>
      </GestureDetector>

      {!cropEnabled &&
        layers
          .filter((l) => !l.hidden)
          .map((layer) => (
            <LayerView
              key={layer.id}
              layer={layer}
              selected={layer.id === selectedLayerId}
              canvasWidth={width}
              canvasHeight={height}
              onSelect={onSelectLayer}
              onChange={onChangeLayerTransform}
              onSnapChange={handleSnapChange}
            />
          ))}

      {!cropEnabled && snap.x && <View pointerEvents="none" style={[styles.guideV, { left: width / 2 }]} />}
      {!cropEnabled && snap.y && <View pointerEvents="none" style={[styles.guideH, { top: height / 2 }]} />}
    </View>
  );
});

export default EditorCanvas;

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    borderRadius: 16,
  },
  emptyBg: {
    backgroundColor: '#1A1A26',
  },
  guideV: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 1.5,
    backgroundColor: '#FF2D78',
  },
  guideH: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1.5,
    backgroundColor: '#FF2D78',
  },
});
