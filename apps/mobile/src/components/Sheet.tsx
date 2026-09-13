import React, { useEffect, useState } from 'react';
import { Modal, View, TouchableWithoutFeedback, Dimensions, StyleProp, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useTheme } from '../context/ThemeContext';
import { DURATION, EASING, EXIT_RATIO, SPRING, useReducedMotion } from '../theme/motion';

const { height: SCREEN_H } = Dimensions.get('window');
const DISMISS_DISTANCE = 120;
const DISMISS_VELOCITY = 800;

interface SheetProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Disable the drag-to-dismiss handle (e.g. a sheet with its own internal scroll/drag content). */
  disableDrag?: boolean;
}

// The one shared bottom-sheet wrapper — replaces the `<Modal transparent
// animationType="slide">` + hand-rolled backdrop repeated across ~53 files
// (GiftSheet, RateSellerModal, MediaViewerModal, ChatScreen's several inline
// sheets, ...). What it adds over RN's own Modal animationType: a real
// spring-driven slide (soft deceleration, no linear robotic motion), a
// backdrop that fades independently and a touch faster than the sheet
// enters (exits should feel lighter than entrances), and 1:1 drag-to-dismiss
// that hands off to a spring on release rather than fighting the gesture.
export default function Sheet({ visible, onClose, children, style, disableDrag }: SheetProps) {
  const { theme } = useTheme();
  const { COLORS, RADIUS } = theme;
  const reducedMotion = useReducedMotion();
  const [mounted, setMounted] = useState(visible);
  const translateY = useSharedValue(SCREEN_H);
  const backdropOpacity = useSharedValue(0);
  const dragStartY = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      if (reducedMotion) {
        translateY.value = 0;
        backdropOpacity.value = 1;
        return;
      }
      translateY.value = withSpring(0, SPRING.soft);
      backdropOpacity.value = withTiming(1, { duration: DURATION.standard, easing: EASING.standard });
    } else if (mounted) {
      const exitMs = reducedMotion ? 0 : Math.round(DURATION.spatial * EXIT_RATIO);
      translateY.value = withTiming(SCREEN_H, { duration: exitMs, easing: EASING.in }, (finished) => {
        if (finished) runOnJS(setMounted)(false);
      });
      backdropOpacity.value = withTiming(0, { duration: exitMs, easing: EASING.in });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const close = () => onClose();

  const pan = Gesture.Pan()
    .enabled(!disableDrag)
    .onStart(() => { dragStartY.value = translateY.value; })
    .onUpdate((e) => {
      const next = dragStartY.value + e.translationY;
      translateY.value = Math.max(0, next);
    })
    .onEnd((e) => {
      if (translateY.value > DISMISS_DISTANCE || e.velocityY > DISMISS_VELOCITY) {
        runOnJS(close)();
      } else {
        translateY.value = withSpring(0, SPRING.soft);
      }
    });

  const sheetAnimatedStyle = useAnimatedStyle(() => ({ transform: [{ translateY: translateY.value }] }));
  const backdropAnimatedStyle = useAnimatedStyle(() => ({ opacity: backdropOpacity.value }));

  if (!mounted) return null;

  return (
    <Modal visible transparent animationType="none" onRequestClose={close} statusBarTranslucent>
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        <TouchableWithoutFeedback onPress={close}>
          <Animated.View
            style={[{ ...StyleSheetAbsoluteFill, backgroundColor: 'rgba(0,0,0,0.5)' }, backdropAnimatedStyle]}
          />
        </TouchableWithoutFeedback>
        <GestureDetector gesture={pan}>
          <Animated.View
            style={[
              {
                backgroundColor: COLORS.surface,
                borderTopLeftRadius: RADIUS.xl,
                borderTopRightRadius: RADIUS.xl,
                maxHeight: SCREEN_H * 0.9,
                paddingBottom: 24,
              },
              sheetAnimatedStyle,
              style,
            ]}
          >
            {!disableDrag ? (
              <View style={{ alignItems: 'center', paddingVertical: 10 }}>
                <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: COLORS.border }} />
              </View>
            ) : null}
            {children}
          </Animated.View>
        </GestureDetector>
      </View>
    </Modal>
  );
}

const StyleSheetAbsoluteFill = { position: 'absolute' as const, top: 0, left: 0, right: 0, bottom: 0 };
