import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, TYPOGRAPHY, SPACING } from '../../../theme';
import { fetchApi } from '../../../utils/api';

export default function MyStoreScreen({ navigation }: any) {
  const [store, setStore] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetchApi('/eat/my-store');
      const data = await res.json();
      setStore(data?.id ? data : null);
    } catch { }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, []);

  const toggleOpen = async () => {
    if (!store) return;
    setToggling(true);
    try {
      await fetchApi(`/eat/stores/${store.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isOpen: !store.isOpen }),
      });
      setStore((s: any) => ({ ...s, isOpen: !s.isOpen }));
    } catch { }
    setToggling(false);
  };

  const deleteProduct = async (productId: string) => {
    if (!store) return;
    try {
      await fetchApi(`/eat/stores/${store.id}/products/${productId}`, { method: 'DELETE' });
      setStore((s: any) => ({ ...s, products: s.products.filter((p: any) => p.id !== productId) }));
    } catch { }
  };

  if (loading) return (
    <View style={styles.center}><ActivityIndicator color={COLORS.primary} /></View>
  );

  if (!store) return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Store</Text>
        <View style={{ width: 30 }} />
      </View>
      <View style={styles.empty}>
        <Ionicons name="storefront-outline" size={64} color={COLORS.textMuted} />
        <Text style={styles.emptyTitle}>No store yet</Text>
        <TouchableOpacity style={styles.createBtn} onPress={() => navigation.navigate('AddEditStore', {})}>
          <Text style={styles.createBtnText}>Create my store</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );

  const grouped: Record<string, any[]> = {};
  (store.products || []).forEach((p: any) => {
    const cat = p.category || 'Menu';
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(p);
  });

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{store.name}</Text>
        <TouchableOpacity onPress={() => navigation.navigate('AddEditStore', { store })}>
          <Ionicons name="create-outline" size={22} color={COLORS.text} />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={COLORS.primary} />}
      >
        {/* Store header card */}
        <LinearGradient colors={['#ef4444', '#b91c1c']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.storeCard}>
          <View style={styles.storeCardRow}>
            <View>
              <Text style={styles.storeCardName}>{store.name}</Text>
              <Text style={styles.storeCardCat}>{store.category}</Text>
              {store.address && <Text style={styles.storeCardAddr} numberOfLines={1}>{store.address}</Text>}
            </View>
            <View style={styles.openToggle}>
              <Text style={styles.openLabel}>{store.isOpen ? 'Open' : 'Closed'}</Text>
              <Switch
                value={store.isOpen}
                onValueChange={toggleOpen}
                disabled={toggling}
                trackColor={{ false: '#374151', true: '#22c55e' }}
                thumbColor="#fff"
              />
            </View>
          </View>
          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={styles.statNum}>{store.products?.length ?? 0}</Text>
              <Text style={styles.statLabel}>Products</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statNum}>{store.rating?.toFixed(1) || '5.0'}</Text>
              <Text style={styles.statLabel}>Rating</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Quick actions */}
        <View style={styles.actions}>
          <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('AddEditProduct', { storeId: store.id })}>
            <Ionicons name="add-circle" size={20} color="#ef4444" />
            <Text style={styles.actionText}>Add Product</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('StoreOrders')}>
            <Ionicons name="receipt" size={20} color="#f59e0b" />
            <Text style={styles.actionText}>View Orders</Text>
          </TouchableOpacity>
        </View>

        {/* Products */}
        <Text style={styles.sectionLabel}>PRODUCTS ({store.products?.length ?? 0})</Text>

        {(store.products || []).length === 0 ? (
          <View style={styles.emptyProducts}>
            <Ionicons name="fast-food-outline" size={40} color={COLORS.textMuted} />
            <Text style={styles.emptyProductsText}>No products yet</Text>
            <TouchableOpacity onPress={() => navigation.navigate('AddEditProduct', { storeId: store.id })}>
              <Text style={{ color: '#ef4444', fontWeight: '600', fontSize: 13 }}>Add your first product</Text>
            </TouchableOpacity>
          </View>
        ) : (
          Object.entries(grouped).map(([cat, products]) => (
            <View key={cat} style={styles.catSection}>
              <Text style={styles.catLabel}>{cat}</Text>
              {products.map((p: any) => (
                <View key={p.id} style={styles.productRow}>
                  <View style={styles.productInfo}>
                    <Text style={styles.productName}>{p.name}</Text>
                    {p.description && <Text style={styles.productDesc} numberOfLines={1}>{p.description}</Text>}
                    <Text style={styles.productPrice}>R{p.price.toFixed(2)}</Text>
                  </View>
                  <View style={styles.productActions}>
                    <TouchableOpacity
                      style={styles.editBtn}
                      onPress={() => navigation.navigate('AddEditProduct', { storeId: store.id, product: p })}
                    >
                      <Ionicons name="create-outline" size={16} color={COLORS.textMuted} />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.deleteBtn} onPress={() => deleteProduct(p.id)}>
                      <Ionicons name="trash-outline" size={16} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.lg, paddingVertical: 12, gap: 8 },
  back: { padding: 4 },
  headerTitle: { ...TYPOGRAPHY.h2, flex: 1 },
  storeCard: { margin: SPACING.lg, borderRadius: 16, padding: 18, gap: 14 },
  storeCardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  storeCardName: { color: '#fff', fontSize: 20, fontWeight: '800' },
  storeCardCat: { color: 'rgba(255,255,255,0.7)', fontSize: 13, marginTop: 2 },
  storeCardAddr: { color: 'rgba(255,255,255,0.6)', fontSize: 11, marginTop: 4 },
  openToggle: { alignItems: 'center', gap: 4 },
  openLabel: { color: '#fff', fontSize: 11, fontWeight: '700' },
  statsRow: { flexDirection: 'row', gap: 24 },
  stat: { alignItems: 'center' },
  statNum: { color: '#fff', fontSize: 22, fontWeight: '800' },
  statLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 11 },
  actions: { flexDirection: 'row', gap: 12, paddingHorizontal: SPACING.lg, marginBottom: 16 },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 14,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  actionText: { color: COLORS.text, fontWeight: '600', fontSize: 14 },
  sectionLabel: { ...TYPOGRAPHY.label, fontSize: 11, paddingHorizontal: SPACING.lg, marginBottom: 10 },
  catSection: { paddingHorizontal: SPACING.lg, marginBottom: 8 },
  catLabel: { color: COLORS.textMuted, fontSize: 12, fontWeight: '700', marginBottom: 8 },
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    gap: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  productInfo: { flex: 1 },
  productName: { color: COLORS.text, fontWeight: '600', fontSize: 14, marginBottom: 2 },
  productDesc: { color: COLORS.textMuted, fontSize: 11, marginBottom: 4 },
  productPrice: { color: '#ef4444', fontWeight: '700', fontSize: 14 },
  productActions: { flexDirection: 'row', gap: 8 },
  editBtn: { padding: 8, backgroundColor: COLORS.surfaceElevated, borderRadius: 8 },
  deleteBtn: { padding: 8, backgroundColor: '#ef444415', borderRadius: 8 },
  emptyProducts: { alignItems: 'center', paddingVertical: 40, gap: 10 },
  emptyProductsText: { color: COLORS.textMuted, fontSize: 14 },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16, paddingTop: 80 },
  emptyTitle: { ...TYPOGRAPHY.h2, color: COLORS.textMuted },
  createBtn: { backgroundColor: '#ef4444', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 24 },
  createBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
