import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../../context/ThemeContext';
import { useThemedStyles } from '../../theme/useThemedStyles';
import { fetchApi } from '../../utils/api';
import { ScanToPayMerchant, ScanToPaySession } from '../../utils/scanToPay';
import { formatCurrency } from '../../utils/format';

type StaffRole = { role: string; merchant: { id: string; name: string }; store: { id: string; name: string } | null };

const CATEGORY_GRADIENTS: [string, string][] = [
  ['#4C1D95', '#7C3AED'],
  ['#10B981', '#22D3EE'],
  ['#F472B6', '#FB923C'],
  ['#22D3EE', '#0EA5E9'],
];

function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('');
}

export default function ScanToPayLobbyScreen({ navigation }: any) {
  const { theme } = useTheme();
  const { COLORS } = theme;
  const [merchants, setMerchants] = useState<ScanToPayMerchant[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeSession, setActiveSession] = useState<ScanToPaySession | null>(null);
  const [staffRoles, setStaffRoles] = useState<StaffRole[]>([]);

  const load = useCallback(async (q?: string) => {
    try {
      const [merchantsRes, activeRes, staffRes] = await Promise.all([
        fetchApi(`/merchants${q ? `?q=${encodeURIComponent(q)}` : ''}`),
        // Bypasses the GET cache — the resume banner must reflect whether a
        // session is genuinely still active right now.
        fetchApi('/scan-to-pay/sessions/active', { headers: { 'Cache-Control': 'no-cache' } }),
        fetchApi('/merchants/mine'),
      ]);
      if (merchantsRes.ok) setMerchants(await merchantsRes.json());
      if (activeRes.ok) setActiveSession(await activeRes.json());
      if (staffRes.ok) setStaffRoles(await staffRes.json());
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(query); }, [load]));

  const onRefresh = () => {
    setRefreshing(true);
    load(query);
  };

  const openStore = (merchant: ScanToPayMerchant) => {
    navigation.navigate('ScanToPayStore', { merchantId: merchant.id, storeId: merchant.stores[0]?.id });
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
    headerTitle: { fontSize: 22, fontWeight: '700', color: COLORS.text, letterSpacing: -0.3 },
    subtitle: { color: COLORS.textMuted, fontSize: 13, paddingHorizontal: SPACING.lg, marginTop: 2 },
    searchWrap: {
      flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: COLORS.surfaceElevated,
      marginHorizontal: SPACING.lg, marginTop: SPACING.md, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10,
    },
    searchInput: { flex: 1, color: COLORS.text, fontSize: 14 },
    sectionLabel: {
      ...TYPOGRAPHY.label, fontSize: 11, paddingHorizontal: SPACING.lg,
      marginTop: SPACING.xl, marginBottom: SPACING.sm,
    },
    merchantRow: {
      flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: COLORS.surface,
      borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md, padding: 12,
      marginHorizontal: SPACING.lg, marginBottom: 10,
    },
    merchantIcon: { width: 52, height: 52, borderRadius: 14, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
    merchantIconText: { color: '#FFF', fontSize: 18, fontWeight: '800' },
    merchantName: { color: COLORS.text, fontSize: 15, fontWeight: '600' },
    merchantMeta: { color: COLORS.textMuted, fontSize: 12, marginTop: 1 },
    verifiedRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
    verifiedText: { color: COLORS.success, fontSize: 11, fontWeight: '600' },
    emptyState: { alignItems: 'center', paddingTop: 60, gap: 10 },
    emptyText: { color: COLORS.textMuted, fontSize: 14 },
    footerNote: {
      flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginHorizontal: SPACING.lg, marginTop: SPACING.lg,
      padding: 12, borderRadius: 14, backgroundColor: 'rgba(139,92,246,0.1)', borderWidth: 1, borderColor: 'rgba(139,92,246,0.25)',
    },
    footerNoteText: { color: '#C9BFE8', fontSize: 11.5, flex: 1, lineHeight: 16 },
    resumeBanner: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginHorizontal: SPACING.lg,
      marginTop: SPACING.md, borderRadius: 18, padding: 16, backgroundColor: '#4C1D95',
    },
    resumeLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
    resumeTitle: { color: '#FFF', fontSize: 14, fontWeight: '700' },
    resumeSub: { color: 'rgba(255,255,255,0.75)', fontSize: 11.5, marginTop: 1 },
    staffCard: {
      marginHorizontal: SPACING.lg, marginTop: SPACING.sm, backgroundColor: COLORS.surface,
      borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md, padding: 12, gap: 10,
    },
    staffRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    staffStoreName: { color: COLORS.text, fontSize: 13, fontWeight: '600' },
    staffRole: { color: COLORS.textMuted, fontSize: 11 },
    staffBtns: { flexDirection: 'row', gap: 8 },
    staffBtn: {
      flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: COLORS.surfaceElevated,
      borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7,
    },
    staffBtnText: { color: COLORS.text, fontSize: 11.5, fontWeight: '600' },
  }));

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Scan to Pay</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.navigate('ScanToPayMyReceipts')}>
          <Ionicons name="receipt-outline" size={18} color={COLORS.text} />
        </TouchableOpacity>
      </View>
      <Text style={styles.subtitle}>Shop hands-free at any Guranda-verified store.</Text>

      {activeSession && (
        <TouchableOpacity
          style={styles.resumeBanner}
          activeOpacity={0.85}
          onPress={() => navigation.navigate('ScanToPayCart', { sessionId: activeSession.id })}
        >
          <View style={styles.resumeLeft}>
            <Ionicons name="cart" size={20} color="#FFF" />
            <View>
              <Text style={styles.resumeTitle}>Resume shopping at {activeSession.merchant.name}</Text>
              <Text style={styles.resumeSub}>{activeSession.itemCount} items · {formatCurrency(activeSession.subtotal)}</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.7)" />
        </TouchableOpacity>
      )}

      {staffRoles.length > 0 && (
        <View style={styles.staffCard}>
          {staffRoles.filter((s) => s.store).map((s) => (
            <View key={s.store!.id} style={styles.staffRow}>
              <View>
                <Text style={styles.staffStoreName}>{s.merchant.name} · {s.store!.name}</Text>
                <Text style={styles.staffRole}>Staff · {s.role}</Text>
              </View>
              <View style={styles.staffBtns}>
                <TouchableOpacity style={styles.staffBtn} onPress={() => navigation.navigate('ScanToPayMerchantCheckout', { storeId: s.store!.id })}>
                  <Ionicons name="qr-code-outline" size={13} color={COLORS.text} />
                  <Text style={styles.staffBtnText}>Checkout</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.staffBtn} onPress={() => navigation.navigate('ScanToPaySecurity')}>
                  <Ionicons name="shield-outline" size={13} color={COLORS.text} />
                  <Text style={styles.staffBtnText}>Security</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      )}

      <View style={styles.searchWrap}>
        <Ionicons name="search" size={18} color={COLORS.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search stores"
          placeholderTextColor={COLORS.textMuted}
          value={query}
          onChangeText={(t) => { setQuery(t); load(t); }}
        />
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} size="large" color={COLORS.text} />
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.text} />}
          contentContainerStyle={{ paddingBottom: 40 }}
        >
          <Text style={styles.sectionLabel}>NEARBY · GURANDA VERIFIED</Text>
          {merchants.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="storefront-outline" size={40} color={COLORS.textMuted} />
              <Text style={styles.emptyText}>No stores found</Text>
            </View>
          ) : (
            merchants.map((m, i) => (
              <TouchableOpacity key={m.id} style={styles.merchantRow} activeOpacity={0.8} onPress={() => openStore(m)}>
                <View style={[styles.merchantIcon, { backgroundColor: CATEGORY_GRADIENTS[i % CATEGORY_GRADIENTS.length][0] }]}>
                  <Text style={styles.merchantIconText}>{initials(m.name)}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.merchantName}>{m.name}</Text>
                  <Text style={styles.merchantMeta}>{m.category}</Text>
                  <View style={styles.verifiedRow}>
                    <Ionicons name="shield-checkmark" size={12} color={COLORS.success} />
                    <Text style={styles.verifiedText}>Guranda Verified</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
              </TouchableOpacity>
            ))
          )}

          <View style={styles.footerNote}>
            <Ionicons name="information-circle-outline" size={16} color="#8B5CF6" />
            <Text style={styles.footerNoteText}>
              Only Guranda-vetted merchants appear here — every store is approved before it can accept Scan to Pay.
            </Text>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
