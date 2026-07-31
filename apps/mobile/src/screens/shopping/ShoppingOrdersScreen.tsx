import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, TYPOGRAPHY, SPACING } from '../../theme';
import { fetchApi } from '../../utils/api';

const STATUS_COLOR: Record<string, string> = {
  PLACED: '#f59e0b',
  CONFIRMED: '#3b82f6',
  SHIPPED: '#8B5CF6',
  DELIVERED: '#22c55e',
  CANCELLED: '#ef4444',
};

const STATUS_ICON: Record<string, string> = {
  PLACED: 'time-outline',
  CONFIRMED: 'checkmark-circle-outline',
  SHIPPED: 'airplane-outline',
  DELIVERED: 'checkmark-done-circle',
  CANCELLED: 'close-circle',
};

export default function ShoppingOrdersScreen({ navigation }: any) {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetchApi('/shopping/orders/mine');
      const data = await res.json();
      setOrders(Array.isArray(data) ? data : []);
    } catch { }
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const active = orders.filter(o => !['DELIVERED', 'CANCELLED'].includes(o.status));
  const past = orders.filter(o => ['DELIVERED', 'CANCELLED'].includes(o.status));
  const isTrackable = (status: string) => ['PLACED', 'CONFIRMED', 'SHIPPED'].includes(status);

  const OrderCard = ({ order }: { order: any }) => (
    <View style={styles.orderCard}>
      <View style={styles.orderHeader}>
        <Text style={styles.storeName}>{order.store?.name}</Text>
        <View style={[styles.statusBadge, { backgroundColor: (STATUS_COLOR[order.status] || '#6b7280') + '22' }]}>
          <Ionicons name={STATUS_ICON[order.status] as any || 'help-circle'} size={12} color={STATUS_COLOR[order.status] || '#6b7280'} />
          <Text style={[styles.statusText, { color: STATUS_COLOR[order.status] || '#6b7280' }]}>{order.status}</Text>
        </View>
      </View>
      <Text style={styles.orderDate}>{new Date(order.createdAt).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })}</Text>
      <View style={styles.itemList}>
        {(order.items || []).map((item: any) => (
          <Text key={item.id} style={styles.itemText}>{item.quantity}× {item.product?.name}</Text>
        ))}
      </View>
      <View style={styles.orderFooter}>
        <Text style={styles.orderAddr} numberOfLines={1}>
          <Ionicons name="location-outline" size={12} /> {order.shippingAddress}
        </Text>
        <Text style={styles.orderTotal}>{order.total?.toFixed(2)} MSH</Text>
      </View>
      {order.rewardEarned > 0 && (
        <Text style={styles.rewardText}>
          <Ionicons name="gift-outline" size={11} color="#8B5CF6" /> +{order.rewardEarned.toFixed(2)} MSH cashback earned
        </Text>
      )}
      {isTrackable(order.status) && (
        <TouchableOpacity style={styles.trackBtn} onPress={() => navigation.navigate('ShoppingOrderTracking', { orderId: order.id })}>
          <Ionicons name="navigate" size={14} color="#fff" />
          <Text style={styles.trackBtnText}>Track Order</Text>
        </TouchableOpacity>
      )}
    </View>
  );

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
        <ActivityIndicator color={COLORS.primary} style={{ marginTop: 60 }} />
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 40 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={COLORS.primary} />}
        >
          {orders.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="receipt-outline" size={64} color={COLORS.textMuted} />
              <Text style={styles.emptyTitle}>No orders yet</Text>
              <TouchableOpacity style={styles.browseBtn} onPress={() => navigation.navigate('ShoppingHome')}>
                <Text style={styles.browseBtnText}>Browse stores</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {active.length > 0 && (
                <>
                  <Text style={styles.sectionLabel}>ACTIVE ORDERS</Text>
                  {active.map(o => <OrderCard key={o.id} order={o} />)}
                </>
              )}
              {past.length > 0 && (
                <>
                  <Text style={styles.sectionLabel}>PAST ORDERS</Text>
                  {past.map(o => <OrderCard key={o.id} order={o} />)}
                </>
              )}
            </>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.lg, paddingVertical: 12 },
  back: { padding: 4, marginRight: 8 },
  headerTitle: { ...TYPOGRAPHY.h2, flex: 1 },
  sectionLabel: { ...TYPOGRAPHY.label, fontSize: 11, paddingHorizontal: SPACING.lg, marginTop: 16, marginBottom: 8 },
  orderCard: {
    marginHorizontal: SPACING.lg, marginBottom: 10, backgroundColor: COLORS.surface, borderRadius: 14,
    padding: 14, borderWidth: 1, borderColor: COLORS.border, gap: 8,
  },
  orderHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  storeName: { ...TYPOGRAPHY.body1 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
  statusText: { fontSize: 11, fontWeight: '700' },
  orderDate: { color: COLORS.textMuted, fontSize: 11 },
  itemList: { gap: 2 },
  itemText: { color: COLORS.textMuted, fontSize: 13 },
  orderFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  orderAddr: { color: COLORS.textMuted, fontSize: 11, flex: 1 },
  orderTotal: { color: '#8B5CF6', fontWeight: '800', fontSize: 14 },
  rewardText: { color: '#8B5CF6', fontSize: 11, fontWeight: '600' },
  empty: { alignItems: 'center', paddingTop: 80, gap: 16 },
  emptyTitle: { ...TYPOGRAPHY.h2, color: COLORS.textMuted },
  browseBtn: { backgroundColor: '#8B5CF6', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 24 },
  browseBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  trackBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#8B5CF6', borderRadius: 10,
    paddingVertical: 8, paddingHorizontal: 14, alignSelf: 'flex-start',
  },
  trackBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
});
