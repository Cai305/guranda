import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, TouchableOpacity, SectionList, ActivityIndicator, RefreshControl, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import { useThemedStyles } from '../theme/useThemedStyles';
import { fetchApi } from '../utils/api';
import { formatCurrency } from '../utils/format';
import { humanizeTransactionType, transactionIcon, isPositiveTransactionType } from '../utils/walletTransactions';

type WalletTransaction = {
  id: string;
  amount: string;
  type: string;
  status: string;
  timestamp: string;
};

const PAGE_SIZE = 20;

function bucketFor(timestamp: string): string {
  const d = new Date(timestamp);
  const now = new Date();
  const startOfDay = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diffDays = Math.round((startOfDay(now) - startOfDay(d)) / 86_400_000);
  if (diffDays <= 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  return 'Earlier';
}

function groupByDay(transactions: WalletTransaction[]) {
  const order = ['Today', 'Yesterday', 'Earlier'];
  const buckets = new Map<string, WalletTransaction[]>();
  for (const t of transactions) {
    const key = bucketFor(t.timestamp);
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key)!.push(t);
  }
  return order
    .filter(key => buckets.has(key))
    .map(key => ({ title: key, data: buckets.get(key)! }));
}

export default function WalletTransactionsScreen({ navigation }: any) {
  const { theme } = useTheme();
  const { COLORS } = theme;
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadFirstPage = useCallback(async () => {
    try {
      // Bypasses the GET cache — a first page that's up to 5 minutes stale
      // would hide a transaction the user just made, same reasoning as the
      // dashboard's summary fetch.
      const res = await fetchApi(`/wallets/me/transactions?take=${PAGE_SIZE}`, { headers: { 'Cache-Control': 'no-cache' } });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Couldn't load your transactions.");
      setTransactions(data.transactions ?? []);
      setCursor(data.nextCursor ?? null);
    } catch (e: any) {
      Alert.alert(
        'Something went wrong',
        e?.message || "Couldn't load your transactions. Please try again.",
        [{ text: 'Retry', onPress: loadFirstPage }, { text: 'OK' }],
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { loadFirstPage(); }, [loadFirstPage]));

  const onRefresh = () => {
    setRefreshing(true);
    loadFirstPage();
  };

  const loadMore = async () => {
    if (!cursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const res = await fetchApi(`/wallets/me/transactions?take=${PAGE_SIZE}&cursor=${encodeURIComponent(cursor)}`);
      const data = await res.json();
      if (res.ok) {
        setTransactions(prev => [...prev, ...(data.transactions ?? [])]);
        setCursor(data.nextCursor ?? null);
      }
    } catch {
      // A failed "load more" just leaves the cursor as-is — reachable again
      // by scrolling, no need to interrupt with an alert.
    } finally {
      setLoadingMore(false);
    }
  };

  const sections = useMemo(() => groupByDay(transactions), [transactions]);

  const styles = useThemedStyles(({ COLORS, RADIUS, SPACING, TYPOGRAPHY }) => ({
    container: { flex: 1, backgroundColor: COLORS.background },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: SPACING.lg,
      paddingTop: SPACING.sm,
      paddingBottom: SPACING.sm,
    },
    backBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: COLORS.surfaceElevated,
      borderWidth: 1,
      borderColor: COLORS.border,
      justifyContent: 'center',
      alignItems: 'center',
    },
    headerTitle: { fontSize: 22, fontWeight: '700', color: COLORS.text, letterSpacing: -0.3 },
    listContent: { paddingHorizontal: SPACING.lg, paddingBottom: 40 },
    sectionHeader: {
      fontSize: 12, fontWeight: '700', letterSpacing: 0.8, color: COLORS.textMuted,
      textTransform: 'uppercase', backgroundColor: COLORS.background,
      paddingTop: SPACING.lg, paddingBottom: SPACING.sm,
    },
    txRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: COLORS.surface, padding: SPACING.md, borderRadius: RADIUS.md, marginBottom: SPACING.sm, borderWidth: 1, borderColor: COLORS.border },
    txLeft: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
    txIconWrap: { width: 36, height: 36, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, justifyContent: 'center', alignItems: 'center' },
    txDetails: { justifyContent: 'center', gap: SPACING.xs / 2 },
    txType: { color: COLORS.text, fontSize: TYPOGRAPHY.label.fontSize, fontWeight: '600' },
    txDate: { color: COLORS.textMuted, fontSize: TYPOGRAPHY.caption.fontSize },
    txAmount: { fontSize: TYPOGRAPHY.body2.fontSize, fontWeight: '600' },
    emptyState: { alignItems: 'center', justifyContent: 'center', paddingTop: SPACING.xxl, gap: SPACING.sm },
    emptyText: { color: COLORS.textMuted, fontSize: TYPOGRAPHY.body2.fontSize },
    footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm, paddingVertical: SPACING.lg },
    footerText: { color: COLORS.textMuted, fontSize: 12 },
  }));

  const renderItem = ({ item }: { item: WalletTransaction }) => {
    const positive = isPositiveTransactionType(item.type);
    return (
      <View style={styles.txRow}>
        <View style={styles.txLeft}>
          <View style={styles.txIconWrap}>
            <Ionicons name={transactionIcon(item.type) as any} size={18} color={COLORS.text} />
          </View>
          <View style={styles.txDetails}>
            <Text style={styles.txType}>{humanizeTransactionType(item.type)}</Text>
            <Text style={styles.txDate}>
              {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>
        </View>
        <Text style={[styles.txAmount, { color: positive ? COLORS.success : COLORS.text }]}>
          {positive ? '+' : ''}{formatCurrency(Math.abs(Number(item.amount)))}
        </Text>
      </View>
    );
  };

  if (loading) {
    return <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}><ActivityIndicator size="large" color={COLORS.text} /></SafeAreaView>;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>All Transactions</Text>
        <View style={{ width: 40 }} />
      </View>

      <SectionList
        sections={sections}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        renderSectionHeader={({ section }) => <Text style={styles.sectionHeader}>{section.title}</Text>}
        stickySectionHeadersEnabled={false}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.text} />}
        onEndReachedThreshold={0.4}
        onEndReached={loadMore}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="receipt-outline" size={40} color={COLORS.textMuted} />
            <Text style={styles.emptyText}>No transactions yet</Text>
          </View>
        }
        ListFooterComponent={
          loadingMore ? (
            <View style={styles.footer}>
              <ActivityIndicator size="small" color={COLORS.textMuted} />
              <Text style={styles.footerText}>Loading more…</Text>
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
}
