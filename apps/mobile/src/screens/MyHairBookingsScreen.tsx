import React, { useCallback, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import { useThemedStyles } from '../theme/useThemedStyles';
import { fetchApi } from '../utils/api';
import RateSellerModal from '../components/reviews/RateSellerModal';

const STATUS_COLOR: Record<string, string> = { PENDING: '#F59E0B', CONFIRMED: '#0EA5E9', COMPLETED: '#22c55e', CANCELLED: '#ef4444' };

interface HairBooking {
  id: string;
  status: string;
  appointmentAt: string;
  totalPrice: number;
  hairdresser: { id: string; businessName: string };
  service: { title: string };
}

// Was missing entirely — no customer-facing view of your own hair bookings
// existed anywhere (Profile's "My Bookings" deliberately excludes
// completed ones, since that zone is "what's upcoming"). Mirrors
// MySalonScreen's card layout for visual consistency with the seller side.
export default function MyHairBookingsScreen({ navigation }: any) {
  const { theme } = useTheme();
  const { COLORS } = theme;
  const [bookings, setBookings] = useState<HairBooking[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [rateTarget, setRateTarget] = useState<HairBooking | null>(null);
  const [reviewedIds, setReviewedIds] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    try {
      const res = await fetchApi('/hair/mine/bookings-as-customer');
      const data: HairBooking[] = res.ok ? await res.json() : [];
      setBookings(data);
      const completed = data.filter(b => b.status === 'COMPLETED');
      const checks = await Promise.all(
        completed.map(b => fetchApi(`/reviews/check?transactionType=hair_booking&transactionId=${b.id}`).then(r => r.ok ? r.json() : { reviewed: false })),
      );
      setReviewedIds(new Set(completed.filter((_, i) => checks[i]?.reviewed).map(b => b.id)));
    } catch {
      setBookings([]);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const styles = useThemedStyles(({ COLORS, RADIUS, SPACING, TYPOGRAPHY }) => ({
    container: { flex: 1, backgroundColor: COLORS.background },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.lg, paddingVertical: 12, gap: 8 },
    back: { padding: 4 },
    headerTitle: { ...TYPOGRAPHY.h2, flex: 1 },
    emptyRow: { alignItems: 'center', paddingTop: 60, gap: 8 },
    emptyRowText: { color: COLORS.textMuted, fontSize: 13 },
    itemRow: {
      backgroundColor: COLORS.surface, borderRadius: RADIUS.md,
      padding: 14, marginHorizontal: SPACING.lg, marginBottom: 8, borderWidth: 1, borderColor: COLORS.border,
    },
    apptDate: { color: COLORS.text, fontWeight: '600', fontSize: 13, marginBottom: 2 },
    apptSub: { color: COLORS.textMuted, fontSize: 12, marginBottom: 6 },
    statusPill: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
    statusText: { fontSize: 10, fontWeight: '700' },
    rateBtn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
      marginTop: 10, backgroundColor: COLORS.primary, borderRadius: 8, paddingVertical: 8,
    },
    rateBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },
    ratedText: { color: COLORS.success, fontSize: 11.5, fontWeight: '600', marginTop: 8, textAlign: 'center' },
  }));

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.back} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Hair Bookings</Text>
      </View>

      {bookings === null ? (
        <ActivityIndicator color={COLORS.primary} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingBottom: 40 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={COLORS.primary} />}
        >
          {bookings.length === 0 ? (
            <View style={styles.emptyRow}>
              <Ionicons name="cut-outline" size={40} color={COLORS.textMuted} />
              <Text style={styles.emptyRowText}>No bookings yet</Text>
            </View>
          ) : (
            bookings.map(b => (
              <View key={b.id} style={styles.itemRow}>
                <Text style={styles.apptDate}>{new Date(b.appointmentAt).toLocaleString()}</Text>
                <Text style={styles.apptSub}>{b.service?.title} · {b.hairdresser?.businessName}</Text>
                <View style={[styles.statusPill, { backgroundColor: `${STATUS_COLOR[b.status]}22` }]}>
                  <Text style={[styles.statusText, { color: STATUS_COLOR[b.status] }]}>{b.status}</Text>
                </View>
                {b.status === 'COMPLETED' && (
                  reviewedIds.has(b.id) ? (
                    <Text style={styles.ratedText}>✓ You rated this</Text>
                  ) : (
                    <TouchableOpacity style={styles.rateBtn} onPress={() => setRateTarget(b)}>
                      <Ionicons name="star" size={14} color="#fff" />
                      <Text style={styles.rateBtnText}>Rate this salon</Text>
                    </TouchableOpacity>
                  )
                )}
              </View>
            ))
          )}
        </ScrollView>
      )}

      <RateSellerModal
        visible={!!rateTarget}
        title={rateTarget?.hairdresser?.businessName ?? ''}
        onClose={() => setRateTarget(null)}
        onSubmitted={() => {
          if (rateTarget) setReviewedIds(prev => new Set(prev).add(rateTarget.id));
          setRateTarget(null);
        }}
        transactionType="hair_booking"
        transactionId={rateTarget?.id ?? ''}
      />
    </SafeAreaView>
  );
}
