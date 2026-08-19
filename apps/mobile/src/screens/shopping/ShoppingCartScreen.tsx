import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, TYPOGRAPHY, SPACING } from '../../theme';
import { useShoppingCart } from '../../context/ShoppingCartContext';
import { fetchApi } from '../../utils/api';

export default function ShoppingCartScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { items, storeId, storeName, updateQty, clearCart, subtotal, rewardEarned, total } = useShoppingCart();
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState('');

  const placeOrder = async () => {
    if (!address.trim()) { setError('Please enter a shipping address'); return; }
    if (!storeId) return;
    setPlacing(true);
    setError('');
    try {
      const res = await fetchApi('/shopping/orders', {
        method: 'POST',
        body: JSON.stringify({
          storeId,
          shippingAddress: address.trim(),
          notes: notes.trim() || undefined,
          items: items.map(i => ({ productId: i.product.id, quantity: i.quantity })),
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Order failed');
      }
      clearCart();
      navigation.replace('ShoppingOrders');
    } catch (e: any) {
      setError(e.message || 'Could not place order. Check your MSH balance.');
    } finally {
      setPlacing(false);
    }
  };

  if (items.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
            <Ionicons name="arrow-back" size={22} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Cart</Text>
          <View style={{ width: 30 }} />
        </View>
        <View style={styles.empty}>
          <Ionicons name="bag-outline" size={64} color={COLORS.textMuted} />
          <Text style={styles.emptyTitle}>Your cart is empty</Text>
          <TouchableOpacity style={styles.browseBtn} onPress={() => navigation.navigate('ShoppingHome')}>
            <Text style={styles.browseBtnText}>Browse stores</Text>
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
        <Text style={styles.headerTitle}>Cart</Text>
        <TouchableOpacity onPress={clearCart}>
          <Text style={{ color: '#F87171', fontSize: 13, fontWeight: '600' }}>Clear</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        <View style={styles.storeRow}>
          <Ionicons name="storefront" size={16} color="#8B5CF6" />
          <Text style={styles.storeLabel}>{storeName}</Text>
        </View>

        <View style={styles.section}>
          {items.map(item => (
            <View key={item.product.id} style={styles.itemRow}>
              <View style={styles.itemInfo}>
                <Text style={styles.itemName}>{item.product.name}</Text>
                <Text style={styles.itemPrice}>{(item.product.price * item.quantity).toFixed(2)} MSH</Text>
              </View>
              <View style={styles.qtyRow}>
                <TouchableOpacity style={styles.qtyBtn} onPress={() => updateQty(item.product.id, item.quantity - 1)}>
                  <Ionicons name="remove" size={16} color="#8B5CF6" />
                </TouchableOpacity>
                <Text style={styles.qtyText}>{item.quantity}</Text>
                <TouchableOpacity style={styles.qtyBtn} onPress={() => updateQty(item.product.id, item.quantity + 1)}>
                  <Ionicons name="add" size={16} color="#8B5CF6" />
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Shipping Address</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your shipping address…"
            placeholderTextColor={COLORS.textMuted}
            value={address}
            onChangeText={setAddress}
            multiline
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notes <Text style={styles.optional}>(optional)</Text></Text>
          <TextInput
            style={styles.input}
            placeholder="Gift wrap, delivery instructions…"
            placeholderTextColor={COLORS.textMuted}
            value={notes}
            onChangeText={setNotes}
          />
        </View>

        <View style={[styles.section, styles.summaryCard]}>
          <Text style={styles.sectionTitle}>Order Summary</Text>
          <View style={styles.feeRow}>
            <Text style={styles.feeLabel}>Subtotal</Text>
            <Text style={styles.feeValue}>{subtotal.toFixed(2)} MSH</Text>
          </View>
          <View style={[styles.feeRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>{total.toFixed(2)} MSH</Text>
          </View>
        </View>

        <View style={styles.rewardCard}>
          <Ionicons name="gift" size={20} color="#8B5CF6" />
          <Text style={styles.rewardText}>You'll earn <Text style={{ fontWeight: '800' }}>{rewardEarned.toFixed(2)} MSH</Text> cashback on this order</Text>
        </View>

        <View style={[styles.section, styles.paymentCard]}>
          <Ionicons name="wallet" size={20} color="#f59e0b" />
          <Text style={styles.paymentText}>Paying from Guranda Wallet (MSH)</Text>
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + SPACING.lg }]}>
        <TouchableOpacity style={styles.orderBtn} onPress={placeOrder} disabled={placing}>
          <LinearGradient colors={['#8B5CF6', '#6366F1']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.orderGradient}>
            {placing ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="flash" size={20} color="#fff" />
                <Text style={styles.orderBtnText}>Checkout · {total.toFixed(2)} MSH</Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.lg, paddingVertical: 12 },
  back: { padding: 4, marginRight: 8 },
  headerTitle: { ...TYPOGRAPHY.h2, flex: 1 },
  storeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: SPACING.lg, paddingBottom: 12 },
  storeLabel: { color: COLORS.textMuted, fontSize: 13 },
  section: { paddingHorizontal: SPACING.lg, marginBottom: 16 },
  sectionTitle: { ...TYPOGRAPHY.label, fontSize: 11, marginBottom: 10 },
  optional: { color: COLORS.textMuted, fontWeight: '400' },
  itemRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, borderRadius: 12,
    padding: 14, marginBottom: 8, gap: 12, borderWidth: 1, borderColor: COLORS.border,
  },
  itemInfo: { flex: 1 },
  itemName: { color: COLORS.text, fontSize: 14, fontWeight: '600', marginBottom: 2 },
  itemPrice: { color: '#8B5CF6', fontWeight: '700', fontSize: 13 },
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  qtyBtn: { width: 28, height: 28, borderRadius: 14, backgroundColor: COLORS.surfaceElevated, justifyContent: 'center', alignItems: 'center' },
  qtyText: { color: COLORS.text, fontWeight: '700', fontSize: 14, minWidth: 20, textAlign: 'center' },
  input: {
    backgroundColor: COLORS.surface, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border,
    padding: 14, color: COLORS.text, fontSize: 14, minHeight: 48,
  },
  summaryCard: { backgroundColor: COLORS.surface, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: COLORS.border, gap: 10 },
  feeRow: { flexDirection: 'row', justifyContent: 'space-between' },
  feeLabel: { color: COLORS.textMuted, fontSize: 13 },
  feeValue: { color: COLORS.text, fontSize: 13, fontWeight: '600' },
  totalRow: { borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 10, marginTop: 2 },
  totalLabel: { color: COLORS.text, fontSize: 15, fontWeight: '700' },
  totalValue: { color: '#8B5CF6', fontSize: 15, fontWeight: '800' },
  rewardCard: {
    flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: SPACING.lg, marginBottom: 16,
    backgroundColor: '#8B5CF615', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#8B5CF630',
  },
  rewardText: { color: COLORS.text, fontSize: 12.5, flex: 1, lineHeight: 18 },
  paymentCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#f59e0b15', borderRadius: 12,
    padding: 14, gap: 10, borderWidth: 1, borderColor: '#f59e0b30',
  },
  paymentText: { color: COLORS.text, fontSize: 13, fontWeight: '600' },
  errorText: { color: '#F87171', fontSize: 13, paddingHorizontal: SPACING.lg, marginBottom: 8 },
  // paddingBottom set dynamically via insets in JSX — a flat SPACING.lg
  // leaves the button flush against the home indicator / gesture bar on
  // notched devices with no clearance from it.
  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0, padding: SPACING.lg,
    backgroundColor: COLORS.background, borderTopWidth: 1, borderTopColor: COLORS.border,
  },
  orderBtn: { borderRadius: 14, overflow: 'hidden' },
  orderGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, padding: 16 },
  orderBtnText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16, paddingTop: 80 },
  emptyTitle: { ...TYPOGRAPHY.h2, color: COLORS.textMuted },
  browseBtn: { backgroundColor: '#8B5CF6', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 24 },
  browseBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
