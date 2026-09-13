import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useThemedStyles } from '../../theme/useThemedStyles';
import { useAuth } from '../../context/AuthContext';
import { fetchApi } from '../../utils/api';
import { formatCurrency } from '../../utils/format';

// ── Shape the API writes directly into Message.content (see
// financial-engine.service.ts's postRequestCard) — the "facts at request
// time" only; live status (PENDING/PAID/DECLINED) is fetched from
// GET /wallets/requests/:id, not trusted from this static payload, since
// the same request can be resolved from a different surface later (a
// future "My Requests" list) and the chat message text never changes.
export interface PaymentRequestCardData {
  paymentRequestId: string;
  amount: number;
  memo: string | null;
  requesterId: string;
  requesterName: string;
  payerId: string;
  requestedAt: string;
}

export const PAYMENT_REQUEST_CARD_TAG = '__paymentRequestCard';

export function decodePaymentRequestCard(content: string): PaymentRequestCardData | null {
  try {
    if (!content.includes(PAYMENT_REQUEST_CARD_TAG)) return null;
    const parsed = JSON.parse(content);
    if (!parsed[PAYMENT_REQUEST_CARD_TAG]) return null;
    const { [PAYMENT_REQUEST_CARD_TAG]: _tag, ...rest } = parsed;
    return rest as PaymentRequestCardData;
  } catch {
    return null;
  }
}

type LiveStatus = 'PENDING' | 'PAID' | 'DECLINED' | 'CANCELLED';

interface Props {
  request: PaymentRequestCardData;
}

// A "please pay me" prompt posted automatically when someone requests
// money from their chat partner (see financial-engine.service.ts's
// requestPayment). Unlike MoneyMiniCard (a receipt for something that
// already happened), this one is interactive for the payer — Pay/Decline —
// until it resolves, then settles into the same quiet receipt styling.
export default function PaymentRequestMiniCard({ request }: Props) {
  const { user } = useAuth();
  const [status, setStatus] = useState<LiveStatus>('PENDING');
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [responding, setResponding] = useState<'pay' | 'decline' | null>(null);

  const isPayer = user?.userId === request.payerId;

  const refreshStatus = () => {
    fetchApi(`/wallets/requests/${request.paymentRequestId}`, { headers: { 'Cache-Control': 'no-cache' } })
      .then((res) => res.json())
      .then((data) => { if (data?.status) setStatus(data.status); })
      .catch(() => {})
      .finally(() => setLoadingStatus(false));
  };

  useEffect(() => {
    refreshStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const respond = async (accept: boolean) => {
    setResponding(accept ? 'pay' : 'decline');
    try {
      const res = await fetchApi(`/wallets/requests/${request.paymentRequestId}/respond`, {
        method: 'POST',
        body: JSON.stringify({ accept }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Could not respond to this request');
      setStatus(data.status ?? (accept ? 'PAID' : 'DECLINED'));
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Please try again.');
    } finally {
      setResponding(null);
    }
  };

  const styles = useThemedStyles(({ COLORS, RADIUS }) => ({
    card: {
      minWidth: 240,
      maxWidth: 290,
      borderRadius: RADIUS.lg,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: COLORS.border,
      backgroundColor: COLORS.surface,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      padding: 14,
    },
    iconWrap: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: 'rgba(245,158,11,0.15)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    amount: { color: COLORS.text, fontSize: 17, fontWeight: '800' },
    label: { color: COLORS.textMuted, fontSize: 12, fontWeight: '600', marginTop: 1 },
    memo: { color: COLORS.textMuted, fontSize: 12, fontStyle: 'italic', paddingHorizontal: 14, paddingBottom: 10 },
    actions: {
      flexDirection: 'row',
      borderTopWidth: 1,
      borderTopColor: COLORS.border,
    },
    actionBtn: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 11,
      flexDirection: 'row',
      gap: 6,
    },
    actionDivider: { width: 1, backgroundColor: COLORS.border },
    payText: { color: '#22c55e', fontWeight: '700', fontSize: 13 },
    declineText: { color: COLORS.error, fontWeight: '700', fontSize: 13 },
    statusPill: {
      alignSelf: 'flex-start',
      marginHorizontal: 14,
      marginBottom: 12,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: RADIUS.pill,
      backgroundColor: COLORS.surfaceElevated,
    },
    statusText: { fontSize: 11, fontWeight: '700' },
  }));

  const statusMeta: Record<LiveStatus, { label: string; color: string; icon: keyof typeof Ionicons.glyphMap }> = {
    PENDING: { label: 'Pending', color: '#F59E0B', icon: 'time-outline' },
    PAID: { label: 'Paid', color: '#22c55e', icon: 'checkmark-circle' },
    DECLINED: { label: 'Declined', color: '#ef4444', icon: 'close-circle' },
    CANCELLED: { label: 'Cancelled', color: '#9CA3AF', icon: 'close-circle-outline' },
  };
  const meta = statusMeta[status];

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <LinearGradient colors={['#F59E0B', '#D97706']} style={styles.iconWrap as any}>
          <Ionicons name="cash-outline" size={19} color="#fff" />
        </LinearGradient>
        <View style={{ flex: 1 }}>
          <Text style={styles.amount}>{formatCurrency(request.amount)}</Text>
          <Text style={styles.label} numberOfLines={1}>
            {isPayer ? `${request.requesterName} requested this` : 'You requested this'}
          </Text>
        </View>
      </View>

      {request.memo ? <Text style={styles.memo} numberOfLines={2}>"{request.memo}"</Text> : null}

      {loadingStatus ? (
        <View style={{ padding: 14, alignItems: 'center' }}>
          <ActivityIndicator size="small" color={meta.color} />
        </View>
      ) : status === 'PENDING' && isPayer ? (
        <View style={styles.actions}>
          <TouchableOpacity style={styles.actionBtn} onPress={() => respond(false)} disabled={!!responding}>
            {responding === 'decline' ? <ActivityIndicator size="small" color="#ef4444" /> : (
              <>
                <Ionicons name="close" size={16} color="#ef4444" />
                <Text style={styles.declineText}>Decline</Text>
              </>
            )}
          </TouchableOpacity>
          <View style={styles.actionDivider} />
          <TouchableOpacity style={styles.actionBtn} onPress={() => respond(true)} disabled={!!responding}>
            {responding === 'pay' ? <ActivityIndicator size="small" color="#22c55e" /> : (
              <>
                <Ionicons name="checkmark" size={16} color="#22c55e" />
                <Text style={styles.payText}>Pay</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      ) : (
        <View style={[styles.statusPill, { backgroundColor: `${meta.color}1A` }]}>
          <Ionicons name={meta.icon} size={12} color={meta.color} />
          <Text style={[styles.statusText, { color: meta.color }]}>{meta.label}</Text>
        </View>
      )}
    </View>
  );
}
