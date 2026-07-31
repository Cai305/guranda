import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, TYPOGRAPHY, SPACING, GRADIENTS } from '../../theme';
import { fetchApi } from '../../utils/api';
import { useCart } from '../../context/CartContext';

const CATEGORIES = ['All', 'Restaurant', 'Fast Food', 'Grocery', 'Bakery', 'Pharmacy'];

const CAT_ICONS: Record<string, string> = {
  All: 'grid',
  Restaurant: 'restaurant',
  'Fast Food': 'fast-food',
  Grocery: 'basket',
  Bakery: 'cafe',
  Pharmacy: 'medkit',
};

export default function EatHomeScreen({ navigation }: any) {
  const [stores, setStores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const { itemCount } = useCart();

  const load = async (cat?: string) => {
    setLoading(true);
    try {
      const params = cat && cat !== 'All' ? `?category=${encodeURIComponent(cat)}` : '';
      const res = await fetchApi(`/eat/stores${params}`);
      const data = await res.json();
      setStores(Array.isArray(data) ? data : []);
    } catch { setStores([]); }
    setLoading(false);
  };

  useEffect(() => { load(category); }, [category]);

  const filtered = stores.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    (s.description || '').toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Eat</Text>
          <Text style={styles.headerSub}>Food & Groceries</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.cartBtn} onPress={() => navigation.navigate('EatOrders')}>
            <Ionicons name="receipt-outline" size={22} color={COLORS.text} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.cartBtn} onPress={() => navigation.navigate('EatCart')}>
            <Ionicons name="bag-handle" size={22} color={COLORS.text} />
            {itemCount > 0 && (
              <View style={styles.cartBadge}><Text style={styles.cartBadgeText}>{itemCount}</Text></View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Search */}
      <View style={styles.searchRow}>
        <Ionicons name="search" size={16} color={COLORS.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search restaurants, dishes…"
          placeholderTextColor={COLORS.textMuted}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* Hero */}
      <LinearGradient colors={GRADIENTS.crimson} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.hero}>
        <Ionicons name="restaurant" size={40} color="rgba(255,255,255,0.3)" style={styles.heroIcon} />
        <Text style={styles.heroTitle}>Hungry?</Text>
        <Text style={styles.heroSub}>Order from local restaurants, pay with MSH</Text>
      </LinearGradient>

      {/* Categories */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catScroll} contentContainerStyle={styles.catContent}>
        {CATEGORIES.map(cat => (
          <TouchableOpacity
            key={cat}
            style={[styles.catChip, category === cat && styles.catChipActive]}
            onPress={() => setCategory(cat)}
          >
            <Ionicons name={CAT_ICONS[cat] as any} size={14} color={category === cat ? '#fff' : COLORS.textMuted} />
            <Text style={[styles.catLabel, category === cat && styles.catLabelActive]}>{cat}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Store list */}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        {loading ? (
          <ActivityIndicator color={COLORS.primary} style={{ marginTop: 40 }} />
        ) : filtered.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="restaurant-outline" size={48} color={COLORS.textMuted} />
            <Text style={styles.emptyText}>No restaurants yet</Text>
            <Text style={styles.emptySub}>Be the first to open a store!</Text>
          </View>
        ) : (
          <View style={styles.storeList}>
            {filtered.map(store => (
              <TouchableOpacity
                key={store.id}
                style={styles.storeCard}
                activeOpacity={0.85}
                onPress={() => navigation.navigate('EatStore', { storeId: store.id })}
              >
                {store.coverUrl ? (
                  <Image source={{ uri: store.coverUrl }} style={styles.storeCover} resizeMode="cover" />
                ) : (
                  <LinearGradient
                    colors={['#ef4444', '#dc2626']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.storeCover}
                  >
                    <Ionicons name="restaurant" size={36} color="rgba(255,255,255,0.4)" />
                  </LinearGradient>
                )}
                <View style={styles.storeInfo}>
                  <View style={styles.storeTopRow}>
                    <Text style={styles.storeName} numberOfLines={1}>{store.name}</Text>
                    <View style={[styles.statusDot, { backgroundColor: store.isOpen ? '#22c55e' : '#6b7280' }]} />
                  </View>
                  <Text style={styles.storeCategory}>{store.category}</Text>
                  {store.description && (
                    <Text style={styles.storeDesc} numberOfLines={1}>{store.description}</Text>
                  )}
                  <View style={styles.storeMeta}>
                    <Ionicons name="star" size={12} color="#f59e0b" />
                    <Text style={styles.storeRating}>{store.rating?.toFixed(1) || '5.0'}</Text>
                    <Text style={styles.storeDot}>·</Text>
                    <Ionicons name="location-outline" size={12} color={COLORS.textMuted} />
                    <Text style={styles.storeAddr} numberOfLines={1}>{store.address}</Text>
                  </View>
                  <View style={styles.storeFees}>
                    <Text style={styles.storeFeeText}>R20 delivery · 1.5% fee</Text>
                    <Text style={styles.storeItems}>{store._count?.products ?? 0} items</Text>
                  </View>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: 12,
  },
  back: { padding: 4, marginRight: 8 },
  headerCenter: { flex: 1 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  headerTitle: { ...TYPOGRAPHY.h2 },
  headerSub: { color: COLORS.textMuted, fontSize: 12 },
  cartBtn: { padding: 4, position: 'relative' },
  cartBadge: {
    position: 'absolute',
    top: -2,
    right: -4,
    backgroundColor: '#ef4444',
    borderRadius: 8,
    width: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cartBadgeText: { color: '#fff', fontSize: 9, fontWeight: '700' },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: SPACING.lg,
    marginBottom: 12,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchInput: { flex: 1, color: COLORS.text, fontSize: 14 },
  hero: {
    marginHorizontal: SPACING.lg,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    overflow: 'hidden',
  },
  heroIcon: { position: 'absolute', right: 16, top: 12 },
  heroTitle: { color: '#fff', fontSize: 22, fontWeight: '800', marginBottom: 4 },
  heroSub: { color: 'rgba(255,255,255,0.8)', fontSize: 13 },
  catScroll: { marginBottom: 16 },
  catContent: { paddingHorizontal: SPACING.lg, gap: 8 },
  catChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  catChipActive: { backgroundColor: '#ef4444', borderColor: '#ef4444' },
  catLabel: { color: COLORS.textMuted, fontSize: 13, fontWeight: '600' },
  catLabelActive: { color: '#fff' },
  storeList: { paddingHorizontal: SPACING.lg, gap: 12 },
  storeCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  storeCover: {
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  storeInfo: { padding: 14 },
  storeTopRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
  storeName: { ...TYPOGRAPHY.h3, flex: 1 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  storeCategory: { color: '#ef4444', fontSize: 12, fontWeight: '600', marginBottom: 4 },
  storeDesc: { color: COLORS.textMuted, fontSize: 12, marginBottom: 6 },
  storeMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 6 },
  storeRating: { color: COLORS.text, fontSize: 12, fontWeight: '600' },
  storeDot: { color: COLORS.textMuted, fontSize: 12 },
  storeAddr: { color: COLORS.textMuted, fontSize: 11, flex: 1 },
  storeFees: { flexDirection: 'row', justifyContent: 'space-between' },
  storeFeeText: { color: COLORS.textMuted, fontSize: 11 },
  storeItems: { color: COLORS.textMuted, fontSize: 11 },
  empty: { alignItems: 'center', paddingVertical: 60, gap: 8 },
  emptyText: { color: COLORS.text, fontSize: 16, fontWeight: '600' },
  emptySub: { color: COLORS.textMuted, fontSize: 13 },
});
