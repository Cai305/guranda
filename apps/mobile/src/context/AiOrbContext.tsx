import React, { createContext, useContext, useRef, useState } from 'react';
import { View, TouchableOpacity, Animated, Easing, useWindowDimensions, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { useThemedStyles } from '../theme/useThemedStyles';
import { useAuth } from './AuthContext';
import { useAiConversation } from './AiConversationContext';
import { AI_ENABLED } from '../config/featureFlags';
import AiChatDropdown from '../components/ai/AiChatDropdown';
import HandsFreeOverlay from '../components/ai/HandsFreeOverlay';

// How long the AI tab-bar button must be held before it activates full
// voice mode (HandsFreeOverlay) — a ChatGPT-style continuous voice
// conversation, not a one-shot dictation.
const HOLD_MS = 7000;

// The tray floats above the AI trigger regardless of which bottom-bar style
// (config/tabBarStyles.ts) is active — since each style places that trigger
// at a different height, this uses one generous clearance that comfortably
// clears the tallest of the five (Dock, ~84px) rather than being tied to
// one style's exact geometry.
const PANEL_BOTTOM_CLEARANCE = 100;

interface AiOrbContextValue {
  open: boolean;
  pressing: boolean;
  progress: Animated.Value;
  handlePressIn: () => void;
  handlePressOut: () => void;
  closeTray: () => void;
  openTray: () => void;
}

const AiOrbContext = createContext<AiOrbContextValue | null>(null);

export function useAiOrb() {
  const ctx = useContext(AiOrbContext);
  if (!ctx) throw new Error('useAiOrb must be used within AiOrbProvider');
  return ctx;
}

// Mounted once at the app root (same spot the old floating orb lived) so its
// tray can overlay every screen — but the trigger button itself now lives
// inside the bottom tab bar (see CustomTabBar) instead of floating freely.
export default function AiOrbProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  const { agentName } = useAiConversation();
  const insets = useSafeAreaInsets();
  const { height: screenHeight } = useWindowDimensions();
  const [open, setOpen] = useState(false);
  const [pressing, setPressing] = useState(false);
  const [handsFreeOpen, setHandsFreeOpen] = useState(false);

  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressFired = useRef(false);
  const progress = useRef(new Animated.Value(0)).current;

  const resetProgress = () => {
    progress.stopAnimation();
    progress.setValue(0);
  };

  const handleLongPress = () => {
    holdTimer.current = null;
    longPressFired.current = true;
    setPressing(false);
    resetProgress();
    setOpen(false);
    setHandsFreeOpen(true);
  };

  const handlePressIn = () => {
    longPressFired.current = false;
    setPressing(true);
    resetProgress();
    Animated.timing(progress, {
      toValue: 1,
      duration: HOLD_MS,
      easing: Easing.linear,
      useNativeDriver: false,
    }).start();
    holdTimer.current = setTimeout(handleLongPress, HOLD_MS);
  };

  const handlePressOut = () => {
    setPressing(false);
    if (holdTimer.current) {
      clearTimeout(holdTimer.current);
      holdTimer.current = null;
    }
    resetProgress();
    // The 7s hold already opened voice mode mid-press — a plain release
    // afterward shouldn't also toggle the text tray.
    if (longPressFired.current) return;
    setOpen(o => !o);
  };

  const closeTray = () => setOpen(false);
  const openTray = () => setOpen(true);

  // Tray floats above wherever the active bar style put the AI trigger —
  // same anchor point the original small popover used — rather than
  // sliding up as a full bottom sheet. Height is 85% of the app's own
  // viewport height, capped so it never runs past the safe-area top or
  // overlaps its own bottom anchor.
  const panelBottom = insets.bottom + PANEL_BOTTOM_CLEARANCE;
  const maxPanelHeight = screenHeight - insets.top - panelBottom;
  const panelHeight = Math.min(screenHeight * 0.85, maxPanelHeight);

  const styles = useThemedStyles(({ COLORS, RADIUS, SPACING }) => ({
    backdrop: {
      position: 'absolute' as const,
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.75)',
    },
    panel: {
      position: 'absolute' as const,
      left: SPACING.lg,
      right: SPACING.lg,
      bottom: panelBottom,
      height: panelHeight,
      borderRadius: RADIUS.xl,
      borderWidth: 1,
      borderColor: COLORS.glassBorder,
      overflow: 'hidden' as const,
    },
    tint: {
      ...StyleSheet.absoluteFill,
      backgroundColor: 'rgba(18,18,26,0.35)',
    },
  }));

  return (
    <AiOrbContext.Provider value={{ open, pressing, progress, handlePressIn, handlePressOut, closeTray, openTray }}>
      {children}

      {AI_ENABLED && isAuthenticated && (
        <>
          {/* Tray: same chat surface the old floating orb opened — anchored
              above the orb rather than a full bottom sheet, not draggable,
              and sized to actually fit widgets instead of a small popover.
              Backdrop dims (not hides) the current screen so the user still
              feels anchored to where they were. */}
          {open && (
            <>
              <TouchableOpacity
                style={styles.backdrop}
                activeOpacity={1}
                onPress={closeTray}
                accessibilityLabel="Close AI assistant"
              />
              <View style={styles.panel}>
                <BlurView intensity={55} tint="dark" style={StyleSheet.absoluteFill} />
                <View style={styles.tint} />
                <AiChatDropdown onClose={closeTray} fill />
              </View>
            </>
          )}

          <HandsFreeOverlay
            visible={handsFreeOpen}
            agentName={agentName}
            onClose={() => setHandsFreeOpen(false)}
            onOpenTextChat={() => { setHandsFreeOpen(false); setOpen(true); }}
          />
        </>
      )}
    </AiOrbContext.Provider>
  );
}
