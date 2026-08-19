import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Image, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS, TYPOGRAPHY, RADIUS, SPACING, GRADIENTS } from '../../theme';
import { fetchApi } from '../../utils/api';
import SessionHeaderActions from '../../components/SessionHeaderActions';
import EmptyState from '../../components/EmptyState';
import { formatCurrency } from '../../utils/format';

// Guranda Property — browse homes and commercial spaces. Any user can list
// a property and become an agent; agents manage tenants, rent and leases.

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'RENT', label: 'To Rent' },
  { key: 'SALE', label: 'For Sale' },
  { key: 'COMMERCIAL', label: 'Commercial' },
];

const KIND_EMOJI: Record<string, string> = {
  HOUSE: '🏡',
  APARTMENT: '🏢',
  COMMERCIAL: '🏬',
};

export default function PropertyHomeScreen({ navigation }: any) {
  const [filter, setFilter] = useState('all');
  const [properties, setProperties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    const qs =
      filter === 'all' ? '' :
      filter === 'COMMERCIAL' ? '?kind=COMMERCIAL' : `?listingType=${filter}`;
    fetchApi(`/property${qs}`)
      .then(res => (res.ok ? res.json() : []))
      .then(data => Array.isArray(data) && setProperties(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [filter]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const renderProperty = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.85}
      onPress={() => navigation.navigate('PropertyDetail', { propertyId: item.id })}
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
        <LinearGradient colors={['#134E4A', '#0B2E2B']} style={styles.cardImage}>
          <Text style={styles.cardEmoji}>{KIND_EMOJI[item.kind] || '🏠'}</Text>
        </LinearGradient>
      )}
      <View style={styles.cardBody}>
        <View style={styles.cardTitleRow}>
          <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
          <View style={[styles.typePill, item.listingType === 'SALE' && { backgroundColor: 'rgba(245,158,11,0.2)', borderColor: 'rgba(245,158,11,0.6)' }]}>
            <Text style={[styles.typePillText, item.listingType === 'SALE' && { color: COLORS.gold }]}>
              {item.listingType === 'SALE' ? 'FOR SALE' : 'TO RENT'}
            </Text>
          </View>
        </View>
        <Text style={styles.cardAddress} numberOfLines={1}>
          <Ionicons name="location-outline" size={11} color={COLORS.textMuted} /> {item.address}
        </Text>
        <View style={styles.cardMeta}>
          <Text style={styles.cardPrice}>
            {formatCurrency(item.price)}{item.listingType === 'RENT' ? ' / month' : ''}
          </Text>
          {item.kind !== 'COMMERCIAL' && (
            <Text style={styles.cardBeds}>🛏 {item.bedrooms} · 🛁 {item.bathrooms}</Text>
          )}
        </View>
        <Text style={styles.cardAgent}>
          Agent: {item.agent?.profile?.displayName || item.agent?.username}
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
            id: 'property',
            label: 'Property',
            icon: 'home',
            gradient: GRADIENTS.emerald,
            route: { name: 'PropertyHome' },
          }}
        />
        <Text style={TYPOGRAPHY.h2}>Property</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Dashboards: agent + tenant */}
      <View style={styles.dashRow}>
        <TouchableOpacity style={styles.dashBtn} onPress={() => navigation.navigate('MyProperties')}>
          <Ionicons name="business" size={16} color="#2DD4BF" />
          <Text style={styles.dashText}>My Properties</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.dashBtn} onPress={() => navigation.navigate('MyRentals')}>
          <Ionicons name="key" size={16} color="#2DD4BF" />
          <Text style={styles.dashText}>My Rentals</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.filterRow}>
        {FILTERS.map(f => (
          <TouchableOpacity
            key={f.key}
            style={[styles.filterChip, filter === f.key && styles.filterChipActive]}
            onPress={() => setFilter(f.key)}
          >
            <Text style={[styles.filterText, filter === f.key && { color: '#04291B' }]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color="#2DD4BF" />
        </View>
      ) : (
        <FlatList
          data={properties}
          keyExtractor={p => p.id}
          renderItem={renderProperty}
          contentContainerStyle={[{ padding: SPACING.lg, gap: 12, paddingBottom: 100 }, properties.length === 0 && { flex: 1 }]}
          ListEmptyComponent={
            <EmptyState
              icon="home-outline"
              title="No listings yet"
              subtitle="Be the first agent to list a property!"
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#07211E' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: RADIUS.pill,
    backgroundColor: COLORS.glass, borderWidth: 1, borderColor: COLORS.glassBorder,
    justifyContent: 'center', alignItems: 'center',
  },
  dashRow: { flexDirection: 'row', gap: 10, paddingHorizontal: SPACING.lg },
  dashBtn: {
    flex: 1, flexDirection: 'row', gap: 8,
    justifyContent: 'center', alignItems: 'center',
    backgroundColor: 'rgba(45,212,191,0.1)',
    borderWidth: 1, borderColor: 'rgba(45,212,191,0.4)',
    borderRadius: RADIUS.lg,
    paddingVertical: 12,
  },
  dashText: { color: '#2DD4BF', fontWeight: '800', fontSize: 13 },
  filterRow: {
    flexDirection: 'row', gap: 8,
    paddingHorizontal: SPACING.lg, marginTop: SPACING.md,
  },
  filterChip: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: RADIUS.pill,
    borderWidth: 1, borderColor: COLORS.glassBorder,
    paddingVertical: 8,
    alignItems: 'center',
  },
  filterChipActive: { backgroundColor: '#2DD4BF', borderColor: '#2DD4BF' },
  filterText: { color: COLORS.textMuted, fontWeight: '700', fontSize: 12 },
  card: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: RADIUS.lg,
    borderWidth: 1, borderColor: COLORS.glassBorder,
    overflow: 'hidden',
  },
  cardImage: {
    height: 120, width: '100%',
    justifyContent: 'center', alignItems: 'center',
  },
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
  typePill: {
    backgroundColor: 'rgba(45,212,191,0.2)',
    borderWidth: 1, borderColor: 'rgba(45,212,191,0.6)',
    borderRadius: RADIUS.pill,
    paddingHorizontal: 8, paddingVertical: 2,
  },
  typePillText: { color: '#2DD4BF', fontSize: 9.5, fontWeight: '800' },
  cardAddress: { color: COLORS.textMuted, fontSize: 12, marginTop: 4 },
  cardMeta: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  cardPrice: { color: '#2DD4BF', fontWeight: '800', fontSize: 14 },
  cardBeds: { color: COLORS.textMuted, fontSize: 12 },
  cardAgent: { color: COLORS.textMuted, fontSize: 11, marginTop: 6 },
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});
