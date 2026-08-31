import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../context/ThemeContext';
import { useThemedStyles } from '../../../theme/useThemedStyles';
import { fetchApi } from '../../../utils/api';

const STATUS_COLOR: Record<string, string> = {
  PLACED: '#f59e0b',
  CONFIRMED: '#3b82f6',
  SHIPPED: '#8B5CF6',
  DELIVERED: '#22c55e',
  CANCELLED: '#ef4444',
};

const NEXT_STATUS: Record<string, string> = {
  PLACED: 'CONFIRMED',
  CONFIRMED: 'SHIPPED',
  SHIPPED: 'DELIVERED',
};

export default function ShoppingStoreOrdersScreen({ navigation }: any) {
  const { theme } = useTheme();
  const { COLORS, SPACING } = theme;
  const styles = useThemedStyles(({ COLORS, SPACING, TYPOGRAPHY }) => ({
    container: { flex: 1, backgroundColor: COLORS.background },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.lg, paddingVertical: 12 },
    back: { padding: 4, marginRight: 8 },
    headerTitle: { ...TYPOGRAPHY.h2, flex: 1 },
    filterScroll: { maxHeight: 48 },
    filterContent: { paddingHorizontal: SPACING.lg, gap: 8, alignItems: 'center' },
    filterChip: {
      paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16,
      backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border,
    },
    filterText: { color: COLORS.textMuted, fontSize: 12, fontWeight: '600' },
    orderCard: { backgroundColor: COLORS.surface, borderRadius: 14, padding: 14, gap: 10, borderWidth: 1, borderColor: COLORS.border },
    orderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    customerName: { color: COLORS.text, fontWeight: '700', fontSize: 14 },
    orderTime: { color: COLORS.textMuted, fontSize: 11, marginTop: 2 },
    statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
    statusText: { fontSize: 11, fontWeight: '700' },
    itemList: { gap: 2 },
    itemText: { color: COLORS.textMuted, fontSize: 13 },
    notesBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, backgroundColor: COLORS.surfaceElevated, borderRadius: 8, padding: 8 },
    notesText: { color: COLORS.textMuted, fontSize: 12, flex: 1 },
    orderFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
    addrText: { color: COLORS.textMuted, fontSize: 11 },
    totalText: { color: '#8B5CF6', fontWeight: '800', fontSize: 14, marginTop: 2 },
    orderActions: { flexDirection: 'row', gap: 8 },
    cancelBtn: { paddingHorizontal: 10, paddingVertical: 7, borderRadius: 10, backgroundColor: '#ef444415', borderWidth: 1, borderColor: '#ef444430' },
    cancelBtnText: { color: '#ef4444', fontWeight: '600', fontSize: 12 },
    advanceBtn: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, backgroundColor: '#22c55e', minWidth: 80, alignItems: 'center' },
    advanceBtnText: { color: '#fff', fontWeight: '700', fontSize: 12 },
    empty: { alignItems: 'center', paddingVertical: 60, gap: 10 },
    emptyText: { color: COLORS.textMuted, fontSize: 14 },
  }));
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');
  const [updating, setUpdating] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetchApi('/shopping/my-store/orders');
      const data = await res.json();
      setOrders(Array.isArray(data) ? data : []);
    } catch { }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const advanceOrder = async (orderId: string, nextStatus: string) => {
    setUpdating(orderId);
    try {
      await fetchApi(`/shopping/orders/${orderId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: nextStatus }),
      });
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: nextStatus } : o));
    } catch { }
    setUpdating(null);
  };

  const cancelOrder = (orderId: string) => advanceOrder(orderId, 'CANCELLED');

  const filtered = filter === 'ALL' ? orders : orders.filter(o => o.status === filter);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Incoming Orders</Text>
        <View style={{ width: 30 }} />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={styles.filterContent}>
        {['ALL', 'PLACED', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED'].map(s => (
          <TouchableOpacity
            key={s}
            style={[styles.filterChip, filter === s && { backgroundColor: STATUS_COLOR[s] || COLORS.primary }]}
            onPress={() => setFilter(s)}
          >
            <Text style={[styles.filterText, filter === s && { color: '#fff' }]}>{s}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading ? (
        <ActivityIndicator color={COLORS.primary} style={{ marginTop: 60 }} />
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: SPACING.lg, gap: 12, paddingBottom: 40 }}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={() => { setLoading(true); load(); }} tintColor={COLORS.primary} />}
        >
          {filtered.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="receipt-outline" size={48} color={COLORS.textMuted} />
              <Text style={styles.emptyText}>No orders {filter !== 'ALL' ? `with status ${filter}` : 'yet'}</Text>
            </View>
          ) : (
            filtered.map(order => {
              const next = NEXT_STATUS[order.status];
              return (
                <View key={order.id} style={styles.orderCard}>
                  <View style={styles.orderHeader}>
                    <View>
                      <Text style={styles.customerName}>
                        {order.customer?.profile?.displayName || order.customer?.username || 'Customer'}
                      </Text>
                      <Text style={styles.orderTime}>
                        {new Date(order.createdAt).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })}
                      </Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: (STATUS_COLOR[order.status] || '#6b7280') + '22' }]}>
                      <Text style={[styles.statusText, { color: STATUS_COLOR[order.status] || '#6b7280' }]}>{order.status}</Text>
                    </View>
                  </View>

                  <View style={styles.itemList}>
                    {(order.items || []).map((item: any) => (
                      <Text key={item.id} style={styles.itemText}>
                        {item.quantity}× {item.product?.name} — {(item.price * item.quantity).toFixed(2)} MSH
                      </Text>
                    ))}
                  </View>

                  {order.notes && (
                    <View style={styles.notesBox}>
                      <Ionicons name="chatbox-ellipses-outline" size={13} color={COLORS.textMuted} />
                      <Text style={styles.notesText}>{order.notes}</Text>
                    </View>
                  )}

                  <View style={styles.orderFooter}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.addrText} numberOfLines={1}>{order.shippingAddress}</Text>
                      <Text style={styles.totalText}>Total: {order.total?.toFixed(2)} MSH</Text>
                    </View>
                    <View style={styles.orderActions}>
                      {order.status !== 'DELIVERED' && order.status !== 'CANCELLED' && (
                        <TouchableOpacity style={styles.cancelBtn} onPress={() => cancelOrder(order.id)}>
                          <Text style={styles.cancelBtnText}>Cancel</Text>
                        </TouchableOpacity>
                      )}
                      {next && (
                        <TouchableOpacity
                          style={styles.advanceBtn}
                          onPress={() => advanceOrder(order.id, next)}
                          disabled={updating === order.id}
                        >
                          {updating === order.id ? (
                            <ActivityIndicator color="#fff" size="small" />
                          ) : (
                            <Text style={styles.advanceBtnText}>→ {next}</Text>
                          )}
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
