import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, FlatList, ActivityIndicator, RefreshControl, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useThemedStyles } from '../theme/useThemedStyles';
import { fetchApi } from '../utils/api';
import { formatCurrency } from '../utils/format';

const TRANSACTION_TYPE_LABELS: Record<string, string> = {
  SEND: 'Sent',
  RECEIVE: 'Received',
  PAYMENT: 'Payment',
  DEPOSIT: 'Deposit',
  STORY_LIKE: 'Story like',
  STORY_COMMENT: 'Story comment',
  STORY_RANK: 'Story ranking',
  STORY_ITEM_SALE: 'Item sale',
  EAT_ORDER_PAYOUT: 'Food order payout',
  SHOPPING_ORDER_PAYOUT: 'Shopping order payout',
};

function humanizeTransactionType(type: string): string {
  if (TRANSACTION_TYPE_LABELS[type]) return TRANSACTION_TYPE_LABELS[type];
  return type.split('_').map(w => w.charAt(0) + w.slice(1).toLowerCase()).join(' ');
}

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

export default function WalletScreen({ navigation }: any) {
  const { theme } = useTheme();
  const { COLORS } = theme;
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [incomingRequestCount, setIncomingRequestCount] = useState(0);
  const { user } = useAuth();

  const load = useCallback(async () => {
    if (!user?.userId) {
      setLoading(false);
      setRefreshing(false);
      return;
    }
    try {
      const res = await fetchApi('/wallets/me');
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Couldn't load your wallet.");
      setWallet({ balanceMasheleni: data.balanceMasheleni ?? 0, transactions: data.transactions ?? [] });
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
    // from loading, it just leaves the badge at its previous value. Bypasses
    // the GET cache for the same reason as PaymentRequestsScreen.
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
    container: {
      flex: 1,
      backgroundColor: COLORS.background,
    },
    header: {
      padding: SPACING.lg,
      alignItems: 'center',
      borderBottomWidth: 1,
      borderBottomColor: COLORS.border,
    },
    balanceLabel: {
      color: COLORS.textMuted,
      fontSize: TYPOGRAPHY.label.fontSize,
      fontWeight: '500',
    },
    balanceValue: {
      color: COLORS.text,
      fontSize: TYPOGRAPHY.display.fontSize,
      fontWeight: '600',
      marginTop: SPACING.sm,
      letterSpacing: -0.5,
    },
    balanceCurrency: {
      color: COLORS.textMuted,
      fontSize: TYPOGRAPHY.h4.fontSize,
      fontWeight: '500',
    },
    buttonRow: {
      flexDirection: 'row',
      marginTop: SPACING.lg,
      gap: SPACING.sm,
    },
    actionButton: {
      alignItems: 'center',
      justifyContent: 'center',
      gap: SPACING.xs,
      width: 78,
      paddingVertical: SPACING.md,
      borderRadius: RADIUS.md,
      borderWidth: 1,
      borderColor: COLORS.border,
      backgroundColor: COLORS.surface,
    },
    actionButtonDisabled: {
      opacity: 0.4,
    },
    buttonText: {
      color: COLORS.text,
      fontWeight: '500',
      fontSize: TYPOGRAPHY.caption.fontSize,
    },
    comingSoonCaption: {
      color: COLORS.textMuted,
      fontSize: 9,
      fontWeight: '500',
    },
    requestsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginHorizontal: SPACING.lg,
      marginTop: SPACING.md,
      padding: SPACING.md,
      borderRadius: RADIUS.md,
      borderWidth: 1,
      borderColor: COLORS.border,
      backgroundColor: COLORS.surface,
    },
    requestsRowLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.sm,
    },
    requestsRowText: {
      color: COLORS.text,
      fontWeight: '500',
      fontSize: TYPOGRAPHY.body2.fontSize,
    },
    requestBadge: {
      backgroundColor: COLORS.success,
      borderRadius: 10,
      minWidth: 20,
      height: 20,
      paddingHorizontal: 6,
      alignItems: 'center',
      justifyContent: 'center',
    },
    requestBadgeText: {
      color: COLORS.background,
      fontSize: 11,
      fontWeight: '700',
    },
    feedContainer: {
      flex: 1,
      padding: SPACING.lg,
    },
    sectionTitle: {
      color: COLORS.text,
      fontSize: TYPOGRAPHY.button.fontSize,
      fontWeight: '600',
      marginBottom: SPACING.md,
    },
    emptyState: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingTop: SPACING.xxl,
      gap: SPACING.sm,
    },
    emptyText: {
      color: COLORS.textMuted,
      fontSize: TYPOGRAPHY.body2.fontSize,
    },
    txRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: COLORS.surface,
      padding: SPACING.md,
      borderRadius: RADIUS.md,
      marginBottom: SPACING.sm,
      borderWidth: 1,
      borderColor: COLORS.border,
    },
    txLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.md,
    },
    txIconWrap: {
      width: 36,
      height: 36,
      borderRadius: RADIUS.md,
      borderWidth: 1,
      borderColor: COLORS.border,
      justifyContent: 'center',
      alignItems: 'center',
    },
    txDetails: {
      justifyContent: 'center',
      gap: SPACING.xs / 2,
    },
    txType: {
      color: COLORS.text,
      fontSize: TYPOGRAPHY.label.fontSize,
      fontWeight: '600',
    },
    txDate: {
      color: COLORS.textMuted,
      fontSize: TYPOGRAPHY.caption.fontSize,
    },
    txAmount: {
      fontSize: TYPOGRAPHY.body2.fontSize,
      fontWeight: '600',
    },
  }));

  const renderTransaction = ({ item }: { item: WalletTransaction }) => {
    const isPositive = item.type === 'RECEIVE' || item.type === 'DEPOSIT';
    const iconName = item.type === 'RECEIVE' || item.type === 'DEPOSIT' ? 'arrow-down-circle-outline' : item.type === 'SEND' ? 'arrow-up-circle-outline' : 'cart-outline';

    return (
      <View style={styles.txRow}>
        <View style={styles.txLeft}>
          <View style={styles.txIconWrap}>
            <Ionicons name={iconName} size={18} color={COLORS.text} />
          </View>
          <View style={styles.txDetails}>
            <Text style={styles.txType}>{humanizeTransactionType(item.type)}</Text>
            <Text style={styles.txDate}>{new Date(item.timestamp).toLocaleDateString()}</Text>
          </View>
        </View>
        <Text style={[styles.txAmount, { color: isPositive ? COLORS.success : COLORS.text }]}>
          {isPositive ? '+' : ''}{formatCurrency(Number(item.amount))}
        </Text>
      </View>
    );
  };

  if (loading) {
    return <View style={styles.container}><ActivityIndicator size="large" color={COLORS.text} /></View>;
  }

  const transactions = wallet?.transactions ?? [];
  const balance = wallet?.balanceMasheleni ?? 0;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.balanceLabel}>Total Balance</Text>
        <Text style={styles.balanceValue}>{formatCurrency(balance)}</Text>

        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.actionButton} onPress={() => navigation.navigate('Deposit')}>
            <Ionicons name="arrow-down-circle-outline" size={20} color={COLORS.text} />
            <Text style={styles.buttonText}>Deposit</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={() => navigation.navigate('Send')}>
            <Ionicons name="send-outline" size={20} color={COLORS.text} />
            <Text style={styles.buttonText}>Send</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={() => navigation.navigate('RequestMoney')}>
            <Ionicons name="download-outline" size={20} color={COLORS.text} />
            <Text style={styles.buttonText}>Request</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.actionButtonDisabled]}
            disabled
            accessibilityState={{ disabled: true }}
            accessibilityLabel="Scan — coming soon"
          >
            <Ionicons name="qr-code-outline" size={20} color={COLORS.text} />
            <Text style={styles.buttonText}>Scan</Text>
            <Text style={styles.comingSoonCaption}>Coming Soon</Text>
          </TouchableOpacity>
        </View>
      </View>

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

      <View style={styles.feedContainer}>
        <Text style={styles.sectionTitle}>Recent Activity</Text>
        <FlatList
          data={transactions}
          keyExtractor={(item) => item.id}
          renderItem={renderTransaction}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.text} />}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="receipt-outline" size={40} color={COLORS.textMuted} />
              <Text style={styles.emptyText}>No transactions yet</Text>
            </View>
          }
        />
      </View>
    </SafeAreaView>
  );
}
