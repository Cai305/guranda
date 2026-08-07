import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, Easing, runOnJS } from 'react-native-reanimated';
import { useTheme } from '../context/ThemeContext';
import { useThemedStyles } from '../theme/useThemedStyles';
import { fetchApi } from '../utils/api';

export default function SpinTheBottleScreen({ navigation }: any) {
  const { theme } = useTheme();
  const { COLORS, TYPOGRAPHY } = theme;
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<any>(null);
  const rotation = useSharedValue(0);
  const cardOpacity = useSharedValue(0);

  const bottleStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));
  const cardStyle = useAnimatedStyle(() => ({ opacity: cardOpacity.value }));

  const reveal = async () => {
    try {
      const res = await fetchApi('/couples/spin-bottle', { method: 'POST' });
      if (!res.ok) {
        const d = await res.json().catch(() => null);
        throw new Error(d?.message || 'Could not spin the bottle');
      }
      setResult(await res.json());
      cardOpacity.value = withTiming(1, { duration: 300 });
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setSpinning(false);
    }
  };

  const spin = () => {
    if (spinning) return;
    setSpinning(true);
    setResult(null);
    cardOpacity.value = 0;
    const extraTurns = 4 + Math.floor(Math.random() * 3);
    const finalAngle = rotation.value + extraTurns * 360 + Math.floor(Math.random() * 360);
    rotation.value = withTiming(
      finalAngle,
      { duration: 1800, easing: Easing.out(Easing.cubic) },
      (finished) => {
        if (finished) runOnJS(reveal)();
      },
    );
  };

  const styles = useThemedStyles(({ COLORS, RADIUS, SPACING }) => ({
    root: { flex: 1, backgroundColor: COLORS.background },
    header: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md,
    },
    backBtn: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
    body: { flex: 1, paddingHorizontal: SPACING.lg, alignItems: 'center', justifyContent: 'center' },
    intro: { color: COLORS.textMuted, fontSize: 14, textAlign: 'center', marginBottom: SPACING.xxl, lineHeight: 20 },
    dial: {
      width: 220, height: 220, borderRadius: 110, borderWidth: 2, borderColor: COLORS.glassBorder,
      backgroundColor: COLORS.glass, justifyContent: 'center', alignItems: 'center', marginBottom: SPACING.xl,
    },
    spinBtn: {
      flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#22D3EE',
      borderRadius: RADIUS.pill, paddingVertical: 14, paddingHorizontal: SPACING.xxl,
    },
    spinBtnDisabled: { opacity: 0.6 },
    spinBtnText: { color: '#07070C', fontWeight: '800', fontSize: 15 },
    card: {
      width: '100%', marginTop: SPACING.xl, borderRadius: RADIUS.lg, padding: SPACING.xl,
      backgroundColor: COLORS.surfaceElevated, borderWidth: 1, borderColor: COLORS.glassBorder,
      alignItems: 'center',
    },
    cardBadge: { color: '#22D3EE', fontWeight: '800', fontSize: 12, letterSpacing: 1, textTransform: 'uppercase', marginBottom: SPACING.md },
    cardText: { color: COLORS.text, fontSize: 20, fontWeight: '600', textAlign: 'center', lineHeight: 28 },
    downgradeNote: { color: COLORS.textMuted, fontSize: 11, marginTop: SPACING.md, textAlign: 'center' },
  }));

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={TYPOGRAPHY.h2}>Spin the Bottle</Text>
        <View style={{ width: 36 }} />
      </View>

      <View style={styles.body}>
        {!result && <Text style={styles.intro}>Spin to see if you'll answer a Truth or take on a Dare.</Text>}

        <View style={styles.dial}>
          <Animated.View style={bottleStyle}>
            <Ionicons name="navigate" size={90} color="#22D3EE" />
          </Animated.View>
        </View>

        <TouchableOpacity
          style={[styles.spinBtn, spinning && styles.spinBtnDisabled]}
          onPress={spin}
          disabled={spinning}
        >
          {spinning ? <ActivityIndicator color="#07070C" /> : <Ionicons name="sync" size={18} color="#07070C" />}
          <Text style={styles.spinBtnText}>{spinning ? 'Spinning…' : result ? 'Spin Again' : 'Spin'}</Text>
        </TouchableOpacity>

        {result && (
          <Animated.View style={[styles.card, cardStyle]}>
            <Text style={styles.cardBadge}>{result.category === 'TRUTH' ? 'Truth' : 'Dare'} · {result.prompt.spiceLevel}</Text>
            <Text style={styles.cardText}>{result.prompt.text}</Text>
            {result.prompt.downgraded && (
              <Text style={styles.downgradeNote}>Spicy isn't unlocked yet, so this was drawn from Flirty.</Text>
            )}
          </Animated.View>
        )}
      </View>
    </SafeAreaView>
  );
}
