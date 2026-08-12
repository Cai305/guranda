import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, FlatList, ActivityIndicator, RefreshControl, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { useThemedStyles } from '../theme/useThemedStyles';
import { fetchApi } from '../utils/api';
import { formatCurrency } from '../utils/format';

// shadcn/ui-inspired palette, scoped to this screen only as a design
// proof-of-concept — not wired into the shared theme's COLORS/GRADIENTS.
const SC = {
  background: '#0A0A0A',
  card: '#18181B',
  border: 'rgba(255,255,255,0.1)',
  foreground: '#FAFAFA',
  mutedForeground: '#8A8A8E',
  success: '#4ADE80',
  radius: 10,
};

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
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
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
  }, [user?.userId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const styles = useThemedStyles(({ SPACING, TYPOGRAPHY }) => ({
    container: {
      flex: 1,
      backgroundColor: SC.background,
    },
    header: {
      padding: SPACING.lg,
      alignItems: 'center',
      borderBottomWidth: 1,
      borderBottomColor: SC.border,
    },
    balanceLabel: {
      color: SC.mutedForeground,
      fontSize: TYPOGRAPHY.label.fontSize,
      fontWeight: '500',
    },
    balanceValue: {
      color: SC.foreground,
      fontSize: TYPOGRAPHY.display.fontSize,
      fontWeight: '600',
      marginTop: SPACING.sm,
      letterSpacing: -0.5,
    },
    balanceCurrency: {
      color: SC.mutedForeground,
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
      borderRadius: SC.radius,
      borderWidth: 1,
      borderColor: SC.border,
      backgroundColor: SC.card,
    },
    actionButtonDisabled: {
      opacity: 0.4,
    },
    buttonText: {
      color: SC.foreground,
      fontWeight: '500',
      fontSize: TYPOGRAPHY.caption.fontSize,
    },
    comingSoonCaption: {
      color: SC.mutedForeground,
      fontSize: 9,
      fontWeight: '500',
    },
    feedContainer: {
      flex: 1,
      padding: SPACING.lg,
    },
    sectionTitle: {
      color: SC.foreground,
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
      color: SC.mutedForeground,
      fontSize: TYPOGRAPHY.body2.fontSize,
    },
    txRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: SC.card,
      padding: SPACING.md,
      borderRadius: SC.radius,
      marginBottom: SPACING.sm,
      borderWidth: 1,
      borderColor: SC.border,
    },
    txLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.md,
    },
    txIconWrap: {
      width: 36,
      height: 36,
      borderRadius: SC.radius,
      borderWidth: 1,
      borderColor: SC.border,
      justifyContent: 'center',
      alignItems: 'center',
    },
    txDetails: {
      justifyContent: 'center',
      gap: SPACING.xs / 2,
    },
    txType: {
      color: SC.foreground,
      fontSize: TYPOGRAPHY.label.fontSize,
      fontWeight: '600',
    },
    txDate: {
      color: SC.mutedForeground,
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
            <Ionicons name={iconName} size={18} color={SC.foreground} />
          </View>
          <View style={styles.txDetails}>
            <Text style={styles.txType}>{humanizeTransactionType(item.type)}</Text>
            <Text style={styles.txDate}>{new Date(item.timestamp).toLocaleDateString()}</Text>
          </View>
        </View>
        <Text style={[styles.txAmount, { color: isPositive ? SC.success : SC.foreground }]}>
          {isPositive ? '+' : ''}{formatCurrency(Number(item.amount))}
        </Text>
      </View>
    );
  };

  if (loading) {
    return <View style={styles.container}><ActivityIndicator size="large" color={SC.foreground} /></View>;
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
            <Ionicons name="arrow-down-circle-outline" size={20} color={SC.foreground} />
            <Text style={styles.buttonText}>Deposit</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={() => navigation.navigate('Send')}>
            <Ionicons name="send-outline" size={20} color={SC.foreground} />
            <Text style={styles.buttonText}>Send</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.actionButtonDisabled]}
            disabled
            accessibilityState={{ disabled: true }}
            accessibilityLabel="Request — coming soon"
          >
            <Ionicons name="download-outline" size={20} color={SC.foreground} />
            <Text style={styles.buttonText}>Request</Text>
            <Text style={styles.comingSoonCaption}>Coming Soon</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.actionButtonDisabled]}
            disabled
            accessibilityState={{ disabled: true }}
            accessibilityLabel="Scan — coming soon"
          >
            <Ionicons name="qr-code-outline" size={20} color={SC.foreground} />
            <Text style={styles.buttonText}>Scan</Text>
            <Text style={styles.comingSoonCaption}>Coming Soon</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.feedContainer}>
        <Text style={styles.sectionTitle}>Recent Activity</Text>
        <FlatList
          data={transactions}
          keyExtractor={(item) => item.id}
          renderItem={renderTransaction}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={SC.foreground} />}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="receipt-outline" size={40} color={SC.mutedForeground} />
              <Text style={styles.emptyText}>No transactions yet</Text>
            </View>
          }
        />
      </View>
    </SafeAreaView>
  );
}
