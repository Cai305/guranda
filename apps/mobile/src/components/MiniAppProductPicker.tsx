import React, { useState, useEffect } from 'react';
import {
  View, Text, Modal, TouchableOpacity, TextInput,
  FlatList, Image, ActivityIndicator, ScrollView, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useThemedStyles } from '../theme/useThemedStyles';
import { fetchApi } from '../utils/api';
import { useShoppingCart } from '../context/ShoppingCartContext';
import { ProductCardData } from './cards/ProductMiniCard';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSendProduct: (product: ProductCardData) => void;
}

export default function MiniAppProductPicker({ visible, onClose, onSendProduct }: Props) {
  const { theme } = useTheme();
  const { COLORS, GRADIENTS, SPACING } = theme;

  // ── Mini apps that expose product/service browsing ───────────
  const PRODUCT_APPS = [
    { id: 'shopping', label: 'Shopping', icon: 'bag-handle', gradient: GRADIENTS.emerald, endpoint: '/shopping/products' },
    { id: 'eat', label: 'Food & Eat', icon: 'restaurant', gradient: GRADIENTS.sunset, endpoint: '/eat/products' },
    { id: 'health', label: 'Health', icon: 'medkit', gradient: ['#10B981', '#059669'] as [string, string], endpoint: '/health/products' },
    { id: 'marketplace', label: 'Marketplace', icon: 'pricetags', gradient: GRADIENTS.ocean, endpoint: '/marketplace/listings' },
    { id: 'travel', label: 'Travel', icon: 'airplane', gradient: GRADIENTS.aurora, endpoint: '/travel/stays' },
    { id: 'property', label: 'Property', icon: 'home', gradient: GRADIENTS.midnight, endpoint: '/property/listings' },
  ];

  const [step, setStep] = useState<'apps' | 'products'>('apps');
  const [selectedApp, setSelectedApp] = useState(PRODUCT_APPS[0]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  const { addItem } = useShoppingCart();

  // Reset when closed
  useEffect(() => {
    if (!visible) {
      setStep('apps');
      setSearch('');
      setProducts([]);
    }
  }, [visible]);

  const openApp = async (app: typeof PRODUCT_APPS[0]) => {
    setSelectedApp(app);
    setStep('products');
    setLoading(true);
    try {
      const res = await fetchApi(app.endpoint);
      const data = await res.json();
      setProducts(Array.isArray(data) ? data : []);
    } catch {
      setProducts([]);
    }
    setLoading(false);
  };

  const filtered = products.filter(p =>
    (p.name || p.title || '').toLowerCase().includes(search.toLowerCase())
  );

  const toProductCard = (raw: any): ProductCardData => ({
    id: raw.id,
    name: raw.name || raw.title || 'Product',
    price: typeof raw.price === 'number' ? raw.price : (parseFloat(raw.price) || 0),
    imageUrl: raw.imageUrl || raw.mediaUrl || raw.images?.[0],
    storeId: raw.storeId || raw.store?.id || 'unknown',
    storeName: raw.storeName || raw.store?.name || selectedApp.label,
    category: raw.category,
  });

  const handleSend = (raw: any) => {
    onSendProduct(toProductCard(raw));
    onClose();
  };

  const styles = useThemedStyles(({ COLORS, RADIUS, SPACING, TYPOGRAPHY }) => ({
    sheet: { flex: 1, backgroundColor: COLORS.surface },
    handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: COLORS.border, alignSelf: 'center', marginTop: 10, marginBottom: 6 },
    header: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md,
      borderBottomWidth: 1, borderBottomColor: COLORS.border,
    },
    backBtn: { width: 36, height: 36, justifyContent: 'center' },
    closeBtn: { width: 36, height: 36, justifyContent: 'center', alignItems: 'flex-end' },
    headerTitle: { ...TYPOGRAPHY.h2, fontSize: 17 },
    subtitle: { color: COLORS.textMuted, fontSize: 14, textAlign: 'center', marginBottom: SPACING.lg, paddingHorizontal: SPACING.md },
    appGrid: { padding: SPACING.lg, gap: SPACING.md },
    grid: { gap: 10 },
    appTile: {
      flexDirection: 'row', alignItems: 'center', gap: 14,
      backgroundColor: COLORS.surfaceElevated, borderRadius: RADIUS.lg,
      borderWidth: 1, borderColor: COLORS.border, padding: 16,
    },
    appIcon: { width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
    appLabel: { flex: 1, color: COLORS.text, fontWeight: '700', fontSize: 16 },

    // Search
    searchWrap: { paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md },
    searchBar: {
      flexDirection: 'row', alignItems: 'center', gap: 8,
      backgroundColor: COLORS.surfaceElevated, borderRadius: RADIUS.pill,
      borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 14, paddingVertical: 10,
    },
    searchInput: { flex: 1, color: COLORS.text, fontSize: 14 },

    // Empty
    empty: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 10, paddingBottom: 60 },
    emptyText: { color: COLORS.textMuted, fontSize: 15 },

    // Product row
    productRow: {
      flexDirection: 'row', alignItems: 'center', gap: 12,
      backgroundColor: COLORS.surfaceElevated, borderRadius: RADIUS.lg,
      borderWidth: 1, borderColor: COLORS.border, padding: 12,
    },
    productThumb: { width: 56, height: 56, borderRadius: RADIUS.md, overflow: 'hidden' },
    productThumbImg: { width: 56, height: 56, borderRadius: RADIUS.md, justifyContent: 'center', alignItems: 'center' },
    productInfo: { flex: 1, gap: 2 },
    productName: { color: COLORS.text, fontWeight: '700', fontSize: 14 },
    productStore: { color: COLORS.textMuted, fontSize: 12 },
    productPrice: { color: COLORS.secondary, fontWeight: '800', fontSize: 15, marginTop: 3 },
    productActions: { gap: 6 },
    sendBtn: { borderRadius: RADIUS.pill, overflow: 'hidden' },
    sendBtnGrad: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 7 },
    sendBtnText: { color: '#fff', fontWeight: '700', fontSize: 12 },
    suggestBtn: {
      flexDirection: 'row', alignItems: 'center', gap: 4,
      borderWidth: 1, borderColor: 'rgba(139,92,246,0.35)', borderRadius: RADIUS.pill,
      paddingHorizontal: 10, paddingVertical: 6, backgroundColor: 'rgba(139,92,246,0.08)',
    },
    suggestBtnText: { color: COLORS.primary, fontWeight: '700', fontSize: 12 },
  }));

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.sheet}>
        {/* Drag handle */}
        <View style={styles.handle} />

        {/* Header */}
        <View style={styles.header}>
          {step === 'products' ? (
            <TouchableOpacity onPress={() => { setStep('apps'); setSearch(''); }} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={22} color={COLORS.text} />
            </TouchableOpacity>
          ) : (
            <View style={{ width: 36 }} />
          )}
          <Text style={styles.headerTitle}>
            {step === 'apps' ? 'Choose a Mini App' : selectedApp.label}
          </Text>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Ionicons name="close" size={22} color={COLORS.textMuted} />
          </TouchableOpacity>
        </View>

        {step === 'apps' ? (
          /* ── App grid ─────────────────────────────── */
          <ScrollView contentContainerStyle={styles.appGrid}>
            <Text style={styles.subtitle}>Select a mini app to browse products and share with your contact</Text>
            <View style={styles.grid}>
              {PRODUCT_APPS.map(app => (
                <TouchableOpacity
                  key={app.id}
                  style={styles.appTile}
                  onPress={() => openApp(app)}
                  activeOpacity={0.8}
                >
                  <LinearGradient colors={app.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.appIcon}>
                    <Ionicons name={app.icon as any} size={28} color="#fff" />
                  </LinearGradient>
                  <Text style={styles.appLabel}>{app.label}</Text>
                  <Ionicons name="chevron-forward" size={14} color={COLORS.textMuted} style={{ marginTop: 2 }} />
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        ) : (
          /* ── Product list ────────────────────────── */
          <View style={{ flex: 1 }}>
            {/* Search bar */}
            <View style={styles.searchWrap}>
              <View style={styles.searchBar}>
                <Ionicons name="search" size={16} color={COLORS.textMuted} />
                <TextInput
                  style={styles.searchInput}
                  placeholder={`Search ${selectedApp.label}...`}
                  placeholderTextColor={COLORS.textMuted}
                  value={search}
                  onChangeText={setSearch}
                />
              </View>
            </View>

            {loading ? (
              <ActivityIndicator color={COLORS.primary} style={{ marginTop: 40 }} size="large" />
            ) : filtered.length === 0 ? (
              <View style={styles.empty}>
                <Ionicons name="bag-handle-outline" size={48} color={COLORS.textMuted} />
                <Text style={styles.emptyText}>No products found</Text>
              </View>
            ) : (
              <FlatList
                data={filtered}
                keyExtractor={(item, i) => item.id || i.toString()}
                contentContainerStyle={{ padding: SPACING.lg, gap: 10 }}
                renderItem={({ item }) => {
                  const p = toProductCard(item);
                  return (
                    <View style={styles.productRow}>
                      {/* Thumbnail */}
                      <View style={styles.productThumb}>
                        {p.imageUrl ? (
                          <Image source={{ uri: p.imageUrl }} style={styles.productThumbImg} resizeMode="cover" />
                        ) : (
                          <LinearGradient colors={selectedApp.gradient} style={styles.productThumbImg}>
                            <Ionicons name="bag-handle" size={20} color="rgba(255,255,255,0.5)" />
                          </LinearGradient>
                        )}
                      </View>

                      {/* Info */}
                      <View style={styles.productInfo}>
                        <Text style={styles.productName} numberOfLines={1}>{p.name}</Text>
                        <Text style={styles.productStore} numberOfLines={1}>{p.storeName}</Text>
                        <Text style={styles.productPrice}>R {p.price.toFixed(2)}</Text>
                      </View>

                      {/* Actions */}
                      <View style={styles.productActions}>
                        <TouchableOpacity
                          style={styles.sendBtn}
                          onPress={() => handleSend(item)}
                          activeOpacity={0.85}
                        >
                          <LinearGradient colors={GRADIENTS.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.sendBtnGrad}>
                            <Ionicons name="send" size={13} color="#fff" />
                            <Text style={styles.sendBtnText}>Send</Text>
                          </LinearGradient>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.suggestBtn}
                          onPress={() => {
                            addItem(
                              { id: p.id, name: p.name, price: p.price, imageUrl: p.imageUrl, category: p.category },
                              p.storeId,
                              p.storeName,
                            );
                            Alert.alert('Added ✓', `${p.name} added to your cart.`);
                          }}
                          activeOpacity={0.85}
                        >
                          <Ionicons name="bag-add-outline" size={13} color={COLORS.primary} />
                          <Text style={styles.suggestBtnText}>Cart</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                }}
              />
            )}
          </View>
        )}
      </View>
    </Modal>
  );
}
