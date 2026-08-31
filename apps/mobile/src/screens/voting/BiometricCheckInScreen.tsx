import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useThemedStyles } from '../../theme/useThemedStyles';
import { fetchApi } from '../../utils/api';
import { useBiometricGate } from '../../hooks/useBiometricGate';

type Phase = 'idle' | 'checking' | 'error';

export default function BiometricCheckInScreen({ route, navigation }: any) {
  const { electionId } = route.params;
  const { theme } = useTheme();
  const { COLORS } = theme;
  const runBiometricGate = useBiometricGate();
  const styles = useThemedStyles(({ COLORS, TYPOGRAPHY, SPACING }) => ({
    container: { flex: 1, backgroundColor: COLORS.background },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.lg, paddingVertical: 12 },
    back: { padding: 4 },
    headerTitle: { ...TYPOGRAPHY.h2, flex: 1, textAlign: 'center' },
    body: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: SPACING.lg, gap: 24 },
    sub: { color: COLORS.textMuted, fontSize: 13, textAlign: 'center', maxWidth: 280, lineHeight: 19 },
    ringOuter: { width: 168, height: 168, borderRadius: 999, borderWidth: 1.5, borderColor: `${COLORS.primary}30`, justifyContent: 'center', alignItems: 'center' },
    ringMid: { width: 138, height: 138, borderRadius: 999, borderWidth: 1.5, borderColor: `${COLORS.primary}55`, justifyContent: 'center', alignItems: 'center' },
    ringInner: { width: 108, height: 108, borderRadius: 999, backgroundColor: `${COLORS.primary}22`, borderWidth: 1.5, borderColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },
    ringInnerError: { borderColor: COLORS.error, backgroundColor: `${COLORS.error}18` },
    ringInnerSuccess: { borderColor: COLORS.success, backgroundColor: `${COLORS.success}18` },
    title: { color: COLORS.text, fontSize: 15, fontWeight: '500' },
    errorText: { color: COLORS.error, fontSize: 13, textAlign: 'center' },
    footer: { padding: SPACING.lg, alignItems: 'center' },
    footerHint: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    footerHintText: { color: COLORS.success, fontSize: 13, fontWeight: '600' },
  }));

  const [phase, setPhase] = useState<Phase>('idle');
  const [error, setError] = useState('');

  const verify = async () => {
    setPhase('checking');
    setError('');
    const bio = await runBiometricGate();
    if (!bio.ok) {
      setPhase('error');
      setError(bio.reason || 'Verification failed');
      return;
    }
    try {
      const res = await fetchApi(`/voting/elections/${electionId}/checkin`, {
        method: 'POST',
        body: JSON.stringify({ method: bio.method }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Check-in failed');
      }
      navigation.replace('ElectionDetail', { electionId });
    } catch (e: any) {
      setPhase('error');
      setError(e.message || 'Something went wrong');
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Biometric check-in</Text>
        <View style={{ width: 30 }} />
      </View>

      <View style={styles.body}>
        <Text style={styles.sub}>Verified locally on your device. Ballot never stores or transmits your biometric data.</Text>

        <TouchableOpacity style={styles.ringOuter} onPress={verify} disabled={phase === 'checking'} activeOpacity={0.8}>
          <View style={styles.ringMid}>
            <View style={[styles.ringInner, phase === 'error' && styles.ringInnerError]}>
              {phase === 'checking' ? (
                <ActivityIndicator color={COLORS.primary} />
              ) : (
                <Ionicons name="finger-print" size={44} color={phase === 'error' ? COLORS.error : COLORS.text} />
              )}
            </View>
          </View>
        </TouchableOpacity>

        <Text style={styles.title}>
          {phase === 'checking' ? 'Verifying…' : phase === 'error' ? 'Tap to try again' : 'Touch the sensor to verify'}
        </Text>
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
      </View>

      <View style={styles.footer}>
        <View style={styles.footerHint}>
          <Ionicons name="checkmark-circle" size={16} color={COLORS.success} />
          <Text style={styles.footerHintText}>Required again before every ballot is submitted</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}
