import React, { useEffect, useRef, useState } from 'react';
import { View, Pressable, Text, Animated, Easing, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
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

// Screens with their own send/hangup button pinned to this same corner —
// the orb sitting on top of it made those buttons hard to hit (found while
// redesigning ChatScreen). Real messaging apps don't have a floating
// assistant button competing with the send button either.
const ROUTES_WITHOUT_ORB = ['ChatRoom', 'CallScreen'];

export default function AiFloatingOrb() {
  const { isAuthenticated } = useAuth();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const [voiceActive, setVoiceActive] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [hiddenForRoute, setHiddenForRoute] = useState(false);
  const [handsFreeMode, setHandsFreeMode] = useState(false);
  const [agentName, setAgentName] = useState('AI');
  const [handsFreeOpen, setHandsFreeOpen] = useState(false);

  const dropdownRef = useRef<AiChatDropdownHandle>(null);
  const longPressFired = useRef(false);
  const progress = useRef(new Animated.Value(0)).current;
  const tickTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const voice = useVoiceCapture();

  const { theme } = useTheme();
  const { GRADIENTS } = theme;

  const styles = useThemedStyles(({ COLORS, RADIUS, SHADOW }) => ({
    root: {
      position: 'absolute',
      right: 16,
      alignItems: 'flex-end',
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
      marginBottom: 12,
    },
    voicePill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: COLORS.surfaceElevated,
      borderWidth: 1,
      borderColor: COLORS.glassBorder,
      borderRadius: RADIUS.pill,
      paddingHorizontal: 12,
      paddingVertical: 7,
      marginBottom: 10,
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

  const handlePressIn = () => {
    longPressFired.current = false;
    resetProgress();
    Animated.timing(progress, {
      toValue: 1,
      duration: HOLD_MS,
      easing: Easing.linear,
      useNativeDriver: false,
    }).start();
  };

  const handleLongPress = async () => {
    longPressFired.current = true;
    setVoiceActive(true);
    setElapsedSec(0);
    tickTimer.current = setInterval(() => setElapsedSec(s => s + 1), 1000);
    await voice.start();
  };

  const handlePressOut = async () => {
    resetProgress();

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

  const ringScale = progress.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1.12] });
  const bottomOffset = insets.bottom + 76;

  return (
    <View style={[styles.root, { bottom: bottomOffset }]} pointerEvents="box-none">
      <HandsFreeOverlay
        visible={handsFreeOpen}
        agentName={agentName}
        onClose={() => setHandsFreeOpen(false)}
        onOpenTextChat={() => { setHandsFreeOpen(false); setOpen(true); }}
      />

      {open && (
        <View style={[styles.dropdownWrap, { width: Math.min(340, Dimensions.get('window').width - 32) }]}>
          <AiChatDropdown ref={dropdownRef} onClose={() => setOpen(false)} />
        </View>
      )}

      {voiceActive && (
        <View style={styles.voicePill}>
          <View style={styles.voiceDot} />
          <Text style={styles.voiceText}>
            {voice.canTranscribe && voice.interimText ? voice.interimText : `Listening… ${elapsedSec}s`}
          </Text>
        </View>
      )}

      <Pressable
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onLongPress={handleLongPress}
        delayLongPress={HOLD_MS}
        style={styles.orbTouchable}
        accessibilityLabel="AI assistant — tap to chat, hold to speak"
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
      </Pressable>
    </View>
  );
}
