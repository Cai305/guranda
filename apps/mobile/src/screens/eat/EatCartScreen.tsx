import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, TYPOGRAPHY, SPACING } from '../../theme';
import { useCart } from '../../context/CartContext';
import { fetchApi } from '../../utils/api';

export default function EatCartScreen({ navigation }: any) {
  const { items, storeId, storeName, updateQty, clearCart, subtotal, serviceFee, deliveryFee, total } = useCart();
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState('');

  const placeOrder = async () => {
    if (!address.trim()) { setError('Please enter a delivery address'); return; }
    if (!storeId) return;
    setPlacing(true);
    setError('');
    try {
      const res = await fetchApi('/eat/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeId,
          deliveryAddress: address.trim(),
          notes: notes.trim() || undefined,
          items: items.map(i => ({ productId: i.product.id, quantity: i.quantity })),
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Order failed');
      }
      clearCart();
      navigation.replace('EatOrders');
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
          <TouchableOpacity style={styles.browseBtn} onPress={() => navigation.navigate('EatHome')}>
            <Text style={styles.browseBtnText}>Browse restaurants</Text>
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
          <Text style={{ color: '#ef4444', fontSize: 13, fontWeight: '600' }}>Clear</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Store name */}
        <View style={styles.storeRow}>
          <Ionicons name="restaurant" size={16} color="#ef4444" />
          <Text style={styles.storeLabel}>{storeName}</Text>
        </View>

        {/* Items */}
        <View style={styles.section}>
          {items.map(item => (
            <View key={item.product.id} style={styles.itemRow}>
              <View style={styles.itemInfo}>
                <Text style={styles.itemName}>{item.product.name}</Text>
                <Text style={styles.itemPrice}>R{(item.product.price * item.quantity).toFixed(2)}</Text>
              </View>
              <View style={styles.qtyRow}>
                <TouchableOpacity style={styles.qtyBtn} onPress={() => updateQty(item.product.id, item.quantity - 1)}>
                  <Ionicons name="remove" size={16} color="#ef4444" />
                </TouchableOpacity>
                <Text style={styles.qtyText}>{item.quantity}</Text>
                <TouchableOpacity style={styles.qtyBtn} onPress={() => updateQty(item.product.id, item.quantity + 1)}>
                  <Ionicons name="add" size={16} color="#ef4444" />
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>

        {/* Delivery address */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Delivery Address</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your delivery address…"
            placeholderTextColor={COLORS.textMuted}
            value={address}
            onChangeText={setAddress}
            multiline
          />
        </View>

        {/* Notes */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Special Instructions <Text style={styles.optional}>(optional)</Text></Text>
          <TextInput
            style={styles.input}
            placeholder="No onions, extra sauce…"
            placeholderTextColor={COLORS.textMuted}
            value={notes}
            onChangeText={setNotes}
          />
        </View>

        {/* Fee breakdown */}
        <View style={[styles.section, styles.summaryCard]}>
          <Text style={styles.sectionTitle}>Order Summary</Text>
          <View style={styles.feeRow}>
            <Text style={styles.feeLabel}>Subtotal</Text>
            <Text style={styles.feeValue}>R{subtotal.toFixed(2)}</Text>
          </View>
          <View style={styles.feeRow}>
            <Text style={styles.feeLabel}>Service fee (1.5%)</Text>
            <Text style={styles.feeValue}>R{serviceFee.toFixed(2)}</Text>
          </View>
          <View style={styles.feeRow}>
            <Text style={styles.feeLabel}>Delivery fee</Text>
            <Text style={styles.feeValue}>R{deliveryFee.toFixed(2)}</Text>
          </View>
          <View style={[styles.feeRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>R{total.toFixed(2)} MSH</Text>
          </View>
        </View>

        {/* Payment method */}
        <View style={[styles.section, styles.paymentCard]}>
          <Ionicons name="wallet" size={20} color="#f59e0b" />
          <Text style={styles.paymentText}>Paying from Guranda Wallet (MSH)</Text>
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}
      </ScrollView>

      {/* Place order */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.orderBtn} onPress={placeOrder} disabled={placing}>
          <LinearGradient colors={['#ef4444', '#dc2626']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.orderGradient}>
            {placing ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={20} color="#fff" />
                <Text style={styles.orderBtnText}>Place Order · R{total.toFixed(2)}</Text>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: 12,
  },
  back: { padding: 4, marginRight: 8 },
  headerTitle: { ...TYPOGRAPHY.h2, flex: 1 },
  storeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: SPACING.lg,
    paddingBottom: 12,
  },
  storeLabel: { color: COLORS.textMuted, fontSize: 13 },
  section: { paddingHorizontal: SPACING.lg, marginBottom: 16 },
  sectionTitle: { ...TYPOGRAPHY.label, fontSize: 11, marginBottom: 10 },
  optional: { color: COLORS.textMuted, fontWeight: '400' },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    gap: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  itemInfo: { flex: 1 },
  itemName: { color: COLORS.text, fontSize: 14, fontWeight: '600', marginBottom: 2 },
  itemPrice: { color: '#ef4444', fontWeight: '700', fontSize: 13 },
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  qtyBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
  },
  qtyText: { color: COLORS.text, fontWeight: '700', fontSize: 14, minWidth: 20, textAlign: 'center' },
  input: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    color: COLORS.text,
    fontSize: 14,
    minHeight: 48,
  },
  summaryCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 10,
  },
  feeRow: { flexDirection: 'row', justifyContent: 'space-between' },
  feeLabel: { color: COLORS.textMuted, fontSize: 13 },
  feeValue: { color: COLORS.text, fontSize: 13, fontWeight: '600' },
  totalRow: { borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 10, marginTop: 2 },
  totalLabel: { color: COLORS.text, fontSize: 15, fontWeight: '700' },
  totalValue: { color: '#ef4444', fontSize: 15, fontWeight: '800' },
  paymentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f59e0b15',
    borderRadius: 12,
    padding: 14,
    gap: 10,
    borderWidth: 1,
    borderColor: '#f59e0b30',
  },
  paymentText: { color: COLORS.text, fontSize: 13, fontWeight: '600' },
  errorText: { color: '#ef4444', fontSize: 13, paddingHorizontal: SPACING.lg, marginBottom: 8 },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: SPACING.lg,
    backgroundColor: COLORS.background,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  orderBtn: { borderRadius: 14, overflow: 'hidden' },
  orderGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    padding: 16,
  },
  orderBtnText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16, paddingTop: 80 },
  emptyTitle: { ...TYPOGRAPHY.h2, color: COLORS.textMuted },
  browseBtn: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  browseBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
