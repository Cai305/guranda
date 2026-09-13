import React, { useEffect, useState } from 'react';
import { Text, View, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withSpring, runOnJS } from 'react-native-reanimated';
import { useTheme } from '../context/ThemeContext';
import { DURATION, EASING, EXIT_RATIO, SPRING, useReducedMotion } from '../theme/motion';

// Same module-singleton pub-sub idiom as utils/webAlertPolyfill.tsx's
// WebAlertHost — one queue, one listener, published on every change; the
// host component (mounted once near the app root, see App.tsx) is the only
// thing that ever reads it.

type ToastVariant = 'default' | 'success' | 'error';
interface QueuedToast {
  id: number;
  title: string;
  message?: string;
  variant: ToastVariant;
}

type Listener = (queue: QueuedToast[]) => void;
let queue: QueuedToast[] = [];
let listener: Listener | null = null;
let nextId = 1;
const AUTO_DISMISS_MS = 3200;
const MAX_VISIBLE = 3;

function publish() {
  listener?.(queue);
}

function dismiss(id: number) {
  queue = queue.filter((t) => t.id !== id);
  publish();
}

function show(title: string, opts?: { message?: string; variant?: ToastVariant }) {
  const item: QueuedToast = { id: nextId++, title, message: opts?.message, variant: opts?.variant ?? 'default' };
  queue = [item, ...queue].slice(0, MAX_VISIBLE);
  publish();
  setTimeout(() => dismiss(item.id), AUTO_DISMISS_MS);
}

export const toast = {
  show: (title: string, message?: string) => show(title, { message, variant: 'default' }),
  success: (title: string, message?: string) => show(title, { message, variant: 'success' }),
  error: (title: string, message?: string) => show(title, { message, variant: 'error' }),
};

function ToastItem({ item, index, onDismiss }: { item: QueuedToast; index: number; onDismiss: (id: number) => void }) {
  const { theme } = useTheme();
  const { COLORS, RADIUS } = theme;
  const reducedMotion = useReducedMotion();
  const progress = useSharedValue(0); // 0 = offscreen, 1 = settled at this stack position
  const exiting = useSharedValue(false);

  useEffect(() => {
    progress.value = reducedMotion ? 1 : withSpring(1, SPRING.snappy);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const dismissSelf = () => {
    if (exiting.value) return;
    exiting.value = true;
    const exitMs = reducedMotion ? 0 : Math.round(DURATION.standard * EXIT_RATIO);
    progress.value = withTiming(-1, { duration: exitMs, easing: EASING.in }, (finished) => {
      if (finished) runOnJS(onDismiss)(item.id);
    });
  };

  // Queue items behind the front toast sit slightly smaller/higher/more
  // transparent — the stack itself communicates "more behind this" instead
  // of one toast instantly replacing the last.
  const targetScale = 1 - index * 0.05;
  const targetY = -index * 8;

  const style = useAnimatedStyle(() => {
    const enterY = 40 * (1 - Math.max(progress.value, 0));
    const exitY = progress.value < 0 ? -progress.value * 40 : 0;
    return {
      opacity: progress.value < 0 ? 1 + progress.value : Math.max(progress.value, 0.001),
      transform: [
        { translateY: targetY + enterY + exitY },
        { scale: targetScale },
      ],
    };
  });

  const iconName = item.variant === 'success' ? 'checkmark-circle' : item.variant === 'error' ? 'alert-circle' : 'information-circle';
  const iconColor = item.variant === 'success' ? COLORS.success : item.variant === 'error' ? COLORS.error : COLORS.primary;

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          left: 16,
          right: 16,
          bottom: 0,
          zIndex: 100 - index,
          backgroundColor: COLORS.surfaceElevated,
          borderWidth: 1,
          borderColor: COLORS.border,
          borderRadius: RADIUS.md,
          padding: 14,
          flexDirection: 'row',
          alignItems: 'flex-start',
          gap: 10,
          shadowColor: '#000',
          shadowOpacity: 0.2,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 4 },
          elevation: 6,
        },
        style,
      ]}
      onTouchEnd={dismissSelf}
    >
      <Ionicons name={iconName as any} size={20} color={iconColor} />
      <View style={{ flex: 1 }}>
        <Text style={{ color: COLORS.text, fontWeight: '700', fontSize: 14 }}>{item.title}</Text>
        {item.message ? <Text style={{ color: COLORS.textMuted, fontSize: 12.5, marginTop: 2 }}>{item.message}</Text> : null}
      </View>
    </Animated.View>
  );
}

/** Mount once near the app root (see App.tsx) — every `toast.show/success/error()` call renders here. */
export default function ToastHost() {
  const [current, setCurrent] = useState<QueuedToast[]>(queue);

  useEffect(() => {
    listener = setCurrent;
    return () => { listener = null; };
  }, []);

  if (current.length === 0) return null;

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: Platform.OS === 'web' ? 90 : 100,
        alignItems: 'stretch',
      }}
    >
      {current.map((item, i) => (
        <ToastItem key={item.id} item={item} index={i} onDismiss={dismiss} />
      ))}
    </View>
  );
}
