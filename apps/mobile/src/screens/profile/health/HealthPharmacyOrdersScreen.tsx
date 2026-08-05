import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../context/ThemeContext';
import { useThemedStyles } from '../../../theme/useThemedStyles';
import { fetchApi } from '../../../utils/api';

const STATUSES = ['PLACED', 'CONFIRMED', 'READY', 'COMPLETED', 'CANCELLED'];

export default function HealthPharmacyOrdersScreen({ navigation }: any) {
  const { theme } = useTheme();
  const { COLORS, SPACING } = theme;
  const STATUS_COLOR: Record<string, string> = {
    PLACED: COLORS.textMuted, CONFIRMED: '#0EA5E9', READY: '#f59e0b', COMPLETED: '#22c55e', CANCELLED: '#ef4444',
  };
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await fetchApi('/health/pharmacies/mine/orders');
      const data = await res.json();
      setOrders(Array.isArray(data) ? data : []);
    } catch { setOrders([]); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const updateStatus = async (orderId: string, status: string) => {
    try {
      await fetchApi(`/health/orders/${orderId}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status } : o));
    } catch {}
  };

  const styles = useThemedStyles(({ COLORS, SPACING, TYPOGRAPHY }) => ({
    container: { flex: 1, backgroundColor: COLORS.background },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.lg, paddingVertical: 12 },
    back: { padding: 4 },
    headerTitle: { ...TYPOGRAPHY.h2, flex: 1, textAlign: 'center' },
    card: { backgroundColor: COLORS.surface, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: COLORS.border, gap: 6 },
    topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    name: { color: COLORS.text, fontWeight: '700', fontSize: 14 },
    statusPill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
    statusText: { fontSize: 11, fontWeight: '700' },
    items: { color: COLORS.textMuted, fontSize: 13 },
    total: { color: '#F87171', fontWeight: '700', fontSize: 14 },
    actionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
    statusBtn: { backgroundColor: COLORS.surfaceElevated, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6 },
    statusBtnText: { color: COLORS.text, fontSize: 11, fontWeight: '600' },
    empty: { alignItems: 'center', paddingVertical: 60, gap: 8 },
    emptyText: { color: COLORS.text, fontSize: 15, fontWeight: '600' },
  }));

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Pharmacy Orders</Text>
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
                <View style={styles.topRow}>
                  <Text style={styles.name}>{order.customer?.profile?.displayName || order.customer?.username}</Text>
                  <View style={[styles.statusPill, { backgroundColor: `${STATUS_COLOR[order.status]}22` }]}>
                    <Text style={[styles.statusText, { color: STATUS_COLOR[order.status] }]}>{order.status}</Text>
                  </View>
                </View>
                <Text style={styles.items}>{order.items?.map((i: any) => `${i.quantity}× ${i.product.name}`).join(', ')}</Text>
                <Text style={styles.total}>{order.total.toFixed(2)} MSH</Text>
                <View style={styles.actionRow}>
                  {STATUSES.filter(s => s !== order.status).map(s => (
                    <TouchableOpacity key={s} style={styles.statusBtn} onPress={() => updateStatus(order.id, s)}>
                      <Text style={styles.statusBtnText}>{s}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ))
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
