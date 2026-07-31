import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, useWindowDimensions } from 'react-native';
import CustomEmoji, { CustomEmojiType } from './CustomEmoji';

interface Props {
  type: CustomEmojiType | null;
  nonce: number; // bump (even for a repeat type) to retrigger the burst
  durationMs?: number; // should match the accompanying sound's length
}

interface Particle {
  key: number;
  left: number;
  size: number;
  delay: number;
  fallDuration: number;
  drift: number;
  rotate: number;
}

const PARTICLE_COUNT = 14;

function buildParticles(width: number, durationMs: number): Particle[] {
  return Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
    key: i,
    left: Math.random() * (width - 60),
    size: 32 + Math.random() * 28,
    delay: Math.random() * durationMs * 0.35,
    fallDuration: durationMs * (0.65 + Math.random() * 0.35),
    drift: (Math.random() - 0.5) * 120,
    rotate: (Math.random() - 0.5) * 60,
  }));
}

// Fires a shower of the given reaction emoji across the whole screen —
// used so a Live/chat reaction reads as a shared, room-filling moment
// instead of a small inline bubble, timed to last as long as its sound.
export default function EmojiBurstOverlay({ type, nonce, durationMs = 3000 }: Props) {
  const { width, height } = useWindowDimensions();
  const [particles, setParticles] = useState<Particle[]>([]);
  const [visible, setVisible] = useState(false);
  const anims = useRef<Animated.Value[]>([]);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!nonce || !type) return;
    const built = buildParticles(width, durationMs);
    anims.current = built.map(() => new Animated.Value(0));
    setParticles(built);
    setVisible(true);

    const animations = built.map((p, i) =>
      Animated.timing(anims.current[i], {
        toValue: 1,
        duration: p.fallDuration,
        delay: p.delay,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      })
    );
    Animated.parallel(animations).start();

    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setVisible(false), durationMs + 200);
    return () => { if (hideTimer.current) clearTimeout(hideTimer.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nonce]);

  if (!visible || !type) return null;

  return (
    <Animated.View style={StyleSheet.absoluteFill} pointerEvents="none">
      {particles.map((p, i) => {
        const anim = anims.current[i];
        if (!anim) return null;
        const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [height * 0.15, -height * 0.25] });
        const translateX = anim.interpolate({ inputRange: [0, 1], outputRange: [0, p.drift] });
        const rotate = anim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${p.rotate}deg`] });
        const opacity = anim.interpolate({ inputRange: [0, 0.1, 0.75, 1], outputRange: [0, 1, 1, 0] });
        const scale = anim.interpolate({ inputRange: [0, 0.15, 1], outputRange: [0.4, 1, 1] });
        return (
          <Animated.View
            key={p.key}
            style={{
              position: 'absolute',
              left: p.left,
              bottom: 0,
              opacity,
              transform: [{ translateY }, { translateX }, { rotate }, { scale }],
            }}
          >
            <CustomEmoji type={type} size={p.size} />
          </Animated.View>
        );
      })}
    </Animated.View>
  );
}
