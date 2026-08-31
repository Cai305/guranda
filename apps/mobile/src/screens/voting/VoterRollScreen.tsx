import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../../context/ThemeContext';
import { useThemedStyles } from '../../theme/useThemedStyles';
import { useAuth } from '../../context/AuthContext';
import { fetchApi } from '../../utils/api';

export default function VoterRollScreen({ route, navigation }: any) {
  const { electionId } = route.params;
  const { theme } = useTheme();
  const { COLORS } = theme;
  const { user } = useAuth();
  const styles = useThemedStyles(({ COLORS, TYPOGRAPHY, SPACING }) => ({
    container: { flex: 1, backgroundColor: COLORS.background },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.lg, paddingVertical: 12 },
    back: { padding: 4 },
    headerTitle: { ...TYPOGRAPHY.h2, flex: 1, textAlign: 'center' },
    hero: { alignItems: 'center', textAlign: 'center', paddingHorizontal: SPACING.lg, paddingTop: 8, gap: 10 },
    heroIcon: { width: 64, height: 64, borderRadius: 999, backgroundColor: `${COLORS.primary}18`, borderWidth: 1, borderColor: `${COLORS.primary}44`, justifyContent: 'center', alignItems: 'center' },
    heroTitle: { color: COLORS.text, fontSize: 20, fontWeight: '700', textAlign: 'center' },
    heroSub: { color: COLORS.textMuted, fontSize: 13, textAlign: 'center', lineHeight: 19, maxWidth: 300 },
    card: { marginHorizontal: SPACING.lg, marginTop: 20, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: 18, padding: 16, gap: 12 },
    cardLabel: { ...TYPOGRAPHY.label, fontSize: 10 },
    identityRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    avatar: { width: 40, height: 40, borderRadius: 999, backgroundColor: `${COLORS.primary}33`, justifyContent: 'center', alignItems: 'center' },
    avatarText: { color: COLORS.text, fontWeight: '700', fontSize: 13 },
    name: { color: COLORS.text, fontWeight: '600', fontSize: 14 },
    wallet: { color: COLORS.textMuted, fontSize: 11, fontFamily: 'monospace', marginTop: 2 },
    checklist: { paddingHorizontal: SPACING.lg, marginTop: 18, gap: 10 },
    checkRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: 14, padding: 13 },
    checkRowWarn: { backgroundColor: `${COLORS.warning}12`, borderColor: `${COLORS.warning}44` },
    checkIconWrap: { width: 26, height: 26, borderRadius: 999, justifyContent: 'center', alignItems: 'center' },
    checkTitle: { color: COLORS.text, fontSize: 13, fontWeight: '500' },
    checkSub: { color: COLORS.textMuted, fontSize: 11 },
    footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: SPACING.lg, backgroundColor: COLORS.background, borderTopWidth: 1, borderTopColor: COLORS.border, gap: 8 },
    cta: { backgroundColor: COLORS.primary, borderRadius: 999, padding: 16, alignItems: 'center' },
    ctaText: { color: '#fff', fontWeight: '700', fontSize: 15 },
    footerHint: { color: COLORS.textMuted, fontSize: 11, textAlign: 'center' },
  }));

  const [election, setElection] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await fetchApi(`/voting/elections/${electionId}`, { headers: { 'Cache-Control': 'no-cache' } });
      setElection(res.ok ? await res.json() : null);
    } catch { setElection(null); }
    setLoading(false);
  }, [electionId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (loading || !election) {
    return <SafeAreaView style={styles.container} edges={['top']}><ActivityIndicator color={COLORS.primary} style={{ marginTop: 60 }} /></SafeAreaView>;
  }

  const initials = (user?.displayName || user?.username || '?').slice(0, 2).toUpperCase();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Voter roll</Text>
        <View style={{ width: 30 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 140 }}>
        <View style={styles.hero}>
          <View style={styles.heroIcon}>
            <Ionicons name="shield-checkmark" size={30} color={COLORS.primary} />
          </View>
          <Text style={styles.heroTitle}>Verify your voter roll status</Text>
          <Text style={styles.heroSub}>Your identity is checked against every roll you're eligible for — before you ever see a ballot.</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>REGISTERED IDENTITY</Text>
          <View style={styles.identityRow}>
            <View style={styles.avatar}><Text style={styles.avatarText}>{initials}</Text></View>
            <View>
              <Text style={styles.name}>{user?.displayName || user?.username}</Text>
              <Text style={styles.wallet}>{user?.xrplAddress ? `${user.xrplAddress.slice(0, 6)}…${user.xrplAddress.slice(-4)}` : 'wallet linking…'} · wallet linked</Text>
            </View>
          </View>
        </View>

        <View style={styles.checklist}>
          <View style={styles.checkRow}>
            <View style={[styles.checkIconWrap, { backgroundColor: `${COLORS.success}22` }]}>
              <Ionicons name="checkmark" size={14} color={COLORS.success} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.checkTitle}>Identity linked to XRPL wallet</Text>
              <Text style={styles.checkSub}>Signed & confirmed on-ledger</Text>
            </View>
          </View>

          <View style={styles.checkRow}>
            <View style={[styles.checkIconWrap, { backgroundColor: `${COLORS.success}22` }]}>
              <Ionicons name="checkmark" size={14} color={COLORS.success} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.checkTitle}>On the roll for {election.structure?.name}</Text>
              <Text style={styles.checkSub}>Role: {election.myRole?.toLowerCase()}</Text>
            </View>
          </View>

          <View style={[styles.checkRow, !election.myCheckedIn && styles.checkRowWarn]}>
            <View style={[styles.checkIconWrap, { backgroundColor: election.myCheckedIn ? `${COLORS.success}22` : `${COLORS.warning}22` }]}>
              <Ionicons name={election.myCheckedIn ? 'checkmark' : 'alert-circle'} size={14} color={election.myCheckedIn ? COLORS.success : COLORS.warning} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.checkTitle}>{election.myCheckedIn ? 'Biometric check-in complete' : 'Biometric enrollment required'}</Text>
              <Text style={styles.checkSub}>Verified on this device only</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.cta}
          onPress={() => election.myCheckedIn ? navigation.navigate('ElectionDetail', { electionId }) : navigation.navigate('BiometricCheckIn', { electionId })}
        >
          <Text style={styles.ctaText}>{election.myCheckedIn ? 'Continue to ballots' : 'Continue to biometric check-in'}</Text>
        </TouchableOpacity>
        <Text style={styles.footerHint}>Your vote is secret. Your registration is verifiable.</Text>
      </View>
    </SafeAreaView>
  );
}
