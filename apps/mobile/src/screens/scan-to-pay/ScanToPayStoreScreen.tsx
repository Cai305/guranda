import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useThemedStyles } from '../../theme/useThemedStyles';
import { fetchApi } from '../../utils/api';
import { ScanToPayMerchant, ScanToPaySession } from '../../utils/scanToPay';

function initials(name: string) {
  return name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('');
}

const SUGGESTED_ITEMS = ['Eggs', 'Bread', 'Milk', 'Beans', 'Cooking oil', 'Cold drink'];

export default function ScanToPayStoreScreen({ route, navigation }: any) {
  const { merchantId, storeId } = route.params;
  const { theme } = useTheme();
  const { COLORS } = theme;
  const [merchant, setMerchant] = useState<ScanToPayMerchant | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [budget, setBudget] = useState('1500');
  const [groceryList, setGroceryList] = useState<string[]>([]);
  const [newItem, setNewItem] = useState('');

  useEffect(() => {
    (async () => {
      // Resume — if the customer already has an active session here, skip
      // straight to the cart instead of asking them to set the budget again.
      // Bypasses the GET cache — must know right now whether a session is
      // still active here, not a snapshot from a few minutes ago.
      const activeRes = await fetchApi('/scan-to-pay/sessions/active', { headers: { 'Cache-Control': 'no-cache' } });
      if (activeRes.ok) {
        const active: ScanToPaySession | null = await activeRes.json();
        if (active && active.merchant.id === merchantId) {
          navigation.replace('ScanToPayCart', { sessionId: active.id });
          return;
        }
      }
      const res = await fetchApi(`/merchants/${merchantId}`);
      if (res.ok) setMerchant(await res.json());
      setLoading(false);
    })();
  }, [merchantId]);

  const toggleSuggested = (name: string) => {
    setGroceryList((prev) => (prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]));
  };

  const addCustomItem = () => {
    const trimmed = newItem.trim();
    if (!trimmed || groceryList.includes(trimmed)) { setNewItem(''); return; }
    setGroceryList((prev) => [...prev, trimmed]);
    setNewItem('');
  };

  const startShopping = async () => {
    if (starting) return;
    setStarting(true);
    try {
      const res = await fetchApi('/scan-to-pay/sessions', {
        method: 'POST',
        body: JSON.stringify({
          merchantId,
          storeId,
          budget: budget.trim() ? Number(budget) : undefined,
          groceryList,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Couldn't start your shopping session.");
      navigation.replace('ScanToPayCart', { sessionId: data.id });
    } catch (e: any) {
      Alert.alert('Something went wrong', e?.message || "Couldn't start shopping. Please try again.");
    } finally {
      setStarting(false);
    }
  };

  const styles = useThemedStyles(({ COLORS, RADIUS, SPACING, TYPOGRAPHY }) => ({
    container: { flex: 1, backgroundColor: COLORS.background },
    header: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: SPACING.lg, paddingTop: SPACING.sm, paddingBottom: SPACING.sm,
    },
    backBtn: {
      width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.surfaceElevated,
      borderWidth: 1, borderColor: COLORS.border, justifyContent: 'center', alignItems: 'center',
    },
    headerTitle: { fontSize: 17, fontWeight: '700', color: COLORS.text },
    heroCard: {
      marginHorizontal: SPACING.lg, marginTop: SPACING.sm, borderRadius: 24, overflow: 'hidden',
      borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface,
    },
    heroBanner: { height: 88, backgroundColor: '#4C1D95' },
    heroBadge: {
      position: 'absolute', left: 20, bottom: -28, width: 64, height: 64, borderRadius: 18,
      backgroundColor: '#4C1D95', borderWidth: 3, borderColor: COLORS.surface,
      justifyContent: 'center', alignItems: 'center',
    },
    heroBadgeText: { color: '#FFF', fontSize: 20, fontWeight: '800' },
    heroBody: { padding: 20, paddingTop: 38, gap: 6 },
    heroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    heroName: { color: COLORS.text, fontSize: 20, fontWeight: '700', letterSpacing: -0.3 },
    verifiedPill: {
      flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(52,211,153,0.14)',
      borderWidth: 1, borderColor: 'rgba(52,211,153,0.35)', borderRadius: 999, paddingHorizontal: 9, paddingVertical: 4,
    },
    verifiedText: { color: COLORS.success, fontSize: 10.5, fontWeight: '700' },
    heroMeta: { color: COLORS.textMuted, fontSize: 13 },
    heroIds: { color: '#5A5A6E', fontSize: 11, fontFamily: 'monospace', marginTop: 2 },
    sectionLabel: { ...TYPOGRAPHY.label, fontSize: 11, paddingHorizontal: SPACING.lg, marginTop: SPACING.xl },
    budgetCard: {
      marginHorizontal: SPACING.lg, marginTop: SPACING.sm, backgroundColor: COLORS.surface,
      borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md, padding: 16, gap: 10,
    },
    budgetHint: { color: COLORS.textMuted, fontSize: 12 },
    budgetInputRow: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      backgroundColor: COLORS.surfaceElevated, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10,
    },
    budgetPrefix: { color: COLORS.textMuted, fontSize: 16, fontWeight: '700', marginRight: 4 },
    budgetInput: { flex: 1, color: COLORS.text, fontSize: 26, fontWeight: '800', letterSpacing: -0.5 },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginHorizontal: SPACING.lg, marginTop: SPACING.sm },
    chip: {
      flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 999, paddingVertical: 8, paddingHorizontal: 13,
      borderWidth: 1,
    },
    chipOff: { backgroundColor: COLORS.surface, borderColor: COLORS.border },
    chipOn: { backgroundColor: 'rgba(139,92,246,0.16)', borderColor: COLORS.primary },
    chipTextOff: { color: COLORS.text, fontSize: 12.5, fontWeight: '500' },
    chipTextOn: { color: '#C9BFE8', fontSize: 12.5, fontWeight: '700' },
    addItemRow: { flexDirection: 'row', gap: 8, marginHorizontal: SPACING.lg, marginTop: SPACING.md },
    addItemInput: {
      flex: 1, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border,
      borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, color: COLORS.text, fontSize: 13,
    },
    addItemBtn: {
      width: 40, height: 40, borderRadius: 12, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center',
    },
    startBtn: {
      marginHorizontal: SPACING.lg, marginTop: SPACING.xl, backgroundColor: COLORS.primary,
      borderRadius: 999, paddingVertical: 16, alignItems: 'center',
    },
    startBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  }));

  if (loading) {
    return <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}><ActivityIndicator size="large" color={COLORS.text} /></SafeAreaView>;
  }
  if (!merchant) {
    return (
      <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: COLORS.textMuted }}>Store not found.</Text>
      </SafeAreaView>
    );
  }
  const store = merchant.stores.find((s) => s.id === storeId) ?? merchant.stores[0];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Store</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        <View style={styles.heroCard}>
          <View style={styles.heroBanner} />
          <View style={styles.heroBadge}><Text style={styles.heroBadgeText}>{initials(merchant.name)}</Text></View>
          <View style={styles.heroBody}>
            <View style={styles.heroTop}>
              <Text style={styles.heroName}>{merchant.name}</Text>
              <View style={styles.verifiedPill}>
                <Ionicons name="shield-checkmark" size={12} color={COLORS.success} />
                <Text style={styles.verifiedText}>VERIFIED</Text>
              </View>
            </View>
            <Text style={styles.heroMeta}>{merchant.category}{merchant.address ? ` · ${merchant.address}` : ''}</Text>
            <Text style={styles.heroIds}>MERCHANT-{merchant.id.slice(0, 6).toUpperCase()} · STORE-{store?.id.slice(0, 6).toUpperCase()}</Text>
          </View>
        </View>

        <Text style={styles.sectionLabel}>SHOPPING BUDGET</Text>
        <View style={styles.budgetCard}>
          <Text style={styles.budgetHint}>Set a limit — Guranda tracks it live as you scan.</Text>
          <View style={styles.budgetInputRow}>
            <Text style={styles.budgetPrefix}>R</Text>
            <TextInput
              style={styles.budgetInput}
              value={budget}
              onChangeText={setBudget}
              keyboardType="numeric"
              placeholder="0"
              placeholderTextColor={COLORS.textMuted}
            />
          </View>
        </View>

        <Text style={styles.sectionLabel}>GROCERY LIST · OPTIONAL</Text>
        <View style={styles.chipRow}>
          {SUGGESTED_ITEMS.map((item) => {
            const on = groceryList.includes(item);
            return (
              <TouchableOpacity key={item} style={[styles.chip, on ? styles.chipOn : styles.chipOff]} onPress={() => toggleSuggested(item)}>
                <Text style={on ? styles.chipTextOn : styles.chipTextOff}>{item}</Text>
                {on && <Ionicons name="checkmark" size={12} color="#C9BFE8" />}
              </TouchableOpacity>
            );
          })}
          {groceryList.filter((g) => !SUGGESTED_ITEMS.includes(g)).map((item) => (
            <TouchableOpacity key={item} style={[styles.chip, styles.chipOn]} onPress={() => toggleSuggested(item)}>
              <Text style={styles.chipTextOn}>{item}</Text>
              <Ionicons name="close" size={12} color="#C9BFE8" />
            </TouchableOpacity>
          ))}
        </View>
        <View style={styles.addItemRow}>
          <TextInput
            style={styles.addItemInput}
            placeholder="Add another item…"
            placeholderTextColor={COLORS.textMuted}
            value={newItem}
            onChangeText={setNewItem}
            onSubmitEditing={addCustomItem}
            returnKeyType="done"
          />
          <TouchableOpacity style={styles.addItemBtn} onPress={addCustomItem}>
            <Ionicons name="add" size={20} color="#FFF" />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.startBtn} onPress={startShopping} disabled={starting} activeOpacity={0.85}>
          {starting ? <ActivityIndicator color="#FFF" /> : <Text style={styles.startBtnText}>Start Shopping</Text>}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
