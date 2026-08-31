import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Image } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useThemedStyles } from '../../theme/useThemedStyles';
import { fetchApi } from '../../utils/api';

export default function TravelPackageDetailScreen({ navigation, route }: any) {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { COLORS, GRADIENTS, SPACING } = theme;
  const styles = useThemedStyles(({ COLORS, SPACING, TYPOGRAPHY }) => ({
    container: { flex: 1, backgroundColor: COLORS.background },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },
    imageWrap: { position: 'relative' },
    image: { width: '100%', height: 220, justifyContent: 'center', alignItems: 'center' },
    backBtn: { position: 'absolute', top: 16, left: 16, backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: 20, padding: 8, zIndex: 2 },
    body: { padding: SPACING.lg },
    name: { ...TYPOGRAPHY.h2, marginBottom: 8 },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 16 },
    metaText: { color: COLORS.textMuted, fontSize: 13 },
    section: { marginBottom: 20 },
    sectionTitle: { ...TYPOGRAPHY.label, fontSize: 11, marginBottom: 10 },
    desc: { color: COLORS.textMuted, fontSize: 14, lineHeight: 21 },
    includeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
    includeText: { color: COLORS.text, fontSize: 13 },
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
  const { packageId } = route.params;
  const [pkg, setPkg] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [travelers, setTravelers] = useState(1);
  const [booking, setBooking] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetchApi(`/travel/packages/${packageId}`).then(r => r.json()).then(setPkg).catch(() => {}).finally(() => setLoading(false));
  }, [packageId]);

  const total = pkg ? (pkg.price * travelers).toFixed(2) : null;

  const book = async () => {
    setError('');
    setBooking(true);
    try {
      const res = await fetchApi(`/travel/packages/${packageId}/book`, {
        method: 'POST',
        body: JSON.stringify({ travelers }),
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
  if (!pkg) return <View style={styles.center}><Text style={{ color: COLORS.textMuted }}>Package not found</Text></View>;

  if (success) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.successWrap}>
          <View style={styles.successIcon}><Ionicons name="checkmark" size={40} color="#fff" /></View>
          <Text style={styles.successTitle}>Holiday booked!</Text>
          <Text style={styles.successSub}>{pkg.title} · {travelers} traveler{travelers > 1 ? 's' : ''}</Text>
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
          {pkg.imageUrl ? (
            <Image source={{ uri: pkg.imageUrl }} style={styles.image} resizeMode="cover" />
          ) : (
            <LinearGradient colors={GRADIENTS.sunset} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.image}>
              <Ionicons name="sunny" size={56} color="rgba(255,255,255,0.3)" />
            </LinearGradient>
          )}
        </View>

        <View style={styles.body}>
          <Text style={styles.name}>{pkg.title}</Text>
          <View style={styles.metaRow}>
            <Ionicons name="location-outline" size={14} color={COLORS.textMuted} />
            <Text style={styles.metaText}>{pkg.destination}</Text>
            <Ionicons name="calendar-outline" size={13} color={COLORS.textMuted} style={{ marginLeft: 8 }} />
            <Text style={styles.metaText}>{pkg.durationDays} days</Text>
          </View>

          {pkg.description && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>About this trip</Text>
              <Text style={styles.desc}>{pkg.description}</Text>
            </View>
          )}

          {pkg.includes?.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>What's included</Text>
              {pkg.includes.map((inc: string) => (
                <View key={inc} style={styles.includeRow}>
                  <Ionicons name="checkmark-circle" size={16} color="#22c55e" />
                  <Text style={styles.includeText}>{inc}</Text>
                </View>
              ))}
            </View>
          )}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Travelers</Text>
            <View style={styles.qtyRow}>
              <TouchableOpacity style={styles.qtyBtn} onPress={() => setTravelers(t => Math.max(1, t - 1))}>
                <Ionicons name="remove" size={18} color="#8B5CF6" />
              </TouchableOpacity>
              <Text style={styles.qtyText}>{travelers}</Text>
              <TouchableOpacity style={styles.qtyBtn} onPress={() => setTravelers(t => t + 1)}>
                <Ionicons name="add" size={18} color="#8B5CF6" />
              </TouchableOpacity>
            </View>
          </View>

          {total && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>{pkg.price.toFixed(0)} MSH × {travelers} traveler{travelers > 1 ? 's' : ''}</Text>
              <Text style={styles.totalValue}>{total} MSH</Text>
            </View>
          )}

          {error ? <Text style={styles.errorText}>{error}</Text> : null}
        </View>
      </ScrollView>

      <View style={[styles.actionBar, { paddingBottom: insets.bottom + SPACING.lg }]}>
        <TouchableOpacity style={styles.bookBtn} onPress={book} disabled={booking}>
          {booking ? <ActivityIndicator color="#fff" /> : <Text style={styles.bookBtnText}>{total ? `Book · ${total} MSH` : 'Book Holiday'}</Text>}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
