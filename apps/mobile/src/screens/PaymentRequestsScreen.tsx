import React, { useCallback, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Image, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import { useThemedStyles } from '../theme/useThemedStyles';
import { fetchApi } from '../utils/api';
import { formatCurrency } from '../utils/format';

type PaymentRequest = {
  id: string;
  amount: number;
  memo?: string | null;
  status: string;
  createdAt: string;
  requester?: { username: string; profile?: { displayName?: string; avatarUrl?: string } };
  payer?: { username: string; profile?: { displayName?: string; avatarUrl?: string } };
};

export default function PaymentRequestsScreen({ navigation }: any) {
  const { theme } = useTheme();
  const { COLORS, TYPOGRAPHY } = theme;
  const [incoming, setIncoming] = useState<PaymentRequest[]>([]);
  const [outgoing, setOutgoing] = useState<PaymentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [respondingId, setRespondingId] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    // Bypasses fetchApi's 5-minute GET cache — a request just sent/responded
    // to must show up here immediately, not on the next cache expiry.
    fetchApi('/wallets/requests', { headers: { 'Cache-Control': 'no-cache' } })
      .then(r => (r.ok ? r.json() : { incoming: [], outgoing: [] }))
      .then(data => {
        setIncoming(data.incoming ?? []);
        setOutgoing(data.outgoing ?? []);
      })
      .catch(() => { setIncoming([]); setOutgoing([]); })
      .finally(() => setLoading(false));
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const respond = (id: string, accept: boolean) => {
    setRespondingId(id);
    fetchApi(`/wallets/requests/${id}/respond`, {
      method: 'POST',
      body: JSON.stringify({ accept }),
    })
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.message || 'Could not respond to the request');
        load();
      })
      .catch((e) => Alert.alert('Error', e.message))
      .finally(() => setRespondingId(null));
  };

  const styles = useThemedStyles(({ COLORS, RADIUS, SPACING }) => ({
    root: { flex: 1, backgroundColor: COLORS.background },
    header: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md,
    },
    backBtn: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
    sectionTitle: { color: COLORS.textMuted, fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: SPACING.lg, marginBottom: SPACING.sm },
    row: {
      flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
      backgroundColor: COLORS.glass, borderWidth: 1, borderColor: COLORS.glassBorder,
      borderRadius: RADIUS.md, padding: SPACING.md, marginBottom: SPACING.sm,
    },
    avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.surface },
    name: { color: COLORS.text, fontWeight: '600' },
    amount: { color: COLORS.secondary, fontWeight: '700', marginTop: 2 },
    memo: { color: COLORS.textMuted, fontSize: 12, marginTop: 2 },
    statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
    statusPillText: { fontSize: 11, fontWeight: '700' },
    actions: { flexDirection: 'row', gap: SPACING.xs },
    acceptBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 14, paddingVertical: 8, borderRadius: RADIUS.sm },
    declineBtn: { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 14, paddingVertical: 8, borderRadius: RADIUS.sm },
    actionText: { color: COLORS.text, fontWeight: '600', fontSize: 13 },
  }));

  const statusColor = (status: string) => {
    if (status === 'PAID') return '#4ADE80';
    if (status === 'DECLINED') return '#F87171';
    if (status === 'CANCELLED') return COLORS.textMuted;
    return '#FBBF24';
  };

  const renderIncoming = (item: PaymentRequest) => {
    const person = item.requester;
    return (
      <View style={styles.row} key={item.id}>
        {person?.profile?.avatarUrl ? (
          <Image source={{ uri: person.profile.avatarUrl }} style={styles.avatar} />
        ) : (
          <Ionicons name="person-circle" size={36} color={COLORS.primary} />
        )}
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{person?.profile?.displayName || person?.username || 'Someone'}</Text>
          <Text style={styles.amount}>{formatCurrency(item.amount)}</Text>
          {!!item.memo && <Text style={styles.memo}>"{item.memo}"</Text>}
        </View>
        {respondingId === item.id ? (
          <ActivityIndicator color={COLORS.primary} />
        ) : (
          <View style={styles.actions}>
            <TouchableOpacity style={styles.declineBtn} onPress={() => respond(item.id, false)}>
              <Text style={styles.actionText}>Decline</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.acceptBtn}
              onPress={() => {
                const who = person?.profile?.displayName || person?.username || 'this request';
                Alert.alert(
                  'Confirm payment',
                  `Send ${formatCurrency(item.amount)} to ${who}?`,
                  [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Send', onPress: () => respond(item.id, true) },
                  ],
                );
              }}
            >
              <Text style={styles.actionText}>Accept</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  const renderOutgoing = (item: PaymentRequest) => {
    const person = item.payer;
    return (
      <View style={styles.row} key={item.id}>
        {person?.profile?.avatarUrl ? (
          <Image source={{ uri: person.profile.avatarUrl }} style={styles.avatar} />
        ) : (
          <Ionicons name="person-circle" size={36} color={COLORS.primary} />
        )}
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{person?.profile?.displayName || person?.username || 'Someone'}</Text>
          <Text style={styles.amount}>{formatCurrency(item.amount)}</Text>
          {!!item.memo && <Text style={styles.memo}>"{item.memo}"</Text>}
        </View>
        <View style={[styles.statusPill, { backgroundColor: statusColor(item.status) + '22' }]}>
          <Text style={[styles.statusPillText, { color: statusColor(item.status) }]}>{item.status}</Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={TYPOGRAPHY.h2}>Payment Requests</Text>
        <View style={{ width: 36 }} />
      </View>

      {loading ? (
        <View style={{ padding: 40, alignItems: 'center' }}>
          <ActivityIndicator color={COLORS.primary} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 60 }}>
          <Text style={styles.sectionTitle}>Incoming</Text>
          {incoming.length === 0 ? (
            <Text style={{ color: COLORS.textMuted, marginBottom: 20 }}>No pending requests.</Text>
          ) : (
            incoming.map(renderIncoming)
          )}

          <Text style={styles.sectionTitle}>Sent by you</Text>
          {outgoing.length === 0 ? (
            <Text style={{ color: COLORS.textMuted }}>You haven't requested anything yet.</Text>
          ) : (
            outgoing.map(renderOutgoing)
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
