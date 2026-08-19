import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Image } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useThemedStyles } from '../../theme/useThemedStyles';
import { fetchApi } from '../../utils/api';
import { useShoppingCart } from '../../context/ShoppingCartContext';

export default function ShoppingStoreScreen({ navigation, route }: any) {
  const { storeId } = route.params;
  const [store, setStore] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { addItem, updateQty, items, itemCount, total } = useShoppingCart();
  const { theme } = useTheme();
  const { COLORS, GRADIENTS, SPACING } = theme;
  const insets = useSafeAreaInsets();
  const styles = useThemedStyles(({ COLORS, GRADIENTS, SPACING, TYPOGRAPHY }) => ({
    container: { flex: 1, backgroundColor: COLORS.background },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },
    cover: { height: 180, justifyContent: 'center', alignItems: 'center' },
    backBtn: { position: 'absolute', top: 16, left: 16, backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: 20, padding: 8 },
    storeInfo: { padding: SPACING.lg },
    storeHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
    logoWrap: {
      width: 52, height: 52, borderRadius: 14,
      backgroundColor: '#8B5CF615', justifyContent: 'center', alignItems: 'center',
      borderWidth: 1, borderColor: '#8B5CF630',
    },
    storeText: { flex: 1 },
    storeName: { ...TYPOGRAPHY.h2, marginBottom: 2 },
    storeCat: { color: '#8B5CF6', fontSize: 12, fontWeight: '600' },
    statusPill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
    statusDot: { width: 6, height: 6, borderRadius: 3 },
    statusText: { fontSize: 11, fontWeight: '700' },
    storeDesc: { color: COLORS.textMuted, fontSize: 13, lineHeight: 20, marginBottom: 10 },
    metaRow: { flexDirection: 'row', gap: 16, marginBottom: 14 },
    metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    metaText: { color: COLORS.textMuted, fontSize: 12 },
    feeBanner: {
      flexDirection: 'row', backgroundColor: COLORS.surface, borderRadius: 12, padding: 12,
      alignItems: 'center', justifyContent: 'space-around', borderWidth: 1, borderColor: COLORS.border,
    },
    feeItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    feeLabel: { color: COLORS.text, fontSize: 11, fontWeight: '600' },
    feeDivider: { width: 1, height: 20, backgroundColor: COLORS.border },
    section: { paddingHorizontal: SPACING.lg, marginBottom: 8 },
    sectionTitle: { ...TYPOGRAPHY.label, fontSize: 11, marginBottom: 10, marginTop: 8 },
    productCard: {
      flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, borderRadius: 14,
      padding: 14, marginBottom: 8, borderWidth: 1, borderColor: COLORS.border, gap: 12,
    },
    productInfo: { flex: 1 },
    productName: { ...TYPOGRAPHY.body1, marginBottom: 2 },
    productDesc: { color: COLORS.textMuted, fontSize: 12, lineHeight: 18, marginBottom: 6 },
    productPrice: { color: '#8B5CF6', fontWeight: '700', fontSize: 15 },
    productActions: { alignItems: 'center', gap: 8 },
    productThumb: { width: 60, height: 60, borderRadius: 10, backgroundColor: COLORS.surfaceElevated, justifyContent: 'center', alignItems: 'center' },
    addBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#8B5CF6', justifyContent: 'center', alignItems: 'center' },
    qtyRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    qtyBtn: { width: 28, height: 28, borderRadius: 14, backgroundColor: COLORS.surfaceElevated, justifyContent: 'center', alignItems: 'center' },
    qtyText: { color: COLORS.text, fontWeight: '700', fontSize: 15, minWidth: 20, textAlign: 'center' },
    empty: { alignItems: 'center', paddingVertical: 60, gap: 10 },
    emptyText: { color: COLORS.textMuted, fontSize: 14 },
    // paddingBottom set dynamically via insets in JSX — a flat SPACING.lg
    // leaves the button flush against the home indicator / gesture bar on
    // notched devices with no clearance from it.
    cartBar: {
      position: 'absolute', bottom: 0, left: 0, right: 0, padding: SPACING.lg,
      backgroundColor: COLORS.background, borderTopWidth: 1, borderTopColor: COLORS.border,
    },
    cartBarBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#8B5CF6', borderRadius: 14, padding: 16, gap: 12 },
    cartBarBadge: { backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 10, width: 24, height: 24, justifyContent: 'center', alignItems: 'center' },
    cartBarBadgeText: { color: '#fff', fontSize: 12, fontWeight: '700' },
    cartBarLabel: { flex: 1, color: '#fff', fontWeight: '700', fontSize: 15 },
    cartBarTotal: { color: '#fff', fontWeight: '800', fontSize: 15 },
  }));

  useEffect(() => {
    fetchApi(`/shopping/stores/${storeId}`)
      .then(r => r.json())
      .then(setStore)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [storeId]);

  if (loading) return (
    <View style={styles.center}><ActivityIndicator color={COLORS.primary} size="large" /></View>
  );

  if (!store) return (
    <View style={styles.center}><Text style={{ color: COLORS.textMuted }}>Store not found</Text></View>
  );

  const grouped: Record<string, any[]> = {};
  (store.products || []).forEach((p: any) => {
    const cat = p.category || 'All';
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(p);
  });

  const getQty = (productId: string) => items.find(i => i.product.id === productId)?.quantity ?? 0;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: itemCount > 0 ? 100 : 40 }}>
        <LinearGradient colors={GRADIENTS.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.cover}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>
          <Ionicons name="bag-handle" size={52} color="rgba(255,255,255,0.25)" />
        </LinearGradient>

        <View style={styles.storeInfo}>
          <View style={styles.storeHeader}>
            <View style={styles.logoWrap}>
              <Ionicons name="storefront" size={28} color="#8B5CF6" />
            </View>
            <View style={styles.storeText}>
              <Text style={styles.storeName}>{store.name}</Text>
              <Text style={styles.storeCat}>{store.category}</Text>
            </View>
            <View style={[styles.statusPill, { backgroundColor: store.isOpen ? '#22c55e22' : '#6b728022' }]}>
              <View style={[styles.statusDot, { backgroundColor: store.isOpen ? '#22c55e' : '#6b7280' }]} />
              <Text style={[styles.statusText, { color: store.isOpen ? '#22c55e' : '#6b7280' }]}>
                {store.isOpen ? 'Open' : 'Closed'}
              </Text>
            </View>
          </View>

          {store.description && <Text style={styles.storeDesc}>{store.description}</Text>}

          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Ionicons name="star" size={14} color="#f59e0b" />
              <Text style={styles.metaText}>{store.rating?.toFixed(1) || '5.0'}</Text>
            </View>
          </View>

          <View style={styles.feeBanner}>
            <View style={styles.feeItem}>
              <Ionicons name="gift-outline" size={16} color="#8B5CF6" />
              <Text style={styles.feeLabel}>3% cashback</Text>
            </View>
            <View style={styles.feeDivider} />
            <View style={styles.feeItem}>
              <Ionicons name="flash-outline" size={16} color="#8B5CF6" />
              <Text style={styles.feeLabel}>One-tap checkout</Text>
            </View>
            <View style={styles.feeDivider} />
            <View style={styles.feeItem}>
              <Ionicons name="wallet-outline" size={16} color="#8B5CF6" />
              <Text style={styles.feeLabel}>Pay with MSH</Text>
            </View>
          </View>
        </View>

        {Object.entries(grouped).map(([cat, products]) => (
          <View key={cat} style={styles.section}>
            <Text style={styles.sectionTitle}>{cat}</Text>
            {products.map((product: any) => {
              const qty = getQty(product.id);
              return (
                <View key={product.id} style={styles.productCard}>
                  <View style={styles.productInfo}>
                    <Text style={styles.productName}>{product.name}</Text>
                    {product.description && (
                      <Text style={styles.productDesc} numberOfLines={2}>{product.description}</Text>
                    )}
                    <Text style={styles.productPrice}>{product.price.toFixed(2)} MSH</Text>
                  </View>
                  <View style={styles.productActions}>
                    <View style={styles.productThumb}>
                      {product.imageUrl ? (
                        <Image source={{ uri: product.imageUrl }} style={{ width: '100%', height: '100%', borderRadius: 10 }} resizeMode="cover" />
                      ) : (
                        <Ionicons name="image-outline" size={24} color={COLORS.textMuted} />
                      )}
                    </View>
                    {qty === 0 ? (
                      <TouchableOpacity style={styles.addBtn} onPress={() => addItem(product, store.id, store.name)}>
                        <Ionicons name="add" size={20} color="#fff" />
                      </TouchableOpacity>
                    ) : (
                      <View style={styles.qtyRow}>
                        <TouchableOpacity style={styles.qtyBtn} onPress={() => updateQty(product.id, qty - 1)}>
                          <Ionicons name="remove" size={16} color="#8B5CF6" />
                        </TouchableOpacity>
                        <Text style={styles.qtyText}>{qty}</Text>
                        <TouchableOpacity style={styles.qtyBtn} onPress={() => addItem(product, store.id, store.name)}>
                          <Ionicons name="add" size={16} color="#8B5CF6" />
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        ))}

        {(store.products || []).length === 0 && (
          <View style={styles.empty}>
            <Ionicons name="pricetags-outline" size={48} color={COLORS.textMuted} />
            <Text style={styles.emptyText}>No products yet</Text>
          </View>
        )}
      </ScrollView>

      {itemCount > 0 && (
        <View style={[styles.cartBar, { paddingBottom: insets.bottom + SPACING.lg }]}>
          <TouchableOpacity style={styles.cartBarBtn} onPress={() => navigation.navigate('ShoppingCart')}>
            <View style={styles.cartBarBadge}><Text style={styles.cartBarBadgeText}>{itemCount}</Text></View>
            <Text style={styles.cartBarLabel}>View Cart</Text>
            <Text style={styles.cartBarTotal}>{total.toFixed(2)} MSH</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}
