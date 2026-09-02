import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../../context/ThemeContext';
import { useThemedStyles } from '../../theme/useThemedStyles';
import { fetchApi } from '../../utils/api';
import { formatCurrency } from '../../utils/format';
import { ScanToPaySession, productIcon } from '../../utils/scanToPay';

export default function ScanToPayCartScreen({ route, navigation }: any) {
  const { sessionId } = route.params;
  const { theme } = useTheme();
  const { COLORS } = theme;
  const [session, setSession] = useState<ScanToPaySession | null>(null);
  const [busyItemId, setBusyItemId] = useState<string | null>(null);

  const load = useCallback(async () => {
    // Bypasses the GET cache — a shopping cart changes every scan, so a
    // stale read here would show the wrong budget/items right after adding
    // something (same reasoning as the wallet dashboard's summary fetch).
    const res = await fetchApi(`/scan-to-pay/sessions/${sessionId}`, { headers: { 'Cache-Control': 'no-cache' } });
    if (res.ok) setSession(await res.json());
  }, [sessionId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const setQty = async (itemId: string, qty: number) => {
    setBusyItemId(itemId);
    try {
      const res = await fetchApi(`/scan-to-pay/sessions/${sessionId}/items/${itemId}`, {
        method: 'PATCH',
        body: JSON.stringify({ qty }),
      });
      if (res.ok) setSession(await res.json());
    } finally {
      setBusyItemId(null);
    }
  };

  const removeItem = (itemId: string) => {
    Alert.alert('Remove item?', 'Take this out of your cart.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive', onPress: async () => {
          setBusyItemId(itemId);
          try {
            const res = await fetchApi(`/scan-to-pay/sessions/${sessionId}/items/${itemId}`, { method: 'DELETE' });
            if (res.ok) setSession(await res.json());
          } finally {
            setBusyItemId(null);
          }
        },
      },
    ]);
  };

  const leaveShopping = () => {
    Alert.alert('Leave without paying?', 'Your cart will be cancelled.', [
      { text: 'Keep Shopping', style: 'cancel' },
      {
        text: 'Cancel Shopping', style: 'destructive', onPress: async () => {
          await fetchApi(`/scan-to-pay/sessions/${sessionId}/cancel`, { method: 'POST' });
          navigation.popToTop();
        },
      },
    ]);
  };

  const styles = useThemedStyles(({ COLORS, RADIUS, SPACING }) => ({
    container: { flex: 1, backgroundColor: COLORS.background },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.lg, paddingTop: SPACING.sm, paddingBottom: 4 },
    backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.surfaceElevated, borderWidth: 1, borderColor: COLORS.border, justifyContent: 'center', alignItems: 'center' },
    headerTitle: { fontSize: 17, fontWeight: '700', color: COLORS.text },
    budgetCard: { margin: SPACING.lg, marginTop: 8, borderRadius: 24, padding: 18, borderWidth: 1, borderColor: 'rgba(139,92,246,0.35)' },
    budgetLabel: { color: 'rgba(255,255,255,0.65)', fontSize: 10, fontWeight: '700', letterSpacing: 1.2 },
    budgetValue: { color: '#FFF', fontSize: 32, fontWeight: '800', letterSpacing: -0.8, marginTop: 4 },
    track: { height: 7, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.12)', overflow: 'hidden', marginTop: 14 },
    fill: { height: '100%', borderRadius: 4 },
    statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 },
    statLabel: { color: 'rgba(255,255,255,0.55)', fontSize: 10.5, fontWeight: '600' },
    statValue: { color: '#FFF', fontSize: 13, fontWeight: '700' },
    sectionLabel: { fontSize: 12.5, fontWeight: '600', letterSpacing: 0.3, color: COLORS.textMuted, paddingHorizontal: SPACING.lg, marginTop: SPACING.lg },
    groceryWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginHorizontal: SPACING.lg, marginTop: 9 },
    groceryChipDone: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(52,211,153,0.12)', borderWidth: 1, borderColor: 'rgba(52,211,153,0.35)', borderRadius: 999, paddingVertical: 6, paddingHorizontal: 11 },
    groceryChipDoneText: { color: COLORS.success, fontSize: 12, fontWeight: '600', textDecorationLine: 'line-through' },
    groceryChip: { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: 999, paddingVertical: 6, paddingHorizontal: 12 },
    groceryChipText: { color: COLORS.textMuted, fontSize: 12, fontWeight: '500' },
    cartHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.lg, marginTop: SPACING.lg },
    cartHint: { fontSize: 11.5, color: '#5A5A6E' },
    cartList: { paddingHorizontal: SPACING.lg, marginTop: 10, gap: 8 },
    itemRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md, padding: 10 },
    itemIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: COLORS.surfaceElevated, justifyContent: 'center', alignItems: 'center' },
    itemName: { color: COLORS.text, fontSize: 13.5, fontWeight: '600' },
    itemBarcode: { color: '#5A5A6E', fontSize: 10.5, fontFamily: 'monospace' },
    itemPrice: { color: COLORS.textMuted, fontSize: 11.5 },
    itemRight: { alignItems: 'flex-end', gap: 8 },
    itemLineTotal: { color: COLORS.text, fontSize: 13.5, fontWeight: '700' },
    qtyRow: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: COLORS.surfaceElevated, borderRadius: 999, paddingVertical: 4, paddingHorizontal: 6 },
    qtyBtn: { width: 22, height: 22, borderRadius: 11, justifyContent: 'center', alignItems: 'center' },
    qtyValue: { color: COLORS.text, fontSize: 13, fontWeight: '700', minWidth: 10, textAlign: 'center' },
    scanNextBtn: { marginHorizontal: SPACING.lg, marginTop: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderWidth: 1, borderColor: '#333340', borderStyle: 'dashed', borderRadius: 14, paddingVertical: 13 },
    scanNextText: { color: COLORS.primary, fontSize: 13, fontWeight: '700' },
    leaveRow: { alignItems: 'center', marginTop: 14 },
    leaveText: { color: COLORS.error, fontSize: 12.5, fontWeight: '600' },
    checkoutBar: { padding: SPACING.lg, paddingBottom: 26, backgroundColor: '#0D0D12', borderTopWidth: 1, borderTopColor: COLORS.surfaceElevated, gap: 10 },
    subtotalRow: { flexDirection: 'row', justifyContent: 'space-between' },
    subtotalLabel: { color: COLORS.textMuted, fontSize: 13 },
    subtotalValue: { color: COLORS.text, fontSize: 15, fontWeight: '700' },
    completeBtn: { backgroundColor: COLORS.primary, borderRadius: 999, paddingVertical: 16, alignItems: 'center' },
    completeBtnText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
    empty: { alignItems: 'center', paddingVertical: 30, gap: 8 },
    emptyText: { color: COLORS.textMuted, fontSize: 13 },
  }));

  if (!session) {
    return (
      <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator color={COLORS.text} />
      </SafeAreaView>
    );
  }

  // Reaching this screen for a COMPLETED/CANCELLED session (e.g. the back
  // button returning to a stale nav entry after paying) should never offer
  // dead qty/checkout controls — the backend already rejects those
  // mutations, but showing them as tappable here would just be confusing.
  if (session.status !== 'ACTIVE') {
    return (
      <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center', padding: 24, gap: 16 }]}>
        <Ionicons
          name={session.status === 'COMPLETED' ? 'checkmark-circle-outline' : 'close-circle-outline'}
          size={44}
          color={session.status === 'COMPLETED' ? COLORS.success : COLORS.textMuted}
        />
        <Text style={{ color: COLORS.text, fontSize: 16, fontWeight: '700', textAlign: 'center' }}>
          {session.status === 'COMPLETED' ? 'This shopping trip is complete' : 'This shopping trip was cancelled'}
        </Text>
        <Text style={{ color: COLORS.textMuted, fontSize: 13, textAlign: 'center' }}>
          {session.merchant.name} · {session.itemCount} item{session.itemCount === 1 ? '' : 's'} · {formatCurrency(session.subtotal)}
        </Text>
        <TouchableOpacity
          style={{ backgroundColor: COLORS.primary, borderRadius: 999, paddingVertical: 14, paddingHorizontal: 28, marginTop: 8 }}
          onPress={() => navigation.navigate(session.status === 'COMPLETED' ? 'ScanToPayMyReceipts' : 'ScanToPayLobby')}
        >
          <Text style={{ color: '#FFF', fontSize: 14, fontWeight: '700' }}>
            {session.status === 'COMPLETED' ? 'View Receipts' : 'Back to Scan to Pay'}
          </Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const pct = session.budget ? Math.min(100, (session.subtotal / session.budget) * 100) : 0;
  const barColor = pct < 70 ? COLORS.success : pct < 90 ? COLORS.gold : COLORS.error;
  const matchedCount = session.groceryList.filter((g) => g.matched).length;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.navigate('ScanToPayScanner', { sessionId })}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{session.merchant.name}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {session.budget != null ? (
          <LinearGradient colors={['#1E1B4B', '#312E81']} style={styles.budgetCard}>
            <Text style={styles.budgetLabel}>REMAINING BUDGET</Text>
            <Text style={styles.budgetValue}>{formatCurrency(session.remaining ?? 0)}</Text>
            <View style={styles.track}><View style={[styles.fill, { width: `${pct}%`, backgroundColor: barColor }]} /></View>
            <View style={styles.statsRow}>
              <View><Text style={styles.statLabel}>BUDGET</Text><Text style={styles.statValue}>{formatCurrency(session.budget)}</Text></View>
              <View><Text style={styles.statLabel}>SPENT</Text><Text style={styles.statValue}>{formatCurrency(session.subtotal)}</Text></View>
              <View><Text style={styles.statLabel}>ITEMS</Text><Text style={styles.statValue}>{session.itemCount}</Text></View>
            </View>
          </LinearGradient>
        ) : (
          <LinearGradient colors={['#1E1B4B', '#312E81']} style={styles.budgetCard}>
            <Text style={styles.budgetLabel}>SPENT SO FAR</Text>
            <Text style={styles.budgetValue}>{formatCurrency(session.subtotal)}</Text>
            <View style={styles.statsRow}>
              <View><Text style={styles.statLabel}>ITEMS</Text><Text style={styles.statValue}>{session.itemCount}</Text></View>
            </View>
          </LinearGradient>
        )}

        {session.groceryList.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>GROCERY LIST · {matchedCount} OF {session.groceryList.length}</Text>
            <View style={styles.groceryWrap}>
              {session.groceryList.map((g) =>
                g.matched ? (
                  <View key={g.name} style={styles.groceryChipDone}>
                    <Ionicons name="checkmark" size={11} color={COLORS.success} />
                    <Text style={styles.groceryChipDoneText}>{g.name}</Text>
                  </View>
                ) : (
                  <View key={g.name} style={styles.groceryChip}>
                    <Text style={styles.groceryChipText}>{g.name}</Text>
                  </View>
                ),
              )}
            </View>
          </>
        )}

        <View style={styles.cartHeaderRow}>
          <Text style={[styles.sectionLabel, { paddingHorizontal: 0, marginTop: 0 }]}>YOUR CART</Text>
          <Text style={styles.cartHint}>Tap + / − to adjust</Text>
        </View>

        {session.items.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="cart-outline" size={32} color={COLORS.textMuted} />
            <Text style={styles.emptyText}>Nothing scanned yet</Text>
          </View>
        ) : (
          <View style={styles.cartList}>
            {session.items.map((item) => (
              <View key={item.id} style={styles.itemRow}>
                <View style={styles.itemIcon}>
                  <Ionicons name={productIcon(item.name) as any} size={22} color={COLORS.textMuted} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
                  <Text style={styles.itemBarcode}>{item.barcode}</Text>
                  <Text style={styles.itemPrice}>{formatCurrency(item.price)} each</Text>
                </View>
                <View style={styles.itemRight}>
                  <Text style={styles.itemLineTotal}>{formatCurrency(item.lineTotal)}</Text>
                  {busyItemId === item.id ? (
                    <ActivityIndicator size="small" color={COLORS.textMuted} />
                  ) : (
                    <View style={styles.qtyRow}>
                      <TouchableOpacity
                        style={[styles.qtyBtn, { backgroundColor: COLORS.surfaceElevated }]}
                        onPress={() => (item.qty === 1 ? removeItem(item.id) : setQty(item.id, item.qty - 1))}
                      >
                        <Ionicons name="remove" size={12} color={COLORS.text} />
                      </TouchableOpacity>
                      <Text style={styles.qtyValue}>{item.qty}</Text>
                      <TouchableOpacity style={[styles.qtyBtn, { backgroundColor: COLORS.primary }]} onPress={() => setQty(item.id, item.qty + 1)}>
                        <Ionicons name="add" size={12} color="#FFF" />
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}

        <TouchableOpacity style={styles.scanNextBtn} onPress={() => navigation.navigate('ScanToPayScanner', { sessionId })}>
          <Ionicons name="scan-outline" size={16} color={COLORS.primary} />
          <Text style={styles.scanNextText}>Scan Next Item</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.leaveRow} onPress={leaveShopping}>
          <Text style={styles.leaveText}>Cancel shopping</Text>
        </TouchableOpacity>
      </ScrollView>

      <View style={styles.checkoutBar}>
        <View style={styles.subtotalRow}>
          <Text style={styles.subtotalLabel}>Subtotal · {session.itemCount} items</Text>
          <Text style={styles.subtotalValue}>{formatCurrency(session.subtotal)}</Text>
        </View>
        <TouchableOpacity
          style={[styles.completeBtn, session.items.length === 0 && { opacity: 0.5 }]}
          disabled={session.items.length === 0}
          onPress={() => navigation.navigate('ScanToPayCheckout', { sessionId })}
        >
          <Text style={styles.completeBtnText}>Complete Shopping</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
