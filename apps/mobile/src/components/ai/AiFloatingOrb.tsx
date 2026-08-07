import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Animated, Easing, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Reanimated, {
  useSharedValue,
  useAnimatedStyle,
  runOnJS,
} from 'react-native-reanimated';
import { useTheme } from '../../context/ThemeContext';
import { useThemedStyles } from '../../theme/useThemedStyles';
import { useAuth } from '../../context/AuthContext';
import { AI_ENABLED } from '../../config/featureFlags';
import { useVoiceCapture } from '../../hooks/useVoiceCapture';
import AiChatDropdown, { AiChatDropdownHandle } from './AiChatDropdown';
import HandsFreeOverlay from './HandsFreeOverlay';
import { registerAiOrbOpener } from '../../utils/aiOrbBridge';
import { navigationRef } from '../../navigation/navigationRef';
import { fetchApi } from '../../utils/api';

const ORB_SIZE = 56;
const HOLD_MS = 5000;
const EDGE_MARGIN = 8;
const DRAG_MIN_DISTANCE = 16;
const ORB_POSITION_KEY = '@mxit_ai_orb_position';

// Screens with their own send/hangup button pinned to this same corner —
// the orb sitting on top of it made those buttons hard to hit (found while
// redesigning ChatScreen). Real messaging apps don't have a floating
// assistant button competing with the send button either.
const ROUTES_WITHOUT_ORB = ['ChatRoom', 'CallScreen'];

