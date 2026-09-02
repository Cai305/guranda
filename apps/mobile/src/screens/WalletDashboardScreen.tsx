import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, RefreshControl, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
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

type WalletData = {
  balanceMasheleni: number;
  transactions: WalletTransaction[];
};

type WalletSummary = {
  moneyIn: number;
  moneyOut: number;
  byType: { type: string; amount: number }[];
};

// Colors cycle for the "By Type" bars — brand accents first, then a couple
// of muted fallbacks so an unusual type still renders sensibly.
const TYPE_BAR_COLORS = ['#34D399', '#8B5CF6', '#22D3EE', '#FBBF24', '#F472B6', '#9494AB'];

export default function WalletDashboardScreen({ navigation }: any) {
  const { theme } = useTheme();
  const { COLORS, GRADIENTS } = theme;
  const { user } = useAuth();
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [summary, setSummary] = useState<WalletSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [incomingRequestCount, setIncomingRequestCount] = useState(0);

  const load = useCallback(async () => {
    if (!user?.userId) {
      setLoading(false);
      setRefreshing(false);
      return;
    }
    try {
      const [walletRes, summaryRes] = await Promise.all([
        fetchApi('/wallets/me'),
        // Bypasses the GET cache — a "this month" summary going stale for up
        // to 5 minutes right after a send/deposit is far more visible here
        // than on the old plain list, same reasoning as the incoming-request
        // count fetch below.
        fetchApi('/wallets/me/summary', { headers: { 'Cache-Control': 'no-cache' } }),
      ]);
      const walletData = await walletRes.json();
      if (!walletRes.ok) throw new Error(walletData.message || "Couldn't load your wallet.");
      setWallet({ balanceMasheleni: walletData.balanceMasheleni ?? 0, transactions: walletData.transactions ?? [] });
      if (summaryRes.ok) setSummary(await summaryRes.json());
    } catch (e: any) {
      Alert.alert(
        'Something went wrong',
        e?.message || "Couldn't load your wallet. Please try again.",
        [{ text: 'Retry', onPress: load }, { text: 'OK' }],
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }

    // Best-effort — a failed count fetch shouldn't block the wallet itself
    // from loading, it just leaves the badge at its previous value.
    fetchApi('/wallets/requests', { headers: { 'Cache-Control': 'no-cache' } })
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setIncomingRequestCount(data.incoming?.length ?? 0); })
      .catch(() => {});
  }, [user?.userId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

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
    heroCard: {
      marginHorizontal: SPACING.lg,
      marginTop: SPACING.sm,
      borderRadius: RADIUS.xl,
      padding: SPACING.lg,
      borderWidth: 1,
      borderColor: 'rgba(139, 92, 246, 0.35)',
    },
    heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    heroLabel: { color: 'rgba(255,255,255,0.65)', fontSize: 10, fontWeight: '700', letterSpacing: 1.2 },
    heroBalance: { color: '#FFF', fontSize: 34, fontWeight: '800', letterSpacing: -1, marginTop: 6 },
    heroIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
    heroActions: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.lg, flexWrap: 'wrap' },
    heroBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 14, paddingVertical: 8, borderRadius: RADIUS.pill },
    heroBtnDisabled: { backgroundColor: 'rgba(255,255,255,0.07)', opacity: 0.55 },
    heroBtnText: { color: '#FFF', fontSize: 13, fontWeight: '600' },
    sectionLabel: { fontSize: 13, fontWeight: '600', letterSpacing: 0.3, color: COLORS.textMuted, paddingHorizontal: SPACING.lg, marginTop: SPACING.xl },
    statRow: { flexDirection: 'row', gap: SPACING.sm, paddingHorizontal: SPACING.lg, marginTop: SPACING.sm },
    statCard: { flex: 1, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md, padding: SPACING.md, gap: 6 },
    statCardTop: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    statCardLabel: { fontSize: 12, fontWeight: '600', color: COLORS.textMuted },
    statCardValue: { fontSize: 19, fontWeight: '700', color: COLORS.text, letterSpacing: -0.3 },
    breakdownCard: { marginHorizontal: SPACING.lg, marginTop: SPACING.sm, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md, padding: SPACING.md, gap: SPACING.md },
    breakdownRow: { gap: 6 },
    breakdownTop: { flexDirection: 'row', justifyContent: 'space-between' },
    breakdownType: { fontSize: 13, color: COLORS.text, fontWeight: '500' },
    breakdownAmount: { fontSize: 13, color: COLORS.textMuted },
    breakdownTrack: { height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.06)', overflow: 'hidden' },
    breakdownFill: { height: '100%', borderRadius: 3 },
    requestsRow: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      marginHorizontal: SPACING.lg, marginTop: SPACING.xl, padding: SPACING.md,
      borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface,
    },
    requestsRowLeft: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
    requestsRowText: { color: COLORS.text, fontWeight: '500', fontSize: TYPOGRAPHY.body2.fontSize },
    requestBadge: { backgroundColor: COLORS.success, borderRadius: 10, minWidth: 20, height: 20, paddingHorizontal: 6, alignItems: 'center', justifyContent: 'center' },
    requestBadgeText: { color: COLORS.background, fontSize: 11, fontWeight: '700' },
    recentHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.lg, marginTop: SPACING.xl },
    viewAllRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
    viewAllText: { fontSize: 13, fontWeight: '600', color: COLORS.primary },
    txList: { paddingHorizontal: SPACING.lg, marginTop: SPACING.sm, gap: SPACING.sm },
    txRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: COLORS.surface, padding: SPACING.md, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border },
    txLeft: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
    txIconWrap: { width: 36, height: 36, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, justifyContent: 'center', alignItems: 'center' },
    txDetails: { justifyContent: 'center', gap: SPACING.xs / 2 },
    txType: { color: COLORS.text, fontSize: TYPOGRAPHY.label.fontSize, fontWeight: '600' },
    txDate: { color: COLORS.textMuted, fontSize: TYPOGRAPHY.caption.fontSize },
    txAmount: { fontSize: TYPOGRAPHY.body2.fontSize, fontWeight: '600' },
    emptyState: { alignItems: 'center', justifyContent: 'center', paddingTop: SPACING.xl, paddingHorizontal: SPACING.lg, gap: SPACING.sm },
    emptyText: { color: COLORS.textMuted, fontSize: TYPOGRAPHY.body2.fontSize },
  }));

  if (loading) {
    return <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}><ActivityIndicator size="large" color={COLORS.text} /></SafeAreaView>;
  }

  const transactions = wallet?.transactions ?? [];
  const recent = transactions.slice(0, 3);
  const balance = wallet?.balanceMasheleni ?? 0;
  const byTypeTotal = summary?.byType.reduce((sum, t) => sum + t.amount, 0) ?? 0;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.text} />}
      >
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={22} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Activity</Text>
          <View style={{ width: 40 }} />
        </View>

        <LinearGradient colors={GRADIENTS.wallet} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.heroCard}>
          <View style={styles.heroTop}>
            <View>
              <Text style={styles.heroLabel}>ONE WALLET · ONE ECONOMY</Text>
              <Text style={styles.heroBalance}>{formatCurrency(balance)}</Text>
            </View>
            <View style={styles.heroIcon}>
              <Ionicons name="wallet" size={22} color="#FFF" />
            </View>
          </View>
          <View style={styles.heroActions}>
            <TouchableOpacity style={styles.heroBtn} onPress={() => navigation.navigate('Deposit')}>
              <Ionicons name="arrow-down-circle-outline" size={14} color="#FFF" />
              <Text style={styles.heroBtnText}>Deposit</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.heroBtn} onPress={() => navigation.navigate('Send')}>
              <Ionicons name="send-outline" size={14} color="#FFF" />
              <Text style={styles.heroBtnText}>Send</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.heroBtn} onPress={() => navigation.navigate('RequestMoney')}>
              <Ionicons name="download-outline" size={14} color="#FFF" />
              <Text style={styles.heroBtnText}>Request</Text>
            </TouchableOpacity>
            <View
              style={[styles.heroBtn, styles.heroBtnDisabled]}
              accessibilityState={{ disabled: true }}
              accessibilityLabel="Scan — coming soon"
            >
              <Ionicons name="qr-code-outline" size={14} color="#FFF" />
              <Text style={styles.heroBtnText}>Scan</Text>
            </View>
          </View>
        </LinearGradient>

        {summary && (
          <>
            <Text style={styles.sectionLabel}>This Month</Text>
            <View style={styles.statRow}>
              <View style={styles.statCard}>
                <View style={styles.statCardTop}>
                  <Ionicons name="arrow-up-outline" size={16} color={COLORS.success} />
                  <Text style={styles.statCardLabel}>Money In</Text>
                </View>
                <Text style={styles.statCardValue}>{formatCurrency(summary.moneyIn)}</Text>
              </View>
              <View style={styles.statCard}>
                <View style={styles.statCardTop}>
                  <Ionicons name="arrow-down-outline" size={16} color={COLORS.error} />
                  <Text style={styles.statCardLabel}>Money Out</Text>
                </View>
                <Text style={styles.statCardValue}>{formatCurrency(summary.moneyOut)}</Text>
              </View>
            </View>

            {summary.byType.length > 0 && (
              <>
                <Text style={styles.sectionLabel}>By Type</Text>
                <View style={styles.breakdownCard}>
                  {summary.byType.slice(0, 5).map((t, i) => (
                    <View key={t.type} style={styles.breakdownRow}>
                      <View style={styles.breakdownTop}>
                        <Text style={styles.breakdownType}>{humanizeTransactionType(t.type)}</Text>
                        <Text style={styles.breakdownAmount}>{formatCurrency(t.amount)}</Text>
                      </View>
                      <View style={styles.breakdownTrack}>
                        <View
                          style={[
                            styles.breakdownFill,
                            {
                              width: `${byTypeTotal > 0 ? Math.max(4, (t.amount / byTypeTotal) * 100) : 0}%`,
                              backgroundColor: TYPE_BAR_COLORS[i % TYPE_BAR_COLORS.length],
                            },
                          ]}
                        />
                      </View>
                    </View>
                  ))}
                </View>
              </>
            )}
          </>
        )}

        <TouchableOpacity style={styles.requestsRow} onPress={() => navigation.navigate('PaymentRequests')}>
          <View style={styles.requestsRowLeft}>
            <Ionicons name="receipt-outline" size={18} color={COLORS.text} />
            <Text style={styles.requestsRowText}>Payment Requests</Text>
            {incomingRequestCount > 0 && (
              <View style={styles.requestBadge}>
                <Text style={styles.requestBadgeText}>{incomingRequestCount}</Text>
              </View>
            )}
          </View>
          <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
        </TouchableOpacity>

        <View style={styles.recentHeader}>
          <Text style={[styles.sectionLabel, { paddingHorizontal: 0, marginTop: 0 }]}>Recent Activity</Text>
          <TouchableOpacity style={styles.viewAllRow} onPress={() => navigation.navigate('WalletTransactions')}>
            <Text style={styles.viewAllText}>View All</Text>
            <Ionicons name="chevron-forward" size={14} color={COLORS.primary} />
          </TouchableOpacity>
        </View>

        {recent.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="receipt-outline" size={40} color={COLORS.textMuted} />
            <Text style={styles.emptyText}>No transactions yet</Text>
          </View>
        ) : (
          <View style={styles.txList}>
            {recent.map(item => {
              const positive = isPositiveTransactionType(item.type);
              return (
                <View key={item.id} style={styles.txRow}>
                  <View style={styles.txLeft}>
                    <View style={styles.txIconWrap}>
                      <Ionicons name={transactionIcon(item.type) as any} size={18} color={COLORS.text} />
                    </View>
                    <View style={styles.txDetails}>
                      <Text style={styles.txType}>{humanizeTransactionType(item.type)}</Text>
                      <Text style={styles.txDate}>{new Date(item.timestamp).toLocaleDateString()}</Text>
                    </View>
                  </View>
                  <Text style={[styles.txAmount, { color: positive ? COLORS.success : COLORS.text }]}>
                    {positive ? '+' : ''}{formatCurrency(Math.abs(Number(item.amount)))}
                  </Text>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
