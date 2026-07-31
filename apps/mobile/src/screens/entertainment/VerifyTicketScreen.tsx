import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS, TYPOGRAPHY, SPACING } from '../../theme';
import { fetchApi } from '../../utils/api';

type Result = { valid: boolean; alreadyUsed: boolean; holder: string; checkedInAt?: string } | null;

export default function VerifyTicketScreen({ navigation, route }: any) {
  const { eventId, eventTitle } = route.params;
  const [code, setCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<Result>(null);
  const [stats, setStats] = useState<{ sold: number; checkedIn: number } | null>(null);

  const loadStats = useCallback(async () => {
    try {
      const res = await fetchApi(`/entertainment/events/${eventId}/tickets/stats`);
      if (res.ok) setStats(await res.json());
    } catch {}
  }, [eventId]);

  useFocusEffect(useCallback(() => { loadStats(); }, [loadStats]));

  const verify = async () => {
    if (!code.trim()) return;
    setVerifying(true);
    setError('');
    setResult(null);
    try {
      const res = await fetchApi(`/entertainment/events/${eventId}/tickets/verify`, { method: 'POST', body: JSON.stringify({ code: code.trim() }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Ticket not found');
      setResult(data);
      setCode('');
      loadStats();
    } catch (e: any) {
      setError(e.message || 'Something went wrong');
    } finally {
      setVerifying(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{eventTitle || 'Verify Tickets'}</Text>
        <View style={{ width: 30 }} />
      </View>

      {stats && (
        <View style={styles.statsRow}>
          <Text style={styles.statsText}>{stats.checkedIn} / {stats.sold} checked in</Text>
        </View>
      )}

      <View style={styles.body}>
        <Ionicons name="scan-outline" size={48} color="#10B981" style={{ marginBottom: 16 }} />
        <Text style={styles.title}>Enter ticket code</Text>
        <Text style={styles.subtitle}>Ask the guest for the code printed under their ticket QR, then enter it here to check them in.</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. 2MGH6EV4"
          placeholderTextColor={COLORS.textMuted}
          value={code}
          onChangeText={t => setCode(t.toUpperCase())}
          autoCapitalize="characters"
          autoCorrect={false}
          onSubmitEditing={verify}
        />
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        <TouchableOpacity style={styles.verifyBtn} onPress={verify} disabled={verifying}>
          {verifying ? <ActivityIndicator color="#fff" /> : <Text style={styles.verifyBtnText}>Verify</Text>}
        </TouchableOpacity>

        {result && (
          <View style={[styles.resultCard, result.valid ? styles.resultValid : styles.resultInvalid]}>
            <Ionicons name={result.valid ? 'checkmark-circle' : 'close-circle'} size={32} color={result.valid ? '#22c55e' : '#ef4444'} />
            <Text style={styles.resultTitle}>{result.valid ? 'Checked In' : result.alreadyUsed ? 'Already Used' : 'Invalid Ticket'}</Text>
            <Text style={styles.resultSub}>@{result.holder}</Text>
            {result.alreadyUsed && result.checkedInAt && (
              <Text style={styles.resultMeta}>Checked in at {new Date(result.checkedInAt).toLocaleTimeString()}</Text>
            )}
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.lg, paddingVertical: 12 },
  back: { padding: 4 },
  headerTitle: { ...TYPOGRAPHY.h3, flex: 1, textAlign: 'center', fontWeight: '700' },
  statsRow: { alignItems: 'center', marginBottom: 8 },
  statsText: { color: COLORS.textMuted, fontSize: 12, fontWeight: '600' },
  body: { flex: 1, alignItems: 'center', padding: SPACING.lg, paddingTop: 20 },
  title: { ...TYPOGRAPHY.h3, marginBottom: 8, textAlign: 'center' },
  subtitle: { color: COLORS.textMuted, fontSize: 13, textAlign: 'center', marginBottom: 24, lineHeight: 19 },
  input: {
    width: '100%', backgroundColor: COLORS.surface, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border,
    padding: 16, color: COLORS.text, fontSize: 18, fontWeight: '700', letterSpacing: 2, textAlign: 'center', marginBottom: 16,
  },
  errorText: { color: '#ef4444', fontSize: 13, marginBottom: 12 },
  verifyBtn: { width: '100%', backgroundColor: '#10B981', borderRadius: 14, padding: 16, alignItems: 'center' },
  verifyBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  resultCard: { width: '100%', marginTop: 24, borderRadius: 16, padding: 20, alignItems: 'center', gap: 4, borderWidth: 1 },
  resultValid: { backgroundColor: '#22c55e15', borderColor: '#22c55e40' },
  resultInvalid: { backgroundColor: '#ef444415', borderColor: '#ef444440' },
  resultTitle: { ...TYPOGRAPHY.h3, marginTop: 6 },
  resultSub: { color: COLORS.textMuted, fontSize: 14, fontWeight: '600' },
  resultMeta: { color: COLORS.textMuted, fontSize: 12 },
});
