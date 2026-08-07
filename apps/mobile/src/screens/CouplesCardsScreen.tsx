import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, interpolate, runOnJS } from 'react-native-reanimated';
import { useTheme } from '../context/ThemeContext';
import { useThemedStyles } from '../theme/useThemedStyles';
import { fetchApi } from '../utils/api';

export default function CouplesCardsScreen({ navigation }: any) {
  const { theme } = useTheme();
  const { COLORS, TYPOGRAPHY, SPACING } = theme;
  const [prompt, setPrompt] = useState<any>(null);
  const [pending, setPending] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [drawCount, setDrawCount] = useState(0);
  const flip = useSharedValue(0);

  const frontStyle = useAnimatedStyle(() => ({
    transform: [{ rotateY: `${interpolate(flip.value, [0, 1], [0, 180])}deg` }],
    opacity: flip.value < 0.5 ? 1 : 0,
  }));
  const backStyle = useAnimatedStyle(() => ({
    transform: [{ rotateY: `${interpolate(flip.value, [0, 1], [180, 360])}deg` }],
    opacity: flip.value >= 0.5 ? 1 : 0,
  }));

  const applyPending = () => {
    setPrompt(pending);
    setPending(null);
  };

  const draw = async () => {
    setLoading(true);
    try {
      const res = await fetchApi('/couples/prompt/draw', { method: 'POST', body: JSON.stringify({ type: 'CARD' }) });
      if (!res.ok) {
        const d = await res.json().catch(() => null);
        throw new Error(d?.message || 'Could not draw a card');
      }
      const data = await res.json();
      setPending(data);
      setDrawCount((c) => c + 1);
      flip.value = 0;
      flip.value = withTiming(1, { duration: 420 }, (finished) => {
        if (finished) runOnJS(applyPending)();
      });
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  const styles = useThemedStyles(({ COLORS, RADIUS, SPACING }) => ({
    root: { flex: 1, backgroundColor: COLORS.background },
    header: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md,
    },
    backBtn: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
    body: { flex: 1, paddingHorizontal: SPACING.lg, alignItems: 'center', justifyContent: 'center' },
    intro: { color: COLORS.textMuted, fontSize: 14, textAlign: 'center', marginBottom: SPACING.xl, lineHeight: 20 },
    deckCount: { color: COLORS.textMuted, fontSize: 12, marginBottom: SPACING.md },
    cardWrap: { width: '100%', minHeight: 220 },
    card: {
      position: 'absolute', width: '100%', minHeight: 220, borderRadius: RADIUS.lg, padding: SPACING.xl,
      backgroundColor: COLORS.surfaceElevated, borderWidth: 1, borderColor: COLORS.glassBorder,
      justifyContent: 'center', alignItems: 'center', backfaceVisibility: 'hidden',
    },
    cardBack: { backgroundColor: 'rgba(244,114,182,0.10)', borderColor: 'rgba(244,114,182,0.35)' },
    cardBadge: { color: '#F472B6', fontWeight: '800', fontSize: 12, letterSpacing: 1, textTransform: 'uppercase', marginBottom: SPACING.md },
    cardText: { color: COLORS.text, fontSize: 19, fontWeight: '600', textAlign: 'center', lineHeight: 27 },
    downgradeNote: { color: COLORS.textMuted, fontSize: 11, marginTop: SPACING.md, textAlign: 'center' },
    drawBtn: {
      marginTop: SPACING.xl, flexDirection: 'row', alignItems: 'center', gap: 8,
      backgroundColor: '#F472B6', borderRadius: RADIUS.pill, paddingVertical: 14, paddingHorizontal: SPACING.xxl,
    },
    drawBtnDisabled: { opacity: 0.6 },
    drawBtnText: { color: '#07070C', fontWeight: '800', fontSize: 15 },
  }));

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={TYPOGRAPHY.h2}>Couples Cards</Text>
        <View style={{ width: 36 }} />
      </View>

      <View style={styles.body}>
        {!prompt && <Text style={styles.intro}>Draw a card together — a question or moment to share, one at a time.</Text>}
        {drawCount > 0 && <Text style={styles.deckCount}>Card {drawCount}</Text>}

        {prompt ? (
          <View style={styles.cardWrap}>
            <Animated.View style={[styles.card, frontStyle]}>
              <Ionicons name="albums" size={28} color="#F472B6" style={{ marginBottom: SPACING.sm }} />
            </Animated.View>
            <Animated.View style={[styles.card, styles.cardBack, backStyle]}>
              <Text style={styles.cardBadge}>{prompt.spiceLevel}</Text>
              <Text style={styles.cardText}>{prompt.text}</Text>
              {prompt.downgraded && (
                <Text style={styles.downgradeNote}>Spicy isn't unlocked yet, so this was drawn from Flirty.</Text>
              )}
            </Animated.View>
          </View>
        ) : (
          <View style={styles.cardWrap}>
            <View style={[styles.card, styles.cardBack]}>
              <Ionicons name="albums" size={32} color="#F472B6" />
            </View>
          </View>
        )}

        <TouchableOpacity style={[styles.drawBtn, loading && styles.drawBtnDisabled]} onPress={draw} disabled={loading}>
          {loading ? <ActivityIndicator color="#07070C" /> : <Ionicons name="sparkles" size={18} color="#07070C" />}
          <Text style={styles.drawBtnText}>{prompt ? 'Draw Next Card' : 'Draw a Card'}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
