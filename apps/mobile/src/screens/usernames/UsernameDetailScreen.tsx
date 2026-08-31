import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { fetchApi } from '../../utils/api';
import { formatCurrency } from '../../utils/format';
import { useTheme } from '../../context/ThemeContext';
import { useThemedStyles } from '../../theme/useThemedStyles';

function useCountdown(endsAt?: string | null) {
  const [remaining, setRemaining] = useState('');
  useEffect(() => {
    if (!endsAt) return;
    const tick = () => {
      const ms = new Date(endsAt).getTime() - Date.now();
      if (ms <= 0) { setRemaining('Ended'); return; }
      const h = Math.floor(ms / 3600000);
      const m = Math.floor((ms % 3600000) / 60000);
      const s = Math.floor((ms % 60000) / 1000);
      setRemaining(h > 0 ? `${h}h ${m}m left` : m > 0 ? `${m}m ${s}s left` : `${s}s left`);
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [endsAt]);
  return remaining;
}

const LEVEL_COLOR: Record<string, string> = {
  Nano: '#6B7280', Micro: '#10B981', Midtier: '#3B82F6', Macro: '#A78BFA', 'Mega Influencer': '#F59E0B',
};

export default function UsernameDetailScreen({ navigation, route }: any) {
  const { theme } = useTheme();
  const { COLORS, TYPOGRAPHY } = theme;
  const { usernameId } = route.params || {};
  const { user } = useAuth();
  const [username, setUsername] = useState<any>(null);
  const [bidAmount, setBidAmount] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    fetchApi(`/usernames/${usernameId}`)
      .then(res => (res.ok ? res.json() : null))
      .then(setUsername)
      .catch(() => {});
  }, [usernameId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const countdown = useCountdown(username?.saleStatus === 'AUCTION' ? username?.auctionEndsAt : null);

  const styles = useThemedStyles(({ COLORS, TYPOGRAPHY, RADIUS, SPACING }) => ({
    root: { flex: 1, backgroundColor: '#150A2E' },
    header: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md,
    },
    backBtn: {
      width: 40, height: 40, borderRadius: RADIUS.pill,
      backgroundColor: COLORS.glass, borderWidth: 1, borderColor: COLORS.glassBorder,
      justifyContent: 'center', alignItems: 'center',
    },
    body: { padding: SPACING.lg },
    statusRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
    levelPill: { borderWidth: 1, borderRadius: RADIUS.pill, paddingHorizontal: 10, paddingVertical: 4 },
    levelText: { fontSize: 10.5, fontWeight: '800' },
    countdownPill: {
      flexDirection: 'row', gap: 4, alignItems: 'center',
      backgroundColor: 'rgba(245,158,11,0.15)', borderWidth: 1, borderColor: 'rgba(245,158,11,0.4)',
      borderRadius: RADIUS.pill, paddingHorizontal: 10, paddingVertical: 4,
    },
    countdownText: { color: '#F59E0B', fontSize: 11, fontWeight: '700' },
    price: { color: '#A78BFA', fontWeight: '800', fontSize: 22, marginTop: 10 },
    meta: { color: COLORS.textMuted, fontSize: 13, marginTop: 4 },
    sellerCard: {
      flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 20,
      backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: RADIUS.lg,
      borderWidth: 1, borderColor: COLORS.glassBorder, padding: 12,
    },
    sellerName: { color: COLORS.text, fontWeight: '700', fontSize: 14 },
    sellerRole: { color: COLORS.textMuted, fontSize: 11.5, marginTop: 2 },
    buyBtn: {
      flexDirection: 'row', gap: 8, marginTop: 18,
      backgroundColor: '#7C3AED', borderRadius: RADIUS.pill, paddingVertical: 14,
      justifyContent: 'center', alignItems: 'center',
    },
    buyBtnText: { color: '#FFF', fontWeight: '800', fontSize: 15 },
    bidCard: {
      marginTop: 18, backgroundColor: 'rgba(167,139,250,0.08)',
      borderWidth: 1, borderColor: 'rgba(167,139,250,0.4)', borderRadius: RADIUS.lg, padding: 14,
    },
    bidLabel: { color: COLORS.text, fontWeight: '700', fontSize: 13 },
    bidRow: { flexDirection: 'row', gap: 10, marginTop: 10 },
    bidInput: {
      flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: RADIUS.pill,
      borderWidth: 1, borderColor: COLORS.glassBorder, color: COLORS.text,
      paddingHorizontal: 14, paddingVertical: 9, fontSize: 13,
    },
    bidBtn: { backgroundColor: '#7C3AED', borderRadius: RADIUS.pill, paddingHorizontal: 20, justifyContent: 'center' },
    bidBtnText: { color: '#FFF', fontWeight: '800', fontSize: 13 },
    cancelBtn: {
      marginTop: 18, borderRadius: RADIUS.pill, paddingVertical: 13,
      borderWidth: 1, borderColor: 'rgba(248,113,113,0.4)', alignItems: 'center',
    },
    cancelBtnText: { color: '#F87171', fontWeight: '700', fontSize: 13.5 },
    soldBanner: {
      flexDirection: 'row', gap: 8, alignItems: 'center', marginTop: 18,
      backgroundColor: 'rgba(107,114,128,0.1)', borderWidth: 1, borderColor: 'rgba(107,114,128,0.4)',
      borderRadius: RADIUS.md, padding: 12,
    },
    soldBannerText: { color: '#9CA3AF', fontSize: 12.5, fontWeight: '600' },
    sectionLabel: { ...TYPOGRAPHY.label, fontSize: 11, marginTop: SPACING.xl, marginBottom: SPACING.sm },
    bidHistory: {
      backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: RADIUS.md,
      borderWidth: 1, borderColor: COLORS.glassBorder, overflow: 'hidden',
    },
    bidHistoryRow: {
      flexDirection: 'row', justifyContent: 'space-between', padding: 12,
      borderBottomWidth: 1, borderBottomColor: COLORS.glassBorder,
    },
    bidHistoryName: { color: COLORS.text, fontSize: 12.5 },
    bidHistoryAmount: { color: '#A78BFA', fontWeight: '700', fontSize: 12.5 },
  }));

  if (!username) {
    return (
      <SafeAreaView style={styles.root}>
        <ActivityIndicator style={{ marginTop: 60 }} color="#A78BFA" />
      </SafeAreaView>
    );
  }

  const isOwner = username.owner?.id === user?.userId;
  const isAuction = username.saleStatus === 'AUCTION';
  const isListed = username.saleStatus !== 'NONE';
  const minBid = username.currentBid ? Number(username.currentBid) + 0.01 : Number(username.price);

  const buyNow = async () => {
    try {
      setBusy(true);
      const res = await fetchApi(`/usernames/${usernameId}/buy`, { method: 'POST' });
      const d = await res.json();
      if (!res.ok) throw new Error(d.message || 'Purchase failed');
      Alert.alert('Purchased! 🎉', `You bought @${username.label} for ${formatCurrency(username.price)}. Activate it from My Usernames whenever you're ready.`);
      load();
    } catch (e: any) {
      Alert.alert('Purchase failed', e.message);
    } finally {
      setBusy(false);
    }
  };

  const placeBid = async () => {
    const amount = parseFloat(bidAmount);
    if (!(amount >= minBid)) {
      Alert.alert('Bid too low', `Your bid must be at least ${formatCurrency(minBid)}.`);
      return;
    }
    try {
      setBusy(true);
      const res = await fetchApi(`/usernames/${usernameId}/bid`, { method: 'POST', body: JSON.stringify({ amount }) });
      const d = await res.json();
      if (!res.ok) throw new Error(d.message || 'Bid failed');
      setBidAmount('');
      Alert.alert('Bid placed!', `You're now the highest bidder at ${formatCurrency(Number(amount))}.`);
      load();
    } catch (e: any) {
      Alert.alert('Bid failed', e.message);
    } finally {
      setBusy(false);
    }
  };

  const cancelListing = async () => {
    try {
      setBusy(true);
      const res = await fetchApi(`/usernames/${usernameId}/listing`, { method: 'DELETE' });
      const d = await res.json();
      if (!res.ok) throw new Error(d.message || 'Could not cancel');
      Alert.alert('Listing cancelled');
      navigation.goBack();
    } catch (e: any) {
      Alert.alert('Cancel failed', e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={22} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={TYPOGRAPHY.h2} numberOfLines={1}>@{username.label}</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.body}>
          <View style={styles.statusRow}>
            <View style={[styles.levelPill, { borderColor: (LEVEL_COLOR[username.level] || '#6B7280') + '88', backgroundColor: (LEVEL_COLOR[username.level] || '#6B7280') + '22' }]}>
              <Text style={[styles.levelText, { color: LEVEL_COLOR[username.level] || '#6B7280' }]}>{username.level}</Text>
            </View>
            {isAuction && (
              <View style={styles.countdownPill}>
                <Ionicons name="time-outline" size={13} color="#F59E0B" />
                <Text style={styles.countdownText}>{countdown}</Text>
              </View>
            )}
          </View>

          {isListed && (
            <Text style={styles.price}>
              {isAuction ? (username.currentBid ? 'Current bid: ' : 'Starting bid: ') : ''}
              {formatCurrency(isAuction ? (username.currentBid ?? username.price) : username.price)}
            </Text>
          )}
          <Text style={styles.meta}>Reputation score: {Math.round(username.reputationScore)} — this transfers with the username.</Text>

          <View style={styles.sellerCard}>
            <View style={{ flex: 1 }}>
              <Text style={styles.sellerName}>{username.owner?.profile?.displayName || username.owner?.username}</Text>
              <Text style={styles.sellerRole}>Owner · @{username.owner?.username}</Text>
            </View>
          </View>

          {isListed && !isOwner && !isAuction && (
            <TouchableOpacity style={styles.buyBtn} onPress={buyNow} disabled={busy}>
              {busy ? <ActivityIndicator color="#FFF" /> : (
                <>
                  <Ionicons name="cart" size={18} color="#FFF" />
                  <Text style={styles.buyBtnText}>Buy Now — {formatCurrency(username.price)}</Text>
                </>
              )}
            </TouchableOpacity>
          )}

          {isListed && !isOwner && isAuction && (
            <View style={styles.bidCard}>
              <Text style={styles.bidLabel}>Place a bid (min {formatCurrency(minBid)})</Text>
              <View style={styles.bidRow}>
                <TextInput
                  style={styles.bidInput}
                  placeholder={minBid.toFixed(2)}
                  placeholderTextColor={COLORS.textMuted}
                  value={bidAmount}
                  onChangeText={setBidAmount}
                  keyboardType="numeric"
                />
                <TouchableOpacity style={styles.bidBtn} onPress={placeBid} disabled={busy}>
                  {busy ? <ActivityIndicator color="#FFF" size="small" /> : <Text style={styles.bidBtnText}>Bid</Text>}
                </TouchableOpacity>
              </View>
            </View>
          )}

          {isOwner && isListed && (
            <TouchableOpacity style={styles.cancelBtn} onPress={cancelListing} disabled={busy}>
              <Text style={styles.cancelBtnText}>Cancel Listing</Text>
            </TouchableOpacity>
          )}

          {!isListed && (
            <View style={styles.soldBanner}>
              <Ionicons name="information-circle" size={16} color="#6B7280" />
              <Text style={styles.soldBannerText}>Not currently for sale.</Text>
            </View>
          )}

          {isAuction && username.bids?.length > 0 && (
            <>
              <Text style={styles.sectionLabel}>BID HISTORY</Text>
              <View style={styles.bidHistory}>
                {username.bids.map((b: any) => (
                  <View key={b.id} style={styles.bidHistoryRow}>
                    <Text style={styles.bidHistoryName}>{b.bidder?.profile?.displayName || b.bidder?.username}</Text>
                    <Text style={styles.bidHistoryAmount}>{formatCurrency(b.amount)}</Text>
                  </View>
                ))}
              </View>
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
