import React, { useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import { Layer, LayerTransform } from './types';
import { fontLetterSpacing, resolveFontFamily } from './fonts';

const SNAP_THRESHOLD = 10;

type Props = {
  layer: Layer;
  selected: boolean;
  canvasWidth: number;
  canvasHeight: number;
  onSelect: (id: string) => void;
  onChange: (id: string, transform: LayerTransform) => void;
  onSnapChange?: (snapX: boolean, snapY: boolean) => void;
};

export default function LayerView({
  layer,
  selected,
  canvasWidth,
  canvasHeight,
  onSelect,
  onChange,
  onSnapChange,
}: Props) {
  const x = useSharedValue(layer.transform.x);
  const y = useSharedValue(layer.transform.y);
  const scale = useSharedValue(layer.transform.scale);
  const rotation = useSharedValue(layer.transform.rotation);

  const startX = useSharedValue(0);
  const startY = useSharedValue(0);
  const startScale = useSharedValue(1);
  const startRotation = useSharedValue(0);
  const lastSnapX = useSharedValue(false);
  const lastSnapY = useSharedValue(false);

  const [size, setSize] = useState({ width: 0, height: 0 });

  const centerX = canvasWidth / 2;
  const centerY = canvasHeight / 2;

  const select = () => onSelect(layer.id);
  const commit = () => {
    onChange(layer.id, { x: x.value, y: y.value, scale: scale.value, rotation: rotation.value });
  };
  const reportSnap = (sx: boolean, sy: boolean) => onSnapChange?.(sx, sy);
  const clearSnap = () => onSnapChange?.(false, false);

  const pan = Gesture.Pan()
    .enabled(!layer.locked)
    .onStart(() => {
      startX.value = x.value;
      startY.value = y.value;
      runOnJS(select)();
    })
    .onUpdate((e) => {
      let nextX = startX.value + e.translationX;
      let nextY = startY.value + e.translationY;
      const snapX = Math.abs(nextX - centerX) < SNAP_THRESHOLD;
      const snapY = Math.abs(nextY - centerY) < SNAP_THRESHOLD;
      if (snapX) nextX = centerX;
      if (snapY) nextY = centerY;
      x.value = nextX;
      y.value = nextY;
      if (snapX !== lastSnapX.value || snapY !== lastSnapY.value) {
        lastSnapX.value = snapX;
        lastSnapY.value = snapY;
        runOnJS(reportSnap)(snapX, snapY);
      }
    })
    .onEnd(() => {
      runOnJS(commit)();
      runOnJS(clearSnap)();
    });

  const pinch = Gesture.Pinch()
    .enabled(!layer.locked)
    .onStart(() => {
      startScale.value = scale.value;
    })
    .onUpdate((e) => {
      const next = startScale.value * e.scale;
      scale.value = Math.max(0.2, Math.min(8, next));
    })
    .onEnd(() => runOnJS(commit)());

  const rotate = Gesture.Rotation()
    .enabled(!layer.locked)
    .onStart(() => {
      startRotation.value = rotation.value;
    })
    .onUpdate((e) => {
      rotation.value = startRotation.value + e.rotation;
    })
    .onEnd(() => runOnJS(commit)());

  const composed = Gesture.Simultaneous(pan, pinch, rotate);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: x.value },
      { translateY: y.value },
      { translateX: -size.width / 2 },
      { translateY: -size.height / 2 },
      { rotate: `${rotation.value}rad` },
      { scale: scale.value },
    ],
  }));

  const renderContent = () => {
    if (layer.data.kind === 'text') {
      const d = layer.data;
      return (
        <Text
          style={{
            color: d.color,
            fontSize: d.fontSize,
            fontFamily: resolveFontFamily(d.fontFamily, d.bold),
            letterSpacing: fontLetterSpacing(d.fontFamily),
            textAlign: d.align,
            backgroundColor: d.backgroundColor ?? undefined,
            paddingHorizontal: d.backgroundColor ? 10 : 0,
            paddingVertical: d.backgroundColor ? 4 : 0,
            borderRadius: d.backgroundColor ? 8 : 0,
            overflow: d.backgroundColor ? 'hidden' : 'visible',
          }}
        >
          {d.text}
        </Text>
      );
    }
    if (layer.data.kind === 'sticker') {
      return <Text style={styles.emoji}>{layer.data.emoji}</Text>;
    }
    if (layer.data.kind === 'shape') {
      const d = layer.data;
      if (d.shapeType === 'line') {
        return <View style={{ width: d.width, height: Math.max(2, d.height), backgroundColor: d.color }} />;
      }
      const radius = d.shapeType === 'circle' ? Math.max(d.width, d.height) / 2 : d.cornerRadius ?? 0;
      return <View style={{ width: d.width, height: d.height, backgroundColor: d.color, borderRadius: radius }} />;
    }
    // image
    const d = layer.data;
    const uri = d.processedUri ?? d.uri;
    return <Image source={{ uri }} style={{ width: d.width, height: d.height }} resizeMode="contain" />;
  };

  return (
    <GestureDetector gesture={composed}>
      <Animated.View
        style={[
          styles.layer,
          animatedStyle,
          { opacity: layer.opacity },
          selected && styles.selected,
        ]}
        onLayout={(e) => setSize({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height })}
      >
        {renderContent()}
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  layer: {
    position: 'absolute',
    left: 0,
    top: 0,
    padding: 6,
  },
  selected: {
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.6)',
    borderStyle: 'dashed',
    borderRadius: 8,
  },
  emoji: {
    fontSize: 56,
  },
});
