import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, TYPOGRAPHY, SPACING } from '../../../theme';
import { fetchApi } from '../../../utils/api';
import { rideSocket } from '../../../services/RideSocketService';
import * as Location from 'expo-location';

const STATUS_COLOR: Record<string, string> = {
  PENDING: '#f59e0b',
  ACCEPTED: '#3b82f6',
  PREPARING: '#8b5cf6',
  READY: '#06b6d4',
  DELIVERING: '#10b981',
  DELIVERED: '#22c55e',
  CANCELLED: '#ef4444',
};

const NEXT_STATUS: Record<string, string> = {
  PENDING: 'ACCEPTED',
  ACCEPTED: 'PREPARING',
  PREPARING: 'READY',
  READY: 'DELIVERING',
  DELIVERING: 'DELIVERED',
};

export default function StoreOrdersScreen({ navigation }: any) {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');
  const [updating, setUpdating] = useState<string | null>(null);
  const [deliveringOrderId, setDeliveringOrderId] = useState<string | null>(null);
  const locationWatchRef = useRef<Location.LocationSubscription | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetchApi('/eat/my-store/orders');
      const data = await res.json();
      setOrders(Array.isArray(data) ? data : []);
    } catch { }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, []);

  useEffect(() => {
    return () => { locationWatchRef.current?.remove(); };
  }, []);

  const startDeliveryTracking = async (orderId: string) => {
    if (Platform.OS === 'web') return;
    const socket = await rideSocket.connect();
    if (!socket) return;
    rideSocket.joinOrderRoom(orderId);
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return;
    setDeliveringOrderId(orderId);
    locationWatchRef.current = await Location.watchPositionAsync(
      { accuracy: Location.Accuracy.High, distanceInterval: 10, timeInterval: 3000 },
      (loc) => {
        rideSocket.updateOrderLocation(loc.coords.latitude, loc.coords.longitude, orderId);
      }
    );
  };

  const stopDeliveryTracking = () => {
    locationWatchRef.current?.remove();
    locationWatchRef.current = null;
    setDeliveringOrderId(null);
  };

  const advanceOrder = async (orderId: string, nextStatus: string) => {
    setUpdating(orderId);
    try {
      await fetchApi(`/eat/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: nextStatus } : o));
      if (nextStatus === 'DELIVERING') {
        startDeliveryTracking(orderId);
      } else if (nextStatus === 'DELIVERED' && deliveringOrderId === orderId) {
        stopDeliveryTracking();
      }
    } catch { }
    setUpdating(null);
  };

  const cancelOrder = async (orderId: string) => {
    await advanceOrder(orderId, 'CANCELLED');
  };

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

      {/* Filter tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={styles.filterContent}>
        {['ALL', 'PENDING', 'ACCEPTED', 'PREPARING', 'READY', 'DELIVERING', 'DELIVERED'].map(s => (
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
                        {new Date(order.createdAt).toLocaleString('en-ZA', { dateStyle: 'short', timeStyle: 'short' })}
                      </Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: (STATUS_COLOR[order.status] || '#6b7280') + '22' }]}>
                      <Text style={[styles.statusText, { color: STATUS_COLOR[order.status] || '#6b7280' }]}>{order.status}</Text>
                    </View>
                  </View>

                  <View style={styles.itemList}>
                    {(order.items || []).map((item: any) => (
                      <Text key={item.id} style={styles.itemText}>
                        {item.quantity}× {item.product?.name} — R{(item.price * item.quantity).toFixed(2)}
                      </Text>
                    ))}
                  </View>

                  {order.notes && (
                    <View style={styles.notesBox}>
                      <Ionicons name="chatbox-ellipses-outline" size={13} color={COLORS.textMuted} />
                      <Text style={styles.notesText}>{order.notes}</Text>
                    </View>
                  )}

                  {deliveringOrderId === order.id && (
                    <View style={styles.trackingBanner}>
                      <View style={styles.trackingDot} />
                      <Text style={styles.trackingText}>Sharing live location with customer</Text>
                      <TouchableOpacity onPress={stopDeliveryTracking}>
                        <Ionicons name="close-circle" size={18} color="#10b981" />
                      </TouchableOpacity>
                    </View>
                  )}
                  <View style={styles.orderFooter}>
                    <View>
                      <Text style={styles.addrText} numberOfLines={1}>{order.deliveryAddress}</Text>
                      <Text style={styles.totalText}>Total: R{order.total?.toFixed(2)}</Text>
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.lg, paddingVertical: 12 },
  back: { padding: 4, marginRight: 8 },
  headerTitle: { ...TYPOGRAPHY.h2, flex: 1 },
  filterScroll: { maxHeight: 48 },
  filterContent: { paddingHorizontal: SPACING.lg, gap: 8, alignItems: 'center' },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterText: { color: COLORS.textMuted, fontSize: 12, fontWeight: '600' },
  orderCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 14,
    gap: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
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
  totalText: { color: '#ef4444', fontWeight: '800', fontSize: 14, marginTop: 2 },
  orderActions: { flexDirection: 'row', gap: 8 },
  cancelBtn: { paddingHorizontal: 10, paddingVertical: 7, borderRadius: 10, backgroundColor: '#ef444415', borderWidth: 1, borderColor: '#ef444430' },
  cancelBtnText: { color: '#ef4444', fontWeight: '600', fontSize: 12 },
  advanceBtn: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, backgroundColor: '#22c55e', minWidth: 80, alignItems: 'center' },
  advanceBtnText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  empty: { alignItems: 'center', paddingVertical: 60, gap: 10 },
  emptyText: { color: COLORS.textMuted, fontSize: 14 },
  trackingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#10b98115',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#10b98130',
  },
  trackingDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#10b981' },
  trackingText: { color: '#10b981', fontSize: 12, fontWeight: '600', flex: 1 },
});
