import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, TYPOGRAPHY, SPACING, GRADIENTS } from '../../theme';
import { fetchApi } from '../../utils/api';

const fmt = (iso: string) => new Date(iso).toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

export default function EventDetailScreen({ navigation, route }: any) {
  const { eventId } = route.params;
  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tickets, setTickets] = useState(1);
  const [booking, setBooking] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetchApi(`/entertainment/events/${eventId}`).then(r => r.json()).then(setEvent).catch(() => {}).finally(() => setLoading(false));
  }, [eventId]);

  const total = event ? (event.price * tickets).toFixed(2) : null;

  const book = async () => {
    setError('');
    setBooking(true);
    try {
      const res = await fetchApi(`/entertainment/events/${eventId}/book`, {
        method: 'POST',
        body: JSON.stringify({ tickets }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Booking failed');
      }
      setSuccess(true);
    } catch (e: any) {
      setError(e.message || 'Something went wrong');
    } finally {
      setBooking(false);
    }
  };

  if (loading) return <View style={styles.center}><ActivityIndicator color={COLORS.primary} size="large" /></View>;
  if (!event) return <View style={styles.center}><Text style={{ color: COLORS.textMuted }}>Event not found</Text></View>;

  if (success) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.successWrap}>
          <View style={styles.successIcon}><Ionicons name="checkmark" size={40} color="#fff" /></View>
          <Text style={styles.successTitle}>Tickets booked!</Text>
          <Text style={styles.successSub}>{event.title} · {tickets} ticket{tickets > 1 ? 's' : ''}</Text>
          <TouchableOpacity style={styles.successBtn} onPress={() => navigation.navigate('MyEntertainmentBookings')}>
            <Text style={styles.successBtnText}>View My Bookings</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.successLink}>Back to browsing</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 140 }}>
        <View style={styles.imageWrap}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>
          {event.posterUrl ? (
            <Image source={{ uri: event.posterUrl }} style={styles.image} resizeMode="cover" />
          ) : (
            <LinearGradient colors={GRADIENTS.emerald} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.image}>
              <Ionicons name="ticket" size={56} color="rgba(255,255,255,0.3)" />
            </LinearGradient>
          )}
        </View>

        <View style={styles.body}>
          <Text style={styles.name}>{event.title}</Text>
          <Text style={styles.category}>{event.category}</Text>
          <View style={styles.metaRow}>
            <Ionicons name="location-outline" size={14} color={COLORS.textMuted} />
            <Text style={styles.metaText}>{event.venue}, {event.city}</Text>
          </View>
          <View style={styles.metaRow}>
            <Ionicons name="calendar-outline" size={13} color={COLORS.textMuted} />
            <Text style={styles.metaText}>{fmt(event.startsAt)}</Text>
          </View>

          {event.description && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>About this event</Text>
              <Text style={styles.desc}>{event.description}</Text>
            </View>
          )}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Tickets</Text>
            <View style={styles.qtyRow}>
              <TouchableOpacity style={styles.qtyBtn} onPress={() => setTickets(t => Math.max(1, t - 1))}>
                <Ionicons name="remove" size={18} color="#10B981" />
              </TouchableOpacity>
              <Text style={styles.qtyText}>{tickets}</Text>
              <TouchableOpacity style={styles.qtyBtn} onPress={() => setTickets(t => Math.min(event.ticketsAvailable, t + 1))}>
                <Ionicons name="add" size={18} color="#10B981" />
              </TouchableOpacity>
            </View>
            <Text style={styles.availableText}>{event.ticketsAvailable} tickets available</Text>
          </View>

          {total && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>{event.price.toFixed(0)} MSH × {tickets} ticket{tickets > 1 ? 's' : ''}</Text>
              <Text style={styles.totalValue}>{total} MSH</Text>
            </View>
          )}

          {error ? <Text style={styles.errorText}>{error}</Text> : null}
        </View>
      </ScrollView>

      <View style={styles.actionBar}>
        <TouchableOpacity style={styles.bookBtn} onPress={book} disabled={booking}>
          {booking ? <ActivityIndicator color="#fff" /> : <Text style={styles.bookBtnText}>{total ? `Book · ${total} MSH` : 'Book Tickets'}</Text>}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },
  imageWrap: { position: 'relative' },
  image: { width: '100%', height: 260, justifyContent: 'center', alignItems: 'center' },
  backBtn: { position: 'absolute', top: 16, left: 16, backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: 20, padding: 8, zIndex: 2 },
  body: { padding: SPACING.lg },
  name: { ...TYPOGRAPHY.h2, marginBottom: 4 },
  category: { color: '#10B981', fontSize: 14, fontWeight: '700', marginBottom: 12 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  metaText: { color: COLORS.textMuted, fontSize: 13 },
  section: { marginTop: 14, marginBottom: 20 },
  sectionTitle: { ...TYPOGRAPHY.label, fontSize: 11, marginBottom: 10 },
  desc: { color: COLORS.textMuted, fontSize: 14, lineHeight: 21 },
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  qtyBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, justifyContent: 'center', alignItems: 'center' },
  qtyText: { color: COLORS.text, fontWeight: '700', fontSize: 17, minWidth: 24, textAlign: 'center' },
  availableText: { color: COLORS.textMuted, fontSize: 12, marginTop: 8 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: COLORS.surface, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: COLORS.border, marginBottom: 12 },
  totalLabel: { color: COLORS.textMuted, fontSize: 13 },
  totalValue: { color: '#10B981', fontWeight: '800', fontSize: 16 },
  errorText: { color: '#ef4444', fontSize: 13 },
  actionBar: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: SPACING.lg, backgroundColor: COLORS.background, borderTopWidth: 1, borderTopColor: COLORS.border },
  bookBtn: { backgroundColor: '#10B981', borderRadius: 14, paddingVertical: 15, alignItems: 'center' },
  bookBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  successWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: SPACING.lg, gap: 12 },
  successIcon: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#22c55e', justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  successTitle: { ...TYPOGRAPHY.h2 },
  successSub: { color: COLORS.textMuted, fontSize: 14, marginBottom: 16 },
  successBtn: { backgroundColor: '#10B981', borderRadius: 14, paddingVertical: 14, paddingHorizontal: 32 },
  successBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  successLink: { color: COLORS.textMuted, fontSize: 13, marginTop: 12 },
});
