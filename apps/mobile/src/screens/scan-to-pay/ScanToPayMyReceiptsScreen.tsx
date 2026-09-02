import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, TouchableOpacity, SectionList, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../../context/ThemeContext';
import { useThemedStyles } from '../../theme/useThemedStyles';
import { fetchApi } from '../../utils/api';
import { formatCurrency } from '../../utils/format';
import { ScanToPayReceipt } from '../../utils/scanToPay';

const AVATAR_GRADIENTS: [string, string][] = [
  ['#4C1D95', '#7C3AED'],
  ['#10B981', '#22D3EE'],
  ['#F472B6', '#FB923C'],
  ['#22D3EE', '#0EA5E9'],
];

function avatarGradient(id: string): [string, string] {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return AVATAR_GRADIENTS[hash % AVATAR_GRADIENTS.length];
}

function bucketFor(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const startOfDay = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diffDays = Math.round((startOfDay(now) - startOfDay(d)) / 86_400_000);
  if (diffDays <= 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return 'This Week';
  return 'Earlier';
}

export default function ScanToPayMyReceiptsScreen({ navigation }: any) {
  const { theme } = useTheme();
  const { COLORS } = theme;
  const [receipts, setReceipts] = useState<ScanToPayReceipt[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetchApi('/scan-to-pay/receipts');
      if (res.ok) setReceipts(await res.json());
    } finally {
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const sections = useMemo(() => {
    if (!receipts) return [];
    const order = ['Today', 'Yesterday', 'This Week', 'Earlier'];
    const buckets = new Map<string, ScanToPayReceipt[]>();
    for (const r of receipts) {
      const key = bucketFor(r.paidAt || r.createdAt);
      if (!buckets.has(key)) buckets.set(key, []);
      buckets.get(key)!.push(r);
    }
    return order.filter((k) => buckets.has(k)).map((k) => ({ title: k, data: buckets.get(k)! }));
  }, [receipts]);

  const styles = useThemedStyles(({ COLORS, RADIUS, SPACING }) => ({
    container: { flex: 1, backgroundColor: COLORS.background },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.lg, paddingTop: SPACING.sm, paddingBottom: 4 },
    backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.surfaceElevated, borderWidth: 1, borderColor: COLORS.border, justifyContent: 'center', alignItems: 'center' },
    headerTitle: { fontSize: 22, fontWeight: '700', color: COLORS.text, letterSpacing: -0.3 },
    listContent: { paddingHorizontal: SPACING.lg, paddingBottom: 40 },
    sectionHeader: { fontSize: 12, fontWeight: '700', letterSpacing: 0.8, color: '#5A5A6E', textTransform: 'uppercase', backgroundColor: COLORS.background, paddingTop: SPACING.lg, paddingBottom: 8 },
    row: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md, padding: 12, marginBottom: 8 },
    avatar: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    avatarText: { color: '#FFF', fontSize: 13, fontWeight: '800' },
    rowName: { color: COLORS.text, fontSize: 13.5, fontWeight: '600' },
    rowMeta: { color: COLORS.textMuted, fontSize: 11.5, marginTop: 2 },
    rowRight: { alignItems: 'flex-end', gap: 3 },
    rowAmount: { color: COLORS.text, fontSize: 14, fontWeight: '700' },
    rowStatus: { fontSize: 10, fontWeight: '700' },
    empty: { alignItems: 'center', paddingTop: 80, gap: 10 },
    emptyText: { color: COLORS.textMuted, fontSize: 14 },
  }));

  const renderItem = ({ item }: { item: ScanToPayReceipt }) => {
    const date = new Date(item.paidAt || item.createdAt);
    return (
      <TouchableOpacity style={styles.row} activeOpacity={0.8} onPress={() => navigation.navigate('ScanToPayReceipt', { transactionId: item.id })}>
        <LinearGradient colors={avatarGradient(item.merchant.id)} style={styles.avatar}>
          <Text style={styles.avatarText}>{item.merchant.name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase()}</Text>
        </LinearGradient>
        <View style={{ flex: 1 }}>
          <Text style={styles.rowName} numberOfLines={1}>{item.merchant.name}</Text>
          <Text style={styles.rowMeta}>{date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · {item.items.length} item{item.items.length === 1 ? '' : 's'}</Text>
        </View>
        <View style={styles.rowRight}>
          <Text style={styles.rowAmount}>{formatCurrency(item.total)}</Text>
          <Text style={[styles.rowStatus, { color: item.flagged ? COLORS.error : COLORS.success }]}>{item.flagged ? 'FLAGGED' : item.status}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Receipts</Text>
        <View style={{ width: 40 }} />
      </View>

      {receipts === null ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator color={COLORS.text} />
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          renderSectionHeader={({ section }) => <Text style={styles.sectionHeader}>{section.title}</Text>}
          stickySectionHeadersEnabled={false}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={COLORS.text} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="receipt-outline" size={40} color={COLORS.textMuted} />
              <Text style={styles.emptyText}>No purchases yet</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}
