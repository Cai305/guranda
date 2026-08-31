import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../context/ThemeContext';
import { useThemedStyles } from '../../../theme/useThemedStyles';
import { fetchApi } from '../../../utils/api';
import { formatCurrency } from '../../../utils/format';

export default function MyFreelanceWorkScreen({ navigation }: any) {
  const { theme } = useTheme();
  const { COLORS, SPACING } = theme;
  const STATUS_COLOR: Record<string, string> = {
    OPEN: COLORS.textMuted,
    IN_PROGRESS: '#0EA5E9',
    SUBMITTED: '#f59e0b',
    COMPLETED: '#22c55e',
    CANCELLED: '#ef4444',
    PENDING: COLORS.textMuted,
    ACCEPTED: '#22c55e',
    REJECTED: '#ef4444',
  };
  const [assignedGigs, setAssignedGigs] = useState<any[]>([]);
  const [proposals, setProposals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const styles = useThemedStyles(({ COLORS, TYPOGRAPHY, SPACING }) => ({
    container: { flex: 1, backgroundColor: COLORS.background },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.lg, paddingVertical: 12 },
    back: { padding: 4 },
    headerTitle: { ...TYPOGRAPHY.h2, flex: 1, textAlign: 'center' },
    sectionLabel: { ...TYPOGRAPHY.label, fontSize: 11, marginBottom: 10 },
    hint: { color: COLORS.textMuted, fontSize: 13, marginBottom: 12 },
    card: {
      flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, borderRadius: 14,
      padding: 14, borderWidth: 1, borderColor: COLORS.border, gap: 10, marginBottom: 10,
    },
    title: { color: COLORS.text, fontWeight: '700', fontSize: 14, marginBottom: 2 },
    meta: { color: COLORS.textMuted, fontSize: 12 },
    budget: { color: '#8B5CF6', fontWeight: '800', fontSize: 14 },
    statusPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
    statusText: { fontSize: 10, fontWeight: '700' },
  }));

  const load = useCallback(async () => {
    try {
      const [gigs, props] = await Promise.all([
        fetchApi('/work/gigs/freelancing/mine').then(r => r.json()),
        fetchApi('/work/proposals/mine').then(r => r.json()),
      ]);
      setAssignedGigs(Array.isArray(gigs) ? gigs : []);
      setProposals(Array.isArray(props) ? props : []);
    } catch { setAssignedGigs([]); setProposals([]); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const pendingProposals = proposals.filter(p => p.status === 'PENDING');

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Freelance Work</Text>
        <View style={{ width: 30 }} />
      </View>

      {loading ? (
        <ActivityIndicator color={COLORS.primary} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: SPACING.lg, paddingBottom: 40 }}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={COLORS.primary} />}
        >
          <Text style={styles.sectionLabel}>ACTIVE & COMPLETED GIGS ({assignedGigs.length})</Text>
          {assignedGigs.length === 0 ? (
            <Text style={styles.hint}>No gigs assigned to you yet — get a proposal accepted to see it here.</Text>
          ) : (
            assignedGigs.map(gig => (
              <TouchableOpacity key={gig.id} style={styles.card} onPress={() => navigation.navigate('WorkGigDetail', { gigId: gig.id })}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.title}>{gig.title}</Text>
                  <Text style={styles.meta}>Client: {gig.client?.profile?.displayName || gig.client?.username}</Text>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 4 }}>
                  <Text style={styles.budget}>{formatCurrency(gig.escrowAmount)}</Text>
                  <View style={[styles.statusPill, { backgroundColor: `${STATUS_COLOR[gig.status]}22` }]}>
                    <Text style={[styles.statusText, { color: STATUS_COLOR[gig.status] }]}>{gig.status}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))
          )}

          <Text style={[styles.sectionLabel, { marginTop: 24 }]}>PENDING PROPOSALS ({pendingProposals.length})</Text>
          {pendingProposals.length === 0 ? (
            <Text style={styles.hint}>No pending proposals — browse gigs in Work to submit one.</Text>
          ) : (
            pendingProposals.map(p => (
              <TouchableOpacity key={p.id} style={styles.card} onPress={() => navigation.navigate('WorkGigDetail', { gigId: p.gig.id })}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.title}>{p.gig.title}</Text>
                  <Text style={styles.meta}>Client: {p.gig.client?.profile?.displayName || p.gig.client?.username}</Text>
                </View>
                <Text style={styles.budget}>{formatCurrency(p.proposedBudget)}</Text>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
