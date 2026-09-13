import React, { useEffect, useMemo, useRef } from 'react';
import { View, Text, TouchableOpacity, Animated, Easing } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path } from 'react-native-svg';

// Shared by every proximity-radar screen (AirPayScreen, PayShapAirPayScreen)
// so the animation/geometry code — carefully reverse-engineered from the
// design canvas's CSS — lives in exactly one place instead of being
// copy-pasted per feature.

export const RADAR_BOX = 320;
export const RADAR_CENTER = 160;
export const RING_MAX_PX = 140;

const AVATAR_PALETTE = ['#8B5CF6', '#22D3EE', '#F472B6', '#FBBF24', '#34D399', '#F87171'];
export function colorForId(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return AVATAR_PALETTE[hash % AVATAR_PALETTE.length];
}

// The design's sweep was a CSS conic-gradient wedge (0deg -> accent, fading
// to transparent by 30% of the circle, i.e. a 108deg cone) rotating
// continuously. react-native-svg has no conic-gradient primitive, so the
// wedge is built out of many thin pie slices, each a touch more transparent
// than the last — the standard way to fake an angular gradient in SVG.
const SWEEP_SPAN_DEG = 108;
const SWEEP_SLICES = 36;
function buildSweepSlices(cx: number, cy: number, r: number) {
  const step = SWEEP_SPAN_DEG / SWEEP_SLICES;
  const slices: { d: string; opacity: number }[] = [];
  for (let i = 0; i < SWEEP_SLICES; i++) {
    const a1 = (i * step * Math.PI) / 180;
    const a2 = ((i + 1) * step * Math.PI) / 180;
    const x1 = cx + r * Math.sin(a1);
    const y1 = cy - r * Math.cos(a1);
    const x2 = cx + r * Math.sin(a2);
    const y2 = cy - r * Math.cos(a2);
    slices.push({
      d: `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2} Z`,
      opacity: 1 - i / SWEEP_SLICES,
    });
  }
  return slices;
}

// Restarts `buildAnim()` every time it finishes, forever — used instead of
// `Animated.loop` for every continuous radar animation. Animated.loop should
// do the same thing, but on react-native-web it was observed to run its one
// wrapped animation once and then just stop instead of repeating; explicitly
// re-triggering on the `finished` callback keeps it honest on every
// platform, and is trivial to cancel on unmount.
function loopForever(buildAnim: () => Animated.CompositeAnimation, isCancelled: () => boolean) {
  const tick = () => {
    if (isCancelled()) return;
    buildAnim().start(({ finished }) => {
      if (finished && !isCancelled()) tick();
    });
  };
  tick();
}

