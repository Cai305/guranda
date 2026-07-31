import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, TYPOGRAPHY, SPACING, GRADIENTS } from '../../theme';
import { fetchApi } from '../../utils/api';

const fmt = (iso: string) => new Date(iso).toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

export default function ConcertDetailScreen({ navigation, route }: any) {
  const { concertId } = route.params;
  const [concert, setConcert] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tickets, setTickets] = useState(1);
  const [booking, setBooking] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetchApi(`/entertainment/concerts/${concertId}`).then(r => r.json()).then(setConcert).catch(() => {}).finally(() => setLoading(false));
  }, [concertId]);

  const total = concert ? (concert.price * tickets).toFixed(2) : null;

  const book = async () => {
    setError('');
    setBooking(true);
    try {
      const res = await fetchApi(`/entertainment/concerts/${concertId}/book`, {
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
  if (!concert) return <View style={styles.center}><Text style={{ color: COLORS.textMuted }}>Concert not found</Text></View>;

  if (success) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.successWrap}>
          <View style={styles.successIcon}><Ionicons name="checkmark" size={40} color="#fff" /></View>
          <Text style={styles.successTitle}>Tickets booked!</Text>
          <Text style={styles.successSub}>{concert.title} · {tickets} ticket{tickets > 1 ? 's' : ''}</Text>
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
          {concert.posterUrl ? (
            <Image source={{ uri: concert.posterUrl }} style={styles.image} resizeMode="cover" />
          ) : (
            <LinearGradient colors={GRADIENTS.crimson} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.image}>
              <Ionicons name="musical-notes" size={56} color="rgba(255,255,255,0.3)" />
            </LinearGradient>
          )}
        </View>

        <View style={styles.body}>
          <Text style={styles.name}>{concert.title}</Text>
          <Text style={styles.artist}>{concert.artist} · {concert.genre}</Text>
          <View style={styles.metaRow}>
            <Ionicons name="location-outline" size={14} color={COLORS.textMuted} />
            <Text style={styles.metaText}>{concert.venue}, {concert.city}</Text>
          </View>
          <View style={styles.metaRow}>
            <Ionicons name="calendar-outline" size={13} color={COLORS.textMuted} />
            <Text style={styles.metaText}>{fmt(concert.startsAt)}</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Tickets</Text>
            <View style={styles.qtyRow}>
              <TouchableOpacity style={styles.qtyBtn} onPress={() => setTickets(t => Math.max(1, t - 1))}>
                <Ionicons name="remove" size={18} color="#EF4444" />
              </TouchableOpacity>
              <Text style={styles.qtyText}>{tickets}</Text>
              <TouchableOpacity style={styles.qtyBtn} onPress={() => setTickets(t => Math.min(concert.ticketsAvailable, t + 1))}>
                <Ionicons name="add" size={18} color="#EF4444" />
              </TouchableOpacity>
            </View>
            <Text style={styles.availableText}>{concert.ticketsAvailable} tickets available</Text>
          </View>

          {total && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>{concert.price.toFixed(0)} MSH × {tickets} ticket{tickets > 1 ? 's' : ''}</Text>
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
  artist: { color: '#EF4444', fontSize: 14, fontWeight: '700', marginBottom: 12 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  metaText: { color: COLORS.textMuted, fontSize: 13 },
  section: { marginTop: 14, marginBottom: 20 },
  sectionTitle: { ...TYPOGRAPHY.label, fontSize: 11, marginBottom: 10 },
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  qtyBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, justifyContent: 'center', alignItems: 'center' },
  qtyText: { color: COLORS.text, fontWeight: '700', fontSize: 17, minWidth: 24, textAlign: 'center' },
  availableText: { color: COLORS.textMuted, fontSize: 12, marginTop: 8 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: COLORS.surface, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: COLORS.border, marginBottom: 12 },
  totalLabel: { color: COLORS.textMuted, fontSize: 13 },
  totalValue: { color: '#EF4444', fontWeight: '800', fontSize: 16 },
  errorText: { color: '#ef4444', fontSize: 13 },
  actionBar: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: SPACING.lg, backgroundColor: COLORS.background, borderTopWidth: 1, borderTopColor: COLORS.border },
  bookBtn: { backgroundColor: '#EF4444', borderRadius: 14, paddingVertical: 15, alignItems: 'center' },
  bookBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  successWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: SPACING.lg, gap: 12 },
  successIcon: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#22c55e', justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  successTitle: { ...TYPOGRAPHY.h2 },
  successSub: { color: COLORS.textMuted, fontSize: 14, marginBottom: 16 },
  successBtn: { backgroundColor: '#EF4444', borderRadius: 14, paddingVertical: 14, paddingHorizontal: 32 },
  successBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  successLink: { color: COLORS.textMuted, fontSize: 13, marginTop: 12 },
});
