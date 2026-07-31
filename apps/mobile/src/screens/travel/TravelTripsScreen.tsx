import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, TYPOGRAPHY, SPACING } from '../../theme';
import { fetchApi } from '../../utils/api';

const TYPE_META: Record<string, { icon: string; color: string; label: string }> = {
  stay: { icon: 'bed', color: '#8B5CF6', label: 'Stay' },
  car: { icon: 'car-sport', color: '#3b82f6', label: 'Car Hire' },
  flight: { icon: 'airplane', color: '#f59e0b', label: 'Flight' },
  package: { icon: 'sunny', color: '#ef4444', label: 'Holiday' },
};

export default function TravelTripsScreen({ navigation }: any) {
  const [trips, setTrips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await fetchApi('/travel/trips/mine');
      const data = await res.json();
      setTrips(Array.isArray(data) ? data : []);
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
              return (
                <View key={`${trip.type}-${trip.id}`} style={styles.tripCard}>
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
                  <Text style={styles.tripPrice}>{trip.totalPrice.toFixed(0)} MSH</Text>
                </View>
              );
            })
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
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
});
