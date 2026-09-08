import React, { useCallback, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../../context/ThemeContext';
import { useThemedStyles } from '../../theme/useThemedStyles';
import { fetchApi } from '../../utils/api';
import { formatCurrency } from '../../utils/format';

const STATUS_COLOR: Record<string, string> = { PENDING: '#F59E0B', CONFIRMED: '#0EA5E9', COMPLETED: '#22c55e', CANCELLED: '#ef4444' };

interface OwnerBooking {
  id: string;
  status: string;
  totalAmount: number;
  scheduledFor: string | null;
  createdAt: string;
  carWash: { id: string; name: string };
  service: { name: string };
  user: { username: string; profile?: { displayName?: string } };
}

// Was missing entirely — CarwashService had no way for an owner to see or
// act on bookings across their car washes (only the customer-side list
// existed). Mirrors MySalonScreen's bookings section, which is the
// established pattern for this exact "owner reviews + advances a booking"
// flow elsewhere in the app.
export default function ManageCarWashBookingsScreen({ navigation }: any) {
  const { theme } = useTheme();
  const { COLORS } = theme;
  const [bookings, setBookings] = useState<OwnerBooking[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetchApi('/carwash/mine/owner-bookings');
      setBookings(res.ok ? await res.json() : []);
    } catch {
      setBookings([]);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const updateBooking = async (bookingId: string, status: string) => {
    setBookings(prev => prev && prev.map(b => (b.id === bookingId ? { ...b, status } : b)));
    try {
      await fetchApi(`/carwash/mine/bookings/${bookingId}`, { method: 'PATCH', body: JSON.stringify({ status }) });
    } catch {
      load();
    }
  };

  const styles = useThemedStyles(({ COLORS, RADIUS, SPACING, TYPOGRAPHY }) => ({
    container: { flex: 1, backgroundColor: COLORS.background },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.lg, paddingVertical: 12, gap: 8 },
    back: { padding: 4 },
    headerTitle: { ...TYPOGRAPHY.h2, flex: 1 },
    emptyRow: { alignItems: 'center', paddingTop: 60, gap: 8 },
    emptyRowText: { color: COLORS.textMuted, fontSize: 13 },
    itemRow: {
      flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, borderRadius: RADIUS.md,
      padding: 14, marginHorizontal: SPACING.lg, marginBottom: 8, borderWidth: 1, borderColor: COLORS.border, gap: 10,
    },
    apptDate: { color: COLORS.text, fontWeight: '600', fontSize: 13, marginBottom: 2 },
    apptSub: { color: COLORS.textMuted, fontSize: 12, marginBottom: 6 },
    statusPill: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
    statusText: { fontSize: 10, fontWeight: '700' },
    actionBtn: { backgroundColor: '#22c55e', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
    actionBtnText: { color: '#fff', fontSize: 11, fontWeight: '700' },
    confirmBtn: { backgroundColor: '#0EA5E9', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, marginBottom: 6 },
    cancelBtn: { backgroundColor: '#ef444422', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, marginTop: 6 },
    cancelBtnText: { color: '#ef4444', fontSize: 11, fontWeight: '700' },
  }));

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.back} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Car Wash Bookings</Text>
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
              <Ionicons name="water-outline" size={40} color={COLORS.textMuted} />
              <Text style={styles.emptyRowText}>No bookings yet</Text>
            </View>
          ) : (
            bookings.map(b => (
              <View key={b.id} style={styles.itemRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.apptDate}>
                    {b.scheduledFor ? new Date(b.scheduledFor).toLocaleString() : new Date(b.createdAt).toLocaleDateString()}
                  </Text>
                  <Text style={styles.apptSub}>
                    {b.service?.name} · {b.user?.profile?.displayName || b.user?.username} · {formatCurrency(b.totalAmount)}
                  </Text>
                  <View style={[styles.statusPill, { backgroundColor: `${STATUS_COLOR[b.status]}22` }]}>
                    <Text style={[styles.statusText, { color: STATUS_COLOR[b.status] }]}>{b.status}</Text>
                  </View>
                </View>
                {(b.status === 'PENDING' || b.status === 'CONFIRMED') && (
                  <View style={{ gap: 6 }}>
                    {b.status === 'PENDING' && (
                      <TouchableOpacity style={styles.confirmBtn} onPress={() => updateBooking(b.id, 'CONFIRMED')}>
                        <Text style={styles.actionBtnText}>Confirm</Text>
                      </TouchableOpacity>
                    )}
                    {b.status === 'CONFIRMED' && (
                      <TouchableOpacity style={styles.actionBtn} onPress={() => updateBooking(b.id, 'COMPLETED')}>
                        <Text style={styles.actionBtnText}>Complete</Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity style={styles.cancelBtn} onPress={() => updateBooking(b.id, 'CANCELLED')}>
                      <Text style={styles.cancelBtnText}>Cancel</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            ))
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
