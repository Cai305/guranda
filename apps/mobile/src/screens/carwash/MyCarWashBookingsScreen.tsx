import React, { useCallback, useState } from 'react';
import { View, Text, TouchableOpacity, FlatList, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../../context/ThemeContext';
import { useThemedStyles } from '../../theme/useThemedStyles';
import { fetchApi } from '../../utils/api';
import { formatCurrency } from '../../utils/format';

const STATUS_COLORS: Record<string, string> = {
  PENDING: '#F59E0B',
  CONFIRMED: '#3B82F6',
  COMPLETED: '#10B981',
  CANCELLED: '#EF4444',
};

export default function MyCarWashBookingsScreen({ navigation }: any) {
  const { theme } = useTheme();
  const { COLORS, TYPOGRAPHY, SPACING } = theme;
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const styles = useThemedStyles(({ COLORS, RADIUS, SPACING, TYPOGRAPHY }) => ({
    root: { flex: 1, backgroundColor: COLORS.background },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: SPACING.lg,
      paddingVertical: SPACING.md,
    },
    backBtn: {
      width: 40, height: 40,
      borderRadius: RADIUS.pill,
      backgroundColor: COLORS.glass,
      borderWidth: 1, borderColor: COLORS.glassBorder,
      justifyContent: 'center', alignItems: 'center',
    },
    card: {
      backgroundColor: COLORS.glass,
      borderRadius: RADIUS.lg,
      padding: SPACING.md,
      marginBottom: SPACING.md,
      borderWidth: 1,
      borderColor: COLORS.glassBorder,
    },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
    cardName: { ...TYPOGRAPHY.h3, flex: 1 },
    statusBadge: {
      borderWidth: 1,
      paddingHorizontal: 8, paddingVertical: 3,
      borderRadius: RADIUS.pill,
    },
    statusText: { fontSize: 11, fontWeight: '700' },
    serviceName: { color: COLORS.text, fontSize: 14, fontWeight: '600', marginBottom: 6 },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 },
    metaText: { color: COLORS.textMuted, fontSize: 12, flex: 1 },
    amount: { color: COLORS.primary, fontWeight: 'bold', fontSize: 14, marginTop: 4 },
    emptyContainer: { alignItems: 'center', justifyContent: 'center', padding: SPACING.xl },
    emptyText: { color: COLORS.textMuted, fontSize: 14 },
  }));

  const load = useCallback(() => {
    setLoading(true);
    fetchApi('/carwash/mine/bookings')
      .then(res => (res.ok ? res.json() : []))
      .then(data => Array.isArray(data) && setBookings(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('CarWashDetail', { carWashId: item.carWashId })}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.cardName}>{item.carWash?.name}</Text>
        <View style={[styles.statusBadge, { backgroundColor: `${STATUS_COLORS[item.status]}20`, borderColor: `${STATUS_COLORS[item.status]}60` }]}>
          <Text style={[styles.statusText, { color: STATUS_COLORS[item.status] }]}>{item.status}</Text>
        </View>
      </View>
      <Text style={styles.serviceName}>{item.service?.name}</Text>
      {item.scheduledFor && (
        <View style={styles.metaRow}>
          <Ionicons name="calendar" size={12} color={COLORS.textMuted} />
          <Text style={styles.metaText}>{new Date(item.scheduledFor).toLocaleString()}</Text>
        </View>
      )}
      <View style={styles.metaRow}>
        <Ionicons name="location" size={12} color={COLORS.textMuted} />
        <Text style={styles.metaText} numberOfLines={1}>{item.carWash?.address}</Text>
      </View>
      <Text style={styles.amount}>{formatCurrency(item.totalAmount)}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={TYPOGRAPHY.h2}>My Bookings</Text>
        <View style={{ width: 40 }} />
      </View>

      <FlatList
        data={bookings}
        keyExtractor={b => b.id}
        renderItem={renderItem}
        contentContainerStyle={{ padding: SPACING.lg, paddingBottom: 100 }}
        refreshing={loading}
        onRefresh={load}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            {loading ? <ActivityIndicator color={COLORS.primary} /> : <Text style={styles.emptyText}>No bookings yet.</Text>}
          </View>
        }
      />
    </SafeAreaView>
  );
}
