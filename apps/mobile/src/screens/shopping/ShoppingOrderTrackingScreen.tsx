import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useThemedStyles } from '../../theme/useThemedStyles';
import { fetchApi } from '../../utils/api';

const STATUS_STEPS = [
  { key: 'PLACED', label: 'Placed', icon: 'receipt-outline' },
  { key: 'CONFIRMED', label: 'Confirmed', icon: 'checkmark-circle-outline' },
  { key: 'SHIPPED', label: 'Shipped', icon: 'airplane-outline' },
  { key: 'DELIVERED', label: 'Delivered', icon: 'checkmark-done-circle' },
];

export default function ShoppingOrderTrackingScreen({ navigation, route }: any) {
  const { theme } = useTheme();
  const { COLORS, SPACING } = theme;
  const styles = useThemedStyles(({ COLORS, SPACING, RADIUS, TYPOGRAPHY }) => ({
    container: { flex: 1, backgroundColor: COLORS.background },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.lg, paddingVertical: 12 },
    back: { padding: 4 },
    headerTitle: { ...TYPOGRAPHY.h2 },
    cancelledBanner: {
      flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'rgba(248,113,113,0.1)',
      borderWidth: 1, borderColor: 'rgba(248,113,113,0.3)', borderRadius: RADIUS.lg, padding: 16, marginBottom: 16,
    },
    cancelledText: { color: '#F87171', fontWeight: '700', fontSize: 14 },
    stepperCard: {
      backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.border,
      padding: 16, marginBottom: 16,
    },
    stepRow: { flexDirection: 'row', gap: 14 },
    stepIconCol: { alignItems: 'center' },
    stepDot: {
      width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.surfaceElevated,
      justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: COLORS.border,
    },
    stepDotDone: { backgroundColor: '#8B5CF6', borderColor: '#8B5CF6' },
    stepDotCurrent: { backgroundColor: '#8B5CF6', borderColor: '#8B5CF6' },
    stepLine: { width: 2, flex: 1, minHeight: 24, backgroundColor: COLORS.border, marginVertical: 2 },
    stepLineDone: { backgroundColor: '#8B5CF6' },
    stepTextCol: { flex: 1, paddingBottom: 20, justifyContent: 'center' },
    stepLabel: { color: COLORS.textMuted, fontWeight: '600', fontSize: 14 },
    stepLabelDone: { color: COLORS.text },
    stepCurrentNote: { color: '#8B5CF6', fontSize: 11, marginTop: 2, fontWeight: '600' },
    summaryCard: { backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.border, padding: 16 },
    sectionLabel: { ...TYPOGRAPHY.label, fontSize: 11, marginBottom: 10 },
    storeName: { ...TYPOGRAPHY.h3, marginBottom: 6 },
    addrText: { color: COLORS.textMuted, fontSize: 12, marginBottom: 10 },
    itemText: { color: COLORS.text, fontSize: 13, marginBottom: 4 },
    divider: { height: 1, backgroundColor: COLORS.border, marginVertical: 12 },
    row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
    totalLabel: { color: COLORS.text, fontWeight: '700', fontSize: 14 },
    totalValue: { color: '#8B5CF6', fontWeight: '800', fontSize: 15 },
    rewardLabel: { color: COLORS.textMuted, fontSize: 12 },
    rewardValue: { color: '#8B5CF6', fontWeight: '700', fontSize: 12 },
  }));
  const { orderId } = route.params;
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    fetchApi(`/shopping/orders/${orderId}`)
      .then(r => r.json())
      .then(setOrder)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [orderId]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <View style={styles.center}><ActivityIndicator color={COLORS.primary} size="large" /></View>
    );
  }
  if (!order) {
    return (
      <View style={styles.center}><Text style={{ color: COLORS.textMuted }}>Order not found</Text></View>
    );
  }

  const isCancelled = order.status === 'CANCELLED';
  const currentStepIndex = STATUS_STEPS.findIndex(s => s.key === order.status);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Track Order</Text>
        <TouchableOpacity onPress={load} style={styles.back}>
          <Ionicons name="refresh" size={20} color={COLORS.text} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: SPACING.lg, paddingBottom: 40 }}>
        {isCancelled ? (
          <View style={styles.cancelledBanner}>
            <Ionicons name="close-circle" size={28} color="#F87171" />
            <Text style={styles.cancelledText}>This order was cancelled</Text>
          </View>
        ) : (
          <View style={styles.stepperCard}>
            {STATUS_STEPS.map((step, i) => {
              const done = i <= currentStepIndex;
              const isCurrent = i === currentStepIndex;
              return (
                <View key={step.key} style={styles.stepRow}>
                  <View style={styles.stepIconCol}>
                    <View style={[styles.stepDot, done && styles.stepDotDone, isCurrent && styles.stepDotCurrent]}>
                      <Ionicons name={step.icon as any} size={16} color={done ? '#fff' : COLORS.textMuted} />
                    </View>
                    {i < STATUS_STEPS.length - 1 && <View style={[styles.stepLine, done && i < currentStepIndex && styles.stepLineDone]} />}
                  </View>
                  <View style={styles.stepTextCol}>
                    <Text style={[styles.stepLabel, done && styles.stepLabelDone]}>{step.label}</Text>
                    {isCurrent && <Text style={styles.stepCurrentNote}>Current status</Text>}
                  </View>
                </View>
              );
            })}
          </View>
        )}

        <View style={styles.summaryCard}>
          <Text style={styles.sectionLabel}>ORDER SUMMARY</Text>
          <Text style={styles.storeName}>{order.store?.name}</Text>
          <Text style={styles.addrText}>
            <Ionicons name="location-outline" size={12} /> {order.shippingAddress}
          </Text>
          {(order.items || []).map((item: any) => (
            <Text key={item.id} style={styles.itemText}>{item.quantity}× {item.product?.name}</Text>
          ))}
          <View style={styles.divider} />
          <View style={styles.row}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>{order.total?.toFixed(2)} MSH</Text>
          </View>
          {order.rewardEarned > 0 && (
            <View style={styles.row}>
              <Text style={styles.rewardLabel}>Cashback earned</Text>
              <Text style={styles.rewardValue}>+{order.rewardEarned.toFixed(2)} MSH</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
