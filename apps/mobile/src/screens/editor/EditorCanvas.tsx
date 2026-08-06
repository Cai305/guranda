import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { Canvas, ColorMatrix, Group, Image, useImage } from '@shopify/react-native-skia';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useDerivedValue, useSharedValue, runOnJS } from 'react-native-reanimated';
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
          ) : (
            <View style={[StyleSheet.absoluteFill, styles.emptyBg]} />
          )}
        </View>
      </GestureDetector>

      {!cropEnabled &&
        layers.map((layer) => (
          <LayerView
            key={layer.id}
            layer={layer}
            selected={layer.id === selectedLayerId}
            onSelect={onSelectLayer}
            onChange={onChangeLayerTransform}
          />
        ))}
    </View>
  );
});

export default EditorCanvas;

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    borderRadius: 16,
    backgroundColor: '#000',
  },
  emptyBg: {
    backgroundColor: '#1A1A26',
  },
});
