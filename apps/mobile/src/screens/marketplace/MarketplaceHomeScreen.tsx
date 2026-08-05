import React, { useCallback, useState } from 'react';
import { View, Text, TouchableOpacity, FlatList, Image, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../../context/ThemeContext';
import { useThemedStyles } from '../../theme/useThemedStyles';
import { fetchApi } from '../../utils/api';
import SessionHeaderActions from '../../components/SessionHeaderActions';

const CATEGORIES = ['All', 'Electronics', 'Fashion', 'Home & Garden', 'Vehicles', 'Sports', 'Books & Media', 'Toys & Games', 'Collectibles', 'Other'];
const TYPE_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'FIXED', label: 'Buy Now' },
  { key: 'AUCTION', label: 'Auctions' },
];

export default function MarketplaceHomeScreen({ navigation }: any) {
  const { theme } = useTheme();
  const { COLORS, TYPOGRAPHY, GRADIENTS, SPACING } = theme;
  const [category, setCategory] = useState('All');
  const [typeFilter, setTypeFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    const params = new URLSearchParams();
    if (category !== 'All') params.set('category', category);
    if (typeFilter !== 'all') params.set('listingType', typeFilter);
    if (search.trim()) params.set('search', search.trim());
    const qs = params.toString();
    fetchApi(`/marketplace/listings${qs ? `?${qs}` : ''}`)
      .then(res => (res.ok ? res.json() : []))
      .then(data => Array.isArray(data) && setListings(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [category, typeFilter, search]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const styles = useThemedStyles(({ COLORS, RADIUS, SPACING }) => ({
    root: { flex: 1, backgroundColor: '#150A2E' },
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
      backgroundColor: 'rgba(167,139,250,0.1)',
      borderWidth: 1, borderColor: 'rgba(167,139,250,0.4)',
      borderRadius: RADIUS.lg, paddingVertical: 12,
    },
    dashText: { color: '#A78BFA', fontWeight: '800', fontSize: 12.5 },
    searchRow: {
      flexDirection: 'row', alignItems: 'center', gap: 8,
      marginHorizontal: SPACING.lg, marginTop: SPACING.md,
      backgroundColor: 'rgba(255,255,255,0.06)',
      borderRadius: RADIUS.pill, borderWidth: 1, borderColor: COLORS.glassBorder,
      paddingHorizontal: 14, paddingVertical: 9,
    },
    searchInput: { flex: 1, color: COLORS.text, fontSize: 13.5 },
    catChip: {
      backgroundColor: 'rgba(255,255,255,0.06)',
      borderRadius: RADIUS.pill, borderWidth: 1, borderColor: COLORS.glassBorder,
      paddingHorizontal: 14, paddingVertical: 8,
    },
    catChipActive: { backgroundColor: '#A78BFA', borderColor: '#A78BFA' },
    catText: { color: COLORS.textMuted, fontWeight: '700', fontSize: 12 },
    typeRow: { flexDirection: 'row', gap: 8, paddingHorizontal: SPACING.lg, marginTop: SPACING.sm },
    typeChip: {
      flex: 1, backgroundColor: 'rgba(255,255,255,0.06)',
      borderRadius: RADIUS.pill, borderWidth: 1, borderColor: COLORS.glassBorder,
      paddingVertical: 8, alignItems: 'center',
    },
    typeChipActive: { backgroundColor: COLORS.gold, borderColor: COLORS.gold },
    typeText: { color: COLORS.textMuted, fontWeight: '700', fontSize: 12 },
    card: {
      flex: 1,
      backgroundColor: 'rgba(255,255,255,0.05)',
      borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.glassBorder,
      overflow: 'hidden',
    },
    cardImage: { height: 110, width: '100%', justifyContent: 'center', alignItems: 'center' },
    auctionBadge: {
      position: 'absolute', top: 8, left: 8,
      flexDirection: 'row', gap: 4, alignItems: 'center',
      backgroundColor: 'rgba(0,0,0,0.65)', borderRadius: RADIUS.pill,
      paddingHorizontal: 8, paddingVertical: 3,
    },
    auctionBadgeText: { color: '#FFF', fontSize: 9, fontWeight: '800' },
    cardBody: { padding: 12 },
    cardTitle: { color: COLORS.text, fontWeight: '700', fontSize: 13.5 },
    cardPrice: { color: '#A78BFA', fontWeight: '800', fontSize: 13, marginTop: 4 },
    cardMeta: { color: COLORS.textMuted, fontSize: 10.5, marginTop: 3 },
    empty: { color: COLORS.textMuted, fontSize: 13, textAlign: 'center', marginTop: 40 },
    fab: {
      position: 'absolute', bottom: 24, right: 20,
      flexDirection: 'row', gap: 6, alignItems: 'center',
      backgroundColor: '#7C3AED', borderRadius: RADIUS.pill,
      paddingVertical: 13, paddingHorizontal: 18,
    },
    fabText: { color: '#FFF', fontWeight: '800', fontSize: 14 },
  }));

  const renderListing = ({ item }: { item: any }) => {
    const isAuction = item.listingType === 'AUCTION';
    const displayPrice = isAuction ? (item.currentBid ?? item.price) : item.price;
    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.85}
        onPress={() => navigation.navigate('MarketplaceDetail', { listingId: item.id })}
      >
        {item.images?.length > 0 ? (
          <Image source={{ uri: item.images[0] }} style={styles.cardImage} />
        ) : (
          <LinearGradient colors={['#7C3AED', '#4C1D95']} style={styles.cardImage}>
            <Ionicons name="image-outline" size={32} color="rgba(255,255,255,0.5)" />
          </LinearGradient>
        )}
        {isAuction && (
          <View style={styles.auctionBadge}>
            <Ionicons name="hammer" size={10} color="#FFF" />
            <Text style={styles.auctionBadgeText}>AUCTION</Text>
          </View>
        )}
        <View style={styles.cardBody}>
          <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
          <Text style={styles.cardPrice}>
            {isAuction ? (item.currentBid ? 'Current bid ' : 'Starting ') : ''}{displayPrice} MSH
          </Text>
          <Text style={styles.cardMeta} numberOfLines={1}>
            {item.category} · {item.condition.replace('_', ' ')}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.header}>
        <SessionHeaderActions
          navigation={navigation}
          session={{
            id: 'marketplace',
            label: 'Marketplace',
            icon: 'pricetags',
            gradient: GRADIENTS.emerald,
            route: { name: 'MarketplaceHome' },
          }}
        />
        <Text style={TYPOGRAPHY.h2}>Marketplace</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.dashRow}>
        <TouchableOpacity style={styles.dashBtn} onPress={() => navigation.navigate('MyListings')}>
          <Ionicons name="pricetags" size={16} color="#A78BFA" />
          <Text style={styles.dashText}>My Listings</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.dashBtn} onPress={() => navigation.navigate('MyBids')}>
          <Ionicons name="hammer" size={16} color="#A78BFA" />
          <Text style={styles.dashText}>My Bids & Purchases</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.searchRow}>
        <Ionicons name="search" size={16} color={COLORS.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search listings…"
          placeholderTextColor={COLORS.textMuted}
          value={search}
          onChangeText={setSearch}
          onSubmitEditing={load}
          returnKeyType="search"
        />
      </View>

      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={CATEGORIES}
        keyExtractor={c => c}
        contentContainerStyle={{ paddingHorizontal: SPACING.lg, gap: 8 }}
        style={{ flexGrow: 0, marginTop: SPACING.sm }}
        renderItem={({ item: c }) => (
          <TouchableOpacity
            style={[styles.catChip, category === c && styles.catChipActive]}
            onPress={() => setCategory(c)}
          >
            <Text style={[styles.catText, category === c && { color: '#1A0B33' }]}>{c}</Text>
          </TouchableOpacity>
        )}
      />

      <View style={styles.typeRow}>
        {TYPE_FILTERS.map(t => (
          <TouchableOpacity
            key={t.key}
            style={[styles.typeChip, typeFilter === t.key && styles.typeChipActive]}
            onPress={() => setTypeFilter(t.key)}
          >
            <Text style={[styles.typeText, typeFilter === t.key && { color: '#1A0B33' }]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={listings}
        keyExtractor={l => l.id}
        renderItem={renderListing}
        numColumns={2}
        columnWrapperStyle={{ gap: 12 }}
        contentContainerStyle={{ padding: SPACING.lg, gap: 12, paddingBottom: 100 }}
        ListEmptyComponent={
          <Text style={styles.empty}>
            {loading ? 'Loading listings…' : 'No listings yet — be the first to sell something!'}
          </Text>
        }
      />

      <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('MarketplaceForm')}>
        <Ionicons name="add" size={26} color="#FFF" />
        <Text style={styles.fabText}>Sell something</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}
