import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Image } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, TYPOGRAPHY, SPACING, GRADIENTS } from '../../theme';
import { fetchApi } from '../../utils/api';
import { useShoppingCart } from '../../context/ShoppingCartContext';

export default function ShoppingProductScreen({ navigation, route }: any) {
  const insets = useSafeAreaInsets();
  const { productId } = route.params;
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [qty, setQty] = useState(1);
  const { addItem, items, itemCount } = useShoppingCart();

  useEffect(() => {
    fetchApi(`/shopping/products/${productId}`)
      .then(r => r.json())
      .then(setProduct)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [productId]);

  if (loading) return (
    <View style={styles.center}><ActivityIndicator color={COLORS.primary} size="large" /></View>
  );

  if (!product) return (
    <View style={styles.center}><Text style={{ color: COLORS.textMuted }}>Product not found</Text></View>
  );

  const cartQty = items.find(i => i.product.id === product.id)?.quantity ?? 0;
  const rewardEstimate = (product.price * qty * 0.03).toFixed(2);

  const addToCart = () => {
    for (let i = 0; i < qty; i++) addItem(product, product.store.id, product.store.name);
  };

  const buyNow = () => {
    for (let i = 0; i < qty; i++) addItem(product, product.store.id, product.store.name);
    navigation.navigate('ShoppingCart');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 110 }}>
        <View style={styles.imageWrap}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.cartIconBtn} onPress={() => navigation.navigate('ShoppingCart')}>
            <Ionicons name="bag-handle" size={20} color="#fff" />
            {itemCount > 0 && (
              <View style={styles.cartBadge}><Text style={styles.cartBadgeText}>{itemCount}</Text></View>
            )}
          </TouchableOpacity>
          {product.imageUrl ? (
            <Image source={{ uri: product.imageUrl }} style={styles.image} resizeMode="cover" />
          ) : (
            <LinearGradient colors={GRADIENTS.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.image}>
              <Ionicons name="bag-handle" size={64} color="rgba(255,255,255,0.35)" />
            </LinearGradient>
          )}
        </View>

        <View style={styles.body}>
          <Text style={styles.name}>{product.name}</Text>

          <TouchableOpacity
            style={styles.soldByRow}
            onPress={() => navigation.navigate('ShoppingStore', { storeId: product.store.id })}
          >
            <Ionicons name="storefront" size={14} color="#8B5CF6" />
            <Text style={styles.soldByText}>Sold by {product.store.name}</Text>
            <View style={styles.metaItem}>
              <Ionicons name="star" size={12} color="#f59e0b" />
              <Text style={styles.metaText}>{product.store.rating?.toFixed(1) || '5.0'}</Text>
            </View>
            <Ionicons name="chevron-forward" size={14} color={COLORS.textMuted} />
          </TouchableOpacity>

          <Text style={styles.price}>{product.price.toFixed(2)} MSH</Text>

          <View style={styles.badgeRow}>
            <View style={styles.badge}>
              <Ionicons name="checkmark-circle" size={13} color="#22c55e" />
              <Text style={styles.badgeText}>Free delivery</Text>
            </View>
            <View style={styles.badge}>
              <Ionicons name="gift-outline" size={13} color="#8B5CF6" />
              <Text style={[styles.badgeText, { color: '#8B5CF6' }]}>Earn {rewardEstimate} MSH cashback</Text>
            </View>
          </View>

          {product.description && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>About this item</Text>
              <Text style={styles.desc}>{product.description}</Text>
            </View>
          )}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Quantity</Text>
            <View style={styles.qtyRow}>
              <TouchableOpacity style={styles.qtyBtn} onPress={() => setQty(q => Math.max(1, q - 1))}>
                <Ionicons name="remove" size={18} color="#8B5CF6" />
              </TouchableOpacity>
              <Text style={styles.qtyText}>{qty}</Text>
              <TouchableOpacity style={styles.qtyBtn} onPress={() => setQty(q => q + 1)}>
                <Ionicons name="add" size={18} color="#8B5CF6" />
              </TouchableOpacity>
            </View>
            {cartQty > 0 && <Text style={styles.inCartNote}>{cartQty} already in your cart</Text>}
          </View>
        </View>
      </ScrollView>

      <View style={[styles.actionBar, { paddingBottom: insets.bottom + SPACING.lg }]}>
        <TouchableOpacity style={styles.addToCartBtn} onPress={addToCart}>
          <Ionicons name="bag-add-outline" size={18} color="#8B5CF6" />
          <Text style={styles.addToCartText}>Add to Cart</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.buyNowBtn} onPress={buyNow}>
          <Text style={styles.buyNowText}>Buy Now</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },
  imageWrap: { position: 'relative' },
  image: { width: '100%', height: 300, justifyContent: 'center', alignItems: 'center' },
  backBtn: { position: 'absolute', top: 16, left: 16, backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: 20, padding: 8, zIndex: 2 },
  cartIconBtn: { position: 'absolute', top: 16, right: 16, backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: 20, padding: 8, zIndex: 2 },
  cartBadge: {
    position: 'absolute', top: -2, right: -4,
    backgroundColor: '#8B5CF6', borderRadius: 8, width: 16, height: 16,
    justifyContent: 'center', alignItems: 'center',
  },
  cartBadgeText: { color: '#fff', fontSize: 9, fontWeight: '700' },
  body: { padding: SPACING.lg },
  name: { ...TYPOGRAPHY.h2, marginBottom: 10 },
  soldByRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  soldByText: { color: '#8B5CF6', fontSize: 13, fontWeight: '600', flex: 1 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  metaText: { color: COLORS.textMuted, fontSize: 12 },
  price: { color: COLORS.text, fontWeight: '800', fontSize: 28, marginBottom: 12 },
  badgeRow: { gap: 8, marginBottom: 16 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.surface, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: COLORS.border, alignSelf: 'flex-start' },
  badgeText: { color: '#22c55e', fontSize: 12, fontWeight: '600' },
  section: { marginBottom: 16 },
  sectionTitle: { ...TYPOGRAPHY.label, fontSize: 11, marginBottom: 8 },
  desc: { color: COLORS.textMuted, fontSize: 14, lineHeight: 21 },
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  qtyBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, justifyContent: 'center', alignItems: 'center' },
  qtyText: { color: COLORS.text, fontWeight: '700', fontSize: 17, minWidth: 24, textAlign: 'center' },
  inCartNote: { color: COLORS.textMuted, fontSize: 12, marginTop: 8 },
  // paddingBottom set dynamically via insets in JSX — a flat SPACING.lg
  // leaves the button flush against the home indicator / gesture bar on
  // notched devices with no clearance from it.
  actionBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0, padding: SPACING.lg,
    flexDirection: 'row', gap: 10,
    backgroundColor: COLORS.background, borderTopWidth: 1, borderTopColor: COLORS.border,
  },
  addToCartBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderRadius: 14, paddingVertical: 14, borderWidth: 1.5, borderColor: '#8B5CF6',
  },
  addToCartText: { color: '#8B5CF6', fontWeight: '700', fontSize: 14 },
  buyNowBtn: { flex: 1, backgroundColor: '#8B5CF6', borderRadius: 14, paddingVertical: 14, justifyContent: 'center', alignItems: 'center' },
  buyNowText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
