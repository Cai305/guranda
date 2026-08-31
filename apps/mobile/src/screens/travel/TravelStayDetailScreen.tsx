import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Image, TextInput } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useThemedStyles } from '../../theme/useThemedStyles';
import { fetchApi } from '../../utils/api';

function nightsBetween(a: string, b: string) {
  const d1 = new Date(a).getTime();
  const d2 = new Date(b).getTime();
  if (isNaN(d1) || isNaN(d2) || d2 <= d1) return 0;
  return Math.round((d2 - d1) / (24 * 60 * 60 * 1000));
}

export default function TravelStayDetailScreen({ navigation, route }: any) {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { COLORS, GRADIENTS, SPACING } = theme;
  const styles = useThemedStyles(({ COLORS, SPACING, TYPOGRAPHY }) => ({
    container: { flex: 1, backgroundColor: COLORS.background },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },
    imageWrap: { position: 'relative' },
    image: { width: '100%', height: 240, justifyContent: 'center', alignItems: 'center' },
    backBtn: { position: 'absolute', top: 16, left: 16, backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: 20, padding: 8, zIndex: 2 },
    body: { padding: SPACING.lg },
    name: { ...TYPOGRAPHY.h2, marginBottom: 8 },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 },
    metaText: { color: COLORS.textMuted, fontSize: 13 },
    hostText: { color: COLORS.textMuted, fontSize: 12, marginBottom: 12 },
    badgeRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
    badge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.surface, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: COLORS.border },
    badgeText: { color: COLORS.text, fontSize: 12, fontWeight: '600' },
    section: { marginBottom: 20 },
    sectionTitle: { ...TYPOGRAPHY.label, fontSize: 11, marginBottom: 10 },
    amenityChip: { backgroundColor: COLORS.surface, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: COLORS.border },
    amenityText: { color: COLORS.text, fontSize: 12 },
    desc: { color: COLORS.textMuted, fontSize: 14, lineHeight: 21 },
    dateRow: { flexDirection: 'row', gap: 12 },
    dateLabel: { color: COLORS.textMuted, fontSize: 12, marginBottom: 6 },
    dateInput: { backgroundColor: COLORS.surface, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, padding: 12, color: COLORS.text, fontSize: 14 },
    totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: COLORS.surface, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: COLORS.border, marginBottom: 12 },
    totalLabel: { color: COLORS.textMuted, fontSize: 13 },
    totalValue: { color: '#8B5CF6', fontWeight: '800', fontSize: 16 },
    errorText: { color: '#ef4444', fontSize: 13 },
    // paddingBottom set dynamically via insets in JSX — a flat SPACING.lg
    // leaves the button flush against the home indicator / gesture bar on
    // notched devices with no clearance from it.
    actionBar: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: SPACING.lg, backgroundColor: COLORS.background, borderTopWidth: 1, borderTopColor: COLORS.border },
    bookBtn: { backgroundColor: '#8B5CF6', borderRadius: 14, paddingVertical: 15, alignItems: 'center' },
    bookBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
    successWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: SPACING.lg, gap: 12 },
    successIcon: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#22c55e', justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
    successTitle: { ...TYPOGRAPHY.h2 },
    successSub: { color: COLORS.textMuted, fontSize: 14, marginBottom: 16 },
    successBtn: { backgroundColor: '#8B5CF6', borderRadius: 14, paddingVertical: 14, paddingHorizontal: 32 },
    successBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
    successLink: { color: COLORS.textMuted, fontSize: 13, marginTop: 12 },
  }));
  const { stayId } = route.params;
  const [stay, setStay] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [guests, setGuests] = useState('1');
  const [booking, setBooking] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetchApi(`/travel/stays/${stayId}`).then(r => r.json()).then(setStay).catch(() => {}).finally(() => setLoading(false));
  }, [stayId]);

  const nights = nightsBetween(checkIn, checkOut);
  const total = stay && nights > 0 ? (stay.pricePerNight * nights).toFixed(2) : null;

  const book = async () => {
    setError('');
    if (!checkIn || !checkOut) { setError('Enter check-in and check-out dates (YYYY-MM-DD)'); return; }
    if (nights <= 0) { setError('Check-out must be after check-in'); return; }
    setBooking(true);
    try {
      const res = await fetchApi(`/travel/stays/${stayId}/book`, {
        method: 'POST',
        body: JSON.stringify({ checkIn, checkOut, guests: Number(guests) || 1 }),
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
  if (!stay) return <View style={styles.center}><Text style={{ color: COLORS.textMuted }}>Stay not found</Text></View>;

  if (success) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.successWrap}>
          <View style={styles.successIcon}><Ionicons name="checkmark" size={40} color="#fff" /></View>
          <Text style={styles.successTitle}>Booking confirmed!</Text>
          <Text style={styles.successSub}>{stay.title} · {nights} night{nights > 1 ? 's' : ''}</Text>
          <TouchableOpacity style={styles.successBtn} onPress={() => navigation.navigate('TravelTrips')}>
            <Text style={styles.successBtnText}>View My Trips</Text>
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
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={styles.imageWrap}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>
          {stay.imageUrl ? (
            <Image source={{ uri: stay.imageUrl }} style={styles.image} resizeMode="cover" />
          ) : (
            <LinearGradient colors={GRADIENTS.midnight} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.image}>
              <Ionicons name="bed" size={56} color="rgba(255,255,255,0.3)" />
            </LinearGradient>
          )}
        </View>

        <View style={styles.body}>
          <Text style={styles.name}>{stay.title}</Text>
          <View style={styles.metaRow}>
            <Ionicons name="location-outline" size={14} color={COLORS.textMuted} />
            <Text style={styles.metaText}>{stay.location}</Text>
            <Ionicons name="star" size={13} color="#f59e0b" style={{ marginLeft: 8 }} />
            <Text style={styles.metaText}>{stay.rating?.toFixed(1) || '5.0'}</Text>
          </View>
          <Text style={styles.hostText}>Hosted by {stay.host?.profile?.displayName || stay.host?.username}</Text>

          <View style={styles.badgeRow}>
            <View style={styles.badge}>
              <Ionicons name="people-outline" size={13} color="#8B5CF6" />
              <Text style={styles.badgeText}>Up to {stay.maxGuests} guests</Text>
            </View>
          </View>

          {stay.amenities?.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Amenities</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {stay.amenities.map((a: string) => (
                  <View key={a} style={styles.amenityChip}><Text style={styles.amenityText}>{a}</Text></View>
                ))}
              </View>
            </View>
          )}

          {stay.description && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>About this stay</Text>
              <Text style={styles.desc}>{stay.description}</Text>
            </View>
          )}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Pick your dates</Text>
            <View style={styles.dateRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.dateLabel}>Check-in</Text>
                <TextInput style={styles.dateInput} placeholder="YYYY-MM-DD" placeholderTextColor={COLORS.textMuted} value={checkIn} onChangeText={setCheckIn} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.dateLabel}>Check-out</Text>
                <TextInput style={styles.dateInput} placeholder="YYYY-MM-DD" placeholderTextColor={COLORS.textMuted} value={checkOut} onChangeText={setCheckOut} />
              </View>
            </View>
            <Text style={[styles.dateLabel, { marginTop: 12 }]}>Guests</Text>
            <TextInput style={styles.dateInput} placeholder="1" placeholderTextColor={COLORS.textMuted} value={guests} onChangeText={setGuests} keyboardType="number-pad" />
          </View>

          {total && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>{stay.pricePerNight.toFixed(0)} MSH × {nights} night{nights > 1 ? 's' : ''}</Text>
              <Text style={styles.totalValue}>{total} MSH</Text>
            </View>
          )}

          {error ? <Text style={styles.errorText}>{error}</Text> : null}
        </View>
      </ScrollView>

      <View style={[styles.actionBar, { paddingBottom: insets.bottom + SPACING.lg }]}>
        <TouchableOpacity style={styles.bookBtn} onPress={book} disabled={booking}>
          {booking ? <ActivityIndicator color="#fff" /> : <Text style={styles.bookBtnText}>{total ? `Book · ${total} MSH` : 'Book Stay'}</Text>}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
