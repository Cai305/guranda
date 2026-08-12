import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useThemedStyles } from '../../theme/useThemedStyles';
import { fetchApi } from '../../utils/api';
import { formatCurrency } from '../../utils/format';

const TYPE_META: Record<string, { icon: string; color: string; label: string }> = {
  movie: { icon: 'film', color: '#F97316', label: 'Movie' },
  concert: { icon: 'musical-notes', color: '#EF4444', label: 'Concert' },
  event: { icon: 'ticket', color: '#10B981', label: 'Live Event' },
};

const fmt = (iso: string) => new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

export default function MyEntertainmentBookingsScreen({ navigation }: any) {
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await fetchApi('/entertainment/bookings/mine');
      const data = await res.json();
      setBookings(Array.isArray(data) ? data : []);
    } catch { setBookings([]); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const { theme } = useTheme();
  const { COLORS, SPACING } = theme;

  const styles = useThemedStyles(({ COLORS, TYPOGRAPHY, SPACING }) => ({
    container: { flex: 1, backgroundColor: COLORS.background },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.lg, paddingVertical: 12 },
    back: { padding: 4 },
    headerTitle: { ...TYPOGRAPHY.h2, flex: 1, textAlign: 'center' },
    card: {
      flexDirection: 'row', alignItems: 'center', gap: 12,
      backgroundColor: COLORS.surface, borderRadius: 14, padding: 14,
      borderWidth: 1, borderColor: COLORS.border,
    },
    iconWrap: { width: 42, height: 42, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 },
    type: { color: COLORS.textMuted, fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
    statusPill: { backgroundColor: '#22c55e22', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 },
    statusText: { color: '#22c55e', fontSize: 10, fontWeight: '700' },
    title: { color: COLORS.text, fontSize: 14, fontWeight: '700', marginBottom: 2 },
    sub: { color: COLORS.textMuted, fontSize: 12, marginBottom: 2 },
    date: { color: COLORS.textMuted, fontSize: 11 },
    price: { fontWeight: '800', fontSize: 14 },
    empty: { alignItems: 'center', paddingVertical: 60, gap: 8 },
    emptyText: { color: COLORS.text, fontSize: 16, fontWeight: '600' },
    emptySub: { color: COLORS.textMuted, fontSize: 13, textAlign: 'center' },
  }));

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Bookings</Text>
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
          {bookings.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="ticket-outline" size={48} color={COLORS.textMuted} />
              <Text style={styles.emptyText}>No bookings yet</Text>
              <Text style={styles.emptySub}>Book a movie, concert or event to see it here</Text>
            </View>
          ) : (
            bookings.map(booking => {
              const meta = TYPE_META[booking.type];
              const isEvent = booking.type === 'event';
              return (
                <TouchableOpacity
                  key={`${booking.type}-${booking.id}`}
                  style={styles.card}
                  activeOpacity={isEvent ? 0.8 : 1}
                  disabled={!isEvent}
                  onPress={isEvent ? () => navigation.navigate('EventTickets', { bookingId: booking.id }) : undefined}
                >
                  <View style={[styles.iconWrap, { backgroundColor: `${meta.color}15` }]}>
                    <Ionicons name={meta.icon as any} size={20} color={meta.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={styles.topRow}>
                      <Text style={styles.type}>{meta.label}</Text>
                      <View style={styles.statusPill}>
                        <Text style={styles.statusText}>{booking.status}</Text>
                      </View>
                    </View>
                    <Text style={styles.title} numberOfLines={1}>{booking.title}</Text>
                    <Text style={styles.sub} numberOfLines={1}>{booking.subtitle}</Text>
                    <Text style={styles.date}>{fmt(booking.dateLabel)}</Text>
                  </View>
                  <Text style={[styles.price, { color: meta.color }]}>{formatCurrency(booking.totalPrice)}</Text>
                  {isEvent && <Ionicons name="qr-code-outline" size={16} color={COLORS.textMuted} />}
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
