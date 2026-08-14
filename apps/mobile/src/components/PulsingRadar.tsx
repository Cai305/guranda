import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';
import { COLORS } from '../theme';

interface Props {
  color?: string;
  ringSize?: number;
}

// Uber-style "searching for a driver" radar — concentric rings expanding
// and fading out from a solid center pin, looped and staggered.
export default function PulsingRadar({ color = COLORS.primary, ringSize = 220 }: Props) {
  const anims = useRef([new Animated.Value(0), new Animated.Value(0), new Animated.Value(0)]).current;

  useEffect(() => {
    const loops = anims.map((val, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 650),
          Animated.timing(val, {
            toValue: 1,
            duration: 2000,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
        ]),
      ),
    );
    loops.forEach((l) => l.start());
    return () => loops.forEach((l) => l.stop());
  }, []);

  return (
    <View pointerEvents="none" style={[styles.wrap, { width: ringSize, height: ringSize }]}>
      {anims.map((val, i) => (
        <Animated.View
          key={i}
          style={[
            styles.ring,
            {
              borderColor: color,
              width: ringSize,
              height: ringSize,
              borderRadius: ringSize / 2,
              opacity: val.interpolate({ inputRange: [0, 0.7, 1], outputRange: [0.5, 0.16, 0] }),
              transform: [{ scale: val.interpolate({ inputRange: [0, 1], outputRange: [0.22, 1] }) }],
            },
          ]}
        />
      ))}
      <View style={[styles.core, { backgroundColor: color }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { justifyContent: 'center', alignItems: 'center' },
  ring: { position: 'absolute', borderWidth: 2 },
  core: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 3,
    borderColor: '#fff',
  },
});