// A ring's "breathing" opacity loop — matches the mockup's shared `breathe`
// keyframe (0%/100% = 0.55, 50% = 0.15), just with a different duration and
// start delay per ring so the three rings shimmer out of phase.
function useBreathingOpacity(duration: number, delay: number) {
  const val = useRef(new Animated.Value(0.55)).current;
  useEffect(() => {
    let cancelled = false;
    const t = setTimeout(() => {
      loopForever(
        () => Animated.sequence([
          Animated.timing(val, { toValue: 0.15, duration, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(val, { toValue: 0.55, duration, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        ]),
        () => cancelled,
      );
    }, delay);
    return () => { cancelled = true; clearTimeout(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return val;
}

/** All the radar's continuous motion in one hook — a rotating conic-style sweep, three out-of-phase breathing rings, and a two-layer glow pulse behind "you" (the mockup's `centerGlow` box-shadow keyframe, replicated as two scaling/fading circles since RN shadows don't animate reliably cross-platform). */
export function useRadarMotion() {
  const sweepAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    let cancelled = false;
    // A plain repeating timing (rather than a sequence) needs its own
    // explicit reset each lap — `toValue: 1` a second time is a no-op once
    // the value is already sitting at 1.
    loopForever(() => {
      sweepAnim.setValue(0);
      return Animated.timing(sweepAnim, { toValue: 1, duration: 5000, easing: Easing.linear, useNativeDriver: true });
    }, () => cancelled);
    return () => { cancelled = true; };
  }, [sweepAnim]);
  const sweepRotate = sweepAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  const ring1Opacity = useBreathingOpacity(3000, 0);
  const ring2Opacity = useBreathingOpacity(3600, 400);
  const ring3Opacity = useBreathingOpacity(4200, 800);

  // One shared progress value drives both glow layers together, exactly like
  // the single box-shadow keyframe it replicates drove both shadow layers.
  const glowProgress = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    let cancelled = false;
    loopForever(
      () => Animated.sequence([
        Animated.timing(glowProgress, { toValue: 1, duration: 1200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(glowProgress, { toValue: 0, duration: 1200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
      () => cancelled,
    );
    return () => { cancelled = true; };
  }, [glowProgress]);

  const sweepSlices = useMemo(() => buildSweepSlices(RING_MAX_PX, RING_MAX_PX, RING_MAX_PX), []);

  return {
    sweepRotate,
    sweepSlices,
    ring1Opacity,
    ring2Opacity,
    ring3Opacity,
    innerGlowScale: glowProgress.interpolate({ inputRange: [0, 1], outputRange: [1, 1.4] }),
    innerGlowOpacity: glowProgress.interpolate({ inputRange: [0, 1], outputRange: [0.55, 0] }),
    outerGlowScale: glowProgress.interpolate({ inputRange: [0, 1], outputRange: [1, 1.15] }),
    outerGlowOpacity: glowProgress.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.5] }),
  };
}

const backdropStyles = {
  radarWrap: { width: RADAR_BOX, height: RADAR_BOX, alignSelf: 'center' as const, marginTop: 18 },
  ring: { position: 'absolute' as const, borderRadius: 999, borderWidth: 1 },
  northTick: { position: 'absolute' as const, left: RADAR_CENTER - 8, top: RADAR_CENTER - RING_MAX_PX - 16, width: 16, textAlign: 'center' as const, fontSize: 10, fontWeight: '700' as const },
  centerAvatar: { position: 'absolute' as const, left: RADAR_CENTER - 30, top: RADAR_CENTER - 30, width: 60, height: 60, borderRadius: 30, justifyContent: 'center' as const, alignItems: 'center' as const, borderWidth: 2 },
  centerLabel: { position: 'absolute' as const, left: 0, top: RADAR_CENTER + 36, width: RADAR_BOX, textAlign: 'center' as const, fontSize: 11, fontWeight: '600' as const },
};

/** Rings + sweep + pulsing "you" avatar — wrap nearby-person markers as children, absolutely positioned within the same RADAR_BOX square. */
export function RadarBackdrop({ accent, background, mutedText, children }: {
  accent: string; background: string; mutedText: string; children?: React.ReactNode;
}) {
  const motion = useRadarMotion();
  return (
    <View style={backdropStyles.radarWrap}>
      <Animated.View
        style={{
          position: 'absolute', left: RADAR_CENTER - RING_MAX_PX, top: RADAR_CENTER - RING_MAX_PX,
          width: RING_MAX_PX * 2, height: RING_MAX_PX * 2, transform: [{ rotate: motion.sweepRotate }],
        }}
        pointerEvents="none"
      >
        <Svg width={RING_MAX_PX * 2} height={RING_MAX_PX * 2} viewBox={`0 0 ${RING_MAX_PX * 2} ${RING_MAX_PX * 2}`}>
          {motion.sweepSlices.map((s, i) => (
            <Path key={i} d={s.d} fill={accent} fillOpacity={s.opacity * 0.32} />
          ))}
        </Svg>
      </Animated.View>

      <Animated.View style={[backdropStyles.ring, { left: RADAR_CENTER - 60, top: RADAR_CENTER - 60, width: 120, height: 120, borderColor: accent, opacity: motion.ring1Opacity }]} />
      <Animated.View style={[backdropStyles.ring, { left: RADAR_CENTER - 110, top: RADAR_CENTER - 110, width: 220, height: 220, borderColor: accent, opacity: motion.ring2Opacity }]} />
      <Animated.View style={[backdropStyles.ring, { left: RADAR_CENTER - RING_MAX_PX, top: RADAR_CENTER - RING_MAX_PX, width: RING_MAX_PX * 2, height: RING_MAX_PX * 2, borderColor: accent, opacity: motion.ring3Opacity }]} />
      <Text style={[backdropStyles.northTick, { color: mutedText }]}>N</Text>

      <Animated.View
        pointerEvents="none"
        style={{
          position: 'absolute', left: RADAR_CENTER - 30, top: RADAR_CENTER - 30, width: 60, height: 60, borderRadius: 30,
          backgroundColor: accent, opacity: motion.outerGlowOpacity, transform: [{ scale: motion.outerGlowScale }],
        }}
      />
      <Animated.View
        pointerEvents="none"
        style={{
          position: 'absolute', left: RADAR_CENTER - 30, top: RADAR_CENTER - 30, width: 60, height: 60, borderRadius: 30,
          backgroundColor: accent, opacity: motion.innerGlowOpacity, transform: [{ scale: motion.innerGlowScale }],
        }}
      />
      <View style={[backdropStyles.centerAvatar, { borderColor: background }]}>
        <LinearGradient colors={[accent, '#6D28D9']} style={{ width: '100%', height: '100%', borderRadius: 30, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ fontSize: 20, fontWeight: '800', color: '#FFFFFF' }}>You</Text>
        </LinearGradient>
      </View>

      {children}
    </View>
  );
}

const avatarStyles = {
  personAvatar: { position: 'absolute' as const, width: 44, height: 44, borderRadius: 22, justifyContent: 'center' as const, alignItems: 'center' as const },
  personInitial: { fontSize: 16, fontWeight: '800' as const, color: '#07070C' },
  personLabelWrap: { position: 'absolute' as const, width: 76, alignItems: 'center' as const },
  badge: { position: 'absolute' as const, width: 22, height: 22, borderRadius: 11, borderWidth: 2, justifyContent: 'center' as const, alignItems: 'center' as const },
  badgeText: { fontSize: 7, fontWeight: '800' as const, color: '#07070C' },
};

/**
 * A nearby avatar pops in the first time it appears on the radar (mirrors
 * the mockup's `animation: avatarIn 0.5s ease-out backwards`) — since React
 * keeps the same component instance alive across refetches as long as the
 * person's id is still in the list, this only fires once per person, not on
 * every poll. `label` is whatever markup the caller wants under the avatar
 * (a distance chip + name, two plain text lines, ...) — it fades in with
 * the same pop-in animation rather than dictating one fixed shape, since the
 * plain AirPay radar and PayShap AirPay's radar use different label layouts.
 * `badge` is an optional small corner tag (used by PayShap AirPay to show
 * someone's primary bank) — omit it for the plain radar.
 */
export function RadarAvatar({
  x, y, color, initial, label, onPress, background,
  badgeColor, badgeCode,
}: {
  x: number; y: number; color: string; initial: string; label: React.ReactNode;
  onPress: () => void; background: string;
  badgeColor?: string; badgeCode?: string;
}) {
  const mountAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(mountAnim, { toValue: 1, duration: 500, easing: Easing.out(Easing.ease), useNativeDriver: true }).start();
  }, [mountAnim]);
  const scale = mountAnim.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] });

  return (
    <>
      <Animated.View
        pointerEvents="box-none"
        style={[avatarStyles.personAvatar, { left: x - 22, top: y - 22, backgroundColor: color, opacity: mountAnim, transform: [{ scale }] }]}
      >
        <TouchableOpacity style={{ width: '100%', height: '100%', borderRadius: 22, justifyContent: 'center', alignItems: 'center' }} onPress={onPress}>
          <Text style={avatarStyles.personInitial}>{initial}</Text>
        </TouchableOpacity>
      </Animated.View>
      {badgeColor && badgeCode ? (
        <Animated.View
          pointerEvents="none"
          style={[avatarStyles.badge, { left: x + 6, top: y + 6, backgroundColor: badgeColor, borderColor: background, opacity: mountAnim }]}
        >
          <Text style={avatarStyles.badgeText}>{badgeCode}</Text>
        </Animated.View>
      ) : null}
      <Animated.View style={[avatarStyles.personLabelWrap, { left: x - 38, top: y + 26, opacity: mountAnim }]} pointerEvents="none">
        {label}
      </Animated.View>
    </>
  );
}
