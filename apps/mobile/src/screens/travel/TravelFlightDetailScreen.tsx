import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { fetchApi } from '../../utils/api';
import { useTheme } from '../../context/ThemeContext';
import { useThemedStyles } from '../../theme/useThemedStyles';

const fmt = (iso: string) => new Date(iso).toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

export default function TravelFlightDetailScreen({ navigation, route }: any) {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { COLORS, SPACING } = theme;
  const styles = useThemedStyles(({ COLORS, TYPOGRAPHY, SPACING }) => ({
    container: { flex: 1, backgroundColor: COLORS.background },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.lg, paddingVertical: 12 },
    back: { padding: 4 },
    headerTitle: { ...TYPOGRAPHY.h2, flex: 1, textAlign: 'center' },
    routeCard: { backgroundColor: COLORS.surface, borderRadius: 16, padding: 18, borderWidth: 1, borderColor: COLORS.border, marginBottom: 20 },
    routeRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    city: { color: COLORS.text, fontSize: 18, fontWeight: '800' },
    time: { color: COLORS.textMuted, fontSize: 12, marginTop: 2 },
    divider: { height: 1, backgroundColor: COLORS.border, marginVertical: 12 },
    airline: { color: COLORS.text, fontSize: 13, fontWeight: '600', marginBottom: 4 },
    seats: { color: COLORS.textMuted, fontSize: 12 },
    section: { marginBottom: 20 },
    sectionTitle: { ...TYPOGRAPHY.label, fontSize: 11, marginBottom: 10 },
    qtyRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
    qtyBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, justifyContent: 'center', alignItems: 'center' },
    qtyText: { color: COLORS.text, fontWeight: '700', fontSize: 17, minWidth: 24, textAlign: 'center' },
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
  const { flightId } = route.params;
  const [flight, setFlight] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [passengers, setPassengers] = useState('1');
  const [booking, setBooking] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetchApi(`/travel/flights/${flightId}`).then(r => r.json()).then(setFlight).catch(() => {}).finally(() => setLoading(false));
  }, [flightId]);

  const pax = Math.max(1, Number(passengers) || 1);
  const total = flight ? (flight.price * pax).toFixed(2) : null;

  const book = async () => {
    setError('');
    setBooking(true);
    try {
      const res = await fetchApi(`/travel/flights/${flightId}/book`, {
        method: 'POST',
        body: JSON.stringify({ passengers: pax }),
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
  if (!flight) return <View style={styles.center}><Text style={{ color: COLORS.textMuted }}>Flight not found</Text></View>;

  if (success) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.successWrap}>
          <View style={styles.successIcon}><Ionicons name="checkmark" size={40} color="#fff" /></View>
          <Text style={styles.successTitle}>Flight booked!</Text>
          <Text style={styles.successSub}>{flight.origin} → {flight.destination} · {pax} passenger{pax > 1 ? 's' : ''}</Text>
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
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Flight details</Text>
        <View style={{ width: 30 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: SPACING.lg, paddingBottom: 40 }}>
        <View style={styles.routeCard}>
          <View style={styles.routeRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.city}>{flight.origin}</Text>
              <Text style={styles.time}>{fmt(flight.departureTime)}</Text>
            </View>
            <Ionicons name="airplane" size={22} color="#8B5CF6" />
            <View style={{ flex: 1, alignItems: 'flex-end' }}>
              <Text style={styles.city}>{flight.destination}</Text>
              <Text style={styles.time}>{fmt(flight.arrivalTime)}</Text>
            </View>
          </View>
          <View style={styles.divider} />
          <Text style={styles.airline}>{flight.airline} · {flight.flightNumber}</Text>
          <Text style={styles.seats}>{flight.seatsAvailable} seats available</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Passengers</Text>
          <View style={styles.qtyRow}>
            <TouchableOpacity style={styles.qtyBtn} onPress={() => setPassengers(String(Math.max(1, pax - 1)))}>
              <Ionicons name="remove" size={18} color="#8B5CF6" />
            </TouchableOpacity>
            <Text style={styles.qtyText}>{pax}</Text>
            <TouchableOpacity style={styles.qtyBtn} onPress={() => setPassengers(String(pax + 1))}>
              <Ionicons name="add" size={18} color="#8B5CF6" />
            </TouchableOpacity>
          </View>
        </View>

        {total && (
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>{flight.price.toFixed(0)} MSH × {pax} passenger{pax > 1 ? 's' : ''}</Text>
            <Text style={styles.totalValue}>{total} MSH</Text>
          </View>
        )}

        {error ? <Text style={styles.errorText}>{error}</Text> : null}
      </ScrollView>

      <View style={[styles.actionBar, { paddingBottom: insets.bottom + SPACING.lg }]}>
        <TouchableOpacity style={styles.bookBtn} onPress={book} disabled={booking}>
          {booking ? <ActivityIndicator color="#fff" /> : <Text style={styles.bookBtnText}>{total ? `Book · ${total} MSH` : 'Book Flight'}</Text>}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
