import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withSequence } from 'react-native-reanimated';
import { useTheme } from '../context/ThemeContext';
import { useThemedStyles } from '../theme/useThemedStyles';
import { fetchApi } from '../utils/api';

type PromptType = 'TRUTH' | 'DARE';

export default function TruthOrDareScreen({ navigation }: any) {
  const { theme } = useTheme();
  const { COLORS, TYPOGRAPHY, SPACING } = theme;
  const [category, setCategory] = useState<PromptType | null>(null);
  const [prompt, setPrompt] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const cardOpacity = useSharedValue(0);
  const cardScale = useSharedValue(0.92);

  const cardStyle = useAnimatedStyle(() => ({
    opacity: cardOpacity.value,
    transform: [{ scale: cardScale.value }],
  }));

  const draw = async (type: PromptType) => {
    setLoading(true);
    setCategory(type);
    try {
      const res = await fetchApi('/couples/prompt/draw', { method: 'POST', body: JSON.stringify({ type }) });
      if (!res.ok) {
        const d = await res.json().catch(() => null);
        throw new Error(d?.message || 'Could not draw a prompt');
      }
      const data = await res.json();
      setPrompt(data);
      cardOpacity.value = 0;
      cardScale.value = 0.92;
      cardOpacity.value = withTiming(1, { duration: 280 });
      cardScale.value = withSequence(withTiming(1.03, { duration: 180 }), withTiming(1, { duration: 120 }));
    } catch (e: any) {
      Alert.alert('Error', e.message);
      setCategory(null);
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
    body: { flex: 1, paddingHorizontal: SPACING.lg, alignItems: 'center' },
    intro: { color: COLORS.textMuted, fontSize: 14, textAlign: 'center', marginTop: SPACING.md, marginBottom: SPACING.xl, lineHeight: 20 },
    choiceRow: { flexDirection: 'row', gap: SPACING.md, width: '100%' },
    choiceBtn: {
      flex: 1, alignItems: 'center', gap: SPACING.sm, paddingVertical: SPACING.xl,
      borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.glassBorder, backgroundColor: COLORS.glass,
    },
    choiceBtnActive: { borderColor: '#8B5CF6', backgroundColor: 'rgba(139,92,246,0.14)' },
    choiceText: { color: COLORS.text, fontWeight: '800', fontSize: 16 },
    card: {
      width: '100%', marginTop: SPACING.xl, borderRadius: RADIUS.lg, padding: SPACING.xl,
      backgroundColor: COLORS.surfaceElevated, borderWidth: 1, borderColor: COLORS.glassBorder, minHeight: 180,
      justifyContent: 'center', alignItems: 'center',
    },
    cardBadge: { color: '#8B5CF6', fontWeight: '800', fontSize: 12, letterSpacing: 1, textTransform: 'uppercase', marginBottom: SPACING.md },
    cardText: { color: COLORS.text, fontSize: 20, fontWeight: '600', textAlign: 'center', lineHeight: 28 },
    downgradeNote: { color: COLORS.textMuted, fontSize: 11, marginTop: SPACING.md, textAlign: 'center' },
    drawAgainBtn: {
      marginTop: SPACING.lg, flexDirection: 'row', alignItems: 'center', gap: 6,
      backgroundColor: '#8B5CF6', borderRadius: RADIUS.pill, paddingVertical: 12, paddingHorizontal: SPACING.xl,
    },
    drawAgainText: { color: '#fff', fontWeight: '800', fontSize: 14 },
    switchBtn: { marginTop: SPACING.md, paddingVertical: 8 },
    switchText: { color: COLORS.textMuted, fontWeight: '600', fontSize: 13 },
  }));

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={TYPOGRAPHY.h2}>Truth or Dare</Text>
        <View style={{ width: 36 }} />
      </View>

      <View style={styles.body}>
        {!category && (
          <>
            <Text style={styles.intro}>Pick one, then take turns answering or acting it out together.</Text>
            <View style={styles.choiceRow}>
              <TouchableOpacity style={styles.choiceBtn} onPress={() => draw('TRUTH')}>
                <Ionicons name="chatbubble-ellipses" size={28} color="#8B5CF6" />
                <Text style={styles.choiceText}>Truth</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.choiceBtn} onPress={() => draw('DARE')}>
                <Ionicons name="flash" size={28} color="#F43F5E" />
                <Text style={styles.choiceText}>Dare</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {category && (
          <>
            <View style={styles.choiceRow}>
              <TouchableOpacity
                style={[styles.choiceBtn, category === 'TRUTH' && styles.choiceBtnActive]}
                onPress={() => draw('TRUTH')}
                disabled={loading}
              >
                <Ionicons name="chatbubble-ellipses" size={22} color="#8B5CF6" />
                <Text style={styles.choiceText}>Truth</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.choiceBtn, category === 'DARE' && styles.choiceBtnActive]}
                onPress={() => draw('DARE')}
                disabled={loading}
              >
                <Ionicons name="flash" size={22} color="#F43F5E" />
                <Text style={styles.choiceText}>Dare</Text>
              </TouchableOpacity>
            </View>

            {loading ? (
              <ActivityIndicator color={COLORS.primary} style={{ marginTop: SPACING.xl }} />
            ) : prompt ? (
              <Animated.View style={[styles.card, cardStyle]}>
                <Text style={styles.cardBadge}>{prompt.type === 'TRUTH' ? 'Truth' : 'Dare'} · {prompt.spiceLevel}</Text>
                <Text style={styles.cardText}>{prompt.text}</Text>
                {prompt.downgraded && (
                  <Text style={styles.downgradeNote}>Spicy isn't unlocked yet, so this was drawn from Flirty.</Text>
                )}
              </Animated.View>
            ) : null}

            {!loading && prompt && (
              <TouchableOpacity style={styles.drawAgainBtn} onPress={() => draw(category)}>
                <Ionicons name="refresh" size={16} color="#fff" />
                <Text style={styles.drawAgainText}>Draw Again</Text>
              </TouchableOpacity>
            )}
          </>
        )}
      </View>
    </SafeAreaView>
  );
}
