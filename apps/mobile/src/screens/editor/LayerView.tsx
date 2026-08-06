import React, { useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import { Layer, LayerTransform } from './types';

const FONT_FAMILY_MAP: Record<string, string | undefined> = {
  sans: undefined, // system default
  serif: 'serif',
  mono: 'monospace',
  bold: undefined,
};

type Props = {
  layer: Layer;
  selected: boolean;
  onSelect: (id: string) => void;
  onChange: (id: string, transform: LayerTransform) => void;
};

export default function LayerView({ layer, selected, onSelect, onChange }: Props) {
  const x = useSharedValue(layer.transform.x);
  const y = useSharedValue(layer.transform.y);
  const scale = useSharedValue(layer.transform.scale);
  const rotation = useSharedValue(layer.transform.rotation);

  const startX = useSharedValue(0);
  const startY = useSharedValue(0);
  const startScale = useSharedValue(1);
  const startRotation = useSharedValue(0);

  const [size, setSize] = useState({ width: 0, height: 0 });

  const select = () => onSelect(layer.id);
  const commit = () => {
    onChange(layer.id, { x: x.value, y: y.value, scale: scale.value, rotation: rotation.value });
  };

  const pan = Gesture.Pan()
    .onStart(() => {
      startX.value = x.value;
      startY.value = y.value;
      runOnJS(select)();
    })
    .onUpdate((e) => {
      x.value = startX.value + e.translationX;
      y.value = startY.value + e.translationY;
    })
    .onEnd(() => runOnJS(commit)());

  const pinch = Gesture.Pinch()
    .onStart(() => {
      startScale.value = scale.value;
    })
    .onUpdate((e) => {
      const next = startScale.value * e.scale;
      scale.value = Math.max(0.3, Math.min(6, next));
    })
    .onEnd(() => runOnJS(commit)());

  const rotate = Gesture.Rotation()
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

  return (
    <GestureDetector gesture={composed}>
      <Animated.View
        style={[styles.layer, animatedStyle, selected && styles.selected]}
        onLayout={(e) => setSize({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height })}
      >
        {layer.data.kind === 'text' ? (
          <Text
            style={{
              color: layer.data.color,
              fontSize: layer.data.fontSize,
              fontWeight: layer.data.fontFamily === 'bold' ? '800' : '600',
              fontFamily: FONT_FAMILY_MAP[layer.data.fontFamily],
              textAlign: layer.data.align,
            }}
          >
            {layer.data.text}
          </Text>
        ) : (
          <Text style={styles.emoji}>{layer.data.emoji}</Text>
        )}
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
