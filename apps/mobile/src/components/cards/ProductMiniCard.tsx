import React from 'react';
import {
  View, Text, TouchableOpacity, Image, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useThemedStyles } from '../../theme/useThemedStyles';
import { useShoppingCart } from '../../context/ShoppingCartContext';

export interface ProductCardData {
  id: string;
  name: string;
  price: number;
  imageUrl?: string;
  storeId: string;
  storeName: string;
  category?: string;
  /** Which mini app this came from (shopping/eat/health/marketplace/travel/property) — drives "View"'s destination. */
  sourceApp?: string;
}

// Each mini app has its own detail (or, where no per-product detail screen
// exists, the closest available store/listing) screen, param name, and which
// id field on ProductCardData to send as that param. Screens registered on
// the root navigator (marketplace, property) resolve fine with a bare
// navigate() from anywhere; the rest live nested inside HubStackNavigator
// under the "Life" tab, so they need the nested navigate('Life', {screen,
// params}) form to be reachable from a different tab's stack (e.g. from
// inside a chat conversation).
const PRODUCT_VIEW_TARGETS: Record<
  string,
  { screen: string; param: string; idField: 'id' | 'storeId'; nested: boolean }
> = {
  shopping: { screen: 'ShoppingProduct', param: 'productId', idField: 'id', nested: true },
  marketplace: { screen: 'MarketplaceDetail', param: 'listingId', idField: 'id', nested: false },
  // Eat/Health have no standalone per-product detail screen — the store/
  // pharmacy screen is the finest-grained real view available.
  eat: { screen: 'EatStore', param: 'storeId', idField: 'storeId', nested: true },
  health: { screen: 'HealthPharmacyDetail', param: 'pharmacyId', idField: 'storeId', nested: true },
  travel: { screen: 'TravelStayDetail', param: 'stayId', idField: 'id', nested: true },
  property: { screen: 'PropertyDetail', param: 'propertyId', idField: 'id', nested: false },
};

interface Props {
  product: ProductCardData;
  /** compact = small horizontal card (inside chat bubble) */
  compact?: boolean;
  onBuyNow?: (product: ProductCardData) => void;
  navigation?: any;
}

