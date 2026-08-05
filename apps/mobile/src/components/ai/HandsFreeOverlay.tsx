import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Modal, View, Text, TouchableOpacity, Animated, Easing } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Speech from 'expo-speech';
import { useTheme } from '../../context/ThemeContext';
import { useThemedStyles } from '../../theme/useThemedStyles';
import { fetchApi } from '../../utils/api';
import { useVoiceCapture } from '../../hooks/useVoiceCapture';

type Phase = 'listening' | 'thinking' | 'speaking' | 'idle';

const SILENCE_MS = 1600;

interface Props {
  visible: boolean;
  agentName: string;
  onClose: () => void;
  onOpenTextChat: () => void;
}

// Continuous talk-to-AI loop: listen -> (silence) -> send -> speak reply ->
// listen again, until the user ends the session. Distinct from
// AiFloatingOrb's existing hold-to-talk (one utterance, text reply in the
// dropdown) — this is the persistent "hands-free mode" from AI settings.
export default function HandsFreeOverlay({ visible, agentName, onClose, onOpenTextChat }: Props) {
  const { theme } = useTheme();
  const { COLORS, GRADIENTS } = theme;
  const [phase, setPhase] = useState<Phase>('idle');
  const [lastUserText, setLastUserText] = useState('');
  const [lastReply, setLastReply] = useState('');
  const [error, setError] = useState<string | null>(null);

  const voice = useVoiceCapture();
  const conversation = useRef<any[]>([]);
  const silenceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSeenInterim = useRef('');
  const sessionActive = useRef(false);
  const pulse = useRef(new Animated.Value(1)).current;

  const clearSilenceTimer = () => {
    if (silenceTimer.current) {
      clearTimeout(silenceTimer.current);
      silenceTimer.current = null;
    }
  };

  const beginListening = useCallback(async () => {
    if (!sessionActive.current) return;
    setError(null);
    lastSeenInterim.current = '';
    setPhase('listening');
    await voice.start();
    // Fires once even if the user never speaks, so a session can't hang forever.
    clearSilenceTimer();
    silenceTimer.current = setTimeout(handleSilence, SILENCE_MS * 3);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSilence = useCallback(async () => {
    if (!sessionActive.current) return;
    clearSilenceTimer();
    const { text } = await voice.stop();
    if (!sessionActive.current) return;

    if (!text) {
      // Nothing understood — just keep listening rather than ending the session.
      beginListening();
      return;
    }

    setLastUserText(text);
    setPhase('thinking');
    conversation.current = [...conversation.current, { role: 'user', content: text }];

    try {
      const res = await fetchApi('/ai/chat', { method: 'POST', body: JSON.stringify({ messages: conversation.current }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'AI request failed');
      conversation.current = data.conversation || conversation.current;
      const reply = data.reply || "I didn't catch that — try again?";
      setLastReply(reply);
      if (!sessionActive.current) return;

      setPhase('speaking');
      Speech.speak(reply, {
        onDone: () => { if (sessionActive.current) beginListening(); },
        onError: () => { if (sessionActive.current) beginListening(); },
        onStopped: () => {},
      });
    } catch (e: any) {
      setError(e.message || 'Something went wrong. Please try again.');
      if (sessionActive.current) beginListening();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [beginListening]);

  // Reset the silence timer every time new speech comes in.
  useEffect(() => {
    if (phase !== 'listening' || !voice.interimText) return;
    if (voice.interimText === lastSeenInterim.current) return;
    lastSeenInterim.current = voice.interimText;
    clearSilenceTimer();
    silenceTimer.current = setTimeout(handleSilence, SILENCE_MS);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voice.interimText, phase]);

  useEffect(() => {
    if (!visible) return;
    sessionActive.current = true;
    conversation.current = [];
    setLastUserText('');
    setLastReply('');
    setError(null);
    beginListening();
    return () => {
      sessionActive.current = false;
      clearSilenceTimer();
      Speech.stop();
      voice.stop().catch(() => {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  useEffect(() => {
    if (phase === 'listening' || phase === 'speaking') {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, { toValue: 1.15, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(pulse, { toValue: 1, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        ]),
      );
      loop.start();
      return () => loop.stop();
    }
    pulse.setValue(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const endSession = () => {
    sessionActive.current = false;
    clearSilenceTimer();
    Speech.stop();
    voice.stop().catch(() => {});
    setPhase('idle');
    onClose();
  };

  const phaseLabel = {
    idle: 'Tap to start',
    listening: voice.interimText || 'Listening…',
    thinking: `${agentName} is thinking…`,
    speaking: lastReply,
  }[phase];

  const styles = useThemedStyles(({ COLORS, RADIUS, SPACING }) => ({
    root: { flex: 1, backgroundColor: COLORS.background },
    header: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md,
    },
    headerTitle: { color: COLORS.text, fontWeight: '800', fontSize: 14 },
    iconBtn: {
      width: 36, height: 36, borderRadius: RADIUS.pill,
      backgroundColor: COLORS.glass, borderWidth: 1, borderColor: COLORS.glassBorder,
      justifyContent: 'center', alignItems: 'center',
    },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: SPACING.xl, gap: SPACING.lg },
    orb: {
      width: 120, height: 120, borderRadius: 60,
      justifyContent: 'center', alignItems: 'center',
    },
    phaseText: { color: COLORS.text, fontSize: 16, fontWeight: '600', textAlign: 'center', lineHeight: 22 },
    youSaid: { color: COLORS.textMuted, fontSize: 12.5, textAlign: 'center' },
    errorText: { color: COLORS.error, fontSize: 12, textAlign: 'center' },
    endBtn: {
      margin: SPACING.lg, marginBottom: SPACING.xl,
      backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.glassBorder,
      borderRadius: RADIUS.pill, paddingVertical: 14, alignItems: 'center',
    },
    endBtnText: { color: COLORS.text, fontWeight: '700', fontSize: 14 },
  }));

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={endSession}>
      <SafeAreaView style={styles.root}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.iconBtn} onPress={onOpenTextChat} accessibilityLabel="Switch to text chat">
            <Ionicons name="chatbubble-outline" size={18} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{agentName} · Hands-free</Text>
          <TouchableOpacity style={styles.iconBtn} onPress={endSession} accessibilityLabel="End session">
            <Ionicons name="close" size={20} color={COLORS.text} />
          </TouchableOpacity>
        </View>

        <View style={styles.center}>
          <Animated.View style={{ transform: [{ scale: pulse }] }}>
            <LinearGradient
              colors={phase === 'thinking' ? ['#6B7280', '#4B5563'] : GRADIENTS.primary}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.orb}
            >
              <Ionicons
                name={phase === 'speaking' ? 'volume-high' : phase === 'thinking' ? 'ellipsis-horizontal' : 'mic'}
                size={40}
                color="#FFF"
              />
            </LinearGradient>
          </Animated.View>

          <Text style={styles.phaseText} numberOfLines={4}>{phaseLabel}</Text>
          {!!lastUserText && phase !== 'listening' && (
            <Text style={styles.youSaid} numberOfLines={2}>You said: "{lastUserText}"</Text>
          )}
          {!!error && <Text style={styles.errorText}>{error}</Text>}
          {!voice.canTranscribe && (
            <Text style={styles.errorText}>Voice transcription isn't available on this device/browser.</Text>
          )}
        </View>

        <TouchableOpacity style={styles.endBtn} onPress={endSession}>
          <Text style={styles.endBtnText}>End session</Text>
        </TouchableOpacity>
      </SafeAreaView>
    </Modal>
  );
}
