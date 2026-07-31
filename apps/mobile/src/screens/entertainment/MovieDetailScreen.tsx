import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, TYPOGRAPHY, SPACING, GRADIENTS } from '../../theme';
import { fetchApi } from '../../utils/api';

const fmt = (iso: string) => new Date(iso).toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

export default function MovieDetailScreen({ navigation, route }: any) {
  const { movieId } = route.params;
  const [movie, setMovie] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showtimeId, setShowtimeId] = useState<string | null>(null);
  const [seats, setSeats] = useState(1);
  const [booking, setBooking] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetchApi(`/entertainment/movies/${movieId}`).then(r => r.json()).then(m => {
      setMovie(m);
      if (m.showtimes?.length > 0) setShowtimeId(m.showtimes[0].id);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [movieId]);

  const showtime = movie?.showtimes?.find((s: any) => s.id === showtimeId);
  const total = showtime ? (showtime.price * seats).toFixed(2) : null;

  const book = async () => {
    if (!showtimeId) return;
    setError('');
    setBooking(true);
    try {
      const res = await fetchApi(`/entertainment/movies/showtimes/${showtimeId}/book`, {
        method: 'POST',
        body: JSON.stringify({ seats }),
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
  if (!movie) return <View style={styles.center}><Text style={{ color: COLORS.textMuted }}>Movie not found</Text></View>;

  if (success) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.successWrap}>
          <View style={styles.successIcon}><Ionicons name="checkmark" size={40} color="#fff" /></View>
          <Text style={styles.successTitle}>Tickets booked!</Text>
          <Text style={styles.successSub}>{movie.title} · {seats} seat{seats > 1 ? 's' : ''}</Text>
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
          {movie.posterUrl ? (
            <Image source={{ uri: movie.posterUrl }} style={styles.image} resizeMode="cover" />
          ) : (
            <LinearGradient colors={GRADIENTS.sunset} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.image}>
              <Ionicons name="film" size={56} color="rgba(255,255,255,0.3)" />
            </LinearGradient>
          )}
        </View>

        <View style={styles.body}>
          <Text style={styles.name}>{movie.title}</Text>
          <View style={styles.metaRow}>
            <View style={styles.badge}><Text style={styles.badgeText}>{movie.rating}</Text></View>
            <Text style={styles.metaText}>{movie.genre}</Text>
            <Ionicons name="time-outline" size={13} color={COLORS.textMuted} style={{ marginLeft: 8 }} />
            <Text style={styles.metaText}>{movie.durationMins} min</Text>
          </View>

          {movie.synopsis && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Synopsis</Text>
              <Text style={styles.desc}>{movie.synopsis}</Text>
            </View>
          )}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Showtimes</Text>
            {movie.showtimes.length === 0 ? (
              <Text style={styles.desc}>No upcoming showtimes.</Text>
            ) : (
              <View style={{ gap: 8 }}>
                {movie.showtimes.map((s: any) => (
                  <TouchableOpacity
                    key={s.id}
                    style={[styles.showtimeRow, showtimeId === s.id && styles.showtimeRowActive]}
                    onPress={() => setShowtimeId(s.id)}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.showtimeCinema}>{s.cinema}</Text>
                      <Text style={styles.showtimeTime}>{fmt(s.startsAt)}</Text>
                    </View>
                    <Text style={styles.showtimePrice}>{s.price.toFixed(0)} MSH</Text>
                    <Text style={styles.showtimeSeats}>{s.seatsAvailable} left</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {showtime && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Seats</Text>
              <View style={styles.qtyRow}>
                <TouchableOpacity style={styles.qtyBtn} onPress={() => setSeats(s => Math.max(1, s - 1))}>
                  <Ionicons name="remove" size={18} color="#F97316" />
                </TouchableOpacity>
                <Text style={styles.qtyText}>{seats}</Text>
                <TouchableOpacity style={styles.qtyBtn} onPress={() => setSeats(s => Math.min(showtime.seatsAvailable, s + 1))}>
                  <Ionicons name="add" size={18} color="#F97316" />
                </TouchableOpacity>
              </View>
            </View>
          )}

          {total && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>{showtime.price.toFixed(0)} MSH × {seats} seat{seats > 1 ? 's' : ''}</Text>
              <Text style={styles.totalValue}>{total} MSH</Text>
            </View>
          )}

          {error ? <Text style={styles.errorText}>{error}</Text> : null}
        </View>
      </ScrollView>

      <View style={styles.actionBar}>
        <TouchableOpacity style={styles.bookBtn} onPress={book} disabled={booking || !showtimeId}>
          {booking ? <ActivityIndicator color="#fff" /> : <Text style={styles.bookBtnText}>{total ? `Book · ${total} MSH` : 'Select a showtime'}</Text>}
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
  name: { ...TYPOGRAPHY.h2, marginBottom: 8 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 16 },
  badge: { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  badgeText: { color: COLORS.text, fontSize: 11, fontWeight: '700' },
  metaText: { color: COLORS.textMuted, fontSize: 13 },
  section: { marginBottom: 20 },
  sectionTitle: { ...TYPOGRAPHY.label, fontSize: 11, marginBottom: 10 },
  desc: { color: COLORS.textMuted, fontSize: 14, lineHeight: 21 },
  showtimeRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: COLORS.surface, borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: COLORS.border,
  },
  showtimeRowActive: { borderColor: '#F97316', backgroundColor: 'rgba(249,115,22,0.08)' },
  showtimeCinema: { color: COLORS.text, fontWeight: '700', fontSize: 13 },
  showtimeTime: { color: COLORS.textMuted, fontSize: 11.5, marginTop: 2 },
  showtimePrice: { color: '#F97316', fontWeight: '800', fontSize: 14 },
  showtimeSeats: { color: COLORS.textMuted, fontSize: 10.5, marginLeft: 6 },
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  qtyBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, justifyContent: 'center', alignItems: 'center' },
  qtyText: { color: COLORS.text, fontWeight: '700', fontSize: 17, minWidth: 24, textAlign: 'center' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: COLORS.surface, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: COLORS.border, marginBottom: 12 },
  totalLabel: { color: COLORS.textMuted, fontSize: 13 },
  totalValue: { color: '#F97316', fontWeight: '800', fontSize: 16 },
  errorText: { color: '#ef4444', fontSize: 13 },
  actionBar: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: SPACING.lg, backgroundColor: COLORS.background, borderTopWidth: 1, borderTopColor: COLORS.border },
  bookBtn: { backgroundColor: '#F97316', borderRadius: 14, paddingVertical: 15, alignItems: 'center' },
  bookBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  successWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: SPACING.lg, gap: 12 },
  successIcon: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#22c55e', justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  successTitle: { ...TYPOGRAPHY.h2 },
  successSub: { color: COLORS.textMuted, fontSize: 14, marginBottom: 16 },
  successBtn: { backgroundColor: '#F97316', borderRadius: 14, paddingVertical: 14, paddingHorizontal: 32 },
  successBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  successLink: { color: COLORS.textMuted, fontSize: 13, marginTop: 12 },
});
