import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../context/ThemeContext';
import { useThemedStyles } from '../../../theme/useThemedStyles';
import { fetchApi } from '../../../utils/api';
import { formatCurrency } from '../../../utils/format';

export default function MyGigsScreen({ navigation }: any) {
  const { theme } = useTheme();
  const { COLORS, SPACING } = theme;
  const STATUS_COLOR: Record<string, string> = {
    OPEN: COLORS.textMuted,
    IN_PROGRESS: '#0EA5E9',
    SUBMITTED: '#f59e0b',
    COMPLETED: '#22c55e',
    CANCELLED: '#ef4444',
  };
  const [gigs, setGigs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const styles = useThemedStyles(({ COLORS, TYPOGRAPHY, SPACING }) => ({
    container: { flex: 1, backgroundColor: COLORS.background },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.lg, paddingVertical: 12 },
    back: { padding: 4 },
    headerTitle: { ...TYPOGRAPHY.h2, flex: 1, textAlign: 'center' },
    card: {
      flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, borderRadius: 14,
      padding: 14, borderWidth: 1, borderColor: COLORS.border, gap: 10,
    },
    title: { color: COLORS.text, fontWeight: '700', fontSize: 14, marginBottom: 2 },
    meta: { color: COLORS.textMuted, fontSize: 12 },
    budget: { color: '#8B5CF6', fontWeight: '800', fontSize: 14 },
    statusPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
    statusText: { fontSize: 10, fontWeight: '700' },
    empty: { alignItems: 'center', paddingVertical: 60, gap: 8 },
    emptyText: { color: COLORS.text, fontSize: 15, fontWeight: '600' },
    emptyLink: { color: '#8B5CF6', fontWeight: '600', fontSize: 13, marginTop: 4 },
  }));

  const load = useCallback(async () => {
    try {
      const res = await fetchApi('/work/gigs/mine');
      const data = await res.json();
      setGigs(Array.isArray(data) ? data : []);
    } catch { setGigs([]); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Gigs</Text>
        <TouchableOpacity onPress={() => navigation.navigate('AddEditWorkGig', {})}>
          <Ionicons name="add-circle-outline" size={24} color={COLORS.text} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator color={COLORS.primary} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: SPACING.lg, paddingBottom: 40, gap: 12 }}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={COLORS.primary} />}
        >
          {gigs.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="construct-outline" size={48} color={COLORS.textMuted} />
              <Text style={styles.emptyText}>No gigs posted yet</Text>
              <TouchableOpacity onPress={() => navigation.navigate('AddEditWorkGig', {})}>
                <Text style={styles.emptyLink}>Post your first gig</Text>
              </TouchableOpacity>
            </View>
          ) : (
            gigs.map(gig => (
              <TouchableOpacity key={gig.id} style={styles.card} onPress={() => navigation.navigate('WorkGigDetail', { gigId: gig.id })}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.title}>{gig.title}</Text>
                  <Text style={styles.meta}>
                    {gig.status === 'OPEN' ? `${gig._count?.proposals ?? 0} proposal${gig._count?.proposals === 1 ? '' : 's'}` : `Freelancer: ${gig.freelancer?.profile?.displayName || gig.freelancer?.username || '—'}`}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 4 }}>
                  <Text style={styles.budget}>{formatCurrency(gig.budget)}</Text>
                  <View style={[styles.statusPill, { backgroundColor: `${STATUS_COLOR[gig.status]}22` }]}>
                    <Text style={[styles.statusText, { color: STATUS_COLOR[gig.status] }]}>{gig.status}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
