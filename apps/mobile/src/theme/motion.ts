import { useEffect, useState } from 'react';
import { AccessibilityInfo, Easing } from 'react-native';
import { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';

// Shared motion tokens — one scale used everywhere reads as a coherent
// product; a fresh "300ms ease-in-out" invented per screen reads as a bug
// even when each one is individually fine. Nothing here varies by color
// theme (unlike ThemeTokens in theme/themes.ts), so it lives standalone.

export const DURATION = {
  // Hover/press/toggle/icon swap — fast enough to feel instant.
  micro: 120,
  // Dropdown, tooltip, toast in, small transition.
  standard: 200,
  // Drawer, modal, page-level sheet — bigger moving mass.
  spatial: 320,
} as const;

// Exits should feel lighter/quicker than entrances — nobody waits for a
// goodbye. Multiply an entrance duration by this to get its exit.
export const EXIT_RATIO = 0.7;

export const EASING = {
  // Fast-start, soft-landing — the one curve to reach for on anything
  // entering the viewport (sheets, dropdowns, toasts).
  standard: Easing.bezier(0.32, 0.72, 0, 1),
  out: Easing.out(Easing.cubic),
  in: Easing.in(Easing.cubic),
  linear: Easing.linear,
} as const;

// Reanimated spring configs (import where Reanimated is already the idiom —
// see SpinTheBottleScreen.tsx / TruthOrDareScreen.tsx / editor/*.tsx for the
// established worklet style this project already uses).
export const SPRING = {
  // Small UI elements: buttons, chips, toggles.
  snappy: { damping: 18, stiffness: 260, mass: 0.6 },
  // Sheets/drawers/larger moving mass — a bit softer, no overshoot bounce.
  soft: { damping: 22, stiffness: 180, mass: 0.9 },
} as const;

/**
 * Mirrors the web's `prefers-reduced-motion`: collapse to instant or
 * opacity-only transitions when the OS accessibility setting is on. This is
 * a correctness requirement per the interaction-design guidelines, not an
 * edge case — check it in any new animated component.
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled?.()
      .then((v) => { if (mounted) setReduced(!!v); })
      .catch(() => {});
    const sub = AccessibilityInfo.addEventListener?.('reduceMotionChanged', (v: boolean) => setReduced(!!v));
    return () => { mounted = false; sub?.remove?.(); };
  }, []);

  return reduced;
}

/**
 * A real press-in scale for anything tappable — the one bit of feedback
 * that makes a UI feel "clickable" rather than "static image with an
 * onClick" (see the interaction-design state-coverage checklist's
 * Active/press row). Wire `onPressIn`/`onPressOut` from a TouchableOpacity
 * (not Pressable — see components/Button.tsx's comment on why) to the
 * returned handlers, and spread `style` onto an Animated.View/
 * Animated.createAnimatedComponent(TouchableOpacity).
 */
export function usePressScale(target = 0.96) {
  const reducedMotion = useReducedMotion();
  const scale = useSharedValue(1);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const onPressIn = () => { if (!reducedMotion) scale.value = withSpring(target, SPRING.snappy); };
  const onPressOut = () => { scale.value = withSpring(1, SPRING.snappy); };
  return { style, onPressIn, onPressOut };
}
