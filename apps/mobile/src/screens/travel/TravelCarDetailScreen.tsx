import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Image, TextInput } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { fetchApi } from '../../utils/api';
import { useTheme } from '../../context/ThemeContext';
import { useThemedStyles } from '../../theme/useThemedStyles';

function daysBetween(a: string, b: string) {
  const d1 = new Date(a).getTime();
  const d2 = new Date(b).getTime();
  if (isNaN(d1) || isNaN(d2) || d2 <= d1) return 0;
  return Math.round((d2 - d1) / (24 * 60 * 60 * 1000));
}

export default function TravelCarDetailScreen({ navigation, route }: any) {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { COLORS, SPACING, GRADIENTS } = theme;
  const styles = useThemedStyles(({ COLORS, TYPOGRAPHY, SPACING }) => ({
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
  const { carId } = route.params;
  const [car, setCar] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [pickupDate, setPickupDate] = useState('');
  const [returnDate, setReturnDate] = useState('');
  const [booking, setBooking] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetchApi(`/travel/cars/${carId}`).then(r => r.json()).then(setCar).catch(() => {}).finally(() => setLoading(false));
  }, [carId]);

  const days = daysBetween(pickupDate, returnDate);
  const total = car && days > 0 ? (car.pricePerDay * days).toFixed(2) : null;

  const book = async () => {
    setError('');
    if (!pickupDate || !returnDate) { setError('Enter pickup and return dates (YYYY-MM-DD)'); return; }
    if (days <= 0) { setError('Return date must be after pickup date'); return; }
    setBooking(true);
    try {
      const res = await fetchApi(`/travel/cars/${carId}/book`, {
        method: 'POST',
        body: JSON.stringify({ pickupDate, returnDate }),
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
  if (!car) return <View style={styles.center}><Text style={{ color: COLORS.textMuted }}>Car not found</Text></View>;

  if (success) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.successWrap}>
          <View style={styles.successIcon}><Ionicons name="checkmark" size={40} color="#fff" /></View>
          <Text style={styles.successTitle}>Booking confirmed!</Text>
          <Text style={styles.successSub}>{car.make} {car.model} · {days} day{days > 1 ? 's' : ''}</Text>
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
          {car.imageUrl ? (
            <Image source={{ uri: car.imageUrl }} style={styles.image} resizeMode="cover" />
          ) : (
            <LinearGradient colors={GRADIENTS.ocean} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.image}>
              <Ionicons name="car-sport" size={56} color="rgba(255,255,255,0.3)" />
            </LinearGradient>
          )}
        </View>

        <View style={styles.body}>
          <Text style={styles.name}>{car.make} {car.model}</Text>
          <View style={styles.metaRow}>
            <Ionicons name="location-outline" size={14} color={COLORS.textMuted} />
            <Text style={styles.metaText}>{car.location}</Text>
            <Ionicons name="star" size={13} color="#f59e0b" style={{ marginLeft: 8 }} />
            <Text style={styles.metaText}>{car.rating?.toFixed(1) || '5.0'}</Text>
          </View>
          <Text style={styles.hostText}>Hosted by {car.host?.profile?.displayName || car.host?.username}</Text>

          <View style={styles.badgeRow}>
            <View style={styles.badge}>
              <Ionicons name="pricetag-outline" size={13} color="#8B5CF6" />
              <Text style={styles.badgeText}>{car.category}</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Pickup & return</Text>
            <View style={styles.dateRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.dateLabel}>Pickup</Text>
                <TextInput style={styles.dateInput} placeholder="YYYY-MM-DD" placeholderTextColor={COLORS.textMuted} value={pickupDate} onChangeText={setPickupDate} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.dateLabel}>Return</Text>
                <TextInput style={styles.dateInput} placeholder="YYYY-MM-DD" placeholderTextColor={COLORS.textMuted} value={returnDate} onChangeText={setReturnDate} />
              </View>
            </View>
          </View>

          {total && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>{car.pricePerDay.toFixed(0)} MSH × {days} day{days > 1 ? 's' : ''}</Text>
              <Text style={styles.totalValue}>{total} MSH</Text>
            </View>
          )}

          {error ? <Text style={styles.errorText}>{error}</Text> : null}
        </View>
      </ScrollView>

      <View style={[styles.actionBar, { paddingBottom: insets.bottom + SPACING.lg }]}>
        <TouchableOpacity style={styles.bookBtn} onPress={book} disabled={booking}>
          {booking ? <ActivityIndicator color="#fff" /> : <Text style={styles.bookBtnText}>{total ? `Book · ${total} MSH` : 'Book Car'}</Text>}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
