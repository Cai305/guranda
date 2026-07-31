import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, TYPOGRAPHY, SPACING } from '../../theme';
import { fetchApi } from '../../utils/api';

export default function JoinEventTeamScreen({ navigation }: any) {
  const [code, setCode] = useState('');
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<{ role: string; event: any } | null>(null);

  const redeem = async () => {
    if (!code.trim()) return;
    setJoining(true);
    setError('');
    try {
      const res = await fetchApi('/entertainment/events/invite/redeem', { method: 'POST', body: JSON.stringify({ code: code.trim() }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Invalid invite code');
      setResult(data);
    } catch (e: any) {
      setError(e.message || 'Something went wrong');
    } finally {
      setJoining(false);
    }
  };

  if (result) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.successWrap}>
          <View style={styles.successIcon}><Ionicons name="checkmark" size={40} color="#fff" /></View>
          <Text style={styles.successTitle}>You're in!</Text>
          <Text style={styles.successSub}>
            You joined "{result.event.title}" as {result.role === 'CO_MANAGER' ? 'a co-manager' : 'a scanner'}
          </Text>
          <TouchableOpacity
            style={styles.successBtn}
            onPress={() => navigation.replace(result.role === 'CO_MANAGER' ? 'ManageEvent' : 'VerifyTicket', { eventId: result.event.id, eventTitle: result.event.title })}
          >
            <Text style={styles.successBtnText}>{result.role === 'CO_MANAGER' ? 'Manage Event' : 'Start Scanning'}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('MyEvents')}>
            <Text style={styles.successLink}>Back to My Events</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Join Event Team</Text>
        <View style={{ width: 30 }} />
      </View>

      <View style={styles.body}>
        <Ionicons name="key" size={48} color="#10B981" style={{ marginBottom: 16 }} />
        <Text style={styles.title}>Enter your invite code</Text>
        <Text style={styles.subtitle}>An event organizer shared a co-manager or scanner invite code with you. Enter it below to join their team.</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. RMMVH8MUYQ"
          placeholderTextColor={COLORS.textMuted}
          value={code}
          onChangeText={t => setCode(t.toUpperCase())}
          autoCapitalize="characters"
          autoCorrect={false}
        />
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        <TouchableOpacity style={styles.joinBtn} onPress={redeem} disabled={joining}>
          {joining ? <ActivityIndicator color="#fff" /> : <Text style={styles.joinBtnText}>Join Team</Text>}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.lg, paddingVertical: 12 },
  back: { padding: 4 },
  headerTitle: { ...TYPOGRAPHY.h2, flex: 1, textAlign: 'center' },
  body: { flex: 1, alignItems: 'center', padding: SPACING.lg, paddingTop: 40 },
  title: { ...TYPOGRAPHY.h3, marginBottom: 8, textAlign: 'center' },
  subtitle: { color: COLORS.textMuted, fontSize: 13, textAlign: 'center', marginBottom: 24, lineHeight: 19 },
  input: {
    width: '100%', backgroundColor: COLORS.surface, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border,
    padding: 16, color: COLORS.text, fontSize: 18, fontWeight: '700', letterSpacing: 2, textAlign: 'center', marginBottom: 16,
  },
  errorText: { color: '#ef4444', fontSize: 13, marginBottom: 12 },
  joinBtn: { width: '100%', backgroundColor: '#10B981', borderRadius: 14, padding: 16, alignItems: 'center' },
  joinBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  successWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: SPACING.lg, gap: 12 },
  successIcon: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#22c55e', justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  successTitle: { ...TYPOGRAPHY.h2 },
  successSub: { color: COLORS.textMuted, fontSize: 14, marginBottom: 16, textAlign: 'center' },
  successBtn: { backgroundColor: '#10B981', borderRadius: 14, paddingVertical: 14, paddingHorizontal: 32 },
  successBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  successLink: { color: COLORS.textMuted, fontSize: 13, marginTop: 12 },
});
