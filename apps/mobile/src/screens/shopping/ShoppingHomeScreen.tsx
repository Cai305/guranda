import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Image, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, TYPOGRAPHY, SPACING, GRADIENTS } from '../../theme';
import { fetchApi } from '../../utils/api';
import { useShoppingCart } from '../../context/ShoppingCartContext';
import SessionHeaderActions from '../../components/SessionHeaderActions';

const CATEGORIES = ['All', 'Fashion', 'Electronics', 'Home & Garden', 'Beauty', 'Sports', 'Toys', 'Books', 'Other'];

const CAT_ICONS: Record<string, string> = {
  All: 'grid',
  Fashion: 'shirt',
  Electronics: 'hardware-chip',
  'Home & Garden': 'home',
  Beauty: 'sparkles',
  Sports: 'basketball',
  Toys: 'game-controller',
  Books: 'book',
  Other: 'ellipsis-horizontal',
};

export default function ShoppingHomeScreen({ navigation }: any) {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const { itemCount } = useShoppingCart();
  const { width } = useWindowDimensions();

  const gap = 12;
  const cardWidth = (Math.min(width, 900) - SPACING.lg * 2 - gap) / 2;

  const load = async (cat?: string, q?: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (cat && cat !== 'All') params.set('category', cat);
      if (q) params.set('search', q);
      const qs = params.toString();
      const res = await fetchApi(`/shopping/products${qs ? `?${qs}` : ''}`);
      const data = await res.json();
      setProducts(Array.isArray(data) ? data : []);
    } catch { setProducts([]); }
    setLoading(false);
  };

  useEffect(() => {
    const t = setTimeout(() => load(category, search), search ? 300 : 0);
    return () => clearTimeout(t);
  }, [category, search]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <SessionHeaderActions
          navigation={navigation}
          session={{
            id: 'shopping',
            label: 'Shopping',
            icon: 'cart',
            gradient: GRADIENTS.emerald,
            route: { name: 'Main', params: { screen: 'Life', params: { screen: 'ShoppingHome' } } },
          }}
        />
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Shopping</Text>
          <Text style={styles.headerSub}>Brand stores & rewards</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.cartBtn} onPress={() => navigation.navigate('ShoppingOrders')}>
            <Ionicons name="receipt-outline" size={22} color={COLORS.text} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.cartBtn} onPress={() => navigation.navigate('ShoppingCart')}>
            <Ionicons name="bag-handle" size={22} color={COLORS.text} />
            {itemCount > 0 && (
              <View style={styles.cartBadge}><Text style={styles.cartBadgeText}>{itemCount}</Text></View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.searchRow}>
        <Ionicons name="search" size={16} color={COLORS.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search products…"
          placeholderTextColor={COLORS.textMuted}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        <LinearGradient colors={GRADIENTS.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.hero}>
          <Ionicons name="bag-handle" size={40} color="rgba(255,255,255,0.3)" style={styles.heroIcon} />
          <Text style={styles.heroTitle}>Shop, earn, repeat</Text>
          <Text style={styles.heroSub}>3% of every purchase comes back to your wallet</Text>
        </LinearGradient>

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

        {loading ? (
          <ActivityIndicator color={COLORS.primary} style={{ marginTop: 40 }} />
        ) : products.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="pricetags-outline" size={48} color={COLORS.textMuted} />
            <Text style={styles.emptyText}>No products found</Text>
            <Text style={styles.emptySub}>Try a different search or category</Text>
          </View>
        ) : (
          <View style={styles.grid}>
            {products.map(product => (
              <TouchableOpacity
                key={product.id}
                style={[styles.card, { width: cardWidth }]}
                activeOpacity={0.85}
                onPress={() => navigation.navigate('ShoppingProduct', { productId: product.id })}
              >
                <View style={styles.cardImageWrap}>
                  {product.imageUrl ? (
                    <Image source={{ uri: product.imageUrl }} style={styles.cardImage} resizeMode="cover" />
                  ) : (
                    <LinearGradient colors={GRADIENTS.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.cardImage}>
                      <Ionicons name="bag-handle" size={32} color="rgba(255,255,255,0.4)" />
                    </LinearGradient>
                  )}
                  <View style={styles.rewardBadge}>
                    <Text style={styles.rewardBadgeText}>3% back</Text>
                  </View>
                </View>
                <View style={styles.cardInfo}>
                  <Text style={styles.cardName} numberOfLines={2}>{product.name}</Text>
                  <Text style={styles.cardPrice}>{product.price.toFixed(2)} MSH</Text>
                  <View style={styles.cardMetaRow}>
                    <Ionicons name="star" size={11} color="#f59e0b" />
                    <Text style={styles.cardRating}>{product.store?.rating?.toFixed(1) || '5.0'}</Text>
                  </View>
                  <Text style={styles.cardSoldBy} numberOfLines={1}>Sold by {product.store?.name}</Text>
                  <View style={styles.freeDeliveryRow}>
                    <Ionicons name="checkmark-circle" size={11} color="#22c55e" />
                    <Text style={styles.freeDeliveryText}>Free delivery</Text>
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
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.lg, paddingVertical: 12 },
  back: { padding: 4, marginRight: 8 },
  headerCenter: { flex: 1 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  headerTitle: { ...TYPOGRAPHY.h2 },
  headerSub: { color: COLORS.textMuted, fontSize: 12 },
  cartBtn: { padding: 4, position: 'relative' },
  cartBadge: {
    position: 'absolute', top: -2, right: -4,
    backgroundColor: '#8B5CF6', borderRadius: 8, width: 16, height: 16,
    justifyContent: 'center', alignItems: 'center',
  },
  cartBadgeText: { color: '#fff', fontSize: 9, fontWeight: '700' },
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
  heroTitle: { color: '#fff', fontSize: 22, fontWeight: '800', marginBottom: 4 },
  heroSub: { color: 'rgba(255,255,255,0.8)', fontSize: 13 },
  catScroll: { marginBottom: 16 },
  catContent: { paddingHorizontal: SPACING.lg, gap: 8 },
  catChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border,
  },
  catChipActive: { backgroundColor: '#8B5CF6', borderColor: '#8B5CF6' },
  catLabel: { color: COLORS.textMuted, fontSize: 13, fontWeight: '600' },
  catLabelActive: { color: '#fff' },
  grid: {
    paddingHorizontal: SPACING.lg, gap: 12,
    flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between',
  },
  card: {
    backgroundColor: COLORS.surface, borderRadius: 16, overflow: 'hidden',
    borderWidth: 1, borderColor: COLORS.border, marginBottom: 12,
  },
  cardImageWrap: { position: 'relative' },
  cardImage: { width: '100%', height: 130, justifyContent: 'center', alignItems: 'center' },
  rewardBadge: {
    position: 'absolute', top: 8, left: 8,
    backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  rewardBadgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  cardInfo: { padding: 10 },
  cardName: { color: COLORS.text, fontSize: 13, fontWeight: '600', marginBottom: 4, minHeight: 34 },
  cardPrice: { color: '#8B5CF6', fontWeight: '800', fontSize: 16, marginBottom: 4 },
  cardMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 3 },
  cardRating: { color: COLORS.textMuted, fontSize: 11 },
  cardSoldBy: { color: COLORS.textMuted, fontSize: 11, marginBottom: 4 },
  freeDeliveryRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  freeDeliveryText: { color: '#22c55e', fontSize: 10, fontWeight: '600' },
  empty: { alignItems: 'center', paddingVertical: 60, gap: 8 },
  emptyText: { color: COLORS.text, fontSize: 16, fontWeight: '600' },
  emptySub: { color: COLORS.textMuted, fontSize: 13 },
});
