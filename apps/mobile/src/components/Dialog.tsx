import React, { useEffect, useState } from 'react';
import { Modal, View, TouchableWithoutFeedback, StyleProp, ViewStyle } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, runOnJS } from 'react-native-reanimated';
import { DURATION, EASING, EXIT_RATIO, useReducedMotion } from '../theme/motion';

interface DialogProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  dismissOnBackdrop?: boolean;
}

// The centered-card counterpart to Sheet.tsx — for a confirmation/form
// dialog that isn't spatially "sliding up from the bottom" (RateSellerModal
// and similar). A dialog arrives by fading + scaling up from 0.95, the
// restrained default this app's motion vocabulary uses everywhere outside
// the tab-icon "pop" (see navigation/tabbars/shared.tsx) — no overshoot,
// since a rating/confirmation prompt isn't a playful moment. Exit is
// faster than the entrance (EXIT_RATIO), same rule as every other
// transition in theme/motion.ts.
export default function Dialog({ visible, onClose, children, style, dismissOnBackdrop = true }: DialogProps) {
  const reducedMotion = useReducedMotion();
  const [mounted, setMounted] = useState(visible);
  const progress = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      progress.value = reducedMotion ? 1 : withTiming(1, { duration: DURATION.standard, easing: EASING.standard });
    } else if (mounted) {
      const exitMs = reducedMotion ? 0 : Math.round(DURATION.standard * EXIT_RATIO);
      progress.value = withTiming(0, { duration: exitMs, easing: EASING.in }, (finished) => {
        if (finished) runOnJS(setMounted)(false);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const backdropStyle = useAnimatedStyle(() => ({ opacity: progress.value }));
  const cardStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ scale: 0.95 + progress.value * 0.05 }],
  }));

  if (!mounted) return null;

  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <View style={{ flex: 1, justifyContent: 'center', padding: 20 }}>
        <TouchableWithoutFeedback onPress={dismissOnBackdrop ? onClose : undefined}>
          <Animated.View
            style={[{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.65)' }, backdropStyle]}
          />
        </TouchableWithoutFeedback>
        <Animated.View style={[cardStyle, style]} pointerEvents="box-none">
          {children}
        </Animated.View>
      </View>
    </Modal>
  );
}
