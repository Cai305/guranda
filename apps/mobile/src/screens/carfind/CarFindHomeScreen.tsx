import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS, TYPOGRAPHY, RADIUS, SPACING, GRADIENTS } from '../../theme';
import { fetchApi } from '../../utils/api';
import SessionHeaderActions from '../../components/SessionHeaderActions';

// CarFind — a car classifieds mini app modeled on carfind.co.za. Browse
// real listings by body type, view specs and photos, and contact sellers.

const BODY_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'HATCHBACK', label: 'Hatchback' },
  { key: 'SEDAN', label: 'Sedan' },
  { key: 'SUV', label: 'SUV' },
  { key: 'BAKKIE', label: 'Bakkie' },
];

const BODY_EMOJI: Record<string, string> = {
  HATCHBACK: '🚗', SEDAN: '🚘', SUV: '🚙', BAKKIE: '🛻', COUPE: '🏎️', VAN: '🚐',
};

export default function CarFindHomeScreen({ navigation }: any) {
  const [filter, setFilter] = useState('all');
  const [cars, setCars] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    const qs = filter === 'all' ? '' : `?bodyType=${filter}`;
    fetchApi(`/carfind/listings${qs}`)
      .then(res => (res.ok ? res.json() : []))
      .then(data => Array.isArray(data) && setCars(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [filter]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const renderCar = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.85}
      onPress={() => navigation.navigate('CarFindDetail', { carId: item.id })}
    >
      {item.images?.length > 0 ? (
        <View>
          <Image source={{ uri: item.images[0] }} style={styles.cardImage} />
          <View style={styles.photoCount}>
            <Ionicons name="images" size={11} color="#FFF" />
            <Text style={styles.photoCountText}>{item.images.length}</Text>
          </View>
        </View>
      ) : (
        <LinearGradient colors={['#4C1D95', '#2E1065']} style={styles.cardImage}>
          <Text style={styles.cardEmoji}>{BODY_EMOJI[item.bodyType] || '🚗'}</Text>
        </LinearGradient>
      )}
      <View style={styles.cardBody}>
        <View style={styles.cardTitleRow}>
          <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
          {item.condition === 'NEW' && (
            <View style={styles.newPill}>
              <Text style={styles.newPillText}>NEW</Text>
            </View>
          )}
        </View>
        <Text style={styles.cardSpecs} numberOfLines={1}>
          {item.year} · {item.mileage.toLocaleString()}km · {item.transmission} · {item.fuelType}
        </Text>
        <View style={styles.cardMeta}>
          <Text style={styles.cardPrice}>{item.price.toLocaleString()} MSH</Text>
          <Text style={styles.cardLocation}>
            <Ionicons name="location-outline" size={11} color={COLORS.textMuted} /> {item.location}
          </Text>
        </View>
        <Text style={styles.cardSeller}>
          Seller: {item.seller?.profile?.displayName || item.seller?.username}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.header}>
        <SessionHeaderActions
          navigation={navigation}
          session={{
            id: 'carfind',
            label: 'CarFind',
            icon: 'car-sport',
            gradient: GRADIENTS.wallet,
            route: { name: 'CarFindHome' },
          }}
        />
        <Text style={TYPOGRAPHY.h2}>CarFind</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.dashRow}>
        <TouchableOpacity style={styles.dashBtn} onPress={() => navigation.navigate('MyCarListings')}>
          <Ionicons name="car" size={16} color="#A78BFA" />
          <Text style={styles.dashText}>My Listings</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.dashBtn} onPress={() => navigation.navigate('MyCarEnquiries')}>
          <Ionicons name="chatbubbles" size={16} color="#A78BFA" />
          <Text style={styles.dashText}>My Enquiries</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={BODY_FILTERS}
        keyExtractor={f => f.key}
        contentContainerStyle={styles.filterRow}
        renderItem={({ item: f }) => (
          <TouchableOpacity
            style={[styles.filterChip, filter === f.key && styles.filterChipActive]}
            onPress={() => setFilter(f.key)}
          >
            <Text style={[styles.filterText, filter === f.key && { color: '#1E0A3C' }]}>{f.label}</Text>
          </TouchableOpacity>
        )}
      />

      <FlatList
        data={cars}
        keyExtractor={c => c.id}
        renderItem={renderCar}
        contentContainerStyle={{ padding: SPACING.lg, gap: 12, paddingBottom: 100 }}
        ListEmptyComponent={
          <Text style={styles.empty}>
            {loading ? 'Loading listings…' : 'No cars found — try a different filter, or list your own!'}
          </Text>
        }
      />

      <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('CarListingForm')}>
        <Ionicons name="add" size={26} color="#FFF" />
        <Text style={styles.fabText}>List a car</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#160B2E' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md,
  },
  dashRow: { flexDirection: 'row', gap: 10, paddingHorizontal: SPACING.lg },
  dashBtn: {
    flex: 1, flexDirection: 'row', gap: 8,
    justifyContent: 'center', alignItems: 'center',
    backgroundColor: 'rgba(167,139,250,0.1)',
    borderWidth: 1, borderColor: 'rgba(167,139,250,0.4)',
    borderRadius: RADIUS.lg,
    paddingVertical: 12,
  },
  dashText: { color: '#A78BFA', fontWeight: '800', fontSize: 13 },
  filterRow: { gap: 8, paddingHorizontal: SPACING.lg, marginTop: SPACING.md },
  filterChip: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: RADIUS.pill,
    borderWidth: 1, borderColor: COLORS.glassBorder,
    paddingVertical: 8, paddingHorizontal: 16,
    alignItems: 'center',
  },
  filterChipActive: { backgroundColor: '#A78BFA', borderColor: '#A78BFA' },
  filterText: { color: COLORS.textMuted, fontWeight: '700', fontSize: 12 },
  card: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: RADIUS.lg,
    borderWidth: 1, borderColor: COLORS.glassBorder,
    overflow: 'hidden',
  },
  cardImage: { height: 130, width: '100%', justifyContent: 'center', alignItems: 'center' },
  cardEmoji: { fontSize: 44 },
  photoCount: {
    position: 'absolute', bottom: 8, right: 8,
    flexDirection: 'row', gap: 4, alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: RADIUS.pill,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  photoCountText: { color: '#FFF', fontSize: 10.5, fontWeight: '700' },
  cardBody: { padding: 14 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardTitle: { color: COLORS.text, fontWeight: '800', fontSize: 15, flex: 1 },
  newPill: {
    backgroundColor: 'rgba(52,211,153,0.2)',
    borderWidth: 1, borderColor: 'rgba(52,211,153,0.6)',
    borderRadius: RADIUS.pill,
    paddingHorizontal: 8, paddingVertical: 2,
  },
  newPillText: { color: COLORS.success, fontSize: 9.5, fontWeight: '800' },
  cardSpecs: { color: COLORS.textMuted, fontSize: 12, marginTop: 4 },
  cardMeta: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  cardPrice: { color: '#A78BFA', fontWeight: '800', fontSize: 14 },
  cardLocation: { color: COLORS.textMuted, fontSize: 12 },
  cardSeller: { color: COLORS.textMuted, fontSize: 11, marginTop: 6 },
  empty: { color: COLORS.textMuted, fontSize: 13, textAlign: 'center', marginTop: 40 },
  fab: {
    position: 'absolute', bottom: 24, right: 20,
    flexDirection: 'row', gap: 6, alignItems: 'center',
    backgroundColor: '#7C3AED',
    borderRadius: RADIUS.pill,
    paddingVertical: 13, paddingHorizontal: 18,
  },
  fabText: { color: '#FFF', fontWeight: '800', fontSize: 14 },
});