export default function ProductMiniCard({ product, compact = false, onBuyNow, navigation }: Props) {
  const { addItem } = useShoppingCart();
  const { theme } = useTheme();
  const { COLORS, GRADIENTS } = theme;
  const styles = useThemedStyles(({ COLORS, RADIUS }) => ({
    // ── Compact (chat bubble) ──────────────────────────────────
    compactCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'rgba(18,18,26,0.95)',
      borderRadius: RADIUS.md,
      borderWidth: 1,
      borderColor: 'rgba(139,92,246,0.25)',
      padding: 10,
      gap: 10,
      minWidth: 220,
      maxWidth: 280,
    },
    compactThumb: { width: 50, height: 50, borderRadius: RADIUS.sm, overflow: 'hidden' },
    compactThumbImg: { width: 50, height: 50, borderRadius: RADIUS.sm, justifyContent: 'center', alignItems: 'center' },
    compactInfo: { flex: 1, gap: 2 },
    compactName: { color: COLORS.text, fontWeight: '700', fontSize: 13 },
    compactStore: { color: COLORS.textMuted, fontSize: 11 },
    compactPrice: { color: COLORS.secondary, fontWeight: '800', fontSize: 14, marginTop: 2 },
    compactActions: { gap: 6, alignItems: 'center' },
    compactCartBtn: {
      width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(139,92,246,0.15)',
      borderWidth: 1, borderColor: 'rgba(139,92,246,0.35)', justifyContent: 'center', alignItems: 'center',
    },
    compactBuyBtn: { backgroundColor: COLORS.primary, borderRadius: RADIUS.pill, paddingHorizontal: 10, paddingVertical: 5 },
    compactBuyText: { color: '#fff', fontWeight: '700', fontSize: 11 },

    // ── Full card (story/trending overlay) ───────────────────
    fullCard: {
      backgroundColor: COLORS.surface,
      borderRadius: RADIUS.xl,
      borderWidth: 1,
      borderColor: COLORS.border,
      overflow: 'hidden',
      width: 240,
    },
    heroWrap: { position: 'relative', height: 140 },
    heroImg: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' },
    pricePill: {
      position: 'absolute', bottom: 10, right: 10,
      backgroundColor: 'rgba(0,0,0,0.72)', borderRadius: RADIUS.pill,
      paddingHorizontal: 10, paddingVertical: 4,
      borderWidth: 1, borderColor: 'rgba(139,92,246,0.4)',
    },
    pricePillText: { color: '#fff', fontWeight: '800', fontSize: 14 },
    fullBody: { padding: 14, gap: 8 },
    fullName: { color: COLORS.text, fontWeight: '700', fontSize: 15, lineHeight: 20 },
    storeRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    storeName: { color: COLORS.primary, fontSize: 12, fontWeight: '600', flex: 1 },
    ctaRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
    cartBtn: {
      flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5,
      borderWidth: 1, borderColor: 'rgba(139,92,246,0.4)', borderRadius: RADIUS.pill,
      paddingVertical: 9, backgroundColor: 'rgba(139,92,246,0.08)',
    },
    cartBtnText: { color: COLORS.primary, fontWeight: '700', fontSize: 13 },
    buyBtn: { flex: 1, borderRadius: RADIUS.pill, overflow: 'hidden' },
    buyBtnGrad: { alignItems: 'center', paddingVertical: 9 },
    buyBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  }));

  const handleAddToCart = () => {
    addItem(
      { id: product.id, name: product.name, price: product.price, imageUrl: product.imageUrl, category: product.category },
      product.storeId,
      product.storeName,
    );
    Alert.alert('Added to cart ✓', `${product.name} is in your cart.`);
  };

  const handleView = () => {
    const target = product.sourceApp ? PRODUCT_VIEW_TARGETS[product.sourceApp] : undefined;
    if (!target || !navigation) return;
    const params = { [target.param]: product[target.idField] };
    if (target.nested) {
      navigation.navigate('Life', { screen: target.screen, params });
    } else {
      navigation.navigate(target.screen, params);
    }
  };

  const handleBuyNow = () => {
    if (onBuyNow) { onBuyNow(product); return; }
    addItem(
      { id: product.id, name: product.name, price: product.price, imageUrl: product.imageUrl, category: product.category },
      product.storeId,
      product.storeName,
    );
    navigation?.navigate('Life', { screen: 'ShoppingCart' });
  };

  if (compact) {
    const canView = !!product.sourceApp && !!navigation;
    return (
      <TouchableOpacity
        style={styles.compactCard}
        onPress={canView ? handleView : undefined}
        activeOpacity={canView ? 0.85 : 1}
        disabled={!canView}
      >
        {/* Thumbnail */}
        <View style={styles.compactThumb}>
          {product.imageUrl ? (
            <Image source={{ uri: product.imageUrl }} style={styles.compactThumbImg} resizeMode="cover" />
          ) : (
            <LinearGradient colors={GRADIENTS.emerald} style={styles.compactThumbImg}>
              <Ionicons name="bag-handle" size={20} color="rgba(255,255,255,0.5)" />
            </LinearGradient>
          )}
        </View>

        {/* Info */}
        <View style={styles.compactInfo}>
          <Text style={styles.compactName} numberOfLines={1}>{product.name}</Text>
          <Text style={styles.compactStore} numberOfLines={1}>{product.storeName}</Text>
          <Text style={styles.compactPrice}>R {product.price.toFixed(2)}</Text>
        </View>

        {/* Actions */}
        <View style={styles.compactActions}>
          <TouchableOpacity style={styles.compactCartBtn} onPress={handleAddToCart} activeOpacity={0.8}>
            <Ionicons name="bag-add" size={14} color={COLORS.primary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.compactBuyBtn} onPress={handleBuyNow} activeOpacity={0.8}>
            <Text style={styles.compactBuyText}>Buy</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  }

  // Full card
  return (
    <View style={styles.fullCard}>
      {/* Hero image */}
      <View style={styles.heroWrap}>
        {product.imageUrl ? (
          <Image source={{ uri: product.imageUrl }} style={styles.heroImg} resizeMode="cover" />
        ) : (
          <LinearGradient colors={GRADIENTS.emerald} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.heroImg}>
            <Ionicons name="bag-handle" size={48} color="rgba(255,255,255,0.35)" />
          </LinearGradient>
        )}
        {/* Price tag */}
        <View style={styles.pricePill}>
          <Text style={styles.pricePillText}>R {product.price.toFixed(2)}</Text>
        </View>
      </View>

      {/* Body */}
      <View style={styles.fullBody}>
        <Text style={styles.fullName} numberOfLines={2}>{product.name}</Text>
        <View style={styles.storeRow}>
          <Ionicons name="storefront-outline" size={13} color={COLORS.primary} />
          <Text style={styles.storeName} numberOfLines={1}>{product.storeName}</Text>
        </View>

        {/* CTA row */}
        <View style={styles.ctaRow}>
          <TouchableOpacity style={styles.cartBtn} onPress={handleAddToCart} activeOpacity={0.85}>
            <Ionicons name="bag-add-outline" size={16} color={COLORS.primary} />
            <Text style={styles.cartBtnText}>Add to Cart</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.buyBtn} onPress={handleBuyNow} activeOpacity={0.85}>
            <LinearGradient colors={GRADIENTS.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.buyBtnGrad}>
              <Text style={styles.buyBtnText}>Buy Now</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}
