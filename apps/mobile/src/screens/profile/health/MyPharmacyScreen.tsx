import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../context/ThemeContext';
import { useThemedStyles } from '../../../theme/useThemedStyles';
import { fetchApi } from '../../../utils/api';
import { formatCurrency } from '../../../utils/format';

export default function MyPharmacyScreen({ navigation }: any) {
  const { theme } = useTheme();
  const { COLORS, GRADIENTS } = theme;
  const [pharmacy, setPharmacy] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetchApi('/health/pharmacies/mine');
      const data = await res.json();
      setPharmacy(data?.id ? data : null);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggleOpen = async () => {
    if (!pharmacy) return;
    setToggling(true);
    try {
      await fetchApi(`/health/pharmacies/${pharmacy.id}`, { method: 'PUT', body: JSON.stringify({ isOpen: !pharmacy.isOpen }) });
      setPharmacy((p: any) => ({ ...p, isOpen: !p.isOpen }));
    } catch {}
    setToggling(false);
  };

  const deleteProduct = async (productId: string) => {
    if (!pharmacy) return;
    setDeletingId(productId);
    try {
      await fetchApi(`/health/pharmacies/${pharmacy.id}/products/${productId}`, { method: 'DELETE' });
      setPharmacy((p: any) => ({ ...p, products: p.products.filter((x: any) => x.id !== productId) }));
    } catch {} finally {
      setDeletingId(null);
    }
  };

  const styles = useThemedStyles(({ COLORS, TYPOGRAPHY, SPACING }) => ({
    container: { flex: 1, backgroundColor: COLORS.background },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.lg, paddingVertical: 12, gap: 8 },
    back: { padding: 4 },
    headerTitle: { ...TYPOGRAPHY.h2, flex: 1 },
    empty: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16, paddingTop: 80 },
    emptyTitle: { ...TYPOGRAPHY.h2, color: COLORS.textMuted },
    createBtn: { backgroundColor: '#F87171', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 24 },
    createBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
    card: { margin: SPACING.lg, borderRadius: 16, padding: 18, gap: 14 },
    cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    cardName: { color: '#fff', fontSize: 20, fontWeight: '800' },
    cardSub: { color: 'rgba(255,255,255,0.7)', fontSize: 13, marginTop: 2 },
    openToggle: { alignItems: 'center', gap: 4 },
    openLabel: { color: '#fff', fontSize: 11, fontWeight: '700' },
    statsRow: { flexDirection: 'row', gap: 24 },
    stat: { alignItems: 'center' },
    statNum: { color: '#fff', fontSize: 22, fontWeight: '800' },
    statLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 11 },
    actions: { flexDirection: 'row', gap: 12, paddingHorizontal: SPACING.lg, marginBottom: 16 },
    actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: COLORS.surface, borderRadius: 12, padding: 14, justifyContent: 'center', borderWidth: 1, borderColor: COLORS.border },
    actionText: { color: COLORS.text, fontWeight: '600', fontSize: 14 },
    sectionLabel: { ...TYPOGRAPHY.label, fontSize: 11, paddingHorizontal: SPACING.lg, marginBottom: 10 },
    emptyProducts: { alignItems: 'center', paddingVertical: 40, gap: 10 },
    emptyProductsText: { color: COLORS.textMuted, fontSize: 14 },
    productRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, borderRadius: 12, padding: 12, marginHorizontal: SPACING.lg, marginBottom: 8, gap: 12, borderWidth: 1, borderColor: COLORS.border },
    productName: { color: COLORS.text, fontWeight: '600', fontSize: 14, marginBottom: 2 },
    productPrice: { color: '#F87171', fontWeight: '700', fontSize: 14 },
    productActions: { flexDirection: 'row', gap: 8 },
    editBtn: { padding: 8, backgroundColor: COLORS.surfaceElevated, borderRadius: 8 },
    deleteBtn: { padding: 8, backgroundColor: '#ef444415', borderRadius: 8 },
  }));

  if (loading) return <View style={styles.center}><ActivityIndicator color={COLORS.primary} /></View>;

  if (!pharmacy) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
            <Ionicons name="arrow-back" size={22} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Pharmacy</Text>
          <View style={{ width: 30 }} />
        </View>
        <View style={styles.empty}>
          <Ionicons name="medical-outline" size={64} color={COLORS.textMuted} />
          <Text style={styles.emptyTitle}>No pharmacy yet</Text>
          <TouchableOpacity style={styles.createBtn} onPress={() => navigation.navigate('AddEditHealthPharmacy', {})}>
            <Text style={styles.createBtnText}>Register my pharmacy</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{pharmacy.name}</Text>
        <TouchableOpacity onPress={() => navigation.navigate('AddEditHealthPharmacy', { pharmacy })}>
          <Ionicons name="create-outline" size={22} color={COLORS.text} />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={COLORS.primary} />}
      >
        <LinearGradient colors={GRADIENTS.crimson} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.card}>
          <View style={styles.cardRow}>
            <View>
              <Text style={styles.cardName}>{pharmacy.name}</Text>
              <Text style={styles.cardSub}>{pharmacy.address || 'No address set'}</Text>
            </View>
            <View style={styles.openToggle}>
              <Text style={styles.openLabel}>{pharmacy.isOpen ? 'Open' : 'Closed'}</Text>
              <Switch value={pharmacy.isOpen} onValueChange={toggleOpen} disabled={toggling} trackColor={{ false: '#374151', true: '#22c55e' }} thumbColor="#fff" />
            </View>
          </View>
          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={styles.statNum}>{pharmacy.products?.length ?? 0}</Text>
              <Text style={styles.statLabel}>Products</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statNum}>{pharmacy.rating?.toFixed(1) || '0.0'}</Text>
              <Text style={styles.statLabel}>Rating</Text>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.actions}>
          <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('AddEditHealthProduct', { pharmacyId: pharmacy.id })}>
            <Ionicons name="add-circle" size={20} color="#F87171" />
            <Text style={styles.actionText}>Add Product</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('HealthPharmacyOrders')}>
            <Ionicons name="receipt" size={20} color="#f59e0b" />
            <Text style={styles.actionText}>View Orders</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionLabel}>PRODUCTS ({pharmacy.products?.length ?? 0})</Text>
        {(pharmacy.products || []).length === 0 ? (
          <View style={styles.emptyProducts}>
            <Ionicons name="medical-outline" size={40} color={COLORS.textMuted} />
            <Text style={styles.emptyProductsText}>No products yet</Text>
          </View>
        ) : (
          pharmacy.products.map((p: any) => (
            <View key={p.id} style={styles.productRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.productName}>{p.name}</Text>
                <Text style={styles.productPrice}>{formatCurrency(p.price)}</Text>
              </View>
              <View style={styles.productActions}>
                <TouchableOpacity style={styles.editBtn} onPress={() => navigation.navigate('AddEditHealthProduct', { pharmacyId: pharmacy.id, product: p })}>
                  <Ionicons name="create-outline" size={16} color={COLORS.textMuted} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.deleteBtn} onPress={() => deleteProduct(p.id)} disabled={deletingId === p.id}>
                  {deletingId === p.id ? (
                    <ActivityIndicator color="#ef4444" size="small" />
                  ) : (
                    <Ionicons name="trash-outline" size={16} color="#ef4444" />
                  )}
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
