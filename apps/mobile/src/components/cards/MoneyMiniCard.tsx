import React from 'react';
import { View, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useThemedStyles } from '../../theme/useThemedStyles';
import { formatCurrency } from '../../utils/format';

// ── Shape the API writes directly into Message.content (see
// wallets.service.ts's notifyTransfer) — the API only ever WRITES this
// tag, the mobile client is what decodes/renders it, same split as every
// other __xCard (see EventMiniCard.tsx's comment on the pattern).
export interface MoneyCardData {
  amount: number;
  senderId: string;
  senderName: string;
  senderAvatarUrl?: string | null;
  recipientId: string;
  transactionId: string;
  sentAt: string;
}

export const MONEY_CARD_TAG = '__moneyCard';

export function decodeMoneyCard(content: string): MoneyCardData | null {
  try {
    if (!content.includes(MONEY_CARD_TAG)) return null;
    const parsed = JSON.parse(content);
    if (!parsed[MONEY_CARD_TAG]) return null;
    const { [MONEY_CARD_TAG]: _tag, ...rest } = parsed;
    return rest as MoneyCardData;
  } catch {
    return null;
  }
}

interface Props {
  money: MoneyCardData;
  /** True when the person viewing this card is the one who sent the money. */
  isSender: boolean;
}

// A payment receipt posted automatically into the sender/recipient's chat
// the moment a wallet transfer completes (see wallets.service.ts's
// notifyTransfer) — there's nothing to tap or confirm here, unlike
// EventMiniCard/ProductMiniCard's action buttons; it's a record of
// something that already happened, styled like a receipt rather than an
// interactive prompt.
export default function MoneyMiniCard({ money, isSender }: Props) {
  const styles = useThemedStyles(({ RADIUS }) => ({
    card: {
      minWidth: 220,
      maxWidth: 280,
      borderRadius: RADIUS.lg,
      overflow: 'hidden',
    },
    inner: {
      padding: 14,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    iconWrap: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: 'rgba(255,255,255,0.18)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    amount: {
      color: '#fff',
      fontSize: 18,
      fontWeight: '800',
    },
    label: {
      color: 'rgba(255,255,255,0.85)',
      fontSize: 12.5,
      fontWeight: '600',
      marginTop: 2,
    },
  }));

  return (
    <View style={styles.card}>
      <LinearGradient
        colors={isSender ? ['#7c3aed', '#4c1d95'] : ['#059669', '#047857']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.inner}
      >
        <View style={styles.iconWrap}>
          <Ionicons name={isSender ? 'arrow-up' : 'arrow-down'} size={20} color="#fff" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.amount}>{formatCurrency(money.amount)}</Text>
          <Text style={styles.label} numberOfLines={1}>
            {isSender ? 'You sent this' : `${money.senderName} sent you this`}
          </Text>
        </View>
      </LinearGradient>
    </View>
  );
}
