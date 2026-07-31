import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Image, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, TYPOGRAPHY, SPACING, GRADIENTS } from '../../theme';
import { fetchApi } from '../../utils/api';
import SessionHeaderActions from '../../components/SessionHeaderActions';

type Tab = 'stays' | 'cars' | 'flights' | 'packages';

const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: 'stays', label: 'Stays', icon: 'bed' },
  { key: 'cars', label: 'Car Hire', icon: 'car-sport' },
  { key: 'flights', label: 'Flights', icon: 'airplane' },
  { key: 'packages', label: 'Holidays', icon: 'sunny' },
];

const dateStr = (iso: string) => new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

export default function TravelHomeScreen({ navigation }: any) {
  const [tab, setTab] = useState<Tab>('stays');
  const [search, setSearch] = useState('');
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { width } = useWindowDimensions();
  const cardWidth = (Math.min(width, 900) - SPACING.lg * 2 - 12) / 2;

  const load = useCallback(async (currentTab: Tab, query: string) => {
    setLoading(true);
    try {
      const endpoint = {
        stays: `/travel/stays${query ? `?location=${encodeURIComponent(query)}` : ''}`,
        cars: `/travel/cars${query ? `?location=${encodeURIComponent(query)}` : ''}`,
        flights: `/travel/flights${query ? `?destination=${encodeURIComponent(query)}` : ''}`,
        packages: `/travel/packages${query ? `?destination=${encodeURIComponent(query)}` : ''}`,
      }[currentTab];
      const res = await fetchApi(endpoint);
      const data = await res.json();
      setItems(Array.isArray(data) ? data : []);
    } catch { setItems([]); }
    setLoading(false);
  }, []);

  useEffect(() => {
    setItems([]);
    setLoading(true);
    const t = setTimeout(() => load(tab, search), search ? 300 : 0);
    return () => clearTimeout(t);
  }, [tab, search, load]);

  const openDetail = (item: any) => {
    const screens: Record<Tab, string> = {
      stays: 'TravelStayDetail',
      cars: 'TravelCarDetail',
      flights: 'TravelFlightDetail',
      packages: 'TravelPackageDetail',
    };
    const paramKeys: Record<Tab, string> = {
      stays: 'stayId',
      cars: 'carId',
      flights: 'flightId',
      packages: 'packageId',
    };
    navigation.navigate(screens[tab], { [paramKeys[tab]]: item.id });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <SessionHeaderActions
          navigation={navigation}
          session={{
            id: 'travel',
            label: 'Travel',
            icon: 'airplane',
            gradient: GRADIENTS.emerald,
            route: { name: 'Main', params: { screen: 'Life', params: { screen: 'TravelHome' } } },
          }}
        />
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Travel</Text>
          <Text style={styles.headerSub}>Flights, stays, cars & holidays</Text>
        </View>
        <TouchableOpacity style={styles.tripsBtn} onPress={() => navigation.navigate('TravelTrips')}>
          <Ionicons name="briefcase-outline" size={20} color={COLORS.text} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.tripsBtn} onPress={() => navigation.navigate('MyTravelListings')}>
          <Ionicons name="add-circle-outline" size={20} color={COLORS.text} />
        </TouchableOpacity>
      </View>

      <View style={styles.searchRow}>
        <Ionicons name="search" size={16} color={COLORS.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder={tab === 'stays' || tab === 'cars' ? 'Search by location…' : 'Search by destination…'}
          placeholderTextColor={COLORS.textMuted}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <LinearGradient colors={GRADIENTS.midnight} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.hero}>
        <Ionicons name="airplane" size={40} color="rgba(255,255,255,0.3)" style={styles.heroIcon} />
        <Text style={styles.heroTitle}>The world, one tap away</Text>
        <Text style={styles.heroSub}>Book with your Guranda wallet, everywhere</Text>
      </LinearGradient>

      <View style={styles.tabRow}>
        {TABS.map(t => (
          <TouchableOpacity
            key={t.key}
            style={[styles.tabChip, tab === t.key && styles.tabChipActive]}
            onPress={() => { setItems([]); setLoading(true); setTab(t.key); }}
          >
            <Ionicons name={t.icon as any} size={15} color={tab === t.key ? '#fff' : COLORS.textMuted} />
            <Text style={[styles.tabLabel, tab === t.key && styles.tabLabelActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        {loading ? (
          <ActivityIndicator color={COLORS.primary} style={{ marginTop: 40 }} />
        ) : items.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="compass-outline" size={48} color={COLORS.textMuted} />
            <Text style={styles.emptyText}>Nothing found</Text>
            <Text style={styles.emptySub}>Try a different search</Text>
          </View>
        ) : tab === 'stays' ? (
          <View style={styles.grid}>
            {items.map(stay => (
              <TouchableOpacity key={stay.id} style={[styles.card, { width: cardWidth }]} activeOpacity={0.85} onPress={() => openDetail(stay)}>
                {stay.imageUrl ? (
                  <Image source={{ uri: stay.imageUrl }} style={styles.cardImage} resizeMode="cover" />
                ) : (
                  <LinearGradient colors={GRADIENTS.midnight} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.cardImage}>
                    <Ionicons name="bed" size={28} color="rgba(255,255,255,0.4)" />
                  </LinearGradient>
                )}
                <View style={styles.cardInfo}>
                  <Text style={styles.cardName} numberOfLines={1}>{stay.title}</Text>
                  <Text style={styles.cardSub} numberOfLines={1}>{stay.location}</Text>
                  <View style={styles.cardMetaRow}>
                    <Ionicons name="star" size={11} color="#f59e0b" />
                    <Text style={styles.cardMeta}>{stay.rating?.toFixed(1) || '5.0'}</Text>
                    <Text style={styles.cardMeta}>· up to {stay.maxGuests} guests</Text>
                  </View>
                  <Text style={styles.cardPrice}>{stay.pricePerNight.toFixed(0)} MSH<Text style={styles.cardPriceUnit}>/night</Text></Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        ) : tab === 'cars' ? (
          <View style={styles.grid}>
            {items.map(car => (
              <TouchableOpacity key={car.id} style={[styles.card, { width: cardWidth }]} activeOpacity={0.85} onPress={() => openDetail(car)}>
                {car.imageUrl ? (
                  <Image source={{ uri: car.imageUrl }} style={styles.cardImage} resizeMode="cover" />
                ) : (
                  <LinearGradient colors={GRADIENTS.ocean} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.cardImage}>
                    <Ionicons name="car-sport" size={28} color="rgba(255,255,255,0.4)" />
                  </LinearGradient>
                )}
                <View style={styles.cardInfo}>
                  <Text style={styles.cardName} numberOfLines={1}>{car.make} {car.model}</Text>
                  <Text style={styles.cardSub} numberOfLines={1}>{car.category} · {car.location}</Text>
                  <View style={styles.cardMetaRow}>
                    <Ionicons name="star" size={11} color="#f59e0b" />
                    <Text style={styles.cardMeta}>{car.rating?.toFixed(1) || '5.0'}</Text>
                  </View>
                  <Text style={styles.cardPrice}>{car.pricePerDay.toFixed(0)} MSH<Text style={styles.cardPriceUnit}>/day</Text></Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        ) : tab === 'flights' ? (
          <View style={{ paddingHorizontal: SPACING.lg, gap: 10 }}>
            {items.map(flight => (
              <TouchableOpacity key={flight.id} style={styles.flightRow} activeOpacity={0.85} onPress={() => openDetail(flight)}>
                <View style={styles.flightIconWrap}>
                  <Ionicons name="airplane" size={20} color="#8B5CF6" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.flightRoute}>{flight.origin} → {flight.destination}</Text>
                  <Text style={styles.flightMeta}>{flight.airline} {flight.flightNumber} · {dateStr(flight.departureTime)}</Text>
                  <Text style={styles.flightMeta}>{flight.seatsAvailable} seats left</Text>
                </View>
                <Text style={styles.flightPrice}>{flight.price.toFixed(0)} MSH</Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <View style={{ paddingHorizontal: SPACING.lg, gap: 12 }}>
            {items.map(pkg => (
              <TouchableOpacity key={pkg.id} style={styles.packageCard} activeOpacity={0.85} onPress={() => openDetail(pkg)}>
                {pkg.imageUrl ? (
                  <Image source={{ uri: pkg.imageUrl }} style={styles.packageImage} resizeMode="cover" />
                ) : (
                  <LinearGradient colors={GRADIENTS.sunset} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.packageImage}>
                    <Ionicons name="sunny" size={32} color="rgba(255,255,255,0.4)" />
                  </LinearGradient>
                )}
                <View style={styles.packageInfo}>
                  <Text style={styles.packageTitle}>{pkg.title}</Text>
                  <Text style={styles.packageDest}>{pkg.destination} · {pkg.durationDays} days</Text>
                  {pkg.description && <Text style={styles.packageDesc} numberOfLines={2}>{pkg.description}</Text>}
                  <Text style={styles.packagePrice}>{pkg.price.toFixed(0)} MSH <Text style={styles.cardPriceUnit}>pp</Text></Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.lg, paddingVertical: 12, gap: 4 },
  back: { padding: 4, marginRight: 4 },
  headerCenter: { flex: 1 },
  headerTitle: { ...TYPOGRAPHY.h2 },
  headerSub: { color: COLORS.textMuted, fontSize: 12 },
  tripsBtn: { padding: 6 },
  searchRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: SPACING.lg, marginBottom: 12,
    backgroundColor: COLORS.surface, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 10,
    borderWidth: 1, borderColor: COLORS.border,
  },
  searchInput: { flex: 1, color: COLORS.text, fontSize: 14 },
  hero: { marginHorizontal: SPACING.lg, borderRadius: 16, padding: 20, marginBottom: 16, overflow: 'hidden' },
  heroIcon: { position: 'absolute', right: 16, top: 12 },
  heroTitle: { color: '#fff', fontSize: 20, fontWeight: '800', marginBottom: 4 },
  heroSub: { color: 'rgba(255,255,255,0.8)', fontSize: 13 },
  tabRow: { flexDirection: 'row', paddingHorizontal: SPACING.lg, gap: 8, marginBottom: 16 },
  tabChip: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5,
    paddingVertical: 9, borderRadius: 20,
    backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border,
  },
  tabChipActive: { backgroundColor: '#8B5CF6', borderColor: '#8B5CF6' },
  tabLabel: { color: COLORS.textMuted, fontSize: 11, fontWeight: '700' },
  tabLabelActive: { color: '#fff' },
  grid: {
    paddingHorizontal: SPACING.lg, gap: 12,
    flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between',
  },
  card: {
    backgroundColor: COLORS.surface, borderRadius: 16, overflow: 'hidden',
    borderWidth: 1, borderColor: COLORS.border, marginBottom: 12,
  },
  cardImage: { width: '100%', height: 110, justifyContent: 'center', alignItems: 'center' },
  cardInfo: { padding: 10 },
  cardName: { color: COLORS.text, fontSize: 13, fontWeight: '700', marginBottom: 2 },
  cardSub: { color: COLORS.textMuted, fontSize: 11, marginBottom: 4 },
  cardMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 },
  cardMeta: { color: COLORS.textMuted, fontSize: 11 },
  cardPrice: { color: '#8B5CF6', fontWeight: '800', fontSize: 15 },
  cardPriceUnit: { color: COLORS.textMuted, fontWeight: '500', fontSize: 11 },
  flightRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: COLORS.surface, borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: COLORS.border,
  },
  flightIconWrap: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: '#8B5CF615',
    justifyContent: 'center', alignItems: 'center',
  },
  flightRoute: { color: COLORS.text, fontWeight: '700', fontSize: 14, marginBottom: 2 },
  flightMeta: { color: COLORS.textMuted, fontSize: 11 },
  flightPrice: { color: '#8B5CF6', fontWeight: '800', fontSize: 15 },
  packageCard: {
    backgroundColor: COLORS.surface, borderRadius: 16, overflow: 'hidden',
    borderWidth: 1, borderColor: COLORS.border, flexDirection: 'row',
  },
  packageImage: { width: 110, height: 110, justifyContent: 'center', alignItems: 'center' },
  packageInfo: { flex: 1, padding: 12 },
  packageTitle: { color: COLORS.text, fontWeight: '700', fontSize: 14, marginBottom: 2 },
  packageDest: { color: '#8B5CF6', fontSize: 12, fontWeight: '600', marginBottom: 4 },
  packageDesc: { color: COLORS.textMuted, fontSize: 11, marginBottom: 6, lineHeight: 16 },
  packagePrice: { color: '#8B5CF6', fontWeight: '800', fontSize: 15 },
  empty: { alignItems: 'center', paddingVertical: 60, gap: 8 },
  emptyText: { color: COLORS.text, fontSize: 16, fontWeight: '600' },
  emptySub: { color: COLORS.textMuted, fontSize: 13 },
});
