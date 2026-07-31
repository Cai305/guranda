import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import { COLORS, TYPOGRAPHY, SPACING } from '../../theme';
import { fetchApi } from '../../utils/api';

export default function EventTicketsScreen({ navigation, route }: any) {
  const { bookingId } = route.params;
  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchApi(`/entertainment/bookings/${bookingId}/tickets`)
      .then(async r => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.message || 'Failed to load tickets');
        setBooking(data);
      })
      .catch(e => setError(e.message || 'Failed to load tickets'))
      .finally(() => setLoading(false));
  }, [bookingId]);

  if (loading) return <View style={styles.center}><ActivityIndicator color={COLORS.primary} size="large" /></View>;
  if (error || !booking) return <View style={styles.center}><Text style={{ color: COLORS.textMuted }}>{error || 'Booking not found'}</Text></View>;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{booking.event.title}</Text>
        <View style={{ width: 30 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: SPACING.lg, gap: 16, paddingBottom: 40 }}>
        <Text style={styles.subMeta}>{booking.event.venue}, {booking.event.city}</Text>
        <Text style={styles.subMeta}>{new Date(booking.event.startsAt).toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</Text>

        {booking.ticketItems.map((ticket: any, i: number) => (
          <View key={ticket.id} style={styles.ticketCard}>
            <Text style={styles.ticketLabel}>Ticket {i + 1} of {booking.ticketItems.length}</Text>
            <View style={styles.qrWrapper}>
              <QRCode value={ticket.code} size={180} color={COLORS.background} backgroundColor={COLORS.text} />
            </View>
            <Text style={styles.ticketCode}>{ticket.code}</Text>
            {ticket.checkedIn ? (
              <View style={styles.checkedInPill}>
                <Ionicons name="checkmark-circle" size={14} color="#22c55e" />
                <Text style={styles.checkedInText}>Checked in {new Date(ticket.checkedInAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</Text>
              </View>
            ) : (
              <Text style={styles.pendingText}>Not checked in yet</Text>
            )}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background, padding: SPACING.lg },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.lg, paddingVertical: 12 },
  back: { padding: 4 },
  headerTitle: { ...TYPOGRAPHY.h3, flex: 1, textAlign: 'center', fontWeight: '700' },
  subMeta: { color: COLORS.textMuted, fontSize: 13 },
  ticketCard: {
    backgroundColor: COLORS.surface, borderRadius: 16, borderWidth: 1, borderColor: COLORS.border,
    padding: 20, alignItems: 'center', gap: 10,
  },
  ticketLabel: { color: COLORS.textMuted, fontSize: 12, fontWeight: '700', textTransform: 'uppercase' },
  qrWrapper: { padding: 16, backgroundColor: COLORS.text, borderRadius: 16 },
  ticketCode: { color: COLORS.text, fontSize: 18, fontWeight: '800', letterSpacing: 2 },
  checkedInPill: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#22c55e22', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
  checkedInText: { color: '#22c55e', fontSize: 11, fontWeight: '700' },
  pendingText: { color: COLORS.textMuted, fontSize: 12 },
});
