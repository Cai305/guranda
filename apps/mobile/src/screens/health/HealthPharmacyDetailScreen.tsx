import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, TextInput } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useThemedStyles } from '../../theme/useThemedStyles';
import { fetchApi } from '../../utils/api';
import { formatCurrency } from '../../utils/format';

export default function HealthPharmacyDetailScreen({ navigation, route }: any) {
  const { theme } = useTheme();
  const { COLORS, GRADIENTS } = theme;
  const insets = useSafeAreaInsets();
  const { pharmacyId } = route.params;
  const [pharmacy, setPharmacy] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [address, setAddress] = useState('');
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetchApi(`/health/pharmacies/${pharmacyId}`).then(r => r.json()).then(setPharmacy).catch(() => {}).finally(() => setLoading(false));
  }, [pharmacyId]);

  const addToCart = (productId: string) => setCart(prev => ({ ...prev, [productId]: (prev[productId] || 0) + 1 }));
  const removeFromCart = (productId: string) => setCart(prev => {
    const next = { ...prev };
    if (next[productId] <= 1) delete next[productId];
    else next[productId] -= 1;
    return next;
  });

  const cartItems = Object.entries(cart).filter(([, qty]) => qty > 0);
  const total = cartItems.reduce((sum, [id, qty]) => {
    const product = pharmacy?.products.find((p: any) => p.id === id);
    return sum + (product ? product.price * qty : 0);
  }, 0);

  const checkout = async () => {
    setError('');
    if (!address.trim()) { setError('Delivery address is required'); return; }
    setPlacing(true);
    try {
      const res = await fetchApi('/health/orders', {
        method: 'POST',
        body: JSON.stringify({
          pharmacyId,
          items: cartItems.map(([productId, quantity]) => ({ productId, quantity })),
          deliveryAddress: address.trim(),
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Checkout failed');
      }
      setSuccess(true);
    } catch (e: any) {
      setError(e.message || 'Something went wrong');
    } finally {
      setPlacing(false);
    }
  };

  const styles = useThemedStyles(({ COLORS, TYPOGRAPHY, SPACING }) => ({
    container: { flex: 1, backgroundColor: COLORS.background },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },
    cover: { height: 140, justifyContent: 'center', alignItems: 'center' },
    backBtn: { position: 'absolute', top: 16, left: 16, backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: 20, padding: 8, zIndex: 2 },
    body: { padding: SPACING.lg },
    name: { ...TYPOGRAPHY.h2, marginBottom: 4 },
    address: { color: COLORS.textMuted, fontSize: 12, marginBottom: 8 },
    desc: { color: COLORS.textMuted, fontSize: 14, lineHeight: 21, marginBottom: 16 },
    sectionTitle: { ...TYPOGRAPHY.label, fontSize: 11, marginBottom: 10 },
    hint: { color: COLORS.textMuted, fontSize: 13 },
    productRow: {
      flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, borderRadius: 14,
      padding: 14, marginBottom: 8, borderWidth: 1, borderColor: COLORS.border, gap: 12,
    },
    productName: { color: COLORS.text, fontWeight: '600', fontSize: 14, marginBottom: 2 },
    rxNote: { color: '#f59e0b', fontSize: 10, fontWeight: '700', marginBottom: 2 },
    productPrice: { color: '#F87171', fontWeight: '700', fontSize: 14 },
    addBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#F87171', justifyContent: 'center', alignItems: 'center' },
    qtyRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    qtyBtn: { width: 28, height: 28, borderRadius: 14, backgroundColor: COLORS.surfaceElevated, justifyContent: 'center', alignItems: 'center' },
    qtyText: { color: COLORS.text, fontWeight: '700', fontSize: 15, minWidth: 20, textAlign: 'center' },
    // paddingBottom set dynamically via insets in JSX — a flat SPACING.lg
    // leaves the button flush against the home indicator / gesture bar on
    // notched devices with no clearance from it.
    checkoutBar: {
      position: 'absolute', bottom: 0, left: 0, right: 0, padding: SPACING.lg, gap: 10,
      backgroundColor: COLORS.background, borderTopWidth: 1, borderTopColor: COLORS.border,
    },
    input: { backgroundColor: COLORS.surface, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, padding: 12, color: COLORS.text, fontSize: 14 },
    errorText: { color: '#ef4444', fontSize: 13 },
    checkoutBtn: { backgroundColor: '#F87171', borderRadius: 14, paddingVertical: 15, alignItems: 'center' },
    checkoutBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
    successWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: SPACING.lg, gap: 12 },
    successIcon: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#22c55e', justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
    successTitle: { ...TYPOGRAPHY.h2 },
    successSub: { color: COLORS.textMuted, fontSize: 14, marginBottom: 16, textAlign: 'center' },
    successBtn: { backgroundColor: '#F87171', borderRadius: 14, paddingVertical: 14, paddingHorizontal: 32 },
    successBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
    successLink: { color: COLORS.textMuted, fontSize: 13, marginTop: 12 },
  }));

  if (loading) return <View style={styles.center}><ActivityIndicator color={COLORS.primary} size="large" /></View>;
  if (!pharmacy) return <View style={styles.center}><Text style={{ color: COLORS.textMuted }}>Pharmacy not found</Text></View>;

  if (success) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.successWrap}>
          <View style={styles.successIcon}><Ionicons name="checkmark" size={40} color="#fff" /></View>
          <Text style={styles.successTitle}>Order placed!</Text>
          <Text style={styles.successSub}>{pharmacy.name} · {formatCurrency(total)}</Text>
          <TouchableOpacity style={styles.successBtn} onPress={() => navigation.navigate('HealthOrders')}>
            <Text style={styles.successBtnText}>View My Orders</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.successLink}>Back to browsing</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: cartItems.length > 0 ? 220 : 40 }}>
        <LinearGradient colors={GRADIENTS.crimson} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.cover}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>
          <Ionicons name="medical" size={48} color="rgba(255,255,255,0.3)" />
        </LinearGradient>

        <View style={styles.body}>
          <Text style={styles.name}>{pharmacy.name}</Text>
          {pharmacy.address && <Text style={styles.address}>{pharmacy.address}</Text>}
          {pharmacy.description && <Text style={styles.desc}>{pharmacy.description}</Text>}

          <Text style={styles.sectionTitle}>PRODUCTS</Text>
          {(pharmacy.products || []).length === 0 ? (
            <Text style={styles.hint}>No products yet.</Text>
          ) : (
            pharmacy.products.map((product: any) => {
              const qty = cart[product.id] || 0;
              return (
                <View key={product.id} style={styles.productRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.productName}>{product.name}</Text>
                    {product.requiresPrescription && <Text style={styles.rxNote}>Requires prescription</Text>}
                    <Text style={styles.productPrice}>{formatCurrency(product.price)}</Text>
                  </View>
                  {qty === 0 ? (
                    <TouchableOpacity style={styles.addBtn} onPress={() => addToCart(product.id)}>
                      <Ionicons name="add" size={20} color="#fff" />
                    </TouchableOpacity>
                  ) : (
                    <View style={styles.qtyRow}>
                      <TouchableOpacity style={styles.qtyBtn} onPress={() => removeFromCart(product.id)}>
                        <Ionicons name="remove" size={16} color="#F87171" />
                      </TouchableOpacity>
                      <Text style={styles.qtyText}>{qty}</Text>
                      <TouchableOpacity style={styles.qtyBtn} onPress={() => addToCart(product.id)}>
                        <Ionicons name="add" size={16} color="#F87171" />
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              );
            })
          )}
        </View>
      </ScrollView>

      {cartItems.length > 0 && (
        <View style={[styles.checkoutBar, { paddingBottom: insets.bottom + theme.SPACING.lg }]}>
          <TextInput style={styles.input} placeholder="Delivery address" placeholderTextColor={COLORS.textMuted} value={address} onChangeText={setAddress} />
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          <TouchableOpacity style={styles.checkoutBtn} onPress={checkout} disabled={placing}>
            {placing ? <ActivityIndicator color="#fff" /> : <Text style={styles.checkoutBtnText}>Checkout · {formatCurrency(total)}</Text>}
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}
