import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, TYPOGRAPHY, SPACING } from '../../theme';
import { fetchApi } from '../../utils/api';

const STATUS_COLOR: Record<string, string> = {
  PLACED: COLORS.textMuted,
  CONFIRMED: '#0EA5E9',
  READY: '#f59e0b',
  COMPLETED: '#22c55e',
  CANCELLED: '#ef4444',
};

export default function HealthOrdersScreen({ navigation }: any) {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await fetchApi('/health/orders/mine');
      const data = await res.json();
      setOrders(Array.isArray(data) ? data : []);
    } catch { setOrders([]); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Orders</Text>
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
          {orders.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="receipt-outline" size={48} color={COLORS.textMuted} />
              <Text style={styles.emptyText}>No orders yet</Text>
            </View>
          ) : (
            orders.map(order => (
              <View key={order.id} style={styles.card}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.title}>{order.pharmacy?.name}</Text>
                  <Text style={styles.sub}>{order.items?.length ?? 0} item{order.items?.length === 1 ? '' : 's'}</Text>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 4 }}>
                  <Text style={styles.total}>{order.total.toFixed(2)} MSH</Text>
                  <View style={[styles.statusPill, { backgroundColor: `${STATUS_COLOR[order.status]}22` }]}>
                    <Text style={[styles.statusText, { color: STATUS_COLOR[order.status] }]}>{order.status}</Text>
                  </View>
                </View>
              </View>
            ))
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
  card: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, borderRadius: 14,
    padding: 14, borderWidth: 1, borderColor: COLORS.border, gap: 10,
  },
  title: { color: COLORS.text, fontWeight: '700', fontSize: 14, marginBottom: 2 },
  sub: { color: COLORS.textMuted, fontSize: 12 },
  total: { color: '#F87171', fontWeight: '800', fontSize: 14 },
  statusPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  statusText: { fontSize: 10, fontWeight: '700' },
  empty: { alignItems: 'center', paddingVertical: 60, gap: 8 },
  emptyText: { color: COLORS.text, fontSize: 15, fontWeight: '600' },
});
