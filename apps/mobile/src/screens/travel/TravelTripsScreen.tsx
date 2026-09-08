import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useThemedStyles } from '../../theme/useThemedStyles';
import { fetchApi } from '../../utils/api';
import { formatCurrency } from '../../utils/format';
import RateSellerModal from '../../components/reviews/RateSellerModal';

// Only stay/car have a real individual host to review — flight/package are
// a curated catalog with no operator (see travel.service.ts's own comment).
const REVIEWABLE_TYPE: Record<string, 'travel_stay' | 'travel_car'> = { stay: 'travel_stay', car: 'travel_car' };

const TYPE_META: Record<string, { icon: string; color: string; label: string }> = {
  stay: { icon: 'bed', color: '#8B5CF6', label: 'Stay' },
  car: { icon: 'car-sport', color: '#3b82f6', label: 'Car Hire' },
  flight: { icon: 'airplane', color: '#f59e0b', label: 'Flight' },
  package: { icon: 'sunny', color: '#ef4444', label: 'Holiday' },
};

export default function TravelTripsScreen({ navigation }: any) {
  const { theme } = useTheme();
  const { COLORS, SPACING } = theme;
  const styles = useThemedStyles(({ COLORS, SPACING, TYPOGRAPHY }) => ({
    container: { flex: 1, backgroundColor: COLORS.background },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.lg, paddingVertical: 12 },
    back: { padding: 4 },
    headerTitle: { ...TYPOGRAPHY.h2, flex: 1, textAlign: 'center' },
    tripCard: {
      flexDirection: 'row', alignItems: 'center', gap: 12,
      backgroundColor: COLORS.surface, borderRadius: 14, padding: 14,
      borderWidth: 1, borderColor: COLORS.border,
    },
    iconWrap: { width: 42, height: 42, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    tripTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 },
    tripType: { color: COLORS.textMuted, fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
    statusPill: { backgroundColor: '#22c55e22', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 },
    statusText: { color: '#22c55e', fontSize: 10, fontWeight: '700' },
    tripTitle: { color: COLORS.text, fontSize: 14, fontWeight: '700', marginBottom: 2 },
    tripSub: { color: COLORS.textMuted, fontSize: 12, marginBottom: 2 },
    tripDate: { color: COLORS.textMuted, fontSize: 11 },
    tripPrice: { color: '#8B5CF6', fontWeight: '800', fontSize: 14 },
    empty: { alignItems: 'center', paddingVertical: 60, gap: 8 },
    emptyText: { color: COLORS.text, fontSize: 16, fontWeight: '600' },
    emptySub: { color: COLORS.textMuted, fontSize: 13, textAlign: 'center' },
  }));
  const [trips, setTrips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [rateTarget, setRateTarget] = useState<any>(null);
  const [reviewedIds, setReviewedIds] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    try {
      const res = await fetchApi('/travel/trips/mine');
      const data = await res.json();
      const list = Array.isArray(data) ? data : [];
      setTrips(list);
      const completed = list.filter((t: any) => REVIEWABLE_TYPE[t.type] && t.status === 'COMPLETED');
      const checks = await Promise.all(
        completed.map((t: any) => fetchApi(`/reviews/check?transactionType=${REVIEWABLE_TYPE[t.type]}&transactionId=${t.id}`).then(r => r.ok ? r.json() : { reviewed: false })),
      );
      setReviewedIds(new Set(completed.filter((_: any, i: number) => checks[i]?.reviewed).map((t: any) => `${t.type}-${t.id}`)));
    } catch { setTrips([]); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Trips</Text>
        <View style={{ width: 30 }} />
      </View>

      {loading ? (
        <ActivityIndicator color={COLORS.primary} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: SPACING.lg, paddingBottom: 40, gap: 12 }}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={COLORS.primary} />}
        >
          {trips.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="briefcase-outline" size={48} color={COLORS.textMuted} />
              <Text style={styles.emptyText}>No trips yet</Text>
              <Text style={styles.emptySub}>Book a stay, car, flight or holiday to see it here</Text>
            </View>
          ) : (
            trips.map(trip => {
              const meta = TYPE_META[trip.type];
              const key = `${trip.type}-${trip.id}`;
              const reviewType = REVIEWABLE_TYPE[trip.type];
              const canRate = reviewType && trip.status === 'COMPLETED';
              return (
                <View key={key} style={styles.tripCard}>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                      <View style={[styles.iconWrap, { backgroundColor: `${meta.color}15` }]}>
                        <Ionicons name={meta.icon as any} size={20} color={meta.color} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <View style={styles.tripTopRow}>
                          <Text style={styles.tripType}>{meta.label}</Text>
                          <View style={styles.statusPill}>
                            <Text style={styles.statusText}>{trip.status}</Text>
                          </View>
                        </View>
                        <Text style={styles.tripTitle} numberOfLines={1}>{trip.title}</Text>
                        <Text style={styles.tripSub} numberOfLines={1}>{trip.subtitle}</Text>
                        <Text style={styles.tripDate}>{trip.dateLabel}</Text>
                      </View>
                      <Text style={styles.tripPrice}>{formatCurrency(trip.totalPrice)}</Text>
                    </View>
                    {canRate && (
                      reviewedIds.has(key) ? (
                        <Text style={{ color: '#22c55e', fontSize: 11.5, fontWeight: '600', marginTop: 8 }}>✓ You rated this</Text>
                      ) : (
                        <TouchableOpacity
                          style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#8B5CF6', borderRadius: 8, paddingVertical: 8, marginTop: 8 }}
                          onPress={() => setRateTarget(trip)}
                        >
                          <Ionicons name="star" size={14} color="#fff" />
                          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 12 }}>Rate this {meta.label.toLowerCase()}</Text>
                        </TouchableOpacity>
                      )
                    )}
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      )}

      <RateSellerModal
        visible={!!rateTarget}
        title={rateTarget?.title ?? ''}
        onClose={() => setRateTarget(null)}
        onSubmitted={() => {
          if (rateTarget) setReviewedIds(prev => new Set(prev).add(`${rateTarget.type}-${rateTarget.id}`));
          setRateTarget(null);
        }}
        transactionType={rateTarget ? REVIEWABLE_TYPE[rateTarget.type] : 'travel_stay'}
        transactionId={rateTarget?.id ?? ''}
      />
    </SafeAreaView>
  );
}