export default function AiFloatingOrb() {
  const { isAuthenticated } = useAuth();
  const insets = useSafeAreaInsets();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const [open, setOpen] = useState(false);
  const [voiceActive, setVoiceActive] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [hiddenForRoute, setHiddenForRoute] = useState(false);
  const [handsFreeMode, setHandsFreeMode] = useState(false);
  const [agentName, setAgentName] = useState('AI');
  const [handsFreeOpen, setHandsFreeOpen] = useState(false);
  // Which side of the screen the orb currently sits on — the dropdown/voice
  // pill anchor to whichever edge has room to grow into, so they never get
  // clipped off-screen after the orb is dragged to the opposite side.
  const [anchorRight, setAnchorRight] = useState(true);

  const dropdownRef = useRef<AiChatDropdownHandle>(null);
  const longPressFired = useRef(false);
  const dragFired = useRef(false);
  const progress = useRef(new Animated.Value(0)).current;
  const tickTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Mirrors dragFired on the UI thread — Gesture.Pan's onUpdate runs there
  // and needs to know, per-frame, whether the drag threshold was already
  // crossed this touch without waiting on a JS round-trip.
  const dragThresholdCrossed = useSharedValue(false);

  const voice = useVoiceCapture();

  const { theme } = useTheme();
  const { GRADIENTS } = theme;

  const defaultBottomOffset = insets.bottom + 76;
  const defaultX = screenWidth - EDGE_MARGIN - ORB_SIZE;
  const defaultY = screenHeight - defaultBottomOffset - ORB_SIZE;
  const minX = EDGE_MARGIN;
  const maxX = screenWidth - EDGE_MARGIN - ORB_SIZE;
  const minY = insets.top + EDGE_MARGIN;
  const maxY = screenHeight - insets.bottom - EDGE_MARGIN - ORB_SIZE;

  const orbX = useSharedValue(defaultX);
  const orbY = useSharedValue(defaultY);
  const startX = useSharedValue(defaultX);
  const startY = useSharedValue(defaultY);
  // Must be called unconditionally every render (Rules of Hooks) — this
  // sits above the `if (!AI_ENABLED...) return null` guard below on purpose.
  const orbAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: orbX.value }, { translateY: orbY.value }],
  }));

  // Restore a remembered drag position (if any) once we know real screen
  // dimensions, re-clamping in case this is a different device/orientation
  // than the one it was saved on.
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(ORB_POSITION_KEY);
        if (raw) {
          const { x, y } = JSON.parse(raw);
          const clampedX = Math.min(Math.max(x, minX), maxX);
          const clampedY = Math.min(Math.max(y, minY), maxY);
          orbX.value = clampedX;
          orbY.value = clampedY;
          setAnchorRight(clampedX + ORB_SIZE / 2 > screenWidth / 2);
        }
      } catch {
        // No saved position — fall back to the default bottom-right spot.
      }
    })();
    // Only ever restore once per mount — this isn't meant to re-run as the
    // window resizes mid-session (dragging already keeps it in bounds).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const styles = useThemedStyles(({ COLORS, RADIUS, SHADOW }) => ({
    root: {
      position: 'absolute',
      left: 0,
      top: 0,
      zIndex: 999,
    },
    orbTouchable: {
      width: ORB_SIZE,
      height: ORB_SIZE,
    },
    orb: {
      width: ORB_SIZE,
      height: ORB_SIZE,
      borderRadius: ORB_SIZE / 2,
      justifyContent: 'center',
      alignItems: 'center',
      ...SHADOW.glow,
    },
    chargeRing: {
      position: 'absolute',
      top: 0, left: 0, right: 0, bottom: 0,
      borderRadius: ORB_SIZE / 2,
      borderWidth: 3,
      borderColor: COLORS.secondary,
    },
    dropdownWrap: {
      position: 'absolute',
      bottom: ORB_SIZE + 12,
      width: Math.min(340, screenWidth - 32),
    },
    voicePill: {
      position: 'absolute',
      bottom: ORB_SIZE + 12,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: COLORS.surfaceElevated,
      borderWidth: 1,
      borderColor: COLORS.glassBorder,
      borderRadius: RADIUS.pill,
      paddingHorizontal: 12,
      paddingVertical: 7,
      maxWidth: 260,
    },
    voiceDot: {
      width: 8, height: 8, borderRadius: 4,
      backgroundColor: '#EF4444',
    },
    voiceText: { color: COLORS.text, fontSize: 12, fontWeight: '600' },
  }));

  // Lets screens outside this component (post-tour, chat list, home tile)
  // open this same floating panel instead of pushing the full-screen AiChat
  // route, which covered the tab bar and left users unable to reach anything
  // else without hitting its back button.
  useEffect(() => {
    registerAiOrbOpener(() => setOpen(true));
    return () => registerAiOrbOpener(null);
  }, []);

  useEffect(() => {
    const checkRoute = () => {
      const name = navigationRef.getCurrentRoute?.()?.name;
      setHiddenForRoute(!!name && ROUTES_WITHOUT_ORB.includes(name));
    };
    checkRoute();
    const unsubscribe = navigationRef.addListener('state', checkRoute);
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    (async () => {
      try {
        const res = await fetchApi('/ai/agent');
        const agent = res.ok ? await res.json() : null;
        if (agent && agent.exists !== false) {
          setHandsFreeMode(!!agent.handsFreeMode);
          setAgentName(agent.name || 'AI');
        }
      } catch {
        // Not fatal — the orb just falls back to the normal text dropdown.
      }
    })();
  }, [isAuthenticated]);

  if (!AI_ENABLED || !isAuthenticated || hiddenForRoute) return null;

  const resetProgress = () => {
    progress.stopAnimation();
    progress.setValue(0);
  };

  const savePosition = (x: number, y: number) => {
    AsyncStorage.setItem(ORB_POSITION_KEY, JSON.stringify({ x, y })).catch(() => {});
  };

  const handlePressIn = () => {
    longPressFired.current = false;
    dragFired.current = false;
    resetProgress();
    Animated.timing(progress, {
      toValue: 1,
      duration: HOLD_MS,
      easing: Easing.linear,
      useNativeDriver: false,
    }).start();
    // Pressable's delayLongPress is gone now that this is a plain gesture —
    // this timer is what actually decides "held long enough to talk".
    holdTimer.current = setTimeout(() => { handleLongPress(); }, HOLD_MS);
  };

  const handleLongPress = async () => {
    holdTimer.current = null;
    if (dragFired.current) return;
    longPressFired.current = true;
    setVoiceActive(true);
    setElapsedSec(0);
    tickTimer.current = setInterval(() => setElapsedSec(s => s + 1), 1000);
    await voice.start();
  };

  const handlePressOut = async () => {
    if (holdTimer.current) { clearTimeout(holdTimer.current); holdTimer.current = null; }
    resetProgress();

    if (dragFired.current) return;

    if (!longPressFired.current) {
      if (handsFreeMode) {
        setHandsFreeOpen(true);
      } else {
        setOpen(o => !o);
      }
      return;
    }

    if (tickTimer.current) { clearInterval(tickTimer.current); tickTimer.current = null; }
    setVoiceActive(false);
    const { text, durationMs } = await voice.stop();

    setOpen(true);
    // Give the dropdown a tick to mount before we push messages into it.
    setTimeout(() => {
      if (text) {
        dropdownRef.current?.sendText(text);
      } else {
        const seconds = Math.round(durationMs / 1000);
        dropdownRef.current?.addSystemMessage(
          `🎙️ Captured a ${seconds}s voice message — on-device transcription isn't set up on this device yet. Try the web app, or type your message below.`,
        );
      }
    }, 50);
  };

  const onDragStart = () => {
    dragFired.current = true;
    if (holdTimer.current) { clearTimeout(holdTimer.current); holdTimer.current = null; }
    resetProgress();
    if (voiceActive) {
      if (tickTimer.current) { clearInterval(tickTimer.current); tickTimer.current = null; }
      setVoiceActive(false);
      voice.stop().catch(() => {});
    }
  };

  const onDragEnd = (x: number, y: number) => {
    setAnchorRight(x + ORB_SIZE / 2 > screenWidth / 2);
    savePosition(x, y);
  };

  // A single gesture drives tap, hold-to-talk, AND drag — deliberately NOT
  // composed with a Pressable. Wrapping a Pressable in GestureDetector looks
  // reasonable but the two touch systems fight over the same pointer: the
  // Pressable's onPress/onLongPress simply stop firing once RNGH is
  // attached to the same node (confirmed on web; unreliable on native too).
  // Doing the tap/hold disambiguation entirely inside this Pan gesture's own
  // callbacks — mirrors handlePressIn/handleLongPress/handlePressOut above
  // exactly, just triggered from onBegin/onEnd instead of Pressable props —
  // avoids that fight altogether.
  const orbGesture = Gesture.Pan()
    .minDistance(0)
    .onBegin(() => {
      startX.value = orbX.value;
      startY.value = orbY.value;
      dragThresholdCrossed.value = false;
      runOnJS(handlePressIn)();
    })
    .onUpdate((e) => {
      if (
        !dragThresholdCrossed.value &&
        (Math.abs(e.translationX) > DRAG_MIN_DISTANCE || Math.abs(e.translationY) > DRAG_MIN_DISTANCE)
      ) {
        dragThresholdCrossed.value = true;
        runOnJS(onDragStart)();
      }
      if (dragThresholdCrossed.value) {
        orbX.value = Math.min(Math.max(startX.value + e.translationX, minX), maxX);
        orbY.value = Math.min(Math.max(startY.value + e.translationY, minY), maxY);
      }
    })
    .onEnd(() => {
      if (dragThresholdCrossed.value) {
        runOnJS(onDragEnd)(orbX.value, orbY.value);
      } else {
        runOnJS(handlePressOut)();
      }
    });

  const ringScale = progress.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1.12] });
  const sideAnchorStyle = anchorRight ? { right: 0 } : { left: 0 };

  return (
    <View style={styles.root} pointerEvents="box-none">
      <HandsFreeOverlay
        visible={handsFreeOpen}
        agentName={agentName}
        onClose={() => setHandsFreeOpen(false)}
        onOpenTextChat={() => { setHandsFreeOpen(false); setOpen(true); }}
      />

      <Reanimated.View style={orbAnimatedStyle} pointerEvents="box-none">
        {open && (
          <View style={[styles.dropdownWrap, sideAnchorStyle]}>
            <AiChatDropdown ref={dropdownRef} onClose={() => setOpen(false)} />
          </View>
        )}

        {voiceActive && (
          <View style={[styles.voicePill, sideAnchorStyle]}>
            <View style={styles.voiceDot} />
            <Text style={styles.voiceText}>
              {voice.canTranscribe && voice.interimText ? voice.interimText : `Listening… ${elapsedSec}s`}
            </Text>
          </View>
        )}

        <GestureDetector gesture={orbGesture}>
          <View
            style={styles.orbTouchable}
            accessible
            accessibilityRole="button"
            accessibilityLabel="AI assistant — tap to chat, hold to speak, drag to move"
          >
            <LinearGradient
              colors={voiceActive ? ['#F87171', '#EF4444'] : GRADIENTS.primary}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.orb}
            >
              <Ionicons name={voiceActive ? 'mic' : 'sparkles'} size={22} color="#FFF" />
            </LinearGradient>

            <Animated.View
              pointerEvents="none"
              style={[
                styles.chargeRing,
                { opacity: progress, transform: [{ scale: ringScale }] },
              ]}
            />
          </View>
        </GestureDetector>
      </Reanimated.View>
    </View>
  );
}
