import React, { useEffect } from 'react';
import { StyleSheet, View, LayoutChangeEvent } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  runOnJS,
} from 'react-native-reanimated';
import { useTheme } from '../../context/ThemeContext';

type Props = {
  value: number; // min..max
  min: number;
  max: number;
  onChange: (v: number) => void;
  onChangeEnd?: (v: number) => void;
};

const THUMB = 22;

export default function SimpleSlider({ value, min, max, onChange, onChangeEnd }: Props) {
  const { theme } = useTheme();
  const width = useSharedValue(0);
  const pos = useSharedValue(0); // 0..1

  useEffect(() => {
    const pct = (value - min) / (max - min);
    pos.value = Math.max(0, Math.min(1, pct));
  }, [value, min, max]);

  const onLayout = (e: LayoutChangeEvent) => {
    width.value = e.nativeEvent.layout.width;
  };

  const emit = (pct: number) => {
    const v = min + pct * (max - min);
    onChange(v);
  };
  const emitEnd = (pct: number) => {
    const v = min + pct * (max - min);
    onChangeEnd?.(v);
  };

  const pan = Gesture.Pan()
    .onUpdate((e) => {
      const trackWidth = Math.max(1, width.value - THUMB);
      const next = Math.max(0, Math.min(1, e.x / trackWidth));
      pos.value = next;
      runOnJS(emit)(next);
    })
    .onEnd(() => {
      runOnJS(emitEnd)(pos.value);
    });

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: pos.value * Math.max(1, width.value - THUMB) }],
  }));
  const fillStyle = useAnimatedStyle(() => ({
    width: pos.value * Math.max(1, width.value - THUMB) + THUMB / 2,
  }));

  return (
    <GestureDetector gesture={pan}>
      <View style={styles.track} onLayout={onLayout}>
        <View style={[styles.trackBg, { backgroundColor: theme.COLORS.border }]} />
        <Animated.View style={[styles.fill, fillStyle, { backgroundColor: theme.COLORS.primary }]} />
        <Animated.View style={[styles.thumb, thumbStyle, { backgroundColor: theme.COLORS.primary }]} />
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  track: {
    height: THUMB,
    justifyContent: 'center',
  },
  trackBg: {
    height: 4,
    borderRadius: 2,
  },
  fill: {
    position: 'absolute',
    height: 4,
    borderRadius: 2,
  },
  thumb: {
    position: 'absolute',
    width: THUMB,
    height: THUMB,
    borderRadius: THUMB / 2,
  },
});
